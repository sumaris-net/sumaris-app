var Parameter_1;
import { __decorate, __metadata } from "tslib";
import { BaseReferential, EntityClass, isNotNil, Referential } from '@sumaris-net/ngx-components';
let Parameter = Parameter_1 = class Parameter extends BaseReferential {
    constructor() {
        super(Parameter_1.TYPENAME);
        this.entityName = Parameter_1.ENTITY_NAME;
    }
    // TODO : Check if clone is needed
    clone() {
        const target = new Parameter_1();
        target.fromObject(this);
        target.qualitativeValues = this.qualitativeValues && this.qualitativeValues.map(qv => qv.clone()) || undefined;
        return target;
    }
    asObject(options) {
        const target = super.asObject(options);
        target.qualitativeValues = this.qualitativeValues && this.qualitativeValues.map(qv => qv.asObject(options)) || undefined;
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.entityName = source.entityName || Parameter_1.ENTITY_NAME;
        this.type = source.type;
        this.qualitativeValues = source.qualitativeValues && source.qualitativeValues.map(Referential.fromObject) || [];
        return this;
    }
    get isNumeric() {
        return isNotNil(this.type) && (this.type === 'double');
    }
    get isQualitative() {
        return isNotNil(this.type) && (this.type === 'qualitative_value');
    }
};
Parameter.ENTITY_NAME = 'Parameter';
Parameter = Parameter_1 = __decorate([
    EntityClass({ typename: 'ParameterVO' }),
    __metadata("design:paramtypes", [])
], Parameter);
export { Parameter };
//# sourceMappingURL=parameter.model.js.map