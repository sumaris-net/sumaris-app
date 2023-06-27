import { Injectable } from '@angular/core';
import { ApolloCache, FetchPolicy, gql, WatchQueryFetchPolicy } from '@apollo/client/core';
import { Observable, of } from 'rxjs';
import { filter, map, mergeMap, switchMap, tap } from 'rxjs/operators';


import {
  AccountService,
  BaseEntityGraphqlQueries,
  BaseEntityService,
  EntityServiceLoadOptions,
  GraphqlService,
  IEntitiesService,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  LoadResult,
  PlatformService,
  Property,
  propertyComparator,
  ReferentialUtils,
  StatusIds
} from '@sumaris-net/ngx-components';
import { ExtractionType, ExtractionTypeUtils } from './extraction-type.model';
import { DataCommonFragments } from '@app/trip/trip/trip.queries';
import { SortDirection } from '@angular/material/sort';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { isNonEmptyArray } from '@apollo/client/utilities';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Program } from '@app/referential/services/model/program.model';
import { TranslateService } from '@ngx-translate/core';
import { intersectArrays } from '@app/shared/functions';


export const ExtractionTypeFragments = {
  lightType : gql`fragment LightExtractionTypeFragment on ExtractionTypeVO {
    id
    label
    name
    format
    version
    updateDate
  }`,
  type: gql`fragment ExtractionTypeFragment on ExtractionTypeVO {
    id
    label
    name
    format
    version
    description
    docUrl
    updateDate
    comments
    isSpatial
    statusId
    sheetNames
    processingFrequencyId
    recorderPerson {
      ...LightPersonFragment
    }
    recorderDepartment {
      ...LightDepartmentFragment
    }
  }
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}`
};

const Queries: BaseEntityGraphqlQueries = {

  loadAll: gql`query ExtractionTypes($filter: ExtractionTypeFilterVOInput) {
      data: extractionTypes(filter: $filter) {
        ...ExtractionTypeFragment
      }
    }
    ${ExtractionTypeFragments.type}`,

}

const fixWorkaroundDataFn = ({data, total}) => {
  // Workaround because saveAggregation() doest not add NEW extraction type correctly
  data = (data || []).filter(e => {
    if (isNil(e?.label)) {
      console.warn('[extraction-service] FIXME: Invalid extraction type (no format)... bad cache insertion in saveAggregation() ?');
      return false;
    }
    return true;
  });
  return {data, total}
};

@Injectable({providedIn: 'root'})
export class ExtractionTypeService
  extends BaseEntityService<ExtractionType, ExtractionTypeFilter>
  implements IEntitiesService<ExtractionType, ExtractionTypeFilter> {

  constructor(
    protected graphql: GraphqlService,
    protected platformService: PlatformService,
    protected accountService: AccountService,
    protected programRefService: ProgramRefService,
    protected translate: TranslateService
  ) {
    super(graphql, platformService, ExtractionType, ExtractionTypeFilter, {
      queries: Queries
    });
  }


  loadAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection,
          filter?: ExtractionTypeFilter,
          opts?: EntityServiceLoadOptions & { query?: any; debug?: boolean; withTotal?: boolean }): Promise<LoadResult<ExtractionType>> {
    return super.loadAll(offset, size, sortBy, sortDirection, filter, {
      ...opts,
      withTotal: false // Always false (loadAllWithTotal query not defined yet)
    })
      .then(fixWorkaroundDataFn);
  }

  async existsByLabel(label: string, opts?: {fetchPolicy?: FetchPolicy}): Promise<boolean> {
    if (isNilOrBlank(label)) return false;

    const { data } = await this.loadAll(0,1,null, null, <ExtractionTypeFilter>{
      label
    }, opts);
    return ReferentialUtils.isNotEmpty(data && data[0]);
  }

  /**
   * Watch products
   */
  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: ExtractionTypeFilter,
    options?: { fetchPolicy?: WatchQueryFetchPolicy }
  ): Observable<LoadResult<ExtractionType>> {

    return super.watchAll(offset, size, sortBy, sortDirection, filter, options)
      .pipe(map(fixWorkaroundDataFn));
  }

  insertIntoCache(cache: ApolloCache<{data: any}>, entity: ExtractionType) {
    if (!entity || isNil(entity.id)) throw new Error('Extraction type (with an id) is required, to insert into the cache.');

    console.info('[extraction-type-service] Inserting into cache:', entity);
    this.insertIntoMutableCachedQueries(cache, {
       queries: this.getLoadQueries(),
       data: entity
     });
  }

  updateCache(cache: ApolloCache<{data: any}>, entity: ExtractionType) {
    if (!entity || isNil(entity.id)) throw new Error('Extraction type (with an id) is required, to update the cache.');

    console.info('[extraction-type-service] Updating cache:', entity);

    // Remove, then insert, from extraction types
    const exists = this.removeFromMutableCachedQueriesByIds(cache, {
      queries: this.getLoadQueries(),
      ids: entity.id
    }) > 0;
    if (exists) {
      this.insertIntoMutableCachedQueries(cache, {
        queries: this.getLoadQueries(),
        data: entity
      });
    }
  }
  /**
   * Watch extraction types from given program labels
   * @protected
   */
  watchAllByProgramLabels(programLabels: string[], filter?: Partial<ExtractionTypeFilter>, opts?: { fetchPolicy?: WatchQueryFetchPolicy }): Observable<ExtractionType[]> {
    return of(programLabels)
      .pipe(
        mergeMap(labels => this.programRefService.loadAllByLabels(labels)),
        switchMap(programs => this.watchAllByPrograms(programs, filter, opts))
      );
  }

  /**
   * Watch extraction types from given programs
   * @protected
   */
  protected watchAllByPrograms(programs?: Program[], typeFilter?: Partial<ExtractionTypeFilter>, opts?: { fetchPolicy?: WatchQueryFetchPolicy }): Observable<ExtractionType[]> {

    // @ts-ignore
    return of(programs)
      .pipe(
        filter(isNonEmptyArray),
        // Get extraction formats of selected programs (apply an intersection)
        map(programs => {
          const formatArrays = programs.map(program => {
            const programFormats = program.getPropertyAsStrings(ProgramProperties.EXTRACTION_FORMATS);
            if (isNotEmptyArray(programFormats)) return programFormats;
            // Not configured in program options: return all formats
            return (ProgramProperties.EXTRACTION_FORMATS.values as Property[])
              .map(item => item.key?.toUpperCase()) // Extract the format (from option's key)
              .filter(format => format !== 'NA'); // Skip the 'NA' format
          });
          if (formatArrays.length === 1) return formatArrays[0]
          return intersectArrays(formatArrays);
        }),

        // DEBUG
        tap(formats => console.debug(`[extraction-type-service] Watching types, filtered by formats [${formats.join(', ')}] ...`)),

        // Load extraction types, from program's formats
        switchMap(formats => this.watchAll(0, 100, null, null, <ExtractionTypeFilter>{
            statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
            isSpatial: false,
            category: 'LIVE',
            ...typeFilter,
            formats
          }, opts)
        ),

        // Translate types, and sort
        map(({data}) => {
          // Compute i18n name
          return data.map(t => ExtractionTypeUtils.computeI18nName(this.translate, t))
            // Then sort by name
            .sort(propertyComparator('name'));
        })
      );
  }
}
