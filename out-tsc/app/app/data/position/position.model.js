import { Entity, fromDateISOString, toDateISOString } from '@sumaris-net/ngx-components';
export class PositionEntity extends Entity {
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.latitude = source.latitude;
        this.longitude = source.longitude;
        this.dateTime = fromDateISOString(source.dateTime);
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.dateTime = toDateISOString(this.dateTime);
        return target;
    }
}
//# sourceMappingURL=position.model.js.map