// Losse planningsregels: bezoek als eenheid, fysieke locatie, pauze, vastzetting, invarianten.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { engine } from "./lib.mjs";

const DATE = "2026-12-21";
/* Kleine testset: één klant met parkeergarage en hoofdingang op hetzelfde adres, plus een ander adres */
function set({ werktijd = ["08:00", "16:30"], extraWorker = true, settings = {}, jobs } = {}) {
  const adres = { adres: "Stationsweg 46", postcode: "5803 AC", plaats: "VENRAY", lat: 51.5254, lng: 5.9741 };
  const fx = {
    medewerkers: [
      { id: "A", name: "Anna", start: werktijd[0], end: werktijd[1], lat: 51.45, lng: 5.95 },
      ...(extraWorker ? [{ id: "B", name: "Bram", start: "08:00", end: "16:30", lat: 51.90, lng: 5.50 }] : []),
    ],
    instellingen: { pauseMin: 30, pauseAt: "12:00", pauseTot: "", pauseMinDay: 330, kmWeight: 0.3, startAtFirst: true, endAtLast: false, travelSource: "estimate", ...settings },
    opdrachten: (jobs || [
      ["P-1", "Vigo parkeergarage", "11.30 tot 12.00"], ["P-2", "Vigo parkeergarage", "12.00 tot 12.30"],
      ["V-1", "Vigo hoofdingang", "12.30 tot 13.00"], ["V-2", "Vigo hoofdingang", "13.00 tot 13.30"],
    ]).map(([k, klant, tijd, extra]) => ({ kenteken: k, klant, tijd, datum: DATE, ...adres, ...(extra || {}) })),
  };
  const E = engine(); E.call("T_build", fx); return E;
}

describe("Bezoek als planningseenheid", () => {
  test("blocksOf geeft elke auto precies één keer terug", () => {
    const E = set();
    const blocks = E.call("T_blocks", ["P-1", "P-2", "V-1", "V-2"]);
    assert.deepEqual(blocks, [["P-1", "P-2"], ["V-1", "V-2"]]);
  });
  test("zelfde adres: 0 min reizen en parkeren, beide bezoeken bij één medewerker", () => {
    const E = set();
    E.call("T_plan", DATE);
    const w = E.call("T_workerOf", DATE, "P-1");
    for (const id of ["P-2", "V-1", "V-2"]) assert.equal(E.call("T_workerOf", DATE, id), w);
    const s = E.call("T_sim", w, E.call("T_routes", DATE)[w], DATE);
    assert.equal(s.stops.find(x => x.jobs.includes("V-1")).travel, 0);
    assert.ok(s.feas);
  });
  test("niemand past het hele bezoek: onbezet met melding, niet gesplitst", () => {
    const E = set({ werktijd: ["11:00", "12:45"], extraWorker: false });
    E.call("T_plan", DATE);
    const all = Object.values(E.call("T_routes", DATE)).flat();
    assert.ok(!(all.includes("V-1") && !all.includes("V-2")), "bezoek gesplitst");
    assert.deepEqual(E.call("T_invariant", DATE), []);
  });
  test("vastgezette auto: rest van het bezoek gaat mee, of melding bij geen ruimte", () => {
    const E = set({ werktijd: ["08:00", "13:00"] });
    E.call("T_pin", DATE, ["V-1"], "A");
    E.call("T_plan", DATE);
    assert.equal(E.call("T_workerOf", DATE, "V-1"), "A");
    const w2 = E.call("T_workerOf", DATE, "V-2");
    assert.ok(w2 === "A" || w2 === null, "rest van het bezoek bij een andere medewerker");
    if (w2 === null) assert.match(E.call("T_why", DATE, "V-2"), /vastzetting/);
  });
});

describe("Fysieke locatie", () => {
  test("andere schrijfwijze van hetzelfde adres is dezelfde plek", () => {
    const E = set({ jobs: [["A-1", "Klant A", "09.00 tot 09.30"], ["B-1", "Klant B", "09.30 tot 10.00", { adres: "  stationsweg 46  ", postcode: "", plaats: "Venray" }]] });
    assert.equal(E.call("T_samePlace", "A-1", "B-1").same, true);
  });
  test("ander huisnummer is een andere plek", () => {
    const E = set({ jobs: [["A-1", "Klant A", "09.00 tot 09.30"], ["B-1", "Klant B", "09.30 tot 10.00", { adres: "Stationsweg 48" }]] });
    assert.equal(E.call("T_samePlace", "A-1", "B-1").same, false);
  });
});

describe("Pauze", () => {
  const P = { pauseTot: "13:30" };
  test("klaar om 12:30 met venster tot 13:30: pauze 12:30–13:00", () => {
    const E = set({ settings: P, jobs: [["J-1", "K", "11.30 tot 12.00"], ["J-2", "K", "12.00 tot 12.30"]] });
    const s = E.call("T_sim", "A", ["J-1", "J-2"], DATE);
    assert.deepEqual(s.pauses, ["12:30-13:00"]); assert.equal(s.pauseMissing, false);
  });
  test("klaar vóór het venster: geen pauze nodig, geen melding", () => {
    const E = set({ settings: P, jobs: [["J-1", "K", "10.30 tot 11.00"], ["J-2", "K", "11.00 tot 11.30"]] });
    const s = E.call("T_sim", "A", ["J-1", "J-2"], DATE);
    assert.deepEqual(s.pauses, []); assert.equal(s.pauseMissing, false);
  });
  test("doorlopend bezoek door het hele venster: bezoek gepland, 'Pauze niet gepland'", () => {
    const E = set({ settings: P, jobs: [["J-1", "K", "11.45 tot 12.15"], ["J-2", "K", "12.15 tot 12.45"], ["J-3", "K", "12.45 tot 13.15"], ["J-4", "K", "13.15 tot 13.45"]] });
    const s = E.call("T_sim", "A", ["J-1", "J-2", "J-3", "J-4"], DATE);
    assert.equal(s.feas, true); assert.equal(s.pauseMissing, true);
  });
  test("nooit een pauze tussen auto's van één bezoek", () => {
    const E = set({ settings: { pauseTot: "13:30" }, jobs: [["J-1", "K", "11.30 tot 13.30"], ["J-2", "K", "11.30 tot 13.30"], ["J-3", "K", "11.30 tot 13.30"]] });
    const s = E.call("T_sim", "A", ["J-1", "J-2", "J-3"], DATE);
    const idx = k => s.seg.findIndex(x => x.startsWith(k));
    const jobs = s.seg.map((x, i) => [x, i]).filter(([x]) => x.startsWith("job")).map(([, i]) => i);
    const p = idx("pause");
    assert.ok(p < 0 || p < jobs[0] || p > jobs[jobs.length - 1], "pauze midden in het bezoek: " + s.seg.join(" | "));
  });
  test("pauze aan het eind van de dag duwt niemand buiten werktijd", () => {
    const E = set({ werktijd: ["08:00", "16:30"], jobs: [["J-1", "K", "14.00 tot 14.30"], ["J-2", "K", "14.30 tot 15.00"], ["J-3", "K2", "15.00 tot 15.30"], ["J-4", "K2", "15.30 tot 16.00"]] });
    const s = E.call("T_sim", "A", ["J-1", "J-2", "J-3", "J-4"], DATE);
    assert.equal(s.feas, true, s.seg.join(" | "));
  });
});
