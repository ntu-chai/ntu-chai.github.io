const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const slug = '2026-07-22-humanities-ai';
const languages = ['en', 'zh'];
const script = fs.readFileSync(path.join(root, 'assets/script.js'), 'utf8');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function functionSource(name) {
  const start = script.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const open = script.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (; end < script.length; end++) {
    if (script[end] === '{') depth++;
    if (script[end] === '}' && --depth === 0) break;
  }
  return script.slice(start, end + 1).trim();
}

const parseFrontmatter = vm.runInNewContext(
  `${functionSource('coerce')}\n${functionSource('parseFrontmatter')}\nparseFrontmatter`,
);

function content(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  assert.ok(match, 'expected YAML frontmatter');
  return { ...parseFrontmatter(source), yaml: match[1] };
}

test('actual frontmatter parser preserves inline empty materials arrays', () => {
  const parsed = parseFrontmatter(`---
days:
  - date: 2026-07-22
    sessions:
      - time: 10:00
        title: Teaching session
        materials: []
---
Fixture body.`);
  const materials = parsed.data.days[0].sessions[0].materials;
  assert.ok(Array.isArray(materials));
  assert.equal(materials.length, 0);
});

test('workshop manifest is valid and every bilingual workshop file exists', () => {
  const manifest = JSON.parse(read('content/workshops/index.json'));
  assert.equal(typeof manifest.comment, 'string');
  assert.deepEqual(manifest.workshops, [slug]);
  for (const language of languages) {
    for (const workshopSlug of manifest.workshops) {
      assert.ok(fs.existsSync(path.join(root, 'content/workshops', language, `${workshopSlug}.md`)));
    }
  }
});

test('both workshop section introductions use the expected titles and copy', () => {
  const expected = {
    en: ['Workshops', 'Monthly hands-on learning for humanities scholars',
      'Explore upcoming workshops and revisit teaching materials from past sessions.',
      'Workshop schedules and materials are updated here as they become available.'],
    zh: ['每月工作坊', '為人文領域學者舉辦的每月實作交流',
      '查看近期工作坊，並瀏覽過往場次的教學資料。', '工作坊時程與教學資料將於此持續更新。'],
  };
  for (const language of languages) {
    const parsed = content(read(`content/${language}/workshops.md`));
    assert.deepEqual([
      parsed.data.title, parsed.data.subtitle, parsed.data.lede, parsed.body.trim(),
    ], expected[language]);
  }
});

test('paired workshop schedules preserve dates, row semantics, and empty teaching materials', () => {
  const records = Object.fromEntries(languages.map(language => {
    return [language, content(read(`content/workshops/${language}/${slug}.md`))];
  }));
  for (const language of languages) {
    assert.equal(records[language].data.start_date, '2026-07-22');
    assert.equal(records[language].data.end_date, '2026-07-23');
    assert.equal(records[language].data.status_override, '');
    assert.equal(records[language].data.days.length, 2);
    assert.equal(records[language].data.days.flatMap(day => day.sessions).length, 15);
    assert.ok(records[language].body.length > 0);
  }

  const sessions = language => records[language].data.days.flatMap(day => day.sessions);
  const values = (language, key) => Array.from(sessions(language), row => row[key]);
  assert.deepEqual(Array.from(records.en.data.days, day => day.date), Array.from(records.zh.data.days, day => day.date));
  assert.deepEqual(values('en', 'time'), values('zh', 'time'));
  assert.deepEqual(values('en', 'kind'), values('zh', 'kind'));
  assert.deepEqual(values('en', 'materials'), values('zh', 'materials'));

  const allowedKinds = new Set(['registration', 'break', 'meal', 'closing']);
  for (const language of languages) {
    for (const row of sessions(language)) {
      if (row.kind) {
        assert.ok(allowedKinds.has(row.kind), `unexpected kind ${row.kind}`);
        assert.equal(row.materials, undefined, `${row.title} is non-teaching`);
      } else {
        assert.ok(Array.isArray(row.materials), `${row.title} needs array materials`);
        assert.equal(row.materials.length, 0, `${row.title} needs materials: []`);
      }
    }
  }
});

test('workshop records contain expected titles, labels, and no insecure URLs', () => {
  const en = read(`content/workshops/en/${slug}.md`);
  const zh = read(`content/workshops/zh/${slug}.md`);
  const expectedSessionTitles = {
    en: ['Registration', 'Introduction to AI for the Humanities', 'Group photo and tea break',
      'Getting Started with Claude', 'Lunch break', 'Foundational Research Applications with Claude',
      'Building an AI Research Workflow', 'Tea break', 'Claude × Research Agents', 'Closing remarks',
      'Registration', 'Humanities AI Research and Applications', 'Group photo, tea break, and exchange',
      'Research Collaboration Matching and Consultations', 'Workshop conclusion and Humanities Building tour'],
    zh: ['報到', '人文 AI 導論', '拍照與茶敘休息', 'Claude 初探', '午餐休息', 'Claude 研究基礎應用',
      '用 AI 打造研究工作流', '茶敘休息', 'Claude × 研究智能體 Agents', '小結', '報到',
      '人文 AI 研究與應用分享', '拍照、茶敘休息與交流', '合作媒合與研究晤談', '工作坊結束與人文館參觀'],
  };
  assert.match(en, /^title: AI × Humanities Scholars Workshop$/m);
  assert.match(zh, /^title: AI × 人文領域學者工作坊$/m);
  assert.match(en, /^venue: NTU Humanities Building, B1 113-2$/m);
  assert.match(zh, /^venue: 臺大人文大樓 B1 113-2$/m);
  assert.match(en, /^    label: Teaching day · Hands-on tools$/m);
  assert.match(en, /^    label: Exchange day · Talks and discussion$/m);
  assert.match(zh, /^    label: 教學日：工具實作$/m);
  assert.match(zh, /^    label: 交流日：演講＋交流$/m);
  assert.deepEqual(Array.from(content(en).data.days.flatMap(day => day.sessions), row => row.title), expectedSessionTitles.en);
  assert.deepEqual(Array.from(content(zh).data.days.flatMap(day => day.sessions), row => row.title), expectedSessionTitles.zh);
  assert.doesNotMatch(`${en}\n${zh}`, /http:/i);
});
