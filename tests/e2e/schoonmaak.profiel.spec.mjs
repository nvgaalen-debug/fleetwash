// Profiel 'schoonmaak-gebouwen': dezelfde app, andere branche. Profiel kiezen in Beheer, Excel importeren,
// plannen, en controleren dat de woorden, de importregels en de medewerker-app het profiel volgen.
import { test, expect, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openApp, offline, routes, workerOf, synced } from "./support.mjs";

const DAG = "2026-12-17";
const here = path.dirname(fileURLToPath(import.meta.url));

test("profiel schoonmaak gebouwen: kiezen, importeren, plannen, medewerker-app", async ({ page, browser }) => {
  await page.request.post("/__test/reset");
  await openApp(page, DAG);

  /* 1. Profiel kiezen in Beheer > Planning en reistijd */
  await page.locator(`[data-act=navto][data-to="instellingen:planning"]`).first().evaluate(b => b.click());
  await page.locator("#set_profiel").selectOption("schoonmaak-gebouwen");
  await page.locator("[data-act=saveset]").first().click();
  await expect(page.locator('[data-profiel="naam"]')).toHaveText("Schoonmaakroute");
  await expect(page).toHaveTitle("Schoonmaakroute Planner");
  await synced(page);

  /* 2. Excel importeren: kolom 'Ruimtecode' wordt herkend, 'Niet beschikbaar' overgeslagen */
  await page.locator(`[data-act=navto][data-to="act:import"]`).evaluate(b => b.click());
  await page.locator("#xf").setInputFiles(path.join(here, "..", "fixtures", "schoonmaak.xlsx"));
  await expect(page.getByRole("button", { name: /6 opdrachten importeren/ })).toBeVisible();
  await expect(page.locator("#modal")).toContainText("Ruimtecode");
  await page.getByRole("button", { name: /6 opdrachten importeren/ }).click();
  await expect(page.locator("#modal")).toBeHidden({ timeout: 45_000 });
  await expect.poll(() => page.evaluate(d => jobsOn(d).length, DAG)).toBe(6);
  expect(await page.evaluate(() => D.jobs.some(j => j.plate === "HO-1.02"))).toBe(false);

  /* 3. Regels van het profiel: slot tot 120 min is hard (90 min gedeeld door 2 ruimtes = 45), 4 uur is een venster */
  const duur = await page.evaluate(d => Object.fromEntries(jobsOn(d).map(j => [j.plate, jobDur(j)])), DAG);
  const std = await page.evaluate(d => { const j = jobsOn(d).find(x => x.plate === "NW-0.10"); return TYP[j.type].dur }, DAG);
  expect(duur["GB-1.01"]).toBe(45);
  expect(duur["NW-0.10"]).toBe(std);
  const zelfdePand = await page.evaluate(() => { const L = p => LOC[D.jobs.find(j => j.plate === p).locationId]; return samePhysicalLocation(L("GB-1.01"), L("GB-2.14")) });
  expect(zelfdePand).toBe(true);

  /* 4. Plannen: alles gepland, niets gesplitst */
  await page.locator(`[data-act=navto][data-to="planning"]`).first().evaluate(b => b.click());
  await page.getByRole("button", { name: "Automatisch plannen" }).click();
  await expect.poll(async () => Object.values(await routes(page, DAG)).flat().length).toBe(6);
  const split = await page.evaluate(d => { visitReset(); const where = {}; Object.entries(D.plans[d].routes).forEach(([w, r]) => r.forEach(id => where[id] = w));
    return blocksOf(jobsOn(d).map(j => j.id)).filter(b => new Set(b.ids.map(id => where[id])).size > 1).length }, DAG);
  expect(split).toBe(0);

  /* 5. Woorden op het scherm: ruimtes in plaats van voertuigen, code in plaats van kentekenplaat */
  await expect(page.getByText("ruimtes gepland", { exact: false })).toBeVisible();
  await expect(page.getByText("schoonmaaktijd")).toBeVisible();
  await page.locator(`button.tl-who[data-wid="${await workerOf(page, DAG, await page.evaluate(() => D.jobs.find(j => j.plate === "GB-1.01").id))}"]`).click();
  await expect(page.locator(".objcode").first()).toBeVisible();
  await expect(page.locator(".plate")).toHaveCount(0);
  await expect(page.getByText(/voertuig|kenteken/i)).toHaveCount(0);
  await synced(page);

  /* 6. Publiceren: de medewerker-app volgt het profiel */
  await page.getByRole("button", { name: "Publiceer naar medewerkers" }).click();
  await page.locator("#modal").getByRole("button", { name: "Publiceren" }).click();
  await expect(page.locator("#toast")).toContainText(/ublic/);
  const wid = await workerOf(page, DAG, (await page.evaluate(() => D.jobs.find(j => j.plate === "GB-1.01").id)));
  const token = await page.evaluate(w => WRK[w].token, wid);
  const ctx = await browser.newContext({ ...devices["Pixel 7"], locale: "nl-NL", timezoneId: "Europe/Amsterdam" });
  const tel = await ctx.newPage();
  await tel.clock.setFixedTime(new Date(DAG + "T07:00:00+01:00"));
  await offline(tel);
  await tel.goto(`/medewerker.html?t=${token}`);
  await expect(tel.getByText("GB-1.01").first()).toBeVisible();
  await expect(tel).toHaveTitle(/Mijn Schoonmaakroute/);
  await expect(tel.getByText(/ruimtes · schoonmaken/).first()).toBeVisible();
  await expect(tel.locator(".objcode").first()).toBeVisible();
  await expect(tel.locator(".plate")).toHaveCount(0);
  const gbId = await page.evaluate(() => D.jobs.find(j => j.plate === "GB-1.01").id);
  await tel.locator(`[data-act=issue][data-id="${gbId}"]`).click();
  await expect(tel.getByText("Ruimte niet toegankelijk")).toBeVisible();
  await ctx.close();
});
