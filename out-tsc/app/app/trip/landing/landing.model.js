var Landing_1;
import { __decorate, __metadata } from "tslib";
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { Sample } from '../sample/sample.model';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
import { fillRankOrder } from '@app/data/services/model/model.utils';
import { DateUtils, EntityClass, EntityClasses, fromDateISOString, isNotNil, isNotNilOrBlank, Person, ReferentialRef, ReferentialUtils, toDateISOString, toNumber } from '@sumaris-net/ngx-components';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Strategy } from '@app/referential/services/model/strategy.model';
/**
 * Landing entity
 */
let Landing = Landing_1 = class Landing extends DataRootVesselEntity {
    constructor() {
        super(Landing_1.TYPENAME);
        this.strategy = null;
        this.dateTime = null;
        this.location = null;
        this.rankOrder = null;
        this.rankOrderOnVessel = null;
        this.measurementValues = null;
        // Parent entity
        this.tripId = null;
        this.trip = null;
        this.observedLocationId = null;
        this.observedLocation = null;
        this.observers = null;
        this.samples = null;
        this.samplesCount = null;
    }
    asObject(opts) {
        var _a, _b, _c, _d, _e;
        const target = super.asObject(opts);
        target.dateTime = toDateISOString(this.dateTime);
        target.location =
            (this.location && this.location.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS /*keep for list*/))) || undefined;
        target.observers = (this.observers && this.observers.map((p) => p && p.asObject(opts))) || undefined;
        target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
        target.rankOrder = this.rankOrderOnVessel; // this.rankOrder is not persisted
        // Parent
        target.tripId = this.tripId;
        target.trip = ((_a = this.trip) === null || _a === void 0 ? void 0 : _a.asObject(opts)) || undefined;
        target.observedLocationId = this.observedLocationId;
        target.observedLocation = ((_b = this.observedLocation) === null || _b === void 0 ? void 0 : _b.asObject(opts)) || undefined;
        // Samples
        target.samples = (this.samples && this.samples.map((s) => s.asObject(opts))) || undefined;
        target.samplesCount =
            (this.samples && this.samples.filter((s) => s.measurementValues && isNotNilOrBlank(s.measurementValues[PmfmIds.TAG_ID])).length) || undefined;
        // Strategy
        target.strategy = (_c = this.strategy) === null || _c === void 0 ? void 0 : _c.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS /*keep for field*/));
        if (opts && opts.minify) {
            delete target.rankOrderOnVessel;
            target.observedLocationId = toNumber(target.observedLocationId, (_d = target.observedLocation) === null || _d === void 0 ? void 0 : _d.id);
            delete target.observedLocation;
            if (((_e = target.strategy) === null || _e === void 0 ? void 0 : _e.label) && PmfmIds.STRATEGY_LABEL !== -1) {
                target.measurementValues[PmfmIds.STRATEGY_LABEL] = target.strategy.label;
            }
            delete target.strategy;
        }
        return target;
    }
    fromObject(source) {
        var _a, _b;
        super.fromObject(source);
        this.dateTime = fromDateISOString(source.dateTime);
        this.location = source.location && ReferentialRef.fromObject(source.location);
        this.rankOrder = source.rankOrder;
        this.rankOrderOnVessel = source.rankOrder; // Landing.rankOrder is stored in rankOrderOnVessel, this.rankOrder is computed by LandingService
        this.observers = (source.observers && source.observers.map(Person.fromObject)) || [];
        this.measurementValues = Object.assign({}, source.measurementValues); // Copy values
        // Parent
        this.tripId = source.tripId;
        this.trip = (source.trip && EntityClasses.fromObject(source.trip, { entityName: 'Trip' })) || undefined;
        this.observedLocationId = source.observedLocationId;
        this.observedLocation =
            (source.observedLocation && EntityClasses.fromObject(source.observedLocation, { entityName: 'ObservedLocation' })) || undefined;
        // Samples
        this.samples = (source.samples && source.samples.map(Sample.fromObject)) || undefined;
        this.samplesCount = toNumber(source.samplesCount, (_a = this.samples) === null || _a === void 0 ? void 0 : _a.filter((s) => s.measurementValues && isNotNilOrBlank(s.measurementValues[PmfmIds.TAG_ID])).length);
        // Strategy
        this.strategy =
            ReferentialRef.fromObject(source.strategy) ||
                (((_b = source.measurementValues) === null || _b === void 0 ? void 0 : _b[PmfmIds.STRATEGY_LABEL]) && Strategy.fromObject({ label: source.measurementValues[PmfmIds.STRATEGY_LABEL] })) ||
                undefined;
        // Fill rankOrder (workaround - fix an issue in IMAGINE)
        // FIXME: remove when SAMPLE.RANK_ORDER will always be filled by IMAGINE
        fillRankOrder(this.samples);
    }
    equals(other) {
        return ((super.equals(other) && isNotNil(this.id)) ||
            // Same vessel
            (this.vesselSnapshot &&
                other.vesselSnapshot &&
                this.vesselSnapshot.id === other.vesselSnapshot.id &&
                // Same rank order on vessel
                this.rankOrderOnVessel &&
                other.rankOrderOnVessel &&
                this.rankOrderOnVessel === other.rankOrderOnVessel &&
                // Same date
                DateUtils.equals(this.dateTime, other.dateTime) &&
                // Same location
                ReferentialUtils.equals(this.location, other.location)));
    }
    getStrategyDateTime() {
        return this.dateTime;
    }
};
Landing = Landing_1 = __decorate([
    EntityClass({ typename: 'LandingVO' }),
    __metadata("design:paramtypes", [])
], Landing);
export { Landing };
//# sourceMappingURL=landing.model.js.map