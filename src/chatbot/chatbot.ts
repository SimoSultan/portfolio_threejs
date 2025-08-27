import { getOllamaEnvironment, getOllamaUrl } from "./config";
import { type ChatContext, ContextManager } from "./context";
import { SimonContextRetriever } from "./simon-context";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ModelConfig {
  name: string;
  modelId: string;
  maxLength: number;
  temperature: number;
}

export class Chatbot {
  private modelConfig: ModelConfig;
  private isGenerating = false;
  private isOllamaAvailable: boolean = false;
  private contextManager: ContextManager;
  private simonRetriever: SimonContextRetriever;

  constructor(modelConfig: ModelConfig, onContextUpdate?: () => void) {
    this.modelConfig = modelConfig;
    this.contextManager = new ContextManager(onContextUpdate);
    this.simonRetriever = new SimonContextRetriever();
  }

  async initialize(): Promise<void> {
    // Handle local fallback model
    if (this.modelConfig.modelId === "local") {
      return;
    }

    // Check if Ollama is available
    try {
      // Test Ollama connection
      const ollamaUrl = getOllamaUrl();
      const environment = getOllamaEnvironment();

      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        this.isOllamaAvailable = true;

        // Check if the model is available
        const models = await response.json();
        const modelExists = models.models?.some(
          (m: any) => m.name === this.modelConfig.modelId
        );

        if (modelExists) {
        } else {
        }
      } else {
        throw new Error(`Ollama responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Ollama not available:", error);

      this.isOllamaAvailable = false;
    }
  }

  async chat(userMessage: string): Promise<string> {
    if (this.isGenerating) {
      throw new Error("Already generating response");
    }

    // Add user message to context storage
    await this.contextManager.addMessage("user", userMessage);

    this.isGenerating = true;

    // Trigger continuous wave animation while generating response
    const animationEvent = new CustomEvent("triggerAnimation", {
      detail: {
        type: "continuousWave",
        timestamp: Date.now(),
      },
    });
    window.dispatchEvent(animationEvent);

    try {
      // Use Ollama for AI responses
      const response = await this.generateOllamaResponse(userMessage);

      // Add assistant response to context storage
      await this.contextManager.addMessage("assistant", response);

      // Clean up old messages to stay within token limits
      await this.contextManager.cleanupOldMessages();

      return response;
    } finally {
      this.isGenerating = false;

      // Stop the continuous wave animation when response is complete
      const stopAnimationEvent = new CustomEvent("stopAnimation", {
        detail: {
          timestamp: Date.now(),
        },
      });
      window.dispatchEvent(stopAnimationEvent);
    }
  }

  private async generateOllamaResponse(userMessage: string): Promise<string> {
    try {
      // Get current context and format it for the prompt
      const context = this.contextManager.formatContextForPrompt();

      // Get conversation messages for context
      let conversationMessages: any[] = [];
      try {
        conversationMessages =
          await this.contextManager.getConversationMessages();
      } catch (contextError) {
        console.error("Error getting conversation messages:", contextError);
        conversationMessages = [];
      }

      // Build a conversation history string with timestamps for date context
      const conversationHistory = conversationMessages
        .map(
          msg =>
            `${msg.role === "user" ? "User" : "Assistant"} (${msg.timestamp.toLocaleString()}): ${msg.content}`
        )
        .join("\n\n");

      const systemInstruction = this.simonRetriever.getSystemInstruction();
      const simonDomain = this.simonRetriever.buildContextText();

      const contextualizedPrompt = `${systemInstruction}\n\nSimon Context:\n${simonDomain}\n\nCurrent App Context:\n${context}\n\nConversation History:\n${conversationHistory}\n\nUser Message: ${userMessage}`;

      const ollamaUrl = getOllamaUrl();
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelConfig.modelId,
          prompt: contextualizedPrompt,
          stream: false,
          options: {
            temperature: this.modelConfig.temperature,
            num_predict: this.modelConfig.maxLength,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return `❌ Model ${this.modelConfig.modelId} not found. Please download it manually with: ollama pull ${this.modelConfig.modelId}`;
        }
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || "Sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("❌ Ollama API error:", error);
      if (error instanceof Error) {
        console.error("❌ Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      return "Sorry, I couldn't generate a response. Please make sure Ollama is running and the model is available.";
    }
  }

  async getMessages(): Promise<ChatMessage[]> {
    const storedMessages = await this.contextManager.getConversationMessages();
    return storedMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  }

  async clearHistory(): Promise<void> {
    await this.contextManager.clearAllData();
  }

  updateModelConfig(newConfig: ModelConfig): void {
    this.modelConfig = newConfig;
  }

  isReady(): boolean {
    return this.isOllamaAvailable;
  }

  getModelInfo(): ModelConfig {
    return { ...this.modelConfig };
  }

  isOllamaRunning(): boolean {
    return this.isOllamaAvailable;
  }

  getCurrentContext(): ChatContext | null {
    return this.contextManager.getContext();
  }

  // New methods for enhanced context management
  async refreshLocation(): Promise<void> {
    await this.contextManager.refreshLocation();
  }

  async getMessageHistoryWithDates(): Promise<
    Array<{
      role: string;
      content: string;
      timestamp: Date;
      dateString: string;
      timeString: string;
    }>
  > {
    return await this.contextManager.getMessageHistoryWithDates();
  }

  getDateContext(): string {
    return this.contextManager.getDateContext();
  }

  ensureContextAvailable(): void {
    this.contextManager.ensureContextAvailable();
  }

  // Token management methods
  async getTokenUsage(): Promise<{
    used: number;
    available: number;
    percentage: number;
  }> {
    return await this.contextManager.getTokenUsage();
  }

  async cleanupOldMessages(): Promise<void> {
    await this.contextManager.cleanupOldMessages();
  }
}
