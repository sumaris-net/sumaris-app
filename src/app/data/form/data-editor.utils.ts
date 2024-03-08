import { InjectionToken } from '@angular/core';
import { AppEntityEditor } from '@sumaris-net/ngx-components';

export const APP_DATA_ENTITY_EDITOR = new InjectionToken<AppEntityEditor<any, any, any>>('AppDataEditor');

export type DataStrategyResolution = 'last' | 'user-select' | 'spatio-temporal' | 'none';
export const DataStrategyResolutions = Object.freeze({
  LAST: 'last',
  USER_SELECT: 'user-select',
  SPATIO_TEMPORAL: 'spatio-temporal',
  NONE: 'none', // e.g. Scientific cruise (Ifremer)
});
