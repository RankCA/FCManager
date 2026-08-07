/* Fixture congestion: what a crowded calendar actually costs you.

   Squad quality decided everything before this - a first XI that never
   rotated was simply the best XI, every week, all season. Playing three
   games in eight days now drains legs, raises the injury risk and quietly
   lowers what a tired player is worth on the pitch, so depth is tested
   rather than just talent. */
(function (FCM) {
  'use strict';

  const U = FCM.U;
  const CG = {};

  /** Window we judge a schedule over, and what counts as heavy in it. */
  CG.WINDOW = 14;
  CG.HEAVY = 4;      // four games a fortnight is a hard run
  CG.SEVERE = 5;

  // Scanning all ~7,600 fixtures per player per match was quadratic and
  // brought the simulation to a halt. One pass per day, cached for every
  // club at once.
  let cache = null, cacheDay = -1;

  function build(day) {
    const from = day - CG.WINDOW, to = day + CG.WINDOW;
    const out = {};
    function bucket(id) {
      return out[id] || (out[id] = { recent: 0, upcoming: 0 });
    }
    FCM.G.allFixtures().forEach(f => {
      if (f.day === null || f.day === undefined) return;
      if (f.played) {
        if (f.day <= from || f.day > day) return;
        bucket(f.home).recent++; bucket(f.away).recent++;
      } else {
        if (f.day <= day || f.day > to) return;
        bucket(f.home).upcoming++; bucket(f.away).upcoming++;
      }
    });
    cache = out; cacheDay = day;
  }

  /** Drop the cache when fixtures move under us. */
  CG.invalidate = function () { cacheDay = -1; };

  /**
   * Games a club has played in the last `WINDOW` days, plus what is still
   * to come in the next one. A run reads as congested from both ends.
   */
  CG.load = function (state, clubId, day) {
    if (cacheDay !== day) build(day);
    return cache[clubId] || { recent: 0, upcoming: 0 };
  };

  /**
   * A single number for how hard the schedule is right now, 0-1. Driven by
   * games already in the legs, with what is coming adding a little.
   */
  CG.pressure = function (state, clubId, day) {
    const l = CG.load(state, clubId, day);
    const score = l.recent + l.upcoming * 0.35;
    return U.clamp((score - 2) / 4.5, 0, 1);
  };

  CG.label = function (p) {
    if (p >= 0.72) return { text: 'Brutal', cls: 'pill-bad' };
    if (p >= 0.45) return { text: 'Congested', cls: 'pill-warn' };
    if (p >= 0.2) return { text: 'Busy', cls: 'pill-pos' };
    return { text: 'Comfortable', cls: 'pill-good' };
  };

  /**
   * Extra fitness cost multiplier for a match played under congestion.
   * A fresh week is neutral; a brutal run takes half as much again.
   */
  CG.fatigueMultiplier = function (pressure) {
    return 1 + pressure * 0.5;
  };

  /**
   * How much more likely an injury is. Tired players get hurt - this is the
   * main reason to rotate rather than a soft nudge.
   */
  CG.injuryMultiplier = function (pressure) {
    return 1 + pressure * 1.1;
  };

  /**
   * A player short of rest is worth less than his rating suggests. Applied
   * on top of the existing fitness effect, so back-to-back games on a
   * knackered starter genuinely hurt the team.
   */
  CG.sharpness = function (player, pressure) {
    const fit = (player.fitness === undefined ? 100 : player.fitness) / 100;
    const tired = U.clamp((0.82 - fit) / 0.5, 0, 1);
    return 1 - tired * pressure * 0.12;
  };

  /**
   * Rotation check: how much of the XI also started the last match. Naming
   * the same eleven through a congested run is what the system punishes.
   */
  CG.rotationAdvice = function (state, club, tactics) {
    const p = CG.pressure(state, club.id, state.day);
    if (p < 0.35) return null;
    const xi = (tactics.lineup || []).map(id => FCM.DB.byId[id]).filter(Boolean);
    if (!xi.length) return null;
    const tired = xi.filter(pl => pl.fitness < 78);
    if (!tired.length) return null;
    return {
      pressure: p,
      tired: tired,
      text: tired.length + ' of your XI are under 78% fit in a ' +
        CG.label(p).text.toLowerCase() + ' run. Rotating would cost you less ' +
        'than the injuries will.'
    };
  };

  FCM.CG = CG;
})(window.FCM = window.FCM || {});
