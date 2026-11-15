// Nep van @azure/data-tables: Table Storage in het geheugen (zelfde foutcodes als Azure: 404, 409, 412).
const DB = (globalThis.__WASROUTE_TABLES ||= new Map());
const err = (statusCode, msg) => Object.assign(new Error(msg), { statusCode });
let etagSeq = 1;
export class TableClient {
  constructor(name) { this.name = name; if (!DB.has(name)) DB.set(name, new Map()); }
  static fromConnectionString(_conn, name) { return new TableClient(name); }
  get rows() { if (!DB.has(this.name)) DB.set(this.name, new Map()); return DB.get(this.name); }
  async createTable() {}
  async getEntity(pk, rk) { const e = this.rows.get(pk + "|" + rk); if (!e) throw err(404, "Not found"); return structuredClone(e); }
  async upsertEntity(e) { this.rows.set(e.partitionKey + "|" + e.rowKey, { ...structuredClone(e), etag: String(etagSeq++) }); }
  async createEntity(e) { const k = e.partitionKey + "|" + e.rowKey; if (this.rows.has(k)) throw err(409, "Exists"); this.rows.set(k, { ...structuredClone(e), etag: String(etagSeq++) }); }
  async updateEntity(e, _mode, opts = {}) {
    const k = e.partitionKey + "|" + e.rowKey, cur = this.rows.get(k);
    if (!cur) throw err(404, "Not found");
    if (opts.etag && opts.etag !== "*" && opts.etag !== cur.etag) throw err(412, "Precondition failed");
    this.rows.set(k, { ...structuredClone(e), etag: String(etagSeq++) });
  }
  async deleteEntity(pk, rk) { if (!this.rows.delete(pk + "|" + rk)) throw err(404, "Not found"); }
}
export function resetTables() { for (const m of DB.values()) m.clear(); }
