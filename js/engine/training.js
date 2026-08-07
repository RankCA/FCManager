/* Training focus and backroom staff - the levers on player development. */
(function (FCM) {
  'use strict';

  const U = FCM.U;
  const TN = {};

  // ---- Team training focus --------------------------------------------
  /**
   * A weekly team-wide emphasis. Each boosts some attributes and a matching
   * match-engine trait, at the cost of extra fatigue or a weaker area.
   */
  TN.FOCUSES = {
    balanced: {
      id: 'balanced', label: 'Balanced', icon: '⚖',
      blurb: 'No emphasis. Steady all-round progress and full recovery.',
      attrs: [], growth: 1.0, fatigue: 1.0
    },
    attacking: {
      id: 'attacking', label: 'Attacking', icon: '⚔',
      blurb: 'Finishing and creativity sharpen; defensive work suffers.',
      attrs: ['fin', 'lsh', 'vol', 'pos'], face: ['sho'], growth: 1.05, fatigue: 1.05
    },
    defending: {
      id: 'defending', label: 'Defending', icon: '🛡',
      blurb: 'Tackling and marking improve; attacking edge dulls.',
      attrs: ['tkl', 'mrk', 'int', 'sli'], face: ['def'], growth: 1.05, fatigue: 1.05
    },
    fitness: {
      id: 'fitness', label: 'Fitness', icon: '💪',
      blurb: 'Stamina and strength build. Players tire less and recover faster.',
      attrs: ['sta', 'str', 'jmp'], face: ['phy'], growth: 1.0, fatigue: 0.72,
      recovery: 1.25
    },
    technical: {
      id: 'technical', label: 'Technical', icon: '🎯',
      blurb: 'Passing, control and dribbling improve across the squad.',
      attrs: ['spa', 'lpa', 'bal', 'drb', 'vis'], face: ['pas', 'dri'],
      growth: 1.05, fatigue: 1.0
    },
    intensity: {
      id: 'intensity', label: 'High Intensity', icon: '🔥',
      blurb: 'Fastest development of all — but a real injury risk.',
      attrs: [], growth: 1.35, fatigue: 1.45, injuryRisk: 1.6
    },
    recovery: {
      id: 'recovery', label: 'Recovery', icon: '🧊',
      blurb: 'Light week. Little development, but fitness and injuries heal fast.',
      attrs: [], growth: 0.45, fatigue: 0.35, recovery: 1.7, injuryHeal: 1.5
    }
  };

  TN.FOCUS_ORDER = ['balanced', 'attacking', 'defending', 'technical',
    'fitness', 'intensity', 'recovery'];

  TN.getFocus = function (id) { return TN.FOCUSES[id] || TN.FOCUSES.balanced; };

  /** Apply a week of training to one player. */
  TN.applyWeekly = function (player, focus, rng, coachBonus) {
    const f = TN.getFocus(focus);
    // Nudge the emphasised attributes, capped so training alone can't
    // turn a defender into a striker.
    if (f.attrs && f.attrs.length && rng.chance(0.14 * (coachBonus || 1))) {
      const k = rng.pick(f.attrs);
      if (player.sub[k] !== undefined && player.sub[k] < 92) player.sub[k]++;
    }
    if (f.face && f.face.length && rng.chance(0.05 * (coachBonus || 1))) {
      const k = rng.pick(f.face);
      if (player.att[k] !== undefined && player.att[k] < 92 &&
          player.att[k] < player.ovr + 6) {
        player.att[k]++;
      }
    }
    return f;
  };

  // ---- Individual focus -------------------------------------------------
  TN.INDIVIDUAL = [
    { id: 'none', label: 'None', attrs: [] },
    { id: 'shooting', label: 'Shooting', attrs: ['fin', 'lsh', 'shp', 'vol'], face: 'sho' },
    { id: 'passing', label: 'Passing', attrs: ['spa', 'lpa', 'vis', 'cur'], face: 'pas' },
    { id: 'dribbling', label: 'Dribbling', attrs: ['drb', 'bal', 'agi', 'bala'], face: 'dri' },
    { id: 'defending', label: 'Defending', attrs: ['tkl', 'mrk', 'int', 'sli'], face: 'def' },
    { id: 'physical', label: 'Physical', attrs: ['str', 'sta', 'jmp', 'agg'], face: 'phy' },
    { id: 'pace', label: 'Pace', attrs: ['acc', 'spd'], face: 'pac' }
  ];

  TN.individualById = function (id) {
    return TN.INDIVIDUAL.find(x => x.id === id) || TN.INDIVIDUAL[0];
  };

  /** Individual programmes work faster on young players. */
  TN.applyIndividual = function (player, rng, coachBonus) {
    if (!player.trainingFocus || player.trainingFocus === 'none') return;
    const prog = TN.individualById(player.trainingFocus);
    const youthBonus = player.age <= 23 ? 1.5 : (player.age >= 31 ? 0.5 : 1);
    if (rng.chance(0.16 * youthBonus * (coachBonus || 1))) {
      const k = rng.pick(prog.attrs);
      if (player.sub[k] !== undefined && player.sub[k] < 94) player.sub[k]++;
    }
    if (prog.face && rng.chance(0.06 * youthBonus * (coachBonus || 1))) {
      if (player.att[prog.face] !== undefined && player.att[prog.face] < 94 &&
          player.att[prog.face] < player.ovr + 8) {
        player.att[prog.face]++;
      }
    }
  };

  // ---- Backroom staff ---------------------------------------------------
  /**
   * Hireable staff. Each has a rating 1-5, a weekly wage, and a concrete
   * effect. Better staff cost more.
   */
  TN.STAFF_ROLES = [
    { id: 'coaching', label: 'Head Coach', icon: '📋',
      effect: 'Speeds up first-team development and training gains.' },
    { id: 'youthRating', label: 'Academy Director', icon: '🌱',
      effect: 'Raises the quality of academy intakes.' },
    { id: 'scouting', label: 'Chief Scout', icon: '🔍',
      effect: 'Finds more prospects abroad and sharpens potential reports.' },
    { id: 'physio', label: 'Head Physio', icon: '⚕',
      effect: 'Fewer injuries, and quicker recovery from them.' },
    { id: 'fitness', label: 'Fitness Coach', icon: '💪',
      effect: 'Players tire more slowly and recover faster between games.' }
  ];

  TN.FIRST_NAMES = ['Marco', 'Steve', 'Jürgen', 'Paulo', 'Andrés', 'Iker', 'Dieter',
    'Rob', 'Massimo', 'Henrik', 'Yannick', 'Tomas', 'Diego', 'Lars', 'Owen',
    'Gareth', 'Rui', 'Sergio', 'Niko', 'Patrick', 'Xabi', 'Bruno', 'Erik'];
  TN.LAST_NAMES = ['Vialli', 'Hodgson', 'Kramer', 'Bento', 'Mendieta', 'Larsson',
    'Brandt', 'Feyen', 'Rossi', 'Olsen', 'Dubois', 'Novak', 'Herrera', 'Sørensen',
    'Whelan', 'Pritchard', 'Costa', 'Marino', 'Havel', 'Dupont', 'Ibarra'];

  /** Weekly wage for a staff member of a given quality. */
  TN.staffWage = function (rating, clubRep) {
    return Math.round((1400 + Math.pow(rating, 2.4) * 1500) * (0.55 + clubRep / 130));
  };

  /** Generate a shortlist of candidates for a role. */
  TN.candidates = function (role, club, rng, count) {
    const out = [];
    const n = count || 4;
    for (let i = 0; i < n; i++) {
      // Big clubs attract better applicants.
      const base = 1.5 + club.rep / 34;
      const rating = U.clamp(Math.round(rng.normalClamped(base, 1.1, 1, 5)), 1, 5);
      out.push({
        name: rng.pick(TN.FIRST_NAMES) + ' ' + rng.pick(TN.LAST_NAMES),
        role: role.id,
        rating: rating,
        wage: TN.staffWage(rating, club.rep),
        age: rng.int(34, 64)
      });
    }
    return U.sortBy(out, s => s.rating, true);
  };

  /** Blank staff roster - everything at the club's default level. */
  TN.initStaff = function (club) {
    const staff = {};
    TN.STAFF_ROLES.forEach(r => {
      const level = club[r.id] !== undefined ? club[r.id] : 3;
      staff[r.id] = {
        name: null, rating: level, wage: 0, hired: false
      };
    });
    return staff;
  };

  /** Effective rating for a role, preferring a hired specialist. */
  TN.level = function (state, club, roleId) {
    const s = state.staff && state.staff[roleId];
    if (s && s.hired) return s.rating;
    // A national-team-only manager has no club to fall back on.
    if (club && club[roleId] !== undefined) return club[roleId];
    return 3;
  };

  TN.totalStaffWage = function (state) {
    let total = 0;
    for (const k in (state.staff || {})) {
      if (state.staff[k].hired) total += state.staff[k].wage;
    }
    return total;
  };

  FCM.TN = TN;
})(window.FCM = window.FCM || {});
