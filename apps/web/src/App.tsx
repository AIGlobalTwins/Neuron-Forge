import { useState } from "react";
import type { GenerateResponse, ProjectFile } from "@builder/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

export function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [tab, setTab] = useState<"preview" | "code">("code");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = prompt.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setPrompt("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, files }),
      });
      const data: GenerateResponse = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Generation failed");
      setFiles(data.files);
      setActive(data.files.find((f) => f.path.endsWith("App.tsx"))?.path ?? data.files[0]?.path ?? null);
      const cost = data.usage ? ` · $${data.usage.costUsd}` : "";
      setMessages((m) => [...m, { role: "assistant", text: `Applied ${data.toolCalls.length} changes — ${data.files.length} files${cost}` }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const activeFile = files.find((f) => f.path === active);

  return (
    <div className="h-full flex bg-slate-950 text-slate-200">
      {/* Chat */}
      <aside className="w-[380px] shrink-0 flex flex-col border-r border-slate-800">
        <div className="px-4 py-3 border-b border-slate-800 font-semibold">Website Builder</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-slate-500">Descreve o site que queres criar. Ex: “Cria um site para um restaurante italiano em Lisboa.”</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`text-sm rounded-xl px-3 py-2 ${m.role === "user" ? "bg-slate-800 ml-8" : "bg-slate-900 border border-slate-800 mr-8"}`}>
              {m.text}
            </div>
          ))}
          {busy && <div className="text-sm text-slate-500">A gerar…</div>}
          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>
        <div className="p-3 border-t border-slate-800">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
            rows={3}
            placeholder="Descreve ou pede uma alteração… (Cmd/Ctrl+Enter)"
            className="w-full resize-none rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm outline-none focus:border-slate-600"
          />
          <button
            onClick={send}
            disabled={busy || !prompt.trim()}
            className="mt-2 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 py-2 text-sm font-semibold"
          >
            {busy ? "A gerar…" : files.length ? "Aplicar alteração" : "Gerar site"}
          </button>
        </div>
      </aside>

      {/* Preview / code */}
      <main className="flex-1 flex flex-col">
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800">
          {(["preview", "code"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-lg ${tab === t ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"}`}>
              {t === "preview" ? "Preview" : "Código"}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500">{files.length} ficheiros</span>
        </div>

        {tab === "preview" ? (
          <div className="flex-1 grid place-items-center text-center text-slate-500 p-8">
            <div>
              <p className="text-sm">Preview ao vivo (WebContainers) — próximo passo da Fase 1.</p>
              <p className="text-xs mt-1">Por agora, vê os ficheiros gerados no separador “Código”.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            <div className="w-64 shrink-0 overflow-y-auto border-r border-slate-800 p-2 space-y-0.5">
              {files.map((f) => (
                <button key={f.path} onClick={() => setActive(f.path)} className={`block w-full text-left truncate px-2 py-1 text-xs rounded ${active === f.path ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                  {f.path}
                </button>
              ))}
              {!files.length && <p className="text-xs text-slate-600 px-2">Sem ficheiros ainda.</p>}
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">{activeFile?.content ?? "Seleciona um ficheiro."}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
