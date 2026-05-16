import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const { captureSessionId, rtstreamId, videoId, summary, endedAt } = body;

  const start = new Date();
  const end = new Date(endedAt);
  const durationSecs = Math.round((end.getTime() - start.getTime()) / 1000);

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .insert({
      clerk_user_id: userId,
      rtstream_id: rtstreamId,
      capture_session_id: captureSessionId,
      video_id: videoId,
      summary_json: summary,
      ended_at: endedAt,
      duration_secs: durationSecs,
      search_ready: true,
    })
    .select("id")
    .single();

  if (error) return new Response("DB error", { status: 500 });
  return Response.json({ sessionId: session.id });
}

export async function PUT(req: Request) {
  // Called by VizAgent to record each overlay
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { sessionId, timestamp, chartType, chartUrl, title } = await req.json();

  await supabaseAdmin.from("overlays").insert({
    session_id: sessionId,
    timestamp,
    chart_type: chartType,
    chart_url: chartUrl,
    title,
  });

  await supabaseAdmin
    .from("sessions")
    .update({ overlay_count: supabaseAdmin.rpc("increment", { x: 1 }) })
    .eq("id", sessionId);

  return new Response("OK");
}
