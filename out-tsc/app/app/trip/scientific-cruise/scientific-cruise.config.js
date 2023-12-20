export const SCIENTIFIC_CRUISE_FEATURE_NAME = 'scientificCruise';
/**
 * Define configuration options
 */
export const SCIENTIFIC_CRUISE_CONFIG_OPTIONS = Object.freeze({
    SCIENTIFIC_CRUISE_ENABLE: {
        key: 'sumaris.scientificCruise.enable',
        label: 'SCIENTIFIC_CRUISE.OPTIONS.ENABLE',
        type: 'boolean',
        defaultValue: true
    },
    SCIENTIFIC_CRUISE_NAME: {
        key: 'sumaris.scientificCruise.name',
        label: 'SCIENTIFIC_CRUISE.OPTIONS.NAME',
        type: 'enum',
        values: [
            {
                key: 'MENU.SCIENTIFIC_CRUISES',
                value: 'MENU.SCIENTIFIC_CRUISES'
            }
        ],
        defaultValue: 'MENU.SCIENTIFIC_CRUISES'
    },
});
//# sourceMappingURL=scientific-cruise.config.js.map