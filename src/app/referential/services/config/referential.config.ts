import {TypePolicies} from "@apollo/client/core";
import {FormFieldDefinition, FormFieldDefinitionMap} from "@sumaris-net/ngx-components";
import {changeCaseToUnderscore} from "@sumaris-net/ngx-components";
import {FractionGroupIds, LocationLevelIds, MatrixIds, MethodIds, ParameterLabelGroups, PmfmIds, ProgramLabel, TaxonomicLevelIds} from '../model/model.enum';
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
    key: 'sumaris.enumeration.TaxonomicLevel.FAMILY.id',
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
    key: 'sumaris.enumeration.TaxonomicLevel.GENUS.id',
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
    key: 'sumaris.enumeration.TaxonomicLevel.SPECIES.id',
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
    key: 'sumaris.enumeration.TaxonomicLevel.SUBSPECIES.id',
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
    key: 'sumaris.enumeration.Pmfm.STRATEGY_LABEL.id',
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
    key: 'sumaris.enumeration.Pmfm.TAG_ID.id',
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
    key: 'sumaris.enumeration.Pmfm.AGE.id',
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
    key: 'sumaris.enumeration.Pmfm.SEX.id',
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

  // Methods
  METHOD_MEASURED_BY_OBSERVER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.MEASURED_BY_OBSERVER.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_MEASURED_BY_OBSERVER_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: MethodIds.MEASURED_BY_OBSERVER
  },
  METHOD_OBSERVED_BY_OBSERVER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.OBSERVED_BY_OBSERVER.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_OBSERVED_BY_OBSERVER_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: MethodIds.OBSERVED_BY_OBSERVER
  },
  METHOD_ESTIMATED_BY_OBSERVER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.ESTIMATED_BY_OBSERVER.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_ESTIMATED_BY_OBSERVER_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: MethodIds.ESTIMATED_BY_OBSERVER
  },
  METHOD_CALCULATED_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.CALCULATED.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_CALCULATED_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: MethodIds.CALCULATED
  },
  FRACTION_INDIVIDUAL_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Fraction.INDIVIDUAL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.FRACTION_INDIVIDUAL_ID',
    type: 'entity',
    autocomplete: {
      filter: {
        entityName: 'Matrix',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: MatrixIds.INDIVIDUAL
  },
  PARAMETER_GROUP_AGE_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.age.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_AGE_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.AGE[0]
  },
  PARAMETER_GROUP_SEX_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.sex.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_SEX_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.SEX[0]
  },
  PARAMETER_GROUP_WEIGHT_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.weight.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_WEIGHT_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.WEIGHT.join(',')
  },
  PARAMETER_GROUP_LENGTH_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.length.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_LENGTH_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.LENGTH.join(',')
  },
  PARAMETER_GROUP_MATURITY_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.maturity.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_MATURITY_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.MATURITY.join(',')
  },
  PARAMETER_GROUP_FRACTION_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.fraction.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_FRACTION_LABELS',
    type: 'string',
    defaultValue: FractionGroupIds.AGE.join(',')
  }
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
