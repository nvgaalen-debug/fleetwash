// Regressieset: testplanning_regressietesten.xlsx (TEST 1 t/m 5), met en zonder 'pauze uiterlijk'.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { withSet } from "./lib.mjs";

const TESTS = [
  { naam: "TEST 1 zelfde adres, twee bezoeken", datum: "2026-12-31", v1: ["T-101-AA", "T-102-AA"], v2: ["T-103-AA", "T-104-AA"], zelfdePlek: true },
  { naam: "TEST 2 huisnummer 46 en 48", datum: "2026-12-30", v1: ["T-201-BB", "T-202-BB"], v2: ["T-203-BB", "T-204-BB"], zelfdePlek: false },
  { naam: "TEST 3 ander adres zelfde plaats", datum: "2026-12-24", v1: ["T-301-CC", "T-302-CC"], v2: ["T-303-CC", "T-304-CC"], zelfdePlek: false },
  { naam: "TEST 4 schrijfwijze A en B", datum: "2026-12-23", v1: ["T-401-DD", "T-402-DD"], v2: ["T-403-DD", "T-404-DD"], zelfdePlek: true },
];

for (const [label, pauseTot] of [["zonder pauze uiterlijk", ""], ["met pauze uiterlijk 13:30", "13:30"]]) {
  describe(`Regressie, ${label}`, () => {
    for (const t of TESTS) {
      test(t.naam, () => {
        const E = withSet("regressie", { settings: { pauseTot } });
        E.call("T_plan", t.datum);
        const w = id => E.call("T_workerOf", t.datum, id);
        const sp = E.call("T_samePlace", t.v1[0], t.v2[0]);
        assert.equal(sp.same, t.zelfdePlek, `samePhysicalLocation ${sp.keyA} / ${sp.keyB}`);
        for (const v of [t.v1, t.v2]) {
          assert.ok(w(v[0]), `${v[0]} is niet gepland: ${E.call("T_why", t.datum, v[0])}`);
          assert.ok(v.every(id => w(id) === w(v[0])), `bezoek ${v.join(",")} is gesplitst`);
        }
        const wid = w(t.v2[0]);
        const s = E.call("T_sim", wid, E.call("T_routes", t.datum)[wid], t.datum);
        const stop = s.stops.find(x => x.jobs.includes(t.v2[0]));
        if (t.zelfdePlek) {
          assert.equal(w(t.v1[0]), w(t.v2[0]), "aansluitende bezoeken op dezelfde plek horen bij dezelfde medewerker");
          assert.equal(stop.travel, 0, "0 minuten reizen en parkeren verwacht");
        } else {
          assert.ok(stop.travel > 0, "reistijd moet groter dan 0 zijn");
        }
        assert.deepEqual(E.call("T_invariant", t.datum), [], "visit-invariant");
      });
    }
    test("TEST 5 niet beschikbaar", () => {
      const E = withSet("regressie", { settings: { pauseTot } });
      const d = "2026-12-22";
      E.call("T_plan", d);
      const R = E.call("T_routes", d), all = Object.values(R).flat();
      assert.ok(!all.includes("T-502-EE") && !all.includes("T-504-EE"), "niet-beschikbare auto's ingepland");
      assert.ok(all.includes("T-501-EE") && all.includes("T-503-EE"));
      assert.equal(E.call("T_workerOf", d, "T-501-EE"), E.call("T_workerOf", d, "T-503-EE"));
    });
  });
}

test("TEST 4: bezoek gaat voor op de pauze (fitsWithoutPause en fitsWithPause)", () => {
  const E = withSet("regressie", { settings: { pauseTot: "" } });
  const ids = ["T-401-DD", "T-402-DD", "T-403-DD", "T-404-DD"];
  const met = E.call("T_sim", "Y", ids, "2026-12-23");
  const zonder = E.call("T_sim", "Y", ids, "2026-12-23", { pauseMin: 0 });
  assert.ok(zonder.feas, "zonder pauze moet het passen");
  assert.ok(met.feas, "met pauze-instelling moet het ook passen: de pauze mag het bezoek niet blokkeren");
  assert.ok(met.pauseMissing, "pauze past nergens: melding 'Pauze niet gepland' verwacht");
});
