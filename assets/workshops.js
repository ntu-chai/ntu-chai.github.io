(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.CHAIWorkshops = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const labels = {
    en: { upcoming: 'Upcoming workshops', past: 'Past workshops', unclassified: 'Other workshops', ungroupedPast: 'Other dates', comingSoon: 'Coming soon', materials: 'Teaching materials', loadError: 'Could not load workshop', time: 'Time', session: 'Session', speaker: 'Instructor / speaker', details: 'Details', register: 'Register' },
    zh: { upcoming: '近期工作坊', past: '過往工作坊', unclassified: '其他工作坊', ungroupedPast: '其他日期', comingSoon: '即將上線', materials: '教學資料', loadError: '無法載入工作坊', time: '時間', session: '場次', speaker: '講者／講師', details: '內容', register: '報名' },
  };

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function safeMaterialURL(value) {
    const url = String(value || '').trim();
    if (/^https:\/\//i.test(url)) return { url: url, external: true };
    if (/^(assets|content)\/[A-Za-z0-9._~!$&'()+,;=:@%\/-]+$/.test(url)) {
      return { url: url, external: false };
    }
    return null;
  }

  function safeExternalURL(value) {
    const url = String(value || '').trim();
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && parsed.hostname ? url : null;
    } catch (error) {
      return null;
    }
  }

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

    const startDate = parseISODate(data.start_date);
    const endDate = parseISODate(data.end_date);
    if (!startDate || !endDate) return 'unclassified';

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

  function formatDateRange(data, lang) {
    const startValue = data.start_date == null ? '' : String(data.start_date);
    const endValue = data.end_date == null ? '' : String(data.end_date);
    const start = parseISODate(startValue);
    const end = parseISODate(endValue);

    if (!start || !end) return [startValue, endValue].filter(Boolean).join(' – ');

    const formatter = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
    if (start.getTime() === end.getTime()) return formatter.format(start);
    return formatter.format(start) + ' – ' + formatter.format(end);
  }

  function safeSlug(value) {
    const slug = String(value || 'workshop')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/[-_]{2,}/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '');
    return slug || 'workshop';
  }

  function renderMaterials(materials, text, panelId) {
    const links = (Array.isArray(materials) ? materials : []).map(function (material) {
      const safeURL = safeMaterialURL(material && material.url);
      if (!safeURL) return '';
      const external = safeURL.external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return '<li><a href="' + escapeHTML(safeURL.url) + '"' + external + '>' +
        escapeHTML(material && material.label) + '</a></li>';
    }).filter(Boolean);
    const contents = links.length
      ? '<ul class="materials-list">' + links.join('') + '</ul>'
      : '<p class="materials-coming-soon">' + escapeHTML(text.comingSoon) + '</p>';

    return '<div id="' + escapeHTML(panelId) + '" class="materials-panel" hidden>' +
      '<h5>' + escapeHTML(text.materials) + '</h5>' + contents + '</div>';
  }

  function renderCell(className, fieldLabel, contents) {
    return '<div class="' + className + '"><span class="schedule-field-label">' +
      escapeHTML(fieldLabel) + '</span>' + contents + '</div>';
  }

  function renderSession(session, context) {
    const item = session || {};
    const teaching = !item.kind || item.kind === 'session';
    const panelId = context.slug + '-day-' + context.dayIndex + '-session-' + context.sessionIndex + '-materials';
    const title = teaching
      ? '<button type="button" class="session-toggle" data-materials-toggle aria-expanded="false" aria-controls="' +
        escapeHTML(panelId) + '">' + escapeHTML(item.title) + '</button>'
      : '<span class="session-title">' + escapeHTML(item.title) + '</span>';

    const speaker = String(item.speaker == null ? '' : item.speaker).trim();
    const details = String(item.details == null ? '' : item.details).trim();

    return '<div class="schedule-row' + (teaching ? '' : ' is-non-teaching') + '">' +
      renderCell('schedule-time', context.text.time, escapeHTML(item.time)) +
      renderCell('schedule-session', context.text.session, title) +
      (speaker ? renderCell('schedule-speaker', context.text.speaker, escapeHTML(speaker)) : '') +
      (details ? renderCell('schedule-details', context.text.details, escapeHTML(details)) : '') +
      (teaching ? renderMaterials(item.materials, context.text, panelId) : '') + '</div>';
  }

  function renderDay(day, context) {
    const item = day || {};
    const dayDate = parseISODate(String(item.date || ''));
    const formatter = new Intl.DateTimeFormat(context.lang === 'zh' ? 'zh-TW' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
    const dateLabel = dayDate ? formatter.format(dayDate) : String(item.date || '');
    const heading = [item.label, dateLabel].filter(Boolean).map(escapeHTML).join(' · ');
    const sessions = (Array.isArray(item.sessions) ? item.sessions : []).map(function (session, sessionIndex) {
      return renderSession(session, {
        slug: context.slug,
        dayIndex: context.dayIndex,
        sessionIndex: sessionIndex,
        text: context.text,
      });
    }).join('');

    return '<section class="schedule-day"><h4>' + heading + '</h4>' +
      '<div class="schedule-head"><span>' + escapeHTML(context.text.time) + '</span><span>' +
      escapeHTML(context.text.session) + '</span><span>' + escapeHTML(context.text.speaker) +
      '</span><span>' + escapeHTML(context.text.details) + '</span></div>' + sessions + '</section>';
  }

  function renderWorkshop(record, lang, status, recordIndex) {
    const data = record.data || {};
    const text = labels[lang === 'zh' ? 'zh' : 'en'];
    const slug = safeSlug(record.slug) + '-' + recordIndex;
    const panelId = slug + '-panel';
    const venue = data.venue ? '<span class="workshop-venue">' + escapeHTML(data.venue) + '</span>' : '';
    const subtitle = data.subtitle ? '<span class="workshop-subtitle">' + escapeHTML(data.subtitle) + '</span>' : '';
    const registrationURL = safeExternalURL(data.registration_url);
    const registrationLabel = String(data.registration_label || '').trim() || text.register;
    const registration = registrationURL
      ? '<a class="workshop-registration" href="' + escapeHTML(registrationURL) +
        '" target="_blank" rel="noopener noreferrer">' +
        escapeHTML(registrationLabel) + '</a>'
      : '';
    const intro = record.bodyHtml
      ? '<div class="workshop-intro markdown-body">' + record.bodyHtml + '</div>'
      : '';
    const days = (Array.isArray(data.days) ? data.days : []).map(function (day, dayIndex) {
      return renderDay(day, { slug: slug, dayIndex: dayIndex, lang: lang, text: text });
    }).join('');

    return '<article class="workshop-card"><button type="button" class="workshop-toggle" data-workshop-toggle ' +
      'aria-expanded="false" aria-controls="' + escapeHTML(panelId) + '"><span class="workshop-title">' +
      escapeHTML(data.title) + subtitle + '</span><span class="workshop-date">' + escapeHTML(formatDateRange(data, lang)) +
      '</span>' + venue + '<span class="workshop-status">' + escapeHTML(text[status]) + '</span></button>' +
      '<div id="' + escapeHTML(panelId) + '" class="workshop-panel" hidden>' + registration + intro + days + '</div></article>';
  }

  function renderGroup(title, recordsHtml, className) {
    if (!recordsHtml) return '';
    return '<section class="workshop-section ' + escapeHTML(className) + '"><h2>' +
      escapeHTML(title) + '</h2>' + recordsHtml + '</section>';
  }

  function renderWorkshops(records, lang, now) {
    const language = lang === 'zh' ? 'zh' : 'en';
    const text = labels[language];
    if (!Array.isArray(records)) {
      return '<div class="workshop-load-error">' + escapeHTML(text.loadError) + '</div>';
    }

    const failed = records.filter(function (record) { return record && record.error === true; });
    const valid = records.filter(function (record) { return record && record.error !== true; });
    const organized = organizeWorkshops(valid, now);
    let recordIndex = 0;
    function renderRecords(items, status) {
      return items.map(function (record) {
        return renderWorkshop(record, language, status, recordIndex++);
      }).join('');
    }

    let html = renderGroup(text.upcoming, renderRecords(organized.upcoming, 'upcoming'), 'is-upcoming');
    const pastMonths = groupPastByMonth(organized.past, language).map(function (group) {
      return '<section class="workshop-month"><h3>' + escapeHTML(group.label) + '</h3>' +
        renderRecords(group.items, 'past') + '</section>';
    }).join('');
    const ungroupedPast = organized.past.filter(function (record) {
      return !parseISODate(record.data.start_date);
    });
    const ungroupedPastHtml = ungroupedPast.length
      ? '<section class="workshop-month is-ungrouped"><h3>' + escapeHTML(text.ungroupedPast) + '</h3>' +
        renderRecords(ungroupedPast, 'past') + '</section>'
      : '';
    html += renderGroup(text.past, pastMonths + ungroupedPastHtml, 'is-past');
    html += renderGroup(text.unclassified, renderRecords(organized.unclassified, 'unclassified'), 'is-unclassified');
    html += failed.map(function (record) {
      const detail = record.errorMessage ? ': ' + escapeHTML(record.errorMessage) : '';
      return '<div class="workshop-load-error">' + escapeHTML(text.loadError) + detail + '</div>';
    }).join('');
    return html;
  }

  return {
    parseISODate: parseISODate,
    classifyWorkshop: classifyWorkshop,
    organizeWorkshops: organizeWorkshops,
    groupPastByMonth: groupPastByMonth,
    renderWorkshops: renderWorkshops,
  };
});
