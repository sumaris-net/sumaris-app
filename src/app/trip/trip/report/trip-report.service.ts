import { Injectable } from '@angular/core';
import { BaseGraphqlService, EntityUtils, GraphqlService, IEntity, isEmptyArray } from '@sumaris-net/ngx-components';
import { FetchPolicy, gql } from '@apollo/client/core';
import { ExtractionCacheDurationType, ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { TripFilter } from '@app/trip/services/filter/trip.filter';
import { RdbPmfmSpeciesLength, RdbPmfmTrip, RdbSpeciesLength, RdbSpeciesList, RdbStation, RdbTrip } from '@app/trip/trip/report/trip-report.model';

const Queries = {
  extraction: gql`query Extraction($formatLabel: String!, $filter: ExtractionFilterVOInput!, $offset: Int, $size: Int, $cacheDuration: String) {
    data: extraction(
      type: {format: $formatLabel},
      offset: $offset,
      size: $size,
      cacheDuration: $cacheDuration,
      filter: $filter
    )
  }`
};

export interface RdbData<
  TR extends RdbTrip = RdbTrip,
  HH extends RdbStation = RdbStation,
  SL extends RdbSpeciesList = RdbSpeciesList,
  HL extends RdbSpeciesLength = RdbSpeciesLength
> {
  TR: TR[];
  HH: HH[];
  SL: SL[];
  HL: HL[];
}

export interface RdbPmfmData<
  TR extends RdbPmfmTrip = RdbPmfmTrip,
  HH extends RdbStation = RdbStation,
  SL extends RdbSpeciesList = RdbSpeciesList,
  HL extends RdbPmfmSpeciesLength = RdbPmfmSpeciesLength
> extends RdbData<TR, HH, SL, HL>{

}

@Injectable()
export class TripReportService<
  R extends RdbData<TR, HH, SL, HL> = RdbData<any, any, any, any>,
  TR extends RdbTrip = RdbTrip,
  HH extends RdbStation = RdbStation,
  SL extends RdbSpeciesList = RdbSpeciesList,
  HL extends RdbSpeciesLength = RdbSpeciesLength,
> extends BaseGraphqlService {

  constructor(
    protected graphql: GraphqlService
  ) {
    super(graphql);
  }

  async loadAll(filter: Partial<ExtractionFilter>,
                opts?: {
                   formatLabel?: string;
                   sheetNames?: string[];
                   query?: any;
                   dataTypes?: {
                     TR: new () => TR,
                     HH: new () => HH,
                     SL: new () => SL,
                     HL: new () => HL,
                     [key: string]: new () => IEntity<any>
                   };
                   fetchPolicy?: FetchPolicy;
                   cache?: boolean; // enable by default
                   cacheDuration?: ExtractionCacheDurationType;
                 }): Promise<R> {

    opts = {
      formatLabel: 'pmfm_trip',
      sheetNames: ['TR', 'HH', 'SL', 'HL'],
      dataTypes: {
        TR: RdbTrip as unknown as new () => TR,
        HH: RdbStation as unknown as new () => HH,
        SL: RdbSpeciesList as unknown as new () => SL,
        HL: RdbSpeciesLength as unknown as new () => HL
      },
      ...opts
    };
    const withCache = (!opts || opts.cache !== false);
    const cacheDuration = withCache ? (opts && opts.cacheDuration || 'default') : undefined;

    filter = ExtractionFilter.fromObject(filter);
    if (filter.isEmpty()) throw new Error('Cannot load trip data: filter is empty!');

    const podFilter = filter.asPodObject()
    podFilter.sheetNames = opts?.sheetNames;
    delete podFilter.sheetName;

    const variables = {
      filter: podFilter,
      formatLabel: opts.formatLabel,
      offset: 0,
      size: 10000, // All rows
      sortDirection: 'asc',
      cacheDuration
    };

    const now = Date.now();
    console.debug(`[trip-report-service] Loading extraction data... {cache: ${withCache}${withCache ? ', cacheDuration: \'' + cacheDuration + '\'' : ''}}`, variables);

    const query = opts?.query || Queries.extraction;
    const {data} = await this.graphql.query<{data: RdbData<TR, HH, SL, HL>}>({
      query,
      variables,
      fetchPolicy: opts && opts.fetchPolicy || 'no-cache'
    });

    const result = Object.keys(data).reduce((map, sheetName) => {
      const jsonArray = data[sheetName];
      const dataType = opts?.dataTypes[sheetName];
      if (dataType) {
        const entities = (jsonArray || []).map(json => {
          const entity =  new dataType();
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
    }, <R>{});

    console.debug(`[trip-report-service] Extraction data loaded in ${Date.now() - now}ms`,result);

    return result;
  }


}
