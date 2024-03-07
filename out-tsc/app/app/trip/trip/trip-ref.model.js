var TripRef_1;
import { __decorate, __metadata } from "tslib";
import { EntityClass, fromDateISOString, toDateISOString } from '@sumaris-net/ngx-components';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
let TripRef = TripRef_1 = class TripRef extends DataRootVesselEntity {
    constructor() {
        super(TripRef_1.TYPENAME);
    }
    asObject(options) {
        const target = super.asObject(options);
        target.departureDateTime = toDateISOString(this.departureDateTime);
        target.returnDateTime = toDateISOString(this.returnDateTime);
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.departureDateTime = fromDateISOString(source.departureDateTime);
        this.returnDateTime = fromDateISOString(source.returnDateTime);
    }
    getStrategyDateTime() {
        return this.departureDateTime || this.returnDateTime;
    }
};
TripRef = TripRef_1 = __decorate([
    EntityClass({ typename: 'TripVO' }),
    __metadata("design:paramtypes", [])
], TripRef);
export { TripRef };
//# sourceMappingURL=trip-ref.model.js.map