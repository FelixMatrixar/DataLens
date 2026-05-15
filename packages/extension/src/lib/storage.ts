import type { UserConfig } from "../types/config";

export async function getConfig(): Promise<UserConfig | null> {
  try {
    const r = await chrome.storage.sync.get("userConfig");
    const cfg = r["userConfig"] as UserConfig | undefined;
    if (!cfg?.videodbApiKey || !cfg?.openrouterApiKey) return null;
    return cfg;
  } catch { return null; }
}

export async function saveConfig(config: UserConfig): Promise<void> {
  await chrome.storage.sync.set({ userConfig: config });
}
