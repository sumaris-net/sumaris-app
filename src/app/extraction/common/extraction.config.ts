import {TypePolicies} from "@apollo/client/core";
import {FormFieldDefinition, PRIORITIZED_AUTHORITIES} from '@sumaris-net/ngx-components';

export const EXTRACTION_GRAPHQL_TYPE_POLICIES = <TypePolicies>{
  /*'ExtractionTypeVO': {
    keyFields: ['label'],
    merge: (existing, incoming, options) => {
      console.warn('[extraction_config] TODO: check merging function for ExtractionTypeVO', existing, incoming, options);
      return {
        ...existing,
        ...incoming
      };
    }
  }*/
};

/**
 * Define configuration options
 */
export const EXTRACTION_CONFIG_OPTIONS = Object.freeze({
  EXTRACTION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.extraction.enabled',
    label: 'EXTRACTION.OPTIONS.ENABLE',
    type: 'boolean',
    defaultValue: 'false'
  },
  EXTRACTION_MAP_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.extraction.map.enable',
    label: 'EXTRACTION.OPTIONS.MAP_ENABLE',
    type: 'boolean',
    defaultValue: 'false'
  },
  EXTRACTION_PRODUCT_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.extraction.product.enable',
    label: 'EXTRACTION.OPTIONS.PRODUCT_ENABLE',
    type: 'boolean',
    defaultValue: 'false'
  },
  EXTRACTION_MAP_CENTER_LAT_LNG: <FormFieldDefinition>{
    key: 'sumaris.extraction.map.center.latLng',
    label: 'EXTRACTION.OPTIONS.MAP_CENTER_LAT_LNG',
    type: 'string',
    defaultValue: '46.879966, -10' // Atlantique France
  },
  EXTRACTION_MAP_CENTER_ZOOM: <FormFieldDefinition>{
    key: 'sumaris.extraction.map.center.zoom',
    label: 'EXTRACTION.OPTIONS.MAP_CENTER_ZOOM',
    type: 'integer',
    defaultValue: 5
  },
  EXTRACTION_ACCESS_NOT_SELF_ROLE: <FormFieldDefinition>{
    key: 'sumaris.extraction.accessNotSelfExtraction.role',
    label: "EXTRACTION.OPTIONS.ACCESS_NOT_SELF_ROLE",
    type: 'enum',
    values: PRIORITIZED_AUTHORITIES.map(label => ({
      key: 'ROLE_' + label,
      value: 'USER.PROFILE_ENUM.' + label
    }))
  },
  EXTRACTION_BATCH_DENORMALIZATION_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.extraction.batch.denormalization.enable',
    label: "EXTRACTION.OPTIONS.BATCH_DENORMALIZATION_ENABLE",
    type: 'boolean',
    defaultValue: 'false'
  },

});
