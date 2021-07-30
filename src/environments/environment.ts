// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import {Environment} from '@sumaris-net/ngx-components';
/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
import 'zone.js/dist/zone-error';

const pkg = require('../../package.json');

export const environment: Environment = Object.freeze({
  name: (pkg.name as string),
  version: (pkg.version as string),
  production: false,
  baseUrl: "/",
  defaultLocale: "fr",
  defaultLatLongFormat: "DDMM",
  apolloFetchPolicy: "cache-first",
  mock: false,

  // FIXME: GraphQL subscription never unsubscribe...
  listenRemoteChanges: false,

  // FIXME: enable cache
  persistCache: false,

  // TODO: make this works
  //offline: true,

  peerMinVersion: '1.10.0',

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
      host: '192.168.0.45',
      port: 8080
    },
    {
      host: '192.168.0.24',
      port: 8080
    },
    {
      host: '192.168.0.29',
      port: 8080
    },
    {
      host: 'server.e-is.pro',
      port: 443
    },
    {
      host: 'adap.pecheursdebretagne.eu',
      port: 443
    },
    {
      host: 'sih.sfa.sc',
      port: 80,
      useSsl: false
    },
    {
      host: 'www.sumaris.net',
      port: 443
    },
    {
      host: 'test.sumaris.net',
      port: 443
    },
    {
      host: 'open.sumaris.net',
      port: 443
    },
    {
      host: 'adap.e-is.pro',
      port: 443
    },
    {
      host: 'visi-common-docker1.ifremer.fr',
      port: 8080
    },
    {
      host: 'imagine-pod.isival.ifremer.fr',
      port: 443
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
  }
});

