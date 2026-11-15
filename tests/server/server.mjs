// Testserver voor Wasroute: serveert de app-bestanden en voert de ECHTE functies uit api/src/functions uit,
// met Table- en Blob Storage in het geheugen. Geen Azure-account, geen echte data.
//   node tests/server/server.mjs            (poort 4280, of PORT=...)
// Extra test-eindpunten:  POST /__test/reset   GET /__test/blobs?c=wasroute   POST /__test/sessie-verlopen?aan=1
import { register } from "node:module";
register("./loader.mjs", import.meta.url);

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
process.env.AZURE_STORAGE_CONNECTION_STRING ||= "UseDevelopmentStorage=true";
if (!("APP_PASSWORD" in process.env)) process.env.APP_PASSWORD = "";

/* PDOK (adres opzoeken) nabootsen met de adressen uit tests/fixtures, in het echte PDOK-antwoordformaat,
   zodat api/src/functions/adres.mjs ongewijzigd meedraait. Andere externe verzoeken worden geweigerd. */
const GEO = [];
for (const f of fs.readdirSync(path.join(root, "tests", "fixtures")).filter(f => f.endsWith(".json"))) {
  for (const o of JSON.parse(fs.readFileSync(path.join(root, "tests", "fixtures", f), "utf8")).opdrachten || [])
    if (o.lat && o.adres) GEO.push(o);
}
const norm = t => String(t || "").toLowerCase().replace(/\s+/g, " ").trim();
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.startsWith("https://api.pdok.nl/")) {
    const q = norm(new URL(u).searchParams.get("q")), qpc = q.replace(/\s/g, "");
    const hit = GEO.find(o => o.postcode && qpc.includes(o.postcode.replace(/\s/g, "").toLowerCase()) && q.includes(norm(o.adres)))
      || GEO.find(o => q.includes(norm(o.adres)) && q.includes(norm(o.plaats)))
      || GEO.find(o => o.postcode && qpc.includes(o.postcode.replace(/\s/g, "").toLowerCase()));
    const docs = hit ? [{ weergavenaam: `${hit.adres}, ${hit.postcode} ${hit.plaats}`, centroide_ll: `POINT(${hit.lng} ${hit.lat})`, postcode: hit.postcode.replace(/\s/g, ""), woonplaatsnaam: hit.plaats.charAt(0) + hit.plaats.slice(1).toLowerCase(), straatnaam: hit.adres.replace(/\s*\d.*$/, ""), score: 10 }] : [];
    return new Response(JSON.stringify({ response: { numFound: docs.length, docs } }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(u)) return realFetch(url, opts);
  throw new Error("Extern verzoek geblokkeerd in de testserver: " + u.slice(0, 80));
};

const { ROUTES } = await import("./fakes/azure-functions.mjs");
const { resetTables } = await import("./fakes/data-tables.mjs");
const { resetBlobs, blobKeys } = await import("./fakes/storage-blob.mjs");
const fnDir = path.join(root, "api", "src", "functions");
for (const f of fs.readdirSync(fnDir).filter(f => f.endsWith(".mjs")).sort()) await import(pathToFileURL(path.join(fnDir, f)).href);

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
let sessionExpired = false;

function sendResult(res, r) {
  const headers = { ...(r.headers || {}) };
  let body = r.body;
  if (r.jsonBody !== undefined) { body = JSON.stringify(r.jsonBody); headers["content-type"] ||= "application/json"; }
  res.writeHead(r.status || 200, headers);
  res.end(body === undefined ? "" : body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === "/__test/reset") { resetTables(); resetBlobs(); sessionExpired = false; return sendResult(res, { jsonBody: { ok: true } }); }
    if (p === "/__test/blobs") return sendResult(res, { jsonBody: blobKeys(url.searchParams.get("c") || "wasroute") });
    if (p === "/__test/sessie-verlopen") { sessionExpired = url.searchParams.get("aan") === "1"; return sendResult(res, { jsonBody: { sessionExpired } }); }
    if (p === "/.auth/me") return sendResult(res, { jsonBody: { clientPrincipal: { userId: "test", userDetails: "test@wasroute", identityProvider: "aad", userRoles: ["anonymous", "authenticated"] } } });
    if (p.startsWith("/.auth/login")) return sendResult(res, { status: 200, headers: { "content-type": "text/html" }, body: "<h1>Inlogpagina (test)</h1>" });

    if (p.startsWith("/api/")) {
      /* Verlopen sessie nabootsen zoals Azure: 302 naar de Microsoft-inlog (ander domein) */
      const anon = ["mijn-planning", "melding", "berichten", "foto"];
      const name = p.slice(5).split("/")[0];
      if (sessionExpired && !anon.includes(name)) { res.writeHead(302, { location: "https://login.microsoftonline.com/test" }); return res.end(); }
      const route = ROUTES.find(r => r.route === name);
      if (!route) return sendResult(res, { status: 404, jsonBody: { error: "Onbekende functie: " + name } });
      const chunks = []; for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString("utf8");
      const fakeReq = {
        method: req.method, url: url.href, query: url.searchParams,
        headers: { get: k => req.headers[String(k).toLowerCase()] ?? null },
        json: async () => JSON.parse(raw || "null"), text: async () => raw,
      };
      return sendResult(res, await route.handler(fakeReq, { log() {}, error() {}, warn() {} }));
    }

    /* Statische bestanden; navigatie valt terug op index.html zoals staticwebapp.config.json */
    let file = path.join(root, p === "/" ? "index.html" : p);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    sendResult(res, { status: 500, jsonBody: { error: String(e && e.stack || e) } });
  }
});

const PORT = Number(process.env.PORT || 4280);
server.listen(PORT, () => console.log(`Wasroute testserver op http://localhost:${PORT} (${ROUTES.length} API-routes: ${ROUTES.map(r => r.route).join(", ")})`));
