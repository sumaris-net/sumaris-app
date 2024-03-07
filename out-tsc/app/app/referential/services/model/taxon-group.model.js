var TaxonGroupRef_1;
import { __decorate, __metadata } from "tslib";
import { Entity, EntityClass } from '@sumaris-net/ngx-components';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
export const TaxonGroupTypeIds = {
    FAO: 2,
    METIER_DCF_5: 3,
    METIER_NATIONAL: 4
};
export const TaxonGroupLabels = {
    FISH: 'MZZ'
};
let TaxonGroupRef = TaxonGroupRef_1 = class TaxonGroupRef extends Entity {
    constructor() {
        super(TaxonGroupRef_1.TYPENAME);
        this.entityName = TaxonGroupRef_1.ENTITY_NAME;
    }
    asObject(options) {
        if (options && options.minify) {
            return {
                id: this.id,
                __typename: options.keepTypename && this.__typename || undefined
            };
        }
        const target = super.asObject(options);
        if (options && options.keepEntityName !== true)
            delete target.entityName; // delete by default
        delete target.taxonNames; // Not need
        delete target.priority;
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.label = source.label;
        this.name = source.name;
        this.statusId = source.statusId;
        this.entityName = source.entityName || TaxonGroupRef_1.ENTITY_NAME;
        this.taxonNames = source.taxonNames && source.taxonNames.map(TaxonNameRef.fromObject) || [];
        this.priority = source.priority;
    }
};
TaxonGroupRef.ENTITY_NAME = 'TaxonGroup';
TaxonGroupRef = TaxonGroupRef_1 = __decorate([
    EntityClass({ typename: 'TaxonGroupVO' }),
    __metadata("design:paramtypes", [])
], TaxonGroupRef);
export { TaxonGroupRef };
//# sourceMappingURL=taxon-group.model.js.map