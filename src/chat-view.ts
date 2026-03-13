// ============================================================
// Chat View - Sidebar Chat Panel UI
// ============================================================

import {
  ItemView,
  WorkspaceLeaf,
  MarkdownRenderer,
  setIcon,
  Notice,
  Modal,
  FuzzySuggestModal,
  TFile,
  TFolder,
  TAbstractFile,
} from "obsidian";
import { ChatMessage, ClaudeMessage, ToolCallInfo } from "./types";
import { ClaudeService } from "./claude-service";
import { getHelpContent } from "./help-guide";
import type ClaudeAssistantPlugin from "./main";

export const CHAT_VIEW_TYPE = "obsiclaude-chat";

interface AttachedContext {
  type: "file" | "folder";
  path: string;
  name: string;
}

const MODELS: { id: string; label: string }[] = [
  { id: "claude-sonnet-4-6", label: "Sonnet" },
  { id: "claude-opus-4-6", label: "Opus" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku" },
];

const TOOL_LABELS: Record<string, string> = {
  create_note: "Creating note",
  read_note: "Reading note",
  edit_note: "Editing note",
  delete_note: "Deleting note",
  move_note: "Moving note",
  list_files: "Listing files",
  create_folder: "Creating folder",
  search_notes: "Searching notes",
  get_frontmatter: "Reading metadata",
  set_frontmatter: "Setting metadata",
  get_backlinks: "Finding backlinks",
  get_outgoing_links: "Finding links",
  analyze_vault: "Analyzing vault",
  find_orphan_notes: "Finding orphans",
  suggest_links: "Suggesting links",
  batch_frontmatter: "Updating metadata",
  find_duplicate_notes: "Finding duplicates",
  get_active_note: "Reading active note",
  open_note: "Opening note",
  get_all_tags: "Collecting tags",
};

const THINKING_PHASES = [
  "Thinking",
  "Honking",
  "Booping",
  "Pondering",
  "Brewing",
];

interface SlashCommand {
  command: string;
  label: string;
  description: string;
  prompt: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/explore",
    label: "Explore vault",
    description: "Show folder structure, tags, and recent notes",
    prompt: "Explore my vault: show the folder structure, all tags, and recently modified notes.",
  },
  {
    command: "/analyze",
    label: "Analyze vault",
    description: "Find orphans, missing links, and suggest improvements",
    prompt: "Analyze my vault health: find orphan notes, missing backlinks, tag distribution, and suggest improvements.",
  },
  {
    command: "/tags",
    label: "Tag overview",
    description: "Show all tags and their usage counts",
    prompt: "Show me all tags in my vault with usage counts, sorted by frequency.",
  },
  {
    command: "/orphans",
    label: "Find orphan notes",
    description: "Notes with no backlinks or outgoing links",
    prompt: "Find all orphan notes in my vault — notes with no backlinks or outgoing links.",
  },
  {
    command: "/recent",
    label: "Recent notes",
    description: "Show recently modified notes",
    prompt: "Show my 20 most recently modified notes with their paths and modification dates.",
  },
  {
    command: "/search",
    label: "Search",
    description: "Search notes by keyword",
    prompt: "Search my vault for: ",
  },
  {
    command: "/duplicates",
    label: "Find duplicates",
    description: "Notes with similar titles or content",
    prompt: "Find potential duplicate notes in my vault based on similar titles.",
  },
  {
    command: "/links",
    label: "Link suggestions",
    description: "Suggest links between related notes",
    prompt: "Suggest useful links between related notes in my vault that are currently unlinked.",
  },
  {
    command: "/help",
    label: "Help",
    description: "Open the user guide",
    prompt: "__HELP__",
  },
];

export class ChatView extends ItemView {
  private chatContainer: HTMLElement;
  private inputContainer: HTMLElement;
  private inputEl: HTMLTextAreaElement;
  private sendBtn: HTMLElement;
  private contextBar: HTMLElement;
  private modelBtn: HTMLElement;
  private isProcessing = false;
  private messages: ChatMessage[] = [];
  private claudeService: ClaudeService;
  private attachedContexts: AttachedContext[] = [];
  private capturedDraggable: any = null;
  private abortController: AbortController | null = null;
  private slashMenu: HTMLElement | null = null;
  private isComposing = false;

  constructor(leaf: WorkspaceLeaf, private plugin: ClaudeAssistantPlugin) {
    super(leaf);
    this.claudeService = plugin.claudeService;
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "OBSICLAUDE";
  }

  getIcon(): string {
    return "sparkles";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("oc");

    // Header
    const header = container.createDiv("oc-header");
    const titleRow = header.createDiv("oc-header-row");
    titleRow.createEl("span", { text: "OBSICLAUDE", cls: "oc-title" });

    const actions = titleRow.createDiv("oc-header-actions");

    // Model selector button
    this.modelBtn = actions.createEl("button", {
      cls: "oc-model-btn",
      attr: { "aria-label": "Switch model" },
    });
    this.modelBtn.setText(this.getModelShortName());
    this.modelBtn.addEventListener("click", (e) => this.showModelMenu(e));

    // Help button
    const helpBtn = actions.createEl("button", {
      cls: "oc-icon-btn",
      attr: { "aria-label": "Help" },
    });
    setIcon(helpBtn, "help-circle");
    helpBtn.addEventListener("click", () => this.showHelp());

    // New chat button
    const clearBtn = actions.createEl("button", {
      cls: "oc-icon-btn",
      attr: { "aria-label": "New chat" },
    });
    setIcon(clearBtn, "plus");
    clearBtn.addEventListener("click", () => this.clearChat());

    // Chat messages area
    this.chatContainer = container.createDiv("oc-messages");

    // Start fresh on open
    this.messages = [];
    this.showWelcome();

    // Drag & drop: use document-level capture to intercept BEFORE Obsidian's workspace handlers
    // This is the only reliable way to accept drops in a custom sidebar view
    const isOverOurPanel = (e: DragEvent): boolean => {
      const target = e.target as HTMLElement;
      return !!target?.closest(".oc");
    };

    this.registerDomEvent(document, "dragover", (e: DragEvent) => {
      if (!isOverOurPanel(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
        e.dataTransfer.effectAllowed = "copy";
      }
      this.chatContainer.addClass("oc-dragover");
      try {
        const dm = (this.app as any).dragManager;
        if (dm?.draggable) this.capturedDraggable = dm.draggable;
      } catch (_) { /* ignore */ }
    }, true);

    this.registerDomEvent(document, "dragenter", (e: DragEvent) => {
      if (!isOverOurPanel(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
        e.dataTransfer.effectAllowed = "copy";
      }
    }, true);

    this.registerDomEvent(document, "dragleave", (e: DragEvent) => {
      if (!isOverOurPanel(e)) return;
      const related = e.relatedTarget as Node | null;
      if (!related || !this.containerEl.contains(related)) {
        this.chatContainer.removeClass("oc-dragover");
      }
    }, true);

    this.registerDomEvent(document, "drop", (e: DragEvent) => {
      if (!isOverOurPanel(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.chatContainer.removeClass("oc-dragover");
      this.handleDrop(e);
    }, true);

    // Override Obsidian's native drag handlers on the view
    (this as any).onDrop = (event: DragEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.chatContainer.removeClass("oc-dragover");
      this.handleDrop(event);
    };
    (this as any).onDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };

    // Input area
    this.inputContainer = container.createDiv("oc-input-area");

    // Context bar (shows attached files/folders)
    this.contextBar = this.inputContainer.createDiv("oc-context-bar");
    this.contextBar.style.display = "none";

    const inputRow = this.inputContainer.createDiv("oc-input-row");

    this.inputEl = inputRow.createEl("textarea", {
      cls: "oc-input",
      attr: { placeholder: "Message...", rows: "1" },
    });

    this.inputEl.addEventListener("input", () => {
      this.inputEl.style.height = "auto";
      this.inputEl.style.height =
        Math.min(this.inputEl.scrollHeight, 120) + "px";
      // Slash command menu
      this.handleSlashInput();
    });

    // Track IME composition state for CJK input (Korean, Japanese, Chinese)
    this.inputEl.addEventListener("compositionstart", () => {
      this.isComposing = true;
    });
    this.inputEl.addEventListener("compositionend", () => {
      this.isComposing = false;
    });

    this.inputEl.addEventListener("keydown", (e) => {
      // Block all Enter handling during IME composition
      if (this.isComposing || e.isComposing) return;

      // ESC to stop processing
      if (e.key === "Escape") {
        if (this.isProcessing) {
          e.preventDefault();
          this.handleStop();
          return;
        }
        if (this.slashMenu) {
          this.dismissSlashMenu();
          return;
        }
      }
      // Arrow keys for slash menu
      if (this.slashMenu && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        this.navigateSlashMenu(e.key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (this.slashMenu && e.key === "Enter") {
        e.preventDefault();
        this.selectSlashItem();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    this.sendBtn = inputRow.createEl("button", {
      cls: "oc-send-btn",
      attr: { "aria-label": "Send" },
    });
    setIcon(this.sendBtn, "arrow-up");
    this.sendBtn.addEventListener("click", () => {
      if (this.isProcessing) {
        this.handleStop();
      } else {
        this.handleSend();
      }
    });
  }

  async onClose(): Promise<void> {
    // Abort any in-flight requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.activeProcessingEl) {
      const interval = (this.activeProcessingEl as any)?._interval;
      if (interval) clearInterval(interval);
      this.activeProcessingEl = null;
    }
    await this.saveHistory();
  }

  // ============================================================
  // MODEL SELECTOR
  // ============================================================

  private showModelMenu(e: MouseEvent): void {
    const menu = new (require("obsidian") as typeof import("obsidian")).Menu();
    for (const m of MODELS) {
      menu.addItem((item) => {
        item.setTitle(m.label);
        if (this.plugin.settings.model === m.id) {
          item.setIcon("check");
        }
        item.onClick(async () => {
          this.plugin.settings.model = m.id as typeof this.plugin.settings.model;
          await this.plugin.saveSettings();
          this.modelBtn.setText(m.label);
          this.plugin.claudeService = new (
            await import("./claude-service")
          ).ClaudeService(this.plugin.settings, this.plugin.vaultTools);
          this.claudeService = this.plugin.claudeService;
        });
      });
    }
    menu.showAtMouseEvent(e);
  }

  // ============================================================
  // CHAT LOGIC (Streaming + Processing Indicator)
  // ============================================================

  private activeProcessingEl: HTMLElement | null = null;

  private handleStop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      // Clean up processing indicator interval to prevent memory leak
      if (this.activeProcessingEl) {
        const interval = (this.activeProcessingEl as any)?._interval;
        if (interval) clearInterval(interval);
        this.activeProcessingEl = null;
      }
      this.pendingFollowUps = [];
      new Notice("Stopped");
    }
  }

  // ============================================================
  // SLASH COMMANDS
  // ============================================================

  private handleSlashInput(): void {
    const val = this.inputEl.value;
    if (!val.startsWith("/")) {
      this.dismissSlashMenu();
      return;
    }

    const query = val.toLowerCase();
    const matches = SLASH_COMMANDS.filter(
      (c) =>
        c.command.startsWith(query) ||
        c.label.toLowerCase().includes(query.slice(1))
    );

    if (matches.length === 0) {
      this.dismissSlashMenu();
      return;
    }

    this.showSlashMenu(matches);
  }

  private showSlashMenu(commands: SlashCommand[]): void {
    this.dismissSlashMenu();

    const menu = this.inputContainer.createDiv("oc-slash-menu");
    this.slashMenu = menu;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      const item = menu.createDiv("oc-slash-item");
      if (i === 0) item.addClass("is-active");
      item.dataset.index = String(i);

      const left = item.createDiv("oc-slash-item-left");
      left.createSpan({ text: cmd.command, cls: "oc-slash-cmd" });
      left.createSpan({ text: cmd.label, cls: "oc-slash-label" });

      item.createSpan({ text: cmd.description, cls: "oc-slash-desc" });

      item.addEventListener("click", () => {
        this.applySlashCommand(cmd);
      });
      item.addEventListener("mouseenter", () => {
        menu
          .querySelectorAll(".oc-slash-item")
          .forEach((el) => el.removeClass("is-active"));
        item.addClass("is-active");
      });
    }
  }

  private navigateSlashMenu(direction: number): void {
    if (!this.slashMenu) return;
    const items = this.slashMenu.querySelectorAll(".oc-slash-item");
    if (items.length === 0) return;

    let active = -1;
    items.forEach((el, i) => {
      if (el.hasClass("is-active")) active = i;
    });

    items.forEach((el) => el.removeClass("is-active"));
    const next = (active + direction + items.length) % items.length;
    items[next].addClass("is-active");
  }

  private selectSlashItem(): void {
    if (!this.slashMenu) return;
    const active = this.slashMenu.querySelector(".oc-slash-item.is-active");
    if (!active) return;

    const idx = parseInt((active as HTMLElement).dataset.index || "0");
    const commands = SLASH_COMMANDS.filter((c) => {
      const query = this.inputEl.value.toLowerCase();
      return (
        c.command.startsWith(query) ||
        c.label.toLowerCase().includes(query.slice(1))
      );
    });
    if (commands[idx]) {
      this.applySlashCommand(commands[idx]);
    }
  }

  private applySlashCommand(cmd: SlashCommand): void {
    this.dismissSlashMenu();
    if (cmd.prompt === "__HELP__") {
      this.showHelp();
      this.inputEl.value = "";
      return;
    }
    if (cmd.command === "/search") {
      // For search, put the prompt and let user finish typing
      this.inputEl.value = cmd.prompt;
      this.inputEl.focus();
      this.inputEl.setSelectionRange(
        this.inputEl.value.length,
        this.inputEl.value.length
      );
    } else {
      this.inputEl.value = cmd.prompt;
      this.handleSend();
    }
  }

  private dismissSlashMenu(): void {
    if (this.slashMenu) {
      this.slashMenu.remove();
      this.slashMenu = null;
    }
  }

  // ============================================================
  // SEND / FOLLOW-UP
  // ============================================================

  private pendingFollowUps: string[] = [];
  private _isFollowUpReplay = false;

  private async handleSend(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text) return;

    // Dismiss slash menu if open
    this.dismissSlashMenu();

    // If processing, queue as follow-up (supports multiple)
    if (this.isProcessing) {
      this.pendingFollowUps.push(text);
      this.inputEl.value = "";
      this.inputEl.style.height = "auto";

      // Show queued message immediately in chat
      const queuedMsg: ChatMessage = {
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      this.messages.push(queuedMsg);
      await this.renderMessage(queuedMsg);
      this.scrollToBottom();
      new Notice("Follow-up queued");
      return;
    }

    this.inputEl.value = "";
    this.inputEl.style.height = "auto";
    this.abortController = new AbortController();
    this.setProcessing(true);

    // Remove welcome if present
    const welcome = this.chatContainer.querySelector(".oc-welcome");
    if (welcome) welcome.remove();

    // Build message with context
    let fullText = text;
    if (this.attachedContexts.length > 0) {
      const contextLines = this.attachedContexts.map((c) =>
        c.type === "folder"
          ? `[Folder: ${c.path}]`
          : `[Note: ${c.path}]`
      );
      fullText = `Context: ${contextLines.join(", ")}\n\n${text}`;
    }
    this.clearContexts();

    // Skip push/render if this is a follow-up replay (already added when queued)
    if (!this._isFollowUpReplay) {
      const userMsg: ChatMessage = {
        role: "user",
        content: fullText,
        timestamp: Date.now(),
      };
      this.messages.push(userMsg);
      await this.renderMessage(userMsg);
      this.scrollToBottom();
    }

    // Create streaming response container
    const responseWrapper = this.chatContainer.createDiv(
      "oc-msg oc-msg-assistant"
    );
    const responseBody = responseWrapper.createDiv("oc-msg-body");

    // Processing indicator
    const procEl = this.createProcessingIndicator(responseBody);
    this.activeProcessingEl = procEl;

    // Streaming content area
    const contentEl = responseBody.createDiv("oc-msg-content");

    let renderTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastRenderedText = "";

    try {
      const claudeMessages: ClaudeMessage[] = this.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let streamStarted = false;
      const result = await this.claudeService.chat(claudeMessages, {
        signal: this.abortController?.signal,
        onText: (text: string) => {
          // Update indicator to show writing mode on first text chunk
          if (!streamStarted) {
            streamStarted = true;
            const lbl = (procEl as any)?._label as HTMLElement | undefined;
            if (lbl) {
              lbl.textContent = "Writing";
              (procEl as any)._modeOverride = true;
            }
          }
          // Debounced markdown rendering during streaming
          if (renderTimeout) clearTimeout(renderTimeout);
          renderTimeout = setTimeout(() => {
            if (text !== lastRenderedText) {
              lastRenderedText = text;
              contentEl.empty();
              MarkdownRenderer.render(this.app, text, contentEl, "", this);
              this.scrollToBottom();
            }
          }, 80);
        },
        onToolStart: (toolName: string) => {
          const label =
            TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
          this.updateProcessingLabel(procEl, label);
          this.addProcessingStep(procEl, label, "running");
        },
        onToolEnd: (tc: ToolCallInfo) => {
          const label =
            TOOL_LABELS[tc.toolName] || tc.toolName.replace(/_/g, " ");
          this.markProcessingStepDone(procEl, label);
        },
      });

      // Clear any pending render timeout
      if (renderTimeout) clearTimeout(renderTimeout);

      // Final render
      procEl.remove();
      contentEl.empty();
      if (result.text) {
        await MarkdownRenderer.render(
          this.app,
          result.text,
          contentEl,
          "",
          this
        );
      }

      // Add tool badge if tools were used
      if (result.toolCalls.length > 0) {
        const toolBadge = responseBody.createDiv("oc-tool-badge");
        responseBody.insertBefore(toolBadge, contentEl);
        setIcon(toolBadge.createSpan("oc-tool-badge-icon"), "zap");
        toolBadge.createSpan({
          text: `${result.toolCalls.length} action${result.toolCalls.length > 1 ? "s" : ""}`,
          cls: "oc-tool-badge-label",
        });

        const details = responseBody.createDiv("oc-tool-details");
        responseBody.insertBefore(details, contentEl);
        details.style.display = "none";

        toolBadge.addEventListener("click", () => {
          const show = details.style.display === "none";
          details.style.display = show ? "block" : "none";
          toolBadge.toggleClass("is-open", show);
        });

        for (const tc of result.toolCalls) {
          const row = details.createDiv("oc-tool-row");
          row.createSpan({
            text: TOOL_LABELS[tc.toolName] || tc.toolName.replace(/_/g, " "),
            cls: "oc-tool-name",
          });
        }
      }

      // Copy button
      if (result.text) {
        this.addCopyButton(responseBody, result.text);
      }

      // Save message — strip large tool results to keep history small
      const trimmedToolCalls = result.toolCalls.length > 0
        ? result.toolCalls.map((tc) => ({
            toolName: tc.toolName,
            input: tc.input,
            result: tc.result.length > 500
              ? tc.result.slice(0, 500) + "...(trimmed)"
              : tc.result,
          }))
        : undefined;

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: result.text,
        timestamp: Date.now(),
        toolCalls: trimmedToolCalls,
      };
      this.messages.push(assistantMsg);
    } catch (err) {
      if (renderTimeout) clearTimeout(renderTimeout);
      procEl.remove();

      const errorMsg = err instanceof Error ? err.message : String(err);
      new Notice(`Error: ${errorMsg}`);
      contentEl.empty();
      await MarkdownRenderer.render(
        this.app,
        `**Error:** ${errorMsg}`,
        contentEl,
        "",
        this
      );

      const errorAssistant: ChatMessage = {
        role: "assistant",
        content: `**Error:** ${errorMsg}`,
        timestamp: Date.now(),
      };
      this.messages.push(errorAssistant);
    }

    // Cleanup processing indicator interval
    const interval = (procEl as any)?._interval;
    if (interval) clearInterval(interval);
    this.activeProcessingEl = null;

    this.setProcessing(false);
    this.scrollToBottom();
    await this.saveHistory();

    // Process queued follow-ups (FIFO)
    // Note: follow-up messages were already added to this.messages and rendered
    // when they were queued (see isProcessing block above), so we must skip
    // the duplicate push/render inside handleSend. We use a flag for this.
    if (this.pendingFollowUps.length > 0) {
      const followUp = this.pendingFollowUps.shift()!;
      this._isFollowUpReplay = true;
      this.inputEl.value = followUp;
      await this.handleSend();
      this._isFollowUpReplay = false;
    }
  }

  // ============================================================
  // PROCESSING INDICATOR (Thinking / Honking / Booping)
  // ============================================================

  private createProcessingIndicator(parent: HTMLElement): HTMLElement {
    const el = parent.createDiv("oc-processing");

    // Status row (clickable to expand)
    const statusRow = el.createDiv("oc-processing-status");

    // Animated dots
    const dots = statusRow.createDiv("oc-processing-dots");
    dots.createDiv("oc-processing-dot");
    dots.createDiv("oc-processing-dot");
    dots.createDiv("oc-processing-dot");

    const label = statusRow.createSpan({
      text: "Thinking",
      cls: "oc-processing-label",
    });

    // Elapsed time badge
    const timeBadge = statusRow.createSpan({
      text: "",
      cls: "oc-processing-time",
    });

    const chevron = statusRow.createSpan("oc-processing-chevron");
    setIcon(chevron, "chevron-down");

    // Details panel (hidden by default)
    const detailsPanel = el.createDiv("oc-processing-details");
    detailsPanel.style.display = "none";

    statusRow.addEventListener("click", () => {
      const show = detailsPanel.style.display === "none";
      detailsPanel.style.display = show ? "block" : "none";
      statusRow.toggleClass("is-expanded", show);
    });

    // Cycle through fun phases + update elapsed time
    let phaseIdx = 0;
    const startTime = Date.now();
    const interval = setInterval(() => {
      // Update elapsed time
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timeBadge.textContent = elapsed < 60
        ? `${elapsed}s`
        : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

      // Cycle phase text (only if still in thinking mode, not tool/writing mode)
      if (!(el as any)._modeOverride) {
        phaseIdx = (phaseIdx + 1) % THINKING_PHASES.length;
        label.textContent = THINKING_PHASES[phaseIdx];
      }
    }, 1000);
    (el as any)._interval = interval;
    (el as any)._label = label;
    (el as any)._details = detailsPanel;
    (el as any)._actionCount = 0;
    (el as any)._modeOverride = false;

    this.scrollToBottom();
    return el;
  }

  private updateProcessingLabel(procEl: HTMLElement, text: string): void {
    const label = (procEl as any)?._label as HTMLElement | undefined;
    if (!label) return;
    (procEl as any)._actionCount = ((procEl as any)._actionCount || 0) + 1;
    const count = (procEl as any)._actionCount;
    label.textContent = `${text}... (action ${count})`;
    (procEl as any)._modeOverride = true;
  }

  private addProcessingStep(
    procEl: HTMLElement,
    label: string,
    status: "running" | "done"
  ): void {
    const details = (procEl as any)?._details as HTMLElement | undefined;
    if (!details) return;

    const step = details.createDiv("oc-processing-step");
    step.dataset.label = label;

    const iconEl = step.createSpan("oc-processing-step-icon");
    setIcon(iconEl, status === "running" ? "loader" : "check");

    step.createSpan({
      text: label,
      cls: "oc-processing-step-text",
    });

    this.scrollToBottom();
  }

  private markProcessingStepDone(procEl: HTMLElement, label: string): void {
    const details = (procEl as any)?._details as HTMLElement | undefined;
    if (!details) return;

    const steps = details.querySelectorAll(".oc-processing-step");
    for (const step of Array.from(steps)) {
      if ((step as HTMLElement).dataset.label === label) {
        const icon = step.querySelector(".oc-processing-step-icon");
        if (icon) {
          icon.empty();
          setIcon(icon as HTMLElement, "check");
          (icon as HTMLElement).addClass("is-done");
        }
      }
    }
  }

  // ============================================================
  // RENDERING
  // ============================================================

  private async renderMessage(msg: ChatMessage): Promise<void> {
    const wrapper = this.chatContainer.createDiv(
      `oc-msg oc-msg-${msg.role}`
    );

    const body = wrapper.createDiv("oc-msg-body");

    // Tool calls badge
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      const toolBadge = body.createDiv("oc-tool-badge");
      setIcon(toolBadge.createSpan("oc-tool-badge-icon"), "zap");
      toolBadge.createSpan({
        text: `${msg.toolCalls.length} action${msg.toolCalls.length > 1 ? "s" : ""}`,
        cls: "oc-tool-badge-label",
      });

      const details = body.createDiv("oc-tool-details");
      details.style.display = "none";

      toolBadge.addEventListener("click", () => {
        const show = details.style.display === "none";
        details.style.display = show ? "block" : "none";
        toolBadge.toggleClass("is-open", show);
      });

      for (const tc of msg.toolCalls) {
        const row = details.createDiv("oc-tool-row");
        row.createSpan({
          text: TOOL_LABELS[tc.toolName] || tc.toolName.replace(/_/g, " "),
          cls: "oc-tool-name",
        });
      }
    }

    // Content
    const contentEl = body.createDiv("oc-msg-content");
    if (msg.content) {
      await MarkdownRenderer.render(
        this.app,
        msg.content,
        contentEl,
        "",
        this
      );
    }

    // Copy button for assistant messages
    if (msg.role === "assistant" && msg.content) {
      this.addCopyButton(body, msg.content);
    }
  }

  // ============================================================
  // WELCOME SCREEN
  // ============================================================

  private showWelcome(): void {
    const w = this.chatContainer.createDiv("oc-welcome");

    // SVG mascot
    const mascotWrap = w.createDiv("oc-mascot-wrap");
    mascotWrap.innerHTML = `<svg class="oc-mascot" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="url(#glow)" opacity="0.15"/>
      <path d="M100 30 L145 75 L130 160 L70 160 L55 75 Z" fill="url(#crystal)" stroke="url(#crystalStroke)" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M100 30 L100 160" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
      <path d="M55 75 L130 75" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <path d="M100 30 L75 110" stroke="rgba(255,255,255,0.1)" stroke-width="0.8"/>
      <path d="M100 30 L125 110" stroke="rgba(255,255,255,0.1)" stroke-width="0.8"/>
      <ellipse cx="82" cy="100" rx="6" ry="7" fill="white"/>
      <ellipse cx="118" cy="100" rx="6" ry="7" fill="white"/>
      <ellipse cx="83" cy="101" rx="3.5" ry="4" fill="#2d1b69"/>
      <ellipse cx="119" cy="101" rx="3.5" ry="4" fill="#2d1b69"/>
      <circle cx="85" cy="98" r="1.5" fill="white"/>
      <circle cx="121" cy="98" r="1.5" fill="white"/>
      <path d="M90 118 Q100 128 110 118" stroke="#2d1b69" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <ellipse cx="72" cy="115" rx="8" ry="5" fill="#f9a8d4" opacity="0.5"/>
      <ellipse cx="128" cy="115" rx="8" ry="5" fill="#f9a8d4" opacity="0.5"/>
      <g class="oc-mascot-sparkles">
        <path d="M40 50 L44 56 L40 62 L36 56Z" fill="#fbbf24" opacity="0.9"/>
        <path d="M155 45 L158 50 L155 55 L152 50Z" fill="#a78bfa" opacity="0.9"/>
        <path d="M35 130 L38 135 L35 140 L32 135Z" fill="#67e8f9" opacity="0.8"/>
        <path d="M165 125 L168 130 L165 135 L162 130Z" fill="#f472b6" opacity="0.8"/>
        <circle cx="50" cy="35" r="3" fill="#6ee7b7" opacity="0.7"/>
        <circle cx="150" cy="165" r="3" fill="#fbbf24" opacity="0.7"/>
        <circle cx="160" cy="70" r="2" fill="#93c5fd" opacity="0.6"/>
        <circle cx="40" cy="160" r="2" fill="#c084fc" opacity="0.6"/>
      </g>
      <path d="M100 20 L103 10 L100 14 L97 10Z" fill="#fbbf24"/>
      <circle cx="100" cy="8" r="4" fill="url(#sparkGrad)">
        <animate attributeName="r" values="4;5;4" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite"/>
      </circle>
      <defs>
        <linearGradient id="crystal" x1="60" y1="30" x2="140" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#a78bfa"/>
          <stop offset="35%" stop-color="#7c3aed"/>
          <stop offset="65%" stop-color="#6d28d9"/>
          <stop offset="100%" stop-color="#4c1d95"/>
        </linearGradient>
        <linearGradient id="crystalStroke" x1="55" y1="30" x2="145" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#c4b5fd"/>
          <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#a78bfa"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>
    </svg>`;

    // Logo
    const logo = w.createDiv("oc-logo");
    logo.createEl("span", { text: "OBSI", cls: "oc-logo-a" });
    logo.createEl("span", { text: "CLAUDE", cls: "oc-logo-b" });

    // Drag & drop hero message
    const heroMsg = w.createDiv("oc-hero-msg");
    heroMsg.createEl("p", {
      text: "Just drag & drop.",
      cls: "oc-hero-line1",
    });
    heroMsg.createEl("p", {
      text: "That's it.",
      cls: "oc-hero-line2",
    });
    heroMsg.createEl("p", {
      text: "Files, folders — right into this chat.",
      cls: "oc-hero-sub",
    });

    // Action buttons: Write (primary) + Vault Overview (combined explore+analyze)
    const actionsRow = w.createDiv("oc-welcome-actions");

    // Magic Write button — the core feature, opens writing assistant modal
    const writeBtn = actionsRow.createDiv("oc-action-btn oc-action-write");
    // Vine SVG wrapping around the button
    writeBtn.createDiv("oc-write-vine");
    const writeIcon = writeBtn.createDiv("oc-action-icon");
    setIcon(writeIcon, "wand-2");
    writeBtn.createSpan({ text: "Magic Write", cls: "oc-action-text" });
    writeBtn.addEventListener("click", () => {
      new WriteModal(this, this.plugin).open();
    });

    // Vault Overview — combined explore + analyze
    const overviewBtn = actionsRow.createDiv("oc-action-btn oc-action-explore");
    const overviewIcon = overviewBtn.createDiv("oc-action-icon");
    setIcon(overviewIcon, "telescope");
    overviewBtn.createSpan({ text: "Vault overview", cls: "oc-action-text" });
    overviewBtn.addEventListener("click", () => {
      this.inputEl.value = [
        "Run a vault diagnostic in two phases.",
        "",
        "**Phase 1 — Core scan (do this now):**",
        "1. list_files — map the folder tree. Rate organization (flat? too nested? well-structured?).",
        "2. get_all_tags — show top 15 tags, spot inconsistencies (singular/plural, typos, overlaps).",
        "3. Show 10 most recently modified notes.",
        "",
        "Give a **Vault Health Score (A–F)** with a short summary of strengths and weaknesses.",
        "",
        "**Phase 2 — Present options to the user:**",
        "After showing Phase 1 results, offer these as numbered choices:",
        "1. Orphan check — find notes with no links",
        "2. Duplicate scan — detect similar notes",
        "3. Link density — check how well-connected notes are",
        "4. Reorganize — suggest a better folder structure",
        "5. Tag cleanup — fix inconsistent tags",
        "",
        "Ask which they'd like to explore next. They can pick a number, ask for multiple, or request something completely different.",
      ].join("\n");
      this.handleSend();
    });

    // Drop hint with animated arrow
    const hint = w.createDiv("oc-drop-hint");
    const hintIcon = hint.createSpan("oc-drop-hint-icon");
    setIcon(hintIcon, "arrow-down-to-line");
    hint.createSpan({ text: "or just ask me anything" });
  }

  // ============================================================
  // DRAG & DROP (Robust)
  // ============================================================

  private handleDrop(e: DragEvent): void {
    let resolved = false;

    // Method 1: Obsidian's internal drag manager (captured during dragover)
    if (this.capturedDraggable) {
      const d = this.capturedDraggable;
      this.capturedDraggable = null;

      const candidates: any[] = [];
      if (d.files && Array.isArray(d.files)) candidates.push(...d.files);
      if (d.file) candidates.push(d.file);
      // Some versions use 'source'
      if (d.source && typeof d.source === "object" && d.source.path) {
        candidates.push(d.source);
      }

      for (const f of candidates) {
        if (!f?.path) continue;
        const abstract = this.app.vault.getAbstractFileByPath(f.path);
        if (abstract instanceof TFolder) {
          this.addContext({
            type: "folder",
            path: abstract.path,
            name: abstract.name,
          });
          resolved = true;
        } else if (abstract instanceof TFile) {
          this.addContext({
            type: "file",
            path: abstract.path,
            name: abstract.basename,
          });
          resolved = true;
        }
      }
    }

    if (resolved) return;

    // Method 2: Also try the drag manager at drop time (may still be set)
    try {
      const dm = (this.app as any).dragManager;
      if (dm?.draggable) {
        const d = dm.draggable;
        const files = d.files || (d.file ? [d.file] : []);
        for (const f of files) {
          if (!f?.path) continue;
          const abstract = this.app.vault.getAbstractFileByPath(f.path);
          if (abstract instanceof TFolder) {
            this.addContext({
              type: "folder",
              path: abstract.path,
              name: abstract.name,
            });
            resolved = true;
          } else if (abstract instanceof TFile) {
            this.addContext({
              type: "file",
              path: abstract.path,
              name: abstract.basename,
            });
            resolved = true;
          }
        }
      }
    } catch (e) {
      console.debug("OBSICLAUDE: drop resolve via draggable failed:", e);
    }

    if (resolved) return;

    // Method 3: Parse DataTransfer text/plain
    if (e.dataTransfer) {
      const textData = e.dataTransfer.getData("text/plain");
      if (textData) {
        resolved = this.resolvePathsFromText(textData);
      }

      // Method 4: text/uri-list
      if (!resolved) {
        const uriData = e.dataTransfer.getData("text/uri-list");
        if (uriData) {
          resolved = this.resolvePathsFromText(uriData);
        }
      }

      // Method 5: Check all other data transfer types
      if (!resolved) {
        for (const t of e.dataTransfer.types) {
          if (t === "text/plain" || t === "text/uri-list" || t === "Files")
            continue;
          const data = e.dataTransfer.getData(t);
          if (data) {
            resolved = this.resolvePathsFromText(data);
            if (resolved) break;
          }
        }
      }
    }

    if (!resolved) {
      new Notice(
        "Could not identify items. Try right-click → Send to OBSICLAUDE."
      );
    }
  }

  private resolvePathsFromText(text: string): boolean {
    let resolved = false;
    const lines = text.split("\n").filter(Boolean);

    for (const rawLine of lines) {
      let clean = rawLine.trim();

      // Try exact path
      let file = this.app.vault.getAbstractFileByPath(clean);

      // Try URI decoding
      if (!file) {
        try {
          clean = decodeURIComponent(clean);
          file = this.app.vault.getAbstractFileByPath(clean);
        } catch {
          // URI decode can fail on malformed strings — continue with other methods
        }
      }

      // Try stripping URL prefixes
      if (!file) {
        const stripped = clean
          .replace(/^(file|app):\/\/[^/]*/, "")
          .replace(/^\/+/, "");
        file = this.app.vault.getAbstractFileByPath(stripped);
      }

      // Try matching by filename across vault
      if (!file) {
        const filename = clean.split("/").pop();
        if (filename) {
          const nameNoExt = filename.replace(/\.md$/, "");
          const allFiles = this.app.vault.getAllLoadedFiles();
          file =
            allFiles.find(
              (f) =>
                f.name === filename ||
                (f instanceof TFile && f.basename === nameNoExt)
            ) || null;
        }
      }

      if (file instanceof TFolder) {
        this.addContext({
          type: "folder",
          path: file.path,
          name: file.name,
        });
        resolved = true;
      } else if (file instanceof TFile) {
        this.addContext({
          type: "file",
          path: file.path,
          name: file.basename,
        });
        resolved = true;
      }
    }

    return resolved;
  }

  // ============================================================
  // CONTEXT ATTACHMENT
  // ============================================================

  addContext(ctx: AttachedContext): void {
    if (this.attachedContexts.some((c) => c.path === ctx.path)) return;
    this.attachedContexts.push(ctx);
    this.renderContextBar();
    this.inputEl.focus();
    new Notice(`Attached: ${ctx.name}`);
  }

  private clearContexts(): void {
    this.attachedContexts = [];
    this.renderContextBar();
  }

  private renderContextBar(): void {
    this.contextBar.empty();
    if (this.attachedContexts.length === 0) {
      this.contextBar.style.display = "none";
      return;
    }
    this.contextBar.style.display = "flex";

    for (const ctx of this.attachedContexts) {
      const chip = this.contextBar.createDiv("oc-context-chip");
      const iconEl = chip.createSpan("oc-context-chip-icon");
      setIcon(iconEl, ctx.type === "folder" ? "folder" : "file-text");
      chip.createSpan({ text: ctx.name });
      const removeBtn = chip.createSpan("oc-context-chip-x");
      setIcon(removeBtn, "x");
      removeBtn.addEventListener("click", () => {
        this.attachedContexts = this.attachedContexts.filter(
          (c) => c.path !== ctx.path
        );
        this.renderContextBar();
      });
    }
  }

  attachFile(file: TFile): void {
    this.addContext({ type: "file", path: file.path, name: file.basename });
  }

  attachFolder(folder: TFolder): void {
    this.addContext({ type: "folder", path: folder.path, name: folder.name });
  }

  // ============================================================
  // COPY BUTTON
  // ============================================================

  private addCopyButton(parent: HTMLElement, text: string): void {
    const bar = parent.createDiv("oc-msg-actions");
    const copyBtn = bar.createEl("button", {
      cls: "oc-copy-btn",
      attr: { "aria-label": "Copy" },
    });
    setIcon(copyBtn, "copy");
    copyBtn.createSpan({ text: "Copy", cls: "oc-copy-label" });

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.empty();
        setIcon(copyBtn, "check");
        copyBtn.createSpan({ text: "Copied!", cls: "oc-copy-label" });
        setTimeout(() => {
          copyBtn.empty();
          setIcon(copyBtn, "copy");
          copyBtn.createSpan({ text: "Copy", cls: "oc-copy-label" });
        }, 2000);
      } catch {
        new Notice("Failed to copy");
      }
    });
  }

  // ============================================================
  // HELP GUIDE
  // ============================================================

  private async showHelp(): Promise<void> {
    // Remove welcome if present
    const welcome = this.chatContainer.querySelector(".oc-welcome");
    if (welcome) welcome.remove();

    // Remove existing help page if shown
    const existing = this.chatContainer.querySelector(".oc-help");
    if (existing) {
      existing.remove();
      return; // Toggle off
    }

    const lang = this.plugin.settings.language as "en" | "ko" | "ja" | "zh" | "es" | "de" | "fr";
    const help = getHelpContent(lang);

    const helpEl = this.chatContainer.createDiv("oc-help");

    // Back button
    const backRow = helpEl.createDiv("oc-help-back");
    const backBtn = backRow.createEl("button", {
      cls: "oc-help-back-btn",
      attr: { "aria-label": "Close help" },
    });
    setIcon(backBtn, "arrow-left");
    backBtn.createSpan({ text: " Back to chat" });
    backBtn.addEventListener("click", () => {
      helpEl.remove();
    });

    // Title
    helpEl.createEl("h2", { text: help.title, cls: "oc-help-title" });

    // Sections
    for (const section of help.sections) {
      const sectionEl = helpEl.createDiv("oc-help-section");
      sectionEl.createEl("h3", {
        text: section.heading,
        cls: "oc-help-heading",
      });
      const bodyEl = sectionEl.createDiv("oc-help-body");
      await MarkdownRenderer.render(
        this.app,
        section.body,
        bodyEl,
        "",
        this
      );
    }

    this.scrollToBottom();
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private static readonly MAX_HISTORY_MESSAGES = 100;
  private static readonly MAX_HISTORY_CHARS = 500_000;

  /**
   * Save chat history with rolling size limits.
   * Keeps the most recent messages within budget.
   */
  private async saveHistory(): Promise<void> {
    let msgs = this.messages;

    // Rolling limit: keep last N messages
    if (msgs.length > ChatView.MAX_HISTORY_MESSAGES) {
      msgs = msgs.slice(-ChatView.MAX_HISTORY_MESSAGES);
    }

    // Size limit: if serialized history is too large, keep trimming
    let serialized = JSON.stringify(msgs);
    while (serialized.length > ChatView.MAX_HISTORY_CHARS && msgs.length > 2) {
      msgs = msgs.slice(2); // Remove oldest pair (user+assistant)
      serialized = JSON.stringify(msgs);
    }

    this.plugin.settings.chatHistory = msgs;
    await this.plugin.saveSettings();
  }

  private async clearChat(): Promise<void> {
    this.messages = [];
    this.attachedContexts = [];
    this.pendingFollowUps = [];
    this.chatContainer.empty();
    this.showWelcome();
    this.plugin.settings.chatHistory = [];
    await this.plugin.saveSettings();
    this.renderContextBar();
    new Notice("New chat started");
  }

  private setProcessing(processing: boolean): void {
    this.isProcessing = processing;
    // Toggle send/stop icon
    this.sendBtn.empty();
    if (processing) {
      setIcon(this.sendBtn, "square");
      this.sendBtn.addClass("is-stop");
      this.sendBtn.removeClass("is-loading");
      this.sendBtn.ariaLabel = "Stop";
    } else {
      setIcon(this.sendBtn, "arrow-up");
      this.sendBtn.removeClass("is-stop");
      this.sendBtn.ariaLabel = "Send";
      this.abortController = null;
    }
    // Keep input enabled so user can type follow-up
    this.inputEl.disabled = false;
    this.inputEl.placeholder = processing ? "Type follow-up or press Esc to stop..." : "Message...";
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    });
  }

  private getModelShortName(): string {
    const found = MODELS.find((m) => m.id === this.plugin.settings.model);
    return found ? found.label : "Sonnet";
  }

  async sendMessage(text: string): Promise<void> {
    this.inputEl.value = text;
    await this.handleSend();
  }
}

// ============================================================
// Write Modal — Guided Writing Assistant
// ============================================================

interface WriteStyleConfig {
  id: string;
  label: string;
  icon: string;
  desc: string;
  frontmatter: string;
  structure: string;
  tone: string;
}

const WRITING_STYLES: WriteStyleConfig[] = [
  {
    id: "note",
    label: "Note",
    icon: "file-text",
    desc: "General note",
    frontmatter: "tags, date, aliases",
    structure: "Use clear headings (##). Keep paragraphs short. Add a TL;DR at the top if the note is long.",
    tone: "Clear, direct, personal. Write as if explaining to a smart friend.",
  },
  {
    id: "blog",
    label: "Blog Post",
    icon: "pen-line",
    desc: "Article with hook & sections",
    frontmatter: "tags, date, author, status: draft, category, description (1-line summary for SEO)",
    structure: "Start with a compelling hook/intro paragraph. Use ## sections with descriptive headings. Include a conclusion with key takeaways. Add a '---' separator before the conclusion.",
    tone: "Engaging, slightly conversational but authoritative. Use rhetorical questions. Vary sentence length for rhythm.",
  },
  {
    id: "summary",
    label: "Summary",
    icon: "align-left",
    desc: "Concise digest",
    frontmatter: "tags, date, source (what this summarizes), status: summary",
    structure: "Start with a 1-2 sentence overview. Use bullet points for key points. End with 'Key Takeaways' section. Maximum 500 words — brevity is critical.",
    tone: "Neutral, factual, dense. Every sentence must carry information. No filler.",
  },
  {
    id: "meeting",
    label: "Meeting Notes",
    icon: "users",
    desc: "Agenda & action items",
    frontmatter: "tags: [meeting], date, attendees: [], status: actionable",
    structure: "## Agenda (numbered list), ## Discussion (key points per topic), ## Decisions (what was decided), ## Action Items (checkbox list with - [ ] owner: task format), ## Next Meeting",
    tone: "Factual, brief. Use bullet points. Focus on decisions and actions, not discussion details.",
  },
  {
    id: "howto",
    label: "How-to",
    icon: "list-checks",
    desc: "Step-by-step guide",
    frontmatter: "tags: [guide, howto], date, difficulty: beginner|intermediate|advanced, estimated-time",
    structure: "## Prerequisites (what you need before starting), ## Steps (numbered, one action per step), ## Troubleshooting (common issues), ## Result (what success looks like)",
    tone: "Instructional, precise. Use imperative mood ('Click', 'Open', 'Run'). Each step = one action.",
  },
  {
    id: "research",
    label: "Research",
    icon: "search",
    desc: "Deep analysis with sources",
    frontmatter: "tags: [research], date, status: draft, topic, question (the research question)",
    structure: "## Research Question, ## Background, ## Findings (with sub-sections), ## Analysis, ## Open Questions, ## Sources & References",
    tone: "Academic but readable. Present evidence before conclusions. Acknowledge uncertainty. Use [[wikilinks]] heavily to connect to existing knowledge.",
  },
  {
    id: "creative",
    label: "Creative",
    icon: "feather",
    desc: "Free-form, expressive",
    frontmatter: "tags: [creative, writing], date, mood, inspiration",
    structure: "No rigid structure required. Use whitespace and line breaks for pacing. Can use poetry formatting, stream-of-consciousness, or narrative structure — whatever fits the content.",
    tone: "Expressive, literary. Use vivid imagery, metaphors, and sensory details. Prioritize voice and feeling over information.",
  },
  {
    id: "moc",
    label: "MOC",
    icon: "map",
    desc: "Map of Content — index note",
    frontmatter: "tags: [MOC, index], date, scope (what this MOC covers)",
    structure: "## Overview (1-2 sentences), then organize [[wikilinks]] into categorized sections with ## headings. Each section should have a brief description of what those linked notes cover. End with ## Related MOCs.",
    tone: "Navigational. Brief descriptions, heavy on [[wikilinks]]. This note is a hub — it points to other notes, not contains content itself.",
  },
];

interface WriteRef {
  type: "file" | "folder";
  path: string;
  name: string;
}

// File/folder picker using Obsidian's fuzzy search
class FileFolderSuggestModal extends FuzzySuggestModal<TAbstractFile> {
  private items: TAbstractFile[];
  private onChoose: (item: TAbstractFile) => void;

  constructor(app: any, items: TAbstractFile[], onChoose: (item: TAbstractFile) => void) {
    super(app);
    this.items = items;
    this.onChoose = onChoose;
    this.setPlaceholder("Search notes and folders...");
  }

  getItems(): TAbstractFile[] {
    return this.items;
  }

  getItemText(item: TAbstractFile): string {
    return item.path;
  }

  onChooseItem(item: TAbstractFile): void {
    this.onChoose(item);
  }
}

class WriteModal extends Modal {
  private chatView: ChatView;
  private plugin: ClaudeAssistantPlugin;
  private refs: WriteRef[] = [];
  private refChipsEl: HTMLElement | null = null;
  private selectedStyle = "note";
  private targetFolder = "";

  constructor(chatView: ChatView, plugin: ClaudeAssistantPlugin) {
    super(plugin.app);
    this.chatView = chatView;
    this.plugin = plugin;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("oc-write-modal");

    // Title
    const header = contentEl.createDiv("oc-write-header");
    const titleIcon = header.createDiv("oc-write-header-icon");
    setIcon(titleIcon, "wand-2");
    header.createEl("h2", { text: "Magic Write", cls: "oc-write-title" });
    header.createEl("p", { text: "Describe what you want. Claude writes it.", cls: "oc-write-subtitle" });

    // Main textarea
    const topicGroup = contentEl.createDiv("oc-write-group");
    topicGroup.createEl("label", { text: "What should I write about?", cls: "oc-write-label" });
    const topicArea = topicGroup.createEl("textarea", {
      cls: "oc-write-textarea",
      attr: { placeholder: "e.g. A blog post comparing Zettelkasten and PARA methods for knowledge management...", rows: "4" },
    });

    // Optional title
    const titleGroup = contentEl.createDiv("oc-write-group oc-write-row");
    titleGroup.createEl("label", { text: "Title (optional)", cls: "oc-write-label" });
    const titleInput = titleGroup.createEl("input", {
      cls: "oc-write-input",
      attr: { placeholder: "Claude will suggest one if empty", type: "text" },
    });

    // Writing style selector
    const styleGroup = contentEl.createDiv("oc-write-group");
    styleGroup.createEl("label", { text: "Writing style", cls: "oc-write-label" });
    const styleGrid = styleGroup.createDiv("oc-write-style-grid");
    for (const style of WRITING_STYLES) {
      const chip = styleGrid.createDiv("oc-write-style-chip");
      if (style.id === this.selectedStyle) chip.addClass("is-selected");
      const chipIcon = chip.createDiv("oc-write-style-icon");
      setIcon(chipIcon, style.icon);
      chip.createSpan({ text: style.label, cls: "oc-write-style-label" });
      chip.addEventListener("click", () => {
        styleGrid.querySelectorAll(".oc-write-style-chip").forEach((el) => el.removeClass("is-selected"));
        chip.addClass("is-selected");
        this.selectedStyle = style.id;
      });
    }

    // Target folder
    const folderGroup = contentEl.createDiv("oc-write-group oc-write-row");
    folderGroup.createEl("label", { text: "Save to folder", cls: "oc-write-label" });
    const folderSelect = folderGroup.createEl("select", { cls: "oc-write-select" });
    folderSelect.createEl("option", { text: "/ (vault root)", attr: { value: "" } });
    const allFolders: string[] = [];
    this.app.vault.getAllLoadedFiles().forEach((f) => {
      if (f instanceof TFolder && f.path !== "/") {
        allFolders.push(f.path);
      }
    });
    allFolders.sort();
    for (const fp of allFolders) {
      const excluded = this.plugin.settings.excludedFolders || [];
      if (excluded.some((ex: string) => fp.startsWith(ex))) continue;
      folderSelect.createEl("option", { text: fp, attr: { value: fp } });
    }
    folderSelect.addEventListener("change", () => {
      this.targetFolder = folderSelect.value;
    });

    // Reference material — file picker button (uses Obsidian's fuzzy search)
    const refGroup = contentEl.createDiv("oc-write-group");
    refGroup.createEl("label", { text: "Reference material (optional)", cls: "oc-write-label" });
    const refRow = refGroup.createDiv("oc-write-ref-row");
    const addFileBtn = refRow.createEl("button", { cls: "oc-write-add-ref-btn" });
    const addFileIcon = addFileBtn.createDiv("oc-write-add-ref-icon");
    setIcon(addFileIcon, "file-search");
    addFileBtn.createSpan({ text: "Browse vault", cls: "oc-write-add-ref-text" });
    addFileBtn.addEventListener("click", () => {
      // Collect all files and folders
      const excluded = this.plugin.settings.excludedFolders || [];
      const items = this.app.vault.getAllLoadedFiles().filter((f: TAbstractFile) => {
        if (f.path === "/") return false;
        if (excluded.some((ex: string) => f.path.startsWith(ex))) return false;
        return true;
      });
      new FileFolderSuggestModal(this.app, items, (item) => {
        if (item instanceof TFile) {
          this.addRef({ type: "file", path: item.path, name: item.basename });
        } else if (item instanceof TFolder) {
          this.addRef({ type: "folder", path: item.path, name: item.name });
        }
      }).open();
    });

    const addFolderBtn = refRow.createEl("button", { cls: "oc-write-add-ref-btn" });
    const addFolderIcon = addFolderBtn.createDiv("oc-write-add-ref-icon");
    setIcon(addFolderIcon, "folder-search");
    addFolderBtn.createSpan({ text: "Browse folders", cls: "oc-write-add-ref-text" });
    addFolderBtn.addEventListener("click", () => {
      const excluded = this.plugin.settings.excludedFolders || [];
      const folders = this.app.vault.getAllLoadedFiles().filter((f: TAbstractFile) => {
        if (!(f instanceof TFolder) || f.path === "/") return false;
        if (excluded.some((ex: string) => f.path.startsWith(ex))) return false;
        return true;
      });
      new FileFolderSuggestModal(this.app, folders, (item) => {
        if (item instanceof TFolder) {
          this.addRef({ type: "folder", path: item.path, name: item.name });
        }
      }).open();
    });

    this.refChipsEl = refGroup.createDiv("oc-write-ref-chips");

    // Submit button
    const footer = contentEl.createDiv("oc-write-footer");
    const submitBtn = footer.createEl("button", { text: "Write it", cls: "oc-write-submit" });
    const submitIcon = submitBtn.createDiv("oc-write-submit-icon");
    setIcon(submitIcon, "sparkles");

    submitBtn.addEventListener("click", () => {
      const topic = topicArea.value.trim();
      if (!topic) {
        new Notice("Please describe what you want to write.");
        topicArea.focus();
        return;
      }

      const title = titleInput.value.trim();
      const style = WRITING_STYLES.find((s) => s.id === this.selectedStyle);
      if (!style) {
        new Notice("Please select a writing style.");
        return;
      }
      const folder = this.targetFolder;

      // Build style-specific prompt
      let prompt = `Write a note for me using **Magic Write**.\n\n`;
      prompt += `**Topic:** ${topic}\n`;
      if (title) prompt += `**Title:** ${title}\n`;
      if (folder) prompt += `**Save to:** ${folder}/\n`;
      prompt += `\n## Style: ${style.label}\n`;
      prompt += `**Frontmatter:** Include these YAML fields: ${style.frontmatter}\n`;
      prompt += `**Structure:** ${style.structure}\n`;
      prompt += `**Tone:** ${style.tone}\n`;

      if (this.refs.length > 0) {
        prompt += `\n## Reference Material — read these first:\n`;
        for (const ref of this.refs) {
          if (ref.type === "folder") {
            prompt += `- Folder: ${ref.path}/ (list and read key notes inside)\n`;
          } else {
            prompt += `- Note: ${ref.path}\n`;
          }
        }
        prompt += `\nUse the reference material as source. Synthesize, connect ideas, and cite with [[wikilinks]].\n`;
      }

      prompt += `\n## Instructions:\n`;
      prompt += `1. Use create_note to create the note${folder ? ` in the "${folder}" folder` : ""}.\n`;
      prompt += `2. Add YAML frontmatter exactly as specified above for this style.\n`;
      prompt += `3. Follow the structure and tone guidelines strictly — they define how this style differs from others.\n`;
      prompt += `4. Use [[wikilinks]] to link to relevant existing notes in the vault.\n`;
      prompt += `5. After creating, use open_note to open it in the editor.\n`;

      this.close();

      for (const ref of this.refs) {
        this.chatView.addContext(ref);
      }

      this.chatView.sendMessage(prompt);
    });

    setTimeout(() => topicArea.focus(), 50);
  }

  private addRef(ref: WriteRef): void {
    if (this.refs.some((r) => r.path === ref.path)) return;
    this.refs.push(ref);

    if (!this.refChipsEl) return;
    const chip = this.refChipsEl.createDiv("oc-write-ref-chip");
    const chipIcon = chip.createDiv("oc-write-ref-icon");
    setIcon(chipIcon, ref.type === "folder" ? "folder" : "file-text");
    chip.createSpan({ text: ref.name, cls: "oc-write-ref-name" });
    const removeBtn = chip.createDiv("oc-write-ref-remove");
    setIcon(removeBtn, "x");
    removeBtn.addEventListener("click", () => {
      this.refs = this.refs.filter((r) => r.path !== ref.path);
      chip.remove();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
