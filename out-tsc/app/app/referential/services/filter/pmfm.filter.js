import { __decorate } from "tslib";
import { EntityClass, EntityFilter, isEmptyArray, isNotEmptyArray, isNotNil, toNumber } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
let PmfmFilter = class PmfmFilter extends BaseReferentialFilter {
};
PmfmFilter = __decorate([
    EntityClass({ typename: 'PmfmFilterVO' })
], PmfmFilter);
export { PmfmFilter };
let DenormalizedPmfmFilter = class DenormalizedPmfmFilter extends EntityFilter {
    fromObject(source) {
        super.fromObject(source);
        this.strategyId = source.strategyId;
        this.acquisitionLevel = source.acquisitionLevel;
        this.gearIds = source.gearId ? [source.gearId] : source.gearIds;
        this.taxonGroupIds = source.taxonGroupId ? [source.taxonGroupId] : source.taxonGroupIds;
        this.referenceTaxonIds = source.referenceTaxonId ? [source.referenceTaxonId] : source.referenceTaxonIds;
        this.fractionIdByMatrixId = source.fractionIdByMatrixId || {};
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // Acquisition Level
        if (this.acquisitionLevel) {
            const acquisitionLevel = this.acquisitionLevel;
            filterFns.push(t => t.acquisitionLevel === acquisitionLevel);
        }
        // Gears
        if (isNotEmptyArray(this.gearIds)) {
            const gearIds = this.gearIds;
            filterFns.push(t => isEmptyArray(t.gearIds) || t.gearIds.findIndex(id => gearIds.includes(id)) !== -1);
        }
        // Taxon groups
        if (isNotEmptyArray(this.taxonGroupIds)) {
            const taxonGroupIds = this.taxonGroupIds;
            filterFns.push(t => isEmptyArray(t.taxonGroupIds) || t.taxonGroupIds.findIndex(id => taxonGroupIds.includes(id)) !== -1);
        }
        // Taxon names
        if (isNotEmptyArray(this.referenceTaxonIds)) {
            const referenceTaxonIds = this.referenceTaxonIds;
            filterFns.push(t => isEmptyArray(t.referenceTaxonIds) || t.referenceTaxonIds.findIndex(id => referenceTaxonIds.includes(id)) !== -1);
        }
        // Filter on fraction, by matrix
        if (this.fractionIdByMatrixId) {
            Object.keys(this.fractionIdByMatrixId)
                .forEach(matrixId => {
                const fractionId = toNumber(this.fractionIdByMatrixId[matrixId]);
                if (isNotNil(fractionId)) {
                    filterFns.push(t => t.matrixId !== +matrixId || t.fractionId === fractionId);
                }
            });
        }
        return filterFns;
    }
};
DenormalizedPmfmFilter = __decorate([
    EntityClass({ typename: 'DenormalizedPmfmFilterVO' })
], DenormalizedPmfmFilter);
export { DenormalizedPmfmFilter };
//# sourceMappingURL=pmfm.filter.js.map