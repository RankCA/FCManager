/* Opposition analysis: what your analysts can tell you about the next
   opponent, and how good that intelligence is.

   The depth of a report tracks your Chief Scout. A 1-star operation gives
   you a form guide and little else; a 5-star one names their danger man,
   finds the weak side of their defence and suggests how to set up. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P, T = FCM.T;
  const SCO = {};

  /** How much a report tells you, 1-5, from the Chief Scout you employ. */
  SCO.reportLevel = function (state, club) {
    return FCM.TN ? FCM.TN.level(state, club, 'scouting') : (club.scouting || 3);
  };

  /**
   * The XI the opponent is most likely to name, and what it is worth. Reads
   * their actual tactics, so it is genuinely what you will face.
   */
  function projectedXI(club) {
    const tac = FCM.G.tacticsFor(club);
    const slots = T.FORMATIONS[tac.formation] || T.FORMATIONS['4-2-3-1'];
    const xi = [];
    tac.lineup.forEach((id, i) => {
      const p = FCM.DB.byId[id];
      if (p && slots[i]) xi.push({ player: p, pos: slots[i].pos, x: slots[i].x, y: slots[i].y });
    });
    return { tactics: tac, formation: tac.formation, xi: xi };
  }

  /** Mean effective rating of each unit, on the familiar 0-99 scale. */
  function unitAverages(side) {
    const bucket = { att: [], mid: [], def: [], gk: [] };
    side.xi.forEach(s => {
      const g = P.GROUP[s.pos] || 'MID';
      const key = g === 'GK' ? 'gk' : g.toLowerCase();
      (bucket[key] || bucket.mid).push(P.overallAt(s.player, s.pos));
    });
    const mean = a => (a.length ? Math.round(U.mean(a, x => x)) : 0);
    return { att: mean(bucket.att), mid: mean(bucket.mid),
      def: mean(bucket.def), gk: mean(bucket.gk) };
  }

  /**
   * Where they are strong and where they can be got at. Compares their
   * attack, midfield and defence against yours rather than in the abstract,
   * because "solid at the back" only means anything relative to your attack.
   */
  SCO.report = function (state, myClub, oppClub) {
    if (!oppClub) return null;
    const level = SCO.reportLevel(state, myClub);
    const them = projectedXI(oppClub);
    const us = projectedXI(myClub);
    const theirR = T.teamRatings(them.tactics, FCM.DB.byId);
    const ourR = T.teamRatings(us.tactics, FCM.DB.byId);

    // Form lives on the league table row, not the club - clubs carry an
    // empty `form` array that nothing ever writes to.
    const row = (FCM.G.leagueTable(oppClub.league) || [])
      .find(r => r.club === oppClub.id);
    const form = row ? (row.form || []).slice(-6) : [];
    const wins = form.filter(f => f === 'W').length;
    const losses = form.filter(f => f === 'L').length;

    const rep = {
      club: oppClub, level: level, formation: them.formation,
      form: form, wins: wins, losses: losses,
      ratings: theirR, ourRatings: ourR,
      // Averages, so a reader can compare them to a player's rating.
      units: unitAverages(them), ourUnits: unitAverages(us),
      xiRating: Math.round(T.lineupStrength(them.tactics, FCM.DB.byId)),
      ourXiRating: Math.round(T.lineupStrength(us.tactics, FCM.DB.byId)),
      strengths: [], weaknesses: [], advice: null,
      danger: null, weakFlank: null, xi: null
    };

    // Level 1 gets the form guide and nothing else.
    if (level >= 2) {
      const diffs = [
        { key: 'att', label: 'attack', mine: rep.ourUnits.def, theirs: rep.units.att },
        { key: 'mid', label: 'midfield', mine: rep.ourUnits.mid, theirs: rep.units.mid },
        { key: 'def', label: 'defence', mine: rep.ourUnits.att, theirs: rep.units.def }
      ];
      diffs.forEach(d => {
        const edge = d.theirs - d.mine;
        if (edge > 3) {
          rep.strengths.push('Their ' + d.label + ' is stronger than what we put ' +
            'against it (' + Math.round(d.theirs) + ' v ' + Math.round(d.mine) + ').');
        } else if (edge < -3) {
          rep.weaknesses.push('We are the better side against their ' + d.label +
            ' (' + Math.round(d.mine) + ' v ' + Math.round(d.theirs) + ').');
        }
      });
    }

    if (level >= 3) {
      // Their most dangerous player, by form as much as rating.
      const rated = them.xi.map(s => ({
        player: s.player, pos: s.pos,
        threat: P.overallAt(s.player, s.pos) + ((s.player.form || 6.6) - 6.6) * 6 +
          (s.player.goals || 0) * 0.8
      }));
      const top = U.sortBy(rated, r => r.threat, true)[0];
      if (top) rep.danger = { player: top.player, pos: top.pos };
    }

    if (level >= 4) {
      // The softest side of their defence, which is where to attack.
      const backs = them.xi.filter(s => ['LB', 'RB', 'CB', 'LWB', 'RWB'].indexOf(s.pos) >= 0);
      const left = backs.filter(s => s.x < 40);
      const right = backs.filter(s => s.x > 60);
      const mean = list => list.length ? U.mean(list, s => P.overallAt(s.player, s.pos)) : 99;
      const l = mean(left), r = mean(right);
      if (Math.abs(l - r) > 2.5) {
        rep.weakFlank = l < r
          ? { side: 'their left', attack: 'our right', rating: Math.round(l) }
          : { side: 'their right', attack: 'our left', rating: Math.round(r) };
      }
      // Anyone carrying a booking risk or coming back from injury.
      rep.doubts = them.xi
        .filter(s => s.player.fitness < 82 || (s.player.yellow || 0) >= 4)
        .map(s => s.player.name + (s.player.fitness < 82
          ? ' (' + Math.round(s.player.fitness) + '% fit)' : ' (one booking from a ban)'));
    }

    if (level >= 5) {
      rep.xi = them.xi;
      // A concrete recommendation, drawn from the gaps found above.
      const m = them.tactics;
      if (rep.weakFlank) {
        rep.advice = 'Attack down ' + rep.weakFlank.attack + '. ' +
          rep.weakFlank.side.charAt(0).toUpperCase() + rep.weakFlank.side.slice(1) +
          ' is the soft side of their back line.';
      } else if (m.defLine >= 4) {
        rep.advice = 'They play a high line. Direct passing in behind will hurt them.';
      } else if (m.pressing >= 4) {
        rep.advice = 'They press hard. Play quicker and skip the build-up phase.';
      } else if (theirR.mid > ourR.mid + 4) {
        rep.advice = 'They will control midfield. Sit deeper and hit them on the break.';
      } else {
        rep.advice = 'No obvious weakness. Play your own game.';
      }
    }

    return rep;
  };

  /** A one-line read on how hard this looks. */
  SCO.verdict = function (rep) {
    if (!rep) return '';
    const gap = rep.xiRating - rep.ourXiRating;
    if (gap > 6) return 'A serious step up. We will need to be at our best.';
    if (gap > 2) return 'They are the better side on paper.';
    if (gap > -2) return 'Very little between the two teams.';
    if (gap > -6) return 'We should have enough for this.';
    return 'We are far stronger. Anything but a win is a bad day.';
  };

  FCM.SCO = SCO;
})(window.FCM = window.FCM || {});
