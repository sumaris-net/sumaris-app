import { Inject, Injectable, Injector } from '@angular/core';
import {
  AppErrorWithDetails,
  BaseEntityGraphqlQueries,
  ConfigService,
  Configuration,
  DateUtils,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  Entity,
  EntitySaveOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  FormErrors,
  isNil,
  isNotNil,
  LoadResult,
  QueryVariables,
  Referential
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, combineLatest, EMPTY, from, Observable, Subscription, timer } from 'rxjs';
import { DEVICE_POSITION_CONFIG_OPTION, DEVICE_POSITION_ENTITY_SERVICES } from '@app/data/services/config/device-position.config';
import { environment } from '@environments/environment';
import { DevicePosition, DevicePositionFilter, IPositionWithDate } from '@app/data/services/model/device-position.model';
import { PositionUtils } from '@app/trip/services/position.utils';
import { RootDataEntity, RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';
import {ISynchronizeEvent, RootDataEntitySaveOptions, RootDataSynchroService} from '@app/data/services/root-data-synchro-service.class';
import { SynchronizationStatusEnum } from '@app/data/services/model/model.utils';
import {DataEntityAsObjectOptions, DataEntityUtils, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, SAVE_AS_OBJECT_OPTIONS} from '@app/data/services/model/data-entity.model';
import { ErrorCodes } from '@app/data/services/errors';
import { BaseRootEntityGraphqlMutations } from '@app/data/services/root-data-service.class';
import { FetchPolicy, gql, WatchQueryFetchPolicy } from '@apollo/client/core';
import { DataCommonFragments } from '@app/trip/services/trip.queries';
import { SortDirection } from '@angular/material/sort';
import { OperationFilter } from '@app/trip/services/filter/operation.filter';
import {distinctUntilChanged, filter, map, mergeMap, throttleTime} from 'rxjs/operators';
import { mergeLoadResult } from '@app/shared/functions';
import { ModelEnumUtils } from '@app/referential/services/model/model.enum';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { v4 as uuid } from 'uuid';
import { TRIP_LOCAL_SETTINGS_OPTIONS } from '@app/trip/services/config/trip.config';

export declare interface DevicePositionServiceWatchOptions extends EntitiesServiceWatchOptions {
  fullLoad?: boolean;
  fetchPolicy?: WatchQueryFetchPolicy; // Avoid the use cache-and-network, that exists in WatchFetchPolicy
  mutable?: boolean; // should be a mutable query ? true by default
  withOffline?: boolean;
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
  saveAll: gql`mutation saveDevicePositions($devicePositions:[DevicePositionVOInput]){
    data: saveDevicePositions(devicePositions: $devicePositions){
      ...DevicePositionFragment
    }
  }
  ${DevicePositionFragment.devicePosition}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.referential}
  `,
};

@Injectable()
export class DevicePositionService extends RootDataSynchroService<DevicePosition, DevicePositionFilter, number>  {

  protected loading = false;
  protected timerPeriodMs: number;
  protected settingsPositionTimeoutMs: number;
  protected lastPosition = new BehaviorSubject<IPositionWithDate>(null);

  protected enableTracking = false;
  protected trackingSubscription = new Subscription();
  protected trackingSavePeriodMs: number;
  protected trackingUpdatePositionFailed = new BehaviorSubject<boolean>(false);


  constructor(
    protected injector: Injector,
    protected config: ConfigService,
    protected entities: EntitiesStorage,
    protected translate: TranslateService,
    @Inject(DEVICE_POSITION_ENTITY_SERVICES) private listenedDataServices:RootDataSynchroService<any, any>[]
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
    this._logPrefix = '[device-position] ';
    this._debug = !environment.production;
  }

  async save(entity: DevicePosition, opts?:RootDataEntitySaveOptions): Promise<DevicePosition> {
    if (RootDataEntityUtils.isLocal(entity)) {
      return this.saveLocally(entity, opts);
    }

    const now = Date.now();
    console.info(`${this._logPrefix} Saving current device position`, entity);

    this.fillDefaultProperties(entity);

    const json = this.asObject(entity, SAVE_AS_OBJECT_OPTIONS);
    if (this._debug) console.debug(`[${this._logPrefix}] Using minify object, to send:`, json);

    const variables = {
      devicePosition: json,
    };
    await this.graphql.mutate<{ data:any }>({
      mutation: this.mutations.save,
      variables,
      error: {code: ErrorCodes.SAVE_ENTITY_ERROR, message: 'ERROR.SAVE_ENTITY_ERROR'},
      update: async (cache, {data}) => {
        const savedEntity = data && data.data;
        // Local entity (optimistic response): save it
        if (savedEntity.id < 0) {
          if (this._debug) console.debug(`[${this._logPrefix}] [offline] Saving device positon locally...`, savedEntity);
          await this.entities.save<DevicePosition>(savedEntity);
        } else {
          // Remove existing entity from the local storage
          // TODO Check this condition
          if (entity.id < 0 && (savedEntity.id > 0 || savedEntity.updateDate)) {
            if (this._debug) console.debug(`[${this._logPrefix}] Deleting device positition {${entity.id}} from local storage`);
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

    if (!opts || opts.emitEvent !== false) {
      this.onSave.next([entity]);
    }

    return entity;
  }

  protected async saveLocally(entity: DevicePosition, opts?:EntitySaveOptions): Promise<DevicePosition> {

    if (isNotNil(entity.id) && entity.id >= 0) throw new Error('Must be a local entity');

    console.info(`${this._logPrefix} Saving current device position locally`, entity)

    this.fillDefaultProperties(entity);
    await this.fillOfflineDefaultProperties(entity);

    entity.synchronizationStatus = SynchronizationStatusEnum.DIRTY;
    const jsonLocal = this.asObject(entity, {...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE});
    if (this._debug) console.debug(`${this._logPrefix} [offline] Saving device position locally...`, jsonLocal);
    await this.entities.save(jsonLocal, {entityName: DevicePosition.TYPENAME});

    return entity;
  }


  async synchronize(entity: DevicePosition, opts?: any): Promise<DevicePosition> {
    throw  new Error('Not implemented');
  }

  // TODO Need a control on this data ?
  control(entity: DevicePosition, opts?: any): Promise<AppErrorWithDetails | FormErrors> {
    return Promise.resolve(undefined);
  }

  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           dataFilter?: DevicePositionFilter | any,
           opts?: DevicePositionServiceWatchOptions,
  ): Observable<LoadResult<DevicePosition>> {
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
                  opts?: DevicePositionServiceWatchOptions): Observable<LoadResult<DevicePosition>> {

    if (!filter) {
      console.warn(`${this._logPrefix}Trying to load without filter. Skipping.`);
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

    if (this._debug) console.debug(`${this._logPrefix}Loading locally... using options:`, variables);
    return this.entities.watchAll<DevicePosition>(DevicePosition.TYPENAME, variables, { fullLoad: opts && opts.fullLoad })
      .pipe(mergeMap(async ({ data, total }) => {
        return await this.applyWatchOptions({ data, total }, offset, size, sortBy, sortDirection, filter, opts);
      }));
  }

  watchAllRemotely(offset: number,
                   size: number,
                   sortBy?: string,
                   sortDirection?: SortDirection,
                   dataFilter?: DevicePosition | any,
                   opts?: DevicePositionServiceWatchOptions,
  ): Observable<LoadResult<DevicePosition>> {

    if (!dataFilter) {
      console.warn(`${this._logPrefix}Trying to load without filter. Skipping.`);
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
    if (this._debug) console.debug(`${this._logPrefix}Loading operations... using options:`, variables);

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
            console.debug(`${this._logPrefix}Loaded ${data.length} operations in ${Date.now() - now}ms`);
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
  ):Promise<LoadResult<DevicePosition>> {
    const offlineData = this.network.offline || (filter && filter.synchronizationStatus && filter.synchronizationStatus !== 'SYNC') || false;
    if (offlineData) {
      // TODO
    }
    return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
  }

  asFilter(source: Partial<DevicePositionFilter>): DevicePositionFilter {
    return DevicePositionFilter.fromObject(source);
  }

  protected async ngOnStart(): Promise<void> {

    // Wait settings (e.g. mobile)
    await this.settings.ready();
    await this.platform.ready();

    console.info(`${this._logPrefix}Starting service...`)

    this.registerSubscription(
      this.settings.onChange.subscribe(_ => this.onSettingsChanged())
    );

    this.registerSubscription(
      this.config.config.subscribe((config) => this.onConfigChanged(config))
    );
  }

  protected startTracking(): Subscription {

    // Stop if already started
    this.trackingSubscription?.unsubscribe();


    const enableOnSaveListeners = this.trackingSavePeriodMs > 0;
    console.info(`${this._logPrefix}Starting tracking position...`)
    const subscription = new Subscription();

    // Start the timer
    subscription.add(
      timer(650, this.timerPeriodMs).subscribe((_) => this.updateLastPosition())
    );

    if (enableOnSaveListeners) {
      // Start to listen data services events
      subscription.add(this.listenDataServices());

      // Force user to enable geolocation, if failed
      const alertCtrl = this.injector.get(AlertController);
      const alertId = uuid();
      subscription.add(
        this.trackingUpdatePositionFailed
          .pipe(distinctUntilChanged())
          .subscribe(async (failed) => {
            await this.platform.ready();
            if (failed) {
              do {
                console.warn(this._logPrefix + 'Geolocation not allowed. Opening alter modal');
                const alert = await alertCtrl.create({
                  id: alertId,
                  message: this.translate.instant('DEVICE_POSITION.ERROR.NEED_GEOLOCATION'),
                  buttons: [
                    {role: 'refresh', text: this.translate.instant('COMMON.BTN_REFRESH')}
                  ]
                })
                await alert.present();
                const {role} = await alert.onDidDismiss();
                if (role === 'retry') {
                  failed = !(await this.updateLastPosition());
                }
                else if (role === 'success') {
                  failed = false;
                }
              } while(failed);
            }
            // Success: hide the alert (if any)
            else {
              const alert = await alertCtrl.getTop();
              if (alert?.id === alertId) {
                await alert.dismiss(null,  'success');
              }
            }
          })
      );
    }

    subscription.add(() => {
      this.unregisterSubscription(subscription);
      this.trackingSubscription = null;
    });
    this.registerSubscription(subscription);
    this.trackingSubscription = subscription;

    return this.trackingSubscription;
  }


  protected stopTracking() {
    this.trackingSubscription?.unsubscribe();
  }

  protected listenDataServices(): Subscription {
    const subscription = new Subscription();
    this.listenedDataServices.forEach(bean => {
      const service = this.injector.get(bean);

      subscription.add(
        service.onSave
          .pipe(
            throttleTime(this.trackingSavePeriodMs)
          )
          .subscribe((entities) => {
            entities.forEach(e => this.createFromEntitySave(e));
          })
      );

      subscription.add(
        service.onDelete.subscribe(entities => this.deleteFromEntities(entities))
      );

      subscription.add(
        service.onSynchronize.subscribe(onSynchronizeSubject => this.synchronizeFromEntity(onSynchronizeSubject))
      );
    });

    return subscription;
  }

  protected async createFromEntitySave(entity:RootDataEntity<any, any>) {
    const lastPosition = this.lastPosition.value;

    // If we're not watching position or if the delay between two device position
    // saving is not reach we not save the position.
    if (!this.enableTracking || !lastPosition) return;

    if (this._debug) console.log(`${this._logPrefix} saveNewDevicePositionFromEntity`, entity);

    const devicePosition = new DevicePosition();
    devicePosition.objectId = entity.id;
    devicePosition.longitude = lastPosition.longitude;
    devicePosition.latitude = lastPosition.latitude;
    devicePosition.dateTime = lastPosition.dateTime;
    const entityName = DataEntityUtils.getEntityName(entity);
    devicePosition.objectType = Referential.fromObject({
      label: ModelEnumUtils.getObjectTypeByEntityName(entityName),
    });
    if (RootDataEntityUtils.isLocal(entity)) {
      devicePosition.synchronizationStatus = 'DIRTY';
    }

    await this.save(devicePosition);
  }

  protected async deleteFromEntities(entities:RootDataEntity<any, any>[]) {
    const localEntities = entities.filter(e => EntityUtils.isLocal(e));
    const remoteEntities = entities.filter(e => EntityUtils.isRemote(e));
    const localDevicePosition = "";
    const remoteDevicePosition = "";
  }

  protected async synchronizeFromEntity(event: ISynchronizeEvent) {
    const localId = event.localId;
    const remoteEntity = event.remoteEntity;
    const entityName = ModelEnumUtils.getObjectTypeByEntityName(DataEntityUtils.getEntityName(remoteEntity));

    // Load local data
    let {data} = await this.entities.loadAll(DevicePosition.TYPENAME, {
      filter: DevicePositionFilter.fromObject({
        objectId: localId,
        objectType: Referential.fromObject({label: entityName}),
      }).asFilterFn()
    });

    // Nothing to do if the synchronized entity has no liked local device position
    if (data.length === 0) return;

    const localIds = data.map(d => d.id);
    const entities = data.map(json => {
      const entity = DevicePosition.fromObject({
        ...json,
        objectId: remoteEntity.id,
      });
      return entity;
    });

    // Save
    console.debug('MYTEST ENTITITEST', entities);
    await this.saveAll(entities);

    // clean local
    console.debug('MYTEST DELETET MANY', localIds);
    await this.entities.deleteMany(localIds, {entityName: DevicePosition.TYPENAME});
  }

//   async load(id:number, opts?:EntityServiceLoadOptions):Promise<DevicePosition> {
//     if (isNil(id)) throw new Error('Missing argument \'id\'');
//
//     const now = Date.now();
//     if (this._debug) console.debug(`${this._logPrefix}Loading {${id}}...`);
//     this.loading = false;
//
//     try {
// h
//     } catch (e) {
//     }
//   }

  protected async fillOfflineDefaultProperties(entity: DevicePosition) {
    // Make sure to fill id, with local ids
    await super.fillOfflineDefaultProperties(entity);
  }

  protected async onSettingsChanged() {
    this.settingsPositionTimeoutMs = this.settings.getPropertyAsInt(TRIP_LOCAL_SETTINGS_OPTIONS.OPERATION_GEOLOCATION_TIMEOUT) * 1000;
  }

  protected async onConfigChanged(config:Configuration) {
    this.timerPeriodMs = config.getPropertyAsInt(DEVICE_POSITION_CONFIG_OPTION.TIMER_PERIOD);

    // Tracking position
    {
      const enableTracking = config.getPropertyAsBoolean(DEVICE_POSITION_CONFIG_OPTION.TRACKING_ENABLE);
      this.trackingSavePeriodMs = config.getPropertyAsInt(DEVICE_POSITION_CONFIG_OPTION.TRACKING_SAVE_PERIOD);

      if (enableTracking !== this.enableTracking) {
        this.enableTracking = enableTracking;
        if (this.enableTracking) this.startTracking();
        else this.stopTracking();
      }
    }
  }

  protected async updateLastPosition(): Promise<boolean> {

    try {
      if (this._debug) console.log(`${this._logPrefix}Watching device position...`);

      const timeout = this.settingsPositionTimeoutMs ? Math.min(this.settingsPositionTimeoutMs, this.timerPeriodMs) : this.timerPeriodMs;
      const position = await PositionUtils.getCurrentPosition(this.platform, {
        timeout,
        maximumAge: timeout * 2
      });

      this.lastPosition.next({
        latitude: position.latitude,
        longitude: position.longitude,
        dateTime: DateUtils.moment(),
      });

      if (this._debug) console.debug(`${this._logPrefix}Last position updated`, this.lastPosition);

      // Mark as position ok
      if (this.enableTracking) {
        this.trackingUpdatePositionFailed.next(false);
      }

      return true;
    }

    catch (e) {
      // If required bu failed (e.g. due to leak of geolocation permission)
      if (this.enableTracking && e.code == 1) {
        this.trackingUpdatePositionFailed.next(true);
      }
      // Other errors case
      else throw e;
      return false;
    }
  }

  protected async applyWatchOptions({data, total}: LoadResult<DevicePosition>,
                                    offset: number,
                                    size: number,
                                    sortBy?: string,
                                    sortDirection?: SortDirection,
                                    filter?: Partial<DevicePositionFilter>,
                                    opts?: DevicePositionServiceWatchOptions): Promise<LoadResult<DevicePosition>> {

    // Sort entities
    data = EntityUtils.sort(data, sortBy, sortDirection);

    // Transform to entities (if need)
    const entities = (!opts || opts.toEntity !== false) ?
      (data || []).map(source => DevicePosition.fromObject(source, opts))
      : (data || []) as DevicePosition[];

    return {data: entities, total};
  }

}
