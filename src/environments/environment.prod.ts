import { AppEnvironment } from '@environments/environment.class';

const pkg = require('../../package.json')

/* tslint:disable */
export const environment = Object.freeze(<AppEnvironment>{
  name: (pkg.name as string),
  version: (pkg.version as string),
  production: true,
  baseUrl: "/",
  defaultLocale: "fr",
  defaultLatLongFormat: "DDMM",
  apolloFetchPolicy: "cache-first",

  // Must be change manually. Can be override using Pod properties 'sumaris.app.min.version'
  peerMinVersion: '1.21.0',

  // Check Web new app version every 5min
  checkAppVersionIntervalInSeconds: 5 * 60,

  // FIXME: enable cache
  persistCache: false,

  // Leave null,
  defaultPeer: null,

  // Production and public peers
  defaultPeers: [
    {
      host: 'www.sumaris.net',
      port: 443
    },
    {
      host: 'open.sumaris.net',
      port: 443
    },
    {
      host: 'adap.pecheursdebretagne.eu',
      port: 443
    },
    {
      host: 'test.sumaris.net',
      port: 443
    },
    {
      host: 'sih.sfa.sc',
      port: 80,
      useSsl: false
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
    listenIntervalInSeconds: 0
  },

  entityEditor: {
    enableListenChanges: true,
    listenIntervalInSeconds: 0
  },

  program: {
    enableListenChanges: true,
    listenIntervalInSeconds: 30
  }
});
/* tslint:enable */
