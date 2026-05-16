import { auth } from "@clerk/nextjs/server";
import { decrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const videoId = searchParams.get("videoId");

  if (!query || !videoId) return new Response("Missing params", { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("videodb_key_enc")
    .eq("clerk_user_id", userId)
    .single();

  if (!profile?.videodb_key_enc) return new Response("No API key", { status: 400 });

  const videodbKey = await decrypt(profile.videodb_key_enc, userId);

  const res = await fetch(
    `https://api.videodb.io/video/${videoId}/search/?query=${encodeURIComponent(query)}&search_type=semantic`,
    { headers: { "x-access-token": videodbKey } }
  );

  const data = await res.json();
  return Response.json(data);
}
