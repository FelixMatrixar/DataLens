import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import LogoutButton from "@/components/ui/LogoutButton";

async function getSessions(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("sessions")
    .select("id, created_at, ended_at, overlay_count, summary_json, search_ready")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export default async function DashboardPage() {
  const { userId } = auth();
  if (!userId) redirect("/login");

  const sessions = await getSessions(userId);

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F0F0F0]">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1E1E1E]">
        <Link href="/" className="text-[#E50000] font-bold text-lg">DataLens</Link>
        <div className="flex gap-4 items-center">
          <Link href="/settings" className="text-sm text-[#A0A0A0] hover:text-white">Settings</Link>
          <LogoutButton />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold mb-8">Sessions</h1>

        {sessions.length === 0 ? (
          <div className="text-center py-20 text-[#555]">
            <p className="text-lg mb-2">No sessions yet</p>
            <p className="text-sm">Install the extension and start your first session</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((s: any) => {
              const start = new Date(s.created_at);
              const end = s.ended_at ? new Date(s.ended_at) : null;
              const dur = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;
              return (
                <Link key={s.id} href={`/session/${s.id}`}>
                  <div className="p-5 rounded-xl border border-[#1E1E1E] bg-[#0F0F0F] hover:border-[#2A2A2A] transition cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-sm">
                          {start.toLocaleDateString()} · {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {s.summary_json?.currentTopic && (
                          <div className="text-[#A0A0A0] text-xs mt-1">{s.summary_json.currentTopic}</div>
                        )}
                      </div>
                      <div className="flex gap-4 text-right">
                        {dur && <div className="text-xs text-[#555]">{dur}m</div>}
                        <div className="text-xs text-[#A0A0A0]">{s.overlay_count ?? 0} charts</div>
                        {s.search_ready && (
                          <div className="text-xs text-[#00D4AA]">Searchable</div>
                        )}
                      </div>
                    </div>
                    {s.summary_json?.keyPoints?.length > 0 && (
                      <ul className="text-xs text-[#555] space-y-0.5">
                        {(s.summary_json.keyPoints as string[]).slice(0, 2).map((p: string, i: number) => (
                          <li key={i}>· {p}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
