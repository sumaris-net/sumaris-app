import { __decorate, __metadata } from "tslib";
import { EntityClass } from '@sumaris-net/ngx-components';
import { ReferentialRefFilter } from './referential-ref.filter';
import { fromDateISOString, toDateISOString } from '@sumaris-net/ngx-components';
import { Metier } from '@app/referential/metier/metier.model';
let MetierFilter = class MetierFilter extends ReferentialRefFilter {
    constructor() {
        super();
        // Add predoc properties
        this.programLabel = null;
        this.startDate = null;
        this.endDate = null;
        this.vesselId = null;
        this.excludedTripId = null;
        this.gearIds = null;
        this.taxonGroupTypeIds = null;
        this.entityName = Metier.ENTITY_NAME;
    }
    fromObject(source) {
        super.fromObject(source);
        this.entityName = source.entityName || Metier.ENTITY_NAME;
        this.programLabel = source.programLabel;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.vesselId = source.vesselId;
        this.excludedTripId = source.excludedTripId;
        this.gearIds = source.gearIds;
        this.taxonGroupTypeIds = source.taxonGroupTypeIds;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.programLabel = this.programLabel;
        target.startDate = toDateISOString(this.startDate);
        target.endDate = toDateISOString(this.endDate);
        target.vesselId = this.vesselId;
        target.excludedTripId = this.excludedTripId;
        target.gearIds = this.gearIds;
        target.taxonGroupTypeIds = this.taxonGroupTypeIds;
        return target;
    }
};
MetierFilter = __decorate([
    EntityClass({ typename: 'MetierFilterVO' }),
    __metadata("design:paramtypes", [])
], MetierFilter);
export { MetierFilter };
//# sourceMappingURL=metier.filter.js.map