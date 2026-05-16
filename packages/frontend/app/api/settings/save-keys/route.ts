import { auth } from "@clerk/nextjs/server";
import { encrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { videodbKey, openrouterKey } = await req.json();

  const [videodbKeyEnc, openrouterKeyEnc] = await Promise.all([
    encrypt(videodbKey, userId),
    encrypt(openrouterKey, userId),
  ]);

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { clerk_user_id: userId, videodb_key_enc: videodbKeyEnc, openrouter_key_enc: openrouterKeyEnc },
      { onConflict: "clerk_user_id" }
    );

  if (error) {
    console.error("[save-keys] Supabase error:", error.message, error.code);
    return new Response(`DB error: ${error.message}`, { status: 500 });
  }
  return new Response("OK");
}
