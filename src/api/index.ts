/**
 * Simple API client for the local Python text generation server.
 * Endpoint: POST http://localhost:8000/generate
 * Body: { "prompt": string, "history": ConversationMessage[] }
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

export type HealthCheckResult = {
  isHealthy: boolean;
  status: string;
  message?: string;
};

/**
 * Check if the server is healthy by hitting the home route.
 * Returns health status and message.
 */
export async function checkServerHealth(
  baseUrl?: string
): Promise<HealthCheckResult> {
  const url = baseUrl ?? window.location.origin;

  try {
    const response = await fetch(`${url}/`, {
      method: "GET",
      headers: {
        Accept: "text/plain",
      },
    });

    if (!response.ok) {
      return {
        isHealthy: false,
        status: "Error",
        message: `HTTP ${response.status}`,
      };
    }

    const text = await response.text();

    // Check if response contains "hello world"
    if (text.toLowerCase().includes("hello world")) {
      return {
        isHealthy: true,
        status: "Ready",
        message: "Server is healthy",
      };
    } else {
      return {
        isHealthy: false,
        status: "Server responded but unexpected content",
        message: "Unexpected response content",
      };
    }
  } catch (error) {
    return {
      isHealthy: false,
      status: "Error",
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Send a prompt to the local generator and return the response text.
 * Attempts to parse JSON and extract a reasonable text field; falls back to raw text.
 */
export async function generate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  // const url = options.url ?? "http://localhost:8000/generate";
  const url = options.url ?? "https://portfolio-server-neon-five.vercel.app";

  const timeoutMs = options.timeoutMs ?? 20000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history: options.history ?? [] }),
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
