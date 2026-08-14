import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/lead-schema";

export const runtime = "nodejs";

const requests = new Map<string, { count: number; expires: number }>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const record = requests.get(ip);
  if (!record || record.expires < now) {
    requests.set(ip, { count: 1, expires: now + 10 * 60 * 1000 });
    return false;
  }
  record.count += 1;
  requests.set(ip, record);
  return record.count > 5;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ message: "Too many requests. Call or text (405) 861-0061." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check the highlighted fields.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const lead = {
    ...parsed.data,
    submittedAt: new Date().toISOString(),
    pageUrl: request.headers.get("referer") || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };

  const webhook = process.env.CRM_WEBHOOK_URL;
  if (!webhook) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ message: "Online routing is being connected. Call or text (405) 861-0061 for a direct response." }, { status: 503 });
    }
    return NextResponse.json({ accepted: true, pipeline: lead.pipeline, developmentMode: true }, { status: 202 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "NorAutoMatch-Leads/1.0" },
      body: JSON.stringify(lead),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ message: "The CRM did not accept this request. Call or text (405) 861-0061." }, { status: 502 });
    }

    return NextResponse.json({ accepted: true, pipeline: lead.pipeline });
  } catch {
    return NextResponse.json({ message: "The CRM is temporarily unavailable. Call or text (405) 861-0061." }, { status: 502 });
  }
}
