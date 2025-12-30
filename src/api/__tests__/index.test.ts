import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, checkServerHealth, generate, getErrorMessage } from "../";

// Mock fetch globally
global.fetch = vi.fn();

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generate", () => {
    it("should successfully generate a response", async () => {
      // Create a readable stream for the response body
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("Test "));
          controller.enqueue(new TextEncoder().encode("response"));
          controller.close();
        },
      });

      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: (header: string) =>
            header === "content-type" ? "text/plain" : null,
        },
        body: stream,
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const generator = generate("test prompt");
      let result = "";
      for await (const chunk of generator) {
        result += chunk;
      }
      expect(result).toBe("Test response");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    describe("error handling", () => {
      // Helper to consume generator and catch error
      const consumeAndCatch = async (gen: AsyncGenerator) => {
        try {
          for await (const _ of gen) {
            // do nothing
          }
          return null; // No error
        } catch (error) {
          return error;
        }
      };

      it("should handle 400 Bad Request", async () => {
        const mockResponse = {
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: vi.fn().mockResolvedValue({ error: "Invalid prompt" }),
        };

        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).message).toContain("400 Bad Request");
      });

      it("should handle 401 Unauthorized", async () => {
        const mockResponse = {
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: vi.fn().mockResolvedValue({ error: "Authentication required" }),
        };

        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
        expect(getErrorMessage(error)).toBe(
          "Authentication failed. Please refresh the page and try again."
        );
      });

      it("should handle 403 Forbidden", async () => {
        const mockResponse = {
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: vi.fn().mockResolvedValue({ error: "Access denied" }),
        };

        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(403);
        expect(getErrorMessage(error)).toBe(
          "Access forbidden. You don't have permission to use this service."
        );
      });

      it("should handle 404 Not Found", async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: vi.fn().mockResolvedValue({ error: "Endpoint not found" }),
        };

        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(404);
        expect(getErrorMessage(error)).toBe(
          "Service not found. The server endpoint may be unavailable."
        );
      });

      it("should handle 429 Too Many Requests", async () => {
        const mockResponse = {
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          json: vi.fn().mockResolvedValue({ error: "Rate limit exceeded" }),
        };

        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(429);
        expect(getErrorMessage(error)).toBe(
          "Too many requests. Please wait a moment and try again."
        );
      });

      it("should handle 500 Internal Server Error", async () => {
        const mockResponse = {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: vi.fn().mockResolvedValue({ error: "Server error" }),
        };

        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(500);
        expect(getErrorMessage(error)).toBe(
          "Server error. The service is experiencing issues. Please try again later."
        );
      });

      it("should handle 502 Bad Gateway", async () => {
        const mockResponse = {
          ok: false,
          status: 502,
          statusText: "Bad Gateway",
          json: vi.fn().mockResolvedValue({ error: "Bad gateway" }),
        };

        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(502);
        expect(getErrorMessage(error)).toBe(
          "Bad gateway. The server is temporarily unavailable. Please try again later."
        );
      });

      it("should handle 503 Service Unavailable", async () => {
        const mockResponse = {
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          json: vi.fn().mockResolvedValue({ error: "Service unavailable" }),
        };

        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(503);
        expect(getErrorMessage(error)).toBe(
          "Service unavailable. The server is temporarily down. Please try again later."
        );
      });

      it("should handle network errors", async () => {
        const networkError = new TypeError("Failed to fetch");
        (global.fetch as any).mockRejectedValueOnce(networkError);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(0);
        const errorMessage = getErrorMessage(error);
        expect(errorMessage).toContain("Network error");
      });

      it("should handle timeout errors identified by AbortError", async () => {
        const abortError = new Error("The operation was aborted.");
        abortError.name = "AbortError";

        (global.fetch as any).mockRejectedValueOnce(abortError);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(408);
        const errorMessage = getErrorMessage(error);
        expect(errorMessage).toContain("Request timed out");
      });

      it("should handle non-JSON error responses", async () => {
        const mockResponse = {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: vi.fn().mockRejectedValue(new Error("Not JSON")),
        };

        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const error = await consumeAndCatch(generate("test prompt"));
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(500);
        expect((error as ApiError).details).toBe("Internal Server Error");
      });
    });
  });

  describe("checkServerHealth", () => {
    it("should return healthy status when server responds", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          status: "healthy",
          message: "Server is running",
        }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await checkServerHealth();
      expect(result.isHealthy).toBe(true);
      expect(result.status).toBe("Ready");
      expect(result.message).toBe("Server is running");
    });

    it("should try /health endpoint first", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ status: "healthy" }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await checkServerHealth("http://localhost:8000");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8000/health",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should fallback to root endpoint if /health fails", async () => {
      const failResponse = {
        ok: false,
        status: 404,
      };
      const successResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ status: "healthy" }),
      };

      (global.fetch as any)
        .mockResolvedValueOnce(failResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await checkServerHealth("http://localhost:8000");
      expect(result.isHealthy).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should return unhealthy status when server is down", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError);

      const result = await checkServerHealth("http://localhost:8000");
      expect(result.isHealthy).toBe(false);
      expect(result.status).toBe("Error");
      expect(result.message).toBe("Network error");
    });
  });

  describe("getErrorMessage", () => {
    it("should return appropriate message for ApiError with known status codes", () => {
      const error = new ApiError("Test error", 429, "Too Many Requests");
      expect(getErrorMessage(error)).toBe(
        "Too many requests. Please wait a moment and try again."
      );
    });

    it("should return generic message for ApiError with unknown status code", () => {
      const error = new ApiError("Test error", 599, "Unknown");
      expect(getErrorMessage(error)).toBe("Test error");
    });

    it("should handle network errors", () => {
      const error = new TypeError("Failed to fetch");
      expect(getErrorMessage(error)).toBe(
        "Network error. Please check your connection and try again."
      );
    });

    it("should handle timeout errors", () => {
      const error = new DOMException("Aborted", "AbortError");
      expect(getErrorMessage(error)).toBe(
        "Request timed out. The server took too long to respond. Please try again."
      );
    });

    it("should handle generic Error objects", () => {
      const error = new Error("Generic error");
      expect(getErrorMessage(error)).toBe("Generic error");
    });

    it("should handle unknown error types", () => {
      const error = "String error";
      expect(getErrorMessage(error)).toBe(
        "An unexpected error occurred. Please try again."
      );
    });
  });

  describe("ApiError", () => {
    it("should create ApiError with all properties", () => {
      const error = new ApiError("Test", 500, "Internal Server Error", {
        detail: "test",
      });
      expect(error.message).toBe("Test");
      expect(error.statusCode).toBe(500);
      expect(error.statusText).toBe("Internal Server Error");
      expect(error.details).toEqual({ detail: "test" });
      expect(error.name).toBe("ApiError");
    });

    it("should be instanceof Error", () => {
      const error = new ApiError("Test", 400);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });
  });
});
