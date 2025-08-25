import { ChatContext, ContextStorage, StoredMessage } from "./context-manager";
import { DatabaseManager } from "./db-manager";

/**
 * Storage Manager - Middleware between Database and Chatbot
 * Handles business logic for message storage, retrieval, and management
 */
export class StorageManager {
  private db: DatabaseManager;

  constructor() {
    this.db = new DatabaseManager();
  }

  /**
   * Save context data to storage
   */
  async saveContext(data: ContextStorage): Promise<void> {
    await this.db.saveContext(data);
  }

  /**
   * Load context data from storage
   */
  async loadContext(): Promise<ContextStorage | null> {
    return await this.db.loadContext();
  }

  /**
   * Add a new message to storage
   */
  async addMessage(message: StoredMessage): Promise<void> {
    let existing = await this.loadContext();

    // If no context exists, create initial context
    if (!existing) {
      existing = this.createInitialContext();
      console.log("💾 Creating initial context for first message");
    }

    existing.messages.push(message);
    existing.totalTokens += message.tokenCount;
    existing.lastUpdated = new Date();

    await this.saveContext(existing);
  }

  /**
   * Get all messages from storage
   */
  async getAllMessages(): Promise<StoredMessage[]> {
    const context = await this.loadContext();
    return context?.messages || [];
  }

  /**
   * Get messages by role
   */
  async getMessagesByRole(
    role: "user" | "assistant"
  ): Promise<StoredMessage[]> {
    const messages = await this.getAllMessages();
    return messages.filter(msg => msg.role === role);
  }

  /**
   * Get messages within a date range
   */
  async getMessagesByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<StoredMessage[]> {
    const messages = await this.getAllMessages();
    return messages.filter(
      msg => msg.timestamp >= startDate && msg.timestamp <= endDate
    );
  }

  /**
   * Get messages by content search
   */
  async searchMessages(query: string): Promise<StoredMessage[]> {
    const messages = await this.getAllMessages();
    const lowerQuery = query.toLowerCase();

    return messages.filter(
      msg =>
        msg.content.toLowerCase().includes(lowerQuery) ||
        (msg.summary && msg.summary.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Update an existing message
   */
  async updateMessage(
    messageId: string,
    updates: Partial<StoredMessage>
  ): Promise<boolean> {
    const context = await this.loadContext();
    if (!context) return false;

    const messageIndex = context.messages.findIndex(
      msg =>
        msg.timestamp.toISOString() === messageId ||
        msg.content.substring(0, 50) === messageId.substring(0, 50)
    );

    if (messageIndex === -1) return false;

    // Update the message
    const oldMessage = context.messages[messageIndex];
    const updatedMessage = { ...oldMessage, ...updates };

    // Recalculate total tokens if token count changed
    if (updates.tokenCount !== undefined) {
      context.totalTokens =
        context.totalTokens - oldMessage.tokenCount + updatedMessage.tokenCount;
    }

    context.messages[messageIndex] = updatedMessage;
    context.lastUpdated = new Date();

    await this.saveContext(context);
    return true;
  }

  /**
   * Delete a message by ID
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const context = await this.loadContext();
    if (!context) return false;

    const messageIndex = context.messages.findIndex(
      msg =>
        msg.timestamp.toISOString() === messageId ||
        msg.content.substring(0, 50) === messageId.substring(0, 50)
    );

    if (messageIndex === -1) return false;

    // Remove the message and update token count
    const removedMessage = context.messages.splice(messageIndex, 1)[0];
    context.totalTokens -= removedMessage.tokenCount;
    context.lastUpdated = new Date();

    await this.saveContext(context);
    return true;
  }

  /**
   * Get message statistics
   */
  async getMessageStats(): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    summarizedMessages: number;
    totalTokens: number;
    averageTokensPerMessage: number;
    oldestMessage: Date | null;
    newestMessage: Date | null;
  }> {
    const context = await this.loadContext();
    if (!context || !context.messages.length) {
      return {
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        summarizedMessages: 0,
        totalTokens: 0,
        averageTokensPerMessage: 0,
        oldestMessage: null,
        newestMessage: null,
      };
    }

    const messages = context.messages;
    const userMessages = messages.filter(msg => msg.role === "user").length;
    const assistantMessages = messages.filter(
      msg => msg.role === "assistant"
    ).length;
    const summarizedMessages = messages.filter(msg => msg.isSummarized).length;

    const timestamps = messages.map(msg => msg.timestamp);
    const oldestMessage = new Date(
      Math.min(...timestamps.map(t => t.getTime()))
    );
    const newestMessage = new Date(
      Math.max(...timestamps.map(t => t.getTime()))
    );

    return {
      totalMessages: messages.length,
      userMessages,
      assistantMessages,
      summarizedMessages,
      totalTokens: context.totalTokens,
      averageTokensPerMessage: Math.round(
        context.totalTokens / messages.length
      ),
      oldestMessage,
      newestMessage,
    };
  }

  /**
   * Clean up old messages based on criteria
   */
  async cleanupOldMessages(options: {
    maxMessages?: number;
    maxTokens?: number;
    maxAge?: number; // in days
  }): Promise<{
    removedMessages: number;
    removedTokens: number;
  }> {
    const context = await this.loadContext();
    if (!context) {
      return { removedMessages: 0, removedTokens: 0 };
    }

    let messages = [...context.messages];
    let totalTokens = context.totalTokens;
    let removedMessages = 0;
    let removedTokens = 0;

    // Remove messages by age
    if (options.maxAge) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.maxAge);

      const oldMessages = messages.filter(msg => msg.timestamp < cutoffDate);
      messages = messages.filter(msg => msg.timestamp >= cutoffDate);

      const oldTokens = oldMessages.reduce(
        (sum, msg) => sum + msg.tokenCount,
        0
      );
      removedMessages += oldMessages.length;
      removedTokens += oldTokens;
      totalTokens -= oldTokens;
    }

    // Remove messages by count
    if (options.maxMessages && messages.length > options.maxMessages) {
      const excessMessages = messages.splice(
        0,
        messages.length - options.maxMessages
      );
      const excessTokens = excessMessages.reduce(
        (sum, msg) => sum + msg.tokenCount,
        0
      );
      removedMessages += excessMessages.length;
      removedTokens += excessTokens;
      totalTokens -= excessTokens;
    }

    // Remove messages by token count
    if (options.maxTokens && totalTokens > options.maxTokens) {
      while (messages.length > 0 && totalTokens > options.maxTokens) {
        const removed = messages.shift();
        if (removed) {
          totalTokens -= removed.tokenCount;
          removedMessages++;
          removedTokens += removed.tokenCount;
        }
      }
    }

    // Update storage if any messages were removed
    if (removedMessages > 0) {
      await this.saveContext({
        messages,
        context: context.context,
        totalTokens,
        lastUpdated: new Date(),
      });

      console.log(
        `🗑️ Cleaned up ${removedMessages} messages, removed ${removedTokens} tokens`
      );
    }

    return { removedMessages, removedTokens };
  }

  /**
   * Export conversation data
   */
  async exportConversation(): Promise<{
    messages: StoredMessage[];
    context: ChatContext;
    metadata: {
      exportDate: Date;
      totalMessages: number;
      totalTokens: number;
      version: string;
    };
  }> {
    const context = await this.loadContext();
    if (!context) {
      throw new Error("No conversation data to export");
    }

    return {
      messages: context.messages,
      context: context.context,
      metadata: {
        exportDate: new Date(),
        totalMessages: context.messages.length,
        totalTokens: context.totalTokens,
        version: "1.0.0",
      },
    };
  }

  /**
   * Import conversation data
   */
  async importConversation(data: {
    messages: StoredMessage[];
    context: ChatContext;
    metadata?: any;
  }): Promise<void> {
    // Validate imported data
    if (!data.messages || !Array.isArray(data.messages)) {
      throw new Error("Invalid message data");
    }

    if (!data.context) {
      throw new Error("Invalid context data");
    }

    // Convert date strings to Date objects if needed
    const messages = data.messages.map(msg => ({
      ...msg,
      timestamp:
        msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
    }));

    // Calculate total tokens
    const totalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);

    // Save imported data
    await this.saveContext({
      messages,
      context: data.context,
      totalTokens,
      lastUpdated: new Date(),
    });

    console.log(
      `📥 Imported ${messages.length} messages with ${totalTokens} tokens`
    );
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    await this.db.clearAll();
  }

  /**
   * Test storage functionality
   */
  async testStorage(): Promise<boolean> {
    try {
      return await this.db.testConnection();
    } catch (error) {
      console.error("❌ Storage test failed:", error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    database: Awaited<ReturnType<DatabaseManager["getDatabaseStats"]>>;
    messages: Awaited<ReturnType<StorageManager["getMessageStats"]>>;
  }> {
    const [database, messages] = await Promise.all([
      this.db.getDatabaseStats(),
      this.getMessageStats(),
    ]);

    return { database, messages };
  }

  /**
   * Create initial context for new conversations
   */
  private createInitialContext(): ContextStorage {
    return {
      messages: [],
      context: {
        currentDate: new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        currentTime: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: "Brisbane, Australia",
      },
      totalTokens: 0,
      lastUpdated: new Date(),
    };
  }
}
