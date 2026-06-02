# CHAI v2 — content-managed site

Static multi-page site for the **CHAI** lab at NTU College of Liberal Arts.

Same look-and-feel as `chai-site-light/` and `chai-site-dark/`, with two big
upgrades:

1. **Six sections** instead of four: 中心願景 (Vision), 研發對話 (Dialogue),
   代理環境 (Agents), 合作專案 (Projects), 活動聯絡 (Events) and
   團隊人員 (Team).
2. **Content is markdown.** Every visible string on the site lives in a
   markdown file under `/content/`. Update the words by editing a `.md` file
   and committing — no need to touch HTML or JS.

## Maintainers: how to update content

See **[CONTENT_GUIDE.md](CONTENT_GUIDE.md)** — the only document you need to
keep this site current.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

Refresh the browser after editing a `.md` file.

## Deploying to GitHub Pages

```bash
cd chai-site-v2
git init
git add .
git commit -m "Initial commit — CHAI v2 (markdown-driven)"
git branch -M main
git remote add origin git@github.com:YOUR-USERNAME/chai-v2.git
git push -u origin main
```

Then enable Pages in repo Settings → Pages → Source: `main` / `(root)`.

`.nojekyll` is already in the repo, so GitHub Pages serves the files
as-is.

## Future workflow with collaborators

When other people may also edit the GitHub repos, pull before you start, then
pull again before pushing. The second pull catches changes that happened while
you were editing.

Update the source site:

```bash
cd /Users/amberber/Githubs/CHAI/chai-site-v2
git pull --rebase origin main

# edit files, then preview locally
git status
git add .
git commit -m "Update CHAI site"
git pull --rebase origin main
git push origin main
```

Publish the same version to the organization homepage:

```bash
cd /Users/amberber/Githubs/CHAI/ntu-chai.github.io
git pull --rebase origin main

cd /Users/amberber/Githubs/CHAI
rsync -av --delete --exclude='.git' --exclude='.DS_Store' --exclude='trip2026/' chai-site-v2/ ntu-chai.github.io/

cd /Users/amberber/Githubs/CHAI/ntu-chai.github.io
git status
git add .
git commit -m "Update CHAI homepage"
git pull --rebase origin main
git push origin main
```

Pulling `ntu-chai.github.io` before `rsync --delete` is important: it protects
folders that collaborators added to the homepage repo, such as `trip2026/`,
from being deleted because your local clone was out of date.

## File layout

```
chai-site-v2/
├── index.html                ← shell: nav, 6 section placeholders, footer
├── assets/
│   ├── logo.png              ← brand mark (PNG, ~2000px wide)
│   ├── logo.svg              ← brand mark (SVG, backup)
│   ├── styles.css            ← all visual styling, theme tokens
│   └── script.js             ← SPA routing, i18n, theme toggle, markdown loader
├── content/                  ← ↓ edit these to update the site ↓
│   ├── sections.json         ← nav order + labels
│   ├── en/
│   │   ├── vision.md
│   │   ├── dialogue.md
│   │   ├── agents.md
│   │   ├── projects.md
│   │   ├── events.md
│   │   └── team.md
│   └── zh/                   (same six files, in Traditional Chinese)
├── CONTENT_GUIDE.md          ← editor's manual
├── README.md                 ← this file
└── .nojekyll
```

## How it works

1. On page load, `script.js` fetches `content/sections.json` to learn what
   sections exist.
2. It builds the navigation from that manifest.
3. For each section, it fetches `content/<current-lang>/<slug>.md`, parses
   the YAML frontmatter and the markdown body, and renders into the
   corresponding `<section data-page="...">` in the HTML shell.
4. When the user clicks the EN ↔ ZH toggle, all six sections are re-rendered
   from the other language's markdown. Cached after first fetch.
5. The light ↔ dark theme toggle simply flips `data-theme` on `<body>` and
   the CSS swaps the palette.

Marked.js (loaded from a CDN) handles the markdown → HTML conversion. No
build step. No npm. Pure HTML + CSS + vanilla JS + static files.

## What's still hardcoded in HTML/CSS

- Site `<title>`, favicon, font links
- The decorative SVG leaf-branch in the hero (a design element, not content)
- The scrolling footer marquee text — currently `Co-Intelligence · Humanities
  AI · Future Lab · 共智 · 人文 AI · 未來實驗室`
- The theme/language toggle buttons

Everything else — every paragraph, heading, bullet, link, table row — is
in `/content/`.



Edit your site in:

chai-site-v2
Then push it:

cd /Users/amberber/Githubs/CHAI/chai-site-v2
git add .
git commit -m "Update CHAI site"
git pull --rebase origin main
git push origin main
Then copy it again to the homepage repo and push:

cd /Users/amberber/Githubs/CHAI
rsync -av --delete --exclude='.git' --exclude='.DS_Store' --exclude='trip2026/' chai-site-v2/ ntu-chai.github.io/

cd ntu-chai.github.io
git add .
git commit -m "Update CHAI homepage"
git pull --rebase origin main
git push origin main