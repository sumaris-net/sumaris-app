var PmfmStrategy_1, DenormalizedPmfmStrategy_1;
import { __decorate, __metadata } from "tslib";
import { Entity, EntityClass, EntityUtils, isNil, isNotEmptyArray, isNotNil, ReferentialRef, ReferentialUtils, removeDuplicatesFromArray, toNumber, } from '@sumaris-net/ngx-components';
import { Pmfm, PmfmUtils, UnitConversion } from './pmfm.model';
import { PmfmValueUtils } from './pmfm-value.model';
import { MethodIds, UnitIds } from './model.enum';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { arrayEquals } from '@app/shared/functions';
let PmfmStrategy = PmfmStrategy_1 = class PmfmStrategy extends Entity {
    constructor() {
        super(PmfmStrategy_1.TYPENAME);
    }
    clone(opts) {
        const target = super.clone(opts);
        // Keep acquisitionLevel as object
        target.acquisitionLevel = EntityUtils.isEntity(this.acquisitionLevel)
            ? this.acquisitionLevel.clone()
            : this.acquisitionLevel;
        return target;
    }
    asObject(opts) {
        var _a, _b;
        const target = super.asObject(opts);
        target.acquisitionLevel = PmfmStrategy_1.getAcquisitionLevelLabel(target);
        target.pmfmId = PmfmStrategy_1.getPmfmId(this);
        target.pmfm = this.pmfm && this.pmfm.asObject(Object.assign(Object.assign({}, NOT_MINIFY_OPTIONS), opts));
        target.parameter = this.parameter && this.parameter.asObject(Object.assign(Object.assign({}, NOT_MINIFY_OPTIONS), opts));
        target.matrix = this.matrix && this.matrix.asObject(Object.assign(Object.assign({}, NOT_MINIFY_OPTIONS), opts));
        target.fraction = this.fraction && this.fraction.asObject(Object.assign(Object.assign({}, NOT_MINIFY_OPTIONS), opts));
        target.method = this.method && this.method.asObject(Object.assign(Object.assign({}, NOT_MINIFY_OPTIONS), opts));
        // Serialize default value (into a number - because of the DB column's type)
        target.defaultValue = PmfmValueUtils.toModelValueAsNumber(this.defaultValue, this.pmfm);
        if (isNil(target.defaultValue) || this.isComputed) {
            delete target.defaultValue; // Delete if computed PMFM, or nil
        }
        // Delete min/value if NOT numeric
        if (!this.isNumeric) {
            delete target.minValue;
            delete target.maxValue;
        }
        // CLean remote id
        if (opts && opts.keepRemoteId === false) {
            delete target.id;
            delete target.updateDate;
            delete target.strategyId;
            delete target.pmfmId;
            if (EntityUtils.isRemote(target.pmfm)) {
                delete target.pmfm.id;
                delete target.pmfm.updateDate;
                delete target.pmfm.creationDate;
                (_a = target.pmfm.qualitativeValues) === null || _a === void 0 ? void 0 : _a.filter(EntityUtils.isRemote).forEach((qv) => {
                    delete qv.id;
                    delete qv.updateDate;
                    delete qv.creationDate;
                });
                if (EntityUtils.isRemote(target.pmfm.parameter)) {
                    delete target.pmfm.parameter.id;
                    delete target.pmfm.parameter.updateDate;
                    delete target.pmfm.parameter.creationDate;
                    (_b = target.pmfm.parameter.qualitativeValues) === null || _b === void 0 ? void 0 : _b.filter(EntityUtils.isRemote).forEach((qv) => {
                        delete qv.id;
                        delete qv.updateDate;
                        delete qv.creationDate;
                    });
                }
            }
            if (EntityUtils.isRemote(target.parameter))
                delete target.parameter.id;
            if (EntityUtils.isRemote(target.matrix))
                delete target.matrix.id;
            if (EntityUtils.isRemote(target.fraction))
                delete target.fraction.id;
            if (EntityUtils.isRemote(target.method))
                delete target.method.id;
            if (EntityUtils.isRemote(target.defaultValue))
                delete target.defaultValue.id;
            // Warn: do not replace gearIds, taxonGroupIds, referenceTaxonIds
            // to avoid losing some data. Should be done by caller
        }
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.pmfm = source.pmfm && Pmfm.fromObject(source.pmfm);
        this.pmfmId = toNumber(source.pmfmId, source.pmfm && source.pmfm.id);
        this.parameter = source.parameter && ReferentialRef.fromObject(source.parameter);
        this.matrix = source.matrix && ReferentialRef.fromObject(source.matrix);
        this.fraction = source.fraction && ReferentialRef.fromObject(source.fraction);
        this.method = source.method && ReferentialRef.fromObject(source.method);
        this.minValue = source.minValue;
        this.maxValue = source.maxValue;
        this.defaultValue = source.defaultValue;
        this.acquisitionNumber = source.acquisitionNumber;
        this.isMandatory = source.isMandatory;
        this.rankOrder = source.rankOrder;
        this.acquisitionLevel = source.acquisitionLevel;
        this.gearIds = (source.gearIds && [...source.gearIds]) || undefined;
        this.taxonGroupIds = (source.taxonGroupIds && [...source.taxonGroupIds]) || undefined;
        this.referenceTaxonIds = (source.referenceTaxonIds && [...source.referenceTaxonIds]) || undefined;
        this.strategyId = source.strategyId;
    }
    get required() {
        return this.isMandatory;
    }
    set required(value) {
        this.isMandatory = value;
    }
    get type() {
        return this.pmfm && this.pmfm.type;
    }
    get isNumeric() {
        return this.type === 'integer' || this.type === 'double';
    }
    get isAlphanumeric() {
        return this.type === 'string';
    }
    get isDate() {
        return this.type === 'date';
    }
    get isComputed() {
        return this.method && this.method.id === MethodIds.CALCULATED;
    }
    get isQualitative() {
        return this.type === 'qualitative_value';
    }
    get isBoolean() {
        return this.type === 'boolean';
    }
    equals(other) {
        return PmfmStrategy_1.equals(this, other);
    }
};
PmfmStrategy.isEmpty = (o) => !o || (!o.pmfm && !o.parameter && !o.matrix && !o.fraction && !o.method);
PmfmStrategy.isNotEmpty = (o) => !PmfmStrategy_1.isEmpty(o);
PmfmStrategy.getAcquisitionLevelLabel = (source) => source && ((typeof source.acquisitionLevel === 'object' && source.acquisitionLevel.label) || source.acquisitionLevel);
PmfmStrategy.getPmfmId = (source) => { var _a; return source && toNumber(source.pmfmId, (_a = source.pmfm) === null || _a === void 0 ? void 0 : _a.id); };
PmfmStrategy.equals = (o1, o2) => (isNil(o1) && isNil(o2)) ||
    // Same ID
    (o1 &&
        o2 &&
        // Same ID
        ((isNotNil(o1.id) && o1.id === o2.id) ||
            // Or same strategy, rankOrder and acquisitionLevel, etc.
            (o1.strategyId === o2.strategyId &&
                o1.rankOrder === o2.rankOrder &&
                PmfmStrategy_1.getAcquisitionLevelLabel(o1) === PmfmStrategy_1.getAcquisitionLevelLabel(o2) &&
                // And same Pmfm
                (PmfmStrategy_1.getPmfmId(o1) === PmfmStrategy_1.getPmfmId(o2) ||
                    // or same Pmfm parts (parameter/matrix/fraction/method)
                    (ReferentialUtils.equals(o1.parameter, o2.parameter) &&
                        ReferentialUtils.equals(o1.matrix, o2.matrix) &&
                        ReferentialUtils.equals(o1.fraction, o2.fraction) &&
                        ReferentialUtils.equals(o1.method, o2.method))) &&
                // And same gears
                arrayEquals(o1.gearIds, o2.gearIds) &&
                // And same taxon groups
                arrayEquals(o1.taxonGroupIds, o2.taxonGroupIds) &&
                // And same taxon names
                arrayEquals(o1.referenceTaxonIds, o2.referenceTaxonIds))));
PmfmStrategy = PmfmStrategy_1 = __decorate([
    EntityClass({ typename: 'PmfmStrategyVO' }),
    __metadata("design:paramtypes", [])
], PmfmStrategy);
export { PmfmStrategy };
let DenormalizedPmfmStrategy = DenormalizedPmfmStrategy_1 = class DenormalizedPmfmStrategy extends Entity {
    constructor(init) {
        super(DenormalizedPmfmStrategy_1.TYPENAME);
        if (init)
            this.fromObject(init);
    }
    static fromObjects(sources, opts) {
        return (sources || []).map(this.fromObject);
    }
    static fromFullPmfm(source, opts) {
        var _a;
        if (!source)
            return undefined;
        const target = new DenormalizedPmfmStrategy_1();
        target.fromObject({
            id: source.id,
            label: source.label,
            name: source.name,
            type: source.type,
            completeName: PmfmUtils.getPmfmName(source, { withDetails: true, withUnit: ((_a = source.unit) === null || _a === void 0 ? void 0 : _a.id) !== UnitIds.NONE }),
            minValue: source.minValue,
            maxValue: source.maxValue,
            defaultValue: source.defaultValue,
            maximumNumberDecimals: source.maximumNumberDecimals,
            signifFiguresNumber: source.signifFiguresNumber,
            detectionThreshold: source.detectionThreshold,
            precision: source.precision,
            parameterId: source.parameter.id,
            matrixId: source.matrixId,
            fractionId: source.fractionId,
            methodId: source.methodId,
            unitLabel: source.unitLabel,
            isComputed: PmfmUtils.isComputed(source),
            qualitativeValues: isNotEmptyArray(source.qualitativeValues)
                ? source.qualitativeValues.map(ReferentialRef.fromObject)
                : isNotEmptyArray(source.parameter.qualitativeValues)
                    ? source.parameter.qualitativeValues.map(ReferentialRef.fromObject)
                    : undefined,
            displayConversion: source.displayConversion
        });
        return target;
    }
    ;
    /**
     * Allow to merge, using the children property
     *
     * @param other
     */
    static merge(pmfm, other) {
        if (!pmfm || !other || pmfm.id !== other.id)
            throw new Error('Cannot only merge pmfm with same id');
        let result;
        // Clone current (if not already clone)
        if (isNil(pmfm.children)) {
            result = this.fromObject(pmfm).asObject(); // Clone
            result.children = [pmfm, other];
        }
        else {
            result = pmfm; // Already clone
            result.children.push(other);
        }
        // rankOrder
        result.rankOrder = Math.min(result.rankOrder || 1, other.rankOrder || 1);
        // Min value
        if (isNotNil(result.minValue) && isNotNil(other.minValue)) {
            result.minValue = Math.min(result.minValue, other.minValue);
        }
        else {
            result.minValue = null;
        }
        // Max value
        if (isNotNil(result.maxValue) && isNotNil(other.maxValue)) {
            result.maxValue = Math.max(result.maxValue, other.maxValue);
        }
        else {
            result.maxValue = null;
        }
        // Merge gears
        if (isNotEmptyArray(result.gearIds) && isNotEmptyArray(other.gearIds)) {
            result.gearIds = removeDuplicatesFromArray([...result.gearIds, ...other.gearIds]);
        }
        else {
            result.gearIds = null;
        }
        // Merge taxonGroupIds
        if (isNotEmptyArray(result.taxonGroupIds) && isNotEmptyArray(other.taxonGroupIds)) {
            result.taxonGroupIds = removeDuplicatesFromArray([...result.taxonGroupIds, ...other.taxonGroupIds]);
        }
        else {
            result.taxonGroupIds = null;
        }
        // Merge referenceTaxonIds
        if (isNotEmptyArray(result.referenceTaxonIds) && isNotEmptyArray(other.referenceTaxonIds)) {
            result.referenceTaxonIds = removeDuplicatesFromArray([...result.referenceTaxonIds, ...other.referenceTaxonIds]);
        }
        else {
            result.referenceTaxonIds = null;
        }
        // Remove strategyId
        delete result.strategyId;
        return result;
    }
    asObject(options) {
        var _a;
        const target = super.asObject(options);
        target.displayConversion = (_a = this.displayConversion) === null || _a === void 0 ? void 0 : _a.asObject(options);
        target.defaultValue = PmfmValueUtils.toModelValue(this.defaultValue, this, { applyConversion: false });
        target.qualitativeValues = this.qualitativeValues && this.qualitativeValues.map(qv => qv.asObject(options)) || undefined;
        target.children = this.children && this.children.map(c => c.asObject(options)) || undefined;
        // Revert conversion (if any)
        if (this.displayConversion)
            PmfmUtils.applyConversion(target, this.displayConversion.clone().reverse(), { markAsConverted: false });
        return target;
    }
    fromObject(source, opts) {
        var _a, _b;
        super.fromObject(source, opts);
        this.parameterId = toNumber(source.parameterId, (_a = source.parameter) === null || _a === void 0 ? void 0 : _a.id);
        this.matrixId = source.matrixId;
        this.fractionId = source.fractionId;
        this.methodId = source.methodId;
        this.label = source.label;
        this.name = source.name;
        this.completeName = source.completeName;
        this.unitLabel = source.unitLabel || ((_b = source.unit) === null || _b === void 0 ? void 0 : _b.label);
        this.type = source.type;
        this.minValue = source.minValue;
        this.maxValue = source.maxValue;
        this.acquisitionNumber = source.acquisitionNumber;
        this.displayConversion = UnitConversion.fromObject(source.displayConversion);
        this.defaultValue = source.defaultValue;
        this.maximumNumberDecimals = source.maximumNumberDecimals;
        this.signifFiguresNumber = source.signifFiguresNumber;
        this.detectionThreshold = source.detectionThreshold;
        this.precision = source.precision;
        this.isMandatory = source.isMandatory;
        this.isComputed = source.isComputed;
        this.rankOrder = source.rankOrder;
        this.acquisitionLevel = source.acquisitionLevel;
        this.gearIds = source.gearIds && [...source.gearIds] || undefined;
        this.taxonGroupIds = source.taxonGroupIds && [...source.taxonGroupIds] || undefined;
        this.referenceTaxonIds = source.referenceTaxonIds && [...source.referenceTaxonIds] || undefined;
        this.qualitativeValues = source.qualitativeValues && source.qualitativeValues.map(ReferentialRef.fromObject);
        this.strategyId = source.strategyId;
        this.children = source.children && source.children.map(child => new DenormalizedPmfmStrategy_1(child)) || undefined;
        if (this.displayConversion)
            PmfmUtils.applyConversion(this, this.displayConversion);
    }
    get required() {
        return this.isMandatory;
    }
    set required(value) {
        this.isMandatory = value;
    }
    get isNumeric() {
        return this.type === 'integer' || this.type === 'double';
    }
    get isAlphanumeric() {
        return this.type === 'string';
    }
    get isDate() {
        return this.type === 'date';
    }
    get isQualitative() {
        return this.type === 'qualitative_value';
    }
    get hasUnit() {
        return this.unitLabel && this.isNumeric;
    }
    get isWeight() {
        return PmfmUtils.isWeight(this);
    }
    get isMultiple() {
        return (this.acquisitionNumber || 1) > 1;
    }
    /**
     * @deprecated Use id instead
     */
    get pmfmId() {
        return this.id;
    }
    equals(other) {
        return other && ((isNotNil(this.id) && this.id === other.id)
            // Same strategy, acquisitionLevel, pmfmId
            || (this.strategyId === other.strategyId && this.acquisitionLevel === other.acquisitionLevel));
    }
};
DenormalizedPmfmStrategy = DenormalizedPmfmStrategy_1 = __decorate([
    EntityClass({ typename: 'DenormalizedPmfmStrategyVO' }),
    __metadata("design:paramtypes", [Object])
], DenormalizedPmfmStrategy);
export { DenormalizedPmfmStrategy };
//# sourceMappingURL=pmfm-strategy.model.js.map