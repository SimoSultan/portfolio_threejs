/**
 * Simple API client for the local Python text generation server.
 * Endpoint: POST http://localhost:8000/generate
 * Body: { "prompt": string }
 */

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GenerateOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  url?: string; // override for non-default host/port
  history?: ConversationMessage[];
};

/**
 * Send a prompt to the local generator and return the response text.
 * Attempts to parse JSON and extract a reasonable text field; falls back to raw text.
 */
export async function generate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const url = options.url ?? "http://localhost:8000/generate";
  const timeoutMs = options.timeoutMs ?? 20000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Compose the prompt with conversation history if provided
    const composedPrompt = composePrompt(options.history ?? [], prompt);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: composedPrompt }),
      signal: options.signal ?? controller.signal,
    });

    if (!res.ok) {
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data: any = await res.json();
      return (
        data?.text ??
        data?.content ??
        data?.message ??
        data?.data ??
        data?.response ??
        JSON.stringify(data)
      );
    }

    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function composePrompt(history: ConversationMessage[], latest: string): string {
  if (!history || history.length === 0) return latest;
  const lines: string[] = [];
  lines.push("Conversation so far (most recent last):");
  history.forEach(m => {
    const speaker = m.role === "user" ? "User" : "Assistant";
    lines.push(`${speaker}: ${m.content}`);
  });
  lines.push(`User: ${latest}`);
  lines.push("Assistant:");
  return lines.join("\n");
}
