const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseFrontmatter } = require('../assets/frontmatter.js');

const root = path.join(__dirname, '..');
const guide = fs.readFileSync(path.join(root, 'CONTENT_GUIDE.md'), 'utf8');
const compactGuide = guide.replace(/\s+/g, ' ');

function tableAfter(lead) {
  const start = guide.indexOf(lead);
  assert.ok(start >= 0, `missing table lead: ${lead}`);
  const rows = guide.slice(start).match(/\| Field \| Required\? \| What it does \|\n\|[^\n]+\|\n((?:\|[^\n]+\|\n?)+)/);
  assert.ok(rows, `missing table after: ${lead}`);
  return Object.fromEntries(rows[1].trim().split('\n').map(line => {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    assert.equal(cells.length, 3, `malformed table row: ${line}`);
    assert.ok(cells[1], `empty Required? cell: ${line}`);
    return [cells[0].replaceAll('`', ''), { required: cells[1], description: cells[2] }];
  }));
}

test('guide maps all workshop content and material locations', () => {
  for (const expected of [
    '7 navigation sections',
    'content/en/workshops.md',
    'content/zh/workshops.md',
    'content/workshops/index.json',
    'content/workshops/en/',
    'content/workshops/zh/',
    'assets/materials/',
  ]) assert.match(guide, new RegExp(expected.replace(/[./]/g, '\\$&')));
  assert.doesNotMatch(guide, /controls the 6 navigation sections|same six files/i);
});

test('guide documents the bilingual workshop maintenance workflow', () => {
  assert.match(guide, /## Maintaining workshops/);
  assert.match(guide, /<start-date>-<short-name>/);
  assert.match(guide, /more than one workshop\s+(?:in|per) (?:the )?same month/i);
  assert.match(guide, /add (?:the )?slug once[\s\S]{0,100}workshops\/index\.json/i);
  assert.match(guide, /assets\/materials\/<year>\/<workshop-slug>\//);
  assert.match(guide, /dates?[\s\S]{0,200}day[\s\S]{0,200}session[\s\S]{0,200}kind[\s\S]{0,200}material URLs?/i);
  assert.match(guide, /both languages[\s\S]{0,80}assets[\s\S]{0,80}manifest/i);
});

test('guide documents workshop, day, session, and material fields', () => {
  const workshop = tableAfter('Workshop-level fields:');
  assert.deepEqual(Object.keys(workshop), [
    'title', 'start_date', 'end_date', 'days', 'subtitle', 'venue',
    'status_override', 'registration_url', 'label',
  ]);
  for (const field of ['title', 'start_date', 'end_date', 'days']) assert.equal(workshop[field].required, 'Required');
  for (const field of ['subtitle', 'venue', 'status_override', 'registration_url', 'label']) assert.equal(workshop[field].required, 'Optional');
  assert.match(workshop.status_override.description, /`upcoming`.*`past`.*empty/i);

  const day = tableAfter('Each item in `days` has:');
  assert.deepEqual(Object.keys(day), ['date', 'label', 'sessions']);
  for (const field of Object.keys(day)) assert.equal(day[field].required, 'Required');

  const session = tableAfter('Each session has:');
  assert.deepEqual(Object.keys(session), ['time', 'title', 'speaker', 'details', 'kind', 'materials']);
  assert.equal(session.time.required, 'Required');
  assert.equal(session.title.required, 'Required');
  for (const field of ['speaker', 'details', 'kind']) assert.equal(session[field].required, 'Optional');
  assert.equal(session.materials.required, 'Optional (teaching sessions only)');
  assert.match(session.kind.description, /defaults? to `session`.*registration.*break.*meal.*closing/i);
  assert.match(session.materials.description, /missing.*`\[\]`.*Coming soon.*即將上線/i);

  const material = tableAfter('Each item in `materials` has:');
  assert.deepEqual(Object.keys(material), ['label', 'url']);
  for (const field of Object.keys(material)) assert.equal(material[field].required, 'Required');
});

test('guide explains workshop classification, archive, rows, and safe links', () => {
  assert.match(compactGuide, /`status_override` (?:set to )?exactly `upcoming` or `past` wins even (?:when|if) (?:the )?dates? (?:are|is) invalid/i);
  assert.match(compactGuide, /empty, omitted, or unsupported `status_override` value uses automatic/i);
  assert.match(compactGuide, /valid `end_date` on or after the visitor['’]s local (?:calendar day|today) is upcoming;? (?:a date )?before (?:that day|today) is past/i);
  assert.match(compactGuide, /automatic classification.*missing or invalid `end_date`.*Other workshops.*其他工作坊/i);
  assert.match(compactGuide, /Upcoming workshops.*`start_date` earliest-first/i);
  assert.match(compactGuide, /Past workshops.*`start_date` newest-first/i);
  assert.match(compactGuide, /localized year and month/i);
  assert.match(guide, /Coming soon/);
  assert.match(guide, /即將上線/);
  assert.match(guide, /external HTTPS/i);
  assert.match(guide, /external.*new tab/i);
  assert.match(guide, /mix.*local.*external/i);
});

test('guide provides synchronized, parser-compatible bilingual templates', () => {
  const templateSection = guide.slice(guide.indexOf('### Copyable workshop templates'), guide.indexOf('### Adding local materials and links'));
  const templates = Array.from(templateSection.matchAll(/```yaml workshop-template-(en|zh)\n([\s\S]*?)```/g));
  assert.deepEqual(templates.map(match => match[1]), ['en', 'zh']);
  const structures = [];
  for (const [, , yaml] of templates) {
    for (const key of ['title', 'subtitle', 'start_date', 'end_date', 'venue', 'status_override', 'label', 'days']) {
      assert.match(yaml, new RegExp('^' + key + ':', 'm'));
    }
    assert.doesNotMatch(yaml, /registration_(?:url|label):/);
    assert.doesNotMatch(yaml, /example\.org|https?:\/\/(?!drive\.google\.com\/file\/d\/FILE_ID\/view)/i);
    assert.equal((yaml.match(/^  - date:/gm) || []).length, 2);
    assert.equal((yaml.match(/^    sessions:/gm) || []).length, 2);
    assert.match(yaml, /assets\/materials\/2026\/2026-08-05-research-tools\/workbook\.pdf/);
    assert.match(yaml, /https:\/\/drive\.google\.com\/file\/d\/FILE_ID\/view/);
    assert.match(yaml, /^        materials: \[\]$/m);
    assert.match(yaml, /^        kind: break$/m);
    const parsed = parseFrontmatter(yaml);
    assert.equal(parsed.data.days.length, 2);
    assert.equal(parsed.data.days[0].sessions.length, 2);
    assert.equal(parsed.data.days[1].sessions.length, 1);
    assert.equal(parsed.data.days[0].sessions[0].materials.length, 2);
    assert.ok(Array.isArray(parsed.data.days[1].sessions[0].materials));
    assert.equal(parsed.data.days[1].sessions[0].materials.length, 0);
    assert.equal(parsed.data.days[0].sessions[1].kind, 'break');
    structures.push(yaml.split('\n').filter(line => /^\s*(?:[A-Za-z_]+|- [A-Za-z_]+):/.test(line))
      .map(line => line.replace(/:.*/, ':')));
  }
  assert.deepEqual(structures[0], structures[1], 'English and Chinese template keys must stay synchronized');
  assert.match(guide, /replace `?FILE_ID`?/i);
  assert.doesNotMatch(guide, /example\.org/i);
});

test('guide manifest example demonstrates distinct same-month workshops', () => {
  assert.match(guide, /"2026-08-05-research-tools"[\s\S]*"2026-08-19-digital-archives"/);
  assert.match(guide, /assets\/materials\/2026\/2026-08-05-research-tools\/workbook\.pdf/);
});
