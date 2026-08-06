/* Player colour tags. Purely organisational - they change the colour of a
   player's name and nothing else. Labels are user-editable. */
(function (FCM) {
  'use strict';

  const TG = {};
  const KEY = 'fcmanager.taglabels.v1';

  TG.COLOURS = [
    { id: 'red', hex: '#f87171', label: 'Sell' },
    { id: 'orange', hex: '#fb923c', label: 'Fringe' },
    { id: 'yellow', hex: '#fbbf24', label: 'Watch' },
    { id: 'green', hex: '#4ade80', label: 'Keep' },
    { id: 'blue', hex: '#60a5fa', label: 'Prospect' },
    { id: 'purple', hex: '#c084fc', label: 'Loan out' },
    { id: 'pink', hex: '#f472b6', label: 'Untouchable' },
    { id: 'grey', hex: '#94a3b8', label: 'Reserve' }
  ];

  let labels = null;

  TG.labels = function () {
    if (labels) return labels;
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    labels = {};
    TG.COLOURS.forEach(c => { labels[c.id] = (stored && stored[c.id]) || c.label; });
    return labels;
  };

  TG.setLabel = function (id, text) {
    TG.labels();
    labels[id] = String(text || '').slice(0, 20) || defaultLabel(id);
    try { localStorage.setItem(KEY, JSON.stringify(labels)); } catch (e) {}
    return labels;
  };

  function defaultLabel(id) {
    const c = TG.COLOURS.find(x => x.id === id);
    return c ? c.label : id;
  }

  TG.resetLabels = function () {
    labels = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
    return TG.labels();
  };

  TG.colour = function (id) {
    const c = TG.COLOURS.find(x => x.id === id);
    return c ? c.hex : null;
  };
  TG.labelFor = function (id) {
    if (!id) return null;
    return TG.labels()[id] || defaultLabel(id);
  };

  /** Set or clear a player's tag. */
  TG.set = function (player, colourId) {
    if (!colourId || colourId === 'none') delete player.tag;
    else player.tag = colourId;
    return player.tag || null;
  };

  /** All tagged players in a squad, grouped by colour. */
  TG.group = function (players) {
    const out = {};
    players.forEach(p => {
      if (!p.tag) return;
      (out[p.tag] = out[p.tag] || []).push(p);
    });
    return out;
  };

  FCM.TG = TG;
})(window.FCM = window.FCM || {});
