import { changeCaseToUnderscore, underscoreToChangeCase } from '@sumaris-net/ngx-components';

export const ProgramLabel = {
  SIH: 'SIH', // Used for vessel's filter
  SIH_ACTIPRED: 'SIH-ACTIPRED', // Used for activity calendar
};
// LP 17/08/2020 : Location level are overridden in ConfigService.overrideEnums
export const LocationLevelIds = {
  // Lands
  COUNTRY: 1,
  PORT: 2,
  AUCTION: 3,
  MARITIME_DISTRICT: 8,

  // At sea
  SUB_AREA_ICES: 110,
  RECTANGLE_ICES: 4,
  RECTANGLE_GFCM: 5,
  DIVISION_ICES: 111,
  SUB_DIVISION_ICES: 112,
  SUB_AREA_GFCM: 140,
  DIVISION_GFCM: 141,
  SUB_DIVISION_GFCM: 142,
};

export abstract class LocationLevels {
  static getFishingAreaLevelIds() {
    return [LocationLevelIds.RECTANGLE_ICES, LocationLevelIds.RECTANGLE_GFCM, LocationLevelIds.DIVISION_ICES];
  }
  static getWeightLengthConversionAreaLevelIds() {
    return [LocationLevelIds.SUB_AREA_ICES, LocationLevelIds.DIVISION_ICES];
  }
  static getStatisticalRectangleLevelIds() {
    return [LocationLevelIds.RECTANGLE_ICES, LocationLevelIds.RECTANGLE_GFCM];
  }
}
export const LocationLevelGroups = {
  FISHING_AREA: LocationLevels.getFishingAreaLevelIds(),
  WEIGHT_LENGTH_CONVERSION_AREA: LocationLevels.getWeightLengthConversionAreaLevelIds(),
  STATISTICAL_RECTANGLE: LocationLevels.getStatisticalRectangleLevelIds(),
};

export const GearLevelIds = {
  FAO: 1,
};

export const VesselTypeIds = {
  FISHING_VESSEL: 1,
  SCIENTIFIC_RESEARCH_VESSEL: 2,
};

export const VesselIds = {
  UNKNOWN: 5,
};

export const TaxonGroupTypeIds = {
  FAO: 2,
  DCF_METIER_LVL_5: 3,
  NATIONAL_METIER: 4,
};

export const TaxonomicLevelIds = {
  ORDO: 13,
  FAMILY: 17,
  GENUS: 26,
  SUBGENUS: 27,
  SPECIES: 28,
  SUBSPECIES: 29,
};

export const PmfmIds = {
  GEAR_SPEED: 9,
  NB_FISHERMEN: 21,
  SEA_STATE: 33,
  TRIP_PROGRESS: 34,
  SURVIVAL_SAMPLING_TYPE: 35,
  TAG_ID: 82,
  DISCARD_OR_LANDING: 90,
  IS_DEAD: 94,
  DISCARD_REASON: 95,
  DEATH_TIME: 101,
  VERTEBRAL_COLUMN_ANALYSIS: 102,
  DRESSING: 151, // Présentation (e.g. Entier, Eviscéré, etc.)
  PRESERVATION: 150, // État de conservation (e.g. Frais, Congelé, etc)
  BATCH_MEASURED_WEIGHT: 91,
  BATCH_ESTIMATED_WEIGHT: 92,
  BATCH_CALCULATED_WEIGHT: 93,
  BATCH_CALCULATED_WEIGHT_LENGTH: 122,
  BATCH_CALCULATED_WEIGHT_LENGTH_SUM: 123,

  MEASURE_TIME: 103,
  RELEASE_LATITUDE: 110,
  RELEASE_LONGITUDE: 111,
  SELECTIVITY_DEVICE: 4,
  SELECTIVITY_DEVICE_APASE: 435,

  /* ADAP pmfms */
  LENGTH_TOTAL_CM: 81, // Use for test only
  SELF_SAMPLING_PROGRAM: 28, // Label should be a join list of TAXON_GROUP.LABEL (See ADAP-MER program)
  HAS_INDIVIDUAL_MEASURES: 121,
  CONTROLLED_SPECIES: 134,
  SAMPLE_MEASURED_WEIGHT: 140,
  SAMPLE_INDIV_COUNT: 153,
  OUT_OF_SIZE_WEIGHT: 142,
  OUT_OF_SIZE_PCT: 143,
  OUT_OF_SIZE_INDIV_COUNT: 152,
  CONTROL_CORRECTIVE_ACTION: 146,
  PRODUCT_DESTINATION: 147,
  COMPLIANT_PRODUCT: 148,
  PARASITIZED_INDIV_COUNT: 155,
  PARASITIZED_INDIV_PCT: 156,
  DIRTY_INDIV_COUNT: 157,
  DIRTY_INDIV_PCT: 158,
  AUCTION_SIZE_CAT: 141,
  VIVACITY: 144,
  INDIVIDUALS_DENSITY_PER_KG: 160,
  AUCTION_DENSITY_CATEGORY: 161,

  /* PARAMBIO pmfms */
  STRATEGY_LABEL: 359,
  AGE: 350,
  SEX: 80,

  /* OBSDEB pmfms */
  PACKAGING: 177,
  SIZE_CATEGORY: 174,
  TOTAL_PRICE: 270,
  AVERAGE_PACKAGING_PRICE: 271,
  AVERAGE_WEIGHT_PRICE: 272,
  SALE_ESTIMATED_RATIO: 278,
  SALE_RANK_ORDER: 279,
  REFUSED_SURVEY: 266,

  /* PIFIL pmfms */
  HAS_ACCIDENTAL_CATCHES: 390,
  INDIVIDUAL_ON_DECK: 397,
  GEAR_LABEL: 120,

  /* PIFIL + LOGBOOK-SEA-CUCUMBER (SFA)*/
  GPS_USED: 188,

  /* APASE */
  CHILD_GEAR: 400,
  BATCH_GEAR_POSITION: 411,
  DIURNAL_OPERATION: 417,
  TRAWL_SIZE_CAT: 418,
  BATCH_SORTING: 176, // Vrac/Hors Vrac
  DISCARD_WEIGHT: 56,
  CATCH_WEIGHT: 57,
  HULL_MATERIAL: 433,

  /* OBSMER */
  DISCARD_TYPE: 408,
  IS_SAMPLING: 409,
  LANDING_CATEGORY: 436,
  EMV_CATEGORY: 437,

  //SIZE_UNLI_CAT: , TODO not used

  /* OBSVENTE */
  PETS: 502,
  SALE_TYPE: 503,
  IS_OBSERVED: 510,
  NON_OBSERVATION_REASON: 511,
  SPECIES_LIST_ORIGIN: 512,

  /* ACTIFLOT */
  SURVEY_QUALIFICATION: 446,
};
export const QualitativeLabels = {
  DISCARD_OR_LANDING: {
    LANDING: 'LAN',
    DISCARD: 'DIS',
  },
  SURVIVAL_SAMPLING_TYPE: {
    SURVIVAL: 'S',
    CATCH_HAUL: 'C',
    UNSAMPLED: 'N',
  },
  VIVACITY: {
    DEAD: 'MOR',
  },
};

export const QualitativeValueIds = {
  DISCARD_OR_LANDING: {
    LANDING: 190,
    DISCARD: 191,
  },
  DRESSING: {
    WHOLE: 381,
  },
  PRESERVATION: {
    FRESH: 332,
  },
  SIZE_UNLI_CAT: {
    NONE: 319,
  },
  BATCH_GEAR_POSITION: {
    PORT: 473, // Bâbord
    STARBOARD: 474, // Tribord
  },
  BATCH_SORTING: {
    BULK: 390, // Vrac
    NON_BULK: 391, // Hors Vrac
  },
  SEX: {
    UNSEXED: 188, // Non sexe
  },
  IS_SAMPLING: {
    YES: 596, // Détaillé
    NO: 597, // Non détaillé
  },
  DISCARD_TYPE: {
    ANI: 577, // Animaux - TODO override by config
    INV: 578, // Inerte et végétaux - TODO override by config
    EMV: 582, // TODO override by config
  },
  PETS: 651,
};

export const MethodIds = {
  UNKNOWN: 0,
  MEASURED_BY_OBSERVER: 1,
  OBSERVED_BY_OBSERVER: 2,
  ESTIMATED_BY_OBSERVER: 3,
  CALCULATED: 4,
  CALCULATED_WEIGHT_LENGTH: 47,
  CALCULATED_WEIGHT_LENGTH_SUM: 283,
};
export abstract class Methods {
  static getCalculatedIds() {
    return [MethodIds.CALCULATED, MethodIds.CALCULATED_WEIGHT_LENGTH, MethodIds.CALCULATED_WEIGHT_LENGTH_SUM];
  }
}
export const MethodIdGroups = {
  CALCULATED: Methods.getCalculatedIds(),
};
export const MatrixIds = {
  BATCH: 1,
  INDIVIDUAL: 2,
  GEAR: 3,
};

export const ParameterGroupIds = {
  UNKNOWN: 0,
  SURVEY: 1,
};

export const autoCompleteFractions = {
  1362: 'Otholite',
  1452: 'Otholite',
  1644: 'Ecaille',
  1956: 'Otholite',
  2049: 'Illicium',
  2050: 'Illicium',
  1960: 'Otholite',
  1693: 'Ecaille',
  1549: 'Otholite',
  1990: 'Otholite',
  1921: 'Otholite',
  1912: 'Otholite',
  1349: 'Otholite',
  1555: 'Otholite',
  1556: 'Otholite',
  1986: 'Otholite',
  1988: 'Otholite',
  1567: 'Otholite',
  1566: 'Otholite',
  1681: 'Otholite',
  1772: 'Otholite',
  1551: 'Otholite',
  1540: 'Otholite',
  1543: 'Otholite',
  1573: 'Otholite',
  1980: 'Otholite',
  1978: 'Otholite',
  1690: 'Otholite',
  1689: 'Otholite',
  1351: 'Otholite',
  1996: 'Otholite',
  1356: 'Otholite',
  1560: 'Otholite',
  1559: 'Otholite',
};

export const ParameterLabelGroups = {
  TAG_ID: [
    'TAG_ID',
    'SAMPLE_ID' /* SAMPLE_ID parameter label is required for specific Oracle TAG_ID (SAMPLE_ID whith Pmfm id = 1435. */,
    'DRESSING', // Use by Imagine (SIH-OBSBIO)
    'PRESERVATION',
  ],
  LENGTH: [
    'LENGTH_PECTORAL_FORK',
    'LENGTH_CLEITHRUM_KEEL_CURVE',
    'LENGTH_PREPELVIC',
    'LENGTH_FRONT_EYE_PREPELVIC',
    'LENGTH_LM_FORK',
    'LENGTH_PRE_SUPRA_CAUDAL',
    'LENGTH_CLEITHRUM_KEEL',
    'LENGTH_LM_FORK_CURVE',
    'LENGTH_PECTORAL_FORK_CURVE',
    'LENGTH_FORK_CURVE',
    'STD_STRAIGTH_LENGTH',
    'STD_CURVE_LENGTH',
    'SEGMENT_LENGTH',
    'LENGTH_MINIMUM_ALLOWED',
    'LENGTH',
    'LENGTH_TOTAL',
    'LENGTH_STANDARD',
    'LENGTH_PREANAL',
    'LENGTH_PELVIC',
    'LENGTH_CARAPACE',
    'LENGTH_FORK',
    'LENGTH_MANTLE',
  ],
  WEIGHT: ['WEIGHT'],
  SEX: ['SEX'],
  MATURITY: [
    'MATURITY_STAGE_3_VISUAL',
    'MATURITY_STAGE_4_VISUAL',
    'MATURITY_STAGE_5_VISUAL',
    'MATURITY_STAGE_6_VISUAL',
    'MATURITY_STAGE_7_VISUAL',
    'MATURITY_STAGE_9_VISUAL',
  ],
  AGE: ['AGE'],

  DRESSING: ['DRESSING'], // Use by round weight conversion
  PRESERVATION: ['PRESERVATION'],
};

export abstract class Parameters {
  // Remove duplication in label
  static getSampleParameterLabelGroups(opts?: { excludedGroups?: string[]; excludedParameterLabels?: string[] }) {
    return Parameters.getParameterLabelGroups({
      // Exclude special groups 'DRESSING' and 'PRESERVATION', used by round weight conversion
      excludedGroups: ['DRESSING', 'PRESERVATION'],
      ...opts,
    });
  }

  static getParameterLabelGroups(opts?: { excludedGroups?: string[]; excludedParameterLabels?: string[] }) {
    opts = opts || {};
    return (
      Object.keys(ParameterLabelGroups)
        // Keep not excluded groups
        .filter((group) => !opts.excludedGroups?.includes(group))
        .reduce((res, key) => {
          const labels = ParameterLabelGroups[key]
            // Remove duplication in label
            // Exclude label already in another previous group
            .filter(
              (label) =>
                !Object.values(res).some((previousLabels: string[]) => previousLabels.includes(label)) &&
                // Keep not excluded label
                !opts.excludedParameterLabels?.includes(label)
            );
          // Add to result, only if not empty
          if (labels.length) res[key] = labels;
          return res;
        }, {})
    );
  }
}

export const FractionIdGroups = {
  CALCIFIED_STRUCTURE: [10, 11, 12, 13], // Pièces calcifiées (need by SIH-OBSBIO)
};

export const FractionId = {
  ALL: 1,
};

export const ParameterGroups = Object.freeze(Object.keys(ParameterLabelGroups));

export const PmfmLabelPatterns = {
  BATCH_WEIGHT: /^BATCH_(.+)_WEIGHT$/i,
  LATITUDE: /^LATITUDE$/i,
  LONGITUDE: /^LONGITUDE$/i,
  LENGTH: /LENGTH/i,
  WEIGHT: /WEIGHT$/i,
  DRESSING: /^DRESSING/i,
  SELECTIVITY_DEVICE: /^SELECTIVITY_DEVICE/i,
  TAG_ID: /^TAG_ID/i,
};

export const UnitIds = {
  NONE: 0,
};

export const GearIds = {
  //OTT: 7 // Not used - WARN id=21 in the SIH database
};

export declare type WeightUnitSymbol = 'kg' | 'g' | 'mg' | 't';
export declare type LengthUnitSymbol = 'km' | 'm' | 'dm' | 'cm' | 'mm';

// TODO Override by config properties ?
export const UnitLabel = {
  DECIMAL_HOURS: 'h dec.',
  DATE_TIME: 'Date & Time',
  MINUTES: 'min',
  // Weight units
  TON: <WeightUnitSymbol>'t',
  KG: <WeightUnitSymbol>'kg',
  GRAM: <WeightUnitSymbol>'g',
  MG: <WeightUnitSymbol>'mg',
  // Length units
  KM: <LengthUnitSymbol>'km',
  M: <LengthUnitSymbol>'m',
  DM: <LengthUnitSymbol>'dm',
  CM: <LengthUnitSymbol>'cm',
  MM: <LengthUnitSymbol>'mm',
};

export const WeightKgConversion: Record<WeightUnitSymbol, number> = Object.freeze({
  t: 1000,
  kg: 1,
  g: 1 / 1000,
  mg: 1 / 1000 / 1000,
});
export const LengthMeterConversion: Record<LengthUnitSymbol, number> = Object.freeze({
  km: 1000,
  m: 1,
  dm: 1 / 10,
  cm: 1 / 100,
  mm: 1 / 1000,
});
export const UnitLabelPatterns = {
  DATE_TIME: /^Date[ &]+Time$/,
  DECIMAL_HOURS: /^(h[. ]+dec[.]?|hours)$/,
};
export const UnitLabelGroups = {
  WEIGHT: Object.keys(WeightKgConversion),
  LENGTH: Object.keys(LengthMeterConversion),
};

export const QualityFlagIds = {
  NOT_QUALIFIED: 0,
  GOOD: 1,
  OUT_STATS: 2,
  DOUBTFUL: 3,
  BAD: 4,
  FIXED: 5,
  NOT_COMPLETED: 8,
  MISSING: 9,
};

export const QualityFlags = Object.entries(QualityFlagIds).map(([label, id]) => ({
  id,
  label,
}));

export declare type AcquisitionLevelType =
  | 'TRIP'
  | 'OPERATION'
  | 'SALE'
  | 'LANDING'
  | 'PHYSICAL_GEAR'
  | 'CHILD_PHYSICAL_GEAR'
  | 'CATCH_BATCH'
  | 'SORTING_BATCH'
  | 'SORTING_BATCH_INDIVIDUAL'
  | 'SAMPLE'
  | 'SURVIVAL_TEST'
  | 'INDIVIDUAL_MONITORING'
  | 'INDIVIDUAL_RELEASE'
  | 'OBSERVED_LOCATION'
  | 'OBSERVED_VESSEL'
  | 'PRODUCT'
  | 'PRODUCT_SALE'
  | 'PACKET_SALE'
  | 'EXPENSE'
  | 'BAIT_EXPENSE'
  | 'ICE_EXPENSE'
  | 'CHILD_OPERATION'
  | 'ACTIVITY_CALENDAR'
  | 'MONTHLY_ACTIVITY'
  | 'ACTIVITY_CALENDAR_GEAR_USE_FEATURES'
  | 'ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES';

export const AcquisitionLevelCodes = {
  TRIP: <AcquisitionLevelType>'TRIP',
  PHYSICAL_GEAR: <AcquisitionLevelType>'PHYSICAL_GEAR',
  CHILD_PHYSICAL_GEAR: <AcquisitionLevelType>'CHILD_PHYSICAL_GEAR',
  OPERATION: <AcquisitionLevelType>'OPERATION',
  CATCH_BATCH: <AcquisitionLevelType>'CATCH_BATCH',
  SORTING_BATCH: <AcquisitionLevelType>'SORTING_BATCH',
  SORTING_BATCH_INDIVIDUAL: <AcquisitionLevelType>'SORTING_BATCH_INDIVIDUAL',
  SAMPLE: <AcquisitionLevelType>'SAMPLE',
  SURVIVAL_TEST: <AcquisitionLevelType>'SURVIVAL_TEST',
  INDIVIDUAL_MONITORING: <AcquisitionLevelType>'INDIVIDUAL_MONITORING',
  INDIVIDUAL_RELEASE: <AcquisitionLevelType>'INDIVIDUAL_RELEASE',
  LANDING: <AcquisitionLevelType>'LANDING',
  SALE: <AcquisitionLevelType>'SALE',
  OBSERVED_LOCATION: <AcquisitionLevelType>'OBSERVED_LOCATION',
  OBSERVED_VESSEL: <AcquisitionLevelType>'OBSERVED_VESSEL',
  PRODUCT: <AcquisitionLevelType>'PRODUCT',
  PRODUCT_SALE: <AcquisitionLevelType>'PRODUCT_SALE',
  PACKET_SALE: <AcquisitionLevelType>'PACKET_SALE',
  EXPENSE: <AcquisitionLevelType>'EXPENSE',
  BAIT_EXPENSE: <AcquisitionLevelType>'BAIT_EXPENSE',
  ICE_EXPENSE: <AcquisitionLevelType>'ICE_EXPENSE',
  CHILD_OPERATION: <AcquisitionLevelType>'CHILD_OPERATION',
  ACTIVITY_CALENDAR: <AcquisitionLevelType>'ACTIVITY_CALENDAR',
  MONTHLY_ACTIVITY: <AcquisitionLevelType>'MONTHLY_ACTIVITY',
  ACTIVITY_CALENDAR_GEAR_USE_FEATURES: <AcquisitionLevelType>'ACTIVITY_CALENDAR_GEAR_USE_FEATURES',
  ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES: <AcquisitionLevelType>'ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES',
};

export const SaleTypeIds = {
  AUCTION: 1,
  DIRECT: 2,
  EXPORT: 3,
  OTHER: 4,
};

export type ProgramPrivilege = 'MANAGER' | 'OBSERVER' | 'VIEWER' | 'VALIDATOR' | 'QUALIFIER';
export const ProgramPrivilegeEnum = Object.freeze({
  MANAGER: <ProgramPrivilege>'MANAGER',
  OBSERVER: <ProgramPrivilege>'OBSERVER',
  VIEWER: <ProgramPrivilege>'VIEWER',
  VALIDATOR: <ProgramPrivilege>'VALIDATOR',
  QUALIFIER: <ProgramPrivilege>'QUALIFIER',
});
export const ProgramPrivilegeIds = {
  MANAGER: 1,
  OBSERVER: 2,
  VIEWER: 3,
  VALIDATOR: 4,
  QUALIFIER: 5,
};

export const ProgramPrivilegeHierarchy = Object.freeze({
  MANAGER: <ProgramPrivilege[]>['MANAGER', 'OBSERVER', 'VALIDATOR', 'VIEWER', 'QUALIFIER'],
  VALIDATOR: <ProgramPrivilege[]>['VALIDATOR', 'OBSERVER', 'VIEWER'],
  OBSERVER: <ProgramPrivilege[]>['OBSERVER', 'VIEWER'],
  QUALIFIER: <ProgramPrivilege[]>['QUALIFIER', 'VIEWER'], // Not used yet
  VIEWER: <ProgramPrivilege[]>['VIEWER'],
});

export const ObjectTypeLabels = {
  TRIP: 'FISHING_TRIP',
  OBSERVED_LOCATION: 'OBSERVED_LOCATION',

  // Referential
  LOCATION: 'LOCATION',
  TAXON_GROUP: 'TAXON_GROUP',
  TAXON_NAME: 'TAXON_NAME',
  GEAR: 'GEAR',
  PMFM: 'PMFM',
};

export class ModelEnumUtils {
  static refreshDefaultValues() {
    MethodIdGroups.CALCULATED = Methods.getCalculatedIds();
    LocationLevelGroups.FISHING_AREA = LocationLevels.getFishingAreaLevelIds();
    LocationLevelGroups.WEIGHT_LENGTH_CONVERSION_AREA = LocationLevels.getWeightLengthConversionAreaLevelIds();
    LocationLevelGroups.STATISTICAL_RECTANGLE = LocationLevels.getStatisticalRectangleLevelIds();
  }

  static getObjectTypeByEntityName(entityName: string): string {
    if (!entityName) throw new Error("Missing argument 'entityName'");
    const label = changeCaseToUnderscore(entityName).toUpperCase();
    const value = ObjectTypeLabels[label];
    if (value) return value;
    throw new Error('Missing an ObjectType for entityName: ' + entityName);
  }

  static getEntityNameByObjectTypeLabel(objectTypeLabel: string): string {
    if (!objectTypeLabel) throw new Error("Missing argument 'objectTypeLabel'");
    const enumKey = Object.entries(ObjectTypeLabels).find(([key, value]) => objectTypeLabel === value)?.[0] || objectTypeLabel;
    return underscoreToChangeCase(enumKey);
  }
}
