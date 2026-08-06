/* User preferences: themes and feature toggles. Stored separately from the
   save so they survive starting a new career. */
(function (FCM) {
  'use strict';

  const ST = {};
  const KEY = 'fcmanager.prefs.v1';

  ST.THEMES = [
    { id: 'dark', label: 'Dark', swatch: ['#0b0f16', '#22c55e'], blurb: 'The default. Deep navy with green accents.' },
    { id: 'midnight', label: 'Midnight', swatch: ['#070d1c', '#3b82f6'], blurb: 'Cooler blues, easier at night.' },
    { id: 'purple', label: 'Amethyst', swatch: ['#100a1c', '#a855f7'], blurb: 'Deep violet with magenta highlights.' },
    { id: 'forest', label: 'Forest', swatch: ['#08130e', '#34d399'], blurb: 'Muted greens, like a floodlit pitch.' },
    { id: 'crimson', label: 'Crimson', swatch: ['#150a0c', '#f43f5e'], blurb: 'Dark red, matchday intensity.' },
    { id: 'slate', label: 'Slate', swatch: ['#101418', '#94a3b8'], blurb: 'Neutral greys, minimal colour.' },
    { id: 'light', label: 'Light', swatch: ['#f1f5f9', '#16a34a'], blurb: 'Bright theme for well-lit rooms.' }
  ];

  ST.DEFAULTS = {
    theme: 'dark',
    liveMatches: true,       // watch matches vs instant results
    matchSpeed: 'normal',
    autoLineup: true,
    autoSubs: true,
    autosave: true,
    showPotential: true,     // hide for a more realistic scouting feel
    confirmBigDecisions: true,
    density: 'comfortable',  // comfortable | compact
    showCompColours: true,
    fullMoney: false         // £10,228,900 rather than £10.2M
  };

  let prefs = null;

  ST.load = function () {
    if (prefs) return prefs;
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    prefs = Object.assign({}, ST.DEFAULTS, stored || {});
    return prefs;
  };

  ST.get = function (key) { return ST.load()[key]; };

  ST.set = function (key, value) {
    ST.load();
    prefs[key] = value;
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
    if (key === 'theme') ST.applyTheme(value);
    if (key === 'density') ST.applyDensity(value);
    return prefs;
  };

  ST.reset = function () {
    prefs = Object.assign({}, ST.DEFAULTS);
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
    ST.applyTheme(prefs.theme);
    ST.applyDensity(prefs.density);
    return prefs;
  };

  ST.applyTheme = function (id) {
    document.documentElement.setAttribute('data-theme', id || 'dark');
  };
  ST.applyDensity = function (d) {
    document.documentElement.setAttribute('data-density', d || 'comfortable');
  };

  /** Apply everything at boot. */
  ST.init = function () {
    const p = ST.load();
    ST.applyTheme(p.theme);
    ST.applyDensity(p.density);
    return p;
  };

  FCM.ST = ST;
})(window.FCM = window.FCM || {});
