// Opslag-adapter: dezelfde aanroepen als Netlify Blobs (get, setJSON, delete, list),
// maar opgeslagen in Azure Blob Storage (container = naam van de store).
// Vereist de app-instelling AZURE_STORAGE_CONNECTION_STRING.
import { BlobServiceClient } from "@azure/storage-blob";

const containers = new Map();

async function containerFor(name) {
  if (!containers.has(name)) {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING is niet ingesteld.");
    const c = BlobServiceClient.fromConnectionString(conn).getContainerClient(name);
    await c.createIfNotExists();
    containers.set(name, c);
  }
  return containers.get(name);
}

export function getStore({ name }) {
  const c = () => containerFor(name);
  return {
    async get(key, { type } = {}) {
      const blob = (await c()).getBlockBlobClient(key);
      try {
        const res = await blob.download();
        const text = await streamToString(res.readableStreamBody);
        return type === "json" ? JSON.parse(text) : text;
      } catch (e) {
        if (e.statusCode === 404) return null;
        throw e;
      }
    },
    async setJSON(key, value) {
      const data = JSON.stringify(value);
      await (await c()).getBlockBlobClient(key).upload(data, Buffer.byteLength(data), {
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
    },
    async delete(key) {
      await (await c()).getBlockBlobClient(key).deleteIfExists();
    },
    /* Ruwe bestanden, zoals foto's (bytes, geen JSON) */
    async setRaw(key, buf, contentType) {
      await (await c()).getBlockBlobClient(key).upload(buf, buf.length, {
        blobHTTPHeaders: { blobContentType: contentType },
      });
    },
    async getRaw(key) {
      try {
        const res = await (await c()).getBlockBlobClient(key).download();
        const chunks = [];
        for await (const chunk of res.readableStreamBody) chunks.push(Buffer.from(chunk));
        return { buf: Buffer.concat(chunks), type: res.contentType || "application/octet-stream" };
      } catch (e) {
        if (e.statusCode === 404) return null;
        throw e;
      }
    },
    async list({ prefix = "" } = {}) {
      const blobs = [];
      for await (const b of (await c()).listBlobsFlat({ prefix })) blobs.push({ key: b.name });
      return { blobs };
    },
  };
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
