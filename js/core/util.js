/* Formatting, dates and small DOM helpers. */
(function (FCM) {
  'use strict';

  const U = {};

  // ---- Money -------------------------------------------------------
  /** Every digit, grouped in threes: £10,228,900. */
  U.moneyFull = function (n, opts) {
    const cur = (opts || {}).cur || '£';
    if (n === null || n === undefined || isNaN(n)) return cur + '0';
    const sign = n < 0 ? '-' : '';
    return sign + cur + Math.round(Math.abs(n)).toLocaleString('en-GB');
  };

  U.money = function (n, opts) {
    const o = opts || {};
    const cur = o.cur || '£';
    if (n === null || n === undefined || isNaN(n)) return cur + '0';
    // The manager can ask for exact figures everywhere instead of "£10.2M".
    // `short` opts out where space is genuinely tight (chart labels, pills).
    if (!o.short && FCM.ST && FCM.ST.get('fullMoney')) return U.moneyFull(n, o);
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e9) return sign + cur + (abs / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
    if (abs >= 1e6) return sign + cur + (abs / 1e6).toFixed(abs >= 1e8 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (abs >= 1e3) return sign + cur + Math.round(abs / 1e3) + 'K';
    return sign + cur + Math.round(abs);
  };
  U.wage = function (n) { return U.money(n) + '/wk'; };
  U.num = function (n) { return (n || 0).toLocaleString('en-GB'); };

  // ---- Dates -------------------------------------------------------
  // The game clock is an integer day index. Day 0 = 1 July of the start year.
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  U.dateFromDay = function (startYear, day) {
    const d = new Date(Date.UTC(startYear, 6, 1));
    d.setUTCDate(d.getUTCDate() + day);
    return d;
  };
  U.fmtDate = function (startYear, day, style) {
    const d = U.dateFromDay(startYear, day);
    const dd = d.getUTCDate(), mm = d.getUTCMonth(), yy = d.getUTCFullYear();
    if (style === 'long') return DAYS[d.getUTCDay()] + ' ' + dd + ' ' + MONTHS_FULL[mm] + ' ' + yy;
    if (style === 'short') return dd + ' ' + MONTHS[mm];
    return dd + ' ' + MONTHS[mm] + ' ' + yy;
  };
  U.monthOf = function (startYear, day) { return U.dateFromDay(startYear, day).getUTCMonth(); };
  U.dowOf = function (startYear, day) { return U.dateFromDay(startYear, day).getUTCDay(); };

  // ---- Math --------------------------------------------------------
  U.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.round = function (v, dp) { const m = Math.pow(10, dp || 0); return Math.round(v * m) / m; };
  U.sum = function (arr, fn) { let s = 0; for (const x of arr) s += fn ? fn(x) : x; return s; };
  U.mean = function (arr, fn) { return arr.length ? U.sum(arr, fn) / arr.length : 0; };
  U.sortBy = function (arr, fn, desc) {
    return arr.slice().sort((a, b) => (desc ? fn(b) - fn(a) : fn(a) - fn(b)));
  };

  // ---- Ratings -----------------------------------------------------
  /** Colour band for an overall/attribute value, matching FC card feel. */
  U.ratingClass = function (v) {
    if (v >= 85) return 'r-elite';
    if (v >= 78) return 'r-great';
    if (v >= 70) return 'r-good';
    if (v >= 62) return 'r-ok';
    return 'r-poor';
  };
  U.formClass = function (v) {
    if (v >= 7.4) return 'r-elite';
    if (v >= 6.9) return 'r-great';
    if (v >= 6.4) return 'r-good';
    if (v >= 5.9) return 'r-ok';
    return 'r-poor';
  };
  U.ordinal = function (n) {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // ---- DOM ---------------------------------------------------------
  U.el = function (tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'html') e.innerHTML = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') {
          e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== null && attrs[k] !== undefined) {
          e.setAttribute(k, attrs[k]);
        }
      }
    }
    if (children) {
      for (const c of [].concat(children)) {
        if (c === null || c === undefined || c === false) continue;
        e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return e;
  };
  U.esc = function (s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  U.qs = function (sel, root) { return (root || document).querySelector(sel); };
  U.qsa = function (sel, root) { return Array.from((root || document).querySelectorAll(sel)); };

  FCM.U = U;
})(window.FCM = window.FCM || {});
