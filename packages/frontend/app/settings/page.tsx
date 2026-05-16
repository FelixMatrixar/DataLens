"use client";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const { user } = useUser();
  const [videodbKey, setVideodbKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveKeys() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings/save-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videodbKey, openrouterKey }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => res.status.toString());
        setError(`Error ${res.status}: ${msg}`);
        return;
      }

      // Push config to extension if installed
      const extId = process.env.NEXT_PUBLIC_EXTENSION_ID;
      const cr = (globalThis as any).chrome;
      if (extId && cr?.runtime?.id) {
        cr.runtime.sendMessage(extId, {
          type: "SAVE_CONFIG",
          payload: {
            videodbApiKey: videodbKey,
            openrouterApiKey: openrouterKey,
            userId: user?.id,
            frontendUrl: window.location.origin,
            videodbCollectionId: "default",
          },
        });
      }

      setSaved(true);
      setVideodbKey("");
      setOpenrouterKey("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F0F0F0]">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1E1E1E]">
        <Link href="/" className="text-[#E50000] font-bold text-lg">DataLens</Link>
        <Link href="/dashboard" className="text-sm text-[#A0A0A0] hover:text-white">Dashboard</Link>
      </nav>

      <div className="max-w-md mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold mb-8">API Keys</h1>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#A0A0A0]">VideoDB API Key</label>
            <input
              type="password"
              placeholder="vdb-..."
              value={videodbKey}
              onChange={e => setVideodbKey(e.target.value)}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-[#F0F0F0] placeholder-[#555] focus:outline-none focus:border-[#E50000]"
            />
            <a
              href="https://console.videodb.io"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#555] hover:text-[#A0A0A0]"
            >
              Get your VideoDB key →
            </a>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#A0A0A0]">OpenRouter API Key</label>
            <input
              type="password"
              placeholder="sk-or-..."
              value={openrouterKey}
              onChange={e => setOpenrouterKey(e.target.value)}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-[#F0F0F0] placeholder-[#555] focus:outline-none focus:border-[#E50000]"
            />
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#555] hover:text-[#A0A0A0]"
            >
              Get your OpenRouter key — enables Gemini Flash →
            </a>
            <p className="text-xs text-[#555]">
              ~$0.70/month for daily 1-hour sessions. Keys are AES-256 encrypted server-side.
            </p>
          </div>

          {error && <p className="text-xs text-[#E50000]">{error}</p>}

          <button
            onClick={saveKeys}
            disabled={saving || !videodbKey || !openrouterKey}
            className="w-full bg-[#E50000] text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-red-700 transition"
          >
            {saving ? "Saving..." : saved ? "✓ Saved & pushed to extension" : "Save & Push to Extension"}
          </button>
        </div>
      </div>
    </main>
  );
}
