// ============================================================
// Settings Tab - Plugin Configuration UI
// ============================================================

import { App, PluginSettingTab, Setting } from "obsidian";
import type ClaudeAssistantPlugin from "./main";

export class ClaudeAssistantSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: ClaudeAssistantPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "OBSICLAUD Settings" });

    // ---- API Configuration ----
    containerEl.createEl("h3", { text: "API Configuration" });

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("Your Anthropic API key. Get one at console.anthropic.com")
      .addText((text) =>
        text
          .setPlaceholder("sk-ant-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
      )
      .then((setting) => {
        const inputEl = setting.controlEl.querySelector("input");
        if (inputEl) inputEl.type = "password";
      });

    new Setting(containerEl)
      .setName("Model")
      .setDesc("Claude model to use for responses")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("claude-sonnet-4-6", "Claude Sonnet 4.6 (Fast, recommended)")
          .addOption("claude-opus-4-6", "Claude Opus 4.6 (Most capable)")
          .addOption("claude-haiku-4-5-20251001", "Claude Haiku 4.5 (Fastest, cheapest)")
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value as typeof this.plugin.settings.model;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Max Tokens")
      .setDesc("Maximum tokens in Claude's response (higher = longer responses)")
      .addSlider((slider) =>
        slider
          .setLimits(1024, 8192, 512)
          .setValue(this.plugin.settings.maxTokens)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxTokens = value;
            await this.plugin.saveSettings();
          })
      );

    // ---- Language & Behavior ----
    containerEl.createEl("h3", { text: "Language & Behavior" });

    new Setting(containerEl)
      .setName("Language")
      .setDesc("Language for Claude's responses")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("en", "English")
          .addOption("ko", "한국어")
          .addOption("ja", "日本語")
          .addOption("de", "Deutsch")
          .addOption("zh", "中文")
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as typeof this.plugin.settings.language;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Custom System Prompt")
      .setDesc(
        "Additional instructions for Claude. Appended to the default system prompt."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder(
            "e.g., Always use bullet points. Prefer Korean tags."
          )
          .setValue(this.plugin.settings.systemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.systemPrompt = value;
            await this.plugin.saveSettings();
          })
      )
      .then((setting) => {
        const textarea = setting.controlEl.querySelector("textarea");
        if (textarea) {
          textarea.style.width = "100%";
          textarea.style.height = "100px";
        }
      });

    // ---- Vault Configuration ----
    containerEl.createEl("h3", { text: "Vault Configuration" });

    new Setting(containerEl)
      .setName("Excluded Folders")
      .setDesc(
        "Folders that Claude should not modify (comma-separated). e.g. .obsidian, .trash, templates"
      )
      .addText((text) =>
        text
          .setPlaceholder(".obsidian, .trash")
          .setValue(this.plugin.settings.excludedFolders.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.excludedFolders = value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );

    // ---- Frontmatter Template ----
    containerEl.createEl("h3", { text: "Frontmatter Template" });

    new Setting(containerEl)
      .setName("Default Frontmatter")
      .setDesc(
        'JSON template for new notes. Use {{date}} for current date. e.g. {"created": "{{date}}", "tags": []}'
      )
      .addTextArea((text) =>
        text
          .setPlaceholder('{"created": "{{date}}", "tags": []}')
          .setValue(
            JSON.stringify(this.plugin.settings.frontmatterTemplate, null, 2)
          )
          .onChange(async (value) => {
            try {
              this.plugin.settings.frontmatterTemplate = JSON.parse(value);
              await this.plugin.saveSettings();
            } catch {
              // Invalid JSON, don't save
            }
          })
      )
      .then((setting) => {
        const textarea = setting.controlEl.querySelector("textarea");
        if (textarea) {
          textarea.style.width = "100%";
          textarea.style.height = "80px";
          textarea.style.fontFamily = "monospace";
        }
      });

    // ---- Data ----
    containerEl.createEl("h3", { text: "Data" });

    new Setting(containerEl)
      .setName("Clear Chat History")
      .setDesc("Remove all saved chat messages")
      .addButton((btn) =>
        btn
          .setButtonText("Clear")
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.chatHistory = [];
            await this.plugin.saveSettings();
            new (await import("obsidian")).Notice("Chat history cleared");
          })
      );
  }
}
