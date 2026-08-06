/* The world's national teams: registry, and topping up thin player pools.

   The game models 22 leagues in full, so a nation whose players ply their
   trade elsewhere barely exists in the data. Left alone, AFCON could only
   field 19 of its 24 places and the Asian Cup five. Two things fix that:
   db-intl.js carries real FC26 players from unmodelled leagues, and anything
   still short is topped up here with generated domestic-league professionals
   so every nation can name a legal 26-man squad. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const NT = {};

  /** FIFA's minimum squad size, and what we guarantee every nation. */
  NT.MIN_POOL = 26;

  const POS_SHAPE = ['GK', 'GK', 'GK', 'CB', 'CB', 'CB', 'CB', 'CB', 'LB', 'LB', 'RB', 'RB',
    'CDM', 'CDM', 'CM', 'CM', 'CM', 'CAM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'ST', 'ST',
    'CF', 'CB', 'CM', 'ST'];

  let list = null, byName = null, byConfed = null;

  function index() {
    if (list) return;
    list = (FCM.DB_NATIONS || []).map(n => Object.assign({}, n));
    byName = {};
    byConfed = {};
    list.forEach(n => {
      byName[n.name] = n;
      (byConfed[n.confed] = byConfed[n.confed] || []).push(n);
    });
  }

  NT.all = function () { index(); return list; };
  NT.get = function (name) { index(); return byName[name] || null; };
  NT.inConfed = function (cid) { index(); return (byConfed[cid] || []).slice(); };
  NT.confedOf = function (name) { const n = NT.get(name); return n ? n.confed : null; };

  /** Every nation name, alphabetical - for pickers and scouting. */
  NT.names = function () {
    return NT.all().map(n => n.name).sort();
  };

  /**
   * Nations sorted by footballing standing. Used to offer sensible defaults
   * where a full alphabetical list would bury the recognisable ones.
   */
  NT.ranked = function () {
    return U.sortBy(NT.all().slice(), n => n.strength, true);
  };

  // ---- Topping up thin pools ------------------------------------------
  /**
   * One generated professional playing in his own country's league. He is
   * not attached to a modelled club, so he never appears in transfer lists
   * or free-agent searches - he exists to make his nation selectable.
   */
  function makeDomestic(nation, rng, seasonYear, usedNames, targetOvr, pos) {
    const nm = FCM.Names.generate(rng, nation.kin || nation.name, usedNames);
    const isGK = pos === 'GK';
    const ovr = U.clamp(Math.round(rng.normalClamped(targetOvr, 4.5, 40, 88)), 40, 88);
    const age = rng.int(20, 33);
    // A domestic-league player is mostly what he already is; the young ones
    // still have somewhere to go.
    const pot = U.clamp(ovr + (age <= 23 ? rng.int(2, 10) : rng.int(0, 3)), ovr, 90);

    const positions = [pos];
    if (!isGK) {
      const related = P.relatedPositions(pos);
      if (related.length && rng.chance(0.5)) positions.push(related[0]);
    }

    function attr(mean, sd) { return Math.round(rng.normalClamped(mean, sd || 7, 25, 92)); }
    const att = {
      pac: isGK ? 0 : attr(ovr + (['LW', 'RW', 'ST', 'LB', 'RB'].indexOf(pos) >= 0 ? 7 : 0)),
      sho: isGK ? 0 : attr(ovr + (['ST', 'CF', 'LW', 'RW'].indexOf(pos) >= 0 ? 6 : -12)),
      pas: isGK ? 0 : attr(ovr + (['CM', 'CAM', 'CDM'].indexOf(pos) >= 0 ? 6 : -4)),
      dri: isGK ? 0 : attr(ovr + (['LW', 'RW', 'CAM'].indexOf(pos) >= 0 ? 7 : -3)),
      def: isGK ? 0 : attr(ovr + (['CB', 'CDM', 'LB', 'RB'].indexOf(pos) >= 0 ? 7 : -18)),
      phy: isGK ? 0 : attr(ovr + (['CB', 'CDM', 'ST'].indexOf(pos) >= 0 ? 5 : -3)),
      gkd: isGK ? attr(ovr) : 0, gkh: isGK ? attr(ovr) : 0, gkk: isGK ? attr(ovr - 4) : 0,
      gkr: isGK ? attr(ovr) : 0, gks: isGK ? attr(35, 8) : 0, gkp: isGK ? attr(ovr) : 0
    };
    const sub = {};
    FCM.DB.SUB_KEYS.forEach(k => { sub[k] = attr(ovr, 9); });
    // Position modifiers pull the weighted average off target; pin it back
    // so his card and his stats agree.
    P.calibrateAttributes({ pos: positions, att: att, ovr: ovr }, ovr);

    const pl = {
      // Shared with the academy so a restored save can never collide.
      id: FCM.Y.nextNewgenId(),
      name: nm.short, full: nm.full,
      pos: positions, ovr: ovr, pot: pot, age: age,
      height: rng.int(172, 192), weight: rng.int(66, 88),
      clubId: 0, nat: nation.name,
      foot: rng.chance(0.24) ? 'Left' : 'Right',
      weakFoot: rng.int(2, 4), skillMoves: rng.int(1, 4), rep: 1,
      workRate: { att: rng.int(1, 3), def: rng.int(1, 3) },
      traits: [], att: att, sub: sub,
      value: 0, wage: 0,
      contractUntil: seasonYear + rng.int(1, 4),
      seasonYear: seasonYear,
      form: 6.6, fitness: rng.int(88, 100), morale: rng.int(60, 88),
      injury: 0, injuryName: null, xp: 0,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0,
      yellow: 0, red: 0, minutes: 0, seasonRatings: [], suspended: 0,
      careerGoals: 0, careerApps: 0,
      isYouth: false,
      // isNewgen tells the save system there is no static DB entry to
      // restore this player from, so he must be written out in full.
      isNewgen: true,
      // abroad keeps him out of the transfer market: he plays in a league
      // the game does not model, and cannot simply be signed.
      abroad: true,
      foreignClub: nation.name + ' domestic league',
      transferListed: false, loanedTo: null, loanFrom: null,
      injuryProne: U.round(rng.normalClamped(1, 0.35, 0.4, 2.2), 2),
      consistency: U.round(rng.normalClamped(1, 0.18, 0.5, 1.4), 2),
      bigMatch: U.round(rng.normalClamped(1, 0.2, 0.5, 1.5), 2),
      ambition: U.round(rng.normalClamped(1, 0.25, 0.4, 1.8), 2),
      loyalty: U.round(rng.normalClamped(1, 0.3, 0.3, 1.8), 2),
      valMult: 1, wageMult: 1
    };
    pl.value = P.recalcValue(pl);
    pl.wage = Math.round(P.wageDemand(pl, 45) * 0.4 / 100) * 100;
    return pl;
  }

  /**
   * Give every nation at least MIN_POOL selectable players. Called once at
   * DB build, and again each summer as players retire.
   * Returns the number of players created.
   */
  NT.fillPools = function (rng, seasonYear, usedNames) {
    index();
    const DB = FCM.DB;
    const counts = {};
    DB.players.forEach(p => {
      if (!p.isYouth) counts[p.nat] = (counts[p.nat] || 0) + 1;
    });

    let made = 0;
    list.forEach(nation => {
      const have = counts[nation.name] || 0;
      // A couple spare, so one retirement does not drop a nation below the
      // legal squad size mid-cycle.
      const want = NT.MIN_POOL + 2 - have;
      if (want <= 0) return;

      // The best domestic players are near the nation's standing; the squad
      // filler behind them is weaker.
      for (let i = 0; i < want; i++) {
        const depth = i / Math.max(1, want);
        const target = nation.strength - 2 - depth * 9;
        const pos = POS_SHAPE[(have + i) % POS_SHAPE.length];
        const pl = makeDomestic(nation, rng, seasonYear, usedNames, target, pos);
        DB.byId[pl.id] = pl;
        DB.players.push(pl);
        made++;
      }
    });
    return made;
  };

  /** Has this player been generated to fill out a national pool? */
  NT.isDomestic = function (p) { return !!(p && p.abroad); };

  FCM.NT = NT;
})(window.FCM = window.FCM || {});
