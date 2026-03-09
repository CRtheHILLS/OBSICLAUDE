// ============================================================
// OBSICLAUDE - Help Guide (Localized)
// ============================================================

type Lang = "en" | "ko" | "ja" | "zh" | "es" | "de" | "fr";

interface HelpContent {
  title: string;
  sections: { heading: string; body: string }[];
}

export function getHelpContent(lang: Lang): HelpContent {
  return HELP[lang] || HELP.en;
}

const HELP: Record<Lang, HelpContent> = {
  // ──────────────────────────────────────────────
  // ENGLISH
  // ──────────────────────────────────────────────
  en: {
    title: "How to Use OBSICLAUDE",
    sections: [
      {
        heading: "What is OBSICLAUDE?",
        body: `OBSICLAUDE is an AI assistant that lives inside Obsidian. It can **read, create, edit, search, organize, and analyze** your entire vault using natural language.

Just type what you want — like talking to a knowledgeable friend who knows your notes inside-out.`,
      },
      {
        heading: "Getting Started",
        body: `1. **Set your API key** — Go to \`Settings → OBSICLAUDE\` and paste your Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))
2. **Open the chat** — Click the ✨ sparkle icon in the left ribbon, or use the command palette: \`Open OBSICLAUDE Chat\`
3. **Start chatting** — Type any question or request in the message box`,
      },
      {
        heading: "Drag & Drop",
        body: `You can **drag files or folders** from the file explorer directly into the chat. OBSICLAUDE will attach them as context.

This is the fastest way to ask about specific notes:
- Drag a note → "Summarize this"
- Drag a folder → "What's in this folder?"
- Drag multiple items → "Compare these notes"`,
      },
      {
        heading: "Slash Commands",
        body: `Type \`/\` in the message box to see available commands:

| Command | What it does |
|---------|-------------|
| \`/explore\` | Show your vault structure, tags, and recent notes |
| \`/analyze\` | Health check: orphans, missing links, suggestions |
| \`/tags\` | All tags with usage counts |
| \`/orphans\` | Find notes with no links to/from them |
| \`/recent\` | Your 20 most recently modified notes |
| \`/search\` | Search notes by keyword |
| \`/duplicates\` | Find notes with similar titles |
| \`/links\` | Suggest links between related notes |
| \`/help\` | Open this guide |`,
      },
      {
        heading: "What Can I Ask?",
        body: `Here are some things you can try:

**Creating & Editing**
- "Create a note called Meeting Notes with today's date"
- "Add the tag #project to all notes in the Work folder"
- "Rename my note from 'old-title' to 'new-title'"

**Searching & Finding**
- "Find all notes about machine learning"
- "Which notes mention this topic but aren't linked?"
- "Show me notes I haven't touched in 6 months"

**Organizing**
- "Suggest tags for my untagged notes"
- "Find duplicate notes in my vault"
- "Move all notes with #archive tag to the Archive folder"

**Analyzing**
- "Give me a health report of my vault"
- "What are my most connected notes?"
- "Find orphan notes that need linking"`,
      },
      {
        heading: "Obsidian Basics",
        body: `New to Obsidian? Here are the key concepts:

- **Vault** — Your entire collection of notes (a folder on your computer)
- **Note** — A single markdown (.md) file
- **Wikilink** — \`[[Note Name]]\` links one note to another
- **Backlink** — When Note A links to Note B, Note B has a "backlink" from Note A
- **Tag** — \`#tag-name\` labels for categorizing notes
- **Frontmatter** — YAML metadata at the top of a note (between \`---\` lines)
- **Orphan note** — A note with no links to or from other notes
- **Folder** — Organize your notes into folders, just like files on your computer`,
      },
      {
        heading: "Tips & Tricks",
        body: `- **Stop anytime** — Press \`Esc\` or click the red stop button to interrupt
- **Follow-up** — You can type additional messages while OBSICLAUDE is still working
- **Switch models** — Click the model name (Sonnet/Opus/Haiku) in the header to switch
- **Copy responses** — Hover over a response and click the Copy button
- **Right-click → Send** — Right-click any file/folder and choose "Send to OBSICLAUDE"
- **New chat** — Click the \`+\` button in the header to start fresh`,
      },
    ],
  },

  // ──────────────────────────────────────────────
  // KOREAN
  // ──────────────────────────────────────────────
  ko: {
    title: "OBSICLAUDE 사용법",
    sections: [
      {
        heading: "OBSICLAUDE란?",
        body: `OBSICLAUDE는 Obsidian 안에서 작동하는 AI 어시스턴트입니다. 자연어로 볼트의 노트를 **읽고, 만들고, 수정하고, 검색하고, 정리하고, 분석**할 수 있습니다.

원하는 것을 그냥 입력하세요 — 당신의 노트를 속속들이 아는 똑똑한 친구와 대화하는 것처럼요.`,
      },
      {
        heading: "시작하기",
        body: `1. **API 키 설정** — \`설정 → OBSICLAUDE\`에서 Anthropic API 키를 입력하세요 ([console.anthropic.com](https://console.anthropic.com)에서 발급)
2. **채팅 열기** — 왼쪽 리본의 ✨ 아이콘을 클릭하거나, 명령 팔레트에서 \`Open OBSICLAUDE Chat\` 실행
3. **대화 시작** — 메시지 입력란에 질문이나 요청을 입력하세요`,
      },
      {
        heading: "드래그 & 드롭",
        body: `파일 탐색기에서 **파일이나 폴더를 드래그**해서 채팅에 놓으면 됩니다. OBSICLAUDE가 컨텍스트로 첨부합니다.

특정 노트에 대해 질문하는 가장 빠른 방법:
- 노트 드래그 → "이거 요약해줘"
- 폴더 드래그 → "이 폴더에 뭐가 있어?"
- 여러 항목 드래그 → "이 노트들 비교해줘"`,
      },
      {
        heading: "슬래시 명령어",
        body: `메시지 입력란에 \`/\`를 입력하면 사용 가능한 명령어가 나타납니다:

| 명령어 | 기능 |
|--------|------|
| \`/explore\` | 볼트 구조, 태그, 최근 노트 보기 |
| \`/analyze\` | 건강 검진: 고아노트, 누락 링크, 개선 제안 |
| \`/tags\` | 모든 태그와 사용 횟수 |
| \`/orphans\` | 링크가 없는 고아 노트 찾기 |
| \`/recent\` | 최근 수정한 노트 20개 |
| \`/search\` | 키워드로 노트 검색 |
| \`/duplicates\` | 비슷한 제목의 중복 노트 찾기 |
| \`/links\` | 관련 노트 간 링크 제안 |
| \`/help\` | 이 가이드 열기 |`,
      },
      {
        heading: "이런 것들을 물어보세요",
        body: `시도해볼 수 있는 것들:

**만들기 & 수정**
- "오늘 날짜로 회의록 노트 만들어줘"
- "Work 폴더의 모든 노트에 #프로젝트 태그 추가해줘"
- "노트 이름을 '옛날제목'에서 '새제목'으로 바꿔줘"

**검색 & 찾기**
- "머신러닝에 대한 노트 찾아줘"
- "태그 안 달린 노트들 보여줘"
- "6개월 동안 안 건든 노트 보여줘"

**정리**
- "태그 없는 노트들에 태그 제안해줘"
- "중복 노트 찾아줘"
- "#보관 태그가 있는 노트를 Archive 폴더로 옮겨줘"

**분석**
- "내 볼트 건강 리포트 줘"
- "가장 많이 연결된 노트가 뭐야?"
- "링크가 필요한 고아 노트 찾아줘"`,
      },
      {
        heading: "Obsidian 기초",
        body: `Obsidian이 처음이신가요? 핵심 개념을 알려드릴게요:

- **볼트(Vault)** — 노트 전체 모음 (컴퓨터의 폴더)
- **노트(Note)** — 하나의 마크다운(.md) 파일
- **위키링크** — \`[[노트 이름]]\`으로 노트끼리 연결
- **백링크** — A노트가 B노트를 링크하면, B노트에 A로부터의 "백링크"가 생김
- **태그** — \`#태그이름\`으로 노트를 분류
- **프론트매터** — 노트 상단에 \`---\`로 감싼 YAML 메타데이터
- **고아 노트** — 다른 노트와 링크가 없는 노트
- **폴더** — 컴퓨터 파일처럼 노트를 폴더로 정리`,
      },
      {
        heading: "팁 & 트릭",
        body: `- **중지** — \`Esc\` 키를 누르거나 빨간 중지 버튼 클릭
- **추가 질문** — OBSICLAUDE가 작업 중에도 추가 메시지 입력 가능
- **모델 전환** — 헤더의 모델명(Sonnet/Opus/Haiku) 클릭
- **복사** — 응답에 마우스를 올리면 복사 버튼 표시
- **우클릭 → 전송** — 파일/폴더 우클릭 후 "Send to OBSICLAUDE" 선택
- **새 채팅** — 헤더의 \`+\` 버튼으로 새 대화 시작`,
      },
    ],
  },

  // ──────────────────────────────────────────────
  // JAPANESE
  // ──────────────────────────────────────────────
  ja: {
    title: "OBSICLAUDEの使い方",
    sections: [
      {
        heading: "OBSICLAUDEとは？",
        body: `OBSICLAUDEはObsidian内で動作するAIアシスタントです。自然言語でVault内のノートを**読む、作成、編集、検索、整理、分析**できます。

やりたいことをそのまま入力してください — あなたのノートを熟知した賢い友人と会話するように。`,
      },
      {
        heading: "はじめに",
        body: `1. **APIキーの設定** — \`設定 → OBSICLAUDE\`でAnthropic APIキーを入力（[console.anthropic.com](https://console.anthropic.com)で取得）
2. **チャットを開く** — 左リボンの✨アイコンをクリック、またはコマンドパレットで\`Open OBSICLAUDE Chat\`
3. **会話開始** — メッセージ欄に質問やリクエストを入力`,
      },
      {
        heading: "ドラッグ＆ドロップ",
        body: `ファイルエクスプローラーから**ファイルやフォルダをドラッグ**してチャットにドロップできます。

- ノートをドラッグ →「これを要約して」
- フォルダをドラッグ →「このフォルダの中身は？」`,
      },
      {
        heading: "スラッシュコマンド",
        body: `メッセージ欄に\`/\`を入力すると利用可能なコマンドが表示されます：

| コマンド | 機能 |
|----------|------|
| \`/explore\` | Vault構造、タグ、最近のノート |
| \`/analyze\` | ヘルスチェック：孤立ノート、リンク提案 |
| \`/tags\` | 全タグと使用回数 |
| \`/orphans\` | リンクのない孤立ノート |
| \`/recent\` | 最近変更したノート20件 |
| \`/search\` | キーワード検索 |
| \`/duplicates\` | 類似タイトルの重複ノート |
| \`/links\` | 関連ノート間のリンク提案 |
| \`/help\` | このガイドを開く |`,
      },
      {
        heading: "こんなことが聞けます",
        body: `**作成・編集**
- 「今日の日付で会議メモを作って」
- 「Workフォルダのノートに#プロジェクトタグを追加して」

**検索**
- 「機械学習についてのノートを探して」
- 「タグのないノートを表示して」

**整理・分析**
- 「Vaultの健康レポートを出して」
- 「孤立ノートを見つけて」`,
      },
      {
        heading: "Obsidianの基本",
        body: `- **Vault** — ノート全体のコレクション
- **ノート** — マークダウン(.md)ファイル
- **ウィキリンク** — \`[[ノート名]]\`でノート間を接続
- **バックリンク** — 他のノートからの逆参照リンク
- **タグ** — \`#タグ名\`でノートを分類
- **フロントマター** — ノート先頭のYAMLメタデータ
- **孤立ノート** — リンクのないノート`,
      },
      {
        heading: "ヒント",
        body: `- **停止** — \`Esc\`キーまたは赤い停止ボタン
- **フォローアップ** — 処理中でも追加メッセージ入力可能
- **モデル切替** — ヘッダーのモデル名をクリック
- **コピー** — レスポンスにマウスオーバーでコピーボタン表示
- **右クリック→送信** — ファイル右クリックで「Send to OBSICLAUDE」`,
      },
    ],
  },

  // ──────────────────────────────────────────────
  // CHINESE
  // ──────────────────────────────────────────────
  zh: {
    title: "OBSICLAUDE 使用指南",
    sections: [
      {
        heading: "什么是 OBSICLAUDE？",
        body: `OBSICLAUDE 是 Obsidian 内置的 AI 助手。您可以用自然语言**阅读、创建、编辑、搜索、整理和分析**整个知识库。

只需输入您想做的事——就像与一位了解您所有笔记的聪明朋友交谈一样。`,
      },
      {
        heading: "开始使用",
        body: `1. **设置 API 密钥** — 前往 \`设置 → OBSICLAUDE\`，输入 Anthropic API 密钥（从 [console.anthropic.com](https://console.anthropic.com) 获取）
2. **打开聊天** — 点击左侧栏的 ✨ 图标，或使用命令面板：\`Open OBSICLAUDE Chat\`
3. **开始对话** — 在消息框中输入问题或请求`,
      },
      {
        heading: "拖放功能",
        body: `您可以从文件浏览器**拖拽文件或文件夹**到聊天中。

- 拖拽笔记 →"总结一下"
- 拖拽文件夹 →"这个文件夹里有什么？"`,
      },
      {
        heading: "斜杠命令",
        body: `在消息框中输入 \`/\` 可以看到可用命令：

| 命令 | 功能 |
|------|------|
| \`/explore\` | 查看库结构、标签、最近笔记 |
| \`/analyze\` | 健康检查：孤儿笔记、链接建议 |
| \`/tags\` | 所有标签及使用次数 |
| \`/orphans\` | 查找没有链接的孤儿笔记 |
| \`/recent\` | 最近修改的 20 篇笔记 |
| \`/search\` | 关键词搜索 |
| \`/duplicates\` | 查找相似标题的重复笔记 |
| \`/links\` | 建议相关笔记之间的链接 |
| \`/help\` | 打开本指南 |`,
      },
      {
        heading: "您可以问什么？",
        body: `**创建和编辑**
- "创建一个今天的会议笔记"
- "给 Work 文件夹的笔记添加 #项目 标签"

**搜索**
- "找关于机器学习的笔记"
- "显示没有标签的笔记"

**整理和分析**
- "给我一份知识库健康报告"
- "找到需要链接的孤儿笔记"`,
      },
      {
        heading: "Obsidian 基础",
        body: `- **知识库 (Vault)** — 所有笔记的集合
- **笔记** — 单个 Markdown (.md) 文件
- **Wiki链接** — \`[[笔记名]]\` 连接笔记
- **反向链接** — 其他笔记对本笔记的引用
- **标签** — \`#标签名\` 用于分类
- **前言 (Frontmatter)** — 笔记顶部的 YAML 元数据
- **孤儿笔记** — 没有任何链接的笔记`,
      },
      {
        heading: "小贴士",
        body: `- **停止** — 按 \`Esc\` 或点击红色停止按钮
- **追问** — OBSICLAUDE 工作时仍可输入新消息
- **切换模型** — 点击标题栏的模型名称
- **复制** — 鼠标悬停在回复上显示复制按钮`,
      },
    ],
  },

  // ──────────────────────────────────────────────
  // SPANISH
  // ──────────────────────────────────────────────
  es: {
    title: "Cómo usar OBSICLAUDE",
    sections: [
      {
        heading: "¿Qué es OBSICLAUDE?",
        body: `OBSICLAUDE es un asistente de IA integrado en Obsidian. Puede **leer, crear, editar, buscar, organizar y analizar** toda tu bóveda usando lenguaje natural.

Simplemente escribe lo que quieras — como hablar con un amigo inteligente que conoce todas tus notas.`,
      },
      {
        heading: "Primeros pasos",
        body: `1. **Configura tu clave API** — Ve a \`Ajustes → OBSICLAUDE\` e introduce tu clave API de Anthropic ([console.anthropic.com](https://console.anthropic.com))
2. **Abre el chat** — Haz clic en el icono ✨ en la barra lateral, o usa la paleta de comandos: \`Open OBSICLAUDE Chat\`
3. **Empieza a chatear** — Escribe cualquier pregunta o solicitud`,
      },
      {
        heading: "Arrastrar y soltar",
        body: `Puedes **arrastrar archivos o carpetas** desde el explorador directamente al chat.

- Arrastra una nota → "Resume esto"
- Arrastra una carpeta → "¿Qué hay en esta carpeta?"`,
      },
      {
        heading: "Comandos con barra",
        body: `Escribe \`/\` en el campo de mensaje para ver los comandos disponibles:

| Comando | Función |
|---------|---------|
| \`/explore\` | Estructura de la bóveda, etiquetas, notas recientes |
| \`/analyze\` | Diagnóstico: notas huérfanas, enlaces faltantes |
| \`/tags\` | Todas las etiquetas con conteo |
| \`/orphans\` | Encontrar notas sin enlaces |
| \`/recent\` | 20 notas modificadas recientemente |
| \`/search\` | Buscar por palabra clave |
| \`/duplicates\` | Encontrar notas con títulos similares |
| \`/links\` | Sugerir enlaces entre notas relacionadas |
| \`/help\` | Abrir esta guía |`,
      },
      {
        heading: "¿Qué puedo preguntar?",
        body: `**Crear y editar**
- "Crea una nota de reunión con la fecha de hoy"
- "Agrega la etiqueta #proyecto a todas las notas en la carpeta Trabajo"

**Buscar**
- "Encuentra notas sobre inteligencia artificial"
- "Muéstrame notas sin etiquetas"

**Organizar y analizar**
- "Dame un informe de salud de mi bóveda"
- "Encuentra notas huérfanas que necesiten enlaces"`,
      },
      {
        heading: "Conceptos básicos de Obsidian",
        body: `- **Bóveda (Vault)** — Tu colección completa de notas
- **Nota** — Un archivo markdown (.md)
- **Wikilink** — \`[[Nombre de nota]]\` enlaza notas entre sí
- **Backlink** — Referencia inversa desde otra nota
- **Etiqueta** — \`#nombre-etiqueta\` para categorizar
- **Frontmatter** — Metadatos YAML al inicio de la nota
- **Nota huérfana** — Nota sin enlaces a/desde otras notas`,
      },
      {
        heading: "Consejos",
        body: `- **Detener** — Presiona \`Esc\` o haz clic en el botón rojo de parar
- **Seguimiento** — Puedes escribir mensajes adicionales mientras OBSICLAUDE trabaja
- **Cambiar modelo** — Haz clic en el nombre del modelo en el encabezado
- **Copiar** — Pasa el mouse sobre una respuesta para ver el botón de copiar`,
      },
    ],
  },

  // ──────────────────────────────────────────────
  // GERMAN
  // ──────────────────────────────────────────────
  de: {
    title: "OBSICLAUDE Anleitung",
    sections: [
      {
        heading: "Was ist OBSICLAUDE?",
        body: `OBSICLAUDE ist ein KI-Assistent in Obsidian. Er kann dein gesamtes Vault **lesen, erstellen, bearbeiten, durchsuchen, organisieren und analysieren** — in natürlicher Sprache.

Schreib einfach, was du möchtest — wie ein Gespräch mit einem klugen Freund, der alle deine Notizen kennt.`,
      },
      {
        heading: "Erste Schritte",
        body: `1. **API-Schlüssel einrichten** — Gehe zu \`Einstellungen → OBSICLAUDE\` und gib deinen Anthropic API-Schlüssel ein ([console.anthropic.com](https://console.anthropic.com))
2. **Chat öffnen** — Klicke auf das ✨-Symbol in der Seitenleiste oder nutze die Befehlspalette: \`Open OBSICLAUDE Chat\`
3. **Loschatten** — Tippe Fragen oder Wünsche ins Nachrichtenfeld`,
      },
      {
        heading: "Drag & Drop",
        body: `Du kannst **Dateien oder Ordner** aus dem Datei-Explorer direkt in den Chat ziehen.

- Notiz ziehen → „Fasse das zusammen"
- Ordner ziehen → „Was ist in diesem Ordner?"`,
      },
      {
        heading: "Slash-Befehle",
        body: `Tippe \`/\` im Nachrichtenfeld für verfügbare Befehle:

| Befehl | Funktion |
|--------|----------|
| \`/explore\` | Vault-Struktur, Tags, aktuelle Notizen |
| \`/analyze\` | Gesundheitscheck: verwaiste Notizen, fehlende Links |
| \`/tags\` | Alle Tags mit Häufigkeit |
| \`/orphans\` | Verwaiste Notizen finden |
| \`/recent\` | 20 zuletzt geänderte Notizen |
| \`/search\` | Stichwortsuche |
| \`/duplicates\` | Ähnliche Titel finden |
| \`/links\` | Link-Vorschläge zwischen verwandten Notizen |
| \`/help\` | Diese Anleitung öffnen |`,
      },
      {
        heading: "Was kann ich fragen?",
        body: `**Erstellen & Bearbeiten**
- „Erstelle eine Besprechungsnotiz mit heutigem Datum"
- „Füge allen Notizen im Ordner Arbeit den Tag #Projekt hinzu"

**Suchen**
- „Finde Notizen über maschinelles Lernen"
- „Zeige mir Notizen ohne Tags"

**Organisieren & Analysieren**
- „Gib mir einen Gesundheitsbericht meines Vaults"
- „Finde verwaiste Notizen, die Links brauchen"`,
      },
      {
        heading: "Obsidian Grundlagen",
        body: `- **Vault** — Deine gesamte Notizensammlung
- **Notiz** — Eine einzelne Markdown-Datei (.md)
- **Wikilink** — \`[[Notizname]]\` verknüpft Notizen
- **Backlink** — Rückverweis von einer anderen Notiz
- **Tag** — \`#tag-name\` zur Kategorisierung
- **Frontmatter** — YAML-Metadaten am Anfang einer Notiz
- **Verwaiste Notiz** — Eine Notiz ohne Links zu/von anderen`,
      },
      {
        heading: "Tipps",
        body: `- **Stoppen** — \`Esc\` drücken oder roten Stopp-Button klicken
- **Nachfragen** — Auch während OBSICLAUDE arbeitet, kannst du weitere Nachrichten senden
- **Modell wechseln** — Klick auf den Modellnamen in der Kopfzeile
- **Kopieren** — Mit der Maus über eine Antwort fahren zeigt den Kopier-Button`,
      },
    ],
  },

  // ──────────────────────────────────────────────
  // FRENCH
  // ──────────────────────────────────────────────
  fr: {
    title: "Guide d'utilisation OBSICLAUDE",
    sections: [
      {
        heading: "Qu'est-ce qu'OBSICLAUDE ?",
        body: `OBSICLAUDE est un assistant IA intégré à Obsidian. Il peut **lire, créer, modifier, rechercher, organiser et analyser** l'ensemble de votre coffre en langage naturel.

Tapez simplement ce que vous voulez — comme parler à un ami intelligent qui connaît toutes vos notes.`,
      },
      {
        heading: "Premiers pas",
        body: `1. **Configurer la clé API** — Allez dans \`Paramètres → OBSICLAUDE\` et entrez votre clé API Anthropic ([console.anthropic.com](https://console.anthropic.com))
2. **Ouvrir le chat** — Cliquez sur l'icône ✨ dans la barre latérale, ou utilisez la palette de commandes : \`Open OBSICLAUDE Chat\`
3. **Commencer à discuter** — Tapez une question ou une demande`,
      },
      {
        heading: "Glisser-déposer",
        body: `Vous pouvez **glisser des fichiers ou dossiers** depuis l'explorateur directement dans le chat.

- Glisser une note → « Résume ceci »
- Glisser un dossier → « Qu'y a-t-il dans ce dossier ? »`,
      },
      {
        heading: "Commandes slash",
        body: `Tapez \`/\` dans le champ de message pour voir les commandes disponibles :

| Commande | Fonction |
|----------|----------|
| \`/explore\` | Structure du coffre, tags, notes récentes |
| \`/analyze\` | Bilan de santé : notes orphelines, liens manquants |
| \`/tags\` | Tous les tags avec leur fréquence |
| \`/orphans\` | Trouver les notes sans liens |
| \`/recent\` | 20 notes récemment modifiées |
| \`/search\` | Recherche par mot-clé |
| \`/duplicates\` | Trouver les notes aux titres similaires |
| \`/links\` | Suggérer des liens entre notes liées |
| \`/help\` | Ouvrir ce guide |`,
      },
      {
        heading: "Que puis-je demander ?",
        body: `**Créer et modifier**
- « Crée une note de réunion avec la date d'aujourd'hui »
- « Ajoute le tag #projet à toutes les notes du dossier Travail »

**Rechercher**
- « Trouve les notes sur l'intelligence artificielle »
- « Montre-moi les notes sans tags »

**Organiser et analyser**
- « Donne-moi un rapport de santé de mon coffre »
- « Trouve les notes orphelines qui ont besoin de liens »`,
      },
      {
        heading: "Bases d'Obsidian",
        body: `- **Coffre (Vault)** — Votre collection complète de notes
- **Note** — Un fichier markdown (.md)
- **Wikilink** — \`[[Nom de note]]\` relie les notes entre elles
- **Backlink** — Référence inverse depuis une autre note
- **Tag** — \`#nom-tag\` pour catégoriser
- **Frontmatter** — Métadonnées YAML en tête de note
- **Note orpheline** — Note sans liens vers/depuis d'autres notes`,
      },
      {
        heading: "Astuces",
        body: `- **Arrêter** — Appuyez sur \`Échap\` ou cliquez sur le bouton rouge d'arrêt
- **Suivi** — Vous pouvez taper des messages supplémentaires pendant qu'OBSICLAUDE travaille
- **Changer de modèle** — Cliquez sur le nom du modèle dans l'en-tête
- **Copier** — Survolez une réponse pour voir le bouton de copie`,
      },
    ],
  },
};
