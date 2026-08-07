/* The rest of the managerial world, and the rivalries that grow out of it.

   Every other club was previously run by nobody: jobs opened at random and
   the side that knocked you out of the cup had no face. Each club now has a
   named manager with a style, a reputation and a board of his own - so the
   coach who keeps beating you gets poached, and the job you want opens
   because somebody actually lost theirs.

   The same machinery grows grudges. The hard-coded derby list only knows
   about the Manchester derby and the Old Firm; a rivalry you actually lived
   through - four cup exits to the same club, a 6-0 humiliation, a player
   sold to them - should count for just as much. */
(function (FCM) {
  'use strict';

  const U = FCM.U;
  const MG = {};

  /** Tactical identities, which shape how their sides set up. */
  MG.STYLES = {
    gegenpress: { id: 'gegenpress', label: 'High press',
      tactics: { pressing: 5, defLine: 4, tempo: 4 } },
    possession: { id: 'possession', label: 'Possession',
      tactics: { passing: 5, tempo: 2, width: 4 } },
    counter: { id: 'counter', label: 'Counter-attack',
      tactics: { pressing: 2, defLine: 2, tempo: 5, passing: 2 } },
    pragmatic: { id: 'pragmatic', label: 'Pragmatic',
      tactics: { pressing: 3, defLine: 3, tempo: 3 } },
    defensive: { id: 'defensive', label: 'Defensive',
      tactics: { pressing: 2, defLine: 2, width: 2 } }
  };
  const STYLE_IDS = Object.keys(MG.STYLES);

  /** Every club needs someone in the dugout. Built once per save. */
  MG.populate = function (state, rng, usedNames) {
    if (!state.managers) state.managers = {};
    FCM.DB.clubs.forEach(club => {
      if (club.id === state.userClubId) return;
      if (state.managers[club.id]) return;
      state.managers[club.id] = MG.create(club, rng, usedNames);
    });
  };

  MG.create = function (club, rng, usedNames) {
    const league = FCM.DB.leagueOf(club);
    const nat = FCM.Names.pickNationality(rng, league ? league.country : null, 0.62);
    const nm = FCM.Names.generate(rng, nat, usedNames);
    // Reputation tracks the club he is at, with room to be over- or
    // under-employed - which is what makes the job market interesting.
    const rep = U.clamp(Math.round(rng.normalClamped(club.rep, 11, 5, 99)), 5, 99);
    return {
      name: nm.full, nat: nat,
      style: rng.pick(STYLE_IDS),
      rep: rep,
      since: null,          // set on appointment
      confidence: 65,
      games: 0, wins: 0, draws: 0, losses: 0,
      trophies: 0
    };
  };

  MG.at = function (state, clubId) {
    return (state.managers || {})[clubId] || null;
  };

  /** Record a result for whoever is in charge of that club. */
  MG.recordResult = function (state, clubId, outcome) {
    const m = MG.at(state, clubId);
    if (!m) return;
    m.games++;
    if (outcome > 0) { m.wins++; m.confidence = U.clamp(m.confidence + 4, 0, 100); }
    else if (outcome === 0) { m.draws++; m.confidence = U.clamp(m.confidence + 0.5, 0, 100); }
    else { m.losses++; m.confidence = U.clamp(m.confidence - 5, 0, 100); }
  };

  /**
   * End-of-season churn: the worst performers lose their jobs and the best
   * get poached upward. Returns a list of {club, out, in, reason} for news.
   */
  MG.seasonChurn = function (state, rng) {
    const moves = [];
    const openings = [];

    FCM.DB.clubs.forEach(club => {
      if (club.id === state.userClubId) return;
      const m = MG.at(state, club.id);
      if (!m || m.games < 10) return;
      const winRate = m.wins / Math.max(1, m.games);
      // Sacked for a bad season, weighted by how demanding the club is.
      const bar = 0.28 + (club.rep / 100) * 0.22;
      if (winRate < bar && rng.chance(0.55)) {
        openings.push({ club: club, out: m, reason: 'sacked' });
      }
    });

    // The successful ones move up into whatever has come free.
    const risers = U.sortBy(
      FCM.DB.clubs.filter(c => {
        if (c.id === state.userClubId) return false;
        const m = MG.at(state, c.id);
        return m && m.games >= 10 && (m.wins / m.games) > 0.6;
      }),
      c => MG.at(state, c.id).wins / MG.at(state, c.id).games, true);

    openings.forEach(op => {
      // A bigger club poaches from a smaller one; otherwise promote from
      // the pool of unattached coaches.
      const poach = risers.find(c => c.rep < op.club.rep - 4 &&
        !moves.some(mv => mv.from === c.id));
      let incoming;
      if (poach && rng.chance(0.55)) {
        incoming = MG.at(state, poach.id);
        state.managers[poach.id] = MG.create(poach, rng, FCM.G._usedNames);
        moves.push({ from: poach.id });
        op.poachedFrom = poach;
      } else {
        incoming = MG.create(op.club, rng, FCM.G._usedNames);
      }
      incoming.since = state.season;
      incoming.confidence = 65;
      incoming.games = 0; incoming.wins = 0; incoming.draws = 0; incoming.losses = 0;
      state.managers[op.club.id] = incoming;
      moves.push({ club: op.club, out: op.out, in: incoming,
        reason: op.reason, poachedFrom: op.poachedFrom || null });
    });

    // Everyone's season record resets for the new campaign.
    Object.keys(state.managers).forEach(id => {
      const m = state.managers[id];
      m.games = 0; m.wins = 0; m.draws = 0; m.losses = 0;
    });
    return moves.filter(mv => mv.club);
  };

  // ---- Grudges ---------------------------------------------------------
  /**
   * A rivalry earned in play. Heat accumulates from meetings that actually
   * meant something and decays slowly, so a grudge fades if you stop
   * playing them.
   */
  MG.HEAT_DERBY = 55;      // heat at which a fixture counts as a derby

  function grudgeKey(a, b) { return Math.min(a, b) + ':' + Math.max(a, b); }

  MG.grudge = function (state, a, b) {
    return (state.grudges || {})[grudgeKey(a, b)] || 0;
  };

  MG.addHeat = function (state, a, b, amount, reason) {
    if (!state.grudges) state.grudges = {};
    const k = grudgeKey(a, b);
    state.grudges[k] = U.clamp((state.grudges[k] || 0) + amount, 0, 100);
    if (!state.grudgeLog) state.grudgeLog = {};
    if (reason) {
      const log = state.grudgeLog[k] = state.grudgeLog[k] || [];
      log.unshift({ season: state.season, day: state.day, reason: reason });
      if (log.length > 8) log.length = 8;
    }
    return state.grudges[k];
  };

  /**
   * How much bad blood a match generates. A routine league win is nothing;
   * a cup knockout, a thrashing or a late winner is what people remember.
   */
  MG.heatFromMatch = function (fixture, homeGoals, awayGoals) {
    const margin = Math.abs(homeGoals - awayGoals);
    let heat = 3;
    let reason = null;
    const cup = fixture.comp && (fixture.comp.indexOf('cup:') === 0 ||
      fixture.comp.indexOf('euro:') === 0);
    if (cup) { heat += 9; reason = 'knockout meeting'; }
    if (margin >= 4) { heat += 12; reason = 'a ' + homeGoals + '–' + awayGoals + ' hammering'; }
    else if (margin >= 3) { heat += 6; reason = 'a heavy defeat'; }
    if (homeGoals === awayGoals && cup) { heat += 4; reason = 'a tie that would not die'; }
    return { heat: heat, reason: reason || 'another meeting' };
  };

  /** Rivals earned in play, hottest first. */
  MG.grudgesOf = function (state, clubId) {
    const out = [];
    Object.keys(state.grudges || {}).forEach(k => {
      const parts = k.split(':').map(Number);
      if (parts.indexOf(clubId) < 0) return;
      const other = parts[0] === clubId ? parts[1] : parts[0];
      out.push({ club: FCM.DB.clubById[other], heat: state.grudges[k],
        log: (state.grudgeLog || {})[k] || [] });
    });
    return U.sortBy(out.filter(x => x.club), x => x.heat, true);
  };

  /** Grudges cool if the fixture stops mattering. */
  MG.decay = function (state) {
    if (!state.grudges) return;
    Object.keys(state.grudges).forEach(k => {
      state.grudges[k] = Math.max(0, state.grudges[k] - 6);
      if (state.grudges[k] <= 0) {
        delete state.grudges[k];
        if (state.grudgeLog) delete state.grudgeLog[k];
      }
    });
  };

  FCM.MG = MG;
})(window.FCM = window.FCM || {});
