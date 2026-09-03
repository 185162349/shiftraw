// ShiftRaw i18n page generator.
// Runs inside integrated_code_mode Exec sandbox:
//   const fn = eval(code); await fn(tools, text, { mode: 'extract' });
// Modes: extract | validate | build | fix-en | fix-home | sitemap
(async (tools, text, opts) => {
  const ROOT = 'E:/小程序/互联网项目/shiftraw';
  const SITE = 'https://shiftraw.com';
  const TODAY = '2026-09-03';

  const SLUGS = [
    'cr2-to-jpg', 'cr2-to-png', 'cr2-to-webp', 'cr3-to-jpg', 'cr3-to-png', 'cr3-to-webp',
    'nef-to-jpg', 'nef-to-png', 'nef-to-webp', 'arw-to-jpg', 'arw-to-png', 'arw-to-webp',
    'dng-to-jpg', 'dng-to-png', 'dng-to-webp', 'raf-to-jpg', 'raf-to-png', 'raf-to-webp',
    'raw-to-jpg', 'raw-to-png', 'raw-to-webp', 'heic-to-jpg', 'heic-to-png', 'heic-to-webp',
    'webp-to-jpg', 'webp-to-png'
  ];
  const NEW_SLUGS = SLUGS.filter(s => s !== 'heic-to-jpg'); // 25 pages to generate

  const LANGS = [
    { code: 'de', native: 'Deutsch', slug: s => s.replace('-to-', '-zu-'), link: l => l.replace(/ to /g, ' zu ') },
    { code: 'ko', native: '한국어', slug: s => s, link: l => l },
    { code: 'ja', native: '日本語', slug: s => s, link: l => l }
  ];

  const UI = [
    'ShiftRaw home', 'All Tools', 'How It Works', 'FAQ', 'Home',
    'browse your files', 'Output format', 'Quality', 'Clear all', 'Download all',
    'Upload files', 'Breadcrumb', 'Frequently asked questions', 'Related converters',
    'Convert now', 'Popular tools', 'Company', 'About', 'Contact', 'Privacy Policy',
    'Made for photographers, powered by WebAssembly.',
    'Free browser-based converters for camera RAW, HEIC and WebP photos. Your files never leave your device — conversion happens 100% locally.',
    '100% private — files are converted in your browser and never uploaded to any server.',
    'Step 1', 'Step 2', 'Step 3'
  ];
  const UI_BRAND = UI[21];
  const UI_DZNOTE = UI[22];

  const CARD_SVG = '<svg class="fi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>';
  const TICK_SVG = '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>';

  const fmtName = s => ({ webp: 'WebP' }[s] || s.toUpperCase());
  const slugParts = s => { const m = s.match(/^([a-z0-9]+)-to-([a-z0-9]+)$/); return [fmtName(m[1]), fmtName(m[2])]; };

  async function readRaw(p) {
    const r = await tools.Read({ file_path: ROOT + '/' + p });
    return String(r.content).replace(/^ *\d+\t/gm, '');
  }
  async function writeP(p, c) { return tools.Write({ file_path: ROOT + '/' + p, content: c }); }

  const m1 = (s, re) => { const m = s.match(re); if (!m) throw new Error('no match: ' + re); return m[1]; };
  const all = (s, re) => [...s.matchAll(re)].map(x => x[1]);

  function fixH2(h, slug) {
    const [src, dst] = slugParts(slug);
    const from = `<h2>Why convert ${src} to </h2>`;
    if (!h.includes(from)) throw new Error('h2 truncation pattern not found for ' + slug);
    return h.replace(from, `<h2>Why convert ${src} to ${dst}?</h2>`);
  }

  function extractSlots(h, slug) {
    const [src, dst] = slugParts(slug);
    const s = {};
    s.title = m1(h, /<title>([^<]*)<\/title>/);
    s.desc = m1(h, /<meta name="description" content="([^"]*)">/);
    s.h1 = m1(h, /<h1>([^<]*)<\/h1>/);
    s.subtitle = m1(h, /<p class="subtitle">([\s\S]*?)<\/p>/);
    s.dz = m1(h, /<p class="dz-title" id="dzTitle">([^<]*)<\/p>/);
    const art = m1(h, /<article class="section prose">([\s\S]*?)<\/article>/);
    s.proseH2 = m1(art, /<h2>([^<]*)<\/h2>/);
    s.prose = all(art, /<p>([\s\S]*?)<\/p>/g);
    const how = m1(h, /<section class="section section-alt" id="how-it-works">([\s\S]*?)<\/section>/);
    s.howH2 = m1(how, /<h2>([^<]*)<\/h2>/);
    s.howSub = m1(how, /<h2>[^<]*<\/h2>\s*<p>([\s\S]*?)<\/p>/);
    const steps = [...how.matchAll(/<h3>(Step \d)<\/h3><p>([\s\S]*?)<\/p>/g)];
    s.stepH = steps.map(x => x[1]);
    s.stepP = steps.map(x => x[2]);
    s.aboutH2 = m1(h, /<h2>(About the [^<]*)<\/h2>/);
    const about = m1(h, /<h2>About the [^<]*<\/h2>([\s\S]*?)<\/section>/);
    const cards = [...about.matchAll(/<h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p>/g)];
    s.cardH = cards.map(x => x[1].trim());
    s.cardP = cards.map(x => x[2].trim());
    const faq = m1(h, /<section class="section section-alt" id="faq">([\s\S]*?)<\/section>/);
    s.faqH2 = m1(faq, /<h2>([^<]*)<\/h2>/);
    const items = [...faq.matchAll(/<summary>([\s\S]*?)<\/summary><div class="faq-a">([\s\S]*?)<\/div>/g)];
    s.faqQ = items.map(x => x[1]);
    s.faqA = items.map(x => x[2]);
    s.ctaH2 = m1(h, /<div class="cta-box">\s*<h2>([\s\S]*?)<\/h2>/);
    s.ctaP = m1(h, /<div class="cta-box">\s*<h2>[\s\S]*?<\/h2>\s*<p>([\s\S]*?)<\/p>/);
    s.ctaBtn = m1(h, /<a class="btn" href="#converter">([^<]*)<\/a>/);
    s.related = [...h.matchAll(/<a href="\/([a-z0-9-]+)\/">([A-Za-z0-9 ]+)<span class="arr">/g)].map(x => [x[1], x[2]]);
    // structural sanity
    const errs = [];
    if (s.prose.length !== 4) errs.push('prose=' + s.prose.length);
    if (s.stepP.length !== 3) errs.push('steps=' + s.stepP.length);
    if (s.cardH.length !== 7) errs.push('cards=' + s.cardH.length);
    if (s.faqQ.length !== 6) errs.push('faq=' + s.faqQ.length);
    if (s.related.length < 5) errs.push('related=' + s.related.length);
    if (errs.length) throw new Error(slug + ' structure: ' + errs.join(','));
    return s;
  }

  function hreflangBlock(slug) {
    const de = LANGS[0].slug(slug);
    return [
      `  <link rel="alternate" hreflang="en" href="${SITE}/${slug}/">`,
      `  <link rel="alternate" hreflang="de" href="${SITE}/de/${de}/">`,
      `  <link rel="alternate" hreflang="ko" href="${SITE}/ko/${slug}/">`,
      `  <link rel="alternate" hreflang="ja" href="${SITE}/ja/${slug}/">`,
      `  <link rel="alternate" hreflang="x-default" href="${SITE}/${slug}/">`
    ].join('\n');
  }

  function switcherHtml(slug, activeLang) {
    const de = LANGS[0].slug(slug);
    const menu = [
      ['en', `/${slug}/`, 'English'],
      ['de', `/de/${de}/`, 'Deutsch'],
      ['ko', `/ko/${slug}/`, '한국어'],
      ['ja', `/ja/${slug}/`, '日本語']
    ].map(([c, href, name]) =>
      `            <a href="${href}" hreflang="${c}"${c === activeLang ? ' class="active"' : ''} role="menuitem">${TICK_SVG}${name}</a>`
    ).join('\n');
    const native = ({ en: 'English', de: 'Deutsch', ko: '한국어', ja: '日本語' })[activeLang];
    return `        <div class="lang-switch" aria-label="__LANGARIA__">
          <button class="lang-btn" type="button" aria-haspopup="true" aria-expanded="false">
            <svg class="globe" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
            <span>${native}</span>
            <svg class="chev" viewBox="0 0 24 24" fill="none" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div class="lang-menu" role="menu">
${menu}
          </div>
        </div>`;
  }

  // ---------- mode: extract ----------
  if (opts.mode === 'extract') {
    const strings = {}; // en -> [pages]
    const add = (s, page) => { if (s == null || s === '') throw new Error('empty string at ' + page); (strings[s] = strings[s] || []).push(page); };
    for (const slug of NEW_SLUGS) {
      const h = fixH2(await readRaw(slug + '/index.html'), slug);
      const s = extractSlots(h, slug);
      [s.title, s.desc, s.h1, s.subtitle, s.dz, s.proseH2, ...s.prose, s.howH2, s.howSub,
       ...s.stepP, s.aboutH2, ...s.cardH, ...s.cardP, s.faqH2, ...s.faqQ, ...s.faqA,
       s.ctaH2, s.ctaP, s.ctaBtn].forEach(x => add(x.trim(), slug));
    }
    // verify UI constants actually appear in pages
    const sample = fixH2(await readRaw('arw-to-jpg/index.html'), 'arw-to-jpg');
    for (const u of UI) if (!sample.includes(u)) throw new Error('UI string not found in sample page: ' + u);
    UI.forEach(u => add(u, 'ALL'));
    const keys = Object.keys(strings);
    // split into 3 parts (UI first)
    const n = Math.ceil(keys.length / 3);
    for (let i = 0; i < 3; i++) {
      const part = {};
      keys.slice(i * n, (i + 1) * n).forEach(k => part[k] = strings[k].join(','));
      await writeP(`src/i18n/strings-${i + 1}.json`, JSON.stringify(part, null, 1));
    }
    await writeP('src/i18n/strings.json', JSON.stringify(strings, null, 1));
    text('extracted ' + keys.length + ' unique strings across ' + NEW_SLUGS.length + ' pages; parts of ' + n);
    return;
  }

  // ---------- load translations ----------
  async function loadLang(code) {
    const strings = {};
    let meta = null;
    for (let i = 1; i <= 9; i++) {
      let raw;
      try { raw = await readRaw(`src/i18n/t-${code}-${i}.json`); } catch (e) { continue; }
      const j = JSON.parse(raw);
      if (j.meta) meta = Object.assign(meta || {}, j.meta);
      Object.assign(strings, j.strings || {});
    }
    if (!strings['Home']) throw new Error(`no translation files found for ${code}`);
    return { strings, meta };
  }

  // ---------- mode: validate ----------
  if (opts.mode === 'validate') {
    const want = Object.keys(JSON.parse(await readRaw('src/i18n/strings.json')));
    const out = [];
    for (const L of (opts.lang ? LANGS.filter(L => L.code === opts.lang) : LANGS)) {
      const { strings, meta } = await loadLang(L.code);
      const missing = want.filter(k => !(k in strings));
      const extra = Object.keys(strings).filter(k => !want.includes(k));
      const metaOk = meta && meta.langAria && meta.dzSubPrefix != null;
      out.push(`${L.code}: ${strings.length ? Object.keys(strings).length : 0} keys, missing ${missing.length}, extra ${extra.length}, meta ${metaOk ? 'ok' : 'MISSING'}`);
      if (missing.length) out.push('  MISSING: ' + missing.slice(0, 30).map(k => JSON.stringify(k.slice(0, 60))).join(' | '));
      if (extra.length) out.push('  EXTRA: ' + extra.slice(0, 30).map(k => JSON.stringify(k.slice(0, 60))).join(' | '));
    }
    text(out.join('\n'));
    return;
  }

  // ---------- mode: build ----------
  if (opts.mode === 'build') {
    const maps = {};
    for (const L of (opts.lang ? LANGS.filter(L => L.code === opts.lang) : LANGS)) maps[L.code] = await loadLang(L.code);
    const missing = [];
    const T = (code, s) => {
      const v = maps[code].strings[s];
      if (v == null) { missing.push(code + ' :: ' + s.slice(0, 80)); return s; }
      return v;
    };
    const results = [];
    const langList = opts.lang ? LANGS.filter(L => L.code === opts.lang) : LANGS;
    for (const L of langList) {
      const M = maps[L.code].meta;
      for (const slug of NEW_SLUGS) {
        const [src, dst] = slugParts(slug);
        const locSlug = L.slug(slug);
        const locUrl = `${SITE}/${L.code}/${locSlug}/`;
        const Tl = s => T(L.code, s);
        let h = fixH2(await readRaw(slug + '/index.html'), slug);
        const s = extractSlots(h, slug);

        h = h.replace('<html lang="en">', () => `<html lang="${L.code}">`);
        h = h.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${Tl(s.title)}</title>`);
        h = h.replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${Tl(s.desc)}">`);
        h = h.replace(/(<meta property="og:title" content=")[^"]*(")/, (m, a, b) => a + Tl(s.title) + b);
        h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, (m, a, b) => a + Tl(s.desc) + b);
        h = h.replace(/(<meta name="twitter:title" content=")[^"]*(")/, (m, a, b) => a + Tl(s.title) + b);
        h = h.replace(/(<meta name="twitter:description" content=")[^"]*(")/, (m, a, b) => a + Tl(s.desc) + b);
        h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, (m, a, b) => a + locUrl + b);
        h = h.replace(/(<meta property="og:url" content=")[^"]*(")/, (m, a, b) => a + locUrl + b);
        h = h.replace(/(<meta name="robots" content="index,follow">)/, (m) => m + '\n' + hreflangBlock(slug));

        const webApp = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'ShiftRaw ' + Tl(s.h1), url: locUrl, applicationCategory: 'MultimediaApplication', operatingSystem: 'Any (web browser)', browserRequirements: 'Requires JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, description: Tl(s.desc), inLanguage: L.code };
        h = h.replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"WebApplication"[\s\S]*?<\/script>/, () => '<script type="application/ld+json">' + JSON.stringify(webApp) + '</script>');
        const faqJson = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: s.faqQ.map((q, i) => ({ '@type': 'Question', name: Tl(q), acceptedAnswer: { '@type': 'Answer', text: Tl(s.faqA[i]) } })) };
        h = h.replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"FAQPage"[\s\S]*?<\/script>/, () => '<script type="application/ld+json">' + JSON.stringify(faqJson) + '</script>');
        const bcName = `${src} ${L.code === 'de' ? 'zu' : 'to'} ${dst}`;
        const bc = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: Tl('Home'), item: `${SITE}/${L.code}/` }, { '@type': 'ListItem', position: 2, name: bcName, item: locUrl }] };
        h = h.replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"BreadcrumbList"[\s\S]*?<\/script>/, () => '<script type="application/ld+json">' + JSON.stringify(bc) + '</script>');

        // header + nav
        h = h.replace(/<a class="logo" href="\/" aria-label="ShiftRaw home">/, () => `<a class="logo" href="/${L.code}/" aria-label="${Tl('ShiftRaw home')}">`);
        const navLinks = [
          ['tools', 'All Tools'], ['how-it-works', 'How It Works'], ['faq', 'FAQ']
        ].map(([a, k]) => `        <a href="/${L.code}/#${a}">${Tl(k)}</a>`).join('\n');
        h = h.replace(/<nav class="main-nav">[\s\S]*?<\/nav>/, () =>
          `      <nav class="main-nav">\n${navLinks}\n${switcherHtml(slug, L.code).replace('__LANGARIA__', M.langAria)}\n      </nav>`);

        h = h.replace(/<nav class="breadcrumb" aria-label="Breadcrumb"><a href="\/">Home<\/a>/, () =>
          `<nav class="breadcrumb" aria-label="${Tl('Breadcrumb')}"><a href="/${L.code}/">${Tl('Home')}</a>`);

        h = h.replace(/<h1>[\s\S]*?<\/h1>/, () => `<h1>${Tl(s.h1)}</h1>`);
        h = h.replace(/<p class="subtitle">[\s\S]*?<\/p>/, () => `<p class="subtitle">${Tl(s.subtitle)}</p>`);
        h = h.replace(/aria-label="Upload files"/, () => `aria-label="${Tl('Upload files')}"`);
        h = h.replace(/<p class="dz-title" id="dzTitle">[^<]*<\/p>/, () => `<p class="dz-title" id="dzTitle">${Tl(s.dz)}</p>`);
        h = h.replace(/<p class="dz-sub">or\s*<button class="btn-link" id="browseBtn" type="button">[^<]*<\/button>/, () =>
          `<p class="dz-sub">${M.dzSubPrefix}<button class="btn-link" id="browseBtn" type="button">${Tl('browse your files')}</button>`);
        h = h.replace(/(<p class="dz-note">\s*<svg[\s\S]*?<\/svg>)\s*[^<]*\s*<\/p>/, (m, svg) => `${svg}\n              ${Tl(UI_DZNOTE)}\n            </p>`);

        h = h.replace(/<label>Output format/, () => `<label>${Tl('Output format')}`);
        h = h.replace(/aria-label="Output format"/, () => `aria-label="${Tl('Output format')}"`);
        h = h.replace(/<label id="qualityWrap">Quality</, () => `<label id="qualityWrap">${Tl('Quality')}<`);
        h = h.replace(/>Clear all</, () => `>${Tl('Clear all')}<`);
        h = h.replace(/(\n\s*)Download all(\s*\n\s*<\/button>)/, (m, a, b) => a + Tl('Download all') + b);

        h = h.replace(/<article class="section prose">[\s\S]*?<\/article>/, () =>
          `      <article class="section prose">\n        <h2>${Tl(s.proseH2)}</h2>\n` +
          s.prose.map(p => `      <p>${Tl(p)}</p>`).join('\n') + `\n      </article>`);

        h = h.replace(/<section class="section section-alt" id="how-it-works">[\s\S]*?<\/section>/, () =>
          `      <section class="section section-alt" id="how-it-works">\n        <div class="container">\n          <div class="section-head">\n            <h2>${Tl(s.howH2)}</h2>\n            <p>${Tl(s.howSub)}</p>\n          </div>\n          <div class="steps-grid">\n` +
          s.stepP.map((p, i) => `            <div class="step-card"><div class="step-num">${i + 1}</div><h3>${Tl(s.stepH[i])}</h3><p>${Tl(p)}</p></div>`).join('\n') +
          `\n          </div>\n        </div>\n      </section>`);

        h = h.replace(/<section class="section">\s*<div class="container">\s*<div class="section-head">\s*<h2>About the [\s\S]*?<\/section>/, () =>
          `      <section class="section">\n        <div class="container">\n          <div class="section-head">\n            <h2>${Tl(s.aboutH2)}</h2>\n          </div>\n          <div class="features-grid">\n` +
          s.cardP.map((p, i) => `            <div class="feature-card">${CARD_SVG}<h3>${Tl(s.cardH[i])}</h3><p>${Tl(p)}</p></div>`).join('\n') +
          `\n          </div>\n        </div>\n      </section>`);

        h = h.replace(/<section class="section section-alt" id="faq">[\s\S]*?<\/section>/, () =>
          `      <section class="section section-alt" id="faq">\n        <div class="container">\n          <div class="section-head">\n            <h2>${Tl(s.faqH2)}</h2>\n          </div>\n          <div class="faq-list">\n` +
          s.faqQ.map((q, i) => `            <details class="faq-item"><summary>${Tl(q)}</summary><div class="faq-a">${Tl(s.faqA[i])}</div></details>`).join('\n') +
          `\n          </div>\n        </div>\n      </section>`);

        h = h.replace(/<section class="section">\s*<div class="container">\s*<div class="section-head">\s*<h2>Related converters<\/h2>[\s\S]*?<\/section>/, () =>
          `      <section class="section">\n        <div class="container">\n          <div class="section-head">\n            <h2>${Tl('Related converters')}</h2>\n          </div>\n          <div class="related-grid">\n` +
          s.related.map(([slug2, label]) => `            <a href="/${L.code}/${L.slug(slug2)}/">${L.link(label)}<span class="arr">→</span></a>`).join('\n') +
          `\n          </div>\n        </div>\n      </section>`);

        h = h.replace(/<div class="cta-box">[\s\S]*?<\/div>/, () =>
          `      <div class="cta-box">\n        <h2>${Tl(s.ctaH2)}</h2>\n        <p>${Tl(s.ctaP)}</p>\n        <a class="btn" href="#converter">${Tl(s.ctaBtn)}</a>\n      </div>`);

        // footer
        h = h.replace('<a class="logo" href="/">', () => `<a class="logo" href="/${L.code}/">`);
        h = h.replace(/<p>Free browser-based converters[\s\S]*?<\/p>/, () => `<p>${Tl(UI_BRAND)}</p>`);
        h = h.replace(/>Popular tools</, () => `>${Tl('Popular tools')}<`);
        h = h.replace(/>Company</, () => `>${Tl('Company')}<`);
        h = h.replace(/<li><a href="\/about\/">About<\/a>/, () => `<li><a href="/about/">${Tl('About')}</a>`);
        h = h.replace(/<li><a href="\/contact\/">Contact<\/a>/, () => `<li><a href="/contact/">${Tl('Contact')}</a>`);
        h = h.replace(/<li><a href="\/privacy\/">Privacy Policy<\/a>/, () => `<li><a href="/privacy/">${Tl('Privacy Policy')}</a>`);
        h = h.replace(/<span>Made for photographers, powered by WebAssembly\.<\/span>/, () => `<span>${Tl('Made for photographers, powered by WebAssembly.')}</span>`);
        // footer popular tools links (after related-grid already localized)
        h = h.replace(/<a href="\/([a-z0-9-]+-to-[a-z0-9]+)\/">([A-Za-z0-9 ]+)<\/a>/g, (m2, slug2, label) =>
          `<a href="/${L.code}/${L.slug(slug2)}/">${L.link(label)}</a>`);

        h = h.replace(/(<script src="\/assets\/js\/converter.js" defer><\/script>)/, (m) => m + `\n  <script src="/assets/js/lang-switch.js" defer></script>`);

        results.push(`${L.code}/${locSlug}/index.html (${h.length}b)`);
        if (!missing.length) await writeP(`${L.code}/${locSlug}/index.html`, h);
      }
    }
    if (missing.length) {
      text('MISSING TRANSLATIONS (' + missing.length + ') — nothing written:\n' + missing.slice(0, 60).join('\n'));
      return;
    }
    text('built ' + results.length + ' pages:\n' + results.join('\n'));
    return;
  }

  // ---------- mode: fix-en ----------
  if (opts.mode === 'fix-en') {
    const out = [];
    for (const slug of SLUGS) {
      let h = await readRaw(slug + '/index.html');
      const [src, dst] = slugParts(slug);
      const trunc = `<h2>Why convert ${src} to </h2>`;
      const hasSwitcher = h.includes('lang-switch');
      const hasHreflang = h.includes('hreflang="de"');
      if (h.includes(trunc)) h = h.replace(trunc, `<h2>Why convert ${src} to ${dst}?</h2>`);
      if (!hasHreflang) h = h.replace(/(<meta name="robots" content="index,follow">)/, m => m + '\n' + hreflangBlock(slug));
      if (!hasSwitcher) {
        if (h.includes('<a href="/about/">About</a>')) {
          h = h.replace(/\s*<a href="\/about\/">About<\/a>/, () => '\n' + switcherHtml(slug, 'en').replace('__LANGARIA__', 'Language'));
        } else {
          h = h.replace(/(<\/nav>)/, () => switcherHtml(slug, 'en').replace('__LANGARIA__', 'Language') + '\n      </nav>');
        }
        h = h.replace(/(<script src="\/assets\/js\/converter.js" defer><\/script>)/, m => m + `\n  <script src="/assets/js/lang-switch.js" defer></script>`);
      }
      await writeP(slug + '/index.html', h);
      out.push(`${slug}: h2 ${h.includes(trunc) ? 'FAIL' : 'fixed'}, hreflang ${hasHreflang ? 'existing' : 'added'}, switcher ${hasSwitcher ? 'existing' : 'added'}`);
    }
    text(out.join('\n'));
    return;
  }

  // ---------- mode: fix-home ----------
  if (opts.mode === 'fix-home') {
    const out = [];
    const targets = [];
    for (const L of (opts.lang ? LANGS.filter(L => L.code === opts.lang) : LANGS)) {
      targets.push({ path: `${L.code}/index.html`, L });
      targets.push({ path: `${L.code}/${L.slug('heic-to-jpg')}/index.html`, L });
    }
    for (const t of targets) {
      let h = await readRaw(t.path);
      let count = 0;
      h = h.replace(/href="\/([a-z0-9-]+-to-[a-z0-9]+)\/"/g, (m, slug) => { count++; return `href="/${t.L.code}/${t.L.slug(slug)}/"`; });
      if (t.L.code === 'de') {
        h = h.replace(/>([A-Z][A-Za-z0-9]+) to (JPG|PNG|WebP)</g, (m, a, b) => `>${a} zu ${b}<`);
      }
      await writeP(t.path, h);
      out.push(`${t.path}: ${count} links localized`);
    }
    text(out.join('\n'));
    return;
  }

  // ---------- mode: polish-de ----------
  if (opts.mode === 'polish-de') {
    const out = [];
    for (const slug of NEW_SLUGS) {
      const locSlug = LANGS[0].slug(slug);
      const p = `de/${locSlug}/index.html`;
      let h = await readRaw(p);
      let n = 0;
      const before = h;
      h = h.replace(/(<label id="qualityWrap">)Quality(\s*<input)/, (m, a, b) => { n++; return a + 'Qualität' + b; });
      h = h.replace(/(› )[A-Za-z0-9]+ to (JPG|PNG|WebP)(<\/nav>)/, (m, a, fmt, e) => { n++; return a + slug.toUpperCase().slice(0, slug.indexOf('-')) + ' zu ' + fmt + e; });
      if (h !== before) { await writeP(p, h); out.push(p + ': ' + n + ' fixes'); }
    }
    text(out.join('\n') || 'nothing to fix');
    return;
  }

  // ---------- mode: sitemap ----------
  if (opts.mode === 'sitemap') {
    const urls = [];
    urls.push(`${SITE}/`);
    urls.push(`${SITE}/about/`, `${SITE}/privacy/`, `${SITE}/contact/`);
    SLUGS.forEach(s => urls.push(`${SITE}/${s}/`));
    const langList = opts.lang ? LANGS.filter(L => L.code === opts.lang) : LANGS;
    langList.forEach(L => {
      urls.push(`${SITE}/${L.code}/`);
      SLUGS.forEach(s => urls.push(`${SITE}/${L.code}/${L.slug(s)}/`));
    });
    // keep already-published minimal pages of langs not yet fully built
    LANGS.filter(L => !langList.includes(L)).forEach(L => {
      urls.push(`${SITE}/${L.code}/`);
      urls.push(`${SITE}/${L.code}/${L.slug('heic-to-jpg')}/`);
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map(u => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n') + `\n</urlset>\n`;
    await writeP('sitemap.xml', xml);
    text('sitemap written with ' + urls.length + ' urls');
    return;
  }

  text('unknown mode: ' + opts.mode);
})
