# How to update the CHAI site

This site reads its visible content from plain text files in the `content/`
folder. You don't need to touch the HTML, CSS or JS to change what's on the
page — just edit a markdown file, commit, and push.

## Folder layout

```
content/
├── sections.json          ← controls the 6 navigation sections (order, labels)
├── en/                    ← English text
│   ├── vision.md
│   ├── dialogue.md
│   ├── agents.md
│   ├── projects.md
│   ├── events.md
│   └── team.md
└── zh/                    ← Traditional Chinese text (same six files)
    ├── vision.md
    ├── dialogue.md
    ├── agents.md
    ├── projects.md
    ├── events.md
    └── team.md
```

**One file per section per language.** Edit both `en/<slug>.md` and
`zh/<slug>.md` to keep both languages in sync.

## Anatomy of a content file

Every content file has two parts:

1. **Frontmatter** — between the `---` lines at the top. Structured fields the
   template needs (titles, CTAs, embed URLs).
2. **Body** — everything below the second `---`. Free-form markdown.

Example (`content/en/dialogue.md`):

```markdown
---
title: Dialogue
subtitle: Open conversation between humanities and AI
lede: Public conversations, podcasts and seminars where humanists and AI
      researchers think aloud together.
embed:
  type: spotify
  src: "https://open.spotify.com/embed/show/XXXXXX"
  title: CHAI Chat podcast
  note: Optional caption shown under the embed.
---

## CHAI Chat — public dialogue series

CHAI Chat is the lab's open conversation series. Each episode brings a
humanities scholar and an AI researcher to the same microphone...

- Bullet
- Another bullet

> "AI is not the oracle."
> — Geoffrey Hinton @ NTU
```

## Frontmatter fields by section

### `vision.md` — the home/hero page (special)

| Field | What it does |
| --- | --- |
| `title` | Internal label (not shown on the hero) |
| `kicker` | Small uppercase text above the hero title |
| `hero_title` | The big headline |
| `hero_title_accent` | Optional substring of `hero_title` to italicise + colour |
| `hero_sub` | Lede paragraph under the headline |
| `cta_primary.label`, `cta_primary.href` | First button (`href` like `"#projects"`) |
| `cta_secondary.label`, `cta_secondary.href` | Second button |

1. Demo extracted into the site (assets/chai-md-demo/)


chai-site-v2/assets/chai-md-demo/
├── index.html      ← entry page (paths fixed to be relative)
├── styles.css
└── app.js
Only the static front-end was extracted. The app.py Flask backend was dropped — app.js doesn't fetch anything from the server, so the demo runs purely client-side. Total weight: ~40 KB (vs the gif's 5.3 MB).

2. New iframe: true option on media: (assets/script.js)

The renderer now picks the right element by type:

.html URL → <iframe> (auto-detected, sandboxed with allow-scripts allow-same-origin allow-popups)
.mp4 / .webm / .mov → <video autoplay loop muted playsinline>
everything else → <img>
Optional ratio: field controls the iframe's aspect ratio (default 16/9; vision uses 16/10).

### All other sections (`dialogue`, `agents`, `projects`, `events`, `team`)

| Field | What it does |
| --- | --- |
| `title` | Big page heading at the top |
| `subtitle` | Italic line under the page title |
| `lede` | First paragraph of intro text |
| `embed.src` | Spotify (or similar) iframe URL — only on `dialogue.md` for now |
| `embed.title` | Accessible title for the iframe |
| `embed.note` | Small caption under the embed |
| `team` | Array of team members → renders as a 3×3 card grid (see below) |
| `layers` | Array of architecture layers → renders as colour-striped layer cards |
| `principles` | Array of design principles → renders as a 2×2 card grid |
| `hermeneutic_loop` | Object → renders the agent-flow diagram |
| `media` | Array of images / gifs / videos → renders as captioned figure blocks |

## Structured frontmatter components

A few sections include "rich" visual components — team cards, layer stacks,
the agent loop diagram. These are driven entirely by frontmatter, so you can
edit names, labels and items without touching code.

### `team` — 3×3 people grid

Used in `team.md`. Each entry becomes one card.

```yaml
team:
  - role: Principal Investigator
    name: Cheng Yu-yu
    dept: Department of Chinese Literature / Dean, College of Liberal Arts
    url: https://example.edu/profile
  - role: Co-PI
    name: Wu Tsung-lin
    dept: Department of Electrical Engineering / Dean, EECS
  # ...add or remove members; the grid wraps automatically
```

- `role` shows in golden small-caps at the top of the card
- `name` is the large display name. If the entry has `url`, the name becomes
  a clickable link.
- `url` is optional. Use the person's faculty page, lab page, or personal
  website. Add it to both `content/en/team.md` and `content/zh/team.md` for
  the same person if both languages should link out.
- `dept` is the smaller serif line underneath. Use `dept: ""` (with empty
  quotes) if there's no department to show.

### `layers` — coloured layer stack

Used in `vision.md` to show the lab's three-layer architecture. Up to three
layers are colour-coded (coral / indigo / forest); more than three just keep
appearing in order with the same coral / indigo / forest cycle.

```yaml
layers:
  - num: LAYER 1
    title: Personal scholarly agents
    title_en: 個人領航代理人          # optional — small italic translation next to the title
    lede: Focused on research automation — precise document guidance…
    items:                            # bullet pills inside the card
      - Auto-summarisation
      - Citation tracing
  - num: LAYER 3
    title: Trusted scholarly compute
    lede: …
    groups:                           # optional — sub-cards inside the layer
      - label: A · Embeddings research
        name: Semantic manifold
        items:
          - semantic manifold
          - diachronic geometry
```

Use either `items` (a single row of bullet-pills) or `groups` (sub-cards) — or
both.

### `principles` — 2×2 design-principle grid

Used in `agents.md`. Each card is a single principle.

```yaml
principles:
  - letter: A                # shown in coloured pill at top of card
    title: Hermeneutic loop · non-linear pipeline
    body: One-paragraph summary of the principle.
    items:                   # optional bullet list under the body
      - Departs from the linear default of classic RAG
      - Foregrounds the dynamic loop of questioning and revision
```

Up to four cards get distinct accent colours (blue / purple / orange / green).
Add more if you like — they cycle back to blue.

### `hermeneutic_loop` — agent flow diagram

Used in `agents.md`. All fields are optional; sensible defaults are baked in.

```yaml
hermeneutic_loop:
  researcher: Researcher
  researcher_sub: questioning · judging · revising
  editor: Editor Agent
  editor_sub: planning · orchestration · state tracking
  critic: Critic Agent
  critic_sub: verify · refute · counter-hallucinate
  experts_label: Expert Agents
  experts:                          # 4 expert cells across the middle band
    - name: Collect
      sub: corpora & cleaning
    - name: Read
      sub: close + distant reading
    - name: Interpret
      sub: translation & knowledge graph
    - name: Argue
      sub: drafting & citation
  sources_label: Sources            # the three foundation tiles
  sources_sub: documents · images · corpora
  memory_label: Semantic memory
  memory_sub: vector index + knowledge graph
  provenance_label: Provenance
  provenance_sub: claims & sources (attribution trace)
```

If you only set `hermeneutic_loop: true` (a bare boolean), the diagram still
renders with English defaults — useful as a quick on/off switch.

### `media` — captioned figure (gif / image / video)

For full-width centrepiece media: an animated gif, a static image (PNG / JPG /
WebP / SVG), or a short auto-playing video (MP4 / WebM / MOV).

```yaml
media:
  - kicker: MODE 3 · Co-civilization              # small uppercase label above the title
    title: CHAI.md — a living humanistic constitution
    src: assets/media/chai-md-ecosystem-loop-wide.gif
    alt: Animated diagram of the CHAI.md ecosystem.
    caption: A digital living organism whose three layers …
    credit: CHAI.md ecosystem · concept loop      # tiny attribution line at the bottom
    placement: top                                # optional: top (default) or bottom
  - src: assets/media/lab-promo.mp4
    placement: bottom                             # appears AFTER the prose body
    title: Inside the agentic humanities lab
    caption: A short tour of the lab.
  - src: assets/media/some-photo.jpg              # minimal: only src is required
    alt: A photo of the Living Lab
```

**`placement` field**:

| value | where the figure appears |
| --- | --- |
| `top` *(default)* | Above the prose body — alongside other structured blocks (layers / principles / hermeneutic loop) |
| `bottom` | After the prose body — useful for closing trailers, gallery rolls, or post-script visuals |

**Adding new media files:**

1. Drop the file into `assets/media/`. Suggested filename style:
   `lab-event-2026-06.gif`, `cheng-yu-yu-portrait.jpg`, etc.
2. Reference it from the `.md` frontmatter as `src: assets/media/<filename>`.
3. Both `.md` files (`en/` and `zh/`) can either share the same file or
   reference different files per language — your call.

**Supported file types:**
- Animated: `.gif`, `.mp4`, `.webm`, `.mov` (videos auto-play, loop, muted, no controls)
- Static: `.png`, `.jpg`, `.webp`, `.svg`
- Embedded HTML: `.html` (auto-detected) — see "Embedding a live demo" below

The frame has a dark backdrop so transparent or letter-boxed media sits nicely
in both light and dark themes.

### Embedding a live demo (HTML page in an iframe)

If you have a self-contained HTML mini-site (its own `index.html` + `styles.css`
+ `app.js`), drop the folder under `assets/` and reference its entry HTML in
the `media:` block:

```yaml
media:
  - kicker: MODE 3 · Co-civilization
    title: CHAI.md — a living humanistic constitution
    src: assets/chai-md-demo/index.html  # entry page for the iframe
    iframe: true                          # required to force iframe rendering
    ratio: "16 / 10"                      # optional aspect ratio (default 16/9)
    caption: A live interactive specimen…
    credit: CHAI.md ecosystem · concept loop
```

The renderer detects `.html` automatically, so `iframe: true` is only required
if you point at a non-`.html` URL (e.g. a Google Doc, a Figma frame). Common
ratios: `16/9` (default), `16/10`, `4/3`, `21/9` for cinematic.

When you drop a new demo, check that all paths inside its own `index.html`
are **relative** (e.g. `styles.css`, not `/static/styles.css`). Absolute paths
break when the demo is served from a subfolder.

## Markdown body — what's supported

- `## Heading 2` and `### Heading 3`
- Paragraphs (just type)
- `*italic*`, `**bold**`
- `[Links](https://example.com)` and `[Email](mailto:you@example.com)`
- Bullet lists (`- item`) and numbered lists (`1. item`)
- Block quotes (lines starting with `>`)
- Tables (used in `team.md` for the global reference network)
- Horizontal rules (`---`) — they render as a decorative `⁂` divider
- Raw HTML if you really need it (use sparingly)

## Updating the navigation

Open `content/sections.json` to change:

- The **order** sections appear in the nav
- The **labels** shown in the nav (per language)
- The **slug** of each section — but if you rename a slug, also rename the
  matching `<slug>.md` files in `en/` and `zh/`

```json
{
  "sections": [
    { "slug": "vision",   "num": "01", "nav": { "en": "Vision",   "zh": "中心願景" }, "hero": true },
    { "slug": "dialogue", "num": "02", "nav": { "en": "Dialogue", "zh": "研發對話" } },
    ...
  ]
}
```

If you add a brand-new section, you also need to add a matching `<section>`
block in `index.html`. That's the only step that touches code — ask a
developer if you're unsure.

## Updating the Spotify embed

In `content/en/dialogue.md` and `content/zh/dialogue.md`, change the
`embed.src` line to the Spotify share URL. Spotify gives you an iframe
snippet — use the `src` from inside that iframe (it starts with
`https://open.spotify.com/embed/...`).

## Updating the logo

Replace `assets/logo.png` (and `assets/logo.svg`) with your new file. Keep
the same filename. 2000px wide PNG is the recommended export.

## Previewing locally before pushing

```bash
cd chai-site-v2
python3 -m http.server 8000
```

Then open <http://localhost:8000/> — your changes show up as you save.
(GitHub Pages serves the files exactly the same way once you push.)

## Tips

- **Long paragraphs are fine.** Don't worry about line length in the markdown —
  the browser handles wrapping.
- **Keep both languages in sync.** A typical edit is: open `en/<slug>.md` and
  `zh/<slug>.md` side by side, make the change in both, commit once.
- **Test the toggle.** After editing, click the language toggle to make sure
  both languages still render properly.
- **Don't break the frontmatter.** It uses YAML — indentation matters. If
  you accidentally remove a `---` line, the file won't parse.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Section shows "Loading…" forever | Filename in `content/` doesn't match the slug in `sections.json` |
| Section shows "Could not load …" | File missing or has a typo in the URL |
| Hero is empty | `vision.md` frontmatter is malformed — check that every `:` has a space after it |
| Embed not showing | The `embed.src` URL is wrong, or doesn't allow embedding |
