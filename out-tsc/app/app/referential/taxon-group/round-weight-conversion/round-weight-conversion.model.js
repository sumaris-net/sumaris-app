var RoundWeightConversionRef_1, RoundWeightConversion_1;
import { __decorate, __metadata } from "tslib";
import { DateUtils, Entity, EntityClass, fromDateISOString, isNotNil, ReferentialRef, ReferentialUtils, toDateISOString, toFloat, toInt } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
export class BaseRoundWeightConversion extends Entity {
    constructor(__typename) {
        super(__typename);
        this.startDate = null;
        this.endDate = null;
        this.conversionCoefficient = null;
        this.taxonGroupId = null;
        this.statusId = null;
        this.description = null;
        this.comments = null;
        this.creationDate = null;
    }
    fromObject(source, opts) {
        var _a, _b;
        super.fromObject(source, opts);
        // WARN: round to hour, because CSV import can have +1 second (e.g. local time '01/01/1970' can become '01/01/1970 00:00:01')
        this.startDate = (_a = fromDateISOString(source.startDate)) === null || _a === void 0 ? void 0 : _a.startOf('day');
        this.endDate = (_b = fromDateISOString(source.endDate)) === null || _b === void 0 ? void 0 : _b.startOf('day');
        this.conversionCoefficient = toFloat(source.conversionCoefficient);
        this.taxonGroupId = toInt(source.taxonGroupId);
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
let RoundWeightConversionRef = RoundWeightConversionRef_1 = class RoundWeightConversionRef extends BaseRoundWeightConversion {
    constructor() {
        super(RoundWeightConversionRef_1.TYPENAME);
        this.locationId = null;
        this.dressingId = null;
        this.preservingId = null;
    }
    static isNotNilOrBlank(source) {
        return source && isNotNil(source.conversionCoefficient);
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.locationId = source.locationId;
        this.dressingId = source.dressingId;
        this.preservingId = source.preservingId;
    }
};
RoundWeightConversionRef = RoundWeightConversionRef_1 = __decorate([
    EntityClass({ typename: 'RoundWeightConversionVO' }),
    __metadata("design:paramtypes", [])
], RoundWeightConversionRef);
export { RoundWeightConversionRef };
let RoundWeightConversion = RoundWeightConversion_1 = class RoundWeightConversion extends BaseRoundWeightConversion {
    constructor() {
        super(RoundWeightConversion_1.TYPENAME);
        this.location = null;
        this.dressing = null;
        this.preserving = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.location = source.location && ReferentialRef.fromObject(source.location);
        this.dressing = source.dressing && ReferentialRef.fromObject(source.dressing);
        this.preserving = source.preserving && ReferentialRef.fromObject(source.preserving);
    }
    asObject(opts) {
        var _a, _b, _c;
        const target = super.asObject(opts);
        target.location = ((_a = this.location) === null || _a === void 0 ? void 0 : _a.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS))) || undefined;
        target.dressing = ((_b = this.dressing) === null || _b === void 0 ? void 0 : _b.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS))) || undefined;
        target.preserving = ((_c = this.preserving) === null || _c === void 0 ? void 0 : _c.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS))) || undefined;
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            //
        }
        return target;
    }
    equals(other) {
        // -- DEV only
        /*if (this.conversionCoefficient !== other.conversionCoefficient) console.debug('DIFF conversionCoefficient');
        if (!DateUtils.isSame(this.startDate, other.startDate)) console.debug('DIFF startDate');
        if (!DateUtils.isSame(this.endDate, other.endDate)) console.debug('DIFF endDate');
        if (!ReferentialUtils.equals(this.location, other.location)) console.debug('DIFF location');
        if (!ReferentialUtils.equals(this.dressing, other.dressing)) console.debug('DIFF dressing');
        if (!ReferentialUtils.equals(this.preserving, other.preserving)) console.debug('DIFF preserving');*/
        return (super.equals(other) && isNotNil(this.id)) ||
            // Functional unique key
            ((this.taxonGroupId === other.taxonGroupId)
                && DateUtils.isSame(this.startDate, other.startDate)
                && ReferentialUtils.equals(this.location, other.location)
                && ReferentialUtils.equals(this.dressing, other.dressing)
                && ReferentialUtils.equals(this.preserving, other.preserving));
    }
};
RoundWeightConversion = RoundWeightConversion_1 = __decorate([
    EntityClass({ typename: 'RoundWeightConversionVO' }),
    __metadata("design:paramtypes", [])
], RoundWeightConversion);
export { RoundWeightConversion };
//# sourceMappingURL=round-weight-conversion.model.js.map