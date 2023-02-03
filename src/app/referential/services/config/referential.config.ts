import { TypePolicies } from '@apollo/client/core';
import { changeCaseToUnderscore, FormFieldDefinition, MatAutocompleteFieldConfig, StatusIds } from '@sumaris-net/ngx-components';
import {
  FractionIdGroups, LocationLevelGroups,
  LocationLevelIds,
  MatrixIds,
  MethodIds,
  ParameterGroupIds,
  ParameterLabelGroups,
  PmfmIds,
  ProgramLabel,
  QualitativeValueIds,
  TaxonGroupTypeIds,
  TaxonomicLevelIds
} from '../model/model.enum';
import { FieldMergeFunction } from '@apollo/client/cache/inmemory/policies';

// Keep existing cache object, when incoming is minified (without entityName)
const mergeNotMinified: FieldMergeFunction = (existing, incoming) =>
  (incoming?.__ref?.includes('"entityName":null') ? existing : incoming);

export const REFERENTIAL_GRAPHQL_TYPE_POLICIES = <TypePolicies>{
  'MetierVO': {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified
  },
  'PmfmVO': {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified
  },
  'TaxonGroupVO': {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified
  },
  'TaxonNameVO': {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified
  },
  'LocationVO': {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified
  },
  'ReferentialVO': {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified
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

const LocationLevelAutocompleteConfig = <MatAutocompleteFieldConfig>{
  attributes: ['id', 'name'],
  filter: {
    entityName: 'LocationLevel',
    statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
  }
};
const PmfmAutocompleteConfig = <MatAutocompleteFieldConfig>{
  attributes: ['id', 'label'],
  filter: {
    entityName: 'Pmfm',
    statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
  }
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
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.COUNTRY
  },
  LOCATION_LEVEL_PORT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.HARBOUR.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_PORT_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.PORT
  },
  LOCATION_LEVEL_AUCTION_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.AUCTION.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_AUCTION_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.AUCTION
  },
  LOCATION_LEVEL_ICES_RECTANGLE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.RECTANGLE_ICES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_ICES_RECTANGLE_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.ICES_RECTANGLE
  },
  LOCATION_LEVEL_ICES_DIVISION_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.ICES_DIVISION.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_ICES_DIVISION_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.ICES_DIVISION
  },
  LOCATION_LEVEL_LOCATIONS_AREA_IDS: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.LOCATIONS_AREA.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_LOCATIONS_AREA_IDS',
    type: 'string',
    defaultValue: LocationLevelGroups.FISHING_AREA.join(',')
  },
  WEIGHT_LENGTH_CONVERSION_AREA_IDS: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.WEIGHT_LENGTH_CONVERSION_AREA.ids',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.WEIGHT_LENGTH_CONVERSION_AREA_IDS',
    type: 'string',
    defaultValue: LocationLevelGroups.WEIGHT_LENGTH_CONVERSION_AREA.join(',')
  },
  ROUND_WEIGHT_CONVERSION_DEFAULT_COUNTRY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Location.ROUND_WEIGHT_CONVERSION_DEFAULT_COUNTRY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ROUND_WEIGHT_CONVERSION_DEFAULT_COUNTRY_ID',
    type: 'integer'
  },
  TAXONOMIC_LEVEL_FAMILY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonomicLevel.FAMILY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXONOMIC_LEVEL_FAMILY_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
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
      attributes: ['id', 'name'],
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
      attributes: ['id', 'name'],
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
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonomicLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: TaxonomicLevelIds.SUBSPECIES
  },
  PMFM_TRIP_PROGRESS: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.TRIP_PROGRESS.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_TRIP_PROGRESS',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.TRIP_PROGRESS
  },
  PMFM_STRATEGY_LABEL_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.STRATEGY_LABEL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_STRATEGY_LABEL_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.STRATEGY_LABEL
  },
  PMFM_TAG_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.TAG_ID.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_TAG_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.TAG_ID
  },
  PMFM_DRESSING: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.DRESSING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_DRESSING',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.DRESSING
  },
  PMFM_PRESERVATION: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.PRESERVATION.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_PRESERVATION',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.PRESERVATION
  },
  PMFM_TRAWL_SIZE_CAT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.TRAWL_SIZE_CAT.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_TRAWL_SIZE_CAT',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.TRAWL_SIZE_CAT
  },
  PMFM_AGE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.AGE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_AGE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.AGE
  },
  PMFM_SEX_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SEX.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SEX_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SEX
  },
  PMFM_PACKAGING_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.PACKAGING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_PACKAGING_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.PACKAGING
  },
  PMFM_SIZE_CATEGORY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SIZE_CATEGORY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SIZE_CATEGORY_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SIZE_CATEGORY
  },
  PMFM_SALE_RANK_ORDER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SALE_RANK_ORDER.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SALE_RANK_ORDER_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SALE_RANK_ORDER
  },
  PMFM_SALE_ESTIMATED_RATIO_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SALE_ESTIMATED_RATIO.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SALE_ESTIMATED_RATIO_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SALE_ESTIMATED_RATIO
  },
  PMFM_AVERAGE_WEIGHT_PRICE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.AVERAGE_WEIGHT_PRICE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_AVERAGE_WEIGHT_PRICE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.AVERAGE_WEIGHT_PRICE
  },
  PMFM_AVERAGE_PACKAGING_PRICE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.AVERAGE_PACKAGING_PRICE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_AVERAGE_PACKAGING_PRICE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.AVERAGE_PACKAGING_PRICE
  },
  PMFM_TOTAL_PRICE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.TOTAL_PRICE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_TOTAL_PRICE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.TOTAL_PRICE
  },
  PMFM_REFUSED_SURVEY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.REFUSED_SURVEY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_REFUSED_SURVEY_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.REFUSED_SURVEY
  },
  PMFM_GEAR_LABEL_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.GEAR_LABEL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_GEAR_LABEL_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.GEAR_LABEL
  },
  PMFM_CHILD_GEAR_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.CHILD_GEAR.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_CHILD_GEAR_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.CHILD_GEAR
  },
  PMFM_HAS_ACCIDENTAL_CATCHES_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.HAS_ACCIDENTAL_CATCHES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_HAS_ACCIDENTAL_CATCHES_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.HAS_ACCIDENTAL_CATCHES
  },
  PMFM_BATCH_CALCULATED_WEIGHT_LENGTH_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.BATCH_CALCULATED_WEIGHT_LENGTH.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_BATCH_CALCULATED_WEIGHT_LENGTH_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH
  },
  PMFM_BATCH_CALCULATED_WEIGHT_LENGTH_SUM_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.BATCH_CALCULATED_WEIGHT_LENGTH_SUM.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_BATCH_CALCULATED_WEIGHT_LENGTH_SUM_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH_SUM
  },
  PMFM_BATCH_SORTING_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.PMFM_BATCH_SORTING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_BATCH_SORTING_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.BATCH_SORTING
  },
  PMFM_HULL_MATERIAL_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.HULL_MATERIAL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_HULL_MATERIAL_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.HULL_MATERIAL
  },
  PARAMETER_GROUP_SURVEY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.ParameterGroup.SURVEY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_SURVEY_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'ParameterGroup',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: ParameterGroupIds.SURVEY
  },
  METHOD_MEASURED_BY_OBSERVER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.MEASURED_BY_OBSERVER.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_MEASURED_BY_OBSERVER_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
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
      attributes: ['id', 'name'],
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
      attributes: ['id', 'name'],
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
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: MethodIds.CALCULATED
  },
  METHOD_CALCULATED_WEIGHT_LENGTH_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.CALCULATED_WEIGHT_LENGTH.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_CALCULATED_WEIGHT_LENGTH_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: MethodIds.CALCULATED_WEIGHT_LENGTH
  },
  METHOD_CALCULATED_WEIGHT_LENGTH_SUM_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.CALCULATED_WEIGHT_LENGTH_SUM.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_CALCULATED_WEIGHT_LENGTH_SUM_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: MethodIds.CALCULATED_WEIGHT_LENGTH_SUM
  },
  FRACTION_INDIVIDUAL_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Fraction.INDIVIDUAL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.FRACTION_INDIVIDUAL_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
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
  FRACTION_GROUP_CALCIFIED_STRUCTURE_IDS: <FormFieldDefinition>{
    key: 'sumaris.list.fraction.calcifiedStructure.ids',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.FRACTION_GROUP_CALCIFIED_STRUCTURE_IDS',
    type: 'string',
    defaultValue: FractionIdGroups.CALCIFIED_STRUCTURE.join(',')
  },
  UNIT_NONE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Unit.NONE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.UNIT_NONE_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Unit',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: MatrixIds.INDIVIDUAL
  },
  QUALITATIVE_VALUE_LANDING_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.LANDING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_LANDING_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['label', 'name'],
      filter: {
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: QualitativeValueIds.DISCARD_OR_LANDING.LANDING
  },
  QUALITATIVE_VALUE_DISCARD_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.DISCARD.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_DISCARD_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['label', 'name'],
      filter: {
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD
  },
  QUALITATIVE_VALUE_DRESSING_WHOLE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.DRESSING_WHOLE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_DRESSING_WHOLE_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: QualitativeValueIds.DRESSING.WHOLE
  },
  QUALITATIVE_VALUE_PRESERVATION_FRESH_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.PRESERVATION_FRESH.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_PRESERVATION_FRESH_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: QualitativeValueIds.PRESERVATION.FRESH
  },
  QUALITATIVE_VALUE_SIZE_UNLI_CAT_NONE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.SIZE_UNLI_CAT_NONE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_SIZE_UNLI_CAT_NONE_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: QualitativeValueIds.SIZE_UNLI_CAT.NONE
  },
  QUALITATIVE_VALUE_SORTING_BULK_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.SORTING_BULK.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_SORTING_BULK_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: QualitativeValueIds.BATCH_SORTING.BULK
  },
  QUALITATIVE_VALUE_SORTING_NON_BULK_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.SORTING_NON_BULK.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_SORTING_NON_BULK_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: QualitativeValueIds.BATCH_SORTING.NON_BULK
  },

  TAXON_GROUP_TYPE_FAO_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonGroupType.FAO.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXON_GROUP_TYPE_FAO_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonGroupType',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: TaxonGroupTypeIds.FAO.toString()
  },
  TAXON_GROUP_TYPE_NATIONAL_METIER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonGroupType.NATIONAL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXON_GROUP_TYPE_NATIONAL_METIER_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonGroupType',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: TaxonGroupTypeIds.NATIONAL_METIER.toString()
  },
  TAXON_GROUP_TYPE_DCF_METIER_LVL_5_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonGroupType.DCF_METIER_LVL_5.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXON_GROUP_TYPE_DCF_METIER_LVL_5_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonGroupType',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE]
      }
    },
    defaultValue: TaxonGroupTypeIds.DCF_METIER_LVL_5.toString()
  }
});

export const REFERENTIAL_LOCAL_SETTINGS_OPTIONS = Object.freeze(
  // Display attributes for referential useful entities
  ['department', 'location', 'fishingAreaLocation', 'qualitativeValue', 'taxonGroup', 'taxonName', 'gear', 'fraction']
    // Allow user to choose how to display field (by code+label, code, etc)
    .reduce((res, fieldName) => {
      const i18nFieldName = changeCaseToUnderscore(fieldName).toUpperCase(); // e.g. transform 'taxonGroup' into 'TAXON_GROUP'
      res[`FIELD_${i18nFieldName}_ATTRIBUTES`] = {
        key: `sumaris.field.${fieldName}.attributes`,
        label: `SETTINGS.FIELDS.${i18nFieldName}`,
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
);
