import { getOllamaEnvironment, getOllamaUrl } from "./config";
import { type ChatContext, ContextManager } from "./context-manager";

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
  private messages: ChatMessage[] = [];
  private isGenerating = false;
  private isOllamaAvailable: boolean = false;
  private contextManager: ContextManager;

  constructor(modelConfig: ModelConfig, onContextUpdate?: () => void) {
    this.modelConfig = modelConfig;
    this.contextManager = new ContextManager(onContextUpdate);
  }

  async initialize(): Promise<void> {
    // Handle local fallback model
    if (this.modelConfig.modelId === "local") {
      console.log(
        "🏠 Using local fallback model - no external loading required"
      );
      return;
    }

    // Check if Ollama is available
    try {
      console.log(
        `🚀 Checking Ollama availability for: ${this.modelConfig.name}`
      );
      console.log(`🔧 Model ID: ${this.modelConfig.modelId}`);

      // Test Ollama connection
      const ollamaUrl = getOllamaUrl();
      const environment = getOllamaEnvironment();

      console.log(
        `🌐 Using Ollama server: ${ollamaUrl} (${environment} environment)`
      );

      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        this.isOllamaAvailable = true;
        console.log("✅ Ollama is running and accessible");

        // Check if the model is available
        const models = await response.json();
        const modelExists = models.models?.some(
          (m: any) => m.name === this.modelConfig.modelId
        );

        if (modelExists) {
          console.log(`✅ Model ${this.modelConfig.modelId} is available`);
        } else {
          console.log(
            `❌ Model ${this.modelConfig.modelId} not found. Please download it manually with: ollama pull ${this.modelConfig.modelId}`
          );
        }
      } else {
        throw new Error(`Ollama responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Ollama not available:", error);
      console.log("🔄 Falling back to local responses");
      this.isOllamaAvailable = false;
    }
  }

  async chat(userMessage: string): Promise<string> {
    if (this.isGenerating) {
      throw new Error("Already generating response");
    }

    // Add user message to history
    this.messages.push({
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

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

      // Add assistant response to history
      this.messages.push({
        role: "assistant",
        content: response,
        timestamp: new Date(),
      });

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
      console.log(
        `🤖 Generating response with Ollama model: ${this.modelConfig.modelId}`
      );

      // Get current context and format it for the prompt
      const context = this.contextManager.formatContextForPrompt();
      const contextualizedPrompt = `${context}\n\nUser Message: ${userMessage}`;

      console.log("📍 Sending contextualized prompt:", contextualizedPrompt);

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
      return "Sorry, I couldn't generate a response. Please make sure Ollama is running and the model is available.";
    }
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  clearHistory(): void {
    this.messages = [];
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

  async refreshLocation(): Promise<void> {
    await this.contextManager.refreshLocation();
  }

  ensureContextAvailable(): void {
    this.contextManager.ensureContextAvailable();
  }
}
