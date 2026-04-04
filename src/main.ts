// ============================================================
// OBSICLAUDE - Plugin Entry Point
// ============================================================

import { Plugin, Notice, Editor, MarkdownView, TFile, TFolder, Menu } from "obsidian";
import { ClaudeAssistantSettings, DEFAULT_SETTINGS } from "./types";
import { VaultTools } from "./vault-tools";
import { ClaudeService } from "./claude-service";
import { ChatView, CHAT_VIEW_TYPE } from "./chat-view";
import { ClaudeAssistantSettingTab } from "./settings";
import { EditorActions } from "./editor-actions";

export default class ClaudeAssistantPlugin extends Plugin {
  settings: ClaudeAssistantSettings;
  vaultTools: VaultTools;
  claudeService: ClaudeService;
  editorActions: EditorActions;
  statusBarEl: HTMLElement;
  private sessionTokens = 0;

  async onload(): Promise<void> {
    try {
      await this.loadSettings();
    } catch (e) {
      console.error("OBSICLAUDE: Failed to load settings, using defaults:", e);
      this.settings = { ...DEFAULT_SETTINGS };
    }

    // Ensure the config directory is always excluded
    const configDir = this.app.vault.configDir;
    if (!this.settings.excludedFolders.includes(configDir)) {
      this.settings.excludedFolders.unshift(configDir);
    }

    this.vaultTools = new VaultTools(this.app, () => this.settings);
    this.claudeService = new ClaudeService(this.settings, this.vaultTools);
    this.editorActions = new EditorActions(this.claudeService, this.settings);

    this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this));

    this.addRibbonIcon("sparkles", "Open chat", () => {
      void this.activateChatView();
    });

    this.addSettingTab(new ClaudeAssistantSettingTab(this.app, this));

    // ---- Status bar ----

    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("oc-status-bar");
    this.updateStatusBar();
    this.statusBarEl.addEventListener("click", (e) => {
      const menu = new Menu();
      const models = [
        { id: "claude-sonnet-4-6" as const, label: "Sonnet" },
        { id: "claude-opus-4-6" as const, label: "Opus" },
        { id: "claude-haiku-4-5-20251001" as const, label: "Haiku" },
      ];
      for (const model of models) {
        menu.addItem((item) => {
          item.setTitle(model.label)
            .setChecked(this.settings.model === model.id)
            .onClick(async () => {
              this.settings.model = model.id;
              await this.saveSettings();
              this.updateStatusBar();
            });
        });
      }
      menu.showAtMouseEvent(e);
    });

    // ---- File/Folder context menu: "Send to chat" ----

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file) => {
        if (file instanceof TFile) {
          menu.addItem((item) => {
            item
              .setTitle("Send to chat")
              .setIcon("bot")
              .onClick(async () => {
                await this.activateChatView();
                const view = this.getChatView();
                if (view) view.attachFile(file);
              });
          });
        } else if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle("Send to chat")
              .setIcon("bot")
              .onClick(async () => {
                await this.activateChatView();
                const view = this.getChatView();
                if (view) view.attachFolder(file);
              });
          });
        }
      })
    );

    // ---- Editor right-click AI menu ----

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
        const selection = editor.getSelection();
        if (!selection || !selection.trim()) return;

        menu.addSeparator();

        menu.addItem((item) => {
          item.setTitle("Summarize").setIcon("align-left")
            .onClick(() => { void this.editorActions.summarize(editor); });
        });
        menu.addItem((item) => {
          item.setTitle("Translate").setIcon("languages")
            .onClick(() => { void this.editorActions.translate(editor); });
        });
        menu.addItem((item) => {
          item.setTitle("Improve").setIcon("pen-line")
            .onClick(() => { void this.editorActions.improve(editor); });
        });
        menu.addItem((item) => {
          item.setTitle("Explain").setIcon("lightbulb")
            .onClick(() => { void this.editorActions.explain(editor); });
        });
        menu.addItem((item) => {
          item.setTitle("Ask Claude...").setIcon("message-circle")
            .onClick(() => { void this.editorActions.askClaude(editor, this.app); });
        });
      })
    );

    // ---- Commands ----

    this.addCommand({
      id: "open-chat",
      name: "Open chat",
      callback: () => { void this.activateChatView(); },
    });

    this.addCommand({
      id: "send-active-note",
      name: "Send active note",
      editorCallback: async (_editor: Editor, view: MarkdownView) => {
        if (!view.file) return;
        await this.activateChatView();
        const chatView = this.getChatView();
        if (chatView) chatView.attachFile(view.file);
      },
    });

    this.addCommand({
      id: "summarize-selection",
      name: "Summarize selection",
      editorCallback: async (editor: Editor) => {
        const selection = editor.getSelection();
        if (!selection) { new Notice("No text selected"); return; }
        await this.activateChatView();
        const chatView = this.getChatView();
        if (chatView) await chatView.sendMessage(`Summarize:\n\n${selection}`);
      },
    });

    this.addCommand({
      id: "translate-selection",
      name: "Translate selection",
      editorCallback: async (editor: Editor) => {
        const selection = editor.getSelection();
        if (!selection) { new Notice("No text selected"); return; }
        await this.activateChatView();
        const chatView = this.getChatView();
        if (chatView) {
          const lang = this.settings.language === "ko" ? "English" : "Korean";
          await chatView.sendMessage(`Translate to ${lang}:\n\n${selection}`);
        }
      },
    });

    this.addCommand({
      id: "improve-selection",
      name: "Improve selection",
      editorCallback: async (editor: Editor) => {
        const selection = editor.getSelection();
        if (!selection) { new Notice("No text selected"); return; }
        await this.activateChatView();
        const chatView = this.getChatView();
        if (chatView) await chatView.sendMessage(`Improve this text:\n\n${selection}`);
      },
    });

    this.addCommand({
      id: "analyze-vault",
      name: "Analyze vault",
      callback: async () => {
        await this.activateChatView();
        const chatView = this.getChatView();
        if (chatView) await chatView.sendMessage("Analyze my vault and give me a report.");
      },
    });

    this.addCommand({
      id: "generate-tags",
      name: "Generate tags for active note",
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const content = editor.getValue();
        const name = view.file?.basename || "Untitled";
        await this.activateChatView();
        const chatView = this.getChatView();
        if (chatView) {
          await chatView.sendMessage(
            `Suggest and set tags for "${name}":\n\n${content}`
          );
        }
      },
    });
  }

  onunload(): void {
    // Abort any in-flight API requests
    const view = this.getChatView();
    if (view) {
      // onClose handles cleanup
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async activateChatView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: CHAT_VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  private getChatView(): ChatView | null {
    const leaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
    if (leaves.length === 0) return null;
    return leaves[0].view as ChatView;
  }

  updateStatusBar(): void {
    const modelName = this.settings.model.includes("sonnet") ? "Sonnet"
      : this.settings.model.includes("opus") ? "Opus" : "Haiku";
    const tokenStr = this.sessionTokens > 0
      ? `${this.sessionTokens.toLocaleString()} tokens`
      : "\u2014";
    this.statusBarEl.setText(`${modelName} | ${tokenStr}`);
  }

  addSessionTokens(count: number): void {
    this.sessionTokens += count;
    this.updateStatusBar();
  }

  resetSessionTokens(): void {
    this.sessionTokens = 0;
    this.updateStatusBar();
  }
}
