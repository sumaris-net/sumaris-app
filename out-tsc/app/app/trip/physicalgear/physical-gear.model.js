var PhysicalGear_1;
import { __decorate, __metadata } from "tslib";
import { EntityClass, EntityUtils, isEmptyArray, isNil, isNotEmptyArray, isNotNil, ReferentialRef } from '@sumaris-net/ngx-components';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';
import { MeasurementUtils, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { TripRef } from '@app/trip/trip/trip-ref.model';
let PhysicalGear = PhysicalGear_1 = class PhysicalGear extends RootDataEntity {
    constructor() {
        super(PhysicalGear_1.TYPENAME);
        this.rankOrder = null;
        this.gear = null;
        this.measurements = null;
        this.measurementValues = {};
        // Parent (e.g. sub gears - see APASE program)
        this.parent = null;
        this.parentId = null;
        this.children = null;
        // Parent trip (used when lookup gears)
        this.trip = null;
        this.tripId = null;
    }
    static equals(s1, s2, opts = { withRankOrder: true, withMeasurementValues: false }) {
        return s1 && s2 && s1.id === s2.id
            // Or
            || (
            // Same gear
            (s1.gear && s2.gear && s1.gear.id === s2.gear.id)
                // Same rankOrder
                && (opts.withRankOrder === false || s1.rankOrder === s2.rankOrder)
                // Same measurementValues
                && (opts.withMeasurementValues !== true || MeasurementValuesUtils.equals(s1.measurementValues, s2.measurementValues))
            // WARN: compare parent (e.g. same trip) is to complicated, because it can be not set yet, before saving
            );
    }
    static computeSameAsScore(reference, source, opts) {
        var _a, _b;
        if (!source)
            return -1;
        return (((_a = reference.gear) === null || _a === void 0 ? void 0 : _a.id) === ((_b = source.gear) === null || _b === void 0 ? void 0 : _b.id) ? 1 : 0) * 1000
            + ((opts === null || opts === void 0 ? void 0 : opts.withMeasurementValues) !== false && MeasurementValuesUtils.equals(reference.measurementValues, source.measurementValues) ? 1 : 0) * 100
            + ((opts === null || opts === void 0 ? void 0 : opts.withRankOrder) !== false && reference.rankOrder === source.rankOrder ? 1 : 0) * 10
            + ((opts === null || opts === void 0 ? void 0 : opts.tripId) !== false && reference.tripId === source.tripId ? 1 : 0) * 1;
    }
    static scoreComparator(gear, sortDirection, opts) {
        const direction = !sortDirection || sortDirection === 'desc' ? -1 : 1;
        return (g1, g2) => {
            const score1 = this.computeSameAsScore(gear, g1, opts);
            const score2 = this.computeSameAsScore(gear, g2, opts);
            return score1 === score2 ? 0 : (score1 > score2 ? direction : -direction);
        };
    }
    static fromObjectArrayAsTree(sources, opts) {
        if (!sources)
            return null;
        // Convert to entities
        const targets = (sources || [])
            .map(json => this.fromObject(json, Object.assign(Object.assign({}, opts), { withChildren: false })));
        // Find roots
        const root = targets.filter(g => isNil(g.parentId));
        // Link to parent (using parentId)
        targets.forEach(t => {
            t.parent = isNotNil(t.parentId) && root.find(p => p.id === t.parentId) || undefined;
            t.parentId = undefined; // Avoid redundant info on parent
        });
        // Link to children
        root.forEach(s => s.children = targets.filter(p => p.parent && p.parent === s) || []);
        console.debug('[physical-gear-model] fromObjectArrayAsTree() result:', root);
        // Return root
        return root;
    }
    /**
     * Transform an entities tree, into an array of objects.
     * children.parent are removed, to keep only a parentId
     *
     * @param source
     * @param opts
     * @throw Error if a batch has no id
     */
    static treeAsObjectArray(sources, opts) {
        return sources && sources
            // Reduce to array
            .reduce((res, source) => {
            // Convert entity into object, WITHOUT children (will be set later)
            const target = source.asObject ? source.asObject(Object.assign(Object.assign({}, opts), { withChildren: false })) : Object.assign(Object.assign({}, source), { children: undefined });
            // Link target with the given parent
            const parent = opts && opts.parent;
            if (parent) {
                if (isNil(parent.id)) {
                    throw new Error(`Cannot convert physicalGears tree into array: No id found for the physicalGear with rankOrder=${parent.rankOrder}!`);
                }
                target.parentId = parent.id;
                delete target.parent; // not need
            }
            if (isNotEmptyArray(source.children)) {
                return res.concat(target)
                    .concat(...this.treeAsObjectArray(source.children, Object.assign(Object.assign({}, opts), { parent: target })));
            }
            return res.concat(target);
        }, []) || undefined;
    }
    copy(target) {
        target.fromObject(this);
    }
    fromObject(source, opts) {
        super.fromObject(source);
        this.rankOrder = source.rankOrder;
        this.gear = source.gear && ReferentialRef.fromObject(source.gear);
        this.measurementValues = source.measurementValues && Object.assign({}, source.measurementValues) || MeasurementUtils.toMeasurementValues(source.measurements);
        // Parent / children
        this.parentId = source.parentId;
        this.parent = source.parent && PhysicalGear_1.fromObject(source.parent);
        if (!opts || opts.withChildren !== false) {
            this.children = source.children && source.children.map(child => PhysicalGear_1.fromObject(child, opts)) || undefined;
        }
        // Trip
        if (source.trip) {
            this.trip = source.trip && TripRef.fromObject(source.trip);
            this.tripId = this.trip && this.trip.id;
        }
        else {
            this.trip = null;
            this.tripId = source.tripId || null; // to keep tripId on clone even if source.trip is null.
        }
        return this;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.gear = this.gear && this.gear.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        if (target.gear && !target.gear.entityName) {
            console.warn('Fixme : manually set gear entityName!');
            target.gear.entityName = 'GearVO';
        }
        target.rankOrder = this.rankOrder;
        // Measurements
        target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
        if (isEmptyArray(target.measurements))
            delete target.measurements;
        // Parent / children
        target.children = this.children && (!opts || opts.withChildren !== false) && this.children.map(c => c.asObject(opts)) || undefined;
        target.parentId = this.parentId || this.parent && this.parent.id || undefined;
        if (opts && opts.minify) {
            // Parent not need, as the tree will be used by pod
            delete target.parent;
            delete target.parentId;
            // Trip not need by pod
            delete target.trip;
        }
        if (opts && opts.keepRemoteId === false && target.tripId >= 0)
            delete target.tripId;
        if (opts && opts.keepLocalId === false && target.tripId < 0)
            delete target.tripId;
        return target;
    }
    equals(other, opts = { withMeasurementValues: false }) {
        return (super.equals(other) && isNotNil(this.id))
            || (
            // Same gear
            (this.gear && other.gear && this.gear.id === other.gear.id)
                // Same rankOrder
                && (this.rankOrder === other.rankOrder)
                // Same parent
                && ((!this.parentId && !other.parentId) || this.parentId === other.parentId)
                // Same trip
                && ((!this.tripId && !other.tripId) || this.tripId === other.tripId)
                // Same measurementsValues
                && (opts.withMeasurementValues !== true || MeasurementValuesUtils.equals(this.measurementValues, other.measurementValues)));
    }
};
PhysicalGear.rankOrderComparator = EntityUtils.sortComparator('rankOrder');
PhysicalGear = PhysicalGear_1 = __decorate([
    EntityClass({ typename: 'PhysicalGearVO' }),
    __metadata("design:paramtypes", [])
], PhysicalGear);
export { PhysicalGear };
//# sourceMappingURL=physical-gear.model.js.map