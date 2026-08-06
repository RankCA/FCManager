/* Player model: positions, development, valuation, form, fitness, injuries. */
(function (FCM) {
  'use strict';

  const U = FCM.U;
  const P = {};

  // ---- Positions ---------------------------------------------------
  P.POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM',
    'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];

  P.GROUP = {
    GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
    CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
    LW: 'ATT', RW: 'ATT', CF: 'ATT', ST: 'ATT'
  };

  // Familiarity: 1.0 natural, ~0.9 comfortable, ~0.75 awkward, 0.5 alien.
  // Read as FAM[actualPosition][playedPosition].
  const F = {
    GK:  { GK: 1 },
    CB:  { CB: 1, LB: .82, RB: .82, LWB: .74, RWB: .74, CDM: .84, CM: .68 },
    LB:  { LB: 1, LWB: .96, CB: .84, RB: .80, LM: .86, LW: .76, CDM: .74, CM: .68 },
    RB:  { RB: 1, RWB: .96, CB: .84, LB: .80, RM: .86, RW: .76, CDM: .74, CM: .68 },
    LWB: { LWB: 1, LB: .96, LM: .90, LW: .82, CB: .74, CM: .70, CDM: .74 },
    RWB: { RWB: 1, RB: .96, RM: .90, RW: .82, CB: .74, CM: .70, CDM: .74 },
    CDM: { CDM: 1, CM: .94, CB: .84, CAM: .80, LM: .72, RM: .72, LB: .72, RB: .72 },
    CM:  { CM: 1, CDM: .92, CAM: .92, LM: .84, RM: .84, ST: .68, CB: .62 },
    CAM: { CAM: 1, CM: .92, LM: .86, RM: .86, LW: .84, RW: .84, CF: .88, ST: .78, CDM: .74 },
    LM:  { LM: 1, LW: .94, CM: .84, CAM: .86, LWB: .88, LB: .82, RM: .78, ST: .68 },
    RM:  { RM: 1, RW: .94, CM: .84, CAM: .86, RWB: .88, RB: .82, LM: .78, ST: .68 },
    LW:  { LW: 1, LM: .94, CAM: .84, ST: .82, CF: .86, RW: .80, LWB: .78, LB: .70 },
    RW:  { RW: 1, RM: .94, CAM: .84, ST: .82, CF: .86, LW: .80, RWB: .78, RB: .70 },
    CF:  { CF: 1, ST: .96, CAM: .88, LW: .86, RW: .86, CM: .72 },
    ST:  { ST: 1, CF: .96, LW: .82, RW: .82, CAM: .78, CM: .64 }
  };

  // ---- Overall <-> attributes -----------------------------------------
  /**
   * How each face attribute contributes to the overall rating, by position.
   * Mirrors the FC formulas closely enough that a player's card and his
   * stats always tell the same story.
   */
  P.POS_WEIGHTS = {
    ST:  { sho: .35, pac: .20, phy: .15, dri: .15, pas: .10, def: .05 },
    CF:  { sho: .32, dri: .22, pas: .18, pac: .15, phy: .10, def: .03 },
    LW:  { dri: .30, pac: .25, sho: .20, pas: .20, phy: .05 },
    RW:  { dri: .30, pac: .25, sho: .20, pas: .20, phy: .05 },
    LM:  { pas: .26, dri: .26, pac: .22, sho: .14, phy: .07, def: .05 },
    RM:  { pas: .26, dri: .26, pac: .22, sho: .14, phy: .07, def: .05 },
    CAM: { pas: .30, dri: .30, sho: .20, pac: .10, phy: .10 },
    CM:  { pas: .32, dri: .25, sho: .13, def: .15, phy: .10, pac: .05 },
    CDM: { def: .32, pas: .25, phy: .20, dri: .13, pac: .05, sho: .05 },
    LB:  { def: .28, pac: .22, pas: .18, dri: .15, phy: .17 },
    RB:  { def: .28, pac: .22, pas: .18, dri: .15, phy: .17 },
    LWB: { def: .25, pac: .24, pas: .19, dri: .17, phy: .15 },
    RWB: { def: .25, pac: .24, pas: .19, dri: .17, phy: .15 },
    CB:  { def: .45, phy: .30, pac: .10, pas: .10, dri: .05 },
    GK:  { gkd: .22, gkh: .21, gkr: .22, gkp: .21, gks: .09, gkk: .05 }
  };

  P.weightsFor = function (pl) {
    return P.POS_WEIGHTS[pl.pos[0]] || P.POS_WEIGHTS.CM;
  };

  /** Overall implied by a player's current attributes. */
  P.computeOverall = function (pl) {
    const w = P.weightsFor(pl);
    let total = 0, sum = 0;
    for (const k in w) {
      const v = (pl.att[k] !== undefined ? pl.att[k] : 50);
      total += v * w[k];
      sum += w[k];
    }
    return sum > 0 ? total / sum : pl.ovr;
  };

  /**
   * Shift a player's attributes so their implied overall lands on `target`,
   * keeping the shape of his profile intact. Used when generating players
   * so the card and the stats agree from birth.
   */
  P.calibrateAttributes = function (pl, target) {
    const w = P.weightsFor(pl);
    const current = P.computeOverall(pl);
    let shift = target - current;
    // Nudge the weighted attributes; unweighted ones follow at half rate so
    // the profile still moves, but shape is preserved.
    for (let pass = 0; pass < 6 && Math.abs(shift) > 0.25; pass++) {
      for (const k in pl.att) {
        if (pl.att[k] === 0) continue;              // not applicable (GK/outfield split)
        const weighted = w[k] !== undefined;
        pl.att[k] = U.clamp(Math.round(pl.att[k] + shift * (weighted ? 1 : 0.5)), 20, 99);
      }
      shift = target - P.computeOverall(pl);
    }
    return P.computeOverall(pl);
  };

  /**
   * Positions that sit naturally alongside `pos`, ordered by how close a
   * fit they are. Derived from the familiarity matrix so a generated
   * player's secondary roles match how the engine actually rates him.
   */
  P.relatedPositions = function (pos, threshold) {
    const row = F[pos];
    if (!row) return [];
    const min = threshold === undefined ? 0.86 : threshold;
    return Object.keys(row)
      .filter(k => k !== pos && row[k] >= min)
      .sort((a, b) => row[b] - row[a]);
  };

  /** How well `player` covers `pos` (0.5 - 1.0). */
  P.familiarity = function (player, pos) {
    let best = 0;
    for (const nat of player.pos) {
      const row = F[nat];
      const v = row && row[pos];
      if (v && v > best) best = v;
    }
    if (best) return best;
    // Never played there: goalkeepers are hopeless outfield and vice versa.
    const gkMismatch = (player.pos[0] === 'GK') !== (pos === 'GK');
    return gkMismatch ? 0.30 : 0.55;
  };

  /** Overall adjusted for the position actually being played. */
  P.overallAt = function (player, pos) {
    const fam = P.familiarity(player, pos);
    if (fam >= 1) return player.ovr;
    // Out of position costs proportionally more for elite players.
    return Math.round(player.ovr - (1 - fam) * (18 + player.ovr * 0.22));
  };

  /** Match-day effectiveness: position fit, fitness, form, morale, injury. */
  P.effective = function (player, pos) {
    if (player.injury > 0) return 0;
    let v = P.overallAt(player, pos);
    v *= 0.72 + 0.28 * (player.fitness / 100);          // tired players underperform
    v *= 0.94 + 0.12 * ((player.form - 6.5) / 3.5);      // hot/cold streaks
    v *= 0.97 + 0.06 * (player.morale / 100);            // unhappy players switch off
    return v;
  };

  // ---- Valuation ---------------------------------------------------
  // Calibrated so the curve reproduces FC26 market values; each player also
  // carries `valMult`, anchoring them to their real starting value so
  // progression stays authentic per-player.
  P.baseValue = function (ovr, age, pot) {
    let v = 2500 * Math.exp((ovr - 40) * 0.222);
    // Youngsters with headroom carry a premium; veterans are discounted.
    const gap = Math.max(0, (pot || ovr) - ovr);
    let ageMult;
    if (age <= 18) ageMult = 1.75;
    else if (age <= 21) ageMult = 1.55;
    else if (age <= 24) ageMult = 1.28;
    else if (age <= 27) ageMult = 1.05;
    else if (age <= 29) ageMult = 0.92;
    else if (age <= 31) ageMult = 0.68;
    else if (age <= 33) ageMult = 0.42;
    else if (age <= 35) ageMult = 0.22;
    else ageMult = 0.11;
    const potMult = 1 + gap * (age <= 23 ? 0.055 : 0.018);
    return v * ageMult * potMult;
  };

  /** Recompute market value after development/ageing. */
  P.recalcValue = function (pl) {
    const base = P.baseValue(pl.ovr, pl.age, pl.pot) * (pl.valMult || 1);
    // Short contracts tank value; form nudges it.
    const yrsLeft = Math.max(0, pl.contractUntil - pl.seasonYear);
    const contractMult = yrsLeft <= 0 ? 0.25 : (yrsLeft === 1 ? 0.62 : (yrsLeft === 2 ? 0.88 : 1));
    const formMult = 0.94 + 0.12 * U.clamp((pl.form - 6.5) / 3, -0.5, 0.5);
    pl.value = Math.max(1000, Math.round(base * contractMult * formMult / 1000) * 1000);
    return pl.value;
  };

  /** What the player would demand on a new deal, given interest level. */
  P.wageDemand = function (pl, clubRep) {
    const base = 45 * Math.exp((pl.ovr - 40) * 0.148) * (pl.wageMult || 1);
    const repMult = 0.72 + 0.85 * ((clubRep === undefined ? 60 : clubRep) / 100);
    let ageMult = pl.age <= 21 ? 0.72 : (pl.age <= 24 ? 0.92 : (pl.age >= 33 ? 0.85 : 1));
    // Players on a hot streak or with headroom ask for more.
    const ambition = 1 + Math.max(0, pl.pot - pl.ovr) * 0.012;
    return Math.max(500, Math.round(base * repMult * ageMult * ambition / 100) * 100);
  };

  P.releaseClause = function (pl) { return Math.round(pl.value * 1.75); };

  // ---- Development -------------------------------------------------
  /** Age-based capacity to improve (1 = peak learning, 0 = none). */
  function growthCapacity(age) {
    if (age <= 17) return 1.00;
    if (age <= 19) return 0.92;
    if (age <= 21) return 0.78;
    if (age <= 23) return 0.58;
    if (age <= 25) return 0.38;
    if (age <= 27) return 0.20;
    if (age <= 29) return 0.08;
    return 0;
  }

  /** Age at which decline starts biting, later for low-pace archetypes. */
  function declineRate(pl) {
    if (pl.age < 30) return 0;
    const paceReliant = pl.pos[0] !== 'GK' && (pl.att.pac || 60) > 78;
    const gkBonus = pl.pos[0] === 'GK' ? 4 : 0;
    const over = pl.age - (30 + gkBonus);
    if (over < 0) return 0;
    return (0.12 + over * 0.10) * (paceReliant ? 1.35 : 1);
  }

  /** Extra growth for academy players and recent graduates. */
  P.YOUTH_MULT = 1.60;          // academy players train on a steeper curve
  P.PROMOTED_SEASONS = 2;       // how long the graduate bonus lasts

  P.promotedBonus = function (pl, season, minutesShare) {
    if (pl.promotedOn === undefined || pl.promotedOn === null) return 1;
    if (season - pl.promotedOn >= P.PROMOTED_SEASONS) return 1;
    // Graduates kick on hardest when they are actually playing.
    return 1.35 + 0.75 * U.clamp(minutesShare, 0, 1);
  };

  /**
   * Weekly development tick.
   * ctx: { minutesShare 0-1, facilities 1-5, coaching 1-5, avgRating, rng,
   *        isYouth, season }
   */
  P.develop = function (pl, ctx) {
    const rng = ctx.rng;
    const gap = pl.pot - pl.ovr;
    let delta = 0;

    if (gap > 0) {
      const cap = growthCapacity(pl.age);
      if (cap > 0) {
        // Playing time is the dominant driver, as in career mode.
        const play = 0.30 + 0.70 * U.clamp(ctx.minutesShare, 0, 1);
        const coaching = 0.72 + 0.14 * (ctx.coaching || 3);
        const facilities = 0.86 + 0.07 * (ctx.facilities || 3);
        const perf = 1 + U.clamp(((ctx.avgRating || 6.6) - 6.6) * 0.16, -0.25, 0.35);
        // Closing the last few points of potential is hardest.
        const proximity = U.clamp(gap / 12, 0.22, 1);
        // Tuned so an elite prospect on full game time gains ~6-9 overall
        // across a season, matching career-mode progression.
        delta = cap * play * coaching * facilities * perf * proximity * 0.12;
        if (ctx.focusMult) delta *= ctx.focusMult;
        if (ctx.isYouth || pl.isYouth) delta *= P.YOUTH_MULT;
        delta *= P.promotedBonus(pl, ctx.season || pl.seasonYear, ctx.minutesShare);
        delta *= rng.range(0.55, 1.45);           // week-to-week noise
        if (rng.chance(0.012 * cap)) delta *= 3;  // breakthrough weeks
      }
    }

    const dec = declineRate(pl);
    if (dec > 0) delta -= dec * rng.range(0.5, 1.5) * 0.11;

    pl.xp = (pl.xp || 0) + delta;
    let changed = 0;
    while (pl.xp >= 1 && pl.ovr < pl.pot) { pl.ovr++; pl.xp -= 1; changed++; }
    while (pl.xp <= -1 && pl.ovr > 40) { pl.ovr--; pl.xp += 1; changed--; }

    if (changed !== 0) {
      P.applyAttributeDrift(pl, changed, rng);
      P.recalcValue(pl);
    }
    return changed;
  };

  /**
   * Expected weekly XP gain under the given conditions, with no randomness.
   * Used to project how long a player needs to reach his next rating.
   */
  P.expectedWeeklyGain = function (pl, ctx) {
    const gap = pl.pot - pl.ovr;
    const cap = growthCapacity(pl.age);
    let delta = 0;
    if (gap > 0 && cap > 0) {
      const play = 0.30 + 0.70 * U.clamp(ctx.minutesShare, 0, 1);
      const coaching = 0.72 + 0.14 * (ctx.coaching || 3);
      const facilities = 0.86 + 0.07 * (ctx.facilities || 3);
      const perf = 1 + U.clamp(((ctx.avgRating || 6.6) - 6.6) * 0.16, -0.25, 0.35);
      const proximity = U.clamp(gap / 12, 0.22, 1);
      delta = cap * play * coaching * facilities * perf * proximity * 0.12;
      if (ctx.focusMult) delta *= ctx.focusMult;
      if (ctx.isYouth || pl.isYouth) delta *= P.YOUTH_MULT;
      delta *= P.promotedBonus(pl, ctx.season || pl.seasonYear, ctx.minutesShare);
    }
    const dec = declineRate(pl);
    if (dec > 0) delta -= dec * 0.11;
    return delta;
  };

  /**
   * Project a player's development.
   * Returns { rate, weeksToNext, nextOvr, weeksToPotential, declining, stalled }
   */
  P.projectGrowth = function (pl, ctx) {
    const rate = P.expectedWeeklyGain(pl, ctx);
    const out = {
      rate: rate, nextOvr: pl.ovr + 1, weeksToNext: null,
      weeksToPotential: null, declining: rate < 0, stalled: false,
      atPotential: pl.ovr >= pl.pot
    };
    if (out.atPotential && rate <= 0) {
      out.stalled = true;
      if (rate < 0) {
        out.nextOvr = pl.ovr - 1;
        out.weeksToNext = Math.ceil((1 + (pl.xp || 0)) / -rate);
      }
      return out;
    }
    if (rate <= 0.0005) { out.stalled = true; return out; }

    // Remaining XP to the next whole point, then to potential.
    const toNext = 1 - (pl.xp || 0);
    out.weeksToNext = Math.max(1, Math.ceil(toNext / rate));

    // Growth slows as the gap to potential closes, so step the projection
    // rather than dividing by the current rate.
    let sim = { ovr: pl.ovr, pot: pl.pot, age: pl.age, xp: pl.xp || 0,
      isYouth: pl.isYouth, promotedOn: pl.promotedOn, seasonYear: pl.seasonYear,
      att: pl.att, pos: pl.pos };
    let weeks = 0;
    while (sim.ovr < sim.pot && weeks < 520) {
      const r = P.expectedWeeklyGain(sim, ctx);
      if (r <= 0.0005) break;
      sim.xp += r;
      while (sim.xp >= 1 && sim.ovr < sim.pot) { sim.ovr++; sim.xp -= 1; }
      weeks++;
      // Age him as the projection runs, so ageing is accounted for.
      if (weeks % 52 === 0) sim.age++;
    }
    out.weeksToPotential = sim.ovr >= sim.pot ? weeks : null;
    return out;
  };

  /** Human phrasing for a projection. */
  P.growthLabel = function (proj, pot) {
    if (proj.declining && proj.weeksToNext) {
      return 'Declining — around ' + proj.weeksToNext + ' weeks to drop to ' + proj.nextOvr;
    }
    if (proj.atPotential) return 'Has reached his ceiling';
    if (proj.stalled) return 'Not developing in current conditions';
    const w = proj.weeksToNext;
    const when = w === 1 ? 'about a week' : 'about ' + w + ' weeks';
    return when + ' to ' + proj.nextOvr + ' OVR';
  };

  /**
   * How high an attribute can realistically go for this player. Stats that
   * define his position can max out; peripheral ones stay in proportion,
   * so a 90-rated centre-back never ends up a 99 finisher.
   */
  P.attributeCeiling = function (pl, key, weights) {
    const w = weights || P.weightsFor(pl);
    let max = 0;
    for (const k in w) if (w[k] > max) max = w[k];
    const rel = max > 0 ? (w[key] || 0) / max : 1;
    // Tuned so the weighted average of the ceilings still clears his overall
    // for every position - otherwise growth stalls short of his rating.
    return U.clamp(Math.round(pl.ovr + 8 - (1 - rel) * 16), 25, 99);
  };

  /**
   * Move a player's attributes in step with a change in overall.
   *
   * Overall is a *weighted average* of the face stats, so a single +1 point
   * is nowhere near enough - the implied rating has to move by `delta` too.
   * We add points one at a time, favouring the player's strengths, until
   * the implied overall has shifted by the right amount. The existing gap
   * between stored and implied overall is preserved, so real FC26 players
   * keep their authentic profile.
   */
  P.applyAttributeDrift = function (pl, delta, rng) {
    if (!delta) return;
    const isGK = pl.pos[0] === 'GK';
    const w = P.weightsFor(pl);
    // Only attributes that actually count toward his overall move with it.
    // A centre-back's shooting contributes nothing, so pumping it would
    // never converge - and would leave him a 99-rated finisher.
    const keys = Object.keys(w).filter(k => pl.att[k] !== undefined && pl.att[k] > 0);
    if (!keys.length) return;
    const target = P.computeOverall(pl) + delta;
    const up = delta > 0;
    let sumW = 0;
    for (const k in w) sumW += w[k];

    // Enough iterations to shift the average even via low-weight stats.
    const guard = Math.abs(delta) * 80 + 60;
    for (let i = 0; i < guard; i++) {
      const gap = up ? target - P.computeOverall(pl) : P.computeOverall(pl) - target;
      if (gap <= 0) break;

      const pool = keys.filter(x => {
        const v = pl.att[x] || 0;
        return up ? v < P.attributeCeiling(pl, x, w) : v > 20;
      });
      if (!pool.length) break;

      // Each point moves the average by weight/sumW. Near the target, only
      // consider stats fine-grained enough not to overshoot - otherwise the
      // error compounds over a career's worth of increments.
      let eligible = pool.filter(x => ((w[x] || 0) / sumW) <= gap * 1.15);
      if (!eligible.length) {
        // Nothing precise enough left; take the smallest step available.
        eligible = [U.sortBy(pool, x => (w[x] || 0))[0]];
      }

      let k;
      if (!up && pl.age >= 30 && rng.chance(0.55) &&
          eligible.indexOf(isGK ? 'gkr' : 'pac') >= 0) {
        // Ageing takes the legs first.
        k = isGK ? 'gkr' : 'pac';
      } else {
        // Growth favours what he is already good at, weighted toward the
        // attributes that actually matter for his position.
        k = rng.weighted(eligible.map(x => ({
          k: x,
          w: Math.max(1, (pl.att[x] || 50) * (1 + (w[x] || 0) * 2))
        })), x => x.w).k;
      }
      const next = U.clamp((pl.att[k] || 50) + (up ? 1 : -1), 20, 99);
      if (next === pl.att[k]) break;
      pl.att[k] = next;
    }
  };

  // ---- Condition ---------------------------------------------------
  P.INJURIES = [
    { name: 'Knock', min: 3, max: 8, w: 30 },
    { name: 'Bruised ribs', min: 5, max: 12, w: 14 },
    { name: 'Hamstring strain', min: 12, max: 28, w: 18 },
    { name: 'Ankle sprain', min: 14, max: 35, w: 14 },
    { name: 'Groin strain', min: 16, max: 32, w: 10 },
    { name: 'Torn muscle', min: 35, max: 70, w: 7 },
    { name: 'Broken metatarsal', min: 60, max: 110, w: 4 },
    { name: 'Cruciate ligament damage', min: 160, max: 260, w: 3 }
  ];

  /** Roll for injury after a match. Returns injury object or null. */
  P.rollInjury = function (pl, rng, intensity) {
    const proneness = pl.injuryProne || 1;
    const fatigue = 1 + Math.max(0, (70 - pl.fitness) / 70) * 1.6;
    const age = pl.age >= 31 ? 1.3 : (pl.age <= 20 ? 1.1 : 1);
    const p = 0.021 * proneness * fatigue * age * (intensity || 1);
    if (!rng.chance(p)) return null;
    const t = rng.weighted(P.INJURIES);
    const days = rng.int(t.min, t.max);
    pl.injury = days;
    pl.injuryName = t.name;
    return { name: t.name, days: days };
  };

  P.restDay = function (pl, rate) {
    if (pl.injury > 0) {
      pl.injury--;
      if (pl.injury <= 0) { pl.injury = 0; pl.injuryName = null; pl.fitness = Math.min(pl.fitness, 62); }
      return;
    }
    pl.fitness = U.clamp(pl.fitness + (rate === undefined ? 7 : rate), 0, 100);
  };

  /** Blend a match rating into rolling form. */
  P.applyMatchRating = function (pl, rating) {
    pl.form = U.clamp(pl.form * 0.72 + rating * 0.28, 3, 10);
    pl.seasonRatings.push(rating);
  };

  P.avgRating = function (pl) {
    return pl.seasonRatings.length ? U.mean(pl.seasonRatings) : 6.6;
  };

  P.age = function (pl) { return pl.age; };

  /** Squad-role label used across the UI. */
  P.roleLabel = function (pl, squadOvrs) {
    const rank = squadOvrs.filter(o => o > pl.ovr).length;
    if (rank < 4) return 'Star player';
    if (rank < 11) return 'First team';
    if (rank < 16) return 'Rotation';
    if (pl.age <= 21) return 'Prospect';
    return 'Squad player';
  };

  FCM.P = P;
})(window.FCM = window.FCM || {});
