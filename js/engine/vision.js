/* The club's vision: what the board wants over years, not weekends.

   Season objectives ask where you will finish. A vision asks what the club
   should become - established in Europe, a young side, self-sustaining,
   a trophy in the cabinet - and gives you three to five years to do it.
   Deliver and the job is yours for as long as you want it. Fail and no
   amount of decent league finishes saves you. */
(function (FCM) {
  'use strict';

  const U = FCM.U;
  const VS = {};

  function trophyCount(state) {
    return ((state.career && state.career.trophies) || []).length;
  }

  /**
   * Every goal knows how to measure itself. `progress` returns 0-1, and
   * `detail` the line shown under it.
   */
  VS.GOALS = {
    silverware: {
      id: 'silverware', label: 'Win a major trophy',
      blurb: 'The cabinet has been bare for too long.',
      years: 4,
      progress: (s) => Math.min(1, trophyCount(s) / Math.max(1, s.vision.target)),
      detail: (s) => trophyCount(s) + ' of ' + s.vision.target + ' won'
    },
    europe: {
      id: 'europe', label: 'Establish us in Europe',
      blurb: 'Qualify for continental football and keep us there.',
      years: 4,
      progress: (s) => Math.min(1, (s.vision.europeSeasons || 0) / s.vision.target),
      detail: (s) => (s.vision.europeSeasons || 0) + ' of ' + s.vision.target +
        ' seasons qualified'
    },
    youth: {
      id: 'youth', label: 'Build a young side',
      blurb: 'Bring the average age down and trust the academy.',
      years: 3,
      progress: (s) => {
        const club = FCM.DB.clubById[s.userClubId];
        if (!club) return 0;
        const squad = FCM.DB.squadOf(club).filter(p => !p.isYouth);
        if (!squad.length) return 0;
        const avg = U.mean(squad, p => p.age);
        // From wherever they started, down to the target.
        const from = s.vision.startValue || avg;
        if (from <= s.vision.target) return 1;
        return U.clamp((from - avg) / (from - s.vision.target), 0, 1);
      },
      detail: (s) => {
        const club = FCM.DB.clubById[s.userClubId];
        const squad = club ? FCM.DB.squadOf(club).filter(p => !p.isYouth) : [];
        const avg = squad.length ? U.mean(squad, p => p.age) : 0;
        return 'Average age ' + avg.toFixed(1) + ', target ' + s.vision.target.toFixed(1);
      }
    },
    selfsustaining: {
      id: 'selfsustaining', label: 'Make us self-sustaining',
      blurb: 'Run a profit across the period without gutting the squad.',
      years: 3,
      progress: (s) => {
        const club = FCM.DB.clubById[s.userClubId];
        if (!club) return 0;
        const from = s.vision.startValue || 0;
        if (s.vision.target <= from) return 1;
        return U.clamp((club.balance - from) / (s.vision.target - from), 0, 1);
      },
      detail: (s) => {
        const club = FCM.DB.clubById[s.userClubId];
        return 'Balance ' + U.money(club ? club.balance : 0) +
          ', target ' + U.money(s.vision.target);
      }
    },
    academy: {
      id: 'academy', label: 'Make the academy produce',
      blurb: 'Graduates should be playing first-team football, not sitting.',
      years: 4,
      progress: (s) => Math.min(1, (s.vision.graduateApps || 0) / s.vision.target),
      detail: (s) => (s.vision.graduateApps || 0) + ' of ' + s.vision.target +
        ' league appearances by academy graduates'
    }
  };

  /**
   * Set a vision suited to where the club actually is. A struggling side is
   * not asked to win the European Cup, and a giant is not congratulated for
   * balancing the books.
   */
  VS.create = function (state, club, rng) {
    const league = FCM.DB.leagueOf(club);
    const peers = U.sortBy(FCM.DB.clubsInLeague(club.league), c => c.rep, true);
    const rank = peers.findIndex(c => c.id === club.id) + 1;
    const top = rank <= Math.max(3, Math.ceil(peers.length * 0.2));
    const squad = FCM.DB.squadOf(club).filter(p => !p.isYouth);
    const avgAge = squad.length ? U.mean(squad, p => p.age) : 26;

    // Weighted by what would actually be a stretch for this club.
    const pool = [];
    if (top) pool.push({ id: 'silverware', w: 5 }, { id: 'europe', w: 3 });
    else pool.push({ id: 'europe', w: 4 }, { id: 'silverware', w: 1 });
    if (avgAge > 25.5) pool.push({ id: 'youth', w: 3 });
    if (club.balance < club.revenue * 0.25) pool.push({ id: 'selfsustaining', w: 4 });
    pool.push({ id: 'academy', w: 2 });

    const pick = rng.weighted(pool, x => x.w).id;
    const goal = VS.GOALS[pick];

    const v = {
      goal: pick,
      startSeason: state.season,
      endSeason: state.season + goal.years - 1,
      years: goal.years,
      startValue: null,
      target: null,
      europeSeasons: 0,
      graduateApps: 0,
      done: false,
      failed: false
    };
    if (pick === 'silverware') v.target = top ? 2 : 1;
    else if (pick === 'europe') v.target = Math.max(2, goal.years - 1);
    else if (pick === 'youth') { v.startValue = avgAge; v.target = Math.max(23, avgAge - 2); }
    else if (pick === 'selfsustaining') {
      v.startValue = club.balance;
      v.target = club.balance + Math.round(club.revenue * 0.35);
    } else if (pick === 'academy') v.target = top ? 60 : 90;
    return v;
  };

  VS.goalOf = function (state) {
    return state.vision ? VS.GOALS[state.vision.goal] : null;
  };

  VS.progress = function (state) {
    const g = VS.goalOf(state);
    if (!g || !state.vision) return 0;
    return U.clamp(g.progress(state), 0, 1);
  };

  VS.yearsLeft = function (state) {
    if (!state.vision) return 0;
    return Math.max(0, state.vision.endSeason - state.season + 1);
  };

  /**
   * Called at the season rollover. Records another year of progress and
   * settles the vision when its term is up.
   * Returns 'met', 'failed' or null.
   */
  VS.closeSeason = function (state, club) {
    const v = state.vision;
    if (!v || v.done || v.failed) return null;

    // Europe is counted a season at a time, since it is about staying there.
    if (v.goal === 'europe') {
      const inEurope = Object.values(state.competitions || {}).some(c =>
        c.type === 'continental' && (c.entrants || []).indexOf(state.userClubId) >= 0);
      if (inEurope) v.europeSeasons = (v.europeSeasons || 0) + 1;
    }

    if (VS.progress(state) >= 1) { v.done = true; return 'met'; }
    if (state.season >= v.endSeason) { v.failed = true; return 'failed'; }
    return null;
  };

  /** Academy graduates earning first-team minutes feeds the academy goal. */
  VS.recordGraduateApp = function (state, player) {
    const v = state.vision;
    if (!v || v.goal !== 'academy' || v.done || v.failed) return;
    if (!player.isNewgen || player.isYouth) return;
    v.graduateApps = (v.graduateApps || 0) + 1;
  };

  FCM.VS = VS;
})(window.FCM = window.FCM || {});
