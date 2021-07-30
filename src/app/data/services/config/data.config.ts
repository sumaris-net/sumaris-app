import {TypePolicies} from '@apollo/client/core';
import {FormFieldDefinition, PRIORITIZED_AUTHORITIES} from '@sumaris-net/ngx-components';
import {UnitLabel} from '@app/referential/services/model/model.enum';

export const DATA_GRAPHQL_TYPE_POLICIES = <TypePolicies>{
  'DataReferenceVO': {
    keyFields: ['entityName', 'id']
  }
};

export const DATA_CONFIG_OPTIONS = Object.freeze({
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
    defaultValue: '',
    type: 'string'
  },
  CHECK_SAMPLE_UNIQUE_TAG: <FormFieldDefinition>{
    key: "sumaris.persistence.sample.uniqueTag",
    label: "CONFIGURATION.OPTIONS.CHECK_SAMPLE_UNIQUE_TAG",
    type: 'boolean',
    defaultValue: false
  },
  ENTITY_TRASH: <FormFieldDefinition> {
    key: 'sumaris.persistence.trash.enable',
    label: 'CONFIGURATION.OPTIONS.ENTITY_TRASH',
    type: 'boolean',
    defaultValue: true
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
  SHOW_OBSERVERS: <FormFieldDefinition>{
    key: 'sumaris.data.show.observer.enable',
    label: 'CONFIGURATION.OPTIONS.DATA_SHOW_OBSERVERS',
    type: 'boolean',
    defaultValue: true
  },
  WEIGHT_DISPLAYED_UNIT: <FormFieldDefinition>{
    key: 'sumaris.data.UnitLabel.weightUnit',
    label: 'CONFIGURATION.OPTIONS.DEFAULT_WEIGHT_UNIT',
    type: 'string',
    defaultValue: UnitLabel.KG
  },

});
