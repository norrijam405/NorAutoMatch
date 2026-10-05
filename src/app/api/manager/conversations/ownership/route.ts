import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeManagerRequest } from "@/lib/manager-route-auth";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { claimConversation, releaseConversation } from "@/lib/conversation-ownership";
import { readJsonBodyWithByteLimit } from "@/lib/request-body-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema=z.object({
  provider:z.string().trim().min(1).max(120),
  conversationId:z.string().trim().min(1).max(256),
  action:z.enum(["CLAIM","RELEASE"]),
});

let pool:ReturnType<typeof createPostgresCrmPool>|undefined;
function noStore(body:Record<string,unknown>,status:number){
  return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store, private","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});
}
function getPool(){
  const url=process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if(!url) return null;
  pool??=createPostgresCrmPool(url);
  return pool;
}

export async function POST(request:Request){
  const auth=await authorizeManagerRequest(request);
  if(!auth.authorized){
    return noStore({message:auth.reason==="NOT_CONFIGURED"?"Manager identity verification is not configured.":"Unauthorized."},auth.reason==="NOT_CONFIGURED"?503:401);
  }
  const body=await readJsonBodyWithByteLimit(request,4096);
  if(!body.ok) return noStore({message:"Invalid ownership request."},body.reason==="TOO_LARGE"?413:400);
  const parsed=schema.safeParse(body.value);
  if(!parsed.success) return noStore({message:"A bounded claim or release request is required."},400);
  const crm=getPool();
  if(!crm) return noStore({message:"Conversation ownership persistence is not configured."},503);

  try{
    const input={
      pool:crm,
      workspaceId:auth.claims.workspaceId,
      provider:parsed.data.provider,
      conversationId:parsed.data.conversationId,
      actorSubjectId:auth.claims.subjectId,
    };
    const ownership=parsed.data.action==="CLAIM"
      ? await claimConversation(input)
      : await releaseConversation(input);
    return noStore({
      protocol:"NORAUTO_CONVERSATION_OWNERSHIP_V1",
      ...ownership,
      action:parsed.data.action,
      responseExecution:"NOT_PERFORMED",
      authorityEffect:"NONE",
    },200);
  }catch(error){
    const message=error instanceof Error?error.message:"";
    if(message.includes("ALREADY_ASSIGNED")||message.includes("DIFFERENT_SUBJECT")||message.includes("NOT_ASSIGNED")){
      return noStore({message:"That conversation ownership changed before this action completed."},409);
    }
    return noStore({message:"Conversation ownership update failed safely."},503);
  }
}
