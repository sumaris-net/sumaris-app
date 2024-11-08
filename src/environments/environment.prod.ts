import { AppEnvironment } from '@environments/environment.class';
import { StorageDrivers } from '@sumaris-net/ngx-components';

/* eslint-disable */
const pkg = require('../../package.json');
export const environment = Object.freeze(<AppEnvironment>{
  name: pkg.name as string,
  version: pkg.version as string,
  production: true,
  baseUrl: '/',
  useHash: false,
  defaultLocale: 'fr',
  defaultLatLongFormat: 'DDMM',
  apolloFetchPolicy: 'cache-first',

  // Environment
  externalEnvironmentUrl: 'assets/environments/environment.json',
  // Must be change manually. Can be override using Pod properties 'sumaris.app.min.version'
  peerMinVersion: '2.9.24',

  // Check Web new app version
  checkAppVersionIntervalInSeconds: 5 * 60, // every 5min

  // FIXME: enable cache
  persistCache: false,

  // Leave null,
  defaultPeer: null,

  // Production and public peers
  defaultPeers: [
    {
      host: 'www.sumaris.net',
      port: 443,
      useSsl: true,
    },
    {
      host: 'open.sumaris.net',
      port: 443,
      useSsl: true,
    },
    {
      host: 'adap.pecheursdebretagne.eu',
      port: 443,
      useSsl: true,
    },
    {
      host: 'imagine-pod.ifremer.fr',
      port: 443,
      useSsl: true,
    },
    {
      host: 'sih.sfa.sc',
      port: 443,
      useSsl: true,
    },

    // -- Tests instances --
    {
      host: 'adap-test.pecheursdebretagne.eu',
      port: 443,
      useSsl: true,
    },
    {
      host: 'open-test.sumaris.net',
      port: 443,
      useSsl: true,
    },
    {
      host: 'test.sumaris.net',
      port: 443,
      useSsl: true,
    },
    {
      host: 'obsmer.sumaris.net',
      port: 443,
      useSsl: true,
    },
  ],

  defaultAppName: 'SUMARiS',
  defaultAndroidInstallUrl: 'https://play.google.com/store/apps/details?id=net.sumaris.app',

  // About modal
  sourceUrl: 'https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-app',
  reportIssueUrl: 'https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-app/-/issues/new?issue',
  forumUrl: null, // 'https://forum.sumaris.net',
  //helpUrl: 'https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-doc/-/blob/master/user-manual/index_fr.md',

  // Storage
  storage: {
    driverOrder: [StorageDrivers.SQLLite, StorageDrivers.IndexedDB, StorageDrivers.WebSQL, StorageDrivers.LocalStorage],
  },

  account: {
    enableListenChanges: true,
    listenIntervalInSeconds: 0,
  },

  entityEditor: {
    enableListenChanges: true,
    listenIntervalInSeconds: 0,
  },

  program: {
    enableListenChanges: true,
    listenIntervalInSeconds: 30,
  },

  menu: {
    subMenu: {
      enable: true,
    },
  },
});
/* tslint:enable */
