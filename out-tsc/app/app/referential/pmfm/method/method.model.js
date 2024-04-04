var Method_1;
import { __decorate, __metadata } from "tslib";
import { BaseReferential, EntityClass } from '@sumaris-net/ngx-components';
let Method = Method_1 = class Method extends BaseReferential {
    constructor() {
        super(Method_1.TYPENAME);
        this.isCalculated = null;
        this.isEstimated = null;
        this.entityName = Method_1.ENTITY_NAME;
    }
    fromObject(source) {
        super.fromObject(source);
        this.entityName = Method_1.ENTITY_NAME;
        this.isCalculated = source.isCalculated;
        this.isEstimated = source.isEstimated;
        return this;
    }
    asObject(options) {
        const target = super.asObject(options);
        return target;
    }
};
Method.ENTITY_NAME = 'Method';
Method = Method_1 = __decorate([
    EntityClass({ typename: 'MethodVO' }),
    __metadata("design:paramtypes", [])
], Method);
export { Method };
//# sourceMappingURL=method.model.js.map