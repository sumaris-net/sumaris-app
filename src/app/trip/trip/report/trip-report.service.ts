import { Injectable } from '@angular/core';
import { BaseGraphqlService, EntityUtils, GraphqlService, isEmptyArray } from '@sumaris-net/ngx-components';
import { FetchPolicy, gql } from '@apollo/client/core';
import { ExtractionCacheDurationType } from '@app/extraction/type/extraction-type.model';
import { TripFilter } from '@app/trip/services/filter/trip.filter';
import { SpeciesLength, SpeciesList, Station } from '@app/trip/trip/report/trip-report.model';

const Queries = {
  tripReportData: gql`query Extraction($ids: [String!]!,
    $programLabel: String!, $formatLabel: String!, $sheetNames: [String!]!,
    $offset: Int, $size: Int, $sortBy: String, $sortDirection: String,
    $cacheDuration: String) {
    data: extraction(
      type: {format: $formatLabel},
      offset: $offset,
      size: $size,
      sortBy: $sortBy,
      sortDirection: $sortDirection,
      cacheDuration: $cacheDuration,
      filter: {
        sheetNames: $sheetNames,
        criteria: [
          {sheetName: "TR", name: "project", operator: "=", value: $programLabel},
          {sheetName: "TR", name: "trip_code", operator: "IN", values: $ids}
        ]
      }
    )
  }`
};

export interface TripReportData<
  HH extends Station = Station,
  SL extends SpeciesList = SpeciesList,
  HL extends SpeciesLength = SpeciesLength
> {
  HH: HH[];
  SL: SL[];
  HL: HL[];
}

@Injectable()
export class TripReportService<
  R extends TripReportData<HH, SL, HL> = TripReportData<any, any, any>,
  HH extends Station = Station,
  SL extends SpeciesList = SpeciesList,
  HL extends SpeciesLength = SpeciesLength,
> extends BaseGraphqlService {

  constructor(
    protected graphql: GraphqlService
  ) {
    super(graphql);
  }

  async loadData(filter: Partial<TripFilter>,
                 opts?: {
                   formatLabel?: string;
                   sheetNames?: string[];
                   query?: any;
                   dataTypes?: {
                     HH: new () => HH,
                     SL: new () => SL,
                     HL: new () => HL
                   };
                   fetchPolicy?: FetchPolicy;
                   cache?: boolean; // enable by default
                   cacheDuration?: ExtractionCacheDurationType;
                 }): Promise<R> {

    opts = {
      formatLabel: 'pmfm_trip',
      dataTypes: {
        HH: Station as unknown as new () => HH,
        SL: SpeciesList as unknown as new () => SL,
        HL: SpeciesLength as unknown as new () => HL
      },
      ...opts
    };
    const withCache = (!opts || opts.cache !== false);
    const cacheDuration = withCache ? (opts && opts.cacheDuration || 'default') : undefined;
    filter = TripFilter.fromObject(filter);
    const programLabel = filter.program?.label;

    if (!programLabel) throw new Error('Missing filter program');

    // TODO: load locally
    const ids = filter.includedIds
      .filter(EntityUtils.isRemoteId)
      .map(id => id.toString());
    if (isEmptyArray(ids)) {
      console.debug(`[trip-report-service] No trip ids to load: Skip`);
      return; // Skip is empty
    }

    const variables = {
      ids,
      programLabel,
      formatLabel: opts?.formatLabel || 'pmfm_trip',
      sheetNames: opts?.sheetNames || ['HH', 'SL', 'HL'],
      offset: 0,
      size: 10000, // All rows
      sortBy: 'station_number',
      sortDirection: 'asc',
      cacheDuration
    };

    const now = Date.now();
    console.debug(`[trip-report-service] Loading extraction data... {cache: ${withCache}${withCache ? ', cacheDuration: \'' + cacheDuration + '\'' : ''}}`, variables);

    const query = opts?.query || Queries.tripReportData;
    const {data} = await this.graphql.query<{data: TripReportData<HH, SL, HL>}>({
      query,
      variables,
      fetchPolicy: opts && opts.fetchPolicy || 'no-cache'
    });

    const result = Object.keys(data).reduce((map, sheetName) => {
      const jsonArray = data[sheetName];
      const dataType = opts?.dataTypes[sheetName];
      const entities = (jsonArray || []).map(json => {
        const entity =  new dataType();
        entity.fromObject(json);
        return entity;
      });
      map[sheetName] = entities;
      return map;
    }, <R>{});

    console.debug(`[trip-report-service] Extraction data loaded in ${Date.now() - now}ms`,result);

    return result;
  }


}
