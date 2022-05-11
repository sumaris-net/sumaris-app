import { Injectable } from '@angular/core';
import { ApolloCache, FetchPolicy, gql } from '@apollo/client/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityService, BaseGraphqlService,
  EntitiesServiceWatchOptions,
  EntitySaveOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  GraphqlService,
  isNil,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  Person,
  PlatformService,
  trimEmptyToNull
} from '@sumaris-net/ngx-components';
import { ExtractionFilter, ExtractionFilterCriterion, ExtractionResult, ExtractionType, ExtractionTypeUtils } from '../type/extraction-type.model';
import { DataCommonFragments } from '../../trip/services/trip.queries';
import { SortDirection } from '@angular/material/sort';
import { DataEntityAsObjectOptions } from '../../data/services/model/data-entity.model';
import { ExtractionErrorCodes } from '@app/extraction/common/extraction.errors';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { ExtractionTypeFragments } from '@app/extraction/type/extraction-type.service';


export const ExtractionFragments = {
  column: gql`fragment ExtractionColumnFragment on ExtractionTableColumnVO {
    label
    name
    columnName
    type
    description
    rankOrder
  }`
};


export const ExtractionQueries = {

  loadRows: gql`query ExtractionRows($type: ExtractionTypeVOInput, $filter: ExtractionFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: extractionRows(type: $type, filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      rows
      total
      columns {
        ...ExtractionColumnFragment
      }
    }
  }
  ${ExtractionFragments.column}`,

  getFile: gql`query ExtractionFile($type: ExtractionTypeVOInput, $filter: ExtractionFilterVOInput){
    data: extractionFile(type: $type, filter: $filter)
  }`
}

@Injectable({providedIn: 'root'})
export class ExtractionService extends BaseGraphqlService<ExtractionType, ExtractionTypeFilter> {

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
  ) {
    super(graphql);
  }

  /**
   * Load extraction rows
   * @param type
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   * @param options
   */
  async loadRows(
    type: ExtractionType,
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: ExtractionFilter,
    options?: {
      fetchPolicy?: FetchPolicy
    }): Promise<ExtractionResult> {

    const variables: any = {
      type: ExtractionTypeUtils.minify(type),
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || undefined,
      sortDirection: sortDirection || 'asc',
      filter
    };

    const now = Date.now();
    if (this._debug) console.debug("[extraction-service] Loading rows... using options:", variables);
    const res = await this.graphql.query<{ data: ExtractionResult }>({
      query: ExtractionQueries.loadRows,
      variables,
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_ROWS_ERROR, message: "EXTRACTION.ERROR.LOAD_ROWS_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'no-cache'
    });
    if (!res || !res.data) return null;
    const data = ExtractionResult.fromObject(res.data);

    // Compute column index
    (data.columns || []).forEach((c, index) => c.index = index);

    if (this._debug) console.debug(`[extraction-service] Rows ${type.category} ${type.label} loaded in ${Date.now() - now}ms`, data);
    return data;
  }

  /**
   * Download extraction to file
   * @param type
   * @param filter
   * @param options
   */
  async downloadFile(
    type: ExtractionType,
    filter?: ExtractionFilter,
    options?: {
      fetchPolicy?: FetchPolicy
    }): Promise<string | undefined> {

    const variables: any = {
      type: {
        category: type.category,
        label: type.label
      },
      filter: filter
    };

    const now = Date.now();
    if (this._debug) console.debug("[extraction-service] Download extraction file... using options:", variables);
    const res = await this.graphql.query<{ data: string }>({
      query: ExtractionQueries.getFile,
      variables: variables,
      error: {code: ExtractionErrorCodes.DOWNLOAD_EXTRACTION_FILE_ERROR, message: "EXTRACTION.ERROR.DOWNLOAD_FILE_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });
    const fileUrl = res && res.data;
    if (!fileUrl) return undefined;

    if (this._debug) console.debug(`[extraction-service] Extraction ${type.category} ${type.label} done in ${Date.now() - now}ms: ${fileUrl}`, res);

    return fileUrl;
  }

  prepareFilter(source?: ExtractionFilter | any): ExtractionFilter {
    if (isNil(source)) return undefined;

    const target: ExtractionFilter = {
      sheetName: source.sheetName
    };

    target.criteria = (source.criteria || [])
      .filter(criterion => isNotNil(criterion.name))
      .map(criterion => {
        const isMulti = typeof criterion.value === 'string' && criterion.value.indexOf(',') !== -1;
        switch (criterion.operator) {
          case '=':
            if (isMulti) {
              criterion.operator = 'IN';
              criterion.values = (criterion.value as string)
                .split(',')
                .map(trimEmptyToNull)
                .filter(isNotNil);
              delete criterion.value;
            }
            break;
          case '!=':
            if (isMulti) {
              criterion.operator = 'NOT IN';
              criterion.values = (criterion.value as string)
                .split(',')
                .map(trimEmptyToNull)
                .filter(isNotNil);
              delete criterion.value;
            }
            break;
          case 'BETWEEN':
            if (isNotNilOrBlank(criterion.endValue)) {
              if (typeof criterion.value === 'string') {
                criterion.values = [criterion.value.trim(), criterion.endValue.trim()];
              }
              else {
                criterion.values = [criterion.value, criterion.endValue];
              }
            }
            delete criterion.value;
            break;
        }

        delete criterion.endValue;

        return criterion as ExtractionFilterCriterion;
      })
      .filter(ExtractionFilterCriterion.isNotEmpty);

    return target;
  }


  /* -- protected functions -- */

  protected fillDefaultProperties(entity: ExtractionType) {
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

  protected asObject(entity: ExtractionType, opts?: DataEntityAsObjectOptions): any {
    opts = { ...MINIFY_OPTIONS, ...opts };
    const copy = entity.asObject(opts);

    if (opts && opts.minify) {

      // Comment because need to keep recorder person
      copy.recorderPerson = entity.recorderPerson && <Person>{
        id: entity.recorderPerson.id,
        firstName: entity.recorderPerson.firstName,
        lastName: entity.recorderPerson.lastName
      };

      // Keep id only, on department
      copy.recorderDepartment = entity.recorderDepartment && {id: entity.recorderDepartment && entity.recorderDepartment.id} || undefined;
    }

    return copy;
  }


  copyIdAndUpdateDate(source: ExtractionType | undefined, target: ExtractionType) {
    if (!source) return;

    EntityUtils.copyIdAndUpdateDate(source, target);

    // Copy label
    target.label = source.label;

  }
}
