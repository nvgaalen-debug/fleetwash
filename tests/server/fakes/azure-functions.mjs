// Nep van @azure/functions: registreert de handlers zodat de testserver ze kan aanroepen.
export const ROUTES = (globalThis.__WASROUTE_ROUTES ||= []);
export const app = {
  http(name, opts) { ROUTES.push({ name, route: opts.route || name, methods: opts.methods || ["GET"], handler: opts.handler }); },
};
