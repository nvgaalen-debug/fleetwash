// Gedeelde hulpmiddelen voor de browsertests.
import { withSet } from "../engine/lib.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const XLSX_JS = path.join(here, "..", "node_modules", "xlsx", "dist", "xlsx.full.min.js");

/* Testset als planningsstatus, zonder planning (de test laat de app zelf plannen) */
export function seedState(name, date, settings) {
  const E = withSet(name, settings ? { settings } : {});
  return E.call("T_state", date);
}

/* Server leegmaken en een planningsstatus klaarzetten */
export async function resetServer(request, state) {
  await request.post("/__test/reset");
  if (state) {
    const r = await request.put("/api/state", { data: { data: state, version: 0 } });
    if (!r.ok()) throw new Error("Klaarzetten mislukt: " + (await r.text()));
  }
}

/* Externe bronnen afvangen: Excel-lezer lokaal serveren, lettertypen overslaan. Zo is de test niet afhankelijk van internet. */
export async function offline(page, date) {
  await page.route("https://cdnjs.cloudflare.com/**/xlsx.full.min.js", r => r.fulfill({ path: XLSX_JS, contentType: "text/javascript" }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: "", contentType: "text/css" }));
  page.on("dialog", d => d.accept());
  if (date) await page.addInitScript(d => { try { sessionStorage.setItem("wasroute.date", d) } catch (e) {} }, date);
}

/* Wachten tot de app geladen is en op de server is opgeslagen */
export async function openApp(page, date) {
  await offline(page, date);
  await page.goto("/");
  await page.waitForFunction(() => typeof SYNC_READY !== "undefined" && SYNC_READY === true, null, { timeout: 15000 });
}

/* Lezen van de planning zoals de app hem in het geheugen heeft */
export const routes = (page, date) => page.evaluate(d => { const P = D.plans[d] || { routes: {} }; return JSON.parse(JSON.stringify(P.routes)) }, date);
export const workerOf = async (page, date, id) => { const R = await routes(page, date); return Object.keys(R).find(w => R[w].includes(id)) || null };
/* Wacht tot alle wijzigingen naar de server zijn gestuurd */
export const synced = page => page.waitForFunction(() => typeof PUSH_P !== 'undefined' && !PUSH_P && !PUSH_DIRTY, null, { timeout: 15000 });
