var Operation_1, OperationGroup_1, Trip_1;
import { __decorate, __metadata } from "tslib";
import { isMoment } from 'moment';
import { DataEntity, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE } from '@app/data/services/model/data-entity.model';
import { Measurement, MeasurementUtils, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { Sale } from '../sale/sale.model';
import { DateUtils, EntityClass, fromDateISOString, isEmptyArray, isNil, isNotEmptyArray, isNotNil, Person, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
import { Landing } from '../landing/landing.model';
import { Sample } from '../sample/sample.model';
import { Batch } from '../batch/common/batch.model';
import { Product } from '../product/product.model';
import { Packet } from '../packet/packet.model';
import { ExpectedSale } from '@app/trip/sale/expected-sale.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Metier } from '@app/referential/metier/metier.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { VesselPosition } from '@app/data/position/vessel/vessel-position.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { OperationPasteFlags } from '@app/referential/services/config/program.config';
import { hasFlag } from '@app/shared/flags.utils';
import { PositionUtils } from '@app/data/position/position.utils';
import { PmfmIds } from '@app/referential/services/model/model.enum';
export const MINIFY_OPERATION_FOR_LOCAL_STORAGE = Object.freeze(Object.assign(Object.assign({}, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE), { batchAsTree: false, sampleAsTree: false, keepTrip: true // Trip is needed to apply filter on it
 }));
export const FISHING_AREAS_LOCATION_REGEXP = /^fishingAreas\.[0-9]+\.location$/;
export const POSITIONS_REGEXP = /^startPosition|fishingStartPosition|fishingEndPosition|endPosition$/;
let Operation = Operation_1 = class Operation extends DataEntity {
    constructor() {
        super(Operation_1.TYPENAME);
        this.startDateTime = null;
        this.endDateTime = null;
        this.fishingStartDateTime = null;
        this.fishingEndDateTime = null;
        this.comments = null;
        this.rankOrder = null; // This attribute is not stored in the DB, but used to retrieve an operation locally, after saving it
        this.rankOrderOnPeriod = null;
        this.hasCatch = null;
        this.positions = null;
        this.startPosition = null;
        this.fishingStartPosition = null;
        this.fishingEndPosition = null;
        this.endPosition = null;
        this.metier = null;
        this.physicalGear = null;
        this.tripId = null;
        this.vesselId = null; // Copy from trip (need by local filter)
        this.programLabel = null; // Copy from trip (need by local filter)
        this.measurements = [];
        this.samples = null;
        this.catchBatch = null;
        this.fishingAreas = [];
        this.parentOperationId = null;
        this.parentOperation = null;
        this.childOperationId = null;
        this.childOperation = null;
    }
    static rankOrderComparator(sortDirection = 'asc') {
        return !sortDirection || sortDirection !== 'desc' ? Operation_1.sortByAscRankOrder : Operation_1.sortByDescRankOrder;
    }
    ;
    static sortByAscRankOrder(n1, n2) {
        return n1.rankOrder === n2.rankOrder ? 0 :
            (n1.rankOrder > n2.rankOrder ? 1 : -1);
    }
    static sortByDescRankOrder(n1, n2) {
        return n1.rankOrder === n2.rankOrder ? 0 :
            (n1.rankOrder > n2.rankOrder ? -1 : 1);
    }
    static sortByEndDateOrStartDate(n1, n2) {
        const d1 = n1.endDateTime || n1.startDateTime;
        const d2 = n2.endDateTime || n2.startDateTime;
        return d1.isSame(d2) ? 0 : (d1.isAfter(d2) ? 1 : -1);
    }
    ;
    asObject(opts) {
        var _a, _b;
        const target = super.asObject(opts);
        target.startDateTime = toDateISOString(this.startDateTime);
        target.endDateTime = toDateISOString(this.endDateTime);
        target.fishingStartDateTime = toDateISOString(this.fishingStartDateTime);
        target.fishingEndDateTime = toDateISOString(this.fishingEndDateTime);
        // Fill date of start position (if valid)
        if (PositionUtils.isNotNilAndValid(target.startPosition)) {
            target.startPosition.dateTime = target.startDateTime;
        }
        else {
            // Invalid position: remove it
            delete target.startPosition;
        }
        // Fill date of fishing start position (if valid)
        if (PositionUtils.isNotNilAndValid(target.fishingStartPosition)) {
            // Make sure to fill fishing start date, using start date if need
            target.fishingStartDateTime = target.fishingStartDateTime || target.startDateTime;
            target.fishingStartPosition.dateTime = target.fishingStartDateTime;
        }
        else {
            // Invalid position: remove it
            delete target.fishingStartPosition;
        }
        // Fill fishing start position (if valid)
        if (PositionUtils.isNotNilAndValid(target.fishingEndPosition)) {
            target.fishingEndDateTime = target.fishingEndDateTime || target.fishingStartDateTime || target.startDateTime;
            target.fishingEndPosition.dateTime = target.fishingEndDateTime;
        }
        else {
            // Invalid position: remove it
            delete target.fishingEndPosition;
        }
        // Fill end date, by using start date (because NOT NULL constraint on Pod)
        target.endDateTime = target.endDateTime || target.fishingEndDateTime || target.fishingStartDateTime || target.startDateTime;
        // Fill end position date/time (if valid = has latitude AND longitude)
        if (PositionUtils.isNotNilAndValid(target.endPosition)) {
            target.endPosition.dateTime = target.endDateTime;
        }
        // Invalid position (missing latitude or longitude - allowed in on FIELD mode): remove it
        else {
            delete target.endPosition;
        }
        // Create an array of position, instead of start/end
        target.positions = [
            target.startPosition,
            target.fishingStartPosition,
            target.fishingEndPosition,
            target.endPosition
        ]
            .filter(p => p === null || p === void 0 ? void 0 : p.dateTime)
            .map(p => p && p.asObject(opts)) || undefined;
        delete target.startPosition;
        delete target.fishingStartPosition;
        delete target.fishingEndPosition;
        delete target.endPosition;
        // Physical gear
        target.physicalGear = this.physicalGear && this.physicalGear.asObject(Object.assign(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS), { withChildren: false }));
        if (target.physicalGear) {
            if (opts === null || opts === void 0 ? void 0 : opts.minify)
                delete target.physicalGear.synchronizationStatus;
            delete target.physicalGear.measurementValues;
        }
        target.physicalGearId = (_a = this.physicalGear) === null || _a === void 0 ? void 0 : _a.id;
        if (opts && opts.keepLocalId === false && target.physicalGearId < 0) {
            delete target.physicalGearId; // Remove local id
        }
        // Metier
        target.metier = this.metier && this.metier.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS /*Always minify=false, because of operations tables cache*/)) || undefined;
        // Measurements
        target.measurements = this.measurements && this.measurements.filter(MeasurementUtils.isNotEmpty).map(m => m.asObject(opts)) || undefined;
        // Samples
        {
            // Serialize samples into a tree (will keep only children arrays, and removed parentId and parent)
            if (!opts || opts.sampleAsTree !== false) {
                target.samples = this.samples
                    // Select root samples
                    && this.samples.filter(s => isNil(s.parentId) && isNil(s.parent))
                        .map(s => s.asObject(Object.assign(Object.assign({}, opts), { withChildren: true }))) || undefined;
            }
            else {
                // Serialize as samples array (this will fill parentId, and remove children and parent properties)
                target.samples = Sample.treeAsObjectArray(this.samples, opts);
            }
        }
        // Batch
        if (target.catchBatch) {
            // Serialize batches into a tree (will keep only children arrays, and removed parentId and parent)
            if (!opts || opts.batchAsTree !== false) {
                target.catchBatch = this.catchBatch && this.catchBatch.asObject(Object.assign(Object.assign({}, opts), { withChildren: true })) || undefined;
            }
            // Serialize as batches array (this will fill parentId, and remove children and parent properties)
            else {
                target.batches = Batch.treeAsObjectArray(target.catchBatch, opts);
                delete target.catchBatch;
            }
        }
        // Fishing areas
        target.fishingAreas = this.fishingAreas && this.fishingAreas.map(value => value.asObject(opts)) || undefined;
        // Child/Parent operation id
        target.parentOperationId = this.parentOperationId || this.parentOperation && this.parentOperation.id;
        target.childOperationId = this.childOperationId || this.childOperation && this.childOperation.id;
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            delete target.childOperation;
            // When store into local storage, keep tripId on parent local operation (if not same trip)
            // This is need at validation time (see OperationValidators.remoteParent) to detect local parent outside the trip
            if (opts.keepTrip
                && target.parentOperationId < 0
                && isNotNil((_b = this.parentOperation) === null || _b === void 0 ? void 0 : _b.tripId)
                // Integrity check: make sure parentOperation reference same operation as 'target.parentOperationId'
                && this.parentOperation.id === target.parentOperationId) {
                target.parentOperation = {
                    id: this.parentOperation.id,
                    tripId: this.parentOperation.tripId
                };
            }
            else {
                delete target.parentOperation;
            }
        }
        else {
            target.parentOperation = this.parentOperation && this.parentOperation.asObject(opts) || undefined;
            target.childOperation = this.childOperation && this.childOperation.asObject(opts) || undefined;
        }
        // Clean properties copied from the parent trip (need by filter)
        if (!opts || opts.keepTrip !== true) {
            delete target.programLabel;
            delete target.vesselId;
        }
        return target;
    }
    fromObject(source, opts) {
        var _a;
        super.fromObject(source, opts);
        this.tripId = source.tripId;
        this.programLabel = source.programLabel;
        this.vesselId = source.vesselId;
        this.hasCatch = source.hasCatch;
        this.comments = source.comments;
        this.physicalGear = (source.physicalGear || source.physicalGearId) ? PhysicalGear.fromObject(source.physicalGear || { id: source.physicalGearId }) : undefined;
        this.startDateTime = fromDateISOString(source.startDateTime);
        this.endDateTime = fromDateISOString(source.endDateTime);
        this.fishingStartDateTime = fromDateISOString(source.fishingStartDateTime);
        this.fishingEndDateTime = fromDateISOString(source.fishingEndDateTime);
        this.rankOrder = source.rankOrder;
        this.rankOrderOnPeriod = source.rankOrderOnPeriod;
        this.metier = source.metier && Metier.fromObject(source.metier, { useChildAttributes: 'TaxonGroup' }) || undefined;
        if (source.startPosition || source.endPosition || source.fishingStartPosition || source.fishingEndPosition) {
            this.startPosition = VesselPosition.fromObject(source.startPosition);
            this.endPosition = VesselPosition.fromObject(source.endPosition);
            this.fishingStartPosition = VesselPosition.fromObject(source.fishingStartPosition);
            this.fishingEndPosition = VesselPosition.fromObject(source.fishingEndPosition);
            this.positions = undefined;
        }
        else {
            const sortedPositions = ((_a = source.positions) === null || _a === void 0 ? void 0 : _a.map(VesselPosition.fromObject).sort(VesselPositionUtils.dateTimeComparator())) || undefined;
            if (isNotEmptyArray(sortedPositions)) {
                // DEBUG
                //console.debug('[operation] Find sorted positions: ', sortedPositions.map(p => toDateISOString(p.dateTime)).join(', '));
                // Warn : should be extracted in this order, because startDateTime can be equals to endDateTime
                this.startPosition = VesselPositionUtils.findByDate(sortedPositions, this.startDateTime, true);
                this.fishingStartPosition = VesselPositionUtils.findByDate(sortedPositions, this.fishingStartDateTime, true);
                this.fishingEndPosition = VesselPositionUtils.findByDate(sortedPositions, this.fishingEndDateTime, true);
                this.endPosition = VesselPositionUtils.findByDate(sortedPositions, this.endDateTime, true);
                this.positions = undefined;
                if (sortedPositions.length > 0) {
                    console.warn('[operation] Some positions have no date matches, with start/end or fishingStart/fishingEnd dates', sortedPositions);
                    // Fallback for previous version compatibility, if invalid dates in position
                    if ((sortedPositions.length === 1 || sortedPositions.length === 2) && !this.startPosition && !this.endPosition) {
                        this.startPosition = sortedPositions[0];
                        this.fishingStartPosition = undefined;
                        this.fishingEndPosition = undefined;
                        this.endPosition = sortedPositions[1] || undefined;
                    }
                }
            }
            else {
                this.startPosition = undefined;
                this.fishingStartPosition = undefined;
                this.fishingEndPosition = undefined;
                this.endPosition = undefined;
                this.positions = sortedPositions;
            }
        }
        this.measurements = [
            ...(source.measurements && source.measurements.map(Measurement.fromObject) || []),
            ...(source.gearMeasurements && source.gearMeasurements.map(Measurement.fromObject) || [])
        ];
        // Remove fake dates (e.g. if endDateTime = startDateTime)
        // Warn: keept this order: must start with endDateTime, then fishingEndDateTime, then fishingStartDateTime
        if (this.endDateTime && this.endDateTime.isSameOrBefore(this.fishingEndDateTime || this.fishingStartDateTime || this.startDateTime)) {
            this.endDateTime = undefined;
        }
        if (this.fishingEndDateTime && this.fishingEndDateTime.isSameOrBefore(this.fishingStartDateTime || this.startDateTime)) {
            this.fishingEndDateTime = undefined;
        }
        if (this.fishingStartDateTime && this.fishingStartDateTime.isSameOrBefore(this.startDateTime)) {
            this.fishingStartDateTime = undefined;
        }
        // Update positions dates
        if (this.endPosition)
            this.endPosition.dateTime = this.endDateTime;
        if (this.fishingEndPosition)
            this.fishingEndPosition.dateTime = this.fishingEndDateTime;
        if (this.fishingStartPosition)
            this.fishingStartPosition.dateTime = this.fishingStartDateTime;
        // Fishing areas
        this.fishingAreas = source.fishingAreas && source.fishingAreas.map(FishingArea.fromObject) || undefined;
        // Samples
        if (!opts || opts.withSamples !== false) {
            this.samples = source.samples && source.samples.map(json => Sample.fromObject(json, { withChildren: true })) || undefined;
        }
        // Batches
        if (!opts || opts.withBatchTree !== false) {
            this.catchBatch = source.catchBatch && !source.batches ?
                // Reuse existing catch batch (useful for local entity)
                Batch.fromObject(source.catchBatch, { withChildren: true }) :
                // Convert list to tree (useful when fetching from a pod)
                Batch.fromObjectArrayAsTree(source.batches);
        }
        //Parent Operation
        this.parentOperationId = source.parentOperationId;
        this.parentOperation = (source.parentOperation || isNotNil(source.parentOperationId))
            ? Operation_1.fromObject(source.parentOperation || { id: source.parentOperationId })
            : undefined;
        //Child Operation
        this.childOperationId = source.childOperationId;
        this.childOperation = (source.childOperation || isNotNil(source.childOperationId))
            ? Operation_1.fromObject(source.childOperation || { id: source.childOperationId })
            : undefined;
    }
    paste(source, flags = OperationPasteFlags.ALL) {
        if (hasFlag(flags, OperationPasteFlags.DATE)) {
            if (hasFlag(flags, OperationPasteFlags.TIME)) {
                this.startDateTime = source.startDateTime;
                this.fishingStartDateTime = source.fishingStartDateTime;
                this.fishingEndDateTime = source.fishingEndDateTime;
                this.endDateTime = source.endDateTime;
            }
            // Reset time if there is no OperationCopyFlags.TIME
            else {
                this.startDateTime = DateUtils.markNoTime(DateUtils.resetTime(source.startDateTime));
                this.fishingStartDateTime = DateUtils.markNoTime(DateUtils.resetTime(source.fishingStartDateTime));
                this.fishingEndDateTime = DateUtils.markNoTime(DateUtils.resetTime(source.fishingEndDateTime));
                this.endDateTime = DateUtils.markNoTime(DateUtils.resetTime(source.endDateTime));
            }
        }
        if (hasFlag(flags, OperationPasteFlags.POSITION)) {
            this.startPosition = VesselPosition.fromObject(Object.assign(Object.assign({}, source.startPosition), { id: null }));
            this.fishingStartPosition = VesselPosition.fromObject(Object.assign(Object.assign({}, source.fishingStartPosition), { id: null }));
            this.fishingEndPosition = VesselPosition.fromObject(Object.assign(Object.assign({}, source.fishingEndPosition), { id: null }));
            this.endPosition = VesselPosition.fromObject(Object.assign(Object.assign({}, source.endPosition), { id: null }));
        }
        if (hasFlag(flags, OperationPasteFlags.FISHING_AREA)) {
            this.fishingAreas = source.fishingAreas;
        }
        if (hasFlag(flags, OperationPasteFlags.GEAR)) {
            this.physicalGear = source.physicalGear;
        }
        if (hasFlag(flags, OperationPasteFlags.METIER)) {
            this.metier = source.metier;
        }
        if (hasFlag(flags, OperationPasteFlags.MEASUREMENT)) {
            //TODO : measurements are empty when duplicate from table
            this.measurements = source.measurements;
        }
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            // Functional test
            || (
            // Dates
            (this.startDateTime === other.startDateTime || (!this.startDateTime && !other.startDateTime && this.fishingStartDateTime === other.fishingStartDateTime))
                // RankOrder
                && ((!this.rankOrder && !other.rankOrder) || (this.rankOrder === other.rankOrder))
                // RankOrder on period
                && ((!this.rankOrderOnPeriod && !other.rankOrderOnPeriod) || (this.rankOrderOnPeriod === other.rankOrderOnPeriod)));
    }
    get abnormal() {
        var _a;
        return ((_a = this.measurements) === null || _a === void 0 ? void 0 : _a.some(m => m.pmfmId === PmfmIds.TRIP_PROGRESS && m.numericalValue === 0)) || false;
    }
    getStrategyDateTime() {
        return this.endDateTime || this.fishingEndDateTime || this.fishingEndDateTime || this.startDateTime;
    }
};
Operation.ENTITY_NAME = 'Operation';
Operation = Operation_1 = __decorate([
    EntityClass({ typename: 'OperationVO' }),
    __metadata("design:paramtypes", [])
], Operation);
export { Operation };
export class OperationUtils {
    static isOperation(data) {
        return (data === null || data === void 0 ? void 0 : data.__typename) === Operation.TYPENAME;
    }
    static isAbnormal(data) {
        var _a;
        return ((_a = data === null || data === void 0 ? void 0 : data.measurements) === null || _a === void 0 ? void 0 : _a.some(m => m.pmfmId === PmfmIds.TRIP_PROGRESS && m.numericalValue === 0)) || false;
    }
    static hasParentOperation(data) {
        var _a;
        return data && isNotNil(data.parentOperationId) || isNotNil((_a = data.parentOperation) === null || _a === void 0 ? void 0 : _a.id);
    }
}
let OperationGroup = OperationGroup_1 = class OperationGroup extends DataEntity {
    constructor() {
        super(OperationGroup_1.TYPENAME);
        this.metier = null;
        this.measurements = [];
        this.gearMeasurements = [];
        // all measurements in table
        this.measurementValues = {};
        this.products = [];
        this.samples = [];
        this.packets = [];
        this.fishingAreas = [];
    }
    static equals(o1, o2) {
        return o1 && o2 && ((isNotNil(o1.id) && o1.id === o2.id)
            // Or by functional attributes
            || (
            // Same metier
            (o1.metier && o1.metier.equals(o2.metier))
                // Same rankOrderOnPeriod
                && ((isNil(o1.rankOrderOnPeriod) && isNil(o2.rankOrderOnPeriod)) || (o1.rankOrderOnPeriod === o2.rankOrderOnPeriod))));
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.metier = this.metier && this.metier.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS /*Always minify=false, because of operations tables cache*/)) || undefined;
        // Measurements
        target.measurements = this.measurements && this.measurements.filter(MeasurementUtils.isNotEmpty).map(m => m.asObject(opts)) || undefined;
        target.gearMeasurements = this.gearMeasurements && this.gearMeasurements.filter(MeasurementUtils.isNotEmpty).map(m => m.asObject(opts)) || undefined;
        target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
        delete target.gearMeasurementValues; // all measurements are stored only measurementValues
        // Products
        target.products = this.products && this.products.map(product => {
            const p = product.asObject(opts);
            // Affect parent link
            p.operationId = target.id;
            return p;
        }) || undefined;
        // Samples
        target.samples = this.samples && this.samples.map(sample => {
            const s = sample.asObject(Object.assign(Object.assign({}, opts), { withChildren: true }));
            // Affect parent link
            s.operationId = target.id;
            return s;
        }) || undefined;
        // Packets
        target.packets = this.packets && this.packets.map(packet => {
            const p = packet.asObject(opts);
            // Affect parent link
            p.operationId = target.id;
            return p;
        }) || undefined;
        // Fishing areas
        target.fishingAreas = this.fishingAreas && this.fishingAreas.map(value => value.asObject(opts)) || undefined;
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.hasCatch = source.hasCatch;
        this.comments = source.comments;
        this.tripId = source.tripId;
        this.rankOrderOnPeriod = source.rankOrderOnPeriod;
        this.metier = source.metier && Metier.fromObject(source.metier) || undefined;
        this.physicalGearId = source.physicalGearId;
        // Measurements
        this.measurements = source.measurements && source.measurements.map(Measurement.fromObject) || [];
        this.gearMeasurements = source.gearMeasurements && source.gearMeasurements.map(Measurement.fromObject) || [];
        this.measurementValues = Object.assign(Object.assign(Object.assign({}, MeasurementUtils.toMeasurementValues(this.measurements)), MeasurementUtils.toMeasurementValues(this.gearMeasurements)), source.measurementValues // important: keep at last assignment
        );
        if (Object.keys(this.measurementValues).length === 0) {
            console.warn('Source as no measurement. Should never occur! ', source);
        }
        // Products
        this.products = source.products && source.products.map(Product.fromObject) || [];
        // Affect parent
        this.products.forEach(product => {
            product.parent = this;
            product.operationId = this.id;
        });
        // Samples
        this.samples = source.samples && source.samples.map(json => Sample.fromObject(json, { withChildren: true })) || [];
        // Affect parent
        this.samples.forEach(sample => {
            sample.operationId = this.id;
        });
        // Packets
        this.packets = source.packets && source.packets.map(Packet.fromObject) || [];
        // Affect parent
        this.packets.forEach(packet => {
            packet.parent = this;
        });
        // Fishing areas
        this.fishingAreas = source.fishingAreas && source.fishingAreas.map(FishingArea.fromObject) || undefined;
        return this;
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            || (this.metier.equals(other.metier) && ((!this.rankOrderOnPeriod && !other.rankOrderOnPeriod) || (this.rankOrderOnPeriod === other.rankOrderOnPeriod)));
    }
};
OperationGroup = OperationGroup_1 = __decorate([
    EntityClass({ typename: 'OperationGroupVO' }),
    __metadata("design:paramtypes", [])
], OperationGroup);
export { OperationGroup };
let Trip = Trip_1 = class Trip extends DataRootVesselEntity {
    constructor() {
        super(Trip_1.TYPENAME);
        this.departureDateTime = null;
        this.returnDateTime = null;
        this.departureLocation = null;
        this.returnLocation = null;
        this.sale = null;
        this.expectedSale = null;
        this.gears = null;
        this.measurements = null;
        this.observers = null;
        this.metiers = null;
        this.operations = null;
        this.operationGroups = null;
        this.fishingAreas = null;
        this.landing = null;
        this.observedLocationId = null;
        this.scientificCruiseId = null;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.departureDateTime = toDateISOString(this.departureDateTime);
        target.returnDateTime = toDateISOString(this.returnDateTime);
        target.departureLocation = this.departureLocation && this.departureLocation.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        target.returnLocation = this.returnLocation && this.returnLocation.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        target.sale = this.sale && this.sale.asObject(opts) || undefined;
        target.expectedSale = this.expectedSale && this.expectedSale.asObject(opts) || undefined;
        target.measurements = this.measurements && this.measurements.filter(MeasurementUtils.isNotEmpty).map(m => m.asObject(opts)) || undefined;
        target.observers = this.observers && this.observers.map(p => p && p.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS))) || undefined;
        // Metiers
        target.metiers = this.metiers && this.metiers.filter(isNotNil).map(p => p && p.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS))) || undefined;
        if (isEmptyArray(target.metiers))
            delete target.metiers; // Clean is empty, for compat with previous version
        // Physical gears
        if (!opts || opts.gearAsTree !== false) {
            target.gears = this.gears && this.gears.map(g => g.asObject(Object.assign(Object.assign({}, opts), { withChildren: true }))) || undefined;
        }
        // Serialize as batches array (this will fill parentId, and remove children and parent properties)
        else {
            target.gears = PhysicalGear.treeAsObjectArray(this.gears, opts);
        }
        // Operations
        target.operations = this.operations && this.operations.map(o => o.asObject(opts)) || undefined;
        // Operation groups
        target.operationGroups = this.operationGroups && this.operationGroups.filter(isNotNil).map(o => o.asObject(opts)) || undefined;
        // FIXME: remove in the future, to allow sampling landing page to force as empty (=[]) and avoid a refetch after saving, on pod
        if (isEmptyArray(target.operationGroups))
            delete target.operationGroups; // Clean if empty, for compat with previous version
        // Fishing areas
        target.fishingAreas = this.fishingAreas && this.fishingAreas.map(p => p && p.asObject(opts)) || undefined;
        // Landing
        target.landing = this.landing && this.landing.asObject(opts) || undefined;
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            //delete target.scientificCruise;
        }
        return target;
    }
    fromObject(source, opts) {
        var _a;
        super.fromObject(source);
        this.departureDateTime = fromDateISOString(source.departureDateTime);
        this.returnDateTime = fromDateISOString(source.returnDateTime);
        this.departureLocation = source.departureLocation && ReferentialRef.fromObject(source.departureLocation);
        this.returnLocation = source.returnLocation && ReferentialRef.fromObject(source.returnLocation);
        this.sale = source.sale && Sale.fromObject(source.sale) || undefined;
        this.expectedSale = source.expectedSale && ExpectedSale.fromObject(source.expectedSale) || undefined;
        this.measurements = source.measurements && source.measurements.map(Measurement.fromObject) || [];
        this.observers = source.observers && source.observers.map(Person.fromObject) || [];
        this.metiers = source.metiers && source.metiers.map(ReferentialRef.fromObject) || [];
        // Physical gears
        // - Convert array to tree (when fetching from pod)
        // - Already converted as tree (when fetching locally)
        const convertGearsAsTree = source.gears && source.gears.some(g => isNotNil(g.parentId))
            && source.gears.every(g => isEmptyArray(g.children))
            && source.gears.every(g => isNil(g.parent)) || false;
        const gears = convertGearsAsTree
            ? PhysicalGear.fromObjectArrayAsTree(source.gears)
            : (_a = source.gears) === null || _a === void 0 ? void 0 : _a.filter(isNotNil).map(PhysicalGear.fromObject);
        // Sort by rankOrder (useful for gears combo, in the operation form)
        this.gears = gears && gears.sort(PhysicalGear.rankOrderComparator) || undefined;
        // Set gears tripId (e. Old local DB may miss it)
        (this.gears || []).forEach(g => g.tripId = this.id);
        if (source.operations) {
            if (!Array.isArray(source.operations) && Array.isArray(source.operations.data)) {
                console.warn('[trip] Fix invalid operations model (was found a LoadResult, instead of an array) - fixed');
                source.operations = source.operations.data;
            }
            this.operations = source.operations
                .map(Operation.fromObject)
                .map((o) => {
                o.tripId = this.id;
                // Link to trip's gear
                o.physicalGear = o.physicalGear && (this.gears || []).find(g => o.physicalGear.equals(g))
                    // Or keep existing gear, if not exists
                    || o.physicalGear;
                return o;
            });
        }
        this.operationGroups = source.operationGroups && source.operationGroups.map(OperationGroup.fromObject) || [];
        // Remove fake dates (e.g. if returnDateTime = departureDateTime)
        if (this.returnDateTime && this.returnDateTime.isSameOrBefore(this.departureDateTime)) {
            this.returnDateTime = undefined;
        }
        // Fishing areas
        this.fishingAreas = source.fishingAreas && source.fishingAreas.map(FishingArea.fromObject) || [];
        this.landing = source.landing && Landing.fromObject(source.landing) || undefined;
        this.observedLocationId = source.observedLocationId;
        this.scientificCruiseId = source.scientificCruiseId;
        this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot) || undefined;
        return this;
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            || (
            // Same vessel
            (this.vesselSnapshot && other.vesselSnapshot && this.vesselSnapshot.id === other.vesselSnapshot.id)
                // Same departure date (or, if not set, same return date)
                && (DateUtils.equals(this.departureDateTime, other.departureDateTime)
                    || (!this.departureDateTime && !other.departureDateTime && DateUtils.equals(this.returnDateTime, other.returnDateTime))));
    }
    getStrategyDateTime() {
        return this.departureDateTime;
    }
};
Trip.ENTITY_NAME = 'Trip';
Trip = Trip_1 = __decorate([
    EntityClass({ typename: 'TripVO' }),
    __metadata("design:paramtypes", [])
], Trip);
export { Trip };
export class VesselPositionUtils {
    static isNoNilOrEmpty(pos) {
        return pos && isNotNil(pos.latitude) && isNotNil(pos.longitude);
    }
    static dateTimeComparator(sortDirection) {
        const side = sortDirection !== 'desc' ? 1 : -1;
        return (n1, n2) => n1.dateTime.isSame(n2.dateTime) ? 0 : (n1.dateTime.isAfter(n2.dateTime) ? side : -1 * side);
    }
    static findByDate(positions, dateTime, removeFromArray) {
        if (!positions || !dateTime)
            return undefined;
        // Make sure we have a valid moment object
        if (!isMoment(dateTime))
            dateTime = fromDateISOString(dateTime);
        const index = positions.findIndex(p => dateTime.isSame(p.dateTime));
        if (index === -1)
            return undefined;
        if (removeFromArray) {
            return positions.splice(index, 1)[0];
        }
        else {
            return positions[index];
        }
    }
}
//# sourceMappingURL=trip.model.js.map