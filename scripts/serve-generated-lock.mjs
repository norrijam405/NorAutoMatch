import http from "node:http";
import { readFile } from "node:fs/promises";

const port = Number(process.env.PORT || 10000);
const lockText = await readFile(new URL("../package-lock.json", import.meta.url), "utf8");
const lock = JSON.parse(lockText);
const selected = {};
for (const [key, value] of Object.entries(lock.packages || {})) {
  if (key === "" || JSON.stringify(value).includes("16.3.8")) selected[key] = value;
}
console.log("LOCK_SELECTED_JSON "+JSON.stringify(selected));
http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, selected: Object.keys(selected) }));
}).listen(port, "0.0.0.0");
