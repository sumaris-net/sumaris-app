import { Injectable } from '@angular/core';
import { FetchPolicy, gql, WatchQueryFetchPolicy } from '@apollo/client/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataCommonFragments, DataFragments } from './trip.queries';
import {
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries, BaseEntityGraphqlSubscriptions,
  BaseGraphqlService,
  EntityUtils,
  GraphqlService,
  IEntitiesService,
  isNotNil,
  LoadResult, toNumber
} from '@sumaris-net/ngx-components';
import { SAVE_AS_OBJECT_OPTIONS } from '@app/data/services/model/data-entity.model';
import { VesselSnapshotFragments } from '@app/referential/services/vessel-snapshot.service';
import { Sale } from './model/sale.model';
import { Sample } from './model/sample.model';
import { SortDirection } from '@angular/material/sort';
import { environment } from '@environments/environment';
import { SaleFilter } from '@app/trip/services/filter/sale.filter';
import { DocumentNode } from 'graphql';
import { ErrorCodes } from '@app/data/services/errors';

export const SaleFragments = {
  lightSale: gql`fragment LightSaleFragment_PENDING on SaleVO {
    id
    startDateTime
    endDateTime
    tripId
    comments
    updateDate
    saleLocation {
      ...LocationFragment
    }
    vesselSnapshot {
      ...LightVesselSnapshotFragment
    }
    recorderDepartment {
      ...LightDepartmentFragment
    }
  }
  ${DataCommonFragments.location}
  ${DataCommonFragments.lightDepartment}
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${DataCommonFragments.referential}
  `,
  sale: gql`fragment SaleFragment_PENDING on SaleVO {
    id
    startDateTime
    endDateTime
    tripId
    comments
    updateDate
    saleLocation {
      ...LocationFragment
    }
    measurements {
      ...MeasurementFragment
    }
    samples {
      ...SampleFragment
    }
    vesselSnapshot {
      ...LightVesselSnapshotFragment
    }
    recorderPerson {
        ...LightPersonFragment
    }
    recorderDepartment {
        ...LightDepartmentFragment
    }
    observers {
      ...LightPersonFragment
    }
  }
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.measurement}
  ${DataCommonFragments.location}
  ${DataFragments.sample}
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${DataCommonFragments.referential}
  `
};

const Queries: BaseEntityGraphqlQueries = {
  load: gql`query Sale($id: Int) {
      data: sale(id: $id) {
        ...SaleFragment
      }
    }
    ${SaleFragments.sale}`,

  loadAll: gql`query Sales($filter: SaleFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: sales(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightSaleFragment
    }
  }
  ${SaleFragments.lightSale}`
};

const Mutations: BaseEntityGraphqlMutations = {
  save: gql`mutation SaveSales($data:[SaleVOInput]){
    data: saveSales(data: $data){
      ...SaleFragment
    }
  }
  ${SaleFragments.sale}`,

  deleteAll: gql`mutation DeleteSales($ids:[Int]){
    deleteSales(ids: $ids)
  }`
};

const Subscriptions: BaseEntityGraphqlSubscriptions = {
  listenChanges: gql`subscription UpdateSale($id: Int, $interval: Int){
    data: updateSale(id: $id, interval: $interval) {
      ...SaleFragment
    }
  }
  ${SaleFragments.sale}`
};

const sortByEndDateOrStartDateFn = (n1: Sale, n2: Sale) => {
  const d1 = n1.endDateTime || n1.startDateTime;
  const d2 = n2.endDateTime || n2.startDateTime;
  return d1.isSame(d2) ? 0 : (d1.isAfter(d2) ? 1 : -1);
};

@Injectable({providedIn: 'root'})
export class SaleService extends BaseGraphqlService<Sale, SaleFilter> implements IEntitiesService<Sale, SaleFilter>{

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService
  ) {
    super(graphql, environment);

    // -- For DEV only
    //this._debug = !environment.production;
  }

  /**
   * Load many sales
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   * @param options
   */
  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           dataFilter?: SaleFilter,
           options?: {
             fetchPolicy?: WatchQueryFetchPolicy
           }): Observable<LoadResult<Sale>> {

    dataFilter = this.asFilter(dataFilter);

    const variables: any = {
      offset: offset || 0,
      size: size >= 0 ? size : 1000,
      sortBy: (sortBy !== 'id' && sortBy) || 'startDateTime',
      sortDirection: sortDirection || 'asc',
      filter: dataFilter.asPodObject()
    };

    if (this._debug) console.debug("[sale-service] Loading sales... using options:", variables);


    // TODO: manage options.withTotal, and query selection
    const withTotal = false;
    const query = Queries.loadAll;

    return this.mutableWatchQuery<LoadResult<Sale>>({
      queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
      arrayFieldName: 'data',
      totalFieldName: withTotal ? 'total' : undefined,
      insertFilterFn: dataFilter?.asFilterFn(),
      query,
      variables,
      error: { code: ErrorCodes.LOAD_ENTITIES_ERROR, message: "ERROR.LOAD_ENTITIES_ERROR" },
      fetchPolicy: options && options.fetchPolicy || 'cache-and-network'
    })
      .pipe(
        map((res) => {
          const entities = (res && res.data || []).map(Sale.fromObject);
          if (this._debug) console.debug(`[sale-service] Loaded ${entities.length} sales`);

          // Compute rankOrderOnPeriod, when loading by parent entity
          if (offset === 0 && (size === -1) && isNotNil(dataFilter.observedLocationId)) {
            if (offset === 0 && (size === -1)) {
              // apply a sorted copy (do NOT change original order), then compute rankOrder
              entities.slice()
                .sort(sortByEndDateOrStartDateFn)
                .forEach((o, i) => o.rankOrder = i+1);

              // sort by rankOrder (aka id)
              if (!sortBy || sortBy == 'id') {
                const after = (!sortDirection || sortDirection === 'asc') ? 1 : -1;
                entities.sort((a, b) => {
                  const valueA = a.rankOrder;
                  const valueB = b.rankOrder;
                  return valueA === valueB ? 0 : (valueA > valueB ? after : (-1 * after));
                });
              }
            }
          }

          const total = res.total || entities.length;

          return { data: entities, total};
        }));
  }

  load(id: number): Observable<Sale | null> {
    if (this._debug) console.debug("[sale-service] Loading sale {" + id + "}...");

    return this.graphql.watchQuery<{ data: any }>({
      query: Queries.load,
      variables: { id },
      error: { code: ErrorCodes.LOAD_ENTITY_ERROR, message: "ERROR.LOAD_ENTITY_ERROR" }
    })
      .pipe(
        map(res => {
          if (res?.data) {
            const res = Sale.fromObject(res.data);
            if (this._debug) console.debug("[sale-service] Sale {" + id + "} loaded", res);
            return res;
          }
          return null;
        })
      );
  }

  public listenChanges(id: number, opts?: {
    interval?: number;
    fetchPolicy: FetchPolicy;
  }): Observable<Sale> {
    if (!id && id !== 0) throw "Missing argument 'id' ";

    if (this._debug) console.debug(`[sale-service] [WS] Listening changes for trip {${id}}...`);

    return this.graphql.subscribe<{ data: Sale }, { id: number, interval: number }>({
      query: Subscriptions.listenChanges,
      fetchPolicy: opts && opts.fetchPolicy || undefined,
      variables: {id, interval: toNumber(opts && opts.interval, 10)},
      error: {
        code: ErrorCodes.SUBSCRIBE_ENTITY_ERROR,
        message: 'ERROR.SUBSCRIBE_ENTITY_ERROR'
      }
    })
      .pipe(
        map(({ data }) => {
          const entity = data && Sale.fromObject(data);
          if (entity && this._debug) console.debug(`[sale-service] Sale {${id}} updated on server!`, entity);
          return entity;
        })
      );
  }

  /**
   * Save many sales
   * @param data
   */
  async saveAll(entities: Sale[], options?: any): Promise<Sale[]> {
    if (!entities) return entities;

    if (!options || !options.tripId) {
      console.error("[sale-service] Missing options.tripId");
      throw { code: ErrorCodes.SAVE_ENTITIES_ERROR, message: "ERROR.SAVE_ENTITIES_ERROR" };
    }
    const now = Date.now();
    if (this._debug) console.debug("[sale-service] Saving sales...");

    // Compute rankOrder
    entities.sort(sortByEndDateOrStartDateFn)
      .forEach((o, i) => o.rankOrder = i+1);

    // Transform to json
    const json = entities.map(t => {
      // Fill default properties (as recorder department and person)
      this.fillDefaultProperties(t, options);
      return t.asObject(SAVE_AS_OBJECT_OPTIONS);
    });
    if (this._debug) console.debug("[sale-service] Using minify object, to send:", json);

    await this.graphql.mutate<{ data: Sale[] }>({
      mutation: Mutations.saveAll,
      variables: {
        data: json
      },
      error: { code: ErrorCodes.SAVE_ENTITIES_ERROR, message: "ERROR.SAVE_ENTITIES_ERROR" },
      update: (proxy, {data}) => {
        // Copy id and update date
        (data && data.data && entities || [])
          .forEach(entity => {
            const savedSale = data.data.find(res => entity.equals(res));
            this.copyIdAndUpdateDate(savedSale, entity);
          });

        if (this._debug) console.debug(`[sale-service] Sales saved and updated in ${Date.now() - now}ms`, entities);
      }
    });

    return entities;
  }

  /**
     * Save an sale
     * @param data
     */
  async save(entity: Sale): Promise<Sale> {
    const now = Date.now();
    if (this._debug) console.debug("[sale-service] Saving a sale...");

    // Fill default properties (as recorder department and person)
    this.fillDefaultProperties(entity, {});

    const isNew = !entity.id && entity.id !== 0;

    // Transform into json
    const json = entity.asObject(SAVE_AS_OBJECT_OPTIONS);
    if (this._debug) console.debug("[sale-service] Using minify object, to send:", json);

    await this.graphql.mutate<{ data: Sale[] }>({
      mutation: Mutations.saveAll,
      variables: {
        data: [json]
      },
      error: { code: ErrorCodes.SAVE_ENTITIES_ERROR, message: "ERROR.SAVE_ENTITIES_ERROR" },
      update: (proxy, {data}) => {
        const savedEntity = data && data.data && data.data[0];
        if (savedEntity && savedEntity !== entity) {
          // Copy id and update Date
          this.copyIdAndUpdateDate(savedEntity, entity);
          if (this._debug) console.debug(`[sale-service] Sale saved and updated in ${Date.now() - now}ms`, entity);
        }

        // Update the cache
        if (isNew) {
          this.insertIntoMutableCachedQueries(proxy, {
            queries: this.getLoadQueries(),
            data: savedEntity
          });
        }
      }
    });

    return entity;
  }

  /**
   * Save many sales
   * @param entities
   */
  async deleteAll(entities: Sale[]): Promise<any> {

    let ids = entities && entities
      .map(t => t.id)
      .filter(id => (id > 0));

    const now = Date.now();
    if (this._debug) console.debug("[sale-service] Deleting sales... ids:", ids);

    await this.graphql.mutate<any>({
      mutation: Mutations.deleteAll,
      variables: {
        ids
      },
      update: (proxy) => {
        // Remove from cache
        this.removeFromMutableCachedQueriesByIds(proxy,{
          queries: this.getLoadQueries(),
          ids
        });

        if (this._debug) console.debug(`[sale-service] Sale deleted in ${Date.now() - now}ms`);
      }
    });
  }

  asFilter(filter: Partial<SaleFilter>): SaleFilter {
    return SaleFilter.fromObject(filter);
  }

  /* -- protected methods -- */

  protected fillDefaultProperties(entity: Sale, options?: any) {

    // If new trip
    if (!entity.id || entity.id < 0) {

      // Fill Recorder department and person
      this.fillRecorderPersonAndDepartment(entity);

    }

    // Fill parent entity id
    if (!entity.observedLocationId && options) {
      entity.observedLocationId = options.observedLocationId;
    }
  }

  fillRecorderPersonAndDepartment(entity: Sale) {
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

  copyIdAndUpdateDate(source: Sale | undefined | any, target: Sale) {
    if (!source) return;

    // Update (id and updateDate)
    EntityUtils.copyIdAndUpdateDate(source, target);

    // Update samples (recursively)
    if (target.samples && source.samples) {
      this.copyIdAndUpdateDateOnSamples(source.samples, target.samples);
    }
  }

  /**
   * Copy Id and update, in sample tree (recursively)
   * @param sources
   * @param targets
   */
  copyIdAndUpdateDateOnSamples(sources: (Sample | any)[], targets: Sample[]) {
    // Update samples
    if (sources && targets) {
      targets.forEach(target => {
        const source = sources.find(json => target.equals(json));
        EntityUtils.copyIdAndUpdateDate(source, target);

        // Apply to children
        if (target.children && target.children.length) {
          this.copyIdAndUpdateDateOnSamples(sources, target.children);
        }
      });
    }
  }

  /* -- private -- */

  protected getLoadQueries(): DocumentNode[] {
    return [Queries.loadAll];
  }
}
