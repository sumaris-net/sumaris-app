import { EntitiesStorageTypePolicies, EntityStoreTypePolicy, FormFieldDefinition, StatusIds } from '@sumaris-net/ngx-components';
import { TypePolicies } from '@apollo/client/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ProgramFilter } from '@app/referential/services/filter/program.filter';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';

/**
 * Name of the features (e.g. to be used by settings)
 */
export const ACTIVITY_CALENDAR_FEATURE_NAME = 'activityCalendar';
export const ACTIVITY_CALENDAR_FEATURE_DEFAULT_PROGRAM_FILTER: Partial<ProgramFilter> = Object.freeze({
  statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
  acquisitionLevelLabels: [AcquisitionLevelCodes.ACTIVITY_CALENDAR, AcquisitionLevelCodes.MONTHLY_ACTIVITY]
});

/**
 * Define configuration options
 */
export const ACTIVITY_CALENDAR_CONFIG_OPTIONS = Object.freeze({
  ACTIVITY_CALENDAR_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.enable',
    label: 'ACTIVITY_CALENDAR.OPTIONS.ENABLE',
    type: 'boolean'
  },
  ACTIVITY_CALENDAR_NAME: <FormFieldDefinition>{
    key: 'sumaris.activityCalendar.name',
    label: 'ACTIVITY_CALENDAR.OPTIONS.NAME',
    type: 'enum',
    values: [
      {
        key: 'MENU.ACTIVITY_CALENDAR',
        value: 'MENU.ACTIVITY_CALENDAR'
      }
    ],
    defaultValue: 'MENU.ACTIVITY_CALENDAR'
  },
});

export const ACTIVITY_CALENDAR_LOCAL_SETTINGS_OPTIONS = Object.freeze({

});

export const ACTIVITY_CALENDAR_GRAPHQL_TYPE_POLICIES = <TypePolicies>{
  DataOriginVO: {
    keyFields: ['vesselUseFeaturesId', 'gearUseFeaturesId', 'program', ['id']]
  }
};

/**
 * Define the way the entities will be stored into the local storage
 */
export const ACTIVITY_CALENDAR_STORAGE_TYPE_POLICIES = <EntitiesStorageTypePolicies>{
  ActivityCalendarVO: <EntityStoreTypePolicy<ActivityCalendar>>{
    mode: 'by-id',
    skipNonLocalEntities: false, // Need remote for predoc
    lightFieldsExcludes: ['measurementValues', 'vesselUseFeatures', 'gearUseFeatures']
  }
};

