// ============================================================
// OBSICLAUDE - Plugin Entry Point
// ============================================================

import { Plugin, Notice, Editor, MarkdownView, TFile, TFolder, Menu } from "obsidian";
import { ClaudeAssistantSettings, DEFAULT_SETTINGS } from "./types";
import { VaultTools } from "./vault-tools";
import { ClaudeService } from "./claude-service";
import { ChatView, CHAT_VIEW_TYPE } from "./chat-view";
import { ClaudeAssistantSettingTab } from "./settings";

export default class ClaudeAssistantPlugin extends Plugin {
  settings: ClaudeAssistantSettings;
  vaultTools: VaultTools;
  claudeService: ClaudeService;

  async onload(): Promise<void> {
    try {
      await this.loadSettings();
    } catch (e) {
      console.error("OBSICLAUDE: Failed to load settings, using defaults:", e);
      this.settings = { ...DEFAULT_SETTINGS };
    }

    this.vaultTools = new VaultTools(this.app, () => this.settings);
    this.claudeService = new ClaudeService(this.settings, this.vaultTools);

    this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this));

    this.addRibbonIcon("sparkles", "Open OBSICLAUDE", () => {
      this.activateChatView();
    });

    this.addSettingTab(new ClaudeAssistantSettingTab(this.app, this));

    // ---- File/Folder context menu: "Send to OBSICLAUDE" ----

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file) => {
        if (file instanceof TFile) {
          menu.addItem((item) => {
            item
              .setTitle("Send to OBSICLAUDE")
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
              .setTitle("Send to OBSICLAUDE")
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

    // ---- Commands ----

    this.addCommand({
      id: "open-chat",
      name: "Open OBSICLAUDE Chat",
      callback: () => this.activateChatView(),
    });

    this.addCommand({
      id: "send-active-note",
      name: "Send active note to OBSICLAUDE",
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
}
