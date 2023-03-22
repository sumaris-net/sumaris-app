import {FormFieldDefinition} from '@sumaris-net/ngx-components';
import {InjectionToken} from '@angular/core';
import {EmitOnSave} from '@app/data/services/model/emit-on-save.model';

// TODO Type entity (RootDataEntity<any, any>)
export const DEVICE_POSTION_ENTITY_MONITORING = new InjectionToken<EmitOnSave<any>[]>('entityToMonitorPositionOnSave');

export const DEVICE_POSITION_CONFIG_OPTION = Object.freeze({
  ENABLE: <FormFieldDefinition> {
    key: 'sumaris.app.service.gps.enable',
    label: 'CONFIGURATION.OPTIONS.DEVICE_POSITION_ENABLE',
    type: 'boolean',
    defaultValue: true,
  },
  CHECK_INTERVAL: <FormFieldDefinition> {
    key: 'sumaris.app.service.gps.periodMs',
    label: 'CONFIGURATION.OPTIONS.CHECK_INTERVAL',
    type: 'integer',
    defaultValue: 30000,
  },
});
