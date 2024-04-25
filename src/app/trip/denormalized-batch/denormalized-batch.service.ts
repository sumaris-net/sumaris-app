import { BaseEntityService, EntityServiceLoadOptions, GraphqlService, LoadResult, PlatformService } from '@sumaris-net/ngx-components';
import { DenormalizedBatch } from './denormalized-batch.model';
import { DenormalizedBatchFilter } from './denormalized-batch.filter';
import gql from 'graphql-tag';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';

export const DenormalizedBatchFragments = {
  denormalizedBatchLight: gql`
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
};

export const DenormalizedBatchQueries = {
  loadAll: gql`
    query DenormalizedBatches($filter: DenormalizedBatchesFilterVOInput) {
      data: denormalizedBatches(filter: $filter) {
        ...DenormalizedBatchFragment
        __typename
      }
    }
    ${DenormalizedBatchFragments.denormalizedBatchLight}
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
}
