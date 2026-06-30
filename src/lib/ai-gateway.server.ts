const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatComplete(opts: {
  model?: string;
  messages: ChatMessage[];
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const body: Record<string, unknown> = {
    model: opts.model ?? "google/gemini-3-flash-preview",
    messages: opts.messages,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in your workspace settings.");
  if (res.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI request failed: ${res.status} ${t.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function embed(input: string | string[]): Promise<number[][]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(`${GATEWAY_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-embedding-001",
      input,
      dimensions: 768,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  return (data.data ?? []).map((d) => d.embedding);
}

export function safeJsonParse<T = unknown>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { /* fallthrough */ }
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]) as T; } catch { /* */ } }
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(raw.slice(first, last + 1)) as T; } catch { /* */ }
  }
  return null;
}