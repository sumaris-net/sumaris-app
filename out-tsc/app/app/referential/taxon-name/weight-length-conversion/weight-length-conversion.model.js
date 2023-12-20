var WeightLengthConversionRef_1, WeightLengthConversion_1;
import { __decorate, __metadata } from "tslib";
import { Entity, EntityClass, fromDateISOString, isNotNil, ReferentialRef, ReferentialUtils, toDateISOString, toNumber } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
export class BaseWeightLengthConversion extends Entity {
    constructor(__typename) {
        super(__typename);
        this.year = null;
        this.startMonth = null;
        this.endMonth = null;
        this.conversionCoefficientA = null;
        this.conversionCoefficientB = null;
        this.referenceTaxonId = null;
        this.statusId = null;
        this.description = null;
        this.comments = null;
        this.creationDate = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.year = source.year;
        this.startMonth = source.startMonth;
        this.endMonth = source.endMonth;
        this.conversionCoefficientA = source.conversionCoefficientA;
        this.conversionCoefficientB = source.conversionCoefficientB;
        this.referenceTaxonId = source.referenceTaxonId;
        this.description = source.description;
        this.comments = source.comments;
        this.statusId = source.statusId;
        this.creationDate = fromDateISOString(source.creationDate);
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.creationDate = toDateISOString(this.creationDate);
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            // Convert statusId object into integer
            target.statusId = (typeof this.statusId === 'object') ? this.statusId['id'] : this.statusId;
        }
        return target;
    }
}
let WeightLengthConversionRef = WeightLengthConversionRef_1 = class WeightLengthConversionRef extends BaseWeightLengthConversion {
    constructor() {
        super(WeightLengthConversionRef_1.TYPENAME);
        this.locationId = null;
        this.lengthParameterId = null;
        this.lengthUnitId = null;
        this.lengthUnit = null;
        this.sexId = null;
        this.lengthPmfmIds = null;
    }
    static isNotNilOrBlank(source) {
        return source && isNotNil(source.conversionCoefficientA) && isNotNil(source.conversionCoefficientB);
    }
    fromObject(source, opts) {
        var _a;
        super.fromObject(source, opts);
        this.locationId = source.locationId;
        this.lengthParameterId = source.lengthParameterId;
        this.lengthUnitId = toNumber(source.lengthUnitId, (_a = source.lengthUnit) === null || _a === void 0 ? void 0 : _a.id);
        this.lengthUnit = source.lengthUnit && ReferentialRef.fromObject(source.lengthUnit);
        this.sexId = source.sexId;
        this.rectangleLabels = source.rectangleLabels;
        this.lengthPmfmIds = source.lengthPmfmIds;
    }
};
WeightLengthConversionRef = WeightLengthConversionRef_1 = __decorate([
    EntityClass({ typename: 'WeightLengthConversionVO' }),
    __metadata("design:paramtypes", [])
], WeightLengthConversionRef);
export { WeightLengthConversionRef };
let WeightLengthConversion = WeightLengthConversion_1 = class WeightLengthConversion extends BaseWeightLengthConversion {
    constructor() {
        super(WeightLengthConversion_1.TYPENAME);
        this.location = null;
        this.sex = null;
        this.lengthParameter = null;
        this.lengthUnit = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.location = source.location && ReferentialRef.fromObject(source.location);
        this.sex = source.sex && ReferentialRef.fromObject(source.sex);
        this.lengthParameter = source.lengthParameter && ReferentialRef.fromObject(source.lengthParameter);
        this.lengthUnit = source.lengthUnit && ReferentialRef.fromObject(source.lengthUnit);
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.location = this.location && this.location.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        target.sex = this.sex && this.sex.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        target.lengthParameter = this.lengthParameter && this.lengthParameter.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        target.lengthUnit = this.lengthUnit && this.lengthUnit.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        return target;
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id)) ||
            // Function unique key
            ((this.referenceTaxonId === other.referenceTaxonId)
                && (this.year === other.year)
                && (this.startMonth === other.startMonth)
                && (this.endMonth === other.endMonth)
                && ReferentialUtils.equals(this.location, other.location)
                && ReferentialUtils.equals(this.sex, other.sex)
                && ReferentialUtils.equals(this.lengthParameter, other.lengthParameter)
                && ReferentialUtils.equals(this.lengthUnit, other.lengthUnit));
    }
};
WeightLengthConversion = WeightLengthConversion_1 = __decorate([
    EntityClass({ typename: 'WeightLengthConversionVO' }),
    __metadata("design:paramtypes", [])
], WeightLengthConversion);
export { WeightLengthConversion };
//# sourceMappingURL=weight-length-conversion.model.js.map