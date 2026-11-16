/* Testhulpmiddelen die BINNEN de planningsmotor draaien (zelfde context als js/01-kern.js en js/02-planning-engine.js).
   Alleen functie-declaraties, zodat de testcode ze kan aanroepen. Geeft altijd JSON-veilige waarden terug. */

/* Testset opbouwen zoals de import dat doet: één klant per klantnaam, één locatie per klant + adres, 'Niet beschikbaar' overslaan. */
function T_build(fx, opts) {
  opts = opts || {};
  const S0 = sample();
  D = S0;
  D.customers = []; D.locations = []; D.jobs = []; D.plans = {}; D.absences = []; D.sickLog = [];
  D.types = fx.types || [{ id: 'std', name: 'Standaard', dur: 30, skill: '' }];
  D.workers = fx.medewerkers.map((w, i) => ({
    id: w.id, name: w.name, postcode: w.postcode || '', city: w.city || '', lat: w.lat, lng: w.lng, geo: 'manual',
    start: w.start, end: w.end, days: [0, 1, 2, 3, 4, 5, 6], absent: [], skills: w.skills || [], overrides: {}, color: i, token: 'tok' + w.id.toLowerCase() + 'test0000000000000'
  }));
  Object.assign(D.settings, fx.instellingen || {}, opts.settings || {});
  if (!('pauseTot' in (fx.instellingen || {})) && !(opts.settings && 'pauseTot' in opts.settings)) D.settings.pauseTot = '';
  const cus = {}, loc = {};
  for (const r of fx.opdrachten) {
    if (/niet beschikbaar/i.test(r.tijd)) continue;
    if (!cus[r.klant]) { cus[r.klant] = { id: 'K' + D.customers.length, name: r.klant }; D.customers.push(cus[r.klant]) }
    const lk = r.klant + '|' + r.adres;
    if (!loc[lk]) {
      loc[lk] = { id: 'L' + D.locations.length, customerId: cus[r.klant].id, name: r.klant, address: r.adres, postcode: r.postcode || '', city: r.plaats, lat: r.lat, lng: r.lng, geo: 'manual' };
      D.locations.push(loc[lk]);
    }
    const m = /(\d{1,2})[.:](\d{2})\s*tot\s*(\d{1,2})[.:](\d{2})/.exec(r.tijd);
    D.jobs.push({ id: r.kenteken, plate: r.kenteken, date: r.datum, locationId: loc[lk].id, type: r.type || 'std', duration: 30, priority: r.prioriteit || 2,
      from: m[1].padStart(2, '0') + ':' + m[2], to: m[3].padStart(2, '0') + ':' + m[4], info: r.info });
  }
  LEGS.clear();
  index();
  return [...new Set(D.jobs.map(j => j.date))].sort();
}

/* Voorbeelddata laden zoals 'Voorbeelddata herstellen' dat doet: D=sample(profielId), gevolgd door index(). */
function T_sample(profielId) {
  LEGS.clear();
  D = sample(profielId);
  index();
  return [...new Set(D.jobs.map(j => j.date))].sort();
}

function T_plan(date) { autoPlan(date); return T_routes(date) }
function T_routes(date) { const P = D.plans[date] || { routes: {} }, o = {}; D.workers.forEach(w => o[w.id] = (P.routes[w.id] || []).slice()); return o }
function T_workerOf(date, id) { const R = T_routes(date); return Object.keys(R).find(w => R[w].includes(id)) || null }
function T_pin(date, ids, wid) { const P = getPlan(date); ids.forEach(id => P.pinned[id] = wid) }
function T_lastImprove(date) { return (D.plans[date] || {}).lastImprove || null }
function T_why(date, id) { return whyUnplanned(JOB[id], date) }
function T_samePlace(idA, idB) { const a = LOC[JOB[idA].locationId], b = LOC[JOB[idB].locationId]; return { same: samePhysicalLocation(a, b), keyA: physKey(a), keyB: physKey(b) } }
function T_invariant(date) { return visitInvariant(date) }
function T_blocks(ids) { visitReset(); return blocksOf(ids).map(b => b.ids) }
function T_visits(date) { visitReset(); return blocksOf(jobsOn(date).map(j => j.id)).map(b => b.ids) }

/* Simulatie van één rit met samenvatting */
function T_sim(wid, ids, date, settings) {
  const keep = {};
  if (settings) for (const k in settings) { keep[k] = D.settings[k]; D.settings[k] = settings[k] }
  try {
    const s = simulate(WRK[wid], ids, date);
    return {
      feas: !ids.length || feas(s), late: s.late, over: s.over, lateJobs: s.lateJobs, trav: s.trav, km: s.km, wait: s.wait,
      waitBetween: waitBetween(s), np: npOf(s), cost: costOf(s), pauseMissing: !!s.pauseMissing, finish: m2t(s.finish),
      stops: s.stops.map(x => ({ loc: x.loc.id, travel: x.travel, samePlace: !!x.samePlace, jobs: x.jobs.slice() })),
      pauses: s.seg.filter(x => x.k === 'pause').map(x => m2t(x.a) + '-' + m2t(x.b)),
      seg: s.seg.map(x => x.k + ' ' + m2t(x.a) + '-' + m2t(x.b))
    };
  } finally { for (const k in keep) D.settings[k] = keep[k] }
}

/* KPI's volgens 'Testdoel en score' van de moeilijke testset */
function T_metrics(date, R) {
  R = R || T_routes(date);
  visitReset();
  const t = { visits: 0, cars: 0, trav: 0, km: 0, stops: 0, np: 0, pauseMissing: 0, over: 0, cost: 0, feasible: true, split: 0, perWorker: {} };
  const where = {};
  for (const w of D.workers) {
    const r = R[w.id] || []; r.forEach(id => where[id] = w.id);
    const s = simulate(w, r, date);
    const m = { cars: r.length, visits: r.length ? blocksOf(r).length : 0, trav: s.trav, km: s.km, stops: s.stops.length, np: npOf(s), pauseMissing: s.pauseMissing ? 1 : 0, over: s.over, cost: costOf(s), feasible: !r.length || feas(s) };
    t.perWorker[w.id] = m;
    for (const k of ['cars', 'visits', 'trav', 'km', 'stops', 'np', 'pauseMissing', 'over', 'cost']) t[k] += m[k];
    t.feasible = t.feasible && m.feasible;
  }
  /* gesplitste bezoeken: één bezoek over meer dan één medewerker, of deels gepland */
  for (const v of T_visits(date)) { const ws = new Set(v.map(id => where[id] || '-')); if (ws.size > 1) t.split++ }
  return t;
}

/* Exacte referentie: per medewerker elke volgorde van elke combinatie van bezoeken (afkappen zodra een auto te laat is),
   daarna de beste verdeling over alle medewerkers. Doel: 1) meeste auto's 2) minste niet-geplande pauzes 3) laagste kosten (costOf). */
function T_exact(date) {
  visitReset();
  const vis = T_visits(date), NV = vis.length, ws = D.workers;
  if (NV > 26) throw new Error('Te veel bezoeken voor de exacte zoektocht: ' + NV);
  const best = {};
  for (const w of ws) {
    const B = new Map(); B.set(0, { pm: 0, cost: 0, r: [] });
    (function dfs(mask, r) {
      for (let i = 0; i < NV; i++) {
        if (mask & (1 << i)) continue;
        const r2 = r.concat(vis[i]), s = simulate(w, r2, date);
        if (s.late > .5 || s.skillBad.length) continue;
        const m2 = mask | (1 << i);
        if (feas(s)) { const c = { pm: s.pauseMissing ? 1 : 0, cost: costOf(s), r: r2 }, o = B.get(m2); if (!o || c.pm < o.pm || (c.pm === o.pm && c.cost < o.cost - 1e-6)) B.set(m2, c) }
        dfs(m2, r2);
      }
    })(0, []);
    best[w.id] = B;
  }
  const cars = m => { let n = 0; for (let i = 0; i < NV; i++) if (m & (1 << i)) n += vis[i].length; return n };
  const better = (a, b) => !b || a.cars > b.cars || (a.cars === b.cars && (a.pm < b.pm || (a.pm === b.pm && a.cost < b.cost - 1e-6)));
  const FULL = (1 << NV) - 1;
  /* combineer medewerkers één voor één: beste per gebruikt masker */
  let layer = new Map([[0, { cars: 0, pm: 0, cost: 0, R: {} }]]);
  for (const w of ws) {
    const next = new Map();
    for (const [m, a] of layer) for (const [mw, e] of best[w.id]) {
      if (m & mw) continue;
      const c = { cars: a.cars + cars(mw), pm: a.pm + e.pm, cost: a.cost + e.cost, R: Object.assign({}, a.R, { [w.id]: e.r }) };
      const k = m | mw; if (better(c, next.get(k))) next.set(k, c);
    }
    layer = next;
  }
  let opt = null; for (const [, c] of layer) if (better(c, opt)) opt = c;
  ws.forEach(w => { if (!opt.R[w.id]) opt.R[w.id] = [] });
  return { routes: opt.R, metrics: T_metrics(date, opt.R) };
}

/* Tijdsmeting van autoPlan in milliseconden */
function T_time(date) { const t = Date.now(); autoPlan(date); return Date.now() - t }

/* Volledige planningsstatus voor de testserver (PUT /api/state), met de gekozen datum als startdag */
function T_state(date) { D.ui = { date, pview: 'dag' }; return D }

/* Pauze per medewerker per dag instellen, zoals 'Pauze deze dag' */
function T_setPause(date, wid, pz) { const P = getPlan(date); P.pauze = P.pauze || {}; P.pauze[wid] = pz }

/* Werktijd van een medewerker aanpassen (alle dagen) */
function T_setShift(wid, start, end) { const w = WRK[wid]; if (start) w.start = start; if (end) w.end = end }

/* Wat de repair-pass deed bij de laatste autoPlan */
function T_repairs(date) { return ((D.plans[date] || {}).lastImprove || {}).repaired || [] }
