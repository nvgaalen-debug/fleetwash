// Wasroute Planner - gedeelde planning (alle planners zien dezelfde gegevens).
// Opslag: Azure Table Storage in hetzelfde storage-account als de rest van de app.
//
// Omgevingsvariabelen (Azure Static Web App > Settings > Environment variables):
//   AZURE_STORAGE_CONNECTION_STRING  verplicht (bestaat al)
//   APP_PASSWORD                     optioneel: zelfde wachtwoord als de rest van de app
//
// GET  /api/state                    -> { data, version }   (data = null als er nog niets is)
// PUT  /api/state  { data, version } -> { version }          (409 als iemand anders al opsloeg)
//
// Opslag in Table Storage: één metadata-rij (versie, aantal stukken) en daarnaast de planning
// in stukken van 30.000 tekens, elk in een eigen rij. Table Storage staat maximaal 64 KB per
// property en 1 MB per rij toe, daarom niet alles in één rij.

import { app } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

const TABLE = "plannerstate";
const PK = "planner";
const META = "meta";
const CHUNK = 30000;          // tekens per rij (ruim onder de limiet van 64 KB)
const MAX_CHUNKS = 400;       // ~12 MB planning als bovengrens

const json = (data, status = 200) => ({
  status,
  headers: { "cache-control": "no-store" },
  jsonBody: data,
});

let tableReady;
function table() {
  if (!tableReady) {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING is niet ingesteld.");
    const client = TableClient.fromConnectionString(conn, TABLE);
    tableReady = client.createTable().catch(() => {}).then(() => client);
  }
  return tableReady;
}

const chunkKey = (i) => "c" + String(i).padStart(4, "0");

async function readChunks(t, count) {
  const parts = await Promise.all(
    Array.from({ length: count }, (_, i) => t.getEntity(PK, chunkKey(i)).then((e) => e.d || ""))
  );
  return parts.join("");
}

async function handler(req) {
  const pw = process.env.APP_PASSWORD;
  if (pw && req.headers.get("x-app-password") !== pw) return json({ error: "Wachtwoord vereist." }, 401);

  let t;
  try {
    t = await table();
  } catch (e) {
    return json({ error: e.message }, 500);
  }

  if (req.method === "GET") {
    let meta;
    try {
      meta = await t.getEntity(PK, META);
    } catch (e) {
      if (e.statusCode === 404) return json({ data: null, version: 0 });
      return json({ error: "Kon de planning niet lezen (metadata)." }, 502);
    }
    try {
      const text = await readChunks(t, Number(meta.chunks || 0));
      return json({ data: JSON.parse(text), version: Number(meta.version || 0) });
    } catch (e) {
      return json({ error: "Kon de planning niet lezen (stukken): " + String(e.message || e).slice(0, 200) }, 502);
    }
  }

  if (req.method === "PUT") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Ongeldig verzoek." }, 400);
    }
    if (!body || typeof body.data !== "object" || body.data === null) return json({ error: "Geen planning meegestuurd." }, 400);
    const text = JSON.stringify(body.data);
    const count = Math.ceil(text.length / CHUNK);
    if (count > MAX_CHUNKS) return json({ error: "Planning is te groot." }, 413);
    const expected = Number(body.version || 0);

    // Huidige metadata en versie controleren
    let meta = null;
    try {
      meta = await t.getEntity(PK, META);
    } catch (e) {
      if (e.statusCode !== 404) return json({ error: "Kon de metadata niet lezen." }, 502);
    }
    const currentVersion = meta ? Number(meta.version || 0) : 0;
    if (currentVersion !== expected) {
      return json({ error: "Iemand anders heeft de planning al opgeslagen. Ververs de pagina.", version: currentVersion }, 409);
    }

    try {
      // 1. Stukken wegschrijven
      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          t.upsertEntity({ partitionKey: PK, rowKey: chunkKey(i), d: text.slice(i * CHUNK, (i + 1) * CHUNK) }, "Replace")
        )
      );
      // 2. Oude, overbodige stukken opruimen
      const oldCount = meta ? Number(meta.chunks || 0) : 0;
      for (let i = count; i < oldCount; i++) await t.deleteEntity(PK, chunkKey(i)).catch(() => {});
      // 3. Metadata als laatste bijwerken: dan is de nieuwe versie pas zichtbaar als alle stukken er staan
      const newMeta = { partitionKey: PK, rowKey: META, version: currentVersion + 1, chunks: count, updatedAt: new Date().toISOString() };
      if (meta) await t.updateEntity(newMeta, "Replace", { etag: meta.etag || "*" });
      else await t.createEntity(newMeta);
    } catch (e) {
      if (e.statusCode === 412 || e.statusCode === 409) {
        return json({ error: "Iemand anders heeft de planning net opgeslagen. Ververs de pagina.", version: currentVersion }, 409);
      }
      return json({ error: "Opslaan mislukt: " + String(e.message || e).slice(0, 200) }, 502);
    }
    return json({ version: currentVersion + 1 });
  }

  return json({ error: "Alleen GET en PUT zijn toegestaan." }, 405);
}

app.http("state", { route: "state", methods: ["GET", "PUT"], authLevel: "anonymous", handler });
