import { createReadStream, realpathSync, promises as fs } from "node:fs";
import { createServer, request as createServerRequest } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = realpathSync(path.dirname(fileURLToPath(import.meta.url)));
const API_PREFIX = "/elara";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);
const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function filterHopByHopHeaders(headers) {
  const filtered = { ...headers };
  const connectionTokens = String(filtered.connection || "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  for (const name of [...HOP_BY_HOP_HEADERS, ...connectionTokens]) {
    delete filtered[name];
  }
  return filtered;
}

function sendText(response, status, message) {
  const body = `${message}\n`;
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "X-Content-Type-Options": "nosniff"
  });
  response.end(body);
}

function rewriteLocation(location, backendUrl) {
  if (typeof location !== "string") return location;

  let destination;
  try {
    destination = new URL(location, backendUrl);
  } catch {
    return location;
  }

  if (
    destination.origin !== backendUrl.origin ||
    (destination.pathname !== "/api" && !destination.pathname.startsWith("/api/"))
  ) {
    return location;
  }

  const publicPrefix = `/elara${destination.pathname.slice("/api".length)}`;
  return `${publicPrefix}${destination.search}${destination.hash}`;
}

function isWithinRoot(root, target) {
  const relativePath = path.relative(root, target);
  return relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath));
}

async function serveStatic(request, response, pathname, root) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendText(response, 405, "Method Not Allowed");
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendText(response, 400, "Bad Request");
    return;
  }

  if (decodedPath.includes("\0")) {
    sendText(response, 400, "Bad Request");
    return;
  }

  const segments = decodedPath.split(/[\\/]+/).filter(Boolean);
  if (
    segments.some((segment) => segment.startsWith(".")) ||
    segments[0] === "tests" ||
    segments[0] === "node_modules" ||
    segments[0] === "README.md" ||
    segments[0] === "server.mjs"
  ) {
    sendText(response, 404, "Not Found");
    return;
  }

  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.resolve(root, `.${requestedPath}`);
  if (!isWithinRoot(root, filePath)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  let actualPath;
  let details;
  try {
    actualPath = await fs.realpath(filePath);
    if (!isWithinRoot(root, actualPath)) {
      sendText(response, 403, "Forbidden");
      return;
    }
    details = await fs.stat(actualPath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      sendText(response, 404, "Not Found");
      return;
    }
    console.error("Could not read frontend asset:", error);
    sendText(response, 500, "Internal Server Error");
    return;
  }

  if (!details.isFile()) {
    sendText(response, 404, "Not Found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": MIME_TYPES.get(path.extname(actualPath).toLowerCase()) || "application/octet-stream",
    "Content-Length": details.size,
    "X-Content-Type-Options": "nosniff"
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const file = createReadStream(actualPath);
  file.on("error", (error) => {
    console.error("Could not stream frontend asset:", error);
    if (response.headersSent) response.destroy(error);
    else sendText(response, 500, "Internal Server Error");
  });
  file.pipe(response);
}

function proxyRequest(request, response, requestUrl, backendUrl) {
  const backendPath = `/api${requestUrl.pathname.slice(API_PREFIX.length)}${requestUrl.search}`;
  const headers = filterHopByHopHeaders(request.headers);
  delete headers.host;

  const upstream = createServerRequest({
    hostname: backendUrl.hostname,
    port: backendUrl.port || 80,
    method: request.method,
    path: backendPath,
    headers
  }, (backendResponse) => {
    const responseHeaders = filterHopByHopHeaders(backendResponse.headers);
    if (responseHeaders.location !== undefined) {
      responseHeaders.location = rewriteLocation(responseHeaders.location, backendUrl);
    }
    response.writeHead(
      backendResponse.statusCode || 502,
      responseHeaders
    );
    backendResponse.pipe(response);
  });

  upstream.on("error", (error) => {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    sendText(response, 502, "Backend no disponible. Comprueba que ELARA esté ejecutándose en localhost:3000.");
  });

  request.on("aborted", () => upstream.destroy());
  request.pipe(upstream);
}

export function createDevServer({
  root = FRONTEND_ROOT,
  backendUrl = "http://localhost:3000"
} = {}) {
  const backend = new URL(backendUrl);
  if (backend.protocol !== "http:") {
    throw new TypeError("El proxy local solo admite un backend HTTP.");
  }

  const resolvedRoot = realpathSync(root);
  return createServer((request, response) => {
    let requestUrl;
    try {
      requestUrl = new URL(request.url, "http://localhost");
    } catch {
      sendText(response, 400, "Bad Request");
      return;
    }

    if (requestUrl.pathname === API_PREFIX || requestUrl.pathname.startsWith(`${API_PREFIX}/`)) {
      proxyRequest(request, response, requestUrl, backend);
      return;
    }

    void serveStatic(request, response, requestUrl.pathname, resolvedRoot);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5500);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError("PORT debe ser un número entero entre 1 y 65535.");
  }

  const server = createDevServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`ELARA frontend disponible en http://localhost:${port}`);
    console.log("Proxy API: /elara -> http://localhost:3000/api");
  });
  server.on("error", (error) => {
    console.error("No se pudo iniciar el servidor local:", error.message);
    process.exitCode = 1;
  });
}
