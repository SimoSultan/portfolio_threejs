import { StorageManager } from "./storage-manager";

export interface ChatContext {
  currentDate: string;
  currentTime: string;
  timezone: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  lastLocationUpdate?: Date;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  summary?: string; // Optional summary for long messages
  timestamp: Date;
  tokenCount: number;
  isSummarized: boolean; // Flag to indicate if message was summarized
}

export interface ContextStorage {
  messages: StoredMessage[];
  context: ChatContext;
  totalTokens: number;
  lastUpdated: Date;
}

export class ContextManager {
  private context: ChatContext | null = null;
  private locationPermissionGranted: boolean = false;
  private onContextUpdateCallback?: () => void;
  private storage: StorageManager;
  private readonly MAX_TOKENS = 32000;
  private readonly RESERVE_TOKENS = 2000; // Reserve tokens for context and new messages
  private readonly MAX_MESSAGE_TOKENS = 8000; // Max tokens per individual message
  private readonly MAX_CONVERSATION_LENGTH = 50; // Max number of messages to keep
  private MESSAGE_SUMMARY_THRESHOLD = 2000; // Characters threshold for summarization
  private SUMMARY_MAX_LENGTH = 500; // Maximum length for summaries

  constructor(onContextUpdate?: () => void) {
    this.onContextUpdateCallback = onContextUpdate;
    this.storage = new StorageManager();
    this.initializeContext();

    // Test database connection on first load
    setTimeout(() => {
      this.testDatabaseConnection();
    }, 1000);
  }

  private async initializeContext(): Promise<void> {
    try {
      // Try to load existing context from storage
      const stored = await this.storage.loadContext();
      if (stored) {
        this.context = stored.context;
        console.log("📍 Context loaded from storage:", this.context);
      } else {
        // Initialize with default context
        await this.createDefaultContext();
      }

      // Try to get user location asynchronously (non-blocking)
      this.requestLocationPermission()
        .then(() => {
          if (this.locationPermissionGranted) {
            this.getCurrentLocation();
          }
        })
        .catch(() => {
          console.log("📍 Using default location");
        });
    } catch (error) {
      console.error("❌ Error initializing context:", error);
      await this.createDefaultContext();
    }
  }

  private async createDefaultContext(): Promise<void> {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    this.context = {
      currentDate: now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      currentTime: now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }),
      timezone: timezone,
      location: "Brisbane, Australia", // Default location
    };

    console.log("📍 Context initialized with default:", this.context);

    // Save to storage
    await this.saveContext();
  }

  // Token estimation using a simple heuristic (4 characters ≈ 1 token)
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Create a summary of a long message to save on storage and tokens
  private createMessageSummary(content: string): string {
    // Simple summarization: take first and last parts of the message
    if (content.length <= this.SUMMARY_MAX_LENGTH) {
      return content;
    }

    const halfLength = Math.floor(this.SUMMARY_MAX_LENGTH / 2);
    const firstPart = content.substring(0, halfLength);
    const lastPart = content.substring(content.length - halfLength);

    // Find the last complete sentence in the first part
    const lastSentenceEnd = firstPart.lastIndexOf(".");
    const firstPartClean =
      lastSentenceEnd > 0
        ? firstPart.substring(0, lastSentenceEnd + 1)
        : firstPart;

    // Find the first complete sentence in the last part
    const firstSentenceStart = lastPart.indexOf(".");
    const lastPartClean =
      firstSentenceStart > 0
        ? lastPart.substring(firstSentenceStart + 1)
        : lastPart;

    return `${firstPartClean}... [summarized] ...${lastPartClean}`;
  }

  // Check if a message should be summarized based on length
  private shouldSummarizeMessage(content: string): boolean {
    return content.length > this.MESSAGE_SUMMARY_THRESHOLD;
  }

  // Add a new message to storage with smart truncation and summarization
  public async addMessage(
    role: "user" | "assistant",
    content: string
  ): Promise<void> {
    const tokenCount = this.estimateTokenCount(content);
    let finalContent = content;
    let summary: string | undefined;
    let isSummarized = false;

    // Check if message should be summarized
    if (this.shouldSummarizeMessage(content)) {
      summary = this.createMessageSummary(content);
      finalContent = summary;
      isSummarized = true;
      console.log(
        `📝 Message summarized from ${content.length} to ${summary.length} characters`
      );
    } else if (tokenCount > this.MAX_MESSAGE_TOKENS) {
      // Fallback to truncation if summarization isn't needed but message is too long
      const maxChars = this.MAX_MESSAGE_TOKENS * 4;
      finalContent = content.substring(0, maxChars) + "... [truncated]";
      console.warn(
        `⚠️ Message truncated from ${tokenCount} to ${this.MAX_MESSAGE_TOKENS} tokens`
      );
    }

    const message: StoredMessage = {
      role,
      content: finalContent,
      summary: summary,
      timestamp: new Date(),
      tokenCount: this.estimateTokenCount(finalContent),
      isSummarized,
    };

    await this.storage.addMessage(message);
  }

  // Get messages for the current conversation, ensuring we stay within token limits
  public async getConversationMessages(): Promise<StoredMessage[]> {
    const stored = await this.storage.loadContext();
    if (!stored) return [];

    const messages = [...stored.messages];
    let totalTokens = 0;
    const conversationMessages: StoredMessage[] = [];

    // Start from the most recent messages and work backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = message.tokenCount;

      // Check if adding this message would exceed our limit
      if (totalTokens + messageTokens + this.RESERVE_TOKENS > this.MAX_TOKENS) {
        console.log(
          `⚠️ Stopping at message ${i}: would exceed ${this.MAX_TOKENS} tokens`
        );
        break;
      }

      conversationMessages.unshift(message); // Add to beginning to maintain order
      totalTokens += messageTokens;
    }

    console.log(
      `📊 Conversation: ${conversationMessages.length} messages, ${totalTokens} tokens`
    );
    return conversationMessages;
  }

  // Get the full content of a message, including original content if it was summarized
  public async getMessageFullContent(
    messageId: string
  ): Promise<string | null> {
    const stored = await this.storage.loadContext();
    if (!stored) return null;

    const message = stored.messages.find(
      msg =>
        msg.timestamp.toISOString() === messageId ||
        msg.content.substring(0, 50) === messageId.substring(0, 50)
    );

    if (!message) return null;

    // If message was summarized, return the summary (original content is not stored to save space)
    // In a real implementation, you might want to store the original content separately
    if (message.isSummarized) {
      console.log("📝 Message was summarized, returning summary content");
      return message.content; // This is the summary
    }

    return message.content;
  }

  // Get summary statistics for the conversation
  public async getSummaryStatistics(): Promise<{
    totalMessages: number;
    summarizedMessages: number;
    totalTokens: number;
    savedTokens: number;
    averageMessageLength: number;
  }> {
    const stored = await this.storage.loadContext();
    if (!stored) {
      return {
        totalMessages: 0,
        summarizedMessages: 0,
        totalTokens: 0,
        savedTokens: 0,
        averageMessageLength: 0,
      };
    }

    const messages = stored.messages;
    const summarizedMessages = messages.filter(msg => msg.isSummarized).length;
    const totalTokens = stored.totalTokens;

    // Estimate saved tokens (rough calculation)
    const savedTokens = summarizedMessages * 1000; // Rough estimate of tokens saved per summary

    const averageMessageLength =
      messages.length > 0
        ? messages.reduce((sum, msg) => sum + msg.content.length, 0) /
          messages.length
        : 0;

    return {
      totalMessages: messages.length,
      summarizedMessages,
      totalTokens,
      savedTokens,
      averageMessageLength: Math.round(averageMessageLength),
    };
  }

  // Public method to get summarization settings
  public getSummarizationSettings(): {
    threshold: number;
    maxLength: number;
    enabled: boolean;
  } {
    return {
      threshold: this.MESSAGE_SUMMARY_THRESHOLD,
      maxLength: this.SUMMARY_MAX_LENGTH,
      enabled: true,
    };
  }

  // Public method to update summarization settings
  public updateSummarizationSettings(
    threshold?: number,
    maxLength?: number
  ): void {
    if (threshold !== undefined) {
      this.MESSAGE_SUMMARY_THRESHOLD = threshold;
      console.log(
        `📝 Updated summarization threshold to ${threshold} characters`
      );
    }

    if (maxLength !== undefined) {
      this.SUMMARY_MAX_LENGTH = maxLength;
      console.log(`📝 Updated summary max length to ${maxLength} characters`);
    }
  }

  // Get comprehensive storage and message statistics
  public async getComprehensiveStats(): Promise<{
    storage: Awaited<ReturnType<StorageManager["getStorageStats"]>>;
    summarization: Awaited<ReturnType<ContextManager["getSummaryStatistics"]>>;
  }> {
    const [storage, summarization] = await Promise.all([
      this.storage.getStorageStats(),
      this.getSummaryStatistics(),
    ]);

    return { storage, summarization };
  }

  // Search messages by content
  public async searchMessages(query: string): Promise<StoredMessage[]> {
    return await this.storage.searchMessages(query);
  }

  // Get messages by role
  public async getMessagesByRole(
    role: "user" | "assistant"
  ): Promise<StoredMessage[]> {
    return await this.storage.getMessagesByRole(role);
  }

  // Get messages within a date range
  public async getMessagesByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<StoredMessage[]> {
    return await this.storage.getMessagesByDateRange(startDate, endDate);
  }

  // Advanced cleanup with multiple criteria
  public async advancedCleanup(options: {
    maxMessages?: number;
    maxTokens?: number;
    maxAge?: number; // in days
    preserveSummarized?: boolean; // keep summarized messages
  }): Promise<{
    removedMessages: number;
    removedTokens: number;
    cleanupType: string;
  }> {
    // First, run the storage manager cleanup
    const storageResult = await this.storage.cleanupOldMessages({
      maxMessages: options.maxMessages,
      maxTokens: options.maxTokens,
      maxAge: options.maxAge,
    });

    // Then run our own cleanup for summarization
    if (options.preserveSummarized !== false) {
      await this.cleanupOldMessages();
    }

    return {
      ...storageResult,
      cleanupType: "advanced",
    };
  }

  // Export conversation data
  public async exportConversation(): Promise<
    ReturnType<StorageManager["exportConversation"]>
  > {
    return await this.storage.exportConversation();
  }

  // Import conversation data
  public async importConversation(
    data: Parameters<StorageManager["importConversation"]>[0]
  ): Promise<void> {
    await this.storage.importConversation(data);

    // Reload context after import
    const stored = await this.storage.loadContext();
    if (stored) {
      this.context = stored.context;
    }
  }

  // Test method to demonstrate summarization functionality
  public async testSummarization(): Promise<void> {
    console.log("🧪 Testing message summarization system...");

    // Create a test long message
    const longMessage =
      "This is a very long message that exceeds the summarization threshold. ".repeat(
        100
      );
    console.log(`📝 Test message length: ${longMessage.length} characters`);

    // Test if it should be summarized
    const shouldSummarize = this.shouldSummarizeMessage(longMessage);
    console.log(`📝 Should summarize: ${shouldSummarize}`);

    if (shouldSummarize) {
      const summary = this.createMessageSummary(longMessage);
      console.log(`📝 Summary created: ${summary.length} characters`);
      console.log(`📝 Summary preview: ${summary.substring(0, 100)}...`);

      // Test token savings
      const originalTokens = this.estimateTokenCount(longMessage);
      const summaryTokens = this.estimateTokenCount(summary);
      const tokensSaved = originalTokens - summaryTokens;
      console.log(
        `📝 Tokens saved: ${tokensSaved} (${originalTokens} → ${summaryTokens})`
      );
    }

    // Show current settings
    const settings = this.getSummarizationSettings();
    console.log(
      `📝 Current settings: threshold=${settings.threshold}, maxLength=${settings.maxLength}`
    );
  }

  // Clear old messages to free up space
  public async cleanupOldMessages(): Promise<void> {
    const stored = await this.storage.loadContext();
    if (!stored) {
      return;
    }

    const messages = [...stored.messages];
    let totalTokens = stored.totalTokens;

    // Remove oldest messages until we're under the limit
    while (
      messages.length > 0 &&
      totalTokens > this.MAX_TOKENS - this.RESERVE_TOKENS
    ) {
      const removed = messages.shift();
      if (removed) {
        totalTokens -= removed.tokenCount;
        console.log(`🗑️ Removed old message: ${removed.tokenCount} tokens`);
      }
    }

    // Also limit conversation length
    if (messages.length > this.MAX_CONVERSATION_LENGTH) {
      const removed = messages.splice(
        0,
        messages.length - this.MAX_CONVERSATION_LENGTH
      );
      const removedTokens = removed.reduce(
        (sum, msg) => sum + msg.tokenCount,
        0
      );
      totalTokens -= removedTokens;
      console.log(
        `🗑️ Removed ${removed.length} old messages: ${removedTokens} tokens`
      );
    }

    // Update storage
    await this.storage.saveContext({
      messages,
      context: stored.context,
      totalTokens,
      lastUpdated: new Date(),
    });
  }

  // Manually trigger summarization of existing long messages
  public async summarizeExistingMessages(): Promise<{
    summarized: number;
    savedTokens: number;
  }> {
    const stored = await this.storage.loadContext();
    if (!stored) {
      return { summarized: 0, savedTokens: 0 };
    }

    let summarized = 0;
    let savedTokens = 0;
    const messages = [...stored.messages];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // Skip already summarized messages
      if (message.isSummarized) continue;

      // Check if message should be summarized
      if (this.shouldSummarizeMessage(message.content)) {
        const originalTokens = message.tokenCount;
        const summary = this.createMessageSummary(message.content);

        // Update message with summary
        messages[i] = {
          ...message,
          content: summary,
          summary: summary,
          tokenCount: this.estimateTokenCount(summary),
          isSummarized: true,
        };

        const newTokens = messages[i].tokenCount;
        const tokensSaved = originalTokens - newTokens;

        savedTokens += tokensSaved;
        summarized++;

        console.log(
          `📝 Summarized existing message: saved ${tokensSaved} tokens`
        );
      }
    }

    // Update storage with summarized messages
    if (summarized > 0) {
      const newTotalTokens = messages.reduce(
        (sum, msg) => sum + msg.tokenCount,
        0
      );

      await this.storage.saveContext({
        messages,
        context: stored.context,
        totalTokens: newTotalTokens,
        lastUpdated: new Date(),
      });

      console.log(
        `📝 Summarized ${summarized} messages, saved ${savedTokens} tokens total`
      );
    }

    return { summarized, savedTokens };
  }

  // Get current token usage
  public async getTokenUsage(): Promise<{
    used: number;
    available: number;
    percentage: number;
  }> {
    const stored = await this.storage.loadContext();
    if (!stored) {
      return {
        used: 0,
        available: this.MAX_TOKENS,
        percentage: 0,
      };
    }

    const used = stored.totalTokens;
    const available = this.MAX_TOKENS - used;
    const percentage = (used / this.MAX_TOKENS) * 100;

    return { used, available, percentage };
  }

  // Update context with current date/time
  public async updateContext(): Promise<void> {
    if (this.context) {
      const now = new Date();
      this.context.currentDate = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      this.context.currentTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });

      // Save updated context
      await this.saveContext();
    }
  }

  // Format context for prompt, including message timestamps for date context
  public formatContextForPrompt(): string {
    if (!this.context) {
      return "";
    }

    return `Current Context:
- Date: ${this.context.currentDate}
- Time: ${this.context.currentTime}
- Timezone: ${this.context.timezone}
- Location: ${this.context.location}${this.context.coordinates ? ` (${this.context.coordinates.lat}, ${this.context.coordinates.lng})` : ""}

Please consider this context when responding to the user's message.`;
  }

  // Request location permission and get user location
  private async requestLocationPermission(): Promise<void> {
    try {
      if ("geolocation" in navigator) {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });

        if (permission.state === "granted") {
          this.locationPermissionGranted = true;
          console.log("📍 Location permission already granted");
        } else if (permission.state === "prompt") {
          console.log("📍 Requesting location permission...");
          // Request permission by trying to get position
          const position = await this.getCurrentPosition();
          if (position) {
            this.locationPermissionGranted = true;
            console.log("📍 Location permission granted");
          }
        } else {
          console.log("📍 Location permission denied");
        }
      }
    } catch (error) {
      console.log("📍 Location permission check failed:", error);
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition | null> {
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        position => resolve(position),
        () => resolve(null),
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }

  private async getCurrentLocation(): Promise<void> {
    try {
      const position = await this.getCurrentPosition();
      if (position && this.context) {
        const { latitude, longitude } = position.coords;

        // Reverse geocoding to get location name
        const locationName = await this.reverseGeocode(latitude, longitude);

        this.context.coordinates = { lat: latitude, lng: longitude };
        this.context.location =
          locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        this.context.lastLocationUpdate = new Date();

        console.log("📍 Location updated:", this.context.location);

        // Save updated context
        await this.saveContext();

        // Notify UI that context has been updated
        if (this.onContextUpdateCallback) {
          this.onContextUpdateCallback();
        }
      }
    } catch (error) {
      console.error("❌ Error getting location:", error);
      console.log("📍 Using default location");
    }
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.address;

        // Build a readable location string
        const parts = [];
        if (address.city) {
          parts.push(address.city);
        } else if (address.town) {
          parts.push(address.town);
        } else if (address.village) {
          parts.push(address.village);
        }

        if (address.state) {
          parts.push(address.state);
        }
        if (address.country) {
          parts.push(address.country);
        }

        return parts.join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    } catch (error) {
      console.error("❌ Reverse geocoding failed:", error);
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  // Refresh location (can be called from UI)
  public async refreshLocation(): Promise<void> {
    try {
      console.log("📍 Refreshing location...");

      // First, try to re-request permission if not already granted
      if (!this.locationPermissionGranted) {
        await this.requestLocationPermission();
      }

      // If permission is granted (either previously or just now), get location
      if (this.locationPermissionGranted) {
        await this.getCurrentLocation();
      } else {
        // If permission is still denied, try to prompt user anyway
        console.log(
          "📍 Permission not granted, attempting to request location..."
        );
        const position = await this.getCurrentPosition();
        if (position && this.context) {
          const { latitude, longitude } = position.coords;
          const locationName = await this.reverseGeocode(latitude, longitude);

          this.context.coordinates = { lat: latitude, lng: longitude };
          this.context.location =
            locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          this.context.lastLocationUpdate = new Date();
          this.locationPermissionGranted = true;

          console.log(
            "📍 Location updated via direct request:",
            this.context.location
          );

          // Save updated context
          await this.saveContext();

          // Notify UI that context has been updated
          if (this.onContextUpdateCallback) {
            this.onContextUpdateCallback();
          }
        } else {
          console.log("📍 Location request failed, keeping default");
        }
      }
    } catch (error) {
      console.error("❌ Error refreshing location:", error);
    }
  }

  // Get message history with timestamps for date-based context
  public async getMessageHistoryWithDates(): Promise<
    Array<{
      role: string;
      content: string;
      timestamp: Date;
      dateString: string;
      timeString: string;
    }>
  > {
    const messages = await this.getConversationMessages();
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      dateString: msg.timestamp.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      timeString: msg.timestamp.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    }));
  }

  // Get context for date-based questions
  public getDateContext(): string {
    if (!this.context) return "";

    const now = new Date();
    const today = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `Today is ${today}. The current time is ${this.context.currentTime} ${this.context.timezone}.`;
  }

  public getContext(): ChatContext | null {
    return this.context;
  }

  public ensureContextAvailable(): void {
    // If context is null, initialize it immediately with default
    if (!this.context) {
      this.createDefaultContext();
    }
  }

  // Save context to storage
  private async saveContext(): Promise<void> {
    if (!this.context) {
      return;
    }

    const stored = await this.storage.loadContext();
    const messages = stored?.messages || [];
    const totalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);

    await this.storage.saveContext({
      messages,
      context: this.context,
      totalTokens,
      lastUpdated: new Date(),
    });
  }

  // Clear all stored data
  public async clearAllData(): Promise<void> {
    await this.storage.clearAll();
    this.context = null;
    await this.createDefaultContext();
  }

  // Test database connection
  private async testDatabaseConnection(): Promise<void> {
    try {
      const success = await this.storage.testStorage();
      if (success) {
        console.log("✅ Database connection test passed");
      } else {
        console.warn("⚠️ Database connection test failed");
      }
    } catch (error) {
      console.error("❌ Database connection test failed:", error);
    }
  }
}
