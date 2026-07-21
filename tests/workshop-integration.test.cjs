const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/script.js'), 'utf8');
const sections = JSON.parse(fs.readFileSync(path.join(root, 'content/sections.json'), 'utf8'));

test('workshops are registered as section 07 in both languages', () => {
  assert.deepEqual(sections.sections.at(-1), {
    slug: 'workshops',
    num: '07',
    nav: { en: 'Workshops', zh: '每月工作坊' },
  });
});

test('workshop page has content and live renderer hosts', () => {
  assert.match(html, /<section class="page" data-page="workshops" aria-labelledby="workshops-h" hidden>/);
  assert.match(html, /<article class="page-body markdown-body" data-content="workshops">[\s\S]*?Loading…[\s\S]*?<\/article>/);
  assert.match(html, /<div class="workshops-host" data-workshops aria-live="polite">[\s\S]*?Loading workshops…[\s\S]*?<\/div>/);
});

test('workshop renderer loads immediately before the version-matched SPA script', () => {
  const workshopIndex = html.indexOf('<script src="assets/workshops.js?v=20260721-workshops"></script>');
  const appIndex = html.indexOf('<script src="assets/script.js?v=20260721-workshops"></script>');
  assert.ok(workshopIndex >= 0);
  assert.ok(appIndex > workshopIndex);
});

test('SPA provides workshop loading and rendering integration', () => {
  for (const name of ['fetchWorkshopManifest', 'fetchWorkshop', 'renderWorkshopSection']) {
    assert.match(script, new RegExp('function ' + name + '\\('));
  }
  assert.match(script, /window\.CHAIWorkshops\.renderWorkshops\(records, lang, new Date\(\)\)/);
  assert.match(script, /document\.body\.dataset\.lang !== lang/);

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
