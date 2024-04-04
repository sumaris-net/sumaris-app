var TaxonName_1, TaxonNameRef_1;
import { __decorate, __metadata } from "tslib";
import { BaseReferential, Entity, EntityClass, isNil, isNotNil, ReferentialRef, ReferentialUtils } from '@sumaris-net/ngx-components';
let TaxonName = TaxonName_1 = class TaxonName extends BaseReferential {
    constructor() {
        super(TaxonName_1.TYPENAME);
        this.entityName = TaxonName_1.ENTITY_NAME;
    }
    // TODO : Check if clone is needed
    clone() {
        const target = new TaxonName_1();
        target.fromObject(this);
        return target;
    }
    asObject(options) {
        const target = super.asObject(Object.assign(Object.assign({}, options), { minify: false // Do NOT minify itself
         }));
        if (options && options.minify) {
            target.parentId = this.parentTaxonName && this.parentTaxonName.id;
            target.taxonomicLevelId = this.taxonomicLevel && this.taxonomicLevel.id;
            delete target.taxonomicLevel;
            delete target.parentTaxonName;
            delete target.useExistingReferenceTaxon;
        }
        else {
            target.parentTaxonName = this.parentTaxonName && this.parentTaxonName.asObject(options);
        }
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.isReferent = source.isReferent;
        this.isNaming = source.isNaming;
        this.isVirtual = source.isVirtual;
        this.referenceTaxonId = source.referenceTaxonId;
        this.taxonomicLevel = source.taxonomicLevel && ReferentialRef.fromObject(source.taxonomicLevel);
        this.taxonGroupIds = source.taxonGroupIds;
        this.entityName = source.entityName || TaxonName_1.TYPENAME;
        this.parentTaxonName = source.parentTaxonName && ReferentialRef.fromObject(source.parentTaxonName);
        this.startDate = source.startDate;
        this.endDate = source.endDate;
        return this;
    }
    get taxonomicLevelId() {
        return this.taxonomicLevel && this.taxonomicLevel.id;
    }
};
TaxonName.ENTITY_NAME = 'TaxonName';
TaxonName = TaxonName_1 = __decorate([
    EntityClass({ typename: 'TaxonNameVO' }),
    __metadata("design:paramtypes", [])
], TaxonName);
export { TaxonName };
export const TaxonomicLevelIds = {
    ORDO: 13,
    FAMILY: 17,
    GENUS: 26,
    SUBGENUS: 27,
    SPECIES: 28,
    SUBSPECIES: 29
};
let TaxonNameRef = TaxonNameRef_1 = class TaxonNameRef extends Entity {
    constructor() {
        super(TaxonNameRef_1.TYPENAME);
        this.entityName = TaxonNameRef_1.ENTITY_NAME;
    }
    static equalsOrSameReferenceTaxon(v1, v2) {
        return ReferentialUtils.equals(v1, v2) || (v1 && v2 && isNotNil(v1.referenceTaxonId) && v1.referenceTaxonId === v2.referenceTaxonId);
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
        delete target.taxonGroupIds; // Not need by pod here (should be in TaxonGroupHistoryRecord)
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.label = source.label;
        this.name = source.name;
        this.statusId = source.statusId;
        this.entityName = source.entityName || TaxonNameRef_1.ENTITY_NAME;
        this.levelId = source.levelId;
        this.referenceTaxonId = source.referenceTaxonId;
        this.taxonGroupIds = source.taxonGroupIds;
    }
};
TaxonNameRef.ENTITY_NAME = 'TaxonName';
TaxonNameRef = TaxonNameRef_1 = __decorate([
    EntityClass({ typename: 'TaxonNameVO' }),
    __metadata("design:paramtypes", [])
], TaxonNameRef);
export { TaxonNameRef };
export class TaxonUtils {
    static generateLabelFromName(taxonName) {
        if (isNil(taxonName))
            return undefined;
        const taxonNameWithoutStartParentheses = taxonName.replace(/\(/g, '');
        const taxonNameWithoutParentheses = taxonNameWithoutStartParentheses.replace(/\)/g, '');
        const genusWord = /^[a-zA-Z]{4,}$/;
        const speciesWord = /^[a-zA-Z]{3,}$/;
        // Rubin code for "Leucoraja circularis": LEUC CIR
        const parts = taxonNameWithoutParentheses.split(' ');
        if ((parts.length > 1) && parts[0].match(genusWord) && parts[1].match(speciesWord)) {
            return parts[0].slice(0, 4).toUpperCase() + parts[1].slice(0, 3).toUpperCase();
        }
        return undefined;
    }
    static generateNameSearchPatternFromLabel(label, optionalParenthese) {
        if (!label || label.length !== 7) {
            throw new Error('Invalid taxon name label (expected 7 characters)');
        }
        if (optionalParenthese) {
            return label.slice(0, 4) + '* (' + label.slice(4) + '*';
        }
        return label.slice(0, 4) + '* ' + label.slice(4) + '*';
    }
}
//# sourceMappingURL=taxon-name.model.js.map