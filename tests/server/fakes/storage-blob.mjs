// Nep van @azure/storage-blob: Blob Storage in het geheugen.
const STORE = (globalThis.__WASROUTE_BLOBS ||= new Map());
const err = (statusCode, msg) => Object.assign(new Error(msg), { statusCode });
async function* once(buf) { yield buf; }
class BlockBlob {
  constructor(c, key) { this.c = c; this.key = key; }
  async upload(data, _len, opts = {}) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
    this.c.set(this.key, { buf, type: opts.blobHTTPHeaders?.blobContentType || "application/octet-stream" });
  }
  async download() {
    const b = this.c.get(this.key); if (!b) throw err(404, "BlobNotFound");
    return { readableStreamBody: once(b.buf), contentType: b.type };
  }
  async deleteIfExists() { return { succeeded: this.c.delete(this.key) }; }
}
class Container {
  constructor(name) { if (!STORE.has(name)) STORE.set(name, new Map()); this.m = STORE.get(name); }
  async createIfNotExists() {}
  getBlockBlobClient(key) { return new BlockBlob(this.m, key); }
  async *listBlobsFlat({ prefix = "" } = {}) { for (const k of [...this.m.keys()].sort()) if (k.startsWith(prefix)) yield { name: k }; }
}
export class BlobServiceClient {
  static fromConnectionString() { return new BlobServiceClient(); }
  getContainerClient(name) { return new Container(name); }
}
export function resetBlobs() { for (const m of STORE.values()) m.clear(); }
export function blobKeys(container) { return [...(STORE.get(container)?.keys() || [])].sort(); }
