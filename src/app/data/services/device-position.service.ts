import {Inject, Injectable, Injector} from '@angular/core';
import {
  AppErrorWithDetails,
  BaseEntityGraphqlQueries,
  ConfigService,
  Configuration,
  DateUtils, EntitiesServiceWatchOptions,
  EntitiesStorage,
  Entity,
  EntitySaveOptions,
  EntityServiceLoadOptions, EntityUtils,
  FormErrors,
  isNil,
  isNotNil,
  LoadResult, QueryVariables, Referential,
} from '@sumaris-net/ngx-components';
import {IPosition} from '@app/trip/services/model/position.model';
import {BehaviorSubject, combineLatest, EMPTY, from, interval, Observable, Subscription} from 'rxjs';
import {DEVICE_POSITION_CONFIG_OPTION, DEVICE_POSTION_ENTITY_MONITORING} from '@app/data/services/config/device-position.config';
import {environment} from '@environments/environment';
import {DevicePosition, DevicePositionFilter, ITrackPosition} from '@app/data/services/model/device-position.model';
import {PositionUtils} from '@app/trip/services/position.utils';
import {RootDataEntity, RootDataEntityUtils} from '@app/data/services/model/root-data-entity.model';
import {RootDataSynchroService} from '@app/data/services/root-data-synchro-service.class';
import {SynchronizationStatusEnum} from '@app/data/services/model/model.utils';
import {MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, SAVE_AS_OBJECT_OPTIONS, SERIALIZE_FOR_OPTIMISTIC_RESPONSE} from '@app/data/services/model/data-entity.model';
import {ErrorCodes} from '@app/data/services/errors';
import {BaseRootEntityGraphqlMutations} from '@app/data/services/root-data-service.class';
import {FetchPolicy, gql, WatchQueryFetchPolicy} from '@apollo/client/core';
import {DataCommonFragments} from '@app/trip/services/trip.queries';
import {Trip} from '@app/trip/services/model/trip.model';
import {SortDirection} from '@angular/material/sort';
import {Moment} from 'moment';
import {OperationFilter} from '@app/trip/services/filter/operation.filter';
import {filter, map, mergeMap, tap} from 'rxjs/operators';
import {mergeLoadResult} from '@app/shared/functions';

export enum ObjectTypeEnum {
  Trip = "FISHING_TRIP",
  ObservedLocation = "OBSERVED_LOCATION",
}

export declare interface DevicePositionServiceWatchOptions extends EntitiesServiceWatchOptions {
  fullLoad?: boolean;
  fetchPolicy?: WatchQueryFetchPolicy; // Avoid the use cache-and-network, that exists in WatchFetchPolicy
  mutable?: boolean; // should be a mutable query ? true by default
  withOffline?: boolean;

  // TODO Need this ?
  // mapFn?: (operations: Operation[]) => Operation[] | Promise<Operation[]>;
  computeRankOrder?: boolean;
}

export const DevicePositionFragment = {
  devicePosition: gql`fragment DevicePositionFragment on DevicePositionVO {
    id
    dateTime
    latitude
    longitude
    objectId
    objectType {
      ...LightReferentialFragment
    }
    creationDate
    updateDate
    recorderPerson {
      ...LightPersonFragment
    }
  }`,
}

// TODO
const Queries: BaseEntityGraphqlQueries = {
  loadAll: gql`query DevicePosition($filter: DevicePositionFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
    data: devicePositions(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
      ...DevicePositionFragment
    }
  }
  ${DevicePositionFragment.devicePosition}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.referential}
  `,
  loadAllWithTotal: gql`query DevicePosition($filter: DevicePositionFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
    data: devicePositions(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
      ...DevicePositionFragment
    }
    total: devicePositionsCount(filter: $filter)
  }
  ${DevicePositionFragment.devicePosition}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.referential}
  `,
  // load: gql`query DevicePosition($id: Int!) {
  //   data: devicePosition(id: $id) {
  //     ...DevicePositionFragment
  //   }
  // }
  // ${DevicePositionFragment}
  // ${DataCommonFragments.lightPerson}
  // `,
};
const Mutations: Partial<BaseRootEntityGraphqlMutations> = {
  save: gql`mutation saveDevicePosition($devicePosition:DevicePositionVOInput!){
    data: saveDevicePosition(devicePosition: $devicePosition){
      ...DevicePositionFragment
    }
  }
  ${DevicePositionFragment.devicePosition}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.referential}
  `,
};

// TODO Check class type
@Injectable({providedIn: 'root'})
export class DevicePositionService extends RootDataSynchroService<DevicePosition<any>, DevicePositionFilter, number>  {

  static ENTITY_NAME = 'DevicePosition';

  protected config:ConfigService;

  protected saveInterval = 0;
  protected lastPosition:ITrackPosition;
  protected $checkLoop: Subscription;
  protected entities: EntitiesStorage;
  protected lastSavedPositionDate:Moment;
  protected loading:boolean = false;

  protected _watching:boolean = false;
  // get watching(): boolean {
  //   return this._watching;
  // };

  mustAskForEnableGeolocation:BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    protected injector: Injector,
    @Inject(DEVICE_POSTION_ENTITY_MONITORING) private monitoredServices:RootDataSynchroService<any, any>[],
  ) {
    super(
      injector,
      DevicePosition,
      DevicePositionFilter,
      {
        queries: Queries,
        mutations: Mutations,
      }
    )
    this._logPrefix = '[device-position-service]';
    this.config = injector.get(ConfigService);
    this._debug = !environment.production;
  }


  async save(entity:DevicePosition<any>, opts?:EntitySaveOptions): Promise<DevicePosition<any>> {
    console.log(`${this._logPrefix} save current device position`, {position: this.lastPosition})
    const now = Date.now();
    this.fillDefaultProperties(entity);
    // Provide an optimistic response, if connection lost
    // TODO
    // const offlineResponse = (!opts || opts.enableOptimisticResponse !== false) ?
    const offlineResponse = (false)
      ? async (context) => {
        // Make sure to fill id, with local ids
        await this.fillOfflineDefaultProperties(entity);
        // For the query to be tracked (see tracked query link) with a unique serialization key
        context.tracked = (!entity.synchronizationStatus || entity.synchronizationStatus === 'SYNC');
        if (isNotNil(entity.id)) context.serializationKey = `${Trip.TYPENAME}:${entity.id}`;
        return {
          data: [this.asObject(entity, SERIALIZE_FOR_OPTIMISTIC_RESPONSE)]
        };
      }
      : undefined;
    //  TODO ? Provide an optimistic response, if connection lost
    const json = this.asObject(entity, SAVE_AS_OBJECT_OPTIONS);
    if (this._debug) console.debug(`[${this._logPrefix}] Using minify object, to send:`, json);
    const variables = {
      devicePosition: json,
    };
    const mutation = this.mutations.save;
    await this.graphql.mutate<{ data:any }>({
      mutation,
      variables,
      offlineResponse,
      refetchQueries: this.getRefetchQueriesForMutation({}), // TODO option
      awaitRefetchQueries: false, // TODO option
      error: {code: ErrorCodes.SAVE_ENTITY_ERROR, message: 'ERROR.SAVE_ENTITY_ERROR'},
      update: async (cache, {data}) => {
        const savedEntity = data && data.data;
        // Local entity (optimistic response): save it
        if (savedEntity.id < 0) {
          if (this._debug) console.debug(`[${this._logPrefix}] [offline] Saving trip locally...`, savedEntity);
          await this.entities.save<DevicePosition<any, any>>(savedEntity);
        } else {
          // Remove existing entity from the local storage
          // TODO Check this condition
          if (entity.id < 0 && (savedEntity.id > 0 || savedEntity.updateDate)) {
            if (this._debug) console.debug(`[${this._logPrefix}] Deleting trip {${entity.id}} from local storage`);
            await this.entities.delete(entity);
          }
          // Copy id and update Date
          this.copyIdAndUpdateDate(savedEntity, entity);
          // Insert into the cache
          if (RootDataEntityUtils.isNew(entity) && this.watchQueriesUpdatePolicy === 'update-cache') {
            this.insertIntoMutableCachedQueries(cache, {
              queries: this.getLoadQueries(),
              data: savedEntity
            });
          }
          if (opts && opts.update) {
            opts.update(cache, {data});
          }
          if (this._debug) console.debug(`[${this._logPrefix}] DevicePosition saved remotely in ${Date.now() - now}ms`, entity);
        }
      },
    });
    this.onSave.next([entity]);
    return entity;
  }

  async saveLocally(entity:DevicePosition<any>, opts?:EntitySaveOptions) {
    console.log(`${this._logPrefix} save locally current device position`, {position: this.lastPosition})

    if (isNotNil(entity.id) && entity.id >= 0) throw new Error('Must be a local entity');
    this.fillDefaultProperties(entity);
    this.fillOfflineDefaultProperties(entity);
    entity.synchronizationStatus = SynchronizationStatusEnum.DIRTY;
    const jsonLocal = this.asObject(entity, {...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE});
    if (this._debug) console.debug(`${this._logPrefix} [offline] Saving device position locally...`, jsonLocal);
    await this.entities.save(jsonLocal, {entityName: DevicePosition.TYPENAME});
  }

  async synchronize(entity: DevicePosition<any>, opts?: any): Promise<DevicePosition<any>> {
    const localId = entity.id;
    if (isNil(localId) || localId >= 0) {
      throw new Error('Entity must be a local entity');
    }
    if (this.network.offline) {
      throw new Error('Cannot synchronize: app is offline');
    }
    entity = entity instanceof Entity ? entity.clone() : entity;
    entity.synchronizationStatus = 'SYNC';
    entity.id = undefined;
    try {
      entity = await this.save(entity, opts);
      if (isNil(entity.id) || entity.id < 0) {
        throw {code: ErrorCodes.SYNCHRONIZE_ENTITY_ERROR};
      }
    } catch (err) {
      throw {
        ...err,
        code: ErrorCodes.SYNCHRONIZE_ENTITY_ERROR,
        message: 'ERROR.SYNCHRONIZE_ENTITY_ERROR',
        context: entity.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE)
      };
    }
    // Clean local
    try {
      if (this._debug) console.debug(`${this._logPrefix} Deleting trip {${entity.id}} from local storage`);
    } catch (err) {
      console.error(`${this._logPrefix} Failed to locally delete trip {${entity.id}} and its operations`, err);
      // Continue
    }

    // TODO : See Importing historical data in trip service

    // Clear page history
    try {
      // FIXME: find a way o clean only synchronized data ?
      await this.settings.clearPageHistory();
    }
    catch(err) { /* Continue */}

    return entity;
  }

  // TODO Need a control on this data ?
  control(entity: DevicePosition<any>, opts?: any): Promise<AppErrorWithDetails | FormErrors> {
    return Promise.resolve(undefined);
  }

  forceUpdatePosition() {
    this.mustAskForEnableGeolocation.next(false);
    this.watchGeolocation();
  }

  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           dataFilter?: DevicePositionFilter | any,
           opts?: DevicePositionServiceWatchOptions,
  ):Observable<LoadResult<DevicePosition<any, any>>> {
    const forceOffline = this.network.offline;
    const offline = forceOffline || opts?.withOffline || false;
    const online = !forceOffline;
    let tempOpts:DevicePositionServiceWatchOptions = opts;
    if (offline && online) {
      tempOpts = {
        ...opts,
        // mapFn: undefined,
        toEntity: false,
        computeRankOrder: false,
        sortByDistance: false
      }
    }

    const offline$ = offline && this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, tempOpts);
    const online$ = online && this.watchAllRemotely(offset, size, sortBy, sortDirection, dataFilter, tempOpts);
    if (offline$ && online$) {
      return combineLatest([offline$, online$])
        .pipe(
          map(([res1, res2]) => mergeLoadResult(res1, res2)),
          mergeMap(({ data, total }) => {
            return this.applyWatchOptions({ data, total }, offset, size, sortBy, sortDirection, dataFilter, opts);
          })
        );
    }
    return offline$ || online$;
  }

  watchAllLocally(offset: number,
                  size: number,
                  sortBy?: string,
                  sortDirection?: SortDirection,
                  filter?: Partial<DevicePositionFilter>,
                  opts?: DevicePositionServiceWatchOptions): Observable<LoadResult<DevicePosition<any, any>>> {

    if (!filter) {
      console.warn(`${this._logPrefix} : Trying to load without filter. Skipping.`);
      return EMPTY;
    }

    filter = this.asFilter(filter);

    const variables = {
      offset: offset || 0,
      size: size >= 0 ? size : 1000,
      sortBy: (sortBy !== 'id' && sortBy), // TODO || (opts && opts.trash ? 'updateDate' : 'endDateTime')
      sortDirection: sortDirection, // TOOD || (opts && opts.trash ? 'desc' : 'asc'),
      // TODO trash: opts && opts.trash || false,
      filter: filter.asFilterFn()
    };

    if (this._debug) console.debug(`${this._logPrefix} : Loading locally... using options:`, variables);
    return this.entities.watchAll<DevicePosition<any, any>>(DevicePosition.TYPENAME, variables, { fullLoad: opts && opts.fullLoad })
      .pipe(mergeMap(async ({ data, total }) => {
        return await this.applyWatchOptions({ data, total }, offset, size, sortBy, sortDirection, filter, opts);
      }));
  }

  watchAllRemotely(offset: number,
                   size: number,
                   sortBy?: string,
                   sortDirection?: SortDirection,
                   dataFilter?: DevicePosition<any, any> | any,
                   opts?: DevicePositionServiceWatchOptions,
  ): Observable<LoadResult<DevicePosition<any, any>>> {

    if (!dataFilter) {
      console.warn(`${this._logPrefix} : Trying to load without filter. Skipping.`);
      return EMPTY;
    }
    if (opts && opts.fullLoad) {
      throw new Error('Loading full operation (opts.fullLoad) is only available for local DevicePosition');
    }

    dataFilter = this.asFilter(dataFilter);

    const variables: QueryVariables<OperationFilter> = {
      offset: offset || 0,
      size: size >= 0 ? size : 1000,
      sortBy: sortBy, // TODO (sortBy !== 'id' && sortBy) || (opts && opts.trash ? 'updateDate' : 'endDateTime'),
      sortDirection: sortDirection, // TODO || (opts && opts.trash ? 'desc' : 'asc'),
      // trash: opts && opts.trash || false,
      filter: dataFilter.asPodObject(),
    };

    let now = this._debug && Date.now();
    if (this._debug) console.debug(`${DevicePositionFilter} : Loading operations... using options:`, variables);

    const withTotal = !opts || opts.withTotal !== false;
    const query = opts?.query || (withTotal ? Queries.loadAllWithTotal : Queries.loadAll);
    const mutable = (!opts || opts.mutable !== false) && (opts?.fetchPolicy !== 'no-cache');

    const result$ = mutable
      ? this.mutableWatchQuery<LoadResult<any>>({
        queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
        query,
        arrayFieldName: 'data',
        totalFieldName: withTotal ? 'total' : undefined,
        insertFilterFn: dataFilter.asFilterFn(),
        variables,
        error: { code: ErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
        fetchPolicy: opts && opts.fetchPolicy || 'cache-and-network'
      })
      : from(this.graphql.query<LoadResult<any>>({
        query,
        variables,
        error: { code: ErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
        fetchPolicy: (opts && opts.fetchPolicy as FetchPolicy) || 'no-cache'
      }));

    return result$
      .pipe(
        // Skip update during load()
        filter(() => !this.loading),

        mergeMap(async ({ data, total }) => {
          if (now) {
            console.debug(`${this._logPrefix} : Loaded ${data.length} operations in ${Date.now() - now}ms`);
            now = undefined;
          }
          return await this.applyWatchOptions({ data, total }, offset, size, sortBy, sortDirection, dataFilter, opts);
        }));
  }

  async loadAll(offset:number,
                size: number,
                sortBy?:string,
                sortDirection?:SortDirection,
                filter?: Partial<DevicePositionFilter>,
                opts?: EntityServiceLoadOptions
  ):Promise<LoadResult<DevicePosition<any, any>>> {
    const offlineData = this.network.offline || (filter && filter.synchronizationStatus && filter.synchronizationStatus !== 'SYNC') || false;
    if (offlineData) {
      // TODO
    }
    return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
  }

  asFilter(source: Partial<DevicePositionFilter>): DevicePositionFilter {
    return DevicePositionFilter.fromObject(source);
  }

  protected ngOnStart(): Promise<void> {
    console.log(`${this._logPrefix} starting...`)

    this.subscribeMonitoredServiceEvents();
    this.registerSubscription(
      this.config.config
        .pipe(filter(isNotNil))
        .subscribe((config) => this.onConfigChanged(config))
    );

    this.myTest();
    return Promise.resolve(undefined);
  }

  protected async myTest() {
    const filter = DevicePositionFilter.fromObject({
      objectType: Referential.fromObject({label: ObjectTypeEnum.ObservedLocation}),
    });
    const remoteData = await this.loadAll(0, 9999, 'id', 'asc', filter, {withTotal: true});
    // const localData = await this.entities.loadAll('DevicePositionVO', {
    //   filter: filter.asFilterFn(),
    // });
    console.debug('MYTET REMOTE', remoteData);
    // console.debug('MYTET LOCAL', localData);

    // const toto = this.entities.watchAll('DevicePositionVO', {
    //   filter: filter.buildFilter(),
    // });
  }


  protected ngOnStop(): Promise<void> | void {
    this.$checkLoop.unsubscribe();
    return super.ngOnStop();
  }

  protected async subscribeMonitoredServiceEvents() {
    this.monitoredServices.forEach((serviceClass:RootDataSynchroService<any, any>) => {
      const service = this.injector.get(serviceClass);

      this.registerSubscription(
        service.onSave.subscribe((entities) => {
          entities.forEach(e => this.createFromEntitySave(e));
        })
      );

      this.registerSubscription(
        service.onDelete.subscribe(entities => this.deleteFromEntities(entities))
      );
    });
  }

  protected async createFromEntitySave(entity:RootDataEntity<any, any>) {
    // If we're not watching position or if the delay between two device position
    // saving is not reach we not save the position.
    if (!this._watching || this.checkIfSkipSaveDevicePosition()) return;

    if (this._debug) console.log(`${this._logPrefix} saveNewDevicePositionFromEntity`, entity);

    const devicePosition:DevicePosition<any> = new DevicePosition<any>();
    devicePosition.objectId = entity.id;
    // TODO Search is it exists a standard way to remove VO at the end of __typename
    devicePosition.objectType = Referential.fromObject({
      label: ObjectTypeEnum[entity.__typename.replace(/(^[A-Za-z]*)(VO$)/, "\$1")],
    });
    devicePosition.longitude = this.lastPosition.longitude;
    devicePosition.latitude = this.lastPosition.latitude;
    devicePosition.dateTime = this.lastPosition.date;

    if (RootDataEntityUtils.isLocal(entity)) this.saveLocally(devicePosition);
    else this.save(devicePosition, {}); // TODO Options

    this.lastSavedPositionDate = DateUtils.moment();
  }

  protected async deleteFromEntities(entities:RootDataEntity<any, any>[]) {
    const localEntities = entities.filter(e => EntityUtils.isLocal(e));
    const remoteEntities = entities.filter(e => EntityUtils.isRemote(e));
    const localDevicePosition = "";
    const remoteDevicePosition = "";
  }

//   async load(id:number, opts?:EntityServiceLoadOptions):Promise<DevicePosition<any, any>> {
//     if (isNil(id)) throw new Error('Missing argument \'id\'');
//
//     const now = Date.now();
//     if (this._debug) console.debug(`${this._logPrefix} : Loading {${id}}...`);
//     this.loading = false;
//
//     try {
// h
//     } catch (e) {
//     }
//   }

  // TODO
  protected async fillOfflineDefaultProperties(entity:DevicePosition<any>) {
  }

  protected async onConfigChanged(config:Configuration) {
    const enabled = config.getPropertyAsBoolean(DEVICE_POSITION_CONFIG_OPTION.ENABLE);
    const checkInterval = config.getPropertyAsNumbers(DEVICE_POSITION_CONFIG_OPTION.CHECK_INTERVAL)[0];
    this.saveInterval = config.getPropertyAsNumbers(DEVICE_POSITION_CONFIG_OPTION.SAVE_INTERVAL)[0];

    if (isNotNil(this.$checkLoop)) this.$checkLoop.unsubscribe();
    this._watching = (this.platform.mobile && enabled);
    if (!this._watching) {
      console.log(`${this._logPrefix} postion is not watched`, {mobile: this.platform.mobile, enabled: enabled});
      this.mustAskForEnableGeolocation.next(false);
      return;
    }

    await this.watchGeolocation();
    this.$checkLoop = interval(checkInterval).subscribe(async (_) => {
      console.debug(`${this._logPrefix} : begins to check device position each ${checkInterval}ms...`)
      this.watchGeolocation();
    });
  }

  protected async watchGeolocation() {
    if (this._debug) console.log(`${this._logPrefix} watching devices postion...`);
    let position:IPosition;
    try {
      position = await PositionUtils.getCurrentPosition(this.platform);
    } catch (e) {
      // User refuse to share its geolocation
      if (e.code == 1) this.mustAskForEnableGeolocation.next(true);
      // Other errors case
      else throw e;
      return;
    }
    this.lastPosition = {
      latitude: position.latitude,
      longitude: position.longitude,
      date: DateUtils.moment(),
    }
    console.log(`${this._logPrefix} : update last postison`, position);
    if (this.mustAskForEnableGeolocation.value === true) this.mustAskForEnableGeolocation.next(false);
    if (this._debug) console.debug(`${this._logPrefix} : ask for geolocation`, this.mustAskForEnableGeolocation.value);
  }

  protected async applyWatchOptions({data, total}: LoadResult<DevicePosition<any, any>>,
                                    offset: number,
                                    size: number,
                                    sortBy?: string,
                                    sortDirection?: SortDirection,
                                    filter?: Partial<DevicePositionFilter>,
                                    opts?: DevicePositionServiceWatchOptions): Promise<LoadResult<DevicePosition<any, any>>> {
    let entities = (!opts || opts.toEntity !== false) ?
      (data || []).map(source => DevicePosition.fromObject(source, opts))
      : (data || []) as DevicePosition<any, any>[];

    // TODO
    // if (opts?.mapFn) {
    //   entities = await opts.mapFn(entities);
    // }

    return {data: entities, total};
  }

  protected checkIfSkipSaveDevicePosition():boolean {
    if (isNil(this.lastSavedPositionDate)) return false;
    const diffTime = DateUtils.moment().diff(this.lastSavedPositionDate);
    return diffTime < this.saveInterval;
  }

}
