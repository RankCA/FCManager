/* National team management, international tournaments and world awards. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const IN = {};

  // ---- Confederations --------------------------------------------------
  IN.CONFEDS = {
    europe: {
      id: 'europe', label: 'UEFA', tournament: 'European Championship',
      short: 'Euros', teams: 24, cycleOffset: 0
    },
    africa: {
      id: 'africa', label: 'CAF', tournament: 'Africa Cup of Nations',
      short: 'AFCON', teams: 24, cycleOffset: 1
    },
    samerica: {
      id: 'samerica', label: 'CONMEBOL', tournament: 'Copa América',
      short: 'Copa América', teams: 16, cycleOffset: 0
    },
    asia: {
      id: 'asia', label: 'AFC', tournament: 'AFC Asian Cup',
      short: 'Asian Cup', teams: 24, cycleOffset: 1
    },
    namerica: {
      id: 'namerica', label: 'CONCACAF', tournament: 'CONCACAF Gold Cup',
      short: 'Gold Cup', teams: 16, cycleOffset: 1
    },
    oceania: {
      id: 'oceania', label: 'OFC', tournament: 'OFC Nations Cup',
      short: 'Nations Cup', teams: 8, cycleOffset: 1
    }
  };

  /**
   * Confederation membership, derived from the canonical nation table in
   * db-nations.js. It used to be hard-coded here, which is how "Turkey" and
   * "Ivory Coast" ended up in the lists while the player data spells them
   * "Türkiye" and "Côte d'Ivoire" - 375 real internationals belonged to
   * nations that, as far as the game was concerned, had nobody.
   */
  Object.defineProperty(IN, 'NATION_CONFED', {
    get: function () {
      const out = {};
      Object.keys(IN.CONFEDS).forEach(cid => {
        out[cid] = FCM.NT.inConfed(cid).map(n => n.name);
      });
      return out;
    }
  });

  IN.confedOf = function (nation) { return FCM.NT.confedOf(nation); };

  // ---- Tournament calendar ---------------------------------------------
  /**
   * Which tournaments run in the summer following `season`.
   * World Cup on the 2026/2030 cycle; continental cups in between.
   */
  IN.tournamentsFor = function (season) {
    const year = season + 1;   // tournaments happen the summer after the season
    const out = [];
    if (year % 4 === 2) {
      // The expanded 64-team format: 16 groups of four, top two through.
      out.push({ id: 'worldcup', name: 'FIFA World Cup', short: 'World Cup',
        teams: 64, confed: null, year: year });
    }
    if (year % 4 === 0) {
      out.push({ id: 'euros', name: 'European Championship', short: 'Euros',
        teams: 24, confed: 'europe', year: year });
      // CONMEBOL has only ten members, so the Copa invites CONCACAF guests
      // to fill the field, exactly as the real tournament does.
      out.push({ id: 'copa', name: 'Copa América', short: 'Copa América',
        teams: 16, confed: 'samerica', guests: 'namerica', year: year });
    }
    if (year % 2 === 1) {
      out.push({ id: 'afcon', name: 'Africa Cup of Nations', short: 'AFCON',
        teams: 24, confed: 'africa', year: year });
      out.push({ id: 'asiancup', name: 'AFC Asian Cup', short: 'Asian Cup',
        teams: 24, confed: 'asia', year: year });
      out.push({ id: 'goldcup', name: 'CONCACAF Gold Cup', short: 'Gold Cup',
        teams: 16, confed: 'namerica', year: year });
      out.push({ id: 'ofcnations', name: 'OFC Nations Cup', short: 'Nations Cup',
        teams: 8, confed: 'oceania', year: year });
    }
    return out;
  };

  // ---- National squads --------------------------------------------------
  /** The best available players for a nation, by position shape. */
  // FIFA allows 26. The shape must be at least that long or a manager
  // asking for a full squad quietly gets 25.
  const SQUAD_SHAPE = ['GK', 'GK', 'GK', 'CB', 'CB', 'CB', 'CB', 'LB', 'LB', 'RB', 'RB',
    'CDM', 'CDM', 'CM', 'CM', 'CM', 'CAM', 'CAM', 'LW', 'LW', 'RW', 'RW', 'ST', 'ST', 'ST',
    'CB', 'CM', 'ST'];

  IN.callUpSquad = function (nation, size) {
    const pool = FCM.DB.players.filter(p => p.nat === nation && p.injury === 0 && !p.isYouth);
    if (pool.length < 11) return null;
    const shape = SQUAD_SHAPE;
    const taken = {};
    const squad = [];
    shape.slice(0, size || 23).forEach(pos => {
      const best = U.sortBy(pool.filter(p => !taken[p.id]), p => P.overallAt(p, pos), true)[0];
      if (best) { taken[best.id] = 1; squad.push(best); }
    });
    return squad;
  };

  /** How strong a nation is right now, 0-100. */
  IN.nationStrength = function (nation) {
    const squad = IN.callUpSquad(nation, 18);
    if (!squad || squad.length < 11) return 0;
    return U.mean(squad.slice(0, 16), p => p.ovr);
  };

  /** Rate a lineup of player ids against a formation's slots. */
  function rateLineup(lineup, slots) {
    const rated = [];
    (lineup || []).forEach((id, i) => {
      const p = FCM.DB.byId[id];
      if (!p || !slots[i]) return;
      // Playing a winger at centre-back is punished by overallAt.
      rated.push(P.overallAt(p, slots[i].pos) * (p.injury > 0 ? 0.72 : 1));
    });
    return rated.length >= 11 ? U.mean(rated, x => x) : null;
  }

  /**
   * Strength of the XI the manager actually named for his country. Measured
   * as a delta from the best XI available, so naming your strongest side
   * matches the default call-up strength and a weakened one costs you.
   * Returns null when he has not picked a side.
   */
  IN.selectedStrength = function (nation) {
    const s = FCM.G && FCM.G.state;
    const tac = s && s.tactics && s.tactics['nation:' + nation];
    if (!tac || !tac.lineup) return null;
    const slots = FCM.T.FORMATIONS[tac.formation];
    if (!slots) return null;
    const pool = IN.callUpSquad(nation, 26) || [];
    if (pool.length < 11) return null;
    // Heal the side first: retirements and injuries since he last picked it
    // would otherwise leave him a man short without ever being told.
    FCM.T.validate(tac, pool);

    const picked = rateLineup(tac.lineup, slots);
    if (picked === null) return null;
    const best = rateLineup(FCM.T.autoPick(pool, tac.formation).lineup, slots);
    if (best === null) return null;

    // Naming your strongest side is neutral; anything weaker costs you.
    return IN.nationStrength(nation) + U.clamp(picked - best, -14, 0);
  };

  /** Nations eligible for a tournament, strongest first. */
  IN.qualifiers = function (tournament) {
    const pool = tournament.confed
      ? FCM.NT.inConfed(tournament.confed).map(n => n.name)
      : FCM.NT.all().map(n => n.name);
    const rated = pool.map(n => ({ nation: n, strength: IN.nationStrength(n) }))
      .filter(x => x.strength > 0);

    // A confederation smaller than its own tournament invites guests: the
    // Copa's field is ten CONMEBOL sides plus six from CONCACAF.
    if (tournament.guests && rated.length < tournament.teams) {
      const invited = FCM.NT.inConfed(tournament.guests)
        .map(n => ({ nation: n.name, strength: IN.nationStrength(n.name), guest: true }))
        .filter(x => x.strength > 0);
      U.sortBy(invited, x => x.strength, true)
        .slice(0, tournament.teams - rated.length)
        .forEach(x => rated.push(x));
    }
    // A World Cup spreads places across confederations rather than simply
    // taking the strongest 32 in the world.
    if (!tournament.confed) {
      // Places scale with the field, keeping the real confederation balance.
      const base = { europe: 13, africa: 9, samerica: 6, asia: 8, namerica: 6, oceania: 1 };
      const scale = tournament.teams / 32;
      const quota = {};
      for (const k in base) quota[k] = Math.round(base[k] * scale);
      const out = [];
      const picked = {};
      for (const cid in quota) {
        const inConfed = rated.filter(x => IN.confedOf(x.nation) === cid);
        U.sortBy(inConfed, x => x.strength, true).slice(0, quota[cid]).forEach(x => {
          out.push(x); picked[x.nation] = 1;
        });
      }
      // A confederation may not have enough nations to fill its quota (South
      // America has only ten), so top the field up with the best left over.
      if (out.length < tournament.teams) {
        U.sortBy(rated.filter(x => !picked[x.nation]), x => x.strength, true)
          .slice(0, tournament.teams - out.length)
          .forEach(x => out.push(x));
      }
      return U.sortBy(out, x => x.strength, true).slice(0, tournament.teams);
    }
    return U.sortBy(rated, x => x.strength, true).slice(0, tournament.teams);
  };

  // ---- Structured tournament (groups + bracket, played over the summer) --
  // The summer window is tight: a 64-team World Cup needs three group
  // matchdays plus five knockout rounds inside ~30 days before the season
  // rolls over, so the gaps are deliberately short.
  IN.FIRST_DAY = 332;      // early June, after the club season
  IN.GROUP_GAP = 3;        // days between group matchdays
  IN.KO_GAP = 4;

  /**
   * Circle-method round robin: returns one array of pairs per matchday, so
   * no nation is ever down to play twice on the same day. An odd group gets
   * a bye each round.
   */
  function roundRobin(teams) {
    const t = teams.slice();
    if (t.length < 2) return [];
    if (t.length % 2) t.push(null);
    const n = t.length;
    const rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const a = t[i], b = t[n - 1 - i];
        // Alternate home and away so nobody hosts every game.
        if (a && b) pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
      if (pairs.length) rounds.push(pairs);
      t.splice(1, 0, t.pop());
    }
    return rounds;
  }

  /**
   * Build a full tournament: seeded groups, a fixture list spread across
   * the summer, and an empty bracket to fill as rounds resolve.
   */
  IN.createTournament = function (tournament, rng, userNation) {
    const field = IN.qualifiers(tournament);
    if (field.length < 8) return null;

    // Groups of four, seeded so the strongest are spread out.
    const groupCount = Math.max(2, Math.round(field.length / 4));
    const seeded = U.sortBy(field, x => x.strength, true);
    const groups = [];
    for (let g = 0; g < groupCount; g++) {
      groups.push({ name: String.fromCharCode(65 + g), teams: [], table: [] });
    }
    seeded.forEach((team, i) => {
      // Snake the seeding so pot one is distributed evenly.
      const band = Math.floor(i / groupCount);
      const idx = band % 2 === 0 ? (i % groupCount) : (groupCount - 1 - (i % groupCount));
      groups[idx].teams.push(team.nation);
    });

    // Round robin within each group, laid out as proper matchdays so every
    // nation plays once per matchday. Slicing a flat fixture list into three
    // instead made the first few groups play all their games on the same day.
    const fixtures = [];
    let matchdays = 0;
    groups.forEach(g => {
      roundRobin(g.teams).forEach((pairs, r) => {
        pairs.forEach(pair => {
          fixtures.push({ stage: 'group', group: g.name,
            home: pair[0], away: pair[1], played: false, hg: 0, ag: 0,
            matchday: r + 1, day: IN.FIRST_DAY + r * IN.GROUP_GAP });
        });
        matchdays = Math.max(matchdays, r + 1);
      });
    });

    return {
      id: tournament.id, name: tournament.name, short: tournament.short,
      year: tournament.year, confed: tournament.confed,
      teams: field.map(x => x.nation),
      strength: field.reduce((m, x) => { m[x.nation] = x.strength; return m; }, {}),
      groups: groups, fixtures: fixtures,
      knockout: { rounds: [] },
      stage: 'group', complete: false, winner: null, runnerUp: null,
      userNation: userNation || null,
      lastDay: IN.FIRST_DAY + Math.max(0, matchdays - 1) * IN.GROUP_GAP
    };
  };

  /** Result of a single international match. */
  function playMatch(t, home, away, rng, koRound) {
    const hs = t.strength[home] || 65, as = t.strength[away] || 65;
    const edge = (hs - as) * 0.055;
    const pHome = U.clamp(0.42 + edge, 0.12, 0.84);
    const pDraw = koRound ? 0 : U.clamp(0.28 - Math.abs(edge) * 0.5, 0.12, 0.30);
    const r = rng.next();
    let hg, ag;
    if (r < pDraw) {
      hg = ag = rng.int(0, 2);
    } else if (r < pDraw + pHome) {
      hg = rng.int(1, 3); ag = rng.int(0, hg - 1);
    } else {
      ag = rng.int(1, 3); hg = rng.int(0, ag - 1);
    }
    return { hg: hg, ag: ag };
  }

  /** Group table from played fixtures. */
  IN.groupTable = function (t, group) {
    const rows = {};
    group.teams.forEach(n => {
      rows[n] = { nation: n, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });
    t.fixtures.forEach(f => {
      if (f.stage !== 'group' || f.group !== group.name || !f.played) return;
      const h = rows[f.home], a = rows[f.away];
      if (!h || !a) return;
      h.p++; a.p++;
      h.gf += f.hg; h.ga += f.ag; a.gf += f.ag; a.ga += f.hg;
      if (f.hg > f.ag) { h.w++; a.l++; h.pts += 3; }
      else if (f.hg < f.ag) { a.w++; h.l++; a.pts += 3; }
      else { h.d++; a.d++; h.pts++; a.pts++; }
    });
    const list = Object.values(rows);
    list.forEach(r => { r.gd = r.gf - r.ga; });
    list.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf ||
      (t.strength[y.nation] || 0) - (t.strength[x.nation] || 0));
    list.forEach((r, i) => { r.pos = i + 1; });
    return list;
  };

  /**
   * Advance a tournament to `day`. Plays any fixtures due, and builds the
   * next round when a stage completes.
   */
  IN.tick = function (t, day, rng) {
    if (t.complete) return null;
    const events = [];
    // A manager who picks his own side lives with it: the XI he named sets
    // how strong the nation is, so leaving your best striker out costs you.
    if (t.userNation && t.strength[t.userNation] !== undefined) {
      const picked = IN.selectedStrength(t.userNation);
      if (picked) t.strength[t.userNation] = picked;
    }
    const due = t.fixtures.filter(f => !f.played && f.day <= day);
    due.forEach(f => {
      const r = playMatch(t, f.home, f.away, rng, f.stage !== 'group');
      f.hg = r.hg; f.ag = r.ag; f.played = true;
      if (f.stage !== 'group' && f.hg === f.ag) {
        // Knockout ties must produce a winner.
        const pens = rng.chance(0.5);
        f.pens = pens ? [5, 4] : [4, 5];
        f.winner = pens ? f.home : f.away;
      } else if (f.stage !== 'group') {
        f.winner = f.hg > f.ag ? f.home : f.away;
      }
      events.push(f);
    });
    if (!due.length) return events.length ? events : null;

    // Stage complete?
    const outstanding = t.fixtures.filter(f => !f.played);
    if (outstanding.length) return events;

    if (t.stage === 'group') {
      // Top two from each group, plus best third-placed sides to fill a
      // power-of-two bracket.
      const qualified = [];
      const thirds = [];
      t.groups.forEach(g => {
        const table = IN.groupTable(t, g);
        g.table = table;
        if (table[0]) qualified.push(table[0].nation);
        if (table[1]) qualified.push(table[1].nation);
        if (table[2]) thirds.push(table[2]);
      });
      let size = 1;
      while (size * 2 <= qualified.length + thirds.length) size *= 2;
      const extra = U.sortBy(thirds, r => r.pts * 100 + r.gd, true)
        .slice(0, Math.max(0, size - qualified.length));
      const bracket = qualified.concat(extra.map(r => r.nation)).slice(0, size);
      // Seed so group winners avoid each other early.
      IN.startKnockout(t, bracket, rng);
    } else {
      const round = t.knockout.rounds[t.knockout.rounds.length - 1];
      const winners = round.ties.map(x => x.winner).filter(Boolean);
      if (winners.length <= 1) {
        t.complete = true;
        t.winner = winners[0] || null;
        const finalTie = round.ties[0];
        if (finalTie) t.runnerUp = finalTie.winner === finalTie.home ? finalTie.away : finalTie.home;
      } else {
        IN.startKnockout(t, winners, rng);
      }
    }
    return events;
  };

  IN.startKnockout = function (t, teams, rng) {
    t.stage = 'knockout';
    const day = (t.lastDay || IN.FIRST_DAY) + IN.KO_GAP;
    t.lastDay = day;
    const ties = [];
    for (let i = 0; i < teams.length; i += 2) {
      const f = { stage: 'ko', round: IN.roundName(teams.length),
        home: teams[i], away: teams[i + 1], day: day,
        played: false, hg: 0, ag: 0, winner: null };
      ties.push(f);
      t.fixtures.push(f);
    }
    t.knockout.rounds.push({ name: IN.roundName(teams.length), ties: ties });
  };

  /** Everything wrapped up once a tournament finishes. */
  IN.finalise = function (t, rng) {
    const pool = [];
    t.teams.slice(0, 12).forEach(n => {
      const sq = IN.callUpSquad(n, 23) || [];
      sq.forEach(p => { if (P.GROUP[p.pos[0]] === 'ATT' || p.pos[0] === 'CAM') pool.push(p); });
    });
    const scorer = pool.length
      ? rng.weighted(U.sortBy(pool, p => p.ovr, true).slice(0, 20),
          p => Math.max(1, p.ovr - 70)) : null;
    t.topScorer = scorer ? { id: scorer.id, name: scorer.name, nation: scorer.nat,
      goals: rng.int(4, 8) } : null;
    // Only report a finish if the manager's nation actually took part -
    // England has no business appearing in AFCON results.
    if (t.userNation && t.teams.indexOf(t.userNation) >= 0) {
      t.userReached = IN.progressOf(t, t.userNation);
    } else {
      t.userReached = null;
    }
    return t;
  };

  /** How far a nation got in a structured tournament. */
  IN.progressOf = function (t, nation) {
    if (t.winner === nation) return 'Winners';
    if (t.runnerUp === nation) return 'Runners-up';
    for (let i = t.knockout.rounds.length - 1; i >= 0; i--) {
      const r = t.knockout.rounds[i];
      const tie = r.ties.find(x => x.home === nation || x.away === nation);
      if (tie) return 'Lost in the ' + r.name.toLowerCase();
    }
    return 'Group stage';
  };

  /**
   * Play a tournament: group stage then knockouts, resolved on squad
   * strength with enough noise for upsets.
   */
  IN.playTournament = function (tournament, rng, userNation) {
    const field = IN.qualifiers(tournament);
    if (field.length < 8) return null;

    const rounds = [];
    let alive = field.slice();

    // Group stage trims the field by roughly half.
    const groupSurvivors = Math.pow(2, Math.floor(Math.log2(alive.length / 2)));
    const groupOut = [];
    alive = U.sortBy(alive, x => x.strength + rng.range(-6, 6), true);
    groupOut.push.apply(groupOut, alive.slice(groupSurvivors));
    alive = alive.slice(0, groupSurvivors);
    rounds.push({ name: 'Group stage', eliminated: groupOut.map(x => x.nation) });

    const results = [];
    while (alive.length > 1) {
      const next = [];
      const ties = [];
      for (let i = 0; i < alive.length; i += 2) {
        const a = alive[i], b = alive[i + 1];
        if (!b) { next.push(a); continue; }
        // Strength decides, but a single match is volatile.
        const edge = (a.strength - b.strength) * 0.09;
        const aWins = rng.chance(U.clamp(0.5 + edge, 0.14, 0.86));
        const w = aWins ? a : b, l = aWins ? b : a;
        const wg = rng.int(1, 3), lg = rng.int(0, wg - 1);
        ties.push({ winner: w.nation, loser: l.nation, score: wg + '-' + lg });
        next.push(w);
      }
      rounds.push({ name: IN.roundName(alive.length), ties: ties });
      results.push(ties);
      alive = next;
    }

    const winner = alive[0];
    const finalTies = rounds[rounds.length - 1].ties || [];
    const runnerUp = finalTies.length ? finalTies[0].loser : null;

    // Golden boot from the winning nations' forwards.
    const topScorerPool = [];
    field.slice(0, 12).forEach(x => {
      const sq = IN.callUpSquad(x.nation, 23) || [];
      sq.forEach(p => { if (P.GROUP[p.pos[0]] === 'ATT' || p.pos[0] === 'CAM') topScorerPool.push(p); });
    });
    const topScorer = topScorerPool.length
      ? rng.weighted(U.sortBy(topScorerPool, p => p.ovr, true).slice(0, 20),
          p => Math.max(1, p.ovr - 70)) : null;

    return {
      id: tournament.id, name: tournament.name, year: tournament.year,
      winner: winner ? winner.nation : null,
      runnerUp: runnerUp,
      rounds: rounds,
      field: field.map(x => x.nation),
      topScorer: topScorer ? { id: topScorer.id, name: topScorer.name,
        nation: topScorer.nat, goals: rng.int(4, 8) } : null,
      userReached: userNation ? IN.howFar(rounds, userNation) : null
    };
  };

  IN.roundName = function (teamsLeft) {
    if (teamsLeft <= 2) return 'Final';
    if (teamsLeft <= 4) return 'Semi-finals';
    if (teamsLeft <= 8) return 'Quarter-finals';
    if (teamsLeft <= 16) return 'Round of 16';
    return 'Round of 32';
  };

  /** How far a nation got, as a readable string. */
  IN.howFar = function (rounds, nation) {
    let reached = 'Group stage';
    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      if (r.eliminated && r.eliminated.indexOf(nation) >= 0) return 'Group stage';
      if (!r.ties) continue;
      const tie = r.ties.find(t => t.winner === nation || t.loser === nation);
      if (!tie) continue;
      if (tie.loser === nation) return r.name === 'Final' ? 'Runners-up' : ('Lost in the ' + r.name.toLowerCase());
      reached = r.name === 'Final' ? 'Winners' : r.name;
    }
    return reached;
  };

  // ---- World awards -----------------------------------------------------
  /**
   * Ballon d'Or: the best individual season in world football, weighted by
   * club form, goals and the trophies their club won.
   */
  IN.ballonDor = function (state, rng) {
    const candidates = [];
    FCM.DB.players.forEach(p => {
      if (p.apps < 15) return;
      const rating = P.avgRating(p);
      if (rating < 6.8) return;
      const club = FCM.DB.clubById[p.clubId];
      if (!club) return;
      // Winning things matters as much as numbers.
      const trophies = (state.history || []).filter(h =>
        h.season === state.season && h.winner === club.id).length;
      const score = rating * 10 + p.goals * 0.9 + p.assists * 0.6 +
        trophies * 6 + club.rep * 0.06 +
        (P.GROUP[p.pos[0]] === 'ATT' ? 3 : 0);
      candidates.push({ p: p, score: score, trophies: trophies });
    });
    if (!candidates.length) return null;
    const ranked = U.sortBy(candidates, c => c.score, true).slice(0, 10);
    return ranked.map((c, i) => ({
      rank: i + 1, id: c.p.id, name: c.p.name, full: c.p.full,
      club: (FCM.DB.clubById[c.p.clubId] || {}).name || '',
      clubId: c.p.clubId, nation: c.p.nat, ovr: c.p.ovr,
      goals: c.p.goals, assists: c.p.assists,
      rating: U.round(P.avgRating(c.p), 2), score: Math.round(c.score)
    }));
  };

  /** World Player awards for keepers and young players. */
  IN.worldAwards = function (state) {
    const pool = FCM.DB.players.filter(p => p.apps >= 12);
    function best(fn, filter) {
      const list = filter ? pool.filter(filter) : pool;
      return U.sortBy(list, fn, true)[0] || null;
    }
    const gk = best(p => p.cleanSheets * 2 + P.avgRating(p) * 8, p => p.pos[0] === 'GK');
    const young = best(p => P.avgRating(p) * 10 + p.goals * 0.8 + p.assists * 0.5,
      p => p.age <= 21);
    return { keeper: gk, youngPlayer: young };
  };

  FCM.IN = IN;
})(window.FCM = window.FCM || {});
