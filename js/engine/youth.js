/* Youth academy: intake, scouting missions, development and promotion. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const Y = {};

  Y.INTAKE_DAY = 260;      // mid-March: annual academy intake
  Y.MAX_ACADEMY = 18;      // academy capacity
  Y.SCOUT_MIN_DAYS = 28;   // shortest scouting trip
  Y.SCOUT_MAX_DAYS = 70;

  const POS_POOL = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM',
    'LM', 'RM', 'LW', 'RW', 'ST', 'ST'];

  let nextYouthId = 900000;
  Y.setIdFloor = function (n) { if (n >= nextYouthId) nextYouthId = n + 1; };
  /**
   * The single allocator for every player the game invents - academy
   * prospects and the domestic professionals that fill out thin national
   * pools. One counter means restoring a save can never hand out an id that
   * is already in use.
   */
  Y.nextNewgenId = function () { return nextYouthId++; };

  /**
   * Nations with a distinct footballing character. Anywhere not listed is
   * still scoutable - it simply produces balanced players.
   */
  const SCOUT_BIAS = {
    Spain: 'technical', Netherlands: 'technical', Portugal: 'technical', Japan: 'technical',
    'Korea Republic': 'technical', Croatia: 'technical', Ukraine: 'technical',
    Brazil: 'flair', Argentina: 'flair', Colombia: 'flair', Chile: 'flair', Peru: 'flair',
    Mexico: 'flair', Ecuador: 'flair', Türkiye: 'flair', Egypt: 'flair', Angola: 'flair',
    France: 'athletic', Nigeria: 'athletic', Ghana: 'athletic', Senegal: 'athletic',
    "Côte d'Ivoire": 'athletic', Cameroon: 'athletic', Mali: 'athletic', Norway: 'athletic',
    'Congo DR': 'athletic', 'United States': 'athletic', Jamaica: 'athletic',
    'South Africa': 'athletic', Guinea: 'athletic', Australia: 'athletic',
    Italy: 'defensive', Serbia: 'defensive', Uruguay: 'defensive', Greece: 'defensive',
    Slovakia: 'defensive', Algeria: 'defensive', Morocco: 'defensive', Paraguay: 'defensive'
  };

  /**
   * Countries a scout can be sent to. Built from the full nation table, so
   * every country in world football is reachable - the cost of a trip tracks
   * how developed its game is, and the bargains are off the beaten path.
   */
  let scoutRegions = null;
  Object.defineProperty(Y, 'SCOUT_REGIONS', {
    get: function () {
      if (scoutRegions) return scoutRegions;
      scoutRegions = FCM.NT.ranked().map(n => ({
        country: n.name,
        label: n.name,
        confed: n.confed,
        strength: n.strength,
        // A trip to a football superpower costs several times one to a
        // minnow, but the talent there is worth more.
        cost: Math.round(Math.max(45000, Math.pow(n.strength / 60, 6) * 150000) / 5000) * 5000,
        bias: SCOUT_BIAS[n.name] || 'balanced'
      }));
      return scoutRegions;
    }
  });

  const BIAS_POS = {
    technical: ['CAM', 'CM', 'LW', 'RW', 'CF'],
    flair: ['LW', 'RW', 'CAM', 'ST'],
    athletic: ['ST', 'CB', 'CDM', 'LB', 'RB'],
    defensive: ['CB', 'CDM', 'LB', 'RB', 'GK'],
    balanced: null
  };

  function landHeight(pos) {
    if (pos === 'GK') return 190;
    if (pos === 'CB') return 187;
    if (pos === 'ST') return 183;
    return 178;
  }

  /**
   * Build one academy prospect.
   * opts: { nation, bias, qualityBonus }
   */
  Y.generateProspect = function (club, rng, seasonYear, usedNames, leagueCountry, opts) {
    const o = opts || {};
    const quality = club.youthRating || 3;
    const scouting = club.scouting || 3;

    const nat = o.nation || FCM.Names.pickNationality(rng, leagueCountry, 0.68);
    const nm = FCM.Names.generate(rng, nat, usedNames);
    // An explicit scouting brief overrides the region's stylistic bias.
    const posPool = o.positions || (o.bias && BIAS_POS[o.bias]) || POS_POOL;
    const pos = rng.pick(posPool);
    const age = rng.int(15, 17);

    // Most players can cover more than one role. Keepers are the exception.
    const positions = [pos];
    if (pos !== 'GK') {
      const related = P.relatedPositions(pos);
      // Versatility is its own trait: a few players cover three roles.
      const extras = rng.chance(0.12) ? 2 : (rng.chance(0.55) ? 1 : 0);
      for (let i = 0; i < extras && related.length; i++) {
        const pick = rng.weighted(related.map((r, idx) => ({ r: r, w: related.length - idx })),
          x => x.w).r;
        if (positions.indexOf(pick) < 0) positions.push(pick);
      }
    }

    // A strong academy at a big club averages a high-60s/low-70s ceiling;
    // genuine 85+ prospects are rare gems, not the norm.
    // Running a nation's FA lifts every prospect produced by that country.
    const faBonus = FCM.CR && FCM.G && FCM.G.state
      ? FCM.CR.faYouthBonus(FCM.G.state, nat) : 0;
    const potBase = 46 + quality * 3.6 + scouting * 0.8 + club.rep * 0.08 +
      (o.qualityBonus || 0) + faBonus;
    let pot = Math.round(rng.normalClamped(potBase, 7, 42, 86));
    if (rng.chance(0.015 + quality * 0.005)) pot = Math.min(93, pot + rng.int(6, 14)); // gem
    const ovr = U.clamp(Math.round(pot - rng.int(14, 30)), 38, 68);

    const isGK = pos === 'GK';
    function attr(mean, sd) { return Math.round(rng.normalClamped(mean, sd || 7, 25, 92)); }
    const base = ovr;
    const att = {
      pac: isGK ? 0 : attr(base + (['LW', 'RW', 'ST', 'LB', 'RB'].indexOf(pos) >= 0 ? 8 : 0)),
      sho: isGK ? 0 : attr(base + (['ST', 'CF', 'LW', 'RW'].indexOf(pos) >= 0 ? 6 : -12)),
      pas: isGK ? 0 : attr(base + (['CM', 'CAM', 'CDM'].indexOf(pos) >= 0 ? 6 : -4)),
      dri: isGK ? 0 : attr(base + (['LW', 'RW', 'CAM'].indexOf(pos) >= 0 ? 7 : -3)),
      def: isGK ? 0 : attr(base + (['CB', 'CDM', 'LB', 'RB'].indexOf(pos) >= 0 ? 7 : -18)),
      phy: isGK ? 0 : attr(base + (['CB', 'CDM', 'ST'].indexOf(pos) >= 0 ? 5 : -3)),
      gkd: isGK ? attr(base) : 0, gkh: isGK ? attr(base) : 0, gkk: isGK ? attr(base - 4) : 0,
      gkr: isGK ? attr(base) : 0, gks: isGK ? attr(35, 8) : 0, gkp: isGK ? attr(base) : 0
    };
    const sub = {};
    FCM.DB.SUB_KEYS.forEach(k => { sub[k] = attr(base, 9); });

    // The position modifiers above shape his profile but pull the weighted
    // average off target, so pin it back to his actual rating. Without this
    // a player's card and his stats disagree, and the gap compounds as he
    // develops.
    P.calibrateAttributes({ pos: [pos], att: att, ovr: ovr }, ovr);

    const pl = {
      id: nextYouthId++,
      name: nm.short, full: nm.full,
      pos: positions, ovr: ovr, pot: pot, age: age,
      height: rng.int(landHeight(pos) - 6, landHeight(pos) + 8),
      weight: rng.int(62, 85),
      clubId: club.id, nat: nat,
      foot: rng.chance(0.24) ? 'Left' : 'Right',
      weakFoot: rng.int(2, 4), skillMoves: rng.int(2, 4), rep: 1,
      workRate: { att: rng.int(1, 3), def: rng.int(1, 3) },
      traits: [], att: att, sub: sub,
      value: 0, wage: 0,
      contractUntil: seasonYear + rng.int(2, 4),
      seasonYear: seasonYear,
      form: 6.6, fitness: rng.int(90, 100), morale: rng.int(70, 95),
      injury: 0, injuryName: null, xp: 0,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0,
      yellow: 0, red: 0, minutes: 0, seasonRatings: [], suspended: 0,
      careerGoals: 0, careerApps: 0,
      // isYouth flips to false on promotion; isNewgen never changes, and is
      // what tells the save system this player has no entry in the static DB.
      isYouth: true, isNewgen: true,
      transferListed: false, loanedTo: null, loanFrom: null,
      promotedOn: null, academyUnrest: 0,
      injuryProne: U.round(rng.normalClamped(1, 0.35, 0.4, 2.2), 2),
      consistency: U.round(rng.normalClamped(1, 0.18, 0.5, 1.4), 2),
      bigMatch: U.round(rng.normalClamped(1, 0.2, 0.5, 1.5), 2),
      ambition: U.round(rng.normalClamped(1, 0.25, 0.4, 1.8), 2),
      loyalty: U.round(rng.normalClamped(1, 0.3, 0.3, 1.8), 2),
      valMult: 1, wageMult: 1,
      // Scouting accuracy: weaker scouting reports a wider potential range.
      scoutRange: Math.max(2, Math.round(12 - scouting * 1.8)),
      scoutedFrom: o.nation ? o.nation : null
    };
    pl.value = P.recalcValue(pl);
    pl.wage = Math.round(P.wageDemand(pl, club.rep) * 0.45 / 100) * 100;
    return pl;
  };

  /** Annual intake for a club. */
  Y.intake = function (club, rng, seasonYear, usedNames, leagueCountry, count) {
    const quality = club.youthRating || 3;
    const n = count !== undefined ? count
      : U.clamp(Math.round(rng.normalClamped(2 + quality * 0.7, 1.1, 1, 7)), 1, 7);
    const players = [];
    for (let i = 0; i < n; i++) {
      players.push(Y.generateProspect(club, rng, seasonYear, usedNames, leagueCountry));
    }
    return players;
  };

  /** The 3-5 kids every club already has when a career begins. */
  Y.startingIntake = function (club, rng, seasonYear, usedNames, leagueCountry) {
    return Y.intake(club, rng, seasonYear, usedNames, leagueCountry, rng.int(3, 5));
  };

  // ---- Scouting missions ---------------------------------------------
  Y.scoutCost = function (region, club, brief) {
    // Better scouting networks negotiate better rates; a narrow brief costs
    // more because the search takes longer.
    const focus = brief && brief.positions
      ? (brief.positions.length >= 4 ? 1.10 : (brief.positions.length >= 2 ? 1.20 : 1.35))
      : 1;
    return Math.round(region.cost * (1.25 - (club.scouting || 3) * 0.05) * focus);
  };

  /** What a scout can be told to look for. */
  Y.SCOUT_BRIEFS = [
    { id: 'any', label: 'Any position', positions: null },
    { id: 'GK', label: 'Goalkeeper', positions: ['GK'] },
    { id: 'DEF', label: 'Defender', positions: ['CB', 'CB', 'LB', 'RB'] },
    { id: 'CB', label: 'Centre-back', positions: ['CB'] },
    { id: 'FB', label: 'Full-back', positions: ['LB', 'RB'] },
    { id: 'MID', label: 'Midfielder', positions: ['CDM', 'CM', 'CM', 'CAM'] },
    { id: 'CDM', label: 'Defensive mid', positions: ['CDM'] },
    { id: 'CM', label: 'Central mid', positions: ['CM'] },
    { id: 'CAM', label: 'Attacking mid', positions: ['CAM'] },
    { id: 'WING', label: 'Winger', positions: ['LW', 'RW', 'LM', 'RM'] },
    { id: 'ATT', label: 'Forward', positions: ['ST', 'ST', 'CF', 'LW', 'RW'] },
    { id: 'ST', label: 'Striker', positions: ['ST'] }
  ];

  Y.briefById = function (id) {
    return Y.SCOUT_BRIEFS.find(b => b.id === id) || Y.SCOUT_BRIEFS[0];
  };

  /**
   * A narrower brief means fewer players to look at, so the trip returns
   * less - but exactly what you asked for.
   */
  Y.briefYieldPenalty = function (brief) {
    if (!brief.positions) return 1;
    if (brief.positions.length >= 4) return 0.82;   // a whole department
    if (brief.positions.length >= 2) return 0.68;
    return 0.55;                                    // one specific role
  };

  Y.startMission = function (club, region, rng, day, briefId) {
    const brief = Y.briefById(briefId);
    // Chasing one specific role takes longer.
    const spread = brief.positions ? 1.15 : 1;
    const days = Math.round(rng.int(Y.SCOUT_MIN_DAYS, Y.SCOUT_MAX_DAYS) * spread);
    return {
      country: region.country, label: region.label, bias: region.bias,
      brief: brief.id, briefLabel: brief.label,
      startedDay: day, returnsDay: day + days,
      cost: Y.scoutCost(region, club, brief)
    };
  };

  /** Resolve a finished mission into 1-3 prospects. */
  Y.resolveMission = function (club, mission, rng, seasonYear, usedNames) {
    const scouting = club.scouting || 3;
    const brief = Y.briefById(mission.brief);
    const base = 1.1 + scouting * 0.25;
    const count = U.clamp(
      Math.round(rng.normalClamped(base * Y.briefYieldPenalty(brief), 0.7, 0, 3)), 0, 3);
    // Where you look matters. A trip to Brazil turns up a different calibre
    // of teenager than one to the Faroe Islands, and the cost reflects it.
    const nation = FCM.NT.get(mission.country);
    const nationEdge = nation ? (nation.strength - 68) * 0.45 : 0;
    const players = [];
    for (let i = 0; i < count; i++) {
      players.push(Y.generateProspect(club, rng, seasonYear, usedNames, null, {
        nation: mission.country,
        bias: mission.bias,
        positions: brief.positions,
        // A dedicated trip finds better talent than the routine local intake,
        // and a focused brief finds a slightly better fit still.
        qualityBonus: 2 + scouting * 0.9 + (brief.positions ? 1.5 : 0) + nationEdge
      }));
    }
    return players;
  };

  // ---- Reports --------------------------------------------------------
  /** Scouted potential shown to the user - a range, not a number. */
  Y.scoutedPotential = function (pl) {
    const r = pl.scoutRange || 8;
    return { low: U.clamp(pl.pot - r, 40, 99), high: U.clamp(pl.pot + Math.round(r * 0.6), 40, 99) };
  };

  Y.starRating = function (value, max) {
    return U.clamp(Math.round((value / (max || 94)) * 5 * 2) / 2, 0.5, 5);
  };

  // ---- Unrest ---------------------------------------------------------
  /**
   * Prospects who are 18+ and still stuck in the academy grow restless.
   * Returns a status string for the UI.
   */
  Y.unrestLevel = function (pl) {
    if (pl.age < 18) return null;
    if (pl.academyUnrest >= 75) return 'demanding';
    if (pl.academyUnrest >= 40) return 'frustrated';
    if (pl.academyUnrest > 0) return 'restless';
    return null;
  };

  Y.UNREST_LABEL = {
    restless: 'Restless — wants first-team football',
    frustrated: 'Frustrated — pushing for a move',
    demanding: 'Demanding a transfer'
  };

  /** Weekly unrest tick. Returns true if the player has just walked out. */
  Y.tickUnrest = function (pl, rng) {
    if (pl.age < 18) { pl.academyUnrest = 0; return false; }
    // Ambitious players lose patience quicker; loyal ones hang on.
    const rate = 3.2 * (pl.ambition || 1) / (pl.loyalty || 1);
    pl.academyUnrest = U.clamp((pl.academyUnrest || 0) + rate, 0, 100);
    pl.morale = U.clamp(pl.morale - rate * 0.30, 5, 100);
    return pl.academyUnrest >= 100 && rng.chance(0.10);
  };

  /** Youth players train hard even without first-team minutes. */
  Y.developYouth = function (pl, club, rng, season) {
    P.develop(pl, {
      minutesShare: 0.30,
      facilities: club.facilities || 3,
      coaching: club.youthRating || 3,
      avgRating: 6.7,
      isYouth: true,
      season: season,
      rng: rng
    });
  };

  Y.upgradeCost = function (level) {
    return Math.round([0, 1.2e6, 3.5e6, 8e6, 18e6, 0][level] || 0);
  };

  FCM.Y = Y;
})(window.FCM = window.FCM || {});
