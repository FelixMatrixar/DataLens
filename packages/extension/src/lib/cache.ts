const PREFIX = "vdb_chart_";
const TTL_MS = 4 * 60 * 60 * 1_000; // 4 hours

export async function getCached(key: string): Promise<string | null> {
  try {
    const r = await chrome.storage.local.get(PREFIX + key);
    const entry = r[PREFIX + key];
    if (!entry || Date.now() > entry.expiresAt) {
      await chrome.storage.local.remove(PREFIX + key);
      return null;
    }
    return entry.url;
  } catch { return null; }
}

export async function setCached(key: string, url: string): Promise<void> {
  try {
    await chrome.storage.local.set({
      [PREFIX + key]: { url, expiresAt: Date.now() + TTL_MS },
    });
  } catch { /* non-critical */ }
}

export function hashSpec(spec: object): string {
  const s = JSON.stringify(spec);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16);
}
