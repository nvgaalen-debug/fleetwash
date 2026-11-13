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
// Het versienummer voorkomt dat twee planners elkaars werk overschrijven: wie een oude
// versie opslaat, krijgt een 409 en moet eerst verversen.

import { app } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

const TABLE = "plannerstate";
const PK = "planner";
const RK = "main";
const MAX_BYTES = 5 * 1024 * 1024; // Table Storage: max 64 KB per property, dus data in stukken

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

// Table Storage slaat per property maximaal 64 KB op: de JSON wordt in stukken van 60 KB gesplitst.
const CHUNK = 60000;
function splitData(text) {
  const parts = {};
  let n = 0;
  for (let i = 0; i < text.length; i += CHUNK) parts[`d${n++}`] = text.slice(i, i + CHUNK);
  return { parts, count: n };
}
function joinData(entity) {
  const n = Number(entity.chunks || 0);
  let text = "";
  for (let i = 0; i < n; i++) text += entity[`d${i}`] || "";
  return text;
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
    try {
      const e = await t.getEntity(PK, RK);
      return json({ data: JSON.parse(joinData(e)), version: Number(e.version || 0) });
    } catch (e) {
      if (e.statusCode === 404) return json({ data: null, version: 0 });
      return json({ error: "Kon de planning niet lezen." }, 502);
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
    if (text.length > MAX_BYTES) return json({ error: "Planning is te groot." }, 413);
    const expected = Number(body.version || 0);

    // Huidige versie ophalen (en etag voor een atomaire update)
    let current = null;
    try {
      current = await t.getEntity(PK, RK);
    } catch (e) {
      if (e.statusCode !== 404) return json({ error: "Kon de planning niet lezen." }, 502);
    }
    const currentVersion = current ? Number(current.version || 0) : 0;
    if (currentVersion !== expected) {
      return json({ error: "Iemand anders heeft de planning al opgeslagen. Ververs de pagina.", version: currentVersion }, 409);
    }

    const { parts, count } = splitData(text);
    const entity = { partitionKey: PK, rowKey: RK, version: currentVersion + 1, chunks: count, ...parts, updatedAt: new Date().toISOString() };
    try {
      if (current) await t.updateEntity(entity, "Replace", { etag: current.etag || "*" });
      else await t.createEntity(entity);
    } catch (e) {
      // 412 / 409 = een ander verzoek was net sneller
      if (e.statusCode === 412 || e.statusCode === 409) return json({ error: "Iemand anders heeft de planning net opgeslagen. Ververs de pagina.", version: currentVersion }, 409);
      return json({ error: "Opslaan mislukt." }, 502);
    }
    // "Replace" vervangt de hele rij, dus oude stukken verdwijnen vanzelf.
    return json({ version: currentVersion + 1 });
  }

  return json({ error: "Alleen GET en PUT zijn toegestaan." }, 405);
}

app.http("state", { route: "state", methods: ["GET", "PUT"], authLevel: "anonymous", handler });
