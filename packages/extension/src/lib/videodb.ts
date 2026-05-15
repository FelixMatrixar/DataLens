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
