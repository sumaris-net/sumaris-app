import {Inject, Injectable, Injector} from '@angular/core';
import {
  AppErrorWithDetails,
  BaseEntityGraphqlQueries,
  ConfigService,
  Configuration, DateUtils, EntitiesStorage, Entity,
  EntitySaveOptions, FormErrors, isNil,
  isNotNil,
} from '@sumaris-net/ngx-components';
import {IPosition} from '@app/trip/services/model/position.model';
import {BehaviorSubject, interval, Subscription} from 'rxjs';
import {DEVICE_POSITION_CONFIG_OPTION, DEVICE_POSTION_ENTITY_MONITORING} from '@app/data/services/config/device-position.config';
import {environment} from '@environments/environment';
import {DevicePosition, DevicePositionFilter, ITrackPosition} from '@app/data/services/model/device-position.model';
import {PositionUtils} from '@app/trip/services/position.utils';
import {RootDataEntityUtils} from '@app/data/services/model/root-data-entity.model';
import {RootDataSynchroService} from '@app/data/services/root-data-synchro-service.class';
import {SynchronizationStatusEnum} from '@app/data/services/model/model.utils';
import {MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE} from '@app/data/services/model/data-entity.model';
import {ErrorCodes} from '@app/data/services/errors';

// TODO
const Queries: BaseEntityGraphqlQueries = {
  loadAll: ``,
};

// TODO Check class type
@Injectable({providedIn: 'root'})
export class DevicePositionService extends RootDataSynchroService<DevicePosition<any>, DevicePositionFilter, number>  {

  static ENTITY_NAME = 'DevicePosition';

  protected config:ConfigService;

  protected lastPosition:ITrackPosition;
  protected $checkLoop: Subscription;
  protected onSaveSubscriptions:Subscription = new Subscription();
  protected entities: EntitiesStorage;

  protected _watching:boolean = false;
  // get watching(): boolean {
  //   return this._watching;
  // };

  mustAskForEnableGeolocation:BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    protected injector: Injector,
    @Inject(DEVICE_POSTION_ENTITY_MONITORING) private monitorOnSave,
  ) {
    super(
      injector,
      DevicePosition,
      DevicePositionFilter,
      {
        queries: Queries,
      }
    )
    this._logPrefix = '[DevicePositionService]';
    this.config = injector.get(ConfigService);
    this._debug = !environment.production;
  }

  protected ngOnStart(): Promise<void> {
    console.log(`${this._logPrefix} starting...`)
    this.onSaveSubscriptions.add(
      this.monitorOnSave.map(c => this.injector.get(c).onSave.subscribe((entities) => {
        if (this._watching) {
          entities.forEach(e => {
            const devicePosition:DevicePosition<any> = new DevicePosition<any>();
            devicePosition.objectType = e.TYPENAME;
            devicePosition.objectId = e.id;
            if (RootDataEntityUtils.isLocal(e)) this.saveLocally(devicePosition);
            else this.save(devicePosition, {}); // TODO Options
          });
        }
      }))
    );
    this.config.config.subscribe((config) => this.onConfigChanged(config));
    return Promise.resolve(undefined);
  }

  protected ngOnStop(): Promise<void> | void {
    this.$checkLoop.unsubscribe();
    this.onSaveSubscriptions.unsubscribe();
    return super.ngOnStop();
  }

  getLastPostion(): IPosition {
    return this.lastPosition;
  }

  save(entity:DevicePosition<any>, opts?:EntitySaveOptions): Promise<DevicePosition<any>> {
    console.log(`${this._logPrefix} save current device position`, {position: this.lastPosition})
    throw `${this._logPrefix} : remote save not yet implemented`;
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

  protected async fillOfflineDefaultProperties(entity:DevicePosition<any>) {
  }

  forceUpdatePosition() {
    this.mustAskForEnableGeolocation.next(false);
    this.watchGeolocation();
  }

  protected async onConfigChanged(config:Configuration) {
    const enabled = config.getPropertyAsBoolean(DEVICE_POSITION_CONFIG_OPTION.ENABLE);
    const checkInterval = config.getPropertyAsNumbers(DEVICE_POSITION_CONFIG_OPTION.CHECK_INTERVAL)[0];

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

}
