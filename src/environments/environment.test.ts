// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// Environment to use only with unit tests

import {Environment} from "@sumaris-net/ngx-components";

const pkg = require('../../package.json');

export const environment = Object.freeze(<Environment>{
  name: (pkg.name as string),
  version: (pkg.version as string),
  production: false,
  baseUrl: "/",
  defaultLocale: "fr",
  defaultLatLongFormat: "DDMM",
  apolloFetchPolicy: "cache-first",

  // FIXME: enable cache
  persistCache: false,

  peerMinVersion: '1.21.0',

  checkAppVersionIntervalInSeconds: 0, // Not need for DEV

  defaultPeer: {
    host: 'localhost',
    port: 8080
  },
  defaultPeers: [
    {
      host: 'localhost',
      port: 8080
    },
    {
      host: 'localhost',
      port: 8081
    }
  ],

  defaultAppName: 'SUMARiS',
  defaultAndroidInstallUrl: 'https://play.google.com/store/apps/details?id=net.sumaris.app',

  // About modal
  sourceUrl: 'https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-app',
  reportIssueUrl: 'https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-app/-/issues/new?issue',

  // Storage
  storage: {
    driverOrder: ['sqlite', 'indexeddb', 'websql', 'localstorage']
  },

  account: {
    enableListenChanges: true,
    listenIntervalInSecond: 0
  },

  entityEditor: {
    enableListenChanges: true,
    listenIntervalInSecond: 0
  },

  program: {
    enableListenChanges: true,
    listenIntervalInSecond: 0
  }

});

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
import 'zone.js/dist/zone-error';
