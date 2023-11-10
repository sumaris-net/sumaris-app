import { InjectionToken } from '@angular/core';
import { AppEntityEditor } from '@sumaris-net/ngx-components';

export const APP_DATA_ENTITY_EDITOR = new InjectionToken<AppEntityEditor<any, any, any>>('AppDataEditor');

export type DataStrategyResolution = 'last' | 'label' | 'locationAndDate';
export const DataStrategyResolutions = Object.freeze({
  LAST: 'last',
  LABEL: 'label',
  LOCATION_AND_DATE: 'locationAndDate',
});
