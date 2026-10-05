import type { Pool } from "pg";

export type ConversationOwnership = {
  state: "UNASSIGNED" | "ASSIGNED";
  assigneeSubjectId: string | null;
  assignedAt: string | null;
  authorityEffect: "NONE";
};

export async function readConversationOwnership(input: {
  pool: Pool;
  workspaceId: string;
  provider: string;
  conversationId: string;
}): Promise<ConversationOwnership> {
  const result = await input.pool.query<{
    assignment_state: "UNASSIGNED" | "ASSIGNED";
    assignee_subject_id: string | null;
    assigned_at: Date | string | null;
  }>(
    `select assignment_state, assignee_subject_id, assigned_at
       from crm_conversation_assignments
      where workspace_id=$1 and provider=$2 and conversation_id=$3
      limit 1`,
    [input.workspaceId,input.provider,input.conversationId],
  );
  const row=result.rows[0];
  if(!row) return {state:"UNASSIGNED",assigneeSubjectId:null,assignedAt:null,authorityEffect:"NONE"};
  return {
    state:row.assignment_state,
    assigneeSubjectId:row.assignee_subject_id,
    assignedAt:row.assigned_at ? new Date(row.assigned_at).toISOString() : null,
    authorityEffect:"NONE",
  };
}

export async function claimConversation(input:{
  pool:Pool;
  workspaceId:string;
  provider:string;
  conversationId:string;
  actorSubjectId:string;
}) {
  const client=await input.pool.connect();
  try {
    await client.query("begin");
    const existing=await client.query<{
      assignment_state:"UNASSIGNED"|"ASSIGNED";
      assignee_subject_id:string|null;
    }>(
      `select assignment_state, assignee_subject_id
         from crm_conversation_assignments
        where workspace_id=$1 and provider=$2 and conversation_id=$3
        for update`,
      [input.workspaceId,input.provider,input.conversationId],
    );
    const row=existing.rows[0];
    if(row?.assignment_state==="ASSIGNED" && row.assignee_subject_id!==input.actorSubjectId){
      throw new Error("CONVERSATION_ALREADY_ASSIGNED");
    }

    const now=new Date().toISOString();
    await client.query(
      `insert into crm_conversation_assignments (
        workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
      ) values ($1,$2,$3,$4,'ASSIGNED',$5,$5)
      on conflict (workspace_id,provider,conversation_id)
      do update set assignee_subject_id=excluded.assignee_subject_id,
                    assignment_state='ASSIGNED',
                    assigned_at=excluded.assigned_at,
                    updated_at=excluded.updated_at`,
      [input.workspaceId,input.provider,input.conversationId,input.actorSubjectId,now],
    );
    if(!(row?.assignment_state==="ASSIGNED" && row.assignee_subject_id===input.actorSubjectId)){
      await client.query(
        `insert into crm_conversation_assignment_events (
          workspace_id,provider,conversation_id,action,actor_subject_id,assignee_subject_id
        ) values ($1,$2,$3,'CLAIMED',$4,$4)`,
        [input.workspaceId,input.provider,input.conversationId,input.actorSubjectId],
      );
    }
    await client.query("commit");
    return {state:"ASSIGNED" as const,assigneeSubjectId:input.actorSubjectId,assignedAt:now,authorityEffect:"NONE" as const};
  } catch(error){
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function releaseConversation(input:{
  pool:Pool;
  workspaceId:string;
  provider:string;
  conversationId:string;
  actorSubjectId:string;
}) {
  const client=await input.pool.connect();
  try{
    await client.query("begin");
    const existing=await client.query<{assignment_state:string;assignee_subject_id:string|null}>(
      `select assignment_state,assignee_subject_id
         from crm_conversation_assignments
        where workspace_id=$1 and provider=$2 and conversation_id=$3
        for update`,
      [input.workspaceId,input.provider,input.conversationId],
    );
    const row=existing.rows[0];
    if(!row || row.assignment_state!=="ASSIGNED") throw new Error("CONVERSATION_NOT_ASSIGNED");
    if(row.assignee_subject_id!==input.actorSubjectId) throw new Error("CONVERSATION_ASSIGNED_TO_DIFFERENT_SUBJECT");

    await client.query(
      `update crm_conversation_assignments
          set assignee_subject_id=null,assignment_state='UNASSIGNED',assigned_at=null,updated_at=current_timestamp
        where workspace_id=$1 and provider=$2 and conversation_id=$3`,
      [input.workspaceId,input.provider,input.conversationId],
    );
    await client.query(
      `insert into crm_conversation_assignment_events (
        workspace_id,provider,conversation_id,action,actor_subject_id,assignee_subject_id
      ) values ($1,$2,$3,'RELEASED',$4,null)`,
      [input.workspaceId,input.provider,input.conversationId,input.actorSubjectId],
    );
    await client.query("commit");
    return {state:"UNASSIGNED" as const,assigneeSubjectId:null,assignedAt:null,authorityEffect:"NONE" as const};
  } catch(error){
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function requireConversationOwner(input:{
  pool:Pool;
  workspaceId:string;
  provider:string;
  conversationId:string;
  actorSubjectId:string;
}) {
  const ownership=await readConversationOwnership(input);
  if(ownership.state!=="ASSIGNED" || ownership.assigneeSubjectId!==input.actorSubjectId){
    throw new Error("CONVERSATION_OWNERSHIP_REQUIRED");
  }
  return ownership;
}
