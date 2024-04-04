var AggregationStrata_1;
import { __decorate, __metadata } from "tslib";
import { Entity, EntityClass, toBoolean } from '@sumaris-net/ngx-components';
let AggregationStrata = AggregationStrata_1 = class AggregationStrata extends Entity {
    constructor() {
        super(AggregationStrata_1.TYPENAME);
    }
    fromObject(source) {
        super.fromObject(source);
        this.sheetName = source.sheetName;
        this.isDefault = toBoolean(source.isDefault, false);
        this.spatialColumnName = source.spatialColumnName;
        this.timeColumnName = source.timeColumnName;
        this.aggColumnName = source.aggColumnName;
        this.aggFunction = source.aggFunction;
        this.techColumnName = source.techColumnName;
    }
};
AggregationStrata = AggregationStrata_1 = __decorate([
    EntityClass({ typename: 'AggregationStrataVO' }),
    __metadata("design:paramtypes", [])
], AggregationStrata);
export { AggregationStrata };
//# sourceMappingURL=strata.model.js.map