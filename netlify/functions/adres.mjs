// Wasroute Planner - exacte positie van adressen via PDOK Locatieserver (gratis, zonder sleutel).
//
// POST /api/adres  { items: [{ id, q, type }] }   type: "adres" (standaard) of "postcode"
// -> { results: [{ id, ok, lat, lng, label, postcode, city, street }] }
//
// Optioneel: APP_PASSWORD (zelfde wachtwoord als voor publiceren en AI).

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const BASE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free";
const MAX_ITEMS = 25;

async function lookup(it) {
  const q = String(it.q || "").trim().slice(0, 200);
  if (!q) return { id: it.id, ok: false, error: "Leeg adres" };
  const type = it.type === "postcode" ? "postcode" : "adres";
  const url = `${BASE}?q=${encodeURIComponent(q)}&fq=${encodeURIComponent("type:" + type)}&rows=1&fl=${encodeURIComponent("weergavenaam,centroide_ll,postcode,woonplaatsnaam,straatnaam,score")}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) return { id: it.id, ok: false, error: `PDOK gaf fout ${r.status}` };
  const d = await r.json().catch(() => ({}));
  const doc = d?.response?.docs?.[0];
  const m = doc && /POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/.exec(doc.centroide_ll || "");
  if (!m) return { id: it.id, ok: false, error: "Adres niet gevonden" };
  return { id: it.id, ok: true, lng: +m[1], lat: +m[2], label: doc.weergavenaam || "", postcode: doc.postcode || "", city: doc.woonplaatsnaam || "", street: doc.straatnaam || "" };
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Alleen POST is toegestaan." }, 405);
  const pw = process.env.APP_PASSWORD;
  if (pw && req.headers.get("x-app-password") !== pw) return json({ error: "Wachtwoord vereist." }, 401);
  let b;
  try { b = await req.json(); } catch { return json({ error: "Ongeldig verzoek." }, 400); }
  const items = Array.isArray(b?.items) ? b.items.slice(0, MAX_ITEMS) : [];
  if (!items.length) return json({ results: [] });
  const results = [];
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const it = items[i++];
      try { results.push(await lookup(it)); } catch { results.push({ id: it.id, ok: false, error: "PDOK is niet bereikbaar" }); }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return json({ results });
};

export const config = { path: "/api/adres" };
