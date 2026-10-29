// Wasroute Planner - gedeelde planning voor de medewerker-app.
// Opslag: Netlify Blobs (store "wasroute"), geen eigen database nodig.
//
// Sleutels:
//   token/<token>            -> { wid, name }       persoonlijke link van een medewerker
//   route/<wid>/<datum>      -> rit zoals de planner hem publiceerde
//   status/<datum>/<jobId>   -> { st: "done"|"issue", at, reason, note, wid, name }
//   msg/<wid>/<id>           -> bericht { id, wid, from: "planner"|"worker", text, urgent, date, ref, at, readAt, name }
//
// Endpoints:
//   POST /api/publiceer      planner: ritten en links opslaan          (APP_PASSWORD)
//   GET  /api/status?date=   planner: gereed- en probleemmeldingen      (APP_PASSWORD)
//   GET  /api/mijn-planning?t=<token>&date=   medewerker: eigen rit
//   POST /api/melding        medewerker: { t, date, jobId, st, reason, note }
//   GET  /api/berichten              planner: alle berichten (30 dagen)       (APP_PASSWORD)
//   GET  /api/berichten?t=<token>    medewerker: eigen berichten
//   POST /api/berichten  { action: "send", wids, text, urgent, date, ref }   planner      (APP_PASSWORD)
//                        { action: "seen", items: [{ wid, id }] }            planner      (APP_PASSWORD)
//                        { t, action: "read", ids }                          medewerker
//                        { t, action: "reply", text, ref }                   medewerker

import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const isToken = (s) => /^[a-z0-9]{16,64}$/i.test(s || "");
const isId = (s) => /^[\w-]{1,64}$/.test(s || "");
const plannerOk = (req) => {
  const pw = process.env.APP_PASSWORD;
  return !pw || req.headers.get("x-app-password") === pw;
};

async function worker(store, token) {
  if (!isToken(token)) return null;
  return store.get(`token/${token}`, { type: "json" });
}

async function statusesFor(store, date, onlyIds) {
  const { blobs } = await store.list({ prefix: `status/${date}/` });
  const out = {};
  await Promise.all(
    blobs.map(async (b) => {
      const id = b.key.split("/").pop();
      if (onlyIds && !onlyIds.has(id)) return;
      const v = await store.get(b.key, { type: "json" });
      if (v) out[id] = v;
    })
  );
  return out;
}

const KEEP_DAYS = 30;
const newMsgId = () => Date.now().toString(36).padStart(9, "0") + "-" + Math.random().toString(36).slice(2, 8);
const msgTime = (id) => parseInt(String(id).split("-")[0], 36) || 0;
const cleanText = (t, n) => String(t || "").replace(/\r/g, "").trim().slice(0, n);

async function messagesFor(store, prefix) {
  const { blobs } = await store.list({ prefix });
  const cutoff = Date.now() - KEEP_DAYS * 864e5;
  const out = [];
  await Promise.all(
    blobs.map(async (b) => {
      const id = b.key.split("/").pop();
      if (msgTime(id) < cutoff) { await store.delete(b.key); return; }
      const v = await store.get(b.key, { type: "json" });
      if (v) out.push(v);
    })
  );
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const store = getStore({ name: "wasroute", consistency: "strong" });

  try {
    // ---- planner: publiceren ----
    if (path.endsWith("/publiceer")) {
      if (req.method !== "POST") return json({ error: "Alleen POST is toegestaan." }, 405);
      if (!plannerOk(req)) return json({ error: "Wachtwoord vereist." }, 401);
      const body = await req.json();
      for (const t of body.tokens || []) {
        if (isToken(t.token) && isId(t.wid)) {
          await store.setJSON(`token/${t.token}`, { wid: t.wid, name: String(t.name || "").slice(0, 80) });
        }
      }
      for (const t of body.revoke || []) if (isToken(t)) await store.delete(`token/${t}`);
      let n = 0;
      for (const day of body.days || []) {
        if (!isDate(day.date)) continue;
        for (const r of day.routes || []) {
          if (!r || !r.worker || !isId(r.worker.id)) continue;
          await store.setJSON(`route/${r.worker.id}/${day.date}`, r);
          n++;
        }
      }
      return json({ ok: true, routes: n });
    }

    // ---- planner: meldingen ophalen ----
    if (path.endsWith("/status")) {
      if (!plannerOk(req)) return json({ error: "Wachtwoord vereist." }, 401);
      const date = url.searchParams.get("date");
      if (!isDate(date)) return json({ error: "Ongeldige datum." }, 400);
      return json({ date, status: await statusesFor(store, date) });
    }

    // ---- medewerker: eigen rit ----
    if (path.endsWith("/mijn-planning")) {
      const who = await worker(store, url.searchParams.get("t"));
      if (!who) return json({ error: "Deze link is nog niet actief of niet meer geldig. Vraag de planner om de planning te publiceren of om een nieuwe link." }, 401);
      const date = url.searchParams.get("date");
      if (!isDate(date)) return json({ error: "Ongeldige datum." }, 400);
      const route = await store.get(`route/${who.wid}/${date}`, { type: "json" });
      const { blobs } = await store.list({ prefix: `route/${who.wid}/` });
      const dates = blobs.map((b) => b.key.split("/").pop()).filter(isDate).sort();
      const ids = new Set((route?.visits || []).flatMap((v) => (v.jobs || []).map((j) => j.id)));
      const status = ids.size ? await statusesFor(store, date, ids) : {};
      return json({ name: who.name, date, route: route || null, dates, status });
    }

    // ---- medewerker: gereed of probleem melden ----
    if (path.endsWith("/melding")) {
      if (req.method !== "POST") return json({ error: "Alleen POST is toegestaan." }, 405);
      const b = await req.json();
      const who = await worker(store, b.t);
      if (!who) return json({ error: "Deze link is niet (meer) geldig." }, 401);
      if (!isDate(b.date) || !isId(b.jobId)) return json({ error: "Ongeldige melding." }, 400);
      const route = await store.get(`route/${who.wid}/${b.date}`, { type: "json" });
      const mine = (route?.visits || []).some((v) => (v.jobs || []).some((j) => j.id === b.jobId));
      if (!mine) return json({ error: "Deze afspraak staat niet (meer) in jouw planning." }, 403);
      const key = `status/${b.date}/${b.jobId}`;
      if (b.st === "open") {
        await store.delete(key);
      } else {
        await store.setJSON(key, {
          st: b.st === "issue" ? "issue" : "done",
          at: new Date().toISOString(),
          reason: String(b.reason || "").slice(0, 120),
          note: String(b.note || "").slice(0, 500),
          wid: who.wid,
          name: who.name,
        });
      }
      return json({ ok: true });
    }

    // ---- berichten tussen planner en medewerkers ----
    if (path.endsWith("/berichten")) {
      if (req.method === "GET") {
        const t = url.searchParams.get("t");
        if (t) {
          const who = await worker(store, t);
          if (!who) return json({ error: "Deze link is niet (meer) geldig." }, 401);
          return json({ messages: await messagesFor(store, `msg/${who.wid}/`) });
        }
        if (!plannerOk(req)) return json({ error: "Wachtwoord vereist." }, 401);
        return json({ messages: await messagesFor(store, "msg/") });
      }
      if (req.method !== "POST") return json({ error: "Alleen GET en POST zijn toegestaan." }, 405);
      const b = await req.json();
      const now = new Date().toISOString();

      if (b.t) {
        const who = await worker(store, b.t);
        if (!who) return json({ error: "Deze link is niet (meer) geldig." }, 401);
        if (b.action === "read") {
          for (const id of (b.ids || []).slice(0, 200)) {
            if (!isId(id)) continue;
            const key = `msg/${who.wid}/${id}`;
            const m = await store.get(key, { type: "json" });
            if (m && m.from === "planner" && !m.readAt) await store.setJSON(key, { ...m, readAt: now });
          }
          return json({ ok: true });
        }
        if (b.action === "reply") {
          const text = cleanText(b.text, 1000);
          if (!text) return json({ error: "Leeg bericht." }, 400);
          const id = newMsgId();
          const m = { id, wid: who.wid, name: who.name, from: "worker", text, at: now, readAt: null, ref: isId(b.ref) ? b.ref : "" };
          await store.setJSON(`msg/${who.wid}/${id}`, m);
          return json({ ok: true, message: m });
        }
        return json({ error: "Onbekende actie." }, 400);
      }

      if (!plannerOk(req)) return json({ error: "Wachtwoord vereist." }, 401);
      if (b.action === "send") {
        const text = cleanText(b.text, 1000);
        const wids = [...new Set((b.wids || []).filter(isId))].slice(0, 100);
        if (!text || !wids.length) return json({ error: "Kies een ontvanger en schrijf een bericht." }, 400);
        const sent = [];
        for (const wid of wids) {
          const id = newMsgId();
          const m = { id, wid, from: "planner", text, urgent: !!b.urgent, date: isDate(b.date) ? b.date : "", ref: cleanText(b.ref, 120), at: now, readAt: null };
          await store.setJSON(`msg/${wid}/${id}`, m);
          sent.push(m);
        }
        return json({ ok: true, messages: sent });
      }
      if (b.action === "seen") {
        for (const it of (b.items || []).slice(0, 300)) {
          if (!it || !isId(it.wid) || !isId(it.id)) continue;
          const key = `msg/${it.wid}/${it.id}`;
          const m = await store.get(key, { type: "json" });
          if (m && m.from === "worker" && !m.readAt) await store.setJSON(key, { ...m, readAt: now });
        }
        return json({ ok: true });
      }
      return json({ error: "Onbekende actie." }, 400);
    }

    return json({ error: "Onbekende aanvraag." }, 404);
  } catch (e) {
    return json({ error: "Serverfout: " + (e?.message || String(e)) }, 500);
  }
};

export const config = { path: ["/api/publiceer", "/api/status", "/api/mijn-planning", "/api/melding", "/api/berichten"] };
