import { createHouseHandshakeHandler } from "@/lib/house-app-handshake-r0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handleHouseHandshake = createHouseHandshakeHandler();

export async function POST(request: Request): Promise<Response> {
  return handleHouseHandshake(request);
}
