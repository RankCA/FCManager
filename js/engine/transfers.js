/* Transfer market: AI activity, bids, negotiations, loans and contracts. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const TR = {};

  // Windows are day indices from 1 July.
  TR.SUMMER = [0, 61];       // 1 Jul - 31 Aug
  TR.WINTER = [184, 214];    // 1 Jan - 31 Jan

  TR.windowOpen = function (day) {
    return (day >= TR.SUMMER[0] && day <= TR.SUMMER[1]) ||
      (day >= TR.WINTER[0] && day <= TR.WINTER[1]);
  };
  TR.windowName = function (day) {
    if (day >= TR.SUMMER[0] && day <= TR.SUMMER[1]) return 'Summer';
    if (day >= TR.WINTER[0] && day <= TR.WINTER[1]) return 'Winter';
    return null;
  };

  /**
   * Free agents can be signed year-round - they are not under contract, so
   * no window applies. Only deals involving another club are restricted.
   */
  TR.canSign = function (player, day) {
    if (!player.clubId) return true;
    return TR.windowOpen(day);
  };

  /** Which window a given day falls in, and how long it lasts. */
  TR.windowFor = function (day) {
    if (day >= TR.SUMMER[0] && day <= TR.SUMMER[1]) {
      return { name: 'Summer', from: TR.SUMMER[0], to: TR.SUMMER[1], open: true };
    }
    if (day >= TR.WINTER[0] && day <= TR.WINTER[1]) {
      return { name: 'Winter', from: TR.WINTER[0], to: TR.WINTER[1], open: true };
    }
    return null;
  };

  /** The next window to open after `day` (wrapping into next season). */
  TR.nextWindow = function (day) {
    if (day < TR.SUMMER[0]) return { name: 'Summer', from: TR.SUMMER[0], to: TR.SUMMER[1] };
    if (day < TR.WINTER[0]) return { name: 'Winter', from: TR.WINTER[0], to: TR.WINTER[1] };
    return { name: 'Summer', from: TR.SUMMER[0] + 365, to: TR.SUMMER[1] + 365, nextSeason: true };
  };

  /** True if `day` sits inside any transfer window. */
  TR.dayInWindow = function (day) { return TR.windowOpen(day); };

  /** How much a club will pay above market value for a target. */
  function eagerness(club, player, rng) {
    const need = 1 + (player.ovr - club.strength) * 0.03;
    return U.clamp(need * rng.range(0.85, 1.3), 0.6, 2.2);
  }

  // ---- Deal structure ------------------------------------------------
  /** A blank negotiation package. */
  TR.blankOffer = function (player, club) {
    return {
      fee: Math.round(player.value * 1.1),
      instalments: 1,          // pay the fee over N years
      sellOn: 0,               // % of any future sale owed to the seller
      appearanceFee: 0,        // per senior appearance
      goalBonus: 0,            // per goal
      signingBonus: 0,
      wage: FCM.P.wageDemand(player, club.rep),
      years: 4,
      releaseClause: 0,
      squadRole: 'rotation'    // affects whether the player accepts
    };
  };

  TR.SQUAD_ROLES = [
    { id: 'star', label: 'Star player', appeal: 2.0, wageMult: 1.35 },
    { id: 'important', label: 'Important player', appeal: 1.1, wageMult: 1.15 },
    { id: 'rotation', label: 'Rotation option', appeal: 0, wageMult: 1 },
    { id: 'prospect', label: 'One for the future', appeal: -0.5, wageMult: 0.82 }
  ];

  TR.roleById = function (id) {
    return TR.SQUAD_ROLES.find(r => r.id === id) || TR.SQUAD_ROLES[2];
  };

  /**
   * Cash value of a structured offer to the selling club. Instalments are
   * discounted, sell-on and bonuses are worth something but less than cash.
   */
  TR.effectiveFee = function (offer) {
    const instalmentDiscount = 1 - (offer.instalments - 1) * 0.055;
    let v = offer.fee * Math.max(0.7, instalmentDiscount);
    v += offer.fee * (offer.sellOn / 100) * 0.28;      // future upside
    v += (offer.appearanceFee || 0) * 25 * 0.5;
    v += (offer.goalBonus || 0) * 8 * 0.5;
    return Math.round(v);
  };

  /**
   * Would the selling club accept `fee` for `player`?
   * Considers value, squad depth, contract length and transfer-listing.
   */
  TR.evaluateBid = function (player, sellingClub, fee, ctx) {
    // A player the manager has blocked is simply not for sale.
    if (player.notForSale && sellingClub && ctx && sellingClub.id === ctx.userClubId) {
      return { accepted: false, asking: Infinity, blocked: true };
    }
    const squad = ctx.squadOf(sellingClub);
    const samePos = squad.filter(p => p.pos[0] === player.pos[0] && p.id !== player.id);
    const betterCount = squad.filter(p => p.ovr > player.ovr).length;

    let asking = player.value;
    // Key players cost a premium; fringe players are available cheaply.
    if (betterCount < 3) asking *= 1.55;
    else if (betterCount < 8) asking *= 1.25;
    else if (betterCount > 16) asking *= 0.85;
    if (samePos.length <= 1) asking *= 1.25;          // no cover
    if (player.transferListed) asking *= 0.70;
    const yrsLeft = Math.max(0, player.contractUntil - player.seasonYear);
    if (yrsLeft <= 0) asking *= 0.15;
    else if (yrsLeft === 1) asking *= 0.62;
    if (player.age >= 32) asking *= 0.80;

    const ratio = fee / Math.max(1, asking);
    if (ratio >= 1.0) return { accepted: true, asking: Math.round(asking) };
    if (ratio >= 0.92 && ctx.rng.chance(0.35)) return { accepted: true, asking: Math.round(asking) };
    return { accepted: false, asking: Math.round(asking) };
  };

  /** Would the player agree personal terms? */
  TR.evaluateTerms = function (player, buyingClub, sellingClub, offer, ctx) {
    const demand = P.wageDemand(player, buyingClub.rep);
    const reasons = [];
    let score = 0;

    if (offer.wage >= demand) score += 2;
    else if (offer.wage >= demand * 0.9) score += 0.5;
    else { score -= 2; reasons.push('The wages on offer are not enough.'); }

    const repGain = buyingClub.rep - (sellingClub ? sellingClub.rep : 40);
    if (repGain > 10) score += 1.5;
    else if (repGain < -15) { score -= 1.2 * player.ambition; reasons.push('This would be a step down.'); }

    // Young players want to play; senior players want to win.
    const squad = ctx.squadOf(buyingClub);
    const betterThere = squad.filter(p => p.ovr > player.ovr && p.pos[0] === player.pos[0]).length;
    if (betterThere >= 2 && player.age <= 24) {
      score -= 1.1; reasons.push('They are worried about first-team chances.');
    }
    if (offer.years >= 3) score += 0.4;
    score += (ctx.rng.next() - 0.5) * 0.8;

    return {
      accepted: score > 0.6,
      demand: demand,
      reasons: reasons.length ? reasons : ['They are not convinced by the project.']
    };
  };

  /**
   * A buying club's ceiling for a target - what they would go to if pushed.
   * Deterministic per (player, club, bid) so haggling can't be re-rolled.
   */
  TR.buyerCeiling = function (player, buyer, originalFee) {
    const seed = FCM.hashString('ceil' + player.id + ':' + buyer.id + ':' + originalFee);
    const r = new FCM.RNG(seed);
    // Ambition scales with how badly they need him and how rich they are.
    const need = U.clamp(1 + (player.ovr - buyer.strength) * 0.02, 0.85, 1.5);
    const wealth = U.clamp(buyer.transferBudget / Math.max(1, player.value), 0.6, 2.2);
    const stretch = 1.10 + r.range(0.04, 0.34) * need * Math.min(1.4, wealth);
    return Math.min(Math.round(originalFee * stretch), buyer.transferBudget);
  };

  /**
   * Respond to the manager's counter-offer on an incoming bid.
   * Returns { accepted, fee, message, finalOffer } - `finalOffer` means they
   * have met you in the middle and will not move again.
   */
  TR.evaluateCounter = function (player, buyer, originalFee, counter, ctx) {
    const ceiling = TR.buyerCeiling(player, buyer, originalFee);
    // Clauses cost them something, so they reduce what they'll pay in cash.
    const clauseCost = (counter.sellOn || 0) * 0.010 + (counter.buyBack ? 0.05 : 0);
    const effectiveAsk = Math.round(counter.fee * (1 + clauseCost));

    if (effectiveAsk <= ceiling) {
      return {
        accepted: true, fee: counter.fee,
        message: buyer.name + ' have accepted your terms.'
      };
    }
    // Within reach: they split the difference once, and that's their limit.
    if (effectiveAsk <= ceiling * 1.22 && !counter.isSecondRound) {
      const mid = Math.round((ceiling + originalFee) / 2 / 1e5) * 1e5;
      return {
        accepted: false, fee: Math.max(originalFee, mid), finalOffer: true,
        message: buyer.name + ' will not go that high, but have improved their offer to ' +
          U.money(Math.max(originalFee, mid)) + '. That is their final bid.'
      };
    }
    return {
      accepted: false, fee: originalFee,
      message: buyer.name + ' have walked away — that was far more than they valued him at.'
    };
  };

  /**
   * The most a club will concede on a loan: how much of the wage they'll
   * cover and whether they'll accept an obligation to buy. Deterministic
   * per (player, club, original offer).
   */
  TR.loanCeiling = function (player, club, original) {
    const seed = FCM.hashString('loan' + player.id + ':' + club.id + ':' +
      Math.round((original.wageShare || 0) * 100));
    const r = new FCM.RNG(seed);
    const wealth = U.clamp(club.rep / 100, 0.2, 1);
    return {
      // They'll stretch above their opening share, richer clubs further.
      wageShare: U.clamp((original.wageShare || 0.5) + r.range(0.08, 0.30) * (0.5 + wealth), 0.15, 1),
      // A buy option they'd tolerate, as a multiple of value.
      optionToBuy: Math.round(player.value * r.range(0.9, 1.45) / 1e5) * 1e5,
      acceptsObligation: r.chance(0.35 + wealth * 0.25)
    };
  };

  /**
   * Respond to a counter on a loan enquiry.
   * counter: { wageShare, days, optionToBuy, obligationToBuy }
   */
  TR.evaluateLoanCounter = function (player, club, original, counter, ctx) {
    const ceil = TR.loanCeiling(player, club, original);
    // Tag each sticking point so we can reason about it, rather than
    // matching on the display text.
    const reasons = [];

    if (counter.wageShare > ceil.wageShare + 0.001) {
      reasons.push({ kind: 'wages',
        text: 'cover ' + Math.round(counter.wageShare * 100) + '% of his wages' });
    }
    if (counter.obligationToBuy && !ceil.acceptsObligation) {
      reasons.push({ kind: 'obligation', text: 'commit to a permanent obligation' });
    }
    if (counter.optionToBuy && counter.optionToBuy > ceil.optionToBuy) {
      reasons.push({ kind: 'option', text: 'agree an option at ' + U.money(counter.optionToBuy) });
    }

    if (!reasons.length) {
      return { accepted: true, terms: counter,
        message: club.name + ' have agreed to your terms.' };
    }
    // If wages are the only sticking point they will meet you halfway once.
    if (reasons.length === 1 && reasons[0].kind === 'wages' && !counter.isSecondRound) {
      const mid = U.round((ceil.wageShare + (original.wageShare || 0.5)) / 2, 2);
      return {
        accepted: false, finalOffer: true,
        terms: Object.assign({}, counter, { wageShare: mid, obligationToBuy: false }),
        message: club.name + ' will go to ' + Math.round(mid * 100) +
          '% of his wages, and no further.'
      };
    }
    return {
      accepted: false,
      message: club.name + ' will not ' + reasons.map(r => r.text).join(', nor ') +
        '. Talks have broken down.'
    };
  };

  /**
   * Would a club that bid to *buy* accept a loan instead? Usually only if
   * he is young, or they were stretching to afford him.
   */
  TR.evaluateSaleToLoan = function (player, buyer, originalFee, loanOffer, ctx) {
    const seed = FCM.hashString('s2l' + player.id + ':' + buyer.id + ':' + originalFee);
    const r = new FCM.RNG(seed);
    let appetite = 0.30;
    if (player.age <= 23) appetite += 0.30;        // happy to develop him
    if (originalFee > buyer.transferBudget * 0.6) appetite += 0.25;  // it was a stretch
    if (player.ovr > buyer.strength + 3) appetite += 0.15;
    if (loanOffer.obligationToBuy) appetite += 0.20;
    if (loanOffer.wageShare >= 0.9) appetite += 0.10;
    if (!r.chance(U.clamp(appetite, 0.05, 0.9))) {
      return { accepted: false,
        message: buyer.name + ' want him permanently, not on loan.' };
    }
    return { accepted: true,
      message: buyer.name + ' will take him on loan instead.' };
  };

  /**
   * Would a club that enquired about a *loan* buy him outright? Depends on
   * whether they can afford the asking price.
   */
  TR.evaluateLoanToSale = function (player, club, askingFee, ctx) {
    if (askingFee > club.transferBudget) {
      return { accepted: false, counterFee: 0,
        message: club.name + ' cannot afford that — their budget is ' +
          U.money(club.transferBudget) + '.' };
    }
    const ceiling = TR.buyerCeiling(player, club, Math.round(player.value * 0.9));
    if (askingFee <= ceiling) {
      return { accepted: true, fee: askingFee,
        message: club.name + ' have agreed to buy him outright for ' + U.money(askingFee) + '.' };
    }
    if (askingFee <= ceiling * 1.25) {
      const offer = Math.round(ceiling / 1e5) * 1e5;
      return { accepted: false, counterFee: offer, finalOffer: true,
        message: club.name + ' would rather loan him, but will pay ' + U.money(offer) +
          ' to make it permanent.' };
    }
    return { accepted: false, counterFee: 0,
      message: club.name + ' are only interested in a loan at that price.' };
  };

  /** Execute a completed transfer, honouring any sell-on clause. */
  TR.completeTransfer = function (player, fromClub, toClub, fee, terms, ctx) {
    let sellOnPaid = 0;
    if (fromClub) {
      fromClub.squad = fromClub.squad.filter(id => id !== player.id);
      // Honour a sell-on owed to whoever sold this player previously.
      if (player.sellOnOwedTo && player.sellOnPct > 0 && fee > 0) {
        const beneficiary = FCM.DB.clubById[player.sellOnOwedTo];
        if (beneficiary && beneficiary.id !== fromClub.id) {
          sellOnPaid = Math.round(fee * player.sellOnPct / 100);
          beneficiary.balance += sellOnPaid;
          beneficiary.transferBudget += sellOnPaid;
        }
      }
      fromClub.balance += fee - sellOnPaid;
      fromClub.transferBudget += fee - sellOnPaid;
    }
    toClub.squad.push(player.id);
    toClub.balance -= fee;
    toClub.transferBudget -= fee;
    player.clubId = toClub.id;
    player.wage = terms.wage;
    player.contractUntil = player.seasonYear + terms.years;
    player.transferListed = false;
    player.notForSale = false;
    player.loanListed = false;
    player.loanedTo = null; player.loanFrom = null;
    player.morale = U.clamp(player.morale + 12, 0, 100);
    player.apps = 0; player.goals = 0; player.assists = 0; player.seasonRatings = [];

    // Record clauses attached to *this* deal for the future.
    player.sellOnPct = terms.sellOn || 0;
    player.sellOnOwedTo = (terms.sellOn > 0 && fromClub) ? fromClub.id : null;
    player.releaseClause = terms.releaseClause || 0;
    player.appearanceFee = terms.appearanceFee || 0;
    player.goalBonus = terms.goalBonus || 0;
    player.squadRole = terms.squadRole || 'rotation';
    P.recalcValue(player);
    return {
      player: player.id, name: player.name, from: fromClub ? fromClub.id : null,
      to: toClub.id, fee: fee, wage: terms.wage, day: ctx.day,
      sellOn: terms.sellOn || 0, sellOnPaid: sellOnPaid,
      instalments: terms.instalments || 1, loan: false
    };
  };

  // ---- Loans ----------------------------------------------------------
  TR.LOAN_LENGTHS = [
    { id: 'half', label: 'Half a season', days: 150 },
    { id: 'full', label: 'Full season', days: 320 }
  ];

  /**
   * Clubs approaching the user about a loan-listed player. Mirrors how
   * transfer offers arrive: you list him, they come to you.
   */
  TR.loanOffersForUser = function (ctx) {
    const rng = ctx.rng;
    const offers = [];
    const userClub = ctx.clubById[ctx.userClubId];
    if (!userClub) return offers;

    ctx.squadOf(userClub).forEach(p => {
      if (!p.loanListed || p.loanedTo || p.loanFrom || p.injury > 0) return;
      // Young prospects and fringe players attract the most interest.
      let chance = 0.11;
      if (p.age <= 22) chance += 0.06;
      if (p.ovr >= userClub.strength) chance -= 0.05;
      if (!rng.chance(U.clamp(chance, 0.02, 0.30))) return;

      // The point of a loan is game time, so the host must be a level where
      // he walks into the side. `strength` is a squad average, so a club at
      // his own rating would still leave him behind their first XI - aim
      // slightly below him.
      const suitors = ctx.clubs.filter(c => {
        if (c.id === userClub.id) return false;
        if (c.squad.length >= 28) return false;
        return c.strength >= p.ovr - 16 && c.strength <= p.ovr - 1;
      });
      if (!suitors.length) return;
      const club = rng.weighted(suitors, c => Math.max(1, c.rep));

      // Stronger clubs will cover more of the wages.
      const base = 0.30 + (club.rep / 100) * 0.45;
      const wageShare = U.clamp(U.round(rng.normalClamped(base, 0.12, 0.15, 1), 2), 0.15, 1);
      const length = rng.chance(0.65) ? TR.LOAN_LENGTHS[1] : TR.LOAN_LENGTHS[0];
      // Occasionally they want the option to keep him.
      const wantsOption = rng.chance(p.age <= 23 ? 0.28 : 0.42);

      offers.push({
        type: 'loan-offer',
        player: p.id, playerName: p.name,
        from: club.id, fromName: club.name,
        wageShare: wageShare,
        days: length.days,
        lengthLabel: length.label,
        optionToBuy: wantsOption ? Math.round(p.value * rng.range(0.8, 1.3) / 1e5) * 1e5 : 0,
        day: ctx.day,
        expires: ctx.day + 10
      });
    });
    return offers;
  };

  /** Would `owner` let this player go out on loan? */
  TR.evaluateLoan = function (player, owner, toClub, offer, ctx) {
    if (player.notForSale && owner && ctx && owner.id === ctx.userClubId) {
      return { accepted: false, reason: 'This player is not available.' };
    }
    const squad = ctx.squadOf(owner);
    const rank = squad.filter(p => p.ovr > player.ovr).length;
    // Key players do not go out on loan; fringe and young players do.
    if (rank < 8 && player.age > 21) {
      return { accepted: false, reason: owner.name + ' see him as too important to loan out.' };
    }
    if (offer.wageShare < 0.4 && player.ovr > 70) {
      return { accepted: false, reason: 'They want you to cover more of his wages.' };
    }
    // The player wants to actually play.
    if (toClub.strength < player.ovr - 14) {
      return { accepted: false, reason: player.name + ' does not fancy dropping to that level.' };
    }
    return { accepted: true };
  };

  /** Send a player out on (or bring one in on) loan. */
  TR.completeLoan = function (player, owner, toClub, offer, ctx) {
    owner.squad = owner.squad.filter(id => id !== player.id);
    toClub.squad.push(player.id);
    player.loanFrom = owner.id;
    player.loanedTo = toClub.id;
    player.loanUntil = ctx.day + (offer.days || 320);
    player.loanWageShare = offer.wageShare;
    player.loanOptionToBuy = offer.optionToBuy || 0;
    player.loanListed = false;
    player.clubId = toClub.id;
    player.morale = U.clamp(player.morale + 6, 0, 100);
    player.apps = 0; player.goals = 0; player.assists = 0; player.seasonRatings = [];
    return {
      player: player.id, name: player.name, from: owner.id, to: toClub.id,
      fee: 0, wage: player.wage, day: ctx.day, loan: true,
      wageShare: offer.wageShare, optionToBuy: offer.optionToBuy || 0
    };
  };

  /**
   * How a loan is going, from the parent club's point of view.
   * Returns { share, apps, status, warn } where share is the fraction of the
   * host club's available minutes he has played.
   */
  TR.loanProgress = function (player, day) {
    const host = FCM.DB.clubById[player.loanedTo];
    if (!host) return null;
    const hostSquad = FCM.DB.squadOf(host);
    const teamMinutes = U.sum(hostSquad, p => p.minutes) || 1;
    const share = U.clamp(player.minutes * 11 / teamMinutes, 0, 1);
    const elapsed = player.loanUntil ? (day - (player.loanUntil - 320)) : 0;
    let status = 'Settling in', warn = false;
    if (player.apps === 0 && elapsed > 45) { status = 'Not playing at all'; warn = true; }
    else if (share < 0.20 && elapsed > 55) { status = 'Barely featuring'; warn = true; }
    else if (share < 0.45) status = 'In and out of the side';
    else if (share < 0.75) status = 'Playing regularly';
    else status = 'A key player there';
    return { share: share, apps: player.apps, status: status, warn: warn, host: host };
  };

  /** Cut a loan short and bring the player home. */
  TR.recallLoan = function (player) {
    if (!player.loanedTo) return false;
    TR.endLoan(player);
    player.morale = U.clamp(player.morale - 6, 5, 100);
    return true;
  };

  /** Return a loanee to their parent club. */
  TR.endLoan = function (player) {
    const owner = FCM.DB.clubById[player.loanFrom];
    const host = FCM.DB.clubById[player.loanedTo];
    if (host) host.squad = host.squad.filter(id => id !== player.id);
    if (owner && owner.squad.indexOf(player.id) < 0) owner.squad.push(player.id);
    player.clubId = owner ? owner.id : 0;
    player.loanedTo = null;
    player.loanFrom = null;
    player.loanUntil = null;
    player.loanWageShare = null;
  };

  /** Squad holes, ranked by urgency - drives AI signings and scout advice. */
  TR.squadNeeds = function (club, squad) {
    const groups = { GK: [], DEF: [], MID: [], ATT: [] };
    squad.forEach(p => {
      const g = P.GROUP[p.pos[0]] || 'MID';
      groups[g].push(p);
    });
    const want = { GK: 2, DEF: 7, MID: 7, ATT: 5 };
    const needs = [];
    for (const g in groups) {
      const list = U.sortBy(groups[g], p => p.ovr, true);
      const count = list.length;
      const quality = list.length ? U.mean(list.slice(0, Math.min(3, list.length)), p => p.ovr) : 0;
      let urgency = 0;
      if (count < want[g]) urgency += (want[g] - count) * 1.4;
      if (quality < club.strength - 2) urgency += (club.strength - quality) * 0.5;
      needs.push({ group: g, count: count, quality: Math.round(quality), urgency: urgency });
    }
    return U.sortBy(needs, n => n.urgency, true);
  };

  /**
   * One tick of AI-vs-AI transfer activity. Returns a list of completed deals.
   * The user's club is excluded - offers to them arrive as inbox items.
   */
  TR.aiTick = function (ctx) {
    const rng = ctx.rng;
    const deals = [];
    const clubs = ctx.clubs.filter(c => c.id !== ctx.userClubId);
    const attempts = Math.max(1, Math.round(clubs.length * 0.04));

    for (let i = 0; i < attempts; i++) {
      const buyer = rng.weighted(clubs, c => Math.max(1, c.transferBudget / 1e6));
      if (!buyer || buyer.transferBudget < 300000) continue;
      const buyerSquad = ctx.squadOf(buyer);
      if (buyerSquad.length >= 30) continue;
      const needs = TR.squadNeeds(buyer, buyerSquad);
      const need = needs[0];
      if (!need || need.urgency <= 0) continue;

      // Shortlist affordable, better-than-current players in that group.
      const targets = ctx.allPlayers.filter(p => {
        if (p.clubId === buyer.id || p.loanedTo || p.loanFrom) return false;
        if (p.notForSale && p.clubId === ctx.userClubId) return false;
        if ((P.GROUP[p.pos[0]] || 'MID') !== need.group) return false;
        if (p.value > buyer.transferBudget * 0.85) return false;
        if (p.ovr < need.quality - 2) return false;
        const seller = ctx.clubById[p.clubId];
        if (!seller || seller.id === ctx.userClubId) return false;
        if (seller.squad.length <= 16) return false;
        return true;
      });
      if (!targets.length) continue;

      const target = rng.weighted(
        U.sortBy(targets, p => p.ovr, true).slice(0, 40),
        p => Math.max(1, p.ovr - need.quality + 4)
      );
      if (!target) continue;
      const seller = ctx.clubById[target.clubId];
      const fee = Math.round(target.value * eagerness(buyer, target, rng));
      if (fee > buyer.transferBudget) continue;

      const verdict = TR.evaluateBid(target, seller, fee, ctx);
      if (!verdict.accepted) continue;
      const terms = { wage: Math.round(P.wageDemand(target, buyer.rep) * rng.range(1.0, 1.15)),
        years: rng.int(2, 5) };
      if (terms.wage * 52 > buyer.wageBudget * 52 * 0.25) continue;
      const say = TR.evaluateTerms(target, buyer, seller, terms, ctx);
      if (!say.accepted) continue;

      deals.push(TR.completeTransfer(target, seller, buyer, fee, terms, ctx));
    }
    return deals;
  };

  /**
   * AI clubs bidding for the user's players. Returns offer objects for the inbox.
   */
  TR.offersForUser = function (ctx) {
    const rng = ctx.rng;
    const offers = [];
    const userClub = ctx.clubById[ctx.userClubId];
    if (!userClub) return offers;
    const squad = ctx.squadOf(userClub);

    squad.forEach(p => {
      // Players the manager has blocked never attract an approach.
      if (p.notForSale || p.loanedTo || p.loanFrom) return;
      // Listed players attract far more interest.
      let p0 = p.transferListed ? 0.09 : 0.008;
      // Stars at smaller clubs get picked off.
      if (p.ovr > userClub.strength + 4) p0 *= 2.2;
      if (p.contractUntil - p.seasonYear <= 1) p0 *= 1.6;
      if (!rng.chance(p0)) return;

      const suitors = ctx.clubs.filter(c =>
        c.id !== userClub.id && c.transferBudget > p.value * 0.9 &&
        c.rep > userClub.rep - 22);
      if (!suitors.length) return;
      const buyer = rng.weighted(suitors, c => Math.max(1, c.rep));
      const fee = Math.round(p.value * rng.range(0.85, 1.45));
      offers.push({
        type: 'transfer-offer',
        player: p.id, playerName: p.name,
        from: buyer.id, fromName: buyer.name,
        fee: fee, day: ctx.day,
        expires: ctx.day + 7
      });
    });
    return offers;
  };

  /** Players whose contracts are running down want to talk. */
  TR.contractConcerns = function (ctx) {
    const out = [];
    const club = ctx.clubById[ctx.userClubId];
    if (!club) return out;
    ctx.squadOf(club).forEach(p => {
      const left = p.contractUntil - p.seasonYear;
      if (left === 1 && !p.contractWarned && ctx.rng.chance(0.02)) {
        p.contractWarned = true;
        out.push({
          type: 'contract-expiring', player: p.id, playerName: p.name,
          day: ctx.day, demand: P.wageDemand(p, club.rep)
        });
      }
    });
    return out;
  };

  FCM.TR = TR;
})(window.FCM = window.FCM || {});
