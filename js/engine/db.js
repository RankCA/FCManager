/* Hydrates the generated FC26 data into live game objects. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const DB = { leagues: [], clubs: [], players: [], byId: {}, clubById: {}, leagueById: {} };

  // Some source records append the player's name in its native script
  // ("Mohamed Salah Hamed Ghaly محمد صلاح"). Strip anything outside the
  // Latin ranges so names render consistently.
  const NON_LATIN = /[^ -ɏḀ-ỿ'’.\-]/g;
  function cleanName(s) {
    return String(s || '').replace(NON_LATIN, '').replace(/\s{2,}/g, ' ').trim();
  }
  DB.cleanName = cleanName;

  /** Parse the "Medium/High" work-rate string into numbers 1-3. */
  function workRate(s) {
    const map = { Low: 1, Medium: 2, High: 3 };
    const parts = String(s || 'Medium/Medium').split('/');
    return { att: map[parts[0]] || 2, def: map[parts[1]] || 2 };
  }

  /** Detailed attributes, keyed exactly as generated in db-players.js. */
  DB.SUB_KEYS = ['cro', 'fin', 'hea', 'spa', 'vol', 'drb', 'cur', 'fkc', 'lpa', 'bal', 'acc',
    'spd', 'agi', 'rea', 'bala', 'shp', 'jmp', 'sta', 'str', 'lsh', 'agg', 'int', 'posi',
    'vis', 'pen', 'com', 'mrk', 'tkl', 'sli'];

  /** Human labels for the player profile screen. */
  DB.SUB_LABELS = {
    cro: 'Crossing', fin: 'Finishing', hea: 'Heading', spa: 'Short Passing', vol: 'Volleys',
    drb: 'Dribbling', cur: 'Curve', fkc: 'FK Accuracy', lpa: 'Long Passing', bal: 'Ball Control',
    acc: 'Acceleration', spd: 'Sprint Speed', agi: 'Agility', rea: 'Reactions', bala: 'Balance',
    shp: 'Shot Power', jmp: 'Jumping', sta: 'Stamina', str: 'Strength', lsh: 'Long Shots',
    agg: 'Aggression', int: 'Interceptions', posi: 'Positioning', vis: 'Vision',
    pen: 'Penalties', com: 'Composure', mrk: 'Marking', tkl: 'Standing Tackle', sli: 'Sliding Tackle'
  };

  DB.build = function (rng, startYear) {
    const raw = FCM.DB_PLAYERS;
    const cols = raw.cols;
    const idx = {};
    cols.forEach((c, i) => {
      if (idx[c] !== undefined) throw new Error('duplicate data column: ' + c);
      idx[c] = i;
    });

    // Loading a save rebuilds the world on top of a game already in memory.
    // The lookups have to start empty or newgens from the previous career
    // linger, and hydrate then skips their replacements as "already present".
    DB.byId = {};
    DB.clubById = {};
    DB.leagueById = {};

    DB.leagues = FCM.DB_LEAGUES.map(l => Object.assign({}, l));
    DB.leagues.forEach(l => { DB.leagueById[l.id] = l; });

    DB.clubs = FCM.DB_CLUBS.map(c => {
      const club = Object.assign({}, c, {
        squad: [],
        youth: [],
        facilities: 3,
        coaching: 3,
        youthRating: 3,
        scouting: 3,
        form: [],
        morale: 70
      });
      // Facilities scale with club stature, with variation.
      const t = U.clamp(Math.round(c.rep / 20) + rng.int(-1, 1), 1, 5);
      club.facilities = t;
      club.coaching = U.clamp(t + rng.int(-1, 1), 1, 5);
      club.youthRating = U.clamp(t + rng.int(-1, 1), 1, 5);
      club.scouting = U.clamp(t + rng.int(-1, 1), 1, 5);
      DB.clubById[club.id] = club;
      return club;
    });

    DB.players = raw.rows.map(row => {
      const g = k => row[idx[k]];
      const isGK = String(g('pos')).split('|')[0] === 'GK';

      const att = {
        pac: g('pac'), sho: g('sho'), pas: g('pas'),
        dri: g('dri'), def: g('def'), phy: g('phy'),
        gkd: g('gkd'), gkh: g('gkh'), gkk: g('gkk'),
        gkr: g('gkr'), gks: g('gks'), gkp: g('gkp')
      };
      const sub = {};
      DB.SUB_KEYS.forEach(k => { sub[k] = row[idx[k]]; });

      const ovr = g('ovr');
      const age = g('age');
      const pot = Math.max(ovr, g('pot'));
      const realValue = g('val') || 0;
      const realWage = g('wage') || 0;

      const pl = {
        id: g('id'),
        name: cleanName(g('name')),
        full: cleanName(g('full')) || cleanName(g('name')),
        pos: String(g('pos')).split('|').filter(Boolean),
        ovr: ovr,
        pot: pot,
        age: age,
        height: g('h'),
        weight: g('w'),
        clubId: g('club'),
        nat: g('nat'),
        foot: g('foot') === 'L' ? 'Left' : 'Right',
        weakFoot: g('wf'),
        skillMoves: g('sm'),
        rep: g('ir'),
        workRate: workRate(g('wr')),
        traits: String(g('tr') || '').split('|').filter(Boolean),
        att: att,
        sub: sub,
        // --- mutable career state ---
        value: realValue,
        wage: realWage,
        contractUntil: g('conx'),
        seasonYear: startYear,
        form: 6.6,
        fitness: rng.int(88, 100),
        morale: rng.int(60, 88),
        injury: 0,
        injuryName: null,
        xp: 0,
        apps: 0, goals: 0, assists: 0, cleanSheets: 0,
        yellow: 0, red: 0, minutes: 0,
        seasonRatings: [],
        careerGoals: 0, careerApps: 0,
        isYouth: false,
        transferListed: false,
        loanedTo: null, loanFrom: null,
        // --- hidden personality traits ---
        injuryProne: U.round(rng.normalClamped(1, 0.35, 0.4, 2.2), 2),
        consistency: U.round(rng.normalClamped(1, 0.18, 0.5, 1.4), 2),
        bigMatch: U.round(rng.normalClamped(1, 0.2, 0.5, 1.5), 2),
        ambition: U.round(rng.normalClamped(1, 0.25, 0.4, 1.8), 2),
        loyalty: U.round(rng.normalClamped(1, 0.3, 0.3, 1.8), 2)
      };

      // Anchor the valuation/wage curves to this player's real FC26 figures
      // so progression stays proportionate to who they actually are.
      const modelVal = P.baseValue(ovr, age, pot);
      pl.valMult = realValue > 0 ? U.clamp(realValue / modelVal, 0.25, 4) : 1;
      const modelWage = 45 * Math.exp((ovr - 40) * 0.148);
      const clubRep = (DB.clubById[pl.clubId] || {}).rep || 60;
      const wageRepMult = 0.72 + 0.85 * (clubRep / 100);
      pl.wageMult = realWage > 0
        ? U.clamp(realWage / (modelWage * wageRepMult), 0.3, 3.5) : 1;

      DB.byId[pl.id] = pl;
      const club = DB.clubById[pl.clubId];
      if (club) club.squad.push(pl.id);
      return pl;
    });

    // Real players from leagues the game does not model, so nations like
    // Egypt and Côte d'Ivoire can field a proper side.
    DB.players = DB.players.concat(buildIntl(rng, startYear));

    // Sort each squad strongest-first so default line-ups are sensible.
    DB.clubs.forEach(c => {
      c.squad.sort((a, b) => DB.byId[b].ovr - DB.byId[a].ovr);
    });

    return DB;
  };

  /**
   * Hydrate db-intl.js: real FC26 players whose clubs sit outside the 22
   * modelled leagues. They belong to no in-game club, so they are flagged
   * `abroad` and stay out of the transfer market and free-agent searches -
   * they exist so their countries can name a real squad.
   */
  function buildIntl(rng, startYear) {
    const raw = FCM.DB_INTL;
    if (!raw || !raw.rows) return [];
    const idx = {};
    raw.cols.forEach((c, i) => {
      if (idx[c] !== undefined) throw new Error('duplicate intl data column: ' + c);
      idx[c] = i;
    });
    return raw.rows.map(row => {
      const g = k => row[idx[k]];
      const att = {
        pac: g('pac'), sho: g('sho'), pas: g('pas'),
        dri: g('dri'), def: g('def'), phy: g('phy'),
        gkd: g('gkd'), gkh: g('gkh'), gkk: g('gkk'),
        gkr: g('gkr'), gks: g('gks'), gkp: g('gkp')
      };
      const sub = {};
      DB.SUB_KEYS.forEach(k => { sub[k] = row[idx[k]]; });
      const ovr = g('ovr');
      const pl = {
        id: g('id'),
        name: cleanName(g('name')),
        full: cleanName(g('full')) || cleanName(g('name')),
        pos: String(g('pos')).split('|').filter(Boolean),
        ovr: ovr, pot: Math.max(ovr, g('pot')), age: g('age'),
        height: g('h'), weight: g('w'),
        clubId: 0, nat: g('nat'),
        foot: g('foot') === 'L' ? 'Left' : 'Right',
        weakFoot: g('wf'), skillMoves: g('sm'), rep: g('ir'),
        workRate: workRate(g('wr')),
        traits: [], att: att, sub: sub,
        value: g('val') || 0, wage: g('wage') || 0,
        contractUntil: startYear + rng.int(1, 4),
        seasonYear: startYear,
        form: 6.6, fitness: rng.int(88, 100), morale: rng.int(60, 88),
        injury: 0, injuryName: null, xp: 0,
        apps: 0, goals: 0, assists: 0, cleanSheets: 0,
        yellow: 0, red: 0, minutes: 0, seasonRatings: [],
        careerGoals: 0, careerApps: 0,
        isYouth: false,
        abroad: true,
        foreignClub: cleanName(g('xclub')),
        transferListed: false, loanedTo: null, loanFrom: null,
        injuryProne: U.round(rng.normalClamped(1, 0.35, 0.4, 2.2), 2),
        consistency: U.round(rng.normalClamped(1, 0.18, 0.5, 1.4), 2),
        bigMatch: U.round(rng.normalClamped(1, 0.2, 0.5, 1.5), 2),
        ambition: U.round(rng.normalClamped(1, 0.25, 0.4, 1.8), 2),
        loyalty: U.round(rng.normalClamped(1, 0.3, 0.3, 1.8), 2),
        valMult: 1, wageMult: 1
      };
      const modelVal = P.baseValue(ovr, pl.age, pl.pot);
      pl.valMult = pl.value > 0 ? U.clamp(pl.value / modelVal, 0.25, 4) : 1;
      DB.byId[pl.id] = pl;
      return pl;
    });
  }

  DB.clubsInLeague = function (leagueId) {
    return DB.clubs.filter(c => c.league === leagueId);
  };
  DB.squadOf = function (club) {
    if (!club) return [];
    return club.squad.map(id => DB.byId[id]).filter(Boolean);
  };
  DB.leagueOf = function (club) { return club ? DB.leagueById[club.league] : null; };

  FCM.DB = DB;
})(window.FCM = window.FCM || {});
