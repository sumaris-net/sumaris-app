import {
  BaseEntityGraphqlQueries,
  BaseEntityService, CryptoService, EntitiesStorage,
  EntityServiceLoadOptions,
  firstArrayValue,
  GraphqlService,
  IEntityService, isEmptyArray, isNil, isNotNil,
  LoadResult,
  NetworkService,
  PlatformService, toNumber
} from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { WeightLengthConversion, WeightLengthConversionRef } from './weight-length-conversion.model';
import { WeightLengthConversionFilter } from '@app/referential/services/filter/weight-length-conversion.filter';
import { gql } from '@apollo/client/core';
import { WeightLengthConversionFragments } from './weight-length-conversion.fragments';
import { SortDirection } from '@angular/material/sort';
import { Program } from '@app/referential/services/model/program.model';
import { map } from 'rxjs/operators';
import { CacheService } from 'ionic-cache';
import { defer } from 'rxjs';
import { Moment } from 'moment';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { LengthMeterConversion, LengthUnitSymbol, WeightKgConversion, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { RoundWeightConversionRef } from '@app/referential/round-weight-conversion/round-weight-conversion.model';

const QUERIES: BaseEntityGraphqlQueries = {
  loadAll: gql`query WeightLengthConversions($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: WeightLengthConversionFilterVOInput){
    data: weightLengthConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...WeightLengthConversionRefFragment
    }
  }
  ${WeightLengthConversionFragments.reference}`,

  loadAllWithTotal: gql`query WeightLengthConversionsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: WeightLengthConversionFilterVOInput){
      data: weightLengthConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
          ...WeightLengthConversionRefFragment
      }
      total: weightLengthConversionsCount(filter: $filter)
  }
  ${WeightLengthConversionFragments.reference}`
};


const CacheKeys = {
  CACHE_GROUP: WeightLengthConversion.TYPENAME,

  LOAD: 'weightLengthConversionByFilter',

  EMPTY_VALUE: new WeightLengthConversionRef()
};


@Injectable({providedIn: 'root'})
// @ts-ignore
export class WeightLengthConversionRefService
  extends BaseEntityService<WeightLengthConversionRef, WeightLengthConversionFilter, number>
  implements IEntityService<WeightLengthConversionRef> {


  constructor(
    protected graphql: GraphqlService,
    protected platform: PlatformService,
    protected network: NetworkService,
    protected cache: CacheService,
    protected entities: EntitiesStorage
  ) {
    super(graphql, platform,
      WeightLengthConversionRef, WeightLengthConversionFilter,
      {
        queries: QUERIES
      });
    this._logPrefix = '[weight-length-conversion-ref-service] ';
  }

  /**
   * Apply a conversion, using this formula : weight = coefA * length ^ coefB
   * @param conversion
   * @param length
   * @param opts
   * */
  computeWeight(conversion: WeightLengthConversionRef,
                length: number,
                opts?: {
                  individualCount?: number;
                  lengthUnit?: LengthUnitSymbol;
                  lengthPrecision?: number;
                  weightUnit?: WeightUnitSymbol;
                }): number | undefined {
    if (isNil(length) || !WeightLengthConversionRef.isNotNilOrBlank(conversion)) return undefined;

    const lengthPrecision = toNumber(opts?.lengthPrecision, 1);

    // Find length conversion coefficient
    let lengthUnitConversion = 1;
    if (opts.lengthUnit !== conversion.lengthUnit?.label) {
      if (!opts.lengthUnit) throw new Error(`Unknown unit of length value '${length}'. Cannot compute weight`);
      if (!conversion.lengthUnit?.label) throw new Error(`Unknown conversion length unit, while received length in '${opts.lengthUnit}'. Cannot apply conversion`);

      // actual -> meter (pivot) -> expected
      lengthUnitConversion = LengthMeterConversion[conversion.lengthUnit.label] / LengthMeterConversion[opts.lengthUnit];
    }

    length = length * lengthUnitConversion
      // Round to HALP_UP Pmfm's precision - see Allegro implementation (source: CalculatedQuantification.drl)
      + 0.5 * lengthPrecision * lengthUnitConversion;

    // Apply Weight/Length conversion
    const weightKg = conversion.conversionCoefficientA
      * Math.pow(length, conversion.conversionCoefficientB)
      * toNumber(opts?.individualCount, 1);

    // Applying weight conversion
    if (opts && opts.weightUnit !== 'kg') {

      const unitConversion = WeightKgConversion[opts.weightUnit];
      if (isNil(unitConversion)) {
        console.warn(`Unknown weight unit '${opts?.weightUnit}'. Will use 'kg'`);
        return weightKg
      }

      // Apply inverse conversion, from kg to expected unit
      return weightKg / unitConversion;
    }

    return weightKg;
  }

  async loadByFilter(filter: Partial<WeightLengthConversionFilter> & {
      month: number;
      year: number;
      referenceTaxonId: number;
      lengthPmfmId: number;
      rectangleLabel: string;
    }, opts?: {cache?: boolean}): Promise<WeightLengthConversionRef | undefined> {

    filter = this.asFilter(filter);

    // Use cache
    if (!opts || opts.cache !== false) {
      const cacheKey = [
        CacheKeys.LOAD,
        CryptoService.sha256(JSON.stringify(filter.asObject())).substring(0,8)
      ].join('|');
      return this.cache.getOrSetItem(cacheKey,
        () => this.loadByFilter(filter, {...opts, cache: false})
            .then(c => c || CacheKeys.EMPTY_VALUE), // Cache not allowed nil value
        CacheKeys.CACHE_GROUP
      )
      // map EMPTY to undefined
      .then(c => WeightLengthConversionRef.isNotNilOrBlank(c) ? c : undefined);
    }

    const size = 1;
    const loadOptions = {withTotal: false, toEntity: false};
    const sortBy: keyof WeightLengthConversionRef = isNil(filter.year) ? 'year' : 'startMonth';

    // First, try with full filter
    let res = await this.loadAll(0, size, sortBy, 'desc', filter, loadOptions);

    // Retry on year only (without month)
    if (isEmptyArray(res?.data) && isNotNil(filter.month)) {
      console.debug(this._logPrefix + 'No conversion found, for [month, year]. Retrying with year only.')
      res = await this.loadAll(0, size, sortBy, 'desc', {...filter, month: undefined}, loadOptions);
    }

    // Retry on month only (without year)
    if (isEmptyArray(res?.data) && isNotNil(filter.month) && isNotNil(filter.year)) {
      console.debug(this._logPrefix + 'No conversion found, for [year]. Retrying without month only.')
      res = await this.loadAll(0, size, 'year', 'desc', {...filter, year: undefined}, loadOptions);
    }

    // Not found
    if (isEmptyArray(res?.data)) {
      console.debug(this._logPrefix + 'No conversion found!')
      return null;
    }

    return res.data[0];
  }

  loadAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection, filter?: Partial<WeightLengthConversionFilter>,
          opts?: EntityServiceLoadOptions & { query?: any; debug?: boolean; withTotal?: boolean; }): Promise<LoadResult<WeightLengthConversionRef>> {


    filter = this.asFilter(filter);

    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      return this.entities.loadAll<any>(WeightLengthConversion.TYPENAME, {
        offset, size, sortBy, sortDirection,
        filter: filter.asFilterFn()
      });
    }

    return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
  }

  async clearCache() {
    console.info("[weight-length-conversion-ref-service] Clearing cache...");
    await this.cache.clearGroup(CacheKeys.CACHE_GROUP);
  }
}
