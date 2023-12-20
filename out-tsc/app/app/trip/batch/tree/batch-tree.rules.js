import { __decorate, __metadata } from "tslib";
import { Rule } from '@app/referential/services/model/rule.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { Injectable } from '@angular/core';
import { ConfigService } from '@sumaris-net/ngx-components';
let BatchRules = class BatchRules {
    constructor(configService) {
        this._cache = new Map();
        // Clean cache when config change (PmfmIds can changes)
        configService.config.subscribe(_ => this.resetCache());
    }
    getNotLandingPmfms(pmfmPath = '') {
        const cacheKey = 'noLandingPmfms#' + pmfmPath;
        this._cache[cacheKey] = this._cache[cacheKey] || this.createNotLandingPmfms(pmfmPath);
        return this._cache[cacheKey];
    }
    getNotDiscardPmfms(pmfmPath = '') {
        const cacheKey = 'noDiscardPmfms#' + pmfmPath;
        this._cache[cacheKey] = this._cache[cacheKey] || this.createNotDiscardPmfms(pmfmPath);
        return this._cache[cacheKey];
    }
    resetCache() {
        this._cache.clear();
    }
    createNotLandingPmfms(pmfmPath = '') {
        return [
            Rule.fromObject({
                label: 'no-size-category-pmfm',
                controlledAttribute: `${pmfmPath}id`,
                operator: '!=',
                value: PmfmIds.SIZE_CATEGORY.toString(),
                message: 'Size category not allowed',
            }),
            Rule.fromObject({
                label: 'no-batch-sorting-pmfm',
                controlledAttribute: `${pmfmPath}id`,
                operator: '!=',
                value: PmfmIds.TRAWL_SIZE_CAT.toString(),
                message: 'Trawl size category not allowed'
            })
        ];
    }
    createNotDiscardPmfms(pmfmPath = '') {
        return [
            Rule.fromObject({
                label: 'no-batch-sorting-pmfm',
                controlledAttribute: `${pmfmPath}id`,
                operator: '!=',
                value: PmfmIds.BATCH_SORTING.toString(),
                message: 'Discard sorting pmfm not allowed'
            }),
            Rule.fromObject({
                label: 'no-discard-weight-pmfm',
                controlledAttribute: `${pmfmPath}id`,
                operator: '!=',
                value: PmfmIds.DISCARD_WEIGHT.toString(),
                message: 'Discard weight pmfm not allowed'
            })
        ];
    }
};
BatchRules = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [ConfigService])
], BatchRules);
export { BatchRules };
//# sourceMappingURL=batch-tree.rules.js.map