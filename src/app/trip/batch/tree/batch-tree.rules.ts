import { Rule } from '@app/referential/services/model/rule.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { Injectable } from '@angular/core';
import { ConfigService } from '@sumaris-net/ngx-components';

@Injectable({ providedIn: 'root' })
export class BatchRulesService {
  private _cache = new Map<string, Rule>();

  constructor(configService: ConfigService) {
    // Clean cache when config change (PmfmIds can changes)
    configService.config.subscribe((_) => this.resetCache());
  }

  getNotLandingPmfms<T>(pmfmPath = ''): Rule<T>[] {
    const cacheKey = 'noLandingPmfms#' + pmfmPath;
    this._cache[cacheKey] = this._cache[cacheKey] || this.createNotLandingPmfms(pmfmPath);
    return this._cache[cacheKey];
  }

  getNotDiscardPmfms<T>(pmfmPath = ''): Rule<T>[] {
    const cacheKey = 'noDiscardPmfms#' + pmfmPath;
    this._cache[cacheKey] = this._cache[cacheKey] || this.createNotDiscardPmfms(pmfmPath);
    return this._cache[cacheKey];
  }

  resetCache() {
    this._cache.clear();
  }

  private createNotLandingPmfms<T>(pmfmPath = ''): Rule<T>[] {
    return [
      Rule.fromObject(<Partial<Rule>>{
        label: 'no-size-category-pmfm',
        controlledAttribute: `${pmfmPath}id`,
        operator: '!=',
        value: PmfmIds.SIZE_CATEGORY.toString(),
        message: 'Size category not allowed',
      }),
      Rule.fromObject(<Partial<Rule>>{
        label: 'no-batch-trawl-size-category-pmfm',
        controlledAttribute: `${pmfmPath}id`,
        operator: '!=',
        value: PmfmIds.TRAWL_SIZE_CAT.toString(),
        message: 'Trawl size category not allowed',
      }),
      Rule.fromObject(<Partial<Rule>>{
        label: 'no-landing-category-pmfm',
        controlledAttribute: `${pmfmPath}id`,
        operator: '!=',
        value: PmfmIds.LANDING_CATEGORY.toString(), // Industry, Human consumption, etc.
        message: 'Landing category not allowed',
      }),
      Rule.fromObject(<Partial<Rule>>{
        label: 'no-dressing-pmfm',
        controlledAttribute: `${pmfmPath}id`,
        operator: '!=',
        value: PmfmIds.DRESSING.toString(), // Présentation (Entier, Eviscéré, etc.)
        message: 'Dressing not allowed',
      }),
      Rule.fromObject(<Partial<Rule>>{
        label: 'no-preservation-pmfm',
        controlledAttribute: `${pmfmPath}id`,
        operator: '!=',
        value: PmfmIds.PRESERVATION.toString(), // Etat (Frais, congelé, etc.)
        message: 'Preservation not allowed',
      }),
    ];
  }

  private createNotDiscardPmfms<T>(pmfmPath: string = ''): Rule<T>[] {
    return [
      Rule.fromObject(<Partial<Rule>>{
        label: 'no-batch-sorting-pmfm',
        controlledAttribute: `${pmfmPath}id`,
        operator: 'NOT IN',
        values: [
          PmfmIds.BATCH_SORTING.toString(), // Vrac/Hors-Vrac
          PmfmIds.DISCARD_WEIGHT.toString(),
          PmfmIds.IS_SAMPLING.toString(),
          PmfmIds.DISCARD_TYPE.toString(),
        ],
        message: 'Batch sorting pmfm not allowed',
      }),
      // Rule.fromObject(<Partial<Rule>>{
      //   label: 'no-batch-sorting-pmfm',
      //   controlledAttribute: `${pmfmPath}id`,
      //   operator: '!=',
      //   value: PmfmIds.BATCH_SORTING.toString(), // Vrac/Hors-Vrac
      //   message: 'Batch sorting pmfm not allowed',
      // }),
      // Rule.fromObject(<Partial<Rule>>{
      //   label: 'no-discard-weight-pmfm',
      //   controlledAttribute: `${pmfmPath}id`,
      //   operator: '!=',
      //   value: PmfmIds.DISCARD_WEIGHT.toString(),
      //   message: 'Discard weight pmfm not allowed',
      // }),
      // Rule.fromObject(<Partial<Rule>>{
      //   label: 'no-discard-type-pmfm',
      //   controlledAttribute: `${pmfmPath}id`,
      //   operator: '!=',
      //   value: PmfmIds.DISCARD_TYPE.toString(),
      //   message: 'Discard type pmfm not allowed',
      // }),
      // Rule.fromObject(<Partial<Rule>>{
      //   label: 'no-is-sampling-type-pmfm',
      //   controlledAttribute: `${pmfmPath}id`,
      //   operator: '!=',
      //   value: PmfmIds.IS_SAMPLING.toString(),
      //   message: 'Is sampling pmfm not allowed',
      // }),
    ];
  }
}
