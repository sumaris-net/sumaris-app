// TODO BL: gérer pour etre dynamique (=6 pour le SIH)

// LP 17/08/2020 : Location level are overridden in ConfigService.overrideEnums
import {ObjectMap} from "@sumaris-net/ngx-components";
export const ProgramLabel = {
  SIH: 'SIH' // Used for vessel's filter
}

export const LocationLevelIds = {
  // Lands
  COUNTRY: 1,
  PORT: 2,
  AUCTION: 3,

  // At sea
  ICES_RECTANGLE: 4,
  ICES_DIVISION: 111
};

export const GearLevelIds = {
  FAO: 1
};

export const TaxonGroupIds = {
  FAO: 2,
  METIER: 3
};

export const TaxonomicLevelIds = {
  ORDO: 13,
  FAMILY: 17,
  GENUS: 26,
  SUBGENUS: 27,
  SPECIES: 28,
  SUBSPECIES: 29
};

export const PmfmIds = {
  TRIP_PROGRESS: 34,
  SURVIVAL_SAMPLING_TYPE: 35,
  TAG_ID: 82,
  DISCARD_OR_LANDING: 90,
  IS_DEAD: 94,
  DISCARD_REASON: 95,
  DEATH_TIME: 101,
  VERTEBRAL_COLUMN_ANALYSIS: 102,
  IS_SAMPLING: 121,
  DRESSING: 151,
  BATCH_MEASURED_WEIGHT: 91,
  BATCH_ESTIMATED_WEIGHT: 92,
  BATCH_CALCULATED_WEIGHT: 93,

  /* ADAP pmfms */
  LENGTH_TOTAL_CM: 81, // Use for test only
  SELF_SAMPLING_PROGRAM: 28,
  CONTROLLED_SPECIES: 134,
  SAMPLE_MEASURED_WEIGHT: 140,
  SAMPLE_INDIV_COUNT: 153,
  OUT_OF_SIZE_WEIGHT: 142,
  OUT_OF_SIZE_PCT: 143,
  OUT_OF_SIZE_INDIV_COUNT: 152,
  PARASITIZED_INDIV_COUNT: 155,
  PARASITIZED_INDIV_PCT: 156,
  DIRTY_INDIV_COUNT: 157,
  DIRTY_INDIV_PCT: 158,
  VIVACITY: 144,

  /* PARAMBIO pmfms */
  STRATEGY_LABEL: 359,
  AGE: 350,
  SEX: 80,
  MAIN_METIER: 25,

  /* OBSDEB pmfms */
  PACKAGING: 177,
  SIZE_CATEGORY: 174,
  TOTAL_PRICE: 270,
  AVERAGE_PACKAGING_PRICE: 271,
  AVERAGE_PRICE_WEI: 272,
  SALE_ESTIMATED_RATIO: 278,
  SALE_RANK_ORDER: 279,
};

export const QualitativeLabels = {
  DISCARD_OR_LANDING: {
    LANDING: 'LAN',
    DISCARD: 'DIS'
  },
  SURVIVAL_SAMPLING_TYPE: {
    SURVIVAL: 'S',
    CATCH_HAUL: 'C',
    UNSAMPLED: 'N'
  },
  VIVACITY: {
    DEAD: 'MOR'
  }
};

export const QualitativeValueIds = {
  DISCARD_OR_LANDING: {
    LANDING: 190
  }
};

export const MethodIds = {
  MEASURED_BY_OBSERVER: 1,
  OBSERVED_BY_OBSERVER: 2,
  ESTIMATED_BY_OBSERVER: 3,
  CALCULATED: 4
};

export const autoCompleteFractions = {
  1362: 'Otholite', 1452: 'Otholite', 1644: 'Ecaille', 1956: 'Otholite', 2049: 'Illicium', 2050: 'Illicium', 1960: 'Otholite', 1693: 'Ecaille',
  1549: 'Otholite', 1990: 'Otholite', 1921: 'Otholite', 1912: 'Otholite', 1349: 'Otholite', 1555: 'Otholite', 1556: 'Otholite', 1986: 'Otholite',
  1988: 'Otholite', 1567: 'Otholite', 1566: 'Otholite', 1681: 'Otholite', 1772: 'Otholite', 1551: 'Otholite', 1540: 'Otholite', 1543: 'Otholite',
  1573: 'Otholite', 1980: 'Otholite', 1978: 'Otholite', 1690: 'Otholite', 1689: 'Otholite', 1351: 'Otholite', 1996: 'Otholite', 1356: 'Otholite',
  1560: 'Otholite', 1559: 'Otholite'
}

export const ParameterLabelGroups = {
  TAG_ID: ['TAG_ID'],
  DRESSING: ['DRESSING'],
  LENGTH: ['LENGTH_PECTORAL_FORK', 'LENGTH_CLEITHRUM_KEEL_CURVE', 'LENGTH_PREPELVIC', 'LENGTH_FRONT_EYE_PREPELVIC', 'LENGTH_LM_FORK', 'LENGTH_PRE_SUPRA_CAUDAL', 'LENGTH_CLEITHRUM_KEEL', 'LENGTH_LM_FORK_CURVE', 'LENGTH_PECTORAL_FORK_CURVE', 'LENGTH_FORK_CURVE', 'STD_STRAIGTH_LENGTH', 'STD_CURVE_LENGTH', 'SEGMENT_LENGTH', 'LENGTH_MINIMUM_ALLOWED', 'LENGTH', 'LENGTH_TOTAL', 'LENGTH_STANDARD', 'LENGTH_PREANAL', 'LENGTH_PELVIC', 'LENGTH_CARAPACE', 'LENGTH_FORK', 'LENGTH_MANTLE'],
  WEIGHT: ['WEIGHT'],
  SEX: ['SEX'],
  MATURITY: ['MATURITY_STAGE_3_VISUAL', 'MATURITY_STAGE_4_VISUAL', 'MATURITY_STAGE_5_VISUAL', 'MATURITY_STAGE_6_VISUAL', 'MATURITY_STAGE_7_VISUAL', 'MATURITY_STAGE_9_VISUAL'],
  AGE: ['AGE']
};

export const ParameterGroups = Object.freeze(Object.keys(ParameterLabelGroups));

export const PmfmLabelPatterns = {
  BATCH_WEIGHT: /^BATCH_(.+)_WEIGHT$/,
  LATITUDE: /^latitude$/i,
  LONGITUDE: /^longitude$/i
};

export const UnitLabelPatterns = {
  DECIMAL_HOURS: /^(h[. ]+dec[.]?|hours)$/,
  DATE_TIME: /^Date[ &]+Time$/
};

// TODO Should be override by config properties
export const UnitLabel = {
  DECIMAL_HOURS: 'h dec.',
  DATE_TIME: 'Date & Time',
  KG: 'kg'
};
export const QualityFlagIds = {
  NOT_QUALIFIED: 0,
  GOOD: 1,
  OUT_STATS: 2,
  DOUBTFUL: 3,
  BAD: 4,
  FIXED: 5,
  NOT_COMPLETED: 8,
  MISSING: 9
};

export const QualityFlags = Object.entries(QualityFlagIds).map(([label, id]) => {
  return {
    id,
    label
  };
});

export declare type AcquisitionLevelType = 'TRIP' | 'OPERATION' | 'SALE' | 'LANDING' | 'PHYSICAL_GEAR' | 'CATCH_BATCH'
  | 'SORTING_BATCH' | 'SORTING_BATCH_INDIVIDUAL' | 'SAMPLE' | 'SURVIVAL_TEST' | 'INDIVIDUAL_MONITORING' | 'INDIVIDUAL_RELEASE'
  | 'OBSERVED_LOCATION' | 'OBSERVED_VESSEL' | 'PRODUCT' | 'PRODUCT_SALE' | 'PACKET_SALE' | 'EXPENSE' | 'BAIT_EXPENSE' | 'ICE_EXPENSE' ;

export const AcquisitionLevelCodes: { [key: string]: AcquisitionLevelType} = {
  TRIP: 'TRIP',
  PHYSICAL_GEAR: 'PHYSICAL_GEAR',
  OPERATION: 'OPERATION',
  CATCH_BATCH: 'CATCH_BATCH',
  SORTING_BATCH: 'SORTING_BATCH',
  SORTING_BATCH_INDIVIDUAL: 'SORTING_BATCH_INDIVIDUAL',
  SAMPLE: 'SAMPLE',
  SURVIVAL_TEST: 'SURVIVAL_TEST',
  INDIVIDUAL_MONITORING: 'INDIVIDUAL_MONITORING',
  INDIVIDUAL_RELEASE: 'INDIVIDUAL_RELEASE',
  LANDING: 'LANDING',
  SALE: 'SALE',
  OBSERVED_LOCATION: 'OBSERVED_LOCATION',
  OBSERVED_VESSEL: 'OBSERVED_VESSEL',
  PRODUCT: 'PRODUCT',
  PRODUCT_SALE: 'PRODUCT_SALE',
  PACKET_SALE: 'PACKET_SALE',
  EXPENSE: 'EXPENSE',
  BAIT_EXPENSE: 'BAIT_EXPENSE',
  ICE_EXPENSE: 'ICE_EXPENSE'
};

export const SaleTypeIds = {
  AUCTION: 1,
  DIRECT: 2,
  EXPORT: 3,
  OTHER: 4
};

export const ProgramPrivilegeIds = {
  MANAGER: 1,
  OBSERVER: 2,
  VIEWER: 3,
  VALIDATOR: 4,
  QUALIFIER: 5
};


