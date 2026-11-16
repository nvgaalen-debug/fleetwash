// Profiel schoonmaak-gebouwen: geen enkel scherm, formulier, menu of tooltip mag nog woorden van het wasprofiel tonen.
import { test, expect } from "@playwright/test";
import { openApp } from "./support.mjs";
import { withSet } from "../engine/lib.mjs";
test("profiel schoonmaak: geen wasteksten op enig scherm", async ({ page, request }) => {
  const st = withSet("schoonmaak").call("T_state", "2026-12-17");
  await request.post("/__test/reset"); await request.put("/api/state", { data: { data: st, version: 0 } });
  await openApp(page, "2026-12-17");
  const gevonden = [];
  const tos = await page.locator("[data-act=navto]").evaluateAll(els => [...new Set(els.map(e => e.dataset.to))]);
  const re = /\b(auto['’]?s?|voertuig\w*|kenteken\w*|lease\w*|reinig\w*|wasroute)\b/gi;
  for (const to of tos) {
    if (to === "act:logout") continue;
    await page.locator(`[data-act=navto][data-to="${to}"]`).first().evaluate(b => b.click()); await page.waitForTimeout(300);
    const txt = await page.evaluate(() => { const v = document.body.innerText; return v + ' ' + [...document.querySelectorAll('[placeholder],[title],[aria-label]')].map(e => e.getAttribute('placeholder') || e.getAttribute('title')).join(' ') });
    const hits = [...new Set((txt.match(re) || []).map(x => x.toLowerCase()))];
    if (hits.length) { gevonden.push(to + ": " + hits.join(", ")); const ctx = hits.map(h => { const i = txt.toLowerCase().indexOf(h); return txt.slice(Math.max(0, i - 50), i + 40).replace(/\s+/g, ' ') }); console.log("SCAN", to, "→", hits.join(", "), "\n    ", ctx.join("\n     ")) }
    await page.keyboard.press("Escape").catch(() => {});
  }
  for (const [naam, fn] of [["nieuwe opdracht", () => editJob(null)], ["opdracht bewerken", () => editJob(D.jobs[0].id)]]) {
    await page.evaluate(fn);
    await page.waitForTimeout(300);
    const txt = await page.evaluate(() => document.querySelector('#modal').innerText + ' ' + [...document.querySelectorAll('#modal [placeholder]')].map(e => e.getAttribute('placeholder')).join(' '));
    const hits = [...new Set((txt.match(re) || []).map(x => x.toLowerCase()))];
    if (hits.length) gevonden.push(naam + ": " + hits.join(", "));
    await page.keyboard.press("Escape").catch(() => {});
  }
  expect(gevonden).toEqual([]);
});
