// ============================================================
// Chat View - Sidebar Chat Panel UI
// ============================================================

import {
  ItemView,
  WorkspaceLeaf,
  MarkdownRenderer,
  setIcon,
  Notice,
  TFile,
  TFolder,
} from "obsidian";
import { ChatMessage, ClaudeMessage, ToolCallInfo } from "./types";
import { ClaudeService } from "./claude-service";
import type ClaudeAssistantPlugin from "./main";

export const CHAT_VIEW_TYPE = "obsiclaud-chat";

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

  constructor(leaf: WorkspaceLeaf, private plugin: ClaudeAssistantPlugin) {
    super(leaf);
    this.claudeService = plugin.claudeService;
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "OBSICLAUD";
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
    titleRow.createEl("span", { text: "OBSICLAUD", cls: "oc-title" });

    const actions = titleRow.createDiv("oc-header-actions");

    // Model selector button
    this.modelBtn = actions.createEl("button", {
      cls: "oc-model-btn",
      attr: { "aria-label": "Switch model" },
    });
    this.modelBtn.setText(this.getModelShortName());
    this.modelBtn.addEventListener("click", (e) => this.showModelMenu(e));

    // New chat button
    const clearBtn = actions.createEl("button", {
      cls: "oc-icon-btn",
      attr: { "aria-label": "New chat" },
    });
    setIcon(clearBtn, "plus");
    clearBtn.addEventListener("click", () => this.clearChat());

    // Chat messages area
    this.chatContainer = container.createDiv("oc-messages");

    // Restore chat history or show welcome
    // Auto-clear if history is too large (prevents token overflow)
    const historySize = JSON.stringify(this.plugin.settings.chatHistory).length;
    if (this.plugin.settings.chatHistory.length > 0 && historySize < 500_000) {
      this.messages = [...this.plugin.settings.chatHistory];
      for (const msg of this.messages) {
        await this.renderMessage(msg);
      }
      this.scrollToBottom();
    } else {
      if (historySize >= 500_000) {
        this.plugin.settings.chatHistory = [];
        await this.plugin.saveSettings();
      }
      this.showWelcome();
    }

    // Drag & drop on the entire panel
    const oc = container;
    oc.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.chatContainer.addClass("oc-dragover");
      // Capture Obsidian's internal draggable during dragover
      try {
        const dm = (this.app as any).dragManager;
        if (dm?.draggable) {
          this.capturedDraggable = dm.draggable;
        }
      } catch {}
    });
    oc.addEventListener("dragleave", (e) => {
      const related = e.relatedTarget as Node | null;
      if (!related || !oc.contains(related)) {
        this.chatContainer.removeClass("oc-dragover");
      }
    });
    oc.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.chatContainer.removeClass("oc-dragover");
      this.handleDrop(e);
    });

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
    });

    this.inputEl.addEventListener("keydown", (e) => {
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
    this.sendBtn.addEventListener("click", () => this.handleSend());
  }

  async onClose(): Promise<void> {
    this.plugin.settings.chatHistory = this.messages;
    await this.plugin.saveSettings();
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

  private async handleSend(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text || this.isProcessing) return;

    this.inputEl.value = "";
    this.inputEl.style.height = "auto";
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

    // Render user message
    const userMsg: ChatMessage = {
      role: "user",
      content: fullText,
      timestamp: Date.now(),
    };
    this.messages.push(userMsg);
    await this.renderMessage(userMsg);
    this.scrollToBottom();

    // Create streaming response container
    const responseWrapper = this.chatContainer.createDiv(
      "oc-msg oc-msg-assistant"
    );
    const responseBody = responseWrapper.createDiv("oc-msg-body");

    // Processing indicator
    const procEl = this.createProcessingIndicator(responseBody);

    // Streaming content area
    const contentEl = responseBody.createDiv("oc-msg-content");

    let renderTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastRenderedText = "";

    try {
      const claudeMessages: ClaudeMessage[] = this.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await this.claudeService.chat(claudeMessages, {
        onText: (text: string) => {
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

    this.setProcessing(false);
    this.scrollToBottom();
    this.plugin.settings.chatHistory = this.messages;
    await this.plugin.saveSettings();
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

    // Cycle through fun phases
    let phaseIdx = 0;
    const interval = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % THINKING_PHASES.length;
      label.textContent = THINKING_PHASES[phaseIdx];
    }, 2500);
    (el as any)._interval = interval;
    (el as any)._label = label;
    (el as any)._details = detailsPanel;
    (el as any)._actionCount = 0;

    this.scrollToBottom();
    return el;
  }

  private updateProcessingLabel(procEl: HTMLElement, text: string): void {
    const label = (procEl as any)?._label as HTMLElement | undefined;
    if (!label) return;
    (procEl as any)._actionCount = ((procEl as any)._actionCount || 0) + 1;
    const count = (procEl as any)._actionCount;
    label.textContent = `${text}... (action ${count})`;
    // Stop the phase cycling once tools are running
    const interval = (procEl as any)?._interval;
    if (interval) {
      clearInterval(interval);
      (procEl as any)._interval = null;
    }
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
    logo.createEl("span", { text: "CLAUD", cls: "oc-logo-b" });

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

    // Action buttons: Explore + Analyze
    const actionsRow = w.createDiv("oc-welcome-actions");

    const exploreBtn = actionsRow.createDiv("oc-action-btn oc-action-explore");
    const exploreIcon = exploreBtn.createDiv("oc-action-icon");
    setIcon(exploreIcon, "telescope");
    exploreBtn.createSpan({ text: "Explore vault", cls: "oc-action-text" });
    exploreBtn.addEventListener("click", () => {
      this.inputEl.value =
        "Explore my vault: show the folder structure, all tags, and recently modified notes.";
      this.handleSend();
    });

    const analyzeBtn = actionsRow.createDiv("oc-action-btn oc-action-analyze");
    const analyzeIcon = analyzeBtn.createDiv("oc-action-icon");
    setIcon(analyzeIcon, "bar-chart-2");
    analyzeBtn.createSpan({ text: "Analyze vault", cls: "oc-action-text" });
    analyzeBtn.addEventListener("click", () => {
      this.inputEl.value =
        "Analyze my vault health: find orphan notes, missing backlinks, tag distribution, and suggest improvements.";
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
    } catch {}

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
        "Could not identify items. Try right-click → Send to OBSICLAUD."
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
        } catch {}
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
  // HELPERS
  // ============================================================

  private clearChat(): void {
    this.messages = [];
    this.attachedContexts = [];
    this.chatContainer.empty();
    this.showWelcome();
    this.plugin.settings.chatHistory = [];
    this.plugin.saveSettings();
    this.renderContextBar();
    new Notice("New chat started");
  }

  private setProcessing(processing: boolean): void {
    this.isProcessing = processing;
    this.sendBtn.toggleClass("is-loading", processing);
    this.inputEl.disabled = processing;
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
