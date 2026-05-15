import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F0F0F0]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1E1E1E]">
        <span className="text-[#E50000] font-bold text-lg tracking-tight">DataLens</span>
        <div className="flex gap-6 items-center">
          <Link href="/dashboard" className="text-sm text-[#A0A0A0] hover:text-white transition">Dashboard</Link>
          <Link href="/login" className="text-sm bg-[#E50000] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-block text-xs font-semibold tracking-widest text-[#E50000] uppercase mb-6 px-3 py-1 border border-[#E50000]/30 rounded-full">
          5 AI agents · runs in your browser
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Live data visualizations,<br />
          <span className="text-[#E50000]">exactly when you need them</span>
        </h1>
        <p className="text-[#A0A0A0] text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
          DataLens overlays intelligently chosen charts directly onto any tab — earnings calls,
          research papers, live demos — the moment data is spoken or appears on screen.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="https://chrome.google.com/webstore"
            className="bg-[#E50000] text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Install Extension
          </a>
          <Link href="/login" className="border border-[#2A2A2A] text-[#A0A0A0] px-8 py-3 rounded-lg font-semibold hover:border-[#555] hover:text-white transition">
            View Dashboard
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-8 py-16 border-t border-[#141414]">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-3 gap-8">
          {[
            { step: "01", title: "Capture", desc: "Extension captures your screen + mic via VideoDB's real-time stream API" },
            { step: "02", title: "Detect", desc: "AI agents analyze the live transcript and scene index for chartable data moments" },
            { step: "03", title: "Visualize", desc: "The right chart renders and overlays on your tab within 3–6 seconds" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="text-[#E50000] text-4xl font-black mb-3">{step}</div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-[#A0A0A0] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Team */}
      <section className="max-w-4xl mx-auto px-8 py-16 border-t border-[#141414]">
        <h2 className="text-2xl font-bold text-center mb-2">The Agent Team</h2>
        <p className="text-[#A0A0A0] text-center text-sm mb-10">5 specialized agents, all running inside your browser</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            { name: "Capture Agent", role: "Manages CaptureSession + RTStream + WebSocket connection to VideoDB", color: "#4FC3F7" },
            { name: "Viz Agent",     role: "Detects chartable data, renders 15 chart types on OffscreenCanvas, overlays on tab", color: "#E50000" },
            { name: "Summary Agent", role: "Rolling 5-minute transcript buffer → live key-points panel in the popup", color: "#FFD700" },
            { name: "Memory Agent",  role: "Exports session as searchable Video asset in VideoDB after session ends", color: "#00D4AA" },
            { name: "Alert Agent",   role: "Fires browser notifications for user-defined keyword/scene triggers", color: "#CE93D8" },
          ].map(({ name, role, color }) => (
            <div key={name} className="flex items-start gap-4 p-4 rounded-xl border border-[#1E1E1E] bg-[#0F0F0F]">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
              <div>
                <div className="font-semibold text-sm">{name}</div>
                <div className="text-[#A0A0A0] text-xs mt-0.5 leading-relaxed">{role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-8 py-16 border-t border-[#141414]">
        <h2 className="text-2xl font-bold text-center mb-10">Features</h2>
        <div className="grid grid-cols-2 gap-6">
          {[
            { title: "15 Chart Types", desc: "Bar, line, area, donut, waterfall, heatmap, bullet, and more — all rendered natively on OffscreenCanvas" },
            { title: "Works on Any Tab", desc: "YouTube, Zoom, Google Meet, PDFs, any website — the overlay injects everywhere" },
            { title: "Live Summary Panel", desc: "Rolling key-points list and data-points feed in the extension popup" },
            { title: "Post-Session Search", desc: "Full semantic search over your session transcript and scenes via VideoDB" },
            { title: "Custom Alerts", desc: "Define keywords or conditions — get a browser notification when they appear on screen" },
            { title: "No Server Needed", desc: "All agent compute runs in the browser service worker. Zero backend to manage" },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-[#1E1E1E] bg-[#0F0F0F]">
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-[#A0A0A0] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#141414] py-8 px-8 text-center text-[#555] text-xs">
        <p>DataLens · Powered by <a href="https://videodb.io" className="hover:text-[#A0A0A0]">VideoDB</a> · Built with OpenRouter + Gemini Flash</p>
      </footer>
    </main>
  );
}
