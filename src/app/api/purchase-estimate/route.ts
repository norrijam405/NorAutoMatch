import { NextResponse } from "next/server";
import {
  evaluatePurchaseEstimateRequest,
  PURCHASE_ESTIMATE_MAX_BODY_BYTES,
} from "@/lib/purchase-estimate-endpoint-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-NorAuto-Purchase-Estimate-Authority": "NONE",
    },
  });
}

async function readBoundedBody(request: Request): Promise<{ ok: true; body: string } | { ok: false }> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsed = Number(declaredLength);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > PURCHASE_ESTIMATE_MAX_BODY_BYTES) {
      return { ok: false };
    }
  }

  if (!request.body) return { ok: true, body: "" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > PURCHASE_ESTIMATE_MAX_BODY_BYTES) {
        await reader.cancel("request body exceeds purchase-estimate limit");
        return { ok: false };
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return { ok: true, body };
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  if (process.env.NORAUTO_PURCHASE_ESTIMATE_ACTIVATION?.trim() !== "ENABLE_BOUNDED_PURCHASE_ESTIMATES") {
    return noStore(
      {
        status: "NOT_ACTIVATED",
        message: "Purchase estimates are not activated.",
        authorityEffect: "NONE",
      },
      503,
    );
  }

  const body = await readBoundedBody(request);
  if (!body.ok) {
    return noStore(
      {
        status: "BODY_TOO_LARGE",
        message: "Purchase estimate request exceeds the allowed size.",
        authorityEffect: "NONE",
      },
      413,
    );
  }

  const result = evaluatePurchaseEstimateRequest({
    activationValue: process.env.NORAUTO_PURCHASE_ESTIMATE_ACTIVATION,
    rawBody: body.body,
  });

  if (result.status === "INVALID_JSON") {
    return noStore({ ...result, message: "Invalid JSON request body." }, result.httpStatus);
  }
  if (result.status === "INVALID_REQUEST") {
    return noStore({ ...result, message: "Purchase estimate request failed schema validation." }, result.httpStatus);
  }
  if (result.status === "EVIDENCE_REJECTED") {
    return noStore({ ...result, message: "Purchase estimate evidence did not pass the current bounded gate." }, result.httpStatus);
  }
  if (result.status === "NOT_ACTIVATED" || result.status === "BODY_TOO_LARGE") {
    return noStore(result, result.httpStatus);
  }

  return noStore(
    {
      protocol: "NORAUTOMATCH_PURCHASE_ESTIMATE_RESPONSE_V1",
      status: result.status,
      truthState: result.calculation.truthState,
      authorityEffect: result.authorityEffect,
      evidenceDigestSha256: result.evidenceDigestSha256,
      ruleReviewState: result.ruleReviewState,
      calculation: result.calculation,
      claims: {
        finalOutTheDoorClaimed: result.finalOutTheDoorClaimed,
        legalAdviceClaimed: result.legalAdviceClaimed,
        regulatoryApprovalClaimed: result.regulatoryApprovalClaimed,
      },
      externalSideEffectObserved: result.externalSideEffectObserved,
      message: "This is a bounded estimate based on supplied evidence, not a final purchase contract or legal/tax advice.",
    },
    200,
  );
}
