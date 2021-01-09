import {Injectable, Injector} from "@angular/core";
import {
  EntitiesServiceWatchOptions,
  EntityServiceLoadOptions,
  FilterFn,
  IEntitiesService,
  IEntityService,
  LoadResult
} from "../../shared/services/entity-service.class";
import {AccountService} from "../../core/services/account.service";
import {Observable} from "rxjs";
import {Moment} from "moment";
import {environment} from "../../../environments/environment";
import {gql} from "@apollo/client/core";
import {Fragments} from "./trip.queries";
import {ErrorCodes} from "./trip.errors";
import {filter, map} from "rxjs/operators";
import {GraphqlService} from "../../core/graphql/graphql.service";
import {
  DataEntityAsObjectOptions,
  SAVE_AS_OBJECT_OPTIONS,
  SAVE_LOCALLY_AS_OBJECT_OPTIONS
} from "../../data/services/model/data-entity.model";
import {FormErrors} from "../../core/form/form.utils";
import {ObservedLocation} from "./model/observed-location.model";
import {Beans, fromDateISOString, isNil, isNotNil, KeysEnum, toDateISOString} from "../../shared/functions";
import {SynchronizationStatus} from "../../data/services/model/root-data-entity.model";
import {SortDirection} from "@angular/material/sort";
import {Trip} from "./model/trip.model";
import {TripFilter} from "./trip.service";
import {EntitiesStorage} from "../../core/services/storage/entities-storage.service";
import {NetworkService} from "../../core/services/network.service";
import {IDataEntityQualityService} from "../../data/services/data-quality-service.class";
import {Entity} from "../../core/services/model/entity.model";
import {LandingService} from "./landing.service";
import {RootDataSynchroService} from "../../data/services/data-synchro-service.class";
import {IDataSynchroService} from "../../data/services/data-synchro-service.class";


export class ObservedLocationFilter {
  programLabel?: string;
  startDate?: Date | Moment;
  endDate?: Date | Moment;
  locationId?: number;
  recorderDepartmentId?: number;
  recorderPersonId?: number;
  synchronizationStatus?: SynchronizationStatus;

  static isEmpty(f: ObservedLocationFilter|any): boolean {
    return Beans.isEmpty<ObservedLocationFilter>({...f, synchronizationStatus: null}, ObservedLocationFilterKeys, {
      blankStringLikeEmpty: true
    });
  }

  static searchFilter<T extends ObservedLocation>(f: ObservedLocationFilter): (T) => boolean {
    if (!f) return undefined;

    const filterFns: FilterFn<T>[] = [];

    // Program
    if (f.programLabel) {
      filterFns.push(t => (t.program && t.program.label === f.programLabel));
    }

    // Location
    if (isNotNil(f.locationId)) {
      filterFns.push(t => (t.location && t.location.id === f.locationId));
    }

    // Start/end period
    const startDate = fromDateISOString(f.startDate);
    let endDate = fromDateISOString(f.endDate);
    if (startDate) {
      filterFns.push(t => t.endDateTime ? startDate.isSameOrBefore(t.endDateTime) : startDate.isSameOrBefore(t.startDateTime));
    }
    if (endDate) {
      endDate = endDate.add(1, 'day');
      filterFns.push(t => t.startDateTime && endDate.isAfter(t.startDateTime));
    }

    // Recorder department
    if (isNotNil(f.recorderDepartmentId)) {
      filterFns.push(t => (t.recorderDepartment && t.recorderDepartment.id === f.recorderDepartmentId));
    }

    // Recorder person
    if (isNotNil(f.recorderPersonId)) {
      filterFns.push(t => (t.recorderPerson && t.recorderPerson.id === f.recorderPersonId));
    }

    // Synchronization status
    if (f.synchronizationStatus) {
      filterFns.push(t => // Check trip synchro status, if any
        (t.synchronizationStatus && t.synchronizationStatus === f.synchronizationStatus)
        // Else, if SYNC is wanted: must be remote (not local) id
        || (f.synchronizationStatus === 'SYNC' && !t.synchronizationStatus && t.id >= 0)
        // Or else, if DIRTY or READY_TO_SYNC wanted: must be local id
        || (f.synchronizationStatus !== 'SYNC' && !t.synchronizationStatus && t.id < 0));
    }

    if (!filterFns.length) return undefined;

    return (entity) => !filterFns.find(fn => !fn(entity));
  }

  /**
   * Clean a filter, before sending to the pod (e.g remove 'synchronizationStatus')
   * @param f
   */
  static asPodObject(f: ObservedLocationFilter): any {
    if (!f) return f;
    return {
      ...f,
      // Serialize all dates
      startDate: f && toDateISOString(f.startDate),
      endDate: f && toDateISOString(f.endDate),
      // Remove fields that not exists in pod
      synchronizationStatus: undefined
    };
  }
}

export const ObservedLocationFilterKeys: KeysEnum<ObservedLocationFilter> = {
  programLabel: true,
  startDate: true,
  endDate: true,
  locationId: true,
  recorderDepartmentId: true,
  recorderPersonId: true,
  synchronizationStatus: true
};


export interface ObservedLocationServiceSaveOptions {
  withLanding?: boolean;
  enableOptimisticResponse?: boolean; // True by default
}

export interface ObservedLocationServiceLoadOptions extends EntityServiceLoadOptions {
  withLanding?: boolean;
  toEntity?: boolean;
}

export const ObservedLocationFragments = {
  lightObservedLocation: gql`fragment LightObservedLocationFragment on ObservedLocationVO {
    id
    program {
      id
      label
    }
    startDateTime
    endDateTime
    creationDate
    updateDate
    controlDate
    validationDate
    qualificationDate
    comments
    location {
      ...LocationFragment
    }
    recorderDepartment {
      ...LightDepartmentFragment
    }
    recorderPerson {
      ...LightPersonFragment
    }
    observers {
      ...LightPersonFragment
    }
  }
  ${Fragments.lightDepartment}
  ${Fragments.lightPerson}
  ${Fragments.location}
  `,
  observedLocation: gql`fragment ObservedLocationFragment on ObservedLocationVO {
    id
    program {
      id
      label
    }
    startDateTime
    endDateTime
    creationDate
    updateDate
    controlDate
    validationDate
    qualificationDate
    comments
    location {
      ...LocationFragment
    }
    recorderDepartment {
      ...LightDepartmentFragment
    }
    recorderPerson {
      ...LightPersonFragment
    }
    observers {
      ...LightPersonFragment
    }
    measurementValues
  }
  ${Fragments.lightDepartment}
  ${Fragments.lightPerson}
  ${Fragments.location}
  `
};

// Search query
const LoadAllQuery: any = gql`
  query ObservedLocations($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $trash: Boolean, $filter: ObservedLocationFilterVOInput){
    observedLocations(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash){
      ...LightObservedLocationFragment
    }
    observedLocationsCount(filter: $filter, trash: $trash)
  }
  ${ObservedLocationFragments.lightObservedLocation}
`;
// Load query
const LoadQuery: any = gql`
  query ObservedLocation($id: Int!) {
    observedLocation(id: $id) {
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
`;
// Save all query
const SaveAllQuery: any = gql`
  mutation SaveObservedLocations($observedLocations:[ObservedLocationVOInput]){
    saveObservedLocations(observedLocations: $observedLocations){
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
`;
const DeleteByIdsMutation: any = gql`
  mutation DeleteObservedLocations($ids:[Int]){
    deleteObservedLocations(ids: $ids)
  }
`;

const UpdateSubscription = gql`
  subscription UpdateObservedLocation($id: Int!, $interval: Int){
    updateObservedLocation(id: $id, interval: $interval) {
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
`;

@Injectable({providedIn: "root"})
export class ObservedLocationService
  extends RootDataSynchroService<ObservedLocation, ObservedLocationFilter, ObservedLocationServiceLoadOptions>
  implements
    IEntitiesService<ObservedLocation, ObservedLocationFilter>,
    IEntityService<ObservedLocation, ObservedLocationServiceLoadOptions>,
    IDataEntityQualityService<ObservedLocation>,
    IDataSynchroService<ObservedLocation, ObservedLocationServiceLoadOptions>
{

  protected loading = false;

  constructor(
    injector: Injector,
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected network: NetworkService,
    protected entities: EntitiesStorage,
    protected landingService: LandingService
  ) {
    super(injector);

  }

  watchAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection,
           dataFilter?: ObservedLocationFilter,
           opts?: EntitiesServiceWatchOptions): Observable<LoadResult<ObservedLocation>> {

    // Load offline
    const offlineData = this.network.offline || (dataFilter && dataFilter.synchronizationStatus && dataFilter.synchronizationStatus !== 'SYNC') || false;
    if (offlineData) {
      return this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts);
    }

    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy: sortBy || 'startDateTime',
      sortDirection: sortDirection || 'asc',
      trash: opts && opts.trash || false,
      filter: ObservedLocationFilter.asPodObject(dataFilter)
    };

    let now = Date.now();
    console.debug("[observed-location-service] Watching observed locations... using options:", variables);

    return this.mutableWatchQuery<{ observedLocations: ObservedLocation[]; observedLocationsCount: number }>({
        queryName: 'LoadAll',
        query: LoadAllQuery,
        arrayFieldName: 'observedLocations',
        totalFieldName: 'observedLocationsCount',
        insertFilterFn: ObservedLocationFilter.searchFilter(dataFilter),
        variables: variables,
        error: {code: ErrorCodes.LOAD_OBSERVED_LOCATIONS_ERROR, message: "OBSERVED_LOCATION.ERROR.LOAD_ALL_ERROR"},
        fetchPolicy: opts && opts.fetchPolicy || 'cache-and-network'
      })
      .pipe(
        filter(() => !this.loading),
        map(res => {
          const data = (res && res.observedLocations || []).map(ObservedLocation.fromObject);
          const total = res && isNotNil(res.observedLocationsCount) ? res.observedLocationsCount : undefined;
          if (now) {
            console.debug(`[observed-location-service] Loaded {${data.length || 0}} observed locations in ${Date.now() - now}ms`, data);
            now = undefined;
          } else {
            console.debug(`[observed-location-service] Refreshed {${data.length || 0}} observed locations`);
          }
          return {data, total};
        }));
  }

  watchAllLocally(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection,
           dataFilter?: ObservedLocationFilter,
           opts?: EntitiesServiceWatchOptions): Observable<LoadResult<ObservedLocation>> {

    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy: sortBy || 'startDateTime',
      sortDirection: sortDirection || 'asc',
      filter: TripFilter.searchFilter<Trip>(dataFilter)
    };

    console.debug("[observed-location-service] Watching local observed locations... using options:", variables);

    return this.entities.watchAll<ObservedLocation>(ObservedLocation.TYPENAME, variables)
      .pipe(
        map(res => {
          const data = (res && res.data || []).map(ObservedLocation.fromObject);
          const total = res && isNotNil(res.total) ? res.total : undefined;
          return {data, total};
        }));
  }

  async load(id: number, opts?: ObservedLocationServiceLoadOptions): Promise<ObservedLocation> {
    if (isNil(id)) throw new Error("Missing argument 'id'");

    const now = Date.now();
    if (this._debug) console.debug(`[observed-location-service] Loading observed location {${id}}...`);
    this.loading = true;

    try {
      const res = await this.graphql.query<{ observedLocation: ObservedLocation }>({
        query: LoadQuery,
        variables: {
          id: id
        },
        error: {code: ErrorCodes.LOAD_OBSERVED_LOCATION_ERROR, message: "OBSERVED_LOCATION.ERROR.LOAD_ERROR"},
        fetchPolicy: opts && opts.fetchPolicy || 'cache-first'
      });
      const data = res && res.observedLocation && ObservedLocation.fromObject(res.observedLocation);
      if (data && this._debug) console.debug(`[observed-location-service] Observed location #${id} loaded in ${Date.now() - now}ms`, data);

      return data;
    }
    finally {
      this.loading = false;
    }
  }

  public listenChanges(id: number): Observable<ObservedLocation> {
    if (!id && id !== 0) throw new Error("Missing argument 'id' ");

    if (this._debug) console.debug(`[observed-location-service] [WS] Listening changes for trip {${id}}...`);

    return this.graphql.subscribe<{ updateObservedLocation: ObservedLocation }, { id: number, interval: number }>({
      query: UpdateSubscription,
      variables: {
        id: id,
        interval: 10
      },
      error: {
        code: ErrorCodes.SUBSCRIBE_OBSERVED_LOCATION_ERROR,
        message: 'OBSERVED_LOCATION.ERROR.SUBSCRIBE_ERROR'
      }
    })
      .pipe(
        map(res => {
          const data = res && res.updateObservedLocation && ObservedLocation.fromObject(res.updateObservedLocation);
          if (data && this._debug) console.debug(`[observed-location-service] Observed location {${id}} updated on server !`, data);
          return data;
        })
      );
  }

  async save(entity: ObservedLocation, opts?: ObservedLocationServiceSaveOptions): Promise<ObservedLocation> {
    const now = Date.now();
    if (this._debug) console.debug("[observed-location-service] Saving an observed location...");

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Reset the control date
    entity.controlDate = undefined;

    // If new, create a temporary if (for offline mode)
    const isNew = isNil(entity.id);

    // Transform into json
    const json = this.asObject(entity, SAVE_AS_OBJECT_OPTIONS);
    if (isNew) delete json.id; // Make to remove temporary id, before sending to graphQL
    if (this._debug) console.debug("[observed-location-service] Using minify object, to send:", json);

    await this.graphql.mutate<{ saveObservedLocations: any }>({
      mutation: SaveAllQuery,
      variables: {
        observedLocations: [json]
      },
      error: {code: ErrorCodes.SAVE_OBSERVED_LOCATION_ERROR, message: "OBSERVED_LOCATION.ERROR.SAVE_ERROR"},
      update: (proxy, {data}) => {
        const savedEntity = data && data.saveObservedLocations && data.saveObservedLocations[0];
        if (savedEntity !== entity) {
          if (this._debug) console.debug(`[observed-location-service] Observed location saved in ${Date.now() - now}ms`, entity);
          this.copyIdAndUpdateDate(savedEntity, entity);
        }

        // Add to cache
        if (isNew) {
          this.insertIntoMutableCachedQuery(proxy, {
            query: LoadAllQuery,
            data: savedEntity
          });
        }
      }
    });


    return entity;
  }

  async saveAll(entities: ObservedLocation[], options?: any): Promise<ObservedLocation[]> {
    if (!entities) return entities;

    const json = entities.map(t => {
      // Fill default properties (as recorder department and person)
      this.fillDefaultProperties(t);
      return this.asObject(t);
    });

    const now = Date.now();
    if (this._debug) console.debug("[observed-location-service] Saving Observed locations...", json);

    const res = await this.graphql.mutate<{ saveObservedLocations: ObservedLocation[] }>({
      mutation: SaveAllQuery,
      variables: {
        trips: json
      },
      error: {code: ErrorCodes.SAVE_OBSERVED_LOCATIONS_ERROR, message: "OBSERVED_LOCATION.ERROR.SAVE_ALL_ERROR"}
    });
    (res && res.saveObservedLocations && entities || [])
      .forEach(entity => {
        const savedEntity = res.saveObservedLocations.find(obj => entity.equals(obj));
        this.copyIdAndUpdateDate(savedEntity, entity);
      });

    if (this._debug) console.debug(`[observed-location-service] Observed locations saved in ${Date.now() - now}ms`, entities);

    return entities;
  }

  async delete(data: ObservedLocation): Promise<any> {
    await this.deleteAll([data]);
  }

  async deleteAll(entities: ObservedLocation[], options?: any): Promise<any> {
    const ids = entities && entities
      .map(t => t.id)
      .filter(isNotNil);

    const now = Date.now();
    if (this._debug) console.debug("[observed-location-service] Deleting observed locations... ids:", ids);

    await this.graphql.mutate<any>({
      mutation: DeleteByIdsMutation,
      variables: {
        ids: ids
      },
      update: (proxy) => {
        // Update the cache
        this.removeFromMutableCachedQueryByIds(proxy, {
          query: LoadAllQuery,
          ids
        });

        if (this._debug) console.debug(`[observed-location-service] Observed locations deleted in ${Date.now() - now}ms`);

      }
    });
  }

  /* -- TODO implement this methods -- */
  async control(data: ObservedLocation): Promise<FormErrors> { return undefined; }
  async terminate(data: ObservedLocation): Promise<ObservedLocation> { return data; }
  async validate(data: ObservedLocation): Promise<ObservedLocation> { return data; }
  async unvalidate(data: ObservedLocation): Promise<ObservedLocation> { return data; }
  async qualify(data: ObservedLocation, qualityFlagId: number): Promise<ObservedLocation> { return data; }


  /* -- -- */
  async synchronizeById(id: number): Promise<ObservedLocation> {
    const entity = await this.load(id);
    if (!entity || entity.id >= 0) return; // skip

    return await this.synchronize(entity);
  }

  async synchronize(entity: ObservedLocation, opts?: ObservedLocationServiceSaveOptions): Promise<ObservedLocation> {
    opts = {
      withLanding: true,
      enableOptimisticResponse: false, // Optimistic response not need
      ...opts
    };

    const localId = entity && entity.id;
    if (isNil(localId) || localId >= 0) throw new Error("Entity must be a local entity");
    if (this.network.offline) throw new Error("Could not synchronize if network if offline");

    // Clone (to keep original entity unchanged)
    entity = entity instanceof Entity ? entity.clone() : entity;
    entity.synchronizationStatus = 'SYNC';
    entity.id = undefined;

    // Fill landings
    const res = await this.landingService.loadAllByObservedLocation( {observedLocationId: localId},
      {fullLoad: true, rankOrderOnPeriod: false});
    entity.landings = res && res.data || [];

    try {

      entity = await this.save(entity, opts);

      // Check return entity has a valid id
      if (isNil(entity.id) || entity.id < 0) {
        throw {code: ErrorCodes.SYNCHRONIZE_TRIP_ERROR};
      }
    } catch (err) {
      throw {
        ...err,
        code: ErrorCodes.SYNCHRONIZE_TRIP_ERROR,
        message: "OBSERVED_LOCATION.ERROR.SYNCHRONIZE_ERROR",
        context: entity.asObject(SAVE_LOCALLY_AS_OBJECT_OPTIONS)
      };
    }

    try {
      if (this._debug) console.debug(`[trip-service] Deleting trip {${entity.id}} from local storage`);

      // Delete trip's operations
      await this.landingService.deleteLocally({observedLocationId: localId});

      // Delete trip
      await this.entities.deleteById(localId, {entityName: Trip.TYPENAME});
    }
    catch (err) {
      console.error(`[trip-service] Failed to locally delete trip {${entity.id}} and its operations`, err);
      // Continue
    }

    // TODO: add to a synchro history (using class SynchronizationHistory) and store it in local settings ?

    return entity;
  }

  /* -- protected methods -- */

  protected asObject(entity: ObservedLocation, opts?: DataEntityAsObjectOptions): any {
    const copy = super.asObject(entity, opts);

    // Remove not saved properties
    delete copy.landings;

    return copy;
  }

}
