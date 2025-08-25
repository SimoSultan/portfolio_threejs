import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getOllamaUrl, getOllamaEnvironment } from "../config";

describe("Config", () => {
  let originalOllamaEnvironment: string | undefined;
  let originalOllamaLocalUrl: string | undefined;
  let originalOllamaRemoteUrl: string | undefined;

  beforeEach(() => {
    // Store original environment variables
    originalOllamaEnvironment = process.env.OLLAMA_ENVIRONMENT;
    originalOllamaLocalUrl = process.env.OLLAMA_LOCAL_URL;
    originalOllamaRemoteUrl = process.env.OLLAMA_REMOTE_URL;
  });

  afterEach(() => {
    // Restore original environment variables
    if (originalOllamaEnvironment !== undefined) {
      process.env.OLLAMA_ENVIRONMENT = originalOllamaEnvironment;
    } else {
      delete process.env.OLLAMA_ENVIRONMENT;
    }
    if (originalOllamaLocalUrl !== undefined) {
      process.env.OLLAMA_LOCAL_URL = originalOllamaLocalUrl;
    } else {
      delete process.env.OLLAMA_LOCAL_URL;
    }
    if (originalOllamaRemoteUrl !== undefined) {
      process.env.OLLAMA_REMOTE_URL = originalOllamaRemoteUrl;
    } else {
      delete process.env.OLLAMA_REMOTE_URL;
    }
  });

  describe("getOllamaUrl", () => {
    it("should return default local Ollama URL", () => {
      const url = getOllamaUrl();
      expect(url).toBe("http://localhost:11434");
    });

    it("should return custom local Ollama URL from environment variable", () => {
      process.env.OLLAMA_LOCAL_URL = "http://custom-ollama:11434";
      
      const url = getOllamaUrl();
      expect(url).toBe("http://custom-ollama:11434");
    });

    it("should return remote URL when environment is remote", () => {
      process.env.OLLAMA_ENVIRONMENT = "remote";
      process.env.OLLAMA_REMOTE_URL = "https://secure-ollama.com";
      
      const url = getOllamaUrl();
      expect(url).toBe("https://secure-ollama.com");
    });

    it("should handle environment variable with protocol", () => {
      process.env.OLLAMA_LOCAL_URL = "https://secure-ollama.com";
      
      const url = getOllamaUrl();
      expect(url).toBe("https://secure-ollama.com");
    });

    it("should handle environment variable without protocol", () => {
      process.env.OLLAMA_LOCAL_URL = "192.168.1.100:11434";
      
      const url = getOllamaUrl();
      expect(url).toBe("192.168.1.100:11434");
    });
  });

  describe("getOllamaEnvironment", () => {
    it("should return local by default", () => {
      delete process.env.OLLAMA_ENVIRONMENT;
      const env = getOllamaEnvironment();
      expect(env).toBe("local");
    });

    it("should return custom environment from environment variable", () => {
      process.env.OLLAMA_ENVIRONMENT = "remote";
      
      const env = getOllamaEnvironment();
      expect(env).toBe("remote");
    });

    it("should handle various OLLAMA_ENVIRONMENT values", () => {
      const testCases = [
        { input: "local", expected: "local" },
        { input: "remote", expected: "remote" },
        { input: undefined, expected: "local" },
      ];

      testCases.forEach(({ input, expected }) => {
        if (input !== undefined) {
          process.env.OLLAMA_ENVIRONMENT = input;
        } else {
          delete process.env.OLLAMA_ENVIRONMENT;
        }
        
        const env = getOllamaEnvironment();
        expect(env).toBe(expected);
      });
    });
  });

  describe("URL validation", () => {
    it("should handle valid URLs", () => {
      const validUrls = [
        "http://localhost:11434",
        "https://ollama.example.com",
        "http://192.168.1.100:11434",
        "https://secure-ollama.com:11434",
      ];

      validUrls.forEach(url => {
        process.env.OLLAMA_LOCAL_URL = url;
        
        const result = getOllamaUrl();
        expect(result).toBe(url);
      });
    });

    it("should handle edge cases", () => {
      const edgeCases = [
        { input: "", expected: "http://localhost:11434" },
        { input: "localhost", expected: "localhost" },
        { input: "localhost:11434", expected: "localhost:11434" },
        { input: "127.0.0.1", expected: "127.0.0.1" },
        { input: "127.0.0.1:11434", expected: "127.0.0.1:11434" },
      ];

      edgeCases.forEach(({ input, expected }) => {
        if (input === "") {
          delete process.env.OLLAMA_LOCAL_URL;
        } else {
          process.env.OLLAMA_LOCAL_URL = input;
        }
        
        const result = getOllamaUrl();
        expect(result).toBe(expected);
      });
    });
  });

  describe("environment consistency", () => {
    it("should maintain consistent environment across calls", () => {
      process.env.OLLAMA_ENVIRONMENT = "remote";
      
      const env1 = getOllamaEnvironment();
      const env2 = getOllamaEnvironment();
      const env3 = getOllamaEnvironment();
      
      expect(env1).toBe("remote");
      expect(env2).toBe("remote");
      expect(env3).toBe("remote");
    });

    it("should maintain consistent URL across calls", () => {
      process.env.OLLAMA_LOCAL_URL = "http://custom-ollama:11434";
      
      const url1 = getOllamaUrl();
      const url2 = getOllamaUrl();
      const url3 = getOllamaUrl();
      
      expect(url1).toBe("http://custom-ollama:11434");
      expect(url2).toBe("http://custom-ollama:11434");
      expect(url3).toBe("http://custom-ollama:11434");
    });
  });
});
