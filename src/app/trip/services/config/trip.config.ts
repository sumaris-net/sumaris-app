import { EntitiesStorageTypePolicies, EntityStoreTypePolicy, FormFieldDefinition } from '@sumaris-net/ngx-components';
import { Operation, Trip } from '../model/trip.model';
import { TypePolicies } from '@apollo/client/core';
import { ObservedLocation } from '../model/observed-location.model';
import { Landing } from '../model/landing.model';
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
  }
});

export const TRIP_LOCAL_SETTINGS_OPTIONS = Object.freeze({
  SAMPLE_BURST_MODE_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.sample.modal.enableBurstMode',
    label: 'TRIP.SAMPLE.SETTINGS.BURST_MODE_ENABLE',
    type: 'boolean',
    defaultValue: true
  },
  SAMPLE_WEIGHT_UNIT: <FormFieldDefinition>{
    key: 'sumaris.landing.samples.weightUnit',
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

