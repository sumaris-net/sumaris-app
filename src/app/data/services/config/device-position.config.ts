import {FormFieldDefinition} from '@sumaris-net/ngx-components';
import {InjectionToken} from '@angular/core';
import {RootDataSynchroService} from '@app/data/services/root-data-synchro-service.class';

export const DEVICE_POSITION_ENTITY_SERVICES = new InjectionToken<RootDataSynchroService<any, any>>('devicePositionEntityServices');

export const DEVICE_POSITION_CONFIG_OPTION = Object.freeze({
  TIMER_PERIOD: <FormFieldDefinition> {
    key: 'sumaris.device.position.timerPeriodMs',
    label: 'DEVICE_POSITION.OPTIONS.TIMER_PERIOD',
    type: 'integer',
    defaultValue: 30_000, // 30 s
  },
  TRACKING_ENABLE: <FormFieldDefinition> {
    key: 'sumaris.device.position.tracking.enable',
    label: 'DEVICE_POSITION.OPTIONS.TRACKING_ENABLE',
    type: 'boolean',
    defaultValue: false
  },
  TRACKING_SAVE_PERIOD: <FormFieldDefinition> {
    key: 'sumaris.device.position.tracking.savePeriodMs',
    label: 'CONFIGURATION.OPTIONS.TRACKING_SAVE_PERIOD',
    type: 'integer',
    //defaultValue: 600000,
    defaultValue: 30000,
  },
});
