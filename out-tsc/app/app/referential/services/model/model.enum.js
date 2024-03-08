import { changeCaseToUnderscore } from '@sumaris-net/ngx-components';
export const ProgramLabel = {
    SIH: 'SIH', // Used for vessel's filter
};
// LP 17/08/2020 : Location level are overridden in ConfigService.overrideEnums
export const LocationLevelIds = {
    // Lands
    COUNTRY: 1,
    PORT: 2,
    AUCTION: 3,
    // At sea
    SUB_AREA_ICES: 110,
    RECTANGLE_ICES: 4,
    RECTANGLE_GFCM: 5,
    DIVISION_ICES: 111,
    SUB_DIVISION_ICES: 112,
    SUB_AREA_GFCM: 140,
    DIVISION_GFCM: 141,
    SUB_DIVISION_GFCM: 142
};
export class LocationLevels {
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
    STATISTICAL_RECTANGLE: LocationLevels.getStatisticalRectangleLevelIds()
};
export const GearLevelIds = {
    FAO: 1
};
export const VesselTypeIds = {
    FISHING_VESSEL: 1,
    SCIENTIFIC_RESEARCH_VESSEL: 2
};
export const TaxonGroupTypeIds = {
    FAO: 2,
    DCF_METIER_LVL_5: 3,
    NATIONAL_METIER: 4
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
    GEAR_SPEED: 9,
    SEA_STATE: 33,
    TRIP_PROGRESS: 34,
    SURVIVAL_SAMPLING_TYPE: 35,
    TAG_ID: 82,
    DISCARD_OR_LANDING: 90,
    IS_DEAD: 94,
    DISCARD_REASON: 95,
    DEATH_TIME: 101,
    VERTEBRAL_COLUMN_ANALYSIS: 102,
    DRESSING: 151,
    PRESERVATION: 150,
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
    LENGTH_TOTAL_CM: 81,
    SELF_SAMPLING_PROGRAM: 28,
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
    TRAWL_SIZE_CAT: 418,
    BATCH_SORTING: 176,
    DISCARD_WEIGHT: 56,
    CATCH_WEIGHT: 57,
    HULL_MATERIAL: 433
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
        LANDING: 190,
        DISCARD: 191
    },
    DRESSING: {
        WHOLE: 381
    },
    PRESERVATION: {
        FRESH: 332
    },
    SIZE_UNLI_CAT: {
        NONE: 319
    },
    BATCH_GEAR_POSITION: {
        PORT: 473,
        STARBOARD: 474 // Tribord
    },
    BATCH_SORTING: {
        BULK: 390,
        NON_BULK: 391 // Hors Vrac
    },
    SEX: {
        UNSEXED: 188 // Non sexe
    }
};
export const MethodIds = {
    UNKNOWN: 0,
    MEASURED_BY_OBSERVER: 1,
    OBSERVED_BY_OBSERVER: 2,
    ESTIMATED_BY_OBSERVER: 3,
    CALCULATED: 4,
    CALCULATED_WEIGHT_LENGTH: 47,
    CALCULATED_WEIGHT_LENGTH_SUM: 283
};
export class Methods {
    static getCalculatedIds() {
        return [MethodIds.CALCULATED, MethodIds.CALCULATED_WEIGHT_LENGTH, MethodIds.CALCULATED_WEIGHT_LENGTH_SUM];
    }
}
export const MethodIdGroups = {
    CALCULATED: Methods.getCalculatedIds()
};
export const MatrixIds = {
    BATCH: 1,
    INDIVIDUAL: 2,
    GEAR: 3
};
export const ParameterGroupIds = {
    UNKNOWN: 0,
    SURVEY: 1
};
export const autoCompleteFractions = {
    1362: 'Otholite', 1452: 'Otholite', 1644: 'Ecaille', 1956: 'Otholite', 2049: 'Illicium', 2050: 'Illicium', 1960: 'Otholite', 1693: 'Ecaille',
    1549: 'Otholite', 1990: 'Otholite', 1921: 'Otholite', 1912: 'Otholite', 1349: 'Otholite', 1555: 'Otholite', 1556: 'Otholite', 1986: 'Otholite',
    1988: 'Otholite', 1567: 'Otholite', 1566: 'Otholite', 1681: 'Otholite', 1772: 'Otholite', 1551: 'Otholite', 1540: 'Otholite', 1543: 'Otholite',
    1573: 'Otholite', 1980: 'Otholite', 1978: 'Otholite', 1690: 'Otholite', 1689: 'Otholite', 1351: 'Otholite', 1996: 'Otholite', 1356: 'Otholite',
    1560: 'Otholite', 1559: 'Otholite'
};
export const ParameterLabelGroups = {
    TAG_ID: ['TAG_ID', 'SAMPLE_ID' /* SAMPLE_ID parameter label is required for specific Oracle TAG_ID (SAMPLE_ID whith Pmfm id = 1435. */,
        'DRESSING',
        'PRESERVATION'
    ],
    LENGTH: ['LENGTH_PECTORAL_FORK', 'LENGTH_CLEITHRUM_KEEL_CURVE', 'LENGTH_PREPELVIC', 'LENGTH_FRONT_EYE_PREPELVIC', 'LENGTH_LM_FORK', 'LENGTH_PRE_SUPRA_CAUDAL', 'LENGTH_CLEITHRUM_KEEL', 'LENGTH_LM_FORK_CURVE', 'LENGTH_PECTORAL_FORK_CURVE', 'LENGTH_FORK_CURVE', 'STD_STRAIGTH_LENGTH', 'STD_CURVE_LENGTH', 'SEGMENT_LENGTH', 'LENGTH_MINIMUM_ALLOWED', 'LENGTH', 'LENGTH_TOTAL', 'LENGTH_STANDARD', 'LENGTH_PREANAL', 'LENGTH_PELVIC', 'LENGTH_CARAPACE', 'LENGTH_FORK', 'LENGTH_MANTLE'],
    WEIGHT: ['WEIGHT'],
    SEX: ['SEX'],
    MATURITY: ['MATURITY_STAGE_3_VISUAL', 'MATURITY_STAGE_4_VISUAL', 'MATURITY_STAGE_5_VISUAL', 'MATURITY_STAGE_6_VISUAL', 'MATURITY_STAGE_7_VISUAL', 'MATURITY_STAGE_9_VISUAL'],
    AGE: ['AGE'],
    DRESSING: ['DRESSING'],
    PRESERVATION: ['PRESERVATION']
};
export class Parameters {
    // Remove duplication in label
    static getSampleParameterLabelGroups(opts) {
        return Parameters.getParameterLabelGroups(Object.assign({ 
            // Exclude special groups 'DRESSING' and 'PRESERVATION', used by round weight conversion
            excludedGroups: ['DRESSING', 'PRESERVATION'] }, opts));
    }
    static getParameterLabelGroups(opts) {
        opts = opts || {};
        return Object.keys(ParameterLabelGroups)
            // Keep not excluded groups
            .filter(group => { var _a; return !((_a = opts.excludedGroups) === null || _a === void 0 ? void 0 : _a.includes(group)); })
            .reduce((res, key) => {
            const labels = ParameterLabelGroups[key]
                // Remove duplication in label
                // Exclude label already in another previous group
                .filter(label => {
                var _a;
                return !Object.values(res).some((previousLabels) => previousLabels.includes(label))
                    // Keep not excluded label
                    && !((_a = opts.excludedParameterLabels) === null || _a === void 0 ? void 0 : _a.includes(label));
            });
            // Add to result, only if not empty
            if (labels.length)
                res[key] = labels;
            return res;
        }, {});
    }
}
export const FractionIdGroups = {
    CALCIFIED_STRUCTURE: [10, 11, 12, 13] // Pièces calcifiées (need by SIH-OBSBIO)
};
export const FractionId = {
    ALL: 1
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
    TAG_ID: /^TAG_ID/i
};
export const UnitIds = {
    NONE: 0
};
export const GearIds = {
//OTT: 7 // Not used - WARN id=21 in the SIH database
};
// TODO Override by config properties ?
export const UnitLabel = {
    DECIMAL_HOURS: 'h dec.',
    DATE_TIME: 'Date & Time',
    MINUTES: 'min',
    // Weight units
    TON: 't',
    KG: 'kg',
    GRAM: 'g',
    MG: 'mg',
    // Length units
    KM: 'km',
    M: 'm',
    DM: 'dm',
    CM: 'cm',
    MM: 'mm'
};
export const WeightKgConversion = Object.freeze({
    t: 1000,
    kg: 1,
    g: 1 / 1000,
    mg: 1 / 1000 / 1000
});
export const LengthMeterConversion = Object.freeze({
    km: 1000,
    m: 1,
    dm: 1 / 10,
    cm: 1 / 100,
    mm: 1 / 1000
});
export const UnitLabelPatterns = {
    DATE_TIME: /^Date[ &]+Time$/,
    DECIMAL_HOURS: /^(h[. ]+dec[.]?|hours)$/,
};
export const UnitLabelGroups = {
    WEIGHT: Object.keys(WeightKgConversion),
    LENGTH: Object.keys(LengthMeterConversion)
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
export const QualityFlags = Object.entries(QualityFlagIds).map(([label, id]) => ({
    id,
    label
}));
export const AcquisitionLevelCodes = {
    TRIP: 'TRIP',
    PHYSICAL_GEAR: 'PHYSICAL_GEAR',
    CHILD_PHYSICAL_GEAR: 'CHILD_PHYSICAL_GEAR',
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
    ICE_EXPENSE: 'ICE_EXPENSE',
    CHILD_OPERATION: 'CHILD_OPERATION'
};
export const SaleTypeIds = {
    AUCTION: 1,
    DIRECT: 2,
    EXPORT: 3,
    OTHER: 4
};
export const ProgramPrivilegeEnum = Object.freeze({
    MANAGER: 'MANAGER',
    OBSERVER: 'OBSERVER',
    VIEWER: 'VIEWER',
    VALIDATOR: 'VALIDATOR',
    QUALIFIER: 'QUALIFIER',
});
export const ProgramPrivilegeIds = {
    MANAGER: 1,
    OBSERVER: 2,
    VIEWER: 3,
    VALIDATOR: 4,
    QUALIFIER: 5
};
export const ProgramPrivilegeHierarchy = Object.freeze({
    MANAGER: ['MANAGER', 'OBSERVER', 'VALIDATOR', 'VIEWER', 'QUALIFIER'],
    VALIDATOR: ['VALIDATOR', 'OBSERVER', 'VIEWER'],
    OBSERVER: ['OBSERVER', 'VIEWER'],
    QUALIFIER: ['QUALIFIER', 'VIEWER'],
    VIEWER: ['VIEWER'],
});
export const ObjectTypeLabels = {
    TRIP: 'FISHING_TRIP',
    OBSERVED_LOCATION: 'OBSERVED_LOCATION',
};
export class ModelEnumUtils {
    static refreshDefaultValues() {
        MethodIdGroups.CALCULATED = Methods.getCalculatedIds();
        LocationLevelGroups.FISHING_AREA = LocationLevels.getFishingAreaLevelIds();
        LocationLevelGroups.WEIGHT_LENGTH_CONVERSION_AREA = LocationLevels.getWeightLengthConversionAreaLevelIds();
        LocationLevelGroups.STATISTICAL_RECTANGLE = LocationLevels.getStatisticalRectangleLevelIds();
    }
    static getObjectTypeByEntityName(entityName) {
        if (!entityName)
            throw new Error('Missing argument \'entityName\'');
        const label = changeCaseToUnderscore(entityName).toUpperCase();
        const value = ObjectTypeLabels[label];
        if (value)
            return value;
        throw new Error('Missing an ObjectType for entityName: ' + entityName);
    }
}
//# sourceMappingURL=model.enum.js.map