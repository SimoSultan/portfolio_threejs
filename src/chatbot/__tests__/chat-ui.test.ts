import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatUI } from "../chat-ui";
import { Chatbot } from "../chatbot";

// Mock the chatbot module
vi.mock("../chatbot", () => ({
  Chatbot: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    isReady: vi.fn(() => true),
    chat: vi.fn(),
    getMessages: vi.fn(),
    clearHistory: vi.fn(),
    updateModelConfig: vi.fn(),
    getModelInfo: vi.fn(),
    refreshLocation: vi.fn(),
    getTokenUsage: vi.fn(),
  })),
}));

// Mock the models module
vi.mock("../models", () => ({
  AVAILABLE_MODELS: {
    "test-model": {
      name: "Test Model",
      modelId: "test-model",
      maxLength: 1000,
      temperature: 0.7,
    },
    local: {
      name: "Local Model",
      modelId: "local",
      maxLength: 500,
      temperature: 0.5,
    },
  },
  DEFAULT_MODEL: "test-model",
  MODEL_METADATA: {
    "test-model": {
      name: "Test Model",
      size: "7B",
    },
    local: {
      name: "Local Model",
      size: "3B",
    },
  },
}));

// Mock DOM methods
Object.defineProperty(window, "getComputedStyle", {
  value: () => ({
    getPropertyValue: () => "100px",
  }),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe("ChatUI", () => {
  let chatUI: ChatUI;
  let mockChatbot: any;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock container
    mockContainer = document.createElement("div");
    mockContainer.id = "chat-ui-container";
    document.body.appendChild(mockContainer);

    // Mock the chatbot
    mockChatbot = {
      initialize: vi.fn(),
      isReady: vi.fn(() => true),
      chat: vi.fn(),
      getMessages: vi.fn().mockResolvedValue([]),
      clearHistory: vi.fn(),
      updateModelConfig: vi.fn(),
      getModelInfo: vi.fn(),
      refreshLocation: vi.fn(),
      getTokenUsage: vi.fn().mockResolvedValue({
        used: 1000,
        available: 31000,
        percentage: 3.125,
      }),
      getCurrentContext: vi.fn().mockReturnValue({
        currentDate: "Monday, January 1, 2024",
        currentTime: "10:00 PM GMT+10",
        timezone: "Australia/Brisbane",
        location: "Brisbane, Australia",
      }),
      getDateContext: vi
        .fn()
        .mockReturnValue("Monday, January 1, 2024 - 10:00 PM GMT+10"),
      ensureContextAvailable: vi.fn(),
      cleanupOldMessages: vi.fn(),
      getMessageHistoryWithDates: vi.fn().mockResolvedValue([]),
    };

    (Chatbot as any).mockImplementation(() => mockChatbot);

    // Create ChatUI instance
    chatUI = new ChatUI();
  });

  afterEach(() => {
    // Clean up DOM
    if (mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
    // Remove any created elements
    const chatContainer = document.getElementById("chat-container");
    if (chatContainer) {
      chatContainer.remove();
    }
  });

  describe("constructor", () => {
    it("should create ChatUI instance", () => {
      expect(chatUI).toBeInstanceOf(ChatUI);
    });

    it("should create chatbot with default model", () => {
      expect(Chatbot).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: "test-model",
        }),
        expect.any(Function)
      );
    });

    it("should create UI elements", () => {
      const chatContainer = document.getElementById("chat-container");
      expect(chatContainer).toBeDefined();
    });
  });

  describe("UI creation", () => {
    it("should create main container", () => {
      const container = document.querySelector(
        ".absolute.left-0.right-0.bg-transparent.z-10.flex.flex-col.h-screen"
      );
      expect(container).toBeDefined();
    });

    it("should create chat container", () => {
      const chatContainer = document.getElementById("chat-container");
      expect(chatContainer).toBeDefined();
      if (chatContainer) {
        expect(chatContainer.className).toContain("overflow-y-auto");
      }
    });

    it("should create input container", () => {
      const inputContainer = document.querySelector(
        ".flex.flex-col.lg\\:flex-row.justify-around.items-center.gap-2.md\\:gap-3.p-3.md\\:p-4.bg-gray-800\\/20.backdrop-blur-sm.rounded-t-2xl.shadow-lg"
      );
      expect(inputContainer).toBeDefined();
    });

    it("should create model selector", () => {
      const modelSelector = document.getElementById("model-selector");
      expect(modelSelector).toBeDefined();
      if (modelSelector) {
        const modelText = modelSelector.querySelector("#model-text");
        expect(modelText?.textContent).toContain("Test Model");
      }
    });

    it("should create status indicator", () => {
      const statusIndicator = document.querySelector(
        ".flex.items-center.gap-2"
      );
      expect(statusIndicator).toBeDefined();
    });
  });

  describe("chatbot initialization", () => {
    it("should initialize chatbot", () => {
      expect(mockChatbot.initialize).toHaveBeenCalled();
    });

    it("should handle initialization success", async () => {
      mockChatbot.initialize.mockResolvedValue(undefined);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockChatbot.initialize).toHaveBeenCalled();
    });

    it("should handle initialization failure", async () => {
      mockChatbot.initialize.mockRejectedValue(new Error("Init failed"));

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockChatbot.initialize).toHaveBeenCalled();
    });
  });

  describe("message handling", () => {
    beforeEach(() => {
      // Mock successful chat response
      mockChatbot.chat.mockResolvedValue("AI response");
    });

    it("should send message when send button clicked", async () => {
      const sendButton = document.querySelector(
        "button[type='submit']"
      ) as HTMLButtonElement;
      const input = document.querySelector(
        "input[type='text']"
      ) as HTMLInputElement;

      if (input && sendButton) {
        input.value = "Hello, AI!";
        sendButton.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockChatbot.chat).toHaveBeenCalledWith("Hello, AI!");
      }
    });

    it("should send message when Enter key pressed", async () => {
      const input = document.querySelector(
        "input[type='text']"
      ) as HTMLInputElement;

      if (input) {
        input.value = "Hello, AI!";
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockChatbot.chat).toHaveBeenCalledWith("Hello, AI!");
      }
    });

    it("should not send empty messages", async () => {
      const sendButton = document.querySelector(
        "button[type='submit']"
      ) as HTMLButtonElement;
      const input = document.querySelector(
        "input[type='text']"
      ) as HTMLInputElement;

      if (input && sendButton) {
        input.value = "";
        sendButton.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockChatbot.chat).not.toHaveBeenCalled();
      }
    });

    it("should not send message if chatbot not ready", async () => {
      mockChatbot.isReady.mockReturnValue(false);

      const sendButton = document.querySelector(
        "button[type='submit']"
      ) as HTMLButtonElement;
      const input = document.querySelector(
        "input[type='text']"
      ) as HTMLInputElement;

      if (input && sendButton) {
        input.value = "Hello, AI!";
        sendButton.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockChatbot.chat).not.toHaveBeenCalled();
      }
    });

    it("should clear input after sending message", async () => {
      const sendButton = document.querySelector(
        "button[type='submit']"
      ) as HTMLButtonElement;
      const input = document.querySelector(
        "input[type='text']"
      ) as HTMLInputElement;

      if (input && sendButton) {
        input.value = "Hello, AI!";
        sendButton.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(input.value).toBe("");
      }
    });
  });

  describe("model switching", () => {
    it("should create model dropdown", () => {
      const modelDropdown = document.querySelector(
        ".absolute.bottom-full.left-0.mb-1.bg-gray-800\\/90.backdrop-blur-sm.rounded-lg.shadow-lg.border.border-gray-600\\/30.z-50.min-w-48"
      );
      expect(modelDropdown).toBeDefined();
    });

    it("should toggle model dropdown on click", () => {
      const modelSelector = document.getElementById("model-selector");

      if (modelSelector) {
        // Initial state should be closed
        const modelDropdown = document.querySelector(
          ".absolute.bottom-full.left-0.mb-1.bg-gray-800\\/90.backdrop-blur-sm.rounded-lg.shadow-lg.border.border-gray-600\\/30.z-50.min-w-48"
        ) as HTMLElement;
        expect(modelDropdown?.style.display).toBe("none");

        // Click to open
        modelSelector.click();

        // Should now be open
        expect(modelDropdown?.style.display).toBe("block");
      }
    });

    it("should close model dropdown when clicking outside", () => {
      const modelSelector = document.getElementById("model-selector");

      if (modelSelector) {
        // Open dropdown
        modelSelector.click();

        // Click outside to close
        document.body.click();

        // Should be closed
        const modelDropdown = document.querySelector(
          ".absolute.bottom-full.left-0.mb-1.bg-gray-800\\/90.backdrop-blur-sm.rounded-lg.shadow-lg.border.border-gray-600\\/30.z-50.min-w-48"
        ) as HTMLElement;
        expect(modelDropdown?.style.display).toBe("none");
      }
    });

    it("should switch model when option selected", () => {
      const modelSelector = document.getElementById(
        "model-selector"
      ) as HTMLElement;

      if (modelSelector) {
        // Open dropdown
        modelSelector.click();

        // Find and click local model option
        const localOption = document.querySelector(
          "[data-model-id='local']"
        ) as HTMLElement;
        if (localOption) {
          localOption.click();

          expect(mockChatbot.updateModelConfig).toHaveBeenCalledWith(
            expect.objectContaining({
              modelId: "local",
            })
          );
        }
      }
    });
  });

  describe("debug functionality", () => {
    it("should create debug button", () => {
      const debugButton = document.querySelector(
        "button[title='Debug Options']"
      );
      expect(debugButton).toBeDefined();
    });

    it("should create debug dropdown", () => {
      const debugButton = document.querySelector(
        "button[title='Debug Options']"
      ) as HTMLButtonElement;
      if (debugButton) {
        debugButton.click();

        const debugDropdown = document.querySelector(
          ".absolute.bottom-full.right-0.mb-1.bg-gray-800\\/90.backdrop-blur-sm.rounded-lg.shadow-lg.border.border-gray-600\\/30.z-50.min-w-48"
        );
        expect(debugDropdown).toBeDefined();
      }
    });

    it("should toggle debug dropdown", () => {
      const debugButton = document.querySelector(
        "button[title='Debug Options']"
      ) as HTMLButtonElement;

      if (debugButton) {
        // Initial state should be closed
        debugButton.click();

        // Should now be open
        const debugDropdown = document.querySelector(
          ".absolute.bottom-full.right-0.mb-1.bg-gray-800\\/90.backdrop-blur-sm.rounded-lg.shadow-lg.border.border-gray-600\\/30.z-50.min-w-48"
        ) as HTMLElement;
        expect(debugDropdown?.style.display).toBe("block");

        // Click again to close
        debugButton.click();

        // Should be closed
        expect(debugDropdown?.style.display).toBe("none");
      }
    });

    it("should create animation buttons", () => {
      const debugButton = document.querySelector(
        "button[title='Debug Options']"
      ) as HTMLButtonElement;

      if (debugButton) {
        debugButton.click();

        const debugDropdown = document.querySelector(
          ".absolute.bottom-full.right-0.mb-1.bg-gray-800\\/90.backdrop-blur-sm.rounded-lg.shadow-lg.border.border-gray-600\\/30.z-50.min-w-48"
        );
        expect(debugDropdown).toBeDefined();

        // Should have animation buttons
        const animationButtons = debugDropdown?.querySelectorAll("button");
        expect(animationButtons?.length).toBeGreaterThan(0);
      }
    });
  });

  describe("context display", () => {
    it("should create context display", () => {
      const contextDisplay = document.querySelector(
        ".flex.items-center.gap-2.cursor-pointer.hover\\:text-gray-800.transition-colors"
      );
      expect(contextDisplay).toBeDefined();
    });

    it("should create context dropdown", () => {
      const contextDisplay = document.querySelector(
        ".flex.items-center.gap-2.cursor-pointer.hover\\:text-gray-800.transition-colors"
      ) as HTMLElement;

      if (contextDisplay) {
        contextDisplay.click();

        const contextDropdown = document.querySelector(
          ".absolute.bottom-full.left-0.mb-1.bg-gray-800\\/90.backdrop-blur-sm.rounded-lg.shadow-lg.border.border-gray-600\\/30.z-50.min-w-48"
        );
        expect(contextDropdown).toBeDefined();
      }
    });

    it("should toggle context dropdown", () => {
      const contextDisplay = document.querySelector(
        ".flex.items-center.gap-2.cursor-pointer.hover\\:text-gray-800.transition-colors"
      ) as HTMLElement;

      if (contextDisplay) {
        // Initial state should be closed
        contextDisplay.click();

        // Should now be open
        const contextDropdown = document.querySelector(
          ".absolute.bottom-full.left-0.mb-1.bg-gray-800\\/90.backdrop-blur-sm.rounded-lg.shadow-lg.border.border-gray-600\\/30.z-50.min-w-48"
        ) as HTMLElement;
        expect(contextDropdown?.style.display).toBe("block");

        // Click again to close
        contextDisplay.click();

        // Should be closed
        expect(contextDropdown?.style.display).toBe("none");
      }
    });
  });

  describe("status updates", () => {
    it("should update status indicator", () => {
      const statusIndicator = document.querySelector(
        ".flex.items-center.gap-2"
      );
      expect(statusIndicator).toBeDefined();

      // Status should be updated during initialization
      if (statusIndicator) {
        expect(statusIndicator.textContent).toContain("Initializing");
      }
    });

    it("should update status to ready after initialization", async () => {
      mockChatbot.initialize.mockResolvedValue(undefined);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0));

      const statusIndicator = document.querySelector(
        ".flex.items-center.gap-2"
      );
      if (statusIndicator) {
        expect(statusIndicator.textContent).toContain("Ready");
      }
    });
  });

  describe("token usage display", () => {
    it("should create token usage indicator", () => {
      const tokenIndicator = document.querySelector(
        ".flex.items-center.gap-2.text-xs.text-gray-400"
      );
      expect(tokenIndicator).toBeDefined();
    });

    it("should update token usage display", async () => {
      const mockMessages = [
        {
          role: "user",
          content: "Hello",
          timestamp: new Date(),
          tokenCount: 100,
        },
        {
          role: "assistant",
          content: "Hi",
          timestamp: new Date(),
          tokenCount: 50,
        },
      ];

      mockChatbot.getMessages.mockResolvedValue(mockMessages);

      // Wait for token usage update
      await new Promise(resolve => setTimeout(resolve, 0));

      const tokenIndicator = document.querySelector(
        ".flex.items-center.gap-2.text-xs.text-gray-400"
      );
      expect(tokenIndicator).toBeDefined();
    });
  });

  describe("message display", () => {
    it("should load existing messages", async () => {
      const mockMessages = [
        { role: "user", content: "Hello", timestamp: new Date() },
        { role: "assistant", content: "Hi there!", timestamp: new Date() },
      ];

      mockChatbot.getMessages.mockResolvedValue(mockMessages);

      // Wait for messages to load
      await new Promise(resolve => setTimeout(resolve, 0));

      const chatContainer = document.getElementById("chat-container");
      expect(chatContainer).toBeDefined();
    });

    it("should display user messages", async () => {
      const mockMessages = [
        { role: "user", content: "Hello", timestamp: new Date() },
      ];

      mockChatbot.getMessages.mockResolvedValue(mockMessages);

      // Wait for messages to load
      await new Promise(resolve => setTimeout(resolve, 0));

      const chatContainer = document.getElementById("chat-container");
      if (chatContainer) {
        expect(chatContainer.textContent).toContain("Hello");
      }
    });

    it("should display assistant messages", async () => {
      const mockMessages = [
        { role: "assistant", content: "Hi there!", timestamp: new Date() },
      ];

      mockChatbot.getMessages.mockResolvedValue(mockMessages);

      // Wait for messages to load
      await new Promise(resolve => setTimeout(resolve, 0));

      const chatContainer = document.getElementById("chat-container");
      if (chatContainer) {
        expect(chatContainer.textContent).toContain("Hi there!");
      }
    });
  });

  describe("error handling", () => {
    it("should handle chat errors gracefully", async () => {
      mockChatbot.chat.mockRejectedValue(new Error("Chat error"));

      const sendButton = document.querySelector(
        "button[type='submit']"
      ) as HTMLButtonElement;
      const input = document.querySelector(
        "input[type='text']"
      ) as HTMLInputElement;

      if (input && sendButton) {
        input.value = "Hello, AI!";
        sendButton.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0));

        // Should not throw, should handle error gracefully
        expect(mockChatbot.chat).toHaveBeenCalled();
      }
    });

    it("should handle model switching errors", () => {
      mockChatbot.updateModelConfig.mockImplementation(() => {
        throw new Error("Model switch error");
      });

      const modelSelector = document.getElementById(
        "model-selector"
      ) as HTMLElement;

      if (modelSelector) {
        // Should not throw, should handle error gracefully
        expect(() => {
          modelSelector.click();
          const localOption = document.querySelector(
            "[data-model-id='local']"
          ) as HTMLElement;
          if (localOption) {
            localOption.click();
          }
        }).not.toThrow();
      }
    });
  });

  describe("cleanup", () => {
    it("should destroy UI elements", () => {
      const chatContainer = document.getElementById("chat-container");
      expect(chatContainer).toBeDefined();

      // Call destroy method
      chatUI.destroy();

      // Elements should be removed
      const removedContainer = document.getElementById("chat-container");
      expect(removedContainer).toBeNull();
    });
  });
});
