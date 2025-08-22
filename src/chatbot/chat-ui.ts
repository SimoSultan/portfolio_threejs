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
  private individualBackflipButton!: HTMLButtonElement;
  private modelSelector!: HTMLDivElement;
  private modelSelectorContainer!: HTMLDivElement;
  private statusIndicator!: HTMLDivElement;
  private contextDisplay!: HTMLDivElement;
  private modelDropdown!: HTMLDivElement;
  private contextDropdown!: HTMLDivElement;
  private isDropdownOpen: boolean = false;
  private isContextDropdownOpen: boolean = false;
  private chatbot: Chatbot;
  private currentModelId: string;

  constructor() {
    this.currentModelId = DEFAULT_MODEL;
    this.chatbot = new Chatbot(
      AVAILABLE_MODELS[this.currentModelId],
      () => this.updateContextDisplay() // Callback to update UI when context changes
    );
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
    this.chatContainer.className = "overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 flex-1 h-[80vh] md:h-[90vh]";

    // Input container - takes up 10% of screen height at the bottom
    this.inputContainer = document.createElement("div");
    this.inputContainer.className =
      "flex flex-col md:flex-row items-center gap-2 md:gap-3 p-3 md:p-4 bg-gray-800/20 backdrop-blur-sm rounded-t-2xl shadow-lg w-full md:w-auto border-t border-gray-600/30 h-[20vh] md:h-[10vh]";
    this.inputContainer.style.minHeight = "60px";

    // Model selector - compact transparent design
    this.modelSelector = document.createElement("div");
    this.modelSelector.id = "model-selector";
    this.modelSelector.className = "flex items-center gap-2 text-xs md:text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors";
    
    // Create the model display text
    const modelText = document.createElement("span");
    modelText.id = "model-text";
    modelText.textContent = MODEL_METADATA[this.currentModelId].name;
    
    // Create the up arrow
    const arrowIcon = document.createElement("span");
    arrowIcon.innerHTML = "▲";
    arrowIcon.className = "text-xs transition-transform duration-200";
    arrowIcon.id = "model-arrow";
    
    this.modelSelector.appendChild(modelText);
    this.modelSelector.appendChild(arrowIcon);
    
    // Create the dropdown options container
    this.createModelDropdown();
    
    // Add click event to toggle dropdown
    this.modelSelector.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleModelDropdown();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
      if (this.isDropdownOpen) {
        this.toggleModelDropdown();
      }
    });

    // Status indicator
    this.statusIndicator = document.createElement("div");
    this.statusIndicator.className =
      "flex items-center gap-2 text-xs md:text-sm text-gray-600";
    this.updateStatus("Initializing...");

    // Context display
    this.createContextDisplay();

    this.modelSelectorContainer = document.createElement("div");
    this.modelSelectorContainer.className = "flex w-full md:w-auto items-center gap-4";
    this.modelSelectorContainer.id = "model-selector-container";
    
    // Model selector and status
    this.modelSelectorContainer.appendChild(this.modelSelector);
    this.modelSelectorContainer.appendChild(this.statusIndicator);
    
    // Context display gets the remaining space
    this.modelSelectorContainer.appendChild(this.contextDisplay);

    // Input field
    this.input = document.createElement("input");
    this.input.id = "chat-input";
    this.input.type = "text";
    this.input.placeholder = "Ask me anything...";
    this.input.className =
      "flex-1 px-4 py-3 border-0 rounded-full text-sm md:text-base focus:outline-none focus:ring-0 bg-transparent placeholder-gray-500";
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

    // Individual tube backflip animation button
    this.individualBackflipButton = document.createElement("button");
    this.individualBackflipButton.innerHTML = "🔄";
    this.individualBackflipButton.className =
      "px-3 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors";
    this.individualBackflipButton.title = "Individual Tube Backflip Animation";
    this.individualBackflipButton.addEventListener("click", () =>
      this.triggerAnimation("individualBackflip")
    );

    // Add buttons to container
    this.animationButtonsContainer.appendChild(this.spinButton);
    this.animationButtonsContainer.appendChild(this.waveButton);
    this.animationButtonsContainer.appendChild(this.bounceButton);
    this.animationButtonsContainer.appendChild(this.backflipButton);
    this.animationButtonsContainer.appendChild(this.multiSpinButton);
    this.animationButtonsContainer.appendChild(this.individualBackflipButton);

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
    this.inputContainer.appendChild(this.modelSelectorContainer);
    this.inputContainer.appendChild(this.input);
    this.inputContainer.appendChild(this.animationButtonsContainer);
    this.inputContainer.appendChild(this.sendButton);

    this.container.appendChild(this.chatContainer);
    this.container.appendChild(this.inputContainer);

    // Don't auto-append to body - let main.ts handle positioning
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
    this.chatbot = new Chatbot(
      AVAILABLE_MODELS[newModelId],
      () => this.updateContextDisplay() // Callback to update UI when context changes
    );

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

    // Trigger wave animation for loading
    this.triggerAnimation("loadingWave");

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
      // Stop the wave animation - infinite animation will resume automatically
      window.dispatchEvent(new CustomEvent("stopAnimation"));
      
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
    bubble.className = `max-w-[80%] md:max-w-md px-4 py-2 rounded-2xl text-sm md:text-base ${
      message.role === "user"
        ? "bg-blue-500/20 backdrop-blur-sm text-gray-300 border border-blue-400/30"
        : "bg-blue-500/10 backdrop-blur-sm text-gray-300 border border-blue-400/20 chat-message"
    }`;
    
    // For AI messages, render markdown; for user messages, use plain text
    if (message.role === "assistant") {
      bubble.innerHTML = this.renderMarkdown(message.content);
    } else {
      bubble.textContent = message.content;
    }

    messageDiv.appendChild(bubble);
    this.chatContainer.appendChild(messageDiv);

    // Scroll to bottom
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  private renderMarkdown(content: string): string {
    let rendered = content;

    // Handle line breaks and paragraphs
    rendered = rendered.replace(/\n\n/g, '</p><p>');
    rendered = rendered.replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags if not already wrapped
    if (!rendered.startsWith('<p>')) {
      rendered = `<p>${rendered}</p>`;
    }

    // Handle bold text (**text**)
    rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text (*text*)
    rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle numbered lists (1. item) with better indentation
    rendered = rendered.replace(/^(\d+\.\s+)(.*?)(?=\n\d+\.|$)/gm, '<ol><li>$2</li></ol>');
    rendered = rendered.replace(/<\/ol>\n<ol>/g, '');
    
    // Handle bullet points (- item or * item) with better indentation
    rendered = rendered.replace(/^[-*]\s+(.*?)(?=\n[-*]|$)/gm, '<ul><li>$1</li></ul>');
    rendered = rendered.replace(/<\/ul>\n<ul>/g, '');
    
    // Handle indented text (4+ spaces or tabs)
    rendered = rendered.replace(/^(\s{4,}|\t+)(.*?)(?=\n\S|$)/gm, '<div class="indented-text">$2</div>');
    
    // Handle blockquotes (> text)
    rendered = rendered.replace(/^>\s+(.*?)(?=\n[^>]|$)/gm, '<blockquote class="blockquote">$1</blockquote>');
    
    // Handle code blocks (```code```)
    rendered = rendered.replace(/```(.*?)```/gs, '<pre class="bg-gray-100 p-2 rounded text-xs overflow-x-auto"><code>$1</code></pre>');
    
    // Handle inline code (`code`)
    rendered = rendered.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>');

    return rendered;
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
      case "individualBackflip":
        return this.individualBackflipButton;
      default:
        return null;
    }
  }

  private createContextDisplay(): void {
    this.contextDisplay = document.createElement("div");
    this.contextDisplay.className = "relative flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-gray-800 transition-colors flex-1 min-w-0 w-auto";
    this.contextDisplay.id = "context-display";
    
    // Create context summary (inline display)
    const contextSummary = document.createElement("div");
    contextSummary.className = "flex items-center gap-2 truncate";
    contextSummary.innerHTML = `<span>📍 Context</span><span class="text-gray-500">Loading...</span><span class="text-xs text-gray-600">▲</span>`;
    contextSummary.id = "context-summary";
    
    this.contextDisplay.appendChild(contextSummary);
    
    // Create the dropdown details container
    this.createContextDropdown();
    
    // Add click event to toggle dropdown
    this.contextDisplay.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleContextDropdown();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
      if (this.isContextDropdownOpen) {
        this.toggleContextDropdown();
      }
    });
    
    // Initial context display
    this.updateContextDisplay();
    
    // Update context every minute
    setInterval(() => {
      this.updateContextDisplay();
    }, 60000);
  }

  private updateContextDisplay(): void {
    const contextSummary = document.getElementById("context-summary");
    if (!contextSummary) return;
    
    // Ensure context is available
    this.chatbot.ensureContextAvailable();
    const context = this.chatbot.getCurrentContext();
    
    if (context) {
      // Update inline summary
      contextSummary.innerHTML = `
        <span>📍 Context</span>
        <span class="text-gray-500 truncate">${context.location}</span>
        <span class="text-xs text-gray-600">${this.isContextDropdownOpen ? '▼' : '▲'}</span>
      `;
      
      // Update dropdown content if it exists and is open
      if (this.isContextDropdownOpen) {
        this.updateContextDropdownContent(context);
      }
    } else {
      // Update inline summary with loading state
      contextSummary.innerHTML = `
        <span>📍 Context</span>
        <span class="text-gray-500">Loading...</span>
        <span class="text-xs text-gray-600">${this.isContextDropdownOpen ? '▼' : '▲'}</span>
      `;
    }
    
    console.log('📍 Context display updated:', context);
  }

  private createContextDropdown(): void {
    this.contextDropdown = document.createElement("div");
    this.contextDropdown.className = "absolute bottom-full left-0 mb-1 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-600/30 z-50 min-w-64 p-3";
    this.contextDropdown.style.display = "none";
    this.contextDropdown.id = "context-dropdown";
    
    // Add refresh location button
    const refreshButton = document.createElement("button");
    refreshButton.innerHTML = "🔄";
    refreshButton.className = "absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-200 transition-colors";
    refreshButton.title = "Refresh Location";
    refreshButton.addEventListener("click", async (e) => {
      e.stopPropagation();
      refreshButton.innerHTML = "⏳";
      refreshButton.disabled = true;
      try {
        await this.chatbot.refreshLocation();
        this.updateContextDisplay();
      } catch (error) {
        console.error("Failed to refresh location:", error);
      } finally {
        refreshButton.innerHTML = "🔄";
        refreshButton.disabled = false;
      }
    });
    
    this.contextDropdown.appendChild(refreshButton);
    
    // Position the dropdown relative to the context display
    this.contextDisplay.appendChild(this.contextDropdown);
  }

  private toggleContextDropdown(): void {
    if (this.isContextDropdownOpen) {
      this.contextDropdown.style.display = "none";
      this.isContextDropdownOpen = false;
      // Rotate arrow back up
      this.updateContextArrow(false);
    } else {
      this.contextDropdown.style.display = "block";
      this.isContextDropdownOpen = true;
      // Rotate arrow down
      this.updateContextArrow(true);
    }
  }

  private updateContextArrow(isOpen: boolean): void {
    const contextSummary = document.getElementById("context-summary");
    if (contextSummary) {
      const arrow = contextSummary.querySelector('span:last-child');
      if (arrow) {
        arrow.innerHTML = isOpen ? "▼" : "▲";
      }
    }
  }

  private updateContextDropdownContent(context: any): void {
    if (!this.contextDropdown) return;
    
    // Find the refresh button to preserve it
    const refreshButton = this.contextDropdown.querySelector('button');
    
    this.contextDropdown.innerHTML = `
      <div class="font-semibold text-gray-400 mb-2">📍 Context Details</div>
      <div class="text-xs space-y-2 text-gray-300">
        <div class="flex items-center gap-2">
          <span>📅</span>
          <span>${context.currentDate}</span>
        </div>
        <div class="flex items-center gap-2">
          <span>🕐</span>
          <span>${context.currentTime}</span>
        </div>
        <div class="flex items-center gap-2">
          <span>🌍</span>
          <span>${context.timezone}</span>
        </div>
        <div class="flex items-center gap-2">
          <span>📍</span>
          <span class="break-words">${context.location}</span>
        </div>
      </div>
    `;
    
    // Re-add the refresh button
    if (refreshButton) {
      this.contextDropdown.appendChild(refreshButton);
    }
  }

  private createModelDropdown(): void {
    this.modelDropdown = document.createElement("div");
    this.modelDropdown.className = "absolute bottom-full left-0 mb-1 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-600/30 z-50 min-w-48";
    this.modelDropdown.style.display = "none";
    
    // Populate dropdown with model options
    Object.entries(MODEL_METADATA).forEach(([id, metadata]) => {
      const option = document.createElement("div");
      option.className = "px-3 py-2 text-xs md:text-sm text-gray-300 hover:bg-gray-700/50 cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg";
      option.textContent = `${metadata.name} (${metadata.size})`;
      option.dataset.modelId = id;
      
      option.addEventListener("click", () => {
        this.selectModel(id);
        this.toggleModelDropdown();
      });
      
      this.modelDropdown.appendChild(option);
    });
    
    // Position the dropdown relative to the model selector
    this.modelSelector.style.position = "relative";
    this.modelSelector.appendChild(this.modelDropdown);
  }

  private toggleModelDropdown(): void {
    if (this.isDropdownOpen) {
      this.modelDropdown.style.display = "none";
      this.isDropdownOpen = false;
      // Rotate arrow back up
      const arrow = document.getElementById("model-arrow");
      if (arrow) arrow.style.transform = "rotate(0deg)";
    } else {
      this.modelDropdown.style.display = "block";
      this.isDropdownOpen = true;
      // Rotate arrow down
      const arrow = document.getElementById("model-arrow");
      if (arrow) arrow.style.transform = "rotate(180deg)";
    }
  }

  private selectModel(modelId: string): void {
    if (modelId === this.currentModelId) return;
    
    this.currentModelId = modelId;
    const modelText = document.getElementById("model-text");
    if (modelText) {
      modelText.textContent = MODEL_METADATA[modelId].name;
    }
    
    // Switch the model
    this.switchModel(modelId);
  }
}