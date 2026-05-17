import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const videodbApiKey = process.env.VIDEODB_API_KEY;
  const videodbCollectionId = process.env.VIDEODB_COLLECTION_ID;
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  const googleAiApiKey = process.env.GOOGLE_AI_API_KEY;

  if (!videodbApiKey || !videodbCollectionId) {
    return new Response("Server not configured — add VIDEODB_API_KEY, VIDEODB_COLLECTION_ID to Vercel env vars", { status: 503 });
  }
  if (!openrouterApiKey && !googleAiApiKey) {
    return new Response("Server not configured — add OPENROUTER_API_KEY or GOOGLE_AI_API_KEY to Vercel env vars", { status: 503 });
  }

  // provider defaults to google if only google key is present, otherwise openrouter
  const provider = googleAiApiKey && !openrouterApiKey ? "google" : "openrouter";

  return Response.json({
    provider,
    videodbApiKey,
    videodbCollectionId,
    ...(openrouterApiKey ? { openrouterApiKey } : {}),
    ...(googleAiApiKey   ? { googleAiApiKey }   : {}),
    userId,
  });
}
