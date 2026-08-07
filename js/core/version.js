/* Build identity. Bump VERSION on release; SAVE_FORMAT only when the save
   layout changes in a way older files can't be read with. */
(function (FCM) {
  'use strict';

  FCM.VERSION = '2.4.0';
  FCM.BUILD = '2026-08-06';
  FCM.SAVE_FORMAT = 3;

  /** Data snapshot the squads come from. */
  FCM.DATA_LABEL = 'FC 26 · 19 Sep 2025';

  FCM.versionString = function () {
    return 'v' + FCM.VERSION;
  };
  FCM.versionLong = function () {
    return 'FC Manager v' + FCM.VERSION + ' (' + FCM.BUILD + ') · save format ' +
      FCM.SAVE_FORMAT + ' · ' + FCM.DATA_LABEL;
  };
})(window.FCM = window.FCM || {});
