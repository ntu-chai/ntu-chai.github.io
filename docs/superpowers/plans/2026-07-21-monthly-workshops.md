# Monthly Workshops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual, Markdown-driven Workshops page with automatic upcoming/archive grouping, responsive schedules, and expandable session-material links.

**Architecture:** Keep workshop records in paired Markdown files registered by one JSON manifest. Add a focused browser module for workshop classification and HTML rendering, integrate its fetch/render lifecycle into the existing SPA, and style the generated accessible accordions with the site's current tokens. The renderer's pure logic is exposed through CommonJS for dependency-free Node tests and through `window.CHAIWorkshops` in the browser.

**Tech Stack:** Plain HTML, CSS, vanilla JavaScript, Markdown/YAML frontmatter, JSON, Node's built-in test runner, and a local static server for browser verification.

---

## File Map

- Create `assets/workshops.js`: pure workshop classification, localization, grouping, link handling, and schedule HTML renderer.
- Create `tests/workshops.test.cjs`: dependency-free unit coverage for the workshop module.
- Modify `index.html`: add the Workshops page host and load `assets/workshops.js` before `assets/script.js`.
- Modify `assets/script.js`: fetch the manifest and localized workshop Markdown files, isolate record failures, and invoke the workshop renderer after section rendering and language changes.
- Modify `assets/styles.css`: workshop accordions, status badges, schedule grid, material disclosures, mobile stacking, focus states, and dark-theme-compatible presentation.
- Modify `content/sections.json`: register section `07` in desktop/mobile navigation and routing.
- Create `content/en/workshops.md` and `content/zh/workshops.md`: localized page heading and introduction.
- Create `content/workshops/index.json`: language-neutral workshop registry.
- Create `content/workshops/en/2026-07-22-humanities-ai.md` and `content/workshops/zh/2026-07-22-humanities-ai.md`: first multi-day workshop transcribed from the poster.
- Modify `CONTENT_GUIDE.md`: workshop authoring and materials instructions with copyable templates.

### Task 1: Build and test workshop classification and grouping

**Files:**
- Create: `assets/workshops.js`
- Create: `tests/workshops.test.cjs`

- [ ] **Step 1: Write failing tests for date parsing, status override, ordering, and month grouping**

Create `tests/workshops.test.cjs` with Node's built-in test runner. Load `assets/workshops.js` through `require` and test these exact cases:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const workshops = require('../assets/workshops.js');

test('parseISODate accepts real calendar dates and rejects rollover dates', () => {
  assert.equal(workshops.parseISODate('2026-07-22').toISOString(), '2026-07-22T00:00:00.000Z');
  assert.equal(workshops.parseISODate('2026-02-30'), null);
  assert.equal(workshops.parseISODate('22/07/2026'), null);
});

test('classifyWorkshop uses end date inclusively', () => {
  const today = new Date('2026-07-23T00:00:00.000Z');
  assert.equal(workshops.classifyWorkshop({ end_date: '2026-07-23' }, today), 'upcoming');
  assert.equal(workshops.classifyWorkshop({ end_date: '2026-07-22' }, today), 'past');
});

test('classifyWorkshop honors valid override and ignores invalid override', () => {
  const today = new Date('2026-08-01T00:00:00.000Z');
  assert.equal(workshops.classifyWorkshop({ end_date: '2026-07-23', status_override: 'upcoming' }, today), 'upcoming');
  assert.equal(workshops.classifyWorkshop({ end_date: 'bad', status_override: 'past' }, today), 'past');
  assert.equal(workshops.classifyWorkshop({ end_date: 'bad', status_override: 'featured' }, today), 'unclassified');
});

test('organizeWorkshops sorts upcoming ascending and past descending', () => {
  const records = [
    { slug: 'past-old', data: { start_date: '2026-05-01', end_date: '2026-05-01' } },
    { slug: 'future-late', data: { start_date: '2026-09-01', end_date: '2026-09-01' } },
    { slug: 'past-new', data: { start_date: '2026-06-01', end_date: '2026-06-01' } },
    { slug: 'future-soon', data: { start_date: '2026-08-01', end_date: '2026-08-01' } }
  ];
  const result = workshops.organizeWorkshops(records, new Date('2026-07-21T00:00:00.000Z'));
  assert.deepEqual(result.upcoming.map(item => item.slug), ['future-soon', 'future-late']);
  assert.deepEqual(result.past.map(item => item.slug), ['past-new', 'past-old']);
});

test('groupPastByMonth keeps multiple workshops in the same localized month', () => {
  const records = [
    { slug: 'a', data: { start_date: '2026-07-22' } },
    { slug: 'b', data: { start_date: '2026-07-30' } },
    { slug: 'c', data: { start_date: '2026-06-01' } }
  ];
  const groups = workshops.groupPastByMonth(records, 'en');
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, 'July 2026');
  assert.deepEqual(groups[0].items.map(item => item.slug), ['a', 'b']);
});
```

- [ ] **Step 2: Run the tests and confirm the module is missing**

Run:

```bash
node --test tests/workshops.test.cjs
```

Expected: FAIL with `Cannot find module '../assets/workshops.js'`.

- [ ] **Step 3: Implement the pure workshop module foundation**

Create `assets/workshops.js` as a UMD-style module. The wrapper must assign the returned API to `module.exports` in Node and `window.CHAIWorkshops` in the browser. Implement:

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CHAIWorkshops = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function parseISODate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  }

  function todayUTC(now) {
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  function classifyWorkshop(data, now) {
    if (data.status_override === 'upcoming' || data.status_override === 'past') return data.status_override;
    const end = parseISODate(data.end_date);
    if (!end) return 'unclassified';
    return end >= todayUTC(now) ? 'upcoming' : 'past';
  }

  function dateValue(record) {
    const parsed = parseISODate(record.data.start_date);
    return parsed ? parsed.getTime() : 0;
  }

  function organizeWorkshops(records, now) {
    const result = { upcoming: [], past: [], unclassified: [] };
    records.forEach(record => result[classifyWorkshop(record.data, now)].push(record));
    result.upcoming.sort((a, b) => dateValue(a) - dateValue(b));
    result.past.sort((a, b) => dateValue(b) - dateValue(a));
    return result;
  }

  function groupPastByMonth(records, lang) {
    const locale = lang === 'zh' ? 'zh-TW' : 'en-US';
    const groups = [];
    const byKey = new Map();
    records.forEach(record => {
      const date = parseISODate(record.data.start_date);
      if (!date) return;
      const key = String(record.data.start_date).slice(0, 7);
      if (!byKey.has(key)) {
        const group = { key, label: new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(date), items: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      byKey.get(key).items.push(record);
    });
    return groups;
  }

  return { parseISODate, classifyWorkshop, organizeWorkshops, groupPastByMonth };
});
```

- [ ] **Step 4: Run the classification tests**

Run `node --test tests/workshops.test.cjs`.

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Commit the pure date/grouping foundation**

```bash
git add assets/workshops.js tests/workshops.test.cjs
git commit -m "Add workshop date grouping logic"
```

### Task 2: Add tested localized schedule rendering

**Files:**
- Modify: `tests/workshops.test.cjs`
- Modify: `assets/workshops.js`

- [ ] **Step 1: Add failing rendering and URL tests**

Append tests that assert:

```js
test('renderWorkshops shows coming soon and accessible disclosures', () => {
  const records = [{
    slug: 'humanities-ai',
    bodyHtml: '<p>Intro</p>',
    data: {
      title: 'Humanities AI', start_date: '2026-07-22', end_date: '2026-07-23', venue: 'Room 113-2',
      days: [{ date: '2026-07-22', label: 'Day 1', sessions: [
        { time: '10:00–10:50', title: 'Introduction', speaker: 'Instructor', details: 'Lab', materials: [] },
        { time: '10:50–11:00', title: 'Break', kind: 'break', materials: [] }
      ] }]
    }
  }];
  const html = workshops.renderWorkshops(records, 'en', new Date('2026-07-21T00:00:00.000Z'));
  assert.match(html, /Upcoming workshops/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Coming soon/);
  assert.doesNotMatch(html, />Break<\/button>/);
});

test('renderWorkshops marks only https links as external and escapes content', () => {
  const records = [{
    slug: 'safe', bodyHtml: '', data: {
      title: '<Unsafe>', start_date: '2026-07-22', end_date: '2026-07-22', days: [{
        date: '2026-07-22', label: 'Day', sessions: [{ time: '10:00', title: 'Session', materials: [
          { label: 'Local', url: 'assets/materials/file.pdf' },
          { label: 'Drive', url: 'https://drive.google.com/file/d/id/view' },
          { label: 'Blocked', url: 'javascript:alert(1)' }
        ] }]
      }]
    }
  }];
  const html = workshops.renderWorkshops(records, 'en', new Date('2026-07-21T00:00:00.000Z'));
  assert.match(html, /&lt;Unsafe&gt;/);
  assert.match(html, /href="assets\/materials\/file\.pdf"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /javascript:/);
});

test('renderWorkshops localizes archive groups and failure messages', () => {
  const records = [
    { slug: 'past', bodyHtml: '', data: { title: '過往', start_date: '2026-06-01', end_date: '2026-06-01', days: [] } },
    { slug: 'bad', error: true, errorMessage: 'HTTP 404', data: {} }
  ];
  const html = workshops.renderWorkshops(records, 'zh', new Date('2026-07-21T00:00:00.000Z'));
  assert.match(html, /過往工作坊/);
  assert.match(html, /2026年6月/);
  assert.match(html, /無法載入工作坊/);
});
```

- [ ] **Step 2: Run tests and confirm `renderWorkshops` is undefined**

Run `node --test tests/workshops.test.cjs`.

Expected: the 5 foundation tests pass and 3 new tests fail because `renderWorkshops` does not exist.

- [ ] **Step 3: Implement localized rendering in `assets/workshops.js`**

Implement private helpers named `escapeHTML`, `safeMaterialURL`, `formatDateRange`, `renderMaterials`, `renderSession`, `renderDay`, `renderWorkshop`, and `renderGroup`. Use the exact `en`/`zh` label map below; the helper inputs and output contract are specified immediately after it.

```js
const labels = {
  en: { upcoming: 'Upcoming workshops', past: 'Past workshops', unclassified: 'Other workshops', comingSoon: 'Coming soon', materials: 'Teaching materials', loadError: 'Could not load workshop', time: 'Time', session: 'Session', speaker: 'Instructor / speaker', details: 'Details' },
  zh: { upcoming: '近期工作坊', past: '過往工作坊', unclassified: '其他工作坊', comingSoon: '即將上線', materials: '教學資料', loadError: '無法載入工作坊', time: '時間', session: '場次', speaker: '講者／講師', details: '內容' }
};

function safeMaterialURL(value) {
  const url = String(value || '').trim();
  if (/^https:\/\//i.test(url)) return { url, external: true };
  if (/^(assets|content)\/[A-Za-z0-9._~!$&'()+,;=:@%\/-]+$/.test(url)) return { url, external: false };
  return null;
}
```

Helper contracts:

- `escapeHTML(value)` converts the value to a string and escapes `&`, `<`, `>`, `"`, and `'`.
- `formatDateRange(data, lang)` parses `start_date` and `end_date`, uses `en-US` for English and `zh-TW` for Chinese with UTC date formatting, returns one localized date when both values match, a localized range when they differ, and the original non-empty values joined with `–` when parsing fails.
- `renderMaterials(materials, labelsForLang, panelId)` filters through `safeMaterialURL`, renders a `<div id="..." class="materials-panel" hidden>`, renders all accepted URLs as labeled anchors, and renders `.materials-coming-soon` when no accepted link remains.
- `renderSession(session, context)` uses `context.slug`, `dayIndex`, and `sessionIndex` for a unique panel ID; assigns the four visible cells the classes `.schedule-time`, `.schedule-session`, `.schedule-speaker`, and `.schedule-details`; renders teaching titles as `.session-toggle`; and renders non-teaching rows with `.is-non-teaching` and plain title text.
- `renderDay(day, context)` emits `.schedule-day`, a localized heading, the four-column `.schedule-head`, and every session in source order.
- `renderWorkshop(record, lang, status)` escapes frontmatter values, preserves `bodyHtml` only in `.workshop-intro.markdown-body`, emits a `.workshop-card`, and uses a workshop panel ID derived from the escaped slug.
- `renderGroup(title, recordsHtml, className)` omits empty groups and otherwise emits one `.workshop-section` with its heading and records.

Use deterministic IDs derived from the manifest slug plus day/session indices. Workshop and teaching-session controls must be `<button type="button">` elements with `aria-expanded="false"` and `aria-controls`. Their controlled panels start with `hidden`. Non-teaching `kind` values render text, never a button. Material arrays render all valid links; if none remain after validation, render the localized coming-soon text. External links receive `target="_blank" rel="noopener noreferrer"`; local links receive neither attribute.

`renderWorkshops(records, lang, now)` must:

1. Separate `error: true` records from valid records.
2. Call `organizeWorkshops` for valid records.
3. Render upcoming records as one group.
4. Render past records through `groupPastByMonth`.
5. Render invalid-date records in the unclassified group.
6. Append localized per-record load errors without hiding valid records.
7. Return a localized manifest error block when invoked with a non-array value.

Export `renderWorkshops` alongside the four foundation functions.

- [ ] **Step 4: Run all renderer tests**

Run `node --test tests/workshops.test.cjs`.

Expected: 8 tests pass, 0 fail.

- [ ] **Step 5: Commit the renderer**

```bash
git add assets/workshops.js tests/workshops.test.cjs
git commit -m "Render bilingual workshop schedules"
```

### Task 3: Integrate the renderer into the SPA

**Files:**
- Modify: `index.html:134-174`
- Modify: `assets/script.js:111-169,382-526,606-630,713-729`
- Modify: `content/sections.json`

- [ ] **Step 1: Add a failing structural smoke check**

Run:

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const s=JSON.parse(fs.readFileSync('content/sections.json','utf8'));if(!h.includes('data-workshops')||!s.sections.some(x=>x.slug==='workshops'))process.exit(1)"
```

Expected: exit status 1.

- [ ] **Step 2: Register the seventh section**

Append this object after `team` in `content/sections.json`, adding the required comma before it:

```json
{
  "slug": "workshops",
  "num": "07",
  "nav": { "en": "Workshops", "zh": "每月工作坊" }
}
```

- [ ] **Step 3: Add the page host and workshop module script**

Add this section before `</main>` in `index.html`:

```html
<section class="page" data-page="workshops" aria-labelledby="workshops-h" hidden>
  <header class="page-header" data-page-header></header>
  <article class="page-body markdown-body" data-content="workshops">
    <p class="loading mono">Loading…</p>
  </article>
  <div class="workshops-host" data-workshops aria-live="polite">
    <p class="loading mono">Loading workshops…</p>
  </div>
</section>
```

Load the new module immediately before the main script and update both cache-busting query values to a workshop-specific date token:

```html
<script src="assets/workshops.js?v=20260721-workshops"></script>
<script src="assets/script.js?v=20260721-workshops"></script>
```

- [ ] **Step 4: Add manifest and workshop document fetching**

In `assets/script.js`, add `workshopManifestPromise` and `workshopCache = { en: {}, zh: {} }`. Implement:

```js
async function fetchWorkshopManifest() {
  if (!workshopManifestPromise) {
    workshopManifestPromise = fetch('content/workshops/index.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => Array.isArray(json.workshops) ? json.workshops : Promise.reject(new Error('Invalid workshop manifest')));
  }
  return workshopManifestPromise;
}

async function fetchWorkshop(lang, slug) {
  if (workshopCache[lang][slug]) return workshopCache[lang][slug];
  const url = `content/workshops/${lang}/${slug}.md`;
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseFrontmatter(await response.text());
    const record = { slug, data: parsed.data, bodyHtml: typeof marked !== 'undefined' ? marked.parse(parsed.body) : `<pre>${escapeHTML(parsed.body)}</pre>` };
    workshopCache[lang][slug] = record;
    return record;
  } catch (error) {
    return { slug, data: {}, bodyHtml: '', error: true, errorMessage: error.message };
  }
}

async function renderWorkshopSection(lang) {
  const host = document.querySelector('[data-workshops]');
  if (!host || !window.CHAIWorkshops) return;
  host.innerHTML = `<p class="loading mono">${lang === 'zh' ? '載入工作坊中…' : 'Loading workshops…'}</p>`;
  try {
    const slugs = await fetchWorkshopManifest();
    const records = await Promise.all(slugs.map(slug => fetchWorkshop(lang, slug)));
    if (document.body.dataset.lang !== lang) return;
    host.innerHTML = window.CHAIWorkshops.renderWorkshops(records, lang, new Date());
    requestAnimationFrame(refreshReveals);
  } catch (error) {
    console.error('Could not load workshop manifest', error);
    host.innerHTML = window.CHAIWorkshops.renderWorkshops(null, lang, new Date());
  }
}
```

Invoke `renderWorkshopSection(lang)` once from `applyLang` after scheduling the standard section fetches. The active-language guard prevents a slow request from replacing a newer language selection.

- [ ] **Step 5: Add delegated accordion behavior**

Extend the existing document click handler. When the closest target has `[data-workshop-toggle]` or `[data-materials-toggle]`, toggle its controlled element's `hidden` property and mirror the state in `aria-expanded`. Do this before the existing route-link branch so buttons do not enter route handling:

```js
const disclosure = e.target.closest('[data-workshop-toggle], [data-materials-toggle]');
if (disclosure) {
  const panel = document.getElementById(disclosure.getAttribute('aria-controls'));
  if (!panel) return;
  const expanded = disclosure.getAttribute('aria-expanded') === 'true';
  disclosure.setAttribute('aria-expanded', String(!expanded));
  panel.hidden = expanded;
  return;
}
```

- [ ] **Step 6: Run structural and unit checks**

Run the Step 1 smoke command again, followed by:

```bash
node --check assets/script.js
node --check assets/workshops.js
node --test tests/workshops.test.cjs
```

Expected: smoke command exits 0, both syntax checks exit 0, and all 8 tests pass.

- [ ] **Step 7: Commit SPA integration**

```bash
git add index.html assets/script.js content/sections.json
git commit -m "Integrate workshops into site navigation"
```

### Task 4: Add bilingual July workshop content

**Files:**
- Create: `content/en/workshops.md`
- Create: `content/zh/workshops.md`
- Create: `content/workshops/index.json`
- Create: `content/workshops/en/2026-07-22-humanities-ai.md`
- Create: `content/workshops/zh/2026-07-22-humanities-ai.md`

- [ ] **Step 1: Add a failing content-pair validation command**

Run:

```bash
node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('content/workshops/index.json','utf8'));for(const slug of m.workshops)for(const lang of ['en','zh'])if(!fs.existsSync('content/workshops/'+lang+'/'+slug+'.md'))throw Error(lang+'/'+slug)"
```

Expected: FAIL because `content/workshops/index.json` does not exist.

- [ ] **Step 2: Create localized section introductions and the manifest**

Create `content/en/workshops.md`:

```markdown
---
title: Workshops
subtitle: Monthly hands-on learning for humanities scholars
lede: Explore upcoming workshops and revisit teaching materials from past sessions.
---

Workshop schedules and materials are updated here as they become available.
```

Create `content/zh/workshops.md`:

```markdown
---
title: 每月工作坊
subtitle: 為人文領域學者舉辦的每月實作交流
lede: 查看近期工作坊，並瀏覽過往場次的教學資料。
---

工作坊時程與教學資料將於此持續更新。
```

Create `content/workshops/index.json`:

```json
{
  "comment": "Add each workshop slug once. Matching files are required in content/workshops/en/ and content/workshops/zh/.",
  "workshops": [
    "2026-07-22-humanities-ai"
  ]
}
```

- [ ] **Step 3: Transcribe the complete Traditional Chinese poster schedule**

Create `content/workshops/zh/2026-07-22-humanities-ai.md` with dates `2026-07-22` through `2026-07-23`, venue `臺大人文大樓 B1 113-2`, and these rows in order:

- Day 1 label `教學日：工具實作`
- `09:30–10:00` 報到 (`kind: registration`)
- `10:00–10:50` 人文 AI 導論; 謝舒凱; `Lab: Claude 概覽`
- `10:50–11:00` 拍照與茶敘休息 (`kind: break`)
- `11:00–12:00` Claude 初探; 王伯雅; `Lab: 系統設定、概念簡介、Dispatch 與 Claude Design 展示`
- `12:00–13:00` 午餐休息 (`kind: meal`)
- `13:00–14:00` Claude 研究基礎應用; 陳品而; `Lab: Claude Code`
- `14:10–15:10` 用 AI 打造研究工作流; 陳章伶; `Lab: Claude Agent`
- `15:10–15:30` 茶敘休息 (`kind: break`)
- `15:30–16:30` Claude × 研究智能體 Agents; 王伯雅; `Lab: 整合實作＋研究想法展示 Artifacts`
- `16:30` 小結 (`kind: closing`)
- Day 2 label `交流日：演講＋交流`
- `08:50–09:00` 報到 (`kind: registration`)
- `09:15–10:15` 人文 AI 研究與應用分享; `核桃運算公司 許有進博士、劉安陸博士、Edward Yu 博士`
- `10:15–10:30` 拍照、茶敘休息與交流 (`kind: break`)
- `10:30–12:00` 合作媒合與研究晤談; `有意與 CHAI 團隊合作的老師，歡迎前來交流`
- `12:00` 工作坊結束與人文館參觀 (`kind: closing`)

Teaching sessions must contain `materials: []`; non-teaching rows must set `kind` and may omit materials. Include a short Markdown body noting that teaching materials will be added as they become available.

- [ ] **Step 4: Create the synchronized English workshop file**

Create `content/workshops/en/2026-07-22-humanities-ai.md` with identical dates, ordering, `kind` values, and empty teaching material lists. Translate the title as `AI × Humanities Scholars Workshop`, venue as `NTU Humanities Building, B1 113-2`, day labels as `Teaching day · Hands-on tools` and `Exchange day · Talks and discussion`, and translate every row faithfully without changing names or lab product names.

- [ ] **Step 5: Validate paired files and parsed schedule counts**

Run the Step 1 pairing command; expect exit 0. Then run a short Node validation that reads both workshop documents and asserts both contain exactly two day entries, fifteen `time:` rows, matching `start_date`/`end_date`, and no `http:` material URL. Expected: exit 0 with `Workshop content pairs valid`.

- [ ] **Step 6: Commit bilingual content**

```bash
git add content/en/workshops.md content/zh/workshops.md content/workshops
git commit -m "Add first bilingual workshop schedule"
```

### Task 5: Style responsive, accessible workshop components

**Files:**
- Modify: `assets/styles.css`
- Modify: `index.html:15,174-175`

- [ ] **Step 1: Establish a failing stylesheet smoke check**

Run:

```bash
node -e "const css=require('fs').readFileSync('assets/styles.css','utf8');for(const c of ['.workshop-card','.schedule-row','.materials-panel'])if(!css.includes(c))throw Error(c)"
```

Expected: FAIL on `.workshop-card`.

- [ ] **Step 2: Add workshop component styles using existing tokens**

Append a dedicated `WORKSHOPS` section to `assets/styles.css` implementing all of these exact selectors and declarations:

- `.workshops-host`, `.workshop-section`, and `.workshop-month` vertical rhythm
- `.workshop-card` elevated background, hairline border, 16–18px radius, and overflow clipping
- `.workshop-toggle` full-width grid/flex header with inherited foreground color
- `.workshop-status` compact mono pill using gold/green accents
- `.workshop-panel` spacing and border top
- `.schedule-grid` with a semantic table-like four-column header
- `.schedule-row` columns `minmax(7rem,.7fr) minmax(12rem,1.5fr) minmax(9rem,1fr) minmax(12rem,1.3fr)`
- `.schedule-row.is-non-teaching` subdued background and typography
- `.session-toggle` text-aligned, underlined-on-hover title button
- `.materials-panel` full-row placement, soft background, and visible material-link focus states
- `.workshop-load-error` using the existing burnt accent without hiding adjacent content
- `[hidden] { display: none !important; }` scoped to workshop panels if the global rule does not already cover them
- `:focus-visible` outlines on both disclosure controls
- disclosure chevrons rotated by `[aria-expanded="true"]`
- dark-theme adjustments only where existing CSS variables do not already provide contrast

Use `display: grid`, `gap`, `padding`, `border: 1px solid var(--hairline)`, `background: var(--bg-elev)`, `color: var(--fg)`, `border-radius`, and the existing font variables rather than introducing new color tokens. Set disclosure buttons to `appearance: none; border: 0; background: transparent; color: inherit; cursor: pointer`. Set focus to `outline: 3px solid var(--gold); outline-offset: 3px`. Place `.materials-panel` across the full schedule width with `grid-column: 1 / -1`. Rotate each CSS chevron from `0deg` to `90deg` when its button has `aria-expanded="true"`.

At `max-width: 720px`, hide the schedule column header and change `.schedule-row` to one column. Use generated or explicit small localized field labels already present in the rendered markup so time, speaker, and details remain understandable. Keep a minimum 44px interactive target height.

- [ ] **Step 3: Update CSS cache busting**

Change the stylesheet URL in `index.html` to:

```html
<link rel="stylesheet" href="assets/styles.css?v=20260721-workshops" />
```

- [ ] **Step 4: Run stylesheet, syntax, and unit checks**

Run the Step 1 smoke check again, then:

```bash
node --check assets/workshops.js
node --check assets/script.js
node --test tests/workshops.test.cjs
git diff --check
```

Expected: all commands exit 0 and all 8 tests pass.

- [ ] **Step 5: Commit styles**

```bash
git add assets/styles.css index.html
git commit -m "Style responsive workshop schedules"
```

### Task 6: Document the Markdown maintenance workflow

**Files:**
- Modify: `CONTENT_GUIDE.md`

- [ ] **Step 1: Add the workshop directory map and editing sequence**

Update the opening directory diagram to include the two section-introduction files and `content/workshops/{index.json,en/,zh/}`. Add an editor sequence: copy both language templates, choose a unique `<start-date>-<slug>`, keep dates/structure synchronized, add the slug to the manifest once, add local files under `assets/materials/<year>/<workshop-slug>/`, preview, and commit.

- [ ] **Step 2: Document every supported field and classification rule**

Add tables covering required/optional workshop, day, session, and material fields. State exactly:

- the end date remains upcoming through that local calendar day
- `status_override: upcoming` or `past` wins over automatic classification
- omitting the override or using `status_override: ""` restores automatic classification
- invalid dates are kept visible in Other workshops / 其他工作坊
- `kind: session` is interactive by default; `break`, `registration`, `meal`, and `closing` are plain rows
- omit `materials` or use `materials: []` to display the localized coming-soon state for teaching sessions
- only repository-relative `assets/...` or `content/...` paths and external `https://` URLs are accepted

- [ ] **Step 3: Add complete copyable English and Chinese templates**

Include full paired templates with two days, one teaching session with both a local PDF and an external HTTPS link, one teaching session with `materials: []`, and one break row. Use `FILE_ID` in the illustrative Google Drive URL and explicitly label it as a value editors must replace.

- [ ] **Step 4: Read back documentation and check formatting**

Run:

```bash
rg -n "workshops/index.json|status_override|Coming soon|即將上線|assets/materials" CONTENT_GUIDE.md
git diff --check
```

Expected: every pattern is present and `git diff --check` reports no errors.

- [ ] **Step 5: Commit editor documentation**

```bash
git add CONTENT_GUIDE.md
git commit -m "Document workshop content updates"
```

### Task 7: Full local verification and regression review

**Files:**
- Verify all files changed in Tasks 1–6

- [ ] **Step 1: Run all static and unit checks from a clean command prompt**

```bash
node --check assets/workshops.js
node --check assets/script.js
node --test tests/workshops.test.cjs
node -e "JSON.parse(require('fs').readFileSync('content/sections.json'));JSON.parse(require('fs').readFileSync('content/workshops/index.json'));console.log('JSON valid')"
git diff --check HEAD~6
```

Expected: syntax checks exit 0, 8 tests pass, `JSON valid` prints, and the diff check is silent. If the actual number of implementation commits differs from six, replace `HEAD~6` with the commit immediately before Task 1.

- [ ] **Step 2: Start the static preview server**

Run from the repository root:

```bash
python3 -m http.server 8000
```

Expected: `Serving HTTP on ... port 8000`. Keep this process running during browser checks.

- [ ] **Step 3: Verify English content and interactions at `http://localhost:8000/#workshops`**

Confirm the `07 Workshops` navigation item routes correctly; page title and introduction render; the July 22–23 workshop appears in the category determined by the current date; workshop expansion reveals two days and fifteen rows; every teaching-session title toggles its controlled panel; empty teaching sessions say `Coming soon`; non-teaching rows are not buttons; and no console errors occur.

- [ ] **Step 4: Verify language behavior**

Toggle to Traditional Chinese while remaining on `#workshops`. Confirm navigation, page copy, status/group labels, date format, day labels, all sessions, and `即將上線` update without briefly settling on stale English content. Toggle back to English and confirm the same workshop remains usable.

- [ ] **Step 5: Verify responsive, theme, and keyboard behavior**

At a viewport around 390px wide, confirm schedule rows stack without horizontal scrolling or clipped text. Check light and dark themes. Using only Tab, Shift+Tab, Enter, and Space, operate workshop/session disclosures and confirm visible focus. Inspect disclosure buttons to confirm `aria-expanded` matches panel visibility and `aria-controls` targets a unique ID.

- [ ] **Step 6: Verify date and failure cases without retaining fixtures**

In browser devtools or a temporary local console call to `CHAIWorkshops.renderWorkshops`, verify an end date equal to today is upcoming, a valid override wins, two past records in one month share a month heading, an invalid date appears under Other workshops, an invalid material protocol is omitted, and one `error: true` record does not hide valid records. Do not commit temporary fixtures.

- [ ] **Step 7: Regression-check existing pages**

Visit `#vision`, `#dialogue`, `#agents`, `#projects`, `#events`, and `#team` in both languages. Confirm routing, headings, structured components, embeds, language toggle, theme toggle, and mobile drawer still work.

- [ ] **Step 8: Review repository state and final diff**

```bash
git status --short --branch
git log --oneline --decorate -8
git diff HEAD~6 --stat
```

Expected: `main` contains the focused implementation commits, the worktree is clean, and the diff contains only the planned workshop feature, content, tests, styling, shell integration, and documentation. Adjust the base commit as noted in Step 1 when the implementation commit count differs.
