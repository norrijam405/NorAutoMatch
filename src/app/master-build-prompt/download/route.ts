import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NORAUTO_INTERNAL_DOCS_ENABLED !== "true") {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" },
    });
  }

  const filePath = path.join(process.cwd(), "MASTER_GROWTH_SYSTEM_BUILD_PROMPT.md");
  const content = await readFile(filePath, "utf8");

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="NorAuto-Match-Master-Build-Prompt.md"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
