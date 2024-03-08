import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Inject, Injectable, Injector, Optional } from '@angular/core';
import { AccountService, APP_LOGGING_SERVICE, BaseEntityService, capitalizeFirstLetter, ConfigService, CsvUtils, DateUtils, EntitiesStorage, EntityUtils, GraphqlService, isNil, isNotEmptyArray, isNotNil, JobUtils, JsonUtils, LocalSettingsService, PersonUtils, PlatformService, Referential, } from '@sumaris-net/ngx-components';
import { BehaviorSubject, from, merge, Subscription, timer } from 'rxjs';
import { DEVICE_POSITION_CONFIG_OPTION, DEVICE_POSITION_ENTITY_SERVICES } from '@app/data/position/device/device-position.config';
import { environment } from '@environments/environment';
import { DevicePosition, DevicePositionFilter } from '@app/data/position/device/device-position.model';
import { PositionUtils } from '@app/data/position/position.utils';
import { DataEntityUtils, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE } from '@app/data/services/model/data-entity.model';
import { gql } from '@apollo/client/core';
import { distinctUntilChanged, throttleTime } from 'rxjs/operators';
import { ModelEnumUtils, ObjectTypeLabels } from '@app/referential/services/model/model.enum';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { v4 as uuid } from 'uuid';
import { TRIP_LOCAL_SETTINGS_OPTIONS } from '@app/trip/trip.config';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { DataCommonFragments } from '@app/trip/common/data.fragments';
export const DevicePositionFragment = {
    devicePosition: gql `fragment DevicePositionFragment on DevicePositionVO {
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
  }`
};
const Queries = {
    loadAll: gql `query DevicePosition($filter: DevicePositionFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
    data: devicePositions(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
      ...DevicePositionFragment
    }
  }
  ${DevicePositionFragment.devicePosition}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.referential}`,
    loadAllWithTotal: gql `query DevicePosition($filter: DevicePositionFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
    data: devicePositions(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
      ...DevicePositionFragment
    }
    total: devicePositionsCount(filter: $filter)
  }
  ${DevicePositionFragment.devicePosition}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.referential}`,
};
const Mutations = {
    save: gql `mutation saveDevicePosition($data:DevicePositionVOInput!){
    data: saveDevicePosition(devicePosition: $data){
      ...DevicePositionFragment
    }
  }
  ${DevicePositionFragment.devicePosition}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.referential}
  `,
    saveAll: gql `mutation saveDevicePositions($data:[DevicePositionVOInput!]!){
    data: saveDevicePositions(devicePositions: $data){
      ...DevicePositionFragment
    }
  }
  ${DevicePositionFragment.devicePosition}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.referential}
  `,
    deleteAll: gql `mutation deleteDevicePositions($ids:[Int!]!){
    deleteDevicePositions(ids: $ids)
  }`,
};
let DevicePositionService = class DevicePositionService extends BaseEntityService {
    constructor(graphql, platform, injector, accountService, config, settings, entities, alertController, translate, listenedDataServices, loggingService) {
        super(graphql, platform, DevicePosition, DevicePositionFilter, {
            queries: Queries,
            mutations: Mutations,
        });
        this.injector = injector;
        this.accountService = accountService;
        this.config = config;
        this.settings = settings;
        this.entities = entities;
        this.alertController = alertController;
        this.translate = translate;
        this.listenedDataServices = listenedDataServices;
        this.lastPosition = new BehaviorSubject(null);
        this.enableTracking = false;
        this.trackingSubscription = new Subscription();
        this.trackingUpdatePositionFailed = new BehaviorSubject(false);
        this._logPrefix = '[device-position] ';
        this._logger = loggingService.getLogger('device-position');
        this._debug = !environment.production;
    }
    save(entity, opts) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Save locally if need
            if (this.isLocal(entity)) {
                return this.saveLocally(entity, opts);
            }
            return _super.save.call(this, entity, opts);
        });
    }
    deleteAll(entities, opts) {
        const _super = Object.create(null, {
            deleteAll: { get: () => super.deleteAll }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const localEntities = entities.filter(e => this.isLocal(e));
            const remoteEntities = entities.filter(e => !this.isLocal(e));
            // Delete locally
            if (isNotEmptyArray(localEntities)) {
                const localIds = localEntities.map(d => d.id);
                // Delete all by ids
                yield this.entities.deleteMany(localIds, { entityName: DevicePosition.TYPENAME });
            }
            if (isNotEmptyArray(remoteEntities)) {
                return _super.deleteAll.call(this, remoteEntities, opts);
            }
        });
    }
    downloadAsCsv(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = this._debug && Date.now();
            const maxProgression = opts && opts.maxProgression || 100;
            const data = yield this.downloadAll(filter, Object.assign(Object.assign({}, opts), { maxProgression: maxProgression * 0.9 }));
            // Convert into CSV
            const translations = this.translate.instant([
                'COMMON.DATE_TIME_PATTERN',
                'DEVICE_POSITION.MAP.EXPORT_CSV_FILENAME',
                'DEVICE_POSITION.MAP.TABLE.DATE_TIME',
                'DEVICE_POSITION.MAP.TABLE.DATE_TIME',
                'DEVICE_POSITION.MAP.TABLE.LATITUDE',
                'DEVICE_POSITION.MAP.TABLE.LONGITUDE',
                'DEVICE_POSITION.MAP.TABLE.RECORDER_PERSON',
                'DEVICE_POSITION.MAP.TABLE.OBJECT_TYPE'
            ]);
            const dateTimePattern = translations['COMMON.DATE_TIME_PATTERN'];
            const filename = translations['DEVICE_POSITION.MAP.EXPORT_CSV_FILENAME'];
            const headers = [
                translations['DEVICE_POSITION.MAP.TABLE.DATE_TIME'],
                translations['DEVICE_POSITION.MAP.TABLE.LATITUDE'],
                translations['DEVICE_POSITION.MAP.TABLE.LONGITUDE'],
                translations['DEVICE_POSITION.MAP.TABLE.RECORDER_PERSON'],
                translations['DEVICE_POSITION.MAP.TABLE.OBJECT_TYPE']
            ];
            const rows = data.map(position => {
                const objectTypeName = this.getObjectTypeName(position);
                return [
                    DateUtils.moment(position.dateTime).local().format(dateTimePattern),
                    position.latitude,
                    position.longitude,
                    PersonUtils.personToString(position.recorderPerson),
                    `${objectTypeName} #${position.objectId}`
                ];
            });
            // Download as CSV
            CsvUtils.exportToFile(rows, { filename, headers });
            opts === null || opts === void 0 ? void 0 : opts.progression.next(maxProgression);
            console.info(`[device-position-service] Downloading ${data.length} rows, in ${Date.now() - now}ms`);
        });
    }
    downloadAsGeoJson(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = this._debug && Date.now();
            const maxProgression = opts && opts.maxProgression || 100;
            const data = yield this.downloadAll(filter, Object.assign(Object.assign({}, opts), { maxProgression: maxProgression * 0.9 }));
            const geoJson = this.toGeoJson(data);
            const filename = this.translate.instant('DEVICE_POSITION.MAP.EXPORT_GEOJSON_FILENAME');
            JsonUtils.exportToFile(geoJson, {
                filename,
                type: 'application/geo+json' // GeoJSON mime-type
            });
            opts === null || opts === void 0 ? void 0 : opts.progression.next(maxProgression);
            console.info(`[device-position-service] Downloading ${data.length} rows, in ${Date.now() - now}ms`);
        });
    }
    toGeoJson(data) {
        const dateTimePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');
        // Convert into Geo Json features
        const features = (data || [])
            .map(position => this.toGeoJsonFeature(position, { dateTimePattern }))
            .filter(isNotNil);
        return {
            type: 'FeatureCollection',
            features: features
        };
    }
    /**
     * Convert into Geo Json feature
     * @param position
     * @param opts
     */
    toGeoJsonFeature(position, opts) {
        var _a;
        const dateTimePattern = (opts === null || opts === void 0 ? void 0 : opts.dateTimePattern) || this.translate.instant('COMMON.DATE_TIME_PATTERN');
        // Ignore invalid positions
        if (position.latitude == null || position.longitude == null || position.dateTime == null) {
            return null;
        }
        const personId = (_a = position.recorderPerson) === null || _a === void 0 ? void 0 : _a.id;
        if (isNil(personId))
            return;
        return {
            id: position.id,
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [position.longitude, position.latitude],
            },
            properties: {
                dateTime: DateUtils.moment(position.dateTime).local().format(dateTimePattern),
                latitude: position.latitude,
                longitude: position.longitude,
                recorderPerson: PersonUtils.personToString(position.recorderPerson),
                objectTypeName: this.getObjectTypeName(position),
                objectId: position.objectId
            }
        };
    }
    getObjectTypeName(position) {
        var _a;
        if (!position)
            return '';
        const objectType = (_a = position.objectType) === null || _a === void 0 ? void 0 : _a.label;
        if (objectType) {
            switch (objectType) {
                case ObjectTypeLabels.TRIP:
                    return this.translate.instant('TRIP.TITLE');
                case ObjectTypeLabels.OBSERVED_LOCATION:
                    return this.translate.instant('OBSERVED_LOCATION.TITLE');
            }
            return objectType.split('_').map(capitalizeFirstLetter).join(' ');
        }
    }
    /* -- protected functions -- */
    saveLocally(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isLocal(entity))
                throw new Error('Must be a local entity');
            console.info(`${this._logPrefix} Saving current device position locally`, entity);
            this.fillDefaultProperties(entity);
            yield this.fillOfflineDefaultProperties(entity);
            const jsonLocal = this.asObject(entity, Object.assign({}, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE));
            if (this._debug)
                console.debug(`${this._logPrefix} [offline] Saving device position locally...`, jsonLocal);
            yield this.entities.save(jsonLocal, { entityName: DevicePosition.TYPENAME });
            return entity;
        });
    }
    asObject(entity, opts) {
        opts = Object.assign(Object.assign({}, MINIFY_OPTIONS), opts);
        return super.asObject(entity, opts);
    }
    asFilter(source) {
        return DevicePositionFilter.fromObject(source);
    }
    ngOnStart() {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait platform to be ready (e.g. on mobile, need Capacitor plugin)
            yield this.platform.ready();
            console.info(`${this._logPrefix}Starting service...`);
            this.registerSubscription(merge(from(this.settings.ready()), this.settings.onChange)
                .subscribe(_ => this.onSettingsChanged()));
            this.registerSubscription(this.config.config.subscribe((config) => this.onConfigChanged(config)));
        });
    }
    startTracking() {
        var _a;
        // Stop if already started
        (_a = this.trackingSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        const enableOnSaveListeners = this.trackingSavePeriodMs > 0;
        console.info(`${this._logPrefix}Starting tracking position...`);
        const subscription = new Subscription();
        // Start the timer
        subscription.add(timer(650, this.timerPeriodMs).subscribe((_) => this.updateLastPosition()));
        if (enableOnSaveListeners) {
            // Start to listen data services events
            subscription.add(this.listenDataServices());
            // Force user to enable geolocation, if failed
            const alertId = uuid();
            subscription.add(this.trackingUpdatePositionFailed
                .pipe(distinctUntilChanged())
                .subscribe((failed) => __awaiter(this, void 0, void 0, function* () {
                var _b;
                yield this.platform.ready();
                if (failed) {
                    do {
                        console.warn(this._logPrefix + 'Geolocation not allowed. Opening a blocking modal');
                        (_b = this._logger) === null || _b === void 0 ? void 0 : _b.warn('startTracking', 'Geolocation not allowed. Opening a blocking modal');
                        const alert = yield this.alertController.create({
                            id: alertId,
                            message: this.translate.instant('DEVICE_POSITION.ERROR.NEED_GEOLOCATION'),
                            buttons: [
                                { role: 'refresh', text: this.translate.instant('COMMON.BTN_REFRESH') }
                            ]
                        });
                        yield alert.present();
                        const { role } = yield alert.onDidDismiss();
                        if (role === 'retry') {
                            failed = !(yield this.updateLastPosition());
                        }
                        else if (role === 'success') {
                            failed = false;
                        }
                    } while (failed);
                }
                // Success: hide the alert (if any)
                else {
                    const alert = yield this.alertController.getTop();
                    if ((alert === null || alert === void 0 ? void 0 : alert.id) === alertId) {
                        yield alert.dismiss(null, 'success');
                    }
                }
            })));
        }
        subscription.add(() => {
            this.unregisterSubscription(subscription);
            this.trackingSubscription = null;
        });
        this.registerSubscription(subscription);
        this.trackingSubscription = subscription;
        return this.trackingSubscription;
    }
    stopTracking() {
        var _a;
        (_a = this.trackingSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
    }
    listenDataServices() {
        const subscription = new Subscription();
        this.listenedDataServices.forEach(bean => {
            const service = this.injector.get(bean);
            subscription.add(service.onSave
                .pipe(throttleTime(this.trackingSavePeriodMs))
                .subscribe((entities) => {
                entities.forEach(e => this.onEntitySaved(e));
            }));
            subscription.add(service.onDelete.subscribe(entities => {
                entities.forEach(e => this.onEntityDeleted(e));
            }));
            subscription.add(service.onSynchronize.subscribe(event => {
                this.onEntitySynchronized(event);
            }));
        });
        return subscription;
    }
    onEntitySaved(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            const lastPosition = this.lastPosition.value;
            // If we're not watching position or if the delay between two device position
            // saving is not reach we not save the position.
            if (!this.enableTracking || !lastPosition)
                return;
            if (this._debug)
                console.log(`${this._logPrefix} saveNewDevicePositionFromEntity`, entity);
            const devicePosition = new DevicePosition();
            devicePosition.objectId = entity.id;
            devicePosition.longitude = lastPosition.longitude;
            devicePosition.latitude = lastPosition.latitude;
            devicePosition.dateTime = lastPosition.dateTime;
            const entityName = DataEntityUtils.getEntityName(entity);
            devicePosition.objectType = Referential.fromObject({
                label: ModelEnumUtils.getObjectTypeByEntityName(entityName),
            });
            yield this.save(devicePosition);
        });
    }
    onEntityDeleted(source) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const entityName = ModelEnumUtils.getObjectTypeByEntityName(DataEntityUtils.getEntityName(source));
            const filter = DevicePositionFilter.fromObject({
                objectId: source.id,
                objectType: { label: entityName },
            });
            let entitiesToRemove;
            if (EntityUtils.isLocal(source)) {
                // Load positions locally
                const { data } = (yield this.entities.loadAll(DevicePosition.TYPENAME, {
                    filter: filter.asFilterFn()
                }));
                entitiesToRemove = (data || []).map(DevicePosition.fromObject);
            }
            else {
                // Load positions remotely
                entitiesToRemove = (_a = (yield this.loadAll(0, 1000, null, null, filter, {
                    withTotal: false
                }))) === null || _a === void 0 ? void 0 : _a.data;
            }
            // Nothing to do if the synchronized entity has no liked local device position
            if (entitiesToRemove.length === 0)
                return;
            // Delete
            yield this.deleteAll(entitiesToRemove);
        });
    }
    onEntitySynchronized(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug(`${this._logPrefix} onEntitySynchronized`, event);
            const localId = event.localId;
            const remoteEntity = event.remoteEntity;
            const entityName = ModelEnumUtils.getObjectTypeByEntityName(DataEntityUtils.getEntityName(remoteEntity));
            // Load local data
            const { data } = yield this.entities.loadAll(DevicePosition.TYPENAME, {
                filter: DevicePositionFilter.fromObject({
                    objectId: localId,
                    objectType: Referential.fromObject({ label: entityName }),
                }).asFilterFn()
            });
            // Nothing to do if the synchronized entity has no liked local device position
            if (data.length === 0)
                return;
            const localIds = data.map(d => d.id);
            const entities = data.map(json => {
                const entity = DevicePosition.fromObject(Object.assign(Object.assign({}, json), { objectId: remoteEntity.id }));
                delete entity.id;
                return entity;
            });
            // Save
            yield this.saveAll(entities);
            // clean local
            yield this.entities.deleteMany(localIds, { entityName: DevicePosition.TYPENAME });
        });
    }
    fillDefaultProperties(entity) {
        const isNew = isNil(entity.id);
        if (isNew) {
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
    }
    fillOfflineDefaultProperties(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            const isNew = isNil(entity.id);
            // If new, generate a local id
            if (isNew) {
                entity.id = (yield this.entities.nextValue(entity));
            }
        });
    }
    onSettingsChanged() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settingsPositionTimeoutMs = this.settings.getPropertyAsInt(TRIP_LOCAL_SETTINGS_OPTIONS.OPERATION_GEOLOCATION_TIMEOUT) * 1000;
        });
    }
    onConfigChanged(config) {
        return __awaiter(this, void 0, void 0, function* () {
            this.timerPeriodMs = config.getPropertyAsInt(DEVICE_POSITION_CONFIG_OPTION.TIMER_PERIOD);
            // Tracking position
            {
                const enableTracking = this.settings.mobile && config.getPropertyAsBoolean(DEVICE_POSITION_CONFIG_OPTION.TRACKING_ENABLE);
                this.trackingSavePeriodMs = config.getPropertyAsInt(DEVICE_POSITION_CONFIG_OPTION.TRACKING_SAVE_PERIOD);
                if (enableTracking !== this.enableTracking) {
                    this.enableTracking = enableTracking;
                    if (this.enableTracking)
                        this.startTracking();
                    else
                        this.stopTracking();
                }
            }
        });
    }
    updateLastPosition(timeout) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Skip if already updating
            if (this.updatingPosition) {
                if (this._debug)
                    console.debug(`${this._logPrefix}Skip device position update (already running)`);
                // DEBUG
                //this._logger?.debug('updateLastPosition', 'Skip device position update (already running)');
                return true;
            }
            if (this._debug)
                console.debug(`${this._logPrefix}Updating device position...`);
            // DEBUG
            //this._logger?.debug('updateLastPosition', 'Updating device location...');
            try {
                this.updatingPosition = true;
                timeout = timeout || (this.settingsPositionTimeoutMs ? Math.min(this.settingsPositionTimeoutMs, this.timerPeriodMs) : this.timerPeriodMs);
                const position = yield PositionUtils.getCurrentPosition(this.platform, {
                    timeout,
                    maximumAge: timeout * 2
                });
                this.lastPosition.next({
                    latitude: position.latitude,
                    longitude: position.longitude,
                    dateTime: DateUtils.moment(),
                });
                if (this._debug)
                    console.debug(`${this._logPrefix}Last position updated`, this.lastPosition);
                // Mark as position ok
                if (this.enableTracking) {
                    this.trackingUpdatePositionFailed.next(false);
                }
                return true;
            }
            catch (e) {
                // If required but failed (e.g. due to leak of geolocation permission)
                if (this.enableTracking && isNotNil(e.code)) {
                    switch (+e.code) {
                        case GeolocationPositionError.PERMISSION_DENIED:
                            // DEBUG
                            //this._logger?.error('updateLastPosition', `Cannot get current position: PERMISSION_DENIED`);
                            this.trackingUpdatePositionFailed.next(true);
                            return false;
                    }
                }
                // Other errors case
                (_a = this._logger) === null || _a === void 0 ? void 0 : _a.error('updateLastPosition', `Cannot get current position: ${(e === null || e === void 0 ? void 0 : e.message) || e}`);
                throw e;
            }
            finally {
                this.updatingPosition = false;
            }
        });
    }
    isLocal(entity) {
        return isNotNil(entity.id) ? EntityUtils.isLocalId(entity.id) : EntityUtils.isLocalId(entity.objectId);
    }
    downloadAll(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const maxProgression = opts && opts.maxProgression || 100;
            filter = this.asFilter(filter);
            const { data } = yield JobUtils.fetchAllPages((offset, size) => this.loadAll(offset, size, 'dateTime', 'asc', filter, {
                query: (offset === 0) ? Queries.loadAllWithTotal : Queries.loadAll,
                fetchPolicy: 'no-cache',
                toEntity: false
            }), {
                progression: opts === null || opts === void 0 ? void 0 : opts.progression,
                maxProgression,
                logPrefix: '[device-position-service]',
                fetchSize: 1000
            });
            return data;
        });
    }
};
DevicePositionService = __decorate([
    Injectable(),
    __param(9, Inject(DEVICE_POSITION_ENTITY_SERVICES)),
    __param(10, Optional()),
    __param(10, Inject(APP_LOGGING_SERVICE)),
    __metadata("design:paramtypes", [GraphqlService,
        PlatformService,
        Injector,
        AccountService,
        ConfigService,
        LocalSettingsService,
        EntitiesStorage,
        AlertController,
        TranslateService, Array, Object])
], DevicePositionService);
export { DevicePositionService };
//# sourceMappingURL=device-position.service.js.map