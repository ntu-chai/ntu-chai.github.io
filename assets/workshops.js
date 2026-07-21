(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.CHAIWorkshops = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function parseISODate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function todayUTC(now) {
    const date = now || new Date();
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  function classifyWorkshop(data, now) {
    if (data.status_override === 'upcoming' || data.status_override === 'past') {
      return data.status_override;
    }

    const endDate = parseISODate(data.end_date);
    if (!endDate) return 'unclassified';

    return endDate >= todayUTC(now) ? 'upcoming' : 'past';
  }

  function dateValue(record) {
    const date = parseISODate(record.data.start_date);
    return date ? date.getTime() : 0;
  }

  function organizeWorkshops(workshops, now) {
    const buckets = { upcoming: [], past: [], unclassified: [] };

    workshops.forEach(function (record) {
      buckets[classifyWorkshop(record.data, now)].push(record);
    });

    buckets.upcoming.sort(function (left, right) {
      return dateValue(left) - dateValue(right);
    });
    buckets.past.sort(function (left, right) {
      return dateValue(right) - dateValue(left);
    });

    return buckets;
  }

  function groupPastByMonth(workshops, lang) {
    const formatter = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-TW' : 'en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const groups = new Map();

    workshops.forEach(function (record) {
      const date = parseISODate(record.data.start_date);
      if (!date) return;

      const key = date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0');
      if (!groups.has(key)) {
        groups.set(key, { key: key, label: formatter.format(date), items: [] });
      }
      groups.get(key).items.push(record);
    });

    return Array.from(groups.values());
  }

  return {
    parseISODate: parseISODate,
    classifyWorkshop: classifyWorkshop,
    organizeWorkshops: organizeWorkshops,
    groupPastByMonth: groupPastByMonth,
  };
});
