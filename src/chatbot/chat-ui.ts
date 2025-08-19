import { Chatbot, type ChatMessage } from "./chatbot";
import { AVAILABLE_MODELS, DEFAULT_MODEL, MODEL_METADATA } from "./models";

export class ChatUI {
  private container!: HTMLDivElement;
  private chatContainer!: HTMLDivElement;
  private inputContainer!: HTMLDivElement;
  private input!: HTMLInputElement;
  private sendButton!: HTMLButtonElement;
  private modelSelector!: HTMLSelectElement;
  private statusIndicator!: HTMLDivElement;
  private chatbot: Chatbot;
  private currentModelId: string;

  constructor() {
    this.currentModelId = DEFAULT_MODEL;
    this.chatbot = new Chatbot(AVAILABLE_MODELS[this.currentModelId]);
    this.createUI();
    this.initializeChatbot();
  }

  private createUI(): void {
    // Main container
    this.container = document.createElement("div");
    this.container.className =
      "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50";
    this.container.style.maxHeight = "40vh";

    // Chat messages container
    this.chatContainer = document.createElement("div");
    this.chatContainer.className = "overflow-y-auto p-4 space-y-3";
    this.chatContainer.style.maxHeight = "30vh";

    // Input container (Gemini-style)
    this.inputContainer = document.createElement("div");
    this.inputContainer.className =
      "flex items-center gap-3 p-4 bg-gray-50 border-t border-gray-200";

    // Model selector
    this.modelSelector = document.createElement("select");
    this.modelSelector.className =
      "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white";
    this.populateModelSelector();

    // Status indicator
    this.statusIndicator = document.createElement("div");
    this.statusIndicator.className =
      "flex items-center gap-2 text-sm text-gray-500";
    this.updateStatus("Initializing...");

    // Input field
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.placeholder = "Ask me anything...";
    this.input.className =
      "flex-1 px-4 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    this.input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    this.sendButton = document.createElement("button");
    this.sendButton.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
      </svg>
    `;
    this.sendButton.className =
      "p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    this.sendButton.addEventListener("click", () => this.sendMessage());

    // Assemble UI
    this.inputContainer.appendChild(this.modelSelector);
    this.inputContainer.appendChild(this.statusIndicator);
    this.inputContainer.appendChild(this.input);
    this.inputContainer.appendChild(this.sendButton);

    this.container.appendChild(this.chatContainer);
    this.container.appendChild(this.inputContainer);

    // Add to page
    document.body.appendChild(this.container);

    // Handle model changes
    this.modelSelector.addEventListener("change", (e) => {
      const newModelId = (e.target as HTMLSelectElement).value;
      this.switchModel(newModelId);
    });
  }

  private populateModelSelector(): void {
    Object.entries(MODEL_METADATA).forEach(([id, metadata]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${metadata.name} (${metadata.size})`;
      if (id === this.currentModelId) {
        option.selected = true;
      }
      this.modelSelector.appendChild(option);
    });
  }

  private async initializeChatbot(): Promise<void> {
    try {
      await this.chatbot.initialize();
      this.updateStatus("Ready");
      this.input.disabled = false;
      this.sendButton.disabled = false;
    } catch (error) {
      console.error("Failed to initialize chatbot:", error);
      this.updateStatus("Failed to load model");
      this.input.disabled = true;
      this.sendButton.disabled = true;
    }
  }

  private async switchModel(newModelId: string): Promise<void> {
    if (newModelId === this.currentModelId) return;

    this.currentModelId = newModelId;
    this.chatbot = new Chatbot(AVAILABLE_MODELS[newModelId]);

    this.updateStatus("Switching models...");
    this.input.disabled = true;
    this.sendButton.disabled = true;
    this.clearChat();

    try {
      await this.chatbot.initialize();
      this.updateStatus("Ready");
      this.input.disabled = false;
      this.sendButton.disabled = false;
    } catch (error) {
      console.error("Failed to switch model:", error);
      this.updateStatus("Failed to load model");
      this.input.disabled = true;
      this.sendButton.disabled = true;
    }
  }

  private async sendMessage(): Promise<void> {
    const message = this.input.value.trim();
    if (!message || !this.chatbot.isReady()) return;

    // Clear input
    this.input.value = "";

    // Add user message to UI
    this.addMessageToUI({
      role: "user",
      content: message,
      timestamp: new Date(),
    });

    // Disable input while generating
    this.input.disabled = true;
    this.sendButton.disabled = true;
    this.updateStatus("Generating...");

    try {
      const response = await this.chatbot.chat(message);

      // Add assistant response to UI
      this.addMessageToUI({
        role: "assistant",
        content: response,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Chat error:", error);
      this.addMessageToUI({
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      });
    } finally {
      this.input.disabled = false;
      this.sendButton.disabled = false;
      this.updateStatus("Ready");
      this.input.focus();
    }
  }

  private addMessageToUI(message: ChatMessage): void {
    const messageDiv = document.createElement("div");
    messageDiv.className = `flex ${
      message.role === "user" ? "justify-end" : "justify-start"
    }`;

    const bubble = document.createElement("div");
    bubble.className = `max-w-xs px-4 py-2 rounded-2xl text-sm ${
      message.role === "user"
        ? "bg-blue-500 text-white"
        : "bg-gray-200 text-gray-800"
    }`;
    bubble.textContent = message.content;

    messageDiv.appendChild(bubble);
    this.chatContainer.appendChild(messageDiv);

    // Scroll to bottom
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  private clearChat(): void {
    this.chatContainer.innerHTML = "";
    this.chatbot.clearHistory();
  }

  private updateStatus(status: string): void {
    this.statusIndicator.innerHTML = `
      <div class="w-2 h-2 rounded-full ${
        status === "Ready" ? "bg-green-500" : "bg-yellow-500"
      }"></div>
      <span>${status}</span>
    `;
  }

  public destroy(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
