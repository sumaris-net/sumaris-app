import { InjectionToken } from '@angular/core';
export const DEVICE_POSITION_ENTITY_SERVICES = new InjectionToken('devicePositionEntityServices');
export const DEVICE_POSITION_CONFIG_OPTION = Object.freeze({
    TIMER_PERIOD: {
        key: 'sumaris.device.position.timerPeriodMs',
        label: 'DEVICE_POSITION.OPTIONS.TIMER_PERIOD',
        type: 'integer',
        defaultValue: 30000, // 30 s
    },
    TRACKING_ENABLE: {
        key: 'sumaris.device.position.tracking.enable',
        label: 'DEVICE_POSITION.OPTIONS.TRACKING_ENABLE',
        type: 'boolean',
        defaultValue: false
    },
    TRACKING_SAVE_PERIOD: {
        key: 'sumaris.device.position.tracking.savePeriodMs',
        label: 'DEVICE_POSITION.OPTIONS.TRACKING_SAVE_PERIOD',
        type: 'integer',
        //defaultValue: 600000,
        defaultValue: 30000,
    },
});
//# sourceMappingURL=device-position.config.js.map