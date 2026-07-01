import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type EmailGenInput = { prompt: string; tone?: string; length?: string; recipient?: string };
type MeetingSummarizeInput = { transcript: string; title?: string };
type TaskBreakdownInput = { brief: string };
type ResearchInput = { query: string };
type KnowledgeIngestInput = { documentId: string; text: string };
type KnowledgeAskInput = { question: string };
type CoachingInput = Record<string, never>;
type BriefingInput = Record<string, never>;

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: EmailGenInput) => d)
  .handler(async ({ data }) => {
    const { chatComplete, safeJsonParse } = await import("./ai-gateway.server");
    const sys = `You are an expert email writer. Output strict JSON: { "subject": "...", "body": "..." }. Tone: ${data.tone ?? "professional"}. Length: ${data.length ?? "medium"} (short=<80w, medium=120-180w, long=250-350w).`;
    const userMsg = `Write an email${data.recipient ? ` to ${data.recipient}` : ""} about: ${data.prompt}`;
    const raw = await chatComplete({ messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }], json: true });
    const parsed = safeJsonParse<{ subject: string; body: string }>(raw) ?? { subject: "Draft", body: raw };
    return parsed;
  });

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: MeetingSummarizeInput) => d)
  .handler(async ({ data }) => {
    const { chatComplete, safeJsonParse } = await import("./ai-gateway.server");
    const sys = `Analyze the meeting transcript. Output strict JSON: { "summary": "3-5 sentence overview", "decisions": ["..."], "action_items": [{ "task": "...", "owner": "...", "due": "..." }], "attendees": ["..."] }`;
    const raw = await chatComplete({ messages: [{ role: "system", content: sys }, { role: "user", content: data.transcript.slice(0, 18000) }], json: true });
    return safeJsonParse<{ summary: string; decisions: string[]; action_items: Array<{ task: string; owner?: string; due?: string }>; attendees: string[] }>(raw)
      ?? { summary: raw, decisions: [], action_items: [], attendees: [] };
  });

export const breakdownTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: TaskBreakdownInput) => d)
  .handler(async ({ data }) => {
    const { chatComplete, safeJsonParse } = await import("./ai-gateway.server");
    const sys = `Break the brief into 3-8 actionable tasks. Output strict JSON: { "tasks": [{ "title": "...", "description": "...", "priority": "low|medium|high|urgent", "estimate_hours": 2 }] }`;
    const raw = await chatComplete({ messages: [{ role: "system", content: sys }, { role: "user", content: data.brief }], json: true });
    return safeJsonParse<{ tasks: Array<{ title: string; description: string; priority: "low" | "medium" | "high" | "urgent"; estimate_hours?: number }> }>(raw) ?? { tasks: [] };
  });

export const generateResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ResearchInput) => d)
  .handler(async ({ data }) => {
    const { chatComplete, safeJsonParse } = await import("./ai-gateway.server");
    const sys = `Produce a research brief. Output strict JSON: { "summary": "markdown text with headings, citations like [1]", "sources": [{ "title": "...", "url": "...", "note": "..." }] }. Use authoritative knowledge.`;
    const raw = await chatComplete({ messages: [{ role: "system", content: sys }, { role: "user", content: data.query }], json: true });
    return safeJsonParse<{ summary: string; sources: Array<{ title: string; url?: string; note?: string }> }>(raw) ?? { summary: raw, sources: [] };
  });

function chunkText(text: string, size = 800, overlap = 100): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return out;
}

export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: KnowledgeIngestInput) => d)
  .handler(async ({ data, context }) => {
    const { embed } = await import("./ai-gateway.server");
    const chunks = chunkText(data.text);
    if (chunks.length === 0) return { chunks: 0 };
    const BATCH = 8;
    const rows: Array<{ document_id: string; user_id: string; chunk_index: number; chunk_text: string; embedding: string }> = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const vectors = await embed(slice);
      slice.forEach((c, j) => {
        rows.push({
          document_id: data.documentId,
          user_id: context.userId,
          chunk_index: i + j,
          chunk_text: c,
          embedding: `[${vectors[j].join(",")}]`,
        });
      });
    }
    const { error } = await context.supabase.from("document_chunks").insert(rows);
    if (error) throw new Error(error.message);
    await context.supabase.from("documents").update({ indexed: true }).eq("id", data.documentId);
    return { chunks: rows.length };
  });

export const askKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: KnowledgeAskInput) => d)
  .handler(async ({ data, context }) => {
    const { embed, chatComplete } = await import("./ai-gateway.server");
    const [qvec] = await embed(data.question);
    const { data: matches, error } = await context.supabase.rpc("match_document_chunks", {
      query_embedding: `[${qvec.join(",")}]` as unknown as string,
      match_count: 6,
    });
    if (error) throw new Error(error.message);
    const ctx = (matches ?? []).map((m: { chunk_text: string }, i: number) => `[${i + 1}] ${m.chunk_text}`).join("\n\n");
    const sys = `Answer the question using ONLY the provided context. Cite sources like [1], [2]. If the context is insufficient, say so.`;
    const answer = await chatComplete({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Context:\n${ctx}\n\nQuestion: ${data.question}` },
      ],
    });
    return { answer, citations: matches ?? [] };
  });

export const generateCoachingTips = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((_d: CoachingInput) => ({}))
  .handler(async ({ context }) => {
    const { chatComplete, safeJsonParse } = await import("./ai-gateway.server");
    const { data: metrics } = await context.supabase.from("productivity_metrics")
      .select("*").order("metric_date", { ascending: false }).limit(30);
    const sys = `Produce concrete productivity coaching tips. Output strict JSON: { "tips": ["..."] }. 3-5 tips, specific and actionable.`;
    const raw = await chatComplete({ messages: [
      { role: "system", content: sys },
      { role: "user", content: `Recent metrics: ${JSON.stringify(metrics ?? [])}` },
    ], json: true });
    return safeJsonParse<{ tips: string[] }>(raw) ?? { tips: [] };
  });

export const generateDailyBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((_d: BriefingInput) => ({}))
  .handler(async ({ context }) => {
    const { chatComplete } = await import("./ai-gateway.server");
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    const [{ data: events }, { data: tasks }] = await Promise.all([
      context.supabase.from("calendar_events").select("title,start_time,end_time")
        .gte("start_time", todayStart).lt("start_time", todayEnd).order("start_time"),
      context.supabase.from("tasks").select("title,priority,due_date,status")
        .neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(8),
    ]);
    const sys = `Write a warm, concise daily briefing (3-5 sentences max, plain text, no markdown). Tone: focused mentor. Highlight key meetings and top 2 priorities.`;
    const briefing = await chatComplete({ messages: [
      { role: "system", content: sys },
      { role: "user", content: `Today is ${today.toDateString()}. Events: ${JSON.stringify(events ?? [])}. Open tasks: ${JSON.stringify(tasks ?? [])}` },
    ] });
    return { briefing, events: events ?? [], tasks: tasks ?? [] };
  });