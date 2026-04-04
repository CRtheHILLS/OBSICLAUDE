// ============================================================
// Obsidian Claude Assistant - Type Definitions
// ============================================================

/** Plugin settings stored in data.json */
export interface QuickPrompt {
  text: string;
  count: number;
  pinned: boolean;
}

export interface ClaudeAssistantSettings {
  apiKey: string;
  model: "claude-sonnet-4-6" | "claude-opus-4-6" | "claude-haiku-4-5-20251001";
  language: "en" | "ko" | "ja" | "de" | "zh" | "es" | "fr";
  maxTokens: number;
  systemPrompt: string;
  excludedFolders: string[];
  frontmatterTemplate: Record<string, string>;
  chatHistory: ChatMessage[];
  quickPrompts: QuickPrompt[];
}

export const DEFAULT_SETTINGS: ClaudeAssistantSettings = {
  apiKey: "",
  model: "claude-sonnet-4-6",
  language: "en",
  maxTokens: 8192,
  systemPrompt: "",
  excludedFolders: [".trash"],
  frontmatterTemplate: {
    created: "{{date}}",
    tags: "[]",
  },
  chatHistory: [],
  quickPrompts: [],
};

// ---- Chat Types ----

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  toolName: string;
  input: Record<string, unknown>;
  result: string;
}

// ---- Claude API Types ----

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: ClaudeMessage[];
  tools?: ClaudeTool[];
  stream?: boolean;
}

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: ClaudeContent[] | string;
}

export type ClaudeContent =
  | ClaudeTextBlock
  | ClaudeToolUseBlock
  | ClaudeToolResultBlock;

export interface ClaudeTextBlock {
  type: "text";
  text: string;
}

export interface ClaudeToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: ClaudeContent[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  usage: { input_tokens: number; output_tokens: number };
}

// ---- Tool Definitions ----

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ---- Vault analysis ----

export interface VaultAnalysis {
  totalNotes: number;
  totalFolders: number;
  orphanNotes: string[];
  tagDistribution: Record<string, number>;
  recentlyModified: string[];
  largestNotes: { path: string; size: number }[];
}

