/* ════════════════════════════════════════════════════════════
   CHAI v2 — interactivity
   - Hash-based SPA routing
   - EN ↔ 繁中 language toggle
   - Light ↔ dark theme toggle
   - Markdown content loader (content/<lang>/<slug>.md)
   ════════════════════════════════════════════════════════════
   Maintainers: to update the words on the site, edit the
   markdown files in /content/. See CONTENT_GUIDE.md.
   ════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  // ───────── tiny YAML-frontmatter parser ─────────
  // Handles scalars, nested objects, and arrays-of-objects.
  //
  //   key: value
  //   nested:
  //     a: 1
  //     b: 2
  //   items:
  //     - foo: bar
  //       baz: 9
  //     - foo: qux
  function coerce(val) {
    val = val.trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }
    if (val === 'true')  return true;
    if (val === 'false') return false;
    if (val === '~' || val === 'null') return null;
    if (val !== '' && !isNaN(Number(val))) return Number(val);
    return val;
  }

  function parseFrontmatter(text) {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { data: {}, body: text };
    const lines = m[1].split(/\r?\n/)
      .filter(l => l.trim() && !l.trim().startsWith('#'))
      .map(l => ({ indent: l.match(/^ */)[0].length, text: l.trim() }));

    let i = 0;
    function parseBlock(parentIndent) {
      if (i >= lines.length) return null;
      const first = lines[i];
      if (first.indent <= parentIndent) return null;
      const blockIndent = first.indent;

      if (first.text.startsWith('- ')) {
        const arr = [];
        while (i < lines.length && lines[i].indent === blockIndent && lines[i].text.startsWith('- ')) {
          const itemText = lines[i].text.slice(2).trim();
          const kv = itemText.match(/^([\w-]+)\s*:\s*(.*)$/);
          if (kv) {
            const obj = {};
            const inlineVal = kv[2].trim();
            i++;
            if (inlineVal === '') {
              const nested = parseBlock(blockIndent);
              obj[kv[1]] = nested != null ? nested : {};
            } else {
              obj[kv[1]] = coerce(inlineVal);
            }
            // sibling keys for the same array item (indent > blockIndent, not "- ")
            while (i < lines.length && lines[i].indent > blockIndent && !lines[i].text.startsWith('- ')) {
              const sk = lines[i].text.match(/^([\w-]+)\s*:\s*(.*)$/);
              if (!sk) { i++; continue; }
              const sv = sk[2].trim();
              const sIndent = lines[i].indent;
              i++;
              if (sv === '') {
                const sub = parseBlock(sIndent);
                obj[sk[1]] = sub != null ? sub : {};
              } else {
                obj[sk[1]] = coerce(sv);
              }
            }
            arr.push(obj);
          } else {
            arr.push(coerce(itemText));
            i++;
          }
        }
        return arr;
      }

      // object
      const obj = {};
      while (i < lines.length && lines[i].indent === blockIndent && !lines[i].text.startsWith('- ')) {
        const kv = lines[i].text.match(/^([\w-]+)\s*:\s*(.*)$/);
        if (!kv) { i++; continue; }
        const v = kv[2].trim();
        i++;
        if (v === '') {
          const nested = parseBlock(blockIndent);
          obj[kv[1]] = nested != null ? nested : {};
        } else {
          obj[kv[1]] = coerce(v);
        }
      }
      return obj;
    }

    return { data: parseBlock(-1) || {}, body: m[2] };
  }

  // ───────── content cache ─────────
  // Cache structure: cache[lang][slug] = { data, body, html }
  const cache = { en: {}, zh: {} };
  let sections = []; // loaded from /content/sections.json

  async function inlineBrandLogo() {
    const img = document.querySelector('img.brand-mark[src$=".svg"], img.brand-mark[src*=".svg?"]');
    if (!img) return;

    try {
      const url = new URL(img.getAttribute('src'), location.href);
      url.search = '';
      const r = await fetch(url.href, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const doc = new DOMParser().parseFromString(await r.text(), 'image/svg+xml');
      const svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== 'svg' || svg.querySelector('parsererror')) {
        throw new Error('Invalid SVG');
      }

      svg.classList.add('brand-mark');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      img.replaceWith(document.importNode(svg, true));
    } catch (e) {
      console.warn('Could not inline brand logo; using image fallback.', e);
    }
  }

  async function fetchSections() {
    try {
      const r = await fetch('content/sections.json', { cache: 'no-cache' });
      const j = await r.json();
      sections = j.sections || [];
    } catch (e) {
      console.error('Could not load content/sections.json', e);
      sections = [];
    }
  }

  async function fetchSection(lang, slug) {
    if (cache[lang][slug]) return cache[lang][slug];
    const url = `content/${lang}/${slug}.md`;
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const raw = await r.text();
      const { data, body } = parseFrontmatter(raw);
      const html = (typeof marked !== 'undefined')
        ? marked.parse(body)
        : '<pre>' + body + '</pre>';
      cache[lang][slug] = { data, body, html };
      return cache[lang][slug];
    } catch (e) {
      console.error(`Could not load ${url}`, e);
      return { data: { title: slug }, body: '', html: `<p>Could not load <code>${url}</code>.</p>` };
    }
  }

  // ───────── structured frontmatter blocks ─────────
  // Maintainers can add structured arrays in frontmatter and they will be
  // rendered as native CSS components.
  // Supported keys: team, layers, principles, hermeneutic_loop (boolean), media.
  //
  // Returns { top, bottom } — items rendered above the prose vs below it.
  // Only media items with `placement: bottom` go in the bottom block; everything
  // else (and media without placement) renders at the top.
  function renderStructuredBlocks(data) {
    const top = [];
    const bottom = [];
    if (Array.isArray(data.team) && data.team.length) {
      top.push(renderTeamGrid(data.team));
    }
    if (Array.isArray(data.layers) && data.layers.length) {
      top.push(renderLayerStack(data.layers));
    }
    if (Array.isArray(data.principles) && data.principles.length) {
      top.push(renderPrinciplesGrid(data.principles));
    }
    if (data.hermeneutic_loop) {
      top.push(renderHermeneuticLoop(data.hermeneutic_loop));
    }
    if (Array.isArray(data.media) && data.media.length) {
      const topMedia    = data.media.filter(m => (m.placement || 'top') !== 'bottom');
      const bottomMedia = data.media.filter(m => m.placement === 'bottom');
      if (topMedia.length)    top.push(renderMediaFigures(topMedia));
      if (bottomMedia.length) bottom.push(renderMediaFigures(bottomMedia));
    }
    return { top: top.join(''), bottom: bottom.join('') };
  }

  function renderMediaFigures(media) {
    return media.map(m => {
      const src = m.src || '';
      const alt = m.alt || m.caption || '';
      const kicker = m.kicker ? `<div class="media-kicker mono">${escapeHTML(m.kicker)}</div>` : '';
      const title = m.title ? `<h3 class="media-title">${escapeHTML(m.title)}</h3>` : '';
      const caption = m.caption ? `<figcaption class="media-caption serif">${escapeHTML(m.caption)}</figcaption>` : '';
      const credit = m.credit ? `<div class="media-credit mono small">${escapeHTML(m.credit)}</div>` : '';
      let mediaEl;
      const isVideo  = /\.(mp4|webm|mov)$/i.test(src);
      const isIframe = m.iframe === true || /\.html?(\?|#|$)/i.test(src);
      if (isIframe) {
        // Aspect ratio overridable via `ratio` (e.g. "16/9", "4/3", "21/9"); default 16/9.
        const ratio = m.ratio || '16 / 9';
        const ratioStyle = `aspect-ratio: ${ratio};`;
        mediaEl = `<iframe class="media-asset media-iframe"
                      src="${escapeAttr(src)}"
                      title="${escapeAttr(m.title || alt || 'Embedded page')}"
                      loading="lazy"
                      style="${ratioStyle}"
                      referrerpolicy="no-referrer"
                      sandbox="allow-scripts allow-same-origin allow-popups"></iframe>`;
      } else if (isVideo) {
        mediaEl = `<video class="media-asset" src="${escapeAttr(src)}" autoplay loop muted playsinline aria-label="${escapeAttr(alt)}"></video>`;
      } else {
        // gif / png / jpg / webp / svg all use <img>
        mediaEl = `<img class="media-asset" src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />`;
      }
      return `
        <figure class="media-figure">
          ${(kicker || title) ? `<header class="media-head">${kicker}${title}</header>` : ''}
          <div class="media-frame">${mediaEl}</div>
          ${(caption || credit) ? `<div class="media-foot">${caption}${credit}</div>` : ''}
        </figure>
      `;
    }).join('');
  }

  function renderTeamGrid(team) {
    const cards = team.map(p => `
      <li class="person">
        <div class="p-role mono">${escapeHTML(p.role || '')}</div>
        <div class="p-name">${escapeHTML(p.name || '')}</div>
        ${p.dept ? `<div class="p-dept serif">${escapeHTML(p.dept)}</div>` : ''}
      </li>
    `).join('');
    return `<ol class="people-grid">${cards}</ol>`;
  }

  function renderLayerStack(layers) {
    const cards = layers.map((L, idx) => {
      const num = L.num || `LAYER ${idx + 1}`;
      const titleEn = L.title_en ? `<span class="layer-title-en">${escapeHTML(L.title_en)}</span>` : '';
      const items = Array.isArray(L.items)
        ? `<ul class="layer-items">${L.items.map(it => `<li>${escapeHTML(it)}</li>`).join('')}</ul>`
        : '';
      const groups = Array.isArray(L.groups)
        ? `<div class="layer-groups">${L.groups.map(g => `
            <div class="layer-group">
              <div class="lg-head mono">${escapeHTML(g.label || '')}</div>
              <div class="lg-name">${escapeHTML(g.name || '')}</div>
              ${g.items ? `<ul>${g.items.map(it => `<li>${escapeHTML(it)}</li>`).join('')}</ul>` : ''}
            </div>
          `).join('')}</div>`
        : '';
      return `
        <section class="layer-card layer-${idx + 1}">
          <header class="layer-head">
            <span class="layer-num mono">${escapeHTML(num)}</span>
            <h3 class="layer-title">${escapeHTML(L.title || '')}${titleEn}</h3>
          </header>
          ${L.lede ? `<p class="layer-lede serif">${escapeHTML(L.lede)}</p>` : ''}
          ${items}
          ${groups}
        </section>
      `;
    }).join('');
    return `<div class="layer-stack" aria-label="Three-layer architecture">${cards}</div>`;
  }

  function renderPrinciplesGrid(principles) {
    const cards = principles.map((p, idx) => {
      const letter = p.letter || String.fromCharCode(65 + idx);
      const items = Array.isArray(p.items)
        ? `<ul class="principle-items">${p.items.map(it => `<li>${escapeHTML(it)}</li>`).join('')}</ul>`
        : '';
      return `
        <article class="principle-card">
          <header class="principle-head">
            <span class="principle-letter mono">${escapeHTML(letter)}</span>
            <h4 class="principle-title">${escapeHTML(p.title || '')}</h4>
          </header>
          ${p.body ? `<p class="principle-body serif">${escapeHTML(p.body)}</p>` : ''}
          ${items}
        </article>
      `;
    }).join('');
    return `<div class="principles-grid">${cards}</div>`;
  }

  function renderHermeneuticLoop(cfg) {
    // cfg can be a boolean (true to render a default diagram) or an object with labels.
    const t = typeof cfg === 'object' ? cfg : {};
    const labels = {
      researcher: t.researcher || 'Researcher',
      researcher_sub: t.researcher_sub || 'questioning · judging · revising',
      editor: t.editor || 'Editor Agent',
      editor_sub: t.editor_sub || 'planning · orchestration · state',
      critic: t.critic || 'Critic Agent',
      critic_sub: t.critic_sub || 'verify · refute · counter-hallucinate',
      experts_label: t.experts_label || 'Expert Agents',
      experts: Array.isArray(t.experts) && t.experts.length
        ? t.experts
        : [
            { name: 'Collect',     sub: 'corpora · cleaning' },
            { name: 'Read',        sub: 'close + distant reading' },
            { name: 'Interpret',   sub: 'translation · knowledge graph' },
            { name: 'Argue',       sub: 'drafting · citation' }
          ],
      sources_label: t.sources_label || 'Sources',
      sources_sub: t.sources_sub || 'documents · images · corpora',
      memory_label: t.memory_label || 'Semantic memory',
      memory_sub: t.memory_sub || 'vector index + knowledge graph',
      provenance_label: t.provenance_label || 'Provenance',
      provenance_sub: t.provenance_sub || 'claims & sources (attribution trace)'
    };
    const expertCells = labels.experts.map(e => `
      <div class="loop-expert">
        <div class="loop-cell-title">${escapeHTML(e.name || '')}</div>
        <div class="loop-cell-sub">${escapeHTML(e.sub || '')}</div>
      </div>
    `).join('');
    return `
      <figure class="hermeneutic-loop" aria-label="Hermeneutic loop architecture">
        <div class="loop-researcher">
          <div class="loop-cell-title">${escapeHTML(labels.researcher)}</div>
          <div class="loop-cell-sub">${escapeHTML(labels.researcher_sub)}</div>
        </div>
        <div class="loop-arrow" aria-hidden="true">↓</div>
        <div class="loop-agents">
          <div class="loop-agent loop-editor">
            <div class="loop-cell-title">${escapeHTML(labels.editor)}</div>
            <div class="loop-cell-sub">${escapeHTML(labels.editor_sub)}</div>
          </div>
          <div class="loop-connector" aria-hidden="true">↔</div>
          <div class="loop-agent loop-critic">
            <div class="loop-cell-title">${escapeHTML(labels.critic)}</div>
            <div class="loop-cell-sub">${escapeHTML(labels.critic_sub)}</div>
          </div>
        </div>
        <div class="loop-experts-row">
          <div class="loop-experts-label mono">${escapeHTML(labels.experts_label)}</div>
          <div class="loop-experts-grid">${expertCells}</div>
        </div>
        <div class="loop-foundations">
          <div class="loop-found">
            <div class="lf-label mono">${escapeHTML(labels.sources_label)}</div>
            <div class="lf-sub serif">${escapeHTML(labels.sources_sub)}</div>
          </div>
          <div class="loop-found">
            <div class="lf-label mono">${escapeHTML(labels.memory_label)}</div>
            <div class="lf-sub serif">${escapeHTML(labels.memory_sub)}</div>
          </div>
          <div class="loop-found loop-found-accent">
            <div class="lf-label mono">${escapeHTML(labels.provenance_label)}</div>
            <div class="lf-sub serif">${escapeHTML(labels.provenance_sub)}</div>
          </div>
        </div>
      </figure>
    `;
  }

  // ───────── render a section into the DOM ─────────
  function renderSection(slug, content) {
    const section = document.querySelector(`section.page[data-page="${slug}"]`);
    if (!section) return;
    const { data, html } = content;

    // 1. Markdown body (prose, stays in a narrow reading column).
    const body = section.querySelector('[data-content]');
    if (body) body.innerHTML = html;

    // 1b. Structured frontmatter blocks (team / layers / principles / loop /
    //     media). Top blocks render as a sibling BEFORE the markdown body so
    //     they get the full page width. Bottom blocks render as a sibling
    //     AFTER the markdown body — used when a media item has
    //     `placement: bottom` in its frontmatter.
    const structured = renderStructuredBlocks(data);
    if (body) {
      // top
      let structuredHost = section.querySelector('[data-structured="top"]');
      if (structured.top) {
        if (!structuredHost) {
          structuredHost = document.createElement('div');
          structuredHost.setAttribute('data-structured', 'top');
          structuredHost.className = 'page-structured';
          body.parentNode.insertBefore(structuredHost, body);
        }
        structuredHost.innerHTML = structured.top;
      } else if (structuredHost) {
        structuredHost.innerHTML = '';
      }
      // bottom
      let structuredBottom = section.querySelector('[data-structured="bottom"]');
      if (structured.bottom) {
        if (!structuredBottom) {
          structuredBottom = document.createElement('div');
          structuredBottom.setAttribute('data-structured', 'bottom');
          structuredBottom.className = 'page-structured page-structured-bottom';
          body.parentNode.insertBefore(structuredBottom, body.nextSibling);
        }
        structuredBottom.innerHTML = structured.bottom;
      } else if (structuredBottom) {
        structuredBottom.innerHTML = '';
      }
    }

    // 2. Hero (only on the vision section)
    if (section.dataset.page === 'vision') {
      const kicker = section.querySelector('[data-hero-kicker]');
      const title  = section.querySelector('[data-hero-title]');
      const sub    = section.querySelector('[data-hero-sub]');
      const cta    = section.querySelector('[data-hero-cta]');

      if (kicker) kicker.textContent = data.kicker || '';

      if (title && data.hero_title) {
        // Split the title on the accent token, if any, so part of it can be italicised.
        // Also respect a literal `<br>` inside hero_title for hard line-breaks
        // (the only HTML tag we honour here — safer than allowing arbitrary HTML).
        const appendWithBreaks = (parent, text) => {
          const segs = String(text).split(/<br\s*\/?>/i);
          segs.forEach((seg, i) => {
            if (i > 0) parent.appendChild(document.createElement('br'));
            if (seg) parent.appendChild(document.createTextNode(seg));
          });
        };
        title.innerHTML = '';
        const accent = data.hero_title_accent;
        if (accent && data.hero_title.includes(accent)) {
          const parts = data.hero_title.split(accent);
          parts.forEach((p, i) => {
            appendWithBreaks(title, p);
            if (i < parts.length - 1) {
              const em = document.createElement('span');
              em.className = 'accent';
              appendWithBreaks(em, accent);
              title.appendChild(em);
            }
          });
        } else {
          appendWithBreaks(title, data.hero_title);
        }
      }

      if (sub) sub.textContent = data.hero_sub || '';

      if (cta) {
        cta.innerHTML = '';
        if (data.cta_primary && data.cta_primary.label) {
          const a = document.createElement('a');
          a.className = 'btn btn-primary';
          a.href = data.cta_primary.href || '#';
          const route = (a.href.includes('#') ? a.href.split('#')[1] : '').trim();
          if (route) a.dataset.route = route;
          a.innerHTML = `<span>${escapeHTML(data.cta_primary.label)}</span><span class="arrow" aria-hidden="true">→</span>`;
          cta.appendChild(a);
        }
        if (data.cta_secondary && data.cta_secondary.label) {
          const a = document.createElement('a');
          a.className = 'btn btn-ghost';
          a.href = data.cta_secondary.href || '#';
          const route = (a.href.includes('#') ? a.href.split('#')[1] : '').trim();
          if (route) a.dataset.route = route;
          a.innerHTML = `<span>${escapeHTML(data.cta_secondary.label)}</span>`;
          cta.appendChild(a);
        }
      }
    }

    // 3. Page header (for non-hero sections)
    const header = section.querySelector('[data-page-header]');
    if (header) {
      const meta = sections.find(s => s.slug === slug) || {};
      const subtitle = data.subtitle ? `<p class="page-subtitle serif">${escapeHTML(data.subtitle)}</p>` : '';
      const lede = data.lede ? `<p class="page-lede serif">${escapeHTML(data.lede)}</p>` : '';
      header.innerHTML = `
        <span class="mono section-num">§ ${meta.num || ''}</span>
        <h1 id="${slug}-h" class="page-title">${escapeHTML(data.title || slug)}</h1>
        ${subtitle}
        ${lede}
      `;
    }

    // 4. Optional embed (Spotify iframe etc.)
    const embedHost = section.querySelector('[data-page-embed]');
    if (embedHost) {
      if (data.embed && data.embed.src) {
        embedHost.hidden = false;
        embedHost.innerHTML = `
          <iframe
            title="${escapeHTML(data.embed.title || 'Embed')}"
            style="border-radius:14px"
            src="${escapeAttr(data.embed.src)}"
            width="100%"
            height="232"
            frameborder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"></iframe>
          ${data.embed.note ? `<p class="mono small embed-note">${escapeHTML(data.embed.note)}</p>` : ''}
        `;
      } else {
        embedHost.hidden = true;
        embedHost.innerHTML = '';
      }
    }
  }

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  // ───────── nav builders ─────────
  function buildNav(lang) {
    const links = document.getElementById('navLinks');
    const mLinks = document.getElementById('mobileNav');
    if (!links || !mLinks) return;
    links.innerHTML = '';
    mLinks.innerHTML = '';
    sections.forEach(s => {
      const label = (s.nav && s.nav[lang]) || s.slug;
      const a = document.createElement('a');
      a.href = '#' + s.slug;
      a.dataset.route = s.slug;
      a.className = 'nav-link';
      a.innerHTML = `<span class="num">${s.num || ''}</span><span class="lbl">${escapeHTML(label)}</span>`;
      links.appendChild(a);

      const m = document.createElement('a');
      m.href = '#' + s.slug;
      m.dataset.route = s.slug;
      m.className = 'm-link';
      m.innerHTML = `<span class="num">${s.num || ''}</span><span>${escapeHTML(label)}</span>`;
      mLinks.appendChild(m);
    });
    refreshActiveNav();
  }

  // ───────── routing ─────────
  function validSlugs() { return sections.map(s => s.slug); }

  function routeFromHash() {
    const h = (location.hash || '').replace('#', '').trim();
    const valid = validSlugs();
    return valid.includes(h) ? h : (valid[0] || 'vision');
  }

  function refreshActiveNav() {
    const page = document.body.dataset.page;
    document.querySelectorAll('[data-route]').forEach(a => {
      a.classList.toggle('is-active', a.dataset.route === page);
    });
  }

  function showPage(page) {
    if (!validSlugs().includes(page)) page = validSlugs()[0];
    document.querySelectorAll('section.page').forEach(s => {
      s.hidden = s.dataset.page !== page;
    });
    document.body.dataset.page = page;
    refreshActiveNav();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    closeDrawer();
    requestAnimationFrame(refreshReveals);
  }
  let refreshReveals = () => {};

  window.addEventListener('hashchange', () => showPage(routeFromHash()));
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-route]');
    if (!a) return;
    const target = a.dataset.route;
    if (!validSlugs().includes(target)) return;
    if (location.hash === '#' + target) {
      e.preventDefault();
      showPage(target);
    }
  });

  // ───────── language ─────────
  function applyLang(lang) {
    if (lang !== 'en' && lang !== 'zh') lang = 'en';
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    document.body.dataset.lang = lang;
    try { localStorage.setItem('chai-lang', lang); } catch (_) {}
    buildNav(lang);
    // Re-render every section in the new language
    sections.forEach(async s => {
      const content = await fetchSection(lang, s.slug);
      renderSection(s.slug, content);
    });
  }
  function initLang() {
    const urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang && (urlLang === 'en' || urlLang === 'zh')) { applyLang(urlLang); return; }
    let saved = null;
    try { saved = localStorage.getItem('chai-lang'); } catch (_) {}
    if (saved === 'en' || saved === 'zh') { applyLang(saved); return; }
    const fallback = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    applyLang(fallback);
  }
  document.getElementById('langToggle').addEventListener('click', () => {
    applyLang(document.body.dataset.lang === 'zh' ? 'en' : 'zh');
  });

  // ───────── theme ─────────
  const DEFAULT_THEME = document.body.dataset.theme || 'light';
  function applyTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') theme = DEFAULT_THEME;
    document.body.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1A2614' : '#FAEFD0');
    try { localStorage.setItem('chai-theme', theme); } catch (_) {}
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('chai-theme'); } catch (_) {}
    applyTheme(saved || DEFAULT_THEME);
  }
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  // ───────── mobile drawer ─────────
  const menuBtn = document.getElementById('menuBtn');
  const drawer  = document.getElementById('mobileDrawer');
  function openDrawer() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  menuBtn.addEventListener('click', () => {
    if (drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  // ───────── scroll reveal ─────────
  function applyRevealTargets() {
    const targets = document.querySelectorAll(
      '.page-header, .page-embed, .page-body > h2, .page-body > h3, .page-body > p, .page-body > ul, .page-body > ol, .page-body > blockquote, .page-body > table'
    );
    targets.forEach((el, i) => {
      el.classList.add('reveal');
      // Stagger first few elements
      if (i % 5 === 1) el.dataset.revealDelay = '1';
      if (i % 5 === 2) el.dataset.revealDelay = '2';
    });
  }
  function initRevealObserver() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    refreshReveals = () => {
      // After SPA page switch + after content rendering, re-tag and re-observe
      applyRevealTargets();
      document.querySelectorAll('.reveal:not(.is-in)').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 40) {
          el.classList.add('is-in');
          io.unobserve(el);
        } else {
          io.observe(el);
        }
      });
    };
  }

  // ───────── boot ─────────
  async function boot() {
    await inlineBrandLogo();
    initTheme();
    await fetchSections();
    initLang();              // builds nav + kicks off content fetches
    initRevealObserver();
    showPage(routeFromHash());
  }

  // Marked is loaded with `defer`. If DOMContentLoaded fires before marked
  // exists yet, fetch and render anyway — fetchSection() falls back to <pre>.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
