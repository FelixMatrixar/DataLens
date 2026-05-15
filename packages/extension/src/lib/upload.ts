import type { UserConfig } from "../types/config";

export async function uploadToR2(blob: Blob, config: UserConfig): Promise<string> {
  const filename = `chart-${Date.now()}.png`;

  const presign = await fetch(
    `${config.frontendUrl}/api/r2/presign?filename=${encodeURIComponent(filename)}`,
    { headers: { "x-clerk-user-id": config.userId } }
  ).then(r => r.json());

  await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: blob,
  });

  return presign.publicUrl;
}
