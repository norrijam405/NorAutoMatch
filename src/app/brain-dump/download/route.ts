import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const content = await readFile(path.join(process.cwd(), "NORAUTO_MATCH_COMPLETE_BRAIN_DUMP.md"), "utf8");

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="NorAuto-Match-Complete-Brain-Dump.md"',
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
