var Metier_1;
import { __decorate, __metadata } from "tslib";
import { BaseReferential, EntityClass, ReferentialRef, uncapitalizeFirstLetter } from '@sumaris-net/ngx-components';
let Metier = Metier_1 = class Metier extends BaseReferential {
    constructor() {
        super(Metier_1.TYPENAME);
        this.gear = null;
        this.taxonGroup = null;
        this.entityName = Metier_1.ENTITY_NAME;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (!opts || opts.minify !== true) {
            target.gear = this.gear && this.gear.asObject(opts) || undefined;
            if (target.gear && !target.gear.entityName) {
                // Fixme gear entityName here
                console.warn('Missing gear.entityName in Metier instance', this);
                target.gear.entityName = 'Gear';
            }
            target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject(opts) || undefined;
        }
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source);
        this.entityName = source.entityName || Metier_1.ENTITY_NAME;
        this.gear = source.gear && ReferentialRef.fromObject(source.gear);
        this.taxonGroup = source.taxonGroup && ReferentialRef.fromObject(source.taxonGroup);
        // Copy label/name from child (TaxonGroup or Gear)
        if (opts && opts.useChildAttributes) {
            const childKey = uncapitalizeFirstLetter(opts.useChildAttributes);
            if (source[childKey]) {
                this.label = source[childKey].label || this.label;
                this.name = source[childKey].name || this.name;
            }
        }
    }
};
Metier.ENTITY_NAME = 'Metier';
Metier = Metier_1 = __decorate([
    EntityClass({ typename: 'MetierVO' }),
    __metadata("design:paramtypes", [])
], Metier);
export { Metier };
//# sourceMappingURL=metier.model.js.map