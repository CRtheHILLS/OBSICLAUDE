// ============================================================
// Vault Tools - Obsidian Vault Manipulation Functions
// All tool functions that Claude can call to control the vault
// ============================================================

import { App, TFile, TFolder, normalizePath, Notice } from "obsidian";
import { ClaudeTool, ClaudeAssistantSettings, VaultAnalysis } from "./types";

export class VaultTools {
  constructor(
    private app: App,
    private getSettings: () => ClaudeAssistantSettings
  ) {}

  /**
   * Check if a path is inside an excluded folder.
   * Enforced server-side — Claude cannot bypass this.
   */
  private isExcludedPath(path: string): boolean {
    const normalized = normalizePath(path);
    const excluded = this.getSettings().excludedFolders;
    return excluded.some(
      (folder) =>
        normalized === folder ||
        normalized.startsWith(folder + "/")
    );
  }

  /**
   * Validate that a path doesn't escape the vault via traversal.
   */
  private isUnsafePath(path: string): boolean {
    const normalized = normalizePath(path);
    return (
      normalized.startsWith("../") ||
      normalized.includes("/../") ||
      normalized === ".."
    );
  }

  /**
   * Guard for write operations: excluded folder + path traversal.
   * Returns error string if blocked, null if safe.
   */
  private guardPath(path: string): string | null {
    if (!path || typeof path !== "string") {
      return JSON.stringify({ error: "Path is required and must be a string" });
    }
    if (this.isUnsafePath(path)) {
      return JSON.stringify({ error: `Unsafe path rejected: ${path}` });
    }
    if (this.isExcludedPath(path)) {
      return JSON.stringify({
        error: `Path is in an excluded folder: ${path}. Excluded folders: ${this.getSettings().excludedFolders.join(", ")}`,
      });
    }
    return null;
  }

  // ============================================================
  // TOOL DEFINITIONS - Sent to Claude API
  // ============================================================

  getToolDefinitions(): ClaudeTool[] {
    return [
      {
        name: "create_note",
        description:
          "Create a new note in the vault. Can include frontmatter (YAML) and content with wikilinks.",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description:
                'Full path for the note including .md extension. e.g. "folder/my-note.md"',
            },
            content: {
              type: "string",
              description: "Markdown content of the note",
            },
            frontmatter: {
              type: "object",
              description:
                "YAML frontmatter key-value pairs. e.g. {tags: [\"tag1\"], created: \"2024-01-01\"}",
            },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "read_note",
        description: "Read the content of an existing note in the vault.",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the note file. e.g. \"folder/my-note.md\"",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "edit_note",
        description:
          "Edit an existing note. Can replace entire content, append, prepend, or do find-and-replace.",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the note file",
            },
            mode: {
              type: "string",
              enum: ["replace", "append", "prepend", "find_replace"],
              description: "Edit mode",
            },
            content: {
              type: "string",
              description: "New content (for replace/append/prepend)",
            },
            find: {
              type: "string",
              description: "Text to find (for find_replace mode)",
            },
            replace: {
              type: "string",
              description: "Replacement text (for find_replace mode)",
            },
          },
          required: ["path", "mode"],
        },
      },
      {
        name: "delete_note",
        description: "Delete a note from the vault (moves to trash).",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the note to delete",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "move_note",
        description: "Move or rename a note in the vault.",
        input_schema: {
          type: "object",
          properties: {
            from: {
              type: "string",
              description: "Current path of the note",
            },
            to: {
              type: "string",
              description: "New path for the note",
            },
          },
          required: ["from", "to"],
        },
      },
      {
        name: "list_files",
        description:
          "List files and folders in the vault. Can filter by folder path and file extension.",
        input_schema: {
          type: "object",
          properties: {
            folder: {
              type: "string",
              description:
                'Folder path to list. Use "/" or "" for root. Default: root.',
            },
            extension: {
              type: "string",
              description:
                'Filter by file extension. e.g. "md", "png". Default: all files.',
            },
            recursive: {
              type: "boolean",
              description: "List recursively. Default: false",
            },
          },
        },
      },
      {
        name: "create_folder",
        description: "Create a new folder in the vault.",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Folder path to create",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "search_notes",
        description:
          "Search notes by content, title, or tags. Returns matching note paths and snippets.",
        input_schema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query string",
            },
            searchIn: {
              type: "string",
              enum: ["content", "title", "tags", "all"],
              description:
                "Where to search. Default: all",
            },
            limit: {
              type: "number",
              description: "Maximum number of results. Default: 20",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_frontmatter",
        description: "Get the YAML frontmatter of a note as a JSON object.",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the note",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "set_frontmatter",
        description:
          "Set or update YAML frontmatter fields of a note. Merges with existing frontmatter.",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the note",
            },
            fields: {
              type: "object",
              description:
                "Key-value pairs to set in frontmatter. e.g. {tags: [\"new-tag\"], status: \"done\"}",
            },
          },
          required: ["path", "fields"],
        },
      },
      {
        name: "get_backlinks",
        description:
          "Get all notes that link to a specific note (backlinks).",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the note to find backlinks for",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "get_outgoing_links",
        description: "Get all wikilinks from a specific note.",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the note",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "analyze_vault",
        description:
          "Analyze the entire vault and return statistics: total notes, folders, orphan notes, tag distribution, recently modified, largest notes.",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "find_orphan_notes",
        description:
          "Find notes that have no incoming links (orphan notes) - useful for discovering disconnected knowledge.",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "suggest_links",
        description:
          "Suggest potential wikilinks for a note based on existing note titles in the vault.",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the note to suggest links for",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "batch_frontmatter",
        description:
          "Apply frontmatter changes to multiple notes matching a pattern.",
        input_schema: {
          type: "object",
          properties: {
            folder: {
              type: "string",
              description:
                "Folder path to apply changes to (recursive). Use / for all.",
            },
            fields: {
              type: "object",
              description: "Frontmatter fields to set on matching notes",
            },
            filter_tag: {
              type: "string",
              description:
                "Only apply to notes containing this tag (optional)",
            },
          },
          required: ["folder", "fields"],
        },
      },
      {
        name: "find_duplicate_notes",
        description:
          "Find notes with similar titles that might be duplicates.",
        input_schema: {
          type: "object",
          properties: {
            threshold: {
              type: "number",
              description:
                "Similarity threshold 0-1. Default: 0.7. Higher = stricter matching.",
            },
          },
        },
      },
      {
        name: "get_active_note",
        description: "Get the currently active/open note in the editor.",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "open_note",
        description: "Open a note in the Obsidian editor.",
        input_schema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the note to open",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "get_all_tags",
        description: "Get all tags used across the vault with their counts.",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
    ];
  }

  // ============================================================
  // TOOL EXECUTION
  // ============================================================

  async executeTool(
    name: string,
    input: Record<string, unknown>
  ): Promise<string> {
    try {
      // Input validation helpers
      const str = (key: string): string => {
        const v = input[key];
        if (typeof v !== "string" || !v.trim())
          throw new Error(`Missing required parameter: ${key}`);
        return v.trim();
      };
      const optStr = (key: string): string | undefined => {
        const v = input[key];
        return typeof v === "string" ? v.trim() : undefined;
      };
      const optNum = (key: string): number | undefined => {
        const v = input[key];
        return typeof v === "number" ? v : undefined;
      };
      const optBool = (key: string): boolean | undefined => {
        const v = input[key];
        return typeof v === "boolean" ? v : undefined;
      };
      const obj = (key: string): Record<string, unknown> => {
        const v = input[key];
        if (!v || typeof v !== "object" || Array.isArray(v))
          throw new Error(`Missing required parameter: ${key} (must be object)`);
        return v as Record<string, unknown>;
      };
      const optObj = (key: string): Record<string, unknown> | undefined => {
        const v = input[key];
        if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
        return v as Record<string, unknown>;
      };

      switch (name) {
        case "create_note":
          return await this.createNote(str("path"), str("content"), optObj("frontmatter"));
        case "read_note":
          return await this.readNote(str("path"));
        case "edit_note":
          return await this.editNote(str("path"), str("mode"), optStr("content"), optStr("find"), optStr("replace"));
        case "delete_note":
          return await this.deleteNote(str("path"));
        case "move_note":
          return await this.moveNote(str("from"), str("to"));
        case "list_files":
          return await this.listFiles(optStr("folder"), optStr("extension"), optBool("recursive"));
        case "create_folder":
          return await this.createFolder(str("path"));
        case "search_notes":
          return await this.searchNotes(str("query"), optStr("searchIn"), optNum("limit"));
        case "get_frontmatter":
          return await this.getFrontmatter(str("path"));
        case "set_frontmatter":
          return await this.setFrontmatter(str("path"), obj("fields"));
        case "get_backlinks":
          return await this.getBacklinks(str("path"));
        case "get_outgoing_links":
          return await this.getOutgoingLinks(str("path"));
        case "analyze_vault":
          return await this.analyzeVault();
        case "find_orphan_notes":
          return await this.findOrphanNotes();
        case "suggest_links":
          return await this.suggestLinks(str("path"));
        case "batch_frontmatter":
          return await this.batchFrontmatter(str("folder"), obj("fields"), optStr("filter_tag"));
        case "find_duplicate_notes":
          return await this.findDuplicateNotes(optNum("threshold"));
        case "get_active_note":
          return this.getActiveNote();
        case "open_note":
          return await this.openNote(str("path"));
        case "get_all_tags":
          return await this.getAllTags();
        default:
          return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ error: msg });
    }
  }

  // ============================================================
  // TOOL IMPLEMENTATIONS
  // ============================================================

  private async createNote(
    path: string,
    content: string,
    frontmatter?: Record<string, unknown>
  ): Promise<string> {
    const blocked = this.guardPath(path);
    if (blocked) return blocked;

    const normalizedPath = normalizePath(path);
    const existing = this.app.vault.getAbstractFileByPath(normalizedPath);
    if (existing) {
      return JSON.stringify({ error: `File already exists: ${path}` });
    }

    let fullContent = content;
    if (frontmatter && Object.keys(frontmatter).length > 0) {
      const yaml = this.objectToYaml(frontmatter);
      fullContent = `---\n${yaml}---\n\n${content}`;
    }

    // Ensure parent folder exists
    const folderPath = normalizedPath.substring(
      0,
      normalizedPath.lastIndexOf("/")
    );
    if (folderPath) {
      await this.ensureFolder(folderPath);
    }

    await this.app.vault.create(normalizedPath, fullContent);
    new Notice(`Created: ${path}`);
    return JSON.stringify({ success: true, path: normalizedPath });
  }

  private async readNote(path: string): Promise<string> {
    const file = this.getFile(path);
    if (!file) return JSON.stringify({ error: `File not found: ${path}` });
    let content = await this.app.vault.read(file);
    const truncated = content.length > 50_000;
    if (truncated) {
      content = content.slice(0, 50_000) + "\n\n...(content truncated, note is very large)";
    }
    return JSON.stringify({
      path: file.path,
      content,
      size: file.stat.size,
      created: file.stat.ctime,
      modified: file.stat.mtime,
      truncated,
    });
  }

  private async editNote(
    path: string,
    mode: string,
    content?: string,
    find?: string,
    replace?: string
  ): Promise<string> {
    const blocked = this.guardPath(path);
    if (blocked) return blocked;

    const file = this.getFile(path);
    if (!file) return JSON.stringify({ error: `File not found: ${path}` });

    const currentContent = await this.app.vault.read(file);
    let newContent: string;

    switch (mode) {
      case "replace":
        newContent = content || "";
        break;
      case "append":
        newContent = currentContent + "\n" + (content || "");
        break;
      case "prepend":
        newContent = (content || "") + "\n" + currentContent;
        break;
      case "find_replace":
        if (!find)
          return JSON.stringify({
            error: "find parameter required for find_replace mode",
          });
        newContent = currentContent.split(find).join(replace || "");
        break;
      default:
        return JSON.stringify({ error: `Unknown edit mode: ${mode}` });
    }

    await this.app.vault.modify(file, newContent);
    new Notice(`Edited: ${path}`);
    return JSON.stringify({ success: true, path: file.path });
  }

  private async deleteNote(path: string): Promise<string> {
    const blocked = this.guardPath(path);
    if (blocked) return blocked;

    const file = this.getFile(path);
    if (!file) return JSON.stringify({ error: `File not found: ${path}` });
    await this.app.vault.trash(file, true);
    new Notice(`Deleted: ${path}`);
    return JSON.stringify({ success: true, deleted: path });
  }

  private async moveNote(from: string, to: string): Promise<string> {
    const blockedFrom = this.guardPath(from);
    if (blockedFrom) return blockedFrom;
    const blockedTo = this.guardPath(to);
    if (blockedTo) return blockedTo;

    const file = this.getFile(from);
    if (!file) return JSON.stringify({ error: `File not found: ${from}` });

    const toNormalized = normalizePath(to);
    const folderPath = toNormalized.substring(0, toNormalized.lastIndexOf("/"));
    if (folderPath) {
      await this.ensureFolder(folderPath);
    }

    await this.app.fileManager.renameFile(file, toNormalized);
    new Notice(`Moved: ${from} → ${to}`);
    return JSON.stringify({ success: true, from, to: toNormalized });
  }

  private async listFiles(
    folder?: string,
    extension?: string,
    recursive?: boolean
  ): Promise<string> {
    const root = folder && folder !== "/" ? folder : "";
    const files: { path: string; type: "file" | "folder"; size?: number }[] =
      [];

    const allFiles = this.app.vault.getAllLoadedFiles();
    for (const f of allFiles) {
      if (root && !f.path.startsWith(root)) continue;
      if (!recursive && root) {
        const relative = f.path.substring(root.length + 1);
        if (relative.includes("/")) continue;
      }
      if (f.path === root) continue;

      if (f instanceof TFile) {
        if (extension && f.extension !== extension) continue;
        files.push({ path: f.path, type: "file", size: f.stat.size });
      } else if (f instanceof TFolder) {
        files.push({ path: f.path, type: "folder" });
      }
    }

    // Return summary + limited file list to prevent token overflow
    const total = files.length;
    const limited = files.slice(0, 200);
    const result: any = { folder: root || "/", totalCount: total, files: limited };
    if (total > 200) {
      result.note = `Showing first 200 of ${total} items. Use a more specific folder path to narrow results.`;
    }
    return JSON.stringify(result);
  }

  private async createFolder(path: string): Promise<string> {
    const blocked = this.guardPath(path);
    if (blocked) return blocked;

    await this.ensureFolder(normalizePath(path));
    new Notice(`Created folder: ${path}`);
    return JSON.stringify({ success: true, path });
  }

  private async searchNotes(
    query: string,
    searchIn?: string,
    limit?: number
  ): Promise<string> {
    const maxResults = limit || 20;
    const scope = searchIn || "all";
    const results: { path: string; snippet: string; matchType: string }[] = [];
    const queryLower = query.toLowerCase();
    const mdFiles = this.app.vault.getMarkdownFiles();

    for (const file of mdFiles) {
      if (results.length >= maxResults) break;

      // Title search
      if (scope === "title" || scope === "all") {
        if (file.basename.toLowerCase().includes(queryLower)) {
          results.push({
            path: file.path,
            snippet: file.basename,
            matchType: "title",
          });
          continue;
        }
      }

      // Tag search
      if (scope === "tags" || scope === "all") {
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache?.tags) {
          const matched = cache.tags.find((t) =>
            t.tag.toLowerCase().includes(queryLower)
          );
          if (matched) {
            results.push({
              path: file.path,
              snippet: `Tag: ${matched.tag}`,
              matchType: "tag",
            });
            continue;
          }
        }
        // Also check frontmatter tags
        if (cache?.frontmatter?.tags) {
          const rawTags = cache.frontmatter.tags;
          const fmTags: string[] = Array.isArray(rawTags)
            ? rawTags.filter((t: unknown) => typeof t === "string")
            : typeof rawTags === "string" ? [rawTags] : [];
          const matchedFm = fmTags.find((t) =>
            t.toLowerCase().includes(queryLower)
          );
          if (matchedFm) {
            results.push({
              path: file.path,
              snippet: `Frontmatter tag: ${matchedFm}`,
              matchType: "tag",
            });
            continue;
          }
        }
      }

      // Content search
      if (scope === "content" || scope === "all") {
        const content = await this.app.vault.cachedRead(file);
        const idx = content.toLowerCase().indexOf(queryLower);
        if (idx !== -1) {
          const start = Math.max(0, idx - 50);
          const end = Math.min(content.length, idx + query.length + 50);
          const snippet = content.substring(start, end).replace(/\n/g, " ");
          results.push({ path: file.path, snippet, matchType: "content" });
        }
      }
    }

    return JSON.stringify({ query, resultCount: results.length, results });
  }

  private async getFrontmatter(path: string): Promise<string> {
    const file = this.getFile(path);
    if (!file) return JSON.stringify({ error: `File not found: ${path}` });

    const cache = this.app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter || {};
    return JSON.stringify({ path, frontmatter: fm });
  }

  private async setFrontmatter(
    path: string,
    fields: Record<string, unknown>
  ): Promise<string> {
    const blocked = this.guardPath(path);
    if (blocked) return blocked;

    const file = this.getFile(path);
    if (!file) return JSON.stringify({ error: `File not found: ${path}` });

    await this.app.fileManager.processFrontMatter(file, (fm) => {
      for (const [key, value] of Object.entries(fields)) {
        fm[key] = value;
      }
    });

    new Notice(`Updated frontmatter: ${path}`);
    return JSON.stringify({ success: true, path, updatedFields: Object.keys(fields) });
  }

  private async getBacklinks(path: string): Promise<string> {
    const file = this.getFile(path);
    if (!file) return JSON.stringify({ error: `File not found: ${path}` });

    const backlinks: string[] = [];
    const allFiles = this.app.vault.getMarkdownFiles();
    const baseName = file.basename;

    for (const f of allFiles) {
      if (f.path === file.path) continue;
      const cache = this.app.metadataCache.getFileCache(f);
      if (cache?.links) {
        for (const link of cache.links) {
          if (link.link === baseName || link.link === file.path) {
            backlinks.push(f.path);
            break;
          }
        }
      }
    }

    return JSON.stringify({
      path,
      backlinks,
      count: backlinks.length,
    });
  }

  private async getOutgoingLinks(path: string): Promise<string> {
    const file = this.getFile(path);
    if (!file) return JSON.stringify({ error: `File not found: ${path}` });

    const cache = this.app.metadataCache.getFileCache(file);
    const links = (cache?.links || []).map((l) => ({
      display: l.displayText,
      target: l.link,
    }));

    return JSON.stringify({ path, links, count: links.length });
  }

  private async analyzeVault(): Promise<string> {
    const mdFiles = this.app.vault.getMarkdownFiles();
    const allFiles = this.app.vault.getAllLoadedFiles();
    const folders = allFiles.filter((f) => f instanceof TFolder);

    // Tag distribution
    const tagDist: Record<string, number> = {};
    for (const file of mdFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.tags) {
        for (const t of cache.tags) {
          tagDist[t.tag] = (tagDist[t.tag] || 0) + 1;
        }
      }
    }

    // Recently modified (top 10)
    const sorted = [...mdFiles].sort(
      (a, b) => b.stat.mtime - a.stat.mtime
    );
    const recent = sorted.slice(0, 10).map((f) => f.path);

    // Largest notes (top 10)
    const bySize = [...mdFiles].sort(
      (a, b) => b.stat.size - a.stat.size
    );
    const largest = bySize
      .slice(0, 10)
      .map((f) => ({ path: f.path, size: f.stat.size }));

    // Orphan notes
    const linkedFiles = new Set<string>();
    for (const file of mdFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.links) {
        for (const link of cache.links) {
          linkedFiles.add(link.link);
        }
      }
    }
    const orphans = mdFiles
      .filter(
        (f) => !linkedFiles.has(f.basename) && !linkedFiles.has(f.path)
      )
      .map((f) => f.path);

    const analysis: VaultAnalysis = {
      totalNotes: mdFiles.length,
      totalFolders: folders.length,
      orphanNotes: orphans.slice(0, 30),
      tagDistribution: tagDist,
      recentlyModified: recent,
      largestNotes: largest,
    };

    return JSON.stringify(analysis);
  }

  private async findOrphanNotes(): Promise<string> {
    const mdFiles = this.app.vault.getMarkdownFiles();
    const linkedFiles = new Set<string>();

    for (const file of mdFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.links) {
        for (const link of cache.links) {
          linkedFiles.add(link.link);
        }
      }
    }

    const orphans = mdFiles
      .filter(
        (f) => !linkedFiles.has(f.basename) && !linkedFiles.has(f.path)
      )
      .map((f) => f.path);

    return JSON.stringify({
      orphanNotes: orphans.slice(0, 50),
      totalCount: orphans.length,
      note: orphans.length > 50 ? `Showing first 50 of ${orphans.length} orphan notes.` : undefined,
    });
  }

  private async suggestLinks(path: string): Promise<string> {
    const file = this.getFile(path);
    if (!file) return JSON.stringify({ error: `File not found: ${path}` });

    const content = await this.app.vault.read(file);
    const contentLower = content.toLowerCase();
    const allFiles = this.app.vault.getMarkdownFiles();
    const suggestions: { notePath: string; keyword: string }[] = [];

    // Check if any note title appears in the content
    const cache = this.app.metadataCache.getFileCache(file);
    const existingLinks = new Set(
      (cache?.links || []).map((l) => l.link.toLowerCase())
    );

    for (const other of allFiles) {
      if (other.path === file.path) continue;
      const basename = other.basename.toLowerCase();
      if (basename.length < 3) continue; // Skip very short names
      if (existingLinks.has(basename)) continue; // Already linked

      if (contentLower.includes(basename)) {
        suggestions.push({ notePath: other.path, keyword: other.basename });
      }
    }

    return JSON.stringify({
      path,
      suggestions: suggestions.slice(0, 20),
      count: suggestions.length,
    });
  }

  private async batchFrontmatter(
    folder: string,
    fields: Record<string, unknown>,
    filterTag?: string
  ): Promise<string> {
    const mdFiles = this.app.vault.getMarkdownFiles();
    const targetFiles = mdFiles.filter((f) => {
      if (folder !== "/" && !f.path.startsWith(folder)) return false;
      if (this.isExcludedPath(f.path)) return false;
      if (filterTag) {
        const cache = this.app.metadataCache.getFileCache(f);
        const tags = cache?.tags?.map((t) => t.tag) || [];
        if (!tags.includes(filterTag) && !tags.includes(`#${filterTag}`))
          return false;
      }
      return true;
    });

    let updated = 0;
    for (const file of targetFiles) {
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        for (const [key, value] of Object.entries(fields)) {
          fm[key] = value;
        }
      });
      updated++;
    }

    new Notice(`Updated frontmatter on ${updated} notes`);
    return JSON.stringify({ success: true, updatedCount: updated });
  }

  private async findDuplicateNotes(threshold?: number): Promise<string> {
    const t = threshold || 0.7;
    const mdFiles = this.app.vault.getMarkdownFiles();
    const duplicates: { noteA: string; noteB: string; similarity: number }[] =
      [];

    for (let i = 0; i < mdFiles.length; i++) {
      for (let j = i + 1; j < mdFiles.length; j++) {
        const sim = this.stringSimilarity(
          mdFiles[i].basename.toLowerCase(),
          mdFiles[j].basename.toLowerCase()
        );
        if (sim >= t) {
          duplicates.push({
            noteA: mdFiles[i].path,
            noteB: mdFiles[j].path,
            similarity: Math.round(sim * 100) / 100,
          });
        }
      }
    }

    return JSON.stringify({
      duplicates: duplicates.slice(0, 20),
      totalCount: duplicates.length,
    });
  }

  private getActiveNote(): string {
    const file = this.app.workspace.getActiveFile();
    if (!file) return JSON.stringify({ error: "No active note" });
    return JSON.stringify({
      path: file.path,
      name: file.name,
      basename: file.basename,
      extension: file.extension,
    });
  }

  private async openNote(path: string): Promise<string> {
    const file = this.getFile(path);
    if (!file) return JSON.stringify({ error: `File not found: ${path}` });
    await this.app.workspace.openLinkText(file.path, "", false);
    return JSON.stringify({ success: true, opened: file.path });
  }

  private async getAllTags(): Promise<string> {
    const tagCounts: Record<string, number> = {};
    const mdFiles = this.app.vault.getMarkdownFiles();

    for (const file of mdFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.tags) {
        for (const t of cache.tags) {
          tagCounts[t.tag] = (tagCounts[t.tag] || 0) + 1;
        }
      }
      // Include frontmatter tags
      if (cache?.frontmatter?.tags) {
        const fmTags: string[] = Array.isArray(cache.frontmatter.tags)
          ? cache.frontmatter.tags
          : [cache.frontmatter.tags];
        for (const t of fmTags) {
          const tagKey = t.startsWith("#") ? t : `#${t}`;
          tagCounts[tagKey] = (tagCounts[tagKey] || 0) + 1;
        }
      }
    }

    // Sort by count
    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));

    return JSON.stringify({
      tags: sorted.slice(0, 100),
      totalUniqueTags: sorted.length,
      note: sorted.length > 100 ? `Showing top 100 of ${sorted.length} tags.` : undefined,
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getFile(path: string): TFile | null {
    const normalized = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(normalized);
    return file instanceof TFile ? file : null;
  }

  private async ensureFolder(path: string): Promise<void> {
    const normalized = normalizePath(path);
    const existing = this.app.vault.getAbstractFileByPath(normalized);
    if (!existing) {
      await this.app.vault.createFolder(normalized);
    }
  }

  private objectToYaml(obj: Record<string, unknown>): string {
    let yaml = "";
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        yaml += `${key}:\n`;
        for (const item of value) {
          yaml += `  - ${JSON.stringify(item)}\n`;
        }
      } else if (typeof value === "object" && value !== null) {
        yaml += `${key}: ${JSON.stringify(value)}\n`;
      } else {
        yaml += `${key}: ${value}\n`;
      }
    }
    return yaml;
  }

  private stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;

    return (
      (longerLength - this.editDistance(longer, shorter)) / longerLength
    );
  }

  private editDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}
