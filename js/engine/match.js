/* Match simulation. One engine, two presentations: instant (M.play) and
   minute-by-minute live (M.createMatch + step). */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P, T = FCM.T;
  const M = {};

  const HOME_ADV = 1.085;

  /**
   * Sharpen a 0-1 probability around parity. Raw strength ratios sit close
   * to 0.5 because both sides are sums of eleven players, which compresses
   * real quality gaps; this restores a realistic points spread.
   */
  function sharpen(x, k) {
    x = U.clamp(x, 0.001, 0.999);
    const odds = Math.pow(x / (1 - x), k);
    return odds / (1 + odds);
  }

  /** Pick a shooter, weighted towards advanced positions and finishing. */
  function pickShooter(side, rng) {
    const cands = side.onPitch.filter(x => x.slot.pos !== 'GK');
    if (!cands.length) return null;
    return rng.weighted(cands, x => {
      const y = x.slot.y / 100;
      const attacking = Math.pow(y, 2.4) * 10 + 0.35;
      const finishing = ((x.p.sub.fin || 50) + (x.p.att.sho || 50)) / 100;
      return attacking * finishing;
    });
  }

  /** Pick an assister, weighted towards creative/wide players. */
  function pickAssister(side, rng, exclude) {
    const cands = side.onPitch.filter(x => x.slot.pos !== 'GK' && x.p.id !== exclude);
    if (!cands.length) return null;
    return rng.weighted(cands, x => {
      const y = x.slot.y / 100;
      const creative = ((x.p.sub.vis || 50) + (x.p.sub.cro || 50) + (x.p.att.pas || 50)) / 150;
      return (0.3 + y * 1.5) * creative;
    });
  }

  function pickDefender(side, rng) {
    const cands = side.onPitch.filter(x => x.slot.pos !== 'GK');
    if (!cands.length) return null;
    return rng.weighted(cands, x => Math.pow(1 - x.slot.y / 100, 2) * 6 + 0.2);
  }

  function buildSide(club, tactics, byId, isHome) {
    const slots = T.FORMATIONS[tactics.formation] || T.FORMATIONS['4-2-3-1'];
    const onPitch = [];
    tactics.lineup.forEach((id, i) => {
      const p = byId[id];
      if (p && slots[i]) {
        onPitch.push({ p: p, slot: slots[i], stamina: p.fitness, rating: 6.5,
          goals: 0, assists: 0, mins: 0, shots: 0, saves: 0 });
      }
    });
    return {
      club: club, tactics: tactics, onPitch: onPitch,
      bench: (tactics.subs || []).map(id => byId[id]).filter(Boolean),
      isHome: isHome,
      goals: 0, shots: 0, onTarget: 0, corners: 0, fouls: 0,
      subsUsed: 0, sentOff: 0, contributions: {}
    };
  }

  function liveRatings(side) {
    const t = side.tactics;
    const m = T.MENTALITY[t.mentality] || T.MENTALITY.balanced;
    let att = 0, mid = 0, def = 0, gk = 0;
    side.onPitch.forEach(x => {
      const fatigueMult = 0.74 + 0.26 * U.clamp(x.stamina / 100, 0, 1);
      const eff = P.overallAt(x.p, x.slot.pos) * fatigueMult *
        (0.95 + 0.10 * ((x.p.form - 6.5) / 3.5)) *
        (0.97 + 0.06 * (x.p.morale / 100));
      if (x.slot.pos === 'GK') { gk = eff; return; }
      const y = x.slot.y / 100;
      att += eff * Math.pow(y, 1.6);
      def += eff * Math.pow(1 - y, 1.5);
      mid += eff * Math.max(0, 1 - Math.abs(y - 0.5) * 1.7);
    });
    const press = 1 + (t.pressing - 3) * 0.022;
    const line = 1 + (t.defLine - 3) * 0.020;
    return {
      att: att * m.att * (1 + (t.tempo - 3) * 0.012),
      mid: mid * press,
      def: def * m.def * (2 - line),
      gk: gk || 55
    };
  }

  // ---- Commentary -----------------------------------------------------
  const SAY = {
    kickoff: ['We’re under way at {venue}.', 'The referee gets us started.',
      'Kick-off at {venue}.'],
    goal: ['{p} finds the net! {score}', '{p} makes no mistake — {score}',
      'It’s there! {p} scores. {score}', '{p} buries it. {score}',
      'GOAL! {p} with a clinical finish. {score}'],
    goalAssist: ['{a} picks out {p}, who finishes superbly. {score}',
      '{a} with the delivery, {p} does the rest. {score}',
      'Lovely work from {a} — {p} taps home. {score}'],
    save: ['{gk} gets down well to deny {p}.', '{p} strikes — but {gk} is equal to it.',
      'Good stop from {gk} to keep {p} out.', '{gk} palms away {p}’s effort.'],
    miss: ['{p} drags it wide.', '{p} leans back and skies it.',
      'Off target from {p}.', '{p} snatches at the chance.',
      '{p} curls it just past the post.'],
    corner: ['Corner for {team}.', '{team} win a corner.'],
    yellow: ['{p} goes into the book.', 'Yellow card for {p}.',
      'The referee has a word with {p} — booked.'],
    red: ['{p} is sent off! {team} are down to ten.',
      'Red card! {p} walks.'],
    red2: ['Second yellow for {p} — he’s off.',
      '{p} sees a second yellow and is dismissed.'],
    sub: ['{on} replaces {off} for {team}.', '{team} change: {on} on, {off} off.'],
    halftime: ['That’s the half. {score}.', 'Half-time at {venue}: {score}.'],
    fulltime: ['That’s full time. {score}.', 'The referee blows for the last time. {score}.'],
    pressure: ['{team} are camped in the opposition half.',
      'Sustained pressure from {team} here.', '{team} turning the screw.'],
    quiet: ['A scrappy spell in midfield.', 'Neither side able to settle.',
      'The game has gone flat.', 'Plenty of huff and puff, little end product.'],
    late: ['{team} throwing bodies forward now.',
      'Time running out for {team}.', 'Nervy final minutes here.']
  };

  function say(rng, key, vars) {
    const list = SAY[key];
    if (!list) return '';
    let s = rng.pick(list);
    for (const k in (vars || {})) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  // ---- Live match object ----------------------------------------------
  /**
   * Create a steppable match. Call step() until `done`, then finish().
   * opts: { rng, neutral, importance, venue }
   */
  M.createMatch = function (homeClub, awayClub, homeTactics, awayTactics, byId, opts) {
    const o = opts || {};
    const rng = o.rng || FCM.rng;
    const H = buildSide(homeClub, homeTactics, byId, !o.neutral);
    const A = buildSide(awayClub, awayTactics, byId, false);
    const importance = o.importance || 1;
    const venue = o.venue || homeClub.stadium;
    const totalMinutes = 90;

    const m = {
      minute: 0, done: false, abandoned: (!H.onPitch.length || !A.onPitch.length),
      H: H, A: A, homeClub: homeClub, awayClub: awayClub,
      events: [], commentary: [], momentum: 0,
      hR: liveRatings(H), aR: liveRatings(A),
      rng: rng, byId: byId, importance: importance, venue: venue,
      totalMinutes: totalMinutes
    };

    function log(minute, text, kind, side) {
      m.commentary.push({ min: minute, text: text, kind: kind || 'info', side: side || null });
      if (m.commentary.length > 400) m.commentary.shift();
    }
    m.log = log;

    function tick(side, other, sideR, otherR, homeMult) {
      const minute = m.minute;
      const midTotal = sideR.mid * homeMult + otherR.mid;
      const share = sharpen(midTotal > 0 ? (sideR.mid * homeMult) / midTotal : 0.5, 1.2);
      const attackVsDef = sharpen(
        (sideR.att * homeMult) / Math.max(1, sideR.att * homeMult + otherR.def), 2.4);
      let pChance = 0.115 * share * 2 * attackVsDef * 1.9;
      pChance *= 0.85 + 0.30 * (side.tactics.tempo / 5);
      if (side.sentOff) pChance *= Math.pow(0.72, side.sentOff);
      if (other.sentOff) pChance *= Math.pow(1.25, other.sentOff);

      if (!rng.chance(U.clamp(pChance, 0, 0.42))) return;

      side.shots++;
      const shooter = pickShooter(side, rng);
      if (!shooter) return;
      shooter.shots++;
      const isHome = side === H;
      m.momentum = U.clamp(m.momentum + (isHome ? 8 : -8), -100, 100);

      const acc = ((shooter.p.sub.fin || 50) * 0.6 + (shooter.p.att.sho || 50) * 0.4) / 100;
      const composure = (shooter.p.sub.com || 60) / 100;
      const bigGame = importance > 1.2 ? shooter.p.bigMatch : 1;
      const onTargetP = U.clamp(0.16 + acc * 0.24 + composure * 0.06, 0.12, 0.55);

      if (!rng.chance(onTargetP)) {
        if (rng.chance(0.35)) {
          side.corners++;
          log(minute, say(rng, 'corner', { team: side.club.short }), 'info', isHome ? 'home' : 'away');
        } else {
          log(minute, say(rng, 'miss', { p: shooter.p.name }), 'chance', isHome ? 'home' : 'away');
        }
        shooter.rating += 0.02;
        return;
      }
      side.onTarget++;

      const gkQ = otherR.gk / 100;
      const finQ = (acc * 0.8 + composure * 0.2) * bigGame;
      const pGoal = U.clamp(0.36 + (finQ - gkQ) * 0.85, 0.05, 0.75);
      const oGk = other.onPitch.find(x => x.slot.pos === 'GK');

      if (rng.chance(pGoal)) {
        side.goals++;
        shooter.goals++;
        shooter.rating += 1.05;
        const assister = rng.chance(0.72) ? pickAssister(side, rng, shooter.p.id) : null;
        if (assister) { assister.assists++; assister.rating += 0.62; }
        if (oGk) oGk.rating -= 0.30;
        other.onPitch.forEach(x => { if (x.slot.y < 35) x.rating -= 0.12; });
        const score = H.goals + '-' + A.goals;
        m.events.push({
          min: minute, type: 'goal', side: isHome ? 'home' : 'away',
          player: shooter.p.id, playerName: shooter.p.name,
          assist: assister ? assister.p.id : null,
          assistName: assister ? assister.p.name : null,
          score: score
        });
        log(minute, assister
          ? say(rng, 'goalAssist', { p: shooter.p.name, a: assister.p.name, score: score })
          : say(rng, 'goal', { p: shooter.p.name, score: score }),
          'goal', isHome ? 'home' : 'away');
        m.momentum = U.clamp(m.momentum + (isHome ? 22 : -22), -100, 100);
      } else {
        if (oGk) { oGk.rating += 0.16; oGk.saves++; }
        shooter.rating += 0.04;
        log(minute, say(rng, 'save', { p: shooter.p.name, gk: oGk ? oGk.p.name : 'the keeper' }),
          'save', isHome ? 'home' : 'away');
      }
    }

    function fouls(side, other) {
      const minute = m.minute;
      const isHome = side === H;
      const aggression = 0.055 * (0.7 + side.tactics.pressing * 0.13);
      if (!rng.chance(aggression)) return;
      side.fouls++;
      const culprit = pickDefender(side, rng);
      if (!culprit) return;
      const agg = (culprit.p.sub.agg || 55) / 100;
      const cardChance = (0.14 + agg * 0.10) * (culprit.booked ? 0.30 : 1);
      if (!rng.chance(cardChance)) return;

      if (culprit.booked) {
        culprit.sentOff = true; culprit.rating -= 1.6; side.sentOff++;
        side.onPitch = side.onPitch.filter(x => x !== culprit);
        side.contributions[culprit.p.id] = culprit;
        m.events.push({ min: minute, type: 'red', side: isHome ? 'home' : 'away',
          player: culprit.p.id, playerName: culprit.p.name, second: true });
        log(minute, say(rng, 'red2', { p: culprit.p.name }), 'red', isHome ? 'home' : 'away');
      } else if (rng.chance(0.022)) {
        culprit.sentOff = true; culprit.rating -= 2.0; side.sentOff++;
        side.onPitch = side.onPitch.filter(x => x !== culprit);
        side.contributions[culprit.p.id] = culprit;
        m.events.push({ min: minute, type: 'red', side: isHome ? 'home' : 'away',
          player: culprit.p.id, playerName: culprit.p.name });
        log(minute, say(rng, 'red', { p: culprit.p.name, team: side.club.short }),
          'red', isHome ? 'home' : 'away');
      } else {
        culprit.booked = true; culprit.rating -= 0.28;
        m.events.push({ min: minute, type: 'yellow', side: isHome ? 'home' : 'away',
          player: culprit.p.id, playerName: culprit.p.name });
        log(minute, say(rng, 'yellow', { p: culprit.p.name }), 'yellow', isHome ? 'home' : 'away');
      }
    }

    function drainStamina(side) {
      side.onPitch.forEach(x => {
        const workRate = (x.p.workRate.att + x.p.workRate.def) / 2;
        const staminaAttr = (x.p.sub.sta || 65) / 100;
        const drain = (0.62 + side.tactics.pressing * 0.10 + workRate * 0.07) * (1.35 - staminaAttr * 0.75);
        x.stamina = Math.max(5, x.stamina - drain);
        x.mins++;
      });
    }

    /** Swap a player on the pitch for one on the bench. Used by AI and user. */
    m.substitute = function (offPlayerId, onPlayerId) {
      const sideOf = H.onPitch.find(x => x.p.id === offPlayerId) ? H
        : (A.onPitch.find(x => x.p.id === offPlayerId) ? A : null);
      if (!sideOf) return false;
      if (sideOf.subsUsed >= 5) return false;
      const off = sideOf.onPitch.find(x => x.p.id === offPlayerId);
      const on = sideOf.bench.find(p => p.id === onPlayerId);
      if (!off || !on) return false;
      sideOf.bench = sideOf.bench.filter(p => p.id !== on.id);
      sideOf.onPitch = sideOf.onPitch.filter(x => x !== off);
      sideOf.onPitch.push({ p: on, slot: off.slot, stamina: on.fitness, rating: 6.5,
        goals: 0, assists: 0, mins: 0, shots: 0, saves: 0 });
      sideOf.subsUsed++;
      sideOf.contributions[off.p.id] = off;
      const isHome = sideOf === H;
      m.events.push({ min: m.minute, type: 'sub', side: isHome ? 'home' : 'away',
        off: off.p.id, offName: off.p.name, on: on.id, onName: on.name });
      log(m.minute, say(rng, 'sub', { on: on.name, off: off.p.name, team: sideOf.club.short }),
        'sub', isHome ? 'home' : 'away');
      m.hR = liveRatings(H); m.aR = liveRatings(A);
      return true;
    };

    function autoSubs(side) {
      if (side.subsUsed >= 5 || !side.bench.length) return;
      const minute = m.minute;
      if (minute < 55) return;
      const tired = U.sortBy(side.onPitch.filter(x => x.slot.pos !== 'GK'), x => x.stamina)[0];
      if (!tired || (tired.stamina > 55 && minute < 70)) return;
      if (!rng.chance(minute > 75 ? 0.28 : 0.12)) return;
      const best = U.sortBy(side.bench.map(p => ({ p: p, v: P.overallAt(p, tired.slot.pos) })),
        x => x.v, true)[0];
      if (!best) return;
      m.substitute(tired.p.id, best.p.id);
    }
    m.autoSubs = autoSubs;

    /** Advance one minute. */
    m.step = function () {
      if (m.done || m.abandoned) { m.done = true; return m; }
      m.minute++;
      if (m.minute === 1) {
        log(0, say(rng, 'kickoff', { venue: venue }), 'whistle');
      }
      tick(H, A, m.hR, m.aR, HOME_ADV * (o.neutral ? 1 : 1));
      tick(A, H, m.aR, m.hR, 1);
      fouls(H, A);
      fouls(A, H);
      drainStamina(H);
      drainStamina(A);

      // Momentum decays toward neutral.
      m.momentum *= 0.94;

      if (m.minute % 5 === 0) {
        autoSubs(H);
        // The user's side only auto-subs when they've asked for it.
        if (!o.manualSubsFor || o.manualSubsFor !== A.club.id) autoSubs(A);
        m.hR = liveRatings(H);
        m.aR = liveRatings(A);
      }
      if (m.minute === 45) {
        log(45, say(rng, 'halftime', { score: H.goals + '-' + A.goals, venue: venue }), 'whistle');
      }
      // Occasional colour so the feed never goes silent for long.
      if (m.minute % 7 === 0 && rng.chance(0.5)) {
        if (Math.abs(m.momentum) > 30) {
          log(m.minute, say(rng, 'pressure',
            { team: (m.momentum > 0 ? H : A).club.short }), 'info');
        } else if (m.minute > 80) {
          const chasing = H.goals < A.goals ? H : A;
          log(m.minute, say(rng, 'late', { team: chasing.club.short }), 'info');
        } else {
          log(m.minute, say(rng, 'quiet', {}), 'info');
        }
      }
      if (m.minute >= totalMinutes) {
        m.done = true;
        log(totalMinutes, say(rng, 'fulltime', { score: H.goals + '-' + A.goals }), 'whistle');
      }
      return m;
    };

    /** Run to the final whistle. */
    m.runToEnd = function () {
      while (!m.done) m.step();
      return m;
    };

    /** Compile the result object once the match is over. */
    m.finish = function () {
      if (m.abandoned) {
        return { homeId: homeClub.id, awayId: awayClub.id, homeGoals: 0, awayGoals: 0,
          events: [], commentary: [], abandoned: true,
          homeRatings: [], awayRatings: [], motm: null,
          stats: { shots: [0, 0], onTarget: [0, 0], corners: [0, 0], fouls: [0, 0],
            possession: [50, 50] } };
      }
      function finalise(side, opponentGoals) {
        const all = side.onPitch.concat(Object.values(side.contributions));
        const out = [];
        all.forEach(x => {
          let r = x.rating;
          if (opponentGoals === 0) {
            if (x.slot.pos === 'GK') r += 0.75;
            else if (x.slot.y < 32) r += 0.42;
          }
          r += (side.goals - opponentGoals) * 0.10;
          r += (rng.next() - 0.5) * 0.55 / (x.p.consistency || 1);
          if (x.mins < 90) r = 6.5 + (r - 6.5) * U.clamp(x.mins / 70, 0.35, 1);
          out.push({
            id: x.p.id, name: x.p.name, pos: x.slot.pos,
            rating: U.round(U.clamp(r, 3.0, 10), 1),
            goals: x.goals, assists: x.assists, mins: x.mins,
            shots: x.shots, saves: x.saves,
            booked: !!x.booked, sentOff: !!x.sentOff
          });
        });
        return out;
      }
      const homeRatings = finalise(H, A.goals);
      const awayRatings = finalise(A, H.goals);
      const all = homeRatings.concat(awayRatings);
      const motm = U.sortBy(all, x => x.rating + x.goals * 0.3, true)[0];
      const t = m.hR.mid + m.aR.mid;
      const hPoss = t > 0 ? Math.round((m.hR.mid / t) * 100) : 50;

      return {
        homeId: homeClub.id, awayId: awayClub.id,
        homeGoals: H.goals, awayGoals: A.goals,
        events: m.events, commentary: m.commentary,
        homeRatings: homeRatings, awayRatings: awayRatings,
        motm: motm ? motm.id : null,
        stats: {
          shots: [H.shots, A.shots],
          onTarget: [H.onTarget, A.onTarget],
          corners: [H.corners, A.corners],
          fouls: [H.fouls, A.fouls],
          possession: [hPoss, 100 - hPoss]
        }
      };
    };

    return m;
  };

  /** Instant simulation - same engine, run straight to the whistle. */
  M.play = function (homeClub, awayClub, homeTactics, awayTactics, byId, opts) {
    const m = M.createMatch(homeClub, awayClub, homeTactics, awayTactics, byId, opts);
    if (m.abandoned) return m.finish();
    m.runToEnd();
    return m.finish();
  };

  /** Penalty shoot-out for knockout ties. */
  M.penalties = function (homeSide, awaySide, byId, rng) {
    function takers(tactics) {
      return (tactics.lineup || []).map(id => byId[id]).filter(Boolean)
        .sort((a, b) => ((b.sub.pen || 50) + (b.sub.com || 50)) - ((a.sub.pen || 50) + (a.sub.com || 50)))
        .slice(0, 11);
    }
    const hT = takers(homeSide), aT = takers(awaySide);
    let h = 0, a = 0, i = 0;
    const shots = [];
    function attempt(list, n, who) {
      const p = list[n % list.length];
      if (!p) return rng.chance(0.75);
      const skill = ((p.sub.pen || 55) * 0.7 + (p.sub.com || 55) * 0.3) / 100;
      const scored = rng.chance(U.clamp(0.55 + skill * 0.38, 0.5, 0.94));
      shots.push({ player: p.name, scored: scored, side: who });
      return scored;
    }
    for (; i < 5; i++) {
      if (attempt(hT, i, 'home')) h++;
      if (attempt(aT, i, 'away')) a++;
      const remaining = 5 - i - 1;
      if (h > a + remaining || a > h + remaining) break;
    }
    while (h === a && i < 20) {
      const hs = attempt(hT, i, 'home'), as = attempt(aT, i, 'away');
      if (hs) h++;
      if (as) a++;
      i++;
    }
    return { home: h, away: a, shots: shots };
  };

  FCM.M = M;
})(window.FCM = window.FCM || {});
