const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const workshops = require('../assets/workshops.js');
const {
  parseISODate,
  classifyWorkshop,
  organizeWorkshops,
  groupPastByMonth,
  renderWorkshops,
} = workshops;

test('parseISODate accepts strict valid dates and rejects invalid dates', () => {
  assert.equal(parseISODate('2026-07-22').toISOString(), '2026-07-22T00:00:00.000Z');
  assert.equal(parseISODate('2026-02-30'), null);
  assert.equal(parseISODate('22/07/2026'), null);
});

test('classifyWorkshop treats the end date as inclusive', () => {
  const now = new Date('2026-07-23T00:00:00.000Z');

  assert.equal(classifyWorkshop({ end_date: '2026-07-23' }, now), 'upcoming');
  assert.equal(classifyWorkshop({ end_date: '2026-07-22' }, now), 'past');
});

test('classifyWorkshop honors valid overrides and rejects invalid undated records', () => {
  const now = new Date('2026-07-23T00:00:00.000Z');

  assert.equal(classifyWorkshop({ status_override: 'upcoming', end_date: 'invalid' }, now), 'upcoming');
  assert.equal(classifyWorkshop({ status_override: 'past', end_date: '2099-01-01' }, now), 'past');
  assert.equal(classifyWorkshop({ status_override: 'other', end_date: 'invalid' }, now), 'unclassified');
});

test('organizeWorkshops sorts upcoming ascending and past descending', () => {
  const records = [
    { slug: 'past-old', data: { start_date: '2026-05-01', end_date: '2026-05-01' } },
    { slug: 'future-late', data: { start_date: '2026-09-01', end_date: '2026-09-01' } },
    { slug: 'past-new', data: { start_date: '2026-06-01', end_date: '2026-06-01' } },
    { slug: 'future-soon', data: { start_date: '2026-08-01', end_date: '2026-08-01' } },
  ];

  const result = organizeWorkshops(records, new Date('2026-07-21T00:00:00.000Z'));

  assert.deepEqual(result.upcoming.map(({ slug }) => slug), ['future-soon', 'future-late']);
  assert.deepEqual(result.past.map(({ slug }) => slug), ['past-new', 'past-old']);
});

test('groupPastByMonth groups records by month in insertion order', () => {
  const records = [
    { slug: 'july-one', data: { start_date: '2026-07-20', end_date: '2026-07-20' } },
    { slug: 'july-two', data: { start_date: '2026-07-05', end_date: '2026-07-05' } },
    { slug: 'june', data: { start_date: '2026-06-10', end_date: '2026-06-10' } },
  ];

  const groups = groupPastByMonth(records, 'en');

  assert.equal(groups.length, 2);
  assert.equal(groups[0].key, '2026-07');
  assert.equal(groups[0].label, 'July 2026');
  assert.deepEqual(groups[0].items.map(({ slug }) => slug), ['july-one', 'july-two']);
});

test('groupPastByMonth localizes Chinese month labels', () => {
  const groups = groupPastByMonth([
    { slug: 'june', data: { start_date: '2026-06-10', end_date: '2026-06-10' } },
  ], 'zh');

  assert.equal(groups[0].label, '2026年6月');
});

test('browser build exposes the workshops API as a global', () => {
  const source = fs.readFileSync(path.join(__dirname, '../assets/workshops.js'), 'utf8');
  const context = { Intl, Date };
  context.window = context;

  vm.runInNewContext(source, context);

  assert.equal(typeof context.CHAIWorkshops.parseISODate, 'function');
  assert.equal(typeof context.CHAIWorkshops.renderWorkshops, 'function');
});

test('renderWorkshops shows coming soon and accessible disclosures', () => {
  const records = [{
    slug: 'humanities-ai',
    bodyHtml: '<p>Intro</p>',
    data: {
      title: 'Humanities AI', start_date: '2026-07-22', end_date: '2026-07-23', venue: 'Room 113-2',
      days: [{ date: '2026-07-22', label: 'Day 1', sessions: [
        { time: '10:00–10:50', title: 'Introduction', speaker: 'Instructor', details: 'Lab', materials: [] },
        { time: '10:50–11:00', title: 'Break', kind: 'break', materials: [] },
      ] }],
    },
  }];

  const html = renderWorkshops(records, 'en', new Date('2026-07-21T00:00:00.000Z'));

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
          { label: 'Blocked', url: 'javascript:alert(1)' },
        ] }],
      }],
    },
  }];

  const html = renderWorkshops(records, 'en', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /&lt;Unsafe&gt;/);
  assert.match(html, /href="assets\/materials\/file\.pdf"/);
  assert.doesNotMatch(html, /href="assets\/materials\/file\.pdf"[^>]*target=/);
  assert.match(html, /href="https:\/\/drive\.google\.com\/file\/d\/id\/view" target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /javascript:/);
});

test('renderWorkshops localizes archive groups and failure messages', () => {
  const records = [
    { slug: 'past', bodyHtml: '', data: { title: '過往', start_date: '2026-06-01', end_date: '2026-06-01', days: [] } },
    { slug: 'bad', error: true, errorMessage: 'HTTP 404', data: {} },
  ];

  const html = renderWorkshops(records, 'zh', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /過往工作坊/);
  assert.match(html, /2026年6月/);
  assert.match(html, /無法載入工作坊/);
});

test('renderWorkshops uses every exact English label', () => {
  const records = [
    { slug: 'future', data: { title: 'Future', start_date: '2026-08-01', end_date: '2026-08-01', days: [{ label: 'Day', date: '2026-08-01', sessions: [{ title: 'Talk', materials: [] }] }] } },
    { slug: 'past', data: { title: 'Past', start_date: '2026-06-01', end_date: '2026-06-01', days: [] } },
    { slug: 'other', data: { title: 'Other', start_date: 'bad', end_date: 'bad', days: [] } },
    { slug: 'error', error: true, errorMessage: 'failed', data: {} },
  ];

  const html = renderWorkshops(records, 'en', new Date('2026-07-21T00:00:00.000Z'));

  for (const label of ['Upcoming workshops', 'Past workshops', 'Other workshops', 'Coming soon',
    'Teaching materials', 'Could not load workshop', 'Time', 'Session', 'Instructor / speaker', 'Details']) {
    assert.match(html, new RegExp(label.replace('/', '\\/')));
  }
});

test('renderWorkshops uses every exact Chinese label', () => {
  const records = [
    { slug: 'future', data: { title: '近期', start_date: '2026-08-01', end_date: '2026-08-01', days: [{ label: '第一天', date: '2026-08-01', sessions: [{ title: '課程', materials: [] }] }] } },
    { slug: 'past', data: { title: '過往', start_date: '2026-06-01', end_date: '2026-06-01', days: [] } },
    { slug: 'other', data: { title: '其他', start_date: 'bad', end_date: 'bad', days: [] } },
    { slug: 'error', error: true, data: {} },
  ];

  const html = renderWorkshops(records, 'zh', new Date('2026-07-21T00:00:00.000Z'));

  for (const label of ['近期工作坊', '過往工作坊', '其他工作坊', '即將上線', '教學資料',
    '無法載入工作坊', '時間', '場次', '講者／講師', '內容']) {
    assert.match(html, new RegExp(label));
  }
});

test('teaching sessions expose four labeled cells and matching material disclosure controls', () => {
  const records = [{ slug: 'access', data: {
    title: 'Accessible', start_date: '2026-08-01', end_date: '2026-08-01',
    days: [{ label: 'Day', date: '2026-08-01', sessions: [{ title: 'Teaching', materials: [] }] }],
  } }];

  const html = renderWorkshops(records, 'en', new Date('2026-07-21T00:00:00.000Z'));

  for (const className of ['schedule-time', 'schedule-session', 'schedule-speaker', 'schedule-details']) {
    assert.match(html, new RegExp('class="' + className + '"'));
  }
  for (const fieldLabel of ['Time', 'Session', 'Instructor / speaker', 'Details']) {
    assert.match(html, new RegExp('schedule-field-label">' + fieldLabel.replace('/', '\\/')));
  }
  const control = html.match(/<button type="button" class="session-toggle" data-materials-toggle aria-expanded="false" aria-controls="([^"]+)"/);
  assert.ok(control);
  assert.match(html, new RegExp('<div id="' + control[1] + '" class="materials-panel" hidden>'));
});

test('workshop disclosure controls a matching hidden panel', () => {
  const html = renderWorkshops([{ slug: 'card', data: {
    title: 'Card', start_date: '2026-08-01', end_date: '2026-08-01', days: [],
  } }], 'en', new Date('2026-07-21T00:00:00.000Z'));
  const control = html.match(/<button type="button" class="workshop-toggle" data-workshop-toggle aria-expanded="false" aria-controls="([^"]+)"/);

  assert.ok(control);
  assert.match(html, new RegExp('<div id="' + control[1] + '" class="workshop-panel" hidden>'));
});

test('non-teaching rows use plain titles and omit material disclosures', () => {
  const html = renderWorkshops([{ slug: 'breaks', data: {
    title: 'Breaks', start_date: '2026-08-01', end_date: '2026-08-01',
    days: [{ date: '2026-08-01', sessions: [{ title: 'Lunch', kind: 'meal', materials: [{ label: 'Nope', url: 'assets/nope.pdf' }] }] }],
  } }], 'en', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /class="schedule-row is-non-teaching"/);
  assert.match(html, /<span class="session-title">Lunch<\/span>/);
  assert.doesNotMatch(html, /data-materials-toggle/);
  assert.doesNotMatch(html, /materials-panel/);
});

test('days localize dates, render headers, and preserve session source order', () => {
  const html = renderWorkshops([{ slug: 'order', data: {
    title: '順序', start_date: '2026-08-02', end_date: '2026-08-02',
    days: [{ label: '第二天', date: '2026-08-02', sessions: [
      { title: '甲', materials: [] }, { title: '乙', materials: [] },
    ] }],
  } }], 'zh', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /<h4>第二天 · 2026年8月2日<\/h4>/);
  assert.match(html, /class="schedule-head"><span>時間<\/span><span>場次<\/span><span>講者／講師<\/span><span>內容<\/span>/);
  assert.ok(html.indexOf('>甲</button>') < html.indexOf('>乙</button>'));
});

test('workshop cards render escaped metadata, trusted introduction, and schedule days', () => {
  const html = renderWorkshops([{ slug: 'complete', bodyHtml: '<p><strong>Trusted intro</strong></p>', data: {
    title: 'Full card', start_date: '2026-08-01', end_date: '2026-08-02', venue: 'Room A',
    days: [{ label: 'Day 1', date: '2026-08-01', sessions: [] }],
  } }], 'en', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /<article class="workshop-card">/);
  assert.match(html, /class="workshop-title">Full card/);
  assert.match(html, /class="workshop-date">August 1, 2026 – August 2, 2026/);
  assert.match(html, /class="workshop-venue">Room A/);
  assert.match(html, /class="workshop-status">Upcoming workshops/);
  assert.match(html, /class="workshop-intro markdown-body"><p><strong>Trusted intro<\/strong><\/p>/);
  assert.match(html, /class="schedule-day"/);
});

test('frontmatter and material attributes are escaped while bodyHtml remains trusted', () => {
  const html = renderWorkshops([{ slug: 'escape', bodyHtml: '<em data-ok="yes">Trusted & raw</em>', data: {
    title: 'A & B "double" \'single\'', start_date: '2026-08-01', end_date: '2026-08-01', venue: '<Room>',
    days: [{ label: 'D & "Q"', date: '2026-08-01', sessions: [{
      title: 'T \'one\'', materials: [{ label: 'A & "B"', url: 'content/files/a&b.pdf' }],
    }] }],
  } }], 'en', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /A &amp; B &quot;double&quot; &#39;single&#39;/);
  assert.match(html, /&lt;Room&gt;/);
  assert.match(html, /D &amp; &quot;Q&quot;/);
  assert.match(html, /T &#39;one&#39;/);
  assert.match(html, /href="content\/files\/a&amp;b\.pdf">A &amp; &quot;B&quot;<\/a>/);
  assert.match(html, /<em data-ok="yes">Trusted & raw<\/em>/);
});

test('unsafe material schemes and paths are omitted completely', () => {
  const html = renderWorkshops([{ slug: 'urls', data: {
    title: 'URLs', start_date: '2026-08-01', end_date: '2026-08-01', days: [{ date: '2026-08-01', sessions: [{
      title: 'Links', materials: [
        { label: 'JS item', url: 'javascript:alert(1)' }, { label: 'HTTP item', url: 'http://example.com/a' },
        { label: 'Absolute item', url: '/assets/a.pdf' }, { label: 'Protocol item', url: '//example.com/a' },
      ],
    }] }],
  } }], 'en', new Date('2026-07-21T00:00:00.000Z'));

  for (const forbidden of ['javascript:', 'http://', '/assets/a.pdf', '//example.com/a', 'JS item', 'HTTP item', 'Absolute item', 'Protocol item']) {
    assert.doesNotMatch(html, new RegExp(forbidden.replace(/[/.]/g, '\\$&')));
  }
  assert.match(html, /Coming soon/);
});

test('workshop dates render same-day, ranged, and invalid fallback values', () => {
  const html = renderWorkshops([
    { slug: 'same', data: { title: 'Same', start_date: '2026-08-01', end_date: '2026-08-01', days: [] } },
    { slug: 'range', data: { title: 'Range', start_date: '2026-08-02', end_date: '2026-08-03', days: [] } },
    { slug: 'invalid', data: { title: 'Invalid', start_date: 'soon', end_date: 'later', days: [] } },
  ], 'en', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /class="workshop-date">August 1, 2026<\/span>/);
  assert.match(html, /class="workshop-date">August 2, 2026 – August 3, 2026<\/span>/);
  assert.match(html, /class="workshop-date">soon – later<\/span>/);
});

test('hostile slugs produce sanitized deterministic unique disclosure IDs', () => {
  const records = [{ slug: '\"><bad>...slug!!!', data: {
    title: 'IDs', start_date: '2026-08-01', end_date: '2026-08-02', days: [
      { date: '2026-08-01', sessions: [{ title: 'One', materials: [] }, { title: 'Two', materials: [] }] },
      { date: '2026-08-02', sessions: [{ title: 'Three', materials: [] }] },
    ],
  } }];
  const first = renderWorkshops(records, 'en', new Date('2026-07-21T00:00:00.000Z'));
  const second = renderWorkshops(records, 'en', new Date('2026-07-21T00:00:00.000Z'));
  const ids = Array.from(first.matchAll(/ id="([^"]+)"/g), (match) => match[1]);

  assert.deepEqual(ids, ['bad-slug-0-panel', 'bad-slug-0-day-0-session-0-materials',
    'bad-slug-0-day-0-session-1-materials', 'bad-slug-0-day-1-session-0-materials']);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, Array.from(second.matchAll(/ id="([^"]+)"/g), (match) => match[1]));
  assert.doesNotMatch(first, /<bad>|\.\.|!!/);
});

test('Chinese teaching sessions with no valid materials show 即將上線', () => {
  const html = renderWorkshops([{ slug: 'soon', data: {
    title: '近期', start_date: '2026-08-01', end_date: '2026-08-01',
    days: [{ date: '2026-08-01', sessions: [{ title: '課程', materials: [] }] }],
  } }], 'zh', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /class="materials-coming-soon">即將上線/);
});

test('empty workshop groups are omitted', () => {
  const html = renderWorkshops([{ slug: 'future', data: {
    title: 'Only future', start_date: '2026-08-01', end_date: '2026-08-01', days: [],
  } }], 'en', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /Upcoming workshops/);
  assert.doesNotMatch(html, /Past workshops|Other workshops/);
});

test('non-array manifests return a localized load error', () => {
  assert.equal(renderWorkshops(null, 'en'), '<div class="workshop-load-error">Could not load workshop</div>');
  assert.equal(renderWorkshops({}, 'zh'), '<div class="workshop-load-error">無法載入工作坊</div>');
});

test('invalid dates render in the localized unclassified group', () => {
  const html = renderWorkshops([{ slug: 'unknown', data: {
    title: '日期未定', start_date: '待定', end_date: '', days: [],
  } }], 'zh', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /<section class="workshop-section is-unclassified"><h2>其他工作坊<\/h2>/);
  assert.match(html, /日期未定/);
});

test('upcoming and past records render in their correct groups', () => {
  const html = renderWorkshops([
    { slug: 'future', data: { title: 'Future title', start_date: '2026-08-01', end_date: '2026-08-01', days: [] } },
    { slug: 'past', data: { title: 'Past title', start_date: '2026-06-01', end_date: '2026-06-01', days: [] } },
  ], 'en', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /is-upcoming[\s\S]*Future title/);
  assert.match(html, /is-past[\s\S]*June 2026[\s\S]*Past title/);
});

test('failed records append escaped details without hiding valid records', () => {
  const html = renderWorkshops([
    { slug: 'valid', data: { title: 'Still visible', start_date: '2026-08-01', end_date: '2026-08-01', days: [] } },
    { slug: 'failed', error: true, errorMessage: '<HTTP & "bad">', data: {} },
  ], 'en', new Date('2026-07-21T00:00:00.000Z'));

  assert.match(html, /Still visible/);
  assert.match(html, /Could not load workshop: &lt;HTTP &amp; &quot;bad&quot;&gt;/);
  assert.doesNotMatch(html, /<HTTP/);
});
