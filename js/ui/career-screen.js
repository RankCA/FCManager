/* Career screen: honours, records, national jobs, the FA role and the
   best players this manager has worked with. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P, UI = FCM.UI, CR = FCM.CR, IN = FCM.IN;

  function el(t, a, c) { return U.el(t, a, c); }
  function S() { return FCM.G.state; }
  function myClub() { return FCM.DB.clubById[S().userClubId]; }

  FCM.SC.career = function () {
    const s = S(), cr = CR.ensure(s);
    const wrap = el('div', { class: 'stack' });

    const seg = el('div', { class: 'seg', style: 'margin-bottom:2px' });
    if (!FCM.App.careerTab) FCM.App.careerTab = 'overview';
    // Four sections rather than nine: honours, the people, the international
    // side of the job, and the permanent record.
    [['overview', 'Overview'], ['legends', 'Legends'],
     ['intl', 'International'], ['legacy', 'Legacy']]
      .forEach(([id, label]) => {
        const b = el('button', { class: 'seg-btn' + (FCM.App.careerTab === id ? ' active' : ''),
          text: label });
        b.addEventListener('click', function () { FCM.App.careerTab = id; FCM.App.render(); });
        seg.appendChild(b);
      });
    wrap.appendChild(seg);

    // ---------------- Overview ----------------
    if (FCM.App.careerTab === 'overview') {
      const rep = CR.managerReputation(s);
      const hero = el('div', { class: 'career-hero' });
      hero.appendChild(el('div', { class: 'career-name', text: s.managerName }));
      hero.appendChild(el('div', { class: 'career-sub',
        text: (myClub() ? myClub().name : (cr.nation || 'Between jobs')) +
          (cr.nation && myClub() ? '  ·  ' + cr.nation + ' national team' : '') }));
      const medals = el('div', { class: 'career-medals' });
      medals.appendChild(el('div', { class: 'medal' }, [
        el('b', { text: cr.trophies.length }), el('span', { text: 'Trophies' })]));
      medals.appendChild(el('div', { class: 'medal' }, [
        el('b', { text: cr.games }), el('span', { text: 'Games' })]));
      medals.appendChild(el('div', { class: 'medal' }, [
        el('b', { text: cr.games ? Math.round(cr.wins / cr.games * 100) + '%' : '—' }),
        el('span', { text: 'Win rate' })]));
      medals.appendChild(el('div', { class: 'medal' }, [
        el('b', { text: Math.round(rep) }), el('span', { text: 'Reputation' })]));
      hero.appendChild(medals);
      wrap.appendChild(hero);

      // The cabinet is the point of the whole screen, so it goes first.
      const cab = el('div');
      if (!cr.trophies.length) {
        cab.appendChild(el('div', { class: 'empty',
          text: 'The cabinet is bare. Go and win something.' }));
      } else {
        // Group identical trophies so repeat wins read as a haul.
        const byComp = {};
        cr.trophies.forEach(t => { (byComp[t.comp] = byComp[t.comp] || []).push(t); });
        const grid = el('div', { class: 'cabinet' });
        U.sortBy(Object.keys(byComp), k => byComp[k].length, true).forEach(comp => {
          const wins = byComp[comp];
          const isIntl = wins[0].kind === 'international';
          const card = el('div', { class: 'trophy' + (isIntl ? ' intl' : '') });
          card.appendChild(el('div', { class: 'trophy-icon', text: isIntl ? '🌍' : '🏆' }));
          card.appendChild(el('div', { class: 'trophy-count', text: '×' + wins.length }));
          card.appendChild(el('div', { class: 'trophy-name', text: comp }));
          card.appendChild(el('div', { class: 'trophy-years',
            text: wins.map(w => String(w.season).slice(2) + '/' +
              String(w.season + 1).slice(2)).join(', ') }));
          grid.appendChild(card);
        });
        cab.appendChild(grid);
      }
      wrap.appendChild(UI.card('Trophy Cabinet · ' + cr.trophies.length, cab));

      const rec = el('div', { class: 'kv' });
      function res(r) {
        return r ? (r.us + '–' + r.them + ' v ' + r.opp + ' (' + r.comp + ', ' + r.season + ')') : '—';
      }
      [['Record', cr.wins + 'W · ' + cr.draws + 'D · ' + cr.losses + 'L'],
       ['Goals', cr.goalsFor + ' scored, ' + cr.goalsAgainst + ' conceded'],
       ['Biggest win', res(cr.biggestWin)],
       ['Heaviest defeat', res(cr.worstDefeat)],
       ['Longest winning run', cr.longestWinStreak + ' games'],
       ['Longest unbeaten run', cr.longestUnbeaten + ' games'],
       ['Current unbeaten run', cr.currentUnbeaten + ' games']].forEach(([k, v]) => {
        rec.appendChild(el('div', { class: 'k', text: k }));
        rec.appendChild(el('div', { class: 'v', text: v }));
      });
      wrap.appendChild(UI.card('Managerial Record', rec));

      const tr = el('div', { class: 'kv' });
      function deal(d, dir) {
        return d ? (d.name + ' ' + dir + ' ' + d.club + ' for ' + U.money(d.fee) +
          ' (' + d.season + ')') : '—';
      }
      [['Record signing', deal(cr.biggestSigning, 'from')],
       ['Record sale', deal(cr.biggestSale, 'to')],
       ['Ballon d’Or winners coached', cr.ballonDors.length
         ? cr.ballonDors.map(b => b.name + ' (' + b.season + ')').join(', ') : '—']]
        .forEach(([k, v]) => {
          tr.appendChild(el('div', { class: 'k', text: k }));
          tr.appendChild(el('div', { class: 'v', text: v }));
        });
      wrap.appendChild(UI.card('Transfer Milestones', tr));

      // ---- Career decisions ----
      const acts = el('div');
      acts.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:10px',
        text: 'Leaving frees you to take another job. Retiring ends the career for ' +
          'good and enshrines it in your permanent legacy.' }));
      const btnRow = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' });
      if (myClub()) btnRow.appendChild(el('button', { class: 'btn', text: '🚪 Step down',
        onclick: function () {
          UI.confirm('Leave ' + myClub().name + '?',
            'You will be out of work until you accept another job. Your record, ' +
            'trophies and Hall of Fame all carry over.',
            function () {
              FCM.G.stepDown();
              FCM.App.showJobs = true;
              UI.toast('You have left ' + myClub().name);
              FCM.App.render();
            }, 'Step down');
        } }));
      btnRow.appendChild(el('button', { class: 'btn btn-danger', text: '🏁 Retire',
        onclick: function () { FCM.SC.confirmRetire(); } }));
      acts.appendChild(btnRow);

      if ((s.seasonHistory || []).length) {
        const hist = el('div');
        s.seasonHistory.slice().reverse().forEach(h => {
          const met = h.position <= (h.target || 99);
          const row = el('div', { class: 'row-between small season-row' });
          row.appendChild(el('span', { text: h.season + '/' + String(h.season + 1).slice(2) +
            ' · ' + h.club }));
          row.appendChild(el('span', { class: 'pill ' + (met ? 'pill-good' : 'pill-warn'),
            text: U.ordinal(h.position) }));
          hist.appendChild(row);
        });
        wrap.appendChild(UI.card('Season by Season', hist));
      }

      // Stepping down and retiring sit last - they end things.
      wrap.appendChild(UI.card('Career Decisions', acts));
    }

    // ---------------- Hall of Fame (this save) ----------------
    if (FCM.App.careerTab === 'legends') {
      const list = FCM.HOF.ranked(s);
      const box = el('div');
      box.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:10px',
        text: 'Great players are inducted when they retire. Those who played for ' +
          'you are highlighted.' }));
      if (!list.length) {
        box.appendChild(el('div', { class: 'empty',
          text: 'Nobody has retired into the Hall of Fame yet. Careers take time.' }));
      }
      list.slice(0, 60).forEach(e => {
        const row = el('div', { class: 'hof-row' + (e.wasOurs ? ' ours' : '') });
        row.appendChild(el('div', { class: 'hof-badge', text: e.peakOvr }));
        const info = el('div', { style: 'flex:1;min-width:0' });
        const nameRow = el('div', { class: 'row', style: 'gap:7px;flex-wrap:wrap' });
        nameRow.appendChild(el('span', { class: 'hof-name', text: e.full || e.name }));
        nameRow.appendChild(UI.posPill(e.pos.split('/')[0]));
        if (e.ballonDors.length) {
          nameRow.appendChild(el('span', { class: 'pill',
            style: 'color:var(--gold);border-color:var(--gold)',
            text: '🏅 Ballon d’Or ×' + e.ballonDors.length }));
        }
        if (e.wasOurs) {
          nameRow.appendChild(el('span', { class: 'pill pill-good',
            text: e.seasonsWithUs + ' season' + (e.seasonsWithUs === 1 ? '' : 's') + ' with us' }));
        }
        info.appendChild(nameRow);
        info.appendChild(el('div', { class: 'tiny mute2',
          text: e.nat + ' · retired at ' + e.retiredAt + ' in ' + e.season +
            ' · ' + e.careerGoals + ' goals in ' + e.careerApps + ' games' +
            (e.lastClub ? ' · last at ' + e.lastClub : '') }));
        if (e.awards.length) {
          info.appendChild(el('div', { class: 'tiny', style: 'color:var(--gold);margin-top:2px',
            text: e.awards.slice(0, 3).map(a => a.label).join(' · ') +
              (e.awards.length > 3 ? ' +' + (e.awards.length - 3) + ' more' : '') }));
        }
        row.appendChild(info);
        if (e.bestSeason) {
          const bs = el('div', { class: 'coached-stats' });
          [[e.bestSeason.goals, 'gls'], [e.bestSeason.assists, 'ast'],
           [e.bestSeason.rating, 'avg']].forEach(([v, l]) => {
            const cell = el('div', { class: 'coached-stat' });
            cell.appendChild(el('b', { text: v }));
            cell.appendChild(el('span', { text: l }));
            bs.appendChild(cell);
          });
          row.appendChild(bs);
        }
        box.appendChild(row);
      });
      wrap.appendChild(UI.card('Hall of Fame · ' + list.length, box));
    }

    // ---------------- Legacy (across saves) ----------------
    if (FCM.App.careerTab === 'legacy') {
      const legacy = FCM.HOF.legacy();
      const totals = FCM.HOF.legacyTotals();
      const box = el('div');

      const sr = el('div', { class: 'stat-row', style: 'margin-bottom:14px' });
      sr.appendChild(UI.stat('Careers', totals.careers));
      sr.appendChild(UI.stat('Seasons', totals.seasons));
      sr.appendChild(UI.stat('Trophies', totals.trophies));
      sr.appendChild(UI.stat('Games', totals.games));
      sr.appendChild(UI.stat('Win rate',
        totals.games ? Math.round(totals.wins / totals.games * 100) + '%' : '—'));
      box.appendChild(sr);
      box.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:12px',
        text: 'Every career you have finished, kept outside any single save. ' +
          'Retire a manager to add them here.' }));

      if (!legacy.careers.length) {
        box.appendChild(el('div', { class: 'empty',
          text: 'No completed careers yet. Retire from the Overview tab to enshrine one.' }));
      }
      legacy.careers.forEach(c => {
        const card = el('div', { class: 'legacy-card' });
        const top = el('div', { class: 'row-between' });
        top.appendChild(el('div', {}, [
          el('div', { class: 'legacy-name', text: c.manager }),
          el('div', { class: 'tiny mute2',
            text: c.startedSeason + '–' + c.finishedSeason + ' · ' + c.seasons +
              ' seasons · last at ' + c.lastClub +
              (c.nations && c.nations.length ? ' · ' + c.nations.join(', ') : '') })
        ]));
        top.appendChild(el('span', { class: 'pill diff-pill diff-' +
          (FCM.D.LEVELS[c.difficulty] || { tint: 'blue' }).tint,
          text: (FCM.D.LEVELS[c.difficulty] || { label: c.difficulty }).label }));
        card.appendChild(top);

        const stats = el('div', { class: 'legacy-stats' });
        [[c.trophyCount, 'trophies'], [c.games, 'games'],
         [c.games ? Math.round(c.wins / c.games * 100) + '%' : '—', 'win rate'],
         [c.reputation, 'reputation'], [c.ballonDors, 'ballon d’ors']]
          .forEach(([v, l]) => {
            const cell = el('div', { class: 'legacy-stat' });
            cell.appendChild(el('b', { text: v }));
            cell.appendChild(el('span', { text: l }));
            stats.appendChild(cell);
          });
        card.appendChild(stats);

        if (c.trophies && c.trophies.length) {
          const tw = el('div', { class: 'legacy-trophies' });
          const grouped = {};
          c.trophies.forEach(t => { grouped[t.comp] = (grouped[t.comp] || 0) + 1; });
          Object.keys(grouped).forEach(k => {
            tw.appendChild(el('span', { class: 'pill',
              text: '🏆 ' + k + (grouped[k] > 1 ? ' ×' + grouped[k] : '') }));
          });
          card.appendChild(tw);
        }
        if (c.legends && c.legends.length) {
          card.appendChild(el('div', { class: 'tiny mute2', style: 'margin-top:8px',
            text: 'Legends: ' + c.legends.map(l => l.name + ' (' + l.peakOvr + ')').join(', ') }));
        }
        box.appendChild(card);
      });

      if (legacy.careers.length) {
        box.appendChild(el('button', { class: 'btn btn-sm btn-danger', style: 'margin-top:12px',
          text: 'Clear legacy record', onclick: function () {
            UI.confirm('Erase every completed career?',
              'This permanently deletes your cross-save Hall of Fame. It cannot be undone.',
              function () {
                FCM.HOF.clearLegacy();
                UI.toast('Legacy record cleared');
                FCM.App.render();
              }, 'Erase everything');
          } }));
      }
      wrap.appendChild(UI.card('Manager Legacy', box));
    }

    // ---------------- Players coached ----------------
    if (FCM.App.careerTab === 'legends') {
      const best = CR.bestCoached(s, 10);
      const box = el('div');
      box.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:10px',
        text: 'Ranked by how good they were while you managed them. Figures are from ' +
          'their best season under you.' }));
      if (!best.length) {
        box.appendChild(el('div', { class: 'empty',
          text: 'Nobody has completed a season under you yet.' }));
      }
      best.forEach((r, i) => {
        const row = el('div', { class: 'coached-row' });
        row.appendChild(el('div', { class: 'coached-rank', text: '#' + (i + 1) }));
        const info = el('div', { style: 'flex:1;min-width:0' });
        const nameRow = el('div', { class: 'row', style: 'gap:7px' });
        nameRow.appendChild(el('span', { class: 'coached-name', text: r.full || r.name }));
        nameRow.appendChild(UI.posPill(r.pos));
        info.appendChild(nameRow);
        const b = r.bestSeason;
        info.appendChild(el('div', { class: 'tiny mute2',
          text: 'Peak ' + r.peakOvr + ' OVR in ' + b.season + '/' +
            String(b.season + 1).slice(2) + ' at ' + b.club +
            ' · ' + r.seasons + ' season' + (r.seasons > 1 ? 's' : '') + ' under you' }));
        row.appendChild(info);
        const stats = el('div', { class: 'coached-stats' });
        [[b.apps, 'apps'], [b.goals, 'gls'], [b.assists, 'ast'], [b.rating, 'avg']]
          .forEach(([v, l]) => {
            const cell = el('div', { class: 'coached-stat' });
            cell.appendChild(el('b', { text: v }));
            cell.appendChild(el('span', { text: l }));
            stats.appendChild(cell);
          });
        row.appendChild(stats);
        row.appendChild(UI.rating(r.peakOvr));
        const live = FCM.DB.byId[r.id];
        if (live) row.addEventListener('click', function () { UI.playerProfile(live); });
        box.appendChild(row);
      });
      wrap.appendChild(UI.card('Best Players Coached', box));
    }

    // ---------------- National team ----------------
    if (FCM.App.careerTab === 'intl') {
      const box = el('div');
      if (cr.nation) {
        const squad = IN.callUpSquad(cr.nation, 23) || [];
        box.appendChild(el('div', { class: 'row-between', style: 'margin-bottom:12px' }, [
          el('div', {}, [
            el('b', { text: cr.nation, style: 'font-size:16px' }),
            el('div', { class: 'tiny mute2',
              text: (IN.CONFEDS[IN.confedOf(cr.nation)] || {}).label || '' })
          ]),
          el('button', { class: 'btn btn-sm btn-danger', text: 'Step down',
            onclick: function () {
              UI.confirm('Leave the ' + cr.nation + ' job?',
                'You will go back to managing only at club level.', function () {
                  CR.leaveNationJob(s);
                  UI.toast('You have left the ' + cr.nation + ' post');
                  FCM.App.render();
                }, 'Step down');
            } })
        ]));
        const sr = el('div', { class: 'stat-row', style: 'margin-bottom:12px' });
        sr.appendChild(UI.stat('Squad strength', Math.round(IN.nationStrength(cr.nation))));
        sr.appendChild(UI.stat('Pool', squad.length));
        sr.appendChild(UI.stat('Tournaments', cr.tournaments.length));
        box.appendChild(sr);

        const next = IN.tournamentsFor(s.season)
          .filter(t => !t.confed || t.confed === IN.confedOf(cr.nation));
        if (next.length) {
          box.appendChild(el('div', { class: 'notice',
            text: 'Coming this summer: ' + next.map(t => t.name).join(', ') + '.' }));
        }

        box.appendChild(el('div', { class: 'section-title', text: 'Current call-up' }));
        const cols = [
          { key: 'pos', label: 'Pos', nosort: true, render: p => UI.posPill(p.pos[0]) },
          { key: 'name', label: 'Player', render: p => UI.playerLink(p) },
          { key: 'club', label: 'Club', sort: p => (FCM.DB.clubById[p.clubId] || {}).name || '',
            render: p => el('span', { class: 'small mute2',
              text: (FCM.DB.clubById[p.clubId] || {}).name || 'Free agent' }) },
          { key: 'age', label: 'Age', num: true },
          { key: 'ovr', label: 'OVR', num: true, render: p => UI.rating(p.ovr) }
        ];
        box.appendChild(UI.table(cols, squad, { sortKey: 'ovr', sortDesc: true,
          onRow: p => UI.playerProfile(p) }));

        if (cr.tournaments.length) {
          box.appendChild(el('div', { class: 'section-title', text: 'Tournament history' }));
          cr.tournaments.slice().reverse().forEach(t => {
            const r = el('div', { class: 'row-between small season-row' });
            r.appendChild(el('span', { text: t.name + ' ' + t.year + ' · ' + t.nation }));
            r.appendChild(el('span', { class: 'pill ' +
              (t.result === 'Winners' ? 'pill-good' : ''), text: t.result }));
            box.appendChild(r);
          });
        }
      } else {
        const jobs = CR.availableNationJobs(s);
        const rep = CR.managerReputation(s);
        box.appendChild(el('div', { class: 'row-between small', style: 'margin-bottom:10px' }, [
          el('span', { class: 'muted', text: 'Your reputation' }),
          el('b', { text: Math.round(rep) + '/100' })
        ]));
        box.appendChild(UI.bar(rep, 100));
        box.appendChild(el('div', { class: 'tiny mute2', style: 'margin:8px 0 12px',
          text: 'Win trophies and games to attract bigger nations. You can hold a ' +
            'national job alongside your club.' }));
        if (!jobs.length) {
          box.appendChild(el('div', { class: 'empty',
            text: 'No association would appoint you yet. Build a reputation first.' }));
        }
        const list = el('div', { class: 'pick-list', style: 'max-height:420px' });
        jobs.forEach(j => {
          const row = el('div', { class: 'pick-row' });
          const info = el('div', { style: 'flex:1;min-width:0' });
          info.appendChild(el('div', { text: j.nation, style: 'font-weight:650' }));
          info.appendChild(el('div', { class: 'tiny mute2',
            text: (IN.CONFEDS[j.confed] || {}).label || '' }));
          row.appendChild(info);
          row.appendChild(UI.rating(Math.round(j.strength)));
          row.addEventListener('click', function () {
            UI.confirm('Take the ' + j.nation + ' job?',
              'You will manage them at international tournaments alongside your club.',
              function () {
                CR.takeNationJob(s, j.nation);
                UI.toast('You are the new ' + j.nation + ' manager');
                FCM.App.render();
              }, 'Accept');
          });
          list.appendChild(row);
        });
        box.appendChild(list);
      }
      wrap.appendChild(UI.card('National Team', box));
    }

    // ---------------- FA role ----------------
    if (FCM.App.careerTab === 'intl') {
      const box = el('div');
      if (cr.faRole) {
        CR.normaliseFA(cr);
        const role = cr.faRole;
        const prestige = CR.faPrestige(s);
        const grant = CR.faAnnualGrant(s);

        box.appendChild(el('div', { class: 'row-between', style: 'margin-bottom:12px' }, [
          el('div', {}, [
            el('b', { text: role.country + ' Football Association',
              style: 'font-size:15px' }),
            el('div', { class: 'tiny mute2', text: 'Chairman since ' + role.since })
          ]),
          el('span', { class: 'pill ' + (prestige > 60 ? 'pill-good' : ''),
            text: prestige + '% developed' })
        ]));

        const sr = el('div', { class: 'stat-row', style: 'margin-bottom:6px' });
        sr.appendChild(UI.stat('Available funds', U.money(role.grant)));
        sr.appendChild(UI.stat('Annual grant', U.money(grant)));
        sr.appendChild(UI.stat('Invested', U.money(role.invested)));
        sr.appendChild(UI.stat('Nation strength',
          Math.round(FCM.IN.nationStrength(role.country))));
        box.appendChild(sr);
        box.appendChild(el('div', { class: 'tiny mute2', style: 'margin:8px 0 14px',
          text: 'Funded by the association, not your club. The grant arrives each ' +
            'summer and grows as the national side succeeds.' }));

        // The four programmes.
        CR.FA_PROGRAMMES.forEach(prog => {
          const tier = CR.faTier(s, prog.id);
          const cost = CR.faUpgradeCost(s, prog.id);
          const card = el('div', { class: 'fa-prog' });
          const top = el('div', { class: 'row-between' });
          top.appendChild(el('div', { class: 'row', style: 'gap:9px' }, [
            el('span', { class: 'fa-prog-icon', text: prog.icon }),
            el('div', {}, [
              el('div', { style: 'font-weight:700;font-size:13.5px', text: prog.label }),
              el('div', { class: 'tiny mute2', text: prog.blurb })
            ])
          ]));
          top.appendChild(el('span', { class: 'pill' + (tier >= 5 ? ' pill-good' : ''),
            text: CR.TIER_LABELS[tier - 1] }));
          card.appendChild(top);

          const track = el('div', { class: 'fa-track', style: 'margin-top:10px' });
          for (let i = 1; i <= 5; i++) {
            const step = el('div', { class: 'fa-step' + (i <= tier ? ' done' : '') });
            step.appendChild(el('i'));
            track.appendChild(step);
          }
          card.appendChild(track);

          card.appendChild(el('div', { class: 'row-between', style: 'margin-top:9px' }, [
            el('span', { class: 'tiny', style: 'color:var(--accent)',
              text: tier > 1 ? prog.effect(tier - 1) : 'No effect yet' }),
            cost
              ? el('button', { class: 'btn btn-sm' + (role.grant >= cost ? ' btn-primary' : ''),
                  text: 'Invest ' + U.money(cost),
                  onclick: function () {
                    const r = CR.investFA(s, prog.id);
                    if (!r.ok) { UI.toast(r.reason, 'warn'); return; }
                    UI.toast(prog.label + ' is now ' + CR.TIER_LABELS[r.tier - 1]);
                    FCM.App.render();
                  } })
              : el('span', { class: 'tiny', style: 'color:var(--accent)', text: 'Maxed out' })
          ]));
          box.appendChild(card);
        });

        if (prestige >= 100) {
          box.appendChild(el('div', { class: 'notice notice-good', style: 'margin-top:12px',
            text: role.country + ' now has the finest football infrastructure on earth. ' +
              'Their golden generation is coming.' }));
        }
      } else {
        box.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:12px',
          text: 'Take a seat on a national association and invest in its youth system. ' +
            'Every prospect from that country will come through stronger — a long game ' +
            'that reshapes a footballing nation.' }));
        const sel = el('select', { style: 'width:100%' });
        const nations = [];
        for (const cid in IN.NATION_CONFED) {
          IN.NATION_CONFED[cid].forEach(n => {
            if (IN.nationStrength(n) > 0) nations.push(n);
          });
        }
        nations.sort().forEach(n => sel.appendChild(el('option', { value: n, text: n })));
        const myNat = (FCM.DB.leagueOf(myClub()) || {}).country;
        if (myNat && nations.indexOf(myNat) >= 0) sel.value = myNat;
        box.appendChild(sel);
        box.appendChild(el('button', { class: 'btn btn-primary', style: 'width:100%;margin-top:10px',
          text: 'Become chairman', onclick: function () {
            CR.takeFARole(s, sel.value);
            UI.toast('You are now chairman of the ' + sel.value + ' FA');
            FCM.App.render();
          } }));
      }
      wrap.appendChild(UI.card('Football Association', box));
    }

    // ---------------- World awards ----------------
    if (FCM.App.careerTab === 'intl') {
      const bdBox = el('div');
      if (!(s.ballonDor || []).length) {
        bdBox.appendChild(el('div', { class: 'empty',
          text: 'The Ballon d’Or is awarded after each season.' }));
      }
      (s.ballonDor || []).slice(0, 3).forEach(year => {
        bdBox.appendChild(el('div', { class: 'section-title',
          text: year.season + '/' + String(year.season + 1).slice(2) }));
        year.ranking.slice(0, 5).forEach(r => {
          const row = el('div', { class: 'bd-row' + (r.rank === 1 ? ' winner' : '') });
          row.appendChild(el('div', { class: 'bd-rank', text: r.rank }));
          const info = el('div', { style: 'flex:1;min-width:0' });
          info.appendChild(el('div', { text: r.full || r.name, style: 'font-weight:650' }));
          info.appendChild(el('div', { class: 'tiny mute2', text: r.club + ' · ' + r.nation }));
          row.appendChild(info);
          row.appendChild(el('span', { class: 'small mute2',
            text: r.goals + 'G ' + r.assists + 'A' }));
          row.appendChild(UI.formRating(r.rating));
          row.appendChild(UI.rating(r.ovr));
          bdBox.appendChild(row);
        });
      });
      wrap.appendChild(UI.card('Ballon d’Or', bdBox));

      const intlBox = el('div');
      if (!(s.internationals || []).length) {
        intlBox.appendChild(el('div', { class: 'empty',
          text: 'International tournaments are played each summer.' }));
      }
      (s.internationals || []).slice(0, 14).forEach(t => {
        const row = el('div', { class: 'intl-row' });
        row.appendChild(el('div', { class: 'intl-icon', text: '🌍' }));
        const info = el('div', { style: 'flex:1;min-width:0' });
        info.appendChild(el('div', { text: t.name + ' ' + t.year, style: 'font-weight:650' }));
        info.appendChild(el('div', { class: 'tiny mute2',
          text: 'Winners: ' + t.winner + (t.runnerUp ? '  ·  Runners-up: ' + t.runnerUp : '') +
            (t.topScorer ? '  ·  Top scorer: ' + t.topScorer.name + ' (' + t.topScorer.goals + ')' : '') }));
        row.appendChild(info);
        if (cr.nation && t.field.indexOf(cr.nation) >= 0) {
          row.appendChild(el('span', { class: 'pill ' +
            (t.winner === cr.nation ? 'pill-good' : ''), text: t.userReached }));
        }
        intlBox.appendChild(row);
      });
      wrap.appendChild(UI.card('International Tournaments', intlBox));
    }

    // ---------------- Job market (only while unemployed) ----------------
    if (FCM.App.careerTab === 'overview' && (FCM.App.showJobs || s.seekingJob)) {
      const jobs = CR.availableClubJobs(s);
      const box = el('div');
      const rep = CR.managerReputation(s);
      box.appendChild(el('div', { class: 'row-between small', style: 'margin-bottom:8px' }, [
        el('span', { class: 'muted', text: 'Your reputation' }),
        el('b', { text: Math.round(rep) + '/100' })
      ]));
      box.appendChild(UI.bar(rep, 100));
      box.appendChild(el('div', { class: 'tiny mute2', style: 'margin:8px 0 12px',
        text: jobs.length + ' clubs would appoint you. Bigger clubs demand a bigger name.' }));
      const list = el('div', { class: 'pick-list', style: 'max-height:460px' });
      jobs.forEach(j => {
        const row = el('div', { class: 'pick-row' });
        row.appendChild(UI.badge(j.club, 'sm'));
        const info = el('div', { style: 'flex:1;min-width:0' });
        info.appendChild(el('div', { text: j.club.name, style: 'font-weight:650' }));
        info.appendChild(el('div', { class: 'tiny mute2',
          text: j.league + ' · ' + U.money(j.budget) + ' budget · ' +
            U.num(j.club.capacity) + ' capacity' }));
        row.appendChild(info);
        row.appendChild(UI.rating(Math.round(j.rep)));
        row.addEventListener('click', function () {
          UI.confirm('Take the ' + j.club.name + ' job?',
            'You will manage them from today, with a fresh set of board expectations.',
            function () {
              FCM.G.takeJob(j.club.id);
              FCM.App.careerTab = 'overview';
              UI.toast('You are the new ' + j.club.name + ' manager');
              FCM.App.render();
            }, 'Accept the job');
        });
        list.appendChild(row);
      });
      if (!jobs.length) {
        list.appendChild(el('div', { class: 'empty',
          text: 'No club will have you right now. That is a problem.' }));
      }
      box.appendChild(list);
      wrap.appendChild(UI.card(s.seekingJob ? 'You are out of work' : 'Job Market', box));
    }

    return wrap;
  };

  /** Retirement, behind two deliberate confirmations. */
  FCM.SC.confirmRetire = function () {
    const s = S();
    const cr = CR.ensure(s);
    const body = el('div');
    body.appendChild(el('p', { style: 'margin:0 0 12px;line-height:1.65',
      text: 'Retiring ends this career permanently. You cannot come back to it, ' +
        'and this save will no longer be playable.' }));
    const kv = el('div', { class: 'kv' });
    [['Seasons managed', Math.max(1, s.season - s.startYear)],
     ['Games', cr.games], ['Trophies', cr.trophies.length],
     ['Win rate', cr.games ? Math.round(cr.wins / cr.games * 100) + '%' : '—'],
     ['Hall of Fame', (s.hallOfFame || []).length + ' players']].forEach(([k, v]) => {
      kv.appendChild(el('div', { class: 'k', text: k }));
      kv.appendChild(el('div', { class: 'v', text: v }));
    });
    body.appendChild(kv);
    body.appendChild(el('div', { class: 'notice', style: 'margin-top:12px',
      text: 'Your record will be preserved forever in the Legacy tab, across all ' +
        'future saves.' }));

    UI.modal('Retire from management?', body, [
      el('button', { class: 'btn', text: 'Keep managing', onclick: UI.closeModal }),
      el('button', { class: 'btn btn-danger', text: 'Continue to retire',
        onclick: function () { UI.closeModal(); FCM.SC.confirmRetireFinal(); } })
    ]);
  };

  /** Second and final confirmation — deliberately harder to click through. */
  FCM.SC.confirmRetireFinal = function () {
    const body = el('div');
    body.appendChild(el('p', { style: 'margin:0 0 14px;line-height:1.65;font-weight:600',
      text: 'This is final. Type RETIRE below to confirm.' }));
    const input = el('input', { type: 'text', placeholder: 'RETIRE', style: 'width:100%' });
    body.appendChild(input);
    const fb = el('div', { class: 'tiny', style: 'min-height:18px;margin-top:8px' });
    body.appendChild(fb);

    const go = el('button', { class: 'btn btn-danger', text: 'Retire for good',
      onclick: function () {
        if (input.value.trim().toUpperCase() !== 'RETIRE') {
          fb.style.color = 'var(--gold)';
          fb.textContent = 'Type RETIRE exactly to confirm.';
          return;
        }
        const entry = FCM.HOF.retireCareer(S(), 'retired');
        UI.closeModal();
        FCM.SC.retirementSummary(entry);
      } });
    UI.modal('Are you certain?', body, [
      el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal }), go
    ]);
    setTimeout(function () { input.focus(); }, 50);
  };

  /** Closing screen once a career ends. */
  FCM.SC.retirementSummary = function (entry) {
    const body = el('div');
    const hero = el('div', { class: 'career-hero', style: 'margin-bottom:14px' });
    hero.appendChild(el('div', { class: 'career-name', text: entry.manager }));
    hero.appendChild(el('div', { class: 'career-sub',
      text: entry.startedSeason + '–' + entry.finishedSeason + ' · ' +
        entry.seasons + ' seasons in management' }));
    const medals = el('div', { class: 'career-medals' });
    medals.appendChild(el('div', { class: 'medal' }, [
      el('b', { text: entry.trophyCount }), el('span', { text: 'Trophies' })]));
    medals.appendChild(el('div', { class: 'medal' }, [
      el('b', { text: entry.games }), el('span', { text: 'Games' })]));
    medals.appendChild(el('div', { class: 'medal' }, [
      el('b', { text: entry.games ? Math.round(entry.wins / entry.games * 100) + '%' : '—' }),
      el('span', { text: 'Win rate' })]));
    hero.appendChild(medals);
    body.appendChild(hero);

    if (entry.legends && entry.legends.length) {
      body.appendChild(el('div', { class: 'section-title', text: 'The players you built' }));
      entry.legends.forEach(l => {
        const r = el('div', { class: 'row-between small', style: 'padding:4px 0' });
        r.appendChild(el('span', { text: l.name + '  ' }));
        r.appendChild(el('span', { class: 'mute2',
          text: l.peakOvr + ' peak · ' + l.goals + ' goals in ' + l.apps + ' games' }));
        body.appendChild(r);
      });
    }
    body.appendChild(el('div', { class: 'notice notice-good', style: 'margin-top:14px',
      text: 'Your career now sits permanently in the Legacy record.' }));

    UI.modal('A career ends', body, [
      el('button', { class: 'btn btn-primary', text: 'Start a new career',
        onclick: function () {
          FCM.S.clear();
          FCM.IDB.clearAutosave();
          location.reload();
        } })
    ]);
  };
})(window.FCM = window.FCM || {});
