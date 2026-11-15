// Rooktest Wasroute Planner: de belangrijkste handelingen van een planner, in een echte browser,
// tegen de testserver (echte API-code, opslag in geheugen). Testset: moeilijke_optimizer_testset_wasroute.xlsx.
import { test, expect, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedState, resetServer, openApp, offline, routes, workerOf, synced } from "./support.mjs";
import { fixture } from "../engine/lib.mjs";

const DAG = "2026-12-17";
const here = path.dirname(fileURLToPath(import.meta.url));
const XLSX_TEST = path.join(here, "..", "fixtures", "moeilijk.xlsx");

/* KPI's van de dag zoals de app ze berekent */
const kpi = page => page.evaluate(d => {
  const out = { cars: 0, trav: 0, km: 0, np: 0, split: 0, pauseMissing: 0, late: 0 }, where = {};
  for (const w of D.workers) {
    const r = (D.plans[d].routes[w.id] || []); r.forEach(id => where[id] = w.id);
    const s = simulate(w, r, d); out.cars += r.length; out.trav += s.trav; out.km += s.km; out.np += npOf(s);
    out.pauseMissing += s.pauseMissing ? 1 : 0; out.late += s.late;
  }
  visitReset();
  for (const b of blocksOf(jobsOn(d).map(j => j.id))) if (new Set(b.ids.map(id => where[id] || '-')).size > 1) out.split++;
  return out;
}, DAG);

/* Alle auto's van een bezoek bij dezelfde medewerker? */
async function visitAt(page, ids) {
  const ws = await Promise.all(ids.map(id => workerOf(page, DAG, id)));
  return new Set(ws).size === 1 ? ws[0] : ws;
}

test.beforeEach(async ({ request }) => {
  await resetServer(request, seedState("moeilijk", DAG));
});

test("1. planning laden en automatisch plannen", async ({ page }) => {
  await openApp(page, DAG);
  await page.getByRole("button", { name: "Automatisch plannen" }).click();
  await expect(page.locator("#toast")).toContainText(/Planning (automatisch opnieuw gemaakt|verbeterd)/);
  const k = await kpi(page);
  expect(k.cars).toBe(23);
  expect(k.split).toBe(0);
  expect(k.late).toBe(0);
  expect(Math.round(k.trav)).toBeLessThanOrEqual(328);
  expect(Math.round(k.km)).toBeLessThanOrEqual(286);
  await expect(page.getByText("23 / 23")).toBeVisible();
  await synced(page);
});

test("2. één auto verplaatsen via 'Verplaats naar…' neemt het hele bezoek mee", async ({ page }) => {
  await openApp(page, DAG);
  const horst = ["O-401-DD", "O-402-DD", "O-403-DD"];
  const van = await visitAt(page, horst);
  const naar = van === "T" ? "Y" : "T";
  await page.locator(`button.tl-who[data-wid="${van}"]`).click();
  await page.locator(`select[data-act=moveto][data-ids="O-401-DD"]`).selectOption(naar);
  await expect.poll(() => visitAt(page, horst)).toBe(naar);
  const pinned = await page.evaluate(([d, ids]) => ids.map(id => D.plans[d].pinned[id]), [DAG, horst]);
  expect(pinned).toEqual([naar, naar, naar]);
  expect((await kpi(page)).split).toBe(0);
});

test("3. één auto slepen naar een andere medewerker neemt het hele bezoek mee", async ({ page }) => {
  await openApp(page, DAG);
  const deurne = ["O-501-EE", "O-502-EE", "O-503-EE"];
  const van = await visitAt(page, deurne);
  const naar = van === "L" ? "T" : "L";
  /* Het blok van het bezoek in de dagplanning naar de rij van een andere medewerker slepen */
  const bron = page.locator(`.blk.job[data-drag*="O-502-EE"]`);
  const doel = page.locator(`[data-drop^="row:${naar}"]`).first();
  await bron.scrollIntoViewIfNeeded();
  await bron.dragTo(doel, { targetPosition: { x: 40, y: 10 } });
  await expect.poll(() => visitAt(page, deurne)).toBe(naar);
  expect((await kpi(page)).split).toBe(0);
});

test("4. medewerker ziek melden: bezoeken blijven heel", async ({ page }) => {
  await openApp(page, DAG);
  await page.locator(`button.tl-who[data-wid="L"]`).click();
  await page.getByRole("button", { name: "Ziek melden" }).click();
  await page.getByRole("button", { name: "Ziek melden en herplannen" }).click();
  await expect(page.locator("#modal")).toBeVisible();
  const R = await routes(page, DAG);
  expect(R.L || []).toEqual([]);
  expect((await kpi(page)).split).toBe(0);
  /* Wat niet past staat als onbezet met een reden, niet half verdeeld */
  const onbezet = await page.evaluate(d => jobsOn(d).filter(j => !Object.values(D.plans[d].routes).flat().includes(j.id)).map(j => j.id), DAG);
  for (const id of onbezet) expect(await page.evaluate(([d, i]) => whyUnplanned(JOB[i], d), [DAG, id])).toBeTruthy();
});

test("5. vaste pauze per medewerker: planning eromheen", async ({ page }) => {
  await openApp(page, DAG);
  await page.locator(`button.tl-who[data-wid="Y"]`).click();
  await page.getByRole("button", { name: "Pauze deze dag" }).click();
  await page.locator("#f_vast").fill("13:00");
  await page.locator("#dlgF").evaluate(f => f.requestSubmit());
  await expect(page.locator("#toast")).toContainText("Pauze vastgezet om 13:00");
  const seg = await page.evaluate(d => simulate(WRK.Y, D.plans[d].routes.Y, d).seg.filter(x => x.k === "pause").map(x => m2t(x.a) + "-" + m2t(x.b)), DAG);
  expect(seg).toEqual(["13:00-13:30"]);
  expect((await kpi(page)).split).toBe(0);
});

test("6. Excel importeren via het scherm", async ({ page, request }) => {
  await resetServer(request, seedState("moeilijk", DAG));
  /* Lege planning op de server, dan de testset via het scherm importeren */
  await page.request.post("/__test/reset");
  await openApp(page, DAG);
  await page.locator(`[data-act=navto][data-to="act:import"]`).evaluate(b => b.click());
  await page.locator("#xf").setInputFiles(XLSX_TEST);
  await expect(page.getByText(/opdrachten worden ingepland/)).toBeVisible();
  await expect(page.getByRole("button", { name: /23 opdrachten importeren/ })).toBeVisible();
  await page.getByRole("button", { name: /23 opdrachten importeren/ }).click();
  await expect(page.locator("#modal")).toBeHidden({ timeout: 45_000 });
  await expect.poll(() => page.evaluate(d => jobsOn(d).length, DAG)).toBe(23);
  const nb = await page.evaluate(() => D.jobs.some(j => j.plate === "O-999-ZZ"));
  expect(nb).toBe(false);
  /* Duur per auto: vaste slots van 30 min = 30 min; lange tijdvakken (FLEX) = venster met standaardduur 30 min */
  const duur = await page.evaluate(d => Object.fromEntries(jobsOn(d).map(j => [j.plate, jobDur(j)])), DAG);
  const std = await page.evaluate(d => { const j = jobsOn(d).find(x => x.plate === "O-301-CC"); return TYP[j.type].dur }, DAG);
  expect(duur["O-101-AA"]).toBe(30);           // vast slot 08:30-09:00
  expect(duur["O-301-CC"]).toBe(std);          // venster 09:30-12:00: standaardduur, niet 150 min
  expect(duur["O-401-DD"]).toBe(std);          // venster 09:30-12:30: standaardduur, niet 180 min
  /* Na het importeren is alles gepland (importlog: 23 ingepland), daarna nog eens automatisch plannen: niets onbezet of gesplitst */
  await expect(page.getByRole("button", { name: /Ingepland\s*23/ })).toBeVisible();
  await page.locator(`[data-act=navto][data-to="planning"]`).first().evaluate(b => b.click());
  await page.getByRole("button", { name: "Automatisch plannen" }).click();
  await expect.poll(async () => (await kpi(page)).cars).toBe(23);
  const k = await kpi(page);
  expect(k.split).toBe(0);
  expect(k.late).toBe(0);
  console.log(`Import + plannen: ${k.cars} auto's, ${Math.round(k.trav)} min reizen, ${Math.round(k.km)} km, niet-productief ${Math.round(k.np)} min`);
});

test("6b. Excel met vijf planners importeren: postcode in adreskolom, 42 van 46 gepland, niets gesplitst", async ({ page }) => {
  await page.request.post("/__test/reset");
  await openApp(page, DAG);
  await page.locator(`[data-act=navto][data-to="act:import"]`).evaluate(b => b.click());
  await page.locator("#xf").setInputFiles(path.join(here, "..", "fixtures", "vijf-planners.xlsx"));
  await expect(page.getByRole("button", { name: /46 opdrachten importeren/ })).toBeVisible();
  await page.getByRole("button", { name: /46 opdrachten importeren/ }).click();
  await expect(page.locator("#modal")).toBeHidden({ timeout: 45_000 });
  await expect.poll(() => page.evaluate(d => jobsOn(d).length, DAG)).toBe(46);
  await page.locator(`[data-act=navto][data-to="planning"]`).first().evaluate(b => b.click());
  await page.getByRole("button", { name: "Automatisch plannen" }).click();
  await expect.poll(async () => (await kpi(page)).cars).toBe(42);
  const k = await kpi(page);
  expect(k.split).toBe(0);
  expect(k.late).toBe(0);
  /* Zelfde fysieke plek bij andere schrijfwijze, ander huisnummer is een andere plek */
  const same = await page.evaluate(() => { const L = id => LOC[JOB[D.jobs.find(j => j.plate === id).id].locationId];
    return [samePhysicalLocation(L("P2-101-BB"), L("P2-103-BB")), samePhysicalLocation(L("P3-201-CC"), L("P3-203-CC"))] });
  expect(same).toEqual([true, false]);
  console.log(`Vijf planners: ${k.cars}/46 auto's, ${Math.round(k.trav)} min reizen, ${Math.round(k.km)} km`);
});

test("7. keten: publiceren → medewerker meldt gereed met foto → planner ziet foto → archiveren → foto's opschonen", async ({ page, browser }) => {
  await openApp(page, DAG);
  await synced(page);
  await page.getByRole("button", { name: "Publiceer naar medewerkers" }).click();
  await page.locator("#modal").getByRole("button", { name: "Publiceren" }).click();
  await expect(page.locator("#toast")).toContainText(/ublic/);

  /* Medewerker die O-201 (Nijmegen anker) rijdt opent de app op zijn telefoon */
  const wid = await workerOf(page, DAG, "O-201-BB");
  const token = await page.evaluate(w => WRK[w].token, wid);
  const ctx = await browser.newContext({ ...devices["Pixel 7"], locale: "nl-NL", timezoneId: "Europe/Amsterdam" });
  const tel = await ctx.newPage();
  await tel.clock.setFixedTime(new Date(DAG + "T08:00:00+01:00"));
  await offline(tel);
  await tel.goto(`/medewerker.html?t=${token}`);
  await expect(tel.getByText("O-201-BB").first()).toBeVisible();
  const kaart = tel.locator(`[data-act=done][data-id="O-201-BB"]`);
  await kaart.click();
  await expect(tel.locator(`[data-act=foto][data-id="O-201-BB"]`)).toBeVisible();
  const [chooser] = await Promise.all([tel.waitForEvent("filechooser"), tel.locator(`[data-act=foto][data-id="O-201-BB"]`).click()]);
  /* Kleine geldige JPEG als testfoto */
  const jpg = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  await chooser.setFiles({ name: "test.jpg", mimeType: "image/jpeg", buffer: jpg });
  await expect(tel.getByText("Foto opgeslagen.")).toBeVisible();
  await expect.poll(async () => (await (await page.request.get("/__test/blobs?c=wasroute")).json()).some(k => k.startsWith(`pod/${DAG}/O-201-BB/`))).toBe(true);
  await ctx.close();

  /* Planner ziet de foto */
  await page.getByRole("button", { name: "Ververs" }).click();
  await page.locator(`button.tl-who[data-wid="${wid}"]`).click();
  await page.locator(`[data-act=fotoplan][data-id="O-201-BB"]`).click();
  await expect(page.locator("#modal img").first()).toBeVisible();
  await page.keyboard.press("Escape");

  /* Gereed gemelde bezoeken archiveren: O-201 staat daarna in het archief */
  await page.evaluate(() => archiveerGereed());
  await expect(page.locator("#toast")).toContainText(/gearchiveerd/);
  const arch = await (await page.request.get(`/api/archief?van=${DAG}&tot=${DAG}`)).json();
  expect((arch.items || []).some(x => x.job && x.job.id === "O-201-BB")).toBe(true);

  /* Foto's opschonen met datumfilter op de archiefpagina */
  await page.locator(`[data-act=navto][data-to="instellingen:archief"]`).evaluate(b => b.click());
  await page.locator("#fotoVan").fill(DAG);
  await page.locator("#fotoTot").fill(DAG);
  await page.locator("[data-act=fotoswis]").click();
  await expect.poll(async () => (await (await page.request.get("/__test/blobs?c=wasroute")).json()).filter(k => k.startsWith(`pod/${DAG}/`)).length).toBe(0);
});

/* Bekend probleem: bij een verlopen sessie meldt de app 'Failed to fetch' in plaats van terug te sturen naar het inloggen.
   test.fail: deze test hoort nu te falen. Zodra de app dit goed afhandelt, slaagt hij en geeft Playwright een signaal. */
test("8. verlopen sessie: duidelijke melding en terug naar inloggen", async ({ page }) => {
  test.fail(true, "Bekend: 'Failed to fetch' bij verlopen sessie (nog niet gerepareerd)");
  await openApp(page, DAG);
  await page.request.post("/__test/sessie-verlopen?aan=1");
  await page.getByRole("button", { name: "Automatisch plannen" }).click();
  await expect(page.getByText(/sessie is verlopen|opnieuw inloggen/i)).toBeVisible({ timeout: 8000 });
});
