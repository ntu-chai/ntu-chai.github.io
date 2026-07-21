const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseISODate,
  classifyWorkshop,
  organizeWorkshops,
  groupPastByMonth,
} = require('../assets/workshops.js');

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
