import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { AccountService, BaseGraphqlService, EntityUtils, GraphqlService, isNil, isNotNil } from '@sumaris-net/ngx-components';
import { ExtractionFilter, ExtractionFilterCriterion, ExtractionResult, ExtractionTypeUtils } from '../type/extraction-type.model';
import { ExtractionErrorCodes } from '@app/extraction/common/extraction.errors';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
export const ExtractionFragments = {
    column: gql `
    fragment ExtractionColumnFragment on ExtractionTableColumnVO {
      label
      name
      columnName
      type
      description
      rankOrder
    }
  `,
};
const Queries = {
    loadRows: gql `query ExtractionRows($type: ExtractionTypeVOInput!, $filter: ExtractionFilterVOInput,
    $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $cacheDuration: String
  ){
    data: extractionRows(type: $type, filter: $filter,
      offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, cacheDuration: $cacheDuration){
      rows
      total
      columns {
        ...ExtractionColumnFragment
      }
    }
  }
  ${ExtractionFragments.column}`,
    getFile: gql `query ExtractionFile($type: ExtractionTypeVOInput!, $filter: ExtractionFilterVOInput){
    data: extractionFile(type: $type, filter: $filter)
  }`,
    loadGeoJson: gql `query AggregationGeoJson(
    $type: ExtractionTypeVOInput!,
    $filter: ExtractionFilterVOInput,
    $strata: AggregationStrataVOInput,
    $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
    data: aggregationGeoJson(
      type: $type, filter: $filter, strata: $strata,
      offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection
    )
  }`,
    loadTech: gql `query AggregationTech(
      $type: ExtractionTypeVOInput!,
      $filter: ExtractionFilterVOInput,
      $strata: AggregationStrataVOInput,
      $sortBy: String, $sortDirection: String
    ) {
      data: aggregationTech(type: $type, filter: $filter, strata: $strata, sortBy: $sortBy, sortDirection: $sortDirection) {
        data
      }
    }`,
    techMinMax: gql `query AggregationTechMinMax(
      $type: ExtractionTypeVOInput!,
      $filter: ExtractionFilterVOInput,
      $strata: AggregationStrataVOInput
    ) {
      data: aggregationTechMinMax(type: $type, filter: $filter, strata: $strata) {
        aggMin
        aggMax
        techMin
        techMax
      }
    }`
};
let ExtractionService = class ExtractionService extends BaseGraphqlService {
    constructor(graphql, accountService) {
        super(graphql);
        this.graphql = graphql;
        this.accountService = accountService;
    }
    /**
     * Load extraction rows
     *
     * @param type
     * @param offset
     * @param size
     * @param sortBy
     * @param sortDirection
     * @param filter
     * @param opts
     */
    loadRows(type, offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = ExtractionFilter.fromObject(filter);
            const variables = {
                type: ExtractionTypeUtils.minify(type),
                offset: offset || 0,
                size: size || 100,
                sortBy: sortBy || undefined,
                sortDirection: sortDirection || 'asc',
                filter: filter && filter.asPodObject()
            };
            // Disable Pod Cache, if disabled
            if (opts === null || opts === void 0 ? void 0 : opts.cacheDuration) {
                variables.cacheDuration = opts.cacheDuration;
            }
            const now = Date.now();
            if (this._debug)
                console.debug('[extraction-service] Loading rows... using options:', variables);
            const res = yield this.graphql.query({
                query: Queries.loadRows,
                variables,
                error: { code: ExtractionErrorCodes.LOAD_EXTRACTION_ROWS_ERROR, message: 'EXTRACTION.ERROR.LOAD_ROWS_ERROR' },
                fetchPolicy: opts && opts.fetchPolicy || 'no-cache'
            });
            if (!res || !res.data)
                return null;
            const data = ExtractionResult.fromObject(res.data);
            // Compute column index
            (data.columns || []).forEach((c, index) => c.index = index);
            if (this._debug)
                console.debug(`[extraction-service] Rows ${type.category} ${type.label} loaded in ${Date.now() - now}ms`, data);
            return data;
        });
    }
    /**
     * Download extraction to file
     *
     * @param type
     * @param filter
     * @param options
     */
    downloadFile(type, filter, options) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = this.asFilter(filter);
            const variables = {
                type: ExtractionTypeUtils.minify(type),
                filter: filter && filter.asPodObject()
            };
            const now = Date.now();
            if (this._debug)
                console.debug('[extraction-service] Download extraction file... using options:', variables);
            const res = yield this.graphql.query({
                query: Queries.getFile,
                variables,
                error: { code: ExtractionErrorCodes.DOWNLOAD_EXTRACTION_FILE_ERROR, message: 'EXTRACTION.ERROR.DOWNLOAD_FILE_ERROR' },
                fetchPolicy: options && options.fetchPolicy || 'no-cache'
            });
            const fileUrl = res && res.data;
            if (!fileUrl)
                return undefined;
            if (this._debug)
                console.debug(`[extraction-service] Extraction ${type.category} ${type.label} done in ${Date.now() - now}ms: ${fileUrl}`, res);
            return fileUrl;
        });
    }
    asFilter(source) {
        if (isNil(source))
            return undefined;
        const target = ExtractionFilter.fromObject(source);
        // Remove empty criterion
        target.criteria = (target.criteria || [])
            .filter(criterion => isNotNil(criterion.name))
            .filter(ExtractionFilterCriterion.isNotEmpty);
        return target;
    }
    /**
     * Load aggregation as GeoJson
     */
    loadGeoJson(type, strata, offset, size, sortBy, sortDirection, filter, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            filter = this.asFilter(filter);
            const variables = {
                type: ExtractionTypeUtils.minify(type),
                strata,
                offset: offset || 0,
                size: size >= 0 ? size : 1000,
                filter: filter && filter.asPodObject()
            };
            const res = yield this.graphql.query({
                query: Queries.loadGeoJson,
                variables,
                error: { code: ExtractionErrorCodes.LOAD_EXTRACTION_GEO_JSON_ERROR, message: 'EXTRACTION.ERROR.LOAD_GEO_JSON_ERROR' },
                fetchPolicy: options && options.fetchPolicy || 'network-only'
            });
            if (!res || !res.data)
                return null;
            return Object.assign({}, res.data);
        });
    }
    loadAggByTech(type, strata, filter, options) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = this.asFilter(filter);
            const variables = {
                type: ExtractionTypeUtils.minify(type),
                strata,
                filter: filter && filter.asPodObject()
            };
            const { data } = yield this.graphql.query({
                query: Queries.loadTech,
                variables,
                error: { code: ExtractionErrorCodes.LOAD_EXTRACTION_TECH_ERROR, message: 'EXTRACTION.ERROR.LOAD_TECH_ERROR' },
                fetchPolicy: options && options.fetchPolicy || 'network-only'
            });
            return (data && data.data) || null;
        });
    }
    loadAggMinMaxByTech(type, strata, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = this.asFilter(filter);
            const variables = {
                type: ExtractionTypeUtils.minify(type),
                filter: filter && filter.asPodObject(),
                strata
            };
            const res = yield this.graphql.query({
                query: Queries.techMinMax,
                variables,
                error: { code: ExtractionErrorCodes.LOAD_EXTRACTION_MIN_MAX_TECH_ERROR, message: 'EXTRACTION.ERROR.LOAD_MIN_MAX_ERROR' },
                fetchPolicy: opts && opts.fetchPolicy || 'network-only'
            });
            return res && Object.assign({ aggMin: 0, aggMax: 0, techMin: 0, techMax: 0 }, res.data) || null;
        });
    }
    /* -- protected functions -- */
    fillDefaultProperties(entity) {
        // If new entity
        const isNew = isNil(entity.id) || entity.id < 0;
        if (isNew) {
            const person = this.accountService.person;
            // Recorder department
            if (person && person.department && !entity.recorderDepartment) {
                entity.recorderDepartment = person.department;
            }
            // Recorder person
            if (person && person.id && !entity.recorderPerson) {
                entity.recorderPerson = person;
            }
        }
    }
    asObject(entity, opts) {
        opts = Object.assign(Object.assign({}, MINIFY_OPTIONS), opts);
        const copy = entity.asObject(opts);
        if (opts && opts.minify) {
            // Comment because need to keep recorder person
            copy.recorderPerson = entity.recorderPerson && {
                id: entity.recorderPerson.id,
                firstName: entity.recorderPerson.firstName,
                lastName: entity.recorderPerson.lastName
            };
            // Keep id only, on department
            copy.recorderDepartment = entity.recorderDepartment && { id: entity.recorderDepartment && entity.recorderDepartment.id } || undefined;
        }
        return copy;
    }
    copyIdAndUpdateDate(source, target) {
        if (!source)
            return;
        EntityUtils.copyIdAndUpdateDate(source, target);
        // Copy label
        target.label = source.label;
    }
};
ExtractionService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        AccountService])
], ExtractionService);
export { ExtractionService };
//# sourceMappingURL=extraction.service.js.map