// ============================================================
// Claude Service - API Communication + Agentic Loop
// ============================================================

import { requestUrl } from "obsidian";
import {
  ClaudeAssistantSettings,
  ClaudeRequest,
  ClaudeMessage,
  ClaudeResponse,
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
const MAX_TOOL_RESULT_CHARS = 80_000; // ~20k tokens per tool result
const MAX_MSG_CHARS = 120_000; // ~30k tokens per single message
const MAX_TOTAL_CHARS = 300_000; // ~75k tokens total conversation

export interface ChatCallbacks {
  onText?: (fullText: string) => void;
  onToolStart?: (toolName: string) => void;
  onToolEnd?: (toolCall: ToolCallInfo) => void;
  signal?: AbortSignal;
  maxTokensOverride?: number;  // For Magic Write (16384)
  timeoutMs?: number;          // Custom timeout (default 180000)
}

export class ClaudeService {
  constructor(
    private settings: ClaudeAssistantSettings,
    private vaultTools: VaultTools
  ) {}

  private buildSystemPrompt(): string {
    const langInstruction = "Respond in the same language the user writes in. If the user writes in Korean, respond in Korean. If they write in English, respond in English. Match the user's language naturally.";

    const base = `You are an AI assistant integrated into Obsidian, a knowledge management app. You help users manage their vault (notes, folders, tags, links) using the available tools.

## Critical Rules
- NEVER pretend you used a tool or describe results you didn't actually get. If you need information, you MUST call the appropriate tool first. Only report results you actually received from tool calls.
- NEVER fabricate file contents, folder structures, note counts, or any vault data. Every piece of vault information you mention must come from an actual tool call in the current conversation.
- If a task requires creating or editing notes, you MUST use create_note or edit_note tools. Describing what you "would do" is NOT acceptable — actually do it.

## Instructions
- ${langInstruction}
- When the user asks to create, edit, search, or organize notes, use the provided tools.
- For complex tasks, break them down and use multiple tools in sequence.
- After using tools, summarize what you did clearly.
- When suggesting links or tags, consider existing vault structure.
- For wikilinks, use the [[note-name]] format.
- Be proactive: if you notice something can be improved (orphan notes, missing tags), suggest it.
- You can read the active note context to understand what the user is working on.

## Frontmatter Rules (ALWAYS APPLY — even when user doesn't mention it)
Every note you create or edit MUST have complete, well-structured YAML frontmatter. This applies to ALL operations: creating notes, rewriting notes, translating notes, Magic Write, or any content generation. The user should NEVER have to ask for frontmatter — it is always included automatically.

### Required fields (always include):
- title: Note title (string)
- date: Creation or publication date (ISO 8601: YYYY-MM-DD)
- tags: Relevant categorization tags (YAML list format, 3-8 tags)
  tags:
    - tag1
    - tag2
- description: One-line summary of the note content
- status: draft | published | review | archived

### Recommended fields (include when applicable):
- created: Creation date if different from date (ISO 8601: YYYY-MM-DD)
- author: Author name (for articles, clippings, external content)
- source: URL or origin (for clippings, references, external content)
- aliases: Alternative names for the note (YAML list)
- category: Content category (e.g., "개발도구", "프로젝트", "학습")
- type: Note type (e.g., "블로그 아티클", "회의록", "리서치", "클리핑")
- cssclasses: Custom CSS classes (YAML list, only if needed)

### Strict rules:
- NEVER set any field to null — omit the field entirely if no value
- Use PLURAL forms: "tags" not "tag", "aliases" not "alias"
- Dates MUST be ISO 8601: YYYY-MM-DD
- Tags must be YAML list (not comma-separated string, not inline array)
- Do NOT invent non-standard fields (no "license", "language", "related", "mood", "inspiration") unless user explicitly requests them
- When rewriting or translating a note to another language: TRANSLATE the title, description, tags, category, and type fields to the target language. Keep date, author, source fields as-is. The title MUST be translated — never leave it in the original language when the user asks for translation or rewriting in a different language

## User's Frontmatter Template (merge with above)
${JSON.stringify(this.settings.frontmatterTemplate, null, 2)}

## Excluded Folders (do not modify files in these)
${this.settings.excludedFolders.join(", ")}`;

    if (this.settings.systemPrompt) {
      return base + "\n\n## Custom Instructions\n" + this.settings.systemPrompt;
    }
    return base;
  }

  /**
   * Main entry: agentic loop with tool execution.
   */
  async chat(
    conversationMessages: ClaudeMessage[],
    callbacks?: ChatCallbacks
  ): Promise<{ text: string; toolCalls: ToolCallInfo[]; totalUsage: { input_tokens: number; output_tokens: number } }> {
    if (!this.settings.apiKey) {
      throw new Error(
        "API key not configured. Go to Settings → OBSICLAUDE to set your API key."
      );
    }

    const tools = this.vaultTools.getToolDefinitions();
    // Trim conversation to fit token limits
    const messages = this.trimMessages(conversationMessages);
    const maxTokens = callbacks?.maxTokensOverride || this.settings.maxTokens;
    const allToolCalls: ToolCallInfo[] = [];
    let fullText = "";
    let iterations = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      // Check for abort
      if (callbacks?.signal?.aborted) {
        fullText += "\n\n*(Stopped by user)*";
        break;
      }

      let response = await this.callAPI(messages, tools, maxTokens, callbacks?.timeoutMs);
      totalInputTokens += response.usage?.input_tokens || 0;
      totalOutputTokens += response.usage?.output_tokens || 0;

      const textBlocks = response.content
        .filter((b): b is ClaudeTextBlock => b.type === "text")
        .map((b) => b.text);
      const iterText = textBlocks.join("\n");
      if (iterText) {
        fullText += iterText;
        callbacks?.onText?.(fullText);
      }

      // Auto-continue if response was truncated
      if (response.stop_reason === "max_tokens") {
        let continuations = 0;
        while (response.stop_reason === "max_tokens" && continuations < 3) {
          continuations++;
          console.debug(`OBSICLAUDE: auto-continue ${continuations}/3`);
          callbacks?.onText?.(fullText + "\n\n*(continuing...)*");

          messages.push({ role: "assistant", content: response.content });
          messages.push({
            role: "user",
            content: "Continue writing from exactly where you stopped. Do not repeat any content.",
          });

          response = await this.callAPI(messages, tools, maxTokens, callbacks?.timeoutMs);
          totalInputTokens += response.usage?.input_tokens || 0;
          totalOutputTokens += response.usage?.output_tokens || 0;

          const contText = response.content
            .filter((b): b is ClaudeTextBlock => b.type === "text")
            .map((b) => b.text)
            .join("\n");
          if (contText) {
            fullText += contText;
            callbacks?.onText?.(fullText);
          }
        }

        if (response.stop_reason === "max_tokens") {
          fullText += "\n\n> Response was very long and may be incomplete. Try breaking into smaller requests.";
        }

        if (response.stop_reason !== "tool_use") {
          break;
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
        if (callbacks?.signal?.aborted) break;
        callbacks?.onToolStart?.(toolUse.name);

        let result = await this.vaultTools.executeTool(
          toolUse.name,
          toolUse.input
        );

        // Truncate large tool results to prevent token overflow
        if (result.length > MAX_TOOL_RESULT_CHARS) {
          result = result.slice(0, MAX_TOOL_RESULT_CHARS) +
            "\n\n...(truncated — result too large, showing first portion)";
        }

        const tc: ToolCallInfo = {
          toolName: toolUse.name,
          input: toolUse.input,
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

    return {
      text: fullText,
      toolCalls: allToolCalls,
      totalUsage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
    };
  }

  /**
   * Non-streaming API call using Obsidian's requestUrl
   */
  private async callAPI(
    messages: ClaudeMessage[],
    tools: ClaudeTool[],
    maxTokens?: number,
    timeoutMs?: number
  ): Promise<ClaudeResponse> {
    const body: ClaudeRequest = {
      model: this.settings.model,
      max_tokens: maxTokens || this.settings.maxTokens,
      system: this.buildSystemPrompt(),
      messages,
      tools,
    };

    const DEFAULT_TIMEOUT = 180_000; // 3 minutes
    const timeout = timeoutMs || DEFAULT_TIMEOUT;

    const response = await Promise.race([
      requestUrl({
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
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out — the response took too long. Try a simpler request or increase timeout.")), timeout)
      ),
    ]);

    if (response.status === 429) {
      throw new Error("Rate limited — please wait a moment and try again.");
    }
    if (response.status === 529) {
      throw new Error("Claude is busy — please try again in a moment.");
    }
    if (response.status !== 200) {
      const errorBody = response.json;
      const errorMsg =
        errorBody?.error?.message || `API error: ${response.status}`;
      console.error("OBSICLAUDE API error:", response.status, errorBody);
      throw new Error(errorMsg);
    }

    const parsed = response.json as ClaudeResponse;
    console.debug("OBSICLAUDE API response:", parsed.stop_reason, "blocks:", parsed.content?.length, "usage:", parsed.usage);
    return parsed;
  }

  /**
   * Trim conversation to stay within token limits.
   * Also truncates individual messages that are too large.
   */
  private trimMessages(messages: ClaudeMessage[]): ClaudeMessage[] {
    const estimateChars = (msg: ClaudeMessage): number => {
      if (typeof msg.content === "string") return msg.content.length;
      if (Array.isArray(msg.content)) {
        return msg.content.reduce((sum, block) => {
          if (block.type === "text") return sum + block.text.length;
          if (block.type === "tool_use") return sum + JSON.stringify(block.input).length + 200;
          if (block.type === "tool_result") return sum + (block.content?.length || 0);
          return sum + 200;
        }, 0);
      }
      return 200;
    };

    // Step 1: Truncate individual messages that are too long
    const truncated: ClaudeMessage[] = messages.map((msg) => {
      if (typeof msg.content === "string" && msg.content.length > MAX_MSG_CHARS) {
        return {
          ...msg,
          content: msg.content.slice(0, MAX_MSG_CHARS) + "\n...(truncated)",
        };
      }
      // Truncate tool_result blocks inside array content
      if (Array.isArray(msg.content)) {
        const newContent = msg.content.map((block) => {
          if (block.type === "tool_result") {
            if (block.content && block.content.length > MAX_TOOL_RESULT_CHARS) {
              return { ...block, content: block.content.slice(0, MAX_TOOL_RESULT_CHARS) + "\n...(truncated)" };
            }
          }
          return block;
        });
        return { ...msg, content: newContent };
      }
      return msg;
    });

    // Step 2: Keep only recent messages that fit in budget
    let totalChars = 0;
    const result: ClaudeMessage[] = [];

    for (let i = truncated.length - 1; i >= 0; i--) {
      const chars = estimateChars(truncated[i]);
      if (totalChars + chars > MAX_TOTAL_CHARS && result.length > 0) {
        break;
      }
      totalChars += chars;
      result.unshift(truncated[i]);
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
