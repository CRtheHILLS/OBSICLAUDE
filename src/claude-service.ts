// ============================================================
// Claude Service - API Communication + Streaming + Agentic Loop
// ============================================================

import { requestUrl } from "obsidian";
import {
  ClaudeAssistantSettings,
  ClaudeRequest,
  ClaudeMessage,
  ClaudeResponse,
  ClaudeContent,
  ClaudeTextBlock,
  ClaudeToolUseBlock,
  ClaudeToolResultBlock,
  ClaudeTool,
  ToolCallInfo,
} from "./types";
import { VaultTools } from "./vault-tools";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const MAX_TOOL_ITERATIONS = 15;

export interface ChatCallbacks {
  onText?: (fullText: string) => void;
  onToolStart?: (toolName: string) => void;
  onToolEnd?: (toolCall: ToolCallInfo) => void;
}

export class ClaudeService {
  constructor(
    private settings: ClaudeAssistantSettings,
    private vaultTools: VaultTools
  ) {}

  private buildSystemPrompt(): string {
    const langMap: Record<string, string> = {
      en: "Respond in English.",
      ko: "한국어로 답변하세요.",
      ja: "日本語で回答してください。",
      de: "Antworte auf Deutsch.",
      zh: "请用中文回答。",
    };

    const langInstruction = langMap[this.settings.language] || langMap.en;

    const base = `You are an AI assistant integrated into Obsidian, a knowledge management app. You help users manage their vault (notes, folders, tags, links) using the available tools.

## Instructions
- ${langInstruction}
- When the user asks to create, edit, search, or organize notes, use the provided tools.
- For complex tasks, break them down and use multiple tools in sequence.
- After using tools, summarize what you did clearly.
- When suggesting links or tags, consider existing vault structure.
- For wikilinks, use the [[note-name]] format.
- Be proactive: if you notice something can be improved (orphan notes, missing tags), suggest it.
- You can read the active note context to understand what the user is working on.

## Frontmatter Template
${JSON.stringify(this.settings.frontmatterTemplate, null, 2)}

## Excluded Folders (do not modify files in these)
${this.settings.excludedFolders.join(", ")}`;

    if (this.settings.systemPrompt) {
      return base + "\n\n## Custom Instructions\n" + this.settings.systemPrompt;
    }
    return base;
  }

  /**
   * Main entry: agentic loop with streaming text output.
   */
  async chat(
    conversationMessages: ClaudeMessage[],
    callbacks?: ChatCallbacks
  ): Promise<{ text: string; toolCalls: ToolCallInfo[] }> {
    if (!this.settings.apiKey) {
      throw new Error(
        "API key not configured. Go to Settings → OBSICLAUD to set your API key."
      );
    }

    const tools = this.vaultTools.getToolDefinitions();
    // Trim conversation to fit token limits
    const messages = this.trimMessages(conversationMessages);
    const allToolCalls: ToolCallInfo[] = [];
    let fullText = "";
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      // Try streaming first, fall back to non-streaming
      let response: ClaudeResponse;
      try {
        response = await this.callAPIStream(messages, tools, (delta) => {
          fullText += delta;
          callbacks?.onText?.(fullText);
        });
      } catch (streamErr) {
        // Fallback to non-streaming if fetch/streaming fails
        response = await this.callAPI(messages, tools);
        const textBlocks = response.content
          .filter((b): b is ClaudeTextBlock => b.type === "text")
          .map((b) => b.text);
        const iterText = textBlocks.join("\n");
        if (iterText) {
          fullText += iterText;
          callbacks?.onText?.(fullText);
        }
      }

      // Done if no tool calls
      if (response.stop_reason !== "tool_use") {
        break;
      }

      // Add separator before next iteration's text
      if (fullText && fullText.trim()) {
        fullText += "\n\n";
      }

      // Add assistant message to conversation
      messages.push({ role: "assistant", content: response.content });

      // Execute tools
      const toolUseBlocks = response.content.filter(
        (b): b is ClaudeToolUseBlock => b.type === "tool_use"
      );
      const toolResults: ClaudeToolResultBlock[] = [];

      for (const toolUse of toolUseBlocks) {
        callbacks?.onToolStart?.(toolUse.name);

        const result = await this.vaultTools.executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );

        const tc: ToolCallInfo = {
          toolName: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          result,
        };
        allToolCalls.push(tc);
        callbacks?.onToolEnd?.(tc);

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      messages.push({ role: "user", content: toolResults });
    }

    if (iterations >= MAX_TOOL_ITERATIONS) {
      fullText += "\n\n> Maximum tool iterations reached. Some tasks may be incomplete.";
    }

    return { text: fullText, toolCalls: allToolCalls };
  }

  /**
   * Streaming API call using fetch + SSE parsing
   */
  private async callAPIStream(
    messages: ClaudeMessage[],
    tools: ClaudeTool[],
    onTextDelta: (text: string) => void
  ): Promise<ClaudeResponse> {
    const body: ClaudeRequest = {
      model: this.settings.model,
      max_tokens: this.settings.maxTokens,
      system: this.buildSystemPrompt(),
      messages,
      tools,
      stream: true,
    };

    const resp = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.settings.apiKey,
        "anthropic-version": API_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      let msg = `API error: ${resp.status}`;
      try {
        const err = await resp.json();
        msg = err?.error?.message || msg;
      } catch {}
      throw new Error(msg);
    }

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const contentBlocks: ClaudeContent[] = [];
    let curText: { type: "text"; text: string } | null = null;
    let curTool: {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
      _json: string;
    } | null = null;
    let stopReason = "end_turn";
    let messageId = "";
    let usage = { input_tokens: 0, output_tokens: 0 };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const evt = JSON.parse(data);
          switch (evt.type) {
            case "message_start":
              messageId = evt.message?.id || "";
              usage = evt.message?.usage || usage;
              break;

            case "content_block_start":
              if (evt.content_block.type === "text") {
                curText = { type: "text", text: "" };
              } else if (evt.content_block.type === "tool_use") {
                curTool = {
                  type: "tool_use",
                  id: evt.content_block.id,
                  name: evt.content_block.name,
                  input: {},
                  _json: "",
                };
              }
              break;

            case "content_block_delta":
              if (evt.delta.type === "text_delta" && curText) {
                curText.text += evt.delta.text;
                onTextDelta(evt.delta.text);
              } else if (
                evt.delta.type === "input_json_delta" &&
                curTool
              ) {
                curTool._json += evt.delta.partial_json;
              }
              break;

            case "content_block_stop":
              if (curText) {
                contentBlocks.push(curText);
                curText = null;
              } else if (curTool) {
                try {
                  curTool.input = JSON.parse(curTool._json || "{}");
                } catch {
                  curTool.input = {};
                }
                const { _json, ...clean } = curTool;
                contentBlocks.push(clean as ClaudeToolUseBlock);
                curTool = null;
              }
              break;

            case "message_delta":
              stopReason = evt.delta?.stop_reason || stopReason;
              if (evt.usage) usage = { ...usage, ...evt.usage };
              break;
          }
        } catch {}
      }
    }

    return {
      id: messageId,
      type: "message",
      role: "assistant",
      content: contentBlocks,
      stop_reason: stopReason as ClaudeResponse["stop_reason"],
      usage,
    };
  }

  /**
   * Non-streaming fallback using Obsidian's requestUrl
   */
  private async callAPI(
    messages: ClaudeMessage[],
    tools: ClaudeTool[]
  ): Promise<ClaudeResponse> {
    const body: ClaudeRequest = {
      model: this.settings.model,
      max_tokens: this.settings.maxTokens,
      system: this.buildSystemPrompt(),
      messages,
      tools,
    };

    const response = await requestUrl({
      url: CLAUDE_API_URL,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.settings.apiKey,
        "anthropic-version": API_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
      throw: false,
    });

    if (response.status !== 200) {
      const errorBody = response.json;
      const errorMsg =
        errorBody?.error?.message || `API error: ${response.status}`;
      throw new Error(errorMsg);
    }

    return response.json as ClaudeResponse;
  }

  /**
   * Trim conversation messages to stay within token limits.
   * Rough estimate: 1 token ~ 4 chars. Keep under ~150k tokens to leave room.
   */
  private trimMessages(messages: ClaudeMessage[]): ClaudeMessage[] {
    const MAX_CHARS = 500_000; // ~125k tokens, safe margin under 200k limit

    const estimateChars = (msg: ClaudeMessage): number => {
      if (typeof msg.content === "string") return msg.content.length;
      if (Array.isArray(msg.content)) {
        return msg.content.reduce((sum, block) => {
          if (block.type === "text") return sum + (block as ClaudeTextBlock).text.length;
          if (block.type === "tool_use") return sum + JSON.stringify((block as ClaudeToolUseBlock).input).length + 200;
          if (block.type === "tool_result") return sum + ((block as ClaudeToolResultBlock).content?.length || 0);
          return sum + 200;
        }, 0);
      }
      return 200;
    };

    // Always keep the last (most recent) user message
    let totalChars = 0;
    const result: ClaudeMessage[] = [];

    // Walk from newest to oldest, always keep the last message
    for (let i = messages.length - 1; i >= 0; i--) {
      const chars = estimateChars(messages[i]);
      if (totalChars + chars > MAX_CHARS && result.length > 0) {
        break; // Stop adding older messages
      }
      totalChars += chars;
      result.unshift(messages[i]);
    }

    // Ensure conversation starts with a user message
    while (result.length > 0 && result[0].role !== "user") {
      result.shift();
    }

    return result;
  }

  async quickAction(prompt: string, context?: string): Promise<string> {
    const messages: ClaudeMessage[] = [
      {
        role: "user",
        content: context
          ? `Context:\n${context}\n\nTask: ${prompt}`
          : prompt,
      },
    ];
    const result = await this.chat(messages);
    return result.text;
  }
}
