// Node-loader: vervangt de Azure-SDK's door de nep-versies in ./fakes, zodat api/src ongewijzigd draait.
const MAP = {
  "@azure/functions": new URL("./fakes/azure-functions.mjs", import.meta.url).href,
  "@azure/data-tables": new URL("./fakes/data-tables.mjs", import.meta.url).href,
  "@azure/storage-blob": new URL("./fakes/storage-blob.mjs", import.meta.url).href,
};
export async function resolve(specifier, context, next) {
  if (MAP[specifier]) return { url: MAP[specifier], shortCircuit: true };
  return next(specifier, context);
}
