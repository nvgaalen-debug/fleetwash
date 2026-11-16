// Voorbeelddata herstellen: elk profiel krijgt zijn eigen, passende voorbeelddata (geen kentekens/auto's bij schoonmaak).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { engine } from "./lib.mjs";

describe("Voorbeelddata per profiel", () => {
  test("zonder profiel-id (en standaardprofiel wassen): ongewijzigde wasdata", () => {
    const E = engine();
    const dates = E.call("T_sample");
    assert.equal(dates.length, 2);
    assert.equal(dates[0], "2026-10-29");
    const R = E.call("T_routes", dates[0]); // nog niet gepland, maar D moet bestaan
    assert.deepEqual(Object.keys(R).sort(), ["w1", "w2", "w3", "w4", "w5"]);
  });

  test("profiel schoonmaak-gebouwen: eigen klanten, ruimtes en medewerkers, alles plant", () => {
    const E = engine();
    const dates = E.call("T_sample", "schoonmaak-gebouwen");
    assert.equal(dates.length, 2);
    for (const date of dates) {
      const before = E.call("T_routes", date);
      assert.deepEqual(Object.values(before).flat(), []);
      const total = E.call("T_state", date).jobs.filter(j => j.date === date).length;
      E.call("T_plan", date);
      const m = E.call("T_metrics", date);
      assert.ok(m.feasible, `plan op ${date} is haalbaar`);
      assert.equal(m.split, 0);
      assert.equal(m.cars, total, `alles ingepland op ${date}`);
    }
  });

  test("schoonmaak-profiel gebruikt geen kentekens of auto-termen in de voorbeelddata", () => {
    const E = engine();
    E.call("T_sample", "schoonmaak-gebouwen");
    const jobs = E.call("T_state").jobs;
    assert.ok(jobs.length > 0);
    for (const j of jobs) {
      assert.doesNotMatch(j.plate, /^[A-Z]{2}-\d{3}-[A-Z]$/, "geen kentekenformaat als ruimtecode");
      assert.doesNotMatch(String(j.vehicle || ""), /VW|Toyota|Kia|Skoda|Peugeot|Volvo|Tesla|Renault|BMW|Audi|Transit|Sprinter|Crafter|Jumper/i);
    }
  });

  test("onbekend profiel-id valt terug op wassen (zoals profielKies zelf ook doet)", () => {
    const E = engine();
    const dates = E.call("T_sample", "niet-bestaand-profiel");
    assert.equal(dates[0], "2026-10-29");
  });

  test("profiel technische-dienst: eigen klussen bij klanten thuis, alles plant", () => {
    const E = engine();
    const dates = E.call("T_sample", "technische-dienst");
    assert.equal(dates.length, 2);
    for (const date of dates) {
      const total = E.call("T_state", date).jobs.filter(j => j.date === date).length;
      E.call("T_plan", date);
      const m = E.call("T_metrics", date);
      assert.ok(m.feasible, `plan op ${date} is haalbaar`);
      assert.equal(m.split, 0);
      assert.equal(m.cars, total, `alles ingepland op ${date}`);
    }
    const jobs = E.call("T_state").jobs;
    for (const j of jobs) {
      assert.doesNotMatch(j.plate, /^[A-Z]{2}-\d{3}-[A-Z]$/, "geen kentekenformaat als ordernummer");
      assert.doesNotMatch(String(j.vehicle || ""), /VW|Toyota|Kia|Skoda|Peugeot|Volvo|Tesla|Renault|BMW|Audi|Transit|Sprinter|Crafter|Jumper/i);
    }
  });
});
