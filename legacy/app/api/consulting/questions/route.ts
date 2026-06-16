import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { extractJsonArray } from "@/lib/json-extract";

export interface Question {
  id: string;
  text: string;
  type: "text" | "scale" | "choice";
  options?: string[];        // for "choice" type
  scaleMin?: string;         // for "scale" type
  scaleMax?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { area, problem } = body;

    if (!area || !problem?.trim()) {
      return NextResponse.json({ error: "Area and problem description are required." }, { status: 400 });
    }

    let userId: string | null = null;
    try { const { auth } = await import("@clerk/nextjs/server"); const a = await auth(); userId = a.userId; } catch {}
    const anthropicKey = getAnthropicKey(userId);
    const claudeModel = getClaudeModel(userId);
    if (!anthropicKey) {
      return NextResponse.json({ error: "Anthropic API Key not configured. Add it in Settings." }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const prompt = `You are a senior business consultant specialized in ${area}. A client described the following problem:

"${problem}"

Generate exactly 7 diagnostic questions that are highly specific to this problem and area. The questions must surface the root causes, the business context, the available resources and the real constraints.

Rules:
- Each question must be actionable — the answer should directly shape the solution plan
- Mix types: some open (text), some scale, some multiple-choice (choice)
- No generic questions that could apply to any business
- Adapt 100% to the described problem and the ${area} area
- Write in English

Respond ONLY with a JSON array (no markdown):
[
  {
    "id": "q1",
    "text": "Question here?",
    "type": "text"
  },
  {
    "id": "q2",
    "text": "On a scale of 1 to 10, how would you rate X?",
    "type": "scale",
    "scaleMin": "Very poor",
    "scaleMax": "Excellent"
  },
  {
    "id": "q3",
    "text": "What is the main reason for Y?",
    "type": "choice",
    "options": ["Option A", "Option B", "Option C", "Option D"]
  }
]`;

    const res = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "[]";
    const parsed = extractJsonArray<Question>(raw);
    if (!parsed || parsed.length === 0) {
      return NextResponse.json({ error: "Failed to generate questions — please try again." }, { status: 500 });
    }

    // Keep only well-formed questions; choice needs options, scale needs bounds.
    const questions: Question[] = parsed
      .filter((q) => q && q.id && q.text && q.type)
      .filter((q) => q.type !== "choice" || (Array.isArray(q.options) && q.options.length >= 2))
      .filter((q) => q.type !== "scale" || (q.scaleMin && q.scaleMax));
    if (questions.length === 0) {
      return NextResponse.json({ error: "Invalid response — please try again." }, { status: 500 });
    }
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[consulting/questions] error:", err);
    const msg = (err as Error).message || "";
    if (msg.includes("API Key") || msg.includes("authentication") || msg.includes("401")) {
      return NextResponse.json({ error: "Invalid API Key. Check your settings." }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error — please try again." }, { status: 500 });
  }
}
