import { Injectable, Injector } from '@angular/core';
import { AggregatedLanding, AggregatedLandingUtils } from './model/aggregated-landing.model';
import {
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseGraphqlService,
  chainPromises,
  DateUtils,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  EntitySaveOptions,
  EntityUtils,
  firstNotNilPromise,
  GraphqlService,
  IEntitiesService,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  NetworkService,
  toNumber,
} from '@sumaris-net/ngx-components';
import { gql } from '@apollo/client/core';
import { VesselSnapshotFragments } from '@app/referential/services/vessel-snapshot.service';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { EMPTY, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { SortDirection } from '@angular/material/sort';
import { DataEntityAsObjectOptions, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE } from '@app/data/services/model/data-entity.model';
import { environment } from '@environments/environment';
import { AggregatedLandingFilter } from '@app/trip/services/filter/aggregated-landing.filter';
import { ErrorCodes } from '@app/data/services/errors';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { TripService } from '@app/trip/services/trip.service';

const VesselActivityFragment = gql`fragment VesselActivityFragment on VesselActivityVO {
  __typename
  date
  rankOrder
  comments
  measurementValues
  metiers {
    ...ReferentialFragment
  }
  observedLocationId
  landingId
  tripId
}
${ReferentialFragments.referential}`;

const AggregatedLandingFragment = gql`fragment AggregatedLandingFragment on AggregatedLandingVO {
  __typename
  id
  observedLocationId
  vesselSnapshot {
    ...LightVesselSnapshotFragment
  }
  vesselActivities {
    ...VesselActivityFragment
  }
}
${VesselSnapshotFragments.lightVesselSnapshot}
${ReferentialFragments.referential}
${VesselActivityFragment}`;

const Queries: BaseEntityGraphqlQueries = {
  loadAll: gql`query AggregatedLandings($filter: AggregatedLandingFilterVOInput){
      data: aggregatedLandings(filter: $filter){
        ...AggregatedLandingFragment
      }
    }
    ${AggregatedLandingFragment}`
};

const Mutations: BaseEntityGraphqlMutations = {
  saveAll: gql`mutation SaveAggregatedLandings($data:[AggregatedLandingVOInput], $filter: AggregatedLandingFilterVOInput){
    data: saveAggregatedLandings(aggregatedLandings: $data, filter: $filter){
        ...AggregatedLandingFragment
      }
    }
    ${AggregatedLandingFragment}`,

  deleteAll: gql`mutation DeleteAggregatedLandings($filter: AggregatedLandingFilterVOInput, $vesselSnapshotIds: [Int]){
      deleteAggregatedLandings(filter: $filter, vesselSnapshotIds: $vesselSnapshotIds)
    }`
};

export interface AggregatedLandingSaveOptions extends EntitySaveOptions {
  filter?: Partial<AggregatedLandingFilter>;
}

@Injectable({providedIn: 'root'})
export class AggregatedLandingService
  extends BaseGraphqlService<AggregatedLanding, AggregatedLandingFilter>
  implements IEntitiesService<AggregatedLanding, AggregatedLandingFilter> {

  private _lastFilter: AggregatedLandingFilter;

  constructor(
    injector: Injector,
    protected network: NetworkService,
    protected tripService: TripService,
    protected entities: EntitiesStorage
  ) {
    super(injector.get(GraphqlService), environment);

    // FOR DEV ONLY
    this._debug = !environment.production;
  }

  async loadAllByObservedLocation(filter?: (AggregatedLandingFilter | any) & { observedLocationId: number; }, opts?: EntitiesServiceWatchOptions): Promise<LoadResult<AggregatedLanding>> {
    return firstNotNilPromise(this.watchAllByObservedLocation(filter, opts));
  }

  watchAllByObservedLocation(filter?: (AggregatedLandingFilter | any) & { observedLocationId: number; }, opts?: EntitiesServiceWatchOptions): Observable<LoadResult<AggregatedLanding>> {
    return this.watchAll(0, -1, null, null, filter, opts);
  }

  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           dataFilter?: Partial<AggregatedLandingFilter>,
           opts?: EntitiesServiceWatchOptions): Observable<LoadResult<AggregatedLanding>> {

    // Update previous filter
    dataFilter = this.asFilter(dataFilter);

    if (!dataFilter || dataFilter.isEmpty()) {
      console.warn('[aggregated-landing-service] Trying to load landing without \'filter\'. Skipping.');
      this._lastFilter = null;
      return EMPTY;
    }

    // Remember last filter - used in saveAll()
    this._lastFilter = dataFilter.clone();

    // Load offline
    const offline = this.network.offline
      || (dataFilter && (
        (dataFilter.synchronizationStatus && dataFilter.synchronizationStatus !== 'SYNC')
        || EntityUtils.isLocalId(dataFilter.observedLocationId))) || false;
    if (offline) {
      return this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts);
    }

    const variables = {
      filter: dataFilter?.asPodObject()
    };

    let now = this._debug && Date.now();
    if (this._debug) console.debug('[aggregated-landing-service] Loading aggregated landings... using options:', variables);

    return this.mutableWatchQuery<LoadResult<AggregatedLanding>>({
        queryName: 'LoadAll',
        query: Queries.loadAll,
        arrayFieldName: 'data',
        insertFilterFn: dataFilter?.asFilterFn(),
        variables,
        error: {code: ErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR'},
        fetchPolicy: opts && opts.fetchPolicy || 'no-cache'
      })
      .pipe(
        filter(isNotNil),
        map(res => {
          let data = (res && res.data || []).map(AggregatedLanding.fromObject);

          // Sort locally
          data = AggregatedLandingUtils.sort(data, sortBy, sortDirection);

          if (now) {
            console.debug(`[aggregated-landing-service] Loaded {${data.length || 0}} landings in ${Date.now() - now}ms`, data);
            now = undefined;
          }
          return {
            data,
            total: undefined
          };
        })
      );
  }



  /**
   * Load many local landings
   */
  watchAllLocally(offset: number,
                  size: number,
                  sortBy?: string,
                  sortDirection?: SortDirection,
                  dataFilter?: Partial<AggregatedLandingFilter>,
                  opts?: EntitiesServiceWatchOptions): Observable<LoadResult<AggregatedLanding>> {

    dataFilter = AggregatedLandingFilter.fromObject(dataFilter);

    if (!dataFilter || dataFilter.isEmpty()) {
      console.warn('[aggregated-landing-service] Trying to watch aggregated landings without \'filter\': skipping.');
      return EMPTY;
    }
    if (!EntityUtils.isLocalId(dataFilter.observedLocationId)) throw new Error('Invalid \'filter.observedLocationId\': must be a local ID (id<0)!');

    const variables = {
      offset: offset || 0,
      size: size >= 0 ? size : 20,
      sortBy: (sortBy !== 'id' && sortBy) || (opts && opts.trash ? 'updateDate' : 'dateTime'),
      sortDirection: sortDirection || (opts && opts.trash ? 'desc' : 'asc'),
      trash: opts && opts.trash || false,
      filter: dataFilter.asFilterFn()
    };

    if (this._debug) console.debug(`[aggregated-landing-service] Loading aggregated locally... using options:`, variables);
    return this.entities.watchAll<AggregatedLanding>(AggregatedLanding.TYPENAME, variables, {fullLoad: opts && opts.fullLoad})
      .pipe(map(({data, total}) => {
        const entities = (!opts || opts.toEntity !== false)
          ? (data || []).map(AggregatedLanding.fromObject)
          : (data || []) as AggregatedLanding[];
        total = total || entities.length;

        return {
          data: entities,
          total
        };
      }));
  }

  async saveAll(entities: AggregatedLanding[], options?: AggregatedLandingSaveOptions): Promise<AggregatedLanding[]> {
    if (!entities) return entities;

    const filter = this.asFilter(options?.filter || this._lastFilter);

    if (!filter || filter.isEmpty()) {
      console.warn('[aggregated-landing-service] Trying to save aggregated landings without \'filter\': skipping.');
      return entities;
    }

    const offline = EntityUtils.isLocalId(filter.observedLocationId);
    if (offline) {
      return this.saveAllLocally(entities, { filter });
    }

    const json = entities.map(t => this.asObject(t));

    const now = Date.now();
    if (this._debug) console.debug('[aggregated-landing-service] Saving aggregated landings...', json);

    await this.graphql.mutate<{ data: AggregatedLanding[] }>({
      mutation: Mutations.saveAll,
      variables: {
        data: json,
        filter: filter?.asPodObject()
      },
      context: {
        tracked: false
      },
      error: {code: ErrorCodes.SAVE_ENTITIES_ERROR, message: 'ERROR.SAVE_ENTITIES_ERROR'},
      update: (cache, {data}) => {

        const savedEntities = data?.data || [];
        if (this._debug) console.debug(`[aggregated-landing-service] Aggregated landings saved remotely in ${Date.now() - now}ms`, savedEntities);
        const newEntities = [];

        // Update ids
        entities.forEach(aggLanding => {
          const savedAggLanding = savedEntities.find(value => value.vesselSnapshot.id === aggLanding.vesselSnapshot.id);
          if (savedAggLanding) {

            const isNew = isNil(aggLanding.observedLocationId);
            if (isNew) {
              newEntities.push(aggLanding);
            }

            aggLanding.observedLocationId = savedAggLanding.observedLocationId;

            aggLanding.vesselActivities.forEach(vesselActivity => {
              const savedVesselActivity = savedAggLanding.vesselActivities.find(value => DateUtils.equals(value.date, vesselActivity.date));
              if (savedVesselActivity) {
                vesselActivity.updateDate = savedVesselActivity.updateDate;
                vesselActivity.observedLocationId = savedVesselActivity.observedLocationId;
                vesselActivity.landingId = savedVesselActivity.landingId;
                if (isNotNil(vesselActivity.tripId) && vesselActivity.tripId !== savedVesselActivity.tripId) {
                  console.warn(`/!\ ${vesselActivity.tripId} !== ${savedVesselActivity.tripId}`);
                }
                vesselActivity.tripId = savedVesselActivity.tripId;
              }
            })

          }
        });

        // Insert into the cache
        if (isNotEmptyArray(newEntities)) {
          this.refetchMutableWatchQueries({query: Queries.loadAll});
        }
      }
    });
    return entities;
  }

  async saveAllLocally(entities: AggregatedLanding[], opts?: AggregatedLandingSaveOptions): Promise<AggregatedLanding[]> {
    if (!entities) return entities;

    if (this._debug) console.debug(`[aggregated-landing-service] Saving ${entities.length} aggregated landings locally...`);
    const jobsFactories = (entities || []).map(entity => () => this.saveLocally(entity, {...opts}));
    return chainPromises<AggregatedLanding>(jobsFactories);
  }

  async deleteAll(entities: AggregatedLanding[], options?: any): Promise<any> {

    // Get local entity ids, then delete id
    const localIds = entities && entities
      .map(t => t.id)
      .filter(id => id < 0);
    if (isNotEmptyArray(localIds)) {
      if (this._debug) console.debug('[aggregated-landing-service] Deleting aggregated landings locally... ids:', localIds);
      await this.entities.deleteMany<AggregatedLanding>(localIds, {entityName: AggregatedLanding.TYPENAME});
    }

    const ids = entities && entities
      .filter(entity => entity.id === undefined && !!entity.vesselSnapshot.id);
    if (isEmptyArray(ids)) return; // stop, if nothing else to do

    const now = Date.now();
    if (this._debug) console.debug('[aggregated-landing-service] Deleting aggregated landings... ids:', ids);

    await this.graphql.mutate<any>({
      mutation: Mutations.deleteAll,
      variables: {
        filter: this._lastFilter && this._lastFilter.asPodObject(),
        vesselSnapshotIds: entities.map(value => value.vesselSnapshot.id)
      },
      update: (proxy) => {

        // Remove from cache
        this.removeFromMutableCachedQueriesByIds(proxy, {queryName: 'LoadAll', ids});

        if (this._debug) console.debug(`[aggregated-landing-service] Aggregated Landings deleted in ${Date.now() - now}ms`);
      }
    });

  }

  async synchronizeAll(entities: AggregatedLanding[], opts: Partial<AggregatedLandingSaveOptions>): Promise<AggregatedLanding[]> {

    const filter = this.asFilter(opts?.filter);
    if (!filter || filter.isEmpty()) throw new Error('Missing options filter arguments');

    // TODO: add a local persistence of target observed_location, landing and trip
    // const localTripIds = entities.flatMap(source => (source.vesselActivities || []).map(va => va.tripId))
    //   .filter(EntityUtils.isLocalId);
    // const localTrips = await Promise.all(localTripIds.map(id => this.tripService.load(id, {isLandedTrip: true, fullLoad: true})));
    // const localTripByIds = splitById(localTrips);
    // console.log("Local trips to synchronize:", localTrips);

    let target = entities.map(source => {
      const target = source.clone();
      target.observedLocationId = opts?.filter?.observedLocationId;
      target.id = undefined;
      // target.vesselActivities?.forEach(activity => activity.tripId = undefined);
      return target;
    });

    target = await this.saveAll(target, { filter });

    await this.deleteAll(entities);

    return target;
  }

  asFilter(filter: Partial<AggregatedLandingFilter>): AggregatedLandingFilter {
    return AggregatedLandingFilter.fromObject(filter);
  }

  protected asObject(entity: AggregatedLanding, options?: DataEntityAsObjectOptions) {
    options = {...MINIFY_OPTIONS, ...options};
    const copy: any = entity.asObject(options);

    if (options.minify && !options.keepEntityName && !options.keepTypename) {
      // Clean vessel features object, before saving
      copy.vesselSnapshot = {id: entity.vesselSnapshot && entity.vesselSnapshot.id};

      // Keep id only, on activity.metier
      (copy.vesselActivities || []).forEach(activity => activity.metiers = (activity.metiers || []).map(metier => ({id: metier.id})));
    }

    return copy;
  }

  /**
   * Save into the local storage
   *
   * @param entity
   * @param opts
   */
  protected async saveLocally(entity: AggregatedLanding, opts?: AggregatedLandingSaveOptions): Promise<AggregatedLanding> {

    // Make sure to fill id, with local ids
    await this.fillOfflineDefaultProperties(entity, opts);

    if (!EntityUtils.isLocalId(entity.observedLocationId)) throw new Error('Must be linked to a local observed location');

    const json = this.asObject(entity, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE);
    if (this._debug) console.debug('[aggregated-landing-service] [offline] Saving aggregated landing locally...', json);

    // Save response locally
    await this.entities.save(json);

    return entity;
  }

  protected async fillOfflineDefaultProperties(entity: AggregatedLanding, opts?: AggregatedLandingSaveOptions) {
    const isNew = isNil(entity.id);

    // If new, generate a local id
    if (isNew) {
      entity.id = await this.entities.nextValue(entity);
    }

    // Link to the meta observed location
    entity.observedLocationId = toNumber(entity.observedLocationId, opts?.filter?.observedLocationId);

    // Fill default synchronization status
    entity.synchronizationStatus = entity.synchronizationStatus || 'DIRTY';

  }

}
