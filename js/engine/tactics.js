/* Formations, line-up selection and team instructions. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const T = {};

  // x: 0 (left touchline) - 100 (right); y: 0 (own goal) - 100 (opposition goal)
  function s(pos, x, y) { return { pos: pos, x: x, y: y }; }

  T.FORMATIONS = {
    '4-4-2': [s('GK', 50, 6), s('LB', 12, 26), s('CB', 36, 20), s('CB', 64, 20), s('RB', 88, 26),
      s('LM', 12, 56), s('CM', 37, 52), s('CM', 63, 52), s('RM', 88, 56),
      s('ST', 38, 86), s('ST', 62, 86)],

    '4-4-1-1': [s('GK', 50, 6), s('LB', 12, 26), s('CB', 36, 20), s('CB', 64, 20), s('RB', 88, 26),
      s('LM', 12, 54), s('CM', 37, 50), s('CM', 63, 50), s('RM', 88, 54),
      s('CAM', 50, 70), s('ST', 50, 88)],

    '4-3-3': [s('GK', 50, 6), s('LB', 12, 26), s('CB', 36, 20), s('CB', 64, 20), s('RB', 88, 26),
      s('CDM', 50, 42), s('CM', 28, 56), s('CM', 72, 56),
      s('LW', 13, 80), s('ST', 50, 89), s('RW', 87, 80)],

    '4-3-3 (Holding)': [s('GK', 50, 6), s('LB', 12, 26), s('CB', 36, 20), s('CB', 64, 20), s('RB', 88, 26),
      s('CDM', 36, 40), s('CDM', 64, 40), s('CAM', 50, 62),
      s('LW', 13, 80), s('ST', 50, 89), s('RW', 87, 80)],

    '4-2-3-1': [s('GK', 50, 6), s('LB', 12, 26), s('CB', 36, 20), s('CB', 64, 20), s('RB', 88, 26),
      s('CDM', 37, 40), s('CDM', 63, 40),
      s('LM', 13, 66), s('CAM', 50, 66), s('RM', 87, 66), s('ST', 50, 89)],

    '4-2-2-2': [s('GK', 50, 6), s('LB', 12, 26), s('CB', 36, 20), s('CB', 64, 20), s('RB', 88, 26),
      s('CDM', 37, 42), s('CDM', 63, 42), s('CAM', 20, 66), s('CAM', 80, 66),
      s('ST', 38, 87), s('ST', 62, 87)],

    '4-1-2-1-2': [s('GK', 50, 6), s('LB', 12, 26), s('CB', 36, 20), s('CB', 64, 20), s('RB', 88, 26),
      s('CDM', 50, 38), s('CM', 24, 56), s('CM', 76, 56), s('CAM', 50, 70),
      s('ST', 38, 88), s('ST', 62, 88)],

    '4-1-4-1': [s('GK', 50, 6), s('LB', 12, 26), s('CB', 36, 20), s('CB', 64, 20), s('RB', 88, 26),
      s('CDM', 50, 38), s('LM', 13, 60), s('CM', 38, 58), s('CM', 62, 58), s('RM', 87, 60),
      s('ST', 50, 88)],

    '4-5-1': [s('GK', 50, 6), s('LB', 12, 26), s('CB', 36, 20), s('CB', 64, 20), s('RB', 88, 26),
      s('LM', 11, 56), s('CM', 32, 52), s('CDM', 50, 45), s('CM', 68, 52), s('RM', 89, 56),
      s('ST', 50, 87)],

    '4-3-2-1': [s('GK', 50, 6), s('LB', 12, 26), s('CB', 36, 20), s('CB', 64, 20), s('RB', 88, 26),
      s('CDM', 50, 42), s('CM', 28, 55), s('CM', 72, 55),
      s('CAM', 32, 74), s('CAM', 68, 74), s('ST', 50, 90)],

    '3-5-2': [s('GK', 50, 6), s('CB', 26, 20), s('CB', 50, 18), s('CB', 74, 20),
      s('LWB', 8, 52), s('CM', 34, 52), s('CDM', 50, 44), s('CM', 66, 52), s('RWB', 92, 52),
      s('ST', 38, 87), s('ST', 62, 87)],

    '3-4-3': [s('GK', 50, 6), s('CB', 26, 20), s('CB', 50, 18), s('CB', 74, 20),
      s('LM', 10, 54), s('CM', 38, 50), s('CM', 62, 50), s('RM', 90, 54),
      s('LW', 16, 82), s('ST', 50, 89), s('RW', 84, 82)],

    '3-4-1-2': [s('GK', 50, 6), s('CB', 26, 20), s('CB', 50, 18), s('CB', 74, 20),
      s('LM', 10, 54), s('CM', 38, 50), s('CM', 62, 50), s('RM', 90, 54),
      s('CAM', 50, 70), s('ST', 38, 88), s('ST', 62, 88)],

    '5-3-2': [s('GK', 50, 6), s('LWB', 8, 34), s('CB', 28, 18), s('CB', 50, 16), s('CB', 72, 18),
      s('RWB', 92, 34), s('CM', 30, 54), s('CDM', 50, 46), s('CM', 70, 54),
      s('ST', 38, 86), s('ST', 62, 86)],

    '5-2-1-2': [s('GK', 50, 6), s('LWB', 8, 34), s('CB', 28, 18), s('CB', 50, 16), s('CB', 72, 18),
      s('RWB', 92, 34), s('CM', 36, 50), s('CM', 64, 50), s('CAM', 50, 68),
      s('ST', 38, 87), s('ST', 62, 87)],

    '5-4-1': [s('GK', 50, 6), s('LWB', 8, 32), s('CB', 28, 18), s('CB', 50, 16), s('CB', 72, 18),
      s('RWB', 92, 32), s('LM', 20, 58), s('CM', 40, 54), s('CM', 60, 54), s('RM', 80, 58),
      s('ST', 50, 86)]
  };

  T.FORMATION_NAMES = Object.keys(T.FORMATIONS);

  T.defaultTactics = function () {
    return {
      formation: '4-2-3-1',
      lineup: [],          // 11 player ids, index-matched to formation slots
      subs: [],            // up to 9 player ids on the bench
      mentality: 'balanced',   // ultra-defensive | defensive | balanced | attacking | all-out
      tempo: 3,            // 1 slow - 5 fast
      width: 3,            // 1 narrow - 5 wide
      pressing: 3,         // 1 deep block - 5 high press
      defLine: 3,          // 1 very deep - 5 very high
      passing: 3,          // 1 direct - 5 short
      captain: null,
      penaltyTaker: null,
      freeKickTaker: null,
      cornerTaker: null
    };
  };

  T.MENTALITY = {
    'ultra-defensive': { att: 0.78, def: 1.20, label: 'Ultra Defensive' },
    'defensive': { att: 0.89, def: 1.10, label: 'Defensive' },
    'balanced': { att: 1.00, def: 1.00, label: 'Balanced' },
    'attacking': { att: 1.12, def: 0.91, label: 'Attacking' },
    'all-out': { att: 1.24, def: 0.79, label: 'All-Out Attack' }
  };

  /**
   * Pick the strongest available XI for a formation.
   * Greedy by scarcity: fills the hardest-to-cover slots first.
   */
  T.autoPick = function (squad, formationName, opts) {
    const o = opts || {};
    const slots = T.FORMATIONS[formationName] || T.FORMATIONS['4-2-3-1'];
    // A loanee is physically moved into his host club's squad, so anyone
    // present here is selectable - checking `loanedTo` would make him
    // unpickable at both clubs and he would never play at all.
    const available = squad.filter(p =>
      p.injury === 0 && (!o.exclude || o.exclude.indexOf(p.id) < 0) &&
      (!o.suspended || o.suspended.indexOf(p.id) < 0));

    // Score every player against every slot once.
    const scored = slots.map((slot, si) => ({
      si: si,
      slot: slot,
      // Weight fitness meaningfully so managers rotate a tired squad.
      cands: U.sortBy(available.map(p => ({
        p: p,
        v: P.overallAt(p, slot.pos) * (0.72 + 0.28 * (p.fitness / 100))
      })), c => c.v, true)
    }));

    // Slots whose best option is much better than their second get priority.
    scored.sort((a, b) => {
      const ga = a.cands.length > 1 ? a.cands[0].v - a.cands[3 % a.cands.length].v : 99;
      const gb = b.cands.length > 1 ? b.cands[0].v - b.cands[3 % b.cands.length].v : 99;
      return gb - ga;
    });

    const lineup = new Array(slots.length).fill(null);
    const taken = new Set();
    for (const entry of scored) {
      for (const c of entry.cands) {
        if (!taken.has(c.p.id)) { lineup[entry.si] = c.p.id; taken.add(c.p.id); break; }
      }
    }

    // Bench: best remaining, guaranteeing a spare keeper.
    const rest = U.sortBy(available.filter(p => !taken.has(p.id)), p => p.ovr, true);
    const subs = [];
    const gk = rest.find(p => p.pos[0] === 'GK');
    if (gk) { subs.push(gk.id); taken.add(gk.id); }
    for (const p of rest) {
      if (subs.length >= 9) break;
      if (!taken.has(p.id)) { subs.push(p.id); taken.add(p.id); }
    }
    return { lineup: lineup, subs: subs };
  };

  /** Ensure a tactics object has a valid, fully-populated XI. */
  T.validate = function (tactics, squad, opts) {
    const slots = T.FORMATIONS[tactics.formation] || T.FORMATIONS['4-2-3-1'];
    const byId = {};
    squad.forEach(p => { byId[p.id] = p; });
    const o = opts || {};
    const unusable = id => {
      const p = byId[id];
      return !p || p.injury > 0 ||
        (o.suspended && o.suspended.indexOf(id) >= 0);
    };

    let lineup = (tactics.lineup || []).slice(0, slots.length);
    while (lineup.length < slots.length) lineup.push(null);
    lineup = lineup.map(id => (id && !unusable(id) ? id : null));

    // Drop duplicates.
    const seen = new Set();
    lineup = lineup.map(id => {
      if (id === null) return null;
      if (seen.has(id)) return null;
      seen.add(id);
      return id;
    });

    if (lineup.some(x => x === null)) {
      const auto = T.autoPick(squad, tactics.formation, { exclude: lineup.filter(Boolean), suspended: o.suspended });
      for (let i = 0; i < lineup.length; i++) {
        if (lineup[i] === null) {
          const cand = auto.lineup.find(id => id && !seen.has(id));
          if (cand) { lineup[i] = cand; seen.add(cand); }
        }
      }
    }

    let subs = (tactics.subs || []).filter(id => !unusable(id) && !seen.has(id));
    subs = subs.filter((id, i) => subs.indexOf(id) === i).slice(0, 9);
    subs.forEach(id => seen.add(id));
    if (subs.length < 7) {
      const rest = U.sortBy(squad.filter(p => !seen.has(p.id) && !unusable(p.id)), p => p.ovr, true);
      for (const p of rest) {
        if (subs.length >= 7) break;
        subs.push(p.id); seen.add(p.id);
      }
    }

    tactics.lineup = lineup;
    tactics.subs = subs;
    if (!tactics.captain || unusable(tactics.captain)) {
      const onPitch = lineup.filter(Boolean).map(id => byId[id]).filter(Boolean);
      const cap = U.sortBy(onPitch, p => p.ovr + p.age * 0.4, true)[0];
      tactics.captain = cap ? cap.id : null;
    }
    return tactics;
  };

  /**
   * Convert a line-up into the attack/midfield/defence ratings the match
   * engine consumes.
   */
  T.teamRatings = function (tactics, byId) {
    const slots = T.FORMATIONS[tactics.formation] || T.FORMATIONS['4-2-3-1'];
    const m = T.MENTALITY[tactics.mentality] || T.MENTALITY.balanced;
    let att = 0, mid = 0, def = 0, gk = 0, chem = 0, n = 0;

    tactics.lineup.forEach((id, i) => {
      const p = byId[id];
      if (!p || !slots[i]) return;
      const slot = slots[i];
      const eff = P.effective(p, slot.pos);
      const fam = P.familiarity(p, slot.pos);
      chem += fam;
      n++;
      if (slot.pos === 'GK') { gk = eff; return; }
      // Weight a player's contribution by where they stand on the pitch.
      const yy = slot.y / 100;
      const attW = Math.pow(yy, 1.6);
      const defW = Math.pow(1 - yy, 1.5);
      const midW = 1 - Math.abs(yy - 0.5) * 1.7;
      att += eff * attW;
      def += eff * defW;
      mid += eff * Math.max(0, midW);
    });

    const chemistry = n ? chem / n : 1;
    // Tactical instructions modulate the raw quality.
    const pressBoost = 1 + (tactics.pressing - 3) * 0.022;
    const lineRisk = 1 + (tactics.defLine - 3) * 0.020;

    return {
      att: att * m.att * chemistry * (1 + (tactics.tempo - 3) * 0.012),
      mid: mid * chemistry * pressBoost,
      def: def * m.def * chemistry * (2 - lineRisk),
      gk: gk,
      chemistry: chemistry,
      mentality: tactics.mentality
    };
  };

  /** Average XI overall, for display. */
  T.lineupStrength = function (tactics, byId) {
    const slots = T.FORMATIONS[tactics.formation] || T.FORMATIONS['4-2-3-1'];
    const vals = [];
    tactics.lineup.forEach((id, i) => {
      const p = byId[id];
      if (p && slots[i]) vals.push(P.overallAt(p, slots[i].pos));
    });
    return vals.length ? Math.round(U.mean(vals)) : 0;
  };

  FCM.T = T;
})(window.FCM = window.FCM || {});
