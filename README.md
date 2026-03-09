<p align="center">
  <img src="assets/obsiclaude-logo.png" alt="OBSICLAUDE" width="120" />
</p>

<h1 align="center">OBSICLAUDE</h1>

<p align="center">
  <strong>Your AI-powered vault assistant for Obsidian — powered by Claude.</strong><br />
  <em>Chat naturally. Claude does the rest.</em>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/obsidian-1.0.0+-purple" alt="Obsidian" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/languages-5-orange" alt="Languages" />
</p>

---

## Hi, I'm CR 👋

I built OBSICLAUDE because I was tired of AI tools that just *chat*. I wanted one that actually **does things** in my vault — creates notes, reorganizes folders, finds orphans, analyzes connections — all through natural conversation. No copy-pasting. No manual file juggling. Just tell Claude what you want, and watch it happen in real time.

This started as a weekend hack and turned into something I use every single day. If you manage a vault with hundreds (or thousands) of notes, this will change how you work.

Ship it. v1.0. Let's go.

---

<!-- TODO: Add demo GIF -->
<!-- <p align="center"><img src="assets/demo.gif" alt="OBSICLAUDE Demo" width="700" /></p> -->

## Features

🧠 **Agentic AI Loop** — Claude doesn't just answer questions. It autonomously plans and executes multi-step tasks using **20 vault tools**: create, read, edit, delete, move, search, analyze tags, find backlinks, detect orphans, spot duplicates, and more. It thinks, acts, observes, and repeats until the job is done.

⚡ **Real-Time Streaming** — Responses stream in token-by-token, just like the Claude web app. No waiting for a wall of text.

🎯 **Drag & Drop** — Drag files or entire folders into the chat window. OBSICLAUDE instantly understands the context.

🔍 **Slash Commands** — Quick actions at your fingertips:

| Command | What it does |
|---------|-------------|
| `/explore` | Get a high-level overview of your vault structure |
| `/analyze` | Deep analysis of vault content and connections |
| `/tags` | Discover and manage your tag taxonomy |
| `/orphans` | Find notes with no incoming or outgoing links |
| `/recent` | See recently modified notes |
| `/search` | Semantic search across your entire vault |
| `/duplicates` | Detect duplicate or near-duplicate content |
| `/links` | Analyze your vault's link graph |

🛑 **Stop Button + ESC** — Interrupt Claude mid-thought at any time. Full control, always.

💬 **Follow-Up Messages** — Send additional context or corrections while Claude is still processing. It reads them on the fly.

🌍 **5 Languages** — Full UI localization in English, Korean (한국어), Japanese (日本語), German (Deutsch), and Chinese (中文).

🔒 **Excluded Folder Protection** — Mark folders as off-limits and OBSICLAUDE enforces it **server-side**. Your private notes stay private.

📋 **Copy Button + Text Selection** — One-click copy on any response. Select and copy partial text freely.

🎨 **Beautiful UI** — An Excalidraw-inspired interface with a cute crystal mascot. Dark and light themes. Feels native to Obsidian.

🤖 **Model Switching** — Toggle between Claude Sonnet, Opus, and Haiku right from the chat header. Pick the right brain for the job.

## Installation

> ⚠️ OBSICLAUDE is not yet in the Obsidian Community Plugins directory. Manual installation only for now.

### Manual Install

1. Download the latest release (`main.js`, `styles.css`, `manifest.json`) from the [Releases](https://github.com/CRtheHILLS/obsiclaude/releases) page.
2. In your vault, navigate to `.obsidian/plugins/` and create a folder called `obsiclaude`.
3. Copy the three files into that folder:
   ```
   .obsidian/plugins/obsiclaude/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```
4. Open Obsidian → Settings → Community Plugins → Enable **OBSICLAUDE**.
5. Go to OBSICLAUDE settings and enter your **Anthropic API key**.

### Build from Source

```bash
git clone https://github.com/CRtheHILLS/obsiclaude.git
cd obsiclaude
npm install
npm run build
```

Then copy `main.js`, `styles.css`, and `manifest.json` to your vault's plugin folder as described above.

## Usage

1. **Open the panel** — Click the crystal icon in the ribbon, or use the command palette.
2. **Talk naturally** — Ask Claude to do anything with your vault:

   > "Create a new MOC for all my project notes and link them together."

   > "Find all orphan notes and suggest where they should be linked."

   > "Summarize everything I wrote last week."

   > "Organize all notes in the inbox folder by moving them to topic folders."

   > "Add `status: review` frontmatter to every note in the drafts folder."

3. **Use slash commands** — Type `/` to see quick actions like `/explore`, `/orphans`, `/tags`.
4. **Drag and drop** — Drop files or folders into the chat for instant context.
5. **Switch models** — Use the dropdown in the chat header to pick Sonnet (fast), Opus (deep), or Haiku (light).

## Architecture

OBSICLAUDE uses an **agentic loop** — the same pattern behind advanced AI coding assistants:

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
│  use another tool?      │──→  loops back if more work is needed
└─────────────────────────┘
    ↓
Final Response to User
```

**Privacy first.** All tool calls execute locally inside your Obsidian vault. Nothing leaves your machine except the conversation with the Anthropic API — and that goes directly to Anthropic's servers. No middleman. No telemetry. No third-party anything.

## Vault Tools (20)

| Tool | Description |
|------|-------------|
| `create_note` | Create notes with frontmatter and wikilinks |
| `read_note` | Read note content and metadata |
| `edit_note` | Replace, append, prepend, or find-and-replace |
| `delete_note` | Move notes to trash |
| `move_note` | Move or rename notes (updates links) |
| `list_files` | Browse vault structure |
| `create_folder` | Create new folders |
| `search_notes` | Full-text search by content, title, or tags |
| `get_frontmatter` | Read YAML frontmatter |
| `set_frontmatter` | Update frontmatter fields |
| `get_backlinks` | Find all notes linking to a note |
| `get_outgoing_links` | List all wikilinks in a note |
| `analyze_vault` | Full vault statistics report |
| `find_orphan_notes` | Detect unlinked notes |
| `suggest_links` | Recommend potential wikilinks |
| `batch_frontmatter` | Bulk update frontmatter |
| `find_duplicate_notes` | Detect similar note titles |
| `get_active_note` | Get the currently open note |
| `open_note` | Open a note in the editor |
| `get_all_tags` | Tag usage statistics |

## Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or pull requests — all appreciated.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-thing`)
3. Commit your changes (`git commit -m 'Add amazing thing'`)
4. Push to the branch (`git push origin feature/amazing-thing`)
5. Open a Pull Request

Found a bug? [Open an issue](https://github.com/CRtheHILLS/obsiclaude/issues) with steps to reproduce.

## License

[MIT](LICENSE) © 2026 CRtheHILLS

---

<p align="center">
  Built with ☕ and too many late nights by <a href="https://github.com/CRtheHILLS">CR</a>.
</p>
