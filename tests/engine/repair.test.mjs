// Repair-pass (diepte 1): een onbezet bezoek alsnog plannen door één ander bezoek naar een andere medewerker te verplaatsen.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { engine, withSet } from "./lib.mjs";

const DATE = "2026-12-21";
const plek = { venray: { adres: "Stationsweg 46", postcode: "5803 AC", plaats: "VENRAY", lat: 51.5254, lng: 5.9741 },
  boxmeer: { adres: "Steenstraat 85", postcode: "5831 JC", plaats: "BOXMEER", lat: 51.6466, lng: 5.9476 } };
function scenario() {
  const fx = {
    types: [{ id: "std", name: "Standaard", dur: 30, skill: "" }, { id: "coat", name: "Coating", dur: 30, skill: "coating" }],
    medewerkers: [
      { id: "A", name: "Anna", start: "08:00", end: "16:30", lat: 51.53, lng: 5.97, skills: ["coating"] },
      { id: "B", name: "Bram", start: "08:00", end: "16:30", lat: 51.84, lng: 5.85, skills: [] },
    ],
    instellingen: { pauseMin: 30, pauseAt: "12:00", pauseTot: "", pauseMinDay: 330, kmWeight: 0.3, startAtFirst: true, endAtLast: false, travelSource: "estimate" },
    opdrachten: [
      /* V: voorrang, eerst geplaatst, het goedkoopst bij Anna */
      { kenteken: "V-1", klant: "Klant V", tijd: "10.00 tot 10.30", datum: DATE, prioriteit: 3, ...plek.boxmeer },
      { kenteken: "V-2", klant: "Klant V", tijd: "10.30 tot 11.00", datum: DATE, prioriteit: 3, ...plek.boxmeer },
      /* U: zelfde tijd, vraagt coating: alleen Anna kan het */
      { kenteken: "U-1", klant: "Klant U", tijd: "10.00 tot 10.30", datum: DATE, type: "coat", ...plek.venray },
      { kenteken: "U-2", klant: "Klant U", tijd: "10.30 tot 11.00", datum: DATE, type: "coat", ...plek.venray },
    ],
  };
  const E = engine(); E.call("T_build", fx); return E;
}

describe("Repair-pass", () => {
  test("onbezet bezoek alsnog gepland door één ander bezoek te verplaatsen", () => {
    const E = scenario();
    E.call("T_plan", DATE);
    const w = id => E.call("T_workerOf", DATE, id);
    assert.equal(w("U-1"), "A", "het coatingbezoek hoort bij Anna: " + E.call("T_why", DATE, "U-1"));
    assert.equal(w("U-2"), "A");
    assert.equal(w("V-1"), "B", "het voorrangsbezoek is naar Bram verplaatst");
    assert.equal(w("V-2"), "B");
    const m = E.call("T_metrics", DATE);
    assert.equal(m.cars, 4); assert.equal(m.split, 0); assert.ok(m.feasible);
    assert.ok(E.call("T_repairs", DATE).length >= 1, "repair-pass gelogd");
  });

  test("vijf planners, voorbeeldwerktijden: 42 van 46 = het exacte maximum, niets gesplitst", () => {
    const E = withSet("vijf-planners");
    const D = "2026-12-17";
    E.call("T_plan", D);
    const m = E.call("T_metrics", D);
    assert.equal(m.cars, 42, `gepland ${m.cars} van 46`);
    assert.equal(m.split, 0); assert.ok(m.feasible); assert.equal(Math.round(m.over), 0);
    const R = Object.values(E.call("T_routes", D)).flat();
    assert.ok(!R.includes("P5-203-EE") && !R.includes("P5-303-EE"), "niet-beschikbare auto's ingepland");
    for (const [a, b, same] of [["P1-201-AA", "P1-203-AA", true], ["P2-101-BB", "P2-103-BB", true], ["P3-201-CC", "P3-203-CC", false]])
      assert.equal(E.call("T_samePlace", a, b).same, same, `${a}/${b}`);
  });
});
