/* Hall of Fame: elite players inducted on retirement within a save, plus a
   permanent cross-save record of every career the user has completed. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const HOF = {};
  const LEGACY_KEY = 'fcmanager.legacy.v1';

  // ---- In-save hall of fame --------------------------------------------
  /** Is this player's career worth immortalising? */
  HOF.isWorthy = function (p, state) {
    const cr = state.career || {};
    const coached = cr.coached && cr.coached[p.id];
    const peak = coached ? Math.max(coached.peakOvr, p.ovr) : p.ovr;
    // Elite anywhere, or merely very good but ours for a long time.
    if (peak >= 86) return true;
    if (peak >= 82 && coached && coached.seasons >= 3) return true;
    if (coached && coached.seasons >= 6 && peak >= 78) return true;
    return false;
  };

  /** Build the induction record for a retiring player. */
  HOF.induct = function (p, state) {
    const cr = state.career || {};
    const coached = (cr.coached && cr.coached[p.id]) || null;
    const club = FCM.DB.clubById[p.clubId];
    // Every award this player won while the save was running.
    const awards = (state.awards || []).filter(a => a.player === p.id)
      .map(a => ({ label: a.label, season: a.season }));
    const ballon = (state.ballonDor || [])
      .filter(y => y.ranking && y.ranking[0] && y.ranking[0].id === p.id)
      .map(y => y.season);
    return {
      id: p.id, name: p.name, full: p.full, nat: p.nat,
      pos: p.pos.join('/'), retiredAt: p.age, season: state.season,
      peakOvr: coached ? Math.max(coached.peakOvr, p.ovr) : p.ovr,
      careerApps: p.careerApps, careerGoals: p.careerGoals,
      lastClub: club ? club.name : 'Free agent',
      wasOurs: !!coached,
      seasonsWithUs: coached ? coached.seasons : 0,
      bestSeason: coached ? coached.bestSeason : null,
      awards: awards, ballonDors: ballon,
      isNewgen: !!p.isNewgen
    };
  };

  HOF.add = function (state, entry) {
    state.hallOfFame = state.hallOfFame || [];
    state.hallOfFame.unshift(entry);
    if (state.hallOfFame.length > 200) state.hallOfFame.length = 200;
    return entry;
  };

  /** Sorted for display: our own players first, then by peak rating. */
  HOF.ranked = function (state) {
    const list = (state.hallOfFame || []).slice();
    return U.sortBy(list, e => e.peakOvr + (e.wasOurs ? 6 : 0) +
      e.ballonDors.length * 4 + e.awards.length, true);
  };

  // ---- Cross-save legacy -----------------------------------------------
  /**
   * A permanent record of finished careers, kept outside any single save so
   * it survives starting again.
   */
  HOF.legacy = function () {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return (parsed && parsed.careers) ? parsed : { careers: [] };
    } catch (e) { return { careers: [] }; }
  };

  HOF.saveLegacy = function (data) {
    try { localStorage.setItem(LEGACY_KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  };

  /** Write the finished career into the permanent record. */
  HOF.retireCareer = function (state, reason) {
    const cr = FCM.CR.ensure(state);
    const club = FCM.DB.clubById[state.userClubId];
    const legacy = HOF.legacy();
    const entry = {
      manager: state.managerName,
      finishedSeason: state.season,
      startedSeason: state.startYear,
      seasons: Math.max(1, state.season - state.startYear),
      difficulty: state.difficulty,
      lastClub: club ? club.name : '',
      reason: reason || 'retired',
      games: cr.games, wins: cr.wins, draws: cr.draws, losses: cr.losses,
      trophies: cr.trophies.map(t => ({ comp: t.comp, season: t.season, kind: t.kind })),
      trophyCount: cr.trophies.length,
      nations: (cr.nationJobs || []).map(j => j.nation),
      biggestWin: cr.biggestWin,
      longestUnbeaten: cr.longestUnbeaten,
      reputation: Math.round(FCM.CR.managerReputation(state)),
      ballonDors: (cr.ballonDors || []).length,
      // Carry the very best players forward so the legacy screen has faces.
      legends: HOF.ranked(state).slice(0, 5).map(e => ({
        name: e.full || e.name, peakOvr: e.peakOvr, pos: e.pos,
        goals: e.careerGoals, apps: e.careerApps
      })),
      faCountry: cr.faRole ? cr.faRole.country : null,
      finishedAt: Date.now(),
      version: FCM.VERSION
    };
    legacy.careers.unshift(entry);
    if (legacy.careers.length > 50) legacy.careers.length = 50;
    HOF.saveLegacy(legacy);
    return entry;
  };

  /** Aggregate totals across every completed career. */
  HOF.legacyTotals = function () {
    const legacy = HOF.legacy();
    const t = { careers: legacy.careers.length, games: 0, wins: 0, trophies: 0,
      seasons: 0, ballonDors: 0, bestCareer: null };
    legacy.careers.forEach(c => {
      t.games += c.games || 0;
      t.wins += c.wins || 0;
      t.trophies += c.trophyCount || 0;
      t.seasons += c.seasons || 0;
      t.ballonDors += c.ballonDors || 0;
      if (!t.bestCareer || (c.trophyCount || 0) > (t.bestCareer.trophyCount || 0)) {
        t.bestCareer = c;
      }
    });
    return t;
  };

  HOF.clearLegacy = function () {
    try { localStorage.removeItem(LEGACY_KEY); return true; } catch (e) { return false; }
  };

  FCM.HOF = HOF;
})(window.FCM = window.FCM || {});
