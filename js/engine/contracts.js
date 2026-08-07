/* Contracts, agents and the free transfer market.

   A deal running down used to be a quiet administrative event: the player
   simply left in June. In reality the last year of a contract is the most
   dangerous period in a squad - rivals can talk to him from January, his
   agent starts working the phones, and you either pay up or lose an asset
   for nothing. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const CN = {};

  /** From this day a player in his final year can sign for someone else. */
  CN.PRECONTRACT_DAY = 190;   // early January

  /**
   * Agents take a cut of every deal they broker. The better the player, the
   * more leverage the agent has.
   */
  CN.agentFee = function (pl, wage) {
    const clout = U.clamp((pl.ovr - 60) / 32, 0, 1) * (pl.ambition || 1);
    const pct = 0.06 + clout * 0.10;
    return Math.round(wage * 52 * pct);
  };

  /** Is this the last season of his deal? */
  CN.expiring = function (pl, state) {
    return pl.contractUntil <= state.season;
  };

  /** Months left, roughly, for display. */
  CN.monthsLeft = function (pl, state) {
    const seasonsLeft = pl.contractUntil - state.season;
    if (seasonsLeft > 0) return seasonsLeft * 12;
    // Within the final season: the deal runs to the end of June.
    return Math.max(0, Math.round((365 - state.day) / 30));
  };

  /**
   * What he wants to re-sign, and how willing he is at all. A player who
   * feels wanted and is playing signs; one who is unhappy and out of the
   * side would rather run it down and pick his next club himself.
   */
  CN.renewalStance = function (pl, club, state) {
    const demand = P.wageDemand(pl, club.rep);
    const raise = demand / Math.max(1, pl.wage);
    let willing = 0.5;
    willing += (pl.morale - 55) / 160;
    willing += ((pl.loyalty || 1) - 1) * 0.35;
    // Game time is the thing they actually care about.
    const share = (pl.minutes || 0) / Math.max(1, (pl.apps || 0) * 90 + 1);
    if ((pl.apps || 0) >= 8) willing += 0.12;
    else if ((pl.apps || 0) <= 2) willing -= 0.22;
    if ((pl.trustBroken || 0) > 0) willing -= 0.25 * pl.trustBroken;
    if (pl.age >= 32) willing += 0.15;   // fewer options at that age
    willing = U.clamp(willing, 0.03, 0.97);

    return {
      demand: Math.round(demand / 100) * 100,
      raise: raise,
      willing: willing,
      agentFee: CN.agentFee(pl, demand),
      mood: willing > 0.7 ? 'keen' : (willing > 0.4 ? 'open' : 'reluctant')
    };
  };

  /**
   * Rival clubs circling a player in his final months. Returns the club
   * that has agreed a pre-contract, if one has.
   */
  CN.rivalInterest = function (pl, state, rng) {
    if (!CN.expiring(pl, state) || state.day < CN.PRECONTRACT_DAY) return null;
    if (pl.preContract) return FCM.DB.clubById[pl.preContract];
    const club = FCM.DB.clubById[pl.clubId];
    if (!club) return null;

    // The better the player and the unhappier he is, the faster this moves.
    const stance = CN.renewalStance(pl, club, state);
    const appeal = U.clamp((pl.ovr - 62) / 30, 0, 1);
    const chance = appeal * 0.06 * (1.6 - stance.willing);
    if (!rng.chance(chance)) return null;

    // Somebody at his level or a step above, and not his current club.
    const suitors = FCM.DB.clubs.filter(c =>
      c.id !== pl.clubId && c.rep >= club.rep - 6 && c.rep <= club.rep + 22 &&
      c.squad.length < 26);
    if (!suitors.length) return null;
    const buyer = rng.pick(suitors);
    pl.preContract = buyer.id;
    return buyer;
  };

  /**
   * Sign a player on a free once his deal is up, or on a pre-contract.
   * Returns the agent fee paid.
   */
  CN.completeFreeTransfer = function (pl, toClub, state, rng) {
    const from = FCM.DB.clubById[pl.clubId];
    if (from) {
      const i = from.squad.indexOf(pl.id);
      if (i >= 0) from.squad.splice(i, 1);
    }
    pl.clubId = toClub.id;
    toClub.squad.push(pl.id);
    pl.wage = P.wageDemand(pl, toClub.rep);
    pl.contractUntil = state.season + rng.int(2, 4);
    pl.preContract = null;
    pl.freeSince = null;
    return CN.agentFee(pl, pl.wage);
  };

  /**
   * Everyone at your club whose deal is running down, worst case first.
   * This is the list that should be keeping a manager awake.
   */
  CN.expiringSquad = function (club, state) {
    return U.sortBy(
      FCM.DB.squadOf(club).filter(p => CN.expiring(p, state) && !p.isYouth),
      p => p.ovr, true);
  };

  FCM.CN = CN;
})(window.FCM = window.FCM || {});
