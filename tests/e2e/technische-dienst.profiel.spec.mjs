// Profiel 'technische-dienst': dezelfde app, andere branche (onderhoud aan huis). Server start al met dit profiel
// (zoals na het kiezen ervan en opslaan), en we controleren woorden, plannen en de medewerker-app.
import { test, expect, devices } from "@playwright/test";
import { seedState, resetServer, openApp, offline, routes, workerOf, synced } from "./support.mjs";

const DAG = "2026-12-17";

test("profiel technische dienst: woorden, plannen, medewerker-app", async ({ page, browser }) => {
  await resetServer(page.request, seedState("technische-dienst", DAG));
  await openApp(page, DAG);

  /* 1. Woorden op het scherm volgen het profiel */
  await expect(page).toHaveTitle("Servicedienst Planner");
  await expect(page.locator('[data-profiel="naam"]')).toHaveText("Servicedienst");

  /* 2. Plannen: alles gepland, niets gesplitst */
  await page.getByRole("button", { name: "Automatisch plannen" }).click();
  await expect.poll(async () => Object.values(await routes(page, DAG)).flat().length).toBe(3);
  const split = await page.evaluate(d => { visitReset(); const where = {}; Object.entries(D.plans[d].routes).forEach(([w, r]) => r.forEach(id => where[id] = w));
    return blocksOf(jobsOn(d).map(j => j.id)).filter(b => new Set(b.ids.map(id => where[id])).size > 1).length }, DAG);
  expect(split).toBe(0);

  /* 3. Woorden in de lijst: klussen/ordernummer in plaats van auto's/kenteken, geen gele plaat */
  await expect(page.getByText("apparaten gepland", { exact: false })).toBeVisible();
  await page.locator(`button.tl-who`).first().click();
  await expect(page.locator(".objcode").first()).toBeVisible();
  await expect(page.locator(".plate")).toHaveCount(0);
  await expect(page.getByText(/voertuig|kenteken|ruimte/i)).toHaveCount(0);
  await synced(page);

  /* 4. Publiceren: de medewerker-app volgt het profiel */
  await page.getByRole("button", { name: "Publiceer naar medewerkers" }).click();
  await page.locator("#modal").getByRole("button", { name: "Publiceren" }).click();
  await expect(page.locator("#toast")).toContainText(/ublic/);
  const firstId = await page.evaluate(d => jobsOn(d)[0].id, DAG);
  const wid = await workerOf(page, DAG, firstId);
  const token = await page.evaluate(w => WRK[w].token, wid);
  const ctx = await browser.newContext({ ...devices["Pixel 7"], locale: "nl-NL", timezoneId: "Europe/Amsterdam" });
  const tel = await ctx.newPage();
  await tel.clock.setFixedTime(new Date(DAG + "T07:00:00+01:00"));
  await offline(tel);
  await tel.goto(`/medewerker.html?t=${token}`);
  await expect(tel).toHaveTitle(/Mijn Servicedienst/);
  await expect(tel.getByText(/klus(sen)? · onderhouden/).first()).toBeVisible();
  await expect(tel.locator(".objcode").first()).toBeVisible();
  await expect(tel.locator(".plate")).toHaveCount(0);
  await tel.locator(`[data-act=issue][data-id="${firstId}"]`).click();
  await expect(tel.getByText("Klant niet thuis")).toBeVisible();
  await ctx.close();
});
