import { Injectable } from '@angular/core';
import { BaseGraphqlService, changeCaseToUnderscore, EntityUtils, GraphqlService, IEntity, isEmptyArray } from '@sumaris-net/ngx-components';
import { FetchPolicy, gql } from '@apollo/client/core';
import { ExtractionCacheDurationType } from '@app/extraction/type/extraction-type.model';
import { TripFilter } from '@app/trip/services/filter/trip.filter';
import { ApaseSpeciesList, SpeciesLength, SpeciesList, Station } from '@app/trip/trip/report/trip-report.model';

const Queries = {
  stations: gql`query Stations($ids: [String!]!,
    $programLabel: String!, $formatLabel: String!,
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
        sheetName: "HH",
        criteria: [
          {sheetName: "TR", name: "project", operator: "=", value: $programLabel},
          {sheetName: "TR", name: "trip_code", operator: "IN", values: $ids}
        ]
      }
    )
  }`,
  speciesList: gql`query SpeciesLies($ids: [String!]!,
    $programLabel: String!, $formatLabel: String!,
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
        sheetName: "SL",
        criteria: [
          {sheetName: "TR", name: "project", operator: "=", value: $programLabel},
          {sheetName: "TR", name: "trip_code", operator: "IN", values: $ids},
          {sheetName: "HH", name: "fishing_validity", operator: "=", value: "V"}
        ]
      }
    )
  }`,
  speciesLength: gql`query SpeciesLength($ids: [String!]!,
    $programLabel: String!, $formatLabel: String!,
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
        sheetName: "HL",
        criteria: [
          {sheetName: "TR", name: "project", operator: "=", value: $programLabel},
          {sheetName: "TR", name: "trip_code", operator: "IN", values: $ids},
          {sheetName: "HH", name: "fishing_validity", operator: "=", value: "V"}
        ]
      }
    )
  }`
};


@Injectable({providedIn: 'root'})
export class TripReportService extends BaseGraphqlService {

  constructor(
    protected graphql: GraphqlService
  ) {
    super(graphql);
  }

  async loadStations<S extends Station<S>>(filter: Partial<TripFilter>,
                      opts?: {
                        formatLabel?: string;
                        dataType?: new () => S;
                        fetchPolicy?: FetchPolicy;
                        cache?: boolean; // enable by default
                        cacheDuration?: ExtractionCacheDurationType;
                      }): Promise<S[]> {
    const dataType = opts?.dataType || (Station as unknown as new() => S);
    // @ts-ignore
    return this.loadData(filter, Queries.stations, dataType, 'station_number', opts);
  }

  async loadSpeciesList<SL extends SpeciesList<SL>>(filter: Partial<TripFilter>,
                                           opts?: {
                                             formatLabel?: string;
                                             dataType?: new () => SL;
                                             fetchPolicy?: FetchPolicy;
                                             cache?: boolean; // enable by default
                                             cacheDuration?: ExtractionCacheDurationType;
                                           }): Promise<SL[]> {
    const dataType = opts?.dataType || (SpeciesList as unknown as new() => SL);
    // @ts-ignore
    return this.loadData(filter, Queries.speciesList, dataType, 'station_number', opts);
  }

  loadSpeciesLength<HL extends SpeciesLength<HL>>(filter: Partial<TripFilter>,
                          opts?: {
                            formatLabel: string;
                            dataType?: new() => HL;
                            fetchPolicy?: FetchPolicy;
                            cache?: boolean; // enable by default
                            cacheDuration?: ExtractionCacheDurationType;
                          }): Promise<HL[]> {

    const dataType = opts?.dataType || (SpeciesLength as unknown as new() => HL);
    // @ts-ignore
    return this.loadData(filter, Queries.speciesLength, dataType, 'length_class', opts);
  }

  /** protected methods **/

  // @ts-ignore
  async loadData<T extends IEntity<T>>(filter: Partial<TripFilter>,
                                      query: any,
                                      dataType: new() => T,
                                      sortBy?: string,
                                      opts?: {
                                        formatLabel?: string;
                                        fetchPolicy?: FetchPolicy;
                                        cache?: boolean; // enable by default
                                        cacheDuration?: ExtractionCacheDurationType;
                                      }): Promise<T[]> {

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
      offset: 0,
      size: 10000, // All rows
      sortBy: sortBy || 'tripCode',
      sortDirection: 'asc',
      cacheDuration
    };

    const now = Date.now();
    console.debug(`[trip-report-service] Loading extraction data... {cache: ${withCache}${withCache ? ', cacheDuration: \'' + cacheDuration + '\'' : ''}}`, variables);

    const {data} = await this.graphql.query<{data: any[]}>({
      query,
      variables,
      fetchPolicy: opts && opts.fetchPolicy || 'no-cache'
    });

    const entities = (data || []).map(json => {
      const entity = new dataType();
      entity.fromObject(json);
      return entity as T;
    });
    console.debug(`[trip-report-service] Extraction data loaded in ${Date.now() - now}ms`,entities);

    return entities;
  }

}
