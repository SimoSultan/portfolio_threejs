import { beforeEach, describe, expect, it, vi } from "vitest";

import { Chatbot, type ModelConfig } from "../chatbot";
import { ContextManager } from "../context";

// Mock the config module
vi.mock("../config", () => ({
  getOllamaUrl: vi.fn(() => "http://localhost:11434"),
  getOllamaEnvironment: vi.fn(() => "development"),
}));

// Mock the context module
vi.mock("../context", () => ({
  ContextManager: vi.fn().mockImplementation(() => ({
    addMessage: vi.fn(),
    getConversationMessages: vi.fn(),
    cleanupOldMessages: vi.fn(),
    formatContextForPrompt: vi.fn(() => "Test context"),
    getContext: vi.fn(),
    clearAllData: vi.fn(),
    refreshLocation: vi.fn(),
  })),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("Chatbot", () => {
  let chatbot: Chatbot;
  let mockModelConfig: ModelConfig;
  let mockContextManager: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockModelConfig = {
      name: "Test Model",
      modelId: "test-model",
      maxLength: 1000,
      temperature: 0.7,
    };

    mockContextManager = {
      addMessage: vi.fn(),
      getConversationMessages: vi.fn(),
      cleanupOldMessages: vi.fn(),
      formatContextForPrompt: vi.fn(() => "Test context"),
      getContext: vi.fn(),
      clearAllData: vi.fn(),
      refreshLocation: vi.fn(),
    };

    (ContextManager as any).mockImplementation(() => mockContextManager);

    chatbot = new Chatbot(mockModelConfig);
  });

  describe("constructor", () => {
    it("should create chatbot with model config", () => {
      expect(chatbot).toBeInstanceOf(Chatbot);
      expect(ContextManager).toHaveBeenCalled();
    });

    it("should create chatbot with context update callback", () => {
      const callback = vi.fn();
      new Chatbot(mockModelConfig, callback);
      expect(ContextManager).toHaveBeenCalledWith(callback);
    });
  });

  describe("initialize", () => {
    it("should handle local fallback model", async () => {
      const localConfig = { ...mockModelConfig, modelId: "local" };
      const localChatbot = new Chatbot(localConfig);

      await localChatbot.initialize();

      expect(fetch).not.toHaveBeenCalled();
    });

    it("should check Ollama availability", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [{ name: "test-model" }] }),
      });

      await chatbot.initialize();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/tags",
        expect.objectContaining({
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should set Ollama as available when connection succeeds", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [{ name: "test-model" }] }),
      });

      await chatbot.initialize();

      expect(chatbot.isReady()).toBe(true);
    });

    it("should handle Ollama connection failure", async () => {
      (fetch as any).mockRejectedValueOnce(new Error("Connection failed"));

      await chatbot.initialize();

      expect(chatbot.isReady()).toBe(false);
    });

    it("should handle model not found", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [{ name: "other-model" }] }),
      });

      await chatbot.initialize();

      expect(chatbot.isReady()).toBe(true); // Still available, just model not found
    });
  });

  describe("chat", () => {
    beforeEach(async () => {
      // Mock successful initialization
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [{ name: "test-model" }] }),
      });
      await chatbot.initialize();

      // Ensure the chatbot is ready by setting the internal state
      vi.spyOn(chatbot as any, "isOllamaAvailable", "get").mockReturnValue(
        true
      );

      // Mock context manager methods that are called during chat
      mockContextManager.formatContextForPrompt.mockReturnValue("Test context");
      mockContextManager.getConversationMessages.mockResolvedValue([]);
    });

    it("should throw error if already generating", async () => {
      // Manually set the isGenerating flag to true
      Object.defineProperty(chatbot, "isGenerating", {
        value: true,
        writable: true,
        configurable: true,
      });

      // Try to chat - it should fail immediately
      await expect(chatbot.chat("Second message")).rejects.toThrow(
        "Already generating response"
      );

      // Reset the flag
      Object.defineProperty(chatbot, "isGenerating", {
        value: false,
        writable: true,
        configurable: true,
      });
    });

    it("should add user message to context", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "AI response" }),
      });

      await chatbot.chat("Test message");

      expect(mockContextManager.addMessage).toHaveBeenCalledWith(
        "user",
        "Test message"
      );
    });

    it("should add assistant response to context", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "AI response" }),
      });

      await chatbot.chat("Test message");

      expect(mockContextManager.addMessage).toHaveBeenCalledWith(
        "assistant",
        "AI response"
      );
    });

    it("should cleanup old messages after response", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "AI response" }),
      });

      await chatbot.chat("Test message");

      expect(mockContextManager.cleanupOldMessages).toHaveBeenCalled();
    });

    it("should dispatch animation events", async () => {
      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "AI response" }),
      });

      await chatbot.chat("Test message");

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "triggerAnimation",
          detail: expect.objectContaining({
            type: "continuousWave",
          }),
        })
      );

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "stopAnimation",
        })
      );
    });
  });

  describe("generateOllamaResponse", () => {
    beforeEach(async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [{ name: "test-model" }] }),
      });
      await chatbot.initialize();

      // Ensure the chatbot is ready by setting the internal state
      vi.spyOn(chatbot as any, "isOllamaAvailable", "get").mockReturnValue(
        true
      );

      // Mock context manager methods that are called during generateOllamaResponse
      mockContextManager.formatContextForPrompt.mockReturnValue("Test context");
      mockContextManager.getConversationMessages.mockResolvedValue([]);
    });

    it("should generate response with Ollama", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "AI response" }),
      });

      const response = await (chatbot as any).generateOllamaResponse(
        "Test message"
      );

      expect(response).toBe("AI response");
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/generate",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("test-model"),
        })
      );
    });

    it("should handle model not found error", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const response = await (chatbot as any).generateOllamaResponse(
        "Test message"
      );

      expect(response).toContain("Model test-model not found");
    });

    it("should handle Ollama API errors", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const response = await (chatbot as any).generateOllamaResponse(
        "Test message"
      );

      expect(response).toContain("Sorry, I couldn't generate a response");
    });

    it("should handle fetch errors", async () => {
      (fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const response = await (chatbot as any).generateOllamaResponse(
        "Test message"
      );

      expect(response).toContain("Sorry, I couldn't generate a response");
    });
  });

  describe("utility methods", () => {
    it("should return messages from context manager", async () => {
      const mockMessages = [
        { role: "user", content: "Hello", timestamp: new Date() },
      ];
      mockContextManager.getConversationMessages.mockResolvedValue(
        mockMessages
      );

      const messages = await chatbot.getMessages();

      expect(messages).toEqual(mockMessages);
      expect(mockContextManager.getConversationMessages).toHaveBeenCalled();
    });

    it("should clear history through context manager", async () => {
      await chatbot.clearHistory();

      expect(mockContextManager.clearAllData).toHaveBeenCalled();
    });

    it("should update model configuration", () => {
      const newConfig = { ...mockModelConfig, temperature: 0.9 };

      chatbot.updateModelConfig(newConfig);

      expect(chatbot.getModelInfo()).toEqual(newConfig);
    });

    it("should check if ready", () => {
      expect(chatbot.isReady()).toBe(false); // Initially false

      // Mock as ready
      vi.spyOn(chatbot as any, "isOllamaAvailable", "get").mockReturnValue(
        true
      );

      expect(chatbot.isReady()).toBe(true);
    });

    it("should return model info", () => {
      const modelInfo = chatbot.getModelInfo();

      expect(modelInfo).toEqual(mockModelConfig);
    });

    it("should check if Ollama is running", () => {
      expect(chatbot.isOllamaRunning()).toBe(false); // Initially false

      // Mock as running
      vi.spyOn(chatbot as any, "isOllamaAvailable", "get").mockReturnValue(
        true
      );

      expect(chatbot.isOllamaRunning()).toBe(true);
    });

    it("should get current context", () => {
      const mockContext = { currentDate: "Today", currentTime: "Now" };
      mockContextManager.getContext.mockReturnValue(mockContext);

      const context = chatbot.getCurrentContext();

      expect(context).toEqual(mockContext);
      expect(mockContextManager.getContext).toHaveBeenCalled();
    });

    it("should refresh location through context manager", async () => {
      await chatbot.refreshLocation();

      expect(mockContextManager.refreshLocation).toHaveBeenCalled();
    });
  });
});
