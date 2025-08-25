import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContextStorage, StoredMessage } from "../../chatbot/context-manager";
import { DatabaseManager } from "../db-manager";
import { StorageManager } from "../storage-manager";

// Mock the DatabaseManager
vi.mock("../db-manager");
const MockDatabaseManager = vi.mocked(DatabaseManager);

describe("StorageManager", () => {
  let storageManager: StorageManager;
  let mockDbManager: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock database manager
    mockDbManager = {
      saveContext: vi.fn().mockResolvedValue(undefined),
      loadContext: vi.fn().mockResolvedValue(null),
      clearAll: vi.fn().mockResolvedValue(undefined),
      testConnection: vi.fn().mockResolvedValue(true),
      getDatabaseStats: vi.fn().mockResolvedValue({
        type: "localStorage",
        version: 3,
        size: 0,
        lastUpdated: null,
      }),
    };

    // Mock the DatabaseManager constructor
    MockDatabaseManager.mockImplementation(() => mockDbManager);

    storageManager = new StorageManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create StorageManager with DatabaseManager", () => {
      expect(MockDatabaseManager).toHaveBeenCalled();
      expect(storageManager).toBeInstanceOf(StorageManager);
    });
  });

  describe("context operations", () => {
    it("should save context", async () => {
      const mockContext: ContextStorage = {
        messages: [],
        totalTokens: 0,
        lastUpdated: new Date(),
      } as any;

      await storageManager.saveContext(mockContext);

      expect(mockDbManager.saveContext).toHaveBeenCalledWith(mockContext);
    });

    it("should load context", async () => {
      const mockContext: ContextStorage = {
        messages: [],
        totalTokens: 0,
        lastUpdated: new Date(),
      } as any;

      mockDbManager.loadContext.mockResolvedValue(mockContext);

      const result = await storageManager.loadContext();

      expect(mockDbManager.loadContext).toHaveBeenCalled();
      expect(result).toEqual(mockContext);
    });
  });

  describe("message operations", () => {
    const mockMessage: StoredMessage = {
      content: "Hello, world!",
      role: "user",
      timestamp: new Date(),
      tokenCount: 5,
      summary: "Greeting message",
      isSummarized: false,
    };

    it("should add message to existing context", async () => {
      const existingContext: ContextStorage = {
        messages: [],
        totalTokens: 0,
        lastUpdated: new Date(),
      } as any;

      mockDbManager.loadContext.mockResolvedValue(existingContext);

      await storageManager.addMessage(mockMessage);

      expect(mockDbManager.saveContext).toHaveBeenCalledWith({
        messages: [mockMessage],
        totalTokens: 5,
        lastUpdated: expect.any(Date),
      });
    });

    it("should create initial context when none exists", async () => {
      mockDbManager.loadContext.mockResolvedValue(null);

      const consoleSpy = vi.spyOn(console, "log");
      await storageManager.addMessage(mockMessage);

      expect(consoleSpy).toHaveBeenCalledWith(
        "💾 Creating initial context for first message"
      );
      expect(mockDbManager.saveContext).toHaveBeenCalledWith({
        messages: [mockMessage],
        totalTokens: 5,
        lastUpdated: expect.any(Date),
        context: expect.objectContaining({
          currentDate: expect.any(String),
          currentTime: expect.any(String),
          timezone: expect.any(String),
          location: "Brisbane, Australia",
        }),
      });
    });

    it("should update existing context correctly", async () => {
      const existingMessage: StoredMessage = {
        content: "Previous message",
        role: "assistant",
        timestamp: new Date(),
        tokenCount: 3,
        summary: "Previous response",
        isSummarized: false,
      };

      const existingContext: ContextStorage = {
        messages: [existingMessage],
        totalTokens: 3,
        lastUpdated: new Date(),
      } as any;

      mockDbManager.loadContext.mockResolvedValue(existingContext);

      await storageManager.addMessage(mockMessage);

      expect(mockDbManager.saveContext).toHaveBeenCalledWith({
        messages: [existingMessage, mockMessage],
        totalTokens: 8,
        lastUpdated: expect.any(Date),
      });
    });
  });

  describe("message retrieval", () => {
    const mockMessages: StoredMessage[] = [
      {
        content: "User message 1",
        role: "user",
        timestamp: new Date("2024-01-01"),
        tokenCount: 5,
        summary: "First user message",
        isSummarized: false,
      },
      {
        content: "Assistant response 1",
        role: "assistant",
        timestamp: new Date("2024-01-01T00:01:00"),
        tokenCount: 8,
        summary: "First assistant response",
        isSummarized: false,
      },
      {
        content: "User message 2",
        role: "user",
        timestamp: new Date("2024-01-02"),
        tokenCount: 6,
        summary: "Second user message",
        isSummarized: false,
      },
    ];

    beforeEach(() => {
      const mockContext: ContextStorage = {
        messages: mockMessages,
        totalTokens: 19,
        lastUpdated: new Date(),
      } as any;
      mockDbManager.loadContext.mockResolvedValue(mockContext);
    });

    it("should get all messages", async () => {
      const result = await storageManager.getAllMessages();

      expect(result).toEqual(mockMessages);
    });

    it("should get messages by role", async () => {
      const userMessages = await storageManager.getMessagesByRole("user");
      const assistantMessages =
        await storageManager.getMessagesByRole("assistant");

      expect(userMessages).toHaveLength(2);
      expect(assistantMessages).toHaveLength(1);
      expect(userMessages.every(msg => msg.role === "user")).toBe(true);
      expect(assistantMessages.every(msg => msg.role === "assistant")).toBe(
        true
      );
    });

    it("should get messages by date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-01T23:59:59");

      const result = await storageManager.getMessagesByDateRange(
        startDate,
        endDate
      );

      // Only 1 message falls within the date range (User message 1)
      // Assistant response 1 is at 00:01:00 which is technically the next day
      expect(result).toHaveLength(1);
      expect(
        result.every(
          msg => msg.timestamp >= startDate && msg.timestamp <= endDate
        )
      ).toBe(true);
    });

    it("should search messages by content", async () => {
      const result = await storageManager.searchMessages("User message");

      expect(result).toHaveLength(2);
      expect(
        result.every(
          msg =>
            msg.content.toLowerCase().includes("user message") ||
            (msg.summary && msg.summary.toLowerCase().includes("user message"))
        )
      ).toBe(true);
    });

    it("should search messages by summary", async () => {
      const result = await storageManager.searchMessages("First");

      expect(result).toHaveLength(2);
      expect(
        result.every(
          msg =>
            msg.content.toLowerCase().includes("first") ||
            (msg.summary && msg.summary.toLowerCase().includes("first"))
        )
      ).toBe(true);
    });

    it("should handle case-insensitive search", async () => {
      const result = await storageManager.searchMessages("user MESSAGE");

      expect(result).toHaveLength(2);
    });

    it("should return empty array for no search results", async () => {
      const result = await storageManager.searchMessages("nonexistent");

      expect(result).toHaveLength(0);
    });
  });

  describe("message updates", () => {
    const mockMessage: StoredMessage = {
      content: "Original content",
      role: "user",
      timestamp: new Date("2024-01-01T10:00:00"),
      tokenCount: 5,
      summary: "Original summary",
      isSummarized: false,
    };

    it("should update existing message", async () => {
      const existingContext: ContextStorage = {
        messages: [mockMessage],
        totalTokens: 5,
        lastUpdated: new Date(),
      } as any;

      mockDbManager.loadContext.mockResolvedValue(existingContext);

      const updatedMessage: StoredMessage = {
        ...mockMessage,
        content: "Updated content",
        summary: "Updated summary",
        tokenCount: 7,
      };

      // Use timestamp as message ID
      const messageId = mockMessage.timestamp.toISOString();
      await storageManager.updateMessage(messageId, updatedMessage);

      expect(mockDbManager.saveContext).toHaveBeenCalledWith({
        messages: [updatedMessage],
        totalTokens: 7,
        lastUpdated: expect.any(Date),
      });
    });

    it("should handle updating non-existent message", async () => {
      const existingContext: ContextStorage = {
        messages: [mockMessage],
        totalTokens: 5,
        lastUpdated: new Date(),
      } as any;

      mockDbManager.loadContext.mockResolvedValue(existingContext);

      const updatedMessage: StoredMessage = {
        ...mockMessage,
        content: "Updated content",
      };

      await storageManager.updateMessage("nonexistent-id", updatedMessage);

      // Should not save anything since message wasn't found
      expect(mockDbManager.saveContext).not.toHaveBeenCalled();
    });
  });

  describe("message deletion", () => {
    const mockMessage: StoredMessage = {
      content: "Test message",
      role: "user",
      timestamp: new Date("2024-01-01T10:00:00"),
      tokenCount: 5,
      summary: "Test summary",
      isSummarized: false,
    };

    it("should delete existing message", async () => {
      const existingContext: ContextStorage = {
        messages: [mockMessage],
        totalTokens: 5,
        lastUpdated: new Date(),
      } as any;

      mockDbManager.loadContext.mockResolvedValue(existingContext);

      // Use timestamp as message ID
      const messageId = mockMessage.timestamp.toISOString();
      await storageManager.deleteMessage(messageId);

      expect(mockDbManager.saveContext).toHaveBeenCalledWith({
        messages: [],
        totalTokens: 0,
        lastUpdated: expect.any(Date),
      });
    });

    it("should handle deleting non-existent message", async () => {
      const existingContext: ContextStorage = {
        messages: [mockMessage],
        totalTokens: 5,
        lastUpdated: new Date(),
      } as any;

      mockDbManager.loadContext.mockResolvedValue(existingContext);

      await storageManager.deleteMessage("nonexistent-id");

      // Should not save anything since message wasn't found
      expect(mockDbManager.saveContext).not.toHaveBeenCalled();
    });

    it("should update token count when deleting message", async () => {
      const message1: StoredMessage = {
        content: "Message 1",
        role: "user",
        timestamp: new Date("2024-01-01T10:00:00"),
        tokenCount: 5,
        summary: "First message",
        isSummarized: false,
      };

      const message2: StoredMessage = {
        content: "Message 2",
        role: "assistant",
        timestamp: new Date("2024-01-01T11:00:00"),
        tokenCount: 8,
        summary: "Second message",
        isSummarized: false,
      };

      const existingContext: ContextStorage = {
        messages: [message1, message2],
        totalTokens: 13,
        lastUpdated: new Date(),
      } as any;

      mockDbManager.loadContext.mockResolvedValue(existingContext);

      // Use timestamp as message ID
      const messageId = message1.timestamp.toISOString();
      await storageManager.deleteMessage(messageId);

      expect(mockDbManager.saveContext).toHaveBeenCalledWith({
        messages: [message2],
        totalTokens: 8,
        lastUpdated: expect.any(Date),
      });
    });
  });

  describe("context management", () => {
    it("should clear all data", async () => {
      await storageManager.clearAll();

      expect(mockDbManager.clearAll).toHaveBeenCalled();
    });

    it("should test storage functionality", async () => {
      const result = await storageManager.testStorage();

      expect(result).toBe(true);
      expect(mockDbManager.testConnection).toHaveBeenCalled();
    });

    it("should get storage statistics", async () => {
      const result = await storageManager.getStorageStats();

      expect(result).toEqual({
        database: {
          type: "localStorage",
          version: 3,
          size: 0,
          lastUpdated: null,
        },
        messages: expect.any(Object),
      });
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      mockDbManager.loadContext.mockRejectedValue(new Error("Database error"));

      await expect(storageManager.getAllMessages()).rejects.toThrow(
        "Database error"
      );
    });

    it("should handle save errors gracefully", async () => {
      mockDbManager.saveContext.mockRejectedValue(new Error("Save error"));

      const mockMessage: StoredMessage = {
        content: "Test",
        role: "user",
        timestamp: new Date(),
        tokenCount: 1,
        summary: "Test",
        isSummarized: false,
      };

      await expect(storageManager.addMessage(mockMessage)).rejects.toThrow(
        "Save error"
      );
    });
  });

  describe("method availability", () => {
    it("should have all required public methods", () => {
      expect(typeof storageManager.saveContext).toBe("function");
      expect(typeof storageManager.loadContext).toBe("function");
      expect(typeof storageManager.addMessage).toBe("function");
      expect(typeof storageManager.getAllMessages).toBe("function");
      expect(typeof storageManager.getMessagesByRole).toBe("function");
      expect(typeof storageManager.getMessagesByDateRange).toBe("function");
      expect(typeof storageManager.searchMessages).toBe("function");
      expect(typeof storageManager.updateMessage).toBe("function");
      expect(typeof storageManager.deleteMessage).toBe("function");
      expect(typeof storageManager.clearAll).toBe("function");
      expect(typeof storageManager.testStorage).toBe("function");
      expect(typeof storageManager.getStorageStats).toBe("function");
    });
  });
});
