import {TypePolicies} from "@apollo/client/core";
import {FormFieldDefinition, FormFieldDefinitionMap, StatusIds} from '@sumaris-net/ngx-components';
import {LocationLevelIds} from '@app/referential/services/model/model.enum';

export const VESSEL_FEATURE_NAME = 'vessel';

export const VESSEL_GRAPHQL_TYPE_POLICIES = <TypePolicies>{

};

export const VESSEL_CONFIG_OPTIONS = {
  VESSEL_DEFAULT_STATUS: <FormFieldDefinition>{
    key: 'sumaris.vessel.status.default',
    label: 'CONFIGURATION.OPTIONS.VESSEL.DEFAULT_NEW_VESSEL_STATUS',
    type: 'enum',
    values: [
      {
        key: StatusIds.ENABLE.toString(),
        value: 'REFERENTIAL.STATUS_ENUM.ENABLE'
      },
      {
        key: StatusIds.TEMPORARY.toString(),
        value: 'REFERENTIAL.STATUS_ENUM.TEMPORARY'
      }
    ]
  },
  VESSEL_FILTER_DEFAULT_COUNTRY_ID: <FormFieldDefinition>{
    key: 'sumaris.vessel.filter.registrationCountry.Id',
    label: 'CONFIGURATION.OPTIONS.VESSEL.DEFAULT_FILTER_COUNTRY_ID',
    type: 'integer'
  },
  VESSEL_FILTER_MIN_LENGTH: <FormFieldDefinition>{
    key: 'sumaris.vessel.filter.searchText.minLength',
    label: 'CONFIGURATION.OPTIONS.VESSEL.FILTER_SEARCH_TEXT_MIN_LENGTH',
    type: 'integer',
    defaultValue: 0
  },
  VESSEL_BASE_PORT_LOCATION_VISIBLE: <FormFieldDefinition>{
    key: 'sumaris.vessel.field.showBasePortLocation',
    label: 'CONFIGURATION.OPTIONS.VESSEL.BASE_PORT_LOCATION_VISIBLE',
    type: 'boolean',
    defaultValue: 'false'
  },
  REFERENTIAL_VESSEL_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.referential.vessel.enable',
    label: 'REFERENTIAL.OPTIONS.VESSELS_ENABLE',
    type: 'boolean',
    defaultValue: 'false'
  }
};

export const VESSEL_LOCAL_SETTINGS_OPTIONS = Object.freeze({

    // Display attributes for vessel
    FIELD_VESSEL_SNAPSHOT_ATTRIBUTES: <FormFieldDefinition>{
      key: 'sumaris.field.vesselSnapshot.attributes',
      label: 'SETTINGS.FIELDS.VESSEL.NAME',
      type: 'enum',
      values: [
        {key: 'exteriorMarking,name',   value: 'SETTINGS.FIELDS.VESSEL.ATTRIBUTES.EXTERIOR_MARKING_NAME'},
        {key: 'registrationCode,name',   value: 'SETTINGS.FIELDS.VESSEL.ATTRIBUTES.REGISTRATION_CODE_NAME'}
      ]
    }
});
