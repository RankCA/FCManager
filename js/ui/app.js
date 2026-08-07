/* Bootstrap, start screen, navigation and the day-advance loop. */
(function (FCM) {
  'use strict';

  const U = FCM.U, G = FCM.G, S = FCM.S, UI = FCM.UI, SC = FCM.SC, T = FCM.T;
  const App = { tab: 'dashboard' };

  // Nine tabs, each with its own sub-navigation where needed. Fixtures now
  // live inside Calendar, tables inside Competitions, and the academy
  // inside Club.
  const TABS = [
    { id: 'dashboard', label: 'Home', render: () => SC.dashboard() },
    { id: 'squad', label: 'Squad', render: () => SC.squad() },
    { id: 'tactics', label: 'Tactics', render: () => SC.tactics() },
    { id: 'calendar', label: 'Schedule', render: () => SC.schedule() },
    { id: 'comps', label: 'Competitions', render: () => SC.competitionsHub() },
    { visible: () => !FCM.G.isNationalOnly(), id: 'transfers', label: 'Transfers', render: () => SC.transfers() },
    { visible: () => !FCM.G.isNationalOnly(), id: 'club', label: 'Club', render: () => SC.club() },
    { id: 'career', label: 'Career', render: () => SC.career() },
    { visible: () => !FCM.G.isNationalOnly(), id: 'finances', label: 'Finances', render: () => SC.finances() },
    { id: 'sandbox', label: '⚡', render: () => SC.sandbox(),
      visible: () => FCM.D.isGod() },
    { id: 'settings', label: '⚙', render: () => SC.settings() }
  ];

  // =====================================================================
  // Boot
  // =====================================================================
  function boot() {
    FCM.ST.init();
    FCM.LV.lastSpeed = FCM.ST.get('matchSpeed');
    const msg = document.getElementById('boot-msg');
    const bar = document.getElementById('boot-bar-fill');
    let step = 0;
    const steps = ['Loading player database…', 'Building clubs and leagues…', 'Preparing your career…'];
    function advance() {
      msg.textContent = steps[Math.min(step, steps.length - 1)];
      bar.style.width = (25 + step * 30) + '%';
      step++;
    }
    advance();

    setTimeout(function () {
      advance();
      // The static DB has to exist before the start screen can list clubs.
      FCM.DB.build(new FCM.RNG(1), 2025);
      setTimeout(function () {
        advance();
        bar.style.width = '100%';
        setTimeout(showStart, 220);
      }, 30);
    }, 60);
  }

  // =====================================================================
  // Start screen
  // =====================================================================
  function showStart() {
    document.getElementById('boot').classList.add('hidden');
    document.getElementById('start').classList.remove('hidden');

    const countrySel = document.getElementById('sel-country');
    const leagueSel = document.getElementById('sel-league');
    const clubSel = document.getElementById('sel-club');
    const preview = document.getElementById('club-preview');
    const nameIn = document.getElementById('mgr-name');

    const countries = [];
    FCM.DB.leagues.forEach(l => { if (countries.indexOf(l.country) < 0) countries.push(l.country); });
    countries.sort();
    countries.forEach(c => countrySel.appendChild(U.el('option', { value: c, text: c })));
    countrySel.value = 'England';

    function fillLeagues() {
      leagueSel.innerHTML = '';
      FCM.DB.leagues
        .filter(l => l.country === countrySel.value)
        .sort((a, b) => a.tier - b.tier)
        .forEach(l => leagueSel.appendChild(U.el('option', { value: l.id, text: l.name })));
      fillClubs();
    }
    function fillClubs() {
      clubSel.innerHTML = '';
      const clubs = U.sortBy(FCM.DB.clubsInLeague(Number(leagueSel.value)), c => c.rep, true);
      clubs.forEach(c => clubSel.appendChild(U.el('option', { value: c.id, text: c.name })));
      showPreview();
    }
    function showPreview() {
      const club = FCM.DB.clubById[Number(clubSel.value)];
      preview.innerHTML = '';
      if (!club) return;
      const squad = FCM.DB.squadOf(club);
      const row = U.el('div', { class: 'row', style: 'gap:13px' });
      row.appendChild(UI.badge(club, 'lg'));
      const info = U.el('div', { style: 'flex:1' });
      info.appendChild(U.el('div', { text: club.name, style: 'font-weight:700;font-size:15px' }));
      info.appendChild(U.el('div', { class: 'small muted',
        text: club.stadium + ' · ' + U.num(club.capacity) + ' capacity' }));
      const stats = U.el('div', { class: 'row small', style: 'gap:14px;margin-top:5px' });
      stats.appendChild(U.el('span', { html: 'Squad <b>' + squad.length + '</b>' }));
      stats.appendChild(U.el('span', { html: 'Avg <b>' + Math.round(U.mean(squad, p => p.ovr)) + '</b>' }));
      stats.appendChild(U.el('span', { html: 'Budget <b>' + U.money(club.transferBudget) + '</b>' }));
      info.appendChild(stats);
      row.appendChild(info);
      // A rough difficulty read from where the club sits in its league.
      const peers = U.sortBy(FCM.DB.clubsInLeague(club.league), c => c.rep, true);
      const rank = peers.findIndex(c => c.id === club.id) + 1;
      const pct = rank / peers.length;
      const diff = pct <= 0.15 ? ['Comfortable', 'pill-good'] :
        (pct <= 0.5 ? ['Balanced', 'pill-pos'] : (pct <= 0.8 ? ['Challenging', 'pill-warn'] : ['Hard', 'pill-bad']));
      row.appendChild(U.el('span', { class: 'pill ' + diff[1], text: diff[0] }));
      preview.appendChild(row);
    }

    countrySel.addEventListener('change', fillLeagues);
    leagueSel.addEventListener('change', fillClubs);
    clubSel.addEventListener('change', showPreview);
    fillLeagues();

    // ---- National-team-only career ----
    const natChk = document.getElementById('chk-national');
    const natFld = document.getElementById('fld-nation');
    const natSel = document.getElementById('sel-nation');
    if (natChk && natSel) {
      // Strongest first: nobody's first save is Turks and Caicos.
      FCM.NT.ranked().forEach(n => natSel.appendChild(
        U.el('option', { value: n.name, text: n.name })));
      natSel.value = 'England';
      function syncNational() {
        const on = natChk.checked;
        natFld.classList.toggle('hidden', !on);
        // The club pickers are meaningless without a club.
        [countrySel, leagueSel, clubSel].forEach(x => {
          x.disabled = on;
          if (x.parentElement) x.parentElement.classList.toggle('dim-fld', on);
        });
        preview.classList.toggle('hidden', on);
      }
      natChk.addEventListener('change', syncNational);
      syncNational();
    }

    // ---- Difficulty ----
    const diffBox = document.getElementById('diff-picker');
    const diffBlurb = document.getElementById('diff-blurb');
    App.difficulty = 'normal';
    function drawDifficulty() {
      diffBox.innerHTML = '';
      FCM.D.ORDER.forEach(id => {
        const lv = FCM.D.LEVELS[id];
        const b = U.el('button', {
          class: 'diff-btn diff-' + lv.tint + (App.difficulty === id ? ' active' : ''),
          text: lv.label, type: 'button'
        });
        b.addEventListener('click', function () {
          App.difficulty = id;
          drawDifficulty();
        });
        diffBox.appendChild(b);
      });
      diffBlurb.textContent = FCM.D.LEVELS[App.difficulty].blurb;
    }
    drawDifficulty();

    // Version line.
    const vEl = document.getElementById('start-version');
    if (vEl) vEl.textContent = FCM.versionLong();

    // Load a downloaded save file.
    const fileBtn = document.getElementById('btn-loadfile');
    const fileInput = document.getElementById('file-input');
    if (fileBtn && fileInput) {
      fileBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', async function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        fileBtn.disabled = true;
        fileBtn.textContent = 'Loading…';
        try {
          await S.loadFile(file);
          startApp();
        } catch (err) {
          UI.toast(err.message, 'bad', 6000);
          fileBtn.disabled = false;
          fileBtn.textContent = '📂 Load save file…';
        }
        fileInput.value = '';
      });
    }

    // Continue an existing save.
    // An IndexedDB autosave is the freshest and most reliable option, so it
    // takes precedence over anything in localStorage.
    FCM.IDB.autosaveMeta().then(function (auto) {
      if (!auto) return;
      const box2 = document.getElementById('start-continue');
      const btn2 = document.getElementById('btn-continue');
      const det = document.getElementById('cont-detail');
      box2.classList.remove('hidden');
      const when = new Date(auto.saved);
      det.textContent = auto.manager + ' · ' + auto.club + ' · ' +
        auto.season + '/' + String(auto.season + 1).slice(2) +
        ' — autosaved ' + when.toLocaleDateString() + ' ' +
        String(when.getHours()).padStart(2, '0') + ':' + String(when.getMinutes()).padStart(2, '0');
      btn2.textContent = 'Continue';
      const fresh = btn2.cloneNode(true);
      btn2.parentNode.replaceChild(fresh, btn2);
      fresh.addEventListener('click', async function () {
        fresh.disabled = true; fresh.textContent = 'Loading…';
        try { await FCM.IDB.loadAutosave(); startApp(); }
        catch (err) {
          UI.toast('Could not load autosave: ' + err.message, 'bad', 5000);
          fresh.disabled = false; fresh.textContent = 'Continue';
        }
      });
    });

    const meta = S.meta();
    const box = document.getElementById('start-continue');
    const contBtn = document.getElementById('btn-continue');
    if (meta) {
      const label = meta.manager + ' · ' + meta.club + ' · ' +
        meta.season + '/' + String(meta.season + 1).slice(2);
      box.classList.remove('hidden');
      if (S.exists()) {
        document.getElementById('cont-detail').textContent = label;
        contBtn.addEventListener('click', function () {
          try { S.load(); startApp(); }
          catch (err) { UI.toast('Could not load save: ' + err.message, 'bad', 5000); }
        });
      } else {
        // The last save went to a file, so there is nothing to continue from
        // in browser storage - point them at the file picker.
        document.getElementById('cont-detail').textContent = label + ' — saved to file';
        contBtn.textContent = 'Load file';
        contBtn.addEventListener('click', function () { fileInput.click(); });
      }
    }

    document.getElementById('btn-start').addEventListener('click', function () {
      const clubId = Number(clubSel.value);
      const manager = nameIn.value.trim() || 'The Gaffer';
      const nationalOnly = natChk && natChk.checked;
      G.newGame({ clubId: clubId, managerName: manager, startYear: 2025,
        difficulty: App.difficulty,
        nationalOnly: nationalOnly,
        nation: nationalOnly ? natSel.value : null });
      startApp();
    });
  }

  // =====================================================================
  // App shell
  // =====================================================================
  function startApp() {
    document.getElementById('start').classList.add('hidden');
    document.getElementById('boot').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    function simToNext() {
      const next = G.nextUserFixture();
      if (next) SC.simTo(next.day);
      else UI.toast('No upcoming fixtures.', 'warn');
    }
    // The header buttons and the phone action bar drive the same three things.
    function bind(id, fn) {
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', fn);
    }
    bind('btn-advance', advance);
    bind('m-advance', advance);
    bind('btn-simnext', simToNext);
    bind('m-simnext', simToNext);
    bind('btn-save', App.saveMenu);
    bind('m-save', App.saveMenu);

    const chip = document.getElementById('version-chip');
    if (chip) { chip.textContent = FCM.versionString(); chip.title = FCM.versionLong(); }

    App.renderTabs();
    App.render();
    setAutosaveState('', 'Autosave on');
    App.autosave(true);
    // Last-chance write if the tab is closed.
    window.addEventListener('beforeunload', function () {
      if (autosaveDirty && FCM.IDB.supported()) FCM.IDB.autosave();
    });
  }

  App.renderTabs = function () {
    const nav = document.getElementById('tabs');
    nav.innerHTML = '';
    TABS.forEach(t => {
      if (t.visible && !t.visible()) return;
      const b = U.el('div', { class: 'tab' + (t.id === App.tab ? ' active' : ''), text: t.label });
      if (t.id === 'dashboard' && G.state.unreadCount > 0) {
        b.appendChild(U.el('span', { class: 'pip', text: G.state.unreadCount > 99 ? '99+' : G.state.unreadCount }));
      }
      b.addEventListener('click', function () { App.tab = t.id; App.renderTabs(); App.render(); });
      nav.appendChild(b);
    });
  };
  App.refreshTabs = function () { App.renderTabs(); };

  App.render = function () {
    const s = G.state;
    const club = FCM.DB.clubById[s.userClubId];
    const league = club ? FCM.DB.leagueOf(club) : null;
    // A national-team-only manager has no club, so the header carries the
    // nation instead.
    const nation = !club ? (s.career && s.career.nation) : null;

    const badgeBox = document.getElementById('tb-badge');
    badgeBox.innerHTML = '';
    badgeBox.replaceWith((function () {
      const b = club ? UI.badge(club, 'sm') : UI.nationBadge(nation, 'sm');
      b.id = 'tb-badge';
      return b;
    })());

    document.getElementById('tb-clubname').textContent = club ? club.name : (nation || '—');
    document.getElementById('tb-league').textContent = club
      ? (league ? league.name : '')
      : 'National team';
    document.getElementById('tb-day').textContent = U.fmtDate(s.season, s.day);
    document.getElementById('tb-season').textContent =
      'Season ' + s.season + '/' + String(s.season + 1).slice(2);

    const view = document.getElementById('view');
    view.innerHTML = '';
    const tab = TABS.find(t => t.id === App.tab) || TABS[0];
    try {
      view.appendChild(tab.render());
    } catch (err) {
      view.appendChild(U.el('div', { class: 'empty', text: 'Screen error: ' + err.message }));
      console.error(err);
    }
    App.renderTabs();
    App.touch();
  };

  // =====================================================================
  // Advance
  // =====================================================================
  let advancing = false;
  function advance() {
    if (advancing) return;
    advancing = true;
    const btn = document.getElementById('btn-advance');
    btn.disabled = true;

    // Roll forward until something needs the manager's attention: a match,
    // fresh news, or a hard stop like the end of the season.
    let guard = 0;
    let userMatch = null;
    let newSeason = false;
    const before = G.state.inbox.length;
    const watch = FCM.ST.get('liveMatches') !== false;

    do {
      const r = G.advanceDay({ liveForUser: watch });
      // A live match pauses the day until the user has watched it.
      if (r.liveMatch) {
        App.render();
        btn.disabled = false;
        advancing = false;
        FCM.LV.open(r.liveMatch, r.liveFixture, function () {
          const done = G.commitLiveMatch(r.liveMatch);
          App.render();
          if (G.state.sacked) { App.showSacked(); return; }
          if (done && done.newSeason) UI.toast('A new season begins!', '', 4000);
        });
        return;
      }
      if (r.userMatch) userMatch = r.userMatch;
      if (r.newSeason) newSeason = true;
      guard++;
    } while (!userMatch && !newSeason && guard < 7 && G.state.inbox.length === before);

    App.render();
    btn.disabled = false;
    advancing = false;

    if (G.state.sacked) { App.showSacked(); return; }
    if (userMatch) {
      SC.matchReport(userMatch.fixture);
    } else if (newSeason) {
      UI.toast('A new season begins!', '', 4000);
    }
  }

  // ---- Autosave -------------------------------------------------------
  let autosaveTimer = null;
  let autosaveDirty = false;

  function setAutosaveState(state, text) {
    const dot = document.getElementById('autosave-dot');
    const label = document.getElementById('autosave-text');
    if (!dot || !label) return;
    dot.className = 'autosave-dot ' + (state || '');
    label.textContent = text;
  }

  /** Write to IndexedDB, which has far more room than localStorage. */
  App.autosave = async function (force) {
    if (!FCM.ST.get('autosave')) { setAutosaveState('', 'Autosave off'); return; }
    if (!FCM.IDB.supported()) { setAutosaveState('failed', 'No autosave'); return; }
    if (!autosaveDirty && !force) return;
    setAutosaveState('saving', 'Saving…');
    try {
      await FCM.IDB.autosave();
      autosaveDirty = false;
      const t = new Date();
      setAutosaveState('saved', 'Saved ' +
        String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'));
    } catch (err) {
      setAutosaveState('failed', 'Autosave failed');
      console.warn('Autosave failed', err);
    }
  };

  /** Mark state as changed; the debounce avoids writing on every click. */
  App.touch = function () {
    autosaveDirty = true;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () { App.autosave(); }, 2500);
  };

  /** Save dialog: download a file, or quick-save to the browser. */
  App.saveMenu = function () {
    const body = U.el('div');
    const status = U.el('div', { class: 'small', style: 'min-height:38px;margin-top:12px' });

    body.appendChild(U.el('p', { style: 'margin:0 0 14px;line-height:1.6',
      text: 'Downloading a save file is the reliable option — long careers grow ' +
        'past what browser storage allows.' }));

    const dl = U.el('button', { class: 'btn btn-primary', style: 'width:100%',
      text: '💾  Download save file' });
    dl.addEventListener('click', async function () {
      dl.disabled = true;
      status.style.color = 'var(--text-dim)';
      status.textContent = 'Preparing…';
      try {
        const r = await S.download();
        status.style.color = 'var(--accent)';
        status.textContent = 'Saved ' + r.name + ' — ' + Math.round(r.size / 1024) + ' KB' +
          (r.gz ? ' (compressed from ' + Math.round(r.raw / 1024) + ' KB)' : '');
        UI.toast('Save file downloaded');
      } catch (err) {
        status.style.color = 'var(--red)';
        status.textContent = 'Could not create the file: ' + err.message;
      }
      dl.disabled = false;
    });
    body.appendChild(dl);

    const quick = U.el('button', { class: 'btn', style: 'width:100%;margin-top:8px',
      text: '⚡  Quick save to browser' });
    quick.addEventListener('click', function () {
      const r = S.save();
      if (r.ok) {
        status.style.color = 'var(--accent)';
        status.textContent = 'Quick saved (' + Math.round(r.size / 1024) + ' KB).';
        UI.toast('Game saved');
      } else if (r.quota) {
        status.style.color = 'var(--gold)';
        status.textContent = 'Too big for browser storage (' +
          Math.round(r.size / 1024 / 1024 * 10) / 10 + ' MB, limit is about 5 MB). ' +
          'Download a save file instead.';
      } else {
        status.style.color = 'var(--red)';
        status.textContent = 'Save failed: ' + r.error;
      }
    });
    body.appendChild(quick);
    body.appendChild(status);
    body.appendChild(U.el('div', { class: 'tiny mute2', style: 'margin-top:6px',
      text: 'Load a downloaded save from the start screen.' }));

    UI.modal('Save game', body,
      [U.el('button', { class: 'btn', text: 'Close', onclick: UI.closeModal })]);
  };

  /** End-of-career screen when the board pulls the trigger. */
  App.showSacked = function () {
    const s = G.state;
    const club = FCM.DB.clubById[s.userClubId];
    const body = U.el('div');
    body.appendChild(U.el('p', { style: 'margin:0 0 14px;line-height:1.65',
      text: club.name + ' have relieved you of your duties. Board confidence had fallen to ' +
        Math.round(s.board.confidence) + '%.' }));
    const kv = U.el('div', { class: 'kv' });
    [['Club', club.name],
     ['Difficulty', FCM.D.get(s.difficulty).label],
     ['Days in the job', s.daysInJob],
     ['Trophies won', s.trophyCount || 0],
     ['Seasons', (s.seasonHistory || []).length || 1]].forEach(([k, v]) => {
      kv.appendChild(U.el('div', { class: 'k', text: k }));
      kv.appendChild(U.el('div', { class: 'v', text: v }));
    });
    body.appendChild(kv);
    if ((s.seasonHistory || []).length) {
      body.appendChild(U.el('div', { class: 'section-title', text: 'Season by season' }));
      s.seasonHistory.forEach(h => {
        body.appendChild(U.el('div', { class: 'row-between small', style: 'padding:3px 0' }, [
          U.el('span', { text: h.season + '/' + String(h.season + 1).slice(2) }),
          U.el('span', { text: U.ordinal(h.position) + ' (target ' + U.ordinal(h.target || 0) + ')' })
        ]));
      });
    }
    UI.modal('You have been sacked', body, [
      U.el('button', { class: 'btn btn-primary', text: 'Start a new career',
        onclick: function () { FCM.S.clear(); location.reload(); } })
    ]);
  };

  // ---- Keyboard shortcuts ---------------------------------------------
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { UI.closeModal(); return; }
    if (document.getElementById('app').classList.contains('hidden')) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    const modalOpen = !document.getElementById('modal').classList.contains('hidden');

    if (e.code === 'Space') {
      e.preventDefault();
      if (!modalOpen) advance();
      return;
    }
    if (modalOpen) return;

    if (e.key === '/') { e.preventDefault(); SC.globalSearch(); return; }
    if (e.key === '?') { e.preventDefault(); SC.shortcuts(); return; }
    if (e.key === 's' || e.key === 'S') {
      const next = G.nextUserFixture();
      if (next) SC.simTo(next.day);
      return;
    }
    // Number keys jump straight to a tab.
    if (/^[1-9]$/.test(e.key)) {
      const visible = TABS.filter(t => !t.visible || t.visible());
      const t = visible[Number(e.key) - 1];
      if (t) { App.tab = t.id; App.render(); }
    }
  });

  FCM.App = App;
  window.addEventListener('DOMContentLoaded', boot);
})(window.FCM = window.FCM || {});
