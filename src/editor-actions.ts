// ============================================================
// Editor Actions — Right-Click AI Menu
// ============================================================

import { Editor, Notice, Modal, App } from "obsidian";
import { ClaudeService } from "./claude-service";

const MAX_SELECTION_CHARS = 10_000;

export class EditorActions {
  constructor(
    private claudeService: ClaudeService,
    private settings: { language: string }
  ) {}

  private getSelection(editor: Editor): string | null {
    const selection = editor.getSelection();
    if (!selection || !selection.trim()) return null;
    if (selection.length > MAX_SELECTION_CHARS) {
      new Notice("Selection truncated to 10,000 characters for AI processing.");
      return selection.slice(0, MAX_SELECTION_CHARS);
    }
    return selection;
  }

  private detectLanguage(text: string): "ko" | "en" {
    const koreanRegex = /[\uAC00-\uD7AF]/;
    return koreanRegex.test(text) ? "ko" : "en";
  }

  async summarize(editor: Editor): Promise<void> {
    const selection = this.getSelection(editor);
    if (!selection) return;
    await this.runAction(editor, `Summarize this text concisely:\n\n${selection}`, "below");
  }

  async translate(editor: Editor): Promise<void> {
    const selection = this.getSelection(editor);
    if (!selection) return;
    const sourceLang = this.detectLanguage(selection);
    const targetLang = sourceLang === "ko" ? "English" : "Korean";
    await this.runAction(editor, `Translate to ${targetLang}:\n\n${selection}`, "below");
  }

  async improve(editor: Editor): Promise<void> {
    const selection = this.getSelection(editor);
    if (!selection) return;
    await this.runAction(editor, `Improve this text — better clarity, flow, grammar. Return ONLY the improved text, no explanations:\n\n${selection}`, "replace");
  }

  async explain(editor: Editor): Promise<void> {
    const selection = this.getSelection(editor);
    if (!selection) return;
    await this.runAction(editor, `Explain this in simple terms:\n\n${selection}`, "below");
  }

  async askClaude(editor: Editor, app: App): Promise<void> {
    const selection = this.getSelection(editor);
    if (!selection) return;

    const prompt = await this.showPromptModal(app);
    if (!prompt) return;

    await this.runAction(editor, `${prompt}\n\nText:\n${selection}`, "below");
  }

  private async runAction(
    editor: Editor,
    prompt: string,
    mode: "below" | "replace"
  ): Promise<void> {
    new Notice("AI processing...");
    try {
      const result = await this.claudeService.quickAction(prompt);
      if (!result || !result.trim()) {
        new Notice("Claude returned an empty response.");
        return;
      }

      if (mode === "replace") {
        editor.replaceSelection(result.trim());
      } else {
        // Insert below selection
        const cursor = editor.getCursor("to");
        const lineEnd = editor.getLine(cursor.line).length;
        editor.replaceRange(
          "\n\n" + result.trim() + "\n",
          { line: cursor.line, ch: lineEnd }
        );
      }
      new Notice("Done!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      new Notice(`AI error: ${msg}`);
    }
  }

  private showPromptModal(app: App): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new AskClaudeModal(app, resolve);
      modal.open();
    });
  }
}

class AskClaudeModal extends Modal {
  private resolve: (value: string | null) => void;

  constructor(app: App, resolve: (value: string | null) => void) {
    super(app);
    this.resolve = resolve;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("oc-ask-modal");

    contentEl.createEl("h3", { text: "Ask Claude" });
    const textarea = contentEl.createEl("textarea", {
      cls: "oc-ask-textarea",
      attr: { placeholder: "What should Claude do with this text?", rows: "3" },
    });

    const footer = contentEl.createDiv("oc-ask-footer");
    const sendBtn = footer.createEl("button", { text: "Send", cls: "oc-ask-send" });

    sendBtn.addEventListener("click", () => {
      const value = textarea.value.trim();
      if (value) {
        this.resolve(value);
        this.close();
      }
    });

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        const value = textarea.value.trim();
        if (value) {
          this.resolve(value);
          this.close();
        }
      }
    });

    setTimeout(() => textarea.focus(), 50);
  }

  onClose(): void {
    this.resolve(null);
    this.contentEl.empty();
  }
}
