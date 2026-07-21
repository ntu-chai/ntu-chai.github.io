# Monthly Workshops Section Design

Date: 2026-07-21
Status: Approved for implementation planning

## Purpose

Add a bilingual, Markdown-driven Workshops section to the NTU CHAI website. The section will present upcoming workshops and an archive of past workshops. Visitors can expand a workshop to read its schedule, then expand a teaching session to access one or more teaching materials.

The supplied July 22–23, 2026 “AI × Humanities Scholars Workshop” poster will be transcribed into the first English and Traditional Chinese workshop entries. The website will present a native schedule rather than embed the poster PDF.

## Content Architecture

Add a seventh entry to `content/sections.json`:

- English navigation label: `Workshops`
- Traditional Chinese navigation label: `每月工作坊`
- Section slug: `workshops`

The section introduction will use the existing paired page pattern:

```text
content/en/workshops.md
content/zh/workshops.md
```

Each workshop will have its own bilingual pair of Markdown files:

```text
content/workshops/en/<start-date>-<slug>.md
content/workshops/zh/<start-date>-<slug>.md
```

For example, two workshops in July can coexist as:

```text
content/workshops/en/2026-07-22-humanities-ai.md
content/workshops/zh/2026-07-22-humanities-ai.md
content/workshops/en/2026-07-30-research-agents.md
content/workshops/zh/2026-07-30-research-agents.md
```

A language-neutral manifest will define which workshop records exist and their display order:

```text
content/workshops/index.json
```

An editor adds a workshop slug to this manifest once and creates the corresponding English and Chinese files. No JavaScript edits are required for later workshop additions.

Local materials will be stored under:

```text
assets/materials/<year>/<workshop-slug>/
```

External URLs and repository-relative local file paths can be mixed within a session.

## Workshop Data Model

Workshop files use YAML frontmatter for structured data. The Markdown body is optional and may hold a workshop introduction or notes.

Required workshop fields:

- `title`
- `start_date`, formatted as `YYYY-MM-DD`
- `end_date`, formatted as `YYYY-MM-DD`
- `days`

Optional workshop fields:

- `subtitle`
- `venue`
- `status_override`: empty, `upcoming`, or `past`
- `registration_url`
- `registration_label`

Each entry in `days` contains:

- `date`, formatted as `YYYY-MM-DD`
- `label`
- `sessions`

Each session contains:

- `time`
- `title`
- optional `speaker`
- optional `details`
- optional `kind`: `session` by default, or a non-teaching value such as `break`, `registration`, `meal`, or `closing`
- optional `materials`

Each material contains:

- `label`
- `url`, either repository-relative or an external `https://` URL

Example:

```yaml
---
title: AI × Humanities Scholars Workshop
start_date: 2026-07-22
end_date: 2026-07-23
venue: NTU Humanities Building, B1 113-2
status_override: ""
days:
  - date: 2026-07-22
    label: Day 1 · Teaching and hands-on tools
    sessions:
      - time: 10:00–10:50
        title: Introduction to AI for the Humanities
        speaker: Hsieh Shu-kai
        details: "Lab: Claude overview"
        materials:
          - label: Presentation slides
            url: assets/materials/2026/humanities-ai/introduction.pdf
          - label: Exercise
            url: https://drive.google.com/file/d/FILE_ID/view
      - time: 10:50–11:00
        title: Group photo and tea break
        kind: break
        materials: []
---
```

## Classification and Ordering

At render time, the browser compares the visitor's local calendar date with each workshop's `end_date`:

- `end_date` on or after today → upcoming
- `end_date` before today → past

If `status_override` is `upcoming` or `past`, it takes precedence over date classification. An empty or absent override uses automatic classification.

Upcoming workshops are ordered by `start_date`, earliest first. Past workshops are ordered by `start_date`, newest first, then grouped by localized year and month headings. Multiple workshops may appear within the same month.

If a date is invalid, the workshop remains visible in a neutral unclassified group rather than disappearing. A malformed individual workshop must not prevent valid workshops from rendering.

## Page Layout

The Workshops page follows the existing site shell, typography, colors, spacing, themes, navigation, and language behavior.

The page contains:

1. Localized section title, subtitle, and introductory copy
2. Upcoming workshops, omitted when empty
3. Past workshop archive, grouped by year and month and omitted when empty
4. An unclassified group only when records have invalid dates

Each workshop is a collapsible panel. Its collapsed header shows:

- title
- localized date range
- venue, when supplied
- localized status badge

Expanding a workshop reveals its optional Markdown body followed by one responsive schedule for each day.

## Schedule and Materials Interaction

On wider screens, schedule rows present time, session, instructor, and details in a table-like layout. On narrow screens, each row reflows into a vertically stacked card so visitors do not need to scroll horizontally.

Teaching sessions use an accessible button for the session title. Activating it expands a material list directly beneath that session. A material list can contain any number of labeled local or external links.

- External links open in a new tab and use safe `rel` attributes.
- Local files open normally in the current browsing context.
- A teaching session with no materials displays `Coming soon` in English or `即將上線` in Traditional Chinese.
- Non-teaching rows such as registration, breaks, meals, group photos, and closing remarks remain plain schedule rows and do not expose a materials control.

Accordion controls will use native buttons or equivalent accessible controls with correct expanded-state attributes and keyboard behavior.

## Bilingual Behavior

English and Traditional Chinese workshop files share the same dates, structure, material URLs, and session ordering. User-visible titles, labels, venue text, speakers where appropriate, descriptions, and material labels are localized independently.

The existing language toggle reloads the same workshop slug from the other language directory. Missing translations produce a visible localized loading error; the renderer will not silently fall back to the wrong language.

Archive month headings and displayed date ranges use the active site language.

## Failure and Empty States

- Missing optional speaker, details, venue, or body content is omitted without leaving empty visual placeholders.
- Missing or empty materials on a teaching session displays the localized coming-soon text.
- Empty upcoming, archive, or unclassified groups are not rendered.
- A failed workshop file fetch reports that record without preventing other valid records from appearing.
- A failed manifest fetch displays a localized section-level error.
- Invalid dates keep the workshop visible in an unclassified group.

## Editor Documentation

Update `CONTENT_GUIDE.md` with:

- the workshop directory layout
- manifest instructions
- required and optional fields
- automatic date classification and `status_override`
- a complete copyable bilingual-friendly template
- local material storage conventions
- local versus external URL examples
- guidance for non-teaching schedule rows
- a reminder to keep English and Traditional Chinese files synchronized

## Initial Content

Create the first workshop from the supplied July 22–23, 2026 poster:

- Title: AI × Humanities Scholars Workshop / AI × 人文領域學者工作坊
- Dates: 2026-07-22 through 2026-07-23
- Venue: NTU Humanities Building, B1 113-2 / 人文大樓 B1 113-2
- Day 1: teaching and hands-on tools
- Day 2: talks and exchange

All poster sessions will be transcribed into both language files. Until actual teaching-material paths or URLs are provided, teaching sessions will use empty material lists and display the localized coming-soon state. Non-teaching rows will be assigned suitable `kind` values.

The poster PDF will not be copied into the website as part of the initial implementation.

## Verification

Preview through a local static server and verify:

- the new navigation item and direct hash route
- English and Traditional Chinese workshop rendering
- language switching while on the Workshops section
- upcoming/archive classification at boundary dates
- manual `status_override`
- multiple workshops in a single month
- newest-first year/month archive grouping
- multi-day schedules
- session material expansion and collapse
- multiple local and external material links
- localized coming-soon states
- non-teaching rows without interactive material controls
- malformed record isolation and section-level failure states
- desktop and narrow mobile layouts
- keyboard operation and expanded-state attributes
- light and dark themes
- regression checks for all existing sections

There is no automated test suite. Verification will use focused JavaScript checks where practical, read-back and diff review, and browser preview for renderer, layout, navigation, language, responsive, and theme changes.

## Scope Boundaries

This feature does not add a build system, content management system, search, authentication, uploads, analytics, or automatic link validation. Editors continue to manage Markdown, JSON, and teaching files through the repository.
