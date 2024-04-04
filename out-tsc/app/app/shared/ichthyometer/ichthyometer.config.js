export const ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS = {
    DEVICES: {
        key: 'sumaris.ichthyometer.devices',
        label: 'SHARED.ICHTHYOMETER.SETTINGS.DEVICES',
        type: 'entities',
        autocomplete: {
            attributes: ['name', 'address'],
            columnNames: ['SHARED.BLUETOOTH.NAME', 'SHARED.BLUETOOTH.ADDRESS'],
            showAllOnFocus: false,
            showPanelOnFocus: false,
            displayWith: device => (device === null || device === void 0 ? void 0 : device.name) || (device === null || device === void 0 ? void 0 : device.address) || '?',
            // /!\ suggest function set inside the app.components.ts, to be able to use the ichthyometer service
            // suggestFn // replace by ichthyometer service
        },
        defaultValue: undefined
    },
    AUTO_DISCONNECT_IDLE_TIME: {
        key: 'sumaris.ichthyometer.autoDisconnect.idleTime',
        label: 'SHARED.ICHTHYOMETER.SETTINGS.AUTO_DISCONNECT',
        type: 'enum',
        maxValue: 600000,
        values: [-1, 60000, 300000, 600000].map(key => ({ key: '' + key, value: `SHARED.ICHTHYOMETER.SETTINGS.AUTO_DISCONNECT_ENUM.${key}` })),
        defaultValue: '60000' // 1 min, by default
    }
};
//# sourceMappingURL=ichthyometer.config.js.map