/* Player happiness: concrete reasons a player is content or unsettled,
   and the transfer requests that follow when he isn't. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const MO = {};

  MO.LEVELS = [
    { min: 85, label: 'Delighted', cls: 'pill-good' },
    { min: 68, label: 'Happy', cls: 'pill-good' },
    { min: 48, label: 'Content', cls: '' },
    { min: 30, label: 'Unsettled', cls: 'pill-warn' },
    { min: 0, label: 'Furious', cls: 'pill-bad' }
  ];

  MO.level = function (morale) {
    return MO.LEVELS.find(l => morale >= l.min) || MO.LEVELS[MO.LEVELS.length - 1];
  };

  /**
   * Why a player feels the way he does. Returns [{ text, delta, kind }]
   * where delta is the weekly morale pull that concern applies.
   */
  MO.concerns = function (pl, club, state) {
    const out = [];
    const squad = FCM.DB.squadOf(club);
    const ovrs = U.sortBy(squad.map(p => p.ovr), x => x, true);
    const rank = squad.filter(p => p.ovr > pl.ovr).length;

    // --- Playing time, judged against how good he is ---
    const teamMinutes = U.sum(squad, p => p.minutes) || 1;
    const share = U.clamp(pl.minutes * 11 / teamMinutes, 0, 1);
    const played = pl.apps > 0;
    if (state.day > 90) {
      if (rank < 11 && share < 0.35 && played) {
        out.push({ text: 'Frustrated by his lack of starts', delta: -1.6, kind: 'minutes' });
      } else if (rank < 11 && !played && state.day > 120) {
        out.push({ text: 'Has not featured at all this season', delta: -2.4, kind: 'minutes' });
      } else if (share > 0.75) {
        out.push({ text: 'Enjoying a run in the side', delta: 1.2, kind: 'minutes' });
      }
      if (rank >= 16 && share > 0.5) {
        out.push({ text: 'Grateful for the chances he is getting', delta: 1.4, kind: 'minutes' });
      }
    }

    // --- Wages, relative to comparable team-mates ---
    const peers = squad.filter(p => Math.abs(p.ovr - pl.ovr) <= 3 && p.id !== pl.id);
    if (peers.length >= 2) {
      const peerWage = U.mean(peers, p => p.wage);
      if (pl.wage < peerWage * 0.72) {
        out.push({ text: 'Believes he is underpaid compared with team-mates', delta: -1.3, kind: 'wage' });
      } else if (pl.wage > peerWage * 1.4) {
        out.push({ text: 'Well rewarded and knows it', delta: 0.8, kind: 'wage' });
      }
    }

    // --- Squad role promised on signing ---
    if (pl.squadRole) {
      const promised = { star: 3, important: 8, rotation: 16, prospect: 24 }[pl.squadRole];
      if (promised !== undefined && rank > promised + 3) {
        out.push({ text: 'Was promised more than a ' + pl.squadRole + ' role', delta: -1.5, kind: 'role' });
      }
    }

    // --- Team results ---
    const form = (club.form || []).slice(-5);
    if (club.morale >= 78) out.push({ text: 'Buoyed by the team’s results', delta: 0.9, kind: 'results' });
    else if (club.morale <= 38) out.push({ text: 'Concerned by the run of results', delta: -1.1, kind: 'results' });

    // --- Contract ---
    const yrsLeft = pl.contractUntil - pl.seasonYear;
    if (yrsLeft <= 0) out.push({ text: 'His contract has expired', delta: -2, kind: 'contract' });
    else if (yrsLeft === 1) out.push({ text: 'Wants clarity on a new contract', delta: -0.7, kind: 'contract' });

    // --- Ambition: a good player at a small club looks upward ---
    if (pl.ovr > club.strength + 6 && pl.ambition > 1.1) {
      out.push({ text: 'Feels he has outgrown the club', delta: -1.4 * pl.ambition, kind: 'ambition' });
    }

    // --- Personal form ---
    if (pl.seasonRatings.length >= 5) {
      const avg = P.avgRating(pl);
      if (avg >= 7.3) out.push({ text: 'Playing the best football of his career', delta: 1.1, kind: 'form' });
      else if (avg <= 6.1) out.push({ text: 'Struggling for form', delta: -0.6, kind: 'form' });
    }

    if (pl.injury > 45) out.push({ text: 'Low after a long spell on the sidelines', delta: -0.8, kind: 'injury' });
    if (pl.transferListed) out.push({ text: 'Unhappy at being transfer listed', delta: -1.8, kind: 'listed' });

    return out;
  };

  /** Weekly morale drift from those concerns. */
  MO.tick = function (pl, club, state, rng) {
    const concerns = MO.concerns(pl, club, state);
    let delta = U.sum(concerns, c => c.delta);
    // Loyal players are slower to sour; ambitious ones quicker.
    if (delta < 0) delta *= (1.2 - (pl.loyalty || 1) * 0.2);
    delta += (rng.next() - 0.5) * 0.4;
    // Everyone drifts gently back toward contentment.
    delta += (60 - pl.morale) * 0.02;
    pl.morale = U.clamp(pl.morale + delta, 3, 100);
    return concerns;
  };

  /**
   * An unhappy player may hand in a transfer request.
   * Returns a reason string if he does.
   */
  MO.maybeRequestTransfer = function (pl, club, state, rng) {
    if (pl.morale > 26 || pl.transferRequested) return null;
    if (pl.contractUntil - pl.seasonYear <= 0) return null;
    const chance = 0.05 * (pl.ambition || 1) / (pl.loyalty || 1);
    if (!rng.chance(chance)) return null;
    pl.transferRequested = true;
    pl.transferListed = true;
    const concerns = MO.concerns(pl, club, state).filter(c => c.delta < 0);
    const worst = U.sortBy(concerns, c => c.delta)[0];
    return worst ? worst.text.toLowerCase() : 'unhappy at the club';
  };

  /** Settle a request: promise game time, improve terms, or refuse. */
  MO.resolveRequest = function (pl, action, club) {
    if (action === 'promise') {
      pl.transferRequested = false;
      pl.transferListed = false;
      pl.morale = U.clamp(pl.morale + 22, 0, 100);
      pl.promisedGameTime = true;
      return 'He will give it until the end of the season.';
    }
    if (action === 'raise') {
      const newWage = Math.round(P.wageDemand(pl, club.rep) * 1.2 / 100) * 100;
      pl.wage = newWage;
      pl.transferRequested = false;
      pl.transferListed = false;
      pl.morale = U.clamp(pl.morale + 26, 0, 100);
      return 'Improved terms agreed at ' + U.wage(newWage) + '.';
    }
    pl.morale = U.clamp(pl.morale - 12, 0, 100);
    return 'He is not happy about it, and stays on the transfer list.';
  };

  /** Overall dressing-room mood. */
  MO.squadHarmony = function (club) {
    const squad = FCM.DB.squadOf(club);
    if (!squad.length) return 60;
    return Math.round(U.mean(squad, p => p.morale));
  };

  FCM.MO = MO;
})(window.FCM = window.FCM || {});
