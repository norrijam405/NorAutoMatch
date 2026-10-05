import assert from "node:assert/strict";
import { createPostgresCrmPool } from "../src/lib/crm-postgres-adapter";
import { claimConversation, readConversationOwnership, releaseConversation, requireConversationOwner } from "../src/lib/conversation-ownership";

async function main(){
  const url=process.env.NORAUTO_CRM_DATABASE_URL;
  if(!url) throw new Error("NORAUTO_CRM_DATABASE_URL required");
  const pool=createPostgresCrmPool(url);
  const base={pool,workspaceId:"norautomatch",provider:"NORAUTO_SITE_CHAT",conversationId:"site-synthetic-owner"};
  try{
    await pool.query("delete from crm_conversation_assignment_events where workspace_id='norautomatch'");
    await pool.query("delete from crm_conversation_assignments where workspace_id='norautomatch'");

    assert.equal((await readConversationOwnership(base)).state,"UNASSIGNED");

    const claimed=await claimConversation({...base,actorSubjectId:"rep-a"});
    assert.equal(claimed.assigneeSubjectId,"rep-a");
    await requireConversationOwner({...base,actorSubjectId:"rep-a"});

    await assert.rejects(
      claimConversation({...base,actorSubjectId:"rep-b"}),
      /CONVERSATION_ALREADY_ASSIGNED/,
    );
    await assert.rejects(
      requireConversationOwner({...base,actorSubjectId:"rep-b"}),
      /CONVERSATION_OWNERSHIP_REQUIRED/,
    );
    await assert.rejects(
      releaseConversation({...base,actorSubjectId:"rep-b"}),
      /CONVERSATION_ASSIGNED_TO_DIFFERENT_SUBJECT/,
    );

    const released=await releaseConversation({...base,actorSubjectId:"rep-a"});
    assert.equal(released.state,"UNASSIGNED");

    const events=await pool.query("select action,actor_subject_id from crm_conversation_assignment_events order by id");
    assert.deepEqual(events.rows,[
      {action:"CLAIMED",actor_subject_id:"rep-a"},
      {action:"RELEASED",actor_subject_id:"rep-a"},
    ]);

    console.log("PASS conversation ownership self-claim boundary");
  } finally {
    await pool.end();
  }
}

main().catch((error)=>{console.error(error);process.exitCode=1;});
