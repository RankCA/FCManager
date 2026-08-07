/* Save/load. Static FC26 data lives in the JS bundles, so a save only
   stores mutable career state - which keeps it small enough for localStorage. */
(function (FCM) {
  'use strict';

  const S = {};
  const KEY = 'fcmanager.save.v1';
  const META = 'fcmanager.meta.v1';

  // Per-player mutable fields, packed positionally to keep saves compact.
  const PF = ['id', 'clubId', 'ovr', 'pot', 'age', 'value', 'wage', 'contractUntil',
    'form', 'fitness', 'morale', 'injury', 'xp', 'apps', 'goals', 'assists',
    'cleanSheets', 'yellow', 'red', 'minutes', 'careerGoals', 'careerApps',
    'transferListed', 'valMult', 'wageMult', 'seasonYear',
    'suspended', 'promotedOn', 'academyUnrest', 'isYouth',
    'notForSale', 'sellOnPct', 'sellOnOwedTo', 'releaseClause', 'appearanceFee',
    'goalBonus', 'squadRole', 'loanedTo', 'loanFrom', 'loanUntil', 'loanWageShare',
    'freeSince', 'trainingFocus', 'loanListed', 'loanOptionToBuy',
    'transferRequested', 'promisedGameTime', 'tag',
    'promise', 'trustBroken', 'lastChatDay', 'preContract'];

  // Floats carry ~15 digits in JSON; two decimals is plenty and much smaller.
  const ROUND2 = { form: 1, fitness: 1, morale: 1, xp: 1, valMult: 1, wageMult: 1 };

  function isEmpty(v) {
    return v === null || v === undefined || v === 0 || v === false || v === '';
  }

  function packPlayer(p) {
    const a = PF.map(k => {
      const v = p[k];
      return (ROUND2[k] && typeof v === 'number') ? Math.round(v * 100) / 100 : v;
    });
    // Most players have none of the clause/loan/training fields set, so drop
    // trailing empties. unpackPlayer pads them back out.
    while (a.length && isEmpty(a[a.length - 1])) a.pop();
    // Newgens are not in the static DB, so they carry their full definition -
    // including after promotion, when isYouth has already flipped to false.
    // Attributes are packed positionally; spelled-out keys cost ~40% more.
    if (p.isNewgen) {
      a.push({
        y: 1, n: p.name, f: p.full, p: p.pos.join('|'), t: p.nat,
        o: p.foot === 'Left' ? 1 : 0, h: p.height, w: p.weight,
        A: ATT_KEYS.map(k => p.att[k]),
        S: FCM.DB.SUB_KEYS.map(k => p.sub[k]),
        m: [p.weakFoot, p.skillMoves, p.rep, p.workRate.att, p.workRate.def, p.scoutRange],
        c: p.scoutedFrom || 0,
        k: [p.injuryProne, p.consistency, p.bigMatch, p.ambition, p.loyalty],
        // Domestic-league professionals filling out a thin national pool.
        // Without this they reload as free agents and get signed up.
        b: p.abroad ? 1 : 0
      });
    }
    return a;
  }

  const ATT_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy',
    'gkd', 'gkh', 'gkk', 'gkr', 'gks', 'gkp'];

  function unpackNewgen(x) {
    const att = {}, sub = {};
    ATT_KEYS.forEach((k, i) => { att[k] = x.A[i]; });
    FCM.DB.SUB_KEYS.forEach((k, i) => { sub[k] = x.S[i]; });
    return {
      isNewgen: true, name: x.n, full: x.f, pos: String(x.p).split('|'),
      nat: x.t, foot: x.o ? 'Left' : 'Right', height: x.h, weight: x.w,
      att: att, sub: sub, traits: [],
      weakFoot: x.m[0], skillMoves: x.m[1], rep: x.m[2],
      workRate: { att: x.m[3], def: x.m[4] }, scoutRange: x.m[5],
      scoutedFrom: x.c || null,
      injuryProne: x.k[0], consistency: x.k[1], bigMatch: x.k[2],
      ambition: x.k[3], loyalty: x.k[4],
      abroad: !!x.b,
      foreignClub: x.b ? x.t + ' domestic league' : null,
      injuryName: null, seasonRatings: [], loanedTo: null, loanFrom: null
    };
  }

  function unpackPlayer(a) {
    // The newgen definition, if present, is always the final element.
    const last = a[a.length - 1];
    const extra = (last && typeof last === 'object' && last.y) ? last : null;
    if (extra) a = a.slice(0, -1);
    let p;
    if (extra && extra.y) {
      p = unpackNewgen(extra);
      // Keep the newgen id counter ahead of anything we just restored.
      FCM.Y.setIdFloor(a[0]);
    } else {
      p = FCM.DB.byId[a[0]];
      if (!p) return null;
    }
    PF.forEach((k, i) => { p[k] = a[i]; });
    if (!p.seasonRatings) p.seasonRatings = [];
    if (p.injury > 0 && !p.injuryName) p.injuryName = 'Injury';
    return p;
  }

  function packClub(c) {
    return [c.id, c.league, c.balance, c.transferBudget, c.wageBudget, c.morale,
      c.facilities, c.coaching, c.youthRating, c.scouting, c.squad, c.youth || []];
  }

  S.serialize = function () {
    const s = FCM.G.state;
    return {
      v: FCM.SAVE_FORMAT,
      appVersion: FCM.VERSION,
      seed: s.seed, startYear: s.startYear, season: s.season, day: s.day,
      managerName: s.managerName, userClubId: s.userClubId,
      board: s.board, finances: s.finances, settings: s.settings,
      scouting: s.scouting,
      difficulty: s.difficulty, daysInJob: s.daysInJob, sacked: s.sacked,
      ledger: s.ledger, ticketPrice: s.ticketPrice, stadiumProject: s.stadiumProject,
      trophyCount: s.trophyCount, seasonHistory: s.seasonHistory,
      trainingFocus: s.trainingFocus, staff: s.staff, records: s.records,
      objectives: s.objectives, awards: s.awards, monthDay: s.monthDay,
      teamOfSeason: s.teamOfSeason,
      career: s.career, internationals: s.internationals, ballonDor: s.ballonDor,
      activeTournaments: s.activeTournaments, qualifying: s.qualifying,
      hallOfFame: s.hallOfFame,
      pressBravado: s.pressBravado, lastPressDay: s.lastPressDay,
      lastIntake: s.lastIntake, owners: s.owners, vision: s.vision,
      managers: s.managers, grudges: s.grudges, grudgeLog: s.grudgeLog,
      seekingJob: s.seekingJob,
      capacities: FCM.DB.clubs.map(c => [c.id, c.capacity]),
      inbox: s.inbox.slice(0, 80), transfers: s.transfers.slice(-250),
      history: s.history, seasonLog: s.seasonLog, shortlist: s.shortlist,
      lastTables: s.lastTables || null,
      unreadCount: s.unreadCount,
      competitions: s.competitions,
      tactics: s.tactics,
      players: FCM.DB.players.map(packPlayer),
      clubs: FCM.DB.clubs.map(packClub),
      usedNames: Array.from(FCM._usedNamesSet || [])
    };
  };

  function metaFor(data, size) {
    const club = FCM.DB.clubById[data.userClubId];
    return {
      club: club ? club.name : '?', manager: data.managerName,
      season: data.season, day: data.day, saved: Date.now(),
      size: size, version: FCM.VERSION, format: FCM.SAVE_FORMAT
    };
  }

  /**
   * Quick save to browser storage. Saves outgrow the ~5MB localStorage quota
   * in long careers, so a failure here is expected, not exceptional - the
   * caller is told to download a file instead.
   */
  S.save = function () {
    let json;
    try {
      const data = S.serialize();
      json = JSON.stringify(data);
      localStorage.setItem(KEY, json);
      localStorage.setItem(META, JSON.stringify(metaFor(data, json.length)));
      return { ok: true, size: json.length };
    } catch (err) {
      const quota = /quota|exceeded|storage/i.test(err.message || '');
      // A partial write leaves a corrupt slot; clear it so Continue doesn't
      // load half a career.
      if (quota) { try { localStorage.removeItem(KEY); } catch (e) {} }
      return { ok: false, quota: quota, size: json ? json.length : 0, error: err.message };
    }
  };

  // ---- File saves -----------------------------------------------------
  S.FILE_EXT = '.fcsave';

  S.fileName = function () {
    const s = FCM.G.state;
    const club = FCM.DB.clubById[s.userClubId];
    const slug = (club ? club.name : 'career').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const d = new Date();
    const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    return 'fcmanager-' + slug + '-' + s.season + '-' + stamp + S.FILE_EXT;
  };

  function gzipSupported() {
    return typeof CompressionStream === 'function' && typeof Response === 'function';
  }

  /** Gzip a string to a Blob, falling back to plain text. */
  async function pack(json) {
    if (!gzipSupported()) {
      return { blob: new Blob([json], { type: 'application/json' }), gz: false };
    }
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    const blob = await new Response(stream).blob();
    return { blob: blob, gz: true };
  }

  /** Read a File back to a JSON string, transparently un-gzipping. */
  async function unpack(file) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // gzip magic number
    const isGz = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (!isGz) return new TextDecoder().decode(bytes);
    if (typeof DecompressionStream !== 'function') {
      throw new Error('This save is compressed and your browser cannot read it.');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  }

  /** Serialize and hand the user a downloadable save file. */
  S.download = async function () {
    const data = S.serialize();
    data.savedAt = Date.now();
    data.appVersion = FCM.VERSION;
    const json = JSON.stringify(data);
    const packed = await pack(json);
    const url = URL.createObjectURL(packed.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = S.fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    // Keep the "continue" card pointing at the most recent file save.
    try {
      localStorage.setItem(META, JSON.stringify(
        Object.assign(metaFor(data, packed.blob.size), { fileOnly: true })));
    } catch (e) {}
    return { ok: true, raw: json.length, size: packed.blob.size, gz: packed.gz,
      name: a.download };
  };

  /** Load a career from a user-picked file. */
  S.loadFile = async function (file) {
    const json = await unpack(file);
    let d;
    try { d = JSON.parse(json); }
    catch (e) { throw new Error('That file is not a valid FC Manager save.'); }
    if (!d || !d.userClubId || !d.players) {
      throw new Error('That file is not a valid FC Manager save.');
    }
    if (d.v && d.v > FCM.SAVE_FORMAT) {
      throw new Error('This save was made in a newer version of the game (format ' +
        d.v + ', this build reads ' + FCM.SAVE_FORMAT + ').');
    }
    return S.hydrate(d);
  };

  S.meta = function () {
    try { return JSON.parse(localStorage.getItem(META) || 'null'); }
    catch (e) { return null; }
  };
  S.exists = function () { return !!localStorage.getItem(KEY); };
  S.clear = function () { localStorage.removeItem(KEY); localStorage.removeItem(META); };

  S.load = function () {
    const json = localStorage.getItem(KEY);
    if (!json) return null;
    return S.hydrate(JSON.parse(json));
  };

  /** Rebuild a live game from parsed save data, whatever its source. */
  S.hydrate = function (d) {
    // Rebuild the static world first, then overlay saved mutable state.
    const rng = new FCM.RNG(d.seed);
    FCM.DB.build(rng, d.startYear);
    FCM.G.rng = rng;
    FCM._usedNamesSet = new Set(d.usedNames || []);
    FCM.G._usedNames = FCM._usedNamesSet;

    d.clubs.forEach(c => {
      const club = FCM.DB.clubById[c[0]];
      if (!club) return;
      club.league = c[1]; club.balance = c[2]; club.transferBudget = c[3];
      club.wageBudget = c[4]; club.morale = c[5]; club.facilities = c[6];
      club.coaching = c[7]; club.youthRating = c[8]; club.scouting = c[9];
      club.squad = c[10]; club.youth = c[11] || [];
    });

    const saved = new Set();
    d.players.forEach(a => {
      const p = unpackPlayer(a);
      if (!p) return;
      saved.add(p.id);
      if (!FCM.DB.byId[p.id]) { FCM.DB.byId[p.id] = p; FCM.DB.players.push(p); }
    });
    // The rebuild above restores the full static roster, including everyone
    // who has since retired. Anyone the save left out is gone for good.
    if (FCM.DB.players.length !== saved.size) {
      FCM.DB.players = FCM.DB.players.filter(p => saved.has(p.id));
      Object.keys(FCM.DB.byId).forEach(id => {
        if (!saved.has(Number(id))) delete FCM.DB.byId[id];
      });
    }

    FCM.G.state = {
      version: 1, seed: d.seed, startYear: d.startYear, season: d.season, day: d.day,
      managerName: d.managerName, userClubId: d.userClubId,
      competitions: d.competitions, inbox: d.inbox, transfers: d.transfers,
      history: d.history, seasonLog: d.seasonLog || [], tactics: d.tactics,
      shortlist: d.shortlist || [], board: d.board, finances: d.finances,
      settings: d.settings || { autoSubs: true, autoLineup: true },
      scouting: d.scouting || { missions: [], found: [] },
      difficulty: d.difficulty || 'normal',
      daysInJob: d.daysInJob || 0,
      sacked: !!d.sacked,
      ledger: d.ledger || FCM.F.blankLedger(),
      ticketPrice: d.ticketPrice || 32,
      stadiumProject: d.stadiumProject || null,
      trophyCount: d.trophyCount || 0,
      seasonHistory: d.seasonHistory || [],
      trainingFocus: d.trainingFocus || 'balanced',
      staff: d.staff || null,
      records: d.records || FCM.AW.blankRecords(),
      objectives: d.objectives || [],
      awards: d.awards || [],
      monthDay: d.monthDay || 0,
      teamOfSeason: d.teamOfSeason || null,
      // Older saves predate the career/international systems.
      career: d.career || FCM.CR.blank(),
      internationals: d.internationals || [],
      ballonDor: d.ballonDor || [],
      activeTournaments: d.activeTournaments || [],
      qualifying: d.qualifying || [],
      pressBravado: d.pressBravado || 0, lastPressDay: d.lastPressDay || null,
      lastIntake: d.lastIntake || null, owners: d.owners || {},
      vision: d.vision || null,
      managers: d.managers || {}, grudges: d.grudges || {},
      grudgeLog: d.grudgeLog || {},
      hallOfFame: d.hallOfFame || [],
      seekingJob: !!d.seekingJob,
      lastTables: d.lastTables, unreadCount: d.unreadCount || 0,
      usedNames: d.usedNames || []
    };
    // Stadium expansions change capacity away from the generated baseline.
    (d.capacities || []).forEach(([id, cap]) => {
      const c = FCM.DB.clubById[id];
      if (c) c.capacity = cap;
    });
    if (!FCM.G.state.staff) {
      FCM.G.state.staff = FCM.TN.initStaff(FCM.DB.clubById[FCM.G.state.userClubId]);
    }
    FCM.AW.resetRivals();
    FCM.G.reindexFixtures();
    return FCM.G.state;
  };

  FCM.S = S;
})(window.FCM = window.FCM || {});
