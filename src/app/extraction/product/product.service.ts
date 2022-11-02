import { Injectable } from '@angular/core';
import { FetchPolicy, gql, WatchQueryFetchPolicy } from '@apollo/client/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';


import {
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseGraphqlService, CryptoService,
  EntityUtils, escapeRegExp,
  firstNotNilPromise,
  GraphqlService,
  IEntityService,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotNil,
  LoadResult,
  ReferentialUtils,
  StatusIds
} from '@sumaris-net/ngx-components';
import { ExtractionCategories, ExtractionColumn, ExtractionFilter, ExtractionType, ExtractionTypeUtils } from '../type/extraction-type.model';
import { DataCommonFragments } from '../../trip/services/trip.queries';
import { SAVE_AS_OBJECT_OPTIONS } from '../../data/services/model/data-entity.model';
import { ExtractionProduct } from './product.model';
import { ExtractionFragments } from '../common/extraction.service';
import { environment } from '@environments/environment';
import { ErrorCodes } from '@app/data/services/errors';
import { ExtractionErrorCodes } from '@app/extraction/common/extraction.errors';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';
import { ExtractionTypeService } from '@app/extraction/type/extraction-type.service';
import { TranslateService } from '@ngx-translate/core';


export const ExtractionProductFragments = {

  product: gql`fragment ExtractionProductFragment on ExtractionProductVO {
    id
    label
    name
    format
    version
    sheetNames
    description
    comments
    docUrl
    creationDate
    updateDate
    filterContent
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
  ${DataCommonFragments.lightPerson}`
};

const Queries: BaseEntityGraphqlQueries & { loadColumns: any; } = {
  load: gql`query ExtractionProduct($id: Int!) {
      data: extractionProduct(id: $id) {
        ...ExtractionProductFragment
        documentation
      }
    }
    ${ExtractionProductFragments.product}`,

  loadAll: gql`query ExtractionProducts($filter: ExtractionTypeFilterVOInput) {
      data: extractionProducts(filter: $filter) {
        ...ExtractionProductFragment
      }
    }
    ${ExtractionProductFragments.product}`,

  loadColumns: gql` query ExtractionColumns($type: ExtractionTypeVOInput!, $sheet: String){
      data: extractionColumns(type: $type, sheet: $sheet){
        ...ExtractionColumnFragment
        values
      }
    }
    ${ExtractionFragments.column}`
}

const Mutations: BaseEntityGraphqlMutations & { update: any } = {
  save: gql`mutation SaveExtractionProduct($product: ExtractionProductVOInput!){
    data: saveExtractionProduct(product: $product){
      ...ExtractionProductFragment
      documentation
    }
  }
  ${ExtractionProductFragments.product}`,

  update: gql`mutation UpdateExtractionProduct($id: Int!){
    data: updateExtractionProduct(id: $id){
      ...ExtractionProductFragment
      documentation
    }
  }
  ${ExtractionProductFragments.product}`,

  deleteAll: gql`mutation DeleteProducts($ids:[Int]!){
    deleteProducts(ids: $ids)
  }`

}

@Injectable({providedIn: 'root'})
export class ProductService
  extends BaseGraphqlService
  implements IEntityService<ExtractionProduct, number> {

  constructor(
    protected graphql: GraphqlService,
    protected extractionTypeService: ExtractionTypeService,
    protected accountService: AccountService,
    protected translateService: TranslateService
  ) {
    super(graphql, environment);
  }

  /**
   * Watch products
   */
  watchAll(dataFilter?: Partial<ExtractionTypeFilter>,
           options?: { fetchPolicy?: WatchQueryFetchPolicy }
  ): Observable<LoadResult<ExtractionProduct>> {
    if (this._debug) console.debug("[product-service] Loading products...");

    dataFilter = this.asFilter(dataFilter);

    const variables = {
      filter: dataFilter?.asPodObject()
    };

    return this.mutableWatchQuery<LoadResult<ExtractionProduct>>({
      queryName: 'LoadAll',
      query: Queries.loadAll,
      arrayFieldName: 'data',
      insertFilterFn: dataFilter?.asFilterFn(),
      variables,
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_GEO_TYPES_ERROR, message: "EXTRACTION.ERROR.LOAD_GEO_TYPES_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    })
      .pipe(
        map((data) => {
          const entities = (data?.data || []).map(ExtractionProduct.fromObject);
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
    const { data } = await this.graphql.query<{ data: ExtractionProduct }>({
      query: Queries.load,
      variables: {
        id
      },
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_GEO_TYPES_ERROR, message: "EXTRACTION.ERROR.LOAD_GEO_TYPE_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });

    return data && ExtractionProduct.fromObject(data) || null;
  }

  async computeNextLabel(format: string, types?: ExtractionType[]): Promise<string> {
    let unique = false;
    while (!unique) {
      const hash = CryptoService.sha512(`${format}-${Date.now()}`).substr(0, 8);
      const label = `${format}-${hash}`;
      if (types) {
        unique = !types.some(t => label.toUpperCase() == t.label.toUpperCase());
      }
      else {
        unique = !(await this.extractionTypeService.existsByLabel(label, {fetchPolicy: "no-cache"}));
      }
      if (unique) return label;
    }
  }


  async computeNextName(name: string, types?: ExtractionType[]) {
    if (isNilOrBlank(name)) return name; // Skip if blank

    // Fetch all types
    types = types || (await firstNotNilPromise(this.watchAll({
      searchAttribute: 'name', searchText: name
    })))?.data;

    if (isEmptyArray(types)) return name; // Skip if no other types

    name = name.trim();
    const nameRegExp = new RegExp(`^${escapeRegExp(name)}(?:\\s*\\((\\d+)\\)\\s*)$`);
    const maxIncrement = (types || [])
      .filter(type => type.name && type.name.startsWith(name))
      .map(type => {
          const matches = nameRegExp.exec(type.name);
          return matches && +matches[1] || 0;
        })
      .reduce((max, n) => Math.max(max, n), 0) || 0;
    return `${name} (${maxIncrement + 1})`;
  }

  listenChanges(id: number, opts?: any): Observable<ExtractionProduct | undefined> {
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

    const variables = {
      type: ExtractionTypeUtils.minify(type),
      sheet: sheetName
    };

    const now = Date.now();
    if (this._debug) console.debug("[product-service] Loading columns... using options:", variables);
    const res = await this.graphql.query<{ data: ExtractionColumn[] }>({
      query: Queries.loadColumns,
      variables,
      error: {code: ExtractionErrorCodes.LOAD_EXTRACTION_ROWS_ERROR, message: "EXTRACTION.ERROR.LOAD_ROWS_ERROR"},
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });
    if (!res || !res.data) return null;

    const data = res.data.map(ExtractionColumn.fromObject);
    // Compute column index
    (data || []).forEach((c, index) => c.index = index);

    if (this._debug) console.debug(`[product-service] Columns ${type.category} ${type.label} loaded in ${Date.now() - now}ms`, data);
    return data;
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

    // Make sure to have entities
    entity = ExtractionProduct.fromObject(entity);
    filter = ExtractionFilter.fromObject(filter);

    this.fillDefaultProperties(entity);

    const isNew = isNil(entity.id);

    entity.filter = filter || entity.filter;

    // Transform to json
    const json = entity.asObject(SAVE_AS_OBJECT_OPTIONS);
    if (this._debug) console.debug("[product-service] Using minify object, to send:", json);

    await this.graphql.mutate<{ data: any }>({
      mutation: Mutations.save,
      variables: {
        product: json
      },
      error: {code: ErrorCodes.SAVE_ENTITY_ERROR, message: "ERROR.SAVE_ENTITY_ERROR"},
      update: (cache, {data}) => {
        const savedEntity = data && data.data;
        EntityUtils.copyIdAndUpdateDate(savedEntity, entity);
        console.debug(`[product-service] Product saved in ${Date.now() - now}ms`, savedEntity);

        // Convert into the extraction type
        const savedType = ExtractionType.fromObject(savedEntity).asObject();
        savedType.__typename = ExtractionType.TYPENAME; // Restore typename

        // Insert into cached queries
        if (isNew) {
          this.insertIntoMutableCachedQueries(cache, {
            query: Queries.loadAll,
            data: savedEntity
          });

          // Insert as an extraction types
          this.extractionTypeService.insertIntoCache(cache, savedType);
        }

        // Update from cached queries
        else {
          this.extractionTypeService.updateCache(cache, savedType);
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
      mutation: Mutations.deleteAll,
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
   * @param id the identifier of the extraction product to update
   */
  async updateProduct(id: number): Promise<ExtractionProduct> {
    const now = Date.now();
    if (this._debug) console.debug(`[product-service] Updating extraction product #{id}...`);

    let savedEntity: ExtractionProduct;
    await this.graphql.mutate<{ data: ExtractionProduct }>({
      mutation: Mutations.update,
      variables: { id },
      error: {code: ExtractionErrorCodes.UPDATE_PRODUCT_ERROR, message: "EXTRACTION.ERROR.UPDATE_PRODUCT_ERROR"},
      update: (cache, {data}) => {
        savedEntity = data && data.data;
        console.debug(`[product-service] Product updated in ${Date.now() - now}ms`, savedEntity);

        // Convert into the extraction type
        const savedType = ExtractionType.fromObject(savedEntity).asObject();
        savedType.__typename = ExtractionType.TYPENAME;

        // Update from cached queries
        this.extractionTypeService.updateCache(cache, savedType);
      }
    });

    return ExtractionProduct.fromObject(savedEntity);
  }

  /* -- protected methods  -- */

  protected fillDefaultProperties(entity: ExtractionProduct) {

    // If new product
    if (isNil(entity.id)) {

      // Compute label
      entity.label = entity.label || `${entity.format}-${Date.now()}`;

      // Recorder department
      entity.recorderDepartment = ReferentialUtils.isNotEmpty(entity.recorderDepartment) ? entity.recorderDepartment : this.accountService.department;

      // Recorder person
      entity.recorderPerson = entity.recorderPerson || this.accountService.person;
    }

    entity.name = entity.name || this.translateService.instant('EXTRACTION.PRODUCT.NEW.DEFAULT_NAME', entity);
    entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.TEMPORARY;

    // Description
    if (!entity.description) {
      entity.description = this.translateService.instant('EXTRACTION.PRODUCT.NEW.DEFAULT_DESCRIPTION', this.accountService.person);
    }
  }

  protected copyIdAndUpdateDate(source: ExtractionProduct, target: ExtractionProduct) {
    EntityUtils.copyIdAndUpdateDate(source, target);
  }

  protected asFilter(filter: Partial<ExtractionTypeFilter>): ExtractionTypeFilter {
    return ExtractionTypeFilter.fromObject(filter);
  }

  protected asObject(type: ExtractionType): any {
    return ExtractionTypeUtils.minify(type);
  }
}
