/* Awards, records, rivalries and season objectives - the narrative layer. */
(function (FCM) {
  'use strict';

  const U = FCM.U;
  const AW = {};

  // ---- Rivalries ------------------------------------------------------
  /** Derby pairings. Matches between these carry extra weight. */
  AW.RIVALRIES = [
    ['Manchester United', 'Manchester City'], ['Liverpool', 'Everton'],
    ['Arsenal', 'Tottenham Hotspur'], ['Liverpool', 'Manchester United'],
    ['Arsenal', 'Chelsea'], ['Chelsea', 'Tottenham Hotspur'],
    ['Newcastle United', 'Sunderland'], ['Aston Villa', 'Birmingham City'],
    ['Real Madrid', 'FC Barcelona'], ['Real Madrid', 'Atlético Madrid'],
    ['Sevilla FC', 'Real Betis Balompié'], ['Athletic Club', 'Real Sociedad'],
    ['Inter', 'AC Milan'], ['Roma', 'Lazio'], ['Juventus', 'Inter'],
    ['Napoli', 'Roma'], ['Juventus', 'Torino'],
    ['Borussia Dortmund', 'FC Schalke 04'], ['FC Bayern München', 'Borussia Dortmund'],
    ['Hamburger SV', 'SV Werder Bremen'], ['1. FC Köln', 'Borussia Mönchengladbach'],
    ['Paris Saint-Germain', 'Olympique de Marseille'],
    ['Olympique Lyonnais', 'AS Saint-Étienne'],
    ['Celtic', 'Rangers FC'], ['Ajax', 'Feyenoord'], ['PSV', 'Ajax'],
    ['SL Benfica', 'FC Porto'], ['SL Benfica', 'Sporting CP'],
    ['Galatasaray SK', 'Fenerbahçe SK'], ['Club Brugge KV', 'RSC Anderlecht']
  ];

  let rivalIndex = null;
  function buildRivalIndex() {
    rivalIndex = {};
    AW.RIVALRIES.forEach(pair => {
      const a = FCM.DB.clubs.find(c => c.name === pair[0]);
      const b = FCM.DB.clubs.find(c => c.name === pair[1]);
      if (!a || !b) return;
      (rivalIndex[a.id] = rivalIndex[a.id] || []).push(b.id);
      (rivalIndex[b.id] = rivalIndex[b.id] || []).push(a.id);
    });
  }
  AW.resetRivals = function () { rivalIndex = null; };

  AW.rivalsOf = function (clubId) {
    if (!rivalIndex) buildRivalIndex();
    return rivalIndex[clubId] || [];
  };
  /**
   * A derby is either a historic rivalry or one earned in this save. The
   * hard-coded list only knows about the Manchester derby and the Old Firm;
   * four cup exits to the same club should count for just as much.
   */
  AW.isDerby = function (aId, bId, state) {
    if (AW.rivalsOf(aId).indexOf(bId) >= 0) return true;
    const s = state || (FCM.G && FCM.G.state);
    if (!s || !FCM.MG) return false;
    return FCM.MG.grudge(s, aId, bId) >= FCM.MG.HEAT_DERBY;
  };

  // ---- Player of the Month --------------------------------------------
  /**
   * Best performer in a league across the last `days`. Scored on ratings,
   * goals and assists.
   */
  AW.playerOfTheMonth = function (leagueId, sinceDay, state) {
    const clubs = FCM.DB.clubsInLeague(leagueId);
    let best = null, bestScore = 0;
    clubs.forEach(c => {
      FCM.DB.squadOf(c).forEach(p => {
        const recent = p.monthStats;
        if (!recent || recent.apps < 2) return;
        const score = recent.rating / Math.max(1, recent.apps) * 1.6 +
          recent.goals * 1.5 + recent.assists * 0.9;
        if (score > bestScore) { bestScore = score; best = p; }
      });
    });
    return best;
  };

  /** Reset the rolling monthly tallies. */
  AW.resetMonthly = function () {
    FCM.DB.players.forEach(p => {
      p.monthStats = { apps: 0, goals: 0, assists: 0, rating: 0 };
    });
  };

  AW.recordMonthly = function (player, rating, goals, assists) {
    if (!player.monthStats) player.monthStats = { apps: 0, goals: 0, assists: 0, rating: 0 };
    player.monthStats.apps++;
    player.monthStats.goals += goals;
    player.monthStats.assists += assists;
    player.monthStats.rating += rating;
  };

  // ---- End of season awards -------------------------------------------
  /** Golden Boot, Playmaker, Golden Glove, Player & Young Player of the Season. */
  AW.seasonAwards = function (leagueId) {
    const clubs = FCM.DB.clubsInLeague(leagueId);
    const pool = [];
    clubs.forEach(c => FCM.DB.squadOf(c).forEach(p => { if (p.apps > 0) pool.push(p); }));
    if (!pool.length) return null;

    function top(fn, filter) {
      const list = filter ? pool.filter(filter) : pool;
      return U.sortBy(list, fn, true)[0] || null;
    }
    const golden = top(p => p.goals);
    const playmaker = top(p => p.assists);
    const glove = top(p => p.cleanSheets, p => p.pos[0] === 'GK');
    const pots = top(p => (p.seasonRatings.length ? FCM.P.avgRating(p) : 0) * 1.4 +
      p.goals * 0.35 + p.assists * 0.25, p => p.apps >= 12);
    const young = top(p => (p.seasonRatings.length ? FCM.P.avgRating(p) : 0) * 1.4 +
      p.goals * 0.35 + p.assists * 0.25, p => p.apps >= 8 && p.age <= 21);

    return {
      goldenBoot: golden, playmaker: playmaker, goldenGlove: glove,
      playerOfSeason: pots, youngPlayer: young
    };
  };

  /** Best XI of the season for a league, by average rating in each slot. */
  AW.teamOfTheSeason = function (leagueId) {
    const clubs = FCM.DB.clubsInLeague(leagueId);
    const pool = [];
    clubs.forEach(c => FCM.DB.squadOf(c).forEach(p => {
      if (p.apps >= 10) pool.push(p);
    }));
    if (pool.length < 11) return null;
    const shape = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CAM', 'LW', 'ST', 'RW'];
    const taken = {};
    const xi = [];
    shape.forEach(pos => {
      // Only genuine keepers go in goal, and outfielders must actually be
      // able to play the role - otherwise the highest-rated forwards would
      // fill every slot on the pitch.
      let cands = pool.filter(p => {
        if (taken[p.id]) return false;
        const isGK = p.pos[0] === 'GK';
        if ((pos === 'GK') !== isGK) return false;
        if (pos !== 'GK' && FCM.P.familiarity(p, pos) < 0.85) return false;
        return true;
      });
      // Fall back to a looser fit rather than leaving the slot empty.
      if (!cands.length && pos !== 'GK') {
        cands = pool.filter(p => !taken[p.id] && p.pos[0] !== 'GK' &&
          FCM.P.familiarity(p, pos) >= 0.7);
      }
      cands = U.sortBy(cands, p => FCM.P.avgRating(p) * 10 +
        p.goals * 0.4 + p.assists * 0.25 + FCM.P.overallAt(p, pos) * 0.15, true);
      const pick = cands[0];
      if (pick) { taken[pick.id] = 1; xi.push({ pos: pos, player: pick }); }
    });
    return xi;
  };

  // ---- Club records ----------------------------------------------------
  AW.blankRecords = function () {
    return {
      biggestWin: null, worstDefeat: null,
      longestUnbeaten: 0, currentUnbeaten: 0,
      longestWinStreak: 0, currentWinStreak: 0,
      mostGoalsPlayer: null, appearanceLeader: null,
      recordSigning: null, recordSale: null,
      honours: []
    };
  };

  /** Fold a result into the user's club records. */
  AW.recordResult = function (state, fixture, res) {
    const rec = state.records = state.records || AW.blankRecords();
    const isHome = fixture.home === state.userClubId;
    const us = isHome ? res.homeGoals : res.awayGoals;
    const them = isHome ? res.awayGoals : res.homeGoals;
    const oppId = isHome ? fixture.away : fixture.home;
    const opp = FCM.DB.clubById[oppId];
    const margin = us - them;
    const entry = { us: us, them: them, opp: opp ? opp.name : '?',
      day: fixture.day, season: state.season, comp: fixture.compName };

    if (margin > 0) {
      if (!rec.biggestWin || margin > (rec.biggestWin.us - rec.biggestWin.them)) {
        rec.biggestWin = entry;
      }
      rec.currentWinStreak++;
      rec.currentUnbeaten++;
    } else if (margin === 0) {
      rec.currentWinStreak = 0;
      rec.currentUnbeaten++;
    } else {
      if (!rec.worstDefeat || margin < (rec.worstDefeat.us - rec.worstDefeat.them)) {
        rec.worstDefeat = entry;
      }
      rec.currentWinStreak = 0;
      rec.currentUnbeaten = 0;
    }
    rec.longestWinStreak = Math.max(rec.longestWinStreak, rec.currentWinStreak);
    rec.longestUnbeaten = Math.max(rec.longestUnbeaten, rec.currentUnbeaten);
    return rec;
  };

  // ---- Season objectives ----------------------------------------------
  /**
   * Concrete goals the board sets, each with a cash/confidence reward.
   * Generated at the start of every season.
   */
  AW.generateObjectives = function (state, club, league) {
    const target = state.board.targetPos || 10;
    // Name the prize the division actually offers.
    const slots = FCM.G.EURO_SLOTS[league.id];
    let prize = '';
    if (league.tier > 1 && target <= 3) prize = ' (automatic promotion)';
    else if (league.tier > 1 && target <= 7) prize = ' (play-off place)';
    else if (slots && target <= slots[0]) prize = ' (Champions League)';
    else if (slots && target <= slots[0] + slots[1] + slots[2]) prize = ' (European qualification)';

    const objectives = [
      { id: 'league', label: 'Finish ' + U.ordinal(target) + ' or better in ' +
          FCM.G.leagueWithArticle(league) + prize,
        kind: 'position', value: target, reward: 12, cash: Math.round(club.revenue * 0.05),
        done: false, failed: false }
    ];
    const cup = state.competitions['cup:' + league.country];
    if (cup) {
      const round = target <= 4 ? 'win' : 'reach';
      objectives.push({
        id: 'cup', kind: 'cup', comp: cup.id,
        label: (round === 'win' ? 'Win the ' : 'Reach the semi-finals of the ') + cup.name,
        value: round === 'win' ? 1 : 4, reward: 10,
        cash: Math.round(club.revenue * 0.03), done: false, failed: false
      });
    }
    objectives.push({
      id: 'youth', kind: 'youth',
      label: 'Give a first-team debut to an academy graduate',
      value: 1, reward: 6, cash: 0, done: false, failed: false
    });
    if (club.rep < 75) {
      objectives.push({
        id: 'finance', kind: 'finance',
        label: 'Finish the season without running a loss',
        value: 0, reward: 8, cash: 0, done: false, failed: false
      });
    }
    return objectives;
  };

  /** Check objectives that can complete mid-season. */
  AW.checkObjectives = function (state) {
    const completed = [];
    (state.objectives || []).forEach(o => {
      if (o.done || o.failed) return;
      if (o.kind === 'youth') {
        const club = FCM.DB.clubById[state.userClubId];
        const debut = FCM.DB.squadOf(club).some(p =>
          p.isNewgen && p.promotedOn !== null && p.promotedOn !== undefined && p.apps > 0);
        if (debut) { o.done = true; completed.push(o); }
      } else if (o.kind === 'cup') {
        const comp = state.competitions[o.comp];
        if (comp && comp.winner === state.userClubId) { o.done = true; completed.push(o); }
      }
    });
    return completed;
  };

  FCM.AW = AW;
})(window.FCM = window.FCM || {});
