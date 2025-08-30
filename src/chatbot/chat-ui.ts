import { checkServerHealth, generate } from "../api";
import { ContextManager, type StoredMessage } from "./context";

export class ChatUI {
  private container!: HTMLDivElement;
  private chatContainer!: HTMLDivElement;
  private inputContainer!: HTMLDivElement;
  private input!: HTMLInputElement;
  private sendButton!: HTMLButtonElement;
  private debugButton!: HTMLButtonElement;
  private debugDropdown!: HTMLDivElement;
  private statusIndicator!: HTMLDivElement;
  private contextDisplay!: HTMLDivElement;
  private contextDropdown!: HTMLDivElement;
  private isContextDropdownOpen: boolean = false;
  private isDebugDropdownOpen: boolean = false;
  private infoContainer!: HTMLDivElement;
  private contextManager: ContextManager;

  constructor() {
    this.contextManager = new ContextManager();
    this.createUI();
    this.loadExistingConversation();
  }

  // Helper function to create a proper StoredMessage object
  private createMessage(
    role: "user" | "assistant",
    content: string
  ): StoredMessage {
    return {
      role,
      content,
      timestamp: new Date(),
      tokenCount: Math.ceil(content.length / 4), // Simple token estimation
      isSummarized: false,
    };
  }

  private createUI(): void {
    // Main container - positioned absolutely over canvas, full height
    this.container = document.createElement("div");
    this.container.className =
      "absolute inset-0 bg-transparent z-10 flex flex-col h-screen h-dvh w-full";
    this.container.style.top = "0";
    this.container.id = "chat-ui-container";

    // Chat messages container - takes up remaining height above input
    this.chatContainer = document.createElement("div");
    this.chatContainer.className =
      "overflow-y-auto p-4 pt-50 sm:pt-4 space-y-2 md:space-y-3 w-full";
    this.chatContainer.style.height = "calc(100% - 15vh)";
    this.chatContainer.style.minHeight = "calc(100% - 140px)";
    this.chatContainer.id = "chat-container";

    // Input container - takes up 10% of screen height at the bottom
    this.inputContainer = document.createElement("div");
    this.inputContainer.className =
      "absolute bottom-0 left-0 right-0 flex flex-col justify-around items-center py-3 px-5 gap-2 bg-white/5 backdrop-blur-md rounded-t-2xl sm:rounded-xl shadow-lg border-t border-white/10 h-[15vh] min-h-[100px] sm:mx-auto md:max-w-[800px] sm:mb-6 h-[auto]";

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

    // Close dropdown when clicking outside
    this.chatContainer.addEventListener("click", () => {
      this.toggleDebugDropdown({ forceClose: true });

      this.toggleContextDropdown({ forceClose: true });
    });

    // Status indicator
    this.statusIndicator = document.createElement("div");
    this.statusIndicator.className =
      "flex items-center gap-2 text-sm sm:text-base text-gray-400";
    this.updateStatus("Initializing...");

    // Perform health check to server after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.performHealthCheck();
    }, 100);

    // Context display (created and hidden by default)
    this.createContextDisplay();
    this.contextDisplay.style.display = "none";

    // Create new chat button
    const newChatButton = document.createElement("div");
    newChatButton.className =
      "relative flex items-center gap-2 cursor-pointer hover:text-gray-600 transition-all duration-200 min-w-0 w-auto overflow-visible px-3 py-1 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5";
    newChatButton.id = "new-chat-button";

    const newChatSummary = document.createElement("div");
    newChatSummary.className =
      "flex items-center gap-2 truncate text-sm sm:text-base";
    newChatSummary.innerHTML = `<span>New Chat</span><span class="text-xs text-gray-600">+</span>`;
    newChatSummary.id = "new-chat-summary";

    newChatButton.appendChild(newChatSummary);
    newChatButton.addEventListener("click", () => {
      this.showNewChatConfirmation();
    });

    // Create info button to show first-time use popup on demand
    const infoButton = document.createElement("div");
    infoButton.className =
      "relative flex items-center gap-2 cursor-pointer hover:text-gray-600 transition-all duration-200 min-w-0 w-auto overflow-visible px-3 py-1 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5";
    infoButton.id = "info-button";

    const infoSummary = document.createElement("div");
    infoSummary.className =
      "flex items-center gap-2 truncate text-sm sm:text-base";
    infoSummary.innerHTML = `<span>Context Info</span><span class="text-xs text-gray-600">▲</span>`;
    infoButton.appendChild(infoSummary);
    infoButton.addEventListener("click", () => {
      this.showAboutModal();
    });

    // Create left section container
    const leftSection = document.createElement("div");
    leftSection.className =
      "flex items-center gap-4 text-sm sm:text-base overflow-visible text-gray-400 cursor-default select-none";

    // Add left side elements (context button removed)
    leftSection.appendChild(newChatButton);
    leftSection.appendChild(infoButton);

    // Create right section container
    const rightSection = document.createElement("div");
    rightSection.className =
      "flex items-center gap-4 text-sm sm:text-base overflow-visible text-gray-400 cursor-default select-none";

    // Add right side elements
    rightSection.appendChild(this.statusIndicator);

    this.infoContainer = document.createElement("div");
    this.infoContainer.className =
      "flex w-full flex-row items-center justify-between gap-3 overflow-visible";
    this.infoContainer.id = "info-container";

    this.infoContainer.appendChild(leftSection);
    this.infoContainer.appendChild(rightSection);

    this.inputContainer.appendChild(this.infoContainer);

    // Input field
    this.input = document.createElement("input");
    this.input.id = "chat-input";
    this.input.type = "text";
    this.input.placeholder =
      "Ask me something about Simon’s work or projects...";
    this.input.className =
      "flex-1 px-4 py-3 rounded-full text-xs sm:text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-white/20 bg-white/5 backdrop-blur-sm border border-white/10 placeholder-gray-400 text-white";
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
    this.inputContainer.appendChild(inputRow);

    this.container.appendChild(this.chatContainer);
    this.container.appendChild(this.inputContainer);

    // Don't auto-append to body - let main.ts handle positioning
  }

  private async loadExistingConversation(): Promise<void> {
    try {
      const messages = await this.contextManager.getConversationMessages();
      messages.forEach((message: StoredMessage) => {
        this.addMessageToUI(message);
      });
    } catch (error) {
      console.error("Failed to load existing conversation:", error);
    }
  }

  private async sendMessage(): Promise<void> {
    const message = this.input.value.trim();

    if (!message) {
      return;
    }

    // Clear input
    this.input.value = "";

    // Create user message
    const userMessage = this.createMessage("user", message);

    // Add user message to UI immediately
    this.addMessageToUI(userMessage);

    // Disable input while generating
    this.input.disabled = true;
    this.sendButton.disabled = true;
    this.updateStatus("Generating...");

    // Speed up infinite animation for loading
    this.triggerAnimation("speedUpInfinite");

    // Save user message to storage (non-blocking)
    this.contextManager.addMessage("user", message).catch(error => {
      console.error("Failed to save user message:", error);
    });

    try {
      // Get conversation history to send to the server
      const conversationHistory =
        await this.contextManager.getConversationMessages();
      console.log("📚 Sending conversation history:", {
        messageCount: conversationHistory.length,
        history: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content.substring(0, 50) + "...",
        })),
      });

      let response: string;
      response = await generate(message, { history: conversationHistory });

      // Create and display assistant response
      const assistantMessage = this.createMessage("assistant", response);
      this.addMessageToUI(assistantMessage);

      // Save assistant response to storage (non-blocking)
      this.contextManager.addMessage("assistant", response).catch(error => {
        console.error("Failed to save assistant message:", error);
      });
    } catch (error) {
      console.error("Chat error:", error);
      this.addMessageToUI(
        this.createMessage(
          "assistant",
          "Sorry, I encountered an error. Please try again."
        )
      );
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

  private addMessageToUI(message: StoredMessage): void {
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
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const healthResult = await checkServerHealth();
      this.updateStatus(healthResult.status);

      if (!healthResult.isHealthy) {
        console.error("Health check failed:", healthResult.message);
      }
    } catch (error) {
      console.error("Health check failed:", error);
      this.updateStatus("Error");
    }
  }

  private updateStatus(status: string): void {
    let dotColor = "bg-yellow-500";
    if (status === "Ready") {
      dotColor = "bg-green-500";
    } else if (
      status === "Failed to load model" ||
      status === "Error" ||
      status === "Server responded but unexpected content"
    ) {
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

    // Update inline summary with loading state
    contextSummary.innerHTML = `
        <span>📍 Context</span>
        <span class="text-gray-500">Loading...</span>
        <span class="text-xs text-gray-600">${this.isContextDropdownOpen ? "▼" : "▲"}</span>
      `;
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
        name: "Backflip Animation",
        icon: "🤸",
        color: "bg-orange-500 hover:bg-orange-600",
      },
      {
        id: "frontflip",
        name: "Frontflip Animation",
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

    // Camera controls toggle
    const camBtn = document.createElement("button");
    camBtn.id = "debug-camera-toggle";
    camBtn.innerHTML = `🎥 Toggle Camera Controls`;
    camBtn.className =
      "w-full px-3 py-2 text-sm text-white rounded-lg transition-colors bg-teal-600 hover:bg-teal-700 text-left";
    camBtn.addEventListener("click", () => {
      const evt = new CustomEvent("toggleCameraControls");
      window.dispatchEvent(evt);
      this.toggleDebugDropdown({ forceClose: true });
    });
    this.debugDropdown.appendChild(camBtn);

    // Toggle local LLM usage
    const localBtn = document.createElement("button");

    localBtn.className =
      "mt-2 w-full px-3 py-2 text-sm text-white rounded-lg transition-colors bg-slate-600 hover:bg-slate-700 text-left";
    localBtn.addEventListener("click", () => {
      this.toggleDebugDropdown({ forceClose: true });
    });
    this.debugDropdown.appendChild(localBtn);

    // Remove margin from last button
    const lastButton = this.debugDropdown.lastElementChild as HTMLElement;
    if (lastButton) {
      lastButton.classList.remove("mb-2");
    }

    // Position the dropdown relative to the debug button
    const debugButton = document.getElementById("debug-button");
    if (debugButton) {
      debugButton.style.position = "relative";
      debugButton.appendChild(this.debugDropdown);
    }
  }

  private toggleDebugDropdown({
    forceClose,
    forceOpen,
  }: { forceClose?: boolean; forceOpen?: boolean } = {}): void {
    const debugDropdown = document.getElementById("debug-dropdown");
    if (!debugDropdown) return;

    if (forceClose) {
      debugDropdown.style.display = "none";
      this.isDebugDropdownOpen = false;
      return;
    }

    if (forceOpen) {
      debugDropdown.style.display = "block";
      this.isDebugDropdownOpen = true;
      return;
    }

    if (this.isDebugDropdownOpen) {
      debugDropdown.style.display = "none";
      this.isDebugDropdownOpen = false;
    } else {
      debugDropdown.style.display = "block";
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

  // Method to handle mobile viewport changes
  public handleMobileViewportChange(): void {
    if ("visualViewport" in window && window.visualViewport) {
      const viewport = window.visualViewport;

      // Update container height to use visual viewport
      this.container.style.height = `${viewport.height}px`;

      // Ensure input container stays at the bottom of the viewport
      if (this.inputContainer) {
        this.inputContainer.style.bottom = "0";
      }

      // Chat UI viewport updated successfully
    }
  }
}
