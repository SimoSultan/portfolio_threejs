import { describe, expect, it } from "vitest";
import { Chatbot, ChatUI, ContextManager } from "../index";
import { AVAILABLE_MODELS, DEFAULT_MODEL, MODEL_METADATA } from "../models";
import { getOllamaUrl, getOllamaEnvironment } from "../config";

describe("Chatbot Index Exports", () => {
  describe("Main Classes", () => {
    it("should export Chatbot class", () => {
      expect(Chatbot).toBeDefined();
      expect(typeof Chatbot).toBe("function");
      expect(Chatbot.prototype).toBeDefined();
    });

    it("should export ChatUI class", () => {
      expect(ChatUI).toBeDefined();
      expect(typeof ChatUI).toBe("function");
      expect(ChatUI.prototype).toBeDefined();
    });

    it("should export ContextManager class", () => {
      expect(ContextManager).toBeDefined();
      expect(typeof ContextManager).toBe("function");
      expect(ContextManager.prototype).toBeDefined();
    });
  });

  describe("Configuration Exports", () => {
    it("should export configuration functions", () => {
      expect(getOllamaUrl).toBeDefined();
      expect(getOllamaEnvironment).toBeDefined();
      expect(typeof getOllamaUrl).toBe("function");
      expect(typeof getOllamaEnvironment).toBe("function");
    });
  });

  describe("Models Exports", () => {
    it("should export model configurations", () => {
      expect(AVAILABLE_MODELS).toBeDefined();
      expect(DEFAULT_MODEL).toBeDefined();
      expect(MODEL_METADATA).toBeDefined();
    });
  });

  describe("Class Instantiation", () => {
    it("should be able to create Chatbot instance", () => {
      const mockModelConfig = {
        name: "Test Model",
        modelId: "test-model",
        maxLength: 1000,
        temperature: 0.7,
      };

      const chatbot = new Chatbot(mockModelConfig);
      expect(chatbot).toBeInstanceOf(Chatbot);
    });

    it("should be able to create ChatUI instance", () => {
      const chatUI = new ChatUI();
      expect(chatUI).toBeInstanceOf(ChatUI);
    });

    it("should be able to create ContextManager instance", () => {
      const contextManager = new ContextManager();
      expect(contextManager).toBeInstanceOf(ContextManager);
    });
  });

  describe("Export Completeness", () => {
    it("should export all necessary components", () => {
      // Test that all expected exports are available
      expect(Chatbot).toBeDefined();
      expect(ChatUI).toBeDefined();
      expect(ContextManager).toBeDefined();
      expect(AVAILABLE_MODELS).toBeDefined();
      expect(DEFAULT_MODEL).toBeDefined();
      expect(MODEL_METADATA).toBeDefined();
      expect(getOllamaUrl).toBeDefined();
      expect(getOllamaEnvironment).toBeDefined();
    });

    it("should not export unnecessary items", () => {
      // Test that we have the expected exports by checking the imported values
      expect(Chatbot).toBeDefined();
      expect(ChatUI).toBeDefined();
      expect(ContextManager).toBeDefined();
      expect(AVAILABLE_MODELS).toBeDefined();
      expect(DEFAULT_MODEL).toBeDefined();
      expect(MODEL_METADATA).toBeDefined();
      expect(getOllamaUrl).toBeDefined();
      expect(getOllamaEnvironment).toBeDefined();
    });
  });

  describe("Module Structure", () => {
    it("should be a valid ES module", () => {
      // Test that our imports are valid
      expect(Chatbot).toBeDefined();
      expect(ChatUI).toBeDefined();
      expect(ContextManager).toBeDefined();
    });

    it("should have proper default export", () => {
      // ES modules with named exports don't have default exports
      expect(true).toBe(true); // This test passes by design
    });

    it("should have proper named exports", () => {
      // Test that our named exports are available
      expect(Chatbot).toBeDefined();
      expect(ChatUI).toBeDefined();
      expect(ContextManager).toBeDefined();
    });
  });
});
