// Wasroute Planner - reinigingen doorsturen naar Business Central (AL-extensie "Wasroute koppeling").
//
// Omgevingsvariabelen (Netlify > Site configuration > Environment variables):
//   BC_TENANT_ID       Entra ID tenant (GUID of domein)
//   BC_CLIENT_ID       app-registratie (client-id)
//   BC_CLIENT_SECRET   geheim van de app-registratie
//   BC_ENVIRONMENT     naam van de BC-omgeving, bijv. Production of Sandbox
//   BC_COMPANY_NAME    naam van het bedrijf zoals in BC (of BC_COMPANY_ID = de GUID)
//   APP_PASSWORD       zelfde wachtwoord als voor publiceren
//
// POST /api/bc-sync  { month: "2026-10", rows: [ { externalId, customerNo, ... } ] }
//   - nieuwe regels -> aangemaakt in BC
//   - gewijzigde regels -> bijgewerkt (zolang ze nog niet op een factuur staan)
//   - eerder verstuurde regels die nu niet meer in "rows" zitten -> status Vervallen
//     (meer dan de helft tegelijk alleen met ?confirm=1)
// -> { created, updated, voided, unchanged, errors: [{ externalId, message }], bc: { externalId: { invoiceStatus, invoiceNo } } }
//
// GET /api/bc-sync?month=2026-10  -> alleen de status in BC ophalen (factuurstatus per regel)
// GET /api/bc-sync?test=1          -> koppeling testen: inloggen en de bedrijven in de omgeving tonen

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const ENV = () => ({
  tenant: process.env.BC_TENANT_ID,
  clientId: process.env.BC_CLIENT_ID,
  secret: process.env.BC_CLIENT_SECRET,
  env: process.env.BC_ENVIRONMENT || "Production",
  company: process.env.BC_COMPANY_ID,
  companyName: process.env.BC_COMPANY_NAME,
});

const FIELDS = ["externalId", "customerNo", "shipToCode", "licensePlate", "cleaningDate", "cleaningTime", "itemNo", "resourceNo", "status", "billable", "reason", "note", "locationName", "locationAddress", "locationCity", "durationMinutes"];
// Velden die geen invloed hebben op het factuurbedrag: die mogen ook bijgewerkt worden als de regel al op een factuur staat.
const INFO = ["resourceNo", "note", "reason", "cleaningTime", "locationName", "locationAddress", "locationCity"];
// Velden die pas in latere versies van de BC-extensie bestaan: alleen meesturen als BC ze kent.
const OPTIONAL = ["locationName", "locationAddress", "locationCity", "durationMinutes"];
const STATUSES = new Set(["Gereed", "NietGereinigd", "NietBeschikbaar", "Vervallen"]);
const isMonth = (s) => /^\d{4}-\d{2}$/.test(s || "");
const lastDay = (m) => { const [y, mo] = m.split("-").map(Number); return `${m}-${String(new Date(y, mo, 0).getDate()).padStart(2, "0")}`; };

async function token(e) {
  const r = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(e.tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: e.clientId, client_secret: e.secret, scope: "https://api.businesscentral.dynamics.com/.default" }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error("Inloggen bij Microsoft lukte niet: " + (d.error_description || d.error || r.status));
  return d.access_token;
}

// Regel uit Wasroute -> body voor de BC-API (alleen bekende velden, lengtes begrensd zoals in de BC-tabel)
function clean(row) {
  const cut = (v, n) => String(v ?? "").slice(0, n);
  const b = {
    externalId: cut(row.externalId, 100),
    customerNo: cut(row.customerNo, 20).toUpperCase(),
    shipToCode: cut(row.shipToCode, 10).toUpperCase(),
    licensePlate: cut(row.licensePlate, 20),
    cleaningDate: /^\d{4}-\d{2}-\d{2}$/.test(row.cleaningDate || "") ? row.cleaningDate : null,
    itemNo: cut(row.itemNo, 20).toUpperCase(),
    resourceNo: cut(row.resourceNo, 20).toUpperCase(),
    status: STATUSES.has(row.status) ? row.status : "Gereed",
    billable: !!row.billable,
    reason: cut(row.reason, 120),
    note: cut(row.note, 250),
    locationName: cut(row.locationName, 100),
    locationAddress: cut(row.locationAddress, 100),
    locationCity: cut(row.locationCity, 30),
    durationMinutes: Math.max(0, Math.min(1440, Math.round(+row.durationMinutes || 0))),
  };
  if (/^\d{1,2}:\d{2}$/.test(row.cleaningTime || "")) b.cleaningTime = row.cleaningTime.padStart(5, "0") + ":00";
  return b;
}
const eqf = (bc, b, f) => {
  if (!(f in b)) return true;
  if (f === "cleaningTime") return String(bc[f] || "").slice(0, 8) === b[f];
  return String(bc[f] ?? "") === String(b[f] ?? "");
};
const same = (bc, b) => FIELDS.every((f) => eqf(bc, b, f));

export default async (req) => {
  const pw = process.env.APP_PASSWORD;
  if (pw && req.headers.get("x-app-password") !== pw) return json({ error: "Wachtwoord vereist." }, 401);
  const e = ENV();
  if (!e.tenant || !e.clientId || !e.secret)
    return json({ error: "De koppeling met Business Central is nog niet ingesteld. Vul BC_TENANT_ID, BC_CLIENT_ID, BC_CLIENT_SECRET, BC_ENVIRONMENT en BC_COMPANY_NAME in bij Netlify en deploy opnieuw." }, 500);

  const url = new URL(req.url);
  let month = url.searchParams.get("month"), rows = null;
  if (req.method === "POST") {
    const b = await req.json().catch(() => null);
    if (!b) return json({ error: "Ongeldig verzoek." }, 400);
    month = b.month; rows = Array.isArray(b.rows) ? b.rows : [];
    if (!rows.length && url.searchParams.get("confirm") !== "1") return json({ error: "Geen regels om te versturen; er is niets gewijzigd." }, 400);
    if (rows.length > 2000) return json({ error: "Te veel regels in één keer (maximaal 2000)." }, 400);
  }
  if (!isMonth(month) && url.searchParams.get("test") !== "1") return json({ error: "Ongeldige maand." }, 400);

  const apiRoot = `https://api.businesscentral.dynamics.com/v2.0/${encodeURIComponent(e.tenant)}/${encodeURIComponent(e.env)}/api/wasroute/planning/v1.0`;
  let tok;
  try { tok = await token(e); } catch (err) { return json({ error: err.message }, 502); }
  const H = { Authorization: `Bearer ${tok}`, Accept: "application/json", "content-type": "application/json" };

  // Bedrijf bepalen: op id, of op naam (makkelijker in te vullen)
  let companies = null;
  if (!e.company || url.searchParams.get("test") === "1") {
    const r = await fetch(`${apiRoot}/companies`, { headers: H });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = r.status === 404 ? `Omgeving "${e.env}" of de extensie "Wasroute koppeling" is niet gevonden. Controleer BC_ENVIRONMENT en of de extensie is gepubliceerd.`
        : r.status === 401 || r.status === 403 ? "Geen toegang tot Business Central. Controleer in BC de pagina Microsoft Entra-toepassingen (ingeschakeld, toestemming verleend, machtigingenset WR KOPPELING)."
        : d?.error?.message || `Business Central gaf fout ${r.status}`;
      return json({ error: msg }, 502);
    }
    companies = (d.value || []).map((c) => ({ name: c.name, displayName: c.displayName || "", id: c.id }));
  }
  if (url.searchParams.get("test") === "1") {
    const chosen = e.company || (companies.find((c) => [c.name, c.displayName].some((n) => n && n.toLowerCase() === String(e.companyName || "").toLowerCase())) || {}).id || "";
    return json({ ok: true, environment: e.env, companies, chosen });
  }
  if (!e.company) {
    const want = String(e.companyName || "").toLowerCase();
    const c = companies.find((x) => [x.name, x.displayName].some((n) => n && n.toLowerCase() === want)) || (companies.length === 1 && !want ? companies[0] : null);
    if (!c) return json({ error: `Bedrijf "${e.companyName || ""}" niet gevonden. Beschikbaar: ${companies.map((x) => x.name).join(", ")}. Zet de juiste naam in BC_COMPANY_NAME.` }, 500);
    e.company = c.id;
  }
  const entity = `companies(${e.company})/cleanings`;

  // 1. Wat staat er al in BC voor deze maand?
  const existing = new Map();
  try {
    let next = `${apiRoot}/${entity}?$filter=${encodeURIComponent(`cleaningDate ge ${month}-01 and cleaningDate le ${lastDay(month)}`)}`;
    while (next) {
      const r = await fetch(next, { headers: H });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error?.message || `Business Central gaf fout ${r.status}`);
      for (const x of d.value || []) existing.set(x.externalId, x);
      next = d["@odata.nextLink"] || null;
    }
  } catch (err) {
    return json({ error: "Ophalen uit Business Central lukte niet: " + err.message }, 502);
  }
  const statusMap = () => Object.fromEntries([...existing.values()].map((x) => [x.externalId, { invoiceStatus: x.invoiceStatus, invoiceNo: x.postedInvoiceNo || x.salesInvoiceNo || "", status: x.status }]));
  if (!rows) return json({ bc: statusMap() });
  // Oudere BC-extensie kent nieuwere velden nog niet: die dan niet meesturen.
  const first = existing.values().next().value;
  const unknown = first ? OPTIONAL.filter((f) => !(f in first)) : [];

  // 2. Bepalen wat er moet gebeuren
  const ops = [], errors = [];
  let unchanged = 0;
  const seen = new Set();
  for (const raw of rows) {
    const b = clean(raw);
    for (const f of unknown) delete b[f];
    if (!b.externalId || seen.has(b.externalId)) continue;
    seen.add(b.externalId);
    if (!b.customerNo) { errors.push({ externalId: b.externalId, message: "Geen debiteurnummer" }); continue; }
    if (!b.cleaningDate || b.cleaningDate.slice(0, 7) !== month) { errors.push({ externalId: b.externalId, message: "Datum valt buiten de maand" }); continue; }
    const cur = existing.get(b.externalId);
    if (!cur) ops.push({ kind: "created", method: "POST", url: entity, body: b, ext: b.externalId });
    else if (same(cur, b)) unchanged++;
    else if (cur.invoiceStatus !== "Open") {
      const billing = FIELDS.filter((f) => !INFO.includes(f) && !eqf(cur, b, f));
      if (billing.length) errors.push({ externalId: b.externalId, message: `Staat al op factuur ${cur.postedInvoiceNo || cur.salesInvoiceNo}; niet gewijzigd` });
      else {
        const upd = {};
        for (const f of INFO) if (f in b && !eqf(cur, b, f)) upd[f] = b[f];
        ops.push({ kind: "updated", method: "PATCH", url: `${entity}(${cur.id})`, body: upd, ext: b.externalId });
      }
    }
    else { const { externalId, ...upd } = b; ops.push({ kind: "updated", method: "PATCH", url: `${entity}(${cur.id})`, body: upd, ext: b.externalId }); }
  }
  for (const [ext, cur] of existing) {
    if (seen.has(ext) || cur.status === "Vervallen") continue;
    if (cur.invoiceStatus !== "Open") { errors.push({ externalId: ext, message: `Ingetrokken in Wasroute, maar staat al op factuur ${cur.postedInvoiceNo || cur.salesInvoiceNo}. Maak zo nodig een creditnota.` }); continue; }
    ops.push({ kind: "voided", method: "PATCH", url: `${entity}(${cur.id})`, body: { status: "Vervallen", billable: false }, ext });
  }

  // Veiligheid: nooit ongemerkt een hele maand laten vervallen (bijv. als de meldingen niet geladen waren)
  const voids = ops.filter((o) => o.kind === "voided").length;
  if (voids && voids >= 10 && voids > existing.size / 2 && !(rows.length && url.searchParams.get("confirm") === "1"))
    return json({ error: `Dit zou ${voids} van de ${existing.size} regels in Business Central op Vervallen zetten. Controleer of alle meldingen geladen zijn en bevestig.`, needConfirm: true, voids }, 409);

  // 3. Uitvoeren in batches van 50 ($batch)
  const done = { created: 0, updated: 0, voided: 0 };
  for (let i = 0; i < ops.length; i += 50) {
    const part = ops.slice(i, i + 50);
    const body = { requests: part.map((o, k) => ({ method: o.method, id: String(k + 1), url: o.url, headers: { "Content-Type": "application/json", ...(o.method === "PATCH" ? { "If-Match": "*" } : {}) }, body: o.body })) };
    let d;
    try {
      const r = await fetch(`${apiRoot}/$batch`, { method: "POST", headers: H, body: JSON.stringify(body) });
      d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error?.message || `Business Central gaf fout ${r.status}`);
    } catch (err) {
      part.forEach((o) => errors.push({ externalId: o.ext, message: err.message }));
      continue;
    }
    for (const res of d.responses || []) {
      const o = part[Number(res.id) - 1];
      if (!o) continue;
      if (res.status >= 200 && res.status < 300) {
        done[o.kind]++;
        if (res.body && res.body.externalId) existing.set(res.body.externalId, res.body);
        else if (o.kind === "voided") existing.set(o.ext, { ...existing.get(o.ext), status: "Vervallen" });
      } else errors.push({ externalId: o.ext, message: res.body?.error?.message || `Fout ${res.status}` });
    }
  }
  return json({ ...done, unchanged, errors, bc: statusMap() });
};

export const config = { path: "/api/bc-sync" };
