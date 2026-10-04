import http from "node:http";
import { readFile } from "node:fs/promises";

const port = Number(process.env.PORT || 10000);
const lock = await readFile(new URL("../package-lock.json", import.meta.url), "utf8");

http.createServer((req, res) => {
  if (req.url === "/package-lock.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(lock);
    return;
  }
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, purpose: "temporary-lockfile-validation" }));
    return;
  }
  res.writeHead(404);
  res.end("not found");
}).listen(port, "0.0.0.0");
