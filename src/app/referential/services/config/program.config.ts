import { FormFieldDefinition, FormFieldType, isNilOrBlank, Property, removeDuplicatesFromArray, StatusIds } from '@sumaris-net/ngx-components';
import { LocationLevelGroups, LocationLevelIds, ProgramLabel, UnitLabel } from '../model/model.enum';
import { TaxonGroupTypeIds } from '@app/referential/services/model/taxon-group.model';
import { Program } from '@app/referential/services/model/program.model';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { DataStrategyResolutions } from '@app/data/form/data-editor.utils';

export type LandingEditor = 'landing' | 'control' | 'trip' | 'sampling' | 'sale';
export type OperationEditor = 'legacy' | 'selectivity' | 'advanced';
export type StrategyEditor = 'legacy' | 'sampling';
export type TripExtractionSamplingMethod = 'Observer' | 'SelfSampling';

export type TripReportType = 'legacy' | 'selectivity' | 'onboard' | 'form' | 'form-blank';

export type ActivityCalendarReportType = 'form' | 'form-blank';

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
  ALL: 1 + 2 + 4 + 8 + 16 + 32 + 64,
});

export const ProgramProperties = Object.freeze({
  // Access right
  DATA_OBSERVERS_CAN_WRITE: <FormFieldDefinition>{
    key: 'sumaris.data.observers.canWrite',
    label: 'PROGRAM.OPTIONS.DATA_OBSERVERS_CAN_WRITE',
    type: 'boolean',
    defaultValue: false,
  },

  // Strategies resolution
  DATA_STRATEGY_RESOLUTION: <FormFieldDefinition>{
    key: 'sumaris.data.strategy.resolution',
    label: 'PROGRAM.OPTIONS.DATA_STRATEGY_RESOLUTION',
    type: 'enum',
    values: [
      {
        key: DataStrategyResolutions.LAST,
        value: 'PROGRAM.OPTIONS.DATA_STRATEGY_RESOLUTION_ENUM.LAST',
      },
      {
        key: DataStrategyResolutions.USER_SELECT,
        value: 'PROGRAM.OPTIONS.DATA_STRATEGY_RESOLUTION_ENUM.USER_SELECT',
      },
      {
        key: DataStrategyResolutions.SPATIO_TEMPORAL,
        value: 'PROGRAM.OPTIONS.DATA_STRATEGY_RESOLUTION_ENUM.SPATIO_TEMPORAL',
      },
      {
        key: DataStrategyResolutions.NONE,
        value: 'PROGRAM.OPTIONS.DATA_STRATEGY_RESOLUTION_ENUM.NONE',
      },
    ],

    defaultValue: DataStrategyResolutions.LAST, // Need for backward compatibility
    // DEV only ---
    // defaultValue: DataStrategyResolutions.SPATIO_TEMPORAL
  },

  // Trip
  TRIP_SAMPLING_STRATA_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.samplingStrata.enable',
    label: 'PROGRAM.OPTIONS.TRIP_SAMPLING_STRATA_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.trip.location.level.ids',
    label: 'PROGRAM.OPTIONS.TRIP_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: LocationLevelIds.PORT.toString(),
  },
  TRIP_LOCATION_FILTER_MIN_LENGTH: <FormFieldDefinition>{
    key: 'sumaris.trip.location.filter.searchText.minLength',
    label: 'PROGRAM.OPTIONS.TRIP_LOCATION_FILTER_SEARCH_TEXT_MIN_LENGTH',
    type: 'integer',
    defaultValue: 0,
  },
  TRIP_SALE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.sale.enable',
    label: 'PROGRAM.OPTIONS.TRIP_SALE_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_OBSERVERS_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.observers.enable',
    label: 'PROGRAM.OPTIONS.TRIP_OBSERVERS_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_OFFLINE_IMPORT_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.trip.offline.import.location.level.ids',
    label: 'PROGRAM.OPTIONS.TRIP_OFFLINE_IMPORT_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: undefined, // = Import all locations define in LocationLevelIds
  },
  TRIP_METIERS_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.metiers.enable',
    label: 'PROGRAM.OPTIONS.TRIP_METIERS_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_METIERS_HISTORY_NB_DAYS: <FormFieldDefinition>{
    key: 'sumaris.trip.metiers.history.days',
    label: 'PROGRAM.OPTIONS.TRIP_METIERS_HISTORY_NB_DAYS',
    defaultValue: '30',
    type: 'integer',
  },
  TRIP_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE: <FormFieldDefinition>{
    key: 'sumaris.trip.onboard.measurements.optional',
    label: 'PROGRAM.OPTIONS.TRIP_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_HELP_URL: <FormFieldDefinition>{
    key: 'sumaris.trip.help.url',
    label: 'PROGRAM.OPTIONS.TRIP_HELP_URL',
    type: 'string',
  },
  TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_IDS: <FormFieldDefinition>{
    key: 'sumaris.trip.gears.columns.pmfmIds',
    label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_IDS',
    defaultValue: null,
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'Pmfm',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['id', 'label', 'name'],
      columnSizes: [2, 4, 6],
    },
  },
  TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_HIDE_EMPTY: <FormFieldDefinition>{
    key: 'sumaris.trip.gears.columns.pmfm.hideIfEmpty',
    label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_HIDE_EMPTY',
    defaultValue: false,
    type: 'boolean',
  },
  TRIP_PHYSICAL_GEAR_RANK_ORDER_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.gear.rankOrder.enable',
    label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEAR_RANK_ORDER_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN: <FormFieldDefinition>{
    key: 'sumaris.trip.gear.allowChildren',
    label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_PHYSICAL_GEAR_MIN_CHILDREN_COUNT: <FormFieldDefinition>{
    key: 'sumaris.trip.gear.minChildrenCount',
    label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEAR_MIN_CHILDREN_COUNT',
    defaultValue: 2,
    type: 'integer',
  },
  TRIP_PHYSICAL_GEAR_HELP_MESSAGE: <FormFieldDefinition>{
    key: 'sumaris.trip.gear.help.message',
    label: 'PROGRAM.OPTIONS.TRIP_PHYSICAL_GEAR_HELP_MESSAGE',
    defaultValue: undefined,
    type: 'string',
  },
  // Trip map
  TRIP_MAP_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.map.enable',
    label: 'PROGRAM.OPTIONS.TRIP_MAP_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_MAP_CENTER: <FormFieldDefinition>{
    key: 'sumaris.trip.map.center',
    label: 'PROGRAM.OPTIONS.TRIP_MAP_CENTER',
    defaultValue: '46.879966,-10',
    type: 'string',
  },
  TRIP_MAP_ZOOM: <FormFieldDefinition>{
    key: 'sumaris.trip.map.zoom',
    label: 'PROGRAM.OPTIONS.TRIP_MAP_ZOOM',
    defaultValue: 5,
    type: 'integer',
  },
  TRIP_OPERATION_PASTE_FLAGS: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.paste.flags',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_PASTE_FLAGS',
    defaultValue: '0', // None
    type: 'enum',
    values: [
      {
        key: '' + OperationPasteFlags.NONE,
        value: 'PROGRAM.OPTIONS.TRIP_OPERATION_PASTE_FLAGS_ENUM.NONE',
      },
      {
        // eslint-disable-next-line no-bitwise
        key:
          '' +
          (OperationPasteFlags.DATE |
            OperationPasteFlags.POSITION |
            OperationPasteFlags.FISHING_AREA |
            OperationPasteFlags.GEAR |
            OperationPasteFlags.METIER),
        value: 'PROGRAM.OPTIONS.TRIP_OPERATION_PASTE_FLAGS_ENUM.DATE_POSITION_FISHING_AREA_GEAR_METIER',
      },
      {
        // eslint-disable-next-line no-bitwise
        key:
          '' +
          (OperationPasteFlags.DATE |
            OperationPasteFlags.TIME |
            OperationPasteFlags.POSITION |
            OperationPasteFlags.FISHING_AREA |
            OperationPasteFlags.GEAR |
            OperationPasteFlags.METIER),
        value: 'PROGRAM.OPTIONS.TRIP_OPERATION_PASTE_FLAGS_ENUM.DATE_TIME_POSITION_FISHING_AREA_GEAR_METIER',
      },
      {
        // eslint-disable-next-line no-bitwise
        key:
          '' +
          (OperationPasteFlags.DATE |
            OperationPasteFlags.POSITION |
            OperationPasteFlags.FISHING_AREA |
            OperationPasteFlags.MEASUREMENT |
            OperationPasteFlags.GEAR |
            OperationPasteFlags.METIER),
        value: 'PROGRAM.OPTIONS.TRIP_OPERATION_PASTE_FLAGS_ENUM.DATE_POSITION_FISHING_AREA_MEASUREMENT_GEAR_METIER',
      },
    ],
  },
  TRIP_OPERATION_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.onboard.measurements.optional',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_OPERATION_HELP_URL: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.help.url',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_HELP_URL',
    type: 'string',
  },
  TRIP_POSITION_BOUNDING_BOX: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.position.boundingBox',
    label: 'PROGRAM.OPTIONS.TRIP_POSITION_BOUNDING_BOX',
    type: 'string', // expected BBox
  },
  TRIP_OPERATION_METIER_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.metier.enable',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_METIER_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_POSITION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.position.enable',
    label: 'PROGRAM.OPTIONS.TRIP_POSITION_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_BATCH_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_BATCH_TAXON_NAME_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.taxonName.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_TAXON_NAME_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_BATCH_TAXON_GROUP_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.taxonGroup.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_TAXON_GROUP_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.taxonGroups.noWeight',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT',
    defaultValue: '',
    type: 'string',
  },
  TRIP_BATCH_TAXON_GROUPS_NO_LANDING: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.taxonGroups.noLanding',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_TAXON_GROUPS_NO_LANDING',
    defaultValue: '',
    type: 'string',
  },
  TRIP_BATCH_AUTO_FILL: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.autoFill',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_AUTO_FILL',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_BATCH_SAMPLING_RATIO_FORMAT: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.samplingRatio.format',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_SAMPLING_RATIO_FORMAT',
    defaultValue: '%',
    type: 'enum',
    values: [
      {
        key: <SamplingRatioFormat>'%',
        value: 'TRIP.BATCH.EDIT.SAMPLING_RATIO_PCT',
      },
      {
        key: <SamplingRatioFormat>'1/w',
        value: 'TRIP.BATCH.EDIT.SAMPLING_COEFFICIENT',
      },
    ],
  },
  TRIP_BATCH_EXHAUSTIVE_INVENTORY_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.exhaustiveInventory.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_EXHAUSTIVE_INVENTORY_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_BATCH_INDIVIDUAL_COUNT_COMPUTE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.individualCount.compute',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_INDIVIDUAL_COUNT_COMPUTE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_BATCH_MEASURE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.measure.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_BATCH_MEASURE_INDIVIDUAL_COUNT_ONLY_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.measure.individualCountOnly.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_INDIVIDUAL_COUNT_ONLY_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_BATCH_MEASURE_INDIVIDUAL_COUNT_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.individualCount.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_INDIVIDUAL_COUNT_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_BATCH_MEASURE_INDIVIDUAL_TAXON_NAME_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.individual.taxonName.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_INDIVIDUAL_TAXON_NAME_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_BATCH_MEASURE_INDIVIDUAL_TAXON_GROUP_ENABLE: <FormFieldDefinition>{
    // not used but present by convention with other options
    key: 'sumaris.trip.operation.batch.individual.taxonGroup.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_INDIVIDUAL_TAXON_GROUP_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_BATCH_MEASURE_INDIVIDUAL_WEIGHT_DISPLAYED_UNIT: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.individual.weightUnit',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_INDIVIDUAL_WEIGHT_UNIT',
    type: 'enum',
    values: [
      {
        key: UnitLabel.KG,
        value: UnitLabel.KG,
      },
      {
        key: UnitLabel.GRAM,
        value: UnitLabel.GRAM,
      },
      {
        key: UnitLabel.MG,
        value: UnitLabel.MG,
      },
      {
        key: UnitLabel.TON,
        value: UnitLabel.TON,
      },
    ],
    // No default value (keep PMFM unit)
    //defaultValue: UnitLabel.KG
  },
  TRIP_BATCH_MEASURE_RANK_ORDER_COMPUTE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.rankOrder.compute',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_RANK_ORDER_COMPUTE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_BATCH_WEIGHT_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.weight.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_WEIGHT_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.lengthWeightConversion.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE',
    type: 'boolean',
    defaultValue: 'false',
  },
  TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.roundWeightConversion.country.id',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID',
    type: 'entity',
    autocomplete: {
      filter: <ReferentialRefFilter>{
        entityName: 'Location',
        levelId: LocationLevelIds.COUNTRY,
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: undefined,
  },
  TRIP_BATCH_MEASURE_ICHTHYOMETER_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.batch.ichthyometer.enable',
    label: 'PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_ICHTHYOMETER_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_SAMPLE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.sample.enable',
    label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_SAMPLE_DATE_TIME_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.sample.dateTime.enable',
    label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_DATE_TIME_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_SAMPLE_TAXON_NAME_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.sample.taxonName.enable',
    label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_TAXON_NAME_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_SAMPLE_TAXON_GROUP_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.sample.taxonGroup.enable',
    label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_TAXON_GROUP_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_SAMPLE_LABEL_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.sample.label.enable',
    label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_LABEL_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_SAMPLE_IMAGES_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.sample.images.enable',
    label: 'PROGRAM.OPTIONS.TRIP_SAMPLE_IMAGES_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_LATITUDE_SIGN: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.latitude.defaultSign',
    label: 'PROGRAM.OPTIONS.TRIP_LATITUDE_DEFAULT_SIGN',
    type: 'enum',
    values: [
      {
        key: '+',
        value: 'N',
      },
      {
        key: '-',
        value: 'S',
      },
    ],
  },
  TRIP_LONGITUDE_SIGN: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.longitude.defaultSign',
    label: 'PROGRAM.OPTIONS.TRIP_LONGITUDE_DEFAULT_SIGN',
    type: 'enum',
    values: [
      {
        key: '+',
        value: 'E',
      },
      {
        key: '-',
        value: 'W',
      },
    ],
  },
  TRIP_ALLOW_PARENT_OPERATION: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.allowParent',
    label: 'PROGRAM.OPTIONS.TRIP_ALLOW_PARENT_OPERATION',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_DISTANCE_MAX_WARNING: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.distanceMaxWarning',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_DISTANCE_MAX_WARNING',
    defaultValue: '0',
    type: 'integer',
  },
  TRIP_DISTANCE_MAX_ERROR: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.distanceMaxError',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_DISTANCE_MAX_ERROR',
    defaultValue: '0',
    type: 'integer',
  },
  TRIP_MIN_DURATION_HOURS: <FormFieldDefinition>{
    key: 'sumaris.trip.minDurationInHours',
    label: 'PROGRAM.OPTIONS.TRIP_MIN_DURATION_HOURS',
    defaultValue: '1', // 1 hour
    type: 'integer',
  },
  TRIP_MAX_DURATION_HOURS: <FormFieldDefinition>{
    key: 'sumaris.trip.maxDurationInHours',
    label: 'PROGRAM.OPTIONS.TRIP_MAX_DURATION_HOURS',
    defaultValue: '2400', // 100 days
    type: 'integer',
  },
  TRIP_APPLY_DATE_ON_NEW_OPERATION: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.copyTripDates',
    label: 'PROGRAM.OPTIONS.TRIP_APPLY_DATE_ON_NEW_OPERATION',
    defaultValue: 'false',
    type: 'boolean',
  },

  TRIP_REPORT_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.report.enable',
    label: 'PROGRAM.OPTIONS.TRIP_REPORT_ENABLE',
    type: 'boolean',
    defaultValue: 'false',
  },
  TRIP_REPORT_TYPE: <FormFieldDefinition>{
    key: 'sumaris.trip.report.type',
    label: 'PROGRAM.OPTIONS.TRIP_REPORT_TYPE',
    type: 'enums',
    values: [
      {
        key: <TripReportType>'legacy',
        value: 'PROGRAM.OPTIONS.TRIP_REPORT_TYPE_LEGACY',
      },
      {
        key: <TripReportType>'selectivity',
        value: 'PROGRAM.OPTIONS.TRIP_REPORT_TYPE_TRAWL_SELECTIVITY',
      },
      // {
      //   key: <TripReportType>'onboard',
      //   value: 'PROGRAM.OPTIONS.TRIP_REPORT_TYPE_ONBOARD_OBSERVATION',
      // },
      {
        key: <TripReportType>'form',
        value: 'PROGRAM.OPTIONS.TRIP_REPORT_TYPE_FORM',
      },
      {
        key: <TripReportType>'form-blank',
        value: 'PROGRAM.OPTIONS.TRIP_REPORT_TYPE_FORM_BLANK',
      },
    ],
    autocomplete: {
      columnNames: ['key', 'value'],
      columnSizes: [4, 8],
      displayWith: (p) => p?.key,
    },
    defaultValue: <TripReportType>'legacy',
  },
  TRIP_REPORT_FORM_SUBTITLE: <FormFieldDefinition>{
    key: 'sumaris.trip.report.form.subtitle',
    label: 'PROGRAM.OPTIONS.TRIP_REPORT_FORM_SUBTITLE',
    type: 'string',
  },
  TRIP_REPORT_FORM_FOOTER: <FormFieldDefinition>{
    key: 'sumaris.trip.report.form.footer',
    label: 'PROGRAM.OPTIONS.TRIP_REPORT_FORM_FOOTER',
    type: 'string',
  },
  TRIP_REPORT_FORM_LOGO_HEAD_LEFT_URL: <FormFieldDefinition>{
    key: 'sumaris.trip.report.form.logo.head.left.url',
    label: 'PROGRAM.OPTIONS.TRIP_REPORT_FORM_LOGO_HEAD_LEFT_URL',
    type: 'string',
  },
  TRIP_REPORT_FORM_LOGO_HEAD_RIGHT_URL: <FormFieldDefinition>{
    key: 'sumaris.trip.report.form.logo.head.right.url',
    label: 'PROGRAM.OPTIONS.TRIP_REPORT_FORM_LOGO_HEAD_RIGHT_URL',
    type: 'string',
  },

  // Operation
  TRIP_OPERATION_EDITOR: <FormFieldDefinition>{
    key: 'sumaris.operation.editor',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_EDITOR',
    type: 'enum',
    values: [
      {
        key: <OperationEditor>'legacy',
        value: 'PROGRAM.OPTIONS.TRIP_OPERATION_EDITOR_LEGACY',
      },
      {
        key: <OperationEditor>'selectivity',
        value: 'PROGRAM.OPTIONS.TRIP_OPERATION_EDITOR_TRAWL_SELECTIVITY',
      },
      {
        key: <OperationEditor>'advanced',
        value: 'PROGRAM.OPTIONS.TRIP_OPERATION_EDITOR_ADVANCED',
      },
    ],
    defaultValue: <OperationEditor>'legacy',
  },
  TRIP_OPERATION_METIER_FILTER: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.metier.filter',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_METIER_FILTER',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_OPERATION_FISHING_AREA_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.fishingArea.locationLevel.ids',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_FISHING_AREA_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: LocationLevelIds.RECTANGLE_ICES.toString(),
  },
  TRIP_OPERATION_METIER_TAXON_GROUP_TYPE_IDS: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.metier.taxonGroupType.ids',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_METIER_TAXON_GROUP_TYPE_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'TaxonGroupType',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: TaxonGroupTypeIds.METIER_DCF_5.toString(),
  },
  TRIP_OPERATION_FISHING_START_DATE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.fishingStartDateEnable',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_FISHING_START_DATE_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_OPERATION_FISHING_END_DATE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.fishingEndDateEnable',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_FISHING_END_DATE_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  TRIP_OPERATION_END_DATE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.endDateEnable',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_END_DATE_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  TRIP_OPERATION_MAX_SHOOTING_DURATION_HOURS: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.maxShootingDurationInHours',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_MAX_SHOOTING_DURATION_HOURS',
    defaultValue: '12', // 12 hours
    type: 'integer',
  },
  TRIP_OPERATION_MAX_TOTAL_DURATION_HOURS: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.maxTotalDurationInHours',
    label: 'PROGRAM.OPTIONS.TRIP_OPERATION_MAX_TOTAL_DURATION_HOURS',
    defaultValue: '2400', // 100 days
    type: 'integer',
  },
  TRIP_EXTRACTION_SAMPLING_METHOD: <FormFieldDefinition>{
    key: 'sumaris.trip.extraction.sampling.method',
    label: 'PROGRAM.OPTIONS.TRIP_EXTRACTION_SAMPLING_METHOD',
    type: 'enum',
    values: [
      {
        key: <TripExtractionSamplingMethod>'Observer',
        value: 'PROGRAM.OPTIONS.TRIP_EXTRACTION_SAMPLING_METHODS.OBSERVER',
      },
      {
        key: <TripExtractionSamplingMethod>'SelfSampling',
        value: 'PROGRAM.OPTIONS.TRIP_EXTRACTION_SAMPLING_METHODS.SELF_SAMPLING',
      },
    ],
    defaultValue: 'Observer', // See RDB/COST extraction specification
  },
  TRIP_EXTRACTION_AREA_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.trip.extraction.area.locationLevel.ids',
    label: 'PROGRAM.OPTIONS.TRIP_EXTRACTION_AREA_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: null,
  },

  TRIP_EXTRACTION_BATCH_DENORMALIZATION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.extraction.batch.denormalization.enable',
    label: 'PROGRAM.OPTIONS.TRIP_EXTRACTION_BATCH_DENORMALIZATION_ENABLE',
    type: 'boolean',
    defaultValue: 'false',
  },

  // Observed location
  OBSERVED_LOCATION_SAMPLING_STRATA_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.samplingStrata.enable',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_SAMPLING_STRATA_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  OBSERVED_LOCATION_OFFLINE_IMPORT_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.offline.import.location.level.ids',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_OFFLINE_IMPORT_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: undefined, // = Import all locations define in LocationLevelIds
  },
  OBSERVED_LOCATION_END_DATE_TIME_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.endDateTime.enable',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_END_DATE_TIME_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  OBSERVED_LOCATION_END_DATE_REQUIRED: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.endDate.required',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_END_DATE_REQUIRED',
    defaultValue: 'false',
    type: 'boolean',
  },
  OBSERVED_LOCATION_START_TIME_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.startTime.enable',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_START_TIME_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  OBSERVED_LOCATION_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.location.level.ids',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: LocationLevelIds.PORT.toString(),
  },
  OBSERVED_LOCATION_OBSERVERS_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.observers.enable',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_OBSERVERS_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },

  OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.aggregatedLandings.enable',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.aggregatedLandings.program',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM',
    defaultValue: '',
    type: 'string',
  },
  OBSERVED_LOCATION_AGGREGATED_LANDINGS_START_DAY: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.aggregatedLandings.startDay',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_START_DAY',
    defaultValue: '1',
    type: 'integer',
  },
  OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.aggregatedLandings.dayCount',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT',
    defaultValue: '7',
    type: 'integer',
  },
  OBSERVED_LOCATION_CREATE_VESSEL_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.createVessel.enable',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_CREATE_VESSEL_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  OBSERVED_LOCATION_SHOW_LANDINGS_HISTORY: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.createLanding.history.enable',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_SHOW_LANDINGS_HISTORY',
    defaultValue: 'true',
    type: 'boolean',
  },
  OBSERVED_LOCATION_REPORT_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.report.enable',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_REPORT_ENABLE',
    type: 'boolean',
    defaultValue: 'false',
  },
  OBSERVED_LOCATION_CONTROL_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.control.enable',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_CONTROL_ENABLE',
    defaultValue: 'false', // FIXME: should be enable by default, when error translations will be OK
    type: 'boolean',
  },
  OBSERVED_LOCATION_STRATEGY_CARD_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.strategyCard.enable',
    label: 'PROGRAM.OPTIONS.OBSERVED_LOCATION_STRATEGY_CARD_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },

  VESSEL_TYPE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.vessel.type.enable',
    label: 'PROGRAM.OPTIONS.VESSEL_TYPE_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },

  // Landing
  LANDING_EDITOR: <FormFieldDefinition>{
    key: 'sumaris.landing.editor',
    label: 'PROGRAM.OPTIONS.LANDING_EDITOR',
    type: 'enum',
    values: [
      {
        key: <LandingEditor>'landing',
        value: 'PROGRAM.OPTIONS.LANDING_EDITOR_LANDING',
      },
      {
        key: <LandingEditor>'control',
        value: 'PROGRAM.OPTIONS.LANDING_EDITOR_CONTROL',
      },
      {
        key: <LandingEditor>'trip',
        value: 'PROGRAM.OPTIONS.LANDING_EDITOR_TRIP',
      },
      {
        key: <LandingEditor>'sampling',
        value: 'PROGRAM.OPTIONS.LANDING_EDITOR_SAMPLING',
      },
      {
        key: <LandingEditor>'sale',
        value: 'PROGRAM.OPTIONS.LANDING_EDITOR_SALE',
      },
    ],
    defaultValue: <LandingEditor>'landing',
  },
  LANDING_DATE_TIME_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.dateTime.enable',
    label: 'PROGRAM.OPTIONS.LANDING_DATE_TIME_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  LANDING_CREATION_DATE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.creationDate.enable',
    label: 'PROGRAM.OPTIONS.LANDING_CREATION_DATE_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  LANDING_RECORDER_PERSON_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.recorderPerson.enable',
    label: 'PROGRAM.OPTIONS.LANDING_RECORDER_PERSON_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.vesselBasePortLocation.enable',
    label: 'PROGRAM.OPTIONS.LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  LANDING_LOCATION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.location.enable',
    label: 'PROGRAM.OPTIONS.LANDING_LOCATION_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  LANDING_OBSERVERS_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.observers.enable',
    label: 'PROGRAM.OPTIONS.LANDING_OBSERVERS_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  LANDING_STRATEGY_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.strategy.enable',
    label: 'PROGRAM.OPTIONS.LANDING_STRATEGY_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  LANDING_BATCH_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.batch.enable',
    label: 'PROGRAM.OPTIONS.LANDING_BATCH_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  LANDING_SAMPLE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.sample.enable',
    label: 'PROGRAM.OPTIONS.LANDING_SAMPLE_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  LANDING_SAMPLES_COUNT_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.samplesCount.enable',
    label: 'PROGRAM.OPTIONS.LANDING_SAMPLES_COUNT_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  LANDING_FISHING_AREA_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.landing.fishingArea.locationLevel.ids',
    label: 'PROGRAM.OPTIONS.LANDING_FISHING_AREA_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: LocationLevelGroups.FISHING_AREA.toString(),
  },
  LANDING_SAMPLE_LABEL_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.sample.label.enable',
    label: 'PROGRAM.OPTIONS.LANDING_SAMPLE_LABEL_ENABLE',
    type: 'boolean',
    defaultValue: 'false',
  },
  LANDING_SAMPLE_WEIGHT_UNIT: <FormFieldDefinition>{
    key: 'sumaris.landing.samples.weightUnit',
    label: 'PROGRAM.OPTIONS.LANDING_SAMPLE_WEIGHT_UNIT',
    type: 'enum',
    values: [
      {
        key: UnitLabel.KG,
        value: UnitLabel.KG,
      },
      {
        key: UnitLabel.GRAM,
        value: UnitLabel.GRAM,
      },
      {
        key: UnitLabel.MG,
        value: UnitLabel.MG,
      },
      {
        key: UnitLabel.TON,
        value: UnitLabel.TON,
      },
    ],
    // No default value (keep PMFM unit)
    //defaultValue: UnitLabel.KG
  },

  LANDING_COLUMNS_PMFM_IDS: <FormFieldDefinition>{
    key: 'sumaris.landing.columns.pmfmIds',
    label: 'PROGRAM.OPTIONS.LANDING_COLUMNS_PMFM_IDS',
    defaultValue: null,
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'Pmfm',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['id', 'label', 'name'],
      columnSizes: [2, 4, 6],
    },
  },
  LANDING_MIN_OBSERVED_SPECIES_COUNT: <FormFieldDefinition>{
    key: 'sumaris.landing.minObservedSpeciesCount',
    label: 'PROGRAM.OPTIONS.LANDING_MIN_OBSERVED_SPECIES_COUNT',
    defaultValue: '15',
    type: 'integer',
  },

  /* -- Sale -- */

  SALE_BATCH_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.sale.batch.enable',
    label: 'PROGRAM.OPTIONS.SALE_BATCH_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },

  /* -- Landed trip options -- */

  LANDED_TRIP_FISHING_AREA_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.landedTrip.fishingArea.locationLevel.ids',
    label: 'PROGRAM.OPTIONS.LANDED_TRIP_FISHING_AREA_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: LocationLevelIds.RECTANGLE_ICES.toString(),
  },

  /* -- Activity calendar -- */

  ACTIVITY_CALENDAR_VESSEL_COUNTRY_ID: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.vessel.country.id',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_VESSEL_COUNTRY_ID',
    type: 'entity',
    autocomplete: {
      filter: <ReferentialRefFilter>{
        entityName: 'Location',
        levelId: LocationLevelIds.COUNTRY,
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: undefined,
  },
  ACTIVITY_CALENDAR_CREATE_VESSEL_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.createVessel.enable',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_CREATE_VESSEL_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  ACTIVITY_CALENDAR_BASE_PORT_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.basePortLocation.level.ids',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_BASE_PORT_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: LocationLevelIds.PORT.toString(),
  },
  ACTIVITY_CALENDAR_VESSEL_BASE_PORT_LOCATION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.vesselBasePortLocation.enable',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_VESSEL_BASE_PORT_LOCATION_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },
  ACTIVITY_CALENDAR_METIER_TAXON_GROUP_TYPE_IDS: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.metier.taxonGroupType.ids',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_METIER_TAXON_GROUP_TYPE_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'TaxonGroupType',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: TaxonGroupTypeIds.METIER_NATIONAL.toString(),
  },
  ACTIVITY_CALENDAR_FISHING_AREA_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.fishingArea.location.level.ids',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_FISHING_AREA_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: LocationLevelGroups.FISHING_AREA.join(','),
  },
  ACTIVITY_CALENDAR_REPORT_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.report.enable',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_REPORT_ENABLE',
    defaultValue: 'true',
    type: 'boolean',
  },
  ACTIVITY_CALENDAR_PREDOC_PROGRAM_LABELS: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.predoc.program.labels',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_PREDOC_PROGRAM_LABELS',
    defaultValue: ProgramLabel.SIH_ACTIPRED,
    type: 'string',
  },

  ACTIVITY_CALENDAR_REPORT_TYPE: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.report.type',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_REPORT_TYPE',
    type: 'enums',
    values: [
      {
        key: <ActivityCalendarReportType>'form',
        value: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_TYPE_FORM',
      },
      {
        key: <ActivityCalendarReportType>'form-blank',
        value: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_TYPE_FORM_BLANK',
      },
    ],
    autocomplete: {
      columnNames: ['key', 'value'],
      columnSizes: [4, 8],
      displayWith: (p) => p?.key,
    },
    defaultValue: <ActivityCalendarReportType>'form',
  },
  ACTIVITY_CALENDAR_REPORT_FORM_FOOTER: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.report.form.footer',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_FORM_FOOTER',
    type: 'string',
  },
  ACTIVITY_CALENDAR_REPORT_FORM_LOGO_HEAD_LEFT_URL: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.report.form.logo.head.left.url',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_REPORT_FORM_LOGO_HEAD_LEFT_URL',
    type: 'string',
  },
  ACTIVITY_CALENDAR_REPORT_FORM_LOGO_HEAD_RIGHT_URL: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.report.form.logo.head.right.url',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_REPORT_FORM_LOGO_HEAD_RIGHT_URL',
    type: 'string',
  },
  ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_METIER: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.report.form.blank.nbMetier',
    label: 'PROGRAM.OPTIONS.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_METIER',
    type: 'integer',
    defaultValue: 4,
  },
  ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_FISHING_AREA_PER_METIER: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.report.form.blank.nbMetier',
    label: 'PROGRAM.OPTIONS.OPTIONS.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_FISHING_AREA_PER_METIER',
    type: 'integer',
    defaultValue: 2,
  },

  /* -- Extraction options -- */

  EXTRACTION_FORMATS: <FormFieldDefinition>{
    key: 'sumaris.extraction.formats',
    label: 'PROGRAM.OPTIONS.EXTRACTION_FORMATS',
    type: 'enums',
    values: [
      <Property>{ key: 'NA', value: 'COMMON.EMPTY_OPTION' }, // Used to disabled extraction
      <Property>{ key: 'RDB', value: 'EXTRACTION.FORMAT.RDB.NAME' },
      <Property>{ key: 'SURVIVAL_TEST', value: 'EXTRACTION.FORMAT.SURVIVAL_TEST.NAME' },
      <Property>{ key: 'COST', value: 'EXTRACTION.FORMAT.COST.NAME' },
      <Property>{ key: 'FREE1', value: 'EXTRACTION.FORMAT.FREE1.NAME' },
      <Property>{ key: 'FREE2', value: 'EXTRACTION.FORMAT.FREE2.NAME' },
      <Property>{ key: 'PMFM_TRIP', value: 'EXTRACTION.FORMAT.PMFM_TRIP.NAME' },
      <Property>{ key: 'STRAT', value: 'EXTRACTION.FORMAT.STRAT.NAME' },
      <Property>{ key: 'APASE', value: 'EXTRACTION.FORMAT.APASE.NAME' },
      <Property>{ key: 'VESSEL', value: 'EXTRACTION.FORMAT.VESSEL.NAME' },
    ],
    autocomplete: {
      columnNames: ['key', 'value'],
      columnSizes: [4, 8],
      displayWith: (p) => p?.key,
    },
    defaultValue: null, // =  All
  },

  /* -- Program / Strategy options -- */

  STRATEGY_EDITOR_PREDOC_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.program.strategy.predoc.enable',
    label: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_PREDOC_ENABLE',
    type: 'boolean',
    defaultValue: 'false',
  },
  STRATEGY_EDITOR_PREDOC_FETCH_SIZE: <FormFieldDefinition>{
    key: 'sumaris.program.strategy.predoc.fetchSize',
    label: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_PREDOC_FETCH_SIZE',
    type: 'integer',
    defaultValue: '100',
  },
  STRATEGY_EDITOR: <FormFieldDefinition>{
    key: 'sumaris.program.strategy.editor',
    label: 'PROGRAM.OPTIONS.STRATEGY_EDITOR',
    type: 'enum',
    values: [
      {
        key: 'legacy',
        value: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_ENUM.LEGACY',
      },
      {
        key: 'sampling',
        value: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_ENUM.SAMPLING',
      },
    ],
    defaultValue: 'legacy',
  },
  STRATEGY_EDITOR_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.program.strategy.location.level.ids',
    label: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_LOCATION_LEVEL_IDS',
    type: 'entities',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
      attributes: ['name'],
    },
    defaultValue: LocationLevelIds.DIVISION_ICES.toString(),
  },
  STRATEGY_DEPARTMENT_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.program.strategy.department.enable',
    label: 'PROGRAM.OPTIONS.STRATEGY_DEPARTMENT_ENABLE',
    defaultValue: 'false',
    type: 'boolean',
  },

  I18N_SUFFIX: <FormFieldDefinition>{
    key: 'sumaris.i18nSuffix',
    label: 'PROGRAM.OPTIONS.I18N_SUFFIX',
    type: 'enum',
    values: [
      {
        key: 'legacy',
        value: 'PROGRAM.OPTIONS.I18N_SUFFIX_LEGACY',
      },
      {
        key: 'SAMPLING.',
        value: 'PROGRAM.OPTIONS.I18N_SUFFIX_SAMPLING',
      },
      {
        key: 'SURVIVAL_TEST.',
        value: 'PROGRAM.OPTIONS.I18N_SUFFIX_SURVIVAL_TEST',
      },
      {
        key: 'ACCIDENTAL_CATCH.',
        value: 'PROGRAM.OPTIONS.I18N_SUFFIX_ACCIDENTAL_CATCH',
      },
      {
        key: 'AUCTION_CONTROL.',
        value: 'PROGRAM.OPTIONS.I18N_SUFFIX_AUCTION_CONTROL',
      },
      {
        key: 'TRAWL_SELECTIVITY.',
        value: 'PROGRAM.OPTIONS.I18N_SUFFIX_TRAWL_SELECTIVITY',
      },
      {
        key: 'ONBOARD_OBSERVATION.',
        value: 'PROGRAM.OPTIONS.I18N_SUFFIX_ONBOARD_OBSERVATION',
      },
      {
        key: 'OBSERVED_SALE.',
        value: 'PROGRAM.OPTIONS.I18N_SUFFIX_OBSERVED_SALE',
      },
    ],
    defaultValue: 'legacy',
  },

  /* -- Qualitative value options -- */

  MEASUREMENTS_MAX_VISIBLE_BUTTONS: <FormFieldDefinition>{
    key: 'sumaris.measurements.maxVisibleButtons',
    label: 'PROGRAM.OPTIONS.MEASUREMENTS_MAX_VISIBLE_BUTTONS',
    type: 'integer',
    defaultValue: 4, // Use -1 for all
  },
  MEASUREMENTS_MAX_ITEM_COUNT_FOR_BUTTONS: <FormFieldDefinition>{
    key: 'sumaris.measurements.maxItemCountForButtons',
    label: 'PROGRAM.OPTIONS.MEASUREMENTS_MAX_ITEM_COUNT_FOR_BUTTONS',
    type: 'integer',
    defaultValue: 12, // Use -1 for all
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
    ProgramProperties.LANDING_FISHING_AREA_LOCATION_LEVEL_IDS.defaultValue = LocationLevelGroups.FISHING_AREA.join(',');
    ProgramProperties.TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID.autocomplete.filter.levelId = LocationLevelIds.COUNTRY;
    ProgramProperties.ACTIVITY_CALENDAR_BASE_PORT_LOCATION_LEVEL_IDS.defaultValue = LocationLevelIds.PORT.toString();
    ProgramProperties.ACTIVITY_CALENDAR_VESSEL_COUNTRY_ID.autocomplete.filter.levelId = LocationLevelIds.COUNTRY;
    ProgramProperties.ACTIVITY_CALENDAR_FISHING_AREA_LOCATION_LEVEL_IDS.defaultValue = LocationLevelGroups.FISHING_AREA.join(',');
    ProgramProperties.ACTIVITY_CALENDAR_METIER_TAXON_GROUP_TYPE_IDS.defaultValue = TaxonGroupTypeIds.METIER_NATIONAL.toString();
  }

  static getPropertiesByType(type: FormFieldType | FormFieldType[]): FormFieldDefinition[] {
    if (Array.isArray(type)) {
      return Object.getOwnPropertyNames(ProgramProperties)
        .map((key) => ProgramProperties[key])
        .filter((def) => type.includes(def.type));
    }
    return Object.getOwnPropertyNames(ProgramProperties)
      .map((key) => ProgramProperties[key])
      .filter((def) => type === def.type);
  }

  static getPropertiesByEntityName(entityName: string): FormFieldDefinition[] {
    return this.getPropertiesByType(['entity', 'entities']).filter(
      (def) => def.autocomplete?.filter && def.autocomplete.filter.entityName === entityName
    );
  }

  static getPropertyAsNumbersByEntityName(program: Program, entityName: string): number[] {
    if (!program || isNilOrBlank(entityName)) throw new Error('Invalid argument. Missing program or entityName');

    const ids = this.getPropertiesByEntityName(entityName).flatMap((property) => program.getPropertyAsNumbers(property));

    return removeDuplicatesFromArray(ids);
  }
}
