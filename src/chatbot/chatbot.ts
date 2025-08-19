import { pipeline } from "@xenova/transformers";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ModelConfig {
  name: string;
  url: string;
  maxLength: number;
  temperature: number;
}

export class Chatbot {
  private pipeline: any = null;
  private modelConfig: ModelConfig;
  private messages: ChatMessage[] = [];
  private isGenerating = false;

  constructor(modelConfig: ModelConfig) {
    this.modelConfig = modelConfig;
  }

  async initialize(): Promise<void> {
    try {
      console.log(`Initializing ${this.modelConfig.name}...`);
      this.pipeline = await pipeline("text-generation", this.modelConfig.url, {
        quantized: true,
        progress_callback: (progress: any) => {
          console.log(`Loading: ${Math.round(progress.progress * 100)}%`);
        },
      });
      console.log(`${this.modelConfig.name} loaded successfully!`);
    } catch (error) {
      console.error("Failed to load model:", error);
      throw error;
    }
  }

  async chat(userMessage: string): Promise<string> {
    if (!this.pipeline) {
      throw new Error("Model not initialized");
    }

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
      // Generate response
      const result = await this.pipeline(userMessage, {
        max_new_tokens: this.modelConfig.maxLength,
        temperature: this.modelConfig.temperature,
        do_sample: true,
        top_p: 0.9,
        repetition_penalty: 1.1,
      });

      const response =
        result[0]?.generated_text || "Sorry, I could not generate a response.";

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
    return this.pipeline !== null;
  }

  getModelInfo(): ModelConfig {
    return { ...this.modelConfig };
  }
}
