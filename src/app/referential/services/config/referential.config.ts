import {TypePolicies} from "@apollo/client/core";
import {FormFieldDefinition, FormFieldDefinitionMap} from "@sumaris-net/ngx-components";
import {changeCaseToUnderscore} from "@sumaris-net/ngx-components";
import {LocationLevelIds, ParameterLabelGroups, PmfmIds, ProgramLabel, TaxonomicLevelIds} from '../model/model.enum';
import {StatusIds}  from "@sumaris-net/ngx-components";

export const REFERENTIAL_GRAPHQL_TYPE_POLICIES = <TypePolicies>{
  'MetierVO': {
    keyFields: ['entityName', 'id']
  },
  'PmfmVO': {
    keyFields: ['entityName', 'id']
  },
  'TaxonGroupVO': {
    keyFields: ['entityName', 'id']
  },
  'TaxonNameVO': {
    keyFields: ['entityName', 'id']
  },
  'LocationVO': {
    keyFields: ['entityName', 'id']
  },
  'ReferentialVO': {
    keyFields: ['entityName', 'id']
  },
  'TaxonGroupStrategyVO': {
    keyFields: ['__typename', 'strategyId', 'taxonGroup', ['entityName', 'id']]
  },
  'TaxonNameStrategyVO': {
    keyFields: ['__typename', 'strategyId', 'taxonName', ['entityName', 'id']]
  },
  'DenormalizedPmfmStrategyVO': {
    keyFields: ['__typename', 'strategyId', 'acquisitionLevel', 'id']
  },
};

export const REFERENTIAL_CONFIG_OPTIONS = Object.freeze({
  REFERENTIAL_VESSEL_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.referential.vessel.enable',
    label: 'REFERENTIAL.OPTIONS.VESSELS_ENABLE',
    type: 'boolean',
    defaultValue: 'false'
  },
  ANALYTIC_REFERENCES_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.analyticReferences.enable',
    label: 'CONFIGURATION.OPTIONS.ANALYTIC_REFERENCES_ENABLE',
    type: 'boolean',
    defaultValue: 'false'
  },
  PROGRAM_SIH_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Program.SIH.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PROGRAM_SIH_LABEL',
    type: 'string',
    defaultValue: ProgramLabel.SIH
  },
  LOCATION_LEVEL_COUNTRY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.COUNTRY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_COUNTRY_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: LocationLevelIds.COUNTRY
  },
  LOCATION_LEVEL_PORT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.HARBOUR.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_PORT_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: LocationLevelIds.PORT
  },
  LOCATION_LEVEL_AUCTION_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.AUCTION.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_AUCTION_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: LocationLevelIds.AUCTION
  },
  LOCATION_LEVEL_ICES_RECTANGLE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.RECTANGLE_ICES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_ICES_RECTANGLE_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: LocationLevelIds.ICES_RECTANGLE
  },
  LOCATION_LEVEL_ICES_DIVISION_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.ICES_DIVISION.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_ICES_DIVISION_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: LocationLevelIds.ICES_DIVISION
  },
  TAXONOMIC_LEVEL_FAMILY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.taxonomicLevel.FAMILY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXONOMIC_LEVEL_FAMILY_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'TaxonomicLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: TaxonomicLevelIds.FAMILY
  },
  TAXONOMIC_LEVEL_GENUS_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.taxonomicLevel.GENUS.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXONOMIC_LEVEL_GENUS_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'TaxonomicLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: TaxonomicLevelIds.GENUS
  },
  TAXONOMIC_LEVEL_SPECIES_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.taxonomicLevel.SPECIES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXONOMIC_LEVEL_SPECIES_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'TaxonomicLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: TaxonomicLevelIds.SPECIES
  },
  TAXONOMIC_LEVEL_SUBSPECIES_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.taxonomicLevel.SUBSPECIES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXONOMIC_LEVEL_SUBSPECIES_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'TaxonomicLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: TaxonomicLevelIds.SUBSPECIES
  },
  PMFM_STRATEGY_LABEL_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.pmfm.STRATEGY_LABEL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_STRATEGY_LABEL_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'Pmfm',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: PmfmIds.STRATEGY_LABEL
  },
  PMFM_TAG_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.pmfm.TAG_ID.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_TAG_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'Pmfm',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: PmfmIds.TAG_ID
  },
  PMFM_DRESSING: <FormFieldDefinition>{
    key: 'sumaris.enumeration.pmfm.DRESSING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_DRESSING',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'Pmfm',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: PmfmIds.DRESSING
  },
  PMFM_AGE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.pmfm.AGE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_AGE_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'Pmfm',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: PmfmIds.AGE
  },
  PMFM_SEX_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.pmfm.SEX.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SEX_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'Pmfm',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: PmfmIds.SEX
  },
  STRATEGY_PARAMETER_AGE_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.parameter.age.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.STRATEGY_PARAMETER_AGE_LABEL',
    type: 'string',
    defaultValue: ParameterLabelGroups.AGE[0]
  },
  STRATEGY_PARAMETER_SEX_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.parameter.sex.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.STRATEGY_PARAMETER_SEX_LABEL',
    type: 'string',
    defaultValue: ParameterLabelGroups.SEX[0]
  },
  STRATEGY_PARAMETER_WEIGHT_LABELS: <FormFieldDefinition>{
    key: 'sumaris.enumeration.parameter.weight.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.STRATEGY_PARAMETER_WEIGHT_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.WEIGHT.join(',')
  },
  STRATEGY_PARAMETER_LENGTH_LABELS: <FormFieldDefinition>{
    key: 'sumaris.enumeration.parameter.length.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.STRATEGY_PARAMETER_LENGTH_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.LENGTH.join(',')
  },
  STRATEGY_PARAMETER_MATURITY_LABELS: <FormFieldDefinition>{
    key: 'sumaris.enumeration.parameter.maturity.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.STRATEGY_PARAMETER_MATURITY_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.MATURITY.join(',')
  },
});

export const REFERENTIAL_LOCAL_SETTINGS_OPTIONS = Object.freeze({

  // Display attributes for vessel
  FIELD_VESSEL_SNAPSHOT_ATTRIBUTES: <FormFieldDefinition>{
    key: 'sumaris.field.vesselSnapshot.attributes',
    label: 'SETTINGS.FIELDS.VESSEL.NAME',
    type: 'enum',
    values: [
      {key: 'exteriorMarking,name',   value: 'SETTINGS.FIELDS.VESSEL.ATTRIBUTES.EXTERIOR_MARKING_NAME'},
      {key: 'registrationCode,name',   value: 'SETTINGS.FIELDS.VESSEL.ATTRIBUTES.REGISTRATION_CODE_NAME'}
    ]
  },
  // Display attributes for referential useful entities
  ... ['department', 'location', 'qualitativeValue', 'taxonGroup', 'taxonName', 'gear', 'fraction']
    // Allow user to choose how to display field (by code+label, code, etc)
    .reduce((res, fieldName) => {
      res[`FIELD_${changeCaseToUnderscore(fieldName).toUpperCase()}_ATTRIBUTES`] = {
        key: `sumaris.field.${fieldName}.attributes`,
        label: `SETTINGS.FIELDS.${changeCaseToUnderscore(fieldName).toUpperCase()}`,
        type: 'enum',
        values: [
          {key: 'label,name',   value: 'SETTINGS.FIELDS.ATTRIBUTES.LABEL_NAME'},
          {key: 'name',         value: 'SETTINGS.FIELDS.ATTRIBUTES.NAME'},
          {key: 'name,label',   value: 'SETTINGS.FIELDS.ATTRIBUTES.NAME_LABEL'},
          {key: 'label',        value: 'SETTINGS.FIELDS.ATTRIBUTES.LABEL'}
        ]
      };
      return res;
    }, {})
});
