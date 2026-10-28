// Wasroute Planner - echte rijtijden via OpenRouteService (Matrix API).
// De sleutel staat als omgevingsvariabele in Netlify en komt nooit in de browser.
//
// Omgevingsvariabelen (Netlify > Site configuration > Environment variables):
//   ORS_API_KEY    verplicht: sleutel van https://openrouteservice.org (gratis account)
//   APP_PASSWORD   optioneel: zelfde wachtwoord als voor publiceren en AI
//
// POST /api/reistijden  { locations: [[lng,lat],...], sources: [i,...], destinations: [j,...] }
// -> { durations: [[seconden]], distances: [[km]] }   (rijen = sources, kolommen = destinations)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const MAX_LOCATIONS = 120;

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Alleen POST is toegestaan." }, 405);
  const pw = process.env.APP_PASSWORD;
  if (pw && req.headers.get("x-app-password") !== pw) return json({ error: "Wachtwoord vereist." }, 401);
  const key = process.env.ORS_API_KEY;
  if (!key) return json({ error: "Geen ORS_API_KEY ingesteld in Netlify. Maak een gratis sleutel aan op openrouteservice.org en deploy opnieuw." }, 500);

  let b;
  try { b = await req.json(); } catch { return json({ error: "Ongeldig verzoek." }, 400); }
  const locs = Array.isArray(b?.locations) ? b.locations : [];
  const okLoc = (p) => Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === "number" && isFinite(v)) && p[0] > -180 && p[0] < 180 && p[1] > -90 && p[1] < 90;
  if (!locs.length || locs.length > MAX_LOCATIONS || !locs.every(okLoc)) return json({ error: "Ongeldige locaties." }, 400);
  const idx = (a) => Array.isArray(a) && a.every((i) => Number.isInteger(i) && i >= 0 && i < locs.length) ? a : undefined;
  const sources = idx(b.sources), destinations = idx(b.destinations);
  if ((sources ? sources.length : locs.length) * (destinations ? destinations.length : locs.length) > 3500)
    return json({ error: "Te veel combinaties in één aanvraag." }, 400);

  try {
    const r = await fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ locations: locs, sources, destinations, metrics: ["distance", "duration"], units: "km" }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = typeof d?.error === "string" ? d.error : d?.error?.message || `OpenRouteService gaf fout ${r.status}`;
      return json({ error: msg, status: r.status }, r.status === 429 ? 429 : 502);
    }
    return json({ durations: d.durations, distances: d.distances });
  } catch (e) {
    return json({ error: "OpenRouteService is niet bereikbaar." }, 502);
  }
};

export const config = { path: "/api/reistijden" };
