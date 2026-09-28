import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = dirname(fileURLToPath(import.meta.url));
const distDirectory = resolve(rootDirectory, "dist");
const dataPath = process.env.DATA_PATH ?? resolve(rootDirectory, "src", "data", "MODEL_FINAL_OUTPUT.json");
const port = Number.parseInt(process.env.PORT ?? "8080", 10);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json"
};

let patients;

async function loadPatients() {
  const contents = await readFile(dataPath, "utf8");
  patients = JSON.parse(contents);
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function sendMethodNotAllowed(response, allowedMethods) {
  response.writeHead(405, { Allow: allowedMethods, "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ message: "Method not allowed" }));
}

async function handlePatientRequest(request, response, patientId) {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response, "GET");
    return;
  }

  if (!/^\d+$/.test(patientId)) {
    sendJson(response, 400, { message: "Patient ID must contain digits only." });
    return;
  }

  try {
    const patient = patients.find((item) => item.PATIENT_ID === Number(patientId));
    if (!patient) {
      sendJson(response, 404, { message: "No patient was found for that ID." });
      return;
    }
    sendJson(response, 200, patient);
  } catch (error) {
    console.error("Unable to retrieve patient data.", error);
    sendJson(response, 500, { message: "The patient service is unavailable." });
  }
}

async function serveFrontend(request, response, pathname) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendMethodNotAllowed(response, "GET, HEAD");
    return;
  }

  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const candidatePath = resolve(distDirectory, requestedPath);
  const isWithinDist = candidatePath === distDirectory || candidatePath.startsWith(`${distDirectory}${sep}`);
  let filePath = isWithinDist ? candidatePath : resolve(distDirectory, "index.html");

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      filePath = resolve(distDirectory, "index.html");
    }
  } catch {
    filePath = resolve(distDirectory, "index.html");
  }

  const contentType = mimeTypes[extname(filePath)] ?? "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff"
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}

async function start() {
  await loadPatients();
  const server = createServer((request, response) => {
    let url;
    try {
      url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    } catch {
      sendJson(response, 400, { message: "Invalid request URL." });
      return;
    }

    if (url.pathname === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    const patientMatch = url.pathname.match(/^\/api\/patients\/([^/]+)$/);
    if (patientMatch) {
      let patientId;
      try {
        patientId = decodeURIComponent(patientMatch[1]);
      } catch {
        sendJson(response, 400, { message: "Patient ID must contain digits only." });
        return;
      }
      void handlePatientRequest(request, response, patientId);
      return;
    }

    void serveFrontend(request, response, url.pathname);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`CareSignal is listening on port ${port}.`);
  });
}

start().catch((error) => {
  console.error("Unable to start CareSignal.", error);
  process.exitCode = 1;
});
