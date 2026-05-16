import Store from "electron-store";
import type { UserConfig } from "../../types";

const store = new Store<{ userConfig?: UserConfig }>({
  name: "datalens-config",
  encryptionKey: "datalens-local-key",
});

export function getConfig(): UserConfig | null {
  return store.get("userConfig") ?? null;
}

export function saveConfig(config: UserConfig): void {
  store.set("userConfig", config);
}

export function clearConfig(): void {
  store.delete("userConfig");
}
