import { isNilOrBlank, removeDuplicatesFromArray, StatusIds } from '@sumaris-net/ngx-components';
import { LocationLevelGroups, LocationLevelIds, UnitLabel } from '../model/model.enum';
import { TaxonGroupTypeIds } from '@app/referential/services/model/taxon-group.model';
import { DataStrategyResolutions } from '@app/data/form/data-editor.utils';
export const SAMPLING_STRATEGIES_FEATURE_NAME = 'samplingStrategies';
export const OperationPasteFlags = Object.freeze({
    NONE: 0,
    DATE: 1,
    TIME: 2,
    POSITION: 4,
    FISHING_AREA: 8,
    MEASUREMENT: 16,
    GEAR: 32,
    METIER: 64,
    // ALL FLAGS
    ALL: (1 + 2 + 4 + 8 + 16 + 32 + 64)
});
export const ProgramProperties = Object.freeze({
    // Access right
    DATA_OBSERVERS_CAN_WRITE: {
        key: 'sumaris.data.observers.canWrite',
        label: 'PROGRAM.OPTIONS.DATA_OBSERVERS_CAN_WRITE',
        type: 'boolean',
        defaultValue: false,
    },
    // Strategies resolution
    DATA_STRATEGY_RESOLUTION: {
        key: 'sumaris.data.strategy.resolution',
        label: 'PROGRAM.OPTIONS.DATA_STRATEGY_RESOLUTION',
        type: 'enum',
        values: [
            {
                key: DataStrategyResolutions.LAST,
                value: 'PROGRAM.OPTIONS.DATA_STRATEGY_RESOLUTION_ENUM.LAST'
            },
            {
                key: DataStrategyResolutions.USER_SELECT,
                value: 'PROGRAM.OPTIONS.DATA_STRATEGY_RESOLUTION_ENUM.USER_SELECT'
            },
            {
                key: DataStrategyResolutions.SPATIO_TEMPORAL,
                value: 'PROGRAM.OPTIONS.DATA_STRATEGY_RESOLUTION_ENUM.SPATIO_TEMPORAL'
            },
            {
                key: DataStrategyResolutions.NONE,
                value: 'PROGRAM.OPTIONS.DATA_STRATEGY_RESOLUTION_ENUM.NONE'
            },
        ],
        // TODO
        //defaultValue: DataStrategyResolutions.LAST
        defaultValue: DataStrategyResolutions.SPATIO_TEMPORAL
    },
    // Trip
    TRIP_LOCATION_LEVEL_IDS: {
        key: 'sumaris.trip.location.level.ids',
        label: 'PROGRAM.OPTIONS.TRIP_LOCATION_LEVEL_IDS',
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'LocationLevel',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['name']
        },
        defaultValue: LocationLevelIds.PORT.toString()
    },
    TRIP_LOCATION_FILTER_MIN_LENGTH: {
        key: 'sumaris.trip.location.filter.searchText.minLength',
        label: 'PROGRAM.OPTIONS.TRIP_LOCATION_FILTER_SEARCH_TEXT_MIN_LENGTH',
        type: 'integer',
        defaultValue: 0
    },
    TRIP_SALE_ENABLE: {
        key: 'sumaris.trip.sale.enable',
        label: 'PROGRAM.OPTIONS.TRIP_SALE_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_OBSERVERS_ENABLE: {
        key: 'sumaris.trip.observers.enable',
        label: 'PROGRAM.OPTIONS.TRIP_OBSERVERS_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_OFFLINE_IMPORT_LOCATION_LEVEL_IDS: {
        key: 'sumaris.trip.offline.import.location.level.ids',
        label: 'PROGRAM.OPTIONS.TRIP_OFFLINE_IMPORT_LOCATION_LEVEL_IDS',
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'LocationLevel',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['name']
        },
        defaultValue: undefined // = Import all locations define in LocationLevelIds
    },
    TRIP_METIERS_ENABLE: {
        key: 'sumaris.trip.metiers.enable',
        label: 'PROGRAM.OPTIONS.TRIP_METIERS_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_METIERS_HISTORY_NB_DAYS: {
        key: 'sumaris.trip.metiers.history.days',
        label: 'PROGRAM.OPTIONS.TRIP_METIERS_HISTORY_NB_DAYS',
        defaultValue: '30',
        type: 'integer'
    },
    TRIP_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE: {
        key: 'sumaris.trip.onboard.measurements.optional',
        label: 'PROGRAM.OPTIONS.TRIP_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_HELP_URL: {
        key: 'sumaris.trip.help.url',
        label: 'PROGRAM.OPTIONS.TRIP_HELP_URL',
        type: 'string'
    },
    TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_IDS: {
        key: 'sumaris.trip.gears.columns.pmfmIds',
        label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_IDS',
        defaultValue: null,
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'Pmfm',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['id', 'label', 'name'],
            columnSizes: [2, 4, 6]
        },
    },
    TRIP_PHYSICAL_GEAR_RANK_ORDER_ENABLE: {
        key: 'sumaris.trip.gear.rankOrder.enable',
        label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEAR_RANK_ORDER_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN: {
        key: 'sumaris.trip.gear.allowChildren',
        label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_PHYSICAL_GEAR_MIN_CHILDREN_COUNT: {
        key: 'sumaris.trip.gear.minChildrenCount',
        label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEAR_MIN_CHILDREN_COUNT',
        defaultValue: 2,
        type: 'integer'
    },
    TRIP_PHYSICAL_GEAR_HELP_MESSAGE: {
        key: 'sumaris.trip.gear.help.message',
        label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEAR_HELP_MESSAGE',
        defaultValue: undefined,
        type: 'string'
    },
    // Trip map
    TRIP_MAP_ENABLE: {
        key: 'sumaris.trip.map.enable',
        label: 'PROGRAM.OPTIONS.TRIP_MAP_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_MAP_CENTER: {
        key: 'sumaris.trip.map.center',
        label: 'PROGRAM.OPTIONS.TRIP_MAP_CENTER',
        defaultValue: '46.879966,-10',
        type: 'string'
    },
    TRIP_MAP_ZOOM: {
        key: 'sumaris.trip.map.zoom',
        label: 'PROGRAM.OPTIONS.TRIP_MAP_ZOOM',
        defaultValue: 5,
        type: 'integer'
    },
    TRIP_OPERATION_PASTE_FLAGS: {
        key: 'sumaris.trip.operation.paste.flags',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_PASTE_FLAGS',
        defaultValue: '0',
        type: 'enum',
        values: [
            {
                key: '' + OperationPasteFlags.NONE,
                value: 'PROGRAM.OPTIONS.TRIP_OPERATION_PASTE_FLAGS_ENUM.NONE'
            },
            {
                // eslint-disable-next-line no-bitwise
                key: '' + (OperationPasteFlags.DATE | OperationPasteFlags.POSITION | OperationPasteFlags.FISHING_AREA | OperationPasteFlags.GEAR | OperationPasteFlags.METIER),
                value: 'PROGRAM.OPTIONS.TRIP_OPERATION_PASTE_FLAGS_ENUM.DATE_POSITION_FISHING_AREA_GEAR_METIER'
            },
            {
                // eslint-disable-next-line no-bitwise
                key: '' + (OperationPasteFlags.DATE | OperationPasteFlags.TIME | OperationPasteFlags.POSITION | OperationPasteFlags.FISHING_AREA | OperationPasteFlags.GEAR | OperationPasteFlags.METIER),
                value: 'PROGRAM.OPTIONS.TRIP_OPERATION_PASTE_FLAGS_ENUM.DATE_TIME_POSITION_FISHING_AREA_GEAR_METIER'
            },
            {
                // eslint-disable-next-line no-bitwise
                key: '' + (OperationPasteFlags.DATE | OperationPasteFlags.POSITION | OperationPasteFlags.FISHING_AREA | OperationPasteFlags.MEASUREMENT | OperationPasteFlags.GEAR | OperationPasteFlags.METIER),
                value: 'PROGRAM.OPTIONS.TRIP_OPERATION_PASTE_FLAGS_ENUM.DATE_POSITION_FISHING_AREA_MEASUREMENT_GEAR_METIER'
            }
        ]
    },
    TRIP_OPERATION_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE: {
        key: 'sumaris.trip.operation.onboard.measurements.optional',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_OPERATION_HELP_URL: {
        key: 'sumaris.trip.operation.help.url',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_HELP_URL',
        type: 'string'
    },
    TRIP_POSITION_BOUNDING_BOX: {
        key: 'sumaris.trip.operation.position.boundingBox',
        label: 'PROGRAM.OPTIONS.TRIP_POSITION_BOUNDING_BOX',
        type: 'string' // expected BBox
    },
    TRIP_OPERATION_METIER_ENABLE: {
        key: 'sumaris.trip.operation.metier.enable',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_METIER_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_POSITION_ENABLE: {
        key: 'sumaris.trip.operation.position.enable',
        label: 'PROGRAM.OPTIONS.TRIP_POSITION_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_BATCH_ENABLE: {
        key: 'sumaris.trip.operation.batch.enable',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_BATCH_TAXON_NAME_ENABLE: {
        key: 'sumaris.trip.operation.batch.taxonName.enable',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_TAXON_NAME_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_BATCH_TAXON_GROUP_ENABLE: {
        key: 'sumaris.trip.operation.batch.taxonGroup.enable',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_TAXON_GROUP_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT: {
        key: 'sumaris.trip.operation.batch.taxonGroups.noWeight',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT',
        defaultValue: '',
        type: 'string'
    },
    TRIP_BATCH_TAXON_GROUPS_NO_LANDING: {
        key: 'sumaris.trip.operation.batch.taxonGroups.noLanding',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_TAXON_GROUPS_NO_LANDING',
        defaultValue: '',
        type: 'string'
    },
    TRIP_BATCH_AUTO_FILL: {
        key: 'sumaris.trip.operation.batch.autoFill',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_AUTO_FILL',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_BATCH_SAMPLING_RATIO_FORMAT: {
        key: 'sumaris.trip.operation.batch.samplingRatio.format',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_SAMPLING_RATIO_FORMAT',
        defaultValue: '%',
        type: 'enum',
        values: [
            {
                key: '%',
                value: 'TRIP.BATCH.EDIT.SAMPLING_RATIO_PCT'
            },
            {
                key: '1/w',
                value: 'TRIP.BATCH.EDIT.SAMPLING_COEFFICIENT'
            }
        ]
    },
    TRIP_BATCH_INDIVIDUAL_COUNT_COMPUTE: {
        key: 'sumaris.trip.operation.batch.individualCount.compute',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_INDIVIDUAL_COUNT_COMPUTE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_BATCH_MEASURE_INDIVIDUAL_COUNT_ENABLE: {
        key: 'sumaris.trip.operation.batch.individualCount.enable',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_INDIVIDUAL_COUNT_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_BATCH_MEASURE_INDIVIDUAL_TAXON_NAME_ENABLE: {
        key: 'sumaris.trip.operation.batch.individual.taxonName.enable',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_INDIVIDUAL_TAXON_NAME_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_BATCH_MEASURE_INDIVIDUAL_TAXON_GROUP_ENABLE: {
        key: 'sumaris.trip.operation.batch.individual.taxonGroup.enable',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_INDIVIDUAL_TAXON_GROUP_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_BATCH_MEASURE_INDIVIDUAL_WEIGHT_DISPLAYED_UNIT: {
        key: 'sumaris.trip.operation.batch.individual.weightUnit',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_INDIVIDUAL_WEIGHT_UNIT',
        type: 'enum',
        values: [
            {
                key: UnitLabel.KG,
                value: UnitLabel.KG
            },
            {
                key: UnitLabel.GRAM,
                value: UnitLabel.GRAM
            },
            {
                key: UnitLabel.MG,
                value: UnitLabel.MG
            },
            {
                key: UnitLabel.TON,
                value: UnitLabel.TON
            }
        ],
        // No default value (keep PMFM unit)
        //defaultValue: UnitLabel.KG
    },
    TRIP_BATCH_MEASURE_RANK_ORDER_COMPUTE: {
        key: 'sumaris.trip.operation.batch.rankOrder.compute',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_RANK_ORDER_COMPUTE',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_BATCH_MEASURE_ENABLE: {
        key: 'sumaris.trip.operation.batch.measure.enable',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_BATCH_WEIGHT_ENABLE: {
        key: 'sumaris.trip.operation.batch.weight.enable',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_WEIGHT_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE: {
        key: 'sumaris.trip.operation.batch.lengthWeightConversion.enable',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE',
        type: 'boolean',
        defaultValue: 'false'
    },
    TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID: {
        key: 'sumaris.trip.operation.batch.roundWeightConversion.country.id',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID',
        type: 'entity',
        autocomplete: {
            filter: {
                entityName: 'Location',
                levelId: LocationLevelIds.COUNTRY,
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['name']
        },
        defaultValue: undefined
    },
    TRIP_BATCH_MEASURE_ICHTHYOMETER_ENABLE: {
        key: 'sumaris.trip.operation.batch.ichthyometer.enable',
        label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_ICHTHYOMETER_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_SAMPLE_ENABLE: {
        key: 'sumaris.trip.operation.sample.enable',
        label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_SAMPLE_DATE_TIME_ENABLE: {
        key: 'sumaris.trip.operation.sample.dateTime.enable',
        label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_DATE_TIME_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_SAMPLE_TAXON_NAME_ENABLE: {
        key: 'sumaris.trip.operation.sample.taxonName.enable',
        label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_TAXON_NAME_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_SAMPLE_TAXON_GROUP_ENABLE: {
        key: 'sumaris.trip.operation.sample.taxonGroup.enable',
        label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_TAXON_GROUP_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_SAMPLE_LABEL_ENABLE: {
        key: 'sumaris.trip.operation.sample.label.enable',
        label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_LABEL_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_SAMPLE_IMAGES_ENABLE: {
        key: 'sumaris.trip.operation.sample.images.enable',
        label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_IMAGES_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_LATITUDE_SIGN: {
        key: 'sumaris.trip.operation.latitude.defaultSign',
        label: 'PROGRAM.OPTIONS.TRIP_LATITUDE_DEFAULT_SIGN',
        type: 'enum',
        values: [
            {
                key: '+',
                value: 'N'
            },
            {
                key: '-',
                value: 'S'
            }
        ]
    },
    TRIP_LONGITUDE_SIGN: {
        key: 'sumaris.trip.operation.longitude.defaultSign',
        label: 'PROGRAM.OPTIONS.TRIP_LONGITUDE_DEFAULT_SIGN',
        type: 'enum',
        values: [
            {
                key: '+',
                value: 'E'
            },
            {
                key: '-',
                value: 'W'
            }
        ]
    },
    TRIP_ALLOW_PARENT_OPERATION: {
        key: 'sumaris.trip.operation.allowParent',
        label: 'PROGRAM.OPTIONS.TRIP_ALLOW_PARENT_OPERATION',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_DISTANCE_MAX_WARNING: {
        key: 'sumaris.trip.operation.distanceMaxWarning',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_DISTANCE_MAX_WARNING',
        defaultValue: '0',
        type: 'integer'
    },
    TRIP_DISTANCE_MAX_ERROR: {
        key: 'sumaris.trip.operation.distanceMaxError',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_DISTANCE_MAX_ERROR',
        defaultValue: '0',
        type: 'integer'
    },
    TRIP_MIN_DURATION_HOURS: {
        key: 'sumaris.trip.minDurationInHours',
        label: 'PROGRAM.OPTIONS.TRIP_MIN_DURATION_HOURS',
        defaultValue: '1',
        type: 'integer'
    },
    TRIP_MAX_DURATION_HOURS: {
        key: 'sumaris.trip.maxDurationInHours',
        label: 'PROGRAM.OPTIONS.TRIP_MAX_DURATION_HOURS',
        defaultValue: '2400',
        type: 'integer'
    },
    TRIP_APPLY_DATE_ON_NEW_OPERATION: {
        key: 'sumaris.trip.operation.copyTripDates',
        label: 'PROGRAM.OPTIONS.TRIP_APPLY_DATE_ON_NEW_OPERATION',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_REPORT_ENABLE: {
        key: 'sumaris.trip.report.enable',
        label: 'PROGRAM.OPTIONS.TRIP_REPORT_ENABLE',
        type: 'boolean',
        defaultValue: 'false'
    },
    TRIP_REPORT_TYPE: {
        key: 'sumaris.trip.report.type',
        label: 'PROGRAM.OPTIONS.TRIP_REPORT_TYPE',
        type: 'enum',
        values: [
            {
                key: 'legacy',
                value: 'PROGRAM.OPTIONS.TRIP_REPORT_TYPE_LEGACY'
            },
            {
                key: 'selectivity',
                value: 'PROGRAM.OPTIONS.TRIP_REPORT_TYPE_SELECTIVITY'
            }
        ],
        defaultValue: 'legacy'
    },
    // Operation
    TRIP_OPERATION_EDITOR: {
        key: 'sumaris.operation.editor',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_EDITOR',
        type: 'enum',
        values: [
            {
                key: 'legacy',
                value: 'PROGRAM.OPTIONS.TRIP_OPERATION_EDITOR_LEGACY'
            },
            {
                key: 'selectivity',
                value: 'PROGRAM.OPTIONS.TRIP_OPERATION_EDITOR_SELECTIVITY'
            }
        ],
        defaultValue: 'legacy'
    },
    TRIP_OPERATION_METIER_FILTER: {
        key: 'sumaris.trip.operation.metier.filter',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_METIER_FILTER',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_OPERATION_FISHING_AREA_LOCATION_LEVEL_IDS: {
        key: 'sumaris.trip.operation.fishingArea.locationLevel.ids',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_FISHING_AREA_LOCATION_LEVEL_IDS',
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'LocationLevel',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['name']
        },
        defaultValue: LocationLevelIds.RECTANGLE_ICES.toString()
    },
    TRIP_OPERATION_METIER_TAXON_GROUP_TYPE_IDS: {
        key: 'sumaris.trip.operation.metier.taxonGroupType.ids',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_METIER_TAXON_GROUP_TYPE_IDS',
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'TaxonGroupType',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['name']
        },
        defaultValue: TaxonGroupTypeIds.METIER_DCF_5.toString()
    },
    TRIP_OPERATION_FISHING_START_DATE_ENABLE: {
        key: 'sumaris.trip.operation.fishingStartDateEnable',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_FISHING_START_DATE_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_OPERATION_FISHING_END_DATE_ENABLE: {
        key: 'sumaris.trip.operation.fishingEndDateEnable',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_FISHING_END_DATE_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    TRIP_OPERATION_END_DATE_ENABLE: {
        key: 'sumaris.trip.operation.endDateEnable',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_END_DATE_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    TRIP_OPERATION_MAX_SHOOTING_DURATION_HOURS: {
        key: 'sumaris.trip.operation.maxShootingDurationInHours',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_MAX_SHOOTING_DURATION_HOURS',
        defaultValue: '12',
        type: 'integer'
    },
    TRIP_OPERATION_MAX_TOTAL_DURATION_HOURS: {
        key: 'sumaris.trip.operation.maxTotalDurationInHours',
        label: 'PROGRAM.OPTIONS.TRIP_OPERATION_MAX_TOTAL_DURATION_HOURS',
        defaultValue: '2400',
        type: 'integer'
    },
    TRIP_EXTRACTION_SAMPLING_METHOD: {
        key: 'sumaris.trip.extraction.sampling.method',
        label: 'PROGRAM.OPTIONS.TRIP_EXTRACTION_SAMPLING_METHOD',
        type: 'enum',
        values: [
            {
                key: 'Observer',
                value: 'PROGRAM.OPTIONS.TRIP_EXTRACTION_SAMPLING_METHODS.OBSERVER'
            },
            {
                key: 'SelfSampling',
                value: 'PROGRAM.OPTIONS.TRIP_EXTRACTION_SAMPLING_METHODS.SELF_SAMPLING'
            }
        ],
        defaultValue: 'Observer' // See RDB/COST extraction specification
    },
    TRIP_EXTRACTION_AREA_LOCATION_LEVEL_IDS: {
        key: 'sumaris.trip.extraction.area.locationLevel.ids',
        label: 'PROGRAM.OPTIONS.TRIP_EXTRACTION_AREA_LOCATION_LEVEL_IDS',
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'LocationLevel',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['name']
        },
        defaultValue: null
    },
    TRIP_EXTRACTION_BATCH_DENORMALIZATION_ENABLE: {
        key: 'sumaris.trip.extraction.batch.denormalization.enable',
        label: 'PROGRAM.OPTIONS.TRIP_EXTRACTION_BATCH_DENORMALIZATION_ENABLE',
        type: 'boolean',
        defaultValue: 'false'
    },
    // Observed location
    OBSERVED_LOCATION_END_DATE_TIME_ENABLE: {
        key: 'sumaris.observedLocation.endDateTime.enable',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_END_DATE_TIME_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    OBSERVED_LOCATION_START_TIME_ENABLE: {
        key: 'sumaris.observedLocation.startTime.enable',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_START_TIME_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    OBSERVED_LOCATION_LOCATION_LEVEL_IDS: {
        key: 'sumaris.observedLocation.location.level.ids',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_LOCATION_LEVEL_IDS',
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'LocationLevel',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['name']
        },
        defaultValue: LocationLevelIds.PORT.toString()
    },
    OBSERVED_LOCATION_OBSERVERS_ENABLE: {
        key: 'sumaris.observedLocation.observers.enable',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_OBSERVERS_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE: {
        key: 'sumaris.observedLocation.aggregatedLandings.enable',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM: {
        key: 'sumaris.observedLocation.aggregatedLandings.program',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM',
        defaultValue: '',
        type: 'string'
    },
    OBSERVED_LOCATION_AGGREGATED_LANDINGS_START_DAY: {
        key: 'sumaris.observedLocation.aggregatedLandings.startDay',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_START_DAY',
        defaultValue: '1',
        type: 'integer'
    },
    OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT: {
        key: 'sumaris.observedLocation.aggregatedLandings.dayCount',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT',
        defaultValue: '7',
        type: 'integer'
    },
    OBSERVED_LOCATION_CREATE_VESSEL_ENABLE: {
        key: 'sumaris.observedLocation.createVessel.enable',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_CREATE_VESSEL_ENABLE',
        defaultValue: 'true',
        type: 'boolean'
    },
    OBSERVED_LOCATION_SHOW_LANDINGS_HISTORY: {
        key: 'sumaris.observedLocation.createLanding.history.enable',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_SHOW_LANDINGS_HISTORY',
        defaultValue: 'true',
        type: 'boolean'
    },
    OBSERVED_LOCATION_REPORT_ENABLE: {
        key: 'sumaris.observedLocation.report.enable',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_REPORT_ENABLE',
        type: 'boolean',
        defaultValue: 'false'
    },
    OBSERVED_LOCATION_CONTROL_ENABLE: {
        key: 'sumaris.observedLocation.control.enable',
        label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_CONTROL_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    VESSEL_TYPE_ENABLE: {
        key: 'sumaris.vessel.type.enable',
        label: 'PROGRAM.OPTIONS.VESSEL_TYPE_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    // Landing
    LANDING_EDITOR: {
        key: 'sumaris.landing.editor',
        label: 'PROGRAM.OPTIONS.LANDING_EDITOR',
        type: 'enum',
        values: [
            {
                key: 'landing',
                value: 'PROGRAM.OPTIONS.LANDING_EDITOR_LANDING'
            },
            {
                key: 'control',
                value: 'PROGRAM.OPTIONS.LANDING_EDITOR_CONTROL'
            },
            {
                key: 'trip',
                value: 'PROGRAM.OPTIONS.LANDING_EDITOR_TRIP'
            },
            {
                key: 'sampling',
                value: 'PROGRAM.OPTIONS.LANDING_EDITOR_SAMPLING'
            }
        ],
        defaultValue: 'landing'
    },
    LANDING_DATE_TIME_ENABLE: {
        key: 'sumaris.landing.dateTime.enable',
        label: 'PROGRAM.OPTIONS.LANDING_DATE_TIME_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    LANDING_CREATION_DATE_ENABLE: {
        key: 'sumaris.landing.creationDate.enable',
        label: 'PROGRAM.OPTIONS.LANDING_CREATION_DATE_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    LANDING_RECORDER_PERSON_ENABLE: {
        key: 'sumaris.landing.recorderPerson.enable',
        label: 'PROGRAM.OPTIONS.LANDING_RECORDER_PERSON_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE: {
        key: 'sumaris.landing.vesselBasePortLocation.enable',
        label: 'PROGRAM.OPTIONS.LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    LANDING_LOCATION_ENABLE: {
        key: 'sumaris.landing.location.enable',
        label: 'PROGRAM.OPTIONS.LANDING_LOCATION_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    LANDING_OBSERVERS_ENABLE: {
        key: 'sumaris.landing.observers.enable',
        label: 'PROGRAM.OPTIONS.LANDING_OBSERVERS_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    LANDING_STRATEGY_ENABLE: {
        key: 'sumaris.landing.strategy.enable',
        label: 'PROGRAM.OPTIONS.LANDING_STRATEGY_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    LANDING_SAMPLES_COUNT_ENABLE: {
        key: 'sumaris.landing.samplesCount.enable',
        label: 'PROGRAM.OPTIONS.LANDING_SAMPLES_COUNT_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    LANDING_FISHING_AREA_LOCATION_LEVEL_IDS: {
        key: 'sumaris.landing.fishingArea.locationLevel.ids',
        label: 'PROGRAM.OPTIONS.LANDING_FISHING_AREA_LOCATION_LEVEL_IDS',
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'LocationLevel',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['name']
        },
        defaultValue: LocationLevelGroups.FISHING_AREA.toString()
    },
    LANDING_SAMPLE_LABEL_ENABLE: {
        key: 'sumaris.landing.sample.label.enable',
        label: 'PROGRAM.OPTIONS.LANDING_SAMPLE_LABEL_ENABLE',
        type: 'boolean',
        defaultValue: 'false'
    },
    LANDING_SAMPLE_WEIGHT_UNIT: {
        key: 'sumaris.landing.samples.weightUnit',
        label: 'PROGRAM.OPTIONS.LANDING_SAMPLE_WEIGHT_UNIT',
        type: 'enum',
        values: [
            {
                key: UnitLabel.KG,
                value: UnitLabel.KG
            },
            {
                key: UnitLabel.GRAM,
                value: UnitLabel.GRAM
            },
            {
                key: UnitLabel.MG,
                value: UnitLabel.MG
            },
            {
                key: UnitLabel.TON,
                value: UnitLabel.TON
            }
        ],
        // No default value (keep PMFM unit)
        //defaultValue: UnitLabel.KG
    },
    LANDING_COLUMNS_PMFM_IDS: {
        key: 'sumaris.landing.columns.pmfmIds',
        label: 'PROGRAM.OPTIONS.LANDING_COLUMNS_PMFM_IDS',
        defaultValue: null,
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'Pmfm',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['id', 'label', 'name'],
            columnSizes: [2, 4, 6]
        },
    },
    /* -- Landed trip options -- */
    LANDED_TRIP_FISHING_AREA_LOCATION_LEVEL_IDS: {
        key: 'sumaris.landedTrip.fishingArea.locationLevel.ids',
        label: 'PROGRAM.OPTIONS.LANDED_TRIP_FISHING_AREA_LOCATION_LEVEL_IDS',
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'LocationLevel',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['name']
        },
        defaultValue: LocationLevelIds.RECTANGLE_ICES.toString()
    },
    /* -- Extraction options -- */
    EXTRACTION_FORMATS: {
        key: 'sumaris.extraction.formats',
        label: 'PROGRAM.OPTIONS.EXTRACTION_FORMATS',
        type: 'enums',
        values: [
            { key: 'NA', value: 'COMMON.EMPTY_OPTION' },
            { key: 'RDB', value: 'EXTRACTION.FORMAT.RDB.NAME' },
            { key: 'SURVIVAL_TEST', value: 'EXTRACTION.FORMAT.SURVIVAL_TEST.NAME' },
            { key: 'COST', value: 'EXTRACTION.FORMAT.COST.NAME' },
            { key: 'FREE1', value: 'EXTRACTION.FORMAT.FREE1.NAME' },
            { key: 'FREE2', value: 'EXTRACTION.FORMAT.FREE2.NAME' },
            { key: 'PMFM_TRIP', value: 'EXTRACTION.FORMAT.PMFM_TRIP.NAME' },
            { key: 'STRAT', value: 'EXTRACTION.FORMAT.STRAT.NAME' },
            { key: 'APASE', value: 'EXTRACTION.FORMAT.APASE.NAME' },
            { key: 'VESSEL', value: 'EXTRACTION.FORMAT.VESSEL.NAME' },
        ],
        autocomplete: {
            columnNames: ['key', 'value'],
            columnSizes: [4, 8],
            displayWith: (p) => p === null || p === void 0 ? void 0 : p.key
        },
        defaultValue: null // =  All
    },
    /* -- Program / Strategy options -- */
    STRATEGY_EDITOR_PREDOC_ENABLE: {
        key: 'sumaris.program.strategy.predoc.enable',
        label: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_PREDOC_ENABLE',
        type: 'boolean',
        defaultValue: 'false'
    },
    STRATEGY_EDITOR_PREDOC_FETCH_SIZE: {
        key: 'sumaris.program.strategy.predoc.fetchSize',
        label: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_PREDOC_FETCH_SIZE',
        type: 'integer',
        defaultValue: '100'
    },
    STRATEGY_EDITOR: {
        key: 'sumaris.program.strategy.editor',
        label: 'PROGRAM.OPTIONS.STRATEGY_EDITOR',
        type: 'enum',
        values: [
            {
                key: 'legacy',
                value: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_ENUM.LEGACY'
            },
            {
                key: 'sampling',
                value: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_ENUM.SAMPLING'
            }
        ],
        defaultValue: 'legacy'
    },
    STRATEGY_EDITOR_LOCATION_LEVEL_IDS: {
        key: 'sumaris.program.strategy.location.level.ids',
        label: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_LOCATION_LEVEL_IDS',
        type: 'entities',
        autocomplete: {
            filter: {
                entityName: 'LocationLevel',
                statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
            },
            attributes: ['name']
        },
        defaultValue: LocationLevelIds.DIVISION_ICES.toString()
    },
    STRATEGY_DEPARTMENT_ENABLE: {
        key: 'sumaris.program.strategy.department.enable',
        label: 'PROGRAM.OPTIONS.STRATEGY_DEPARTMENT_ENABLE',
        defaultValue: 'false',
        type: 'boolean'
    },
    I18N_SUFFIX: {
        key: 'sumaris.i18nSuffix',
        label: 'PROGRAM.OPTIONS.I18N_SUFFIX',
        type: 'enum',
        values: [
            {
                key: 'legacy',
                value: 'PROGRAM.OPTIONS.I18N_SUFFIX_LEGACY'
            },
            {
                key: 'SAMPLING.',
                value: 'PROGRAM.OPTIONS.I18N_SUFFIX_SAMPLING'
            },
            {
                key: 'SURVIVAL_TEST.',
                value: 'PROGRAM.OPTIONS.I18N_SUFFIX_SURVIVAL_TEST'
            },
            {
                key: 'ACCIDENTAL_CATCH.',
                value: 'PROGRAM.OPTIONS.I18N_SUFFIX_ACCIDENTAL_CATCH'
            },
            {
                key: 'AUCTION_CONTROL.',
                value: 'PROGRAM.OPTIONS.I18N_SUFFIX_AUCTION_CONTROL'
            },
            {
                key: 'TRAWL_SELECTIVITY.',
                value: 'PROGRAM.OPTIONS.I18N_SUFFIX_TRAWL_SELECTIVITY'
            }
        ],
        defaultValue: 'legacy'
    },
    /* -- Qualitative value options -- */
    MEASUREMENTS_MAX_VISIBLE_BUTTONS: {
        key: 'sumaris.measurements.maxVisibleButtons',
        label: 'PROGRAM.OPTIONS.MEASUREMENTS_MAX_VISIBLE_BUTTONS',
        type: 'integer',
        defaultValue: 4 // Use -1 for all
    },
    MEASUREMENTS_MAX_ITEM_COUNT_FOR_BUTTONS: {
        key: 'sumaris.measurements.maxItemCountForButtons',
        label: 'PROGRAM.OPTIONS.MEASUREMENTS_MAX_ITEM_COUNT_FOR_BUTTONS',
        type: 'integer',
        defaultValue: 12 // Use -1 for all
    },
});
export class ProgramPropertiesUtils {
    /**
     * Refresh default values, (e.g. after enumeration has been update)
     */
    static refreshDefaultValues() {
        console.info('[program-properties] Refreshing ProgramProperties default values...');
        ProgramProperties.STRATEGY_EDITOR_LOCATION_LEVEL_IDS.defaultValue = LocationLevelIds.DIVISION_ICES.toString();
        ProgramProperties.TRIP_LOCATION_LEVEL_IDS.defaultValue = LocationLevelIds.PORT.toString();
        ProgramProperties.TRIP_OPERATION_FISHING_AREA_LOCATION_LEVEL_IDS.defaultValue = LocationLevelIds.RECTANGLE_ICES.toString();
        ProgramProperties.TRIP_OPERATION_METIER_TAXON_GROUP_TYPE_IDS.defaultValue = TaxonGroupTypeIds.METIER_DCF_5.toString();
        ProgramProperties.OBSERVED_LOCATION_LOCATION_LEVEL_IDS.defaultValue = LocationLevelIds.PORT.toString();
        ProgramProperties.LANDED_TRIP_FISHING_AREA_LOCATION_LEVEL_IDS.defaultValue = LocationLevelIds.RECTANGLE_ICES.toString();
        ProgramProperties.LANDING_FISHING_AREA_LOCATION_LEVEL_IDS.defaultValue = LocationLevelGroups.FISHING_AREA.toString();
        ProgramProperties.TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID.autocomplete.filter.levelId = LocationLevelIds.COUNTRY;
    }
    static getPropertiesByType(type) {
        if (Array.isArray(type)) {
            return Object.getOwnPropertyNames(ProgramProperties).map(key => ProgramProperties[key])
                .filter(def => type.includes(def.type));
        }
        return Object.getOwnPropertyNames(ProgramProperties).map(key => ProgramProperties[key])
            .filter(def => type === def.type);
    }
    static getPropertiesByEntityName(entityName) {
        return this.getPropertiesByType(['entity', 'entities'])
            .filter(def => { var _a; return ((_a = def.autocomplete) === null || _a === void 0 ? void 0 : _a.filter) && def.autocomplete.filter.entityName === entityName; });
    }
    static getPropertyAsNumbersByEntityName(program, entityName) {
        if (!program || isNilOrBlank(entityName))
            throw new Error('Invalid argument. Missing program or entityName');
        const ids = this.getPropertiesByEntityName(entityName)
            .flatMap(property => program.getPropertyAsNumbers(property));
        return removeDuplicatesFromArray(ids);
    }
}
//# sourceMappingURL=program.config.js.map