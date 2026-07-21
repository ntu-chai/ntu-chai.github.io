const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const compact = css.replace(/\s+/g, ' ');

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = compact.match(new RegExp(escaped + '\\s*\\{([^}]+)\\}'));
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1];
}

test('workshop cards and disclosure controls provide elevated layout and usable targets', () => {
  assert.match(css, /WORKSHOPS/);
  const card = rule('.workshop-card');
  assert.match(card, /background:\s*var\(--bg-elev\)/);
  assert.match(card, /border:\s*1px solid var\(--hairline\)/);
  assert.match(card, /border-radius:\s*(?:16|17|18)px/);
  assert.match(card, /overflow:\s*hidden/);
  assert.match(card, /box-shadow:/);

  const toggle = rule('.workshop-toggle');
  for (const property of [
    /appearance:\s*none/, /width:\s*100%/, /min-height:\s*44px/,
    /border:\s*0/, /background:\s*transparent/, /color:\s*inherit/,
    /cursor:\s*pointer/, /font:\s*inherit/, /text-align:\s*left/,
  ]) assert.match(toggle, property);
});

test('workshop metadata, status, and panel follow the site typography and rhythm', () => {
  assert.match(rule('.workshop-date, .workshop-venue'), /color:\s*var\(--ink-soft\)/);
  const status = rule('.workshop-status');
  assert.match(status, /font-family:\s*var\(--f-mono\)/);
  assert.match(status, /border-radius:\s*999px/);
  assert.match(status, /color:\s*var\(--burnt\)/);
  const panel = rule('.workshop-panel');
  assert.match(panel, /border-top:\s*1px solid var\(--hairline\)/);
  assert.match(panel, /padding:/);
});

test('schedule uses an aligned four-column grid and full-width materials', () => {
  const columns = 'minmax(7rem, .7fr) minmax(12rem, 1.5fr) minmax(9rem, 1fr) minmax(12rem, 1.3fr)';
  assert.match(rule('.schedule-head, .schedule-row'), new RegExp('grid-template-columns:\\s*' + columns.replace(/[().]/g, '\\$&')));
  assert.match(rule('.materials-panel'), /grid-column:\s*1\s*\/\s*-1/);
  const nonTeaching = rule('.schedule-row.is-non-teaching');
  assert.match(nonTeaching, /background:/);
  assert.match(nonTeaching, /color:\s*var\(--ink-soft\)/);
  assert.match(nonTeaching, /font-size:/);
});

test('session buttons and materials are readable, interactive, and theme-aware', () => {
  const session = rule('.session-toggle');
  for (const property of [
    /appearance:\s*none/, /min-height:\s*44px/, /border:\s*0/,
    /background:\s*transparent/, /font:\s*inherit/, /text-align:\s*left/,
  ]) assert.match(session, property);
  const hover = rule('.session-toggle:hover');
  assert.match(hover, /color:\s*var\(--burnt\)/);
  assert.match(hover, /text-decoration:\s*underline/);

  const materials = rule('.materials-panel');
  assert.match(materials, /grid-column:\s*1\s*\/\s*-1/);
  assert.match(materials, /background:/);
  assert.match(rule('.materials-list'), /gap:/);
  assert.match(rule('.materials-panel a'), /text-decoration:\s*underline/);
  assert.match(rule('.workshop-load-error'), /color:\s*var\(--burnt\)/);
});

test('disclosures, material links, and hidden panels expose accessible states', () => {
  const focus = rule('.workshop-toggle:focus-visible, .session-toggle:focus-visible, .materials-panel a:focus-visible');
  assert.match(focus, /outline:\s*3px solid var\(--gold\)/);
  assert.match(focus, /outline-offset:\s*3px/);
  const chevron = rule('.workshop-toggle::after, .session-toggle::after');
  assert.match(chevron, /content:/);
  assert.match(chevron, /transform:\s*rotate\(0deg\)/);
  assert.match(rule('.workshop-toggle[aria-expanded="true"]::after, .session-toggle[aria-expanded="true"]::after'), /transform:\s*rotate\(90deg\)/);
  assert.match(rule('.workshop-panel[hidden], .materials-panel[hidden]'), /display:\s*none\s*!important/);
});

test('mobile workshop schedule becomes a labelled single-column layout', () => {
  const mobile = compact.match(/@media\s*\(max-width:\s*720px\)\s*\{([\s\S]*)\}\s*(?:@media|$)/);
  assert.ok(mobile, 'missing max-width: 720px workshop styles');
  assert.match(mobile[1], /\.schedule-head\s*\{[^}]*display:\s*none/);
  assert.match(mobile[1], /\.schedule-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile[1], /\.schedule-field-label\s*\{[^}]*display:\s*(?:block|inline-block)/);
  assert.match(rule('.schedule-field-label'), /display:\s*none/);
  assert.match(rule('.workshop-card'), /min-width:\s*0/);
  assert.match(rule('.schedule-row > :not(.materials-panel)'), /overflow-wrap:\s*anywhere/);
});

test('workshop chevron motion is removed for reduced-motion users', () => {
  const reduced = compact.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\}\s*$/);
  assert.ok(reduced, 'missing reduced-motion workshop styles');
  assert.match(reduced[1], /\.workshop-toggle::after, \.session-toggle::after\s*\{[^}]*transition:\s*none/);
});

test('HTML requests the workshop stylesheet cache token', () => {
  assert.match(html, /<link rel="stylesheet" href="assets\/styles\.css\?v=20260721-workshops" \/>/);
  assert.doesNotMatch(html, /assets\/styles\.css\?v=20260609-team-links/);
  const workshopScript = html.indexOf('<script src="assets/workshops.js?v=20260721-workshops"></script>');
  const appScript = html.indexOf('<script src="assets/script.js?v=20260721-workshops"></script>');
  assert.ok(workshopScript >= 0 && appScript > workshopScript, 'versioned scripts remain present and ordered');
});
