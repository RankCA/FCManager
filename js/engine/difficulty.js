/* Difficulty presets: board expectations, budgets and job security. */
(function (FCM) {
  'use strict';

  const U = FCM.U;
  const D = {};

  /**
   * budgetMult      - multiplier on transfer/wage budgets
   * expectOffset    - shifts the board's target finish. Positive = more
   *                   lenient (a higher, easier league position is accepted);
   *                   negative = they want you finishing higher up.
   * confDrop        - how hard a bad result hits board confidence
   * confGain        - how much a good result repairs it
   * sackAt          - confidence below this and you are gone
   * graceDays       - untouchable for this many days into a new job
   * godMode         - unlocks the sandbox editing tools
   */
  D.LEVELS = {
    sandbox: {
      id: 'sandbox', label: 'Sandbox', blurb: 'God mode. Edit ratings, force transfers, set your own budget.',
      budgetMult: 1, expectOffset: 99, confDrop: 0, confGain: 0,
      sackAt: -1, graceDays: 9999, godMode: true, tint: 'purple'
    },
    easy: {
      id: 'easy', label: 'Easy', blurb: 'Low expectations. You would have to fail spectacularly to be sacked.',
      budgetMult: 1.45, expectOffset: 5, confDrop: 0.45, confGain: 1.5,
      sackAt: 8, graceDays: 400, godMode: false, tint: 'green'
    },
    normal: {
      id: 'normal', label: 'Normal', blurb: 'Realistic expectations. Most games matter.',
      budgetMult: 1, expectOffset: 0, confDrop: 1, confGain: 1,
      sackAt: 22, graceDays: 180, godMode: false, tint: 'blue'
    },
    hard: {
      id: 'hard', label: 'Hard', blurb: 'Ambitious expectations. Every game matters.',
      budgetMult: 0.78, expectOffset: -4, confDrop: 1.5, confGain: 0.8,
      sackAt: 32, graceDays: 110, godMode: false, tint: 'gold'
    },
    nightmare: {
      id: 'nightmare', label: 'Nightmare',
      blurb: 'Outlandish expectations and a slashed budget. They want you gone.',
      budgetMult: 0.5, expectOffset: -9, confDrop: 2.3, confGain: 0.55,
      sackAt: 44, graceDays: 60, godMode: false, tint: 'red'
    }
  };

  D.ORDER = ['sandbox', 'easy', 'normal', 'hard', 'nightmare'];

  D.get = function (id) { return D.LEVELS[id] || D.LEVELS.normal; };

  D.isGod = function () {
    const s = FCM.G.state;
    return !!(s && D.get(s.difficulty).godMode);
  };

  /** Hard ceiling on sandbox money. */
  D.SANDBOX_CAP = 1e9;

  /** Apply the budget modifier once, when a career begins. */
  D.applyBudgets = function (club, level) {
    if (level.godMode) {
      // Sandbox starts with a billion in the bank, and the transfer budget
      // is drawn straight from it - spending reduces both together.
      club.balance = D.SANDBOX_CAP;
      club.transferBudget = D.SANDBOX_CAP;
      club.wageBudget = Math.round(D.SANDBOX_CAP / 20);
      return;
    }
    club.transferBudget = Math.round(club.transferBudget * level.budgetMult);
    club.wageBudget = Math.round(club.wageBudget * (0.6 + 0.4 * level.budgetMult));
  };

  /** In sandbox the transfer budget can never exceed the money in the bank. */
  D.clampBudgetToBalance = function (club) {
    if (club.transferBudget > club.balance) club.transferBudget = Math.max(0, club.balance);
  };

  /**
   * Board confidence after a league matchday, judged against the target
   * position. Returns the delta applied.
   */
  D.judgeResult = function (state, outcome, importance) {
    const level = D.get(state.difficulty);
    if (level.sackAt < 0) return 0;
    let delta;
    if (outcome > 0) delta = 1.6 * level.confGain;
    else if (outcome === 0) delta = -0.15 * level.confDrop;
    else delta = -1.9 * level.confDrop;
    delta *= (importance || 1);
    state.board.confidence = U.clamp(state.board.confidence + delta, 0, 100);
    return delta;
  };

  /** League position vs the board's target, applied periodically. */
  D.judgeStanding = function (state, position, target) {
    const level = D.get(state.difficulty);
    if (level.sackAt < 0) return 0;
    const gap = target - position;           // positive = ahead of target
    const delta = U.clamp(gap * 0.55, -4, 3) * (gap < 0 ? level.confDrop : level.confGain);
    state.board.confidence = U.clamp(state.board.confidence + delta, 0, 100);
    return delta;
  };

  /** Are we out of a job? */
  /**
   * The confidence floor below which you lose the job, adjusted for who
   * owns the club: a supporter-owned board rides out a bad run that a
   * hedge fund would sack you over.
   */
  function sackFloor(state) {
    const level = D.get(state.difficulty);
    if (level.sackAt < 0) return -1;
    const club = FCM.DB.clubById[state.userClubId];
    const patience = (FCM.OW && club) ? FCM.OW.patience(state, club) : 1;
    // More patience means they tolerate a lower confidence before acting.
    return U.clamp(level.sackAt / patience, 2, 60);
  }
  D.sackFloor = sackFloor;

  D.checkSacking = function (state) {
    const floor = sackFloor(state);
    if (floor < 0) return false;
    const level = D.get(state.difficulty);
    if (state.daysInJob < level.graceDays * ((FCM.OW && FCM.DB.clubById[state.userClubId])
      ? FCM.OW.patience(state, FCM.DB.clubById[state.userClubId]) : 1)) return false;
    return state.board.confidence <= floor;
  };

  /** Warning band just above the sack threshold. */
  D.underPressure = function (state) {
    const floor = sackFloor(state);
    if (floor < 0) return false;
    return state.board.confidence <= floor + 14;
  };

  FCM.D = D;
})(window.FCM = window.FCM || {});
