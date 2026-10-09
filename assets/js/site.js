/* ============================================================
   mobogreat site script
   markdown rendering, works list, socials, stats, theme toggle.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------- utils ---------------- */

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    // used inside attributes too, so escape quotes as well
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isExternal(link) {
    return /^https?:\/\//i.test(link || '');
  }

  function capFirst(str) {
    const s = String(str == null ? '' : str);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  /* ---------------- markdown ----------------
     the same lightweight renderer the old admin used,
     so existing descriptions keep rendering identically. */

  function markdown(md) {
    if (!md) return '';
    let html = md;

    // code blocks (must come before inline code)
    html = html.replace(/```([\s\S]*?)```/g, function (_, code) {
      return '<pre><code>' + code.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>';
    });

    // inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

    // links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // bold + italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

    // bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // blockquotes
    html = html.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>');

    // headings
    html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

    // unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // paragraphs (double newline separators)
    const blocks = html.split(/\n\n+/);
    html = blocks.map(function (block) {
      block = block.trim();
      if (!block) return '';
      if (/^<(ul|ol|h[1-6]|blockquote|pre|hr|img|table)/.test(block)) return block;
      if (/^<\/?(ul|ol|li|h[1-6]|blockquote|pre|hr|table)/.test(block)) return block;
      return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    // clean empty paragraphs
    html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');

    return html;
  }

  /* ---------------- works list ---------------- */

  function pageHref(page) {
    let href = String(page || '').trim();
    if (!href) return '';
    if (href.indexOf('/') === -1) href = 'works/' + href;
    if (!/\.[a-z0-9]+$/i.test(href)) href += '.html';
    return href;
  }

  function repoOf(link) {
    const m = /^https:\/\/github\.com\/([^\/]+)\/([^\/#?]+)/i.exec(link || '');
    if (!m) return '';
    return m[1] + '/' + m[2].replace(/\.git$/i, '');
  }

  function workRowHtml(w) {
    const external = isExternal(w.link);
    const more = pageHref(w.page);
    const repo = repoOf(w.link);
    const tags = (w.tags || []).filter(Boolean);

    return '<div class="work-row' + (external ? ' has-link' : '') + '"' +
        (w.hidden ? ' data-hidden="1"' : '') +
        (repo ? ' data-repo="' + escapeHtml(repo) + '"' : '') + '>' +
      '<div class="work-head">' +
        '<span class="work-title">' + escapeHtml(w.title) + '</span>' +
        (w.hidden ? '<span class="work-hidden-tag">hidden</span>' : '') +
        ((more || external) ?
          '<div class="work-actions">' +
            (more ?
              '<a class="work-more" href="' + escapeHtml(more) + '"' +
                ' data-card-title="' + escapeHtml(w.title) + '"' +
                ' data-card-text="read the full page">More info</a>'
              : '') +
            (external ?
              '<a class="work-view" href="' + escapeHtml(w.link) + '" target="_blank" rel="noopener noreferrer"' +
                ' data-card-title="' + escapeHtml(w.title) + '"' +
                ' data-card-text="opens in a new tab"' +
                ' data-card-footer="' + escapeHtml(urlForCard(w.link)) + '">View &rarr;</a>'
              : '') +
          '</div>'
          : '') +
      '</div>' +
      '<div class="work-desc">' + markdown(w.desc) + '</div>' +
      (tags.length
        ? '<div class="work-tags">' + tags.map(function (t) {
            const info = TAG_INFO[t];
            return '<span class="work-tag"' + (info
              ? ' data-card-title="' + escapeHtml(t) + '" data-card-text="' + escapeHtml(info) + '"'
              : '') + '>' + escapeHtml(t) + '</span>';
          }).join('') + '</div>'
        : '') +
    '</div>';
  }

  function slugify(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cat';
  }

  function catSectionHtml(cat, items, colorIndex) {
    const color = 'var(--cat-' + ((colorIndex % 5) + 1) + ')';
    return '<section class="cat" id="cat-' + slugify(cat) + '"' +
      ' data-cat="' + escapeHtml(cat) + '"' +
      ' style="--cat-color:' + color + '">' +
      '<h2><span class="cat-dot"></span>' + escapeHtml(cat) +
        ' <span class="cat-count">' + items.length + '</span></h2>' +
      items.map(workRowHtml).join('') +
    '</section>';
  }

  function buildList(data, includeHidden) {
    const cats = (data && data.categories) || [];
    const works = ((data && data.works) || []).filter(function (w) {
      return includeHidden || !w.hidden;
    });

    const order = cats.slice();
    works.forEach(function (w) {
      if (w.cat && order.indexOf(w.cat) === -1) order.push(w.cat);
    });

    let html = '';
    let colorIndex = 0;

    order.forEach(function (cat) {
      const items = works.filter(function (w) { return (w.cat || '') === cat; });
      if (!items.length) return;
      html += catSectionHtml(cat, items, colorIndex);
      colorIndex += 1;
    });

    const uncategorized = works.filter(function (w) { return !w.cat; });
    if (uncategorized.length) {
      html += catSectionHtml('Uncategorized', uncategorized, colorIndex);
    }

    return html;
  }

  function renderWorksInto(el, data, includeHidden) {
    if (!el) return;
    const source = data || (typeof WORKS_DATA !== 'undefined' ? WORKS_DATA : { categories: [], works: [] });
    el.innerHTML = buildList(source, !!includeHidden);
  }

  function renderContents() {
    const slot = document.getElementById('sidebar-contents');
    if (!slot) return;
    const list = document.getElementById('works-list');
    const sections = list ? list.querySelectorAll('.cat') : [];
    const group = slot.closest ? slot.closest('.side-group') : null;

    if (!sections.length) {
      if (group) group.hidden = true;
      return;
    }
    if (group) group.hidden = false;

    slot.innerHTML = Array.prototype.map.call(sections, function (sec) {
      const name = sec.getAttribute('data-cat') || '';
      return '<li><a href="#' + sec.id + '">' + escapeHtml(name) + '</a></li>';
    }).join('');
  }

  /* ---------------- socials ---------------- */

  // add more here whenever. href makes a link,
  // copy makes a click-to-copy handle.
  const SOCIALS = [
    { name: 'GitHub', desc: 'where the code lives', href: 'https://github.com/mobogreatthegreat' },
    { name: 'YouTube', desc: 'videos and stuff', href: 'https://www.youtube.com/@mobogreatthegreat' },
    { name: 'Discord', desc: 'mobogreatthegreat', copy: 'mobogreatthegreat' }
  ];

  // little blurbs shown when hovering a tag on the works page
  const TAG_INFO = {
    'Featured': 'hand picked highlight',
    'Optimized': 'built to run fast',
    'Programming Language': 'a whole language, from scratch',
    'Experimental': 'very much a work in progress',
    'Unreleased': 'not out yet',
    'Python': 'a scary programming language',
    'HTML': 'the structure of web pages',
    'CSS': 'the styling of web pages',
    'JavaScript': 'the behavior of web pages',
    'AI': 'artificial intelligence things',
    'Contributor': 'i helped with this one',
    'Tool': 'a tool, not a game',
    'Luau': 'the language roblox scripts are written in',
    'Math': 'math stuff',
    'Private': 'no public link, ask me for it',
    'Optimizations': 'making code run faster',
    'Funny': 'made for the bit',
    'Game Development': 'roblox game stuff',
    'Playtesting': 'i played it early and complained about things',
    'Elemental': 'windy or something',
    'Text': 'text rendering stuff'
  };

  function renderSocials() {
    const slot = document.getElementById('socials-slot');
    if (!slot) return;
    slot.innerHTML = SOCIALS.map(function (s) {
      const descPart = ' <span class="ext-desc">(' + escapeHtml(s.desc) + ')</span>';
      if (s.copy) {
        return '<li><a href="#" class="social-copy"' +
          ' data-copy="' + escapeHtml(s.copy) + '"' +
          ' aria-label="' + escapeHtml(s.name + ': ' + s.copy + ', click to copy') + '"' +
          ' data-card-title="' + escapeHtml(s.name) + '"' +
          ' data-card-text="click to copy"' +
          ' data-card-footer="' + escapeHtml(s.copy) + '">' +
          escapeHtml(s.name) +
        '</a>' + descPart + '</li>';
      }
      if (!s.href) {
        return '<li>' + escapeHtml(s.name) + descPart + '</li>';
      }
      const ext = isExternal(s.href);
      const host = domainOf(s.href);
      return '<li>' +
        '<a href="' + escapeHtml(s.href) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') +
          ' data-card-title="' + escapeHtml(s.name) + '"' +
          ' data-card-text="' + escapeHtml(s.desc) + '"' +
          (host ? ' data-card-footer="' + escapeHtml(host) + '"' : '') + '>' +
          escapeHtml(s.name) + (ext ? ' &nearr;' : '') +
        '</a> <span class="ext-desc">(' + escapeHtml(capFirst(s.desc)) + ')</span>' +
      '</li>';
    }).join('');
  }

  /* ---------------- hover card (zenith.observer flavour) ---------------- */

  function domainOf(href) {
    try {
      return new URL(href).hostname.replace(/^www\./, '');
    } catch (e) { return ''; }
  }

  function urlForCard(href) {
    try {
      const u = new URL(href);
      return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/+$/, '');
    } catch (e) { return ''; }
  }

  let hoverCard = null;
  let hoverTarget = null;

  function ensureHoverCard() {
    if (hoverCard) return hoverCard;
    hoverCard = document.createElement('div');
    hoverCard.id = 'hover-card';
    hoverCard.setAttribute('aria-hidden', 'true');
    hoverCard.innerHTML =
      '<div class="hover-card-title"></div>' +
      '<div class="hover-card-text"></div>' +
      '<div class="hover-card-footer"></div>';
    document.body.appendChild(hoverCard);
    return hoverCard;
  }

  function positionHoverCard(x, y) {
    const el = hoverCard;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const pad = 10;
    let left = x - w / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));
    let top = y - h - 16;
    if (top < pad) top = y + 22;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  function showHoverCard(target, x, y) {
    const el = ensureHoverCard();
    const title = target.getAttribute('data-card-title') || '';
    const text = target.getAttribute('data-card-text') || '';
    const footer = target.getAttribute('data-card-footer') || '';

    el.querySelector('.hover-card-title').textContent = title;

    const textEl = el.querySelector('.hover-card-text');
    textEl.textContent = text;
    textEl.hidden = !text;

    const footerEl = el.querySelector('.hover-card-footer');
    footerEl.textContent = footer;
    footerEl.hidden = !footer;

    el.classList.add('enabled');
    positionHoverCard(x, y);
  }

  function hideHoverCard() {
    hoverTarget = null;
    if (hoverCard) hoverCard.classList.remove('enabled');
  }

  function initHoverCards() {
    // only for devices with a real mouse
    if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;

    // external links get a basic card unless they already have one
    document.querySelectorAll('a[href^="http"]:not([data-card-title])').forEach(function (a) {
      const host = domainOf(a.href);
      if (!host) return;
      let title = host;
      let text = 'opens in a new tab';
      if (/(^|\.)github\.com$/i.test(host)) { title = 'GitHub'; text = 'where the code lives'; }
      else if (/(^|\.)youtube\.com$/i.test(host)) { title = 'YouTube'; text = 'videos and stuff'; }
      a.setAttribute('data-card-title', title);
      a.setAttribute('data-card-text', text);
      a.setAttribute('data-card-footer', host);
    });

    document.addEventListener('mouseover', function (e) {
      if (!e.target.closest) return;
      const target = e.target.closest('[data-card-title]');
      if (!target || target === hoverTarget) return;
      hoverTarget = target;
      showHoverCard(target, e.clientX, e.clientY);
    });

    document.addEventListener('mouseout', function (e) {
      if (!hoverTarget || !e.target.closest) return;
      const from = e.target.closest('[data-card-title]');
      if (from !== hoverTarget) return;
      const to = e.relatedTarget && e.relatedTarget.closest
        ? e.relatedTarget.closest('[data-card-title]')
        : null;
      if (to === hoverTarget) return;
      hideHoverCard();
    });

    document.addEventListener('mousemove', function (e) {
      if (hoverTarget && hoverCard && hoverCard.classList.contains('enabled')) {
        positionHoverCard(e.clientX, e.clientY);
      }
    });
  }

  /* ---------------- click to copy ---------------- */

  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* whatever */ }
    document.body.removeChild(ta);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
    }
    legacyCopy(text);
    return Promise.resolve();
  }

  function flashCopied(el) {
    const li = el.parentNode;
    const desc = li ? li.querySelector('.ext-desc') : null;
    if (!desc) return;
    if (!desc._original) desc._original = desc.textContent;
    desc.textContent = '(copied!)';
    clearTimeout(desc._timer);
    desc._timer = setTimeout(function () {
      desc.textContent = desc._original;
    }, 1200);
  }

  function initCopyLinks() {
    document.addEventListener('click', function (e) {
      if (!e.target.closest) return;
      const el = e.target.closest('[data-copy]');
      if (!el) return;
      e.preventDefault();
      copyText(el.getAttribute('data-copy') || '');
      flashCopied(el);
    });
  }

  /* ---------------- page transitions ---------------- */

  function supportsViewTransitions() {
    try {
      const s = document.createElement('style');
      s.textContent = '@view-transition { navigation: auto; }';
      document.head.appendChild(s);
      const ok = !!(s.sheet && s.sheet.cssRules && s.sheet.cssRules.length);
      document.head.removeChild(s);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function initPageTransitions() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (location.protocol !== 'file:' && supportsViewTransitions()) return; // the browser handles it

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!e.target.closest) return;
      const a = e.target.closest('a');
      if (!a) return;
      const raw = a.getAttribute('href');
      if (!raw || raw.charAt(0) === '#') return;
      if (a.target && a.target !== '_self') return;
      let url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      document.body.classList.add('page-leave');
      setTimeout(function () { location.href = a.href; }, 130);
    });

    window.addEventListener('pageshow', function () {
      document.body.classList.remove('page-leave');
    });
  }

  /* ---------------- daily boxes ---------------- */

  function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function renderDaily() {
    const factSlot = document.getElementById('fact-slot');
    const jokeSlot = document.getElementById('joke-slot');
    if (!factSlot && !jokeSlot) return;

    const key = todayKey();
    const facts = (typeof FACTS_OF_THE_DAY !== 'undefined') ? FACTS_OF_THE_DAY : {};
    const jokes = (typeof JOKES_OF_THE_DAY !== 'undefined') ? JOKES_OF_THE_DAY : {};

    if (factSlot) {
      factSlot.textContent = facts[key] || "There's nothing here...";
      const section = document.getElementById('fact-section');
      if (section) section.hidden = false;
    }

    if (jokeSlot) {
      jokeSlot.textContent = jokes[key] || "There's nothing here...";
      const section = document.getElementById('joke-section');
      if (section) section.hidden = false;
    }
  }

  /* ---------------- repo stats ---------------- */

  function timeAgo(iso) {
    const then = new Date(iso).getTime();
    if (!then) return '';
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins === 1 ? '1 min ago' : mins + ' mins ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours === 1 ? '1 hour ago' : hours + ' hours ago';
    const days = Math.floor(hours / 24);
    if (days < 30) return days === 1 ? '1 day ago' : days + ' days ago';
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? '1 month ago' : months + ' months ago';
    const years = Math.floor(months / 12);
    return years === 1 ? '1 year ago' : years + ' years ago';
  }

  function applyRepoStats(rows, data) {
    Array.prototype.forEach.call(rows, function (row) {
      const info = data[row.getAttribute('data-repo')];
      if (!info || !info.pushedAt) return;
      const parts = [];
      if (info.stars > 0) parts.push('\u2605 ' + info.stars);
      parts.push('updated ' + timeAgo(info.pushedAt));
      let el = row.querySelector('.work-stat');
      if (!el) {
        el = document.createElement('span');
        el.className = 'work-stat';
        row.appendChild(el);
      }
      el.textContent = parts.join(' \u00b7 ');
    });
  }

  function initRepoStats() {
    const rows = document.querySelectorAll('[data-repo]');
    if (!rows.length || !window.fetch) return;

    const repos = [];
    Array.prototype.forEach.call(rows, function (row) {
      const repo = row.getAttribute('data-repo');
      if (repo && repos.indexOf(repo) === -1) repos.push(repo);
    });
    if (!repos.length) return;

    const KEY = 'mobo_gh_stats_v1';
    let cache = null;
    try { cache = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { cache = null; }
    if (cache && cache.t && cache.data && (Date.now() - cache.t) < 30 * 60 * 1000) {
      applyRepoStats(rows, cache.data);
      return;
    }

    Promise.all(repos.map(function (repo) {
      return fetch('https://api.github.com/repos/' + repo)
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (json) {
          if (!json) return null;
          return { repo: repo, stars: json.stargazers_count || 0, pushedAt: json.pushed_at || '' };
        })
        .catch(function () { return null; });
    })).then(function (results) {
      const data = {};
      results.forEach(function (r) {
        if (r) data[r.repo] = { stars: r.stars, pushedAt: r.pushedAt };
      });
      applyRepoStats(rows, data);
      try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), data: data })); } catch (e) { /* whatever */ }
    });
  }

  /* ---------------- stats + featured ---------------- */

  function renderStats() {
    const el = document.getElementById('stats-slot');
    if (!el || typeof WORKS_DATA === 'undefined') return;
    const works = (WORKS_DATA.works || []).filter(function (w) { return !w.hidden; });
    const cats = {};
    works.forEach(function (w) { if (w.cat) cats[w.cat] = true; });
    const priv = works.filter(function (w) {
      return (w.tags || []).some(function (t) {
        return String(t).toLowerCase() === 'private';
      });
    });
    el.innerHTML =
      '<span class="stat"><strong>' + works.length + '</strong> works</span>' +
      '<span class="stat"><strong>' + Object.keys(cats).length + '</strong> categories</span>' +
      '<span class="stat"><strong>' + priv.length + '</strong> private</span>';
  }

  function renderFeatured() {
    const slot = document.getElementById('featured-slot');
    if (!slot || typeof WORKS_DATA === 'undefined') return;

    const cat = (WORKS_DATA.categories || []).filter(function (c) {
      return c.toLowerCase() === 'featured';
    })[0];
    if (!cat) return;

    const items = (WORKS_DATA.works || []).filter(function (w) {
      return !w.hidden && w.cat === cat;
    });
    if (!items.length) return; // section stays hidden

    slot.innerHTML = items.map(workRowHtml).join('');
    const section = document.getElementById('featured-section');
    if (section) section.hidden = false;
  }

  /* ---------------- theme ---------------- */

  function getMode() {
    try { return localStorage.getItem('mobo_theme') || 'dark'; } catch (e) { return 'dark'; }
  }

  function isLight(mode) {
    if (mode === 'light') return true;
    if (mode === 'dark') return false;
    return window.matchMedia ? !window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  }

  function applyTheme(mode) {
    const root = document.documentElement;
    root.setAttribute('data-theme', isLight(mode) ? 'light' : 'dark');
    root.setAttribute('data-theme-mode', mode);
    document.querySelectorAll('[data-theme-set]').forEach(function (a) {
      const active = a.getAttribute('data-theme-set') === mode;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  function initTheme() {
    document.querySelectorAll('[data-theme-set]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const mode = a.getAttribute('data-theme-set') || 'dark';
        try { localStorage.setItem('mobo_theme', mode); } catch (err) { /* fine */ }
        applyTheme(mode);
      });
    });

    applyTheme(getMode());

    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    if (mq) {
      const onChange = function () {
        if (getMode() === 'auto') applyTheme('auto');
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ---------------- nav ---------------- */

  function setActiveNav() {
    const page = document.body.getAttribute('data-page');
    if (!page) return;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === page) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---------------- init ---------------- */

  function init() {
    setActiveNav();
    initTheme();
    renderSocials();
    renderStats();
    renderFeatured();

    const list = document.getElementById('works-list');
    if (list && typeof WORKS_DATA !== 'undefined') {
      renderWorksInto(list, WORKS_DATA, false);
    }
    renderContents();

    renderDaily();
    initHoverCards();
    initCopyLinks();
    initRepoStats();
    initPageTransitions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---------------- exports (used by admin.html) ---------------- */

  window.Mobo = {
    markdown: markdown,
    escapeHtml: escapeHtml,
    isExternal: isExternal,
    workRowHtml: workRowHtml,
    buildList: buildList,
    renderWorksInto: renderWorksInto,
    SOCIALS: SOCIALS
  };
})();
