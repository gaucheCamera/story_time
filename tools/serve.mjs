import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../docs/", import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".md": "text/plain" };

http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname === "/" || pathname === "/story_time") {
      response.writeHead(302, { Location: "/story_time/" }).end();
      return;
    }
    if (!pathname.startsWith("/story_time/")) {
      response.writeHead(404).end("Not found");
      return;
    }
    const relative = pathname.slice("/story_time/".length) || "index.html";
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const content = await readFile(filename);
    response.writeHead(200, {
      "Content-Type": `${types[path.extname(filename)] || "application/octet-stream"}; charset=utf-8`,
      "Cache-Control": "no-store"
    }).end(content);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 400).end("File unavailable");
  }
}).listen(port, host, () => {
  console.log(`Story Time: http://${host}:${port}/story_time/`);
});
