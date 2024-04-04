import { __decorate, __metadata } from "tslib";
import { Trip } from '../trip/trip.model';
import { EntityClass, fromDateISOString, isNotNil, Person, toDateISOString } from '@sumaris-net/ngx-components';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
let ScientificCruise = class ScientificCruise extends DataRootVesselEntity {
    constructor() {
        super(Trip.TYPENAME);
        this.name = null;
        this.reference = null;
        this.departureDateTime = null;
        this.returnDateTime = null;
        this.trip = null;
        this.managerPerson = null;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.departureDateTime = toDateISOString(this.departureDateTime);
        target.returnDateTime = toDateISOString(this.returnDateTime);
        target.trip = (this.trip && this.trip.asObject(opts)) || undefined;
        target.managerPerson = (this.managerPerson && this.managerPerson.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS))) || undefined;
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source);
        this.departureDateTime = fromDateISOString(source.departureDateTime);
        this.returnDateTime = fromDateISOString(source.returnDateTime);
        this.trip = (source.trip && Trip.fromObject(source.trip)) || undefined;
        this.managerPerson = (source.managerPerson && Person.fromObject(source.managerPerson)) || undefined;
        this.vesselSnapshot = (source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot)) || undefined;
        return this;
    }
    equals(other) {
        return ((super.equals(other) && isNotNil(this.id)) ||
            // Same vessel
            (this.vesselSnapshot &&
                other.vesselSnapshot &&
                this.vesselSnapshot.id === other.vesselSnapshot.id &&
                // Same departure date (or, if not set, same return date)
                (this.departureDateTime === other.departureDateTime ||
                    (!this.departureDateTime && !other.departureDateTime && this.returnDateTime === other.returnDateTime))));
    }
};
ScientificCruise.ENTITY_NAME = 'ScientificCruise';
ScientificCruise = __decorate([
    EntityClass({ typename: 'ScientificCruiseVO' }),
    __metadata("design:paramtypes", [])
], ScientificCruise);
export { ScientificCruise };
//# sourceMappingURL=scientific-cruise.model.js.map