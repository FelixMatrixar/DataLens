import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const videodbApiKey = process.env.VIDEODB_API_KEY;
  const videodbCollectionId = process.env.VIDEODB_COLLECTION_ID;
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!videodbApiKey || !videodbCollectionId || !openrouterApiKey) {
    return new Response("Server not configured", { status: 503 });
  }

  return Response.json({ videodbApiKey, videodbCollectionId, openrouterApiKey, userId });
}
