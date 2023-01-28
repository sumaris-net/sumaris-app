import { Rule } from '@app/referential/services/model/rule.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { Injectable } from '@angular/core';
import { ConfigService } from '@sumaris-net/ngx-components';

@Injectable({providedIn: 'root'})
export class BatchRules {

  private _cache = new Map<string, Rule>();

  constructor(configService: ConfigService) {
    // Clean cache when config change (PmfmIds can changes)
    configService.config.subscribe(_ => this.resetCache());
  }

  getLandingPmfms<T>(pmfmPath = ''): Rule<T>[] {
    const cacheKey = 'landingPmfms#' + pmfmPath;
    this._cache[cacheKey] = this._cache[cacheKey] || this.createLandingPmfms(pmfmPath);
    return this._cache[cacheKey];
  }

  getNotLandingPmfms<T>(pmfmPath = ''): Rule<T>[] {
    const cacheKey = 'noLandingPmfms#' + pmfmPath;
    this._cache[cacheKey] = this._cache[cacheKey] || this.createLandingPmfms(pmfmPath).map(Rule.not);
    return this._cache[cacheKey];
  }

  getDiscardPmfms<T>(pmfmPath = ''): Rule<T>[] {
    const cacheKey = 'discardPmfms#' + pmfmPath;
    this._cache[cacheKey] = this._cache[cacheKey] || this.createDiscardPmfms(pmfmPath);
    return this._cache[cacheKey];
  }

  getNotDiscardPmfms<T>(pmfmPath = ''): Rule<T>[] {
    const cacheKey = 'noDiscardPmfms#' + pmfmPath;
    this._cache[cacheKey] = this._cache[cacheKey] || this.createDiscardPmfms(pmfmPath).map(Rule.not);
    return this._cache[cacheKey];
  }

  resetCache() {
    this._cache.clear();
  }

  private createLandingPmfms<T>(pmfmPath = ''): Rule<T>[] {
    return [
      Rule.fromObject(<Partial<Rule>>{
          label: 'no-size-category-pmfm',
          controlledAttribute: `${pmfmPath}id`,
          operator: '=',
          value: PmfmIds.SIZE_CATEGORY.toString(),
          message: 'Size category not allowed',
        }),
        Rule.fromObject(<Partial<Rule>>{
          label: 'no-batch-sorting-pmfm',
          controlledAttribute: `${pmfmPath}id`,
          operator: '=',
          value: PmfmIds.TRAWL_SIZE_CAT.toString(),
          message: 'Trawl size category not allowed'
        })
    ];
  }

  private createDiscardPmfms<T>(pmfmPath: string = ''): Rule<T>[] {
    return [
      Rule.fromObject(<Partial<Rule>>{
        label: 'no-batch-sorting-pmfm',
        controlledAttribute: `${pmfmPath}id`,
        operator: '=',
        value: PmfmIds.BATCH_SORTING.toString(),
        message: 'Discard sorting pmfm not allowed'
      }),
      Rule.fromObject(<Partial<Rule>>{
        label: 'no-discard-weight-pmfm',
        controlledAttribute: `${pmfmPath}label`,
        operator: '=',
        value: 'DISCARD_WEIGHT',
        message: 'Discard weight pmfm not allowed'
      })
    ];
  }
}
