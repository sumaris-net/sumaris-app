import { Injectable } from '@angular/core';
import { BaseGraphqlService, DateUtils, EntityUtils, GraphqlService, isEmptyArray, isNotNil, toNumber } from '@sumaris-net/ngx-components';
import { FetchPolicy, gql } from '@apollo/client/core';
import { SamplingStrategy, StrategyEffort } from '@app/referential/services/model/sampling-strategy.model';
import { ExtractionCacheDurationType } from '@app/extraction/type/extraction-type.model';
import { TripFilter } from '@app/trip/services/filter/trip.filter';

const Queries = {
  speciesLength: gql`query SpeciesLength($ids: [String!]!,
    $programLabel: String!,
    $offset: Int, $size: Int, $sortBy: String, $sortDirection: String,
    $cacheDuration: String) {
    data: extraction(
      type: {format: "apase"},
      offset: $offset,
      size: $size,
      sortBy: $sortBy,
      sortDirection: $sortDirection,
      cacheDuration: $cacheDuration,
      filter: {
        sheetName: "HL",
        criteria: [
          {sheetName: "TR", name: "project", operator: "=", value: $programLabel},
          {sheetName: "TR", name: "trip_code", operator: "IN", values: $ids}
        ]
      }
    )
  }`
};

export class SpeciesLength {
  species: string;
  catchCategory: 'LAN'|'DIS';
  lengthClass: number;
  numberAtLength: number;
  subGearPosition: 'B'|'T';
  taxonGroupId: number;
  referenceTaxonId: number;

  static fromObject(source: any): SpeciesLength {
    const target = new SpeciesLength();
    target.fromObject(source);
    return target;
  }

  fromObject(source: any){
    this.species = source.species;
    this.catchCategory = source.catchCategory;
    this.lengthClass = toNumber(source.lengthClass);
    this.numberAtLength = toNumber(source.numberAtLength);
    this.subGearPosition = source.subGearPosition;
    this.taxonGroupId = toNumber(source.taxonGroupId);
    this.referenceTaxonId = toNumber(source.referenceTaxonId);
  }
}

@Injectable({providedIn: 'root'})
export class TripReportService extends BaseGraphqlService {

  constructor(
    protected graphql: GraphqlService
  ) {
    super(graphql);
  }

  async loadSpeciesLength(filter: Partial<TripFilter>,
                          opts?: {
                            fetchPolicy?: FetchPolicy;
                            cache?: boolean; // enable by default
                            cacheDuration?: ExtractionCacheDurationType;
                          }): Promise<SpeciesLength[]> {

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
      offset: 0,
      size: 1000, // All rows
      sortBy: 'length_class',
      sortDirection: 'asc',
      cacheDuration
    };

    const now = Date.now();
    console.debug(`[trip-report-service] Loading species length... {cache: ${withCache}${withCache ? ', cacheDuration: \'' + cacheDuration + '\'' : ''}}`, variables);

    const {data} = await this.graphql.query<{data: { species: string; catchCategory: string; lengthClass: string; }[]}>({
      query: Queries.speciesLength,
      variables,
      fetchPolicy: opts && opts.fetchPolicy || 'no-cache'
    });

    const entities = (data || []).map(SpeciesLength.fromObject)
    console.debug(`[trip-report-service] Species length loaded in ${Date.now() - now}ms`,entities);

    return entities;
  }

}
