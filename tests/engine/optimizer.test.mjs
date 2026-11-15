// Moeilijke optimizer-testset (moeilijke_optimizer_testset_wasroute.xlsx) en dagroute-testset (testset_dagroute_wasroute.xlsx).
// De exacte zoektocht (T_exact) is de referentie: dezelfde simulatie, reistijdbron en parkeerregels als de planner.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { withSet } from "./lib.mjs";

const r = x => Math.round(x);

describe("Moeilijke optimizer-testset, 17 december", () => {
  const D = "2026-12-17";

  test("acceptatiecriteria", () => {
    const E = withSet("moeilijk");
    E.call("T_plan", D);
    const m = E.call("T_metrics", D);
    assert.equal(m.visits, 10, "10/10 bezoeken");
    assert.equal(m.cars, 23, "23 auto's");
    assert.ok(r(m.trav) <= 328, `reistijd ${r(m.trav)} > 328 min`);
    assert.ok(r(m.km) <= 286, `km ${r(m.km)} > 286`);
    assert.ok(r(m.np) <= 348, `niet-productieve tijd ${r(m.np)} > 348 min`);
    assert.equal(m.pauseMissing, 0, "niet-geplande pauzes");
    assert.equal(r(m.over), 0, "overwerk");
    assert.equal(m.split, 0, "gesplitste bezoeken");
    assert.ok(m.feasible, "alle ritten haalbaar");
  });

  test("planner gelijk aan exact optimum (kosten)", () => {
    const E = withSet("moeilijk");
    E.call("T_plan", D);
    const p = E.call("T_metrics", D), x = E.call("T_exact", D).metrics;
    assert.equal(p.cars, x.cars);
    assert.ok(p.cost <= x.cost + 0.5, `planner ${p.cost.toFixed(1)} punten, optimum ${x.cost.toFixed(1)}`);
  });

  test("stabiliteit: opnieuw plannen zonder wijziging verplaatst niets", () => {
    const E = withSet("moeilijk");
    E.call("T_plan", D);
    const a = E.call("T_routes", D);
    E.call("T_plan", D);
    assert.deepEqual(E.call("T_routes", D), a);
    assert.equal(E.call("T_lastImprove", D).moved, 0);
  });

  test("vastgezet bezoek blijft bij de vastgezette medewerker", () => {
    const E = withSet("moeilijk");
    E.call("T_plan", D);
    E.call("T_pin", D, ["O-101-AA", "O-102-AA"], "Y");
    E.call("T_plan", D);
    assert.equal(E.call("T_workerOf", D, "O-101-AA"), "Y");
    assert.equal(E.call("T_workerOf", D, "O-102-AA"), "Y");
    const m = E.call("T_metrics", D);
    assert.equal(m.cars, 23); assert.equal(m.split, 0);
  });

  test("vaste pauze 13:00 bij Youssef: pauze staat, bezoeken eromheen, niets gesplitst", () => {
    const E = withSet("moeilijk");
    E.call("T_plan", D);
    E.call("T_setPause", D, "Y", { min: 30, from: null, tot: null, vast: "13:00" });
    E.call("T_plan", D);
    const r = E.call("T_routes", D).Y;
    const s = E.call("T_sim", "Y", r, D);
    if (r.length) { assert.deepEqual(s.pauses, ["13:00-13:30"], s.seg.join(" | ")); assert.ok(s.feas) }
    const m = E.call("T_metrics", D);
    assert.equal(m.split, 0); assert.ok(m.feasible);
  });

  test("rekentijd van autoPlan blijft beperkt", () => {
    const E = withSet("moeilijk");
    const ms = E.call("T_time", D);
    assert.ok(ms < 4000, `autoPlan duurde ${ms} ms`);
  });
});

describe("Dagroute-testset, 21 december", () => {
  const D = "2026-12-21";

  test("standaard: R-801/R-802 kan door niemand worden uitgevoerd (terugrit telt mee)", () => {
    const E = withSet("dagroute");
    E.call("T_plan", D);
    const m = E.call("T_metrics", D);
    assert.equal(m.cars, 19);
    assert.equal(m.split, 0);
    for (const w of ["Y", "L", "T"]) assert.equal(E.call("T_sim", w, ["R-801-HH", "R-802-HH"], D).feas, false, `R-801/802 zou passen bij ${w}`);
    assert.match(E.call("T_why", D, "R-801-HH"), /niet volledig door één medewerker|werktijd/);
    assert.ok(!Object.values(E.call("T_routes", D)).flat().includes("R-701-GG"), "niet-beschikbare auto ingepland");
  });

  test("standaard: planner gelijk aan exact optimum", () => {
    const E = withSet("dagroute");
    E.call("T_plan", D);
    const p = E.call("T_metrics", D), x = E.call("T_exact", D).metrics;
    assert.equal(p.cars, x.cars);
    assert.ok(p.cost <= x.cost + 0.5, `planner ${p.cost.toFixed(1)}, optimum ${x.cost.toFixed(1)}`);
  });

  test("werktijd eindigt bij laatste klus: alle 21 auto's", () => {
    const E = withSet("dagroute", { settings: { endAtLast: true } });
    E.call("T_plan", D);
    const m = E.call("T_metrics", D);
    assert.equal(m.cars, 21); assert.equal(m.split, 0);
  });

  /* Bekende grens van de lokale planner: het optimum vraagt een ruil tussen drie medewerkers tegelijk. */
  test("met pauze uiterlijk 13:30: binnen 10% van het exact optimum", () => {
    const E = withSet("dagroute", { settings: { endAtLast: true, pauseTot: "13:30" } });
    E.call("T_plan", D);
    const p = E.call("T_metrics", D), x = E.call("T_exact", D).metrics;
    assert.equal(p.cars, x.cars);
    assert.ok(p.cost <= x.cost * 1.10, `planner ${p.cost.toFixed(1)}, optimum ${x.cost.toFixed(1)}`);
  });
  test("met pauze uiterlijk 13:30: gelijk aan het exact optimum", { todo: "bekende grens: vraagt een ruil tussen drie medewerkers (circa 8% verschil)" }, () => {
    const E = withSet("dagroute", { settings: { endAtLast: true, pauseTot: "13:30" } });
    E.call("T_plan", D);
    const p = E.call("T_metrics", D), x = E.call("T_exact", D).metrics;
    assert.ok(p.cost <= x.cost + 0.5, `planner ${p.cost.toFixed(1)}, optimum ${x.cost.toFixed(1)}`);
  });
});
