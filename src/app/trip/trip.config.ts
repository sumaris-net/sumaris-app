import { EntitiesStorageTypePolicies, EntityStoreTypePolicy, FormFieldDefinition } from '@sumaris-net/ngx-components';
import { Operation, Trip } from './trip/trip.model';
import { TypePolicies } from '@apollo/client/core';
import { ObservedLocation } from './observedlocation/observed-location.model';
import { Landing } from './landing/landing.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { UnitLabel } from '@app/referential/services/model/model.enum';

/**
 * Name of the features (e.g. to be used by settings)
 */
export const TRIP_FEATURE_NAME = 'trip';
export const OBSERVED_LOCATION_FEATURE_NAME = 'observedLocation';

/**
 * Define configuration options
 */
export const TRIP_CONFIG_OPTIONS = Object.freeze({
  TRIP_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.trip.enable',
    label: 'TRIP.OPTIONS.ENABLE',
    type: 'boolean'
  },
  TRIP_NAME: <FormFieldDefinition>{
    key: 'sumaris.trip.name',
    label: 'TRIP.OPTIONS.NAME',
    type: 'enum',
    values: [
      {
        key: 'MENU.TRIPS',
        value: 'MENU.TRIPS'
      },
      {
        key: 'MENU.LOGBOOKS',
        value: 'MENU.LOGBOOKS'
      }
    ],
    defaultValue: 'MENU.TRIPS'
  },
  OBSERVED_LOCATION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.enable',
    label: 'OBSERVED_LOCATION.OPTIONS.ENABLE',
    type: 'boolean'
  },
  OBSERVED_LOCATION_NAME: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.name',
    label: 'OBSERVED_LOCATION.OPTIONS.NAME',
    type: 'enum',
    values: [
      {
        key: 'MENU.OBSERVATIONS',
        value: 'MENU.OBSERVATIONS'
      },
      {
        key: 'MENU.OCCASIONS',
        value: 'MENU.OCCASIONS'
      },
      {
        key: 'MENU.AUCTION_OCCASIONS',
        value: 'MENU.AUCTION_OCCASIONS'
      }
    ],
    defaultValue: 'MENU.OCCASIONS'
  },
  OBSERVED_LOCATION_LANDINGS_TAB_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.landings.tab.enable',
    label: 'OBSERVED_LOCATION.OPTIONS.LANDINGS_TAB_ENABLE',
    type: 'boolean',
    defaultValue: 'false'
  }
});

export const TRIP_LOCAL_SETTINGS_OPTIONS = Object.freeze({
  SAMPLE_WEIGHT_UNIT: <FormFieldDefinition>{
    key: 'sumaris.trip.samples.weightUnit',
    label: 'TRIP.SAMPLE.SETTINGS.SAMPLE_WEIGHT_UNIT',
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
    // No default value (keep program or PMFM unit)
    //defaultValue: UnitLabel.KG
  },

  OPERATION_GEOLOCATION_TIMEOUT: <FormFieldDefinition>{
    key: 'sumaris.trip.operation.geolocation.timeout',
    label: 'TRIP.OPERATION.SETTINGS.GEOLOCATION_TIMEOUT',
    type: 'enum',
    values: [
      {
        key: '20',
        value: '20'
      },
      {
        key: '40',
        value: '40'
      },
      {
        key: '60',
        value: '60'
      }
    ],
    // 40s
    defaultValue: '40'
  }
});

export const TRIP_GRAPHQL_TYPE_POLICIES = <TypePolicies>{
  'MeasurementVO': {
    keyFields: ['entityName', 'id']
  },
  'AggregatedLandingVO': {
    keyFields: ['observedLocationId', 'vesselSnapshot', ['id']]
  },
  'VesselActivityVO': {
    keyFields: ['date', 'rankOrder', 'observedLocationId', 'tripId'] //'landingId',
  }
};

/**
 * Define the way the entities will be stored into the local storage
 */
export const TRIP_STORAGE_TYPE_POLICIES = <EntitiesStorageTypePolicies>{
  'TripVO': <EntityStoreTypePolicy<Trip>>{
    mode: 'by-id',
    skipNonLocalEntities: true,
    lightFieldsExcludes: ['measurements', 'sale', 'gears', 'operationGroups', 'operations']
  },

  'OperationVO': <EntityStoreTypePolicy<Operation>>{
    mode: 'by-id',
    skipNonLocalEntities: false, //
    lightFieldsExcludes: <(keyof Operation)[]>[
      'gearMeasurements',
      'catchBatch',
      'samples',
      // Keep only childOperationId and parentOperationId, but NOT entities
      'childOperation', 'parentOperation'
    ]

  },

  'ObservedLocationVO': <EntityStoreTypePolicy<ObservedLocation>>{
    mode: 'by-id',
    skipNonLocalEntities: true
  },

  'LandingVO': <EntityStoreTypePolicy<Landing>>{
    mode: 'by-id',
    skipNonLocalEntities: true,
    lightFieldsExcludes: ["samples"]
  },

  // 'AggregatedLandingVO': <EntityStoreTypePolicy<AggregatedLanding>>{
  //   mode: 'default',
  //   skipNonLocalEntities: true,
  //   lightFieldsExcludes: ['vesselActivities']
  // },
  //
  // 'VesselActivityVO': <EntityStoreTypePolicy<VesselActivity>>{
  //   mode: 'default',
  //   skipNonLocalEntities: true,
  //   lightFieldsExcludes: ['metiers']
  // },

  // Entity used to to generate local ids, and store historical data
  // TODO: use 'Remote#' for historical data
  'PhysicalGearVO': <EntityStoreTypePolicy<PhysicalGear>>{
    skipNonLocalEntities: false // Keep remote entities
  },

  // Fake entity, use to store historical data
  'Remote#LandingVO': <EntityStoreTypePolicy<Landing>>{
    skipNonLocalEntities: false // Keep remote entities
  }
};

