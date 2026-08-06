/* Newgen name generation, recombining real name components by nationality. */
(function (FCM) {
  'use strict';

  const FALLBACK = {
    g: ['Alex', 'Daniel', 'Luca', 'Marco', 'Nico', 'Adam', 'Leo', 'Milan', 'Ivan', 'Omar'],
    f: ['Novak', 'Kovac', 'Bauer', 'Moreau', 'Costa', 'Ferrari', 'Nilsen', 'Halder', 'Vidic', 'Popov']
  };

  const Names = {};

  /** Weighted nationality pick, biased towards the club's own country. */
  Names.pickNationality = function (rng, homeNation, homeBias) {
    const pools = FCM.DB_NAMES || {};
    if (homeNation && pools[homeNation] && rng.chance(homeBias === undefined ? 0.72 : homeBias)) {
      return homeNation;
    }
    const keys = Object.keys(pools);
    return keys.length ? rng.pick(keys) : 'England';
  };

  /**
   * Generate a newgen name. Returns {short, full}.
   * `used` is an optional Set of already-taken full names to avoid collisions.
   */
  Names.generate = function (rng, nationality, used) {
    const pools = FCM.DB_NAMES || {};
    // Most of the world's nations have too few players in the source data to
    // build a pool from. Each is mapped to a neighbour that shares its naming
    // culture, so an Omani reads as Omani rather than generically European.
    let pool = pools[nationality];
    if (!pool && FCM.NT) {
      const nat = FCM.NT.get(nationality);
      if (nat && nat.kin) pool = pools[nat.kin];
    }
    pool = pool || FALLBACK;
    const g = pool.g && pool.g.length ? pool.g : FALLBACK.g;
    const f = pool.f && pool.f.length ? pool.f : FALLBACK.f;

    let given, family, full;
    for (let attempt = 0; attempt < 12; attempt++) {
      given = rng.pick(g);
      family = rng.pick(f);
      full = given + ' ' + family;
      if (!used || !used.has(full)) break;
    }
    if (used) used.add(full);

    // Brazilians and Portuguese often go by a single/short name in-game.
    const single = (nationality === 'Brazil' || nationality === 'Portugal') && rng.chance(0.35);
    const short = single ? family : given.charAt(0) + '. ' + family;
    return { short: short, full: full };
  };

  FCM.Names = Names;
})(window.FCM = window.FCM || {});
