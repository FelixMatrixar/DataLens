"use client";
import { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function syncToExtension() {
    setStatus("syncing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/config");
      if (!res.ok) {
        setErrorMsg(`Server error: ${await res.text()}`);
        setStatus("error");
        return;
      }

      const config = await res.json();

      const extId = process.env.NEXT_PUBLIC_EXTENSION_ID;
      const cr = (globalThis as any).chrome;
      if (!extId || !cr?.runtime) {
        setErrorMsg("Extension not detected. Make sure DataLens is installed and NEXT_PUBLIC_EXTENSION_ID is set.");
        setStatus("error");
        return;
      }

      cr.runtime.sendMessage(extId, {
        type: "SAVE_CONFIG",
        payload: {
          videodbApiKey: config.videodbApiKey,
          openrouterApiKey: config.openrouterApiKey,
          videodbCollectionId: config.videodbCollectionId,
          userId: config.userId,
          frontendUrl: window.location.origin,
        },
      }, (response: any) => {
        if (cr.runtime.lastError || !response?.ok) {
          setErrorMsg("Could not reach extension. Try reloading the extension at chrome://extensions.");
          setStatus("error");
        } else {
          setStatus("done");
        }
      });
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F0F0F0]">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1E1E1E]">
        <Link href="/" className="text-[#E50000] font-bold text-lg">DataLens</Link>
        <Link href="/dashboard" className="text-sm text-[#A0A0A0] hover:text-white">Dashboard</Link>
      </nav>

      <div className="max-w-md mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold mb-3">Extension Setup</h1>
        <p className="text-[#A0A0A0] text-sm mb-8">
          Click the button below to sync your configuration to the DataLens extension.
          Make sure the extension is installed and enabled first.
        </p>

        <div className="space-y-4">
          <button
            onClick={syncToExtension}
            disabled={status === "syncing"}
            className="w-full bg-[#E50000] text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-red-700 transition"
          >
            {status === "syncing" ? "Syncing..." : status === "done" ? "✓ Extension synced" : "Sync to Extension"}
          </button>

          {status === "error" && (
            <p className="text-xs text-[#E50000]">{errorMsg}</p>
          )}

          {status === "done" && (
            <p className="text-xs text-[#00D4AA]">
              Extension is configured. Open the DataLens popup and click Start.
            </p>
          )}
        </div>

        <div className="mt-10 pt-8 border-t border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-[#555] uppercase tracking-wider mb-4">Setup Checklist</h2>
          <ol className="space-y-2 text-sm text-[#A0A0A0] list-decimal list-inside">
            <li>Install the DataLens Chrome extension</li>
            <li>Sign in to this app</li>
            <li>Click "Sync to Extension" above</li>
            <li>Open any tab, click the DataLens icon, hit Start</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
