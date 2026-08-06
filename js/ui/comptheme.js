/* Per-competition colour identity, so a cup tie never looks like a league game. */
(function (FCM) {
  'use strict';

  const CT = {};

  // accent drives borders/pills; bg is a translucent wash behind rows.
  function theme(accent, tint, label, icon) {
    return { accent: accent, tint: tint, label: label, icon: icon };
  }

  // ---- Continental (closest to their real brand colours) --------------
  const EURO = {
    'euro:ucl': theme('#3d7dff', 'rgba(61,125,255,.13)', 'Champions League', '★'),
    'euro:uel': theme('#ff7a1a', 'rgba(255,122,26,.13)', 'Europa League', '◆'),
    'euro:uecl': theme('#25c95d', 'rgba(37,201,93,.13)', 'Conference League', '▲')
  };

  // ---- International tournaments --------------------------------------
  const INTL = {
    'intl:worldcup': theme('#f0b429', 'rgba(240,180,41,.16)', 'World Cup', '🏆'),
    'intl:euros': theme('#3d7dff', 'rgba(61,125,255,.14)', 'European Championship', '🌍'),
    'intl:afcon': theme('#25c95d', 'rgba(37,201,93,.14)', 'AFCON', '🌍'),
    'intl:copa': theme('#4fd1c5', 'rgba(79,209,197,.14)', 'Copa América', '🌍'),
    'intl:asiancup': theme('#e0455e', 'rgba(224,69,94,.14)', 'Asian Cup', '🌍'),
    'intl:goldcup': theme('#a855f7', 'rgba(168,85,247,.14)', 'Gold Cup', '🌍')
  };

  // ---- Domestic cups ---------------------------------------------------
  const CUPS = {
    'cup:England': theme('#e03a4e', 'rgba(224,58,78,.13)', 'FA Cup', '🏆'),
    'cup:EFL': theme('#16b8a6', 'rgba(22,184,166,.13)', 'League Cup', '🏆'),
    'cup:Spain': theme('#f0b429', 'rgba(240,180,41,.13)', 'Copa del Rey', '🏆'),
    'cup:Italy': theme('#3aa7e0', 'rgba(58,167,224,.13)', 'Coppa Italia', '🏆'),
    'cup:Germany': theme('#d64545', 'rgba(214,69,69,.13)', 'DFB-Pokal', '🏆'),
    'cup:France': theme('#5b6ee0', 'rgba(91,110,224,.13)', 'Coupe de France', '🏆'),
    'cup:Portugal': theme('#2fae6b', 'rgba(47,174,107,.13)', 'Taça de Portugal', '🏆'),
    'cup:Netherlands': theme('#ff8c2b', 'rgba(255,140,43,.13)', 'KNVB Beker', '🏆'),
    'cup:Scotland': theme('#7c6ce0', 'rgba(124,108,224,.13)', 'Scottish Cup', '🏆'),
    'cup:Belgium': theme('#e0a03a', 'rgba(224,160,58,.13)', 'Belgian Cup', '🏆'),
    'cup:Turkey': theme('#e0455e', 'rgba(224,69,94,.13)', 'Türkiye Kupası', '🏆')
  };

  // ---- Leagues, keyed by league id -------------------------------------
  const LEAGUES = {
    13: theme('#8b5cf6', 'rgba(139,92,246,.10)', 'Premier League'),
    14: theme('#6d5bd0', 'rgba(109,91,208,.10)', 'Championship'),
    60: theme('#5a4fb0', 'rgba(90,79,176,.10)', 'League One'),
    61: theme('#4a4290', 'rgba(74,66,144,.10)', 'League Two'),
    53: theme('#e8542f', 'rgba(232,84,47,.10)', 'La Liga'),
    54: theme('#c2461f', 'rgba(194,70,31,.10)', 'La Liga 2'),
    31: theme('#2f7fd4', 'rgba(47,127,212,.10)', 'Serie A'),
    32: theme('#2867ab', 'rgba(40,103,171,.10)', 'Serie B'),
    19: theme('#d92d2d', 'rgba(217,45,45,.10)', 'Bundesliga'),
    20: theme('#ab2525', 'rgba(171,37,37,.10)', '2. Bundesliga'),
    16: theme('#1e3a8a', 'rgba(56,84,180,.13)', 'Ligue 1'),
    17: theme('#2c4ea8', 'rgba(44,78,168,.10)', 'Ligue 2'),
    308: theme('#059669', 'rgba(5,150,105,.10)', 'Primeira Liga'),
    10: theme('#ea7317', 'rgba(234,115,23,.10)', 'Eredivisie'),
    4: theme('#b8860b', 'rgba(184,134,11,.10)', 'Pro League'),
    68: theme('#c0392b', 'rgba(192,57,43,.10)', 'Süper Lig'),
    50: theme('#1e88a8', 'rgba(30,136,168,.10)', 'Premiership'),
    189: theme('#c62828', 'rgba(198,40,40,.10)', 'Super League'),
    80: theme('#8e44ad', 'rgba(142,68,173,.10)', 'Bundesliga'),
    1: theme('#c0392b', 'rgba(192,57,43,.10)', 'Superliga'),
    66: theme('#b03a48', 'rgba(176,58,72,.10)', 'Ekstraklasa'),
    350: theme('#0f9d58', 'rgba(15,157,88,.10)', 'Saudi Pro League')
  };

  const FALLBACK = theme('#64748b', 'rgba(100,116,139,.10)', 'Competition');

  /** Look up the theme for a competition id (e.g. "league:13", "cup:EFL"). */
  CT.forComp = function (compId) {
    // The user can turn competition colouring off entirely.
    if (FCM.ST && FCM.ST.get('showCompColours') === false) return FALLBACK;
    if (!compId) return FALLBACK;
    if (EURO[compId]) return EURO[compId];
    if (INTL[compId]) return INTL[compId];
    if (CUPS[compId]) return CUPS[compId];
    if (compId.indexOf('intl:') === 0) {
      return theme('#f0b429', 'rgba(240,180,41,.14)', 'International', '🌍');
    }
    if (compId.indexOf('league:') === 0) {
      const id = Number(compId.slice(7));
      return LEAGUES[id] || FALLBACK;
    }
    // Any domestic cup we have not styled explicitly.
    if (compId.indexOf('cup:') === 0) return theme('#c0554a', 'rgba(192,85,74,.13)', 'Cup', '🏆');
    return FALLBACK;
  };

  CT.isCup = function (compId) {
    return !!compId && (compId.indexOf('cup:') === 0 || compId.indexOf('euro:') === 0 ||
      compId.indexOf('intl:') === 0);
  };

  /** A small coloured pill naming the competition. */
  CT.pill = function (compId, compName) {
    const t = CT.forComp(compId);
    const el = FCM.U.el('span', { class: 'comp-pill', text: (t.icon ? t.icon + ' ' : '') + (compName || t.label) });
    el.style.color = t.accent;
    el.style.background = t.tint;
    el.style.borderColor = t.accent;
    return el;
  };

  /** Tint a row/card to match its competition. */
  CT.applyRow = function (node, compId) {
    const t = CT.forComp(compId);
    node.style.borderLeftColor = t.accent;
    node.style.background = t.tint;
    node.classList.add('comp-tinted');
    return node;
  };

  /** Just the accent, for bars and headers. */
  CT.accent = function (compId) { return CT.forComp(compId).accent; };
  CT.tint = function (compId) { return CT.forComp(compId).tint; };

  FCM.CT = CT;
})(window.FCM = window.FCM || {});
