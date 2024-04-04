var VesselActivity_1, AggregatedLanding_1;
import { __decorate, __metadata } from "tslib";
import { MeasurementUtils, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Entity, EntityClass, EntityUtils, fromDateISOString, getPropertyByPath, isEmptyArray, isNil, isNotNil, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
let VesselActivity = VesselActivity_1 = class VesselActivity extends Entity {
    constructor() {
        super(VesselActivity_1.TYPENAME);
        this.invalid = false;
        this.date = null;
        this.rankOrder = null;
        this.comments = null;
        this.measurementValues = {};
        this.metiers = [];
        this.observedLocationId = null;
        this.landingId = null;
        this.tripId = null;
    }
    static isEmpty(value) {
        return !value || (MeasurementValuesUtils.isEmpty(value.measurementValues)
            && isEmptyArray(value.metiers));
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.date = toDateISOString(this.date);
        target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
        target.metiers = this.metiers && this.metiers.filter(EntityUtils.isRemote)
            .map(p => p && p.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS))) || undefined;
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            delete target.invalid;
        }
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.date = fromDateISOString(source.date);
        this.rankOrder = source.rankOrder;
        this.comments = source.comments;
        this.measurementValues = source.measurementValues && Object.assign({}, source.measurementValues) || MeasurementUtils.toMeasurementValues(source.measurements);
        this.metiers = source.metiers && source.metiers.filter(isNotNil).map(ReferentialRef.fromObject) || [];
        this.observedLocationId = source.observedLocationId;
        this.landingId = source.landingId;
        this.tripId = source.tripId;
        if (isNotNil(this.tripId) && isEmptyArray(this.metiers)) {
            this.metiers = [ReferentialRef.fromObject({ label: '??', name: '???' })];
            this.invalid = true;
        }
    }
};
VesselActivity = VesselActivity_1 = __decorate([
    EntityClass({ typename: 'VesselActivityVO' }),
    __metadata("design:paramtypes", [])
], VesselActivity);
export { VesselActivity };
let AggregatedLanding = AggregatedLanding_1 = class AggregatedLanding extends Entity {
    constructor() {
        super(AggregatedLanding_1.TYPENAME);
        this.synchronizationStatus = null;
        this.vesselSnapshot = null;
        this.vesselActivities = [];
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.vesselSnapshot = this.vesselSnapshot && this.vesselSnapshot.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        target.vesselActivities = this.vesselActivities && this.vesselActivities.map(value => value.asObject(opts));
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            if (opts.keepSynchronizationStatus !== true) {
                delete target.synchronizationStatus; // Remove by default, when minify, because not exists on pod's model
            }
        }
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
        // this.id = this.vesselSnapshot.id;
        this.observedLocationId = source.observedLocationId;
        this.vesselActivities = source.vesselActivities && source.vesselActivities.map(VesselActivity.fromObject) || [];
        this.synchronizationStatus = source.synchronizationStatus;
    }
};
AggregatedLanding = AggregatedLanding_1 = __decorate([
    EntityClass({ typename: 'AggregatedLandingVO' }),
    __metadata("design:paramtypes", [])
], AggregatedLanding);
export { AggregatedLanding };
export class AggregatedLandingUtils {
    static sort(data, sortBy, sortDirection) {
        if ((data === null || data === void 0 ? void 0 : data.length) > 0 && sortBy === 'vessel') {
            return data.sort(AggregatedLandingUtils.naturalSortComparator('vesselSnapshot.exteriorMarking', sortDirection));
        }
        return data;
    }
    // todo move to ngx-sumaris-components
    static naturalSortComparator(property, sortDirection) {
        const collator = new Intl.Collator(undefined, { numeric: true });
        const direction = !sortDirection || sortDirection === 'asc' ? 1 : -1;
        return (r1, r2) => {
            let v1 = getPropertyByPath(r1, property);
            let v2 = getPropertyByPath(r2, property);
            if (isNil(v1))
                return -direction;
            if (isNil(v2))
                return direction;
            if (EntityUtils.isNotEmpty(v1, 'id') && EntityUtils.isNotEmpty(v2, 'id')) {
                v1 = v1.id;
                v2 = v2.id;
            }
            return collator.compare(String(v1), String(v2)) * direction;
        };
    }
}
//# sourceMappingURL=aggregated-landing.model.js.map