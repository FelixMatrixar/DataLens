const ALGO = "AES-GCM";
const KEY_LEN = 256;

async function deriveKey(userId: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(
    `${process.env.ENCRYPTION_SECRET!}:${userId}`.slice(0, 32).padEnd(32, "0")
  );
  return crypto.subtle.importKey("raw", raw, { name: ALGO, length: KEY_LEN }, false, ["encrypt", "decrypt"]);
}

export async function encrypt(text: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    new TextEncoder().encode(text)
  );
  const buf = new Uint8Array(iv.length + enc.byteLength);
  buf.set(iv); buf.set(new Uint8Array(enc), iv.length);
  return Buffer.from(buf).toString("base64");
}

export async function decrypt(b64: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const buf = Buffer.from(b64, "base64");
  const iv = buf.slice(0, 12);
  const data = buf.slice(12);
  const dec = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);
  return new TextDecoder().decode(dec);
}
