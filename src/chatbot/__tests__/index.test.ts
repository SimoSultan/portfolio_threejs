import { describe, expect, it } from "vitest";

import { ChatUI, ContextManager } from "../index";

describe("Chatbot Index Exports", () => {
  describe("Main Classes", () => {
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

  describe("Class Instantiation", () => {
    it("should be able to create ChatUI instance", () => {
      const chatUI = new ChatUI();
      expect(chatUI).toBeInstanceOf(ChatUI);
    });

    it("should be able to create ContextManager instance", () => {
      const contextManager = new ContextManager();
      expect(contextManager).toBeInstanceOf(ContextManager);
    });
  });

  describe("Module Structure", () => {
    it("should be a valid ES module", () => {
      // Test that our imports are valid
      expect(ChatUI).toBeDefined();
      expect(ContextManager).toBeDefined();
    });
  });
});
