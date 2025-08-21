import { Chatbot, type ChatMessage } from "./chatbot";
import { AVAILABLE_MODELS, DEFAULT_MODEL, MODEL_METADATA } from "./models";
import { getOllamaEnvironment, getOllamaUrl } from "./config";

export class ChatUI {
  private container!: HTMLDivElement;
  private chatContainer!: HTMLDivElement;
  private inputContainer!: HTMLDivElement;
  private input!: HTMLInputElement;
  private sendButton!: HTMLButtonElement;
  private animationButtonsContainer!: HTMLDivElement;
  private spinButton!: HTMLButtonElement;
  private waveButton!: HTMLButtonElement;
  private bounceButton!: HTMLButtonElement;
  private backflipButton!: HTMLButtonElement;
  private multiSpinButton!: HTMLButtonElement;
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
    // Main container - positioned absolutely over canvas, full height
    this.container = document.createElement("div");
    this.container.className =
      "absolute left-0 right-0 bg-transparent z-10 flex flex-col h-screen";
    this.container.style.top = "0";

    // Chat messages container - takes up 90% of screen height
    this.chatContainer = document.createElement("div");
    this.chatContainer.className = "overflow-y-auto p-4 space-y-3 flex-1";
    this.chatContainer.style.height = "90vh";

    // Input container - takes up 10% of screen height at the bottom
    this.inputContainer = document.createElement("div");
    this.inputContainer.className =
      "flex items-center gap-3 p-4 bg-slate-800/50 backdrop-blur-sm rounded-t-2xl shadow-lg w-full";
    this.inputContainer.style.height = "10vh";
    this.inputContainer.style.minHeight = "60px";

    // Model selector
    this.modelSelector = document.createElement("select");
    this.modelSelector.id = "model-selector";
    this.modelSelector.className =
      "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white/80 backdrop-blur-sm";
    this.populateModelSelector();

    // Status indicator
    this.statusIndicator = document.createElement("div");
    this.statusIndicator.className =
      "flex items-center gap-2 text-sm text-gray-600";
    this.updateStatus("Initializing...");

    // Input field
    this.input = document.createElement("input");
    this.input.id = "chat-input";
    this.input.type = "text";
    this.input.placeholder = "Ask me anything...";
    this.input.className =
      "flex-1 px-4 py-3 border-0 rounded-full text-sm focus:outline-none focus:ring-0 bg-transparent placeholder-gray-500";
    this.input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Animation buttons container
    this.animationButtonsContainer = document.createElement("div");
    this.animationButtonsContainer.className = "flex gap-2 mr-2";

    // Spin animation button
    this.spinButton = document.createElement("button");
    this.spinButton.innerHTML = "🌀";
    this.spinButton.className =
      "px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors";
    this.spinButton.title = "Spin Animation";
    this.spinButton.addEventListener("click", () =>
      this.triggerAnimation("spin")
    );

    // Mexican wave animation button
    this.waveButton = document.createElement("button");
    this.waveButton.innerHTML = "🌊";
    this.waveButton.className =
      "px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors";
    this.waveButton.title = "Mexican Wave Animation";
    this.waveButton.addEventListener("click", () =>
      this.triggerAnimation("wave")
    );

    // Bounce animation button
    this.bounceButton = document.createElement("button");
    this.bounceButton.innerHTML = "🦘";
    this.bounceButton.className =
      "px-3 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors";
    this.bounceButton.title = "Bounce Animation";
    this.bounceButton.addEventListener("click", () =>
      this.triggerAnimation("bounce")
    );

    // Backflip animation button
    this.backflipButton = document.createElement("button");
    this.backflipButton.innerHTML = "🤸";
    this.backflipButton.className =
      "px-3 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors";
    this.backflipButton.title = "Backflip Animation";
    this.backflipButton.addEventListener("click", () =>
      this.triggerAnimation("backflip")
    );

    // Multi-axis spin animation button
    this.multiSpinButton = document.createElement("button");
    this.multiSpinButton.innerHTML = "🎡";
    this.multiSpinButton.className =
      "px-3 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors";
    this.multiSpinButton.title = "Multi-Axis Spin Animation";
    this.multiSpinButton.addEventListener("click", () =>
      this.triggerAnimation("multiSpin")
    );

    // Add buttons to container
    this.animationButtonsContainer.appendChild(this.spinButton);
    this.animationButtonsContainer.appendChild(this.waveButton);
    this.animationButtonsContainer.appendChild(this.bounceButton);
    this.animationButtonsContainer.appendChild(this.backflipButton);
    this.animationButtonsContainer.appendChild(this.multiSpinButton);

    // Send button
    this.sendButton = document.createElement("button");
    this.sendButton.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
      </svg>
    `;
    this.sendButton.className =
      "p-2 text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
    this.sendButton.addEventListener("click", () => this.sendMessage());

    // Assemble UI
    this.inputContainer.appendChild(this.modelSelector);
    this.inputContainer.appendChild(this.statusIndicator);
    this.inputContainer.appendChild(this.input);
    this.inputContainer.appendChild(this.animationButtonsContainer);
    this.inputContainer.appendChild(this.sendButton);

    this.container.appendChild(this.chatContainer);
    this.container.appendChild(this.inputContainer);

    // Don't auto-append to body - let main.ts handle positioning

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
      console.log("🤖 ChatUI: Starting chatbot initialization...");
      await this.chatbot.initialize();
      console.log("✅ ChatUI: Chatbot initialized successfully!");
      this.updateStatus("Ready");
      this.input.disabled = false;
      this.sendButton.disabled = false;
    } catch (error) {
      console.error("❌ ChatUI: Failed to initialize chatbot:", error);
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
        : "bg-white/90 backdrop-blur-sm text-gray-800 border border-gray-200"
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
    const environment = getOllamaEnvironment();
    const ollamaUrl = getOllamaUrl();
    const isLocal = environment === "local";

    let dotColor = "bg-yellow-500";
    if (status === "Ready") {
      dotColor = "bg-green-500";
    } else if (status === "Failed to load model") {
      dotColor = "bg-red-500";
    }

    this.statusIndicator.innerHTML = `
      <div class="w-2 h-2 rounded-full ${dotColor}"></div>
      <span>${status}</span>
      ${
        status === "Ready"
          ? `<span class="text-xs opacity-60">${
              isLocal ? "localhost" : new URL(ollamaUrl).hostname
            }</span>`
          : ""
      }
    `;
  }

  public getContainer(): HTMLDivElement {
    return this.container;
  }

  public destroy(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  private triggerAnimation(animationType: string): void {
    console.log(`🎬 Triggering ${animationType} animation...`);

    // Dispatch custom event for main.ts to listen to
    const animationEvent = new CustomEvent("triggerAnimation", {
      detail: {
        type: animationType,
        timestamp: Date.now(),
      },
    });
    window.dispatchEvent(animationEvent);

    // Visual feedback on the clicked button
    const button = this.getAnimationButton(animationType);
    if (button) {
      button.classList.add("animate-pulse");
      setTimeout(() => {
        button.classList.remove("animate-pulse");
      }, 1000);
    }
  }

  private getAnimationButton(animationType: string): HTMLButtonElement | null {
    switch (animationType) {
      case "spin":
        return this.spinButton;
      case "wave":
        return this.waveButton;
      case "bounce":
        return this.bounceButton;
      case "backflip":
        return this.backflipButton;
      case "multiSpin":
        return this.multiSpinButton;
      default:
        return null;
    }
  }

  // Legacy testAnimation method removed - use triggerAnimation instead
}
