/* All game screens. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P, T = FCM.T, C = FCM.C, TR = FCM.TR, Y = FCM.Y, UI = FCM.UI;
  const SC = {};

  function G() { return FCM.G; }
  function S() { return FCM.G.state; }
  function myClub() { return FCM.DB.clubById[S().userClubId]; }
  function mySquad() { return FCM.DB.squadOf(myClub()); }
  function el(t, a, c) { return U.el(t, a, c); }
  function date(day, style) { return U.fmtDate(S().season, day, style); }

  // =====================================================================
  // Dashboard
  // =====================================================================
  SC.dashboard = function () {
    const s = S(), club = myClub();
    const wrap = el('div', { class: 'grid g-side' });
    const left = el('div', { class: 'stack' });
    const right = el('div', { class: 'stack' });

    // --- Next match ---
    const next = G().nextUserFixture();
    const nmBody = el('div');
    if (next && next.international) {
      // Out of season the next game may be for the national side, which has
      // nations rather than club ids.
      const nm = el('div', { class: 'next-match' });
      [[next.homeName, 'Home'], [next.awayName, 'Away']].forEach((pair, i) => {
        if (i === 1) nm.appendChild(el('div', { class: 'nm-vs', text: 'v' }));
        const side = el('div', { class: 'nm-side' });
        side.appendChild(UI.nationBadge(pair[0], 'lg'));
        side.appendChild(el('div', { text: pair[0], style: 'font-weight:600;font-size:13px' }));
        side.appendChild(el('div', { class: 'tiny muted', text: pair[1] }));
        nm.appendChild(side);
      });
      nmBody.appendChild(nm);
      const meta = el('div', { class: 'nm-meta' });
      const pr = el('div', { style: 'display:flex;justify-content:center;margin-bottom:5px' });
      pr.appendChild(FCM.CT.pill(next.comp, next.compName + ' · ' + next.round));
      meta.appendChild(pr);
      meta.appendChild(el('div', { class: 'small', text: date(next.day, 'long') }));
      const daysOff = next.day - s.day;
      meta.appendChild(el('div', { class: 'small mute2',
        text: daysOff <= 0 ? 'Today' : (daysOff === 1 ? 'Tomorrow' : 'In ' + daysOff + ' days') }));
      nmBody.appendChild(meta);
      nmBody.style.background = 'linear-gradient(180deg,' + FCM.CT.tint(next.comp) + ', transparent 70%)';
      nmBody.style.borderTop = '2px solid ' + FCM.CT.accent(next.comp);
      nmBody.style.borderRadius = '8px';
      nmBody.style.padding = '12px 8px 4px';
    } else if (next) {
      const home = FCM.DB.clubById[next.home], away = FCM.DB.clubById[next.away];
      const nm = el('div', { class: 'next-match' });
      [home, away].forEach((c, i) => {
        if (i === 1) nm.appendChild(el('div', { class: 'nm-vs', text: 'v' }));
        const side = el('div', { class: 'nm-side' });
        side.appendChild(UI.badge(c, 'lg'));
        side.appendChild(el('div', { text: c.name, style: 'font-weight:600;font-size:13px' }));
        side.appendChild(el('div', { class: 'tiny muted', text: i === 0 ? 'Home' : 'Away' }));
        nm.appendChild(side);
      });
      nmBody.appendChild(nm);
      const meta = el('div', { class: 'nm-meta' });
      const pillRow = el('div', { style: 'display:flex;justify-content:center;gap:6px;margin-bottom:5px' });
      pillRow.appendChild(FCM.CT.pill(next.comp, next.compName +
        (next.round && !FCM.CT.isCup(next.comp) ? ' · MD ' + next.round : '')));
      if (next.derby) pillRow.appendChild(el('span', { class: 'comp-pill derby-pill', text: '🔥 DERBY' }));
      meta.appendChild(pillRow);
      meta.appendChild(el('div', { class: 'small', text: date(next.day, 'long') }));
      const daysAway = next.day - s.day;
      meta.appendChild(el('div', { class: 'small mute2',
        text: daysAway <= 0 ? 'Today' : (daysAway === 1 ? 'Tomorrow' : 'In ' + daysAway + ' days') }));
      nmBody.appendChild(meta);
      // Wash the whole card in the competition's colour.
      nmBody.style.background = 'linear-gradient(180deg,' + FCM.CT.tint(next.comp) + ', transparent 70%)';
      nmBody.style.borderTop = '2px solid ' + FCM.CT.accent(next.comp);
      nmBody.style.borderRadius = '8px';
      nmBody.style.padding = '12px 8px 4px';
    } else {
      nmBody.appendChild(el('div', { class: 'empty', text: 'No fixtures scheduled.' }));
    }
    left.appendChild(UI.card('Next Match', nmBody));

    // --- International tournaments, during the summer ---
    const live = G().liveTournaments();
    live.forEach(t => left.appendChild(SC.tournamentCard(t)));

    // --- Inbox ---
    const inbox = el('div');
    const items = s.inbox.slice(0, 14);
    if (!items.length) inbox.appendChild(el('div', { class: 'empty', text: 'No news.' }));
    items.forEach(item => {
      const row = el('div', { class: 'inbox-item ' + (item.read ? '' : 'unread') });
      row.appendChild(el('div', { class: 'ii-icon', text: SC.newsIcon(item.kind) }));
      const mid = el('div', { style: 'flex:1;min-width:0' });
      mid.appendChild(el('div', { class: 'ii-title', text: item.title }));
      mid.appendChild(el('div', { class: 'ii-body', text: item.body }));
      row.appendChild(mid);
      row.appendChild(el('div', { class: 'ii-day', text: date(item.day, 'short') }));
      row.addEventListener('click', () => SC.openNews(item));
      inbox.appendChild(row);
    });
    const inboxCard = UI.card('Inbox', inbox);
    inboxCard.querySelector('.card-body').classList.add('flush');
    inboxCard.querySelector('.card-body').style.padding = '0';
    left.appendChild(inboxCard);

    // --- League position ---
    const league = FCM.DB.leagueOf(club);
    const table = G().leagueTable(club.league);
    const me = table.find(r => r.club === club.id);
    const posBody = el('div');
    if (me) {
      const sr = el('div', { class: 'stat-row' });
      sr.appendChild(UI.stat('Position', U.ordinal(me.pos)));
      sr.appendChild(UI.stat('Points', me.pts));
      sr.appendChild(UI.stat('Played', me.p));
      sr.appendChild(UI.stat('GD', (me.gd > 0 ? '+' : '') + me.gd));
      posBody.appendChild(sr);
      const f = el('div', { class: 'row', style: 'margin-top:12px' });
      f.appendChild(el('span', { class: 'small muted', text: 'Form' }));
      f.appendChild(UI.formDots(me.form));
      posBody.appendChild(f);
    } else {
      posBody.appendChild(el('div', { class: 'muted small', text: 'Season not started.' }));
    }
    right.appendChild(UI.card(league ? league.name : 'League', posBody));

    // --- Board ---
    const level = FCM.D.get(s.difficulty);
    const boardBody = el('div');
    boardBody.appendChild(el('div', { class: 'row', style: 'gap:7px;margin-bottom:9px' }, [
      el('span', { class: 'pill diff-pill diff-' + level.tint, text: level.label }),
      s.stadiumProject ? el('span', { class: 'pill', text: '🏗 Expanding' }) : null
    ].filter(Boolean)));
    boardBody.appendChild(el('p', { text: s.board.expectation, style: 'margin:0 0 11px;font-size:13px' }));
    if (!level.godMode) {
      boardBody.appendChild(el('div', { class: 'row-between small' }, [
        el('span', { class: 'muted', text: 'Board confidence' }),
        el('b', { text: Math.round(s.board.confidence) + '%' })
      ]));
      boardBody.appendChild(UI.bar(s.board.confidence, 100,
        s.board.confidence < 35 ? 'bad' : (s.board.confidence < 60 ? 'warn' : '')));
      if (FCM.D.underPressure(s)) {
        boardBody.appendChild(el('div', { class: 'tiny', style: 'color:var(--red);margin-top:7px',
          text: '⚠ Your job is under threat. They sack below ' + level.sackAt + '%.' }));
      }
    }
    right.appendChild(UI.card('The Board', boardBody));

    // --- Squad snapshot ---
    const squad = mySquad();
    const snapBody = el('div');
    const inj = squad.filter(p => p.injury > 0);
    const susp = squad.filter(p => (p.suspended || 0) > 0);
    const sr2 = el('div', { class: 'stat-row' });
    sr2.appendChild(UI.stat('Players', squad.length));
    sr2.appendChild(UI.stat('Avg OVR', Math.round(U.mean(squad, p => p.ovr)) || 0));
    sr2.appendChild(UI.stat('Avg Age', (U.mean(squad, p => p.age) || 0).toFixed(1)));
    sr2.appendChild(UI.stat('Unavailable', inj.length + susp.length));
    snapBody.appendChild(sr2);
    if (inj.length || susp.length) {
      snapBody.appendChild(el('div', { class: 'section-title', text: 'Unavailable' }));
      inj.slice(0, 5).forEach(p => {
        const r = el('div', { class: 'row-between small', style: 'padding:2px 0' });
        r.appendChild(UI.playerLink(p));
        r.appendChild(el('span', { class: 'pill pill-bad', text: p.injuryName + ' · ' + p.injury + 'd' }));
        snapBody.appendChild(r);
      });
      susp.slice(0, 4).forEach(p => {
        const r = el('div', { class: 'row-between small', style: 'padding:2px 0' });
        r.appendChild(UI.playerLink(p));
        r.appendChild(el('span', { class: 'pill pill-bad',
          text: 'Suspended · ' + p.suspended + ' match' + (p.suspended > 1 ? 'es' : '') }));
        snapBody.appendChild(r);
      });
    }
    right.appendChild(UI.card('Squad', snapBody));

    // --- Season leaders ---
    const scorers = U.sortBy(squad.filter(p => p.goals > 0), p => p.goals, true).slice(0, 5);
    const leadBody = el('div');
    if (!scorers.length) {
      leadBody.appendChild(el('div', { class: 'tiny mute2', text: 'No goals scored yet this season.' }));
    }
    scorers.forEach((p, i) => {
      const r = el('div', { class: 'row-between small', style: 'padding:3px 0' });
      const nm = el('div', { class: 'row', style: 'gap:7px' });
      nm.appendChild(el('span', { class: 'mute2 mono tiny', text: (i + 1) + '.' }));
      nm.appendChild(UI.playerLink(p));
      r.appendChild(nm);
      r.appendChild(el('span', { class: 'small muted',
        text: p.goals + 'G · ' + p.assists + 'A · ' + p.apps + ' apps' }));
      leadBody.appendChild(r);
    });
    right.appendChild(UI.card('Top Scorers', leadBody));

    // --- Academy watch: prospects agitating for a promotion ---
    const restless = (club.youth || []).map(id => FCM.DB.byId[id])
      .filter(p => p && Y.unrestLevel(p));
    if (restless.length) {
      const yBody = el('div');
      restless.slice(0, 5).forEach(p => {
        const r = el('div', { class: 'row-between small', style: 'padding:3px 0' });
        r.appendChild(UI.playerLink(p));
        r.appendChild(el('span', { class: 'pill pill-warn', text: p.age + ' · ' + Y.unrestLevel(p) }));
        yBody.appendChild(r);
      });
      yBody.appendChild(el('button', { class: 'btn btn-sm', style: 'width:100%;margin-top:8px',
        text: 'Go to academy',
        onclick: function () { FCM.App.tab = 'youth'; FCM.App.render(); } }));
      right.appendChild(UI.card('Academy Watch', yBody));
    }

    // --- Finances ---
    const fBody = el('div', { class: 'kv' });
    [['Transfer budget', U.money(club.transferBudget)],
     ['Wage budget', U.wage(club.wageBudget)],
     ['Wage bill', U.wage(U.sum(squad, p => p.wage))],
     ['Balance', U.money(club.balance)]].forEach(([k, v]) => {
      fBody.appendChild(el('div', { class: 'k', text: k }));
      fBody.appendChild(el('div', { class: 'v', text: v }));
    });
    right.appendChild(UI.card('Finances', fBody));

    wrap.appendChild(left); wrap.appendChild(right);
    return wrap;
  };

  /**
   * A live international tournament: group tables while the group stage
   * runs, then the knockout bracket.
   */
  SC.tournamentCard = function (t) {
    const s = S();
    const cr = FCM.CR.ensure(s);
    const mine = cr.nation;
    const IN = FCM.IN;
    const body = el('div');

    // Header strip
    const head = el('div', { class: 'intl-head' });
    head.appendChild(el('div', { class: 'intl-title' }, [
      el('span', { class: 'intl-globe',
        text: FCM.CT.forComp('intl:' + t.id).icon || '🌍' }),
      el('span', { text: t.name + ' ' + t.year })
    ]));
    const status = t.complete
      ? el('span', { class: 'pill pill-good', text: '🏆 ' + t.winner })
      : el('span', { class: 'pill', text: t.stage === 'group' ? 'Group stage'
          : (t.knockout.rounds.length ? t.knockout.rounds[t.knockout.rounds.length - 1].name : 'Knockout') });
    head.appendChild(status);
    body.appendChild(head);

    if (mine && t.teams.indexOf(mine) >= 0) {
      const prog = t.complete ? IN.progressOf(t, mine) : null;
      body.appendChild(el('div', { class: 'intl-you',
        text: prog ? 'You with ' + mine + ': ' + prog : 'You are managing ' + mine }));
    }

    // Toggle between groups and bracket once knockouts exist.
    if (!FCM.App.intlView) FCM.App.intlView = {};
    const hasKO = t.knockout.rounds.length > 0;
    const viewKey = t.id + t.year;
    if (FCM.App.intlView[viewKey] === undefined) {
      FCM.App.intlView[viewKey] = hasKO ? 'bracket' : 'groups';
    }
    if (hasKO) {
      const seg = el('div', { class: 'seg', style: 'margin:10px 0' });
      [['groups', 'Groups'], ['bracket', 'Knockout']].forEach(([id, label]) => {
        const b = el('button', { class: 'seg-btn' +
          (FCM.App.intlView[viewKey] === id ? ' active' : ''), text: label });
        b.addEventListener('click', function () {
          FCM.App.intlView[viewKey] = id; FCM.App.render();
        });
        seg.appendChild(b);
      });
      body.appendChild(seg);
    }

    const showing = hasKO ? FCM.App.intlView[viewKey] : 'groups';

    if (showing === 'groups') {
      const grid = el('div', { class: 'group-grid' });
      t.groups.forEach(g => {
        const table = g.table && g.table.length ? g.table : IN.groupTable(t, g);
        const box = el('div', { class: 'group-box' });
        box.appendChild(el('div', { class: 'group-name', text: 'Group ' + g.name }));
        table.forEach((r, i) => {
          const row = el('div', { class: 'group-row' +
            (i < 2 ? ' through' : '') + (r.nation === mine ? ' mine' : '') });
          row.appendChild(el('span', { class: 'group-pos', text: r.pos }));
          row.appendChild(UI.nationBadge(r.nation, 'xs'));
          row.appendChild(el('span', { class: 'group-team', text: r.nation }));
          row.appendChild(el('span', { class: 'group-num', text: r.p }));
          row.appendChild(el('span', { class: 'group-num',
            text: (r.gd > 0 ? '+' : '') + r.gd }));
          row.appendChild(el('b', { class: 'group-num', text: r.pts }));
          box.appendChild(row);
        });
        grid.appendChild(box);
      });
      body.appendChild(grid);

      // Upcoming/recent group fixtures for the user's nation.
      if (mine) {
        const mineFx = t.fixtures.filter(f => f.home === mine || f.away === mine);
        if (mineFx.length) {
          const list = el('div', { style: 'margin-top:12px' });
          mineFx.slice(0, 6).forEach(f => {
            const row = el('div', { class: 'intl-fx' + (f.played ? ' played' : '') });
            row.appendChild(el('span', { class: 'tiny mute2', style: 'width:46px;flex:none',
              text: f.day != null ? date(f.day, 'short') : '' }));
            row.appendChild(el('span', { style: 'flex:1',
              text: f.home + '  v  ' + f.away }));
            row.appendChild(el('b', { class: 'mono',
              text: f.played ? f.hg + '–' + f.ag : '' }));
            list.appendChild(row);
          });
          body.appendChild(list);
        }
      }
    } else {
      // Knockout bracket, round by round.
      const br = el('div', { class: 'ko-bracket' });
      t.knockout.rounds.forEach(round => {
        const col = el('div', { class: 'ko-round' });
        col.appendChild(el('div', { class: 'ko-round-name', text: round.name }));
        round.ties.forEach(tie => {
          const box = el('div', { class: 'ko-tie' });
          [[tie.home, tie.hg], [tie.away, tie.ag]].forEach(([nation, goals]) => {
            const won = tie.winner === nation;
            const row = el('div', { class: 'ko-team' +
              (tie.played ? (won ? ' won' : ' lost') : '') +
              (nation === mine ? ' mine' : '') });
            row.appendChild(UI.nationBadge(nation, 'xs'));
            row.appendChild(el('span', { class: 'ko-name', text: nation }));
            row.appendChild(el('span', { class: 'mono tiny',
              text: tie.played ? String(goals) : '' }));
            box.appendChild(row);
          });
          if (tie.pens) {
            box.appendChild(el('div', { class: 'tiny mute2',
              text: 'Pens ' + tie.pens[0] + '–' + tie.pens[1] }));
          }
          col.appendChild(box);
        });
        br.appendChild(col);
      });
      body.appendChild(br);
    }

    if (t.complete && t.topScorer) {
      body.appendChild(el('div', { class: 'intl-scorer',
        text: '👟 Top scorer: ' + t.topScorer.name + ' (' + t.topScorer.nation + ') · ' +
          t.topScorer.goals + ' goals' }));
    }

    const card = UI.card(null, body);
    card.classList.add('intl-card');
    // Each tournament carries its own colour; the World Cup is gold.
    const th = FCM.CT.forComp('intl:' + t.id);
    card.style.borderColor = th.accent;
    card.style.background = 'linear-gradient(160deg,' + th.tint + ', var(--panel) 55%)';
    const titleEl = head.querySelector('.intl-title');
    if (titleEl) titleEl.style.color = th.accent;
    return card;
  };

  SC.newsIcon = function (kind) {
    return ({ board: '🏛', transfer: '💰', injury: '⚕', trophy: '🏆', youth: '🌱',
      growth: '📈', decline: '📉', contract: '📝', result: '⚽' })[kind] || '📰';
  };

  SC.openNews = function (item) {
    if (!item.read) { item.read = true; S().unreadCount = Math.max(0, S().unreadCount - 1); FCM.App.refreshTabs(); }
    const body = el('div');
    body.appendChild(el('p', { text: item.body, style: 'margin:0 0 14px;line-height:1.65' }));
    let foot = [el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal })];

    if (item.type === 'transfer-offer') {
      const p = FCM.DB.byId[item.player];
      const buyer = FCM.DB.clubById[item.from];
      if (p && p.clubId === S().userClubId) {
        const info = el('div', { class: 'kv' });
        [['Player', p.name], ['Value', U.money(p.value)], ['Offer', U.money(item.fee)],
         ['Buying club', buyer.name]].forEach(([k, v]) => {
          info.appendChild(el('div', { class: 'k', text: k }));
          info.appendChild(el('div', { class: 'v', text: v }));
        });
        body.appendChild(info);
        foot = [
          el('button', { class: 'btn', text: 'Reject', onclick: UI.closeModal }),
          el('button', { class: 'btn', text: 'Negotiate',
            onclick: function () { UI.closeModal(); SC.counterOffer(p, buyer, item.fee); } }),
          el('button', {
            class: 'btn btn-primary', text: 'Accept ' + U.money(item.fee),
            onclick: function () { SC.acceptSale(p, buyer, item.fee, {}); }
          })
        ];
      }
    } else if (item.type === 'loan-offer') {
      const p = FCM.DB.byId[item.player];
      const club = FCM.DB.clubById[item.from];
      if (p && p.clubId === S().userClubId && !p.loanedTo) {
        const info = el('div', { class: 'kv' });
        const weeklySaving = Math.round(p.wage * item.wageShare);
        [['Player', p.name + ' (' + p.ovr + ' OVR, age ' + p.age + ')'],
         ['Loan club', club.name],
         ['Length', item.lengthLabel],
         ['They pay', Math.round(item.wageShare * 100) + '% of wages (' +
           U.wage(weeklySaving) + ')'],
         ['You still pay', U.wage(p.wage - weeklySaving)],
         ['Option to buy', item.optionToBuy ? U.money(item.optionToBuy) : 'None']
        ].forEach(([k, v]) => {
          info.appendChild(el('div', { class: 'k', text: k }));
          info.appendChild(el('div', { class: 'v', text: v }));
        });
        body.appendChild(info);
        body.appendChild(el('div', { class: 'tiny mute2', style: 'margin-top:10px',
          text: 'Regular football will develop him faster than sitting in your reserves.' }));
        foot = [
          el('button', { class: 'btn', text: 'Reject', onclick: UI.closeModal }),
          el('button', { class: 'btn', text: 'Negotiate',
            onclick: function () { UI.closeModal(); SC.counterLoan(p, club, item); } }),
          el('button', {
            class: 'btn btn-primary', text: 'Accept loan',
            onclick: function () { SC.acceptLoanOut(p, club, item); }
          })
        ];
      }
    } else if (item.type === 'contract-expiring') {
      const p = FCM.DB.byId[item.player];
      if (p && p.clubId === S().userClubId) {
        foot = [el('button', { class: 'btn', text: 'Later', onclick: UI.closeModal }),
          el('button', { class: 'btn btn-primary', text: 'Open negotiation',
            onclick: function () { UI.closeModal(); SC.negotiateContract(p); } })];
      }
    } else if (item.player) {
      const p = FCM.DB.byId[item.player];
      if (p) foot.unshift(el('button', { class: 'btn', text: 'View player',
        onclick: function () { UI.closeModal(); UI.playerProfile(p); } }));
    }
    UI.modal(item.title, body, foot);
  };

  /** Complete a sale of one of our players. */
  SC.acceptSale = function (p, buyer, fee, extras) {
    const terms = Object.assign({
      wage: P.wageDemand(p, buyer.rep), years: 4,
      sellOn: 0, releaseClause: 0, appearanceFee: 0, goalBonus: 0
    }, extras || {});
    const deal = TR.completeTransfer(p, myClub(), buyer, fee, terms, G().ctx());
    S().transfers.push(deal);
    S().finances.transferIncome += fee;
    FCM.F.addIncome(S(), 'sales', fee);
    FCM.CR.recordTransfer(S(), deal, false);
    UI.closeModal();
    UI.toast(p.name + ' sold to ' + buyer.name + ' for ' + U.money(fee));
    FCM.App.render();
  };

  /** Complete a loan-out on agreed terms. */
  SC.acceptLoanOut = function (p, club, terms) {
    const deal = TR.completeLoan(p, myClub(), club, {
      days: terms.days, wageShare: terms.wageShare,
      optionToBuy: terms.optionToBuy, obligationToBuy: terms.obligationToBuy
    }, G().ctx());
    S().transfers.push(deal);
    UI.closeModal();
    UI.toast(p.name + ' joins ' + club.name + ' on loan');
    FCM.App.render();
  };

  /** Haggle over a loan enquiry, or convert it into a permanent sale. */
  SC.counterLoan = function (p, club, original) {
    const body = el('div');
    const info = el('div', { class: 'kv', style: 'margin-bottom:14px' });
    [['Player', p.name + ' (' + p.ovr + ' OVR, age ' + p.age + ')'],
     ['Club', club.name],
     ['Their offer', Math.round(original.wageShare * 100) + '% of wages · ' + original.lengthLabel],
     ['Market value', U.money(p.value)]].forEach(([k, v]) => {
      info.appendChild(el('div', { class: 'k', text: k }));
      info.appendChild(el('div', { class: 'v', text: v }));
    });
    body.appendChild(info);

    const grid = el('div', { class: 'deal-grid' });
    function row(label, input, hint) {
      grid.appendChild(el('label', { class: 'deal-lbl', text: label }));
      grid.appendChild(input);
      grid.appendChild(el('span', { class: 'deal-hint', text: hint || '' }));
    }
    const shareIn = el('input', { type: 'number', min: 0, max: 100, step: 5,
      value: Math.min(100, Math.round(original.wageShare * 100) + 20) });
    const lenSel = el('select');
    TR.LOAN_LENGTHS.forEach(l => lenSel.appendChild(el('option', { value: l.days, text: l.label })));
    lenSel.value = String(original.days);
    const obIn = UI.moneyInput(original.optionToBuy || 0);
    const oblIn = el('input', { type: 'checkbox' });
    row('They pay (% wages)', shareIn, 'They offered ' + Math.round(original.wageShare * 100) + '%');
    row('Length', lenSel, '');
    row('Option to buy', obIn, '0 for none');
    row('Obligation to buy', oblIn, 'Forces a permanent move after the loan');
    body.appendChild(grid);

    const fb = el('div', { class: 'small', style: 'min-height:40px;margin-top:12px' });
    body.appendChild(fb);

    function readCounter() {
      return {
        wageShare: U.clamp(Number(shareIn.value) / 100, 0, 1),
        days: Number(lenSel.value),
        optionToBuy: UI.readMoney(obIn),
        obligationToBuy: oblIn.checked,
        lengthLabel: (TR.LOAN_LENGTHS.find(l => l.days === Number(lenSel.value)) || {}).label
      };
    }

    const foot = [
      el('button', { class: 'btn', text: 'Walk away', onclick: UI.closeModal }),
      // Cross-counter: try to turn the loan into a sale.
      el('button', { class: 'btn', text: 'Offer him permanently instead',
        onclick: function () { UI.closeModal(); SC.loanToSale(p, club); } }),
      el('button', { class: 'btn btn-primary', text: 'Send counter', onclick: function () {
        const counter = readCounter();
        const verdict = TR.evaluateLoanCounter(p, club, original, counter, G().ctx());
        if (verdict.accepted) {
          SC.acceptLoanOut(p, club, counter);
          return;
        }
        if (verdict.finalOffer) {
          fb.style.color = 'var(--gold)';
          fb.textContent = verdict.message;
          const box = document.querySelector('.modal-foot');
          box.innerHTML = '';
          box.appendChild(el('button', { class: 'btn', text: 'Reject', onclick: UI.closeModal }));
          box.appendChild(el('button', { class: 'btn btn-primary',
            text: 'Accept ' + Math.round(verdict.terms.wageShare * 100) + '%',
            onclick: function () { SC.acceptLoanOut(p, club, verdict.terms); } }));
          return;
        }
        fb.style.color = 'var(--red)';
        fb.textContent = verdict.message;
        const box = document.querySelector('.modal-foot');
        box.innerHTML = '';
        box.appendChild(el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal }));
      } })
    ];
    UI.modal('Negotiate loan · ' + p.name, body, foot);
  };

  /** Ask a club that wanted a loan to buy him outright instead. */
  SC.loanToSale = function (p, club) {
    const body = el('div');
    body.appendChild(el('p', { style: 'margin:0 0 12px;line-height:1.6',
      text: club.name + ' enquired about a loan. Name your price to make it permanent — ' +
        'their budget is ' + U.money(club.transferBudget) + '.' }));
    const grid = el('div', { class: 'deal-grid' });
    const feeIn = UI.moneyInput(Math.round(p.value * 1.1 / 1e5) * 1e5);
    grid.appendChild(el('label', { class: 'deal-lbl', text: 'Asking fee' }));
    grid.appendChild(feeIn);
    grid.appendChild(el('span', { class: 'deal-hint', text: 'Valued at ' + U.money(p.value) }));
    body.appendChild(grid);
    const fb = el('div', { class: 'small', style: 'min-height:40px;margin-top:12px' });
    body.appendChild(fb);

    UI.modal('Sell ' + p.name + ' instead', body, [
      el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal }),
      el('button', { class: 'btn btn-primary', text: 'Propose sale', onclick: function () {
        const fee = UI.readMoney(feeIn);
        const v = TR.evaluateLoanToSale(p, club, fee, G().ctx());
        if (v.accepted) { SC.acceptSale(p, club, v.fee, {}); return; }
        fb.style.color = v.counterFee ? 'var(--gold)' : 'var(--red)';
        fb.textContent = v.message;
        const box = document.querySelector('.modal-foot');
        box.innerHTML = '';
        box.appendChild(el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal }));
        if (v.counterFee) {
          box.appendChild(el('button', { class: 'btn btn-primary',
            text: 'Accept ' + U.money(v.counterFee),
            onclick: function () { SC.acceptSale(p, club, v.counterFee, {}); } }));
        }
      } })
    ]);
  };

  /** Counter a bid to buy with a loan proposal instead. */
  SC.saleToLoan = function (p, buyer, originalFee) {
    const body = el('div');
    body.appendChild(el('p', { style: 'margin:0 0 12px;line-height:1.6',
      text: buyer.name + ' bid ' + U.money(originalFee) + ' to sign him. Propose a loan ' +
        'instead — they may take it if he is young, or if the fee stretched them.' }));
    const grid = el('div', { class: 'deal-grid' });
    function row(label, input, hint) {
      grid.appendChild(el('label', { class: 'deal-lbl', text: label }));
      grid.appendChild(input);
      grid.appendChild(el('span', { class: 'deal-hint', text: hint || '' }));
    }
    const shareIn = el('input', { type: 'number', min: 0, max: 100, step: 5, value: 100 });
    const lenSel = el('select');
    TR.LOAN_LENGTHS.forEach(l => lenSel.appendChild(el('option', { value: l.days, text: l.label })));
    lenSel.value = String(TR.LOAN_LENGTHS[1].days);
    const obIn = UI.moneyInput(Math.round(originalFee * 1.1 / 1e5) * 1e5);
    const oblIn = el('input', { type: 'checkbox' });
    row('They pay (% wages)', shareIn, 'Higher makes it more attractive to you');
    row('Length', lenSel, '');
    row('Option to buy', obIn, '0 for none');
    row('Obligation to buy', oblIn, 'They must sign him afterwards');
    body.appendChild(grid);
    const fb = el('div', { class: 'small', style: 'min-height:40px;margin-top:12px' });
    body.appendChild(fb);

    UI.modal('Offer a loan · ' + p.name, body, [
      el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal }),
      el('button', { class: 'btn btn-primary', text: 'Propose loan', onclick: function () {
        const offer = {
          wageShare: U.clamp(Number(shareIn.value) / 100, 0, 1),
          days: Number(lenSel.value),
          optionToBuy: UI.readMoney(obIn),
          obligationToBuy: oblIn.checked
        };
        const v = TR.evaluateSaleToLoan(p, buyer, originalFee, offer, G().ctx());
        if (v.accepted) { SC.acceptLoanOut(p, buyer, offer); return; }
        fb.style.color = 'var(--gold)';
        fb.textContent = v.message;
        const box = document.querySelector('.modal-foot');
        box.innerHTML = '';
        box.appendChild(el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal }));
        box.appendChild(el('button', { class: 'btn', text: 'Back to the bid',
          onclick: function () { UI.closeModal(); SC.counterOffer(p, buyer, originalFee); } }));
      } })
    ]);
  };

  /**
   * Haggle over an incoming bid: ask for more, or attach a sell-on clause
   * so you share in his next move.
   */
  SC.counterOffer = function (p, buyer, originalFee, round) {
    const body = el('div');
    const info = el('div', { class: 'kv', style: 'margin-bottom:14px' });
    [['Player', p.name + ' (' + p.ovr + ' OVR, age ' + p.age + ')'],
     ['Interested club', buyer.name],
     ['Their offer', U.money(originalFee)],
     ['Market value', U.money(p.value)]].forEach(([k, v]) => {
      info.appendChild(el('div', { class: 'k', text: k }));
      info.appendChild(el('div', { class: 'v', text: v }));
    });
    body.appendChild(info);

    const grid = el('div', { class: 'deal-grid' });
    function row(label, input, hint) {
      grid.appendChild(el('label', { class: 'deal-lbl', text: label }));
      grid.appendChild(input);
      grid.appendChild(el('span', { class: 'deal-hint', text: hint || '' }));
    }
    const feeIn = UI.moneyInput(Math.round(originalFee * 1.25 / 1e5) * 1e5);
    const sellOnIn = el('input', { type: 'number', min: 0, max: 40, step: 5, value: 0 });
    const buyBack = el('input', { type: 'checkbox' });
    row('Asking fee', feeIn, 'They bid ' + U.money(originalFee));
    row('Sell-on %', sellOnIn, 'Your cut of his next transfer');
    row('Buy-back clause', buyBack, 'Right to re-sign him later');
    body.appendChild(grid);

    const fb = el('div', { class: 'small', style: 'min-height:40px;margin-top:12px' });
    body.appendChild(fb);

    const foot = [
      el('button', { class: 'btn', text: 'Walk away', onclick: UI.closeModal }),
      // Cross-counter: offer a loan rather than a permanent sale.
      el('button', { class: 'btn', text: 'Offer a loan instead',
        onclick: function () { UI.closeModal(); SC.saleToLoan(p, buyer, originalFee); } }),
      el('button', { class: 'btn btn-primary', text: 'Send counter-offer', onclick: function () {
        const counter = {
          fee: UI.readMoney(feeIn),
          sellOn: Number(sellOnIn.value) || 0,
          buyBack: buyBack.checked,
          isSecondRound: !!round
        };
        if (counter.fee < originalFee) {
          fb.style.color = 'var(--gold)';
          fb.textContent = 'Asking for less than they offered would be careless.';
          return;
        }
        const verdict = TR.evaluateCounter(p, buyer, originalFee, counter, G().ctx());
        if (verdict.accepted) {
          SC.acceptSale(p, buyer, verdict.fee, {
            sellOn: counter.sellOn,
            buyBack: counter.buyBack ? Math.round(verdict.fee * 1.6) : 0
          });
          UI.toast('Deal agreed at ' + U.money(verdict.fee) +
            (counter.sellOn ? ' plus a ' + counter.sellOn + '% sell-on' : ''));
          return;
        }
        if (verdict.finalOffer) {
          fb.style.color = 'var(--gold)';
          fb.textContent = verdict.message;
          // Replace the footer with a straight take-it-or-leave-it choice.
          const box = document.querySelector('.modal-foot');
          box.innerHTML = '';
          box.appendChild(el('button', { class: 'btn', text: 'Reject', onclick: UI.closeModal }));
          box.appendChild(el('button', { class: 'btn btn-primary',
            text: 'Accept ' + U.money(verdict.fee),
            onclick: function () {
              SC.acceptSale(p, buyer, verdict.fee, { sellOn: counter.sellOn });
            } }));
          return;
        }
        fb.style.color = 'var(--red)';
        fb.textContent = verdict.message;
        const box = document.querySelector('.modal-foot');
        box.innerHTML = '';
        box.appendChild(el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal }));
      } })
    ];
    UI.modal('Negotiate · ' + p.name, body, foot);
  };

  /**
   * With a tournament running and a national job in hand, Squad and Tactics
   * can switch between club and country. Returns the toggle, or null.
   */
  SC.teamToggle = function () {
    const s = S();
    const cr = FCM.CR.ensure(s);
    if (!cr.nation) return null;
    if (!G().liveTournaments().some(t => !t.complete)) return null;
    if (!FCM.App.teamView) FCM.App.teamView = 'club';
    const seg = el('div', { class: 'seg', style: 'margin-bottom:12px' });
    [['club', myClub().name, myClub()], ['nation', cr.nation, null]]
      .forEach(([id, label, club]) => {
      const b = el('button', { class: 'seg-btn seg-btn-team' +
        (FCM.App.teamView === id ? ' active' : '') });
      b.appendChild(club ? UI.badge(club, 'xs') : UI.nationBadge(label, 'xs'));
      b.appendChild(el('span', { text: label }));
      b.addEventListener('click', function () { FCM.App.teamView = id; FCM.App.render(); });
      seg.appendChild(b);
    });
    return seg;
  };

  /** The nation currently being viewed, if any. */
  SC.viewingNation = function () {
    const cr = FCM.CR.ensure(S());
    if (!cr.nation || FCM.App.teamView !== 'nation') return null;
    return G().liveTournaments().some(t => !t.complete) ? cr.nation : null;
  };

  // =====================================================================
  // Squad
  // =====================================================================
  SC.squad = function () {
    const s = S();
    const wrap = el('div');
    const toggle = SC.teamToggle();
    if (toggle) wrap.appendChild(toggle);

    // International squad during a tournament.
    const nation = SC.viewingNation();
    if (nation) {
      const pool = FCM.IN.callUpSquad(nation, 26) || [];
      const flagRow = el('div', { class: 'row', style: 'align-items:center;gap:10px;margin-bottom:10px' });
      flagRow.appendChild(UI.nationBadge(nation, 'lg'));
      const ftxt = el('div');
      ftxt.appendChild(el('div', { text: nation, style: 'font-weight:700;font-size:17px' }));
      ftxt.appendChild(el('div', { class: 'tiny mute2',
        text: (FCM.IN.CONFEDS[(FCM.NT.get(nation) || {}).confed] || {}).label || '' }));
      flagRow.appendChild(ftxt);
      wrap.appendChild(flagRow);
      const cols = [
        { key: 'pos', label: 'Pos', nosort: true, render: p => UI.posPill(p.pos[0]) },
        { key: 'name', label: 'Player', render: p => UI.playerLink(p) },
        { key: 'club', label: 'Club',
          sort: p => (FCM.DB.clubById[p.clubId] || {}).name || p.foreignClub || '',
          render: p => el('span', { class: 'small mute2',
            text: (FCM.DB.clubById[p.clubId] || {}).name || p.foreignClub || 'Free agent' }) },
        { key: 'age', label: 'Age', num: true },
        { key: 'ovr', label: 'OVR', num: true, render: p => UI.rating(p.ovr) },
        { key: 'form', label: 'Form', num: true, render: p => UI.formRating(p.form) },
        { key: 'fitness', label: 'Fit', num: true,
          render: p => Math.round(p.fitness) + '%' }
      ];
      const t = UI.table(cols, pool, { sortKey: 'ovr', sortDesc: true,
        onRow: p => UI.playerProfile(p) });
      const card = UI.card(nation + ' Squad · ' + pool.length + ' called up', t,
        el('span', { class: 'tiny mute2', text: 'your strongest available players' }));
      card.querySelector('.card-body').style.padding = '0';
      wrap.appendChild(card);
      return wrap;
    }

    const squad = mySquad();
    const ovrs = squad.map(p => p.ovr);

    const filters = el('div', { class: 'filters' });
    const search = el('input', { type: 'text', placeholder: 'Search players…' });
    const posSel = el('select');
    ['All positions', 'GK', 'DEF', 'MID', 'ATT'].forEach(o =>
      posSel.appendChild(el('option', { value: o, text: o })));
    const tagSel = el('select');
    tagSel.appendChild(el('option', { value: '', text: 'All tags' }));
    tagSel.appendChild(el('option', { value: 'untagged', text: 'Untagged' }));
    FCM.TG.COLOURS.forEach(c =>
      tagSel.appendChild(el('option', { value: c.id, text: FCM.TG.labelFor(c.id) })));
    filters.appendChild(search); filters.appendChild(posSel); filters.appendChild(tagSel);
    filters.appendChild(el('button', { class: 'btn btn-sm',
      text: FCM.App.showDepth ? 'Hide depth chart' : 'Depth chart',
      onclick: function () { FCM.App.showDepth = !FCM.App.showDepth; FCM.App.render(); } }));
    filters.appendChild(el('span', { class: 'spacer' }));
    filters.appendChild(el('span', { class: 'small muted',
      text: squad.length + ' players · avg ' + Math.round(U.mean(squad, p => p.ovr)) + ' OVR · ' +
        U.wage(U.sum(squad, p => p.wage)) + ' wage bill' }));
    wrap.appendChild(filters);

    if (FCM.App.showDepth) {
      const dc = UI.card('Squad Depth', SC.depthChart(),
        el('span', { class: 'tiny mute2', text: 'amber = thin, red = no natural option' }));
      dc.style.marginBottom = '14px';
      wrap.appendChild(dc);
    }

    const cols = [
      { key: 'pos', label: 'Pos', nosort: true, render: p => UI.posPill(p.pos[0]) },
      { key: 'name', label: 'Name', render: p => {
          const r = el('div', { class: 'row' });
          r.appendChild(UI.playerLink(p));
          const ip = UI.injuryPill(p);
          if (ip) r.appendChild(ip);
          if (p.loanedTo) r.appendChild(el('span', { class: 'pill', text: '↗ On loan',
            title: 'Out on loan at ' + ((FCM.DB.clubById[p.loanedTo] || {}).name || '') }));
          if (p.loanListed) r.appendChild(el('span', { class: 'pill pill-warn', text: 'Loan listed' }));
          if (p.transferListed) r.appendChild(el('span', { class: 'pill pill-warn', text: 'Listed' }));
          if (p.notForSale) r.appendChild(el('span', { class: 'pill pill-good', text: '🔒' ,
            title: 'Offers blocked' }));
          return r;
        } },
      { key: 'age', label: 'Age', num: true },
      { key: 'ovr', label: 'OVR', num: true, render: p => UI.rating(p.ovr) },
      { key: 'pot', label: 'POT', num: true, render: p =>
          el('span', { class: 'muted', text: FCM.ST.get('showPotential') ? p.pot : '—' }) },
      { key: 'form', label: 'Form', num: true, render: p => UI.formRating(p.form) },
      { key: 'fitness', label: 'Fit', num: true, render: p =>
          el('span', { text: Math.round(p.fitness) + '%',
            class: p.fitness < 60 ? 'bad' : '' }) },
      { key: 'apps', label: 'Apps', num: true },
      { key: 'goals', label: 'Gls', num: true },
      { key: 'assists', label: 'Ast', num: true },
      { key: 'avg', label: 'Avg', num: true, sort: p => P.avgRating(p),
        render: p => p.seasonRatings.length ? UI.formRating(P.avgRating(p)) : el('span', { class: 'mute2', text: '—' }) },
      { key: 'value', label: 'Value', num: true, render: p => U.money(p.value) },
      { key: 'wage', label: 'Wage', num: true, render: p => U.money(p.wage) },
      { key: 'contractUntil', label: 'Exp', num: true, render: p => {
          const left = p.contractUntil - p.seasonYear;
          return el('span', { text: p.contractUntil,
            class: left <= 1 ? 'pill pill-warn' : '' });
        } },
      { key: 'role', label: 'Role', nosort: true, render: p =>
          el('span', { class: 'small muted', text: P.roleLabel(p, ovrs) }) }
    ];

    let tbl = UI.table(cols, squad, { sortKey: 'ovr', sortDesc: true,
      onRow: p => UI.playerProfile(p) });
    const card = UI.card(null, tbl);
    card.querySelector('.card-body').style.padding = '0';
    wrap.appendChild(card);

    // ---- Players we have out on loan ----
    const loanees = G().loanedOut();
    if (loanees.length) {
      const lb = el('div');
      const warned = loanees.filter(p => {
        const pr = TR.loanProgress(p, s.day);
        return pr && pr.warn;
      });
      if (warned.length) {
        lb.appendChild(el('div', { class: 'notice', style: 'margin-bottom:10px',
          text: warned.length + ' loanee' + (warned.length > 1 ? 's are' : ' is') +
            ' barely playing. They will develop far faster back here, or somewhere ' +
            'they will actually feature.' }));
      }
      loanees.forEach(p => {
        const pr = TR.loanProgress(p, s.day);
        const row = el('div', { class: 'loan-row' + (pr && pr.warn ? ' warn' : '') });
        row.appendChild(UI.posPill(p.pos[0]));
        const info = el('div', { style: 'flex:1;min-width:0' });
        const nameRow = el('div', { class: 'row', style: 'gap:7px' });
        nameRow.appendChild(UI.playerLink(p));
        nameRow.appendChild(el('span', { class: 'pill pill-warn', text: '↗ Out on loan' }));
        info.appendChild(nameRow);
        info.appendChild(el('div', { class: 'tiny mute2',
          text: 'At ' + (pr ? pr.host.name : '?') + ' · ' + p.apps + ' apps, ' +
            p.goals + ' goals · back ' +
            (p.loanUntil != null ? date(p.loanUntil) : 'soon') }));
        row.appendChild(info);

        const status = el('div', { class: 'loan-status' });
        status.appendChild(el('div', { class: 'tiny',
          style: 'color:' + (pr && pr.warn ? 'var(--red)' : 'var(--text-dim)'),
          text: pr ? pr.status : '' }));
        status.appendChild(UI.bar(pr ? pr.share * 100 : 0, 100,
          pr && pr.warn ? 'bad' : (pr && pr.share < 0.45 ? 'warn' : '')));
        row.appendChild(status);

        // Development while away.
        const proj = P.projectGrowth(p, {
          minutesShare: pr ? pr.share : 0.2,
          facilities: pr ? pr.host.facilities : 3,
          coaching: pr ? pr.host.coaching : 3,
          avgRating: P.avgRating(p), season: s.season, isYouth: p.isYouth
        });
        const dev = el('div', { class: 'loan-dev' });
        dev.appendChild(UI.rating(p.ovr));
        dev.appendChild(el('div', { class: 'tiny mute2',
          text: proj.stalled ? 'not developing' : P.growthLabel(proj, p.pot) }));
        row.appendChild(dev);

        row.appendChild(el('button', { class: 'btn btn-sm', text: 'Recall',
          onclick: function (e) {
            e.stopPropagation();
            UI.confirm('Recall ' + p.name + '?',
              'He returns immediately and is available for selection. ' +
              (pr ? pr.host.name : 'His loan club') + ' will not be pleased.',
              function () { G().recallLoan(p.id); FCM.App.render(); }, 'Recall him');
          } }));
        lb.appendChild(row);
      });
      const lcard = UI.card('Out on Loan · ' + loanees.length, lb);
      lcard.style.marginTop = '14px';
      wrap.appendChild(lcard);
    }

    function apply() {
      const q = search.value.toLowerCase();
      const pf = posSel.value;
      const tf = tagSel.value;
      tbl.refresh(squad.filter(p => {
        if (q && p.name.toLowerCase().indexOf(q) < 0 && p.full.toLowerCase().indexOf(q) < 0) return false;
        if (pf !== 'All positions' && (P.GROUP[p.pos[0]] || 'MID') !== pf && pf !== p.pos[0]) return false;
        if (tf === 'untagged' && p.tag) return false;
        if (tf && tf !== 'untagged' && p.tag !== tf) return false;
        return true;
      }));
    }
    search.addEventListener('input', apply);
    posSel.addEventListener('change', apply);
    tagSel.addEventListener('change', apply);
    return wrap;
  };

  /**
   * Squad depth by position: how many bodies you have, how good they are,
   * and where you are one injury from trouble.
   */
  SC.depthChart = function () {
    const squad = mySquad();
    const shape = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
    const want = { GK: 2, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 3, CAM: 2,
      LM: 1, RM: 1, LW: 2, RW: 2, ST: 2 };
    const grid = el('div', { class: 'depth-grid' });

    shape.forEach(pos => {
      const fits = U.sortBy(
        squad.filter(p => P.familiarity(p, pos) >= 0.9 && !p.loanedTo),
        p => P.overallAt(p, pos), true);
      const need = want[pos] || 2;
      const cell = el('div', { class: 'depth-cell' +
        (fits.length === 0 ? ' empty' : (fits.length < need ? ' thin' : '')) });
      cell.appendChild(el('div', { class: 'row-between' }, [
        el('span', { class: 'depth-pos', text: pos }),
        el('span', { class: 'tiny mute2', text: fits.length + '/' + need })
      ]));
      const list = el('div', { class: 'depth-players' });
      fits.slice(0, 3).forEach(p => {
        const r = el('div', { class: 'depth-p' });
        const nm = el('span', { text: p.name,
          style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer' });
        nm.addEventListener('click', function () { UI.playerProfile(p); });
        r.appendChild(nm);
        const badge = UI.rating(P.overallAt(p, pos));
        if (p.injury > 0 || (p.suspended || 0) > 0) badge.style.opacity = '.45';
        r.appendChild(badge);
        list.appendChild(r);
      });
      cell.appendChild(list);
      if (!fits.length) {
        cell.appendChild(el('div', { class: 'depth-warn', style: 'color:var(--red)',
          text: 'No natural option' }));
      } else if (fits.length < need) {
        cell.appendChild(el('div', { class: 'depth-warn', style: 'color:var(--gold)',
          text: 'Thin — one injury from trouble' }));
      }
      grid.appendChild(cell);
    });
    return grid;
  };

  /** Side-by-side attribute comparison of two players. */
  SC.comparePlayers = function (a, b) {
    const body = el('div');
    const head = el('div', { class: 'cmp-grid', style: 'margin-bottom:14px' });
    head.appendChild(el('div', { class: 'cmp-name cmp-left', text: a.name }));
    head.appendChild(el('div', { class: 'cmp-attr', text: 'vs' }));
    head.appendChild(el('div', { class: 'cmp-name', text: b.name }));
    head.appendChild(el('div', { class: 'cmp-left tiny mute2',
      text: a.pos.join('/') + ' · ' + a.age + ' · ' + ((FCM.DB.clubById[a.clubId] || {}).name || 'Free') }));
    head.appendChild(el('div'));
    head.appendChild(el('div', { class: 'tiny mute2',
      text: b.pos.join('/') + ' · ' + b.age + ' · ' + ((FCM.DB.clubById[b.clubId] || {}).name || 'Free') }));
    body.appendChild(head);

    const rows = [
      ['Overall', a.ovr, b.ovr], ['Potential', a.pot, b.pot],
      ['Value', a.value, b.value, U.money], ['Wage', a.wage, b.wage, U.money],
      ['Age', a.age, b.age, null, true]
    ];
    const isGK = a.pos[0] === 'GK' && b.pos[0] === 'GK';
    (isGK
      ? [['Diving', 'gkd'], ['Handling', 'gkh'], ['Kicking', 'gkk'],
         ['Reflexes', 'gkr'], ['Positioning', 'gkp']]
      : [['Pace', 'pac'], ['Shooting', 'sho'], ['Passing', 'pas'],
         ['Dribbling', 'dri'], ['Defending', 'def'], ['Physical', 'phy']]
    ).forEach(([label, key]) => rows.push([label, a.att[key], b.att[key]]));

    const grid = el('div', { class: 'cmp-grid' });
    rows.forEach(([label, av, bv, fmt, lowerBetter]) => {
      const aBetter = lowerBetter ? av < bv : av > bv;
      const bBetter = lowerBetter ? bv < av : bv > av;
      grid.appendChild(el('div', { class: 'cmp-val cmp-left ' + (aBetter ? 'better' : (bBetter ? 'worse' : '')),
        text: fmt ? fmt(av) : av }));
      grid.appendChild(el('div', { class: 'cmp-attr', text: label }));
      grid.appendChild(el('div', { class: 'cmp-val ' + (bBetter ? 'better' : (aBetter ? 'worse' : '')),
        text: fmt ? fmt(bv) : bv }));
    });
    body.appendChild(grid);
    UI.modal('Compare players', body,
      [el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal })]);
  };

  /** Pick a second player to compare against `a`. */
  SC.pickCompare = function (a) {
    const body = el('div');
    const search = el('input', { type: 'text', placeholder: 'Search for a player to compare…',
      style: 'width:100%' });
    const list = el('div', { class: 'pick-list', style: 'margin-top:10px' });
    function draw() {
      const q = search.value.toLowerCase().trim();
      list.innerHTML = '';
      let pool = q.length >= 2
        ? FCM.DB.players.filter(p => p.id !== a.id &&
            (p.name.toLowerCase().indexOf(q) >= 0 || p.full.toLowerCase().indexOf(q) >= 0))
        : mySquad().filter(p => p.id !== a.id);
      pool = U.sortBy(pool, p => p.ovr, true).slice(0, 25);
      pool.forEach(p => {
        const r = el('div', { class: 'pick-row' });
        r.appendChild(UI.posPill(p.pos[0]));
        const nm = el('div', { style: 'flex:1;min-width:0' });
        nm.appendChild(el('div', { text: p.name, style: 'font-weight:600' }));
        nm.appendChild(el('div', { class: 'tiny mute2',
          text: (FCM.DB.clubById[p.clubId] || {}).name || p.foreignClub || 'Free agent' }));
        r.appendChild(nm);
        r.appendChild(UI.rating(p.ovr));
        r.addEventListener('click', function () { UI.closeModal(); SC.comparePlayers(a, p); });
        list.appendChild(r);
      });
      if (!pool.length) list.appendChild(el('div', { class: 'empty', text: 'No matches.' }));
    }
    search.addEventListener('input', draw);
    body.appendChild(search);
    body.appendChild(list);
    draw();
    UI.modal('Compare ' + a.name + ' with…', body,
      [el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal })]);
  };

  /** Global search: jump to any player or club. */
  SC.globalSearch = function () {
    const body = el('div');
    const search = el('input', { type: 'text',
      placeholder: 'Search players, clubs and national teams…', style: 'width:100%' });
    const list = el('div', { class: 'pick-list', style: 'margin-top:10px' });
    function draw() {
      const q = search.value.toLowerCase().trim();
      list.innerHTML = '';
      if (q.length < 2) {
        list.appendChild(el('div', { class: 'tiny mute2', text: 'Type at least two characters.' }));
        return;
      }
      // National teams first - there are few of them and an exact-ish match
      // for "Morocco" is almost certainly the country, not a player.
      const nations = U.sortBy(
        FCM.NT.all().filter(n => n.name.toLowerCase().indexOf(q) >= 0),
        n => n.strength, true).slice(0, 5);
      nations.forEach(n => {
        const r = el('div', { class: 'pick-row' });
        r.appendChild(UI.nationBadge(n, 'sm'));
        const nm = el('div', { style: 'flex:1' });
        nm.appendChild(el('div', { text: n.name, style: 'font-weight:600' }));
        nm.appendChild(el('div', { class: 'tiny mute2',
          text: (FCM.IN.CONFEDS[n.confed] || {}).label || '' }));
        r.appendChild(nm);
        r.appendChild(el('span', { class: 'pill', text: 'Nation' }));
        r.addEventListener('click', function () { UI.closeModal(); SC.nationProfile(n.name); });
        list.appendChild(r);
      });

      const clubs = FCM.DB.clubs.filter(c => c.name.toLowerCase().indexOf(q) >= 0).slice(0, 5);
      clubs.forEach(c => {
        const r = el('div', { class: 'pick-row' });
        r.appendChild(UI.badge(c, 'sm'));
        const nm = el('div', { style: 'flex:1' });
        nm.appendChild(el('div', { text: c.name, style: 'font-weight:600' }));
        nm.appendChild(el('div', { class: 'tiny mute2',
          text: (FCM.DB.leagueOf(c) || {}).name || '' }));
        r.appendChild(nm);
        r.appendChild(el('span', { class: 'pill', text: 'Club' }));
        r.addEventListener('click', function () { UI.closeModal(); SC.clubProfile(c); });
        list.appendChild(r);
      });
      const players = U.sortBy(FCM.DB.players.filter(p =>
        p.name.toLowerCase().indexOf(q) >= 0 || p.full.toLowerCase().indexOf(q) >= 0),
        p => p.ovr, true).slice(0, 20);
      players.forEach(p => {
        const r = el('div', { class: 'pick-row' });
        r.appendChild(UI.posPill(p.pos[0]));
        const nm = el('div', { style: 'flex:1;min-width:0' });
        nm.appendChild(el('div', { text: p.full, style: 'font-weight:600' }));
        nm.appendChild(el('div', { class: 'tiny mute2',
          text: (FCM.DB.clubById[p.clubId] || {}).name || p.foreignClub || 'Free agent' }));
        r.appendChild(nm);
        r.appendChild(UI.rating(p.ovr));
        r.addEventListener('click', function () { UI.closeModal(); UI.playerProfile(p); });
        list.appendChild(r);
      });
      if (!clubs.length && !players.length && !nations.length) {
        list.appendChild(el('div', { class: 'empty', text: 'Nothing found.' }));
      }
    }
    search.addEventListener('input', draw);
    body.appendChild(search);
    body.appendChild(list);
    draw();
    UI.modal('Search', body,
      [el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal })]);
    setTimeout(function () { search.focus(); }, 40);
  };

  /** Keyboard shortcut reference. */
  SC.shortcuts = function () {
    const body = el('div', { class: 'kv' });
    [['Space', 'Continue / advance'], ['S', 'Sim to next match'],
     ['/', 'Search players, clubs and nations'], ['1 – 9', 'Jump to a tab'],
     ['Esc', 'Close dialog'], ['?', 'This help']].forEach(([k, v]) => {
      body.appendChild(el('div', { class: 'k', html: '<kbd>' + U.esc(k) + '</kbd>' }));
      body.appendChild(el('div', { class: 'v', text: v }));
    });
    UI.modal('Keyboard shortcuts', body,
      [el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal })]);
  };

  // =====================================================================
  // Tactics
  // =====================================================================
  /**
   * Which team Tactics is editing: your club, or your country while a
   * tournament is on. National tactics live under a "nation:" key so they
   * survive alongside the club's and persist in the save.
   */
  SC.tacticsContext = function () {
    const s = S();
    const nation = SC.viewingNation();
    if (nation) {
      const key = 'nation:' + nation;
      const squad = FCM.IN.callUpSquad(nation, 26) || [];
      if (!s.tactics[key]) {
        const t = T.defaultTactics();
        const pick = T.autoPick(squad, t.formation);
        t.lineup = pick.lineup; t.subs = pick.subs;
        T.validate(t, squad);
        s.tactics[key] = t;
      }
      return { squad: squad, tac: s.tactics[key], name: nation, isNation: true };
    }
    const club = myClub();
    return { squad: mySquad(), tac: s.tactics[club.id], name: club.name, isNation: false };
  };

  SC.tactics = function () {
    const s = S();
    const ctx = SC.tacticsContext();
    const squad = ctx.squad;
    const byId = FCM.DB.byId;
    const tac = ctx.tac;
    T.validate(tac, squad);

    const wrap = el('div', { class: 'grid g-tactics' });
    const toggle = SC.teamToggle();
    if (toggle) {
      const bar = el('div', { style: 'grid-column:1/-1' });
      bar.appendChild(toggle);
      if (ctx.isNation) {
        bar.appendChild(el('div', { class: 'tiny mute2',
          style: 'margin:-6px 0 10px',
          text: 'Your XI sets how strong ' + ctx.name + ' are in tournament matches.' }));
      }
      wrap.appendChild(bar);
    }
    const leftCol = el('div', { class: 'stack' });
    const rightCol = el('div', { class: 'stack' });

    // ---- Formation selector + pitch ----
    const head = el('div', { class: 'filters' });
    const fSel = el('select');
    T.FORMATION_NAMES.forEach(f => fSel.appendChild(el('option', { value: f, text: f, selected: f === tac.formation ? 'selected' : null })));
    fSel.value = tac.formation;
    fSel.addEventListener('change', function () {
      tac.formation = fSel.value;
      const pick = T.autoPick(squad, tac.formation);
      tac.lineup = pick.lineup; tac.subs = pick.subs;
      s.settings.autoLineup = false;
      FCM.App.render();
    });
    head.appendChild(el('span', { class: 'small muted', text: 'Formation' }));
    head.appendChild(fSel);
    head.appendChild(el('button', {
      class: 'btn btn-sm', text: 'Auto-pick best XI',
      onclick: function () {
        const pick = T.autoPick(squad, tac.formation);
        tac.lineup = pick.lineup; tac.subs = pick.subs;
        s.settings.autoLineup = true;
        UI.toast('Best available XI selected');
        FCM.App.render();
      }
    }));
    head.appendChild(el('span', { class: 'spacer' }));
    head.appendChild(el('span', { class: 'small',
      text: 'XI rating ' }));
    head.appendChild(UI.rating(T.lineupStrength(tac, byId)));
    leftCol.appendChild(head);

    const pitch = el('div', { class: 'pitch' });
    pitch.appendChild(el('div', { class: 'pitch-mid' }));
    pitch.appendChild(el('div', { class: 'pitch-circle' }));
    const slots = T.FORMATIONS[tac.formation];

    // Drag state shared by pitch slots and the bench.
    let dragSrc = null;

    function swap(aKind, aIdx, bKind, bIdx) {
      function get(kind, idx) { return kind === 'xi' ? tac.lineup[idx] : tac.subs[idx]; }
      function set(kind, idx, v) { if (kind === 'xi') tac.lineup[idx] = v; else tac.subs[idx] = v; }
      const a = get(aKind, aIdx), b = get(bKind, bIdx);
      set(aKind, aIdx, b); set(bKind, bIdx, a);
      // Dropping a bench player into the XI counts as taking manual control.
      s.settings.autoLineup = false;
      FCM.App.render();
    }

    function makeDraggable(node, kind, idx) {
      node.setAttribute('draggable', 'true');
      node.addEventListener('dragstart', function (e) {
        dragSrc = { kind: kind, idx: idx };
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', kind + ':' + idx); } catch (err) {}
      });
      node.addEventListener('dragover', function (e) { e.preventDefault(); node.classList.add('drag-over'); });
      node.addEventListener('dragleave', function () { node.classList.remove('drag-over'); });
      node.addEventListener('drop', function (e) {
        e.preventDefault(); node.classList.remove('drag-over');
        if (dragSrc && !(dragSrc.kind === kind && dragSrc.idx === idx)) {
          swap(dragSrc.kind, dragSrc.idx, kind, idx);
        }
        dragSrc = null;
      });
    }

    slots.forEach((slot, i) => {
      const pid = tac.lineup[i];
      const p = byId[pid];
      const node = el('div', {
        class: 'slot' + (p ? '' : ' empty') + (p && P.familiarity(p, slot.pos) < 0.85 ? ' slot-warn' : ''),
        style: 'left:' + slot.x + '%;bottom:' + slot.y + '%'
      });
      const shirt = el('div', { class: 'slot-shirt' });
      shirt.textContent = p ? P.overallAt(p, slot.pos) : '–';
      if (p) {
        const cls = U.ratingClass(P.overallAt(p, slot.pos));
        shirt.style.borderColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--' + cls).trim() || '';
      }
      node.appendChild(shirt);
      node.appendChild(el('div', { class: 'slot-name', text: p ? p.name : 'Empty' }));
      node.appendChild(el('div', { class: 'slot-pos', text: slot.pos }));
      node.title = p ? (p.name + ' · ' + p.pos.join('/') + ' · ' + p.ovr + ' OVR' +
        (P.familiarity(p, slot.pos) < 1 ? ' (out of position)' : '')) : 'Empty';
      makeDraggable(node, 'xi', i);
      node.addEventListener('click', function () { SC.pickPlayerFor(tac, 'xi', i, slot.pos); });
      pitch.appendChild(node);
    });
    leftCol.appendChild(pitch);
    leftCol.appendChild(el('div', { class: 'tiny mute2 center',
      text: 'Drag players between the pitch and the bench to change your line-up.' }));

    // ---- Bench ----
    const bench = el('div', { class: 'bench-list' });
    tac.subs.forEach((id, i) => {
      const p = byId[id];
      if (!p) return;
      const row = el('div', { class: 'bench-row' + (p.injury > 0 ? ' injured' : '') });
      row.appendChild(UI.posPill(p.pos[0]));
      row.appendChild(el('span', { text: p.name, style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis' }));
      row.appendChild(el('span', { class: 'tiny muted', text: Math.round(p.fitness) + '%' }));
      row.appendChild(UI.rating(p.ovr));
      makeDraggable(row, 'sub', i);
      row.addEventListener('click', function () { SC.pickPlayerFor(tac, 'sub', i, p.pos[0]); });
      bench.appendChild(row);
    });
    // An empty bench slot to add another substitute into.
    if (tac.subs.length < 9) {
      const add = el('div', { class: 'bench-row', style: 'justify-content:center;color:var(--text-mute)' });
      add.appendChild(el('span', { text: '+ Add substitute' }));
      add.addEventListener('click', function () {
        SC.pickPlayerFor(tac, 'sub', tac.subs.length, null);
      });
      bench.appendChild(add);
    }
    rightCol.appendChild(UI.card('Substitutes (' + tac.subs.length + '/9)', bench));

    // ---- Reserves: everyone not in the XI or on the bench ----
    const inUse = {};
    tac.lineup.forEach(id => { if (id) inUse[id] = 1; });
    tac.subs.forEach(id => { if (id) inUse[id] = 1; });
    const reserves = U.sortBy(squad.filter(p => !inUse[p.id]), p => p.ovr, true);
    const resBox = el('div', { class: 'bench-list' });
    if (!reserves.length) {
      resBox.appendChild(el('div', { class: 'empty', text: 'Everyone is in the matchday squad.' }));
    }
    reserves.forEach(p => {
      const unavailable = p.injury > 0 || (p.suspended || 0) > 0;
      const row = el('div', { class: 'bench-row' + (unavailable ? ' injured' : '') });
      row.appendChild(UI.posPill(p.pos[0]));
      row.appendChild(el('span', { text: p.name,
        style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis' }));
      if (p.injury > 0) row.appendChild(el('span', { class: 'pill pill-bad', text: '⚕' + p.injury + 'd' }));
      else if (p.suspended > 0) row.appendChild(el('span', { class: 'pill pill-bad', text: '🟥' + p.suspended }));
      else row.appendChild(el('span', { class: 'tiny muted', text: Math.round(p.fitness) + '%' }));
      row.appendChild(UI.rating(p.ovr));
      row.addEventListener('click', function () {
        if (unavailable) { UI.toast(p.name + ' is unavailable.', 'warn'); return; }
        SC.sendToBench(tac, p.id);
      });
      resBox.appendChild(row);
    });
    rightCol.appendChild(UI.card('Reserves (' + reserves.length + ')', resBox,
      el('span', { class: 'tiny mute2', text: 'click to add to bench' })));

    // ---- Instructions ----
    const instr = el('div', { class: 'instr' });
    const mentalities = Object.keys(T.MENTALITY);
    instr.appendChild(el('label', { text: 'Mentality' }));
    const mSel = el('select', { style: 'grid-column:span 2;width:100%' });
    mentalities.forEach(m => mSel.appendChild(el('option', { value: m, text: T.MENTALITY[m].label })));
    mSel.value = tac.mentality;
    mSel.addEventListener('change', function () { tac.mentality = mSel.value; });
    instr.appendChild(mSel);

    [['tempo', 'Tempo', ['Very slow', 'Slow', 'Balanced', 'Quick', 'Very quick']],
     ['width', 'Width', ['Very narrow', 'Narrow', 'Balanced', 'Wide', 'Very wide']],
     ['pressing', 'Pressing', ['Deep block', 'Contain', 'Balanced', 'Press', 'High press']],
     ['defLine', 'Defensive line', ['Very deep', 'Deep', 'Balanced', 'High', 'Very high']],
     ['passing', 'Passing', ['Direct', 'Mixed', 'Balanced', 'Short', 'Possession']]
    ].forEach(([key, label, labels]) => {
      instr.appendChild(el('label', { text: label }));
      const rng = el('input', { type: 'range', min: 1, max: 5, step: 1, value: tac[key] });
      const val = el('div', { class: 'val', text: labels[tac[key] - 1] });
      rng.addEventListener('input', function () {
        tac[key] = Number(rng.value);
        val.textContent = labels[tac[key] - 1];
      });
      instr.appendChild(rng);
      instr.appendChild(val);
    });
    rightCol.appendChild(UI.card('Team Instructions', instr));

    // ---- Set pieces / captain ----
    const sp = el('div', { class: 'instr' });
    const onPitch = tac.lineup.map(id => byId[id]).filter(Boolean);
    [['captain', 'Captain'], ['penaltyTaker', 'Penalties'],
     ['freeKickTaker', 'Free kicks'], ['cornerTaker', 'Corners']].forEach(([key, label]) => {
      sp.appendChild(el('label', { text: label }));
      const sel = el('select', { style: 'grid-column:span 2;width:100%' });
      onPitch.forEach(p => sel.appendChild(el('option', { value: p.id, text: p.name })));
      if (tac[key]) sel.value = tac[key];
      sel.addEventListener('change', function () { tac[key] = Number(sel.value); });
      sp.appendChild(sel);
    });
    rightCol.appendChild(UI.card('Captain & Set Pieces', sp));

    wrap.appendChild(leftCol); wrap.appendChild(rightCol);
    return wrap;
  };

  /** Drop a reserve onto the bench (or straight into a free XI slot). */
  SC.sendToBench = function (tac, playerId) {
    const s = S();
    const emptySlot = tac.lineup.indexOf(null);
    if (emptySlot >= 0) tac.lineup[emptySlot] = playerId;
    else if (tac.subs.length < 9) tac.subs.push(playerId);
    else { UI.toast('The bench is full — remove someone first.', 'warn'); return; }
    s.settings.autoLineup = false;
    FCM.App.render();
  };

  /**
   * Choose any squad member for an XI position or bench slot.
   * `kind` is 'xi' or 'sub'; `pos` is the position being filled (may be null).
   */
  SC.pickPlayerFor = function (tac, kind, idx, pos) {
    const s = S(), squad = SC.tacticsContext().squad;
    const current = kind === 'xi' ? tac.lineup[idx] : tac.subs[idx];
    const currentPlayer = FCM.DB.byId[current];

    const inXI = {}, onBench = {};
    tac.lineup.forEach((id, i) => { if (id && i !== (kind === 'xi' ? idx : -1)) inXI[id] = i; });
    tac.subs.forEach((id, i) => { if (id && i !== (kind === 'sub' ? idx : -1)) onBench[id] = i; });

    const body = el('div');
    const filters = el('div', { class: 'filters' });
    const search = el('input', { type: 'text', placeholder: 'Search squad…' });
    const showAll = el('label', { class: 'row small muted', style: 'gap:5px;cursor:pointer' });
    const cbx = el('input', { type: 'checkbox' });
    showAll.appendChild(cbx);
    showAll.appendChild(el('span', { text: 'Include unavailable' }));
    filters.appendChild(search);
    filters.appendChild(showAll);
    body.appendChild(filters);

    const listBox = el('div', { class: 'pick-list' });
    body.appendChild(listBox);

    function assign(playerId) {
      function set(k, i, v) { if (k === 'xi') tac.lineup[i] = v; else tac.subs[i] = v; }
      if (playerId !== null) {
        // If the player is already elsewhere in the squad, swap them over.
        if (inXI[playerId] !== undefined) set('xi', inXI[playerId], current || null);
        else if (onBench[playerId] !== undefined) {
          if (current) tac.subs[onBench[playerId]] = current;
          else tac.subs.splice(onBench[playerId], 1);
        }
      }
      if (kind === 'sub' && idx >= tac.subs.length) {
        if (playerId !== null) tac.subs.push(playerId);
      } else {
        set(kind, idx, playerId);
      }
      if (kind === 'sub') tac.subs = tac.subs.filter(x => x !== null && x !== undefined);
      s.settings.autoLineup = false;
      UI.closeModal();
      FCM.App.render();
    }

    function draw() {
      const q = search.value.toLowerCase();
      const includeUnavailable = cbx.checked;
      let list = squad.filter(p => {
        if (p.id === current) return false;
        if (!includeUnavailable && (p.injury > 0 || (p.suspended || 0) > 0)) return false;
        if (q && p.name.toLowerCase().indexOf(q) < 0 && p.full.toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      // Best fit for this position first.
      list = U.sortBy(list, p => (pos ? P.overallAt(p, pos) : p.ovr) +
        (p.fitness / 100) * 3, true);

      listBox.innerHTML = '';
      if (current) {
        const clr = el('div', { class: 'pick-row', style: 'color:var(--red)' });
        clr.appendChild(el('span', { text: '✕  Remove ' + (currentPlayer ? currentPlayer.name : 'player') }));
        clr.addEventListener('click', function () { assign(null); });
        listBox.appendChild(clr);
      }
      list.forEach(p => {
        const rated = pos ? P.overallAt(p, pos) : p.ovr;
        const fam = pos ? P.familiarity(p, pos) : 1;
        const row = el('div', { class: 'pick-row' });
        row.appendChild(UI.posPill(p.pos[0]));
        const nm = el('div', { style: 'flex:1;min-width:0' });
        nm.appendChild(el('div', { text: p.name, style: 'font-weight:600' }));
        const sub = [];
        if (inXI[p.id] !== undefined) sub.push('in the XI');
        else if (onBench[p.id] !== undefined) sub.push('on the bench');
        if (p.injury > 0) sub.push('injured ' + p.injury + 'd');
        if ((p.suspended || 0) > 0) sub.push('suspended ' + p.suspended);
        if (pos && fam < 1) sub.push(fam < 0.75 ? 'out of position' : 'can cover');
        nm.appendChild(el('div', { class: 'tiny mute2', text: sub.join(' · ') || p.pos.join('/') }));
        row.appendChild(nm);
        row.appendChild(el('span', { class: 'tiny muted', text: Math.round(p.fitness) + '%' }));
        row.appendChild(UI.formRating(p.form));
        const r = UI.rating(rated);
        if (pos && fam < 1) r.title = 'Natural ' + p.ovr + ', ' + rated + ' at ' + pos;
        row.appendChild(r);
        if (p.injury > 0 || (p.suspended || 0) > 0) row.classList.add('unavailable');
        row.addEventListener('click', function () { assign(p.id); });
        listBox.appendChild(row);
      });
      if (!list.length) listBox.appendChild(el('div', { class: 'empty', text: 'Nobody matches.' }));
    }
    search.addEventListener('input', draw);
    cbx.addEventListener('change', draw);
    draw();

    const title = kind === 'xi' ? ('Select ' + pos) : 'Select substitute';
    UI.modal(title, body, [
      currentPlayer ? el('button', { class: 'btn', text: 'View ' + currentPlayer.name,
        onclick: function () { UI.closeModal(); UI.playerProfile(currentPlayer); } }) : null,
      el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal })
    ].filter(Boolean));
  };

  // =====================================================================
  // Calendar
  // =====================================================================
  SC.calendar = function () {
    const s = S(), club = myClub();
    const wrap = el('div', { class: 'stack' });
    if (FCM.App.calMonthOffset === undefined) FCM.App.calMonthOffset = 0;

    const fixturesByDay = {};
    G().userFixtures().forEach(f => {
      if (f.day !== null && f.day !== undefined) fixturesByDay[f.day] = f;
    });

    const today = U.dateFromDay(s.season, s.day);
    const view = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + FCM.App.calMonthOffset, 1));
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December'];

    // ---- Header with month nav + sim controls ----
    const head = el('div', { class: 'row-between', style: 'flex-wrap:wrap;gap:10px' });
    const nav = el('div', { class: 'row', style: 'gap:6px' });
    nav.appendChild(el('button', { class: 'btn btn-sm', text: '‹',
      onclick: function () { FCM.App.calMonthOffset--; FCM.App.render(); } }));
    nav.appendChild(el('b', { text: MONTHS[view.getUTCMonth()] + ' ' + view.getUTCFullYear(),
      style: 'min-width:150px;text-align:center' }));
    nav.appendChild(el('button', { class: 'btn btn-sm', text: '›',
      onclick: function () { FCM.App.calMonthOffset++; FCM.App.render(); } }));
    nav.appendChild(el('button', { class: 'btn btn-sm', text: 'Today',
      onclick: function () { FCM.App.calMonthOffset = 0; FCM.App.render(); } }));
    head.appendChild(nav);

    const acts = el('div', { class: 'row', style: 'gap:6px' });
    const next = G().nextUserFixture();
    if (next) {
      acts.appendChild(el('button', {
        class: 'btn btn-sm', text: 'Sim to next match',
        onclick: function () { SC.simTo(next.day); }
      }));
    }
    acts.appendChild(el('button', {
      class: 'btn btn-sm', text: 'Sim 1 week',
      onclick: function () { SC.simTo(s.day + 7); }
    }));
    acts.appendChild(el('button', {
      class: 'btn btn-sm', text: 'Sim 1 month',
      onclick: function () { SC.simTo(s.day + 30); }
    }));
    head.appendChild(acts);
    wrap.appendChild(head);

    // ---- Grid ----
    const grid = el('div', { class: 'cal-grid' });
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(d =>
      grid.appendChild(el('div', { class: 'cal-dow', text: d })));

    const firstDow = (view.getUTCDay() + 6) % 7;  // Monday-first
    for (let i = 0; i < firstDow; i++) grid.appendChild(el('div', { class: 'cal-cell cal-blank' }));

    const daysInMonth = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + 1, 0)).getUTCDate();
    const epoch = Date.UTC(s.season, 6, 1);
    for (let d = 1; d <= daysInMonth; d++) {
      const dayIndex = Math.round((Date.UTC(view.getUTCFullYear(), view.getUTCMonth(), d) - epoch) / 86400000);
      const f = fixturesByDay[dayIndex];
      const isToday = dayIndex === s.day;
      const past = dayIndex < s.day;
      const inWindow = TR.dayInWindow(dayIndex);
      const cell = el('div', { class: 'cal-cell' + (isToday ? ' cal-today' : '') +
        (past ? ' cal-past' : '') + (inWindow ? ' cal-window' : '') });
      if (inWindow) cell.title = TR.windowName(dayIndex) + ' transfer window open';
      cell.appendChild(el('div', { class: 'cal-num', text: d }));

      if (f) {
        const intl = !!f.international;
        const opp = intl ? null : FCM.DB.clubById[f.home === club.id ? f.away : f.home];
        const home = intl ? f.isHome : f.home === club.id;
        const ev = el('div', { class: 'cal-fx' + (f.played ? ' played' : '') +
          (intl ? ' cal-intl' : '') });
        if (intl) {
          ev.style.borderLeftColor = 'var(--blue)';
          ev.style.background = 'rgba(59,130,246,.14)';
        } else {
          // Colour the chip by competition so a cup tie is obvious at a glance.
          ev.style.borderLeftColor = FCM.CT.accent(f.comp);
          ev.style.background = FCM.CT.tint(f.comp);
        }
        if (f.played) {
          const us = home ? f.hg : f.ag, them = home ? f.ag : f.hg;
          const rc = us > them ? 'W' : (us === them ? 'D' : 'L');
          ev.appendChild(el('i', { class: 'fd fd-' + rc, text: rc }));
          ev.appendChild(el('span', { class: 'mono tiny', text: f.hg + '-' + f.ag }));
        } else {
          ev.appendChild(el('span', { class: 'tiny', text: intl ? '🌍' : (home ? 'H' : 'A') }));
        }
        ev.appendChild(el('span', { class: 'cal-opp',
          text: intl ? f.opponent.slice(0, 11) : (opp ? opp.short : '?') }));
        ev.title = f.compName + ' · ' +
          (intl ? f.round + ' · vs ' + f.opponent : ((home ? 'vs ' : 'at ') + (opp ? opp.name : '')));
        ev.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!intl && f.played && f.result) SC.matchReport(f);
          else if (!f.played) SC.simTo(f.day);
        });
        cell.appendChild(ev);
      }
      if (dayIndex > s.day) {
        cell.classList.add('cal-clickable');
        cell.title = 'Sim to ' + date(dayIndex);
        cell.addEventListener('click', function () { SC.simTo(dayIndex); });
      }
      grid.appendChild(cell);
    }
    const card = UI.card(null, grid);
    card.querySelector('.card-body').style.padding = '10px';
    wrap.appendChild(card);

    // Legend, including the transfer window band.
    const legend = el('div', { class: 'row center', style: 'gap:16px;flex-wrap:wrap;justify-content:center;margin-top:10px' });
    const winNow = TR.windowName(s.day);
    const nextW = winNow ? null : TR.nextWindow(s.day);
    legend.appendChild(el('span', { class: 'row', style: 'gap:6px' }, [
      el('i', { class: 'legend-swatch cal-window-swatch' }),
      el('span', { class: 'tiny mute2', text: 'Transfer window' })
    ]));
    legend.appendChild(el('span', { class: 'tiny mute2',
      text: winNow
        ? winNow + ' window open until ' + date(TR.windowFor(s.day).to)
        : 'Window closed — ' + nextW.name + ' opens ' + date(nextW.from) +
          '. Free agents can be signed any time.' }));
    wrap.appendChild(legend);

    wrap.appendChild(el('div', { class: 'tiny mute2 center', style: 'margin-top:6px',
      text: 'Click any future date to simulate up to it. Results stop the sim so you never miss a match.' }));
    return wrap;
  };

  /** Simulate forward to a target day, pausing on the user's matches. */
  SC.simTo = function (targetDay) {
    const s = S();
    if (targetDay <= s.day) { UI.toast('That date has already passed.', 'warn'); return; }
    // Sim-to-date always fast-forwards: matches resolve to a report rather
    // than opening the live view, which is what "sim" implies.
    const out = G().simToDay(targetDay, { stopAtMatch: true });
    FCM.App.render();
    if (S().sacked) { FCM.App.showSacked(); return; }
    if (out.matches.length) SC.matchReport(out.matches[out.matches.length - 1].fixture);
    else if (out.newSeason) UI.toast('A new season begins!', '', 4000);
  };

  /** Schedule hub: calendar view and a fixture list in one place. */
  SC.schedule = function () {
    const wrap = el('div', { class: 'stack' });
    if (!FCM.App.scheduleView) FCM.App.scheduleView = 'calendar';
    const seg = el('div', { class: 'seg' });
    [['calendar', 'Calendar'], ['list', 'Fixtures & Results']].forEach(([id, label]) => {
      const b = el('button', { class: 'seg-btn' +
        (FCM.App.scheduleView === id ? ' active' : ''), text: label });
      b.addEventListener('click', function () { FCM.App.scheduleView = id; FCM.App.render(); });
      seg.appendChild(b);
    });
    wrap.appendChild(seg);
    wrap.appendChild(FCM.App.scheduleView === 'calendar' ? SC.calendar() : SC.fixtures());
    return wrap;
  };

  /** Competitions hub: league tables, cups and Europe together. */
  SC.competitionsHub = function () {
    const wrap = el('div', { class: 'stack' });
    if (!FCM.App.compView) FCM.App.compView = 'tables';
    const seg = el('div', { class: 'seg' });
    [['tables', 'League Tables'], ['cups', 'Cups & Europe']].forEach(([id, label]) => {
      const b = el('button', { class: 'seg-btn' +
        (FCM.App.compView === id ? ' active' : ''), text: label });
      b.addEventListener('click', function () { FCM.App.compView = id; FCM.App.render(); });
      seg.appendChild(b);
    });
    wrap.appendChild(seg);
    wrap.appendChild(FCM.App.compView === 'tables' ? SC.table() : SC.competitions());
    return wrap;
  };

  // =====================================================================
  // League table
  // =====================================================================
  SC.table = function () {
    const club = myClub();
    const wrap = el('div');
    const leagues = FCM.DB.leagues.filter(l => S().competitions['league:' + l.id]);

    const filters = el('div', { class: 'filters' });
    const sel = el('select');
    leagues.forEach(l => sel.appendChild(el('option', { value: l.id, text: l.country + ' · ' + l.name })));
    sel.value = FCM.App.tableLeague || club.league;
    filters.appendChild(sel);
    wrap.appendChild(filters);

    const holder = el('div');
    wrap.appendChild(holder);

    function draw() {
      const lid = Number(sel.value);
      FCM.App.tableLeague = lid;
      const league = FCM.DB.leagueById[lid];
      const rows = G().leagueTable(lid);
      const slots = FCM.G.EURO_SLOTS[lid] || [0, 0, 0];
      const relCount = FCM.DB.leagues.some(l => l.country === league.country && l.tier === league.tier + 1) ? 3 : 0;

      const cols = [
        { key: 'pos', label: '#', num: true, render: r => {
            const z = el('span');
            let cls = 'z-none';
            if (r.pos <= slots[0]) cls = 'z-ucl';
            else if (r.pos <= slots[0] + slots[1]) cls = 'z-uel';
            else if (r.pos <= slots[0] + slots[1] + slots[2]) cls = 'z-uecl';
            else if (relCount && r.pos > rows.length - relCount) cls = 'z-rel';
            z.appendChild(el('i', { class: 'zone ' + cls }));
            z.appendChild(el('span', { text: r.pos }));
            return z;
          } },
        { key: 'name', label: 'Club', sort: r => (FCM.DB.clubById[r.club] || {}).name || '',
          render: r => UI.clubCell(FCM.DB.clubById[r.club]) },
        { key: 'p', label: 'P', num: true },
        { key: 'w', label: 'W', num: true },
        { key: 'd', label: 'D', num: true },
        { key: 'l', label: 'L', num: true },
        { key: 'gf', label: 'GF', num: true },
        { key: 'ga', label: 'GA', num: true },
        { key: 'gd', label: 'GD', num: true, render: r => (r.gd > 0 ? '+' : '') + r.gd },
        { key: 'pts', label: 'Pts', num: true, render: r => el('b', { text: r.pts }) },
        { key: 'form', label: 'Form', nosort: true, render: r => UI.formDots(r.form) }
      ];
      holder.innerHTML = '';
      const t = UI.table(cols, rows, { sortKey: 'pos', sortDesc: false,
        rowClass: r => r.club === club.id ? 'is-user' : '',
        onRow: r => SC.clubProfile(FCM.DB.clubById[r.club]) });
      const card = UI.card(league.name, t);
      card.querySelector('.card-body').style.padding = '0';
      holder.appendChild(card);

      const key = el('div', { class: 'row small muted', style: 'margin-top:10px;gap:16px;flex-wrap:wrap' });
      [['z-ucl', 'Champions League'], ['z-uel', 'Europa League'],
       ['z-uecl', 'Conference League'], ['z-rel', 'Relegation']].forEach(([c, l]) => {
        const it = el('span', { class: 'row', style: 'gap:5px' });
        it.appendChild(el('i', { class: 'zone ' + c }));
        it.appendChild(el('span', { text: l }));
        key.appendChild(it);
      });
      holder.appendChild(key);
    }
    sel.addEventListener('change', draw);
    draw();
    return wrap;
  };

  // =====================================================================
  // Fixtures
  // =====================================================================
  SC.fixtures = function () {
    const club = myClub();
    const wrap = el('div', { class: 'grid g-2' });
    const fixtures = G().userFixtures();
    const played = fixtures.filter(f => f.played);
    const upcoming = fixtures.filter(f => !f.played);

    function list(items, isResult) {
      const box = el('div');
      if (!items.length) { box.appendChild(el('div', { class: 'empty', text: 'Nothing here.' })); return box; }
      items.forEach(f => {
        // International fixtures carry names rather than club ids.
        if (f.international) {
          const row = el('div', { class: 'row fx-row intl-fx-row', style: 'padding:8px 13px;gap:10px' });
          row.appendChild(el('span', { class: 'tiny mute2', style: 'width:52px;flex:none',
            text: f.day != null ? date(f.day, 'short') : 'TBD' }));
          row.appendChild(el('span', { class: 'intl-flag', text: '🌍' }));
          const mid = el('div', { style: 'flex:1;min-width:0' });
          mid.appendChild(el('div', { style: 'font-size:13px;font-weight:600',
            text: (f.isHome ? '' : '@ ') + f.opponent }));
          mid.appendChild(el('div', { class: 'tiny mute2',
            text: f.compName + ' · ' + f.round }));
          row.appendChild(mid);
          if (isResult && f.played) {
            const us = f.isHome ? f.hg : f.ag, them = f.isHome ? f.ag : f.hg;
            const rc = us > them ? 'W' : (us === them ? 'D' : 'L');
            row.appendChild(el('span', { class: 'fd fd-' + rc, text: rc }));
            row.appendChild(el('b', { class: 'mono', text: f.hg + '–' + f.ag,
              style: 'width:38px;text-align:right' }));
          }
          box.appendChild(row);
          return;
        }
        const home = FCM.DB.clubById[f.home], away = FCM.DB.clubById[f.away];
        const opp = f.home === club.id ? away : home;
        const row = el('div', { class: 'row fx-row', style: 'padding:8px 13px;gap:10px' });
        FCM.CT.applyRow(row, f.comp);
        row.appendChild(el('span', { class: 'tiny mute2', style: 'width:52px;flex:none',
          text: f.day != null ? date(f.day, 'short') : 'TBD' }));
        row.appendChild(UI.badge(opp, 'sm'));
        const mid = el('div', { style: 'flex:1;min-width:0' });
        mid.appendChild(el('div', { style: 'font-size:13px;font-weight:600',
          text: (f.home === club.id ? '' : '@ ') + opp.name +
            (f.derby ? '  🔥' : '') }));
        const sub = el('div', { class: 'row', style: 'gap:5px;margin-top:2px' });
        sub.appendChild(FCM.CT.pill(f.comp, f.compName));
        mid.appendChild(sub);
        row.appendChild(mid);
        if (isResult) {
          const us = f.home === club.id ? f.hg : f.ag;
          const them = f.home === club.id ? f.ag : f.hg;
          const res = us > them ? 'W' : (us === them ? 'D' : 'L');
          row.appendChild(el('span', { class: 'fd fd-' + res, text: res }));
          row.appendChild(el('b', { class: 'mono', text: f.hg + '–' + f.ag, style: 'width:38px;text-align:right' }));
          row.style.cursor = 'pointer';
          row.addEventListener('click', function () { if (f.result) SC.matchReport(f); });
        }
        box.appendChild(row);
      });
      return box;
    }

    const c1 = UI.card('Results (' + played.length + ')', list(played.slice().reverse(), true));
    const c2 = UI.card('Upcoming (' + upcoming.length + ')', list(upcoming.slice(0, 30), false));
    [c1, c2].forEach(c => { c.querySelector('.card-body').style.padding = '0'; });
    wrap.appendChild(c1); wrap.appendChild(c2);
    return wrap;
  };

  // =====================================================================
  // Transfers
  // =====================================================================
  SC.transfers = function () {
    const club = myClub();
    const wrap = el('div');

    const bar = el('div', { class: 'row-between', style: 'margin-bottom:12px;flex-wrap:wrap;gap:10px' });
    const win = TR.windowName(S().day);
    const nextWin = win ? null : TR.nextWindow(S().day);
    bar.appendChild(el('div', { class: 'row', style: 'gap:14px;flex-wrap:wrap' }, [
      el('span', { class: 'pill ' + (win ? 'pill-good' : 'pill-warn'),
        title: win ? '' : 'Free agents can still be signed',
        text: win ? win + ' window open'
          : 'Window closed · free agents only' }),
      nextWin ? el('span', { class: 'tiny mute2',
        text: nextWin.name + ' window opens ' + date(nextWin.from) }) : null,
      el('span', { class: 'small muted', text: 'Budget: ' }),
      el('b', { text: U.money(club.transferBudget) }),
      el('span', { class: 'small muted', text: 'Wage room: ' }),
      el('b', { text: U.wage(Math.max(0, club.wageBudget - U.sum(mySquad(), p => p.wage))) })
    ]));
    wrap.appendChild(bar);

    // Market mode: everyone, free agents only, or contracts running down.
    const modeBar = el('div', { class: 'seg', style: 'margin-bottom:10px' });
    if (!FCM.App.trMode) FCM.App.trMode = 'all';
    [['all', 'All players'], ['free', 'Free agents'], ['expiring', 'Expiring contracts'],
     ['listed', 'Transfer listed'], ['shortlist', 'Shortlist'],
     ['myloans', 'My loan list']].forEach(([id, label]) => {
      const b = el('button', { class: 'seg-btn' + (FCM.App.trMode === id ? ' active' : ''), text: label });
      b.addEventListener('click', function () { FCM.App.trMode = id; FCM.App.render(); });
      modeBar.appendChild(b);
    });
    wrap.appendChild(modeBar);

    const filters = el('div', { class: 'filters' });
    const search = el('input', { type: 'text', placeholder: 'Search all players…' });
    const posSel = el('select');
    ['Any position', 'GK', 'DEF', 'MID', 'ATT'].forEach(o => posSel.appendChild(el('option', { value: o, text: o })));
    const detailPos = el('select');
    ['Any role'].concat(P.POSITIONS).forEach(o => detailPos.appendChild(el('option', { value: o, text: o })));
    const maxVal = el('select');
    [['Any budget', 1e12], ['Free only', 0], ['Under £1M', 1e6], ['Under £5M', 5e6],
     ['Under £15M', 15e6], ['Under £40M', 40e6], ['Under £100M', 100e6]].forEach(([t, v]) =>
      maxVal.appendChild(el('option', { value: v, text: t })));
    const ageSel = el('select');
    [['Any age', 99], ['Under 19', 19], ['Under 21', 21], ['Under 24', 24],
     ['Under 28', 28]].forEach(([t, v]) => ageSel.appendChild(el('option', { value: v, text: t })));
    const natSel = el('select');
    natSel.appendChild(el('option', { value: '', text: 'Any nation' }));
    const nations = {};
    FCM.DB.players.forEach(p => { nations[p.nat] = (nations[p.nat] || 0) + 1; });
    Object.keys(nations).sort().forEach(n =>
      natSel.appendChild(el('option', { value: n, text: n })));
    const sortSel = el('select');
    [['Best rated', 'ovr'], ['Highest potential', 'pot'], ['Cheapest', 'value'],
     ['Youngest', 'age'], ['Best form', 'form']].forEach(([t, v]) =>
      sortSel.appendChild(el('option', { value: v, text: t })));
    [search, posSel, detailPos, maxVal, ageSel, natSel, sortSel].forEach(f => filters.appendChild(f));
    wrap.appendChild(filters);

    const holder = el('div');
    wrap.appendChild(holder);

    function draw() {
      const q = search.value.toLowerCase();
      const pf = posSel.value, dp = detailPos.value;
      const mv = Number(maxVal.value), ma = Number(ageSel.value), nat = natSel.value;
      const mode = FCM.App.trMode;
      const shortlist = S().shortlist || [];

      // "My loan list" is the one mode that shows your own players.
      if (mode === 'myloans') {
        const mine = FCM.DB.squadOf(club).filter(p => p.loanListed || p.loanedTo);
        const outOnLoan = FCM.DB.players.filter(p => p.loanFrom === club.id && p.loanedTo);
        const rows = mine.concat(outOnLoan.filter(p => mine.indexOf(p) < 0));
        const lcols = [
          { key: 'pos', label: 'Pos', nosort: true, render: p => UI.posPill(p.pos[0]) },
          { key: 'name', label: 'Player', render: p => UI.playerLink(p) },
          { key: 'age', label: 'Age', num: true },
          { key: 'ovr', label: 'OVR', num: true, render: p => UI.rating(p.ovr) },
          { key: 'pot', label: 'POT', num: true, render: p => el('span', { class: 'muted', text: p.pot }) },
          { key: 'wage', label: 'Wage', num: true, render: p => U.money(p.wage) },
          { key: 'status', label: 'Status', nosort: true, render: p => {
              if (p.loanedTo) {
                const at = FCM.DB.clubById[p.loanedTo];
                return el('span', { class: 'pill pill-good',
                  text: '↗ ' + (at ? at.name : 'on loan') + ' · they pay ' +
                    Math.round((p.loanWageShare || 0) * 100) + '%' });
              }
              return el('span', { class: 'pill pill-warn', text: 'Awaiting offers' });
            } },
          { key: 'act', label: '', nosort: true, render: p => p.loanedTo ? null :
              el('button', { class: 'btn btn-sm', text: 'Unlist',
                onclick: function (e) {
                  e.stopPropagation();
                  p.loanListed = false;
                  UI.toast(p.name + ' removed from the loan list');
                  FCM.App.render();
                } }) }
        ];
        holder.innerHTML = '';
        const lt = UI.table(lcols, rows, { sortKey: 'ovr', sortDesc: true,
          onRow: p => UI.playerProfile(p),
          empty: 'Nobody is loan listed. Open a player and choose "Loan list" ' +
            'to invite offers from other clubs.' });
        const lcard = UI.card('Loan List · ' + rows.length, lt);
        lcard.querySelector('.card-body').style.padding = '0';
        holder.appendChild(lcard);
        return;
      }

      let list = FCM.DB.players.filter(p => {
        if (p.clubId === club.id) return false;
        if (p.isYouth) return false;
        if (mode === 'free' && p.clubId) return false;
        if (mode === 'listed' && !p.transferListed) return false;
        if (mode === 'shortlist' && shortlist.indexOf(p.id) < 0) return false;
        if (mode === 'expiring' && !(p.clubId && p.contractUntil - p.seasonYear <= 1)) return false;
        if (maxVal.value === '0') { if (p.clubId) return false; }
        else if (p.value > mv) return false;
        if (p.age > ma) return false;
        if (nat && p.nat !== nat) return false;
        if (pf !== 'Any position' && (P.GROUP[p.pos[0]] || 'MID') !== pf) return false;
        if (dp !== 'Any role' && p.pos.indexOf(dp) < 0) return false;
        if (q && p.name.toLowerCase().indexOf(q) < 0 && p.full.toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      const key = sortSel.value;
      list = U.sortBy(list, p => p[key], key !== 'age' && key !== 'value');
      const total = list.length;
      list = list.slice(0, 150);

      const cols = [
        { key: 'pos', label: 'Pos', nosort: true, render: p => UI.posPill(p.pos[0]) },
        { key: 'name', label: 'Name', render: p => {
            const r = el('div', { class: 'row' });
            r.appendChild(UI.playerLink(p));
            if (!p.clubId) r.appendChild(el('span', { class: 'pill pill-good', text: 'Free' }));
            else if (p.transferListed) r.appendChild(el('span', { class: 'pill pill-warn', text: 'Listed' }));
            return r;
          } },
        { key: 'club', label: 'Club', sort: p => (FCM.DB.clubById[p.clubId] || {}).name || '',
          render: p => p.clubId ? UI.clubCell(FCM.DB.clubById[p.clubId])
            : el('span', { class: 'mute2', text: 'Free agent' }) },
        { key: 'nat', label: 'Nation' },
        { key: 'age', label: 'Age', num: true },
        { key: 'ovr', label: 'OVR', num: true, render: p => UI.rating(p.ovr) },
        { key: 'pot', label: 'POT', num: true, render: p => el('span', { class: 'muted', text: p.pot }) },
        { key: 'value', label: 'Fee', num: true,
          render: p => p.clubId ? U.money(p.value) : el('span', { style: 'color:var(--accent)', text: 'Free' }) },
        { key: 'wage', label: 'Wage', num: true, render: p => U.money(p.wage) },
        { key: 'exp', label: 'Exp', num: true, sort: p => p.contractUntil,
          render: p => p.clubId ? String(p.contractUntil) : '—' },
        { key: 'act', label: '', nosort: true, render: p => {
            const box = el('div', { class: 'row', style: 'gap:4px;justify-content:flex-end' });
            const listed = (S().shortlist || []).indexOf(p.id) >= 0;
            box.appendChild(el('button', {
              class: 'btn btn-sm', text: listed ? '★' : '☆', title: 'Shortlist',
              onclick: function (e) {
                e.stopPropagation();
                const sl = S().shortlist = S().shortlist || [];
                const i = sl.indexOf(p.id);
                if (i >= 0) sl.splice(i, 1); else sl.push(p.id);
                draw();
              } }));
            box.appendChild(el('button', {
              class: 'btn btn-sm', text: p.clubId ? 'Bid' : 'Sign',
              onclick: function (e) { e.stopPropagation(); SC.makeBid(p); } }));
            return box;
          } }
      ];
      holder.innerHTML = '';
      const t = UI.table(cols, list, { sortKey: null, onRow: p => UI.playerProfile(p),
        empty: mode === 'shortlist' ? 'Your shortlist is empty — star players to track them.'
          : 'No players match those filters.' });
      const label = { all: 'Transfer Market', free: 'Free Agents',
        expiring: 'Expiring Contracts', listed: 'Transfer Listed', shortlist: 'Shortlist' }[mode];
      const card = UI.card(label + ' · ' + total + ' found' + (total > 150 ? ' (showing 150)' : ''), t);
      card.querySelector('.card-body').style.padding = '0';
      holder.appendChild(card);
    }
    [search, posSel, detailPos, maxVal, ageSel, natSel, sortSel].forEach(f =>
      f.addEventListener(f.tagName === 'INPUT' ? 'input' : 'change', draw));
    draw();
    return wrap;
  };

  /**
   * Ask another club to loan us one of their players. Loans *out* work the
   * other way round: list the player and clubs approach you.
   */
  SC.makeLoanOffer = function (p) {
    const s = S(), club = myClub();
    const owner = FCM.DB.clubById[p.clubId];
    if (!owner) { UI.toast('This player has no club.', 'warn'); return; }
    if (owner.id === club.id) { UI.toast('Use the loan list for your own players.', 'warn'); return; }
    if (!TR.windowOpen(s.day)) { UI.toast('The transfer window is closed.', 'warn'); return; }

    const body = el('div');
    const info = el('div', { class: 'kv', style: 'margin-bottom:14px' });
    [['Player', p.name + ' (' + p.pos.join('/') + ', ' + p.age + ')'],
     ['Loan from', owner.name],
     ['Rating', p.ovr + ' OVR / ' + p.pot + ' POT'],
     ['Wage', U.wage(p.wage)]].forEach(([k, v]) => {
      info.appendChild(el('div', { class: 'k', text: k }));
      info.appendChild(el('div', { class: 'v', text: v }));
    });
    body.appendChild(info);

    const lenFld = el('label', { class: 'fld' });
    lenFld.appendChild(el('span', { text: 'Length' }));
    const lenSel = el('select');
    TR.LOAN_LENGTHS.forEach(l => lenSel.appendChild(el('option', { value: l.days, text: l.label })));
    lenFld.appendChild(lenSel);
    body.appendChild(lenFld);

    const shareFld = el('label', { class: 'fld' });
    const shareLbl = el('span', { text: 'You pay: 50% of wages' });
    shareFld.appendChild(shareLbl);
    const share = el('input', { type: 'range', min: 0, max: 100, value: 50 });
    share.addEventListener('input', function () {
      shareLbl.textContent = 'You pay: ' + share.value + '% of wages (' +
        U.wage(Math.round(p.wage * Number(share.value) / 100)) + ')';
    });
    shareFld.appendChild(share);
    body.appendChild(shareFld);

    const obFld = el('label', { class: 'fld' });
    obFld.appendChild(el('span', { text: 'Option to buy (£, 0 for none)' }));
    const obIn = UI.moneyInput(0);
    obFld.appendChild(obIn);
    body.appendChild(obFld);

    const fb = el('div', { class: 'small', style: 'min-height:20px' });
    body.appendChild(fb);

    UI.modal('Loan in ' + p.name, body, [
      el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal }),
      el('button', { class: 'btn btn-primary', text: 'Submit loan offer', onclick: function () {
        const ctx = G().ctx();
        const offer = { days: Number(lenSel.value), wageShare: Number(share.value) / 100,
          optionToBuy: UI.readMoney(obIn) };
        const verdict = TR.evaluateLoan(p, owner, club, offer, ctx);
        if (!verdict.accepted) {
          fb.style.color = 'var(--gold)';
          fb.textContent = verdict.reason;
          return;
        }
        const deal = TR.completeLoan(p, owner, club, offer, ctx);
        s.transfers.push(deal);
        UI.closeModal();
        UI.toast(p.name + ' joins on loan');
        FCM.App.render();
      } })
    ]);
  };

  SC.makeBid = function (p) {
    const club = myClub();
    const seller = FCM.DB.clubById[p.clubId];
    // Free agents are not under contract, so no window applies to them.
    if (!TR.canSign(p, S().day)) {
      UI.toast('The transfer window is closed — but you can still sign free agents.', 'warn', 4200);
      return;
    }
    if (seller && seller.id === club.id) return;

    const isFree = !p.clubId;
    const body = el('div');
    const info = el('div', { class: 'kv', style: 'margin-bottom:14px' });
    [['Player', p.name + ' (' + p.pos.join('/') + ', ' + p.age + ')'],
     ['Club', seller ? seller.name : 'Free agent'],
     ['Rating', p.ovr + ' OVR / ' + p.pot + ' POT'],
     ['Market value', isFree ? 'Free transfer' : U.money(p.value)],
     ['Your budget', U.money(club.transferBudget)]].forEach(([k, v]) => {
      info.appendChild(el('div', { class: 'k', text: k }));
      info.appendChild(el('div', { class: 'v', text: v }));
    });
    body.appendChild(info);

    // Free agents cost nothing but wages, so there is no fee to negotiate.
    const feeIn = UI.moneyInput(isFree ? 0 : Math.round(p.value * 1.1));
    if (!isFree) {
      const feeFld = el('label', { class: 'fld' });
      feeFld.appendChild(el('span', { text: 'Transfer fee (£)' }));
      feeFld.appendChild(feeIn);
      body.appendChild(feeFld);
    } else {
      body.appendChild(el('p', { class: 'small',
        style: 'margin:0 0 12px;color:var(--accent)',
        text: 'No transfer fee — you only need to agree personal terms.' }));
    }

    // ---- Deal structure (fee side) ----
    const struct = el('div', { class: 'deal-grid' });
    function dealRow(label, input, hint) {
      struct.appendChild(el('label', { class: 'deal-lbl', text: label }));
      struct.appendChild(input);
      struct.appendChild(el('span', { class: 'deal-hint', text: hint || '' }));
    }
    const instIn = el('select');
    [1, 2, 3, 4].forEach(n => instIn.appendChild(el('option', { value: n,
      text: n === 1 ? 'Up front' : 'Over ' + n + ' years' })));
    const sellOnIn = el('input', { type: 'number', value: 0, min: 0, max: 50, step: 5 });
    const appIn = UI.moneyInput(0);
    const goalIn = UI.moneyInput(0);

    if (!isFree) {
      dealRow('Payment', instIn, 'Instalments reduce the value to them');
      dealRow('Sell-on %', sellOnIn, 'Share of any future sale');
    }
    dealRow('Appearance fee', appIn, 'Paid per game he plays');
    dealRow('Goal bonus', goalIn, 'Paid per goal scored');
    body.appendChild(el('div', { class: 'section-title', text: 'Deal structure' }));
    body.appendChild(struct);

    // ---- Personal terms ----
    body.appendChild(el('div', { class: 'section-title', text: 'Personal terms' }));
    const terms = el('div', { class: 'deal-grid' });
    function termRow(label, input, hint) {
      terms.appendChild(el('label', { class: 'deal-lbl', text: label }));
      terms.appendChild(input);
      terms.appendChild(el('span', { class: 'deal-hint', text: hint || '' }));
    }
    const wageIn = UI.moneyInput(P.wageDemand(p, club.rep));
    const yrIn = el('select');
    [1, 2, 3, 4, 5].forEach(y => yrIn.appendChild(el('option', { value: y,
      text: y + (y === 1 ? ' year' : ' years') })));
    yrIn.value = 4;
    const roleIn = el('select');
    TR.SQUAD_ROLES.forEach(r => roleIn.appendChild(el('option', { value: r.id, text: r.label })));
    roleIn.value = 'rotation';
    const rcIn = UI.moneyInput(0);
    termRow('Weekly wage', wageIn, 'He wants ~' + U.wage(P.wageDemand(p, club.rep)));
    termRow('Length', yrIn, '');
    termRow('Squad role', roleIn, 'A bigger promise wins him over');
    termRow('Release clause', rcIn, '0 for none');
    body.appendChild(terms);

    const feedback = el('div', { class: 'small', style: 'min-height:22px;margin-top:10px' });
    body.appendChild(feedback);

    function readOffer() {
      return {
        fee: isFree ? 0 : (UI.readMoney(feeIn)),
        instalments: Number(instIn.value) || 1,
        sellOn: Number(sellOnIn.value) || 0,
        appearanceFee: UI.readMoney(appIn),
        goalBonus: UI.readMoney(goalIn),
        wage: UI.readMoney(wageIn),
        years: Number(yrIn.value),
        squadRole: roleIn.value,
        releaseClause: UI.readMoney(rcIn)
      };
    }

    const submit = el('button', {
      class: 'btn btn-primary', text: 'Submit offer',
      onclick: function () {
        const offer = readOffer();
        // Only the up-front slice hits this year's budget.
        const upFront = Math.round(offer.fee / offer.instalments);
        if (upFront > club.transferBudget) {
          feedback.style.color = 'var(--red)';
          feedback.textContent = 'The up-front payment of ' + U.money(upFront) +
            ' exceeds your transfer budget.';
          return;
        }
        const ctx = G().ctx();
        const effective = TR.effectiveFee(offer);
        const verdict = seller ? TR.evaluateBid(p, seller, effective, ctx)
          : { accepted: true, asking: 0 };
        if (!verdict.accepted) {
          feedback.style.color = 'var(--gold)';
          feedback.textContent = verdict.blocked
            ? 'That club refuse to discuss him.'
            : seller.name + ' rejected the offer (worth ' + U.money(effective) +
              ' to them). They want around ' + U.money(verdict.asking) + '.';
          return;
        }
        // A promised squad role sweetens personal terms.
        const role = TR.roleById(offer.squadRole);
        const sweetened = Object.assign({}, offer,
          { wage: offer.wage * (1 + role.appeal * 0.06) });
        const say = TR.evaluateTerms(p, club, seller, sweetened, ctx);
        if (!say.accepted) {
          feedback.style.color = 'var(--gold)';
          feedback.textContent = 'Fee agreed, but ' + p.name + ' turned down personal terms. ' +
            say.reasons[0] + ' He wants around ' + U.wage(say.demand) + '.';
          return;
        }
        const deal = TR.completeTransfer(p, seller, club, offer.fee, offer, ctx);
        S().transfers.push(deal);
        S().finances.transferSpend += offer.fee;
        FCM.F.addExpense(S(), 'transfers', offer.fee);
        FCM.CR.recordTransfer(S(), deal, true);
        FCM.CR.touchCoached(S(), p);
        UI.closeModal();
        UI.toast('Signed ' + p.name + (offer.fee ? ' for ' + U.money(offer.fee) : ' on a free') + '!');
        FCM.App.render();
      }
    });

    const foot = [el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal })];
    if (p.clubId) {
      foot.push(el('button', { class: 'btn', text: 'Loan instead',
        onclick: function () { UI.closeModal(); SC.makeLoanOffer(p); } }));
    }
    foot.push(submit);
    UI.modal((isFree ? 'Sign ' : 'Bid for ') + p.name, body, foot);
  };

  SC.negotiateContract = function (p) {
    const club = myClub();
    const demand = P.wageDemand(p, club.rep);
    const body = el('div');
    body.appendChild(el('p', { style: 'margin:0 0 12px',
      text: p.name + ' is asking for around ' + U.wage(demand) + ' to extend his deal.' }));
    const wageFld = el('label', { class: 'fld' });
    wageFld.appendChild(el('span', { text: 'Weekly wage (£)' }));
    const wageIn = UI.moneyInput(demand);
    wageFld.appendChild(wageIn);
    body.appendChild(wageFld);
    const yrFld = el('label', { class: 'fld' });
    yrFld.appendChild(el('span', { text: 'Years' }));
    const yrIn = el('select');
    [1, 2, 3, 4, 5].forEach(y => yrIn.appendChild(el('option', { value: y, text: y })));
    yrIn.value = 3;
    yrFld.appendChild(yrIn);
    body.appendChild(yrFld);
    const fb = el('div', { class: 'small', style: 'min-height:20px' });
    body.appendChild(fb);

    UI.modal('Contract talks · ' + p.name, body, [
      el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal }),
      el('button', { class: 'btn btn-primary', text: 'Offer contract', onclick: function () {
        const wage = UI.readMoney(wageIn);
        if (wage < demand * 0.92) {
          fb.style.color = 'var(--gold)';
          fb.textContent = 'He rejected that. He is looking for closer to ' + U.wage(demand) + '.';
          return;
        }
        p.wage = wage;
        p.contractUntil = p.seasonYear + Number(yrIn.value);
        p.morale = U.clamp(p.morale + 10, 0, 100);
        p.contractWarned = false;
        P.recalcValue(p);
        UI.closeModal();
        UI.toast(p.name + ' signed a new deal until ' + p.contractUntil);
        FCM.App.render();
      } })
    ]);
  };

  // =====================================================================
  // Youth academy
  // =====================================================================
  SC.youth = function () {
    const s = S(), club = myClub();
    const wrap = el('div', { class: 'grid g-side' });
    const left = el('div', { class: 'stack' });
    const right = el('div', { class: 'stack' });

    const prospects = (club.youth || []).map(id => FCM.DB.byId[id]).filter(Boolean);
    const cols = [
      { key: 'pos', label: 'Pos', nosort: true, render: p => UI.posPill(p.pos[0]) },
      { key: 'name', label: 'Name', render: p => {
          const r = el('div', { class: 'row' });
          r.appendChild(UI.playerLink(p));
          const level = Y.unrestLevel(p);
          if (level) {
            r.appendChild(el('span', {
              class: 'pill ' + (level === 'demanding' ? 'pill-bad' : 'pill-warn'),
              text: level === 'demanding' ? 'Wants out' : 'Unsettled',
              title: Y.UNREST_LABEL[level]
            }));
          }
          if (p.scoutedFrom) r.appendChild(el('span', { class: 'pill', text: '🔍', title: 'Scouted in ' + p.scoutedFrom }));
          return r;
        } },
      { key: 'nat', label: 'Nation' },
      { key: 'age', label: 'Age', num: true, render: p =>
          el('span', { class: p.age >= 18 ? 'pill pill-warn' : '', text: p.age }) },
      { key: 'ovr', label: 'OVR', num: true, render: p => UI.rating(p.ovr) },
      { key: 'pot', label: 'Ceiling', num: true, sort: p => p.pot, render: p => {
          const r = Y.scoutedPotential(p);
          return el('span', { class: 'small', text: r.low + '–' + r.high });
        } },
      { key: 'act', label: '', nosort: true, render: p => {
          const box = el('div', { class: 'row', style: 'gap:4px;justify-content:flex-end' });
          box.appendChild(el('button', {
            class: 'btn btn-sm btn-primary', text: 'Promote',
            onclick: function (e) {
              e.stopPropagation();
              G().promoteYouth(p.id);
              UI.toast(p.name + ' promoted to the first team');
              FCM.App.render();
            } }));
          box.appendChild(el('button', {
            class: 'btn btn-sm btn-danger', text: 'Release',
            onclick: function (e) {
              e.stopPropagation();
              UI.confirm('Release ' + p.full + '?',
                'He will leave the academy permanently and become a free agent.',
                function () {
                  G().releaseYouth(p.id);
                  UI.toast(p.name + ' released from the academy');
                  FCM.App.render();
                }, 'Release');
            } }));
          return box;
        } }
    ];
    const t = UI.table(cols, prospects, { sortKey: 'pot', sortDesc: true,
      onRow: p => UI.playerProfile(p),
      rowClass: p => Y.unrestLevel(p) === 'demanding' ? 'row-alert' : '',
      empty: 'No prospects. Send scouts abroad or wait for March intake.' });
    const card = UI.card('Academy Prospects (' + prospects.length + '/' + Y.MAX_ACADEMY + ')', t);
    card.querySelector('.card-body').style.padding = '0';
    left.appendChild(card);

    const unsettled = prospects.filter(p => Y.unrestLevel(p));
    if (unsettled.length) {
      left.appendChild(el('div', { class: 'notice',
        text: unsettled.length + ' prospect' + (unsettled.length > 1 ? 's are' : ' is') +
          ' past 18 and pushing for first-team football. Promote them or they will walk away for nothing.' }));
    }

    // ---- Scouting missions ----
    const scoutBox = el('div');
    const missions = (s.scouting && s.scouting.missions) || [];
    if (missions.length) {
      missions.forEach(m => {
        const row = el('div', { class: 'row-between small', style: 'padding:6px 0;border-bottom:1px solid var(--line-soft)' });
        const info = el('div');
        info.appendChild(el('b', { text: '🔍 ' + m.label }));
        info.appendChild(el('div', { class: 'tiny mute2',
          text: (m.briefLabel && m.brief !== 'any' ? m.briefLabel + ' · ' : '') +
            'returns ' + date(m.returnsDay) + ' · ' +
            Math.max(0, m.returnsDay - s.day) + ' days left' }));
        row.appendChild(info);
        row.appendChild(UI.bar(100 - (m.returnsDay - s.day) / Math.max(1, m.returnsDay - m.startedDay) * 100, 100));
        scoutBox.appendChild(row);
      });
    } else {
      scoutBox.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:8px',
        text: 'No scouts are currently on the road.' }));
    }

    // Brief: where to look, and what to look for.
    const briefGrid = el('div', { class: 'deal-grid', style: 'margin-top:10px' });
    const regionSel = el('select');
    Y.SCOUT_REGIONS.forEach((r, i) => regionSel.appendChild(el('option', {
      value: i, text: r.label + ' · ' + r.bias })));
    const posSel = el('select');
    Y.SCOUT_BRIEFS.forEach(b => posSel.appendChild(el('option', { value: b.id, text: b.label })));
    const costLine = el('span', { class: 'deal-hint' });
    briefGrid.appendChild(el('label', { class: 'deal-lbl', text: 'Country' }));
    briefGrid.appendChild(regionSel);
    briefGrid.appendChild(el('span', { class: 'deal-hint', text: 'Shapes the type of player found' }));
    briefGrid.appendChild(el('label', { class: 'deal-lbl', text: 'Looking for' }));
    briefGrid.appendChild(posSel);
    briefGrid.appendChild(costLine);
    scoutBox.appendChild(briefGrid);

    function currentCost() {
      const region = Y.SCOUT_REGIONS[Number(regionSel.value)];
      const brief = Y.briefById(posSel.value);
      return { region: region, brief: brief, cost: Y.scoutCost(region, club, brief) };
    }
    function updateCost() {
      const c = currentCost();
      const narrow = c.brief.positions;
      costLine.textContent = U.money(c.cost) +
        (narrow ? ' · narrower search, fewer finds' : ' · broad search');
    }
    regionSel.addEventListener('change', updateCost);
    posSel.addEventListener('change', updateCost);
    updateCost();

    scoutBox.appendChild(el('button', {
      class: 'btn btn-primary btn-sm', style: 'width:100%;margin-top:10px',
      text: 'Send scout',
      onclick: function () {
        const c = currentCost();
        if (missions.length >= 3) { UI.toast('You already have three scouts abroad.', 'warn'); return; }
        if (prospects.length >= Y.MAX_ACADEMY) { UI.toast('The academy is full.', 'warn'); return; }
        if (club.transferBudget < c.cost) { UI.toast('Not enough funds for that trip.', 'warn'); return; }
        club.transferBudget -= c.cost;
        s.scouting.missions.push(Y.startMission(club, c.region, G().rng, s.day, c.brief.id));
        UI.toast('Scout sent to ' + c.region.label +
          (c.brief.positions ? ' looking for a ' + c.brief.label.toLowerCase() : ''));
        FCM.App.render();
      }
    }));
    scoutBox.appendChild(el('div', { class: 'tiny mute2', style: 'margin-top:7px',
      text: 'Scouts spend 4–10 weeks abroad and return with 0–3 prospects. A specific ' +
        'brief costs more and yields fewer players, but they will be the position you asked for.' }));
    right.appendChild(UI.card('Scouting Network', scoutBox));

    // Facilities
    const fac = el('div');
    [['youthRating', 'Youth academy', 'Quality of prospects produced'],
     ['scouting', 'Scouting network', 'Accuracy of potential reports'],
     ['facilities', 'Training facilities', 'Speed of player development'],
     ['coaching', 'Coaching staff', 'Development of first-team players']
    ].forEach(([key, label, desc]) => {
      const row = el('div', { style: 'margin-bottom:14px' });
      row.appendChild(el('div', { class: 'row-between' }, [
        el('b', { text: label, style: 'font-size:13px' }),
        el('span', { class: 'small muted', text: club[key] + ' / 5' })
      ]));
      row.appendChild(UI.bar(club[key], 5));
      row.appendChild(el('div', { class: 'tiny mute2', text: desc, style: 'margin-top:4px' }));
      const cost = Y.upgradeCost(club[key]);
      if (cost > 0) {
        row.appendChild(el('button', {
          class: 'btn btn-sm', text: 'Upgrade · ' + U.money(cost),
          style: 'margin-top:6px',
          onclick: function () {
            if (club.transferBudget < cost) { UI.toast('Not enough funds.', 'warn'); return; }
            club.transferBudget -= cost;
            club[key]++;
            UI.toast(label + ' upgraded to ' + club[key] + '/5');
            FCM.App.render();
          }
        }));
      } else {
        row.appendChild(el('div', { class: 'tiny', style: 'color:var(--accent);margin-top:6px', text: 'Maximum level' }));
      }
      fac.appendChild(row);
    });
    right.appendChild(UI.card('Club Facilities', fac));

    wrap.appendChild(left); wrap.appendChild(right);
    return wrap;
  };

  // =====================================================================
  // Competitions (cups + Europe)
  // =====================================================================
  SC.competitions = function () {
    const wrap = el('div', { class: 'stack' });
    const comps = Object.values(S().competitions).filter(c => c.type !== 'league');
    const club = myClub();

    // Ones involving the user first.
    const mine = comps.filter(c => (c.entrants || []).indexOf(club.id) >= 0);
    const others = comps.filter(c => mine.indexOf(c) < 0);

    (mine.concat(others)).forEach(comp => {
      const body = el('div');
      if (comp.type === 'cup') {
        const br = el('div', { class: 'bracket' });
        comp.rounds.forEach((round, ri) => {
          const col = el('div', { class: 'br-round' });
          const left = round.ties.length * 2 + round.byes.length;
          col.appendChild(el('div', { class: 'br-title', text: C.roundName(left, comp.name) }));
          round.ties.slice(0, 16).forEach(tie => {
            const box = el('div', { class: 'br-tie' });
            [[tie.home, tie.hg], [tie.away, tie.ag]].forEach(([cid, g]) => {
              const c = FCM.DB.clubById[cid];
              const won = tie.winner === cid;
              const row = el('div', { class: 'br-team ' + (tie.played ? (won ? 'won' : 'lost') : '') });
              row.appendChild(el('span', { text: c ? c.name.slice(0, 20) : '—',
                style: cid === club.id ? 'color:var(--accent)' : '' }));
              row.appendChild(el('span', { class: 'mono', text: tie.played ? g : '' }));
              box.appendChild(row);
            });
            if (tie.pens) box.appendChild(el('div', { class: 'tiny mute2',
              text: 'Pens ' + tie.pens.home + '–' + tie.pens.away }));
            col.appendChild(box);
          });
          if (round.ties.length > 16) col.appendChild(el('div', { class: 'tiny mute2', text: '+' + (round.ties.length - 16) + ' more ties' }));
          br.appendChild(col);
        });
        body.appendChild(br);
        if (comp.winner) {
          body.appendChild(el('div', { class: 'row', style: 'margin-top:10px;gap:8px' }, [
            el('span', { text: '🏆' }),
            el('b', { text: FCM.DB.clubById[comp.winner].name + ' win the ' + comp.name })
          ]));
        }
      } else if (comp.type === 'continental') {
        const rows = C.buildTable(comp.leaguePhase.clubs, comp.leaguePhase.fixtures,
          { nameOf: id => (FCM.DB.clubById[id] || {}).name || '' });
        const cols = [
          { key: 'pos', label: '#', num: true },
          { key: 'name', label: 'Club', sort: r => (FCM.DB.clubById[r.club] || {}).name || '',
            render: r => UI.clubCell(FCM.DB.clubById[r.club]) },
          { key: 'p', label: 'P', num: true },
          { key: 'w', label: 'W', num: true },
          { key: 'd', label: 'D', num: true },
          { key: 'l', label: 'L', num: true },
          { key: 'gd', label: 'GD', num: true, render: r => (r.gd > 0 ? '+' : '') + r.gd },
          { key: 'pts', label: 'Pts', num: true, render: r => el('b', { text: r.pts }) }
        ];
        body.appendChild(UI.table(cols, rows.slice(0, 36), { sortKey: 'pos', sortDesc: false,
          rowClass: r => r.club === club.id ? 'is-user' : '' }));
      }
      const card = UI.card(comp.name, body);
      // Give each competition card its own coloured header.
      const headEl = card.querySelector('.card-head');
      if (headEl) {
        headEl.style.borderLeft = '4px solid ' + FCM.CT.accent(comp.id);
        headEl.style.background = FCM.CT.tint(comp.id);
        const h = headEl.querySelector('h3');
        if (h) h.style.color = FCM.CT.accent(comp.id);
      }
      wrap.appendChild(card);
    });

    if (!comps.length) wrap.appendChild(el('div', { class: 'empty', text: 'No cup competitions running.' }));
    return wrap;
  };

  // =====================================================================
  // Finances
  // =====================================================================
  /** SVG donut chart. `slices` = [{label, value, colour}] */
  SC.donut = function (slices, centreTop, centreSub) {
    const total = U.sum(slices, sl => sl.value);
    const size = 190, r = 70, thick = 26, cx = size / 2, cy = size / 2;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('class', 'donut');

    function arc(startFrac, endFrac, colour, label, value) {
      const a0 = startFrac * Math.PI * 2 - Math.PI / 2;
      const a1 = endFrac * Math.PI * 2 - Math.PI / 2;
      const large = (endFrac - startFrac) > 0.5 ? 1 : 0;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      p.setAttribute('d', 'M ' + x0 + ' ' + y0 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', colour);
      p.setAttribute('stroke-width', thick);
      p.setAttribute('class', 'donut-seg');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = label + ': ' + U.money(value) +
        ' (' + Math.round(value / total * 100) + '%)';
      p.appendChild(t);
      svg.appendChild(p);
    }

    if (total <= 0) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
      c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#253044');
      c.setAttribute('stroke-width', thick);
      svg.appendChild(c);
    } else {
      let acc = 0;
      slices.forEach(sl => {
        if (sl.value <= 0) return;
        const frac = sl.value / total;
        // Leave a hairline gap between segments.
        arc(acc + 0.002, acc + frac - 0.002, sl.colour, sl.label, sl.value);
        acc += frac;
      });
    }

    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t1.setAttribute('x', cx); t1.setAttribute('y', cy - 2);
    t1.setAttribute('class', 'donut-centre');
    t1.textContent = centreTop;
    svg.appendChild(t1);
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t2.setAttribute('x', cx); t2.setAttribute('y', cy + 16);
    t2.setAttribute('class', 'donut-sub');
    t2.textContent = centreSub || '';
    svg.appendChild(t2);
    return svg;
  };

  SC.legend = function (slices, total) {
    const box = el('div', { class: 'legend' });
    U.sortBy(slices, sl => sl.value, true).forEach(sl => {
      if (sl.value <= 0) return;
      const row = el('div', { class: 'legend-row' });
      row.appendChild(el('i', { class: 'legend-dot', style: 'background:' + sl.colour }));
      row.appendChild(el('span', { class: 'legend-label', text: sl.label }));
      row.appendChild(el('span', { class: 'legend-val', text: U.money(sl.value) }));
      row.appendChild(el('span', { class: 'legend-pct',
        text: total > 0 ? Math.round(sl.value / total * 100) + '%' : '0%' }));
      box.appendChild(row);
    });
    if (!box.children.length) box.appendChild(el('div', { class: 'tiny mute2', text: 'Nothing recorded yet.' }));
    return box;
  };

  SC.finances = function () {
    const club = myClub(), s = S(), squad = mySquad();
    const wrap = el('div', { class: 'grid g-side' });
    const left = el('div', { class: 'stack' });
    const right = el('div', { class: 'stack' });
    const ledger = s.ledger || FCM.F.blankLedger();

    const overview = el('div');
    const sr = el('div', { class: 'stat-row' });
    sr.appendChild(UI.stat('Balance', U.money(club.balance),
      club.balance < 0 ? 'neg' : ''));
    sr.appendChild(UI.stat('Transfer budget', U.money(club.transferBudget)));
    sr.appendChild(UI.stat('Wage budget', U.wage(club.wageBudget)));
    sr.appendChild(UI.stat('Wage bill', U.wage(U.sum(squad, p => p.wage))));
    overview.appendChild(sr);
    left.appendChild(UI.card('Overview', overview));

    // ---- Expense donut ----
    const expSlices = FCM.F.EXPENSE_CATS.map(c => ({
      label: c.label, colour: c.colour, value: ledger.expense[c.key] || 0
    }));
    const expTotal = FCM.F.totalExpense(ledger);
    const incTotal = FCM.F.totalIncome(ledger);
    const chartBox = el('div', { class: 'chart-row' });
    chartBox.appendChild(SC.donut(expSlices, U.money(expTotal), 'total outgoings'));
    chartBox.appendChild(SC.legend(expSlices, expTotal));
    const expCard = UI.card('Where the Money Goes', chartBox);
    left.appendChild(expCard);

    // ---- Income donut ----
    const incSlices = FCM.F.INCOME_CATS.map(c => ({
      label: c.label, colour: c.colour, value: ledger.income[c.key] || 0
    }));
    const incBox = el('div', { class: 'chart-row' });
    incBox.appendChild(SC.donut(incSlices, U.money(incTotal), 'total income'));
    incBox.appendChild(SC.legend(incSlices, incTotal));
    left.appendChild(UI.card('Income', incBox));

    const net = incTotal - expTotal;
    left.appendChild(el('div', { class: net >= 0 ? 'notice notice-good' : 'notice',
      text: net >= 0
        ? 'You are running a surplus of ' + U.money(net) + ' this season.'
        : 'You are running at a loss of ' + U.money(-net) + ' this season.' }));

    // ---- Stadium ----
    const stad = el('div');
    stad.appendChild(el('div', { class: 'row-between', style: 'margin-bottom:8px' }, [
      el('div', {}, [
        el('b', { text: club.stadium }),
        el('div', { class: 'tiny mute2', text: U.num(club.capacity) + ' capacity' })
      ]),
      el('span', { class: 'pill', text: 'Upkeep ' + U.wage(FCM.F.stadiumUpkeep(club)) })
    ]));

    if (s.stadiumProject) {
      const pr = s.stadiumProject;
      const frac = FCM.F.expansionProgress(pr);
      const weeksLeft = pr.weeksLeft !== undefined ? pr.weeksLeft
        : FCM.F.expansionWeeks(pr.seats);
      stad.appendChild(el('div', { class: 'small', style: 'margin:8px 0 5px',
        text: 'Expanding by ' + U.num(pr.seats) + ' seats → ' + U.num(pr.newCapacity) }));
      stad.appendChild(UI.bar(frac * 100, 100));
      stad.appendChild(el('div', { class: 'tiny mute2', style: 'margin-top:5px',
        text: weeksLeft + ' week' + (weeksLeft === 1 ? '' : 's') + ' remaining · ' +
          Math.round(frac * 100) + '% complete' }));
    } else {
      stad.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:8px',
        text: 'A bigger ground means more matchday income — but higher upkeep.' }));
      FCM.F.EXPANSION_STEPS.forEach(seats => {
        if (!FCM.F.canExpand(club, seats)) return;
        const cost = FCM.F.expansionCost(club, seats);
        const weeks = FCM.F.expansionWeeks(seats);
        const row = el('div', { class: 'row-between', style: 'padding:5px 0;border-bottom:1px solid var(--line-soft)' });
        row.appendChild(el('div', {}, [
          el('span', { text: '+' + U.num(seats) + ' seats', style: 'font-weight:600' }),
          el('div', { class: 'tiny mute2', text: weeks + ' weeks · new capacity ' +
            U.num(club.capacity + seats) })
        ]));
        row.appendChild(el('button', {
          class: 'btn btn-sm' + (club.transferBudget >= cost ? ' btn-primary' : ''),
          text: U.money(cost),
          onclick: function () {
            if (club.transferBudget < cost) { UI.toast('Not enough funds.', 'warn'); return; }
            UI.confirm('Expand ' + club.stadium + '?',
              'Adding ' + U.num(seats) + ' seats will cost ' + U.money(cost) +
              ' and take ' + weeks + ' weeks. Capacity rises to ' +
              U.num(club.capacity + seats) + '.',
              function () {
                club.transferBudget -= cost;
                club.balance -= cost;
                FCM.F.addExpense(s, 'stadium', cost);
                s.stadiumProject = FCM.F.startExpansion(club, seats, s.day);
                UI.toast('Building work has begun');
                FCM.App.render();
              }, 'Start building');
          }
        }));
        stad.appendChild(row);
      });
      if (club.capacity >= FCM.F.MAX_CAPACITY) {
        stad.appendChild(el('div', { class: 'tiny', style: 'color:var(--accent)',
          text: 'This ground cannot be expanded further.' }));
      }
    }
    right.appendChild(UI.card('Stadium', stad));

    // ---- Ticket pricing ----
    const tick = el('div');
    const priceLbl = el('b', { text: '£' + (s.ticketPrice || 32) });
    const est = el('div', { class: 'tiny mute2', style: 'margin-top:6px' });
    function updateEst() {
      const att = FCM.F.attendance(club, s.ticketPrice, U.clamp(club.morale / 100, 0, 1));
      est.textContent = 'Estimated crowd ' + U.num(att) + ' of ' + U.num(club.capacity) +
        ' · ' + U.money(FCM.F.matchdayRevenue(att, s.ticketPrice)) + ' per home game';
    }
    tick.appendChild(el('div', { class: 'row-between' }, [
      el('span', { class: 'small muted', text: 'Ticket price' }), priceLbl
    ]));
    const slider = el('input', { type: 'range', min: FCM.F.TICKET_MIN, max: FCM.F.TICKET_MAX,
      value: s.ticketPrice || 32, style: 'width:100%;margin-top:6px' });
    slider.addEventListener('input', function () {
      s.ticketPrice = Number(slider.value);
      priceLbl.textContent = '£' + s.ticketPrice;
      updateEst();
    });
    tick.appendChild(slider);
    tick.appendChild(est);
    updateEst();
    right.appendChild(UI.card('Ticket Pricing', tick));

    const season = el('div', { class: 'kv' });
    [['Transfers in', U.money(s.finances.transferSpend)],
     ['Transfers out', U.money(s.finances.transferIncome)],
     ['Staff wages', U.wage(FCM.F.staffWages(club))],
     ['Trophies won', s.trophyCount || 0]].forEach(([k, v]) => {
      season.appendChild(el('div', { class: 'k', text: k }));
      season.appendChild(el('div', { class: 'v', text: v }));
    });
    right.appendChild(UI.card('This Season', season));

    const top = U.sortBy(squad, p => p.wage, true).slice(0, 12);
    const cols = [
      { key: 'name', label: 'Player', render: p => UI.playerLink(p) },
      { key: 'ovr', label: 'OVR', num: true, render: p => UI.rating(p.ovr) },
      { key: 'wage', label: 'Wage', num: true, render: p => U.wage(p.wage) },
      { key: 'contractUntil', label: 'Until', num: true }
    ];
    const t = UI.table(cols, top, { sortKey: 'wage', sortDesc: true });
    const card = UI.card('Top Earners', t);
    card.querySelector('.card-body').style.padding = '0';
    right.appendChild(card);

    const recent = el('div');
    const deals = s.transfers.filter(d => d.to === club.id || d.from === club.id).slice(-12).reverse();
    if (!deals.length) recent.appendChild(el('div', { class: 'empty', text: 'No transfers yet.' }));
    deals.forEach(d => {
      const row = el('div', { class: 'row-between small', style: 'padding:5px 0;border-bottom:1px solid var(--line-soft)' });
      const incoming = d.to === club.id;
      row.appendChild(el('span', { text: (incoming ? '↓ ' : '↑ ') + d.name }));
      row.appendChild(el('b', { text: (incoming ? '-' : '+') + U.money(d.fee),
        style: 'color:' + (incoming ? 'var(--red)' : 'var(--accent)') }));
      recent.appendChild(row);
    });
    right.appendChild(UI.card('Recent Transfers', recent));

    wrap.appendChild(left); wrap.appendChild(right);
    return wrap;
  };

  // =====================================================================
  // Player profile
  // =====================================================================
  UI.playerProfile = function (p) {
    const club = FCM.DB.clubById[p.clubId];
    const isMine = p.clubId === S().userClubId;
    const body = el('div');

    const head = el('div', { class: 'pp-head', style: 'margin-bottom:16px' });
    head.appendChild(UI.badge(club, 'xl'));
    const info = el('div');
    info.appendChild(el('div', { class: 'pp-name', text: p.full || p.name }));
    info.appendChild(el('div', { class: 'pp-meta',
      text: p.pos.join(' / ') + ' · ' + p.age + ' years · ' + p.nat + ' · ' + p.foot + ' footed' }));
    info.appendChild(el('div', { class: 'pp-meta', text: (club ? club.name : 'Free agent') +
      ' · contract until ' + p.contractUntil }));
    const pills = el('div', { class: 'row', style: 'margin-top:7px;gap:6px;flex-wrap:wrap' });
    if (p.injury > 0) pills.appendChild(el('span', { class: 'pill pill-bad', text: '⚕ ' + p.injuryName + ' · ' + p.injury + 'd' }));
    if (p.transferListed) pills.appendChild(el('span', { class: 'pill pill-warn', text: 'Transfer listed' }));
    if (p.isYouth) pills.appendChild(el('span', { class: 'pill pill-good', text: 'Academy' }));
    if (p.tag) {
      const tp = el('span', { class: 'pill', text: FCM.TG.labelFor(p.tag) });
      tp.style.color = FCM.TG.colour(p.tag);
      tp.style.borderColor = FCM.TG.colour(p.tag);
      pills.appendChild(tp);
    }
    (p.traits || []).slice(0, 3).forEach(t => pills.appendChild(el('span', { class: 'pill', text: t })));
    info.appendChild(pills);
    head.appendChild(info);
    const ovrBox = el('div', { class: 'pp-ovr' });
    ovrBox.appendChild(el('b', { text: p.ovr, style: 'color:var(--' + U.ratingClass(p.ovr) + ')' }));
    ovrBox.appendChild(el('span', { text: 'Overall' }));
    ovrBox.appendChild(el('div', { class: 'small muted', style: 'margin-top:6px',
      text: !FCM.ST.get('showPotential') ? 'Potential hidden'
        : (p.isYouth ? ('Ceiling ' + Y.scoutedPotential(p).low + '–' + Y.scoutedPotential(p).high)
          : ('Potential ' + p.pot)) }));
    head.appendChild(ovrBox);
    body.appendChild(head);

    // Face attributes
    const isGK = p.pos[0] === 'GK';
    const faces = isGK
      ? [['DIV', p.att.gkd], ['HAN', p.att.gkh], ['KIC', p.att.gkk],
         ['REF', p.att.gkr], ['SPD', p.att.gks], ['POS', p.att.gkp]]
      : [['PAC', p.att.pac], ['SHO', p.att.sho], ['PAS', p.att.pas],
         ['DRI', p.att.dri], ['DEF', p.att.def], ['PHY', p.att.phy]];
    const fg = el('div', { class: 'face-grid' });
    faces.forEach(([l, v]) => {
      const f = el('div', { class: 'face' });
      f.appendChild(el('div', { class: 'lbl', text: l }));
      f.appendChild(el('div', { class: 'v', text: v, style: 'color:var(--' + U.ratingClass(v) + ')' }));
      f.appendChild(UI.bar(v, 99));
      fg.appendChild(f);
    });
    body.appendChild(fg);

    // Season stats + condition
    body.appendChild(el('div', { class: 'section-title', text: 'This season' }));
    const sr = el('div', { class: 'stat-row' });
    sr.appendChild(UI.stat('Apps', p.apps));
    sr.appendChild(UI.stat('Goals', p.goals));
    sr.appendChild(UI.stat('Assists', p.assists));
    sr.appendChild(UI.stat('Avg rating', p.seasonRatings.length ? P.avgRating(p).toFixed(2) : '—'));
    sr.appendChild(UI.stat('Form', p.form.toFixed(1)));
    sr.appendChild(UI.stat('Fitness', Math.round(p.fitness) + '%'));
    body.appendChild(sr);

    // ---- Colour tag ----
    if (isMine) {
      body.appendChild(el('div', { class: 'section-title', text: 'Tag' }));
      const tagRow = el('div', { class: 'tag-row' });
      const none = el('button', { class: 'tag-btn' + (!p.tag ? ' active' : ''), title: 'No tag' });
      none.appendChild(UI.tagDot(null));
      none.addEventListener('click', function () {
        FCM.TG.set(p, null); UI.closeModal(); FCM.App.render();
      });
      tagRow.appendChild(none);
      FCM.TG.COLOURS.forEach(c => {
        const b = el('button', { class: 'tag-btn' + (p.tag === c.id ? ' active' : ''),
          title: FCM.TG.labelFor(c.id) });
        b.appendChild(UI.tagDot(c.id));
        b.addEventListener('click', function () {
          FCM.TG.set(p, c.id);
          UI.closeModal();
          UI.toast(p.name + ' tagged “' + FCM.TG.labelFor(c.id) + '”');
          FCM.App.render();
        });
        tagRow.appendChild(b);
      });
      body.appendChild(tagRow);
      body.appendChild(el('div', { class: 'tiny mute2', style: 'margin-top:5px',
        text: 'Tags only recolour his name — rename them in Settings.' }));
    }

    // ---- Development projection ----
    if (isMine) {
      const club2 = myClub();
      const squad2 = mySquad();
      const totalMin = U.sum(squad2, x => x.minutes) || 1;
      const share = U.clamp(p.minutes * 11 / totalMin, 0, 1);
      const ctx = {
        minutesShare: p.apps ? share : 0.35,
        facilities: club2.facilities,
        coaching: FCM.TN.level(S(), club2, 'coaching'),
        avgRating: P.avgRating(p),
        season: S().season,
        focusMult: FCM.TN.getFocus(S().trainingFocus).growth,
        isYouth: p.isYouth
      };
      const proj = P.projectGrowth(p, ctx);
      body.appendChild(el('div', { class: 'section-title', text: 'Development' }));
      const dev = el('div', { class: 'dev-box' });
      const headline = el('div', { class: 'dev-headline' +
        (proj.declining ? ' declining' : (proj.stalled ? ' stalled' : '')) });
      headline.appendChild(el('span', { class: 'dev-arrow',
        text: proj.declining ? '▼' : (proj.stalled ? '■' : '▲') }));
      headline.appendChild(el('span', { text: P.growthLabel(proj, p.pot) }));
      dev.appendChild(headline);

      const bar = el('div', { class: 'dev-track' });
      // Where he sits between his current rating and his ceiling.
      const span = Math.max(1, p.pot - (p.ovr - (p.xp || 0)));
      bar.appendChild(el('i', { class: 'dev-fill',
        style: 'width:' + U.clamp((p.xp || 0) * 100, 0, 100) + '%' }));
      dev.appendChild(el('div', { class: 'row-between tiny mute2' }, [
        el('span', { text: p.ovr + ' OVR' }),
        el('span', { text: 'progress to ' + (p.ovr + 1) }),
        el('span', { text: FCM.ST.get('showPotential') ? p.pot + ' ceiling' : '?' })
      ]));
      dev.appendChild(bar);

      const facts = el('div', { class: 'kv', style: 'margin-top:10px' });
      const rows = [
        ['Game time', Math.round(ctx.minutesShare * 100) + '% of available minutes'],
        ['Training', FCM.TN.getFocus(S().trainingFocus).label +
          (p.trainingFocus && p.trainingFocus !== 'none'
            ? ' · ' + FCM.TN.individualById(p.trainingFocus).label : '')],
        ['Coaching', FCM.TN.level(S(), club2, 'coaching') + '/5']
      ];
      if (proj.weeksToPotential && FCM.ST.get('showPotential')) {
        rows.push(['Time to ceiling', proj.weeksToPotential < 52
          ? proj.weeksToPotential + ' weeks'
          : (proj.weeksToPotential / 52).toFixed(1) + ' seasons']);
      }
      if (p.promotedOn !== null && p.promotedOn !== undefined &&
          S().season - p.promotedOn < P.PROMOTED_SEASONS) {
        rows.push(['Graduate bonus', 'Active — more minutes means faster growth']);
      }
      rows.forEach(([k, v]) => {
        facts.appendChild(el('div', { class: 'k', text: k }));
        facts.appendChild(el('div', { class: 'v', text: v }));
      });
      dev.appendChild(facts);
      if (proj.stalled && !proj.atPotential && !proj.declining) {
        dev.appendChild(el('div', { class: 'tiny', style: 'margin-top:8px;color:var(--gold)',
          text: 'He needs more game time, better coaching or a heavier training focus to progress.' }));
      }
      body.appendChild(dev);

      // ---- Happiness ----
      const concerns = FCM.MO.concerns(p, club2, S());
      const lvl = FCM.MO.level(p.morale);
      body.appendChild(el('div', { class: 'section-title', text: 'Happiness' }));
      const hap = el('div');
      hap.appendChild(el('div', { class: 'row', style: 'gap:8px;margin-bottom:8px' }, [
        el('span', { class: 'pill ' + lvl.cls, text: lvl.label }),
        el('span', { class: 'small mute2', text: Math.round(p.morale) + '%' }),
        p.transferRequested ? el('span', { class: 'pill pill-bad', text: 'Transfer requested' }) : null
      ].filter(Boolean)));
      if (!concerns.length) {
        hap.appendChild(el('div', { class: 'tiny mute2', text: 'Nothing on his mind.' }));
      }
      concerns.forEach(c => {
        const r = el('div', { class: 'concern' + (c.delta >= 0 ? ' good' : '') });
        r.appendChild(el('span', { class: 'concern-mark', text: c.delta >= 0 ? '+' : '−' }));
        r.appendChild(el('span', { text: c.text }));
        hap.appendChild(r);
      });
      if (p.transferRequested) {
        const acts = el('div', { class: 'row', style: 'gap:6px;margin-top:10px;flex-wrap:wrap' });
        [['promise', 'Promise game time'], ['raise', 'Improve his terms'], ['refuse', 'Refuse']]
          .forEach(([action, label]) => {
            acts.appendChild(el('button', { class: 'btn btn-sm', text: label,
              onclick: function () {
                const msg = FCM.MO.resolveRequest(p, action, club2);
                UI.closeModal();
                UI.toast(msg, action === 'refuse' ? 'warn' : '');
                FCM.App.render();
              } }));
          });
        hap.appendChild(acts);
      }
      body.appendChild(hap);
    }

    // Value & wage
    body.appendChild(el('div', { class: 'section-title', text: 'Contract & value' }));
    const kv = el('div', { class: 'kv' });
    [['Market value', U.money(p.value)], ['Wage', U.wage(p.wage)],
     ['Release clause', p.releaseClause ? U.money(p.releaseClause) : '—'],
     ['Morale', Math.round(p.morale) + '%'],
     ['Wage demand', U.wage(P.wageDemand(p, club ? club.rep : 60))]].forEach(([k, v]) => {
      kv.appendChild(el('div', { class: 'k', text: k }));
      kv.appendChild(el('div', { class: 'v', text: v }));
    });
    body.appendChild(kv);

    // Detailed attributes
    body.appendChild(el('div', { class: 'section-title', text: 'Attributes' }));
    const ag = el('div', { class: 'attr-grid' });
    FCM.DB.SUB_KEYS.forEach(k => {
      const v = p.sub[k];
      if (v === undefined) return;
      const row = el('div', { class: 'attr' });
      row.appendChild(el('span', { class: 'an', text: FCM.DB.SUB_LABELS[k] || k }));
      row.appendChild(UI.bar(v, 99, v < 50 ? 'bad' : (v < 70 ? 'warn' : '')));
      row.appendChild(el('span', { class: 'av', text: v }));
      ag.appendChild(row);
    });
    body.appendChild(ag);

    // Actions
    const foot = [el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal })];
    if (isMine) {
      foot.unshift(el('button', {
        class: 'btn btn-danger', text: 'Release',
        onclick: function () {
          UI.confirm('Release ' + p.name + '?',
            'He will leave immediately as a free agent. You stay liable for nothing, ' +
            'but you get no fee.',
            function () {
              const c = myClub();
              c.squad = c.squad.filter(id => id !== p.id);
              p.clubId = 0; p.transferListed = false;
              UI.closeModal();
              UI.toast(p.name + ' released');
              FCM.App.render();
            }, 'Release');
        }
      }));
      foot.unshift(el('button', {
        class: 'btn' + (p.notForSale ? ' btn-primary' : ''),
        text: p.notForSale ? '🔒 Not for sale' : 'Block offers',
        title: 'Refuse all approaches for this player',
        onclick: function () {
          p.notForSale = !p.notForSale;
          if (p.notForSale) p.transferListed = false;
          UI.closeModal();
          UI.toast(p.notForSale ? p.name + ' is now off-limits to other clubs'
            : 'Offers for ' + p.name + ' will be considered');
          FCM.App.render();
        }
      }));
      foot.unshift(el('button', {
        class: 'btn' + (p.loanListed ? ' btn-primary' : ''),
        text: p.loanedTo ? 'Out on loan' : (p.loanListed ? '📋 Loan listed' : 'Loan list'),
        title: 'List him for loan and wait for clubs to approach you',
        onclick: function () {
          if (p.loanedTo) { UI.toast('He is already out on loan.', 'warn'); return; }
          p.loanListed = !p.loanListed;
          if (p.loanListed) p.notForSale = false;
          UI.closeModal();
          UI.toast(p.loanListed
            ? p.name + ' added to the loan list — clubs will be in touch'
            : p.name + ' removed from the loan list');
          FCM.App.render();
        }
      }));
      foot.unshift(el('button', {
        class: 'btn', text: p.transferListed ? 'Remove from list' : 'Transfer list',
        onclick: function () {
          p.transferListed = !p.transferListed;
          if (p.transferListed) p.notForSale = false;
          UI.closeModal(); FCM.App.render();
        }
      }));
      foot.unshift(el('button', { class: 'btn', text: 'Offer new contract',
        onclick: function () { UI.closeModal(); SC.negotiateContract(p); } }));
      if (p.isYouth) {
        foot.unshift(el('button', { class: 'btn btn-primary', text: 'Promote to first team',
          onclick: function () {
            G().promoteYouth(p.id);
            UI.closeModal();
            UI.toast(p.name + ' promoted to the first team');
            FCM.App.render();
          } }));
      }
    } else {
      foot.unshift(el('button', { class: 'btn btn-primary',
        text: p.clubId ? 'Make a bid' : 'Sign on a free',
        onclick: function () { UI.closeModal(); SC.makeBid(p); } }));
      const sl = S().shortlist = S().shortlist || [];
      const listed = sl.indexOf(p.id) >= 0;
      foot.unshift(el('button', { class: 'btn', text: listed ? '★ Shortlisted' : '☆ Shortlist',
        onclick: function () {
          const i = sl.indexOf(p.id);
          if (i >= 0) sl.splice(i, 1); else sl.push(p.id);
          UI.closeModal();
          UI.toast(i >= 0 ? 'Removed from shortlist' : 'Added to shortlist');
        } }));
    }
    foot.unshift(el('button', { class: 'btn', text: '⇄ Compare',
      onclick: function () { UI.closeModal(); SC.pickCompare(p); } }));

    // Sandbox editing tools.
    if (FCM.D.isGod()) {
      foot.unshift(el('button', { class: 'btn btn-god', text: '⚡ Edit',
        onclick: function () { UI.closeModal(); SC.sandboxPlayer(p); } }));
    }
    UI.modal(p.name, body, foot, { badge: null });
  };

  /** God-mode editor for a single player. */
  SC.sandboxPlayer = function (p) {
    if (!FCM.D.isGod()) return;
    const body = el('div');
    body.appendChild(el('div', { class: 'notice notice-god',
      text: 'Sandbox mode — changes apply instantly and ignore every rule.' }));

    const grid = el('div', { class: 'deal-grid', style: 'margin-top:12px' });
    function row(label, input, hint) {
      grid.appendChild(el('label', { class: 'deal-lbl', text: label }));
      grid.appendChild(input);
      grid.appendChild(el('span', { class: 'deal-hint', text: hint || '' }));
    }
    const ovrIn = el('input', { type: 'number', value: p.ovr, min: 40, max: 99 });
    const potIn = el('input', { type: 'number', value: p.pot, min: 40, max: 99 });
    const ageIn = el('input', { type: 'number', value: p.age, min: 15, max: 45 });
    const clubIn = el('select');
    clubIn.appendChild(el('option', { value: 0, text: '— Free agent —' }));
    U.sortBy(FCM.DB.clubs, c => c.name).forEach(c =>
      clubIn.appendChild(el('option', { value: c.id, text: c.name })));
    clubIn.value = p.clubId || 0;
    row('Overall', ovrIn, 'Attributes shift to match');
    row('Potential', potIn, '');
    row('Age', ageIn, '');
    row('Club', clubIn, 'Moves instantly, no fee');
    body.appendChild(grid);

    UI.modal('⚡ Edit ' + p.name, body, [
      el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal }),
      el('button', { class: 'btn btn-god', text: 'Apply', onclick: function () {
        G().sandbox.setAge(p.id, Number(ageIn.value));
        G().sandbox.setPotential(p.id, Number(potIn.value));
        G().sandbox.setOverall(p.id, Number(ovrIn.value));
        const target = Number(clubIn.value);
        if (target !== (p.clubId || 0)) {
          if (target === 0) {
            const c = FCM.DB.clubById[p.clubId];
            if (c) { c.squad = c.squad.filter(id => id !== p.id);
              c.youth = (c.youth || []).filter(id => id !== p.id); }
            p.clubId = 0;
          } else {
            G().sandbox.forceTransfer(p.id, target);
          }
        }
        UI.closeModal();
        UI.toast(p.name + ' updated');
        FCM.App.render();
      } })
    ]);
  };

  // =====================================================================
  // Club: training, staff, objectives, records, awards
  // =====================================================================
  SC.club = function () {
    const s = S(), club = myClub(), TN = FCM.TN, AW = FCM.AW;
    const wrap = el('div', { class: 'stack' });

    const seg = el('div', { class: 'seg', style: 'margin-bottom:4px' });
    if (!FCM.App.clubTab) FCM.App.clubTab = 'training';
    [['academy', 'Academy'], ['training', 'Training'], ['staff', 'Staff'],
     ['objectives', 'Objectives'], ['records', 'Records & Awards']].forEach(([id, label]) => {
      const b = el('button', { class: 'seg-btn' + (FCM.App.clubTab === id ? ' active' : ''),
        text: label });
      b.addEventListener('click', function () { FCM.App.clubTab = id; FCM.App.render(); });
      seg.appendChild(b);
    });
    wrap.appendChild(seg);

    // ---------------- Academy ----------------
    if (FCM.App.clubTab === 'academy') {
      wrap.appendChild(SC.youth());
    }

    // ---------------- Training ----------------
    if (FCM.App.clubTab === 'training') {
      const grid = el('div', { class: 'focus-grid' });
      TN.FOCUS_ORDER.forEach(id => {
        const f = TN.FOCUSES[id];
        const card = el('div', { class: 'focus-card' + (s.trainingFocus === id ? ' active' : '') });
        card.appendChild(el('div', { class: 'focus-icon', text: f.icon }));
        card.appendChild(el('div', { class: 'focus-label', text: f.label }));
        card.appendChild(el('div', { class: 'focus-blurb', text: f.blurb }));
        const tags = el('div', { class: 'focus-tags' });
        if (f.growth > 1) tags.appendChild(el('span', { class: 'pill pill-good',
          text: '+' + Math.round((f.growth - 1) * 100) + '% growth' }));
        if (f.growth < 1) tags.appendChild(el('span', { class: 'pill pill-warn',
          text: Math.round((f.growth - 1) * 100) + '% growth' }));
        if (f.fatigue < 1) tags.appendChild(el('span', { class: 'pill pill-good', text: 'less fatigue' }));
        if (f.fatigue > 1.1) tags.appendChild(el('span', { class: 'pill pill-warn', text: 'tiring' }));
        if (f.injuryRisk) tags.appendChild(el('span', { class: 'pill pill-bad', text: 'injury risk' }));
        if (f.recovery) tags.appendChild(el('span', { class: 'pill pill-good', text: 'faster recovery' }));
        card.appendChild(tags);
        card.addEventListener('click', function () {
          s.trainingFocus = id;
          UI.toast('Training focus: ' + f.label);
          FCM.App.render();
        });
        grid.appendChild(card);
      });
      wrap.appendChild(UI.card('Team Training Focus', grid));

      // Individual programmes
      const squad = mySquad();
      const cols = [
        { key: 'pos', label: 'Pos', nosort: true, render: p => UI.posPill(p.pos[0]) },
        { key: 'name', label: 'Player', render: p => UI.playerLink(p) },
        { key: 'age', label: 'Age', num: true },
        { key: 'ovr', label: 'OVR', num: true, render: p => UI.rating(p.ovr) },
        { key: 'pot', label: 'POT', num: true, render: p => el('span', { class: 'muted', text: p.pot }) },
        { key: 'focus', label: 'Individual focus', nosort: true, render: p => {
            const sel = el('select', { style: 'font-size:12px;padding:3px 6px' });
            TN.INDIVIDUAL.forEach(x => sel.appendChild(el('option', { value: x.id, text: x.label })));
            sel.value = p.trainingFocus || 'none';
            sel.addEventListener('change', function (e) {
              e.stopPropagation();
              p.trainingFocus = sel.value;
            });
            sel.addEventListener('click', function (e) { e.stopPropagation(); });
            return sel;
          } }
      ];
      const t = UI.table(cols, squad, { sortKey: 'ovr', sortDesc: true });
      const card = UI.card('Individual Programmes', t,
        el('span', { class: 'tiny mute2', text: 'young players improve fastest' }));
      card.querySelector('.card-body').style.padding = '0';
      wrap.appendChild(card);
    }

    // ---------------- Staff ----------------
    if (FCM.App.clubTab === 'staff') {
      if (!s.staff) s.staff = TN.initStaff(club);
      const box = el('div');
      box.appendChild(el('div', { class: 'row-between small', style: 'margin-bottom:10px' }, [
        el('span', { class: 'muted', text: 'Total staff wages' }),
        el('b', { text: U.wage(TN.totalStaffWage(s)) })
      ]));
      TN.STAFF_ROLES.forEach(role => {
        const cur = s.staff[role.id] || { rating: 3, hired: false };
        const row = el('div', { class: 'staff-row' });
        row.appendChild(el('div', { class: 'staff-icon', text: role.icon }));
        const info = el('div', { style: 'flex:1;min-width:0' });
        info.appendChild(el('div', { style: 'font-weight:650;font-size:13px', text: role.label }));
        info.appendChild(el('div', { class: 'tiny mute2', text: role.effect }));
        info.appendChild(el('div', { class: 'tiny', style: 'margin-top:3px',
          text: cur.hired ? (cur.name + ' · ' + U.wage(cur.wage)) : 'In-house (club default)' }));
        row.appendChild(info);
        const stars = el('div', { class: 'staff-stars' });
        for (let i = 1; i <= 5; i++) {
          stars.appendChild(el('i', { class: 'staff-star' + (i <= cur.rating ? ' on' : '') }));
        }
        row.appendChild(stars);
        row.appendChild(el('button', { class: 'btn btn-sm', text: 'Hire',
          onclick: function () { SC.hireStaff(role); } }));
        box.appendChild(row);
      });
      wrap.appendChild(UI.card('Backroom Staff', box));
    }

    // ---------------- Objectives ----------------
    if (FCM.App.clubTab === 'objectives') {
      const box = el('div');
      const objs = s.objectives || [];
      if (!objs.length) box.appendChild(el('div', { class: 'empty', text: 'No objectives set.' }));
      objs.forEach(o => {
        const row = el('div', { class: 'obj-row' + (o.done ? ' done' : (o.failed ? ' failed' : '')) });
        row.appendChild(el('div', { class: 'obj-mark',
          text: o.done ? '✓' : (o.failed ? '✕' : '○') }));
        const info = el('div', { style: 'flex:1' });
        info.appendChild(el('div', { text: o.label, style: 'font-size:13px;font-weight:600' }));
        const rew = [];
        if (o.reward) rew.push('+' + o.reward + '% board confidence');
        if (o.cash) rew.push(U.money(o.cash) + ' bonus funds');
        info.appendChild(el('div', { class: 'tiny mute2', text: rew.join(' · ') || 'Pride' }));
        row.appendChild(info);
        row.appendChild(el('span', { class: 'pill ' + (o.done ? 'pill-good' : (o.failed ? 'pill-bad' : '')),
          text: o.done ? 'Complete' : (o.failed ? 'Missed' : 'In progress') }));
        box.appendChild(row);
      });
      wrap.appendChild(UI.card('Season Objectives', box));

      if ((s.seasonHistory || []).length) {
        const hist = el('div');
        s.seasonHistory.slice().reverse().forEach(h => {
          const met = h.position <= (h.target || 99);
          const row = el('div', { class: 'row-between small', style: 'padding:5px 0;border-bottom:1px solid var(--line-soft)' });
          row.appendChild(el('span', { text: h.season + '/' + String(h.season + 1).slice(2) + ' · ' + h.club }));
          row.appendChild(el('span', { class: 'pill ' + (met ? 'pill-good' : 'pill-warn'),
            text: U.ordinal(h.position) + (h.target ? ' (target ' + U.ordinal(h.target) + ')' : '') }));
          hist.appendChild(row);
        });
        wrap.appendChild(UI.card('Managerial Record', hist));
      }
    }

    // ---------------- Records ----------------
    if (FCM.App.clubTab === 'records') {
      const rec = s.records || AW.blankRecords();
      const box = el('div', { class: 'kv' });
      function res(r) { return r ? (r.us + '–' + r.them + ' v ' + r.opp + ' (' + r.season + ')') : '—'; }
      [['Biggest win', res(rec.biggestWin)],
       ['Heaviest defeat', res(rec.worstDefeat)],
       ['Longest unbeaten run', rec.longestUnbeaten + ' games'],
       ['Longest winning run', rec.longestWinStreak + ' games'],
       ['Current unbeaten run', rec.currentUnbeaten + ' games'],
       ['Trophies won', s.trophyCount || 0]].forEach(([k, v]) => {
        box.appendChild(el('div', { class: 'k', text: k }));
        box.appendChild(el('div', { class: 'v', text: v }));
      });
      wrap.appendChild(UI.card('Club Records', box));

      // Honours
      const honours = (s.history || []).filter(h => h.winner === s.userClubId);
      const hbox = el('div');
      if (!honours.length) hbox.appendChild(el('div', { class: 'empty', text: 'No silverware yet.' }));
      honours.slice().reverse().forEach(h => {
        const row = el('div', { class: 'row-between small', style: 'padding:5px 0;border-bottom:1px solid var(--line-soft)' });
        row.appendChild(el('span', { text: '🏆 ' + h.comp }));
        row.appendChild(el('span', { class: 'mute2', text: h.season + '/' + String(h.season + 1).slice(2) }));
        hbox.appendChild(row);
      });
      wrap.appendChild(UI.card('Trophy Cabinet', hbox));

      // All-time squad leaders
      const squad = mySquad();
      const topScorer = U.sortBy(squad, p => p.careerGoals, true)[0];
      const topApps = U.sortBy(squad, p => p.careerApps, true)[0];
      const lb = el('div', { class: 'kv' });
      [['Most goals (current squad)', topScorer ? topScorer.name + ' — ' + topScorer.careerGoals : '—'],
       ['Most appearances', topApps ? topApps.name + ' — ' + topApps.careerApps : '—']]
        .forEach(([k, v]) => {
          lb.appendChild(el('div', { class: 'k', text: k }));
          lb.appendChild(el('div', { class: 'v', text: v }));
        });
      wrap.appendChild(UI.card('Squad Leaders', lb));
    }

    // ---------------- Awards (shown alongside records) ----------------
    if (FCM.App.clubTab === 'records') {
      const box = el('div');
      const awards = s.awards || [];
      if (!awards.length) {
        box.appendChild(el('div', { class: 'empty', text: 'No awards handed out yet.' }));
      }
      awards.slice(0, 40).forEach(a => {
        const row = el('div', { class: 'award-row' +
          (a.club === s.userClubId ? ' ours' : '') });
        row.appendChild(el('div', { class: 'award-icon',
          text: a.kind === 'potm' ? '🌟' : (a.kind === 'goldenBoot' ? '👟'
            : (a.kind === 'goldenGlove' ? '🧤' : '🏅')) }));
        const info = el('div', { style: 'flex:1;min-width:0' });
        info.appendChild(el('div', { text: a.label, class: 'tiny mute2' }));
        info.appendChild(el('div', { text: a.playerName + ' — ' + a.clubName,
          style: 'font-weight:650;font-size:13px' }));
        row.appendChild(info);
        if (a.detail) row.appendChild(el('span', { class: 'pill', text: a.detail }));
        row.appendChild(el('span', { class: 'tiny mute2',
          text: a.season + '/' + String(a.season + 1).slice(2) }));
        box.appendChild(row);
      });
      wrap.appendChild(UI.card('Awards', box));

      if (s.teamOfSeason) {
        const tots = el('div');
        tots.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:8px',
          text: s.teamOfSeason.league + ' · ' + s.teamOfSeason.season + '/' +
            String(s.teamOfSeason.season + 1).slice(2) }));
        s.teamOfSeason.xi.forEach(x => {
          const row = el('div', { class: 'row-between small', style: 'padding:3px 0' });
          const left = el('div', { class: 'row', style: 'gap:7px' });
          left.appendChild(UI.posPill(x.pos));
          left.appendChild(el('span', { text: x.name, style: 'font-weight:600' }));
          left.appendChild(el('span', { class: 'tiny mute2', text: x.club }));
          row.appendChild(left);
          row.appendChild(UI.formRating(x.rating));
          tots.appendChild(row);
        });
        wrap.appendChild(UI.card('Team of the Season', tots));
      }
    }

    return wrap;
  };

  /** Shortlist of applicants for a backroom role. */
  SC.hireStaff = function (role) {
    const s = S(), club = myClub(), TN = FCM.TN;
    const cands = TN.candidates(role, club, G().rng, 4);
    const body = el('div');
    body.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:10px',
      text: role.effect + ' Wages come out of your weekly budget.' }));
    const list = el('div', { class: 'pick-list' });
    cands.forEach(c => {
      const row = el('div', { class: 'pick-row' });
      const info = el('div', { style: 'flex:1;min-width:0' });
      info.appendChild(el('div', { text: c.name, style: 'font-weight:650' }));
      info.appendChild(el('div', { class: 'tiny mute2', text: 'Age ' + c.age + ' · ' + U.wage(c.wage) }));
      row.appendChild(info);
      const stars = el('div', { class: 'staff-stars' });
      for (let i = 1; i <= 5; i++) {
        stars.appendChild(el('i', { class: 'staff-star' + (i <= c.rating ? ' on' : '') }));
      }
      row.appendChild(stars);
      row.addEventListener('click', function () {
        s.staff[role.id] = { name: c.name, rating: c.rating, wage: c.wage, hired: true };
        UI.closeModal();
        UI.toast(c.name + ' hired as ' + role.label);
        FCM.App.render();
      });
      list.appendChild(row);
    });
    body.appendChild(list);
    const cur = s.staff[role.id];
    const foot = [el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeModal })];
    if (cur && cur.hired) {
      foot.unshift(el('button', { class: 'btn btn-danger', text: 'Dismiss ' + cur.name,
        onclick: function () {
          s.staff[role.id] = { name: null, rating: club[role.id] || 3, wage: 0, hired: false };
          UI.closeModal();
          UI.toast(role.label + ' dismissed');
          FCM.App.render();
        } }));
    }
    UI.modal('Hire a ' + role.label, body, foot);
  };

  // =====================================================================
  // Settings
  // =====================================================================
  SC.settings = function () {
    const ST = FCM.ST;
    const wrap = el('div', { class: 'stack' });

    // ---- Theme ----
    const themeBox = el('div', { class: 'theme-grid' });
    ST.THEMES.forEach(t => {
      const card = el('div', { class: 'theme-card' + (ST.get('theme') === t.id ? ' active' : '') });
      const sw = el('div', { class: 'theme-swatch' });
      sw.style.background = t.swatch[0];
      const dot = el('i');
      dot.style.background = t.swatch[1];
      sw.appendChild(dot);
      card.appendChild(sw);
      card.appendChild(el('div', { class: 'theme-label', text: t.label }));
      card.appendChild(el('div', { class: 'theme-blurb', text: t.blurb }));
      card.addEventListener('click', function () {
        ST.set('theme', t.id);
        UI.toast(t.label + ' theme applied');
        FCM.App.render();
      });
      themeBox.appendChild(card);
    });
    wrap.appendChild(UI.card('Theme', themeBox));

    // ---- Toggles ----
    function toggleRow(box, key, label, blurb, onChange) {
      const row = el('div', { class: 'setting-row' });
      const info = el('div', { style: 'flex:1;min-width:0' });
      info.appendChild(el('div', { text: label, style: 'font-weight:650;font-size:13px' }));
      info.appendChild(el('div', { class: 'tiny mute2', text: blurb }));
      row.appendChild(info);
      const sw = el('button', { class: 'switch' + (ST.get(key) ? ' on' : '') });
      sw.appendChild(el('i'));
      sw.addEventListener('click', function () {
        const val = !ST.get(key);
        ST.set(key, val);
        sw.className = 'switch' + (val ? ' on' : '');
        if (onChange) onChange(val);
      });
      row.appendChild(sw);
      box.appendChild(row);
    }

    const matchBox = el('div');
    toggleRow(matchBox, 'liveMatches', 'Watch matches live',
      'Off means your matches resolve instantly to a report.', function (v) {
        if (S()) S().settings.watchMatches = v;
      });
    const speedRow = el('div', { class: 'setting-row' });
    const sInfo = el('div', { style: 'flex:1' });
    sInfo.appendChild(el('div', { text: 'Default match speed', style: 'font-weight:650;font-size:13px' }));
    sInfo.appendChild(el('div', { class: 'tiny mute2', text: 'Where the live match starts before you adjust it.' }));
    speedRow.appendChild(sInfo);
    const speedSel = el('select');
    [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['turbo', 'Turbo']]
      .forEach(([v, l]) => speedSel.appendChild(el('option', { value: v, text: l })));
    speedSel.value = ST.get('matchSpeed');
    speedSel.addEventListener('change', function () {
      ST.set('matchSpeed', speedSel.value);
      FCM.LV.lastSpeed = speedSel.value;
    });
    speedRow.appendChild(speedSel);
    matchBox.appendChild(speedRow);
    toggleRow(matchBox, 'autoSubs', 'Automatic substitutions',
      'Let the assistant make changes when players tire.', function (v) {
        if (S()) S().settings.autoSubs = v;
      });
    toggleRow(matchBox, 'autoLineup', 'Auto-pick my line-up',
      'Turns itself off as soon as you pick a side by hand.', function (v) {
        if (S()) S().settings.autoLineup = v;
      });
    wrap.appendChild(UI.card('Matches', matchBox));

    const gameBox = el('div');
    toggleRow(gameBox, 'showPotential', 'Show player potential',
      'Turn off to judge players on what you can actually see.');
    toggleRow(gameBox, 'showCompColours', 'Colour-code competitions',
      'Tint fixtures by tournament so cups stand out.');
    toggleRow(gameBox, 'fullMoney', 'Show money in full',
      '£10,228,900 instead of £10.2M.', function () { FCM.App.render(); });
    toggleRow(gameBox, 'confirmBigDecisions', 'Confirm big decisions',
      'Ask before releasing players and other one-way actions.');
    toggleRow(gameBox, 'autosave', 'Autosave',
      'Keeps a rolling backup in browser storage as you play.');
    const densRow = el('div', { class: 'setting-row' });
    const dInfo = el('div', { style: 'flex:1' });
    dInfo.appendChild(el('div', { text: 'Interface density', style: 'font-weight:650;font-size:13px' }));
    dInfo.appendChild(el('div', { class: 'tiny mute2', text: 'Compact fits more rows on screen.' }));
    densRow.appendChild(dInfo);
    const densSel = el('select');
    [['comfortable', 'Comfortable'], ['compact', 'Compact']]
      .forEach(([v, l]) => densSel.appendChild(el('option', { value: v, text: l })));
    densSel.value = ST.get('density');
    densSel.addEventListener('change', function () {
      ST.set('density', densSel.value);
      FCM.App.render();
    });
    densRow.appendChild(densSel);
    gameBox.appendChild(densRow);
    wrap.appendChild(UI.card('Game', gameBox));

    // ---- Tag labels ----
    const tagBox = el('div');
    tagBox.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:10px',
      text: 'Name your colour tags however you like. They only recolour a player’s name.' }));
    FCM.TG.COLOURS.forEach(c => {
      const row = el('div', { class: 'setting-row', style: 'padding:7px 0' });
      row.appendChild(UI.tagDot(c.id, 'lg'));
      const inp = el('input', { type: 'text', value: FCM.TG.labelFor(c.id),
        maxlength: 20, style: 'flex:1' });
      inp.addEventListener('change', function () {
        FCM.TG.setLabel(c.id, inp.value);
        inp.value = FCM.TG.labelFor(c.id);
        UI.toast('Tag renamed');
      });
      row.appendChild(inp);
      tagBox.appendChild(row);
    });
    tagBox.appendChild(el('button', { class: 'btn btn-sm', style: 'margin-top:10px',
      text: 'Reset tag names', onclick: function () {
        FCM.TG.resetLabels(); UI.toast('Tag names reset'); FCM.App.render();
      } }));
    wrap.appendChild(UI.card('Player Tags', tagBox));

    // ---- Data ----
    const dataBox = el('div');
    dataBox.appendChild(el('div', { class: 'kv' }, [
      el('div', { class: 'k', text: 'Version' }),
      el('div', { class: 'v', text: FCM.VERSION + ' (' + FCM.BUILD + ')' }),
      el('div', { class: 'k', text: 'Save format' }),
      el('div', { class: 'v', text: String(FCM.SAVE_FORMAT) }),
      el('div', { class: 'k', text: 'Player data' }),
      el('div', { class: 'v', text: FCM.DATA_LABEL })
    ]));
    const acts = el('div', { class: 'row', style: 'gap:8px;margin-top:12px;flex-wrap:wrap' });
    acts.appendChild(el('button', { class: 'btn btn-sm', text: 'Reset settings',
      onclick: function () {
        UI.confirm('Reset all settings?', 'Themes and toggles go back to their defaults. ' +
          'Your career is not affected.', function () {
          ST.reset();
          UI.toast('Settings reset');
          FCM.App.render();
        }, 'Reset');
      } }));
    acts.appendChild(el('button', { class: 'btn btn-sm btn-danger', text: 'Delete autosave',
      onclick: function () {
        UI.confirm('Delete the autosave?',
          'This clears the rolling backup. Any save files you downloaded are untouched.',
          function () {
            FCM.IDB.clearAutosave();
            FCM.S.clear();
            UI.toast('Autosave cleared');
          }, 'Delete');
      } }));
    dataBox.appendChild(acts);
    wrap.appendChild(UI.card('About', dataBox));

    return wrap;
  };

  // =====================================================================
  // Sandbox control panel
  // =====================================================================
  SC.sandbox = function () {
    const s = S(), club = myClub();
    const wrap = el('div', { class: 'stack' });
    if (!FCM.D.isGod()) {
      wrap.appendChild(el('div', { class: 'empty',
        text: 'Sandbox tools are only available on Sandbox difficulty.' }));
      return wrap;
    }
    wrap.appendChild(el('div', { class: 'notice notice-god',
      text: 'God mode. Nothing here is validated — set what you like.' }));

    // Budgets
    const bud = el('div', { class: 'deal-grid' });
    function row(box, label, input, hint) {
      box.appendChild(el('label', { class: 'deal-lbl', text: label }));
      box.appendChild(input);
      box.appendChild(el('span', { class: 'deal-hint', text: hint || '' }));
    }
    const balIn = UI.moneyInput(club.balance);
    const tbIn = UI.moneyInput(club.transferBudget);
    const wbIn = UI.moneyInput(club.wageBudget);
    row(bud, 'Bank balance', balIn, 'Capped at ' + U.money(G().SANDBOX_BUDGET_CAP));
    row(bud, 'Transfer budget', tbIn, 'Drawn from the balance');
    row(bud, 'Wage budget /wk', wbIn, '');
    const budBox = el('div');
    budBox.appendChild(bud);
    budBox.appendChild(el('div', { class: 'tiny mute2', style: 'margin-top:8px',
      text: 'Every transfer fee comes out of the balance, so the two fall together. ' +
        'The transfer budget can never exceed what is in the bank.' }));
    budBox.appendChild(el('button', { class: 'btn btn-god', style: 'margin-top:10px',
      text: 'Apply', onclick: function () {
        G().sandbox.setBalance(UI.readMoney(balIn));
        G().sandbox.setBudget(UI.readMoney(tbIn));
        G().sandbox.setWageBudget(UI.readMoney(wbIn));
        UI.toast('Finances updated');
        FCM.App.render();
      } }));
    wrap.appendChild(UI.card('Money', budBox));

    // Quick actions
    const acts = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' });
    acts.appendChild(el('button', { class: 'btn', text: '💊 Heal & rest squad',
      onclick: function () { G().sandbox.healSquad(); UI.toast('Squad fully fit'); FCM.App.render(); } }));
    acts.appendChild(el('button', { class: 'btn', text: '💰 Top up to ' + U.money(G().SANDBOX_BUDGET_CAP),
      onclick: function () {
        G().sandbox.setBalance(G().SANDBOX_BUDGET_CAP);
        G().sandbox.setBudget(G().SANDBOX_BUDGET_CAP);
        UI.toast('Balance and budget restored to ' + U.money(G().SANDBOX_BUDGET_CAP));
        FCM.App.render();
      } }));
    acts.appendChild(el('button', { class: 'btn', text: '🏛 Board confidence 100%',
      onclick: function () { G().sandbox.setBoardConfidence(100); UI.toast('Board delighted'); FCM.App.render(); } }));
    wrap.appendChild(UI.card('Quick Actions', acts));

    // Force-sign any player
    const sign = el('div');
    const search = el('input', { type: 'text', placeholder: 'Search any player in the world…',
      style: 'width:100%' });
    const results = el('div', { class: 'pick-list', style: 'margin-top:10px' });
    function drawResults() {
      const q = search.value.toLowerCase().trim();
      results.innerHTML = '';
      if (q.length < 2) {
        results.appendChild(el('div', { class: 'tiny mute2', text: 'Type at least two characters.' }));
        return;
      }
      const list = FCM.DB.players.filter(p => p.clubId !== club.id &&
        (p.name.toLowerCase().indexOf(q) >= 0 || p.full.toLowerCase().indexOf(q) >= 0))
        .sort((a, b) => b.ovr - a.ovr).slice(0, 30);
      list.forEach(p => {
        const r = el('div', { class: 'pick-row' });
        r.appendChild(UI.posPill(p.pos[0]));
        const nm = el('div', { style: 'flex:1;min-width:0' });
        nm.appendChild(el('div', { text: p.full, style: 'font-weight:600' }));
        nm.appendChild(el('div', { class: 'tiny mute2',
          text: (FCM.DB.clubById[p.clubId] || {}).name || p.foreignClub || 'Free agent' }));
        r.appendChild(nm);
        r.appendChild(UI.rating(p.ovr));
        r.addEventListener('click', function () {
          G().sandbox.forceTransfer(p.id, club.id);
          UI.toast(p.full + ' signed for free');
          FCM.App.render();
        });
        results.appendChild(r);
      });
      if (!list.length) results.appendChild(el('div', { class: 'empty', text: 'No matches.' }));
    }
    search.addEventListener('input', drawResults);
    sign.appendChild(search);
    sign.appendChild(results);
    drawResults();
    wrap.appendChild(UI.card('Force Signing', sign,
      el('span', { class: 'tiny mute2', text: 'click a player to sign instantly' })));

    return wrap;
  };

  SC.clubProfile = function (club) {
    if (!club) return;
    const squad = FCM.DB.squadOf(club);
    const body = el('div');
    const kv = el('div', { class: 'kv', style: 'margin-bottom:14px' });
    [['League', (FCM.DB.leagueOf(club) || {}).name || '—'],
     ['Stadium', club.stadium + ' · ' + U.num(club.capacity)],
     ['Squad size', squad.length],
     ['Average rating', Math.round(U.mean(squad, p => p.ovr))],
     ['Transfer budget', U.money(club.transferBudget)],
     ['Reputation', Math.round(club.rep) + '/100']].forEach(([k, v]) => {
      kv.appendChild(el('div', { class: 'k', text: k }));
      kv.appendChild(el('div', { class: 'v', text: v }));
    });
    body.appendChild(kv);
    const cols = [
      { key: 'pos', label: 'Pos', nosort: true, render: p => UI.posPill(p.pos[0]) },
      { key: 'name', label: 'Name', render: p => UI.playerLink(p) },
      { key: 'age', label: 'Age', num: true },
      { key: 'ovr', label: 'OVR', num: true, render: p => UI.rating(p.ovr) },
      { key: 'value', label: 'Value', num: true, render: p => U.money(p.value) }
    ];
    body.appendChild(UI.table(cols, squad, { sortKey: 'ovr', sortDesc: true }));
    UI.modal(club.name, body, [el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal })],
      { badge: UI.badge(club, 'lg') });
  };

  /**
   * A national team at a glance: who they would call up, how strong that
   * makes them, and what they have won while you have been managing.
   */
  SC.nationProfile = function (nation) {
    const nat = FCM.NT.get(nation);
    if (!nat) return;
    const s = S();
    const squad = FCM.IN.callUpSquad(nation, 26) || [];
    const body = el('div');

    const confed = FCM.IN.CONFEDS[nat.confed] || {};
    const rank = FCM.NT.ranked().findIndex(n => n.name === nation) + 1;
    const kv = el('div', { class: 'kv', style: 'margin-bottom:14px' });
    const rows = [
      ['Confederation', confed.label || '—'],
      ['World ranking', rank ? '#' + rank : '—'],
      ['Squad rating', squad.length ? Math.round(FCM.IN.nationStrength(nation)) : '—'],
      ['Players eligible',
        FCM.DB.players.filter(p => p.nat === nation && !p.isYouth).length]
    ];
    if (s) {
      const cr = FCM.CR.ensure(s);
      if (cr.nation === nation) rows.push(['Manager', s.managerName + ' (you)']);
      // Everything this nation has won in your lifetime as a manager.
      const won = (s.internationals || []).filter(t => t.winner === nation);
      rows.push(['Tournaments won', won.length
        ? won.map(t => (t.short || t.name) + ' ' + t.year).join(', ') : 'None']);
    }
    rows.forEach(([k, v]) => {
      kv.appendChild(el('div', { class: 'k', text: k }));
      kv.appendChild(el('div', { class: 'v', text: v }));
    });
    body.appendChild(kv);

    if (!squad.length) {
      body.appendChild(el('div', { class: 'empty', text: 'No players available.' }));
    } else {
      const cols = [
        { key: 'pos', label: 'Pos', nosort: true, render: p => UI.posPill(p.pos[0]) },
        { key: 'name', label: 'Player', render: p => UI.playerLink(p) },
        { key: 'club', label: 'Club',
          sort: p => (FCM.DB.clubById[p.clubId] || {}).name || p.foreignClub || '',
          render: p => el('span', { class: 'small mute2',
            text: (FCM.DB.clubById[p.clubId] || {}).name || p.foreignClub || 'Free agent' }) },
        { key: 'age', label: 'Age', num: true },
        { key: 'ovr', label: 'OVR', num: true, render: p => UI.rating(p.ovr) }
      ];
      body.appendChild(UI.table(cols, squad, { sortKey: 'ovr', sortDesc: true }));
    }

    UI.modal(nation, body,
      [el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal })],
      { badge: UI.nationBadge(nation, 'lg') });
  };

  // =====================================================================
  // Match report
  // =====================================================================
  SC.matchReport = function (fixture) {
    const res = fixture.result;
    if (!res) return;
    const home = FCM.DB.clubById[fixture.home], away = FCM.DB.clubById[fixture.away];
    const body = el('div');

    const score = el('div', { class: 'mv-score' });
    [[home, res.homeGoals], [away, res.awayGoals]].forEach(([c, g], i) => {
      if (i === 1) score.appendChild(el('div', { class: 'mv-goals', text: res.homeGoals + ' – ' + res.awayGoals }));
      const side = el('div', { class: 'mv-team' });
      side.appendChild(UI.badge(c, 'lg'));
      side.appendChild(el('div', { text: c.name, style: 'font-weight:650' }));
      score.appendChild(side);
    });
    // Tint the report header with the competition's identity.
    score.style.background = 'linear-gradient(180deg,' + FCM.CT.tint(fixture.comp) + ', transparent)';
    score.style.borderTop = '3px solid ' + FCM.CT.accent(fixture.comp);
    score.style.borderRadius = '8px';
    body.appendChild(score);
    const metaRow = el('div', { class: 'mv-min', style: 'display:flex;justify-content:center;gap:7px;flex-wrap:wrap;align-items:center' });
    metaRow.appendChild(FCM.CT.pill(fixture.comp, fixture.compName));
    if (fixture.derby) metaRow.appendChild(el('span', { class: 'comp-pill derby-pill', text: '🔥 DERBY' }));
    metaRow.appendChild(el('span', { class: 'mute2', text: date(fixture.day) +
      (fixture.attendance ? ' · ' + U.num(fixture.attendance) + ' attendance' : '') }));
    body.appendChild(metaRow);

    // Events
    body.appendChild(el('div', { class: 'section-title', text: 'Match events' }));
    const feed = el('div', { class: 'mv-feed card' });
    if (!res.events.length) feed.appendChild(el('div', { class: 'empty', text: 'A goalless, uneventful affair.' }));
    res.events.forEach(e => {
      const row = el('div', { class: 'ev ' + e.type + (e.side === 'away' ? ' ev-away' : '') });
      row.appendChild(el('span', { class: 'ev-min', text: e.min + "'" }));
      let txt = '';
      if (e.type === 'goal') txt = '⚽ ' + e.playerName + (e.assistName ? '  (assist: ' + e.assistName + ')' : '') + '  ' + e.score;
      else if (e.type === 'yellow') txt = '🟨 ' + e.playerName;
      else if (e.type === 'red') txt = '🟥 ' + e.playerName + (e.second ? ' (second yellow)' : '');
      else if (e.type === 'sub') txt = '🔄 ' + e.onName + ' for ' + e.offName;
      row.appendChild(el('span', { text: txt }));
      feed.appendChild(row);
    });
    body.appendChild(feed);

    // Stats
    body.appendChild(el('div', { class: 'section-title', text: 'Statistics' }));
    const st = el('div', { class: 'mv-stats' });
    [['Possession', res.stats.possession, '%'], ['Shots', res.stats.shots, ''],
     ['On target', res.stats.onTarget, ''], ['Corners', res.stats.corners, ''],
     ['Fouls', res.stats.fouls, '']].forEach(([label, vals, suffix]) => {
      const row = el('div', { class: 'msrow' });
      row.appendChild(el('span', { text: vals[0] + suffix }));
      const mid = el('div');
      mid.appendChild(el('div', { class: 'mslabel', text: label }));
      const bar = el('div', { class: 'msbar' });
      const tot = (vals[0] + vals[1]) || 1;
      bar.appendChild(el('i', { style: 'width:' + (vals[0] / tot * 100) + '%' }));
      bar.appendChild(el('i', { style: 'width:' + (vals[1] / tot * 100) + '%' }));
      mid.appendChild(bar);
      row.appendChild(mid);
      row.appendChild(el('span', { class: 'right', text: vals[1] + suffix }));
      st.appendChild(row);
    });
    body.appendChild(st);

    // Ratings
    body.appendChild(el('div', { class: 'section-title', text: 'Player ratings' }));
    const rt = el('div', { class: 'grid g-2' });
    [[home, res.homeRatings], [away, res.awayRatings]].forEach(([c, ratings]) => {
      const box = el('div');
      box.appendChild(el('div', { class: 'small muted', style: 'margin-bottom:6px', text: c.name }));
      U.sortBy(ratings, r => r.rating, true).forEach(r => {
        const row = el('div', { class: 'row-between', style: 'padding:3px 0;font-size:12.5px' });
        const nm = el('span', { text: r.name + (r.goals ? ' ⚽'.repeat(Math.min(r.goals, 3)) : '') });
        if (r.id === res.motm) nm.textContent = '★ ' + nm.textContent;
        row.appendChild(nm);
        row.appendChild(UI.formRating(r.rating));
        box.appendChild(row);
      });
      rt.appendChild(box);
    });
    body.appendChild(rt);

    UI.modal(home.name + ' ' + res.homeGoals + '–' + res.awayGoals + ' ' + away.name, body,
      [el('button', { class: 'btn btn-primary', text: 'Close', onclick: UI.closeModal })]);
  };

  FCM.SC = SC;
})(window.FCM = window.FCM || {});
