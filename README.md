<div align="center">

<!-- Hero Logo -->
<img src="https://em-content.zobj.net/source/apple/391/crystal-ball_1f52e.png" width="80" />

# ✨ OBSICLAUDE

### *Your vault. Claude's magic.*

<br />

[![Version](https://img.shields.io/badge/v1.1.0-🚀_Magic_Write-10b981?style=for-the-badge&labelColor=1a1b26)](https://github.com/CRtheHILLS/obsiclaude/releases)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.0.0+-7c3aed?style=for-the-badge&logo=obsidian&logoColor=white)](https://obsidian.md)
[![Claude](https://img.shields.io/badge/Claude-Sonnet_|_Opus_|_Haiku-ec4899?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com)
[![License](https://img.shields.io/badge/MIT-License-3b82f6?style=for-the-badge)](LICENSE)

<br />

**The first Obsidian plugin that lets Claude *actually touch* your vault.**
<br />
Not just chat — `create` · `edit` · `move` · `search` · `organize` · `analyze`
<br />
All through natural conversation. 20 tools. Zero dependencies.

<br />

[**Get Started →**](#-quick-start) · [Features](#-features) · [Magic Write](#-magic-write) · [Tools](#-vault-tools-20) · [Install](#-installation)

<br />

---

<br />

</div>

## 🧠 Why OBSICLAUDE?

<table>
<tr>
<td width="50%">

### ❌ Other AI plugins
```
You: "Organize my notes"
Bot: "Here are some tips for organizing..."
```
They **read** and **chat**. That's it.

</td>
<td width="50%">

### ✅ OBSICLAUDE
```
You: "Organize my notes"
Claude: *finds orphans → reads each → categorizes
        → creates index → adds wikilinks*
        Done! Created "Index" with 23 links.
```
It **thinks**, **acts**, and **does the work**.

</td>
</tr>
</table>

> **OBSICLAUDE runs an agentic loop** — the same ReAct (Reason + Act) pattern behind AI coding assistants like Cursor and Claude Code. Claude picks a tool, observes the result, and repeats — autonomously — until the job is done.

<br />

## 🪄 Magic Write

<div align="center">

*The fastest way to create notes in Obsidian.*

</div>

Click **Magic Write** on the welcome screen → a guided modal appears:

| Step | What you do |
|:---:|---|
| 📝 | **Describe** what you want written |
| 🎨 | **Pick a style** — each one generates different structure, frontmatter, and tone |
| 📂 | **Choose a folder** to save |
| 🔗 | **Attach references** — browse your vault, pick notes/folders as source material |
| ✨ | **Click "Write it"** — Claude creates, formats, links, and opens the note |

### 8 Writing Styles — Each One Different

| Style | Frontmatter | Structure | Tone |
|:---:|---|---|---|
| 📄 **Note** | `tags, date, aliases` | Clean headings, TL;DR | Direct, personal |
| ✍️ **Blog Post** | `tags, author, status, category, description` | Hook → Sections → Takeaways | Engaging, authoritative |
| 📋 **Summary** | `tags, source, status: summary` | Overview → Bullets → Key Takeaways (≤500 words) | Neutral, dense |
| 👥 **Meeting** | `tags: [meeting], attendees, status: actionable` | Agenda → Decisions → `- [ ]` Action Items | Factual, brief |
| 📖 **How-to** | `tags: [guide], difficulty, estimated-time` | Prerequisites → Numbered Steps → Troubleshooting | Imperative ("Click", "Run") |
| 🔬 **Research** | `tags: [research], question` | Research Q → Findings → Analysis → Open Questions | Academic but readable |
| 🎭 **Creative** | `tags: [creative], mood, inspiration` | Free-form, poetry OK | Literary, sensory |
| 🗺️ **MOC** | `tags: [MOC, index], scope` | Overview → Categorized `[[wikilinks]]` | Navigational hub |

<br />

## ⚡ Features

<table>
<tr>
<td width="33%" align="center">

### 🤖 Agentic Loop
20 tools · up to 15 iterations
<br />
Claude autonomously plans and executes multi-step operations

</td>
<td width="33%" align="center">

### 🌊 Real-Time Streaming
Token-by-token with live indicator
<br />
See what Claude is doing — which tools, how long, what phase

</td>
<td width="33%" align="center">

### 📎 Drag & Drop
Files + entire folders
<br />
5 resolution methods ensure it works everywhere

</td>
</tr>
<tr>
<td align="center">

### 🔍 Vault Overview
Structure scan · Tag health
<br />
Health Score (A–F) with prioritized action plan

</td>
<td align="center">

### ⚡ Slash Commands
8 instant actions
<br />
`/explore` `/analyze` `/tags` `/orphans` `/recent` `/search` `/duplicates` `/links`

</td>
<td align="center">

### 🛑 Stop & Follow-Up
ESC to interrupt · queue follow-ups
<br />
Send corrections while Claude is still thinking

</td>
</tr>
<tr>
<td align="center">

### 🧩 Multi-Model
Sonnet · Opus · Haiku
<br />
Switch mid-conversation from the header

</td>
<td align="center">

### 🌍 Auto Language
Write in any language
<br />
Claude responds in your language automatically

</td>
<td align="center">

### 🔒 Privacy First
Direct to Anthropic · no telemetry
<br />
Your API key, your data, zero middlemen

</td>
</tr>
</table>

<br />

## 🔧 Vault Tools (20)

<div align="center">

| | Tool | What it does | | Tool | What it does |
|:---:|---|---|:---:|---|---|
| 📝 | `create_note` | Create with frontmatter & wikilinks | 📖 | `read_note` | Read content & metadata |
| ✏️ | `edit_note` | Replace, append, prepend, find-replace | 🗑️ | `delete_note` | Safe trash |
| 📦 | `move_note` | Move or rename | 📂 | `list_files` | Browse vault tree |
| 📁 | `create_folder` | New folders | 🔍 | `search_notes` | Full-text search |
| 🏷️ | `get_frontmatter` | Read YAML metadata | 🏷️ | `set_frontmatter` | Update metadata |
| 🔗 | `get_backlinks` | Who links TO this note | 🔗 | `get_outgoing_links` | Links FROM this note |
| 📊 | `analyze_vault` | Full vault statistics | 👻 | `find_orphan_notes` | Unlinked notes |
| 💡 | `suggest_links` | AI link recommendations | 🏷️ | `batch_frontmatter` | Bulk metadata update |
| 👯 | `find_duplicate_notes` | Similar note detection | 📌 | `get_active_note` | Currently open note |
| 📂 | `open_note` | Open in editor | 🏷️ | `get_all_tags` | Tag usage stats |

</div>

<br />

## 🏗️ Architecture

```
  You say something
       ↓
┌──────────────────────────┐
│   Claude thinks & plans  │
│          ↓               │
│   Picks a tool ──────────│──→  20 vault tools
│          ↓               │
│   Observes the result    │
│          ↓               │
│   Done? Or loop? ────────│──→  up to 15 iterations
└──────────────────────────┘
       ↓
  Final response ✨
```

**Tech stack:** Obsidian API + Anthropic API. That's it. No LangChain, no vector DB, no local model, no dependencies.

<br />

## ⚔️ vs. The Competition

| Feature | **OBSICLAUDE** | Copilot | Smart Connections | Text Generator |
|---|:---:|:---:|:---:|:---:|
| Agentic tool use | **20 tools** | ❌ | ❌ | ❌ |
| Create/edit/move notes | ✅ | ❌ | ❌ | Append only |
| Magic Write (guided) | ✅ 8 styles | ❌ | ❌ | ❌ |
| Multi-step automation | **15 iterations** | ❌ | ❌ | ❌ |
| Real-time streaming | ✅ | ✅ | ❌ | ✅ |
| Drag & drop context | ✅ Files+Folders | ❌ | ❌ | ❌ |
| Vault health check | ✅ A–F Score | ❌ | ❌ | ❌ |
| Orphan/duplicate finder | ✅ Built-in | ❌ | Similarity | ❌ |
| Batch frontmatter | ✅ | ❌ | ❌ | ❌ |
| Follow-up queue | ✅ | ❌ | ❌ | ❌ |
| Model switching | S/O/H | GPT only | Varies | Varies |
| Privacy | **Direct to API** | Direct | Local | Varies |

<br />

## 📦 Installation

### ⚡ Quick Install (BRAT)

```
1. Install BRAT plugin → Settings → Add Beta Plugin
2. Enter: CRtheHILLS/obsiclaude
3. Enable OBSICLAUDE → Set your Anthropic API key
```

### 🔧 Manual Install

Download `main.js` + `styles.css` + `manifest.json` from [Releases](https://github.com/CRtheHILLS/obsiclaude/releases) → copy to `.obsidian/plugins/obsiclaude/` → enable → set API key.

### 🛠️ Build from Source

```bash
git clone https://github.com/CRtheHILLS/obsiclaude.git
cd obsiclaude && npm install && npm run build
```

<br />

## 🚀 Quick Start

| Step | Action |
|:---:|---|
| 1️⃣ | Click the ✨ sparkle icon in the left ribbon |
| 2️⃣ | Get your API key at [console.anthropic.com](https://console.anthropic.com/) |
| 3️⃣ | Paste it in OBSICLAUDE settings |
| 4️⃣ | Click **Magic Write** or just start chatting |

**No config files. No YAML setup. No templates. Just works.**

<br />

## 🗺️ Roadmap

- [ ] 📋 Community plugin store submission
- [ ] 🧩 Template system for workflows
- [ ] 🕸️ Canvas/graph view integration
- [ ] 🎤 Voice input support
- [ ] 🔌 Plugin API for custom tools
- [ ] 📊 Vault analytics dashboard

<br />

## 🤝 Contributing

Contributions welcome! PRs, bug reports, feature requests — all appreciated.

```bash
fork → git checkout -b feature/amazing-thing → commit → PR
```

Found a bug? [Open an issue](https://github.com/CRtheHILLS/obsiclaude/issues).

<br />

---

<div align="center">

**[⬆ back to top](#-obsiclaude)**

Built with ☕ and obsession by [CRtheHILLS](https://github.com/CRtheHILLS)

[MIT License](LICENSE) © 2026

<br />

<sub>If OBSICLAUDE helps you, consider giving it a ⭐ — it helps others discover it!</sub>

</div>

<!-- SEO keywords: obsidian plugin, claude ai, obsidian ai plugin, vault management, obsidian automation, ai agent obsidian, note organization ai, obsidian claude integration, knowledge management ai, agentic ai plugin, obsidian writing assistant, ai note-taking, pkm ai tool, second brain ai, zettelkasten automation, obsidian chatbot, llm obsidian plugin, obsidian ai assistant, frontmatter editor, backlink finder, orphan note detector, obsidian productivity, ai vault analyzer, magic write obsidian, obsidian ai writing, batch frontmatter, moc generator, map of content ai, drag drop obsidian ai, obsidian claude sonnet opus haiku, react pattern ai, tool use claude, anthropic obsidian, obsidian note creation ai, smart note organizer, vault health check -->
