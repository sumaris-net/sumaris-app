
export const ProgramLabel = {
  SIH: 'SIH' // Used for vessel's filter
}
// LP 17/08/2020 : Location level are overridden in ConfigService.overrideEnums
export const LocationLevelIds = {
  // Lands
  COUNTRY: 1,
  PORT: 2,
  AUCTION: 3,

  // At sea
  ICES_RECTANGLE: 4,
  GFCM_RECTANGLE: 5,
  ICES_DIVISION: 111,
  LOCATIONS_AREA: [4, 5, 111]
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
  DRESSING: 151,
  BATCH_MEASURED_WEIGHT: 91,
  BATCH_ESTIMATED_WEIGHT: 92,
  BATCH_CALCULATED_WEIGHT: 93,
  MEASURE_TIME: 103,
  RELEASE_LATITUDE: 110,
  RELEASE_LONGITUDE: 111,

  /* ADAP pmfms */
  LENGTH_TOTAL_CM: 81, // Use for test only
  SELF_SAMPLING_PROGRAM: 28,
  HAS_INDIVIDUAL_MEASURES: 121,
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

  /* LOGBOOK-SEA-CUCUMBER (SFA)*/
  GPS_USED: 188
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

export const MatrixIds = {
  INDIVIDUAL: 2
}

export const UnitIds = {
  NONE: 0
}

export const ParameterGroupIds = {
  UNKNOWN: 0,
  SURVEY: 1
}

export const autoCompleteFractions = {
  1362: 'Otholite', 1452: 'Otholite', 1644: 'Ecaille', 1956: 'Otholite', 2049: 'Illicium', 2050: 'Illicium', 1960: 'Otholite', 1693: 'Ecaille',
  1549: 'Otholite', 1990: 'Otholite', 1921: 'Otholite', 1912: 'Otholite', 1349: 'Otholite', 1555: 'Otholite', 1556: 'Otholite', 1986: 'Otholite',
  1988: 'Otholite', 1567: 'Otholite', 1566: 'Otholite', 1681: 'Otholite', 1772: 'Otholite', 1551: 'Otholite', 1540: 'Otholite', 1543: 'Otholite',
  1573: 'Otholite', 1980: 'Otholite', 1978: 'Otholite', 1690: 'Otholite', 1689: 'Otholite', 1351: 'Otholite', 1996: 'Otholite', 1356: 'Otholite',
  1560: 'Otholite', 1559: 'Otholite'
}

export const ParameterLabelGroups = {
  TAG_ID: ['TAG_ID', 'SAMPLE_ID' /* SAMPLE_ID parameter label is required for specific Oracle TAG_ID (SAMPLE_ID whith Pmfm id = 1435. */, 'DRESSING'],
  LENGTH: ['LENGTH_PECTORAL_FORK', 'LENGTH_CLEITHRUM_KEEL_CURVE', 'LENGTH_PREPELVIC', 'LENGTH_FRONT_EYE_PREPELVIC', 'LENGTH_LM_FORK', 'LENGTH_PRE_SUPRA_CAUDAL', 'LENGTH_CLEITHRUM_KEEL', 'LENGTH_LM_FORK_CURVE', 'LENGTH_PECTORAL_FORK_CURVE', 'LENGTH_FORK_CURVE', 'STD_STRAIGTH_LENGTH', 'STD_CURVE_LENGTH', 'SEGMENT_LENGTH', 'LENGTH_MINIMUM_ALLOWED', 'LENGTH', 'LENGTH_TOTAL', 'LENGTH_STANDARD', 'LENGTH_PREANAL', 'LENGTH_PELVIC', 'LENGTH_CARAPACE', 'LENGTH_FORK', 'LENGTH_MANTLE'],
  WEIGHT: ['WEIGHT'],
  SEX: ['SEX'],
  MATURITY: ['MATURITY_STAGE_3_VISUAL', 'MATURITY_STAGE_4_VISUAL', 'MATURITY_STAGE_5_VISUAL', 'MATURITY_STAGE_6_VISUAL', 'MATURITY_STAGE_7_VISUAL', 'MATURITY_STAGE_9_VISUAL'],
  AGE: ['AGE']
};

export const FractionIdGroups = {
  CALCIFIED_STRUCTURE: [10, 11, 12, 13]
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

export declare type WeightUnitSymbol = 'kg' | 'g' | 'mg' | 't';
export const WeightToKgCoefficientConversion = Object.freeze({
  't': 1000,
  'kg': 1,
  'g': 1/1000,
  'mg': 1/1000/1000
});

// TODO Should be override by config properties
export const UnitLabel = {
  DECIMAL_HOURS: 'h dec.',
  DATE_TIME: 'Date & Time',
  KG: <WeightUnitSymbol>'kg',
  GRAM: <WeightUnitSymbol>'g',
  MG: <WeightUnitSymbol>'mg',
  TON: <WeightUnitSymbol>'t'
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
  | 'OBSERVED_LOCATION' | 'OBSERVED_VESSEL' | 'PRODUCT' | 'PRODUCT_SALE' | 'PACKET_SALE' | 'EXPENSE' | 'BAIT_EXPENSE' | 'ICE_EXPENSE' | 'CHILD_OPERATION' ;

export const AcquisitionLevelCodes = {
  TRIP: <AcquisitionLevelType>'TRIP',
  PHYSICAL_GEAR: <AcquisitionLevelType>'PHYSICAL_GEAR',
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
  CHILD_OPERATION: <AcquisitionLevelType>'CHILD_OPERATION'
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


