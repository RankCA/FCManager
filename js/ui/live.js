/* Live match view: watch it unfold, with in-match management. */
(function (FCM) {
  'use strict';

  const U = FCM.U, P = FCM.P, T = FCM.T, UI = FCM.UI;
  const LV = {};

  const SPEEDS = [
    { id: 'slow', label: 'Slow', ms: 620 },
    { id: 'normal', label: 'Normal', ms: 300 },
    { id: 'fast', label: 'Fast', ms: 110 },
    { id: 'turbo', label: 'Turbo', ms: 25 }
  ];

  function el(t, a, c) { return U.el(t, a, c); }

  /**
   * Open the live match overlay and drive it to the whistle.
   * onFinish is called once the user closes the full-time screen.
   */
  LV.open = function (live, fixture, onFinish) {
    const s = FCM.G.state;
    const home = live.homeClub, away = live.awayClub;
    const userIsHome = home.id === s.userClubId;
    const mySide = userIsHome ? live.H : live.A;

    let timer = null;
    let paused = false;
    let speed = LV.lastSpeed || 'normal';

    const box = document.getElementById('modal-box');
    const wrap = document.getElementById('modal');
    box.innerHTML = '';
    box.classList.add('live-box');
    wrap.classList.remove('hidden');
    wrap.querySelector('.modal-back').onclick = null;  // no accidental dismissal

    // ---- Header: score + clock ----
    const head = el('div', { class: 'live-head' });
    const hSide = el('div', { class: 'live-team' });
    hSide.appendChild(UI.badge(home, 'lg'));
    hSide.appendChild(el('div', { text: home.name, class: 'live-team-name' }));
    const aSide = el('div', { class: 'live-team' });
    aSide.appendChild(UI.badge(away, 'lg'));
    aSide.appendChild(el('div', { text: away.name, class: 'live-team-name' }));

    const scoreBox = el('div', { class: 'live-score-box' });
    const scoreEl = el('div', { class: 'live-score', text: '0 – 0' });
    const clockEl = el('div', { class: 'live-clock', text: "0'" });
    scoreBox.appendChild(scoreEl);
    scoreBox.appendChild(clockEl);
    head.appendChild(hSide);
    head.appendChild(scoreBox);
    head.appendChild(aSide);
    box.appendChild(head);

    // Competition strip, coloured to the tournament's identity.
    const theme = FCM.CT.forComp(fixture.comp);
    head.style.background = 'linear-gradient(180deg,' + theme.tint + ', var(--panel))';
    head.style.borderTop = '3px solid ' + theme.accent;
    const strip = el('div', { class: 'live-strip' });
    strip.appendChild(FCM.CT.pill(fixture.comp, fixture.compName));
    if (fixture.derby) strip.appendChild(el('span', { class: 'comp-pill derby-pill', text: '🔥 DERBY' }));
    strip.appendChild(el('span', { style: 'margin-left:6px', text: live.venue }));
    box.appendChild(strip);

    // ---- Momentum bar ----
    const momWrap = el('div', { class: 'momentum' });
    const momFill = el('i', { class: 'momentum-fill' });
    momWrap.appendChild(momFill);
    box.appendChild(momWrap);

    // ---- Body: commentary + side panel ----
    const body = el('div', { class: 'live-body' });
    const feed = el('div', { class: 'live-feed' });
    const panel = el('div', { class: 'live-panel' });
    body.appendChild(feed);
    body.appendChild(panel);
    box.appendChild(body);

    // Stats block
    const statsBox = el('div', { class: 'live-stats' });
    panel.appendChild(el('div', { class: 'live-panel-title', text: 'Match stats' }));
    panel.appendChild(statsBox);

    // Your XI with live ratings and stamina
    panel.appendChild(el('div', { class: 'live-panel-title', text: 'Your team' }));
    const xiBox = el('div', { class: 'live-xi' });
    panel.appendChild(xiBox);

    // ---- Controls ----
    const foot = el('div', { class: 'live-foot' });
    const pauseBtn = el('button', { class: 'btn btn-sm', text: '⏸ Pause' });
    const speedSel = el('select', { class: 'live-speed' });
    SPEEDS.forEach(sp => speedSel.appendChild(el('option', { value: sp.id, text: sp.label })));
    speedSel.value = speed;
    const subBtn = el('button', { class: 'btn btn-sm', text: '🔄 Substitute' });
    const tacBtn = el('button', { class: 'btn btn-sm', text: '📋 Tactics' });
    const skipBtn = el('button', { class: 'btn btn-sm', text: '⏭ Skip to end' });
    foot.appendChild(pauseBtn);
    foot.appendChild(speedSel);
    foot.appendChild(el('span', { class: 'spacer' }));
    foot.appendChild(subBtn);
    foot.appendChild(tacBtn);
    foot.appendChild(skipBtn);
    box.appendChild(foot);

    let lastCommentaryLen = 0;

    function renderFeed() {
      for (let i = lastCommentaryLen; i < live.commentary.length; i++) {
        const c = live.commentary[i];
        const row = el('div', { class: 'live-ev live-ev-' + c.kind +
          (c.side ? ' side-' + c.side : '') });
        row.appendChild(el('span', { class: 'live-min', text: c.min + "'" }));
        row.appendChild(el('span', { class: 'live-txt', text: c.text }));
        feed.appendChild(row);
      }
      lastCommentaryLen = live.commentary.length;
      feed.scrollTop = feed.scrollHeight;
    }

    function renderStats() {
      const t = live.hR.mid + live.aR.mid;
      const hPoss = t > 0 ? Math.round((live.hR.mid / t) * 100) : 50;
      const rows = [
        ['Possession', hPoss + '%', (100 - hPoss) + '%', hPoss, 100 - hPoss],
        ['Shots', live.H.shots, live.A.shots, live.H.shots, live.A.shots],
        ['On target', live.H.onTarget, live.A.onTarget, live.H.onTarget, live.A.onTarget],
        ['Corners', live.H.corners, live.A.corners, live.H.corners, live.A.corners],
        ['Fouls', live.H.fouls, live.A.fouls, live.H.fouls, live.A.fouls]
      ];
      statsBox.innerHTML = '';
      rows.forEach(([label, lv, rv, ln, rn]) => {
        const r = el('div', { class: 'msrow' });
        r.appendChild(el('span', { text: lv }));
        const mid = el('div');
        mid.appendChild(el('div', { class: 'mslabel', text: label }));
        const bar = el('div', { class: 'msbar' });
        const tot = (ln + rn) || 1;
        bar.appendChild(el('i', { style: 'width:' + (ln / tot * 100) + '%' }));
        bar.appendChild(el('i', { style: 'width:' + (rn / tot * 100) + '%' }));
        mid.appendChild(bar);
        r.appendChild(mid);
        r.appendChild(el('span', { class: 'right', text: rv }));
        statsBox.appendChild(r);
      });
    }

    function renderXI() {
      xiBox.innerHTML = '';
      U.sortBy(mySide.onPitch, x => x.slot.y, true).forEach(x => {
        const row = el('div', { class: 'live-xi-row' });
        row.appendChild(el('span', { class: 'pill pill-pos live-xi-pos', text: x.slot.pos }));
        row.appendChild(el('span', { class: 'live-xi-name', text: x.p.name }));
        if (x.goals) row.appendChild(el('span', { class: 'live-xi-g', text: '⚽'.repeat(Math.min(x.goals, 3)) }));
        if (x.booked) row.appendChild(el('span', { class: 'live-xi-card' }));
        const stam = el('div', { class: 'live-stam' });
        stam.appendChild(el('i', { style: 'width:' + U.clamp(x.stamina, 0, 100) + '%' +
          (x.stamina < 45 ? ';background:var(--red)' : (x.stamina < 65 ? ';background:var(--gold)' : '')) }));
        row.appendChild(stam);
        xiBox.appendChild(row);
      });
    }

    function renderHead() {
      scoreEl.textContent = live.H.goals + ' – ' + live.A.goals;
      clockEl.textContent = Math.min(live.minute, live.totalMinutes) + "'";
      const pct = (live.momentum + 100) / 2;
      momFill.style.width = pct + '%';
      momWrap.title = 'Momentum';
    }

    function renderAll() {
      renderHead(); renderFeed(); renderStats(); renderXI();
    }

    // ---- Loop ----
    function tickOnce() {
      if (live.done) { finish(); return; }
      const beforeGoals = live.H.goals + live.A.goals;
      live.step();
      renderAll();
      // A goal always pauses briefly for effect.
      if (live.H.goals + live.A.goals > beforeGoals) {
        flashGoal(live.events[live.events.length - 1]);
      }
      if (live.done) finish();
    }

    function schedule() {
      clearTimeout(timer);
      if (paused || live.done) return;
      const ms = (SPEEDS.find(x => x.id === speed) || SPEEDS[1]).ms;
      timer = setTimeout(function () { tickOnce(); schedule(); }, ms);
    }

    function flashGoal(ev) {
      if (!ev || ev.type !== 'goal') return;
      const isUs = (ev.side === 'home') === userIsHome;
      const f = el('div', { class: 'goal-flash ' + (isUs ? 'ours' : 'theirs') });
      f.appendChild(el('div', { class: 'goal-flash-word', text: 'GOAL!' }));
      f.appendChild(el('div', { class: 'goal-flash-who', text: ev.playerName }));
      box.appendChild(f);
      setTimeout(function () { f.classList.add('out'); }, 700);
      setTimeout(function () { f.remove(); }, 1100);
    }

    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
      if (!paused) schedule();
    });
    speedSel.addEventListener('change', function () {
      speed = speedSel.value; LV.lastSpeed = speed;
      schedule();
    });
    skipBtn.addEventListener('click', function () {
      clearTimeout(timer);
      live.runToEnd();
      renderAll();
      finish();
    });

    // ---- In-match substitution ----
    subBtn.addEventListener('click', function () {
      const wasPaused = paused;
      paused = true; clearTimeout(timer);
      pauseBtn.textContent = '▶ Resume';

      if (mySide.subsUsed >= 5) {
        UI.toast('You have used all five substitutions.', 'warn');
        if (!wasPaused) { paused = false; pauseBtn.textContent = '⏸ Pause'; schedule(); }
        return;
      }
      const sub = el('div');
      sub.appendChild(el('div', { class: 'tiny mute2', style: 'margin-bottom:8px',
        text: 'Substitutions used: ' + mySide.subsUsed + ' of 5' }));
      const offBox = el('div', { class: 'pick-list', style: 'max-height:180px' });
      const onBox = el('div', { class: 'pick-list', style: 'max-height:180px' });
      let chosenOff = null;

      function drawOff() {
        offBox.innerHTML = '';
        U.sortBy(mySide.onPitch, x => x.stamina).forEach(x => {
          const r = el('div', { class: 'pick-row' + (chosenOff === x ? ' chosen' : '') });
          r.appendChild(el('span', { class: 'pill pill-pos', text: x.slot.pos }));
          r.appendChild(el('span', { text: x.p.name, style: 'flex:1' }));
          r.appendChild(el('span', { class: 'tiny muted', text: Math.round(x.stamina) + '%' }));
          r.appendChild(UI.formRating(x.rating));
          r.addEventListener('click', function () { chosenOff = x; drawOff(); });
          offBox.appendChild(r);
        });
      }
      function drawOn() {
        onBox.innerHTML = '';
        if (!mySide.bench.length) {
          onBox.appendChild(el('div', { class: 'empty', text: 'Bench is empty.' }));
          return;
        }
        mySide.bench.forEach(p => {
          const r = el('div', { class: 'pick-row' });
          r.appendChild(el('span', { class: 'pill pill-pos', text: p.pos[0] }));
          r.appendChild(el('span', { text: p.name, style: 'flex:1' }));
          r.appendChild(el('span', { class: 'tiny muted', text: Math.round(p.fitness) + '%' }));
          r.appendChild(UI.rating(p.ovr));
          r.addEventListener('click', function () {
            if (!chosenOff) { UI.toast('Pick who comes off first.', 'warn'); return; }
            if (live.substitute(chosenOff.p.id, p.id)) {
              UI.closeModalKeepLive();
              renderAll();
              UI.toast(p.name + ' comes on for ' + chosenOff.p.name);
              if (!wasPaused) { paused = false; pauseBtn.textContent = '⏸ Pause'; schedule(); }
            }
          });
          onBox.appendChild(r);
        });
      }
      drawOff(); drawOn();
      sub.appendChild(el('div', { class: 'section-title', text: 'Coming off' }));
      sub.appendChild(offBox);
      sub.appendChild(el('div', { class: 'section-title', text: 'Coming on' }));
      sub.appendChild(onBox);
      LV.subModal(sub, function () {
        if (!wasPaused) { paused = false; pauseBtn.textContent = '⏸ Pause'; schedule(); }
      });
    });

    // ---- In-match tactical change ----
    tacBtn.addEventListener('click', function () {
      const wasPaused = paused;
      paused = true; clearTimeout(timer);
      pauseBtn.textContent = '▶ Resume';
      const t = mySide.tactics;
      const bodyEl = el('div');
      const grid = el('div', { class: 'instr' });
      grid.appendChild(el('label', { text: 'Mentality' }));
      const mSel = el('select', { style: 'grid-column:span 2;width:100%' });
      Object.keys(T.MENTALITY).forEach(k =>
        mSel.appendChild(el('option', { value: k, text: T.MENTALITY[k].label })));
      mSel.value = t.mentality;
      mSel.addEventListener('change', function () { t.mentality = mSel.value; });
      grid.appendChild(mSel);
      [['tempo', 'Tempo'], ['pressing', 'Pressing'], ['defLine', 'Defensive line'],
       ['width', 'Width']].forEach(([key, label]) => {
        grid.appendChild(el('label', { text: label }));
        const rng = el('input', { type: 'range', min: 1, max: 5, value: t[key] });
        const val = el('div', { class: 'val', text: String(t[key]) });
        rng.addEventListener('input', function () {
          t[key] = Number(rng.value); val.textContent = rng.value;
        });
        grid.appendChild(rng); grid.appendChild(val);
      });
      bodyEl.appendChild(grid);
      bodyEl.appendChild(el('div', { class: 'tiny mute2', style: 'margin-top:10px',
        text: 'Changes take effect immediately.' }));
      LV.subModal(bodyEl, function () {
        // Team ratings refresh on the engine's own 5-minute cadence.
        if (!wasPaused) { paused = false; pauseBtn.textContent = '⏸ Pause'; schedule(); }
      }, 'In-match tactics');
    });

    // ---- Full time ----
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      pauseBtn.disabled = true; skipBtn.disabled = true;
      subBtn.disabled = true; tacBtn.disabled = true;
      speedSel.disabled = true;

      const ft = el('div', { class: 'live-ft' });
      const us = userIsHome ? live.H.goals : live.A.goals;
      const them = userIsHome ? live.A.goals : live.H.goals;
      const verdict = us > them ? 'Win' : (us === them ? 'Draw' : 'Defeat');
      ft.appendChild(el('div', { class: 'live-ft-word ft-' + verdict.toLowerCase(),
        text: 'FULL TIME · ' + verdict }));
      const done = el('button', { class: 'btn btn-primary', text: 'Continue' });
      done.addEventListener('click', function () {
        box.classList.remove('live-box');
        UI.closeModal();
        onFinish();
      });
      ft.appendChild(done);
      foot.innerHTML = '';
      foot.appendChild(ft);
      renderAll();
    }

    renderAll();
    schedule();
  };

  /** A nested dialog that sits above the live view without closing it. */
  LV.subModal = function (contentEl, onClose, title) {
    const layer = el('div', { class: 'submodal' });
    const backing = el('div', { class: 'submodal-back' });
    const panel = el('div', { class: 'submodal-box' });
    const head = el('div', { class: 'modal-head' });
    head.appendChild(el('h2', { text: title || 'Substitution' }));
    const x = el('button', { class: 'x-close', html: '&times;' });
    head.appendChild(x);
    panel.appendChild(head);
    const bodyWrap = el('div', { class: 'modal-body' });
    bodyWrap.appendChild(contentEl);
    panel.appendChild(bodyWrap);
    layer.appendChild(backing);
    layer.appendChild(panel);
    document.body.appendChild(layer);

    function close() {
      layer.remove();
      if (onClose) onClose();
    }
    x.addEventListener('click', close);
    backing.addEventListener('click', close);
    FCM.UI._closeSubModal = close;
  };

  UI.closeModalKeepLive = function () {
    if (FCM.UI._closeSubModal) { FCM.UI._closeSubModal(); FCM.UI._closeSubModal = null; }
  };

  FCM.LV = LV;
})(window.FCM = window.FCM || {});
