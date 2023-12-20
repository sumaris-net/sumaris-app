import { __decorate } from "tslib";
import { EntityClass, EntityFilter, EntityUtils, isEmptyArray, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
let PmfmStrategyFilter = class PmfmStrategyFilter extends EntityFilter {
    buildFilter() {
        const filterFns = super.buildFilter();
        // Acquisition Level
        if (this.acquisitionLevel) {
            const acquisitionLevel = this.acquisitionLevel;
            filterFns.push(t => ((EntityUtils.isNotEmpty(t.acquisitionLevel, 'label') ? t.acquisitionLevel['label'] : t.acquisitionLevel) === acquisitionLevel));
        }
        // Gears
        if (isNotEmptyArray(this.gearIds)) {
            const gearIds = this.gearIds;
            filterFns.push(t => t.gearIds && t.gearIds.findIndex(id => gearIds.includes(id)) !== -1);
        }
        // Taxon groups
        if (isNotEmptyArray(this.taxonGroupIds)) {
            const taxonGroupIds = this.taxonGroupIds;
            filterFns.push(t => t.taxonGroupIds && t.taxonGroupIds.findIndex(id => taxonGroupIds.includes(id)) !== -1);
        }
        // Taxon names
        if (isNotEmptyArray(this.referenceTaxonIds)) {
            const referenceTaxonIds = this.referenceTaxonIds;
            filterFns.push(t => t.referenceTaxonIds && t.referenceTaxonIds.findIndex(id => referenceTaxonIds.includes(id)) !== -1);
        }
        return filterFns;
    }
};
PmfmStrategyFilter = __decorate([
    EntityClass({ typename: 'PmfmStrategyFilterVO' })
], PmfmStrategyFilter);
export { PmfmStrategyFilter };
let DenormalizedPmfmStrategyFilter = class DenormalizedPmfmStrategyFilter extends EntityFilter {
    fromObject(source) {
        super.fromObject(source);
        this.strategyId = source.strategyId;
        this.acquisitionLevel = source.acquisitionLevel;
        this.acquisitionLevels = source.acquisitionLevels;
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
        else if (isNotEmptyArray(this.acquisitionLevels)) {
            const acquisitionLevels = this.acquisitionLevels;
            filterFns.push(t => acquisitionLevels.includes(t.acquisitionLevel));
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
                .map(parseInt)
                .forEach(matrixId => {
                const fractionId = this.fractionIdByMatrixId[matrixId];
                if (isNotNil(fractionId)) {
                    filterFns.push(t => t.matrixId !== matrixId || t.fractionId === fractionId);
                }
            });
        }
        return filterFns;
    }
};
DenormalizedPmfmStrategyFilter = __decorate([
    EntityClass({ typename: 'DenormalizedPmfmStrategyFilterVO' })
], DenormalizedPmfmStrategyFilter);
export { DenormalizedPmfmStrategyFilter };
//# sourceMappingURL=pmfm-strategy.filter.js.map