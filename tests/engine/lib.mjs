// Laadt de planningsmotor van de app (js/01-kern.js en js/02-planning-engine.js) ongewijzigd in een eigen context,
// plus tests/engine/helpers.js. Elke aanroep van engine() geeft een schone, losse context.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, "..", "..");
const APP_SCRIPTS = ["js/00-profiel.js", "profielen/wassen.js", "profielen/schoonmaak-gebouwen.js", "js/01-kern.js", "js/02-planning-engine.js"];

export function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(root, "tests", "fixtures", name + ".json"), "utf8"));
}

export function engine() {
  const noop = () => {};
  const el = () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop }, addEventListener: noop, appendChild: noop, setAttribute: noop });
  const ctx = {
    console, setTimeout, clearTimeout, Date, Math, JSON, Promise,
    document: { querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener: noop, createElement: el, body: el() },
    window: { addEventListener: noop, location: { protocol: "file:", hostname: "localhost" } },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    location: { protocol: "file:", hostname: "localhost" },
    navigator: {}, fetch: async () => ({ ok: false }), toast: noop, render: noop, save: noop,
    /* functies die in latere app-scripts staan maar door sample() worden gebruikt */
    randTok: () => Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14), uid: () => "u" + Math.random().toString(36).slice(2, 10),
  };
  vm.createContext(ctx);
  for (const f of [...APP_SCRIPTS, "tests/engine/helpers.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  }
  /* Roept een functie in de motor aan en geeft een gewone (JSON-veilige) waarde terug */
  const call = (fn, ...args) => {
    if (typeof ctx[fn] !== "function") throw new Error("Onbekende functie in de motor: " + fn);
    const r = ctx[fn](...args);
    return r === undefined ? r : JSON.parse(ctx.JSON.stringify(r));
  };
  return { call, ctx };
}

/* Engine met een testset geladen. opts.settings overschrijft instellingen. */
export function withSet(name, opts) {
  const e = engine();
  const dates = e.call("T_build", fixture(name), opts || {});
  return { ...e, dates };
}
