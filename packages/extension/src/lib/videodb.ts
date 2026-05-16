const VIDEODB_BASE = "https://api.videodb.io";

export async function videodbPost(
  path: string,
  apiKey: string,
  body: object
): Promise<any> {
  const res = await fetch(`${VIDEODB_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`VideoDB POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function videodbGet(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`${VIDEODB_BASE}${path}`, {
    headers: { "x-access-token": apiKey },
  });
  if (!res.ok) throw new Error(`VideoDB GET ${path} failed: ${res.status}`);
  return res.json();
}

// ── Sandbox lifecycle ────────────────────────────────────────────

export type SandboxTier = "small" | "medium" | "large";
export type SandboxModel =
  | "gemma-4-2b"   // GEMMA_4_E2B — small tier
  | "qwen-9b"      // QWEN_9B — small tier
  | "gemma-4-26b"  // GEMMA_4_26B — medium tier
  | "gemma-4-31b"  // GEMMA_4_31B — medium tier (best for scene indexing)
  | "qwen-27b"     // QWEN_27B — medium tier
  | "omnivoice"    // OmniVoice TTS — small tier
  | "flux";        // FLUX image gen — medium tier

export interface Sandbox {
  id: string;
  status: "provisioning" | "active" | "stopping" | "stopped";
  tier: SandboxTier;
}

export async function createSandbox(
  apiKey: string,
  tier: SandboxTier = "medium",
  idleTimeout = 600
): Promise<Sandbox> {
  const res = await videodbPost("/sandbox/", apiKey, {
    tier,
    idle_timeout: idleTimeout,
  });
  console.log("[DataLens] sandbox response:", JSON.stringify(res));
  const data = res.data;
  // API may return id as `id` or `sandbox_id`
  return { ...data, id: data.id ?? data.sandbox_id } as Sandbox;
}

export async function getSandbox(apiKey: string, sandboxId: string): Promise<Sandbox> {
  const res = await videodbGet(`/sandbox/${sandboxId}`, apiKey);
  return res.data as Sandbox;
}

export async function waitForSandbox(
  apiKey: string,
  sandboxId: string,
  timeoutMs = 120_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const sb = await getSandbox(apiKey, sandboxId);
    if (sb.status === "active") return;
    if (sb.status === "stopped") throw new Error("Sandbox stopped unexpectedly");
    await new Promise(r => setTimeout(r, 3_000));
  }
  throw new Error("Sandbox did not become active in time");
}

export async function stopSandbox(apiKey: string, sandboxId: string): Promise<void> {
  await videodbPost(`/sandbox/${sandboxId}/stop/`, apiKey, {});
}

// ── Video upload + indexing ──────────────────────────────────────

export async function uploadVideo(
  url: string,
  collectionId: string,
  apiKey: string
): Promise<string> {
  const res = await videodbPost(`/collection/${collectionId}/video`, apiKey, { url });
  return res.data.id as string;
}

export async function indexVideo(
  videoId: string,
  collectionId: string,
  apiKey: string
): Promise<void> {
  await Promise.allSettled([
    videodbPost(`/collection/${collectionId}/video/${videoId}/index`, apiKey, { index_type: "spoken_word" }),
    videodbPost(`/collection/${collectionId}/video/${videoId}/index`, apiKey, { index_type: "scene" }),
  ]);
}
