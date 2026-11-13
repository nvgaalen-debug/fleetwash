// Wasroute Planner - archief van bezoeken.
// Eén archief, intern per maand opgeslagen in Azure Blob Storage (container "wasroute"): archief/<jjjj-mm>.json
// Alleen toevoegen: een bezoek (zelfde datum + opdracht) wordt niet dubbel opgeslagen en nooit verwijderd.
//
// Endpoints (planner, met APP_PASSWORD):
//   POST /api/archief  { items: [...] }            -> { ok, nieuw, maanden }
//   GET  /api/archief?van=JJJJ-MM-DD&tot=JJJJ-MM-DD -> { van, tot, items: [...] } (gesorteerd op datum)

import { app } from "@azure/functions";
import { getStore } from "../lib/store.mjs";

const MAX_ITEMS = 5000;
const MAX_MAANDEN = 36;
const isDatum = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

const json = (data, status = 200) => ({
  status,
  headers: { "cache-control": "no-store" },
  jsonBody: data,
});
const plannerOk = (req) => {
  const pw = process.env.APP_PASSWORD;
  return !pw || req.headers.get("x-app-password") === pw;
};

// alle maanden tussen van en tot, bijv. ["2026-10", "2026-11"]
function maandenTussen(van, tot) {
  const out = [];
  let y = +van.slice(0, 4), m = +van.slice(5, 7);
  const ey = +tot.slice(0, 4), em = +tot.slice(5, 7);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

async function handler(req) {
  const store = getStore({ name: "wasroute", consistency: "strong" });
  try {
    if (!plannerOk(req)) return json({ error: "Wachtwoord vereist." }, 401);

    if (req.method === "POST") {
      const b = await req.json();
      const items = Array.isArray(b.items) ? b.items.slice(0, MAX_ITEMS) : [];

      // groepeer per maand van de datum van het bezoek
      const groepen = {};
      for (const it of items) {
        if (!it || !isDatum(it.date) || !it.job || !it.job.id) continue;
        const ym = it.date.slice(0, 7);
        (groepen[ym] = groepen[ym] || []).push(it);
      }

      let nieuw = 0;
      const maanden = [];
      for (const [ym, lijst] of Object.entries(groepen)) {
        const key = `archief/${ym}.json`;
        const bestaand = (await store.get(key, { type: "json" })) || [];
        const bekend = new Set(bestaand.map((x) => x.date + "|" + x.job.id));
        const toe = lijst.filter((x) => !bekend.has(x.date + "|" + x.job.id));
        await store.setJSON(key, bestaand.concat(toe));
        nieuw += toe.length;
        maanden.push(ym);
      }
      return json({ ok: true, nieuw, maanden: maanden.sort() });
    }

    // GET: bezoeken in een datumbereik
    const url = new URL(req.url);
    const van = url.searchParams.get("van"), tot = url.searchParams.get("tot");
    if (!isDatum(van) || !isDatum(tot) || tot < van) return json({ error: "Ongeldige periode." }, 400);
    const maanden = maandenTussen(van, tot);
    if (maanden.length > MAX_MAANDEN) return json({ error: "Periode is te lang (max. 3 jaar)." }, 400);

    let items = [];
    for (const ym of maanden) {
      const lijst = (await store.get(`archief/${ym}.json`, { type: "json" })) || [];
      items = items.concat(lijst.filter((x) => x.date >= van && x.date <= tot));
    }
    items.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return json({ van, tot, items });
  } catch (e) {
    return json({ error: "Serverfout: " + (e?.message || String(e)) }, 500);
  }
}

app.http("archief", { route: "archief", methods: ["GET", "POST"], authLevel: "anonymous", handler });
