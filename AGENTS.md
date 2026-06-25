# AGENTS.md

## Project Overview

- This is the static GitHub Pages site for NTU CHAI.
- There is no build step, package manager, or app framework. The site is plain HTML, CSS, vanilla JavaScript, and Markdown content.
- Visible page content lives under `content/`. The shell and renderer live in `index.html`, `assets/styles.css`, and `assets/script.js`.
- `CONTENT_GUIDE.md` is the detailed editor manual. Read it before changing content structure, frontmatter, media blocks, team cards, layer cards, or navigation.

## Local Preview

- Preferred: start a local auto-reloading static server from the repository root:

```bash
npx live-server --port=8000
```

- Open `http://localhost:8000/`.
- Fallback: start Python's built-in static server from the repository root:

```bash
python3 -m http.server 8000
```

- On Windows, use one of:

```powershell
python -m http.server 8000
py -m http.server 8000
```

- With the Python server, refresh the browser after editing Markdown. It watches no files and does not auto-reload.
- Do not rely on opening `index.html` directly from the filesystem; the site fetches Markdown files, so a local server is the reliable preview path.

## Content Editing

- Keep English and Traditional Chinese content in sync when editing user-visible pages:
  - English: `content/en/<slug>.md`
  - Traditional Chinese: `content/zh/<slug>.md`
- Preserve YAML frontmatter delimiters (`---`) and indentation.
- Prefer Markdown body edits for copy changes. Touch HTML, CSS, or JavaScript only when the page behavior or design actually needs to change.
- Navigation order and labels live in `content/sections.json`.
- Use the existing page patterns before inventing new structure. For example, events can use simple headings, lists, or Markdown tables.
- When adding media, place files in `assets/media/` and reference them with relative paths as described in `CONTENT_GUIDE.md`.

## Styling And Code

- Keep edits small and consistent with the current static-site style.
- Use plain JavaScript. Do not introduce npm tooling or a build system unless explicitly requested.
- Keep colors, spacing, and typography aligned with existing CSS tokens and patterns.
- This repository uses GitHub Pages from the repo root. `.nojekyll` must stay present.

## Verification

- For content-only Markdown edits, read back the changed files and check the diff.
- For layout, styling, navigation, language-toggle, or renderer changes, preview locally with the static server and verify the affected page in a browser.
- There is no automated test suite in this repo.

## Deploy Workflow

- GitHub Pages serves `main` from the repository root; there is no checked-in GitHub Actions workflow.
- The manual publish sequence is:

```bash
git add .
git commit -m "Update CHAI site"
git pull --rebase origin main
git push origin main
```

- Some maintainers may have local helpers such as `chai-sync`; do not assume they exist on every machine.
