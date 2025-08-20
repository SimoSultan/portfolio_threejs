import { getOllamaUrl, getOllamaEnvironment } from "./config";

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

  constructor(modelConfig: ModelConfig) {
    this.modelConfig = modelConfig;
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

    try {
      // Handle local fallback model
      if (this.modelConfig.modelId === "local" || !this.isOllamaAvailable) {
        const response = this.generateLocalResponse(userMessage);

        // Add assistant response to history
        this.messages.push({
          role: "assistant",
          content: response,
          timestamp: new Date(),
        });

        return response;
      }

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
    }
  }

  private async generateOllamaResponse(userMessage: string): Promise<string> {
    try {
      console.log(
        `🤖 Generating response with Ollama model: ${this.modelConfig.modelId}`
      );

      const ollamaUrl = getOllamaUrl();
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelConfig.modelId,
          prompt: userMessage,
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
      console.log("🔄 Falling back to local response");
      return this.generateLocalResponse(userMessage);
    }
  }

  private generateLocalResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();

    // Simple response patterns
    if (message.includes("hello") || message.includes("hi")) {
      return "Hello! I'm a local fallback chatbot. I can provide basic responses while we work on getting Ollama set up properly.";
    }

    if (message.includes("how are you")) {
      return "I'm functioning well as a local chatbot! We're setting up Ollama for better AI responses, but I'm here to help with basic responses.";
    }

    if (message.includes("what can you do")) {
      return "Right now I'm running locally without external AI. I can provide basic responses and help you test the chat interface. We're setting up Ollama for full AI capabilities!";
    }

    if (message.includes("help")) {
      return "I'm a local fallback chatbot. You can ask me basic questions, and I'll respond with simple, helpful answers. Full AI capabilities are coming soon with Ollama!";
    }

    if (message.includes("ollama")) {
      return "Ollama is a local AI model runner that will give us much better responses! It runs models on your machine instead of in the browser.";
    }

    // Default response
    return "Thanks for your message! I'm currently running as a local fallback chatbot while we set up Ollama for better AI responses.";
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
    return true; // Always ready since we have fallback
  }

  getModelInfo(): ModelConfig {
    return { ...this.modelConfig };
  }

  isOllamaRunning(): boolean {
    return this.isOllamaAvailable;
  }
}
