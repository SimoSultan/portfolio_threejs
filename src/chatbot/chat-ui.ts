import { Marked } from "marked";

import { checkServerHealth, generate, getErrorMessage } from "../api";
import { ContextManager, type StoredMessage } from "./context";

const marked = new Marked();

marked.use({
  renderer: {
    link({ href, title, text }) {
      const titleAttr = title ? ` title="${title}"` : "";
      return `<a target="_blank" rel="nofollow noopener noreferrer" href="${href}"${titleAttr}>${text}</a>`;
    },
  },
});

export class ChatUI {
  private chatUIContainer!: HTMLDivElement;
  private inputContainer!: HTMLDivElement;
  private input!: HTMLInputElement;
  private sendButton!: HTMLButtonElement;
  private debugButton!: HTMLButtonElement;
  private debugDropdown!: HTMLDivElement;
  private statusIndicator!: HTMLDivElement;
  private isDebugDropdownOpen: boolean = false;
  private infoContainer!: HTMLDivElement;
  private contextManager: ContextManager;
  private loadingBubbleTimeout: ReturnType<typeof setTimeout> | null = null;
  private loadingBubbleTimeout2: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.contextManager = new ContextManager();
    this.createUI();
    this.loadExistingConversation();
  }

  // Helper function to create a proper StoredMessage object
  public createMessage(
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
    this.chatUIContainer = document.createElement("div");
    this.chatUIContainer.className =
      "bg-transparent z-0 flex flex-col w-full p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600/30 scrollbar-track-transparent pb-[calc(env(safe-area-inset-bottom)+150px+180px)] sm:pb-[180px]";
    this.chatUIContainer.id = "chat-ui-container";
    // Input container - takes up at least 120px height at bottom
    this.inputContainer = document.createElement("div");
    this.inputContainer.className =
      "absolute bottom-[-1px] z-20 right-0 left-0 flex flex-col p-5 gap-4 bg-white/5 backdrop-blur-md sm:rounded-xl shadow-lg border border-white/20 min-h-[120px] sm:mb-6 md:max-w-[80%] mx-auto";

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
    this.chatUIContainer.addEventListener("click", () => {
      this.toggleDebugDropdown({ forceClose: true });
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

    // Create new chat button
    const newChatButton = document.createElement("div");
    newChatButton.className =
      "relative flex items-center gap-2 cursor-pointer hover:text-gray-100 transition-all duration-200 min-w-0 w-auto overflow-visible px-3 py-1 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5";
    newChatButton.id = "new-chat-button";

    const newChatSummary = document.createElement("div");
    newChatSummary.className =
      "flex items-center gap-2 truncate text-sm sm:text-base";
    newChatSummary.innerHTML = `<span>New Chat</span><span class="text-xs ">+</span>`;
    newChatSummary.id = "new-chat-summary";

    newChatButton.appendChild(newChatSummary);
    newChatButton.addEventListener("click", () => {
      this.showNewChatConfirmation();
    });

    // Create info button to show first-time use popup on demand
    const infoButton = document.createElement("div");
    infoButton.className =
      "relative flex items-center gap-2 cursor-pointer hover:text-gray-100 transition-all duration-200 min-w-0 w-auto overflow-visible px-3 py-1 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5";
    infoButton.id = "info-button";

    const infoSummary = document.createElement("div");
    infoSummary.className =
      "flex items-center gap-2 truncate text-sm sm:text-base";
    infoSummary.innerHTML = `<span>Context Info</span><span class="text-xs">▲</span>`;
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
    this.input.placeholder = "Ask me about Simon’s career...";
    this.input.className =
      "flex-1 px-4 py-3 rounded-full text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-white/20 bg-white/5 backdrop-blur-md border border-white/10 placeholder-gray-400 text-white disabled:text-gray-500 disabled:cursor-wait disabled:placeholder-gray-600 disabled:bg-white/2";
    this.input.addEventListener("keydown", e => {
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
    this.sendButton.id = "send-button";
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
    // Save user message to storage (non-blocking)
    this.contextManager.addMessage("user", message).catch(error => {
      console.error("Failed to save user message:", error);
    });

    // Show loading message
    this.showLoadingMessage();

    // Disable input while generating
    this.input.disabled = true;
    this.sendButton.disabled = true;
    this.updateStatus("Generating...");

    // Speed up infinite animation for loading
    this.triggerAnimation("speedUpInfinite");

    try {
      // Get conversation history to send to the server
      const conversationHistory =
        await this.contextManager.getConversationMessages();

      let response: string;
      response = await generate(message, { history: conversationHistory });

      this.hideLoadingMessage();

      // Create and display assistant response
      const assistantMessage = this.createMessage("assistant", response);
      this.addMessageToUI(assistantMessage);

      // Save assistant response to storage (non-blocking)
      this.contextManager.addMessage("assistant", response).catch(error => {
        console.error("Failed to save assistant message:", error);
      });
    } catch (error) {
      this.hideLoadingMessage();
      console.error("Chat error:", error);
      const errorMessage = getErrorMessage(error);
      console.error("Error message to display:", errorMessage);

      // If we already started a message, append error there or just create new one?
      // Simpler to just add a new error message if the previous one was empty,
      // but if we were streaming partial content, maybe append error?
      // Standard behavior: just show error message as a fresh bubble or update status.
      // Let's add a distinct error message.
      this.addMessageToUI(this.createMessage("assistant", errorMessage));
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

  private showLoadingMessage(text?: string): void {
    let innerText = text || "Loading...";

    const messageDiv = document.createElement("div");
    messageDiv.className = "flex justify-start";
    messageDiv.id = "loading-message";

    const bubble = document.createElement("div");
    bubble.id = "loading-bubble";
    bubble.className =
      "chat-message max-w-[80%] md:max-w-md px-4 py-2 rounded-2xl backdrop-blur-md text-sm md:text-base bg-purple-500/10 text-purple-300 border border-purple-400/20 chat-message--assistant z-10";

    // For AI messages, render markdown; for user messages, use plain text
    bubble.innerHTML = `<p><em>${innerText}</em></p>`;
    messageDiv.appendChild(bubble);

    this.chatUIContainer.appendChild(messageDiv);

    // Update the loading message if it's taking too long
    this.loadingBubbleTimeout = setTimeout(() => {
      const bubble = document.getElementById("loading-bubble");
      if (!bubble) return;
      bubble.innerHTML =
        "<p><em>This is taking longer than usual...</br>Please bare with me as I am only using free versions of relevant software.</em> 😅</p>";

      this.chatUIContainer.scrollTop = this.chatUIContainer.scrollHeight;
    }, 7_500);

    this.loadingBubbleTimeout2 = setTimeout(() => {
      const bubble = document.getElementById("loading-bubble");
      if (!bubble) return;
      bubble.innerHTML =
        "<p><em>Yes, it really is taking a while...</br>It takes a while on first load. Please hang on a bit longer.</em></p>";

      this.chatUIContainer.scrollTop = this.chatUIContainer.scrollHeight;
    }, 15_000);

    // Scroll to bottom
    this.chatUIContainer.scrollTop = this.chatUIContainer.scrollHeight;
  }

  private hideLoadingMessage(): void {
    const loadingMessage = document.getElementById("loading-message");
    if (!loadingMessage) return;

    this.chatUIContainer.removeChild(loadingMessage);

    clearTimeout(this.loadingBubbleTimeout!);
    clearTimeout(this.loadingBubbleTimeout2!);

    // Scroll to bottom
    this.chatUIContainer.scrollTop = this.chatUIContainer.scrollHeight;
  }

  public async addMessageToUI(message: StoredMessage): Promise<void> {
    const messageDiv = document.createElement("div");
    messageDiv.className = `flex mb-3 ${message.role === "user" ? "justify-end" : "justify-start"}`;

    const bubble = document.createElement("div");
    bubble.className = `chat-message flex flex-wrap max-w-[80%] md:max-w-md px-4 py-2 backdrop-blur-md rounded-2xl text-sm md:text-base ${
      message.role === "user"
        ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 chat-message--user"
        : "bg-purple-500/10 text-purple-300 border border-purple-400/20 chat-message--assistant"
    }`;

    // For AI messages, render markdown; for user messages, use plain text
    if (message.role === "assistant") {
      bubble.innerHTML = await this.renderMarkdown(message.content, true);
    } else {
      bubble.textContent = message.content;
    }

    messageDiv.appendChild(bubble);
    this.chatUIContainer.appendChild(messageDiv);

    // Scroll to bottom
    this.chatUIContainer.scrollTop = this.chatUIContainer.scrollHeight;
  }

  private async renderMarkdown(
    content: string,
    parseWithMarked: boolean
  ): Promise<string> {
    let rendered = "";
    const placeholders: string[] = [];

    if (!parseWithMarked) {
      rendered = content;
      // 1. Protect code blocks (```code```) - do this early to avoid mangling content
      rendered = rendered.replace(/```(.*?)```/gs, (_match, p1) => {
        const placeholder = `__CODE_BLOCK_${placeholders.length}__`;
        placeholders.push(
          `<pre class="bg-gray-100 p-2 rounded text-xs overflow-x-auto"><code>${p1}</code></pre>`
        );
        return placeholder;
      });

      // 2. Handle block-level elements that should not be wrapped in <p>
      // Handle numbered lists (allow leading space, handle multiple lines)
      rendered = rendered.replace(
        /^\s*\d+\.\s+(.*?)$/gm,
        "<ol><li>$1</li></ol>"
      );
      rendered = rendered.replace(/<\/ol>\s*\n\s*<ol>/g, "");

      // Handle bullet points (allow leading space, handle -, *, +, merge correctly)
      rendered = rendered.replace(
        /^\s*[-*+]\s+(.*?)$/gm,
        "<ul><li>$1</li></ul>"
      );
      rendered = rendered.replace(/<\/ul>\s*\n\s*<ul>/g, "");

      // Handle blockquotes (> text)
      rendered = rendered.replace(
        /^\s*>\s+(.*?)$/gm,
        '<blockquote class="blockquote">$1</blockquote>'
      );
      rendered = rendered.replace(
        /<\/blockquote>\s*\n\s*<blockquote class="blockquote">/g,
        "<br>"
      );

      // Handle indented text (4+ spaces or tabs) - skip if it looks like it was already handled or is a list item
      rendered = rendered.replace(
        /^(?!\s*<(?:ul|ol|blockquote|pre|p|div|li))(?:\s{4,}|\t+)(.*?)$/gm,
        '<div class="indented-text">$1</div>'
      );

      // 3. Handle inline formatting
      // Handle bold text (**text**)
      rendered = rendered.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

      // Handle italic text (*text*)
      rendered = rendered.replace(/\*(.*?)\*/g, "<em>$1</em>");

      // Handle inline code (`code`)
      rendered = rendered.replace(
        /`(.*?)`/g,
        '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>'
      );

      // 4. Handle remaining line breaks
      // Replace double newlines with paragraphs and single newlines with <br>
      rendered = rendered.replace(/\n\n/g, "</p><p>");
      rendered = rendered.replace(/\n/g, "<br>");

      // 5. Restore protected code blocks
      placeholders.forEach((html, i) => {
        rendered = rendered.replace(`__CODE_BLOCK_${i}__`, html);
      });

      // 6. Wrap in paragraph tags if not already starting with a block-level tag
      const blockTags = ["<p", "<pre", "<blockquote", "<ul", "<ol", "<div"];
      const trimmed = rendered.trim();
      const startsWithBlock = blockTags.some(tag => trimmed.startsWith(tag));

      if (!startsWithBlock && trimmed.length > 0) {
        rendered = `<p>${rendered}</p>`;
      }

      rendered = rendered.replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        '<a href="mailto:$1" class="text-blue-400 underline">$1</a>'
      );

      // 8. Convert URLs to clickable links
      rendered = rendered.replace(
        "https://www.linkedin.com/in/simon-curran-brisbane",
        '<a href="https://www.linkedin.com/in/simon-curran-brisbane" target="_blank" class="text-blue-400 underline">Simon\'s LinkedIn Profile</a>'
      );
      rendered = rendered.replace(
        "https://github.com/SimoSultan",
        '<a href="https://github.com/SimoSultan" target="_blank" class="text-blue-400 underline">Simon\'s GitHub Profile</a>'
      );
      rendered = rendered.replace(
        "https://drive.google.com/file/d/1o4dsnsq83aPHIeIpS4XFf0ZCOy98zFz5/view",
        '<a href="https://drive.google.com/file/d/1o4dsnsq83aPHIeIpS4XFf0ZCOy98zFz5/view" target="_blank" class="text-blue-400 underline">Simon\'s Resume</a>'
      );
    } else {
      const parseResult = marked.parse(content);
      rendered =
        typeof parseResult === "string" ? parseResult : await parseResult;
    }

    // 7. Convert email addresses to mailto links

    return rendered;
  }

  private async clearChat(): Promise<void> {
    this.chatUIContainer.innerHTML = "";
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

  public getChatUIContainer(): HTMLDivElement {
    return this.chatUIContainer;
  }

  public getInputContainer(): HTMLDivElement {
    return this.inputContainer;
  }

  public destroy(): void {
    if (this.chatUIContainer.parentNode) {
      this.chatUIContainer.parentNode.removeChild(this.chatUIContainer);
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
      this.chatUIContainer.style.height = `${viewport.height}px`;

      // Ensure input container stays at the bottom of the viewport
      if (this.inputContainer) {
        this.inputContainer.style.bottom = "0";
      }

      // Chat UI viewport updated successfully
    }
  }
}
