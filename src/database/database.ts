import { ContextStorage } from "../chatbot/context";

/**
 * Database Manager - Handles raw database operations
 * Supports IndexedDB with localStorage fallback
 */
export class DatabaseManager {
  private readonly DB_NAME = "PortfolioChat";
  private readonly DB_VERSION = 4; // Increment for schema changes
  private readonly STORAGE_KEY = "portfolio_chat_context";
  private useIndexedDB: boolean = false;

  constructor() {
    this.checkStorageSupport();
  }

  /**
   * Check if IndexedDB is available and preferred
   */
  private checkStorageSupport(): void {
    if (typeof window !== "undefined" && "indexedDB" in window) {
      this.useIndexedDB = true;
    } else {
    }
  }

  /**
   * Save context data to storage
   */
  async saveContext(data: ContextStorage): Promise<void> {
    console.log("💾 Saving context to storage:", {
      useIndexedDB: this.useIndexedDB,
      messageCount: data.messages.length,
      totalTokens: data.totalTokens,
      lastUpdated: data.lastUpdated,
    });

    if (this.useIndexedDB) {
      await this.saveToIndexedDB(data);
    } else {
      this.saveToLocalStorage(data);
    }
  }

  /**
   * Load context data from storage
   */
  async loadContext(): Promise<ContextStorage | null> {
    console.log(
      "📂 Loading context from storage, useIndexedDB:",
      this.useIndexedDB
    );

    let result;
    if (this.useIndexedDB) {
      result = await this.loadFromIndexedDB();
    } else {
      result = this.loadFromLocalStorage();
    }

    console.log("📂 Loaded context result:", {
      hasData: !!result,
      messageCount: result?.messages?.length || 0,
      totalTokens: result?.totalTokens || 0,
      lastUpdated: result?.lastUpdated || null,
    });

    return result;
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    if (this.useIndexedDB) {
      await this.clearIndexedDB();
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Test database connection and functionality
   */
  async testConnection(): Promise<boolean> {
    try {
      if (this.useIndexedDB) {
        return await this.testIndexedDBConnection();
      } else {
        return this.testLocalStorageConnection();
      }
    } catch (error) {
      console.error("❌ Database connection test failed:", error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    type: "IndexedDB" | "localStorage";
    version: number;
    size: number;
    lastUpdated: Date | null;
  }> {
    try {
      const context = await this.loadContext();
      const lastUpdated = context?.lastUpdated || null;

      let size = 0;
      if (this.useIndexedDB) {
        size = await this.getIndexedDBSize();
      } else {
        size = this.getLocalStorageSize();
      }

      return {
        type: this.useIndexedDB ? "IndexedDB" : "localStorage",
        version: this.DB_VERSION,
        size,
        lastUpdated,
      };
    } catch (error) {
      console.error("❌ Error getting database stats:", error);
      return {
        type: this.useIndexedDB ? "IndexedDB" : "localStorage",
        version: this.DB_VERSION,
        size: 0,
        lastUpdated: null,
      };
    }
  }

  // IndexedDB Methods

  /**
   * Save data to IndexedDB
   */
  private async saveToIndexedDB(data: ContextStorage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        reject(new Error("IndexedDB not available"));
        return;
      }

      const request = (window as any).indexedDB.open(
        this.DB_NAME,
        this.DB_VERSION
      );

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        console.log(
          "🔄 IndexedDB upgrade needed - version:",
          event.oldVersion,
          "->",
          event.newVersion
        );

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains("context")) {
          console.log("📁 Creating context object store");
          const contextStore = db.createObjectStore("context", {
            keyPath: "id",
          });
          contextStore.createIndex("lastUpdated", "lastUpdated", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains("messages")) {
          console.log("📁 Creating messages object store");
          const messageStore = db.createObjectStore("messages", {
            keyPath: "id",
            autoIncrement: true,
          });
          messageStore.createIndex("timestamp", "timestamp", { unique: false });
          messageStore.createIndex("role", "role", { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        const transaction = db.transaction(["context"], "readwrite");
        const store = transaction.objectStore("context");

        // Add an id field to the data for IndexedDB
        const dataWithId = { ...data, id: "context" };
        console.log("💾 Saving to IndexedDB:", dataWithId);

        const saveRequest = store.put(dataWithId);

        saveRequest.onsuccess = () => {
          console.log("✅ Successfully saved to IndexedDB");
          resolve();
        };
        saveRequest.onerror = () => {
          console.error("❌ Failed to save to IndexedDB:", saveRequest.error);
          reject(saveRequest.error);
        };
      };
    });
  }

  /**
   * Load data from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<ContextStorage | null> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        reject(new Error("IndexedDB not available"));
        return;
      }

      const request = (window as any).indexedDB.open(
        this.DB_NAME,
        this.DB_VERSION
      );

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        console.log(
          "🔄 IndexedDB upgrade needed during load - version:",
          event.oldVersion,
          "->",
          event.newVersion
        );

        // Create object stores if they don't exist (same schema as save)
        if (!db.objectStoreNames.contains("context")) {
          console.log("📁 Creating context object store during load");
          const contextStore = db.createObjectStore("context", {
            keyPath: "id",
          });
          contextStore.createIndex("lastUpdated", "lastUpdated", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains("messages")) {
          console.log("📁 Creating messages object store during load");
          const messageStore = db.createObjectStore("messages", {
            keyPath: "id",
            autoIncrement: true,
          });
          messageStore.createIndex("timestamp", "timestamp", { unique: false });
          messageStore.createIndex("role", "role", { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        const transaction = db.transaction(["context"], "readonly");
        const store = transaction.objectStore("context");

        const getRequest = store.get("context");
        getRequest.onsuccess = () => {
          console.log("📂 Retrieved from IndexedDB:", getRequest.result);
          resolve(getRequest.result || null);
        };
        getRequest.onerror = () => {
          console.error(
            "❌ Failed to retrieve from IndexedDB:",
            getRequest.error
          );
          reject(getRequest.error);
        };
      };
    });
  }

  /**
   * Clear IndexedDB database
   */
  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        reject(new Error("IndexedDB not available"));
        return;
      }

      const request = (window as any).indexedDB.deleteDatabase(this.DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Test IndexedDB connection
   */
  private async testIndexedDBConnection(): Promise<boolean> {
    try {
      const testData: ContextStorage = {
        messages: [
          {
            role: "assistant",
            content: "Test message for database verification",
            timestamp: new Date(),
            tokenCount: 10,
            isSummarized: false,
          },
        ],
        context: {
          currentDate: new Date().toLocaleDateString(),
          currentTime: new Date().toLocaleTimeString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: "Brisbane, Australia",
        },
        totalTokens: 10,
        lastUpdated: new Date(),
      };

      await this.saveToIndexedDB(testData);
      const loaded = await this.loadFromIndexedDB();

      if (loaded && loaded.messages.length > 0) {
        await this.clearIndexedDB();
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ IndexedDB connection test failed:", error);
      return false;
    }
  }

  /**
   * Get IndexedDB size estimate
   */
  private async getIndexedDBSize(): Promise<number> {
    try {
      const context = await this.loadFromIndexedDB();
      if (!context) return 0;

      // Rough size estimation
      const dataString = JSON.stringify(context);
      return new Blob([dataString]).size;
    } catch {
      return 0;
    }
  }

  // localStorage Methods

  /**
   * Save data to localStorage
   */
  private saveToLocalStorage(data: ContextStorage): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("❌ Error saving to localStorage:", error);
    }
  }

  /**
   * Load data from localStorage
   */
  private loadFromLocalStorage(): ContextStorage | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);

      // Convert date strings back to Date objects
      data.lastUpdated = new Date(data.lastUpdated);
      if (data.messages) {
        data.messages.forEach((msg: any) => {
          msg.timestamp = new Date(msg.timestamp);
        });
      }

      return data;
    } catch (error) {
      console.error("❌ Error loading from localStorage:", error);
      return null;
    }
  }

  /**
   * Test localStorage connection
   */
  private testLocalStorageConnection(): boolean {
    try {
      const testData = { test: "data" };
      localStorage.setItem("test_key", JSON.stringify(testData));
      const loaded = localStorage.getItem("test_key");
      localStorage.removeItem("test_key");

      return loaded === JSON.stringify(testData);
    } catch {
      return false;
    }
  }

  /**
   * Get localStorage size estimate
   */
  private getLocalStorageSize(): number {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return 0;

      return new Blob([data]).size;
    } catch {
      return 0;
    }
  }
}
