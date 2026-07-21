(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.CHAIFrontmatter = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Tiny YAML-frontmatter parser. Handles scalars, nested objects, and
  // arrays-of-objects used by this site's content files.
  function coerce(val) {
    val = val.trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }
    if (val === 'true')  return true;
    if (val === 'false') return false;
    if (val === '~' || val === 'null') return null;
    if (val === '[]') return [];
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

  return { coerce: coerce, parseFrontmatter: parseFrontmatter };
});
