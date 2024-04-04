import { __awaiter, __decorate, __metadata } from "tslib";
import { BaseEntityService, CryptoService, EntitiesStorage, GraphqlService, isNil, isNotEmptyArray, isNotNil, NetworkService, PlatformService, toNumber } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { WeightLengthConversion, WeightLengthConversionRef } from './weight-length-conversion.model';
import { WeightLengthConversionFilter } from '@app/referential/services/filter/weight-length-conversion.filter';
import { gql } from '@apollo/client/core';
import { WeightLengthConversionFragments } from './weight-length-conversion.fragments';
import { CacheService } from 'ionic-cache';
import { LengthMeterConversion, WeightKgConversion } from '@app/referential/services/model/model.enum';
const QUERIES = {
    loadAll: gql `query WeightLengthConversions($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: WeightLengthConversionFilterVOInput){
    data: weightLengthConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...WeightLengthConversionRefFragment
    }
  }
  ${WeightLengthConversionFragments.reference}`,
    loadAllWithTotal: gql `query WeightLengthConversionsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: WeightLengthConversionFilterVOInput){
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
let WeightLengthConversionRefService = class WeightLengthConversionRefService extends BaseEntityService {
    constructor(graphql, platform, network, cache, entities) {
        super(graphql, platform, WeightLengthConversionRef, WeightLengthConversionFilter, {
            queries: QUERIES
        });
        this.graphql = graphql;
        this.platform = platform;
        this.network = network;
        this.cache = cache;
        this.entities = entities;
        this._logPrefix = '[weight-length-conversion-ref-service] ';
    }
    /**
     * Apply a conversion, using this formula : weight = coefA * length ^ coefB
     *
     * @param conversion
     * @param length
     * @param opts
     * */
    computeWeight(conversion, length, opts) {
        var _a, _b;
        if (isNil(length) || !WeightLengthConversionRef.isNotNilOrBlank(conversion))
            return undefined;
        const lengthPrecision = toNumber(opts === null || opts === void 0 ? void 0 : opts.lengthPrecision, 1);
        // Find length conversion coefficient
        let lengthUnitConversion = 1;
        if (opts.lengthUnit !== ((_a = conversion.lengthUnit) === null || _a === void 0 ? void 0 : _a.label)) {
            if (!opts.lengthUnit)
                throw new Error(`Unknown unit of length value '${length}'. Cannot compute weight`);
            if (!((_b = conversion.lengthUnit) === null || _b === void 0 ? void 0 : _b.label))
                throw new Error(`Unknown conversion length unit, while received length in '${opts.lengthUnit}'. Cannot apply conversion`);
            // actual -> meter (pivot) -> expected
            lengthUnitConversion = LengthMeterConversion[conversion.lengthUnit.label] / LengthMeterConversion[opts.lengthUnit];
        }
        length = length * lengthUnitConversion
            // Round to HALP_UP Pmfm's precision - see Allegro implementation (source: CalculatedQuantification.drl)
            + 0.5 * lengthPrecision * lengthUnitConversion;
        // Apply Weight/Length conversion
        const weightKg = conversion.conversionCoefficientA
            * Math.pow(length, conversion.conversionCoefficientB)
            * toNumber(opts === null || opts === void 0 ? void 0 : opts.individualCount, 1);
        // Applying weight conversion
        if (opts && opts.weightUnit !== 'kg') {
            const unitConversion = WeightKgConversion[opts.weightUnit];
            if (isNil(unitConversion)) {
                console.warn(`Unknown weight unit '${opts === null || opts === void 0 ? void 0 : opts.weightUnit}'. Will use 'kg'`);
                return weightKg;
            }
            // Apply inverse conversion, from kg to expected unit
            return weightKg / unitConversion;
        }
        return weightKg;
    }
    /**
     * Get the best fit weight-length conversion.
     * Will try to load using this order
     * <ul>
     *     <li>pmfmId + year + month</li>
     *     <li>pmfmId + year (without month)</li>
     *     <li>pmfmId + month (without year)</li>
     *     <li>TODO: Loop using parameterId (without pmfmId). If found, will convert unit</li>
     * </ul>
     *
     * @param filter
     * @param page
     * @param fetchOptions
     * @return
     */
    loadByFilter(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = this.asFilter(filter);
            // Use cache
            if (!opts || opts.cache !== false) {
                const cacheKey = [
                    CacheKeys.LOAD,
                    CryptoService.sha256(JSON.stringify(filter.asObject())).substring(0, 8)
                ].join('|');
                return this.cache.getOrSetItem(cacheKey, () => this.loadByFilter(filter, Object.assign(Object.assign({}, opts), { cache: false }))
                    .then(c => c || CacheKeys.EMPTY_VALUE), // Cache not allowed nil value
                CacheKeys.CACHE_GROUP)
                    // map EMPTY to undefined
                    .then(c => WeightLengthConversionRef.isNotNilOrBlank(c) ? c : undefined);
            }
            const size = 1;
            const loadOptions = { withTotal: false, toEntity: false };
            const sortBy = isNil(filter.year) ? 'year' : 'startMonth';
            // First, try with full filter
            let res = yield this.loadAll(0, size, sortBy, 'desc', filter, loadOptions);
            if (isNotEmptyArray(res === null || res === void 0 ? void 0 : res.data))
                return res.data[0];
            if (isNotNil(filter.month) && isNotNil(filter.year)) {
                // Retry on year only (without month)
                console.debug(this._logPrefix + 'No conversion found, for [month, year]. Retrying with year only.');
                res = yield this.loadAll(0, size, sortBy, 'desc', Object.assign(Object.assign({}, filter), { month: undefined }), loadOptions);
                if (isNotEmptyArray(res === null || res === void 0 ? void 0 : res.data))
                    return res.data[0];
                // Retry on month only (without year)
                console.debug(this._logPrefix + 'No conversion found, for [year]. Retrying without month only.');
                res = yield this.loadAll(0, size, 'year', 'desc', Object.assign(Object.assign({}, filter), { year: undefined }), loadOptions);
                if (isNotEmptyArray(res === null || res === void 0 ? void 0 : res.data))
                    return res.data[0];
            }
            // Not found
            console.debug(this._logPrefix + 'No conversion found!');
            return null;
        });
    }
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        filter = this.asFilter(filter);
        const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
        if (offline) {
            return this.entities.loadAll(WeightLengthConversion.TYPENAME, {
                offset, size, sortBy, sortDirection,
                filter: filter.asFilterFn()
            });
        }
        return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
    }
    clearCache() {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[weight-length-conversion-ref-service] Clearing cache...');
            yield this.cache.clearGroup(CacheKeys.CACHE_GROUP);
        });
    }
};
WeightLengthConversionRefService = __decorate([
    Injectable({ providedIn: 'root' })
    // @ts-ignore
    ,
    __metadata("design:paramtypes", [GraphqlService,
        PlatformService,
        NetworkService,
        CacheService,
        EntitiesStorage])
], WeightLengthConversionRefService);
export { WeightLengthConversionRefService };
//# sourceMappingURL=weight-length-conversion-ref.service.js.map