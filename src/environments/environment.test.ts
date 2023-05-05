// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
import 'zone.js/plugins/zone-error';

// Environment to use only with unit tests

import {Environment, StorageDrivers} from '@sumaris-net/ngx-components';

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

  peerMinVersion: '2.3.0',

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
    },
    {
      host: 'server.e-is.pro',
      port: 8080
    }
  ],

  defaultAppName: 'SUMARiS',
  defaultAndroidInstallUrl: 'https://play.google.com/store/apps/details?id=net.sumaris.app',

  // About modal
  sourceUrl: 'https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-app',
  reportIssueUrl: 'https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-app/-/issues/new?issue',

  // Storage
  storage: {
    driverOrder: [StorageDrivers.SQLLite, StorageDrivers.IndexedDB, StorageDrivers.WebSQL, StorageDrivers.LocalStorage]
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
  },

  defaultAuthValues: {
    pubkey: 'GEj5KLU3NoHPEW7hEmrbTc3srqnGgtr7KehAt8YVbsbP',
    token: 'GEj5KLU3NoHPEW7hEmrbTc3srqnGgtr7KehAt8YVbsbP:9C4B3A4560F52BDB1E3DACDEC973C077AE7A8FE8E005F3683BE52ADC718BC818|Jktzj/MYewXGWSIbw+MXq0QgzzduSat0ODsgHpDLRonxfipReplp2Y9xPUfsCD6Y1cEvW4JxNtHIsi7c7GOWAA=='
  }
});

