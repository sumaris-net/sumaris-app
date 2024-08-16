import { BaseEntityService, EntityServiceLoadOptions, ErrorCodes, GraphqlService, LoadResult, PlatformService } from '@sumaris-net/ngx-components';
import { DenormalizedBatch, DenormalizedSaleResult, DenormalizedTripResult } from './denormalized-batch.model';
import { DenormalizedBatchFilter } from './denormalized-batch.filter';
import gql from 'graphql-tag';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';

export const DenormalizedBatchFragments = {
  denormalizedBatch: gql`
    fragment DenormalizedBatchFragment on DenormalizedBatchVO {
      id
      label
      weight
      elevateWeight
      indirectWeight
      indirectRtpWeight
      elevateRtpWeight
      elevateContextWeight
      indirectContextWeight
      individualCount
      indirectIndividualCount
      elevateIndividualCount
      exhaustiveInventory
      treeLevel
      treeIndent
      sortingValuesText
      isLanding
      isDiscard
      measurementValues
      samplingRatioText
      samplingRatio
      parentId
      taxonGroup {
        ...LightReferentialFragment
      }
      taxonName {
        ...TaxonNameFragment
      }
      qualityFlagId
      operationId
      __typename
    }
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.taxonName}
  `,
  denormalizedTripResult: gql`
    fragment DenormalizedTripResult on DenormalizedTripResultVO {
      tripCount
      operationCount
      batchCount
      tripErrorCount
      invalidBatchCount
      executionTime
      message
      status
    }
  `,
  denormalizedSaleResult: gql`
    fragment DenormalizedSaleResult on DenormalizedSaleResultVO {
      saleCount
      batchCount
      saleErrorCount
      invalidBatchCount
      executionTime
      message
      status
    }
  `,
};

export const DenormalizedBatchQueries = {
  loadAll: gql`
    query DenormalizedBatches($filter: DenormalizedBatchesFilterVOInput) {
      data: denormalizedBatches(filter: $filter) {
        ...DenormalizedBatchFragment
        __typename
      }
    }
    ${DenormalizedBatchFragments.denormalizedBatch}
  `,
  denormalizeTrip: gql`
    query DenormalizeTrip($tripId: Int!) {
      data: denormalizeTrip(id: $tripId) {
        ...DenormalizedTripResult
      }
    }
    ${DenormalizedBatchFragments.denormalizedTripResult}
  `,
  denormalizeObservedlocation: gql`
    query DenormalizeObservedLocation($observedLocationId: Int!) {
      data: denormalizeObservedLocation(id: $observedLocationId) {
        ...DenormalizedSaleResult
      }
    }
    ${DenormalizedBatchFragments.denormalizedSaleResult}
  `,
};

@Injectable({ providedIn: 'root' })
export class DenormalizedBatchService extends BaseEntityService<DenormalizedBatch, DenormalizedBatchFilter> {
  protected logPrefix = '[denormalized-batch-service]';
  protected loading = false;

  constructor(
    protected graphql: GraphqlService,
    protected platform: PlatformService
  ) {
    super(graphql, platform, DenormalizedBatch, DenormalizedBatchFilter, {
      queries: DenormalizedBatchQueries,
    });
  }

  async loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<DenormalizedBatchFilter>,
    opts?: EntityServiceLoadOptions & {
      debug?: boolean;
    }
  ): Promise<LoadResult<DenormalizedBatch>> {
    const result = super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
    return result;
  }

  async denormalizeTrip(tripId: number): Promise<LoadResult<DenormalizedTripResult>> {
    if (this._debug) console.debug(this._logPrefix + `DenormalizeTrip {${tripId}}...`);

    const variables = {
      tripId: tripId,
    };

    const query = DenormalizedBatchQueries.denormalizeTrip;
    const { data } = await this.graphql.query<{ data: any }>({
      query,
      variables,
      error: { code: ErrorCodes.LOAD_DATA_ERROR, message: 'ERROR.LOAD_DATA_ERROR' },
    });

    return data;
  }

  async denormalizeObservedLocation(observedLocationId: number): Promise<LoadResult<DenormalizedSaleResult>> {
    if (this._debug) console.debug(this._logPrefix + `DenormalizeObservedLocation {${observedLocationId}}...`);

    const variables = {
      observedLocationId: observedLocationId,
    };

    const query = DenormalizedBatchQueries.denormalizeObservedlocation;
    const { data } = await this.graphql.query<{ data: any }>({
      query,
      variables,
      error: { code: ErrorCodes.LOAD_DATA_ERROR, message: 'ERROR.LOAD_DATA_ERROR' },
    });

    return data;
  }
}
