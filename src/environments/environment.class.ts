// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { Environment } from '@sumaris-net/ngx-components';

export class AppEnvironment extends Environment {

  program?: {
    enableListenChanges?: boolean;
    listenIntervalInSeconds?: number;
  }
}

