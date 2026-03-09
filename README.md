# OBSICLAUD

An AI-powered vault management assistant for [Obsidian](https://obsidian.md), using the [Claude API](https://console.anthropic.com) by Anthropic.

Chat with Claude directly in your Obsidian sidebar to create, edit, search, organize, and analyze your notes — all with natural language.

**Created by [CRtheHILLS](https://github.com/CRtheHILLS)**

![Plugin Screenshot](docs/screenshot.png)

## Features

### Chat Interface
- **Sidebar chat panel** — Claude lives in your right sidebar, always ready to help
- **Conversation history** — Chat history persists across sessions
- **Markdown rendering** — Responses rendered with full Obsidian markdown support
- **Quick action buttons** — One-click vault analysis, orphan detection, tag reports

### Vault Management (20 AI Tools)
Claude can use these tools autonomously to manage your vault:

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
| `get_active_note` | Get currently open note |
| `open_note` | Open a note in the editor |
| `get_all_tags` | Tag usage statistics |

### Editor Commands
- **Ask Claude about active note** — Analyze the current note
- **Summarize selection** — Summarize highlighted text
- **Translate selection** — Translate between languages
- **Improve selection** — Polish and restructure text
- **Generate tags** — Auto-suggest tags for current note
- **Find related notes** — Discover connections
- **Analyze vault** — Comprehensive vault report

### Smart Features
- **Agentic loop** — Claude chains multiple tools automatically for complex tasks
- **Multi-language** — Korean, English, Japanese, Chinese
- **Custom system prompt** — Add your own instructions
- **Excluded folders** — Protect specific folders from modification
- **Frontmatter templates** — Default metadata for new notes

## Installation

### From Community Plugins (Coming Soon)
1. Open Obsidian Settings → Community Plugins
2. Search for "OBSICLAUD"
3. Install and enable

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/CRtheHILLS/obsiclaud/releases)
2. Extract `main.js`, `manifest.json`, and `styles.css` into:
   ```
   <your-vault>/.obsidian/plugins/obsiclaud/
   ```
3. Enable the plugin in Settings → Community Plugins

### Build from Source
```bash
git clone https://github.com/CRtheHILLS/obsiclaud.git
cd obsiclaud
npm install
npm run build
```
Copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugin folder.

## Setup

1. Get an API key from [Anthropic Console](https://console.anthropic.com)
2. Open Obsidian Settings → OBSICLAUD
3. Paste your API key
4. Choose your preferred model and language
5. Click the bot icon in the left ribbon to open the chat!

## Usage Examples

```
"Create a new note called 'Meeting Notes 2024-03-09' in the meetings folder with today's date in frontmatter"

"Search all notes tagged #project and list them"

"Find orphan notes and suggest links for them"

"Analyze my vault - how many notes, what tags am I using, which notes are largest?"

"Translate the selected text to English"

"Organize all notes in the inbox folder by moving them to appropriate topic folders"

"Add a 'status: review' frontmatter field to all notes in the drafts folder"
```

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| API Key | Anthropic API key | — |
| Model | Claude model (Sonnet/Opus/Haiku) | Sonnet 4.6 |
| Max Tokens | Response length limit | 4096 |
| Language | Response language | Korean |
| System Prompt | Custom instructions | — |
| Excluded Folders | Protected from changes | .obsidian, .trash |
| Frontmatter Template | Default note metadata | created, tags |

## Security

- Your API key is stored locally in Obsidian's plugin data
- All API calls go directly to Anthropic's servers
- No data is sent to any third-party services
- The plugin only accesses files within your vault

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Obsidian](https://obsidian.md) for the incredible knowledge management platform
- [Anthropic](https://anthropic.com) for the Claude API
- The Obsidian community for plugin development resources
