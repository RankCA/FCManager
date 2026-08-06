/* Seeded deterministic RNG (mulberry32) + distribution helpers. */
(function (FCM) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  class RNG {
    constructor(seed) {
      this.seed = typeof seed === 'string' ? hashString(seed) : (seed >>> 0);
      this._next = mulberry32(this.seed);
    }
    /** Uniform float in [0,1). */
    next() { return this._next(); }
    /** Uniform float in [min,max). */
    range(min, max) { return min + this._next() * (max - min); }
    /** Uniform integer in [min,max] inclusive. */
    int(min, max) { return Math.floor(this.range(min, max + 1)); }
    /** True with probability p. */
    chance(p) { return this._next() < p; }
    /** Random element. */
    pick(arr) { return arr[Math.floor(this._next() * arr.length)]; }
    /** Weighted pick. `items` = [{w: number, ...}] or parallel weights array. */
    weighted(items, weightFn) {
      const fn = weightFn || ((x) => x.w);
      let total = 0;
      for (const it of items) total += fn(it);
      let r = this._next() * total;
      for (const it of items) { r -= fn(it); if (r <= 0) return it; }
      return items[items.length - 1];
    }
    /** Fisher-Yates in place. */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this._next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    /** Normal distribution via Box-Muller. */
    normal(mean, sd) {
      let u = 0, v = 0;
      while (u === 0) u = this._next();
      while (v === 0) v = this._next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    /** Normal clamped to [min,max]. */
    normalClamped(mean, sd, min, max) {
      return Math.max(min, Math.min(max, this.normal(mean, sd)));
    }
    /** Serialise for save games. */
    getState() { return this.seed; }
  }

  FCM.RNG = RNG;
  FCM.hashString = hashString;
  // Global convenience instance; reseeded on new game.
  FCM.rng = new RNG(Date.now());
})(window.FCM = window.FCM || {});
