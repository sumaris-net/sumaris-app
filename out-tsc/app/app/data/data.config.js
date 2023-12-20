import { PRIORITIZED_AUTHORITIES, StatusIds } from '@sumaris-net/ngx-components';
export const DATA_GRAPHQL_TYPE_POLICIES = {
    DataReferenceVO: {
        keyFields: ['entityName', 'id'],
    },
};
export const DATA_IMPORT_PERIODS = Object.freeze([
    { value: 1, unit: 'week' },
    { value: 15, unit: 'day' },
    { value: 1, unit: 'month' },
    { value: 3, unit: 'month' },
    { value: 6, unit: 'month' }
]);
export const DATA_CONFIG_OPTIONS = Object.freeze({
    ENTITY_TRASH: {
        key: 'sumaris.persistence.trash.enable',
        label: 'CONFIGURATION.OPTIONS.ENTITY_TRASH',
        type: 'boolean',
        defaultValue: true
    },
    ADAGIO_OPTIMIZATION: {
        key: 'sumaris.persistence.adagio.optimization',
        label: 'CONFIGURATION.OPTIONS.ADAGIO_OPTIMIZATION',
        type: 'boolean',
        defaultValue: false
    },
    ADAGIO_SCHEMA: {
        key: 'sumaris.persistence.adagio.schema',
        label: 'CONFIGURATION.OPTIONS.ADAGIO_SCHEMA',
        type: 'string',
        defaultValue: ''
    },
    SAMPLE_HASH_OPTIMIZATION: {
        key: 'sumaris.persistence.sample.hashOptimization',
        label: 'CONFIGURATION.OPTIONS.SAMPLE_HASH_OPTIMIZATION',
        type: 'boolean',
        defaultValue: false
    },
    SAMPLE_UNIQUE_TAG: {
        key: 'sumaris.persistence.sample.uniqueTag',
        label: 'CONFIGURATION.OPTIONS.SAMPLE_UNIQUE_TAG',
        type: 'boolean',
        defaultValue: false
    },
    BATCH_HASH_OPTIMIZATION: {
        key: 'sumaris.persistence.batch.hashOptimization',
        label: 'CONFIGURATION.OPTIONS.BATCH_HASH_OPTIMIZATION',
        type: 'boolean',
        defaultValue: false
    },
    PHYSICAL_GEAR_HASH_OPTIMIZATION: {
        key: 'sumaris.persistence.physicalGear.hashOptimization',
        label: 'CONFIGURATION.OPTIONS.PHYSICAL_GEAR_HASH_OPTIMIZATION',
        type: 'boolean',
        defaultValue: false
    },
    ACCESS_PROGRAM_IDS: {
        key: 'sumaris.data.program.ids',
        label: 'CONFIGURATION.OPTIONS.ACCESS_PROGRAM_IDS',
        type: 'entities',
        autocomplete: {
            attributes: ['label'],
            filter: {
                entityName: 'Program',
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            }
        },
        defaultValue: '',
    },
    ACCESS_NOT_SELF_DATA_ROLE: {
        key: 'sumaris.data.accessNotSelfData.role',
        label: 'CONFIGURATION.OPTIONS.ACCESS_NOT_SELF_DATA_MIN_ROLE',
        type: 'enum',
        values: PRIORITIZED_AUTHORITIES.map(key => ({
            key: 'ROLE_' + key,
            value: 'USER.PROFILE_ENUM.' + key
        })),
        defaultValue: 'ROLE_ADMIN',
    },
    ACCESS_NOT_SELF_DATA_DEPARTMENT_IDS: {
        key: 'sumaris.data.accessNotSelfData.department.ids',
        label: 'CONFIGURATION.OPTIONS.ACCESS_NOT_SELF_DATA_DEPARTMENT_IDS',
        type: 'entities',
        autocomplete: {
            attributes: ['label'],
            filter: {
                entityName: 'Department',
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            }
        },
        defaultValue: '',
    },
    QUALITY_PROCESS_ENABLE: {
        key: 'sumaris.data.quality.process.enable',
        label: 'CONFIGURATION.OPTIONS.DATA_QUALITY_PROCESS_ENABLE',
        type: 'boolean',
        defaultValue: true
    },
    SHOW_RECORDER: {
        key: 'sumaris.data.show.recorder.enable',
        label: 'CONFIGURATION.OPTIONS.DATA_SHOW_RECORDER',
        type: 'boolean',
        defaultValue: true
    },
    SHOW_OBSERVERS: {
        key: 'sumaris.data.show.observer.enable',
        label: 'CONFIGURATION.OPTIONS.DATA_SHOW_OBSERVERS',
        type: 'boolean',
        defaultValue: true
    },
    SHOW_FILTER_PROGRAM: {
        key: 'sumaris.data.landing.show.filter.program.enable',
        label: 'CONFIGURATION.OPTIONS.LANDING.FILTER_PROGRAM',
        type: 'boolean',
        defaultValue: true
    },
    SHOW_FILTER_LOCATION: {
        key: 'sumaris.data.landing.show.filter.location.enable',
        label: 'CONFIGURATION.OPTIONS.LANDING.FILTER_LOCATION',
        type: 'boolean',
        defaultValue: true
    },
    SHOW_FILTER_PERIOD: {
        key: 'sumaris.data.landing.show.filter.period.enable',
        label: 'CONFIGURATION.OPTIONS.LANDING.FILTER_PERIOD',
        type: 'boolean',
        defaultValue: true
    },
    DATA_IMPORT_DEFAULT_PERIOD: {
        key: 'sumaris.data.import.predoc.period',
        label: 'CONFIGURATION.OPTIONS.DATA_IMPORT_DEFAULT_PERIOD',
        type: 'enum',
        defaultValue: '1 month',
        values: DATA_IMPORT_PERIODS.map(({ value, unit }) => ({
            key: `${value} ${unit}`,
            value: `${value} ${unit}`
        }))
    },
    DATA_IMAGES_ENABLE: {
        key: 'sumaris.data.images.enable',
        label: 'CONFIGURATION.OPTIONS.DATA_IMAGES_ENABLE',
        type: 'boolean',
        defaultValue: 'false'
    },
    DATA_VESSEL_TYPE_IDS: {
        key: 'sumaris.data.vessel.type.ids',
        label: 'CONFIGURATION.OPTIONS.DATA_VESSEL_TYPE_IDS',
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'VesselType',
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            }
        }
    },
});
//# sourceMappingURL=data.config.js.map