// Wasroute Planner - archief van gereed gemelde bezoeken.
// Opslag: Azure Blob Storage (container "wasroute"), één bestand per periode: archief/<type>/<sleutel>.json
// Alleen toevoegen: bestaande bezoeken (zelfde datum + opdracht) worden niet dubbel opgeslagen en niet verwijderd.
//
// Endpoints (planner, met APP_PASSWORD):
//   POST /api/archief  { periode, items: [...] }  -> { ok, nieuw, periodes }
//   GET  /api/archief?periode=week                -> { periode, sleutels: [...] }
//   GET  /api/archief?periode=week&key=2026-W46   -> { periode, key, items: [...] }

import { app } from "@azure/functions";
import { getStore } from "../lib/store.mjs";

const PERIODES = ["week", "maand", "kwartaal", "jaar"];
const MAX_ITEMS = 5000;

const json = (data, status = 200) => ({
  status,
  headers: { "cache-control": "no-store" },
  jsonBody: data,
});
const plannerOk = (req) => {
  const pw = process.env.APP_PASSWORD;
  return !pw || req.headers.get("x-app-password") === pw;
};
const isKey = (s) => /^[0-9A-Za-z-]{4,12}$/.test(s || "");

async function handler(req) {
  const store = getStore({ name: "wasroute", consistency: "strong" });
  try {
    if (!plannerOk(req)) return json({ error: "Wachtwoord vereist." }, 401);

    if (req.method === "POST") {
      const b = await req.json();
      if (!PERIODES.includes(b.periode)) return json({ error: "Ongeldige periode." }, 400);
      const items = Array.isArray(b.items) ? b.items.slice(0, MAX_ITEMS) : [];

      // groepeer per periode-sleutel (bijv. 2026-W46 of 2026-11)
      const groepen = {};
      for (const it of items) {
        if (!it || !isKey(it.periode) || !it.date || !it.job || !it.job.id) continue;
        (groepen[it.periode] = groepen[it.periode] || []).push(it);
      }

      let nieuw = 0;
      const periodes = {};
      for (const [sleutel, lijst] of Object.entries(groepen)) {
        const key = `archief/${b.periode}/${sleutel}.json`;
        const bestaand = (await store.get(key, { type: "json" })) || [];
        const bekend = new Set(bestaand.map((x) => x.date + "|" + x.job.id));
        const toe = lijst.filter((x) => !bekend.has(x.date + "|" + x.job.id));
        const alles = bestaand.concat(toe);
        await store.setJSON(key, alles);
        nieuw += toe.length;
        periodes[sleutel] = alles.length;
      }
      return json({ ok: true, nieuw, periodes });
    }

    // GET
    const url = new URL(req.url);
    const periode = url.searchParams.get("periode");
    const key = url.searchParams.get("key");
    if (!PERIODES.includes(periode)) return json({ error: "Ongeldige periode." }, 400);

    if (key) {
      if (!isKey(key)) return json({ error: "Ongeldige sleutel." }, 400);
      const items = (await store.get(`archief/${periode}/${key}.json`, { type: "json" })) || [];
      return json({ periode, key, items });
    }
    const { blobs } = await store.list({ prefix: `archief/${periode}/` });
    const sleutels = blobs.map((b) => b.key.split("/").pop().replace(/\.json$/, "")).sort();
    return json({ periode, sleutels });
  } catch (e) {
    return json({ error: "Serverfout: " + (e?.message || String(e)) }, 500);
  }
}

app.http("archief", { route: "archief", methods: ["GET", "POST"], authLevel: "anonymous", handler });
