import {FormFieldDefinition, FormFieldDefinitionMap} from "@sumaris-net/ngx-components";
import {LocationLevelIds} from "../model/model.enum";
import {StatusIds}  from "@sumaris-net/ngx-components";

export type LandingEditor = 'landing' | 'control' | 'trip' | 'sampling';

export type StrategyEditor = 'legacy' | 'sampling';

export const SAMPLING_STRATEGIES_FEATURE_NAME = 'samplingStrategies';

export const ProgramProperties = Object.freeze({
  // Trip
  TRIP_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.trip.location.level.ids',
    label: "PROGRAM.OPTIONS.TRIP_LOCATION_LEVEL_IDS",
    type: 'string',
    defaultValue: LocationLevelIds.PORT.toString()
  },
  TRIP_SALE_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.sale.enable",
    label: "PROGRAM.OPTIONS.TRIP_SALE_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_OBSERVERS_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.observers.enable",
    label: "PROGRAM.OPTIONS.TRIP_OBSERVERS_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_METIERS_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.metiers.enable",
    label: "PROGRAM.OPTIONS.TRIP_METIERS_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  TRIP_METIERS_HISTORY_NB_DAYS: <FormFieldDefinition>{
    key: "sumaris.trip.metiers.history.days",
    label: "PROGRAM.OPTIONS.TRIP_METIERS_HISTORY_NB_DAYS",
    defaultValue: "30",
    type: 'integer'
  },
  TRIP_ON_BOARD_MEASUREMENTS_OPTIONAL: <FormFieldDefinition>{
    key: 'sumaris.trip.onboard.measurements.optional',
    label: "PROGRAM.OPTIONS.TRIP_ON_BOARD_MEASUREMENTS_OPTIONAL",
    defaultValue: "false",
    type: 'boolean'
  },
  TRIP_PHYSICAL_GEAR_RANK_ORDER_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.gear.rankOrder.enable",
    label: "PROGRAM.OPTIONS.TRIP_PHYSICAL_GEAR_RANK_ORDER_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  // Trip map
  TRIP_MAP_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.map.enable",
    label: "PROGRAM.OPTIONS.TRIP_MAP_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_MAP_CENTER: <FormFieldDefinition>{
    key: "sumaris.trip.map.center",
    label: "PROGRAM.OPTIONS.TRIP_MAP_CENTER",
    defaultValue: "46.879966,-10",
    type: 'string'
  },
  TRIP_MAP_ZOOM: <FormFieldDefinition>{
    key: "sumaris.trip.map.zoom",
    label: "PROGRAM.OPTIONS.TRIP_MAP_ZOOM",
    defaultValue: 5,
    type: 'integer'
  },
  TRIP_BATCH_TAXON_NAME_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.operation.batch.taxonName.enable",
    label: "PROGRAM.OPTIONS.TRIP_BATCH_TAXON_NAME_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_BATCH_TAXON_GROUP_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.operation.batch.taxonGroup.enable",
    label: "PROGRAM.OPTIONS.TRIP_BATCH_TAXON_GROUP_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT: <FormFieldDefinition>{
    key: "sumaris.trip.operation.batch.taxonGroups.noWeight",
    label: "PROGRAM.OPTIONS.TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT",
    defaultValue: "",
    type: 'string'
  },
  TRIP_BATCH_AUTO_FILL: <FormFieldDefinition>{
    key: "sumaris.trip.operation.batch.autoFill",
    label: "PROGRAM.OPTIONS.TRIP_BATCH_AUTO_FILL",
    defaultValue: "false",
    type: 'boolean'
  },
  TRIP_BATCH_INDIVIDUAL_COUNT_COMPUTE: <FormFieldDefinition>{
    key: "sumaris.trip.operation.batch.individualCount.compute",
    label: "PROGRAM.OPTIONS.TRIP_BATCH_INDIVIDUAL_COUNT_COMPUTE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_BATCH_MEASURE_INDIVIDUAL_COUNT_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.operation.batch.individualCount.enable",
    label: "PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_INDIVIDUAL_COUNT_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_BATCH_MEASURE_RANK_ORDER_COMPUTE: <FormFieldDefinition>{
    key: "sumaris.trip.operation.batch.rankOrder.compute",
    label: "PROGRAM.OPTIONS.TRIP_BATCH_MEASURE_RANK_ORDER_COMPUTE",
    defaultValue: "false",
    type: 'boolean'
  },
  TRIP_SAMPLE_TAXON_NAME_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.operation.sample.taxonName.enable",
    label: "PROGRAM.OPTIONS.TRIP_SAMPLE_TAXON_NAME_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_SAMPLE_TAXON_GROUP_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.operation.sample.taxonGroup.enable",
    label: "PROGRAM.OPTIONS.TRIP_SAMPLE_TAXON_GROUP_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_SURVIVAL_TEST_TAXON_NAME_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.operation.survivalTest.taxonName.enable",
    label: "PROGRAM.OPTIONS.TRIP_SURVIVAL_TEST_TAXON_NAME_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_SURVIVAL_TEST_TAXON_GROUP_ENABLE: <FormFieldDefinition>{
    key: "sumaris.trip.operation.survivalTest.taxonGroup.enable",
    label: "PROGRAM.OPTIONS.TRIP_SURVIVAL_TEST_TAXON_GROUP_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  TRIP_LATITUDE_SIGN: <FormFieldDefinition>{
    key: "sumaris.trip.operation.latitude.defaultSign",
    label: "PROGRAM.OPTIONS.TRIP_LATITUDE_DEFAULT_SIGN",
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
  TRIP_LONGITUDE_SIGN: <FormFieldDefinition>{
    key: "sumaris.trip.operation.longitude.defaultSign",
    label: "PROGRAM.OPTIONS.TRIP_LONGITUDE_DEFAULT_SIGN",
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

  // Observed location
  OBSERVED_LOCATION_END_DATE_TIME_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.endDateTime.enable',
    label: "PROGRAM.OPTIONS.OBSERVED_LOCATION_END_DATE_TIME_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  OBSERVED_LOCATION_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.location.level.ids',
    label: "PROGRAM.OPTIONS.OBSERVED_LOCATION_LOCATION_LEVEL_IDS",
    type: 'string',
    defaultValue: LocationLevelIds.PORT.toString()
  },
  OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.aggregatedLandings.enable',
    label: "PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.aggregatedLandings.program',
    label: "PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM",
    defaultValue: "",
    type: 'string'
  },
  OBSERVED_LOCATION_AGGREGATED_LANDINGS_START_DAY: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.aggregatedLandings.startDay',
    label: "PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_START_DAY",
    defaultValue: "1",
    type: 'integer'
  },
  OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.aggregatedLandings.dayCount',
    label: "PROGRAM.OPTIONS.OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT",
    defaultValue: "7",
    type: 'integer'
  },
  OBSERVED_LOCATION_CREATE_VESSEL_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.createVessel.enable',
    label: "PROGRAM.OPTIONS.OBSERVED_LOCATION_CREATE_VESSEL_ENABLE",
    defaultValue: "true",
    type: 'boolean'
  },
  OBSERVED_LOCATION_SHOW_LANDINGS_HISTORY: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.createLanding.history.enable',
    label: "PROGRAM.OPTIONS.OBSERVED_LOCATION_SHOW_LANDINGS_HISTORY",
    defaultValue: "true",
    type: 'boolean'
  },

  VESSEL_TYPE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.vessel.type.enable',
    label: "PROGRAM.OPTIONS.VESSEL_TYPE_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },

  // Landing
  LANDING_EDITOR: <FormFieldDefinition>{
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
  LANDING_DATE_TIME_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.dateTime.enable',
    label: "PROGRAM.OPTIONS.LANDING_DATE_TIME_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  LANDING_CREATION_DATE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.creationDate.enable',
    label: "PROGRAM.OPTIONS.LANDING_CREATION_DATE_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  LANDING_RECORDER_PERSON_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.recorderPerson.enable',
    label: "PROGRAM.OPTIONS.LANDING_RECORDER_PERSON_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.vesselBasePortLocation.enable',
    label: "PROGRAM.OPTIONS.LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  LANDING_LOCATION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.location.enable',
    label: "PROGRAM.OPTIONS.LANDING_LOCATION_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  LANDING_OBSERVERS_ENABLE: <FormFieldDefinition>{
    key: "sumaris.landing.observers.enable",
    label: "PROGRAM.OPTIONS.LANDING_OBSERVERS_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  LANDING_STRATEGY_ENABLE: <FormFieldDefinition>{
    key: "sumaris.landing.strategy.enable",
    label: "PROGRAM.OPTIONS.LANDING_STRATEGY_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },
  LANDING_SAMPLES_COUNT_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.landing.samplesCount.enable',
    label: "PROGRAM.OPTIONS.LANDING_SAMPLES_COUNT_ENABLE",
    defaultValue: "false",
    type: 'boolean'
  },

  /* -- Landed trip options -- */

  LANDED_TRIP_FISHING_AREA_LOCATION_LEVEL_IDS: <FormFieldDefinition>{
    key: 'sumaris.landedTrip.fishingArea.locationLevel.ids',
    label: 'PROGRAM.OPTIONS.LANDED_TRIP_FISHING_AREA_LOCATION_LEVEL_IDS',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: LocationLevelIds.ICES_RECTANGLE.toString()
  },

  /* -- Program / Strategy options -- */

  STRATEGY_EDITOR_PREDOC_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.program.strategy.predoc.fetchSize',
    label: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_PREDOC_ENABLE',
    type: 'integer',
    defaultValue: '50'
  },
  STRATEGY_EDITOR_PREDOC_FETCH_SIZE: <FormFieldDefinition>{
    key: 'sumaris.program.strategy.predoc.fetchSize',
    label: 'PROGRAM.OPTIONS.STRATEGY_EDITOR_PREDOC_FETCH_SIZE',
    type: 'integer',
    defaultValue: '50'
  },
  STRATEGY_EDITOR: <FormFieldDefinition>{
    key: "sumaris.program.strategy.editor",
    label: "PROGRAM.OPTIONS.STRATEGY_EDITOR",
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
    defaultValue: "legacy"
  },

  I18N_SUFFIX: <FormFieldDefinition>{
    key: "sumaris.i18nSuffix",
    label: "PROGRAM.OPTIONS.I18N_SUFFIX",
    type: 'enum',
    values: [
      {
        key: 'legacy',
        value: 'PROGRAM.OPTIONS.I18N_SUFFIX_LEGACY'
      },
      {
        key: 'SAMPLING.',
        value: 'PROGRAM.OPTIONS.I18N_SUFFIX_SAMPLING'
      }
    ],
    defaultValue: 'legacy'
  },

  /* -- QUalitative value options -- */

  MEASUREMENTS_MAX_VISIBLE_BUTTONS: <FormFieldDefinition>{
    key: 'sumaris.measurements.maxVisibleButtons',
    label: 'PROGRAM.OPTIONS.MEASUREMENTS_MAX_VISIBLE_BUTTONS',
    type: 'integer',
    defaultValue: 4 // Use -1 for all
  },
});

