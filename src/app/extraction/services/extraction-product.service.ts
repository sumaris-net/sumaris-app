import {Injectable} from "@angular/core";
import {FetchPolicy, gql, WatchQueryFetchPolicy} from "@apollo/client/core";
import { Observable, of } from 'rxjs';
import {map} from "rxjs/operators";


import { AccountService, IEntityService } from '@sumaris-net/ngx-components';
import {ExtractionCategories, ExtractionColumn, ExtractionFilter, ExtractionType} from "./model/extraction-type.model";
import {GraphqlService}  from "@sumaris-net/ngx-components";
import {FeatureCollection} from "geojson";
import {DataCommonFragments} from "../../trip/services/trip.queries";
import {SAVE_AS_OBJECT_OPTIONS} from "../../data/services/model/data-entity.model";
import {ReferentialUtils}  from "@sumaris-net/ngx-components";
import {SortDirection} from "@angular/material/sort";
import {firstNotNilPromise} from "@sumaris-net/ngx-components";
import {ExtractionProduct, IAggregationStrata} from "./model/extraction-product.model";
import {ExtractionFragments, ExtractionService} from "./extraction.service";
import {BaseGraphqlService}  from "@sumaris-net/ngx-components";
import {isNil, isNotNil} from "@sumaris-net/ngx-components";
import {StatusIds}  from "@sumaris-net/ngx-components";
import {EntityUtils}  from "@sumaris-net/ngx-components";
import {environment} from "../../../environments/environment";
import {ExtractionProductFilter} from "./filter/extraction-product.filter";
import {LoadResult} from "@sumaris-net/ngx-components";
import { ErrorCodes } from '@app/data/services/errors';
import { ExtractionErrorCodes } from '@app/extraction/services/extraction.errors';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';


export const AggregationFragments = {
  aggregationType: gql`fragment AggregationTypeFragment on AggregationTypeVO {
    id
    category
    label
    name
    version
    sheetNames
    description
    docUrl
    creationDate
    updateDate
    comments
    filter
    isSpatial
    statusId
    processingFrequencyId
    stratum {
      id
      updateDate
      isDefault
      sheetName
      spatialColumnName
      timeColumnName
      aggColumnName
      aggFunction
      techColumnName
    }
    recorderPerson {
      ...LightPersonFragment
    }
    recorderDepartment {
      ...LightDepartmentFragment
    }
  }
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  `
};

const LoadTypeQuery = gql`
  query AggregationType($id: Int!) {
    aggregationType(id: $id) {
      ...AggregationTypeFragment
      documentation
    }
  }
  ${AggregationFragments.aggregationType}
`;

const LoadTypesQuery = gql`
  query AggregationTypes($filter: AggregationTypeFilterVOInput) {
    data: aggregationTypes(filter: $filter) {
      ...AggregationTypeFragment
    }
  }
  ${AggregationFragments.aggregationType}
`;

const LoadAggColumnsQuery: any = gql`
  query AggregationColumns($type: AggregationTypeVOInput, $sheet: String){
    aggregationColumns(type: $type, sheet: $sheet){
      ...ExtractionColumnFragment
      values
    }
  }
  ${ExtractionFragments.column}
`;

const LoadAggGeoJsonQuery = gql`
  query AggregationGeoJson(
    $type: AggregationTypeVOInput,
    $filter: ExtractionFilterVOInput,
    $strata: AggregationStrataVOInput,
    $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
    aggregationGeoJson(
      type: $type, filter: $filter, strata: $strata,
      offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection
    )
  }`;

const LoadAggByTechQuery = gql`
  query AggregationTech(
    $type: AggregationTypeVOInput,
    $filter: ExtractionFilterVOInput,
    $strata: AggregationStrataVOInput,
    $sortBy: String, $sortDirection: String) {
    aggregationTech(type: $type, filter: $filter, strata: $strata, sortBy: $sortBy, sortDirection: $sortDirection) {
      data
    }
  }`;


const LoadAggMinMaxByTechQuery = gql`
  query AggregationTechMinMax(
    $type: AggregationTypeVOInput,
    $filter: ExtractionFilterVOInput,
    $strata: AggregationStrataVOInput) {
    aggregationTechMinMax(type: $type, filter: $filter, strata: $strata) {
      min
      max
    }
  }`;

const SaveAggregation: any = gql`
  mutation SaveAggregation($type: AggregationTypeVOInput, $filter: ExtractionFilterVOInput){
    data: saveAggregation(type: $type, filter: $filter){
      ...AggregationTypeFragment
      documentation
    }
  }
  ${AggregationFragments.aggregationType}
`;


const UpdateProduct: any = gql`
  mutation UpdateProduct($id: Int!){
    data: updateProduct(id: $id){
      ...AggregationTypeFragment
      documentation
    }
  }
  ${AggregationFragments.aggregationType}
`;

const DeleteAggregations: any = gql`
  mutation DeleteAggregations($ids:[Int]){
    deleteAggregations(ids: $ids)
  }
`;

@Injectable({providedIn: 'root'})
// TODO: use BaseEntityService
export class ExtractionProductService
  extends BaseGraphqlService
  implements IEntityService<ExtractionProduct, number> {

  constructor(
    protected graphql: GraphqlService,
    protected extractionService: ExtractionService,
    protected accountService: AccountService
  ) {
    super(graphql, environment);
  }

  /**
   * Watch products
   */
  watchAll(dataFilter?: Partial<ExtractionProductFilter>,
           options?: { fetchPolicy?: WatchQueryFetchPolicy }
  ): Observable<LoadResult<ExtractionProduct>> {
    if (this._debug) console.debug("[product-service] Loading products...");

    dataFilter = this.asFilter(dataFilter);

    const variables = {
      filter: dataFilter && dataFilter.asPodObject()
    };

    return this.mutableWatchQuery<LoadResult<ExtractionProduct>>({
      queryName: 'LoadAggregationTypes',
      query: LoadTypesQuery,
      arrayFieldName: 'data',
      insertFilterFn: dataFilter && dataFilter.asFilterFn(),
      variables,
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_GEO_TYPES_ERROR, message: "EXTRACTION.ERROR.LOAD_GEO_TYPES_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    })
      .pipe(
        map((data) => {
          const entities = (data && data.data || []).map(ExtractionProduct.fromObject);
          return {
            data: entities,
            total: data.total || entities.length
          }
        })
      );
  }

  async load(id: number, options?: {
    fetchPolicy?: FetchPolicy
  }): Promise<ExtractionProduct> {
    const data = await this.graphql.query<{ aggregationType: ExtractionProduct }>({
      query: LoadTypeQuery,
      variables: {
        id
      },
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_GEO_TYPES_ERROR, message: "EXTRACTION.ERROR.LOAD_GEO_TYPE_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });

    return (data && data.aggregationType && ExtractionProduct.fromObject(data.aggregationType)) || null;
  }

  listenChanges(id: number, opts?: any): Observable<ExtractionProduct | undefined> {
    // TODO use BaseEntityService
    console.warn('listenChanges() not implemented yet');
    return of();
  }

  /**
   * Load columns metadata
   * @param type
   * @param sheetName
   * @param options
   */
  async loadColumns(
    type: ExtractionType,
    sheetName?: string,
    options?: {
      fetchPolicy?: FetchPolicy
    }): Promise<ExtractionColumn[]> {

    const variables: any = {
      type: {
        category: type.category,
        label: type.label
      },
      sheet: sheetName
    };

    const now = Date.now();
    if (this._debug) console.debug("[product-service] Loading columns... using options:", variables);
    const res = await this.graphql.query<{ aggregationColumns: ExtractionColumn[] }>({
      query: LoadAggColumnsQuery,
      variables: variables,
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_ROWS_ERROR, message: "EXTRACTION.ERROR.LOAD_ROWS_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });
    if (!res || !res.aggregationColumns) return null;

    const data = res.aggregationColumns.map(ExtractionColumn.fromObject);
    // Compute column index
    (data || []).forEach((c, index) => c.index = index);

    if (this._debug) console.debug(`[product-service] Columns ${type.category} ${type.label} loaded in ${Date.now() - now}ms`, data);
    return data;
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
      type: {
        category: type.category,
        label: type.label
      },
      strata: strata,
      filter: filter,
      offset: offset || 0,
      size: size >= 0 ? size : 1000
    };

    const res = await this.graphql.query<{ aggregationGeoJson: any }>({
      query: LoadAggGeoJsonQuery,
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
      type: {
        category: type.category,
        label: type.label
      },
      strata: strata,
      filter: filter
    };

    const res = await this.graphql.query<{ aggregationTech: {data: Map<string, any>} }>({
      query: LoadAggByTechQuery,
      variables: variables,
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_TECH_ERROR, message: "EXTRACTION.ERROR.LOAD_TECH_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });

    return (res && res.aggregationTech && res.aggregationTech.data) || null;
  }

  async loadAggMinMaxByTech(type: ExtractionType, strata: IAggregationStrata, filter: ExtractionFilter,
                            options?: { fetchPolicy?: FetchPolicy; }): Promise<{min: number; max: number; }> {
    const variables: any = {
      type: {
        category: type.category,
        label: type.label
      },
      strata: strata,
      filter: filter
    };

    const res = await this.graphql.query<{ aggregationTechMinMax: {min: number; max: number; } }>({
      query: LoadAggMinMaxByTechQuery,
      variables: variables,
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_MIN_MAX_TECH_ERROR, message: "EXTRACTION.ERROR.LOAD_MIN_MAX_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });

    return res && { min: 0, max: 0, ...res.aggregationTechMinMax} || null;
  }

  canUserWrite(entity: ExtractionProduct, opts?: any) {
    return this.accountService.isAdmin()
      // New date allow for supervisors
      || (isNil(entity.id) && this.accountService.isSupervisor())
      // Supervisor on existing data, and the same recorder department
      || (ReferentialUtils.isNotEmpty(entity && entity.recorderDepartment) && this.accountService.canUserWriteDataForDepartment(entity.recorderDepartment));
  }

  async save(entity: ExtractionProduct,
             filter?: ExtractionFilter): Promise<ExtractionProduct> {
    const now = Date.now();
    if (this._debug) console.debug("[product-service] Saving product...");

    // Make sure to have an entity
    entity = ExtractionProduct.fromObject(entity);

    this.fillDefaultProperties(entity);

    const isNew = isNil(entity.id);

    // Transform to json
    const json = entity.asObject(SAVE_AS_OBJECT_OPTIONS);
    if (this._debug) console.debug("[product-service] Using minify object, to send:", json);

    await this.graphql.mutate<{ data: any }>({
      mutation: SaveAggregation,
      variables: {
        type: json,
        filter
      },
      error: {code: ErrorCodes.SAVE_ENTITY_ERROR, message: "ERROR.SAVE_ENTITY_ERROR"},
      update: (cache, {data}) => {
        const savedEntity = data && data.data;
        EntityUtils.copyIdAndUpdateDate(savedEntity, entity);
        console.debug(`[product-service] Product saved in ${Date.now() - now}ms`, savedEntity);

        // Convert into the extraction type
        const savedExtractionType = ExtractionType.fromObject(savedEntity).asObject({keepTypename: false});
        savedExtractionType.category = 'PRODUCT';
        savedExtractionType.__typename = ExtractionType.TYPENAME;

        // Insert into cached queries
        if (isNew) {
          // Aggregation types
          this.insertIntoMutableCachedQueries(cache, {
            query: LoadTypesQuery,
            data: savedEntity
          });

          // Insert as an extraction types
          this.extractionService.insertIntoCache(cache, savedExtractionType);
        }

        // Update from cached queries
        else {
          this.extractionService.updateCache(cache, savedExtractionType);
        }

      }
    });

    return entity;
  }

  async delete(type: ExtractionProduct): Promise<any> {
    if (!type || isNil(type.id)) throw Error('Missing type or type.id');

    const now = Date.now();
    if (this._debug) console.debug(`[product-service] Deleting product {id: ${type.id}'}`);

    await this.graphql.mutate<any>({
      mutation: DeleteAggregations,
      variables: {
        ids: [type.id]
      },
      update: (cache) => {

        // Remove from cache
        const cacheKey = {__typename: ExtractionProduct.TYPENAME, id: type.id, label: type.label, category: ExtractionCategories.PRODUCT};
        cache.evict({ id: cache.identify(cacheKey)});
        cache.evict({ id: cache.identify({
            ...cacheKey,
            __typename: ExtractionType.TYPENAME
          })});

       if (this._debug) console.debug(`[product-service] Product deleted in ${Date.now() - now}ms`);
      }
    });
  }

  async deleteAll(entities: ExtractionProduct[]): Promise<any> {
    await Promise.all((entities || [])
      .filter(t => t && isNotNil(t.id)).map(type => this.delete(type)));
  }

  /**
   * Update data product (re-execute the extraction or the aggregation)
   * @param entity
   * @param filter
   */
  async updateProduct(id: number): Promise<ExtractionProduct> {
    const now = Date.now();
    if (this._debug) console.debug(`[product-service] Updating extraction product #{id}...`);

    let savedEntity: ExtractionProduct;
    await this.graphql.mutate<{ data: any }>({
      mutation: UpdateProduct,
      variables: { id },
      error: {code: ExtractionErrorCodes.UPDATE_PRODUCT_ERROR, message: "EXTRACTION.ERROR.UPDATE_PRODUCT_ERROR"},
      update: (cache, {data}) => {
        savedEntity = data && data.data;
        console.debug(`[product-service] Product updated in ${Date.now() - now}ms`, savedEntity);

        // Convert into the extraction type
        const savedExtractionType = ExtractionType.fromObject(savedEntity).asObject({keepTypename: false});
        savedExtractionType.category = 'PRODUCT';
        savedExtractionType.__typename = ExtractionType.TYPENAME;

        // Update from cached queries
        this.extractionService.updateCache(cache, savedExtractionType);
      }
    });

    return ExtractionProduct.fromObject(savedEntity);
  }

  /* -- protected methods  -- */

  protected fillDefaultProperties(entity: ExtractionProduct) {

    // If new trip
    if (isNil(entity.id)) {

      // Compute label
      entity.label = `${entity.format}-${Date.now()}`;

      // Recorder department
      entity.recorderDepartment = ReferentialUtils.isNotEmpty(entity.recorderDepartment) ? entity.recorderDepartment : this.accountService.department;

      // Recorder person
      entity.recorderPerson = entity.recorderPerson || this.accountService.person;
    }

    entity.name = entity.name || `Aggregation on ${entity.label}`;
    entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.TEMPORARY;

    // Description
    if (!entity.description) {
      const person = this.accountService.person;
      entity.description = `Created by ${person.firstName} ${person.lastName}`;
    }
  }

  protected copyIdAndUpdateDate(source: ExtractionProduct, target: ExtractionProduct) {
    EntityUtils.copyIdAndUpdateDate(source, target);
  }

  protected asFilter(filter: Partial<ExtractionProductFilter>): ExtractionProductFilter {
    return ExtractionProductFilter.fromObject(filter);
  }

}
