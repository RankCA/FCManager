/* Career record, national-team jobs and the FA chairmanship. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const CR = {};

  // ---- Career state -----------------------------------------------------
  CR.blank = function () {
    return {
      clubs: [],            // every job held: {club, from, to, games, w, d, l}
      nation: null,         // current national team, if any
      nationJobs: [],
      trophies: [],         // {season, comp, club, kind}
      tournaments: [],      // international tournament results
      biggestWin: null,
      worstDefeat: null,
      longestWinStreak: 0,
      currentWinStreak: 0,
      longestUnbeaten: 0,
      currentUnbeaten: 0,
      games: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0,
      biggestSigning: null,
      biggestSale: null,
      coached: {},          // playerId -> peak season under this manager
      ballonDors: [],
      faRole: null          // { country, since, investment, youthLevel }
    };
  };

  /** Ensure the structure exists on an older save. */
  CR.ensure = function (state) {
    if (!state.career) state.career = CR.blank();
    return state.career;
  };

  // ---- Match record -----------------------------------------------------
  CR.recordMatch = function (state, fixture, res) {
    const cr = CR.ensure(state);
    const isHome = fixture.home === state.userClubId;
    const us = isHome ? res.homeGoals : res.awayGoals;
    const them = isHome ? res.awayGoals : res.homeGoals;
    const oppId = isHome ? fixture.away : fixture.home;
    const opp = FCM.DB.clubById[oppId];

    cr.games++;
    cr.goalsFor += us; cr.goalsAgainst += them;
    const entry = { us: us, them: them, opp: opp ? opp.name : '?',
      season: state.season, comp: fixture.compName, day: fixture.day };

    if (us > them) {
      cr.wins++; cr.currentWinStreak++; cr.currentUnbeaten++;
      if (!cr.biggestWin || (us - them) > (cr.biggestWin.us - cr.biggestWin.them) ||
          ((us - them) === (cr.biggestWin.us - cr.biggestWin.them) && us > cr.biggestWin.us)) {
        cr.biggestWin = entry;
      }
    } else if (us === them) {
      cr.draws++; cr.currentWinStreak = 0; cr.currentUnbeaten++;
    } else {
      cr.losses++; cr.currentWinStreak = 0; cr.currentUnbeaten = 0;
      if (!cr.worstDefeat || (them - us) > (cr.worstDefeat.them - cr.worstDefeat.us)) {
        cr.worstDefeat = entry;
      }
    }
    cr.longestWinStreak = Math.max(cr.longestWinStreak, cr.currentWinStreak);
    cr.longestUnbeaten = Math.max(cr.longestUnbeaten, cr.currentUnbeaten);

    // Track everyone who plays for us, and their best season while here.
    const ours = isHome ? res.homeRatings : res.awayRatings;
    ours.forEach(r => {
      const p = FCM.DB.byId[r.id];
      if (!p) return;
      CR.touchCoached(state, p);
    });
    return cr;
  };

  /** Note a player as coached, keeping his peak season under this manager. */
  CR.touchCoached = function (state, p) {
    const cr = CR.ensure(state);
    const rec = cr.coached[p.id] || {
      id: p.id, name: p.name, full: p.full, pos: p.pos[0],
      peakOvr: 0, peakSeason: state.season, seasons: 0,
      apps: 0, goals: 0, assists: 0, ratingSum: 0, ratingGames: 0,
      firstSeason: state.season
    };
    // "Peak" is the season in which he was at his highest rating for us.
    if (p.ovr > rec.peakOvr) {
      rec.peakOvr = p.ovr;
      rec.peakSeason = state.season;
      rec.peakClub = (FCM.DB.clubById[p.clubId] || {}).name || '';
    }
    cr.coached[p.id] = rec;
    return rec;
  };

  /** Fold a completed season's stats into each coached player's record. */
  CR.closeSeason = function (state) {
    const cr = CR.ensure(state);
    const club = FCM.DB.clubById[state.userClubId];
    if (!club) return;
    FCM.DB.squadOf(club).forEach(p => {
      const rec = cr.coached[p.id];
      if (!rec || !p.apps) return;
      rec.seasons++;
      rec.apps += p.apps;
      rec.goals += p.goals;
      rec.assists += p.assists;
      if (p.seasonRatings.length) {
        rec.ratingSum += P.avgRating(p) * p.apps;
        rec.ratingGames += p.apps;
      }
      // Capture the statistical peak season, not just the rating peak.
      const seasonScore = P.avgRating(p) * 10 + p.goals * 0.8 + p.assists * 0.5;
      if (!rec.bestSeasonScore || seasonScore > rec.bestSeasonScore) {
        rec.bestSeasonScore = seasonScore;
        rec.bestSeason = {
          season: state.season, ovr: p.ovr, apps: p.apps,
          goals: p.goals, assists: p.assists,
          rating: U.round(P.avgRating(p), 2),
          club: club.name
        };
      }
    });
  };

  /** The ten best players this manager has worked with. */
  CR.bestCoached = function (state, limit) {
    const cr = CR.ensure(state);
    const list = Object.values(cr.coached).filter(r => r.bestSeason);
    return U.sortBy(list, r => r.peakOvr * 1.4 + (r.bestSeasonScore || 0) * 0.5 +
      r.seasons * 2, true).slice(0, limit || 10);
  };

  // ---- Transfers --------------------------------------------------------
  CR.recordTransfer = function (state, deal, incoming) {
    const cr = CR.ensure(state);
    if (!deal.fee || deal.loan) return;
    const other = FCM.DB.clubById[incoming ? deal.from : deal.to];
    const entry = {
      name: deal.name, fee: deal.fee, season: state.season,
      club: other ? other.name : 'Free agent'
    };
    if (incoming) {
      if (!cr.biggestSigning || deal.fee > cr.biggestSigning.fee) cr.biggestSigning = entry;
    } else if (!cr.biggestSale || deal.fee > cr.biggestSale.fee) {
      cr.biggestSale = entry;
    }
  };

  CR.recordTrophy = function (state, compName, kind) {
    const cr = CR.ensure(state);
    const club = FCM.DB.clubById[state.userClubId];
    cr.trophies.push({
      season: state.season, comp: compName,
      club: club ? club.name : '', kind: kind || 'club'
    });
  };

  // ---- National team jobs ----------------------------------------------
  /**
   * Whether a nation would offer this manager their job. Reputation comes
   * from trophies and win rate.
   */
  CR.managerReputation = function (state) {
    const cr = CR.ensure(state);
    const winRate = cr.games ? cr.wins / cr.games : 0;
    return U.clamp(cr.trophies.length * 9 + winRate * 45 +
      Math.min(20, cr.games * 0.05), 0, 100);
  };

  CR.nationJobAvailable = function (state, nation) {
    const rep = CR.managerReputation(state);
    const strength = FCM.IN.nationStrength(nation);
    // Stronger nations demand a bigger name.
    const required = U.clamp((strength - 62) * 5.5, 5, 85);
    return rep >= required;
  };

  /** Nations that would take this manager, best first. */
  CR.availableNationJobs = function (state) {
    const all = [];
    for (const cid in FCM.IN.NATION_CONFED) {
      FCM.IN.NATION_CONFED[cid].forEach(n => {
        const strength = FCM.IN.nationStrength(n);
        if (strength <= 0) return;
        if (!CR.nationJobAvailable(state, n)) return;
        all.push({ nation: n, strength: U.round(strength, 1), confed: cid });
      });
    }
    return U.sortBy(all, x => x.strength, true).slice(0, 40);
  };

  CR.takeNationJob = function (state, nation) {
    const cr = CR.ensure(state);
    if (cr.nation) {
      const prev = cr.nationJobs.find(j => j.nation === cr.nation && !j.to);
      if (prev) prev.to = state.season;
    }
    cr.nation = nation;
    cr.nationJobs.push({ nation: nation, from: state.season, to: null,
      tournaments: [] });
    return cr;
  };

  CR.leaveNationJob = function (state) {
    const cr = CR.ensure(state);
    if (!cr.nation) return;
    const job = cr.nationJobs.find(j => j.nation === cr.nation && !j.to);
    if (job) job.to = state.season;
    cr.nation = null;
  };

  // ---- Changing clubs ---------------------------------------------------
  /** Close out the current spell and file it in the career history. */
  CR.closeClubSpell = function (state, outcome) {
    const cr = CR.ensure(state);
    const club = FCM.DB.clubById[state.userClubId];
    if (!club) return;
    cr.clubs.push({
      club: club.name, clubId: club.id,
      from: cr.currentFrom !== undefined ? cr.currentFrom : state.startYear,
      to: state.season,
      games: cr.games - (cr.spellStartGames || 0),
      wins: cr.wins - (cr.spellStartWins || 0),
      trophies: cr.trophies.filter(t => t.club === club.name).length,
      outcome: outcome || 'left'
    });
    cr.spellStartGames = cr.games;
    cr.spellStartWins = cr.wins;
    cr.currentFrom = state.season;
  };

  /**
   * Clubs that would appoint this manager right now. Bigger clubs want a
   * bigger reputation; a manager who just walked out is slightly less
   * attractive than one who won something.
   */
  CR.availableClubJobs = function (state) {
    const rep = CR.managerReputation(state);
    const out = [];
    FCM.DB.clubs.forEach(c => {
      if (c.id === state.userClubId) return;
      // Roughly: a 90-reputation club needs a top manager.
      const required = U.clamp((c.rep - 42) * 1.55, 0, 92);
      if (rep + 6 < required) return;
      const league = FCM.DB.leagueOf(c);
      out.push({
        club: c, rep: c.rep,
        league: league ? league.name : '', country: league ? league.country : '',
        budget: c.transferBudget,
        appeal: rep - required
      });
    });
    return U.sortBy(out, x => x.rep, true).slice(0, 60);
  };

  /** Move the manager to a new club. */
  CR.joinClub = function (state, clubId) {
    const cr = CR.ensure(state);
    state.userClubId = clubId;
    // A fresh start: the board's patience resets with the new job.
    state.board.confidence = 68;
    state.board.warned = false;
    state.daysInJob = 0;
    state.sacked = false;
    cr.currentFrom = state.season;
    return FCM.DB.clubById[clubId];
  };

  // ---- FA chairmanship --------------------------------------------------
  /**
   * Four things a chairman can build, each with five tiers. They are funded
   * from a grant the association earns, not from your club's transfer kitty.
   */
  CR.FA_PROGRAMMES = [
    {
      id: 'youth', label: 'Youth Development', icon: '🌱',
      blurb: 'Raises the ceiling of every prospect born in the country.',
      effect: l => '+' + (l * 1.6).toFixed(1) + ' potential on national prospects',
      costs: [0, 9e6, 22e6, 48e6, 95e6]
    },
    {
      id: 'coaching', label: 'Coaching Education', icon: '📋',
      blurb: 'Every club in the country develops players faster.',
      effect: l => '+' + (l * 0.16).toFixed(2) + ' coaching at domestic clubs',
      costs: [0, 7e6, 18e6, 40e6, 80e6]
    },
    {
      id: 'facilities', label: 'Grassroots Facilities', icon: '🏟',
      blurb: 'More children play, so academies produce more of them.',
      effect: l => '+' + (l * 0.5).toFixed(1) + ' prospects per intake nationwide',
      costs: [0, 6e6, 15e6, 34e6, 70e6]
    },
    {
      id: 'pathway', label: 'Elite Pathway', icon: '🎯',
      blurb: 'Talented youngsters break into first teams earlier.',
      effect: l => 'Graduates develop ' + (l * 12) + '% faster',
      costs: [0, 8e6, 20e6, 44e6, 88e6]
    }
  ];

  CR.TIER_LABELS = ['Neglected', 'Developing', 'Solid', 'Respected', 'World-leading'];

  // Kept for older saves that only knew about the youth track.
  CR.FA_LEVELS = [
    { level: 1, label: 'Neglected', bonus: 0, cost: 0 },
    { level: 2, label: 'Developing', bonus: 1.6, cost: 9e6 },
    { level: 3, label: 'Solid', bonus: 3.2, cost: 22e6 },
    { level: 4, label: 'Respected', bonus: 4.8, cost: 48e6 },
    { level: 5, label: 'World-leading', bonus: 6.4, cost: 95e6 }
  ];

  CR.programmeById = function (id) {
    return CR.FA_PROGRAMMES.find(p => p.id === id) || CR.FA_PROGRAMMES[0];
  };

  /** Migrate an older faRole to the multi-programme shape. */
  function normaliseFA(cr) {
    if (!cr.faRole) return null;
    if (!cr.faRole.programmes) {
      cr.faRole.programmes = {
        youth: cr.faRole.youthLevel || 1, coaching: 1, facilities: 1, pathway: 1
      };
    }
    if (cr.faRole.grant === undefined) cr.faRole.grant = 0;
    if (cr.faRole.prestige === undefined) cr.faRole.prestige = 0;
    return cr.faRole;
  }
  CR.normaliseFA = normaliseFA;

  CR.faTier = function (state, programmeId) {
    const cr = CR.ensure(state);
    const role = normaliseFA(cr);
    if (!role) return 1;
    return role.programmes[programmeId] || 1;
  };

  CR.faUpgradeCost = function (state, programmeId) {
    const cr = CR.ensure(state);
    const role = normaliseFA(cr);
    if (!role) return null;
    const prog = CR.programmeById(programmeId || 'youth');
    const tier = role.programmes[prog.id] || 1;
    return tier >= 5 ? null : prog.costs[tier];
  };

  CR.takeFARole = function (state, country) {
    const cr = CR.ensure(state);
    cr.faRole = {
      country: country, since: state.season, youthLevel: 1, invested: 0,
      programmes: { youth: 1, coaching: 1, facilities: 1, pathway: 1 },
      grant: 0, prestige: 0
    };
    return cr.faRole;
  };

  /**
   * Annual grant from the association. Bigger nations and recent success on
   * the pitch mean more to spend.
   */
  CR.faAnnualGrant = function (state) {
    const cr = CR.ensure(state);
    const role = normaliseFA(cr);
    if (!role) return 0;
    const strength = FCM.IN ? FCM.IN.nationStrength(role.country) : 70;
    const base = Math.pow(U.clamp(strength, 40, 92) / 60, 3.4) * 11e6;
    return Math.round(base * (1 + role.prestige * 0.04));
  };

  CR.payFAGrant = function (state) {
    const cr = CR.ensure(state);
    const role = normaliseFA(cr);
    if (!role) return 0;
    const grant = CR.faAnnualGrant(state);
    role.grant += grant;
    return grant;
  };

  /** Spend the association's money on one of the four programmes. */
  CR.investFA = function (state, programmeId) {
    const cr = CR.ensure(state);
    const role = normaliseFA(cr);
    if (!role) return { ok: false, reason: 'You do not hold an FA role.' };
    const prog = CR.programmeById(programmeId);
    const cost = CR.faUpgradeCost(state, prog.id);
    if (!cost) return { ok: false, reason: prog.label + ' is already world-leading.' };
    if (role.grant < cost) {
      return { ok: false,
        reason: 'The association has ' + U.money(role.grant) + '; this needs ' +
          U.money(cost) + '.' };
    }
    role.grant -= cost;
    role.invested += cost;
    role.programmes[prog.id]++;
    if (prog.id === 'youth') role.youthLevel = role.programmes.youth;
    return { ok: true, tier: role.programmes[prog.id], programme: prog };
  };

  // ---- Programme effects ------------------------------------------------
  /** Extra potential for newgens from the country this manager runs. */
  CR.faYouthBonus = function (state, nation) {
    const cr = state && state.career;
    if (!cr || !cr.faRole) return 0;
    const role = normaliseFA(cr);
    if (role.country !== nation) return 0;
    return ((role.programmes.youth || 1) - 1) * 1.6;
  };

  /** Coaching lift for every club in the chairman's country. */
  CR.faCoachingBonus = function (state, club) {
    const cr = state && state.career;
    if (!cr || !cr.faRole || !club) return 0;
    const role = normaliseFA(cr);
    const league = FCM.DB.leagueOf(club);
    if (!league || league.country !== role.country) return 0;
    return ((role.programmes.coaching || 1) - 1) * 0.16;
  };

  /** Extra bodies in each academy intake nationwide. */
  CR.faIntakeBonus = function (state, club) {
    const cr = state && state.career;
    if (!cr || !cr.faRole || !club) return 0;
    const role = normaliseFA(cr);
    const league = FCM.DB.leagueOf(club);
    if (!league || league.country !== role.country) return 0;
    return ((role.programmes.facilities || 1) - 1) * 0.5;
  };

  /** Faster development for graduates from that country. */
  CR.faPathwayMult = function (state, player) {
    const cr = state && state.career;
    if (!cr || !cr.faRole || !player) return 1;
    const role = normaliseFA(cr);
    if (player.nat !== role.country) return 1;
    return 1 + ((role.programmes.pathway || 1) - 1) * 0.12;
  };

  /** Overall standing of the association, 0-100. */
  CR.faPrestige = function (state) {
    const cr = CR.ensure(state);
    const role = normaliseFA(cr);
    if (!role) return 0;
    const tiers = CR.FA_PROGRAMMES.reduce((n, p) => n + (role.programmes[p.id] || 1), 0);
    return Math.round((tiers - 4) / 16 * 100);
  };

  /** Legacy accessor used by older UI code. */
  CR.faLevel = function (state) {
    const cr = CR.ensure(state);
    const role = normaliseFA(cr);
    if (!role) return null;
    const lvl = role.programmes.youth || 1;
    return { level: lvl, label: CR.TIER_LABELS[lvl - 1], bonus: (lvl - 1) * 1.6 };
  };

  FCM.CR = CR;
})(window.FCM = window.FCM || {});
