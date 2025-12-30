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
 * Custom error class for API errors with status code information
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public statusText?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const VITE_API_URL = import.meta.env.VITE_API_URL;

/**
 * Check if the server is healthy by hitting the home route.
 * Returns health status and message.
 */
export async function checkServerHealth(): Promise<HealthCheckResult> {
  const url = VITE_API_URL ?? "https://portfolio-server-neon-five.vercel.app";

  try {
    const response = await fetch(`${url}/`, {
      method: "GET",
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
  const url = VITE_API_URL ?? "https://portfolio-server-neon-five.vercel.app";

  const timeoutMs = options.timeoutMs ?? 20000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${url}/generate`, {
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

/**
 * Get user-friendly error message based on status code
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 400:
        return "Invalid request. Please check your input and try again.";
      case 401:
        return "Authentication failed. Please refresh the page and try again.";
      case 403:
        return "Access forbidden. You don't have permission to use this service.";
      case 404:
        return "Service not found. The server endpoint may be unavailable.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Server error. The service is experiencing issues. Please try again later.";
      case 502:
        return "Bad gateway. The server is temporarily unavailable. Please try again later.";
      case 503:
        return "Service unavailable. The server is temporarily down. Please try again later.";
      default:
        return (
          error.message || "An unexpected error occurred. Please try again."
        );
    }
  }

  if (error instanceof Error) {
    // Handle network errors
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError")
    ) {
      return "Network error. Please check your connection and try again.";
    }
    // Handle timeout errors
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return "Request timed out. The server took too long to respond. Please try again.";
    }
    return error.message || "An unexpected error occurred. Please try again.";
  }

  return "An unexpected error occurred. Please try again.";
}
