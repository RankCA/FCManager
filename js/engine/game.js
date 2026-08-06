/* Game state, season setup, calendar advance and save/load. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P, T = FCM.T, M = FCM.M, C = FCM.C, TR = FCM.TR, Y = FCM.Y;
  const G = {};

  G.state = null;

  // Countries that get a domestic cup, with their league tiers.
  G.CUP_COUNTRIES = [
    { country: 'England', name: 'FA Cup', leagues: [13, 14, 60, 61] },
    { country: 'Spain', name: 'Copa del Rey', leagues: [53, 54] },
    { country: 'Italy', name: 'Coppa Italia', leagues: [31, 32] },
    { country: 'Germany', name: 'DFB-Pokal', leagues: [19, 20] },
    { country: 'France', name: 'Coupe de France', leagues: [16, 17] },
    { country: 'Portugal', name: 'Taça de Portugal', leagues: [308] },
    { country: 'Netherlands', name: 'KNVB Beker', leagues: [10] },
    { country: 'Scotland', name: 'Scottish Cup', leagues: [50] },
    { country: 'Belgium', name: 'Belgian Cup', leagues: [4] },
    { country: 'Turkey', name: 'Türkiye Kupası', leagues: [68] }
  ];

  // European qualification slots per league (Champions/Europa/Conference).
  G.EURO_SLOTS = {
    13: [4, 2, 1], 53: [4, 2, 1], 31: [4, 2, 1], 19: [4, 2, 1], 16: [3, 1, 1],
    308: [2, 1, 1], 10: [2, 1, 1], 4: [1, 1, 1], 68: [1, 1, 1], 50: [1, 1, 1],
    189: [1, 1, 1], 80: [1, 1, 1], 1: [1, 1, 1], 66: [1, 0, 1]
  };

  // ---- New game ----------------------------------------------------
  G.newGame = function (opts) {
    const seed = opts.seed || Math.floor(Math.random() * 1e9);
    const rng = new FCM.RNG(seed);
    const startYear = opts.startYear || 2025;

    FCM.DB.build(rng, startYear);

    const s = {
      version: 2,
      seed: seed,
      startYear: startYear,
      season: startYear,
      day: 5,
      difficulty: opts.difficulty || 'normal',
      daysInJob: 0,
      sacked: false,
      managerName: opts.managerName || 'The Gaffer',
      userClubId: opts.clubId,
      ledger: FCM.F.blankLedger(),
      ticketPrice: 32,
      stadiumProject: null,
      trophyCount: 0,
      competitions: {},
      inbox: [],
      transfers: [],
      history: [],
      seasonLog: [],
      tactics: {},
      shortlist: [],
      usedNames: [],
      board: { confidence: 70, expectation: null },
      scouting: { missions: [], found: [] },
      trainingFocus: 'balanced',
      staff: null,
      records: FCM.AW.blankRecords(),
      career: FCM.CR.blank(),
      internationals: [],
      ballonDor: [],
      activeTournaments: [],
      qualifying: [],
      hallOfFame: [],
      seekingJob: false,
      objectives: [],
      awards: [],
      monthDay: 0,
      finances: { wagesPaid: 0, transferSpend: 0, transferIncome: 0, matchdayIncome: 0 },
      // autoLineup stays on until the manager picks a side themselves.
      settings: { autoSubs: true, autoLineup: true },
      unreadCount: 0
    };
    G.state = s;
    G.rng = rng;
    G._usedNames = new Set();

    // Default tactics for every club.
    FCM.DB.clubs.forEach(c => {
      s.tactics[c.id] = G.autoTactics(c);
    });

    // Every club begins with a handful of academy kids already on the books.
    FCM.DB.clubs.forEach(c => {
      const league = FCM.DB.leagueOf(c);
      const kids = Y.startingIntake(c, rng, startYear, G._usedNames,
        league ? league.country : null);
      c.youth = [];
      kids.forEach(p => {
        FCM.DB.byId[p.id] = p;
        FCM.DB.players.push(p);
        c.youth.push(p.id);
      });
    });

    // Every nation needs a legal squad, whether or not its players happen to
    // play in one of the 22 leagues we model.
    FCM.NT.fillPools(rng, startYear, G._usedNames);

    // Difficulty shapes the budget you inherit.
    const level = FCM.D.get(s.difficulty);
    FCM.D.applyBudgets(FCM.DB.clubById[s.userClubId], level);
    s.ticketPrice = Math.round(14 + FCM.DB.clubById[s.userClubId].rep * 0.42);

    FCM.AW.resetRivals();
    FCM.AW.resetMonthly();
    s.staff = FCM.TN.initStaff(FCM.DB.clubById[s.userClubId]);

    G.setupSeason(true);
    G.startQualifying();
    G.setBoardExpectation();
    s.objectives = FCM.AW.generateObjectives(s, FCM.DB.clubById[s.userClubId],
      FCM.DB.leagueOf(FCM.DB.clubById[s.userClubId]));
    G.news('Welcome to ' + FCM.DB.clubById[s.userClubId].name,
      'The board has appointed you as manager. ' + G.state.board.expectation +
      ' (' + level.label + ' difficulty)', 'board');
    return s;
  };

  G.autoTactics = function (club) {
    const squad = FCM.DB.squadOf(club);
    const t = T.defaultTactics();
    // Pick a formation that suits the squad's shape.
    const wingers = squad.filter(p => ['LW', 'RW', 'LM', 'RM'].indexOf(p.pos[0]) >= 0).length;
    const strikers = squad.filter(p => ['ST', 'CF'].indexOf(p.pos[0]) >= 0).length;
    if (wingers >= 4 && strikers <= 3) t.formation = '4-3-3';
    else if (strikers >= 4) t.formation = '4-4-2';
    else t.formation = '4-2-3-1';
    const pick = T.autoPick(squad, t.formation);
    t.lineup = pick.lineup; t.subs = pick.subs;
    T.validate(t, squad);
    return t;
  };

  // ---- Season setup -------------------------------------------------
  G.setupSeason = function (isFirst) {
    const s = G.state;
    const rng = G.rng;
    s.competitions = {};

    // --- Leagues ---
    FCM.DB.leagues.forEach(l => {
      const clubs = FCM.DB.clubsInLeague(l.id).map(c => c.id);
      if (clubs.length < 4) return;
      const comp = C.createLeague(l, clubs, s.season, rng);
      s.competitions[comp.id] = comp;
    });

    // --- Domestic cups ---
    const cupDates = [70, 110, 145, 180, 215, 245, 275, 320];
    G.CUP_COUNTRIES.forEach(cfg => {
      const entrants = [];
      cfg.leagues.forEach(lid => {
        FCM.DB.clubsInLeague(lid).forEach(c => entrants.push(c.id));
      });
      if (entrants.length < 8) return;
      const id = 'cup:' + cfg.country;
      // Enough rounds to go from `entrants` down to a winner.
      const roundCount = Math.ceil(Math.log2(entrants.length));
      const dates = cupDates.slice(-roundCount);
      const cup = C.createCup({ id: id, name: cfg.name, country: cfg.country, dates: dates },
        entrants, s.season, rng);
      s.competitions[id] = cup;
    });

    // --- English League Cup ---
    const eflClubs = [];
    [13, 14, 60, 61].forEach(lid => FCM.DB.clubsInLeague(lid).forEach(c => eflClubs.push(c.id)));
    if (eflClubs.length >= 8) {
      const lcDates = [55, 85, 120, 160, 200, 240, 300];
      const rounds = Math.ceil(Math.log2(eflClubs.length));
      s.competitions['cup:EFL'] = C.createCup(
        { id: 'cup:EFL', name: 'League Cup', country: 'England', dates: lcDates.slice(-rounds) },
        eflClubs, s.season, rng);
    }

    // --- Continental ---
    G.setupContinental(isFirst);

    // Cups and Europe are drawn independently of the league calendar, so
    // shift any fixture that would have a club playing twice in a day.
    G.resolveClashes();
    G.reindexFixtures();
  };

  /**
   * Push clashing cup/continental fixtures onto a nearby free day.
   * League fixtures are fixed and take priority.
   */
  G.resolveClashes = function () {
    const busy = {};
    function mark(day, f) {
      const set = busy[day] = busy[day] || {};
      set[f.home] = 1; set[f.away] = 1;
    }
    function free(day, f) {
      const set = busy[day];
      return !set || (!set[f.home] && !set[f.away]);
    }
    const all = G.allFixtures().filter(f => f.day !== null && f.day !== undefined && !f.played);
    const leagues = all.filter(f => f.comp.indexOf('league:') === 0);
    const others = all.filter(f => f.comp.indexOf('league:') !== 0);

    leagues.forEach(f => mark(f.day, f));
    others.forEach(f => {
      if (!free(f.day, f)) {
        let found = null;
        for (let off = 1; off <= 12 && found === null; off++) {
          if (f.day + off <= C.SEASON_END + 20 && free(f.day + off, f)) found = f.day + off;
          else if (f.day - off > C.SEASON_START - 10 && free(f.day - off, f)) found = f.day - off;
        }
        if (found !== null) f.day = found;
      }
      mark(f.day, f);
    });
  };

  /** Work out European qualifiers from last season's tables (or current strength). */
  G.qualifiers = function () {
    const s = G.state;
    const ucl = [], uel = [], uecl = [];
    for (const lid in G.EURO_SLOTS) {
      const slots = G.EURO_SLOTS[lid];
      const comp = s.competitions['league:' + lid];
      let order;
      if (s.lastTables && s.lastTables[lid]) {
        order = s.lastTables[lid].slice();
      } else {
        order = U.sortBy(FCM.DB.clubsInLeague(Number(lid)), c => c.rep, true).map(c => c.id);
      }
      let i = 0;
      for (let k = 0; k < slots[0] && i < order.length; k++, i++) ucl.push(order[i]);
      for (let k = 0; k < slots[1] && i < order.length; k++, i++) uel.push(order[i]);
      for (let k = 0; k < slots[2] && i < order.length; k++, i++) uecl.push(order[i]);
    }
    return { ucl: ucl, uel: uel, uecl: uecl };
  };

  G.setupContinental = function () {
    const s = G.state, rng = G.rng;
    const q = G.qualifiers();
    const leagueDates = [78, 99, 120, 141, 169, 190, 211, 232];
    const koDates = { r16: 253, qf: 281, sf: 302, final: 330 };

    [['ucl', 'UEFA Champions League', q.ucl, 36],
     ['uel', 'UEFA Europa League', q.uel, 36],
     ['uecl', 'UEFA Conference League', q.uecl, 36]].forEach(([key, name, list, size]) => {
      let entrants = list.slice(0, size);
      if (entrants.length < 12) return;
      const comp = C.createContinental({
        id: 'euro:' + key, name: name, matchesEach: 8,
        leagueDates: leagueDates, dates: koDates
      }, entrants, s.season, rng);
      comp.koDates = koDates;
      s.competitions[comp.id] = comp;
    });
  };

  G.reindexFixtures = function () {
    const s = G.state;
    s.fixturesByDay = {};
    G.allFixtures().forEach(f => {
      if (f.day === null || f.day === undefined) return;
      (s.fixturesByDay[f.day] = s.fixturesByDay[f.day] || []).push(f);
    });
  };

  G.allFixtures = function () {
    const out = [];
    for (const id in G.state.competitions) {
      const c = G.state.competitions[id];
      if (c.fixtures) out.push.apply(out, c.fixtures);
      if (c.leaguePhase) out.push.apply(out, c.leaguePhase.fixtures);
      if (c.knockout) out.push.apply(out, c.knockout.fixtures);
    }
    return out;
  };

  // ---- Board -------------------------------------------------------
  G.setBoardExpectation = function () {
    const s = G.state;
    const club = FCM.DB.clubById[s.userClubId];
    const league = FCM.DB.leagueOf(club);
    const level = FCM.D.get(s.difficulty);
    const peers = U.sortBy(FCM.DB.clubsInLeague(club.league), c => c.rep, true);
    const rank = peers.findIndex(c => c.id === club.id) + 1;
    const n = peers.length;

    if (level.godMode) {
      s.board.expectation = 'The board have handed you the keys. Do whatever you like.';
      s.board.targetPos = n;
      return;
    }

    // Where they'd naturally finish, then shifted by difficulty.
    let target;
    if (rank <= 2) target = 1;
    else if (rank <= 4) target = 4;
    else if (rank <= Math.ceil(n * 0.4)) target = Math.ceil(n * 0.35);
    else if (rank <= Math.ceil(n * 0.7)) target = Math.ceil(n * 0.55);
    else target = n - 3;
    target = U.clamp(target + level.expectOffset, 1, n);

    s.board.expectation = G.expectationText(target, league, n) +
      (s.difficulty === 'nightmare' ? ' They are not a patient board.' : '');
    s.board.targetPos = target;
  };

  /**
   * Phrase the board's target in terms that make sense for the division.
   * Only leagues with actual European places can talk about Europe; below
   * the top tier the goal is promotion or the play-offs.
   */
  /** "the Championship" reads fine; "the League Two" does not. */
  G.leagueWithArticle = function (league) {
    return /^(League |Ligue |Serie |Liga |Primera |Superliga|Ekstraklasa)/.test(league.name)
      ? league.name : 'the ' + league.name;
  };

  G.expectationText = function (target, league, n) {
    const promotionAvailable = league.tier > 1;
    const euroSlots = G.EURO_SLOTS[league.id];
    const uclSlots = euroSlots ? euroSlots[0] : 0;
    const euroTotal = euroSlots ? euroSlots[0] + euroSlots[1] + euroSlots[2] : 0;

    if (target === 1) return 'They expect you to win ' + G.leagueWithArticle(league) + '.';
    if (promotionAvailable) {
      // England runs automatic promotion then a play-off; elsewhere just
      // treat the top places as the promotion picture.
      if (target <= 3) return 'They expect automatic promotion (top ' + target + ').';
      if (target <= 7) return 'They expect a play-off place (top ' + target + ').';
      if (target <= Math.ceil(n * 0.5)) return 'They expect a top-half finish (top ' + target + ').';
      if (target <= Math.ceil(n * 0.75)) return 'They expect a comfortable mid-table finish.';
      return 'They simply expect you to avoid relegation.';
    }
    if (euroTotal > 0) {
      if (target <= uclSlots) return 'They expect Champions League qualification (top ' + target + ').';
      if (target <= euroTotal) return 'They expect you to qualify for Europe (top ' + target + ').';
    } else if (target <= Math.ceil(n * 0.3)) {
      return 'They expect a top-' + target + ' finish.';
    }
    if (target <= Math.ceil(n * 0.5)) return 'They expect a top-half finish (top ' + target + ').';
    if (target <= Math.ceil(n * 0.75)) return 'They expect a comfortable mid-table finish.';
    return 'They simply expect you to avoid relegation.';
  };

  /** Board reaction after each of the user's matches, plus sacking check. */
  G.judgeUserMatch = function (fixture, res) {
    const s = G.state;
    const isHome = fixture.home === s.userClubId;
    const us = isHome ? res.homeGoals : res.awayGoals;
    const them = isHome ? res.awayGoals : res.homeGoals;
    const outcome = us > them ? 1 : (us === them ? 0 : -1);
    let importance = fixture.comp.indexOf('euro:') === 0 ? 1.25
      : (fixture.comp.indexOf('cup:') === 0 ? 0.8 : 1);
    // Talking a game up in the press means the board is watching this one
    // harder. Back it up and you gain more; lose and it costs more.
    if (s.pressBravado) {
      importance *= 1 + Math.min(0.6, s.pressBravado * 0.3);
      s.pressBravado = Math.max(0, s.pressBravado - 1);
    }
    FCM.D.judgeResult(s, outcome, importance);

    if (FCM.D.checkSacking(s)) {
      s.sacked = true;
      G.news('You have been sacked',
        FCM.DB.clubById[s.userClubId].name + ' have terminated your contract with ' +
        'immediate effect. The board ran out of patience.', 'board');
    } else if (FCM.D.underPressure(s) && !s.board.warned) {
      s.board.warned = true;
      G.news('The board are losing patience',
        'Results are not good enough. Board confidence has fallen to ' +
        Math.round(s.board.confidence) + '%. Turn it around quickly.', 'board');
    } else if (!FCM.D.underPressure(s)) {
      s.board.warned = false;
    }
  };

  // ---- News --------------------------------------------------------
  G.news = function (title, body, kind, extra) {
    const item = Object.assign({
      id: 'n' + (G.state.inbox.length + 1) + '_' + G.state.day,
      day: G.state.day, title: title, body: body, kind: kind || 'info', read: false
    }, extra || {});
    G.state.inbox.unshift(item);
    G.state.unreadCount++;
    if (G.state.inbox.length > 250) G.state.inbox.length = 250;
    return item;
  };

  // ---- Day advance --------------------------------------------------
  /**
   * Advance one day. Returns a summary of what happened, including any
   * user match that needs presenting.
   */
  G.advanceDay = function (opts) {
    const s = G.state, rng = G.rng;
    const o = opts || {};
    const result = { day: s.day, userMatch: null, matches: [], events: [] };

    const fixtures = (s.fixturesByDay[s.day] || []).filter(f => !f.played);

    // If the manager wants to watch, hand back a live match and pause the
    // day entirely. The caller drives it, then calls commitLiveMatch().
    if (o.liveForUser && !s._pendingLive) {
      const userFx = fixtures.find(f => f.home === s.userClubId || f.away === s.userClubId);
      if (userFx) {
        const home = FCM.DB.clubById[userFx.home], away = FCM.DB.clubById[userFx.away];
        if (home && away) {
          const hBan = G.suspendedIds(home), aBan = G.suspendedIds(away);
          const hT = G.tacticsFor(home, hBan), aT = G.tacticsFor(away, aBan);
          let imp = userFx.comp.indexOf('euro:') === 0 ? 1.3
            : (userFx.comp.indexOf('cup:') === 0 ? 1.15 : 1);
          if (FCM.AW.isDerby(home.id, away.id)) { imp *= 1.3; userFx.derby = true; }
          const live = M.createMatch(home, away, hT, aT, FCM.DB.byId, {
            rng: rng, importance: imp, neutral: !!userFx.neutral, venue: home.stadium,
            manualSubsFor: s.settings.autoSubs ? null : s.userClubId
          });
          s._pendingLive = { fixture: userFx, home: home, away: away,
            hBan: hBan, aBan: aBan };
          result.liveMatch = live;
          result.liveFixture = userFx;
          return result;   // the day does NOT advance yet
        }
      }
    }

    // Play every fixture scheduled today, across the whole world.
    fixtures.forEach(f => {
      const home = FCM.DB.clubById[f.home], away = FCM.DB.clubById[f.away];
      if (!home || !away) { f.played = true; return; }
      const isUser = home.id === s.userClubId || away.id === s.userClubId;

      const hBan = G.suspendedIds(home), aBan = G.suspendedIds(away);
      const hT = G.tacticsFor(home, hBan), aT = G.tacticsFor(away, aBan);
      let importance = f.comp.indexOf('euro:') === 0 ? 1.3
        : (f.comp.indexOf('cup:') === 0 ? 1.15 : 1);
      // Derbies are played at a different temperature.
      if (FCM.AW.isDerby(home.id, away.id)) { importance *= 1.3; f.derby = true; }

      const res = M.play(home, away, hT, aT, FCM.DB.byId, {
        rng: rng, importance: importance,
        neutral: !!f.neutral, venue: home.stadium
      });

      f.played = true; f.hg = res.homeGoals; f.ag = res.awayGoals;
      // Only the user's matches keep a full result. Retaining events and
      // ratings for all ~7,600 worldwide fixtures would bloat saves to
      // tens of megabytes and blow the localStorage quota.
      if (isUser) f.result = res;
      G.applyMatchOutcome(f, res, home, away);
      // A ban only counts down when your club actually plays a fixture.
      G.serveSuspensions(home, hBan);
      G.serveSuspensions(away, aBan);

      if (isUser) {
        result.userMatch = { fixture: f, result: res };
        G.judgeUserMatch(f, res);
        if (s.sacked) result.sacked = true;
      }
      result.matches.push(f);
    });

    if (fixtures.length) {
      G.progressCups();
      G.reindexFixtures();
    }

    // Daily upkeep.
    G.dailyUpkeep(result);

    s.day++;
    if (s.day > 364) G.endSeason(result);
    return result;
  };

  /**
   * Apply a live match the user just watched, then play out the rest of
   * that day's fixtures and complete the day.
   */
  G.commitLiveMatch = function (live) {
    const s = G.state;
    const pending = s._pendingLive;
    if (!pending) return null;
    s._pendingLive = null;

    const f = pending.fixture;
    const res = live.finish();
    f.played = true; f.hg = res.homeGoals; f.ag = res.awayGoals;
    f.result = res;
    G.applyMatchOutcome(f, res, pending.home, pending.away);
    G.serveSuspensions(pending.home, pending.hBan);
    G.serveSuspensions(pending.away, pending.aBan);
    G.judgeUserMatch(f, res);

    const result = { day: s.day, userMatch: { fixture: f, result: res },
      matches: [f], events: [], sacked: s.sacked };

    // Now the rest of the world plays.
    const rest = (s.fixturesByDay[s.day] || []).filter(x => !x.played);
    rest.forEach(x => {
      const home = FCM.DB.clubById[x.home], away = FCM.DB.clubById[x.away];
      if (!home || !away) { x.played = true; return; }
      const hBan = G.suspendedIds(home), aBan = G.suspendedIds(away);
      const hT = G.tacticsFor(home, hBan), aT = G.tacticsFor(away, aBan);
      let imp = x.comp.indexOf('euro:') === 0 ? 1.3 : (x.comp.indexOf('cup:') === 0 ? 1.15 : 1);
      if (FCM.AW.isDerby(home.id, away.id)) { imp *= 1.3; x.derby = true; }
      const r2 = M.play(home, away, hT, aT, FCM.DB.byId,
        { rng: G.rng, importance: imp, neutral: !!x.neutral, venue: home.stadium });
      x.played = true; x.hg = r2.homeGoals; x.ag = r2.awayGoals;
      G.applyMatchOutcome(x, r2, home, away);
      G.serveSuspensions(home, hBan);
      G.serveSuspensions(away, aBan);
      result.matches.push(x);
    });

    G.progressCups();
    G.reindexFixtures();
    G.dailyUpkeep(result);
    s.day++;
    if (s.day > 364) G.endSeason(result);
    return result;
  };

  G.tacticsFor = function (club, suspended) {
    const s = G.state;
    let t = s.tactics[club.id];
    if (!t) t = s.tactics[club.id] = G.autoTactics(club);
    const squad = FCM.DB.squadOf(club);
    const opts = { suspended: suspended || [] };
    // AI clubs always re-pick. The user's side does too until they pick a
    // line-up by hand, otherwise an un-rotated XI burns out over a season.
    if (club.id !== s.userClubId || s.settings.autoLineup) {
      const pick = T.autoPick(squad, t.formation, opts);
      t.lineup = pick.lineup; t.subs = pick.subs;
    }
    T.validate(t, squad, opts);
    return t;
  };

  /** Ids in this club's squad currently serving a ban. */
  G.suspendedIds = function (club) {
    const out = [];
    FCM.DB.squadOf(club).forEach(p => { if ((p.suspended || 0) > 0) out.push(p.id); });
    return out;
  };

  /** Count down bans for players who sat out this match. */
  G.serveSuspensions = function (club, banned) {
    (banned || []).forEach(id => {
      const p = FCM.DB.byId[id];
      if (p && p.suspended > 0) p.suspended--;
    });
  };

  /** Fold a match result back into players, clubs and finances. */
  G.applyMatchOutcome = function (fixture, res, home, away) {
    const s = G.state;
    if (fixture.home === s.userClubId || fixture.away === s.userClubId) {
      FCM.AW.recordResult(s, fixture, res);
      FCM.CR.recordMatch(s, fixture, res);
    }
    [[res.homeRatings, home, res.awayGoals], [res.awayRatings, away, res.homeGoals]]
      .forEach(([ratings, club, conceded]) => {
        ratings.forEach(r => {
          const p = FCM.DB.byId[r.id];
          if (!p) return;
          p.apps++; p.careerApps++;
          p.minutes += r.mins;
          p.goals += r.goals; p.careerGoals += r.goals;
          p.assists += r.assists;
          if (r.booked) {
            p.yellow++;
            // Every fifth booking earns a one-match ban.
            if (p.yellow % 5 === 0) p.suspended = (p.suspended || 0) + 1;
          }
          if (r.sentOff) {
            p.red++;
            // A second yellow is one match; a straight red is three.
            p.suspended = (p.suspended || 0) + (r.booked ? 1 : 3);
            if (club.id === s.userClubId) {
              G.news(p.name + ' sent off',
                p.name + ' was shown a red card and will serve a ' +
                (r.booked ? 'one' : 'three') + '-match suspension.', 'injury', { player: p.id });
            }
          }
          if (p.pos[0] === 'GK' && conceded === 0 && r.mins > 60) p.cleanSheets++;
          P.applyMatchRating(p, r.rating);
          FCM.AW.recordMonthly(p, r.rating, r.goals, r.assists);
          p.lastMatchDay = s.day;
          p.fitness = U.clamp(p.fitness - r.mins * 0.28, 8, 100);
          const inj = P.rollInjury(p, G.rng, 1);
          if (inj && club.id === s.userClubId) {
            G.news(p.name + ' injured', p.name + ' picked up a ' + inj.name.toLowerCase() +
              ' and will be out for around ' + inj.days + ' days.', 'injury', { player: p.id });
          }
        });
      });

    // Morale follows results.
    const homeWin = res.homeGoals > res.awayGoals, draw = res.homeGoals === res.awayGoals;
    [[home, homeWin ? 1 : (draw ? 0 : -1)], [away, homeWin ? -1 : (draw ? 0 : 1)]]
      .forEach(([club, outcome]) => {
        club.morale = U.clamp(club.morale + outcome * 3, 20, 100);
        FCM.DB.squadOf(club).forEach(p => {
          p.morale = U.clamp(p.morale + outcome * 1.6, 5, 100);
        });
      });

    // Matchday income for the home side.
    const isUserHome = home.id === s.userClubId;
    const price = isUserHome ? (s.ticketPrice || 32) : 32;
    const attendance = FCM.F.attendance(home, price, U.clamp(home.morale / 100, 0, 1));
    const income = FCM.F.matchdayRevenue(attendance, price);
    home.balance += income;
    fixture.attendance = attendance;
    if (isUserHome) {
      s.finances.matchdayIncome += income;
      FCM.F.addIncome(s, 'gate', income);
      // Stewarding, policing and pitch costs scale with the crowd.
      FCM.F.addExpense(s, 'matchday', Math.round(attendance * 4.5));
      home.balance -= Math.round(attendance * 4.5);
    }

    // Appearance and goal bonuses owed by the user's club.
    if (s.userClubId === home.id || s.userClubId === away.id) {
      const ours = s.userClubId === home.id ? res.homeRatings : res.awayRatings;
      let bonuses = 0;
      ours.forEach(r => {
        const p = FCM.DB.byId[r.id];
        if (!p) return;
        if (p.appearanceFee && r.mins > 0) bonuses += p.appearanceFee;
        if (p.goalBonus && r.goals) bonuses += p.goalBonus * r.goals;
      });
      if (bonuses > 0) {
        const club = FCM.DB.clubById[s.userClubId];
        club.balance -= bonuses;
        FCM.F.addExpense(s, 'wages', bonuses);
      }
    }
  };

  /** Resolve knockout ties and draw the next round. */
  G.progressCups = function () {
    const s = G.state, rng = G.rng;
    for (const id in s.competitions) {
      const comp = s.competitions[id];
      if (comp.type !== 'cup' || comp.winner) continue;
      const round = comp.rounds[comp.rounds.length - 1];
      if (!round) continue;
      const done = round.ties.every(t => t.played);
      if (!done) continue;

      round.ties.forEach(t => {
        if (t.winner) return;
        if (t.hg > t.ag) t.winner = t.home;
        else if (t.ag > t.hg) t.winner = t.away;
        else {
          const pens = M.penalties(G.tacticsFor(FCM.DB.clubById[t.home]),
            G.tacticsFor(FCM.DB.clubById[t.away]), FCM.DB.byId, rng);
          t.pens = pens;
          t.winner = pens.home > pens.away ? t.home : t.away;
        }
      });

      const through = C.roundWinners(comp, comp.rounds.length - 1);
      if (through.length <= 1) {
        comp.winner = through[0] || null;
        if (comp.winner) G.onTrophy(comp, comp.winner);
        continue;
      }
      const nextIdx = comp.rounds.length;
      if (nextIdx < comp.dates.length) {
        C.drawRound(comp, through, nextIdx, s.season, rng);
        G.resolveClashes();
      } else {
        comp.winner = through[0];
        if (comp.winner) G.onTrophy(comp, comp.winner);
      }
    }
  };

  G.onTrophy = function (comp, clubId) {
    const s = G.state;
    const club = FCM.DB.clubById[clubId];
    if (!club) return;
    s.history.push({ season: s.season, comp: comp.name, winner: clubId, winnerName: club.name });
    if (clubId === s.userClubId) {
      s.trophyCount = (s.trophyCount || 0) + 1;
      FCM.CR.recordTrophy(s, comp.name, 'club');
      s.board.confidence = U.clamp(s.board.confidence + 14, 0, 100);
      G.news('We won the ' + comp.name + '!',
        'Congratulations - ' + club.name + ' are ' + comp.name + ' champions.', 'trophy');
    }
  };

  // ---- Daily upkeep -------------------------------------------------
  G.dailyUpkeep = function (result) {
    const s = G.state, rng = G.rng;
    const userClub = FCM.DB.clubById[s.userClubId];

    // Recovery + injury countdown for everyone. Recovery must outpace a
    // congested fixture list, or clubs in Europe are permanently drained.
    const focus = FCM.TN.getFocus(s.trainingFocus);
    const physio = FCM.TN.level(s, userClub, 'physio');
    const fitCoach = FCM.TN.level(s, userClub, 'fitness');
    // A good fitness coach and a light training week both speed recovery.
    const userRecovery = (focus.recovery || 1) * (0.88 + fitCoach * 0.055);
    FCM.DB.players.forEach(p => {
      const playedToday = p.lastMatchDay === s.day;
      const mine = p.clubId === s.userClubId;
      const rate = rng.range(9, 14) * (mine ? userRecovery : 1);
      P.restDay(p, playedToday ? 0 : rate);
      // The physio shaves days off an injury.
      if (mine && p.injury > 0 && physio >= 4 && rng.chance(0.10 * (physio - 3))) p.injury--;
      if (mine && p.injury > 0 && focus.injuryHeal && rng.chance(0.08)) p.injury--;
    });

    // Monthly awards.
    s.monthDay = (s.monthDay || 0) + 1;
    if (s.monthDay >= 30) {
      s.monthDay = 0;
      G.monthlyAwards();
      FCM.AW.resetMonthly();
    }

    // Objectives that can tick over mid-season.
    FCM.AW.checkObjectives(s).forEach(o => {
      s.board.confidence = U.clamp(s.board.confidence + o.reward, 0, 100);
      G.news('Objective complete: ' + o.label,
        'The board are pleased. Confidence +' + o.reward + '%.', 'board');
    });

    // Weekly cycle: development, wages, transfers.
    if (s.day % 7 === 0) G.weeklyTick(result);

    // Transfer market.
    if (TR.windowOpen(s.day)) {
      const ctx = G.ctx();
      const deals = TR.aiTick(ctx);
      deals.forEach(d => { s.transfers.push(d); });
      if (rng.chance(0.5)) {
        TR.offersForUser(ctx).forEach(offer => {
          const p = FCM.DB.byId[offer.player];
          G.news('Transfer offer for ' + offer.playerName,
            offer.fromName + ' have bid ' + U.money(offer.fee) + ' for ' + offer.playerName +
            ' (valued at ' + U.money(p.value) + ').', 'transfer', offer);
        });
        // Clubs enquiring about anyone on the loan list.
        TR.loanOffersForUser(ctx).forEach(offer => {
          G.news('Loan enquiry for ' + offer.playerName,
            offer.fromName + ' want to take ' + offer.playerName + ' on loan for ' +
            offer.lengthLabel.toLowerCase() + '. They will cover ' +
            Math.round(offer.wageShare * 100) + '% of his wages' +
            (offer.optionToBuy ? ', and want an option to buy at ' +
              U.money(offer.optionToBuy) : '') + '.',
            'transfer', offer);
        });
      }
    }

    // Check in on anyone we have out on loan.
    if (s.day % 21 === 0) G.reviewLoans();

    TR.contractConcerns(G.ctx()).forEach(c => {
      G.news(c.playerName + ' wants a new contract',
        c.playerName + '’s deal expires at the end of the season. They are asking for ' +
        U.wage(c.demand) + '.', 'contract', c);
    });

    // Youth intake day.
    if (s.day === Y.INTAKE_DAY) G.youthIntake();

    // Scouts reporting back from their trips.
    G.resolveScouting();
    G.resolveLoans();
    G.resolveStadium();

    // Qualifiers are played at the international breaks through the season.
    if (FCM.IN.BREAK_DAYS.indexOf(s.day) >= 0) G.tickQualifying();

    // The international summer runs alongside the tail of the season.
    if (s.day === FCM.IN.FIRST_DAY) G.startInternationalSummer();
    if (s.day >= FCM.IN.FIRST_DAY) G.tickInternationals();

    s.daysInJob++;
  };

  /** Everyone we currently have out on loan elsewhere. */
  G.loanedOut = function () {
    const s = G.state;
    return FCM.DB.players.filter(p => p.loanFrom === s.userClubId && p.loanedTo);
  };

  /**
   * Flag loanees who are not playing, so the manager can pull them back
   * rather than losing half a season of development.
   */
  G.reviewLoans = function () {
    const s = G.state;
    G.loanedOut().forEach(p => {
      const prog = TR.loanProgress(p, s.day);
      if (!prog || !prog.warn) { p.loanWarned = false; return; }
      if (p.loanWarned) return;
      p.loanWarned = true;
      G.news(p.name + ' is not playing on loan',
        p.name + ' has made just ' + p.apps + ' appearance' + (p.apps === 1 ? '' : 's') +
        ' for ' + prog.host.name + '. He is developing far slower than he would ' +
        'with regular football. Consider recalling him.',
        'transfer', { type: 'loan-warning', player: p.id });
    });
  };

  /** Cut a loan short. */
  G.recallLoan = function (playerId) {
    const p = FCM.DB.byId[playerId];
    if (!p || !p.loanedTo) return false;
    const host = FCM.DB.clubById[p.loanedTo];
    TR.recallLoan(p);
    p.loanWarned = false;
    G.news(p.name + ' recalled from loan',
      p.name + ' has been brought back from ' + (host ? host.name : 'his loan club') +
      ' and is available again.', 'transfer', { player: p.id });
    return true;
  };

  /** Send expired loanees home. */
  G.resolveLoans = function () {
    const s = G.state;
    FCM.DB.players.forEach(p => {
      if (!p.loanedTo || !p.loanUntil) return;
      if (s.day < p.loanUntil) return;
      const parent = FCM.DB.clubById[p.loanFrom];
      const host = FCM.DB.clubById[p.loanedTo];
      const wasOurs = p.loanFrom === s.userClubId;
      const wasHere = p.loanedTo === s.userClubId;
      TR.endLoan(p);
      if (wasOurs) {
        G.news(p.name + ' returns from loan',
          p.name + ' is back from his spell at ' + (host ? host.name : 'his loan club') +
          '. He made ' + p.careerApps + ' career appearances.', 'transfer', { player: p.id });
      } else if (wasHere) {
        G.news(p.name + ' has returned to ' + (parent ? parent.name : 'his club'),
          'His loan spell with us has ended.', 'transfer', { player: p.id });
      }
    });
  };

  /**
   * Advance a stadium build. Counted in weeks so it keeps going across a
   * season rollover, when the day counter resets.
   */
  G.resolveStadium = function () {
    const s = G.state;
    if (!s.stadiumProject) return;
    if (s.day % 7 !== 0) return;
    if (!FCM.F.advanceExpansion(s.stadiumProject)) return;
    const club = FCM.DB.clubById[s.userClubId];
    club.capacity = s.stadiumProject.newCapacity;
    G.news('Stadium expansion complete',
      club.stadium + ' now holds ' + U.num(club.capacity) + ' supporters.', 'board');
    s.stadiumProject = null;
  };

  /** Bring home any scouting mission that has finished. */
  G.resolveScouting = function () {
    const s = G.state, rng = G.rng;
    if (!s.scouting) s.scouting = { missions: [], found: [] };
    const club = FCM.DB.clubById[s.userClubId];
    const done = s.scouting.missions.filter(m => s.day >= m.returnsDay);
    if (!done.length) return;
    s.scouting.missions = s.scouting.missions.filter(m => s.day < m.returnsDay);

    done.forEach(m => {
      // A hired chief scout finds better prospects than the club default.
      const scoutClub = Object.assign({}, club, { scouting: FCM.TN.level(s, club, 'scouting') });
      const found = Y.resolveMission(scoutClub, m, rng, s.season, G._usedNames);
      if (!found.length) {
        G.news('Scout returns from ' + m.label + ' empty-handed',
          'Our scout spent ' + (m.returnsDay - m.startedDay) + ' days in ' + m.label +
          ' but found nobody worth bringing in.', 'youth');
        return;
      }
      found.forEach(p => {
        FCM.DB.byId[p.id] = p;
        FCM.DB.players.push(p);
        club.youth = club.youth || [];
        club.youth.push(p.id);
      });
      G.news('Scout returns from ' + m.label + ' with ' + found.length + ' prospect' +
        (found.length > 1 ? 's' : '') +
        (m.brief && m.brief !== 'any' ? ' (' + m.briefLabel + ')' : ''),
        found.map(p => p.full + ' (' + p.pos[0] + ', ' + p.age + ')').join(', ') +
        ' ' + (found.length > 1 ? 'have' : 'has') + ' joined the academy.', 'youth');
    });
  };

  /** Move an academy player up to the senior squad. */
  G.promoteYouth = function (playerId) {
    const s = G.state;
    const club = FCM.DB.clubById[s.userClubId];
    const p = FCM.DB.byId[playerId];
    if (!p || !club) return false;
    club.youth = (club.youth || []).filter(id => id !== playerId);
    if (club.squad.indexOf(playerId) < 0) club.squad.push(playerId);
    p.isYouth = false;
    p.promotedOn = s.season;      // unlocks the graduate development bonus
    p.academyUnrest = 0;
    p.morale = U.clamp(p.morale + 22, 0, 100);
    p.wage = Math.max(p.wage, Math.round(P.wageDemand(p, club.rep) * 0.6 / 100) * 100);
    return true;
  };

  /** Release an academy player. */
  G.releaseYouth = function (playerId) {
    const s = G.state;
    const club = FCM.DB.clubById[s.userClubId];
    const p = FCM.DB.byId[playerId];
    if (!p || !club) return false;
    club.youth = (club.youth || []).filter(id => id !== playerId);
    p.clubId = 0;
    p.isYouth = false;
    return true;
  };

  /** Player of the Month for the user's league. */
  G.monthlyAwards = function () {
    const s = G.state;
    const club = FCM.DB.clubById[s.userClubId];
    const league = FCM.DB.leagueOf(club);
    if (!league) return;
    const winner = FCM.AW.playerOfTheMonth(league.id, s.day, s);
    if (!winner) return;
    const award = {
      season: s.season, day: s.day, kind: 'potm',
      label: league.name + ' Player of the Month',
      player: winner.id, playerName: winner.name,
      club: winner.clubId, clubName: (FCM.DB.clubById[winner.clubId] || {}).name || ''
    };
    s.awards.unshift(award);
    if (s.awards.length > 60) s.awards.length = 60;
    winner.morale = U.clamp(winner.morale + 8, 0, 100);
    if (winner.clubId === s.userClubId) {
      G.news(winner.name + ' wins Player of the Month',
        winner.name + ' has been named ' + league.name + ' Player of the Month.',
        'trophy', { player: winner.id });
    }
  };

  G.weeklyTick = function (result) {
    const s = G.state, rng = G.rng;
    const userClub = FCM.DB.clubById[s.userClubId];
    const focus = FCM.TN.getFocus(s.trainingFocus);
    const coachLevel = FCM.TN.level(s, userClub, 'coaching');
    const coachBonus = 0.6 + coachLevel * 0.18;

    FCM.DB.clubs.forEach(club => {
      const squad = FCM.DB.squadOf(club);
      // Total squad minutes / 11 = minutes the team has actually played, so
      // an ever-present starter scores 1.0 and a benchwarmer near 0.
      const totalMinutes = U.sum(squad, p => p.minutes) || 1;
      const isUser = club.id === s.userClubId;
      squad.forEach(p => {
        const share = U.clamp(p.minutes * 11 / totalMinutes, 0, 1);
        const changed = P.develop(p, {
          minutesShare: share,
          facilities: club.facilities,
          // A hired head coach lifts development above the club default, and
          // a well-run FA lifts every club in its country.
          coaching: (isUser ? FCM.TN.level(s, club, 'coaching') : club.coaching) +
            FCM.CR.faCoachingBonus(s, club),
          avgRating: P.avgRating(p),
          season: s.season,
          // Training focus scales how fast the week moves them on, and the
          // FA's elite pathway accelerates its own nationals.
          focusMult: (isUser ? focus.growth : 1) * FCM.CR.faPathwayMult(s, p),
          rng: rng
        });
        if (isUser) {
          FCM.TN.applyWeekly(p, s.trainingFocus, rng, coachBonus);
          FCM.TN.applyIndividual(p, rng, coachBonus);
          // Hard weeks build players faster but break them more often.
          if (focus.injuryRisk && p.injury === 0 && rng.chance(0.006 * focus.injuryRisk)) {
            const inj = P.rollInjury(p, rng, focus.injuryRisk);
            if (inj) {
              G.news(p.name + ' injured in training',
                p.name + ' picked up a ' + inj.name.toLowerCase() +
                ' during a high-intensity session — out for around ' + inj.days + ' days.',
                'injury', { player: p.id });
            }
          }
        }
        if (changed !== 0 && club.id === s.userClubId && Math.abs(changed) >= 1 && rng.chance(0.5)) {
          G.news(p.name + (changed > 0 ? ' has improved' : ' has declined'),
            p.name + ' is now rated ' + p.ovr + ' overall.', changed > 0 ? 'growth' : 'decline',
            { player: p.id });
        }
      });
      (club.youth || []).forEach(id => {
        const yp = FCM.DB.byId[id];
        if (!yp) return;
        Y.developYouth(yp, club, rng, s.season);
        // Prospects left in the academy past 18 start agitating to leave.
        const walkedOut = Y.tickUnrest(yp, rng);
        if (club.id === s.userClubId) {
          const level = Y.unrestLevel(yp);
          if (walkedOut) {
            club.youth = club.youth.filter(x => x !== id);
            yp.clubId = 0; yp.isYouth = false;
            G.news(yp.name + ' has left the academy',
              yp.full + ' turned ' + yp.age + ' without a route into the first team and ' +
              'has walked away as a free agent.', 'youth', { player: yp.id });
          } else if (level && !yp.unrestWarned && yp.academyUnrest >= 40) {
            yp.unrestWarned = true;
            G.news(yp.name + ' wants first-team football',
              yp.full + ' is ' + yp.age + ' and still in the academy. ' +
              'Promote him to the senior squad or risk losing him.', 'youth', { player: yp.id });
          }
        } else if (walkedOut) {
          club.youth = club.youth.filter(x => x !== id);
          yp.clubId = 0; yp.isYouth = false;
        }
      });

      // Wages. Loanees are split with their parent club.
      let wageBill = 0;
      squad.forEach(p => {
        if (p.loanFrom && p.loanedTo === club.id) wageBill += p.wage * (p.loanWageShare || 1);
        else wageBill += p.wage;
      });
      wageBill = Math.round(wageBill);
      club.balance -= wageBill;

      if (club.id === s.userClubId) {
        s.finances.wagesPaid += wageBill;
        FCM.F.addExpense(s, 'wages', wageBill);

        const staff = FCM.F.staffWages(club) + FCM.TN.totalStaffWage(s);
        const upkeep = FCM.F.stadiumUpkeep(club);
        const youthCost = Math.round(club.youthRating * 9000 + (club.youth || []).length * 900);
        club.balance -= staff + upkeep + youthCost;
        FCM.F.addExpense(s, 'staff', staff);
        FCM.F.addExpense(s, 'stadium', upkeep);
        FCM.F.addExpense(s, 'youth', youthCost);

        const league = FCM.DB.leagueOf(club);
        const tv = FCM.F.tvWeekly(club, league);
        const comm = FCM.F.commercialWeekly(club, s.trophyCount || 0);
        club.balance += tv + comm;
        FCM.F.addIncome(s, 'tv', tv);
        FCM.F.addIncome(s, 'commercial', comm);
      }
    });

    // Dressing-room mood for the user's squad, and any transfer requests.
    const meClub = FCM.DB.clubById[s.userClubId];
    FCM.DB.squadOf(meClub).forEach(p => {
      FCM.MO.tick(p, meClub, s, rng);
      const reason = FCM.MO.maybeRequestTransfer(p, meClub, s, rng);
      if (reason) {
        G.news(p.name + ' has handed in a transfer request',
          p.name + ' is ' + reason + ' and has asked to leave. You can promise him ' +
          'game time, improve his terms, or let him stew.', 'contract',
          { type: 'transfer-request', player: p.id });
      }
    });

    // Promises you made come due, and a mood in the senior players spreads.
    FCM.MM.reviewPromises(meClub, s).forEach(r => {
      if (r.outcome === 'kept') {
        G.news('Promise kept: ' + r.player.name, r.text + ' He is happier for it.',
          'contract');
      } else {
        G.news('You broke your word to ' + r.player.name,
          r.text + (r.player.trustBroken >= 2
            ? ' He has asked to leave and will not believe you again.'
            : ' He will not take the next promise at face value.'), 'contract',
          { type: 'promise-broken', player: r.player.id });
      }
    });
    FCM.MM.spreadMood(meClub, rng);

    // Wages the user pays toward players loaned out elsewhere.
    FCM.DB.players.forEach(p => {
      if (p.loanFrom === s.userClubId && p.loanedTo) {
        const share = Math.round(p.wage * (1 - (p.loanWageShare || 0)));
        userClub.balance -= share;
        FCM.F.addExpense(s, 'wages', share);
      }
    });
  };

  G.youthIntake = function () {
    const s = G.state, rng = G.rng;
    FCM.DB.clubs.forEach(club => {
      const league = FCM.DB.leagueOf(club);
      // Grassroots investment means more children playing, so bigger intakes.
      const extra = FCM.CR.faIntakeBonus(s, club);
      const base = U.clamp(Math.round(rng.normalClamped(
        2 + (club.youthRating || 3) * 0.7 + extra, 1.1, 1, 8)), 1, 8);
      const players = Y.intake(club, rng, s.season, G._usedNames,
        league ? league.country : null, base);
      players.forEach(p => {
        FCM.DB.byId[p.id] = p;
        FCM.DB.players.push(p);
        club.youth = club.youth || [];
        club.youth.push(p.id);
      });
      if (club.id === s.userClubId) {
        const best = U.sortBy(players, p => p.pot, true)[0];
        G.news('Youth intake: ' + players.length + ' new prospects',
          'Your academy has produced ' + players.length + ' players this year. ' +
          'The pick of the bunch looks like ' + best.full + ' (' + best.pos[0] + ', age ' +
          best.age + ').', 'youth');
      }
    });
  };

  /** Leave the current club and go looking for work. */
  G.stepDown = function () {
    const s = G.state;
    FCM.CR.closeClubSpell(s, 'resigned');
    const club = FCM.DB.clubById[s.userClubId];
    G.news('You have left ' + club.name,
      'You have stepped down. Choose your next club from the Career tab.', 'board');
    s.seekingJob = true;
    return true;
  };

  /** Take a new job. */
  G.takeJob = function (clubId) {
    const s = G.state;
    const club = FCM.CR.joinClub(s, clubId);
    s.seekingJob = false;
    // Rebuild the things that are club-specific.
    s.staff = FCM.TN.initStaff(club);
    s.records = FCM.AW.blankRecords();
    s.ticketPrice = Math.round(14 + club.rep * 0.42);
    s.stadiumProject = null;
    s.scouting = { missions: [], found: [] };
    G.setBoardExpectation();
    s.objectives = FCM.AW.generateObjectives(s, club, FCM.DB.leagueOf(club));
    G.news('Welcome to ' + club.name,
      'You are the new manager. ' + s.board.expectation, 'board');
    return club;
  };

  // ---- Sandbox (god mode) --------------------------------------------
  G.SANDBOX_BUDGET_CAP = FCM.D.SANDBOX_CAP;

  G.sandbox = {
    /** Directly set a player's overall (and drag potential along if needed). */
    setOverall: function (playerId, ovr) {
      if (!FCM.D.isGod()) return false;
      const p = FCM.DB.byId[playerId];
      if (!p) return false;
      const delta = U.clamp(Math.round(ovr), 40, 99) - p.ovr;
      p.ovr = U.clamp(Math.round(ovr), 40, 99);
      if (p.pot < p.ovr) p.pot = p.ovr;
      P.applyAttributeDrift(p, delta, G.rng);
      P.recalcValue(p);
      return true;
    },
    setPotential: function (playerId, pot) {
      if (!FCM.D.isGod()) return false;
      const p = FCM.DB.byId[playerId];
      if (!p) return false;
      p.pot = U.clamp(Math.round(pot), p.ovr, 99);
      P.recalcValue(p);
      return true;
    },
    setAge: function (playerId, age) {
      if (!FCM.D.isGod()) return false;
      const p = FCM.DB.byId[playerId];
      if (!p) return false;
      p.age = U.clamp(Math.round(age), 15, 45);
      P.recalcValue(p);
      return true;
    },
    /** Move a player anywhere, for free, ignoring every negotiation. */
    forceTransfer: function (playerId, toClubId) {
      if (!FCM.D.isGod()) return false;
      const p = FCM.DB.byId[playerId];
      const to = FCM.DB.clubById[toClubId];
      if (!p || !to) return false;
      const from = FCM.DB.clubById[p.clubId];
      if (from) from.squad = from.squad.filter(id => id !== p.id);
      (from && from.youth) && (from.youth = from.youth.filter(id => id !== p.id));
      if (to.squad.indexOf(p.id) < 0) to.squad.push(p.id);
      p.clubId = to.id;
      p.isYouth = false;
      p.loanedTo = null; p.loanFrom = null;
      p.contractUntil = G.state.season + 4;
      p.apps = 0; p.goals = 0; p.assists = 0; p.seasonRatings = [];
      return true;
    },
    /** Set the money in the bank. The transfer budget follows it down. */
    setBalance: function (amount) {
      if (!FCM.D.isGod()) return false;
      const club = FCM.DB.clubById[G.state.userClubId];
      club.balance = U.clamp(Math.round(amount), 0, G.SANDBOX_BUDGET_CAP);
      FCM.D.clampBudgetToBalance(club);
      return true;
    },
    /** Transfer budget is drawn from the balance, so it cannot exceed it. */
    setBudget: function (amount) {
      if (!FCM.D.isGod()) return false;
      const club = FCM.DB.clubById[G.state.userClubId];
      club.transferBudget = U.clamp(Math.round(amount), 0,
        Math.min(G.SANDBOX_BUDGET_CAP, club.balance));
      return true;
    },
    setWageBudget: function (amount) {
      if (!FCM.D.isGod()) return false;
      const club = FCM.DB.clubById[G.state.userClubId];
      club.wageBudget = U.clamp(Math.round(amount), 0, G.SANDBOX_BUDGET_CAP / 20);
      return true;
    },
    healSquad: function () {
      if (!FCM.D.isGod()) return false;
      FCM.DB.squadOf(FCM.DB.clubById[G.state.userClubId]).forEach(p => {
        p.injury = 0; p.injuryName = null; p.suspended = 0;
        p.fitness = 100; p.morale = 95;
      });
      return true;
    },
    setBoardConfidence: function (v) {
      if (!FCM.D.isGod()) return false;
      G.state.board.confidence = U.clamp(v, 0, 100);
      return true;
    }
  };

  // ---- Context passed to subsystems ---------------------------------
  G.ctx = function () {
    const s = G.state;
    return {
      day: s.day, season: s.season, rng: G.rng,
      clubs: FCM.DB.clubs, clubById: FCM.DB.clubById,
      allPlayers: FCM.DB.players, byId: FCM.DB.byId,
      userClubId: s.userClubId,
      squadOf: FCM.DB.squadOf
    };
  };

  // ---- Tables -------------------------------------------------------
  G.leagueTable = function (leagueId) {
    const comp = G.state.competitions['league:' + leagueId];
    if (!comp) return [];
    return C.buildTable(comp.clubs, comp.fixtures, {
      nameOf: id => (FCM.DB.clubById[id] || {}).name || ''
    });
  };

  G.userFixtures = function () {
    const s = G.state;
    const club = G.allFixtures()
      .filter(f => f.home === s.userClubId || f.away === s.userClubId);
    return club.concat(G.nationalFixtures(), G.qualifyingFixtures())
      .sort((a, b) => (a.day || 999) - (b.day || 999));
  };

  /**
   * Fixtures for the national side the manager runs, shaped like club
   * fixtures so the calendar and fixture list can show them side by side.
   */
  G.nationalFixtures = function () {
    const s = G.state;
    const cr = s.career;
    if (!cr || !cr.nation) return [];
    const out = [];
    (s.activeTournaments || []).forEach(t => {
      t.fixtures.forEach(f => {
        if (f.home !== cr.nation && f.away !== cr.nation) return;
        out.push({
          comp: 'intl:' + t.id, compName: t.name,
          international: true, nation: cr.nation,
          round: f.stage === 'group' ? ('Group ' + f.group) : f.round,
          day: f.day, played: f.played, hg: f.hg, ag: f.ag,
          homeName: f.home, awayName: f.away,
          isHome: f.home === cr.nation,
          opponent: f.home === cr.nation ? f.away : f.home
        });
      });
    });
    return out;
  };

  G.nextUserFixture = function () {
    const s = G.state;
    return G.userFixtures().find(f => !f.played && f.day >= s.day) || null;
  };

  /** Everyone currently without a club and actually available to sign. */
  G.freeAgents = function () {
    return FCM.DB.players.filter(p => !p.clubId && !p.isYouth && !p.abroad);
  };

  /**
   * Advance repeatedly until `targetDay`, stopping early on the user's own
   * matches unless told to play through them.
   * opts: { stopAtMatch: bool }
   * Returns { days, matches:[fixtures], stoppedEarly, newSeason }
   */
  G.simToDay = function (targetDay, opts) {
    const o = opts || {};
    const s = G.state;
    const out = { days: 0, matches: [], stoppedEarly: false, newSeason: false };
    let guard = 0;
    while (s.day < targetDay && guard++ < 400) {
      const r = G.advanceDay();
      out.days++;
      if (r.newSeason) { out.newSeason = true; break; }
      if (r.userMatch) {
        out.matches.push(r.userMatch);
        if (o.stopAtMatch) { out.stoppedEarly = true; break; }
      }
    }
    return out;
  };

  // ---- Season rollover ----------------------------------------------
  /**
   * Individual honours and Team of the Season for the user's league.
   * Must be called while season stats are still intact.
   */
  G.awardSeasonHonours = function (uClub, uLeague) {
    const s = G.state;
    if (!uLeague) return;
    const aw = FCM.AW.seasonAwards(uLeague.id);
    if (aw) {
      const lines = [];
      [['goldenBoot', 'Golden Boot', p => p.goals + ' goals'],
       ['playmaker', 'Playmaker of the Season', p => p.assists + ' assists'],
       ['goldenGlove', 'Golden Glove', p => p.cleanSheets + ' clean sheets'],
       ['playerOfSeason', 'Player of the Season', p => P.avgRating(p).toFixed(2) + ' avg'],
       ['youngPlayer', 'Young Player of the Season', p => 'aged ' + p.age]
      ].forEach(([key, label, detail]) => {
        const p = aw[key];
        if (!p) return;
        s.awards.unshift({ season: s.season, kind: key, label: uLeague.name + ' ' + label,
          player: p.id, playerName: p.name, club: p.clubId,
          clubName: (FCM.DB.clubById[p.clubId] || {}).name || '', detail: detail(p) });
        lines.push(label + ': ' + p.name + ' (' + detail(p) + ')');
        if (p.clubId === s.userClubId) p.morale = U.clamp(p.morale + 12, 0, 100);
      });
      if (lines.length) {
        G.news(uLeague.name + ' end-of-season awards', lines.join(' · '), 'trophy');
      }
    }
    const tots = FCM.AW.teamOfTheSeason(uLeague.id);
    if (tots) {
      s.teamOfSeason = { season: s.season, league: uLeague.name,
        xi: tots.map(x => ({ pos: x.pos, id: x.player.id, name: x.player.name,
          club: (FCM.DB.clubById[x.player.clubId] || {}).name || '',
          ovr: x.player.ovr, rating: U.round(P.avgRating(x.player), 2) })) };
    }
  };

  /** Set up the summer's tournaments so they play out day by day. */
  G.startInternationalSummer = function () {
    const s = G.state, rng = G.rng;
    if (s.activeTournaments && s.activeTournaments.length) return;
    const cr = FCM.CR.ensure(s);
    const due = FCM.IN.tournamentsFor(s.season);
    s.activeTournaments = [];
    due.forEach(t => {
      // A season of qualifying decides the field. Without one (an older save,
      // or a campaign that could not be built) fall back to seeding on
      // strength, which is what the game did before qualifying existed.
      const q = (s.qualifying || []).find(x => x.id === t.id);
      if (q && !q.complete) FCM.IN.finaliseQualifying(q);
      const field = q ? FCM.IN.qualifiedNations(q) : null;

      const built = FCM.IN.createTournament(t, rng, cr.nation, field);
      if (!built) return;
      s.activeTournaments.push(built);
      const involved = cr.nation && built.teams.indexOf(cr.nation) >= 0;
      G.news(built.name + ' begins',
        built.teams.length + ' nations. ' +
        (involved ? 'You lead ' + cr.nation + ' into the tournament.'
          : 'Follow it from the Home tab.'), involved ? 'board' : 'info');
    });
    s.qualifying = [];
  };

  // ---- Qualifying campaigns -------------------------------------------
  /** Draw the qualifying groups for whatever is on next summer. */
  G.startQualifying = function () {
    const s = G.state, rng = G.rng;
    const cr = FCM.CR.ensure(s);
    s.qualifying = [];
    FCM.IN.tournamentsFor(s.season).forEach(t => {
      const q = FCM.IN.createQualifying(t, rng, cr.nation);
      if (q) s.qualifying.push(q);
    });
  };

  /** Play any qualifiers falling on today, and report the user's own. */
  G.tickQualifying = function () {
    const s = G.state, rng = G.rng;
    if (!s.qualifying || !s.qualifying.length) return;
    const cr = FCM.CR.ensure(s);
    s.qualifying.forEach(q => {
      const played = FCM.IN.tickQualifying(q, s.day, rng);
      if (!played || !cr.nation) return;
      played.forEach(f => {
        if (f.home !== cr.nation && f.away !== cr.nation) return;
        const us = f.home === cr.nation ? f.hg : f.ag;
        const them = f.home === cr.nation ? f.ag : f.hg;
        const opp = f.home === cr.nation ? f.away : f.home;
        const outcome = us > them ? 'Won' : (us === them ? 'Drew' : 'Lost');
        G.news(cr.nation + ' ' + us + '–' + them + ' ' + opp,
          outcome + ' away at the international break. ' + q.name +
          ' qualifying.', us > them ? 'trophy' : 'info');
      });
    });
  };

  /** Every qualifier involving the nation you manage. */
  G.qualifyingFixtures = function () {
    const s = G.state;
    const cr = s.career;
    if (!cr || !cr.nation) return [];
    const out = [];
    (s.qualifying || []).forEach(q => {
      q.campaigns.forEach(c => {
        c.fixtures.forEach(f => {
          if (f.home !== cr.nation && f.away !== cr.nation) return;
          out.push({
            comp: 'intl:' + q.id, compName: q.name + ' qualifying',
            international: true, nation: cr.nation,
            round: 'Group ' + f.group, day: f.day, played: f.played,
            hg: f.hg, ag: f.ag, homeName: f.home, awayName: f.away,
            isHome: f.home === cr.nation,
            opponent: f.home === cr.nation ? f.away : f.home
          });
        });
      });
    });
    return out;
  };

  /** Advance any running tournament, and wrap up when the final is done. */
  G.tickInternationals = function () {
    const s = G.state, rng = G.rng;
    if (!s.activeTournaments || !s.activeTournaments.length) return;
    const cr = FCM.CR.ensure(s);

    s.activeTournaments.forEach(t => {
      if (t.complete) return;
      const played = FCM.IN.tick(t, s.day, rng);
      if (!played || !played.length) return;

      // Report the user's own matches.
      if (cr.nation) {
        played.forEach(f => {
          if (f.home !== cr.nation && f.away !== cr.nation) return;
          const us = f.home === cr.nation ? f.hg : f.ag;
          const them = f.home === cr.nation ? f.ag : f.hg;
          const opp = f.home === cr.nation ? f.away : f.home;
          const outcome = us > them ? 'Won' : (us === them ? 'Drew' : 'Lost');
          G.news(cr.nation + ' ' + us + '–' + them + ' ' + opp,
            outcome + ' ' + (f.stage === 'group'
              ? 'in Group ' + f.group
              : 'in the ' + f.round.toLowerCase()) + ' at the ' + t.name + '.',
            us >= them ? 'result' : 'board');
        });
      }

      if (t.complete) {
        FCM.IN.finalise(t, rng);
        s.internationals.unshift({
          id: t.id, name: t.name, year: t.year, winner: t.winner,
          runnerUp: t.runnerUp, topScorer: t.topScorer,
          field: t.teams, userReached: t.userReached
        });
        if (s.internationals.length > 40) s.internationals.length = 40;

        if (cr.nation && t.teams.indexOf(cr.nation) >= 0) {
          const job = cr.nationJobs.find(j => j.nation === cr.nation && !j.to);
          const reached = FCM.IN.progressOf(t, cr.nation);
          if (job) job.tournaments.push({ name: t.name, year: t.year, result: reached });
          cr.tournaments.push({ name: t.name, year: t.year, nation: cr.nation, result: reached });
          if (t.winner === cr.nation) {
            FCM.CR.recordTrophy(s, t.name, 'international');
            G.news('We won the ' + t.name + '!',
              cr.nation + ' are champions. A career-defining summer.', 'trophy');
          } else {
            G.news(cr.nation + ' out of the ' + t.name,
              'We finished: ' + reached + '. ' +
              (t.winner ? t.winner + ' lifted the trophy.' : ''), 'board');
          }
        } else {
          G.news(t.name + ': ' + t.winner + ' win',
            t.winner + ' beat ' + (t.runnerUp || 'the field') + ' in the final.' +
            (t.topScorer ? ' ' + t.topScorer.name + ' finished top scorer with ' +
              t.topScorer.goals + '.' : ''), 'trophy');
        }
      }
    });
  };

  /** Any tournament the user is involved in right now. */
  G.liveTournaments = function () {
    const s = G.state;
    return (s.activeTournaments || []).filter(t => !t.complete ||
      s.day - (t.lastDay || 0) < 20);
  };

  /** World individual awards, once the season and summer are done. */
  G.runInternationalSummer = function () {
    const s = G.state, rng = G.rng;
    const cr = FCM.CR.ensure(s);

    // Ballon d'Or, decided on the season just gone.
    const bd = FCM.IN.ballonDor(s, rng);
    if (bd && bd.length) {
      s.ballonDor.unshift({ season: s.season, ranking: bd });
      if (s.ballonDor.length > 30) s.ballonDor.length = 30;
      const w = bd[0];
      if (w.clubId === s.userClubId) {
        cr.ballonDors.push({ season: s.season, name: w.full || w.name });
        G.news(w.name + ' wins the Ballon d’Or!',
          'One of our own has been named the best player in the world — ' +
          w.goals + ' goals, ' + w.assists + ' assists, ' + w.rating + ' average rating.',
          'trophy', { player: w.id });
      } else {
        G.news('Ballon d’Or: ' + w.name,
          w.name + ' of ' + w.club + ' has been named the world’s best player (' +
          w.goals + ' goals, ' + w.assists + ' assists).', 'trophy', { player: w.id });
      }
    }
  };

  G.endSeason = function (result) {
    const s = G.state;
    // Record final tables for European qualification next year.
    s.lastTables = {};
    FCM.DB.leagues.forEach(l => {
      const table = G.leagueTable(l.id);
      if (table.length) s.lastTables[l.id] = table.map(r => r.club);
    });
    // Awards must be decided BEFORE squads are shuffled and season stats
    // are wiped, or every player looks like they played no games.
    const uClub = FCM.DB.clubById[s.userClubId];
    const uLeague = FCM.DB.leagueOf(uClub);

    // Winning the league is a trophy too. Cups were recorded but league
    // titles never were, so champions ended up with an empty cabinet.
    if (uLeague && s.lastTables[uLeague.id] &&
        s.lastTables[uLeague.id][0] === s.userClubId) {
      s.trophyCount = (s.trophyCount || 0) + 1;
      s.history.push({ season: s.season, comp: uLeague.name,
        winner: s.userClubId, winnerName: uClub.name });
      FCM.CR.recordTrophy(s, uLeague.name, 'league');
      s.board.confidence = U.clamp(s.board.confidence + 16, 0, 100);
      G.news('Champions! We have won ' + G.leagueWithArticle(uLeague),
        uClub.name + ' are champions. A season that will be remembered.', 'trophy');
    }

    G.awardSeasonHonours(uClub, uLeague);
    FCM.CR.closeSeason(s);
    G.runInternationalSummer();

    // The association pays its annual grant for the coming year.
    if (s.career && s.career.faRole) {
      const grant = FCM.CR.payFAGrant(s);
      if (grant > 0) {
        G.news('FA grant received: ' + U.money(grant),
          'The ' + s.career.faRole.country + ' association has released its annual ' +
          'funding. Invest it in the national game from the Career tab.', 'board');
      }
    }

    G.applyPromotionRelegation();
    G.expireContracts();
    G.fillSquadsFromFreeAgents();
    G.retirePlayers();
    // Retirements thin the smaller nations first; keep every country able to
    // name a legal 26-man squad.
    FCM.NT.fillPools(G.rng, s.season + 1, G._usedNames);

    // Age everyone, reset season stats.
    FCM.DB.players.forEach(p => {
      p.age++;
      p.seasonYear = s.season + 1;
      p.apps = 0; p.goals = 0; p.assists = 0; p.cleanSheets = 0;
      p.yellow = 0; p.red = 0; p.minutes = 0; p.seasonRatings = [];
      p.suspended = 0;
      p.contractWarned = false;
      p.unrestWarned = false;
      P.recalcValue(p);
    });

    // Settle season objectives.
    (s.objectives || []).forEach(o => {
      if (o.done) return;
      if (o.kind === 'position') {
        const table = s.lastTables[uClub.league];
        const pos = table ? table.indexOf(s.userClubId) + 1 : 99;
        if (pos > 0 && pos <= o.value) {
          o.done = true;
          s.board.confidence = U.clamp(s.board.confidence + o.reward, 0, 100);
          uClub.transferBudget += o.cash || 0;
          G.news('Objective met: ' + o.label,
            'The board have released ' + U.money(o.cash || 0) + ' in extra funds.', 'board');
        } else { o.failed = true; }
      } else if (o.kind === 'finance') {
        const net = FCM.F.totalIncome(s.ledger) - FCM.F.totalExpense(s.ledger);
        if (net >= 0) {
          o.done = true;
          s.board.confidence = U.clamp(s.board.confidence + o.reward, 0, 100);
        } else { o.failed = true; }
      } else if (!o.done) { o.failed = true; }
    });

    // Judge the season against the board's target before rolling over.
    const finalTable = s.lastTables[FCM.DB.clubById[s.userClubId].league];
    if (finalTable) {
      const pos = finalTable.indexOf(s.userClubId) + 1;
      if (pos > 0) {
        FCM.D.judgeStanding(s, pos, s.board.targetPos || 10);
        s.seasonHistory = s.seasonHistory || [];
        s.seasonHistory.push({ season: s.season, position: pos,
          club: FCM.DB.clubById[s.userClubId].name, target: s.board.targetPos });
        if (FCM.D.checkSacking(s)) {
          s.sacked = true;
          G.news('You have been sacked',
            'A ' + U.ordinal(pos) + '-place finish was not what the board wanted. ' +
            'Your contract has been terminated.', 'board');
        }
      }
    }

    s.season++;
    s.day = 5;
    s.activeTournaments = [];
    s.ledger = FCM.F.blankLedger();
    s.finances = { wagesPaid: 0, transferSpend: 0, transferIncome: 0, matchdayIncome: 0 };
    s.seasonLog.push({ season: s.season - 1, history: s.history.slice() });
    G.setupSeason(false);
    G.startQualifying();
    G.setBoardExpectation();
    FCM.AW.resetRivals();
    FCM.AW.resetMonthly();
    s.objectives = FCM.AW.generateObjectives(s, FCM.DB.clubById[s.userClubId],
      FCM.DB.leagueOf(FCM.DB.clubById[s.userClubId]));
    G.news('Season ' + s.season + '/' + String(s.season + 1).slice(2) + ' begins',
      'Pre-season is underway. ' + s.board.expectation, 'board');
    if (result) result.newSeason = true;
  };

  /**
   * Run down expiring deals. AI clubs re-sign most of their squad; anyone
   * they let go - and anyone the user forgot to renew - hits free agency.
   */
  G.expireContracts = function () {
    const s = G.state, rng = G.rng;
    const released = [];
    FCM.DB.clubs.forEach(club => {
      const squad = FCM.DB.squadOf(club);
      const ranked = U.sortBy(squad, p => p.ovr, true);
      ranked.forEach((p, rank) => {
        if (p.contractUntil > s.season) return;
        let keep;
        if (club.id === s.userClubId) {
          keep = false;   // the manager had all season to offer new terms
        } else {
          // Keep the important players; let ageing squad filler go.
          const core = rank < 18;
          let chance = core ? 0.90 : 0.45;
          if (p.age >= 33) chance -= 0.30;
          if (p.age <= 23) chance += 0.10;
          keep = rng.chance(U.clamp(chance, 0.05, 0.97));
        }
        if (keep) {
          p.contractUntil = s.season + rng.int(2, 4);
          p.wage = P.wageDemand(p, club.rep);
        } else {
          released.push({ p: p, club: club });
        }
      });
    });

    released.forEach(({ p, club }) => {
      // Never strip a club below a viable squad.
      if (club.squad.length <= 16) {
        p.contractUntil = s.season + 2;
        return;
      }
      club.squad = club.squad.filter(id => id !== p.id);
      p.clubId = 0;
      p.transferListed = false;
      p.freeSince = s.season;   // used to clear out perennial free agents
      if (club.id === s.userClubId) {
        G.news(p.name + ' has left on a free transfer',
          p.name + '’s contract expired and he has left the club as a free agent.',
          'contract', { player: p.id });
      }
    });
  };

  /**
   * Pre-season free agency: AI clubs rebuild squads thinned by expiries and
   * retirements, which also stops the free-agent pool growing without bound.
   */
  G.fillSquadsFromFreeAgents = function () {
    const s = G.state, rng = G.rng;
    const TARGET = 22;
    FCM.DB.clubs.forEach(club => {
      if (club.id === s.userClubId) return;   // the manager does their own business
      let need = TARGET - club.squad.length;
      if (need <= 0) return;
      // Prefer players who suit the club's level, best first. `abroad` players
      // are contracted in leagues the game does not model - they are not
      // free agents and cannot simply be picked up.
      const pool = U.sortBy(
        FCM.DB.players.filter(p => !p.clubId && !p.isYouth && !p.abroad &&
          p.ovr <= club.strength + 4),
        p => p.ovr, true);
      for (const p of pool) {
        if (need <= 0) break;
        if (p.clubId) continue;
        club.squad.push(p.id);
        p.clubId = club.id;
        p.contractUntil = s.season + rng.int(1, 3);
        p.wage = P.wageDemand(p, club.rep);
        p.freeSince = null;
        need--;
      }
    });
  };

  /**
   * Retire ageing players and clear out unwanted free agents, so the player
   * pool (and therefore the save file) stays a stable size across decades.
   */
  G.retirePlayers = function () {
    const s = G.state, rng = G.rng;
    const gone = {};
    FCM.DB.players.forEach(p => {
      if (p.isYouth) return;
      let retire = false;
      if (p.age >= 40) retire = true;
      else if (p.age >= 34) {
        // The lower the level, the earlier they hang the boots up.
        const chance = U.clamp(0.10 + (p.age - 34) * 0.20 + (72 - p.ovr) * 0.02, 0.05, 0.95);
        retire = rng.chance(chance);
      }
      // Anyone who stays unsigned for a season drifts out of the game. Players
      // abroad are under contract somewhere we do not model, so neither this
      // nor the unwanted-newgen sweep applies to them.
      if (!retire && !p.abroad && !p.clubId && p.freeSince !== null &&
          p.freeSince !== undefined && s.season - p.freeSince >= 1) {
        retire = true;
      }
      // Unsigned newgens nobody wanted never make the grade.
      if (!retire && p.isNewgen && !p.abroad && !p.clubId && p.ovr < 62) {
        retire = rng.chance(0.85);
      }
      if (retire) {
        gone[p.id] = 1;
        // Great careers are remembered.
        if (FCM.HOF.isWorthy(p, s)) {
          const entry = FCM.HOF.add(s, FCM.HOF.induct(p, s));
          if (entry.wasOurs) {
            G.news(p.name + ' retires — Hall of Fame',
              p.full + ' hangs up his boots at ' + p.age + ' after ' +
              entry.seasonsWithUs + ' season' + (entry.seasonsWithUs === 1 ? '' : 's') +
              ' with us. ' + p.careerGoals + ' career goals in ' + p.careerApps +
              ' games. He takes his place in the club’s Hall of Fame.', 'trophy');
          }
        } else if (p.clubId === s.userClubId) {
          G.news(p.name + ' has retired',
            p.name + ' has announced his retirement at the age of ' + p.age + '.', 'contract');
        }
      }
    });
    const ids = Object.keys(gone).map(Number);
    if (!ids.length) return;
    FCM.DB.clubs.forEach(c => {
      c.squad = c.squad.filter(id => !gone[id]);
      c.youth = (c.youth || []).filter(id => !gone[id]);
    });
    s.shortlist = (s.shortlist || []).filter(id => !gone[id]);
    FCM.DB.players = FCM.DB.players.filter(p => !gone[p.id]);
    ids.forEach(id => { delete FCM.DB.byId[id]; });

    // Clubs left short after retirements promote from their own academy.
    FCM.DB.clubs.forEach(c => {
      while (c.squad.length < 18 && (c.youth || []).length) {
        const best = U.sortBy(c.youth.map(id => FCM.DB.byId[id]).filter(Boolean), p => p.pot, true)[0];
        if (!best) break;
        c.youth = c.youth.filter(id => id !== best.id);
        c.squad.push(best.id);
        best.isYouth = false;
        best.promotedOn = s.season;
      }
    });
  };

  G.applyPromotionRelegation = function () {
    const s = G.state;
    const byCountry = {};
    FCM.DB.leagues.forEach(l => {
      (byCountry[l.country] = byCountry[l.country] || []).push(l);
    });
    for (const country in byCountry) {
      const tiers = U.sortBy(byCountry[country], l => l.tier);
      for (let i = 0; i < tiers.length - 1; i++) {
        const up = tiers[i], down = tiers[i + 1];
        const upTable = s.lastTables[up.id], downTable = s.lastTables[down.id];
        if (!upTable || !downTable) continue;
        const n = up.tier === 1 ? 3 : 3;
        const relegated = upTable.slice(-n);
        const promoted = downTable.slice(0, n);
        relegated.forEach(id => { FCM.DB.clubById[id].league = down.id; });
        promoted.forEach(id => { FCM.DB.clubById[id].league = up.id; });
        if (relegated.indexOf(s.userClubId) >= 0) {
          G.news('Relegated', 'We have been relegated to the ' + down.name + '.', 'board');
          s.board.confidence = U.clamp(s.board.confidence - 30, 0, 100);
        }
        if (promoted.indexOf(s.userClubId) >= 0) {
          G.news('Promoted!', 'We are going up to the ' + up.name + '!', 'trophy');
          s.board.confidence = U.clamp(s.board.confidence + 25, 0, 100);
        }
      }
    }
  };

  FCM.G = G;
})(window.FCM = window.FCM || {});
