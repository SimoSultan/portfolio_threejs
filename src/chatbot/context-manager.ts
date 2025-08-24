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
  timestamp: Date;
  tokenCount: number;
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

  // Add a new message to storage with smart truncation
  public async addMessage(
    role: "user" | "assistant",
    content: string
  ): Promise<void> {
    const tokenCount = this.estimateTokenCount(content);

    // Truncate message if it's too long
    let truncatedContent = content;
    if (tokenCount > this.MAX_MESSAGE_TOKENS) {
      const maxChars = this.MAX_MESSAGE_TOKENS * 4;
      truncatedContent = content.substring(0, maxChars) + "... [truncated]";
      console.warn(
        `⚠️ Message truncated from ${tokenCount} to ${this.MAX_MESSAGE_TOKENS} tokens`
      );
    }

    const message: StoredMessage = {
      role,
      content: truncatedContent,
      timestamp: new Date(),
      tokenCount: this.estimateTokenCount(truncatedContent),
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

  // Clear old messages to free up space
  public async cleanupOldMessages(): Promise<void> {
    const stored = await this.storage.loadContext();
    if (!stored) return;

    let messages = [...stored.messages];
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
    if (!this.context) return;

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
      // Test the storage directly without going through the normal message flow
      const testData: ContextStorage = {
        messages: [
          {
            role: "assistant",
            content: "Test message for database verification",
            timestamp: new Date(),
            tokenCount: 10,
          },
        ],
        context: this.context || {
          currentDate: new Date().toLocaleDateString(),
          currentTime: new Date().toLocaleTimeString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: "Brisbane, Australia",
        },
        totalTokens: 10,
        lastUpdated: new Date(),
      };

      // Save test data directly to storage
      await this.storage.saveContext(testData);

      // Try to load it back
      const loaded = await this.storage.loadContext();
      if (loaded && loaded.messages.length > 0) {
        // Clean up test data after verification
        await this.storage.clearAll();
      }
    } catch (error) {
      console.error("Database connection test failed:", error);
    }
  }
}

// Cross-browser storage manager
class StorageManager {
  private readonly STORAGE_KEY = "portfolio_chat_context";
  private useIndexedDB: boolean = false;

  constructor() {
    this.checkStorageSupport();
  }

  private checkStorageSupport(): void {
    // Check if IndexedDB is available
    if (typeof window !== "undefined" && "indexedDB" in window) {
      this.useIndexedDB = true;
    }
  }

  async saveContext(data: ContextStorage): Promise<void> {
    if (this.useIndexedDB) {
      await this.saveToIndexedDB(data);
    } else {
      this.saveToLocalStorage(data);
    }
  }

  async loadContext(): Promise<ContextStorage | null> {
    if (this.useIndexedDB) {
      return await this.loadFromIndexedDB();
    } else {
      return this.loadFromLocalStorage();
    }
  }

  async addMessage(message: StoredMessage): Promise<void> {
    let existing = await this.loadContext();

    // If no context exists, create initial context
    if (!existing) {
      existing = {
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
      console.log("💾 Creating initial context for first message");
    }

    existing.messages.push(message);
    existing.totalTokens += message.tokenCount;
    existing.lastUpdated = new Date();

    await this.saveContext(existing);
  }

  async clearAll(): Promise<void> {
    if (this.useIndexedDB) {
      await this.clearIndexedDB();
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // IndexedDB methods
  private async saveToIndexedDB(data: ContextStorage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        reject(new Error("IndexedDB not available"));
        return;
      }

      // Force database upgrade by incrementing version
      const request = (window as any).indexedDB.open("PortfolioChat", 2);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("context")) {
          db.createObjectStore("context", { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("context")) {
          try {
            db.createObjectStore("context", { keyPath: "id" });
          } catch {
            reject(new Error("Failed to create object store"));
            return;
          }
        }

        const transaction = db.transaction(["context"], "readwrite");
        const store = transaction.objectStore("context");

        // Add an id field to the data for IndexedDB
        const dataWithId = { ...data, id: "context" };
        const saveRequest = store.put(dataWithId);
        saveRequest.onsuccess = () => resolve();
        saveRequest.onerror = () => reject(saveRequest.error);
      };
    });
  }

  private async loadFromIndexedDB(): Promise<ContextStorage | null> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        reject(new Error("IndexedDB not available"));
        return;
      }

      const request = (window as any).indexedDB.open("PortfolioChat", 2);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("context")) {
          db.createObjectStore("context", { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("context")) {
          resolve(null);
          return;
        }

        const transaction = db.transaction(["context"], "readonly");
        const store = transaction.objectStore("context");

        const getRequest = store.get("context");
        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        reject(new Error("IndexedDB not available"));
        return;
      }

      const request = (window as any).indexedDB.deleteDatabase("PortfolioChat");
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // localStorage fallback methods
  private saveToLocalStorage(data: ContextStorage): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("❌ Error saving to localStorage:", error);
    }
  }

  private loadFromLocalStorage(): ContextStorage | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      // Convert date strings back to Date objects
      data.lastUpdated = new Date(data.lastUpdated);
      data.messages.forEach((msg: any) => {
        msg.timestamp = new Date(msg.timestamp);
      });

      return data;
    } catch (error) {
      console.error("❌ Error loading from localStorage:", error);
      return null;
    }
  }
}
