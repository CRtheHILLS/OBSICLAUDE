<h1 align="center">OBSICLAUDE</h1>

<p align="center">
  <strong>AI-powered vault assistant for Obsidian — powered by Claude.</strong><br />
  <em>Chat naturally. Claude does the rest.</em>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#usage">Usage</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#vault-tools-20">Tools</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/obsidian-1.0.0+-purple" alt="Obsidian" />
  <img src="https://img.shields.io/badge/Claude-Sonnet%20%7C%20Opus%20%7C%20Haiku-orange" alt="Models" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/languages-5-yellow" alt="Languages" />
</p>

<p align="center">
  <strong>The first Obsidian plugin that lets Claude <em>actually touch</em> your vault.</strong><br />
  Not just chat — create notes, move files, find orphans, build MOCs, batch-edit frontmatter, and more.<br />
  All through natural conversation. All local. All streaming.
</p>

---

## Why OBSICLAUDE?

Most AI plugins for Obsidian are glorified chatbots — they read your notes and generate text. That's it.

**OBSICLAUDE is different.** It gives Claude 20 real tools to **read, write, search, organize, and analyze** your vault. It runs an agentic loop: Claude thinks, picks a tool, observes the result, and repeats — autonomously — until the job is done. Just like an AI coding assistant, but for your knowledge base.

> "Create an index note that links all my orphan notes by topic."

Claude will: find orphans → read each one → categorize → create the index → add wikilinks. All in one go.

---

<!-- TODO: Add demo GIF -->
<!-- <p align="center"><img src="assets/demo.gif" alt="OBSICLAUDE Demo" width="700" /></p> -->

## Features

### Agentic AI Loop
Claude doesn't just answer questions. It autonomously plans and executes multi-step vault operations using **20 tools** — create, read, edit, delete, move, search, analyze tags, find backlinks, detect orphans, spot duplicates, and more. It thinks, acts, observes, and loops until the job is done. This is the same **ReAct (Reason + Act)** pattern behind AI coding assistants like Cursor and Claude Code.

### Real-Time Streaming
Responses stream in token-by-token with a live processing indicator showing exactly what Claude is doing — which tools it's calling, how many actions completed. No waiting for a wall of text.

### Drag & Drop Context
Drag files or entire folders from Obsidian's file explorer directly into the chat. OBSICLAUDE attaches them as context chips, so Claude knows exactly what you're referring to. 5 different resolution methods ensure drag & drop works across all platforms.

### Slash Commands
Quick actions at your fingertips:

| Command | What it does |
|---------|-------------|
| `/explore` | High-level overview of your vault structure |
| `/analyze` | Deep health check — orphans, missing links, tag distribution |
| `/tags` | Tag taxonomy with usage counts |
| `/orphans` | Find notes with no incoming or outgoing links |
| `/recent` | Recently modified notes |
| `/search` | Full-text search across your entire vault |
| `/duplicates` | Detect duplicate or near-duplicate content |
| `/links` | Suggest links between related but unconnected notes |

### Stop & Follow-Up
- **Stop button + ESC** — interrupt Claude mid-thought at any time
- **Follow-up messages** — send corrections or additional context while Claude is still processing. Messages queue up and execute in order

### Multi-Model Support
Switch between **Claude Sonnet** (fast), **Opus** (deep), and **Haiku** (light) from the chat header. Pick the right model for the job — quick vault search vs. deep reorganization.

### 5 Languages
Full UI in English, Korean (한국어), Japanese (日本語), German (Deutsch), and Chinese (中文).

### Privacy & Security
- **Excluded folder protection** — mark folders as off-limits, enforced server-side
- **All tools run locally** — nothing touches your files except Obsidian's own API
- **Direct to Anthropic** — no middleman servers, no telemetry, no data collection
- **Your API key, your data** — OBSICLAUDE never phones home

### Beautiful, Native UI
Excalidraw-inspired interface with a crystal mascot. Dark and light theme support. Processing indicator with expandable tool call details. Copy button on every response. Feels like it belongs in Obsidian.

---

## Installation

### Quick Install (BRAT)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) in Obsidian
2. Open BRAT settings → **Add Beta Plugin**
3. Enter: `CRtheHILLS/obsiclaude`
4. Enable OBSICLAUDE in Community Plugins
5. Set your **Anthropic API key** in OBSICLAUDE settings

### Manual Install

1. Download `main.js`, `styles.css`, `manifest.json` from the [Releases](https://github.com/CRtheHILLS/obsiclaude/releases) page
2. Create `.obsidian/plugins/obsiclaude/` in your vault
3. Copy the three files into that folder
4. Enable **OBSICLAUDE** in Settings → Community Plugins
5. Enter your **Anthropic API key** in OBSICLAUDE settings

### Build from Source

```bash
git clone https://github.com/CRtheHILLS/obsiclaude.git
cd obsiclaude
npm install
npm run build
```

Copy `main.js`, `styles.css`, and `manifest.json` to your vault's plugin folder.

---

## Quick Start

1. **Open the panel** — Click the ✨ sparkle icon in the left ribbon
2. **Get your API key** — Go to [console.anthropic.com](https://console.anthropic.com/) → API Keys → Create
3. **Paste it** in OBSICLAUDE settings
4. **Start chatting** — or click "Explore vault" on the welcome screen

That's it. No config files, no YAML setup, no templates to install.

---

## Usage

### Talk naturally

Ask Claude to do anything with your vault:

> "Create a new MOC for all my project notes and link them together."

> "Find all orphan notes and suggest where they should be linked."

> "Summarize everything I wrote last week."

> "Organize all notes in the inbox folder by moving them to topic folders."

> "Add `status: review` frontmatter to every note in the drafts folder."

> "What are the most common tags in my vault? Show me a breakdown."

### Drag and drop

Drop files or folders from the sidebar into the chat. Context chips appear above the input — Claude will read them before responding.

### Slash commands

Type `/` for instant actions. No typing required — just pick from the menu.

### Model switching

Click the model name in the chat header (e.g., "Sonnet") to switch between models mid-conversation.

---

## Architecture

OBSICLAUDE uses an **agentic loop** — the same ReAct pattern behind advanced AI coding assistants:

```
User Message
    ↓
┌─────────────────────────┐
│  Claude thinks & plans  │
│         ↓               │
│  Selects a tool         │──→  20 vault tools (read, write, search, etc.)
│         ↓               │
│  Observes the result    │
│         ↓               │
│  Decides: done, or      │
│  use another tool?      │──→  loops back if more work needed (up to 15 iterations)
└─────────────────────────┘
    ↓
Final Response to User
```

### Technical Highlights

- **Streaming SSE** with fallback to non-streaming via Obsidian's `requestUrl`
- **Token overflow prevention** — automatic conversation trimming, tool result truncation, history size limits
- **Robust drag & drop** — 5 resolution methods (Obsidian drag manager, DataTransfer, URI parsing, filename matching)
- **Follow-up queue** — FIFO message queue processes follow-ups sequentially after current task completes
- **Zero dependencies** — only Obsidian API + Anthropic API. No LangChain, no vector DB, no local model

---

## Vault Tools (20)

| Tool | Description |
|------|-------------|
| `create_note` | Create notes with content, frontmatter, and wikilinks |
| `read_note` | Read note content and metadata |
| `edit_note` | Replace, append, prepend, or find-and-replace in notes |
| `delete_note` | Move notes to system trash safely |
| `move_note` | Move or rename notes |
| `list_files` | Browse vault directory structure |
| `create_folder` | Create new folders |
| `search_notes` | Full-text search by content, title, or tags |
| `get_frontmatter` | Read YAML frontmatter metadata |
| `set_frontmatter` | Update or add frontmatter fields |
| `get_backlinks` | Find all notes linking TO a specific note |
| `get_outgoing_links` | List all wikilinks FROM a note |
| `analyze_vault` | Full vault statistics — note count, folder count, tag distribution |
| `find_orphan_notes` | Detect notes with no incoming or outgoing links |
| `suggest_links` | AI-powered link recommendations between related notes |
| `batch_frontmatter` | Bulk update frontmatter across multiple notes at once |
| `find_duplicate_notes` | Detect similar note titles and potential duplicates |
| `get_active_note` | Get the currently open note in the editor |
| `open_note` | Open any note in the Obsidian editor |
| `get_all_tags` | Tag usage statistics across the entire vault |

---

## Comparison

| Feature | OBSICLAUDE | Copilot for Obsidian | Smart Connections | Text Generator |
|---------|-----------|---------------------|-------------------|----------------|
| **Agentic tool use** | 20 tools | No | No | No |
| **Create/edit/move notes** | Yes | No | No | Append only |
| **Multi-step automation** | Up to 15 iterations | No | No | No |
| **Real-time streaming** | Yes | Yes | No | Yes |
| **Drag & drop context** | Files + folders | No | No | No |
| **Find orphans/duplicates** | Built-in tools | No | Similarity only | No |
| **Batch frontmatter** | Yes | No | No | No |
| **Follow-up queue** | Yes | No | No | No |
| **Model switching** | Sonnet/Opus/Haiku | GPT only | Varies | Varies |
| **Privacy** | Direct to Anthropic | Direct to OpenAI | Local embeddings | Varies |

---

## Roadmap

- [ ] Community plugin submission
- [ ] Template system for common workflows
- [ ] Canvas/graph view integration
- [ ] Voice input support
- [ ] Plugin API for custom tools

---

## Contributing

Contributions welcome! Bug reports, feature requests, and pull requests all appreciated.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-thing`)
3. Commit your changes
4. Push and open a Pull Request

Found a bug? [Open an issue](https://github.com/CRtheHILLS/obsiclaude/issues).

---

## License

[MIT](LICENSE) © 2026 CRtheHILLS

---

<p align="center">
  Built with ☕ and too many late nights by <a href="https://github.com/CRtheHILLS">CR</a>.
</p>

<!-- SEO: obsidian plugin, claude ai, vault management, note organization, obsidian ai assistant, knowledge management, ai agent, agentic ai, obsidian automation, note-taking ai, pkm tool, second brain, zettelkasten ai, obsidian claude, anthropic, llm plugin, ai note-taking, vault analyzer, orphan notes, backlink finder, frontmatter editor, obsidian chatbot, ai writing assistant, obsidian productivity -->
