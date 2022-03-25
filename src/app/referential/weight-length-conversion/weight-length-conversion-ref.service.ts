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
import { WeightToKgCoefficientConversion, WeightUnitSymbol } from '@app/referential/services/model/model.enum';

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


const WeightLengthConversionRefCacheKeys = {
  CACHE_GROUP: WeightLengthConversion.TYPENAME,

  FIND_BEST: 'findBest',
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
    protected cryptoService: CryptoService,
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
  computeWeight(conversion: WeightLengthConversionRef, length: number, opts?: {
    individualCount?: number;
    unit?: WeightUnitSymbol
  }): number | undefined {
    if (isNil(length) || !conversion) return undefined;

    // Apply conversion
    const weightKg = conversion.conversionCoefficientA
      * Math.pow(length, conversion.conversionCoefficientB)
      * toNumber(opts?.individualCount, 1)
      // Convert g to kg
      /// WeightToKgCoefficientConversion.g;

    // Kilograms expected: nothing to do
    if (!opts || opts.unit == 'kg') return weightKg;

    const unitConversion = WeightToKgCoefficientConversion[opts.unit];
    if (isNil(unitConversion)) {
      console.warn(`Unknown weight unit '${opts?.unit}'. Will use 'kg'`);
      return weightKg
    }

    // Apply inverse conversion, from kg to expected unit
    return weightKg / unitConversion;
  }

  async findAppliedConversion(filter: Partial<WeightLengthConversionFilter> & {
    month: number, year: number,
    referenceTaxonId: number;
    lengthPmfmId: number;
  }, opts?: {cache?: boolean}): Promise<WeightLengthConversionRef | undefined> {

    // Use cache
    /*if (!opts || opts.cache !== false) {
      const cacheKey = [
        WeightLengthConversionRefCacheKeys.FIND_BEST,
        this.cryptoService.sha256(JSON.stringify(filter)).substring(0, 8) // Create a unique hash, from args
      ].join('|');
      return this.cache.getOrSetItem(cacheKey,
        () => {

        }),
        WeightLengthConversionRefCacheKeys.CACHE_GROUP
      );
    }*/

    const size = 1;
    let sortBy: keyof WeightLengthConversionRef = isNil(filter.year) ? 'year' : 'startMonth';
    let res = await this.loadAll(0, size, sortBy, 'desc', filter, {withTotal: false, toEntity: false});

    // Retry on year only (without the given month)
    if (isEmptyArray(res?.data) && isNotNil(filter.month)) {
      console.debug(this._logPrefix + 'No conversion found, for [month, year]. Retrying with year only.')
      res = await this.loadAll(0, size, sortBy, 'desc', {...filter, month: undefined}, {withTotal: false, toEntity: false});
    }

    // Retry on month only (without the given year)
    if (isEmptyArray(res?.data) && isNotNil(filter.month) && isNotNil(filter.year)) {
      console.debug(this._logPrefix + 'No conversion found, for [year]. Retrying without month only.')
      res = await this.loadAll(0, size, 'year', 'desc', {...filter, year: undefined}, {withTotal: false, toEntity: false});
    }

    if (isEmptyArray(res?.data)) {
      console.debug(this._logPrefix + 'No conversion found!')
      return undefined;
    }

    return firstArrayValue(res.data);
  }

  loadAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection, filter?: Partial<WeightLengthConversionFilter>,
          opts?: EntityServiceLoadOptions & { query?: any; debug?: boolean; withTotal?: boolean; }): Promise<LoadResult<WeightLengthConversionRef>> {


    filter = this.asFilter(filter);

    // TODO
    const offline = false; // this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      return this.entities.loadAll<any>(WeightLengthConversion.TYPENAME, {
        offset, size, sortBy, sortDirection,
        filter: filter.asFilterFn()
      });
    }

    return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
  }
}
