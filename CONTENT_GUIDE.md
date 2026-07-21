# How to update the CHAI site

This site reads its visible content from plain text files in the `content/`
folder. Routine page and workshop updates do not require changes to HTML, CSS,
or JavaScript: edit the paired content files (and any workshop manifest or
materials), preview them, commit, and push.

## Folder layout

```
content/
├── sections.json          ← controls the 7 navigation sections (order, labels)
├── en/                    ← English text
│   ├── vision.md
│   ├── dialogue.md
│   ├── agents.md
│   ├── projects.md
│   ├── events.md
│   ├── team.md
│   └── workshops.md       ← English introduction to the workshop section
├── zh/                    ← Traditional Chinese text (same seven files)
    ├── vision.md
    ├── dialogue.md
    ├── agents.md
    ├── projects.md
    ├── events.md
    ├── team.md
    └── workshops.md       ← Traditional Chinese workshop introduction
└── workshops/
    ├── index.json         ← ordered list of workshop slugs
    ├── en/                ← one English schedule per workshop slug
    └── zh/                ← matching Traditional Chinese schedules

assets/
└── materials/             ← local workshop handouts and slides
```

In full-path form, the workshop section introductions are
`content/en/workshops.md` and `content/zh/workshops.md`; the schedule manifest
is `content/workshops/index.json`, and its paired files live in
`content/workshops/en/` and `content/workshops/zh/`.

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

## Maintaining workshops

Each workshop has two localized schedule files and one shared slug. The site
loads the slugs from `content/workshops/index.json`, then loads the matching
file from `content/workshops/en/` or `content/workshops/zh/`.

### Adding or updating a workshop

1. Choose a unique slug in the form `<start-date>-<short-name>`, for example
   `2026-08-05-research-tools`. Including the day allows more than one workshop
   in the same month.
2. Copy an existing pair into
   `content/workshops/en/<workshop-slug>.md` and
   `content/workshops/zh/<workshop-slug>.md`. Keep dates, day order, session
   order, session times, `kind` values, and material URLs synchronized while
   localizing visible text such as titles, labels, speakers, and details.
3. Add the slug once to the `workshops` array in
   `content/workshops/index.json`. Slugs must be unique lowercase letters,
   numbers, and hyphens.
4. Put local files under `assets/materials/<year>/<workshop-slug>/` and add
   their links to both language files.
5. Preview via a local server, open the Workshops section, expand the workshop
   and its teaching sessions, and test the language toggle and every link.
6. Commit both languages, assets, and manifest together.

For example, the manifest may contain two distinct workshops in one month:

```json
{
  "workshops": [
    "2026-08-05-research-tools",
    "2026-08-19-digital-archives"
  ]
}
```

### Workshop file fields

Workshop-level fields:

| Field | Required? | What it does |
| --- | --- | --- |
| `title` | Required | Localized workshop title. |
| `start_date` | Required | First day as `YYYY-MM-DD`; used for display and archive ordering/grouping. |
| `end_date` | Required | Last day as `YYYY-MM-DD`; used for automatic status. |
| `days` | Required | Ordered array of day records. |
| `subtitle` | Optional | Localized secondary title metadata. |
| `venue` | Optional | Localized venue shown on the workshop card. |
| `status_override` | Optional | Only `upcoming`, `past`, or empty (`""`). Empty or omitted means automatic status. |
| `registration_url` | Optional | Registration link metadata. Use an HTTPS URL. |
| `label` | Optional | Localized workshop label metadata. |

Each item in `days` has:

| Field | Required? | What it does |
| --- | --- | --- |
| `date` | Required | Calendar date as `YYYY-MM-DD`. |
| `label` | Required | Localized heading for the day. |
| `sessions` | Required | Ordered array of schedule rows. |

Each session has:

| Field | Required? | What it does |
| --- | --- | --- |
| `time` | Required | Display time or time range. |
| `title` | Required | Localized session title. |
| `speaker` | Optional | Localized instructor or speaker. |
| `details` | Optional | Localized short description. Quote a value containing a colon. |
| `kind` | Optional | Defaults to `session` (teaching). Allowed noninteractive kinds are `registration`, `break`, `meal`, and `closing`. |
| `materials` | Optional (teaching sessions only) | Array of material records. Missing `materials` or `[]` displays **Coming soon** / **即將上線**. |

Each item in `materials` has:

| Field | Required? | What it does |
| --- | --- | --- |
| `label` | Required | Localized link text. |
| `url` | Required | Repository-relative or external material URL. |

### Status, archive, and schedule behavior

- `status_override` set to exactly `upcoming` or `past` wins even when the dates
  are invalid. An empty, omitted, or unsupported `status_override` value uses
  automatic `end_date` classification instead.
- For automatic classification, a valid `end_date` on or after the visitor's
  local today is upcoming; a date before today is past. Automatic
  classification with a missing or invalid `end_date` remains visible under
  **Other workshops** / **其他工作坊**.
- Upcoming workshops are ordered by `start_date` earliest-first. Past workshops
  are ordered by `start_date` newest-first and grouped under a localized year
  and month heading. Multiple workshops in the same month are supported.
- A teaching session (`kind` omitted or `kind: session`) renders its title as a
  control that expands the materials panel. Missing `materials` or
  `materials: []` shows **Coming soon** / **即將上線**. Registration, break,
  meal, and closing rows remain plain nonteaching rows without a materials
  panel.
- Material links may be repository-relative paths beginning `assets/...` or
  `content/...`, or external HTTPS URLs only. External links open in a new tab;
  local links stay in the current tab. You may mix local and external links in
  one materials array.

### Copyable workshop templates

Copy both templates, give them the same filename slug, and localize visible
text without changing their structure. The sample Google Drive URL is only a
placeholder: replace `FILE_ID` with the real file ID before publishing.

English (`content/workshops/en/2026-08-05-research-tools.md`):

```yaml workshop-template-en
---
title: Research Tools Workshop
subtitle: Two days of practical methods
start_date: 2026-08-05
end_date: 2026-08-06
venue: NTU Humanities Building
status_override: ""
registration_url: https://example.org/register
label: August workshop
days:
  - date: 2026-08-05
    label: Day 1 · Foundations
    sessions:
      - time: 09:30–10:30
        title: Building a research workflow
        speaker: Workshop team
        details: "Lab: setup and guided practice"
        materials:
          - label: Workshop PDF
            url: assets/materials/2026/2026-08-05-research-tools/workbook.pdf
          - label: Shared Google Drive folder
            url: https://drive.google.com/file/d/FILE_ID/view
      - time: 10:30–10:45
        title: Break
        kind: break
  - date: 2026-08-06
    label: Day 2 · Applications
    sessions:
      - time: 10:00–11:00
        title: Applying the workflow
        speaker: Workshop team
        details: Guided project session
        materials: []
---

Replace this introduction with a short English workshop description.
```

Traditional Chinese
(`content/workshops/zh/2026-08-05-research-tools.md`):

```yaml workshop-template-zh
---
title: 研究工具工作坊
subtitle: 兩天實作方法課程
start_date: 2026-08-05
end_date: 2026-08-06
venue: 臺大人文大樓
status_override: ""
registration_url: https://example.org/register
label: 八月工作坊
days:
  - date: 2026-08-05
    label: 第一天 · 基礎
    sessions:
      - time: 09:30–10:30
        title: 建立研究工作流
        speaker: 工作坊團隊
        details: "實作：設定與引導練習"
        materials:
          - label: 工作坊講義 PDF
            url: assets/materials/2026/2026-08-05-research-tools/workbook.pdf
          - label: Google Drive 共用資料夾
            url: https://drive.google.com/file/d/FILE_ID/view
      - time: 10:30–10:45
        title: 休息
        kind: break
  - date: 2026-08-06
    label: 第二天 · 應用
    sessions:
      - time: 10:00–11:00
        title: 應用研究工作流
        speaker: 工作坊團隊
        details: 專題引導實作
        materials: []
---

請以簡短的繁體中文工作坊說明取代本段文字。
```

### Adding local materials and links

Create the workshop directory and place the file at, for example,
`assets/materials/2026/2026-08-05-research-tools/workbook.pdf`. Link it from a
teaching session like this:

```yaml
materials:
  - label: Workshop PDF
    url: assets/materials/2026/2026-08-05-research-tools/workbook.pdf
  - label: Project notes
    url: content/files/research-tools-notes.pdf
  - label: Shared folder
    url: https://drive.google.com/file/d/FILE_ID/view
```

Use the same URLs in the English and Traditional Chinese files, but localize
each `label`. Replace `FILE_ID`; do not publish the placeholder URL.

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
