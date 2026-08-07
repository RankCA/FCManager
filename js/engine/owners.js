/* Club ownership: who is paying the bills, and what they want for it.

   A takeover is the one thing outside your control that can rewrite the
   whole job overnight - the budget, what counts as success, and how long
   you get. They happen to rivals too, which is how a mid-table club becomes
   a problem in the space of one summer. */
(function (FCM) {
  'use strict';

  const U = FCM.U;
  const OW = {};

  /**
   * Owner archetypes. `budget` scales transfer and wage money, `expect`
   * shifts the board's target in league places (negative is more demanding),
   * `patience` scales how long they give you.
   */
  OW.TYPES = {
    steady: {
      id: 'steady', label: 'Steady custodian', budget: 1, expect: 0, patience: 1,
      blurb: 'A safe pair of hands with no intention of changing much.',
      pitch: 'They intend to run the club much as it has been run.'
    },
    ambitious: {
      id: 'ambitious', label: 'Ambitious investor', budget: 2.6, expect: -4, patience: 0.8,
      blurb: 'Serious money, and serious impatience to see it work.',
      pitch: 'They have not bought this club to finish mid-table. The money ' +
        'is real, and so is the pressure that comes with it.'
    },
    sugar: {
      id: 'sugar', label: 'Sugar daddy', budget: 4.5, expect: -7, patience: 0.65,
      blurb: 'Effectively unlimited funds, and expectations to match.',
      pitch: 'You will be able to buy almost anyone. You will also be ' +
        'expected to win almost everything, quickly.'
    },
    frugal: {
      id: 'frugal', label: 'Cost-cutter', budget: 0.4, expect: 3, patience: 1.35,
      blurb: 'Here to balance the books, not to win anything.',
      pitch: 'The budget is being cut hard, but they understand that limits ' +
        'what you can achieve and will give you time.'
    },
    romantic: {
      id: 'romantic', label: 'Fan ownership', budget: 0.85, expect: 1, patience: 1.6,
      blurb: 'Supporter-owned. Modest money, enormous goodwill.',
      pitch: 'There is less to spend, but the people upstairs are supporters ' +
        'first and will not sack you over a bad month.'
    },
    academy: {
      id: 'academy', label: 'Development project', budget: 0.7, expect: 2, patience: 1.4,
      blurb: 'Buy young, develop, sell on. The model is the point.',
      pitch: 'They want a young side developed and sold at a profit. League ' +
        'position matters less than the players you produce.',
      youthBoost: 2
    }
  };

  /** Roughly one club in this many changes hands each season. */
  OW.SEASON_CHANCE = 0.06;

  /**
   * A club's current owner. Clubs start under a steady custodian, so
   * ownership only becomes visible once something actually changes.
   */
  OW.ownerOf = function (state, club) {
    const rec = (state.owners || {})[club.id];
    return rec ? OW.TYPES[rec.type] || OW.TYPES.steady : OW.TYPES.steady;
  };

  OW.ownerRecord = function (state, club) {
    return (state.owners || {})[club.id] || null;
  };

  /**
   * Who might plausibly buy this club. Big clubs attract big money; a
   * fan buy-out or a cost-cutter is what happens further down.
   */
  function drawType(club, rng) {
    const weights = club.rep >= 72
      ? { ambitious: 4, sugar: 2, steady: 3, frugal: 2, romantic: 1, academy: 2 }
      : club.rep >= 55
        ? { ambitious: 4, sugar: 1, steady: 3, frugal: 3, romantic: 2, academy: 3 }
        : { ambitious: 2, sugar: 1, steady: 3, frugal: 4, romantic: 4, academy: 3 };
    const ids = Object.keys(weights);
    return OW.TYPES[rng.weighted(ids.map(id => ({ id: id, w: weights[id] })), x => x.w).id];
  }

  /**
   * Hand a club to a new owner and apply the consequences. Returns the
   * record, or null if the club already changed hands this season.
   */
  OW.takeover = function (state, club, rng, type) {
    if (!state.owners) state.owners = {};
    const existing = state.owners[club.id];
    if (existing && existing.season === state.season) return null;

    const owner = type ? OW.TYPES[type] : drawType(club, rng);
    const rec = { type: owner.id, season: state.season, day: state.day };
    state.owners[club.id] = rec;

    // Money first. A cost-cutter takes it away as hard as an investor adds.
    club.transferBudget = Math.round(club.transferBudget * owner.budget);
    club.wageBudget = Math.round(club.wageBudget * (1 + (owner.budget - 1) * 0.45));
    if (owner.budget > 1) {
      club.balance = Math.round(club.balance + club.transferBudget * 0.4);
    }
    // Reputation follows the money, which is what makes a rival takeover
    // dangerous - they start signing players you were after.
    club.rep = U.clamp(club.rep + (owner.budget > 1 ? 4 : (owner.budget < 0.7 ? -3 : 0)),
      5, 100);
    if (owner.youthBoost) {
      club.youthRating = U.clamp(club.youthRating + owner.youthBoost, 1, 5);
      club.facilities = U.clamp(club.facilities + 1, 1, 5);
    }
    return rec;
  };

  /**
   * The board target this owner wants, given what the club would normally
   * expect. Lower is more demanding.
   */
  OW.adjustTarget = function (state, club, baseTarget) {
    const owner = OW.ownerOf(state, club);
    return U.clamp(baseTarget + owner.expect, 1, 24);
  };

  /** How much rope you get, as a multiplier on the board's patience. */
  OW.patience = function (state, club) {
    return OW.ownerOf(state, club).patience;
  };

  /**
   * Roll for takeovers across the world. Runs once at the start of a season.
   * Returns whatever happened at the user's club, or null.
   */
  OW.seasonRoll = function (state, rng) {
    let mine = null;
    FCM.DB.clubs.forEach(club => {
      // Clubs in trouble and clubs worth owning are likelier targets.
      let chance = OW.SEASON_CHANCE;
      if (club.balance < 0) chance *= 2.2;
      if (club.rep > 78) chance *= 1.4;
      if (!rng.chance(chance)) return;
      const rec = OW.takeover(state, club, rng);
      if (rec && club.id === state.userClubId) mine = rec;
    });
    return mine;
  };

  FCM.OW = OW;
})(window.FCM = window.FCM || {});
