import {FormFieldDefinition} from '@sumaris-net/ngx-components';
import {InjectionToken} from '@angular/core';
import {RootDataSynchroService} from '@app/data/services/root-data-synchro-service.class';

export const DEVICE_POSITION_ENTITY_SERVICES = new InjectionToken<RootDataSynchroService<any, any>>('devicePositionEntityServices');

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
  SAVE_INTERVAL: <FormFieldDefinition> {
    key: 'sumaris.app.service.gps.savePeriodMs',
    label: 'CONFIGURATION.OPTIONS.SAVE_INTERVAL',
    type: 'integer',
    //defaultValue: 600000,
    defaultValue: 30000,
  },
});
