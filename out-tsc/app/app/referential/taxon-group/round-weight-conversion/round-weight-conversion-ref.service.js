import { __awaiter, __decorate, __metadata } from "tslib";
import { BaseEntityService, CryptoService, EntitiesStorage, GraphqlService, isEmptyArray, isNil, NetworkService, PlatformService } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { RoundWeightConversion, RoundWeightConversionRef } from '@app/referential/taxon-group/round-weight-conversion/round-weight-conversion.model';
import { gql } from '@apollo/client/core';
import { RoundWeightConversionFragments } from '@app/referential/taxon-group/round-weight-conversion/round-weight-conversion.fragments';
import { RoundWeightConversionFilter } from '@app/referential/taxon-group/round-weight-conversion/round-weight-conversion.filter';
import { CacheService } from 'ionic-cache';
const QUERIES = {
    loadAll: gql `query RoundWeightConversions($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: RoundWeightConversionFilterVOInput){
    data: roundWeightConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...RoundWeightConversionRefFragment
    }
  }
  ${RoundWeightConversionFragments.reference}`,
    loadAllWithTotal: gql `query RoundWeightConversionsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: RoundWeightConversionFilterVOInput){
      data: roundWeightConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
          ...RoundWeightConversionRefFragment
      }
      total: roundWeightConversionsCount(filter: $filter)
  }
  ${RoundWeightConversionFragments.reference}`
};
const CacheKeys = {
    CACHE_GROUP: RoundWeightConversion.TYPENAME,
    LOAD: 'roundWeightConversionByFilter',
    EMPTY_VALUE: new RoundWeightConversionRef()
};
let RoundWeightConversionRefService = class RoundWeightConversionRefService extends BaseEntityService {
    constructor(graphql, platform, cache, network, entities) {
        super(graphql, platform, RoundWeightConversionRef, RoundWeightConversionFilter, {
            queries: QUERIES
        });
        this.graphql = graphql;
        this.platform = platform;
        this.cache = cache;
        this.network = network;
        this.entities = entities;
    }
    /**
     * Convert an alive weight, into the expected dressing/preservation state
     *
     * @param conversion
     * @param value
     */
    inverseAliveWeight(conversion, value) {
        if (isNil(value) || !conversion)
            return undefined;
        // Apply round weight (inverse) conversion
        return value / conversion.conversionCoefficient;
    }
    loadByFilter(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = this.asFilter(filter);
            // Use cache
            if (!opts || opts.cache !== false) {
                // Create a unique hash, from args
                const cacheKey = [
                    CacheKeys.LOAD,
                    CryptoService.sha256(JSON.stringify(filter.asObject())).substring(0, 8)
                ].join('|');
                return this.cache.getOrSetItem(cacheKey, () => this.loadByFilter(filter, Object.assign(Object.assign({}, opts), { cache: false }))
                    .then(c => c || CacheKeys.EMPTY_VALUE), // Cache not allowed nil value
                CacheKeys.CACHE_GROUP)
                    // map EMPTY to undefined
                    .then(c => RoundWeightConversionRef.isNotNilOrBlank(c) ? c : undefined);
            }
            const size = 1;
            const res = yield this.loadAll(0, size, 'startDate', 'desc', filter, { withTotal: false, toEntity: false });
            // Not found
            if (isEmptyArray(res === null || res === void 0 ? void 0 : res.data)) {
                console.debug(this._logPrefix + 'No conversion found!');
                return null;
            }
            return res.data[0];
        });
    }
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        filter = this.asFilter(filter);
        const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
        if (offline) {
            return this.entities.loadAll(RoundWeightConversion.TYPENAME, {
                offset, size, sortBy, sortDirection,
                filter: filter.asFilterFn()
            });
        }
        return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
    }
    clearCache() {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[round-weight-conversion-ref-service] Clearing cache...');
            yield this.cache.clearGroup(CacheKeys.CACHE_GROUP);
        });
    }
};
RoundWeightConversionRefService = __decorate([
    Injectable({ providedIn: 'root' })
    // @ts-ignore
    ,
    __metadata("design:paramtypes", [GraphqlService,
        PlatformService,
        CacheService,
        NetworkService,
        EntitiesStorage])
], RoundWeightConversionRefService);
export { RoundWeightConversionRefService };
//# sourceMappingURL=round-weight-conversion-ref.service.js.map