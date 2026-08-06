/* Fixtures, league tables, domestic cups, continental and international competitions. */
(function (FCM) {
  'use strict';

  const U = FCM.U;
  const C = {};

  // ---- Calendar constants -----------------------------------------
  C.SEASON_START = 40;    // ~10 Aug
  C.SEASON_END = 333;     // ~29 May
  C.SAT = 6, C.TUE = 2, C.WED = 3;

  /** All days in [from,to] falling on `dow`. */
  C.daysOn = function (startYear, from, to, dow) {
    const out = [];
    for (let d = from; d <= to; d++) if (U.dowOf(startYear, d) === dow) out.push(d);
    return out;
  };

  // ---- Fixture generation -----------------------------------------
  /**
   * Circle-method round robin. Returns rounds of [homeId, awayId] pairs
   * for a single cycle; call twice with sides reversed for a full season.
   */
  C.roundRobin = function (ids, rng) {
    const teams = ids.slice();
    if (teams.length % 2) teams.push(null); // bye
    if (rng) rng.shuffle(teams);
    const n = teams.length;
    const rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const a = teams[i], b = teams[n - 1 - i];
        if (a === null || b === null) continue;
        // Alternate home/away to keep the split even.
        pairs.push(((r + i) % 2 === 0) ? [a, b] : [b, a]);
      }
      rounds.push(pairs);
      // rotate all but the first
      teams.splice(1, 0, teams.pop());
    }
    return rounds;
  };

  /** Full double round robin: every side home and away. */
  C.doubleRoundRobin = function (ids, rng) {
    const first = C.roundRobin(ids, rng);
    const second = first.map(round => round.map(p => [p[1], p[0]]));
    if (rng) rng.shuffle(second);
    return first.concat(second);
  };

  /**
   * Spread `count` matchdays across the season, Saturdays first then
   * midweek overflow, keeping them in chronological order.
   */
  C.matchdayDates = function (startYear, count, opts) {
    const o = opts || {};
    const from = o.from || C.SEASON_START, to = o.to || C.SEASON_END;
    const sats = C.daysOn(startYear, from, to, C.SAT);
    const blocked = new Set(o.blocked || []);
    let pool = sats.filter(d => !blocked.has(d));

    if (pool.length < count) {
      // Add midweek rounds until we have enough slots.
      const mid = C.daysOn(startYear, from, to, C.TUE).filter(d => !blocked.has(d));
      pool = pool.concat(mid);
      pool.sort((a, b) => a - b);
    }
    if (pool.length <= count) return pool.slice(0, count);

    // Evenly sample the pool so the season is well spread.
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push(pool[Math.round(i * (pool.length - 1) / (count - 1))]);
    }
    // De-duplicate while preserving order.
    const seen = new Set();
    const uniq = out.filter(d => (seen.has(d) ? false : (seen.add(d), true)));
    let idx = 0;
    while (uniq.length < count && idx < pool.length) {
      if (!seen.has(pool[idx])) { uniq.push(pool[idx]); seen.add(pool[idx]); }
      idx++;
    }
    return uniq.sort((a, b) => a - b);
  };

  /** Build a league competition object with a full fixture list. */
  C.createLeague = function (league, clubIds, startYear, rng, blocked) {
    const rounds = C.doubleRoundRobin(clubIds, rng);
    const dates = C.matchdayDates(startYear, rounds.length, { blocked: blocked });
    const fixtures = [];
    rounds.forEach((pairs, i) => {
      pairs.forEach(p => {
        fixtures.push({
          comp: 'league:' + league.id, compName: league.name,
          round: i + 1, day: dates[i],
          home: p[0], away: p[1], played: false, hg: 0, ag: 0
        });
      });
    });
    return {
      id: 'league:' + league.id,
      type: 'league',
      name: league.name,
      leagueId: league.id,
      clubs: clubIds.slice(),
      fixtures: fixtures,
      matchdays: rounds.length,
      dates: dates
    };
  };

  // ---- Tables ------------------------------------------------------
  C.emptyRow = function (clubId) {
    return { club: clubId, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: [] };
  };

  /** Compute a table from played fixtures. */
  C.buildTable = function (clubIds, fixtures, opts) {
    const o = opts || {};
    const rows = {};
    clubIds.forEach(id => { rows[id] = C.emptyRow(id); });
    fixtures.forEach(f => {
      if (!f.played) return;
      const h = rows[f.home], a = rows[f.away];
      if (!h || !a) return;
      h.p++; a.p++;
      h.gf += f.hg; h.ga += f.ag;
      a.gf += f.ag; a.ga += f.hg;
      if (f.hg > f.ag) { h.w++; a.l++; h.pts += 3; h.form.push('W'); a.form.push('L'); }
      else if (f.hg < f.ag) { a.w++; h.l++; a.pts += 3; a.form.push('W'); h.form.push('L'); }
      else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('D'); a.form.push('D'); }
    });
    const list = Object.values(rows);
    list.forEach(r => { r.gd = r.gf - r.ga; r.form = r.form.slice(-6); });
    // Points, then goal difference, then goals scored - then a stable tiebreak.
    list.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf ||
      (o.nameOf ? o.nameOf(x.club).localeCompare(o.nameOf(y.club)) : x.club - y.club));
    list.forEach((r, i) => { r.pos = i + 1; });
    return list;
  };

  // ---- Knockout cups ----------------------------------------------
  /** Seeded/random knockout bracket over a set of entrants. */
  C.createCup = function (cfg, entrants, startYear, rng) {
    const cup = {
      id: cfg.id, type: 'cup', name: cfg.name,
      country: cfg.country || null,
      entrants: entrants.slice(),
      rounds: [], currentRound: 0,
      twoLegged: !!cfg.twoLegged,
      neutralFinal: cfg.neutralFinal !== false,
      dates: cfg.dates || [],
      winner: null, fixtures: []
    };
    C.drawRound(cup, entrants.slice(), 0, startYear, rng);
    return cup;
  };

  /** Draw one knockout round and append its fixtures. */
  C.drawRound = function (cup, teams, roundIndex, startYear, rng) {
    const list = rng ? rng.shuffle(teams.slice()) : teams.slice();
    // If not a power of two, give the strongest teams byes.
    let byes = [];
    let size = 1;
    while (size * 2 <= list.length) size *= 2;
    if (size < list.length) {
      const extra = list.length - size;
      // `extra` ties are played; the rest get byes.
      byes = list.slice(extra * 2);
      teams = list.slice(0, extra * 2);
    } else {
      teams = list;
    }
    const ties = [];
    const day = cup.dates[roundIndex] !== undefined ? cup.dates[roundIndex] : null;
    for (let i = 0; i < teams.length; i += 2) {
      const tie = {
        comp: cup.id, compName: cup.name, round: roundIndex + 1,
        day: day, home: teams[i], away: teams[i + 1],
        played: false, hg: 0, ag: 0, pens: null, winner: null
      };
      ties.push(tie);
      cup.fixtures.push(tie);
    }
    cup.rounds.push({ index: roundIndex, ties: ties, byes: byes });
    return ties;
  };

  C.roundName = function (teamsLeft, cupName) {
    if (teamsLeft <= 2) return 'Final';
    if (teamsLeft <= 4) return 'Semi-final';
    if (teamsLeft <= 8) return 'Quarter-final';
    if (teamsLeft <= 16) return 'Round of 16';
    if (teamsLeft <= 32) return 'Round of 32';
    if (teamsLeft <= 64) return 'Round of 64';
    return 'Preliminary round';
  };

  /** Winners of a completed round, plus any byes. */
  C.roundWinners = function (cup, roundIndex) {
    const r = cup.rounds[roundIndex];
    if (!r) return [];
    const w = r.ties.map(t => t.winner).filter(x => x !== null && x !== undefined);
    return w.concat(r.byes);
  };

  // ---- Continental competitions ------------------------------------
  /**
   * League-phase format (as used by the modern Champions League): every
   * club plays 8 different opponents, table of all 36.
   */
  C.createContinental = function (cfg, entrants, startYear, rng) {
    const comp = {
      id: cfg.id, type: 'continental', name: cfg.name,
      entrants: entrants.slice(),
      leaguePhase: { clubs: entrants.slice(), fixtures: [] },
      knockout: { rounds: [], fixtures: [] },
      phase: 'league', winner: null, dates: cfg.dates || {},
      matchesEach: cfg.matchesEach || 8
    };

    const n = entrants.length;
    const perTeam = comp.matchesEach;
    const played = {};
    entrants.forEach(id => { played[id] = []; });

    // Greedy pairing: repeatedly match the club with fewest games to a
    // valid opponent it has not yet faced.
    const dates = cfg.leagueDates || [];
    const totalMatches = n * perTeam / 2;
    let guard = 0;
    const pairs = [];
    while (pairs.length < totalMatches && guard++ < totalMatches * 60) {
      const pool = entrants.filter(id => played[id].length < perTeam);
      if (pool.length < 2) break;
      pool.sort((a, b) => played[a].length - played[b].length);
      const a = pool[0];
      const opts = pool.filter(b => b !== a && played[a].indexOf(b) < 0);
      if (!opts.length) break;
      const b = rng ? rng.pick(opts) : opts[0];
      played[a].push(b); played[b].push(a);
      pairs.push(rng && rng.chance(0.5) ? [a, b] : [b, a]);
    }

    pairs.forEach((p, i) => {
      const md = Math.floor(i / Math.max(1, Math.ceil(pairs.length / perTeam)));
      comp.leaguePhase.fixtures.push({
        comp: comp.id, compName: comp.name, round: md + 1,
        day: dates[Math.min(md, dates.length - 1)],
        home: p[0], away: p[1], played: false, hg: 0, ag: 0
      });
    });
    return comp;
  };

  // ---- International -----------------------------------------------
  C.INTERNATIONAL = {
    euros: { name: 'European Championship', teams: 24, cycle: 4, offset: 0, confed: 'europe' },
    worldcup: { name: 'World Cup', teams: 32, cycle: 4, offset: 2, confed: 'world' }
  };

  C.EUROPEAN_NATIONS = ['France', 'Spain', 'England', 'Germany', 'Italy', 'Portugal', 'Netherlands',
    'Belgium', 'Croatia', 'Denmark', 'Switzerland', 'Austria', 'Ukraine', 'Poland', 'Sweden',
    'Serbia', 'Turkey', 'Wales', 'Scotland', 'Czech Republic', 'Norway', 'Hungary', 'Greece',
    'Romania', 'Republic of Ireland', 'Slovakia', 'Slovenia', 'Albania', 'Finland', 'Iceland'];

  /** Which international tournament (if any) follows this season. */
  C.tournamentForYear = function (year) {
    // Euros 2028, 2032...  World Cup 2026, 2030...
    if (year % 4 === 0) return 'euros';
    if (year % 4 === 2) return 'worldcup';
    return null;
  };

  FCM.C = C;
})(window.FCM = window.FCM || {});
