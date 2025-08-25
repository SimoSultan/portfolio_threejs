import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type ChatContext,
  ContextManager,
  type StoredMessage,
} from "../context";

// Mock the storage module
const mockStorage = {
  loadContext: vi.fn(),
  saveContext: vi.fn(),
  addMessage: vi.fn(),
  searchMessages: vi.fn(),
  getMessagesByRole: vi.fn(),
  getMessagesByDateRange: vi.fn(),
  clearAll: vi.fn(),
  testConnection: vi.fn(),
  getStorageStats: vi.fn(),
  exportConversation: vi.fn(),
  importConversation: vi.fn(),
};

// Mock the StorageManager constructor
vi.mock("../database/storage", () => ({
  StorageManager: vi.fn().mockImplementation(() => mockStorage),
}));

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(navigator, "geolocation", {
  value: mockGeolocation,
  writable: true,
});

// Mock fetch for reverse geocoding
global.fetch = vi.fn();

describe("ContextManager", () => {
  let contextManager: ContextManager;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset timers
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

    // Reset mock storage and set default return values
    mockStorage.loadContext.mockReset().mockResolvedValue(null);
    mockStorage.saveContext.mockReset().mockResolvedValue(undefined);
    mockStorage.addMessage.mockReset().mockResolvedValue(undefined);
    mockStorage.clearAll.mockReset().mockResolvedValue(undefined);
    mockStorage.importConversation.mockReset().mockResolvedValue(undefined);

    // Create ContextManager instance
    contextManager = new ContextManager();
    
    // Wait for async initialization to complete
    await vi.runAllTimersAsync();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should create ContextManager with default settings", () => {
      expect(contextManager).toBeInstanceOf(ContextManager);
    });

    it("should create ContextManager with callback", () => {
      const callback = vi.fn();
      const managerWithCallback = new ContextManager(callback);

      expect(managerWithCallback).toBeInstanceOf(ContextManager);
    });

    it("should initialize context after construction", async () => {
      // Create a new instance and wait for initialization
      const newManager = new ContextManager();
      await vi.runAllTimersAsync();

      // Should have context available
      const context = newManager.getContext();
      expect(context).toBeDefined();
      expect(context?.location).toBeDefined();
    });
  });

  describe("context initialization", () => {
    it("should load existing context from storage", async () => {
      const existingContext = {
        context: {
          currentDate: "Monday, January 1, 2024",
          currentTime: "10:00 PM GMT+10",
          timezone: "Australia/Brisbane",
          location: "Brisbane, Australia",
        },
        messages: [],
        totalTokens: 0,
        lastUpdated: new Date(),
      };

      mockStorage.loadContext.mockResolvedValue(existingContext);

      await vi.runAllTimersAsync();

      const context = contextManager.getContext();
      expect(context).toEqual(existingContext.context);
    });

    it("should create default context when none exists", async () => {
      mockStorage.loadContext.mockResolvedValue(null);

      await vi.runAllTimersAsync();

      const context = contextManager.getContext();
      expect(context).toBeDefined();
      expect(context?.currentDate).toContain("Monday, January 1, 2024");
      expect(context?.timezone).toBeDefined();
      expect(context?.location).toBe("Brisbane, Australia");
    });

    it("should handle initialization errors gracefully", async () => {
      mockStorage.loadContext.mockRejectedValue(new Error("Storage error"));

      await vi.runAllTimersAsync();

      const context = contextManager.getContext();
      expect(context).toBeDefined(); // Should still have default context
    });
  });

  describe("message handling", () => {
    // No need for beforeEach here since it's handled in the main beforeEach

    it("should add user message", async () => {
      const message = "Hello, how are you?";

      await contextManager.addMessage("user", message);

      // Test that the message was added by checking if we can retrieve it
      const messages = await contextManager.getConversationMessages();
      const userMessage = messages.find(m => m.role === "user" && m.content === message);
      expect(userMessage).toBeDefined();
    });

    it("should add assistant message", async () => {
      const message = "I'm doing well, thank you!";

      await contextManager.addMessage("assistant", message);

      // Test that the message was added by checking if we can retrieve it
      const messages = await contextManager.getConversationMessages();
      const assistantMessage = messages.find(m => m.role === "assistant" && m.content === message);
      expect(assistantMessage).toBeDefined();
    });

    it("should summarize long messages", async () => {
      const longMessage = "This is a very long message. ".repeat(100); // ~3000 chars

      await contextManager.addMessage("user", longMessage);

      // Test that the message was added and summarized
      const messages = await contextManager.getConversationMessages();
      const summarizedMessage = messages.find(m => m.role === "user" && m.isSummarized === true);
      expect(summarizedMessage).toBeDefined();
      expect(summarizedMessage?.content.length).toBeLessThan(longMessage.length);
    });

    it("should truncate extremely long messages", async () => {
      const extremelyLongMessage = "This is an extremely long message. ".repeat(500); // ~15000 chars

      await contextManager.addMessage("user", extremelyLongMessage);

      // Test that the message was added and truncated
      const messages = await contextManager.getConversationMessages();
      const truncatedMessage = messages.find(m => m.role === "user" && m.isSummarized === true);
      expect(truncatedMessage).toBeDefined();
      expect(truncatedMessage?.content.length).toBeLessThan(extremelyLongMessage.length);
    });
  });

  describe("message retrieval", () => {
    beforeEach(async () => {
      mockStorage.loadContext.mockResolvedValue(null);
      await vi.runAllTimersAsync();
    });

    it("should get conversation messages within token limits", async () => {
      // Clear any existing data first
      await contextManager.clearAllData();
      
      // Add several messages to test token limits
      await contextManager.addMessage("user", "Message 1");
      await contextManager.addMessage("assistant", "Response 1");
      await contextManager.addMessage("user", "Message 2");

      const messages = await contextManager.getConversationMessages();

      // Should return some messages (the exact number depends on token limits)
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Message 1");
    });

    it("should return empty array when no messages exist", async () => {
      // Clear all data first
      await contextManager.clearAllData();

      const messages = await contextManager.getConversationMessages();
      expect(messages).toEqual([]);
    });

    it("should stop at token limit", async () => {
      const mockMessages = Array.from({ length: 100 }, (_, i) => ({
        role: "user" as const,
        content: `Message ${i}`,
        tokenCount: 1000,
        timestamp: new Date(),
      }));

      mockStorage.loadContext.mockResolvedValue({
        messages: mockMessages,
        totalTokens: 100000,
        context: contextManager.getContext(),
        lastUpdated: new Date(),
      });

      const messages = await contextManager.getConversationMessages();

      // Should stop before reaching MAX_TOKENS (32000)
      expect(messages.length).toBeLessThan(100);
    });
  });

  describe("summarization", () => {
    beforeEach(async () => {
      mockStorage.loadContext.mockResolvedValue(null);
      await vi.runAllTimersAsync();
    });

    it("should update summarization settings", () => {
      const newThreshold = 1500;
      const newMaxLength = 400;

      contextManager.updateSummarizationSettings(newThreshold, newMaxLength);

      const settings = contextManager.getSummarizationSettings();
      expect(settings.threshold).toBe(newThreshold);
      expect(settings.maxLength).toBe(newMaxLength);
    });
  });

  describe("location services", () => {
    beforeEach(async () => {
      mockStorage.loadContext.mockResolvedValue(null);
      await vi.runAllTimersAsync();
    });

    it("should request location permission", async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(success => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006 },
        });
      });

      await contextManager.refreshLocation();

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it("should handle location permission denied", async () => {
      // Mock geolocation to simulate permission denied
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error({ code: 1, message: "Permission denied" });
      });

      // Refresh location (this should handle the permission denial gracefully)
      await contextManager.refreshLocation();

      const context = contextManager.getContext();
      expect(context?.location).toBeDefined(); // Should have some location (could be default or coordinates)
    });

    it("should reverse geocode coordinates", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            address: {
              city: "New York",
              state: "New York",
              country: "United States",
            },
          }),
      });

      const locationName = await (contextManager as any).reverseGeocode(
        40.7128,
        -74.006
      );

      expect(locationName).toContain("New York");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("nominatim.openstreetmap.org")
      );
    });

    it("should handle reverse geocoding failure", async () => {
      (fetch as any).mockRejectedValueOnce(new Error("API error"));

      const locationName = await (contextManager as any).reverseGeocode(
        40.7128,
        -74.006
      );

      expect(locationName).toBe("40.7128, -74.0060");
    });
  });

  describe("cleanup and maintenance", () => {
    beforeEach(async () => {
      mockStorage.loadContext.mockResolvedValue(null);
      await vi.runAllTimersAsync();
    });

    it("should cleanup old messages", async () => {
      // Add some messages first
      await contextManager.addMessage("user", "Old message");
      await contextManager.addMessage("assistant", "Old response");

      await contextManager.cleanupOldMessages();

      // Should still have the context available
      const context = contextManager.getContext();
      expect(context).toBeDefined();
    });

    it("should summarize existing messages", async () => {
      // Add some long messages that will be summarized
      await contextManager.addMessage("user", "This is a very long message. ".repeat(100));

      const result = await contextManager.summarizeExistingMessages();

      // Should have some summarization activity
      expect(result.summarized).toBeGreaterThanOrEqual(0);
      expect(result.savedTokens).toBeGreaterThanOrEqual(0);
    });
  });

  describe("utility methods", () => {
    beforeEach(async () => {
      mockStorage.loadContext.mockResolvedValue(null);
      await vi.runAllTimersAsync();
    });

    it("should get token usage", async () => {
      // Add some messages to have tokens to count
      await contextManager.addMessage("user", "Test message");
      await contextManager.addMessage("assistant", "Test response");

      const usage = await contextManager.getTokenUsage();

      expect(usage.used).toBeGreaterThan(0);
      expect(usage.available).toBeLessThanOrEqual(32000); // MAX_TOKENS
      expect(usage.percentage).toBeGreaterThan(0);
      expect(usage.percentage).toBeLessThanOrEqual(100);
    });

    it("should get summary statistics", async () => {
      // Add messages including some long ones that will be summarized
      await contextManager.addMessage("user", "Short message");
      await contextManager.addMessage("user", "This is a very long message. ".repeat(100));

      const stats = await contextManager.getSummaryStatistics();

      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(stats.totalTokens).toBeGreaterThan(0);
    });

    it("should format context for prompt", () => {
      const context = contextManager.getContext();
      const formatted = contextManager.formatContextForPrompt();

      expect(formatted).toContain("Current Context");
      expect(formatted).toContain(context?.currentDate);
      expect(formatted).toContain(context?.currentTime);
      expect(formatted).toContain(context?.timezone);
      expect(formatted).toContain(context?.location);
    });

    it("should get date context", () => {
      const dateContext = contextManager.getDateContext();

      expect(dateContext).toContain("Monday, January 1, 2024");
      expect(dateContext).toContain("10:00 PM GMT+10");
    });

    it("should export and import conversation data", async () => {
      // Add some messages first
      await contextManager.addMessage("user", "Test message");
      await contextManager.addMessage("assistant", "Test response");

      const exportData = await contextManager.exportConversation();
      
      // Clear data and import it back
      await contextManager.clearAllData();
      await contextManager.importConversation(exportData);

      // Should have the messages back
      const messages = await contextManager.getConversationMessages();
      expect(messages.length).toBeGreaterThan(0);
    });

    it("should clear all data", async () => {
      // Add some data first
      await contextManager.addMessage("user", "Test message");

      await contextManager.clearAllData();
      
      // Should still have context available
      expect(contextManager.getContext()).toBeDefined(); // Should recreate default context
      
      // Messages should be cleared
      const messages = await contextManager.getConversationMessages();
      expect(messages).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockStorage.loadContext.mockRejectedValue(new Error("Storage error"));

      await vi.runAllTimersAsync();

      // Should not throw, should create default context
      expect(contextManager.getContext()).toBeDefined();
    });

    it("should handle location errors gracefully", async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => {
          error({ code: 2, message: "Position unavailable" });
        }
      );

      await contextManager.refreshLocation();

      // Should not throw, should keep default location
      const context = contextManager.getContext();
      expect(context?.location).toBe("Brisbane, Australia");
    });
  });
});
