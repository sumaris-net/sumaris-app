import { TypePolicies } from '@apollo/client/core';
import {FormFieldDefinition, PRIORITIZED_AUTHORITIES, StatusIds} from '@sumaris-net/ngx-components';
import DurationConstructor = moment.unitOfTime.DurationConstructor;
import {ReferentialRefFilter} from '@app/referential/services/filter/referential-ref.filter';

export const DATA_GRAPHQL_TYPE_POLICIES = <TypePolicies>{
  'DataReferenceVO': {
    keyFields: ['entityName', 'id']
  }
};

export const DATA_IMPORT_PERIODS:readonly { value: number; unit: DurationConstructor }[] = Object.freeze([
  {value: 1, unit: 'week'},
  {value: 15, unit: 'day'},
  {value: 1, unit: 'month'},
  {value: 3, unit: 'month'},
  {value: 6, unit: 'month'}
]);

export const DATA_CONFIG_OPTIONS = Object.freeze({
  ENTITY_TRASH: <FormFieldDefinition> {
    key: 'sumaris.persistence.trash.enable',
    label: 'CONFIGURATION.OPTIONS.ENTITY_TRASH',
    type: 'boolean',
    defaultValue: true
  },
  SAMPLE_HASH_OPTIMIZATION: <FormFieldDefinition> {
    key: 'sumaris.persistence.sample.hashOptimization',
    label: 'CONFIGURATION.OPTIONS.SAMPLE_HASH_OPTIMIZATION',
    type: 'boolean',
    defaultValue: false
  },
  SAMPLE_UNIQUE_TAG: <FormFieldDefinition>{
    key: "sumaris.persistence.sample.uniqueTag",
    label: "CONFIGURATION.OPTIONS.SAMPLE_UNIQUE_TAG",
    type: 'boolean',
    defaultValue: false
  },
  BATCH_HASH_OPTIMIZATION: <FormFieldDefinition> {
    key: 'sumaris.persistence.batch.hashOptimization',
    label: 'CONFIGURATION.OPTIONS.BATCH_HASH_OPTIMIZATION',
    type: 'boolean',
    defaultValue: false
  },
  PHYSICAL_GEAR_HASH_OPTIMIZATION: <FormFieldDefinition> {
    key: 'sumaris.persistence.physicalGear.hashOptimization',
    label: 'CONFIGURATION.OPTIONS.PHYSICAL_GEAR_HASH_OPTIMIZATION',
    type: 'boolean',
    defaultValue: false
  },
  ACCESS_PROGRAM_IDS: <FormFieldDefinition>{
    key: "sumaris.data.program.ids",
    label: "CONFIGURATION.OPTIONS.ACCESS_PROGRAM_IDS",
    type: 'entities',
    autocomplete: {
      attributes: ['label'],
      filter: <ReferentialRefFilter>{
        entityName: 'Program',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }
    },
    defaultValue: '',
  },
  ACCESS_NOT_SELF_DATA_ROLE: <FormFieldDefinition>{
    key: "sumaris.data.accessNotSelfData.role",
    label: "CONFIGURATION.OPTIONS.ACCESS_NOT_SELF_DATA_MIN_ROLE",
    type: 'enum',
    values: PRIORITIZED_AUTHORITIES.map(key => ({
      key: 'ROLE_' + key,
      value: 'USER.PROFILE_ENUM.' + key
    }))
  },
  ACCESS_NOT_SELF_DATA_DEPARTMENT_IDS: <FormFieldDefinition>{
    key: 'sumaris.data.accessNotSelfData.department.ids',
    label: 'CONFIGURATION.OPTIONS.ACCESS_NOT_SELF_DATA_DEPARTMENT_IDS',
    type: 'entities',
    autocomplete: {
      attributes: ['label'],
      filter: <ReferentialRefFilter>{
        entityName: 'Department',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }
    },
    defaultValue: '',

  },
  QUALITY_PROCESS_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.data.quality.process.enable',
    label: 'CONFIGURATION.OPTIONS.DATA_QUALITY_PROCESS_ENABLE',
    type: 'boolean',
    defaultValue: true
  },
  SHOW_RECORDER: <FormFieldDefinition>{
    key: 'sumaris.data.show.recorder.enable',
    label: 'CONFIGURATION.OPTIONS.DATA_SHOW_RECORDER',
    type: 'boolean',
    defaultValue: true
  },
  SHOW_OBSERVERS: <FormFieldDefinition>{
    key: 'sumaris.data.show.observer.enable',
    label: 'CONFIGURATION.OPTIONS.DATA_SHOW_OBSERVERS',
    type: 'boolean',
    defaultValue: true
  },
  SHOW_FILTER_PROGRAM: <FormFieldDefinition>{
    key: 'sumaris.data.landing.show.filter.program.enable',
    label: 'CONFIGURATION.OPTIONS.LANDING.FILTER_PROGRAM',
    type: 'boolean',
    defaultValue: true
  },
  SHOW_FILTER_LOCATION: <FormFieldDefinition>{
    key: 'sumaris.data.landing.show.filter.location.enable',
    label: 'CONFIGURATION.OPTIONS.LANDING.FILTER_LOCATION',
    type: 'boolean',
    defaultValue: true
  },
  SHOW_FILTER_PERIOD: <FormFieldDefinition>{
    key: 'sumaris.data.landing.show.filter.period.enable',
    label: 'CONFIGURATION.OPTIONS.LANDING.FILTER_PERIOD',
    type: 'boolean',
    defaultValue: true
  },
  DATA_IMPORT_DEFAULT_PERIOD: <FormFieldDefinition>{
    key: 'sumaris.data.import.predoc.period',
    label: 'CONFIGURATION.OPTIONS.DATA_IMPORT_DEFAULT_PERIOD',
    type: 'enum',
    defaultValue: '1 month',
    values: DATA_IMPORT_PERIODS.map(({value, unit}) => ({
      key: `${value} ${unit}`,
      value: `${value} ${unit}`
    }))
  },
  DATA_IMAGES_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.data.images.enable',
    label: 'CONFIGURATION.OPTIONS.DATA_IMAGES_ENABLE',
    type: 'boolean',
    defaultValue: 'false'
  }
});