/* Club finances: income and expense ledger, stadium expansion, staff. */
(function (FCM) {
  'use strict';

  const U = FCM.U;
  const F = {};

  /** Expense categories, in the order they appear in the donut chart. */
  F.EXPENSE_CATS = [
    { key: 'wages', label: 'Player wages', colour: '#22c55e' },
    { key: 'staff', label: 'Staff wages', colour: '#3b82f6' },
    { key: 'transfers', label: 'Transfer fees', colour: '#a855f7' },
    { key: 'stadium', label: 'Stadium upkeep', colour: '#f5b301' },
    { key: 'youth', label: 'Youth academy', colour: '#0ea5e9' },
    { key: 'scouting', label: 'Scouting', colour: '#f97316' },
    { key: 'matchday', label: 'Matchday costs', colour: '#64748b' }
  ];

  F.INCOME_CATS = [
    { key: 'gate', label: 'Matchday', colour: '#22c55e' },
    { key: 'tv', label: 'TV & prize money', colour: '#3b82f6' },
    { key: 'commercial', label: 'Commercial', colour: '#a855f7' },
    { key: 'sales', label: 'Player sales', colour: '#f5b301' }
  ];

  F.blankLedger = function () {
    const l = { income: {}, expense: {} };
    F.INCOME_CATS.forEach(c => { l.income[c.key] = 0; });
    F.EXPENSE_CATS.forEach(c => { l.expense[c.key] = 0; });
    return l;
  };

  F.addIncome = function (state, key, amount) {
    if (!state.ledger) state.ledger = F.blankLedger();
    state.ledger.income[key] = (state.ledger.income[key] || 0) + amount;
  };
  F.addExpense = function (state, key, amount) {
    if (!state.ledger) state.ledger = F.blankLedger();
    state.ledger.expense[key] = (state.ledger.expense[key] || 0) + amount;
  };

  F.totalIncome = function (l) { return U.sum(Object.values(l.income)); };
  F.totalExpense = function (l) { return U.sum(Object.values(l.expense)); };

  // ---- Staff -------------------------------------------------------
  /** Weekly cost of the backroom team, scaled by facility levels. */
  F.staffWages = function (club) {
    const level = (club.coaching + club.youthRating + club.scouting + club.facilities) / 4;
    return Math.round(club.rep * 260 * (0.5 + level * 0.22));
  };

  /** Weekly stadium running cost. */
  F.stadiumUpkeep = function (club) {
    return Math.round(club.capacity * 3.4);
  };

  // ---- Stadium expansion -------------------------------------------
  F.MAX_CAPACITY = 90000;
  F.EXPANSION_STEPS = [2000, 5000, 10000, 20000];

  /** Cost of adding `seats`, with economies of scale. */
  F.expansionCost = function (club, seats) {
    const base = seats * 2600;
    // Expanding a large stadium is disproportionately expensive.
    const scale = 1 + Math.max(0, club.capacity - 30000) / 90000;
    return Math.round(base * scale);
  };

  F.expansionWeeks = function (seats) {
    return Math.max(8, Math.round(seats / 500));
  };

  F.canExpand = function (club, seats) {
    return club.capacity + seats <= F.MAX_CAPACITY;
  };

  /**
   * Begin a build. Progress is tracked in weeks remaining rather than an
   * absolute day, because the day counter resets every season - an absolute
   * target past day 364 would never be reached and the build would hang.
   */
  F.startExpansion = function (club, seats, day) {
    if (!F.canExpand(club, seats)) return null;
    const weeks = F.expansionWeeks(seats);
    return {
      seats: seats,
      cost: F.expansionCost(club, seats),
      startedDay: day,
      totalWeeks: weeks,
      weeksLeft: weeks,
      newCapacity: club.capacity + seats
    };
  };

  /** Tick a build along by a week. Returns true when it finishes. */
  F.advanceExpansion = function (project) {
    if (!project) return false;
    // Older saves stored an absolute completion day.
    if (project.weeksLeft === undefined) {
      project.totalWeeks = F.expansionWeeks(project.seats);
      project.weeksLeft = project.totalWeeks;
    }
    project.weeksLeft = Math.max(0, project.weeksLeft - 1);
    return project.weeksLeft === 0;
  };

  F.expansionProgress = function (project) {
    if (!project) return 0;
    const total = project.totalWeeks || F.expansionWeeks(project.seats);
    const left = project.weeksLeft !== undefined ? project.weeksLeft : total;
    return U.clamp((total - left) / Math.max(1, total), 0, 1);
  };

  // ---- Ticketing ----------------------------------------------------
  F.TICKET_MIN = 12;
  F.TICKET_MAX = 90;

  /**
   * Attendance for a home fixture. Higher prices thin the crowd; winning
   * form and a big stadium reputation fill it.
   */
  F.attendance = function (club, ticketPrice, moraleFactor) {
    const price = ticketPrice || 32;
    // Demand falls away as price rises above the "fair" level for the club.
    // Priced fairly, a well-run club should be near a sell-out.
    const fair = 14 + club.rep * 0.42;
    const priceFactor = U.clamp(1.34 - Math.pow(price / fair, 1.6) * 0.37, 0.25, 1.12);
    const fill = U.clamp((0.66 + moraleFactor * 0.36) * priceFactor, 0.18, 1);
    return Math.round(club.capacity * fill);
  };

  F.matchdayRevenue = function (attendance, ticketPrice) {
    // Gate plus per-head food, drink and merchandise.
    return Math.round(attendance * ((ticketPrice || 32) + 11));
  };

  // ---- Sponsorship ---------------------------------------------------
  /** Weekly commercial income, driven by reputation and recent success. */
  F.commercialWeekly = function (club, trophies) {
    const base = Math.pow(club.rep / 55, 4.2) * 30e6 / 52;
    return Math.round(base * (1 + (trophies || 0) * 0.06));
  };

  F.tvWeekly = function (club, league) {
    const tier = league ? league.tier : 2;
    const base = { 1: 60e6, 2: 9e6, 3: 2.2e6, 4: 1.4e6 }[tier] || 4e6;
    return Math.round(base * (0.70 + 0.60 * club.rep / 100) / 52);
  };

  FCM.F = F;
})(window.FCM = window.FCM || {});
