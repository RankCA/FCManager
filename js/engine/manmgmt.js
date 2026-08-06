/* Man management: promises you have to keep, conversations with players,
   the dressing room, and the press.

   The squad already had morale and could hand in transfer requests, but a
   promise of game time was recorded and never checked again - so it cost
   nothing to make one and never honour it. Everything here exists to give
   your word weight. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P;
  const MM = {};

  // ---- Promises --------------------------------------------------------
  /**
   * What you can promise, how long you get, and what it takes to deliver.
   * `minutesShare` is the fraction of the club's available minutes he
   * expects over the life of the promise.
   */
  MM.PROMISES = {
    gametime: {
      id: 'gametime', label: 'Regular football', weeks: 12, minutesShare: 0.55,
      accept: 'He will judge you on the next three months.',
      kept: 'You kept your word about his game time.',
      broken: 'You promised him football and he has barely played.'
    },
    starter: {
      id: 'starter', label: 'A place in the first XI', weeks: 12, minutesShare: 0.75,
      accept: 'He expects to start almost every week now.',
      kept: 'You made him a starter, as promised.',
      broken: 'You promised him a starting place and left him on the bench.'
    },
    review: {
      id: 'review', label: 'Review his contract soon', weeks: 8, contract: true,
      accept: 'He will wait for an improved offer.',
      kept: 'His new deal arrived as promised.',
      broken: 'You promised to improve his terms and never did.'
    }
  };

  MM.DAYS_PER_WEEK = 7;

  /** Make a promise. Returns the acceptance line. */
  MM.promise = function (pl, kind, state) {
    const spec = MM.PROMISES[kind];
    if (!spec) return null;
    pl.promise = {
      kind: kind,
      madeDay: state.day,
      madeSeason: state.season,
      dueDay: state.day + spec.weeks * MM.DAYS_PER_WEEK,
      // Snapshot his minutes so progress is measured from today, not from
      // whatever he had already banked this season.
      startMinutes: pl.minutes || 0,
      startWage: pl.wage
    };
    pl.morale = U.clamp(pl.morale + 14, 0, 100);
    pl.transferRequested = false;
    pl.transferListed = false;
    return spec.accept;
  };

  /**
   * Has an outstanding promise been delivered? Returns 'kept', 'broken' or
   * null while it is still running.
   */
  MM.judgePromise = function (pl, club, state) {
    const pr = pl.promise;
    if (!pr) return null;
    const spec = MM.PROMISES[pr.kind];
    if (!spec) { pl.promise = null; return null; }

    if (spec.contract) {
      // Improving his terms at any point settles it early.
      if (pl.wage > pr.startWage * 1.05) return 'kept';
      return state.day >= pr.dueDay || state.day < pr.madeDay ? 'broken' : null;
    }

    // A season rollover resets minutes, so a promise spanning it is judged
    // on what he has managed since - never on a negative difference.
    const played = Math.max(0, (pl.minutes || 0) - pr.startMinutes);
    const weeksElapsed = Math.max(1, (state.day - pr.madeDay) / MM.DAYS_PER_WEEK);
    const expected = weeksElapsed * 90 * spec.minutesShare;

    if (state.day >= pr.dueDay || state.day < pr.madeDay) {
      return played >= expected * 0.8 ? 'kept' : 'broken';
    }
    // Cut it short early if it is already unrecoverable: half the window
    // gone and under a quarter of the football.
    if (weeksElapsed > spec.weeks / 2 && played < expected * 0.25) return 'broken';
    return null;
  };

  /**
   * Settle any promise that has run its course. Returns a list of
   * {player, outcome, text} for the inbox.
   */
  MM.reviewPromises = function (club, state) {
    const out = [];
    FCM.DB.squadOf(club).forEach(pl => {
      const verdict = MM.judgePromise(pl, club, state);
      if (!verdict) return;
      const spec = MM.PROMISES[pl.promise.kind];
      pl.promise = null;
      if (verdict === 'kept') {
        pl.morale = U.clamp(pl.morale + 10, 0, 100);
        pl.loyalty = U.round(Math.min(2, (pl.loyalty || 1) + 0.12), 2);
        pl.trustBroken = Math.max(0, (pl.trustBroken || 0) - 1);
        out.push({ player: pl, outcome: 'kept', text: spec.kept });
      } else {
        // Breaking your word is what actually hurts: a big morale hit, and
        // he remembers, so the next promise is worth less.
        pl.morale = U.clamp(pl.morale - 30, 0, 100);
        pl.loyalty = U.round(Math.max(0.3, (pl.loyalty || 1) - 0.25), 2);
        pl.trustBroken = (pl.trustBroken || 0) + 1;
        if (pl.trustBroken >= 2) { pl.transferRequested = true; pl.transferListed = true; }
        out.push({ player: pl, outcome: 'broken', text: spec.broken });
      }
    });
    return out;
  };

  // ---- Conversations ---------------------------------------------------
  /**
   * Talking to a player is a judgement call, not a free morale button.
   * Praising someone in poor form reads as hollow; criticising a player who
   * is carrying the side is insulting. Each returns {delta, text, good}.
   */
  MM.CHATS = {
    praise: { id: 'praise', label: 'Praise his form', needsForm: 'good' },
    criticise: { id: 'criticise', label: 'Tell him to do more', needsForm: 'bad' },
    reassure: { id: 'reassure', label: 'Reassure him', needsMorale: 'low' },
    challenge: { id: 'challenge', label: 'Challenge him to step up', needsMorale: 'high' }
  };

  MM.chat = function (pl, kind, rng, state) {
    const form = pl.form || 6.6;
    const morale = pl.morale;
    const ego = pl.ambition || 1;
    let good, text;

    switch (kind) {
      case 'praise':
        good = form >= 6.9;
        text = good
          ? 'He appreciates being noticed and looks lifted.'
          : 'He knows he has not been playing well. The praise rings hollow.';
        break;
      case 'criticise':
        good = form < 6.5;
        text = good
          ? 'He accepts it and says he will put it right.'
          : 'He points to his own performances and takes it badly.';
        break;
      case 'reassure':
        good = morale < 50;
        text = good
          ? 'He needed to hear it, and looks steadier for it.'
          : 'He was not worried, and wonders why you thought he was.';
        break;
      default: // challenge
        good = morale >= 60 && ego >= 0.9;
        text = good
          ? 'He takes the challenge on and wants to prove you right.'
          : 'He is in no state to be pushed, and takes it as criticism.';
        break;
    }

    // Size of the swing scales with his ego: the ambitious ones react hardest
    // in both directions.
    const base = good ? rng.int(6, 13) : -rng.int(5, 12);
    const delta = Math.round(base * (0.75 + ego * 0.35));
    pl.morale = U.clamp(pl.morale + delta, 0, 100);
    pl.lastChatDay = state ? state.day : 0;
    return { delta: delta, text: text, good: good };
  };

  /** One conversation per player per fortnight, or it is just a slot machine. */
  MM.CHAT_COOLDOWN = 14;
  MM.canChat = function (pl, state) {
    if (pl.lastChatDay === undefined || pl.lastChatDay === null) return true;
    return state.day - pl.lastChatDay >= MM.CHAT_COOLDOWN ||
      state.day < pl.lastChatDay;   // a new season has rolled over
  };

  // ---- Dressing room ---------------------------------------------------
  /**
   * How much weight a player's mood carries with the rest of the squad.
   * Senior, well-known, long-serving players set the tone.
   */
  MM.influence = function (pl) {
    const age = U.clamp((pl.age - 20) / 14, 0, 1);
    const standing = U.clamp((pl.ovr - 62) / 28, 0, 1);
    const fame = U.clamp(((pl.rep || 1) - 1) / 4, 0, 1);
    return U.round(0.25 + age * 0.3 + standing * 0.3 + fame * 0.15, 2);
  };

  /** The handful of players whose mood is actually moving the room. */
  MM.dressingRoom = function (club) {
    const squad = FCM.DB.squadOf(club);
    const rated = squad.map(p => ({
      player: p, influence: MM.influence(p),
      pull: U.round((p.morale - 60) / 40 * MM.influence(p), 2)
    }));
    return U.sortBy(rated, r => Math.abs(r.pull), true);
  };

  /**
   * Influential players drag the room with them. A furious captain does far
   * more damage than a furious fifth-choice full-back.
   */
  MM.spreadMood = function (club, rng) {
    const room = MM.dressingRoom(club);
    if (room.length < 4) return;
    const movers = room.slice(0, 4);
    const swing = U.sum(movers, m => m.pull) / movers.length;
    if (Math.abs(swing) < 0.12) return;
    FCM.DB.squadOf(club).forEach(p => {
      if (movers.some(m => m.player.id === p.id)) return;
      p.morale = U.clamp(p.morale + swing * rng.range(1.2, 2.4), 0, 100);
    });
  };

  // ---- Press conferences -----------------------------------------------
  /**
   * Questions are drawn from what is actually happening: the next opponent,
   * your recent form, an unhappy player. Each answer trades squad morale
   * against board confidence, and there is rarely a free win.
   */
  MM.pressQuestions = function (state, club, rng) {
    const qs = [];
    const G = FCM.G;
    const next = G.nextUserFixture();
    const form = (club.form || []).slice(-5);
    const wins = form.filter(f => f === 'W').length;
    const losses = form.filter(f => f === 'L').length;

    if (next && !next.international) {
      const oppId = next.home === club.id ? next.away : next.home;
      const opp = FCM.DB.clubById[oppId];
      if (opp) {
        const stronger = (opp.rep || 0) > (club.rep || 0);
        qs.push({
          id: 'opponent',
          text: stronger
            ? opp.name + ' are the better side on paper. Are you expecting to lose?'
            : 'You are favourites against ' + opp.name + '. Is this a must-win?',
          answers: [
            { text: 'We will beat them.', morale: 4, board: 5, risk: true,
              note: 'The squad likes the confidence; the board will hold you to it.' },
            { text: 'We respect them, but we back ourselves.', morale: 2, board: 1,
              note: 'A safe answer nobody will remember.' },
            { text: 'They are the better team.', morale: -5, board: -3,
              note: 'The dressing room hears you writing the game off.' }
          ]
        });
      }
    }

    if (losses >= 2) {
      qs.push({
        id: 'badrun',
        text: 'That is ' + losses + ' defeats in five. Is your job under threat?',
        answers: [
          { text: 'Results are my responsibility.', morale: 6, board: 2,
            note: 'Taking the bullet for the players buys you goodwill inside.' },
          { text: 'The players have to be better.', morale: -8, board: 3,
            note: 'The board likes the honesty. The squad does not.' },
          { text: 'I am not discussing my future.', morale: 0, board: -2,
            note: 'Reads as rattled.' }
        ]
      });
    } else if (wins >= 3) {
      qs.push({
        id: 'goodrun',
        text: wins + ' wins in five. Are you in the title race?',
        answers: [
          { text: 'We are going for it.', morale: 5, board: 6, risk: true,
            note: 'Raises expectations you will be judged against.' },
          { text: 'One game at a time.', morale: 1, board: 0,
            note: 'Nobody could object.' },
          { text: 'We are nowhere near that yet.', morale: -4, board: -1,
            note: 'The players think you do not rate them.' }
        ]
      });
    }

    const unhappy = U.sortBy(FCM.DB.squadOf(club).filter(p => p.morale < 40),
      p => p.morale)[0];
    if (unhappy) {
      qs.push({
        id: 'unhappy',
        text: 'There are reports ' + unhappy.name + ' is unsettled. What is the situation?',
        answers: [
          { text: 'He is going nowhere. He is important to us.', morale: 3, board: -1,
            player: unhappy, playerMorale: 14,
            note: 'Backing him publicly means a lot to him.' },
          { text: 'Everyone here is available at the right price.', morale: -4, board: 4,
            player: unhappy, playerMorale: -16,
            note: 'The board likes hearing it. He will not.' },
          { text: 'I do not comment on speculation.', morale: 0, board: 0,
            note: 'Straight bat.' }
        ]
      });
    }

    // Two questions is a press conference; six is an interrogation.
    return rng.shuffle(qs).slice(0, 2);
  };

  /** Apply an answer. Returns the note to show. */
  MM.answerPress = function (state, club, answer) {
    FCM.DB.squadOf(club).forEach(p => {
      p.morale = U.clamp(p.morale + (answer.morale || 0), 0, 100);
    });
    if (answer.player) {
      answer.player.morale = U.clamp(answer.player.morale + (answer.playerMorale || 0), 0, 100);
    }
    state.board.confidence = U.clamp(state.board.confidence + (answer.board || 0), 0, 100);
    // A bold claim raises what the board expects of the next few games.
    if (answer.risk) state.pressBravado = (state.pressBravado || 0) + 1;
    return answer.note;
  };

  FCM.MM = MM;
})(window.FCM = window.FCM || {});
