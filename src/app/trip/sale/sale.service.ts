import { Injectable, Injector } from '@angular/core';
import { FetchPolicy, gql, WatchQueryFetchPolicy } from '@apollo/client/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AccountService,
  AppErrorWithDetails,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityGraphqlSubscriptions,
  BaseGraphqlService,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  EntitySaveOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  FormErrors,
  FormErrorTranslator,
  GraphqlService,
  IEntitiesService,
  IEntityService,
  isNil,
  isNotNil,
  LoadResult,
  LocalSettingsService,
  MINIFY_ENTITY_FOR_POD,
  NetworkService,
  ProgressBarService,
  toNumber,
} from '@sumaris-net/ngx-components';
import {
  MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE,
  SAVE_AS_OBJECT_OPTIONS,
  SERIALIZE_FOR_OPTIMISTIC_RESPONSE,
} from '@app/data/services/model/data-entity.model';
import { VesselSnapshotFragments } from '@app/referential/services/vessel-snapshot.service';
import { Sample } from '../sample/sample.model';
import { SortDirection } from '@angular/material/sort';
import { environment } from '@environments/environment';
import { SaleFilter } from '@app/trip/sale/sale.filter';
import { DocumentNode } from 'graphql';
import { DataErrorCodes } from '@app/data/services/errors';
import { DataCommonFragments, DataFragments } from '@app/trip/common/data.fragments';
import { SaleValidatorOptions } from '@app/trip/sale/sale.validator';
import { Sale } from '@app/trip/sale/sale.model';
import { RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';
import { RootDataSynchroService } from '@app/data/services/root-data-synchro-service.class';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { ProgramFragments } from '@app/referential/services/program.fragments';
import { LandingFragments } from '../landing/landing.service';

export declare interface SaleSaveOptions extends EntitySaveOptions {
  observedLocationId?: number;
  enableOptimisticResponse?: boolean;
}

export declare interface SaleServiceWatchOptions extends EntitiesServiceWatchOptions {
  computeRankOrder?: boolean;
  fullLoad?: boolean;
  toEntity?: boolean;
  withTotal?: boolean;
}

export type SaleServiceLoadOptions = EntityServiceLoadOptions;
export const SaleFragments = {
  lightSale: gql`
    fragment LightSaleFragment on SaleVO {
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
  sale: gql`
    fragment SaleFragment on SaleVO {
      id
      startDateTime
      endDateTime
      observedLocationId
      tripId
      comments
      updateDate
      program {
        id
        label
      }
      saleType {
        id
        comments
        creationDate
        description
        label
        name
        updateDate
        entityName
      }
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
      fishingAreas {
        ...FishingAreaFragment
      }
    }
    ${DataCommonFragments.lightPerson}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.measurement}
    ${DataCommonFragments.location}
    ${DataFragments.sample}
    ${VesselSnapshotFragments.lightVesselSnapshot}
    ${DataCommonFragments.referential}
    ${DataFragments.fishingArea},
  `,
};

const Queries: BaseEntityGraphqlQueries = {
  load: gql`
    query Sale($id: Int!) {
      data: sale(id: $id) {
        ...SaleFragment
      }
    }
    ${SaleFragments.sale}
  `,

  loadAll: gql`
    query Sales($filter: SaleFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: sales(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...LightSaleFragment
      }
    }
    ${SaleFragments.lightSale}
  `,
};

const Mutations: BaseEntityGraphqlMutations = {
  save: gql`
    mutation SaveSales($data: [SaleVOInput!]!) {
      data: saveSales(sales: $data) {
        ...SaleFragment
      }
    }
    ${SaleFragments.sale}
  `,

  deleteAll: gql`
    mutation DeleteSales($ids: [Int]) {
      deleteSales(ids: $ids)
    }
  `,
};

const Subscriptions: BaseEntityGraphqlSubscriptions = {
  listenChanges: gql`
    subscription UpdateSale($id: Int!, $interval: Int) {
      data: updateSale(id: $id, interval: $interval) {
        ...SaleFragment
      }
    }
    ${SaleFragments.sale}
  `,
};

const sortByEndDateOrStartDateFn = (n1: Sale, n2: Sale) => {
  const d1 = n1.endDateTime || n1.startDateTime;
  const d2 = n2.endDateTime || n2.startDateTime;
  return d1.isSame(d2) ? 0 : d1.isAfter(d2) ? 1 : -1;
};

@Injectable({ providedIn: 'root' })
export class SaleService
  extends RootDataSynchroService<Sale, SaleFilter, number, SaleServiceWatchOptions, SaleServiceLoadOptions>
  implements IEntitiesService<Sale, SaleFilter, SaleServiceWatchOptions>, IEntityService<Sale>
{
  synchronize(data: Sale, opts?: any): Promise<Sale> {
    throw new Error('Method not implemented.');
  }
  control(entity: Sale, opts?: any): Promise<AppErrorWithDetails | FormErrors> {
    throw new Error('Method not implemented.');
  }
  protected loading = false;
  constructor(
    injector: Injector,
    protected network: NetworkService,
    protected entities: EntitiesStorage,
    protected programRefService: ProgramRefService,
    protected strategyRefService: StrategyRefService,
    protected progressBarService: ProgressBarService,
    protected formErrorTranslator: FormErrorTranslator,
    protected settings: LocalSettingsService
  ) {
    super(injector, Sale, SaleFilter, {
      queries: Queries,
      mutations: Mutations,
      subscriptions: Subscriptions,
    });

    // -- For DEV only
    //this._debug = !environment.production;
  }

  /**
   * Load many sales
   *
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   * @param options
   */
  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: SaleFilter,
    options?: {
      fetchPolicy?: WatchQueryFetchPolicy;
    }
  ): Observable<LoadResult<Sale>> {
    dataFilter = this.asFilter(dataFilter);

    const variables: any = {
      offset: offset || 0,
      size: size >= 0 ? size : 1000,
      sortBy: (sortBy !== 'id' && sortBy) || 'startDateTime',
      sortDirection: sortDirection || 'asc',
      filter: dataFilter.asPodObject(),
    };

    if (this._debug) console.debug('[sale-service] Loading sales... using options:', variables);

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
      error: { code: DataErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
      fetchPolicy: (options && options.fetchPolicy) || 'cache-and-network',
    }).pipe(
      map((res) => {
        const entities = ((res && res.data) || []).map(Sale.fromObject);
        if (this._debug) console.debug(`[sale-service] Loaded ${entities.length} sales`);

        // Compute rankOrderOnPeriod, when loading by parent entity
        if (offset === 0 && size === -1 && isNotNil(dataFilter.observedLocationId)) {
          if (offset === 0 && size === -1) {
            // apply a sorted copy (do NOT change original order), then compute rankOrder
            entities
              .slice()
              .sort(sortByEndDateOrStartDateFn)
              .forEach((o, i) => (o.rankOrder = i + 1));

            // sort by rankOrder (aka id)
            if (!sortBy || sortBy === 'id') {
              const after = !sortDirection || sortDirection === 'asc' ? 1 : -1;
              entities.sort((a, b) => {
                const valueA = a.rankOrder;
                const valueB = b.rankOrder;
                return valueA === valueB ? 0 : valueA > valueB ? after : -1 * after;
              });
            }
          }
        }

        const total = res.total || entities.length;

        return { data: entities, total };
      })
    );
  }

  async load(id: number, options?: EntityServiceLoadOptions): Promise<Sale> {
    if (isNil(id)) throw new Error("Missing argument 'id'");

    const now = Date.now();
    if (this._debug) console.debug(`[Sale-service] Loading Sale {${id}}...`);
    this.loading = true;

    try {
      let data: any;

      // If local entity
      if (id < 0) {
        data = await this.entities.load<Sale>(id, Sale.TYPENAME);
      } else {
        // Load remotely
        const res = await this.graphql.query<{ data: any }>({
          query: this.queries.load,
          variables: { id },
          error: { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' },
          fetchPolicy: (options && options.fetchPolicy) || undefined,
        });
        data = res && res.data;
      }

      // Transform to entity
      const entity = data && Sale.fromObject(data);
      if (entity && this._debug) console.debug(`[Sale-service] Sale #${id} loaded in ${Date.now() - now}ms`, entity);

      return entity;
    } finally {
      this.loading = false;
    }
  }

  public listenChanges(
    id: number,
    opts?: {
      interval?: number;
      fetchPolicy: FetchPolicy;
    }
  ): Observable<Sale> {
    if (!id && id !== 0) throw "Missing argument 'id' ";

    if (this._debug) console.debug(`[sale-service] [WS] Listening changes for trip {${id}}...`);

    return this.graphql
      .subscribe<{ data: Sale }, { id: number; interval: number }>({
        query: Subscriptions.listenChanges,
        fetchPolicy: (opts && opts.fetchPolicy) || undefined,
        variables: { id, interval: toNumber(opts && opts.interval, 10) },
        error: {
          code: DataErrorCodes.SUBSCRIBE_ENTITY_ERROR,
          message: 'ERROR.SUBSCRIBE_ENTITY_ERROR',
        },
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
   *
   * @param data
   */
  async saveAll(entities: Sale[], options?: any): Promise<Sale[]> {
    if (!entities) return entities;

    if (!options || !options.tripId) {
      console.error('[sale-service] Missing options.tripId');
      throw { code: DataErrorCodes.SAVE_ENTITIES_ERROR, message: 'ERROR.SAVE_ENTITIES_ERROR [save-many-sales]' };
    }
    const now = Date.now();
    if (this._debug) console.debug('[sale-service] Saving sales...');

    // Compute rankOrder
    entities.sort(sortByEndDateOrStartDateFn).forEach((o, i) => (o.rankOrder = i + 1));
    
  
    // Transform to json
    const json = entities.map((t) => {
      // Fill default properties (as recorder department and person)
      this.fillDefaultProperties(t, options);
      return t.asObject(SAVE_AS_OBJECT_OPTIONS);
    });
    if (this._debug) console.debug('[sale-service] Using minify object, to send:', json);

    await this.graphql.mutate<{ data: Sale[] }>({
      mutation: Mutations.saveAll,
      variables: {
        data: json,
      },
      error: { code: DataErrorCodes.SAVE_ENTITIES_ERROR, message: 'ERROR.SAVE_ENTITIES_ERROR' },
      update: (proxy, { data }) => {
        // Copy id and update date
        ((data && data.data && entities) || []).forEach((entity) => {
          const savedSale = data.data.find((res) => entity.equals(res));
          this.copyIdAndUpdateDate(savedSale, entity);
        });

        if (this._debug) console.debug(`[sale-service] Sales saved and updated in ${Date.now() - now}ms`, entities);
      },
    });

    return entities;
  }

  /**
   * Save a sale
   *
   * @param entity
   * @param opts
   */
  async save(entity: Sale, opts?: SaleSaveOptions): Promise<Sale> {
    const isNew = isNil(entity.id);


    // If parent is a local entity: force to save locally
    // If is a local entity: force a local save
    const offline = entity.observedLocationId < 0 || RootDataEntityUtils.isLocal(entity);
    if (offline) {
      return await this.saveLocally(entity, opts);
    }

    const now = Date.now();
    if (this._debug) console.debug('[sale-service] Saving a sale...', entity);

    // Prepare to save
    this.fillRecorderPersonAndDepartment(entity);

    // Reset quality properties
    this.resetQualityProperties(entity);
    
    // When offline, provide an optimistic response
    const offlineResponse =
    !opts || opts.enableOptimisticResponse !== false
      ? async (context) => {
          // Make sure to fill id, with local ids
          await this.fillOfflineDefaultProperties(entity);

          // For the query to be tracked (see tracked query link) with a unique serialization key
          context.tracked = !entity.synchronizationStatus || entity.synchronizationStatus === 'SYNC';
          if (isNotNil(entity.id)) context.serializationKey = `${Sale.TYPENAME}:${entity.id}`;

          return { data: [this.asObject(entity, SERIALIZE_FOR_OPTIMISTIC_RESPONSE)] };
        }
      : undefined;

    // Transform into json
    const json = this.asObject(entity, MINIFY_ENTITY_FOR_POD);
    //if (this._debug)
    console.debug('[sale-service] Saving sale (minified):', json);
    
    await this.graphql.mutate<{ data: any }>({
      mutation: this.mutations.save,
      variables: {
        data: json,
      },
      offlineResponse,
      error: { code: DataErrorCodes.SAVE_ENTITIES_ERROR, message: 'ERROR.SAVE_ENTITIES_ERROR' },
      update: async (proxy, { data }) => {
        const savedEntity = data && data.data;

        savedEntity.forEach(async element => {

          if (element.id < 0) {
            if (this._debug) console.debug('[sale-service] [offline] Saving sale locally...', element);
            // Save response locally
            await this.entities.save<Sale>(element);
          }
          // Update the entity and update GraphQL cache
          else {
            // Remove existing entity from the local storage
            if (entity.id < 0 && (element.id > 0 || element.updateDate)) {
              if (this._debug) console.debug(`[sale-service] Deleting sale {${entity.id}} from local storage`);
              await this.entities.delete(entity);
            }
        }
        
        this.copyIdAndUpdateDate(element, entity);
      }
        );

          if (this._debug) console.debug(`[sale-service] Sale saved remotely in ${Date.now() - now}ms`, entity);
        }
      },);

    return entity;
  }

  /**
   * @param entity
   * @param opts
   * @protected
   */
  protected async saveLocally(entity: Sale, opts?: SaleSaveOptions): Promise<Sale> {
    if (EntityUtils.isRemoteId(entity.observedLocationId)) throw new Error('Must be linked to a local observed location');

    // Fill default properties (as recorder department and person)
    this.fillDefaultProperties(entity, opts);

    // Make sure to fill id, with local ids
    await this.fillOfflineDefaultProperties(entity);

    const json = this.asObject(entity, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE);
    if (this._debug) console.debug('[sale-service] [offline] Saving sale locally...', json);

    // Save response locally
    await this.entities.save(json);

    return entity;
  }

  /**
   * Save many sales
   *
   * @param entities
   */
  async deleteAll(entities: Sale[]): Promise<any> {
    const ids = entities && entities.map((t) => t.id).filter((id) => id > 0);

    const now = Date.now();
    if (this._debug) console.debug('[sale-service] Deleting sales... ids:', ids);

    await this.graphql.mutate<any>({
      mutation: Mutations.deleteAll,
      variables: {
        ids,
      },
      update: (proxy) => {
        // Remove from cache
        this.removeFromMutableCachedQueriesByIds(proxy, {
          queries: this.getLoadQueries(),
          ids,
        });

        if (this._debug) console.debug(`[sale-service] Sale deleted in ${Date.now() - now}ms`);
      },
    });
  }

  async delete(data: Sale): Promise<any> {
    await this.deleteAll([data]);
  }

  canUserWrite(data: Sale, opts?: SaleValidatorOptions): boolean {
    return true; 
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
   *
   * @param sources
   * @param targets
   */
  copyIdAndUpdateDateOnSamples(sources: (Sample | any)[], targets: Sample[]) {
    // Update samples
    if (sources && targets) {
      targets.forEach((target) => {
        const source = sources.find((json) => target.equals(json));
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
