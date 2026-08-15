"use client";

import { Check, Copy, Printer } from "lucide-react";
import { useState } from "react";

export function PromptActions() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="prompt-actions flex flex-wrap gap-2">
      <button type="button" onClick={copyLink} className="btn-secondary min-h-10 px-4 py-2">
        {copied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
        {copied ? "Link copied" : "Copy share link"}
      </button>
      <button type="button" onClick={() => window.print()} className="btn-secondary min-h-10 px-4 py-2">
        <Printer size={16} /> Print / save PDF
      </button>
    </div>
  );
}
