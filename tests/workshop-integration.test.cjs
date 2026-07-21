const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/script.js'), 'utf8');
const sections = JSON.parse(fs.readFileSync(path.join(root, 'content/sections.json'), 'utf8'));

function loadFunction(name) {
  const start = script.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const open = script.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (; end < script.length; end++) {
    if (script[end] === '{') depth++;
    if (script[end] === '}' && --depth === 0) break;
  }
  return vm.runInNewContext(`(${script.slice(start, end + 1).trim()})`);
}

test('workshops are registered as section 07 in both languages', () => {
  assert.deepEqual(sections.sections.at(-1), {
    slug: 'workshops',
    num: '07',
    nav: { en: 'Workshops', zh: 'CHAI 工作坊' },
  });
});

test('workshop page has content and live renderer hosts', () => {
  assert.match(html, /<section class="page" data-page="workshops" aria-labelledby="workshops-h" hidden>/);
  assert.match(html, /<article class="page-body markdown-body" data-content="workshops">[\s\S]*?Loading…[\s\S]*?<\/article>/);
  assert.match(html, /<div class="workshops-host" data-workshops aria-busy="true">[\s\S]*?Loading workshops…[\s\S]*?<\/div>/);
});

test('frontmatter parser and workshop renderer load before the version-matched SPA script', () => {
  const frontmatterIndex = html.indexOf('<script src="assets/frontmatter.js?v=20260721-workshops"></script>');
  const workshopIndex = html.indexOf('<script src="assets/workshops.js?v=20260721-workshops"></script>');
  const appIndex = html.indexOf('<script src="assets/script.js?v=20260721-workshops"></script>');
  assert.ok(frontmatterIndex >= 0);
  assert.ok(workshopIndex > frontmatterIndex);
  assert.ok(appIndex > workshopIndex);
});

test('SPA provides workshop loading and rendering integration', () => {
  assert.match(script, /const parseFrontmatter = window\.CHAIFrontmatter\.parseFrontmatter/);
  assert.doesNotMatch(script, /function (?:coerce|parseFrontmatter)\(/);
  assert.match(script, /Could not start the site: frontmatter parser failed to load\./);
  assert.match(script, /querySelectorAll\('\[data-content\], \[data-workshops\]'\)/);
  for (const name of ['fetchWorkshopManifest', 'fetchWorkshop', 'renderWorkshopSection']) {
    assert.match(script, new RegExp('function ' + name + '\\('));
  }
  assert.match(script, /window\.CHAIWorkshops\.renderWorkshops\(records, lang, new Date\(\)\)/);
  assert.match(script, /isCurrentLanguage\(lang, document\.body\)/);

  const applyLang = script.match(/function applyLang\(lang\) \{([\s\S]*?)\n  \}/);
  assert.ok(applyLang);
  assert.equal((applyLang[1].match(/renderWorkshopSection\(lang\)/g) || []).length, 1);
});

test('document click path handles workshop disclosures before routes', () => {
  const clickHandler = script.match(/document\.addEventListener\('click', e => \{([\s\S]*?)\n  \}\);/);
  assert.ok(clickHandler);
  const body = clickHandler[1];
  const disclosureIndex = body.indexOf("closest('[data-workshop-toggle], [data-materials-toggle]')");
  const routeIndex = body.indexOf("closest('a[data-route]')");
  assert.ok(disclosureIndex >= 0);
  assert.ok(routeIndex > disclosureIndex);
  assert.match(body, /getAttribute\('aria-controls'\)/);
  assert.match(body, /panel\.hidden = !panel\.hidden/);
  assert.match(body, /setAttribute\('aria-expanded'/);
});

test('section responses are accepted only for the currently active language', () => {
  const isCurrentLanguage = loadFunction('isCurrentLanguage');

  assert.equal(isCurrentLanguage('en', { dataset: { lang: 'en' } }), true);
  assert.equal(isCurrentLanguage('en', { dataset: { lang: 'zh' } }), false);
  assert.equal(isCurrentLanguage('zh', { dataset: { lang: 'en' } }), false);
});

test('manifest normalization isolates malformed entries without dropping valid slugs', () => {
  const prepareWorkshopEntries = loadFunction('prepareWorkshopEntries');
  const entries = prepareWorkshopEntries([
    'humanities-ai', '__proto__', '../secret', 'with/slash', 'with.dot', null, 42, 'valid-2',
  ]);

  assert.deepEqual(Array.from(entries, entry => ({ ...entry })), [
    { valid: true, slug: 'humanities-ai' },
    { valid: false, slug: 'invalid-workshop-2', errorMessage: 'Invalid workshop slug' },
    { valid: false, slug: 'invalid-workshop-3', errorMessage: 'Invalid workshop slug' },
    { valid: false, slug: 'invalid-workshop-4', errorMessage: 'Invalid workshop slug' },
    { valid: false, slug: 'invalid-workshop-5', errorMessage: 'Invalid workshop slug' },
    { valid: false, slug: 'invalid-workshop-6', errorMessage: 'Invalid workshop slug' },
    { valid: false, slug: 'invalid-workshop-7', errorMessage: 'Invalid workshop slug' },
    { valid: true, slug: 'valid-2' },
  ]);
});

test('prepared manifest entries fetch only valid slugs and preserve isolated errors', async () => {
  const fetchPreparedWorkshopEntries = loadFunction('fetchPreparedWorkshopEntries');
  const requested = [];
  const records = await fetchPreparedWorkshopEntries([
    { valid: true, slug: 'safe-one' },
    { valid: false, slug: 'invalid-workshop-2', errorMessage: 'Invalid workshop slug' },
    { valid: true, slug: 'safe-two' },
  ], 'en', async (lang, slug) => {
    requested.push(`${lang}/${slug}`);
    return { slug, data: { title: slug }, bodyHtml: '' };
  });

  assert.deepEqual(requested, ['en/safe-one', 'en/safe-two']);
  assert.equal(records.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(records[1])), {
    slug: 'invalid-workshop-2', data: {}, bodyHtml: '', error: true,
    errorMessage: 'Invalid workshop slug',
  });
});

test('workshop host uses busy state without announcing the final schedule as a live region', () => {
  assert.match(html, /<div class="workshops-host" data-workshops aria-busy="true">/);
  assert.doesNotMatch(html, /data-workshops[^>]*aria-live/);
  assert.match(html, /<p class="loading mono" role="status">Loading workshops…<\/p>/);
  assert.match(script, /host\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(script, /host\.setAttribute\('aria-busy', 'false'\)/);
});

test('workshop renderer fetches only normalized valid entries and emits isolated failures', () => {
  assert.match(script, /prepareWorkshopEntries\(manifest\)/);
  assert.match(script, /fetchPreparedWorkshopEntries\(entries, lang, fetchWorkshop\)/);
  assert.match(script, /error:\s*true,[\s\S]{0,50}errorMessage: entry\.errorMessage/);
  assert.match(script, /Object\.create\(null\)/);
});
