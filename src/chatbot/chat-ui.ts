import { type ChatMessage, Chatbot } from "./chatbot";
import { type ChatContext } from "./context";
import { AVAILABLE_MODELS, DEFAULT_MODEL, MODEL_METADATA } from "./models";

export class ChatUI {
  private container!: HTMLDivElement;
  private chatContainer!: HTMLDivElement;
  private inputContainer!: HTMLDivElement;
  private input!: HTMLInputElement;
  private sendButton!: HTMLButtonElement;
  private debugButton!: HTMLButtonElement;
  private debugDropdown!: HTMLDivElement;
  private modelSelector!: HTMLDivElement;
  private modelSelectorContainer!: HTMLDivElement;
  private statusIndicator!: HTMLDivElement;
  private tokenUsageIndicator!: HTMLDivElement;
  private contextDisplay!: HTMLDivElement;
  private modelDropdown!: HTMLDivElement;
  private contextDropdown!: HTMLDivElement;
  private isModelDropdownOpen: boolean = false;
  private isContextDropdownOpen: boolean = false;
  private isDebugDropdownOpen: boolean = false;
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
    // Initialize token usage display and load existing messages
    this.updateTokenUsageDisplay();
    this.loadExistingMessages().then(() => this.showFirstVisitFlow());
  }

  private createUI(): void {
    // Main container - positioned absolutely over canvas, full height
    this.container = document.createElement("div");
    this.container.className =
      "absolute inset-0 bg-transparent z-10 flex flex-col h-screen -full";
    this.container.style.top = "0";
    this.container.id = "chat-ui-container";

    // Chat messages container - takes up 90% of screen height
    this.chatContainer = document.createElement("div");
    this.chatContainer.className =
      "overflow-y-auto p-4 pt-50 sm:pt-4 space-y-2 md:space-y-3 flex-1 w-full";
    this.chatContainer.id = "chat-container";

    // Input container - takes up 10% of screen height at the bottom
    this.inputContainer = document.createElement("div");
    this.inputContainer.className =
      "flex flex-col justify-between items-center p-3 md:p-4 sm:gap-4 bg-white/5 backdrop-blur-md rounded-t-2xl sm:rounded-xl shadow-lg border-t border-white/10 h-[15vh] min-h-[100px] sm:mx-6 sm:mb-4";

    // Model selector - compact transparent design
    this.modelSelector = document.createElement("div");
    this.modelSelector.id = "model-selector";
    this.modelSelector.className =
      "flex items-center gap-2 cursor-pointer hover:text-gray-600 transition-colors w-[fit-content]";

    // Create the model icon
    const modelIcon = document.createElement("span");
    modelIcon.innerHTML = "🤖";
    modelIcon.className = "text-sm sm:text-base";

    // Create the model display text
    const modelText = document.createElement("span");
    modelText.id = "model-text";
    modelText.textContent = "Select Model";

    // Create the up arrow
    const arrowIcon = document.createElement("span");
    arrowIcon.innerHTML = "▲";
    arrowIcon.className =
      "transition-transform duration-200 text-xs text-gray-600";
    arrowIcon.id = "model-arrow";

    this.modelSelector.appendChild(modelIcon);
    this.modelSelector.appendChild(modelText);
    this.modelSelector.appendChild(arrowIcon);

    // Create the dropdown options container
    this.createModelDropdown();

    // Add click event to toggle dropdown
    this.modelSelector.addEventListener("click", e => {
      e.stopPropagation();
      this.toggleModelDropdown({ forceOpen: true });
    });

    // Close dropdown when clicking outside
    this.chatContainer.addEventListener("click", () => {
      this.toggleModelDropdown({ forceClose: true });

      this.toggleDebugDropdown({ forceClose: true });

      this.toggleContextDropdown({ forceClose: true });
    });

    // Status indicator
    this.statusIndicator = document.createElement("div");
    this.statusIndicator.className =
      "flex items-center gap-2 text-sm sm:text-base text-gray-400";
    this.updateStatus("Initializing...");

    // Token usage indicator
    this.tokenUsageIndicator = document.createElement("div");
    this.tokenUsageIndicator.id = "token-usage";
    this.tokenUsageIndicator.className = "text-sm sm:text-base text-gray-400";

    // Context display (created and hidden by default)
    this.createContextDisplay();
    this.contextDisplay.style.display = "none";

    // Create new chat button
    const newChatButton = document.createElement("div");
    newChatButton.className =
      "relative flex items-center gap-2 cursor-pointer hover:text-gray-600 transition-colors min-w-0 w-auto overflow-visible";
    newChatButton.id = "new-chat-button";

    const newChatSummary = document.createElement("div");
    newChatSummary.className =
      "flex items-center gap-2 truncate text-sm sm:text-base";
    newChatSummary.innerHTML = `<span>🆕 New Chat</span><span class="text-xs text-gray-600">▲</span>`;
    newChatSummary.id = "new-chat-summary";

    newChatButton.appendChild(newChatSummary);
    newChatButton.addEventListener("click", () => {
      this.showNewChatConfirmation();
    });

    // Create info button to show first-time use popup on demand
    const infoButton = document.createElement("div");
    infoButton.className =
      "relative flex items-center gap-2 cursor-pointer hover:text-gray-600 transition-colors min-w-0 w-auto overflow-visible";
    infoButton.id = "info-button";

    const infoSummary = document.createElement("div");
    infoSummary.className =
      "flex items-center gap-2 truncate text-sm sm:text-base";
    infoSummary.innerHTML = `<span>ℹ️ Context Info</span><span class="text-xs text-gray-600">▲</span>`;
    infoButton.appendChild(infoSummary);
    infoButton.addEventListener("click", () => {
      this.showAboutModal();
    });

    // Create left section container
    const leftSection = document.createElement("div");
    leftSection.className =
      "flex items-center gap-4 text-sm sm:text-base overflow-visible text-gray-400 cursor-default select-none";

    // Add left side elements (context button removed)
    leftSection.appendChild(this.modelSelector);
    leftSection.appendChild(newChatButton);
    leftSection.appendChild(infoButton);

    // Create right section container
    const rightSection = document.createElement("div");
    rightSection.className =
      "flex items-center gap-4 text-sm sm:text-base overflow-visible text-gray-400 cursor-default select-none";

    // Add right side elements
    rightSection.appendChild(this.statusIndicator);
    rightSection.appendChild(this.tokenUsageIndicator);

    this.modelSelectorContainer = document.createElement("div");
    this.modelSelectorContainer.className =
      "flex w-full flex-col-reverse sm:flex-row items-center justify-between gap-3 overflow-visible";
    this.modelSelectorContainer.id = "model-selector-container";

    // Add left and right sections
    this.modelSelectorContainer.appendChild(leftSection);
    this.modelSelectorContainer.appendChild(rightSection);

    // Input field
    this.input = document.createElement("input");
    this.input.id = "chat-input";
    this.input.type = "text";
    this.input.placeholder = "Ask me something...";
    this.input.className =
      "flex-1 px-4 py-3 rounded-full text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-white/20 bg-white/5 backdrop-blur-sm border border-white/10 placeholder-gray-300 text-white";
    this.input.addEventListener("keypress", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Create debug button
    this.debugButton = document.createElement("button");
    this.debugButton.innerHTML = "🐛";
    this.debugButton.className =
      "px-3 py-2 text-sm bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors border border-white/10 backdrop-blur-md cursor-pointer";
    this.debugButton.title = "Debug Animations";
    this.debugButton.addEventListener("click", () => {
      this.toggleDebugDropdown();
    });

    // Only show debug button in development mode (check if we're on localhost)
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      this.debugButton.style.display = "flex";
    } else {
      this.debugButton.style.display = "none";
    }

    // Create debug dropdown
    this.createDebugDropdown();

    // Send button
    this.sendButton = document.createElement("button");
    this.sendButton.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
      </svg>
    `;
    this.sendButton.className =
      "p-2 text-gray-200 hover:text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/10 backdrop-blur-md cursor-pointer";
    this.sendButton.addEventListener("click", () => {
      this.sendMessage();
    });

    // Create input row with send button
    const inputRow = document.createElement("div");
    inputRow.className = "flex items-center gap-2 w-full md:flex-1";
    inputRow.appendChild(this.input);
    inputRow.appendChild(this.sendButton);
    inputRow.appendChild(this.debugButton);

    // Assemble UI
    this.inputContainer.appendChild(this.modelSelectorContainer);
    this.inputContainer.appendChild(inputRow);

    this.container.appendChild(this.chatContainer);
    this.container.appendChild(this.inputContainer);

    // Don't auto-append to body - let main.ts handle positioning
  }

  private async initializeChatbot(): Promise<void> {
    try {
      await this.chatbot.initialize();

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
    if (newModelId === this.currentModelId) {
      return;
    }

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

    if (!message || !this.chatbot.isReady()) {
      return;
    }

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

    // Speed up infinite animation for loading
    this.triggerAnimation("speedUpInfinite");

    try {
      const response = await this.chatbot.chat(message);

      // Add assistant response to UI
      this.addMessageToUI({
        role: "assistant",
        content: response,
        timestamp: new Date(),
      });

      // Update token usage display
      await this.updateTokenUsageDisplay();
    } catch (error) {
      console.error("Chat error:", error);
      this.addMessageToUI({
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      });
    } finally {
      // Resume infinite animation at normal speed and restart it
      this.triggerAnimation("resumeInfiniteSpeed");
      this.triggerAnimation("resumeInfinite");

      this.input.disabled = false;
      this.sendButton.disabled = false;
      this.updateStatus("Ready");
      this.input.focus();
    }
  }

  private addMessageToUI(message: ChatMessage): void {
    const messageDiv = document.createElement("div");
    messageDiv.className = `flex ${message.role === "user" ? "justify-end" : "justify-start"}`;

    const bubble = document.createElement("div");
    bubble.className = `max-w-[80%] md:max-w-md px-4 py-2 rounded-2xl text-sm md:text-base ${
      message.role === "user"
        ? "bg-emerald-500/30 backdrop-blur-sm text-emerald-200 border border-emerald-400/30"
        : "bg-purple-500/10 backdrop-blur-sm text-purple-300 border border-purple-400/20 chat-message"
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
    rendered = rendered.replace(/\n\n/g, "</p><p>");
    rendered = rendered.replace(/\n/g, "<br>");

    // Wrap in paragraph tags if not already wrapped
    if (!rendered.startsWith("<p>")) {
      rendered = `<p>${rendered}</p>`;
    }

    // Handle bold text (**text**)
    rendered = rendered.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Handle italic text (*text*)
    rendered = rendered.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Handle numbered lists (1. item) with better indentation
    rendered = rendered.replace(
      /^(\d+\.\s+)(.*?)(?=\n\d+\.|$)/gm,
      "<ol><li>$2</li></ol>"
    );
    rendered = rendered.replace(/<\/ol>\n<ol>/g, "");

    // Handle bullet points (- item or * item) with better indentation
    rendered = rendered.replace(
      /^[-*]\s+(.*?)(?=\n[-*]|$)/gm,
      "<ul><li>$1</li></ul>"
    );
    rendered = rendered.replace(/<\/ul>\n<ul>/g, "");

    // Handle indented text (4+ spaces or tabs)
    rendered = rendered.replace(
      /^(\s{4,}|\t+)(.*?)(?=\n\S|$)/gm,
      '<div class="indented-text">$2</div>'
    );

    // Handle blockquotes (> text)
    rendered = rendered.replace(
      /^>\s+(.*?)(?=\n[^>]|$)/gm,
      '<blockquote class="blockquote">$1</blockquote>'
    );

    // Handle code blocks (```code```)
    rendered = rendered.replace(
      /```(.*?)```/gs,
      '<pre class="bg-gray-100 p-2 rounded text-xs overflow-x-auto"><code>$1</code></pre>'
    );

    // Handle inline code (`code`)
    rendered = rendered.replace(
      /`(.*?)`/g,
      '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>'
    );

    return rendered;
  }

  private async clearChat(): Promise<void> {
    this.chatContainer.innerHTML = "";
    await this.chatbot.clearHistory();
    await this.updateTokenUsageDisplay();
  }

  private updateStatus(status: string): void {
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

  private async updateTokenUsageDisplay(): Promise<void> {
    try {
      const tokenUsage = await this.chatbot.getTokenUsage();
      const tokenIndicator = document.getElementById("token-usage");

      if (tokenIndicator) {
        const percentage = Math.round(tokenUsage.percentage);
        const colorClass =
          percentage > 80
            ? "text-red-400"
            : percentage > 60
              ? "text-yellow-400"
              : "text-green-400";

        tokenIndicator.innerHTML = `
          <span class="text-xs ${colorClass}">
            ${tokenUsage.used.toLocaleString()}/${tokenUsage.available.toLocaleString()} tokens (${percentage}%)
          </span>
        `;
      }
    } catch (error) {
      console.error("Failed to update token usage display:", error);
    }
  }

  private async loadExistingMessages(): Promise<void> {
    try {
      const messages = await this.chatbot.getMessages();
      messages.forEach(message => {
        this.addMessageToUI(message);
      });

      // Update token usage after loading messages
      await this.updateTokenUsageDisplay();
    } catch (error) {
      console.error("Failed to load existing messages:", error);
    }
  }

  private async showFirstVisitFlow(): Promise<void> {
    try {
      const existing = await this.chatbot.getMessages();
      if (existing.length > 0) return;
      const ackKey = "simon.welcome.v1.ack";
      if (typeof window !== "undefined" && localStorage.getItem(ackKey)) {
        this.addMessageToUI({
          role: "assistant",
          content: "Ask me something about Simon’s work or projects.",
          timestamp: new Date(),
        });
        return;
      }

      const body =
        "This portfolio includes a curated view of Simon Curran’s professional experience, skills, and projects. " +
        "The chatbot answers strictly from this portfolio so you can quickly understand Simon’s work. If a question is outside of scope, you’ll get a gentle note that an answer can’t be provided.\n\n" +
        "Location context: Brisbane, Australia.\n\n" +
        "Try asking: \n- What technologies does Simon use?\n- Tell me about Simon’s recent projects.\n- What kind of roles has Simon worked in?";

      this.createInfoModal("About this site", body, "Got it", () => {
        try {
          localStorage.setItem(ackKey, "1");
        } catch {}
        this.addMessageToUI({
          role: "assistant",
          content: "Ask me something about Simon’s work or projects.",
          timestamp: new Date(),
        });
      });
    } catch {
      // no-op
    }
  }

  private createInfoModal(
    title: string,
    message: string,
    confirmText: string,
    onConfirm: () => void
  ): void {
    const existingModal = document.getElementById("confirmation-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "confirmation-modal";
    modal.className =
      "fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4";

    const modalContent = document.createElement("div");
    modalContent.className =
      "bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-600/30 max-w-md w-full p-6";

    const header = document.createElement("div");
    header.className = "flex items-center gap-3 mb-4";
    header.innerHTML = `
      <div class="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
        <span class="text-blue-300 text-lg">ℹ️</span>
      </div>
      <h3 class="text-lg font-semibold text-white">${title}</h3>
    `;

    const messageDiv = document.createElement("div");
    messageDiv.className =
      "text-gray-300 mb-6 leading-relaxed whitespace-pre-wrap";
    messageDiv.textContent = message;

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "flex gap-3 justify-end";
    const confirmButton = document.createElement("button");
    confirmButton.textContent = confirmText;
    confirmButton.className =
      "px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 transition-colors rounded-lg cursor-pointer";
    confirmButton.addEventListener("click", () => {
      onConfirm();
      modal.remove();
    });

    buttonContainer.appendChild(confirmButton);
    modalContent.appendChild(header);
    modalContent.appendChild(messageDiv);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }

  private showAboutModal(): void {
    const body =
      "This portfolio includes curated context about Simon Curran’s professional experience, skills, and projects. " +
      "You can also ask about a few personal details, request contact info, and see links. " +
      "The chatbot answers strictly from this context so you can quickly understand Simon’s work and background. If a question is outside of scope, you’ll get a gentle note that an answer can’t be provided.\n\n" +
      "Try asking: \n" +
      "- What technologies does Simon use?\n" +
      "- Tell me about Simon’s recent projects.\n" +
      "- What kind of roles has Simon worked in?\n" +
      "- What are some of Simon’s interests?\n" +
      "- How can I contact Simon?\n" +
      "- Show me Simon’s GitHub and LinkedIn.";
    this.createInfoModal("About this site", body, "Got it", () => {});
  }

  private triggerAnimation(animationType: string): void {
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

  private getAnimationButton(_animationType: string): HTMLButtonElement | null {
    // Since we no longer have individual buttons, return null
    // The animation feedback is now handled in the debug dropdown
    return null;
  }

  private createContextDisplay(): void {
    this.contextDisplay = document.createElement("div");
    this.contextDisplay.className =
      "relative flex items-center gap-2 cursor-pointer hover:text-gray-600 transition-colors min-w-0 w-auto overflow-visible";
    this.contextDisplay.id = "context-display";

    // Create context summary (inline display)
    const contextSummary = document.createElement("div");
    contextSummary.className = "flex items-center gap-2 truncate";
    contextSummary.innerHTML = `<span>📍 Context</span><span class="text-xs text-gray-600">▲</span>`;
    contextSummary.id = "context-summary";

    this.contextDisplay.appendChild(contextSummary);

    // Create the dropdown details container
    this.createContextDropdown();

    // Add click event to toggle dropdown
    this.contextDisplay.addEventListener("click", e => {
      e.stopPropagation();
      this.toggleContextDropdown();
    });

    // Initial context display
    this.updateContextDisplay();

    // Update context every 5 minutes instead of every minute for better performance
    setInterval(() => {
      this.updateContextDisplay();
    }, 300000);
  }

  private updateContextDisplay(): void {
    const contextSummary = document.getElementById("context-summary");
    if (!contextSummary) {
      return;
    }

    // Get current context
    const context = this.chatbot.getCurrentContext();

    if (context) {
      // Update inline summary
      contextSummary.innerHTML = `
        <span>📍 Context</span>
        <span class="text-xs text-gray-600">${this.isContextDropdownOpen ? "▼" : "▲"}</span>
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
        <span class="text-xs text-gray-600">${this.isContextDropdownOpen ? "▼" : "▲"}</span>
      `;
    }
  }

  private createContextDropdown(): void {
    this.contextDropdown = document.createElement("div");
    this.contextDropdown.className =
      "absolute bottom-full right-0 mb-1 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-600/30 z-50 min-w-64 p-3";
    this.contextDropdown.style.display = "none";
    this.contextDropdown.id = "context-dropdown";

    // Add refresh location button
    const refreshButton = document.createElement("button");
    refreshButton.innerHTML = "🔄";
    refreshButton.className =
      "absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-200 transition-colors";
    refreshButton.title = "Refresh Location";
    refreshButton.addEventListener("click", async e => {
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
    this.contextDisplay.style.position = "relative";
    this.contextDisplay.appendChild(this.contextDropdown);
  }

  private toggleContextDropdown({
    forceClose,
    forceOpen,
  }: { forceClose?: boolean; forceOpen?: boolean } = {}): void {
    if (forceClose) {
      this.contextDropdown.style.display = "none";
      this.isContextDropdownOpen = false;
      return;
    }

    if (forceOpen) {
      this.contextDropdown.style.display = "block";
      this.isContextDropdownOpen = true;
      return;
    }

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
      const arrow = contextSummary.querySelector("span:last-child");
      if (arrow) {
        arrow.innerHTML = isOpen ? "▼" : "▲";
      }
    }
  }

  private updateContextDropdownContent(context: ChatContext): void {
    if (!this.contextDropdown) {
      return;
    }

    // Preserve the refresh location button
    const refreshButton = this.contextDropdown.querySelector(
      ".absolute.top-2.right-2.text-xs.text-gray-400.hover\\:text-gray-200.transition-colors"
    );

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
        ${
          context.coordinates
            ? `
        <div class="flex items-center gap-2">
          <span>🌐</span>
          <span class="break-words text-blue-300">Coordinates: ${context.coordinates.lat.toFixed(4)}, ${context.coordinates.lng.toFixed(4)}</span>
        </div>
        `
            : ""
        }
      </div>
    `;

    // Re-add the refresh location button
    if (refreshButton) {
      this.contextDropdown.appendChild(refreshButton);
    }
  }

  private createModelDropdown(): void {
    this.modelDropdown = document.createElement("div");
    this.modelDropdown.className =
      "absolute bottom-full left-0 mb-1 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-600/30 z-50 min-w-48";
    this.modelDropdown.style.display = "none";

    // Populate dropdown with model options
    Object.entries(MODEL_METADATA).forEach(([id, metadata]) => {
      const option = document.createElement("div");
      option.className =
        "px-3 py-2 text-xs md:text-sm text-gray-300 hover:bg-gray-700/50 cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg";
      const isSelected = id === this.currentModelId;
      option.textContent = `${metadata.name} (${metadata.size})${isSelected ? " ✓" : ""}`;
      option.dataset.modelId = id;

      option.addEventListener("click", (e: MouseEvent) => {
        // Prevent parent modelSelector click handler from toggling the dropdown again
        e.stopPropagation();
        this.selectModel(id);
      });

      this.modelDropdown.appendChild(option);
    });

    // Position the dropdown relative to the model selector
    this.modelSelector.style.position = "relative";
    this.modelSelector.appendChild(this.modelDropdown);
  }

  private toggleModelDropdown({
    forceClose,
    forceOpen,
  }: { forceClose?: boolean; forceOpen?: boolean } = {}): void {
    if (forceClose) {
      this.modelDropdown.style.display = "none";
      this.isModelDropdownOpen = false;
      // Rotate arrow back up when force-closing
      const arrow = document.getElementById("model-arrow");
      if (arrow) {
        arrow.style.transform = "rotate(0deg)";
      }
      return;
    }

    if (forceOpen) {
      this.modelDropdown.style.display = "block";
      this.isModelDropdownOpen = true;
      this.updateModelDropdownTicks();
      return;
    }

    if (this.isModelDropdownOpen) {
      this.modelDropdown.style.display = "none";
      this.isModelDropdownOpen = false;
      // Rotate arrow back up
      const arrow = document.getElementById("model-arrow");
      if (arrow) {
        arrow.style.transform = "rotate(0deg)";
      }
    } else {
      this.modelDropdown.style.display = "block";
      this.isModelDropdownOpen = true;
      this.updateModelDropdownTicks();
      // Rotate arrow down
      const arrow = document.getElementById("model-arrow");
      if (arrow) {
        arrow.style.transform = "rotate(180deg)";
      }
    }
  }

  private selectModel(modelId: string): void {
    if (modelId === this.currentModelId) {
      return;
    }

    this.currentModelId = modelId;
    const modelText = document.getElementById("model-text");
    if (modelText) {
      modelText.textContent = "Select Model";
    }

    // Switch the model
    this.switchModel(modelId);

    // Trigger a wave animation to acknowledge model change
    this.triggerAnimation("wave");

    this.toggleModelDropdown({ forceClose: true });
    this.updateModelDropdownTicks();
  }

  private updateModelDropdownTicks(): void {
    if (!this.modelDropdown) return;
    const children = Array.from(
      this.modelDropdown.children
    ) as HTMLDivElement[];
    children.forEach(child => {
      const id = child.dataset.modelId as string | undefined;
      if (!id) return;
      const meta = MODEL_METADATA[id];
      const isSelected = id === this.currentModelId;
      child.textContent = `${meta.name} (${meta.size})${isSelected ? "  ✓" : ""}`;
    });
  }

  private createDebugDropdown(): void {
    this.debugDropdown = document.createElement("div");
    this.debugDropdown.className =
      "absolute bottom-full right-0 mb-1 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-600/30 z-[9999] min-w-48 p-3";
    this.debugDropdown.style.display = "none";
    this.debugDropdown.id = "debug-dropdown";

    // Add animation options
    const animations = [
      {
        id: "initialPageLoad",
        name: "Initial Page Load",
        icon: "🌟",
        color: "bg-yellow-500 hover:bg-yellow-600",
      },
      {
        id: "spin",
        name: "Spin Animation",
        icon: "🌀",
        color: "bg-blue-500 hover:bg-blue-600",
      },
      {
        id: "wave",
        name: "Mexican Wave",
        icon: "🌊",
        color: "bg-green-500 hover:bg-green-600",
      },
      {
        id: "bounce",
        name: "Bounce Animation",
        icon: "🦘",
        color: "bg-purple-500 hover:bg-purple-600",
      },
      {
        id: "backflip",
        name: "Frontflip Animation",
        icon: "🤸",
        color: "bg-orange-500 hover:bg-orange-600",
      },
      {
        id: "frontflip",
        name: "Backflip Animation",
        icon: "🤸‍♂️",
        color: "bg-amber-500 hover:bg-amber-600",
      },
      {
        id: "multiSpin",
        name: "Multi-Axis Spin",
        icon: "🎡",
        color: "bg-red-500 hover:bg-red-600",
      },
      {
        id: "individualBackflip",
        name: "Individual Backflip",
        icon: "🔄",
        color: "bg-indigo-500 hover:bg-indigo-600",
      },
    ];

    animations.forEach(animation => {
      const button = document.createElement("button");
      button.innerHTML = `${animation.icon} ${animation.name}`;
      button.className = `w-full px-3 py-2 text-sm text-white rounded-lg transition-colors ${animation.color} text-left mb-2`;
      button.addEventListener("click", () => {
        this.triggerAnimation(animation.id);
        this.toggleDebugDropdown({ forceClose: true });
      });
      this.debugDropdown.appendChild(button);
    });

    // Remove margin from last button
    const lastButton = this.debugDropdown.lastElementChild as HTMLElement;
    if (lastButton) {
      lastButton.classList.remove("mb-2");
    }

    // Position the dropdown relative to the debug button
    this.debugButton.style.position = "relative";
    this.debugButton.appendChild(this.debugDropdown);
  }

  private toggleDebugDropdown({
    forceClose,
    forceOpen,
  }: { forceClose?: boolean; forceOpen?: boolean } = {}): void {
    if (forceClose) {
      this.debugDropdown.style.display = "none";
      this.isDebugDropdownOpen = false;
      return;
    }

    if (forceOpen) {
      this.debugDropdown.style.display = "block";
      this.isDebugDropdownOpen = true;
      return;
    }

    if (this.isDebugDropdownOpen) {
      this.debugDropdown.style.display = "none";
      this.isDebugDropdownOpen = false;
    } else {
      this.debugDropdown.style.display = "block";
      this.isDebugDropdownOpen = true;
    }
  }

  private showNewChatConfirmation(): void {
    this.createConfirmationModal(
      "Start New Chat?",
      "This will completely reset your current conversation. All previous messages will be cleared and cannot be recovered.",
      "Start New Chat",
      "Cancel",
      () => this.startNewChat()
    );
  }

  private startNewChat(): void {
    this.clearChat();
    this.updateStatus("New chat started");
    this.input.disabled = false;
    this.sendButton.disabled = false;
    this.input.focus();
    // Celebrate new chat with a backflip animation
    this.triggerAnimation("backflip");
  }

  private createConfirmationModal(
    title: string,
    message: string,
    confirmText: string,
    cancelText: string,
    onConfirm: () => void
  ): void {
    // Remove existing modal if present
    const existingModal = document.getElementById("confirmation-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal container
    const modal = document.createElement("div");
    modal.id = "confirmation-modal";
    modal.className =
      "fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4";

    // Create modal content
    const modalContent = document.createElement("div");
    modalContent.className =
      "bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-600/30 max-w-md w-full p-6";

    // Modal header
    const header = document.createElement("div");
    header.className = "flex items-center gap-3 mb-4";
    header.innerHTML = `
      <div class="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
        <span class="text-red-400 text-lg">⚠️</span>
      </div>
      <h3 class="text-lg font-semibold text-white">${title}</h3>
    `;

    // Modal message
    const messageDiv = document.createElement("div");
    messageDiv.className = "text-gray-300 mb-6 leading-relaxed";
    messageDiv.textContent = message;

    // Modal buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "flex gap-3 justify-end";

    const cancelButton = document.createElement("button");
    cancelButton.textContent = cancelText;
    cancelButton.className =
      "px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors border border-gray-600/30 rounded-lg hover:border-gray-500/50 cursor-pointer";

    const confirmButton = document.createElement("button");
    confirmButton.textContent = confirmText;
    confirmButton.className =
      "px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 transition-colors rounded-lg cursor-pointer";

    // Event listeners
    cancelButton.addEventListener("click", () => modal.remove());
    confirmButton.addEventListener("click", () => {
      onConfirm();
      modal.remove();
    });

    // Assemble modal
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    modalContent.appendChild(header);
    modalContent.appendChild(messageDiv);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);

    // Add to body
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener("click", e => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        modal.remove();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  }
}
