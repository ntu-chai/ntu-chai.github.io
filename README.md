# CHAI v2

Static, content-managed website for the CHAI lab at NTU College of Liberal Arts.

The site is plain HTML, CSS, vanilla JavaScript, and Markdown. There is no build
step, package manager, or app framework. GitHub Pages serves the repository root
directly.

## Quick Start

```bash
git pull --rebase origin main
npx live-server --port=8000
```

Open `http://localhost:8000/`.

If `npx` is not available, use Python's built-in static server:

```bash
python3 -m http.server 8000
```

On Windows, either of these may be available:

```powershell
python -m http.server 8000
py -m http.server 8000
```

The Python server does not auto-reload, so refresh the browser after editing.
Do not open `index.html` directly from the filesystem; the site fetches Markdown
content and should be previewed through a local server.

## Editing Content

Most updates should happen in `content/`.

- English pages live in `content/en/`.
- Traditional Chinese pages live in `content/zh/`.
- Navigation order and labels live in `content/sections.json`.
- Keep the English and Chinese versions in sync for user-visible content.
- Preserve YAML frontmatter delimiters (`---`) and indentation.

For detailed content patterns, frontmatter fields, media blocks, team cards, and
structured sections, see [CONTENT_GUIDE.md](CONTENT_GUIDE.md).

Historical maintainer helper commands and legacy mirror workflows are kept in
[docs/maintainer-workflows.md](docs/maintainer-workflows.md).

## Publishing

GitHub Pages serves the `main` branch from the repository root. There is no
checked-in GitHub Actions build workflow.

```bash
git status
git add .
git commit -m "Update CHAI site"
git pull --rebase origin main
git push origin main
```

If `git pull --rebase` reports a conflict, resolve the marked files, then run:

```bash
git add <file>
git rebase --continue
```

To abandon the rebase:

```bash
git rebase --abort
```

## File Layout

```text
.
├── index.html                # page shell, navigation placeholders, footer
├── assets/
│   ├── logo.png              # brand mark
│   ├── logo.svg              # brand mark SVG
│   ├── styles.css            # visual styling and theme tokens
│   └── script.js             # SPA routing, i18n, theme toggle, Markdown loader
├── content/
│   ├── sections.json         # navigation order and labels
│   ├── en/                   # English Markdown pages
│   └── zh/                   # Traditional Chinese Markdown pages
├── CONTENT_GUIDE.md          # detailed editor manual
├── AGENTS.md                 # coding-agent instructions
├── CLAUDE.md                 # Claude Code import for AGENTS.md
├── README.md
└── .nojekyll                 # tells GitHub Pages to serve files as-is
```

## How It Works

1. `assets/script.js` fetches `content/sections.json`.
2. It builds the navigation from that manifest.
3. It fetches `content/<language>/<slug>.md` for each page.
4. It parses YAML frontmatter and renders the Markdown body into `index.html`.
5. The EN/ZH toggle re-renders pages from the other language directory.
6. The light/dark theme toggle flips `data-theme` on `<body>`.

Marked.js is loaded from a CDN for Markdown rendering.

## Hardcoded Site Pieces

These still live in HTML, CSS, or JavaScript rather than Markdown:

- Site `<title>`, favicon, and font links.
- The decorative SVG branch in the hero.
- The scrolling footer marquee text.
- The theme and language toggle controls.

Everything else, including most headings, paragraphs, bullets, links, and table
rows, should live in `content/`.
