var ObservedLocation_1;
import { __decorate, __metadata } from "tslib";
import { MeasurementUtils, MeasurementValuesUtils, } from '@app/data/measurement/measurement.model';
import { Landing } from '../landing/landing.model';
import { EntityClass, fromDateISOString, isNotNil, Person, ReferentialRef, toDateISOString, } from '@sumaris-net/ngx-components';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
let ObservedLocation = ObservedLocation_1 = class ObservedLocation extends RootDataEntity {
    constructor() {
        super(ObservedLocation_1.TYPENAME);
        this.location = null;
        this.measurementValues = {};
        this.observers = [];
        this.landings = [];
    }
    copy(target) {
        target.fromObject(this);
    }
    asObject(options) {
        const target = super.asObject(options);
        target.startDateTime = toDateISOString(this.startDateTime);
        target.endDateTime = toDateISOString(this.endDateTime);
        target.location =
            (this.location && this.location.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS /*keep for list*/))) || undefined;
        target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, options);
        target.landings = (this.landings && this.landings.map((s) => s.asObject(options))) || undefined;
        target.observers =
            (this.observers &&
                this.observers.map((o) => o.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS /*keep for list*/)))) ||
                undefined;
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.startDateTime = fromDateISOString(source.startDateTime);
        this.endDateTime = fromDateISOString(source.endDateTime);
        this.location = source.location && ReferentialRef.fromObject(source.location);
        this.measurementValues =
            (source.measurementValues && Object.assign({}, source.measurementValues)) || MeasurementUtils.toMeasurementValues(source.measurements);
        this.observers = (source.observers && source.observers.map(Person.fromObject)) || [];
        this.landings = (source.landings && source.landings.map(Landing.fromObject)) || [];
        return this;
    }
    equals(other) {
        return ((super.equals(other) && isNotNil(this.id)) ||
            // Same location
            (this.location &&
                other.location &&
                this.location.id === other.location.id &&
                // Same start date/time
                this.startDateTime === other.startDateTime &&
                // Same recorder person
                this.recorderPerson &&
                other.recorderPerson &&
                this.recorderPerson.id === other.recorderPerson.id));
    }
    getStrategyDateTime() {
        return this.startDateTime;
    }
};
ObservedLocation.ENTITY_NAME = 'ObservedLocation';
ObservedLocation = ObservedLocation_1 = __decorate([
    EntityClass({ typename: 'ObservedLocationVO' }),
    __metadata("design:paramtypes", [])
], ObservedLocation);
export { ObservedLocation };
//# sourceMappingURL=observed-location.model.js.map