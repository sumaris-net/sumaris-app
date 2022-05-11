import { Injectable } from '@angular/core';
import { FetchPolicy, gql } from '@apollo/client/core';


import { AccountService, BaseGraphqlService, GraphqlService } from '@sumaris-net/ngx-components';
import { ExtractionFilter, ExtractionType, ExtractionTypeUtils } from '../type/extraction-type.model';
import { FeatureCollection } from 'geojson';
import { SortDirection } from '@angular/material/sort';
import { ExtractionProduct} from '../product/product.model';
import { environment } from '@environments/environment';
import { ExtractionErrorCodes } from '@app/extraction/common/extraction.errors';
import { IAggregationStrata } from '@app/extraction/strata/strata.model';


const Queries = {

  loadGeoJson: gql`query AggregationGeoJson(
    $type: AggregationTypeVOInput,
    $filter: ExtractionFilterVOInput,
    $strata: AggregationStrataVOInput,
    $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
    aggregationGeoJson(
      type: $type, filter: $filter, strata: $strata,
      offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection
    )
  }`,

  loadTech: gql`query AggregationTech(
      $type: AggregationTypeVOInput,
      $filter: ExtractionFilterVOInput,
      $strata: AggregationStrataVOInput,
      $sortBy: String, $sortDirection: String
    ) {
      data: aggregationTech(type: $type, filter: $filter, strata: $strata, sortBy: $sortBy, sortDirection: $sortDirection) {
        data
      }
    }`,
  techMinMax: gql`query AggregationTechMinMax(
      $type: AggregationTypeVOInput,
      $filter: ExtractionFilterVOInput,
      $strata: AggregationStrataVOInput
    ) {
      data: aggregationTechMinMax(type: $type, filter: $filter, strata: $strata) {
        min
        max
      }
    }`
};


@Injectable({providedIn: 'root'})
export class ExtractionMapService
  extends BaseGraphqlService{

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService
  ) {
    super(graphql, environment);
  }

  /**
   * Load aggregation as GeoJson
   */
  async loadGeoJson(type: ExtractionProduct,
                    strata: IAggregationStrata,
                    offset: number,
                    size: number,
                    sortBy?: string,
                    sortDirection?: SortDirection,
                    filter?: ExtractionFilter,
                    options?: {
                      fetchPolicy?: FetchPolicy
                    }): Promise<FeatureCollection> {
    options = options || {};

    const variables: any = {
      type: ExtractionTypeUtils.minify(type),
      strata: strata,
      filter: filter,
      offset: offset || 0,
      size: size >= 0 ? size : 1000
    };

    const res = await this.graphql.query<{ aggregationGeoJson: any }>({
      query: Queries.loadGeoJson,
      variables: variables,
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_GEO_JSON_ERROR, message: "EXTRACTION.ERROR.LOAD_GEO_JSON_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });
    if (!res || !res.aggregationGeoJson) return null;

    return Object.assign({}, res.aggregationGeoJson);
  }

  async loadAggByTech(type: ExtractionType, strata: IAggregationStrata, filter: ExtractionFilter,
                      options?: { fetchPolicy?: FetchPolicy; }): Promise<Map<string, any>> {
    const variables: any = {
      type: ExtractionTypeUtils.minify(type),
      strata: strata,
      filter: filter
    };

    const { data } = await this.graphql.query<{ data: {data: Map<string, any>} }>({
      query: Queries.loadTech,
      variables: variables,
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_TECH_ERROR, message: "EXTRACTION.ERROR.LOAD_TECH_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });

    return (data && data.data) || null;
  }

  async loadAggMinMaxByTech(type: ExtractionType, strata: IAggregationStrata, filter: ExtractionFilter,
                            options?: { fetchPolicy?: FetchPolicy; }): Promise<{min: number; max: number; }> {
    const variables: any = {
      type: ExtractionTypeUtils.minify(type),
      strata: strata,
      filter: filter
    };

    const res = await this.graphql.query<{ data: {min: number; max: number; } }>({
      query: Queries.techMinMax,
      variables: variables,
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_MIN_MAX_TECH_ERROR, message: "EXTRACTION.ERROR.LOAD_MIN_MAX_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });

    return res && { min: 0, max: 0, ...res.data} || null;
  }

}
