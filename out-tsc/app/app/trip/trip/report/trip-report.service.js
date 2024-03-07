import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { BaseGraphqlService, GraphqlService } from '@sumaris-net/ngx-components';
import { gql } from '@apollo/client/core';
import { ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { RdbPmfmSpeciesLength, RdbPmfmTrip, RdbSpeciesList, RdbStation } from '@app/trip/trip/report/trip-report.model';
const Queries = {
    extraction: gql `query Extraction($formatLabel: String!, $filter: ExtractionFilterVOInput!, $offset: Int, $size: Int, $cacheDuration: String) {
    data: extraction(
      type: {format: $formatLabel},
      offset: $offset,
      size: $size,
      cacheDuration: $cacheDuration,
      filter: $filter
    )
  }`
};
let TripReportService = class TripReportService extends BaseGraphqlService {
    constructor(graphql) {
        super(graphql);
        this.graphql = graphql;
    }
    loadAll(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            opts = Object.assign({ sheetNames: ['TR', 'HH', 'SL', 'HL'], dataTypes: {
                    TR: RdbPmfmTrip,
                    HH: RdbStation,
                    SL: RdbSpeciesList,
                    HL: RdbPmfmSpeciesLength
                } }, opts);
            const withCache = (!opts || opts.cache !== false);
            const cacheDuration = withCache ? (opts && opts.cacheDuration || 'default') : undefined;
            filter = ExtractionFilter.fromObject(filter);
            if (filter.isEmpty())
                throw new Error('Cannot load trip data: filter is empty!');
            const podFilter = filter.asPodObject();
            podFilter.sheetNames = opts === null || opts === void 0 ? void 0 : opts.sheetNames;
            delete podFilter.sheetName;
            const variables = {
                filter: podFilter,
                formatLabel: opts.formatLabel || 'pmfm_trip',
                offset: 0,
                size: 10000,
                sortDirection: 'asc',
                cacheDuration
            };
            const now = Date.now();
            console.debug(`[trip-report-service] Loading extraction data... {cache: ${withCache}${withCache ? ', cacheDuration: \'' + cacheDuration + '\'' : ''}}`, variables);
            const query = (opts === null || opts === void 0 ? void 0 : opts.query) || Queries.extraction;
            const { data } = yield this.graphql.query({
                query,
                variables,
                fetchPolicy: opts && opts.fetchPolicy || 'no-cache'
            });
            const result = Object.keys(data).reduce((map, sheetName) => {
                const jsonArray = data[sheetName];
                const dataType = opts === null || opts === void 0 ? void 0 : opts.dataTypes[sheetName];
                if (dataType) {
                    const entities = (jsonArray || []).map(json => {
                        const entity = new dataType();
                        entity.fromObject(json);
                        return entity;
                    });
                    map[sheetName] = entities;
                }
                else {
                    console.warn('Unknown dataType for sheetName: ' + sheetName);
                    map[sheetName] = jsonArray; // Unknown data type
                }
                return map;
            }, {});
            console.debug(`[trip-report-service] Extraction data loaded in ${Date.now() - now}ms`, result);
            return result;
        });
    }
};
TripReportService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GraphqlService])
], TripReportService);
export { TripReportService };
//# sourceMappingURL=trip-report.service.js.map