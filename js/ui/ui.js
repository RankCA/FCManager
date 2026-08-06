/* UI helpers: badges, modals, toasts, tables, formatting. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const UI = {};

  // ---- Club badges --------------------------------------------------
  // Drop real crests into assets/badges/<slug>.png and they are picked up
  // automatically; otherwise a coloured monogram is generated.
  const badgeCache = {};
  const BADGE_EXT = ['png', 'svg', 'jpg', 'webp'];

  function initials(name) {
    const skip = { fc: 1, cf: 1, sc: 1, ac: 1, afc: 1, sv: 1, vfb: 1, vfl: 1, ss: 1,
      us: 1, as: 1, rc: 1, cd: 1, ud: 1, sk: 1, fk: 1, bsc: 1, tsg: 1, the: 1, de: 1, ii: 1 };
    const words = String(name).split(/[\s.\-]+/)
      .filter(w => w && !skip[w.toLowerCase()] && !/^\d+$/.test(w));
    if (!words.length) return String(name).slice(0, 2).toUpperCase();
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  /** Deterministic colour pair from the club name. */
  function clubColours(name) {
    const h = FCM.hashString(name);
    const hue = h % 360;
    const hue2 = (hue + 24 + (h >> 8) % 60) % 360;
    return ['hsl(' + hue + ',52%,34%)', 'hsl(' + hue2 + ',48%,20%)'];
  }

  UI.badge = function (club, size) {
    const el = U.el('div', { class: 'badge ' + (size ? 'badge-' + size : ''),
      title: club ? club.name : '' });
    if (!club) return el;
    const cols = clubColours(club.name);
    el.style.background = 'linear-gradient(150deg,' + cols[0] + ',' + cols[1] + ')';
    el.textContent = initials(club.name);

    // Try to swap in a real crest if the user has supplied one.
    const cached = badgeCache[club.slug];
    if (cached === false) return el;
    if (cached) { UI.applyBadgeImage(el, cached); return el; }

    let i = 0;
    (function tryNext() {
      if (i >= BADGE_EXT.length) { badgeCache[club.slug] = false; return; }
      const src = 'assets/badges/' + club.slug + '.' + BADGE_EXT[i++];
      const img = new Image();
      img.onload = function () { badgeCache[club.slug] = src; UI.applyBadgeImage(el, src); };
      img.onerror = tryNext;
      img.src = src;
    })();
    return el;
  };

  // ---- National team flags -------------------------------------------
  // Same idea as club crests: drop images into assets/flags/<slug>.png.
  // Until then a nation shows a coloured monogram, so nothing looks broken.
  const flagCache = {};

  /**
   * Filename-safe form of a nation's name, matching the club slug rule:
   * accents folded to ASCII, everything else lowercased and hyphenated.
   * "Côte d'Ivoire" becomes "cote-d-ivoire".
   */
  UI.nationSlug = function (name) {
    return String(name || '')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]/g, '-')
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  UI.nationBadge = function (nation, size) {
    const el = U.el('div', { class: 'badge badge-flag ' + (size ? 'badge-' + size : ''),
      title: nation || '' });
    if (!nation) return el;
    const cols = clubColours(nation);
    el.style.background = 'linear-gradient(150deg,' + cols[0] + ',' + cols[1] + ')';
    el.textContent = initials(nation);

    const slug = UI.nationSlug(nation);
    const cached = flagCache[slug];
    if (cached === false) return el;
    if (cached) { UI.applyBadgeImage(el, cached); return el; }

    let i = 0;
    (function tryNext() {
      if (i >= BADGE_EXT.length) { flagCache[slug] = false; return; }
      const src = 'assets/flags/' + slug + '.' + BADGE_EXT[i++];
      const img = new Image();
      img.onload = function () { flagCache[slug] = src; UI.applyBadgeImage(el, src); };
      img.onerror = tryNext;
      img.src = src;
    })();
    return el;
  };

  UI.applyBadgeImage = function (el, src) {
    el.textContent = '';
    el.style.background = 'transparent';
    el.style.border = 'none';
    const img = new Image();
    img.src = src;
    img.alt = '';
    el.appendChild(img);
  };

  // ---- Small renderers ----------------------------------------------
  UI.rating = function (v) {
    return U.el('span', { class: 'rate ' + U.ratingClass(v), text: Math.round(v) });
  };
  UI.formRating = function (v) {
    return U.el('span', { class: 'rate ' + U.formClass(v), text: v.toFixed(1) });
  };
  UI.posPill = function (pos) {
    return U.el('span', { class: 'pill ' + (pos === 'GK' ? 'pill-gk' : 'pill-pos'), text: pos });
  };
  UI.formDots = function (form) {
    const box = U.el('span', { class: 'form-dots' });
    (form || []).slice(-5).forEach(r => box.appendChild(U.el('i', { class: 'fd fd-' + r, text: r })));
    return box;
  };
  UI.bar = function (value, max, cls) {
    const b = U.el('div', { class: 'bar ' + (cls || '') });
    b.appendChild(U.el('i', { style: 'width:' + U.clamp((value / (max || 100)) * 100, 0, 100) + '%' }));
    return b;
  };

  /** Player name cell that opens the profile on click. */
  UI.playerLink = function (p, extraClass) {
    const a = U.el('span', {
      class: 'plink ' + (extraClass || ''),
      text: p.name,
      style: 'cursor:pointer;font-weight:600',
      onclick: function (e) { e.stopPropagation(); UI.playerProfile(p); }
    });
    // A colour tag recolours the name and nothing else.
    const tagColour = p.tag && FCM.TG.colour(p.tag);
    if (tagColour) {
      a.style.color = tagColour;
      a.title = FCM.TG.labelFor(p.tag);
    }
    return a;
  };

  /**
   * A money field that shows thousands separators as you type.
   * `type="number"` cannot display commas, so this is a text input that
   * formats on the way in and parses on the way out.
   */
  UI.moneyInput = function (value, opts) {
    const o = opts || {};
    const input = U.el('input', {
      type: 'text', inputmode: 'numeric', autocomplete: 'off',
      class: 'money-input ' + (o.class || ''),
      style: o.style || ''
    });
    function fmt(n) {
      if (n === '' || n === null || n === undefined || isNaN(n)) return '';
      return Math.round(n).toLocaleString('en-GB');
    }
    input.value = fmt(value || 0);
    input.addEventListener('input', function () {
      // Keep the caret sensible by measuring digits before it, not columns.
      const before = input.value.slice(0, input.selectionStart).replace(/\D/g, '').length;
      const digits = input.value.replace(/\D/g, '');
      const n = digits === '' ? '' : Number(digits);
      input.value = fmt(n);
      let seen = 0, pos = input.value.length;
      for (let i = 0; i < input.value.length; i++) {
        if (/\d/.test(input.value[i])) seen++;
        if (seen === before) { pos = i + 1; break; }
      }
      if (before === 0) pos = 0;
      input.setSelectionRange(pos, pos);
    });
    input.getValue = function () {
      const digits = input.value.replace(/\D/g, '');
      return digits === '' ? 0 : Number(digits);
    };
    input.setValue = function (n) { input.value = fmt(n); };
    return input;
  };

  /** Read a value from either a money input or a plain number input. */
  UI.readMoney = function (input) {
    if (input && typeof input.getValue === 'function') return input.getValue();
    return Number(input && input.value) || 0;
  };

  /** Small colour dot for a tag, used in lists and the tag picker. */
  UI.tagDot = function (colourId, size) {
    const hex = FCM.TG.colour(colourId);
    const d = U.el('i', { class: 'tag-dot' + (size ? ' tag-dot-' + size : '') });
    if (hex) d.style.background = hex;
    else { d.style.background = 'transparent'; d.style.border = '1px dashed var(--line)'; }
    return d;
  };

  UI.clubCell = function (club, size) {
    const row = U.el('div', { class: 'row' });
    row.appendChild(UI.badge(club, size || 'sm'));
    row.appendChild(U.el('span', { text: club ? club.name : '—' }));
    return row;
  };

  UI.injuryPill = function (p) {
    if (p.injury > 0) {
      return U.el('span', { class: 'pill pill-bad', text: '⚕ ' + p.injury + 'd',
        title: p.injuryName || 'Injured' });
    }
    if ((p.suspended || 0) > 0) {
      return U.el('span', { class: 'pill pill-bad', text: '🟥 ' + p.suspended,
        title: 'Suspended for ' + p.suspended + ' match' + (p.suspended > 1 ? 'es' : '') });
    }
    if (p.fitness < 65) {
      return U.el('span', { class: 'pill pill-warn', text: Math.round(p.fitness) + '%',
        title: 'Low fitness' });
    }
    return null;
  };

  // ---- Sortable table -----------------------------------------------
  /**
   * cols: [{ key, label, num, cls, nosort, render(row), sort(row) }]
   */
  UI.table = function (cols, rows, opts) {
    const o = opts || {};
    const wrap = U.el('div', { class: 'table-wrap' });
    const table = U.el('table');
    const thead = U.el('thead');
    const trh = U.el('tr');

    let sortKey = o.sortKey || null;
    let sortDesc = o.sortDesc !== false;

    cols.forEach(c => {
      const th = U.el('th', {
        class: (c.num ? 't-num ' : '') + (c.center ? 't-c ' : '') + (c.nosort ? 'nosort' : ''),
        text: c.label
      });
      if (!c.nosort) {
        th.addEventListener('click', function () {
          if (sortKey === c.key) sortDesc = !sortDesc;
          else { sortKey = c.key; sortDesc = !!c.num; }
          draw();
        });
      }
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = U.el('tbody');
    table.appendChild(tbody);
    wrap.appendChild(table);

    function draw() {
      tbody.innerHTML = '';
      let list = rows.slice();
      if (sortKey) {
        const col = cols.find(c => c.key === sortKey);
        if (col) {
          const val = col.sort || (r => r[sortKey]);
          list.sort((a, b) => {
            const x = val(a), y = val(b);
            if (typeof x === 'string' || typeof y === 'string') {
              return sortDesc ? String(y).localeCompare(String(x)) : String(x).localeCompare(String(y));
            }
            return sortDesc ? (y - x) : (x - y);
          });
        }
      }
      U.qsa('th', thead).forEach((th, i) => {
        th.textContent = cols[i].label + (cols[i].key === sortKey ? (sortDesc ? ' ▾' : ' ▴') : '');
      });
      list.forEach((r, i) => {
        const tr = U.el('tr', { class: (o.rowClass ? o.rowClass(r) : '') + (o.onRow ? ' clickable' : '') });
        cols.forEach(c => {
          const td = U.el('td', { class: (c.num ? 't-num ' : '') + (c.center ? 't-c ' : '') + (c.cls || '') });
          const v = c.render ? c.render(r, i) : r[c.key];
          if (v === null || v === undefined) td.textContent = '';
          else if (typeof v === 'object') td.appendChild(v);
          else td.textContent = v;
          tr.appendChild(td);
        });
        if (o.onRow) tr.addEventListener('click', () => o.onRow(r));
        tbody.appendChild(tr);
      });
      if (!list.length) {
        const tr = U.el('tr');
        tr.appendChild(U.el('td', { colspan: cols.length, class: 'empty', text: o.empty || 'Nothing to show.' }));
        tbody.appendChild(tr);
      }
    }
    draw();
    wrap.refresh = function (newRows) { rows = newRows; draw(); };
    return wrap;
  };

  UI.card = function (title, body, actions) {
    const c = U.el('div', { class: 'card' });
    if (title) {
      const h = U.el('div', { class: 'card-head' });
      h.appendChild(U.el('h3', { text: title }));
      if (actions) { const sp = U.el('div', { class: 'row' }); [].concat(actions).forEach(a => sp.appendChild(a)); h.appendChild(sp); }
      c.appendChild(h);
    }
    const b = U.el('div', { class: 'card-body' + (body && body.classList && body.classList.contains('table-wrap') ? ' flush' : '') });
    if (typeof body === 'string') b.innerHTML = body;
    else if (body) b.appendChild(body);
    c.appendChild(b);
    return c;
  };

  UI.stat = function (label, value, cls) {
    const s = U.el('div', { class: 'stat' });
    s.appendChild(U.el('b', { text: value, class: cls || '' }));
    s.appendChild(U.el('span', { text: label }));
    return s;
  };

  // ---- Modal ---------------------------------------------------------
  UI.modal = function (title, bodyEl, footEl, opts) {
    const o = opts || {};
    const wrap = document.getElementById('modal');
    const box = document.getElementById('modal-box');
    box.innerHTML = '';

    const head = U.el('div', { class: 'modal-head' });
    if (o.badge) head.appendChild(o.badge);
    head.appendChild(U.el('h2', { text: title }));
    const x = U.el('button', { class: 'x-close', html: '&times;', onclick: UI.closeModal });
    head.appendChild(x);
    box.appendChild(head);

    const body = U.el('div', { class: 'modal-body' });
    if (typeof bodyEl === 'string') body.innerHTML = bodyEl;
    else if (bodyEl) body.appendChild(bodyEl);
    box.appendChild(body);

    if (footEl) {
      const foot = U.el('div', { class: 'modal-foot' });
      [].concat(footEl).forEach(f => foot.appendChild(f));
      box.appendChild(foot);
    }
    wrap.classList.remove('hidden');
    wrap.querySelector('.modal-back').onclick = UI.closeModal;
    // The box is reused, so a dialog opened from a scrolled one inherits its
    // scroll position and starts with its first rows hidden behind the head.
    box.scrollTop = 0;
    return box;
  };
  UI.closeModal = function () { document.getElementById('modal').classList.add('hidden'); };

  UI.confirm = function (title, message, onYes, yesLabel) {
    const body = U.el('p', { text: message, style: 'margin:0;line-height:1.6' });
    const no = U.el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal });
    const yes = U.el('button', {
      class: 'btn btn-primary', text: yesLabel || 'Confirm',
      onclick: function () { UI.closeModal(); onYes(); }
    });
    UI.modal(title, body, [no, yes]);
  };

  // ---- Toast ----------------------------------------------------------
  UI.toast = function (msg, kind, ms) {
    const box = document.getElementById('toasts');
    const t = U.el('div', { class: 'toast ' + (kind || ''), text: msg });
    box.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0'; t.style.transform = 'translateX(20px)';
      setTimeout(function () { t.remove(); }, 320);
    }, ms || 2800);
  };

  FCM.UI = UI;
})(window.FCM = window.FCM || {});
