var VesselPosition_1;
import { __decorate, __metadata } from "tslib";
import { EntityClass, fromDateISOString, isNotNil, toDateISOString } from '@sumaris-net/ngx-components';
import { DataEntity } from '@app/data/services/model/data-entity.model';
let VesselPosition = VesselPosition_1 = class VesselPosition extends DataEntity {
    constructor() {
        super();
        this.__typename = VesselPosition_1.TYPENAME;
    }
    asObject(options) {
        const target = super.asObject(options);
        target.dateTime = toDateISOString(this.dateTime);
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.latitude = source.latitude;
        this.longitude = source.longitude;
        this.operationId = source.operationId;
        this.dateTime = fromDateISOString(source.dateTime);
        return this;
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            || (this.dateTime && this.dateTime.isSame(fromDateISOString(other.dateTime))
                && (!this.operationId && !other.operationId || this.operationId === other.operationId));
    }
    isSamePoint(other) {
        if (!other)
            return false;
        return (this.latitude === other.latitude) && (this.longitude === other.longitude);
    }
    copyPoint(source) {
        if (!source)
            return;
        this.latitude = source.latitude;
        this.longitude = source.longitude;
    }
};
VesselPosition = VesselPosition_1 = __decorate([
    EntityClass({ typename: 'VesselPositionVO' }),
    __metadata("design:paramtypes", [])
], VesselPosition);
export { VesselPosition };
//# sourceMappingURL=vessel-position.model.js.map