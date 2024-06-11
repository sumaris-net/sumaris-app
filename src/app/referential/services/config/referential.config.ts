import { TypePolicies } from '@apollo/client/core';
import { changeCaseToUnderscore, FormFieldDefinition, MatAutocompleteFieldConfig, StatusIds } from '@sumaris-net/ngx-components';
import {
  AcquisitionLevelCodes,
  FractionIdGroups,
  LocationLevelGroups,
  LocationLevelIds,
  MatrixIds,
  MethodIds,
  ParameterGroupIds,
  ParameterLabelGroups,
  PmfmIds,
  ProgramLabel,
  QualitativeValueIds,
  QualityFlagIds,
  TaxonGroupTypeIds,
  TaxonomicLevelIds,
  UnitIds,
  VesselIds,
  VesselTypeIds,
} from '../model/model.enum';
import { FieldMergeFunction } from '@apollo/client/cache/inmemory/policies';

// Keep existing cache object, when incoming is minified (without entityName)
const mergeNotMinified: FieldMergeFunction = (existing, incoming) => (incoming?.__ref?.includes('"entityName":null') ? existing : incoming);

export const REFERENTIAL_GRAPHQL_TYPE_POLICIES = <TypePolicies>{
  MetierVO: {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified,
  },
  PmfmVO: {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified,
  },
  TaxonGroupVO: {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified,
  },
  TaxonNameVO: {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified,
  },
  LocationVO: {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified,
  },
  ReferentialVO: {
    keyFields: ['entityName', 'id'],
    merge: mergeNotMinified,
  },
  TaxonGroupStrategyVO: {
    keyFields: ['__typename', 'strategyId', 'taxonGroup', ['entityName', 'id']],
  },
  TaxonNameStrategyVO: {
    keyFields: ['__typename', 'strategyId', 'taxonName', ['entityName', 'id']],
  },
  DenormalizedPmfmStrategyVO: {
    keyFields: ['__typename', 'strategyId', 'acquisitionLevel', 'id'],
  },
};

const LocationLevelAutocompleteConfig = <MatAutocompleteFieldConfig>{
  attributes: ['id', 'name'],
  filter: {
    entityName: 'LocationLevel',
    statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
  },
};
const PmfmAutocompleteConfig = <MatAutocompleteFieldConfig>{
  attributes: ['id', 'label'],
  columnSizes: [3, 'auto'],
  filter: {
    entityName: 'Pmfm',
    statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
  },
};
const QualitativeValueAutocompleteConfig = <MatAutocompleteFieldConfig>{
  attributes: ['id', 'label', 'name'],
  columnSizes: [3, 3, 'auto'],
  filter: {
    entityName: 'QualitativeValue',
    statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
  },
};

export const REFERENTIAL_CONFIG_OPTIONS = Object.freeze({
  REFERENTIAL_VESSEL_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.referential.vessel.enable',
    label: 'REFERENTIAL.OPTIONS.VESSELS_ENABLE',
    type: 'boolean',
    defaultValue: 'false',
  },

  ANALYTIC_REFERENCES_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.analyticReferences.enable',
    label: 'CONFIGURATION.OPTIONS.ANALYTIC_REFERENCES_ENABLE',
    type: 'boolean',
    defaultValue: 'false',
  },
  PROGRAM_SIH_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Program.SIH.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PROGRAM_SIH_LABEL',
    type: 'string',
    defaultValue: ProgramLabel.SIH,
  },
  /* -- Acquisition levels -- */
  ACQUISITION_LEVEL_TRIP_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.TRIP.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_TRIP_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.TRIP,
  },
  ACQUISITION_LEVEL_PHYSICAL_GEAR_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.PHYSICAL_GEAR.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_PHYSICAL_GEAR_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.PHYSICAL_GEAR,
  },
  ACQUISITION_LEVEL_CATCH_BATCH_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.CATCH_BATCH.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_CATCH_BATCH_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.CATCH_BATCH,
  },
  ACQUISITION_LEVEL_OPERATION_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.OPERATION.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_OPERATION_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.OPERATION,
  },
  ACQUISITION_LEVEL_SORTING_BATCH_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.SORTING_BATCH.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_SORTING_BATCH_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.SORTING_BATCH,
  },
  ACQUISITION_LEVEL_SORTING_BATCH_INDIVIDUAL_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.SORTING_BATCH_INDIVIDUAL.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_SORTING_BATCH_INDIVIDUAL_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL,
  },
  ACQUISITION_LEVEL_SALE_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.SALE.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_SALE_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.SALE,
  },
  ACQUISITION_LEVEL_SAMPLE_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.SAMPLE.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_SAMPLE_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.SAMPLE,
  },
  ACQUISITION_LEVEL_PRODUCT_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.PRODUCT.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_PRODUCT_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.PRODUCT,
  },
  ACQUISITION_LEVEL_PRODUCT_SALE_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.PRODUCT_SALE.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_PRODUCT_SALE_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.PRODUCT_SALE,
  },
  ACQUISITION_LEVEL_ACTIVITY_CALENDAR_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.ACTIVITY_CALENDAR.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_ACTIVITY_CALENDAR_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.ACTIVITY_CALENDAR,
  },
  ACQUISITION_LEVEL_MONTHLY_ACTIVITY_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.MONTHLY_ACTIVITY.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_MONTHLY_ACTIVITY_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.MONTHLY_ACTIVITY,
  },
  ACQUISITION_LEVEL_ACTIVITY_CALENDAR_GEAR_USE_FEATURES_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.ACTIVITY_CALENDAR_GEAR_USE_FEATURES.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_ACTIVITY_CALENDAR_GEAR_USE_FEATURES_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_USE_FEATURES,
  },
  ACQUISITION_LEVEL_ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES_LABEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.AcquisitionLevel.ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES.label',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ACQUISITION_LEVEL_ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES_LABEL',
    type: 'string',
    defaultValue: AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES,
  },

  /* -- Location levels -- */
  LOCATION_LEVEL_COUNTRY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.COUNTRY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_COUNTRY_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.COUNTRY,
  },
  LOCATION_LEVEL_PORT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.HARBOUR.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_PORT_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.PORT,
  },
  LOCATION_LEVEL_MARITIME_DISTRICT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.MARITIME_DISTRICT.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_MARITIME_DISTRICT_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.MARITIME_DISTRICT,
  },
  LOCATION_LEVEL_AUCTION_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.AUCTION.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_AUCTION_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.AUCTION,
  },

  // CIEM/ICES levels
  LOCATION_LEVEL_SUB_AREA_ICES_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.SUB_AREA_ICES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_SUB_AREA_ICES_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.SUB_AREA_ICES,
  },
  LOCATION_LEVEL_DIVISION_ICES_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.DIVISION_ICES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_DIVISION_ICES_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.DIVISION_ICES,
  },
  LOCATION_LEVEL_SUB_DIVISION_ICES_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.SUB_DIVISION_ICES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_SUB_DIVISION_ICES_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.SUB_DIVISION_ICES,
  },
  LOCATION_LEVEL_RECTANGLE_ICES_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.RECTANGLE_ICES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_RECTANGLE_ICES_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.RECTANGLE_ICES,
  },

  // CGPM/GFCM levels
  LOCATION_LEVEL_SUB_AREA_GFCM_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.SUB_AREA_GFCM.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_SUB_AREA_GFCM_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.SUB_AREA_GFCM,
  },
  LOCATION_LEVEL_DIVISION_GFCM_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.DIVISION_GFCM.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_DIVISION_GFCM_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.DIVISION_GFCM,
  },
  LOCATION_LEVEL_SUB_DIVISION_GFCM_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.SUB_DIVISION_GFCM.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_SUB_DIVISION_GFCM_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.SUB_DIVISION_GFCM,
  },
  LOCATION_LEVEL_RECTANGLE_GFCM_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.RECTANGLE_GFCM.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_RECTANGLE_GFCM_ID',
    type: 'entity',
    autocomplete: LocationLevelAutocompleteConfig,
    defaultValue: LocationLevelIds.RECTANGLE_GFCM,
  },

  // Fishing Areas
  LOCATION_LEVEL_LOCATIONS_AREA_IDS: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.LOCATIONS_AREA.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.LOCATION_LEVEL_LOCATIONS_AREA_IDS',
    type: 'string',
    defaultValue: LocationLevelGroups.FISHING_AREA.join(','),
  },
  WEIGHT_LENGTH_CONVERSION_AREA_IDS: <FormFieldDefinition>{
    key: 'sumaris.enumeration.LocationLevel.WEIGHT_LENGTH_CONVERSION_AREA.ids',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.WEIGHT_LENGTH_CONVERSION_AREA_IDS',
    type: 'string',
    defaultValue: LocationLevelGroups.WEIGHT_LENGTH_CONVERSION_AREA.join(','),
  },
  ROUND_WEIGHT_CONVERSION_DEFAULT_COUNTRY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Location.ROUND_WEIGHT_CONVERSION_DEFAULT_COUNTRY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.ROUND_WEIGHT_CONVERSION_DEFAULT_COUNTRY_ID',
    type: 'integer',
  },
  TAXONOMIC_LEVEL_FAMILY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonomicLevel.FAMILY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXONOMIC_LEVEL_FAMILY_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonomicLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: TaxonomicLevelIds.FAMILY,
  },
  TAXONOMIC_LEVEL_GENUS_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonomicLevel.GENUS.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXONOMIC_LEVEL_GENUS_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonomicLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: TaxonomicLevelIds.GENUS,
  },
  TAXONOMIC_LEVEL_SPECIES_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonomicLevel.SPECIES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXONOMIC_LEVEL_SPECIES_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonomicLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: TaxonomicLevelIds.SPECIES,
  },
  TAXONOMIC_LEVEL_SUBSPECIES_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonomicLevel.SUBSPECIES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXONOMIC_LEVEL_SUBSPECIES_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonomicLevel',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: TaxonomicLevelIds.SUBSPECIES,
  },
  PMFM_LABEL_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.referential.Pmfm.label.enable',
    label: 'CONFIGURATION.OPTIONS.REFERENTIAL.PMFM_LABEL_ENABLE',
    type: 'boolean',
    defaultValue: 'true',
  },
  PMFM_NB_FISHERMEN_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.NB_FISHERMEN.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_NB_FISHERMEN_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.NB_FISHERMEN,
  },
  PMFM_GPS_USED_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.GPS_USED.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_GPS_USED_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.GPS_USED,
  },
  PMFM_TRIP_PROGRESS: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.TRIP_PROGRESS.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_TRIP_PROGRESS',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.TRIP_PROGRESS,
  },
  PMFM_STRATEGY_LABEL_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.STRATEGY_LABEL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_STRATEGY_LABEL_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.STRATEGY_LABEL,
  },
  PMFM_SEA_STATE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SEA_STATE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SEA_STATE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SEA_STATE,
  },
  PMFM_TAG_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.TAG_ID.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_TAG_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.TAG_ID,
  },
  PMFM_DRESSING: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.DRESSING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_DRESSING',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.DRESSING,
  },
  PMFM_PRESERVATION: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.PRESERVATION.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_PRESERVATION',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.PRESERVATION,
  },
  PMFM_TRAWL_SIZE_CAT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.TRAWL_SIZE_CAT.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_TRAWL_SIZE_CAT',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.TRAWL_SIZE_CAT,
  },
  PMFM_DIURNAL_OPERATION_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.DIURNAL_OPERATION.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_DIURNAL_OPERATION_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.DIURNAL_OPERATION,
  },
  PMFM_AGE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.AGE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_AGE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.AGE,
  },
  PMFM_SEX_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SEX.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SEX_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SEX,
  },
  PMFM_PACKAGING_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.PACKAGING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_PACKAGING_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.PACKAGING,
  },
  PMFM_SIZE_CATEGORY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SIZE_CATEGORY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SIZE_CATEGORY_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SIZE_CATEGORY,
  },
  PMFM_SALE_RANK_ORDER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SALE_RANK_ORDER.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SALE_RANK_ORDER_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SALE_RANK_ORDER,
  },
  PMFM_SALE_ESTIMATED_RATIO_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SALE_ESTIMATED_RATIO.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SALE_ESTIMATED_RATIO_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SALE_ESTIMATED_RATIO,
  },
  PMFM_AVERAGE_WEIGHT_PRICE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.AVERAGE_WEIGHT_PRICE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_AVERAGE_WEIGHT_PRICE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.AVERAGE_WEIGHT_PRICE,
  },
  PMFM_AVERAGE_PACKAGING_PRICE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.AVERAGE_PACKAGING_PRICE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_AVERAGE_PACKAGING_PRICE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.AVERAGE_PACKAGING_PRICE,
  },
  PMFM_TOTAL_PRICE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.TOTAL_PRICE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_TOTAL_PRICE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.TOTAL_PRICE,
  },
  PMFM_REFUSED_SURVEY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.REFUSED_SURVEY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_REFUSED_SURVEY_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.REFUSED_SURVEY,
  },
  PMFM_GEAR_LABEL_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.GEAR_LABEL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_GEAR_LABEL_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.GEAR_LABEL,
  },
  PMFM_CHILD_GEAR_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.CHILD_GEAR.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_CHILD_GEAR_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.CHILD_GEAR,
  },
  PMFM_CATCH_WEIGHT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.CATCH_WEIGHT.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_CATCH_WEIGHT_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.CATCH_WEIGHT,
  },
  PMFM_DISCARD_WEIGHT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.DISCARD_WEIGHT.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_DISCARD_WEIGHT_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.DISCARD_WEIGHT,
  },
  PMFM_DISCARD_REASON_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.DISCARD_REASON.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_DISCARD_REASON_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.DISCARD_REASON,
  },
  PMFM_DISCARD_TYPE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.DISCARD_TYPE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_DISCARD_TYPE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.DISCARD_TYPE,
  },
  PMFM_HAS_ACCIDENTAL_CATCHES_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.HAS_ACCIDENTAL_CATCHES.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_HAS_ACCIDENTAL_CATCHES_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.HAS_ACCIDENTAL_CATCHES,
  },
  PMFM_BATCH_MEASURED_WEIGHT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.BATCH_MEASURED_WEIGHT.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_BATCH_MEASURED_WEIGHT_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.BATCH_MEASURED_WEIGHT,
  },
  PMFM_BATCH_CALCULATED_WEIGHT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.BATCH_CALCULATED_WEIGHT.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_BATCH_CALCULATED_WEIGHT_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.BATCH_CALCULATED_WEIGHT,
  },
  PMFM_BATCH_ESTIMATED_WEIGHT_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.BATCH_ESTIMATED_WEIGHT.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_BATCH_ESTIMATED_WEIGHT_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.BATCH_ESTIMATED_WEIGHT,
  },
  PMFM_BATCH_CALCULATED_WEIGHT_LENGTH_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.BATCH_CALCULATED_WEIGHT_LENGTH.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_BATCH_CALCULATED_WEIGHT_LENGTH_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH,
  },
  PMFM_BATCH_CALCULATED_WEIGHT_LENGTH_SUM_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.BATCH_CALCULATED_WEIGHT_LENGTH_SUM.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_BATCH_CALCULATED_WEIGHT_LENGTH_SUM_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH_SUM,
  },
  PMFM_BATCH_SORTING_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.PMFM_BATCH_SORTING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_BATCH_SORTING_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.BATCH_SORTING,
  },
  PMFM_HULL_MATERIAL_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.HULL_MATERIAL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_HULL_MATERIAL_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.HULL_MATERIAL,
  },
  PMFM_SELECTIVITY_DEVICE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SELECTIVITY_DEVICE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SELECTIVITY_DEVICE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SELECTIVITY_DEVICE,
  },
  PMFM_LANDING_CATEGORY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.LANDING_CATEGORY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_LANDING_CATEGORY_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.LANDING_CATEGORY,
  },
  PMFM_IS_SAMPLING_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.IS_SAMPLING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_IS_SAMPLING_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.IS_SAMPLING,
  },
  PMFM_EMV_CATEGORY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.EMV_CATEGORY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_EMV_CATEGORY_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.EMV_CATEGORY,
  },
  PMFM_PETS_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.PETS.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_PETS_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.PETS,
  },
  PMFM_SALE_TYPE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SALE_TYPE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SALE_TYPE_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SALE_TYPE,
  },
  PMFM_IS_OBSERVED_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.IS_OBSERVED.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_IS_OBSERVED_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.IS_OBSERVED,
  },
  PMFM_NON_OBSERVATION_REASON_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.NON_OBSERVATION_REASON.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_NON_OBSERVATION_REASON_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.NON_OBSERVATION_REASON,
  },
  PMFM_SPECIES_LIST_ORIGIN_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Pmfm.SPECIES_LIST_ORIGIN.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PMFM_SPECIES_LIST_ORIGIN_ID',
    type: 'entity',
    autocomplete: PmfmAutocompleteConfig,
    defaultValue: PmfmIds.SPECIES_LIST_ORIGIN,
  },

  PARAMETER_GROUP_SURVEY_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.ParameterGroup.SURVEY.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_SURVEY_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'ParameterGroup',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: ParameterGroupIds.SURVEY,
  },
  METHOD_MEASURED_BY_OBSERVER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.MEASURED_BY_OBSERVER.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_MEASURED_BY_OBSERVER_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: MethodIds.MEASURED_BY_OBSERVER,
  },
  METHOD_OBSERVED_BY_OBSERVER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.OBSERVED_BY_OBSERVER.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_OBSERVED_BY_OBSERVER_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: MethodIds.OBSERVED_BY_OBSERVER,
  },
  METHOD_ESTIMATED_BY_OBSERVER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.ESTIMATED_BY_OBSERVER.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_ESTIMATED_BY_OBSERVER_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: MethodIds.ESTIMATED_BY_OBSERVER,
  },
  METHOD_CALCULATED_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.CALCULATED.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_CALCULATED_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: MethodIds.CALCULATED,
  },
  METHOD_CALCULATED_WEIGHT_LENGTH_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.CALCULATED_WEIGHT_LENGTH.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_CALCULATED_WEIGHT_LENGTH_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: MethodIds.CALCULATED_WEIGHT_LENGTH,
  },
  METHOD_CALCULATED_WEIGHT_LENGTH_SUM_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.CALCULATED_WEIGHT_LENGTH_SUM.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_CALCULATED_WEIGHT_LENGTH_SUM_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: MethodIds.CALCULATED_WEIGHT_LENGTH_SUM,
  },

  METHOD_UNKNOWN_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Method.UNKNOWN.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.METHOD_UNKNOWN_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Method',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: MethodIds.UNKNOWN,
  },
  FRACTION_INDIVIDUAL_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Fraction.INDIVIDUAL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.FRACTION_INDIVIDUAL_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Matrix',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: MatrixIds.INDIVIDUAL,
  },
  PARAMETER_GROUP_TAG_ID_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.tagId.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_TAG_ID_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.TAG_ID.join(','),
  },
  PARAMETER_GROUP_AGE_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.age.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_AGE_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.AGE.join(','),
  },
  PARAMETER_GROUP_SEX_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.sex.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_SEX_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.SEX.join(','),
  },
  PARAMETER_GROUP_WEIGHT_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.weight.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_WEIGHT_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.WEIGHT.join(','),
  },
  PARAMETER_GROUP_LENGTH_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.length.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_LENGTH_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.LENGTH.join(','),
  },
  PARAMETER_GROUP_MATURITY_LABELS: <FormFieldDefinition>{
    key: 'sumaris.list.parameter.maturity.labels',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.PARAMETER_GROUP_MATURITY_LABELS',
    type: 'string',
    defaultValue: ParameterLabelGroups.MATURITY.join(','),
  },
  FRACTION_GROUP_CALCIFIED_STRUCTURE_IDS: <FormFieldDefinition>{
    key: 'sumaris.list.fraction.calcifiedStructure.ids',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.FRACTION_GROUP_CALCIFIED_STRUCTURE_IDS',
    type: 'string',
    defaultValue: FractionIdGroups.CALCIFIED_STRUCTURE.join(','),
  },
  UNIT_NONE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Unit.NONE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.UNIT_NONE_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'Unit',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: UnitIds.NONE,
  },
  QUALITATIVE_VALUE_LANDING_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.LANDING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_LANDING_ID',
    type: 'entity',
    autocomplete: QualitativeValueAutocompleteConfig,
    defaultValue: QualitativeValueIds.DISCARD_OR_LANDING.LANDING,
  },
  QUALITATIVE_VALUE_DISCARD_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.DISCARD.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_DISCARD_ID',
    type: 'entity',
    autocomplete: QualitativeValueAutocompleteConfig,
    defaultValue: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD,
  },
  QUALITATIVE_VALUE_DRESSING_WHOLE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.DRESSING_WHOLE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_DRESSING_WHOLE_ID',
    type: 'entity',
    autocomplete: QualitativeValueAutocompleteConfig,
    defaultValue: QualitativeValueIds.DRESSING.WHOLE,
  },
  QUALITATIVE_VALUE_PRESERVATION_FRESH_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.PRESERVATION_FRESH.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_PRESERVATION_FRESH_ID',
    type: 'entity',
    autocomplete: QualitativeValueAutocompleteConfig,
    defaultValue: QualitativeValueIds.PRESERVATION.FRESH,
  },
  QUALITATIVE_VALUE_SIZE_UNLI_CAT_NONE_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.SIZE_UNLI_CAT_NONE.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_SIZE_UNLI_CAT_NONE_ID',
    type: 'entity',
    autocomplete: QualitativeValueAutocompleteConfig,
    defaultValue: QualitativeValueIds.SIZE_UNLI_CAT.NONE,
  },
  QUALITATIVE_VALUE_SORTING_BULK_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.SORTING_BULK.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_SORTING_BULK_ID',
    type: 'entity',
    autocomplete: QualitativeValueAutocompleteConfig,
    defaultValue: QualitativeValueIds.BATCH_SORTING.BULK,
  },
  QUALITATIVE_VALUE_SORTING_NON_BULK_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.SORTING_NON_BULK.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_SORTING_NON_BULK_ID',
    type: 'entity',
    autocomplete: QualitativeValueAutocompleteConfig,
    defaultValue: QualitativeValueIds.BATCH_SORTING.NON_BULK,
  },

  QUALITATIVE_VALUE_SEX_UNSEXED_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualitativeValue.SEX_UNSEXED.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITATIVE_VALUE_SEX_UNSEXED_ID',
    type: 'entity',
    autocomplete: QualitativeValueAutocompleteConfig,
    defaultValue: QualitativeValueIds.SEX.UNSEXED,
  },

  QUALITY_FLAG_NOT_COMPLETED_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualityFlag.NOT_COMPLETED.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITY_FLAG_NOT_COMPLETED_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'QualityFlag',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: QualityFlagIds.NOT_COMPLETED,
  },

  QUALITY_FLAG_MISSING_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.QualityFlag.MISSING.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.QUALITY_FLAG_MISSING_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'QualityFlag',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: QualityFlagIds.MISSING,
  },

  TAXON_GROUP_TYPE_FAO_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonGroupType.FAO.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXON_GROUP_TYPE_FAO_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonGroupType',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: TaxonGroupTypeIds.FAO.toString(),
  },
  TAXON_GROUP_TYPE_NATIONAL_METIER_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonGroupType.NATIONAL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXON_GROUP_TYPE_NATIONAL_METIER_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonGroupType',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: TaxonGroupTypeIds.NATIONAL_METIER.toString(),
  },
  TAXON_GROUP_TYPE_DCF_METIER_LVL_5_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.TaxonGroupType.DCF_METIER_LVL_5.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.TAXON_GROUP_TYPE_DCF_METIER_LVL_5_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'TaxonGroupType',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: TaxonGroupTypeIds.DCF_METIER_LVL_5.toString(),
  },
  VESSEL_TYPE_FISHING_VESSEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.VesselType.FISHING_VESSEL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.VESSEL_TYPE_FISHING_VESSEL_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'VesselType',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: VesselTypeIds.FISHING_VESSEL.toString(),
  },
  VESSEL_TYPE_SCIENTIFIC_RESEARCH_VESSEL: <FormFieldDefinition>{
    key: 'sumaris.enumeration.VesselType.SCIENTIFIC_RESEARCH_VESSEL.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.VESSEL_TYPE_SCIENTIFIC_RESEARCH_VESSEL_ID',
    type: 'entity',
    autocomplete: {
      attributes: ['id', 'name'],
      filter: {
        entityName: 'VesselType',
        statusIds: [StatusIds.DISABLE, StatusIds.ENABLE],
      },
    },
    defaultValue: VesselTypeIds.SCIENTIFIC_RESEARCH_VESSEL.toString(),
  },
  VESSEL_UNKNOWN_ID: <FormFieldDefinition>{
    key: 'sumaris.enumeration.Vessel.UNKNOWN.id',
    label: 'CONFIGURATION.OPTIONS.ENUMERATION.VESSEL_UNKNOWN_ID',
    type: 'integer',
    defaultValue: VesselIds.UNKNOWN.toString(),
  },
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
          { key: 'label,name', value: 'SETTINGS.FIELDS.ATTRIBUTES.LABEL_NAME' },
          { key: 'name', value: 'SETTINGS.FIELDS.ATTRIBUTES.NAME' },
          { key: 'name,label', value: 'SETTINGS.FIELDS.ATTRIBUTES.NAME_LABEL' },
          { key: 'label', value: 'SETTINGS.FIELDS.ATTRIBUTES.LABEL' },
        ],
      };
      return res;
    }, {})
);
