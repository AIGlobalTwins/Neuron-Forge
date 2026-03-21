"use client";

import { useEffect, useState } from "react";

interface Lead {
  id: string;
  name: string;
  website: string;
  email: string | null;
  status: string;
  qualify: { score: number | null; decision: string | null; reasoning: string | null } | null;
  deployment: { vercelUrl: string | null; emailDraft: string | null } | null;
}

interface Props { runId: string; }

export function LeadCard({ runId }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [emailModal, setEmailModal] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/runs/${runId}/leads`)
      .then((r) => r.json())
      .then(setLeads)
      .catch(() => {});
  }, [runId]);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (leads.length === 0) {
    return <div className="p-4 text-xs text-gray-600">Loading leads...</div>;
  }

  const qualified = leads.filter((l) => l.qualify?.decision === "pass");
  const deployed = leads.filter((l) => l.deployment?.vercelUrl);

  return (
    <div className="p-3 space-y-2">
      <div className="text-xs text-gray-600 mb-2">
        {qualified.length} qualified · {deployed.length} deployed
      </div>

      {leads.map((lead) => (
        <div key={lead.id} className="bg-[#131313] border border-[#1e1e1e] rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-white truncate">{lead.name}</div>
              <a href={lead.website} target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-300 truncate block">
                {lead.website}
              </a>
            </div>
            {lead.qualify?.score !== null && lead.qualify?.score !== undefined && (
              <div className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                lead.qualify.decision === "pass"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-[#2a2a2a] text-gray-500"
              }`}>
                {lead.qualify.score}/10
              </div>
            )}
          </div>

          {lead.qualify?.reasoning && (
            <div className="text-xs text-gray-600 italic line-clamp-2">{lead.qualify.reasoning}</div>
          )}

          {lead.deployment?.vercelUrl && (
            <div className="flex items-center gap-2">
              <a
                href={lead.deployment.vercelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs text-[#E8622A] hover:underline truncate"
              >
                {lead.deployment.vercelUrl}
              </a>
              <button
                onClick={() => copyToClipboard(lead.deployment!.vercelUrl!, lead.id)}
                className="text-xs text-gray-500 hover:text-white flex-shrink-0 transition-colors"
              >
                {copied === lead.id ? "✓ Copied" : "Copy"}
              </button>
            </div>
          )}

          {lead.deployment?.emailDraft && (
            <button
              onClick={() => setEmailModal(lead.deployment!.emailDraft!)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Ver email draft →
            </button>
          )}
        </div>
      ))}

      {/* Email draft modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEmailModal(null)}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-white">Email Draft</div>
              <button onClick={() => setEmailModal(null)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed bg-[#111] rounded-lg p-4 max-h-80 overflow-y-auto">
              {emailModal}
            </pre>
            <button
              onClick={() => copyToClipboard(emailModal, "draft")}
              className="mt-4 px-4 py-2 bg-[#E8622A] text-white text-sm rounded hover:bg-[#d4561f] transition-all"
            >
              {copied === "draft" ? "✓ Copied!" : "Copiar email"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
