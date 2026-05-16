import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

async function getSession(id: string, userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("clerk_user_id", userId)
    .single();
  if (!session) return null;

  const { data: overlays } = await supabase
    .from("overlays")
    .select("*")
    .eq("session_id", id)
    .order("timestamp");

  return { session, overlays: overlays ?? [] };
}

export default async function SessionPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const result = await getSession(params.id, userId);
  if (!result) redirect("/dashboard");

  const { session, overlays } = result;
  const start = new Date(session.created_at);

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F0F0F0]">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1E1E1E]">
        <Link href="/" className="text-[#E50000] font-bold text-lg">DataLens</Link>
        <Link href="/dashboard" className="text-sm text-[#A0A0A0] hover:text-white">← Dashboard</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-bold mb-1">
            {start.toLocaleDateString()} · {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </h1>
          {session.summary_json?.currentTopic && (
            <p className="text-[#A0A0A0] text-sm">{session.summary_json.currentTopic}</p>
          )}
        </div>

        {/* Search */}
        {session.search_ready && (
          <SearchBox videoId={session.video_id} />
        )}

        {/* Summary */}
        {session.summary_json?.keyPoints?.length > 0 && (
          <div className="mb-8 p-5 rounded-xl border border-[#1E1E1E] bg-[#0F0F0F]">
            <h2 className="text-sm font-semibold text-[#555] uppercase tracking-wider mb-3">Key Points</h2>
            <ul className="space-y-1.5">
              {(session.summary_json.keyPoints as string[]).map((p: string, i: number) => (
                <li key={i} className="text-sm text-[#A0A0A0] flex gap-2">
                  <span className="text-[#E50000] shrink-0">·</span>{p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Overlay Timeline */}
        {overlays.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#555] uppercase tracking-wider mb-4">
              {overlays.length} Charts Rendered
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {overlays.map((o: any) => (
                <div key={o.id} className="rounded-xl border border-[#1E1E1E] overflow-hidden bg-[#0F0F0F]">
                  <img src={o.chart_url} alt={o.title} className="w-full" />
                  <div className="p-3">
                    <div className="text-xs font-medium">{o.title}</div>
                    <div className="text-xs text-[#555]">
                      {new Date(o.timestamp * 1000).toISOString().slice(11, 19)} · {o.chart_type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function SearchBox({ videoId }: { videoId: string }) {
  return (
    <div className="mb-8 p-5 rounded-xl border border-[#1E1E1E] bg-[#0F0F0F]">
      <h2 className="text-sm font-semibold text-[#555] uppercase tracking-wider mb-3">Search Session</h2>
      <SearchForm videoId={videoId} />
    </div>
  );
}

function SearchForm({ videoId }: { videoId: string }) {
  "use client";
  return (
    <form action="/api/search" method="GET" className="flex gap-2">
      <input
        name="q"
        placeholder="Search for a topic, number, or moment..."
        className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] placeholder-[#555] focus:outline-none focus:border-[#E50000]"
      />
      <input type="hidden" name="videoId" value={videoId} />
      <button type="submit" className="bg-[#E50000] text-white px-4 py-2 rounded-lg text-sm font-medium">
        Search
      </button>
    </form>
  );
}
