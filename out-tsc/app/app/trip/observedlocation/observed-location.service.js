import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Injectable, Injector, Optional } from '@angular/core';
import { AccountService, AppFormUtils, arrayDistinct, chainPromises, EntitiesStorage, Entity, EntityUtils, FormErrorTranslator, GraphqlService, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, JobUtils, NetworkService, ProgressBarService, Toasts, toNumber, } from '@sumaris-net/ngx-components';
import { gql } from '@apollo/client/core';
import { filter, map } from 'rxjs/operators';
import { COPY_LOCALLY_AS_OBJECT_OPTIONS, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, SAVE_AS_OBJECT_OPTIONS, } from '@app/data/services/model/data-entity.model';
import { ObservedLocation } from './observed-location.model';
import { RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';
import { LandingFragments, LandingService } from '../landing/landing.service';
import { RootDataSynchroService } from '@app/data/services/root-data-synchro-service.class';
import { Landing } from '../landing/landing.model';
import { ObservedLocationValidatorService } from './observed-location.validator';
import { environment } from '@environments/environment';
import { VesselSnapshotFragments } from '@app/referential/services/vessel-snapshot.service';
import { OBSERVED_LOCATION_FEATURE_NAME } from '../trip.config';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { VESSEL_FEATURE_NAME } from '@app/vessel/services/config/vessel.config';
import { LandingFilter } from '../landing/landing.filter';
import { ObservedLocationFilter } from './observed-location.filter';
import { SampleFilter } from '@app/trip/sample/sample.filter';
import { TripFragments } from '@app/trip/trip/trip.service';
import { DataErrorCodes } from '@app/data/services/errors';
import { TripErrorCodes } from '@app/trip/trip.errors';
import { VesselService } from '@app/vessel/services/vessel-service';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { AggregatedLandingService } from '@app/trip/aggregated-landing/aggregated-landing.service';
import moment from 'moment';
import { ProgramUtils } from '@app/referential/services/model/program.model';
import { Trip } from '@app/trip/trip/trip.model';
import { SynchronizationStatusEnum } from '@app/data/services/model/model.utils';
import { TrashRemoteService } from '@app/core/services/trash-remote.service';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MEASUREMENT_VALUES_PMFM_ID_REGEXP } from '@app/data/measurement/measurement.model';
import { DataCommonFragments, DataFragments } from "@app/trip/common/data.fragments";
export const ObservedLocationFragments = {
    lightObservedLocation: gql `fragment LightObservedLocationFragment on ObservedLocationVO {
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
    qualityFlagId
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
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}
  `,
    observedLocation: gql `fragment ObservedLocationFragment on ObservedLocationVO {
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
    qualityFlagId
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
  }`
};
// Load query
const ObservedLocationQueries = {
    load: gql `query ObservedLocation($id: Int!) {
    data: observedLocation(id: $id) {
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`,
    loadAll: gql `query ObservedLocations($filter: ObservedLocationFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $trash: Boolean){
    data: observedLocations(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash){
      ...LightObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.lightObservedLocation}`,
    loadAllWithTotal: gql `query ObservedLocations($filter: ObservedLocationFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $trash: Boolean){
    data: observedLocations(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash){
      ...LightObservedLocationFragment
    }
    total: observedLocationsCount(filter: $filter, trash: $trash)
  }
  ${ObservedLocationFragments.lightObservedLocation}`,
    countSamples: gql `query SamplesCountQuery($filter: SampleFilterVOInput!){
      total: samplesCount(filter: $filter)
    }`
};
const ObservedLocationMutations = {
    save: gql `mutation SaveObservedLocation($data: ObservedLocationVOInput!, $options: ObservedLocationSaveOptionsInput!){
    data: saveObservedLocation(observedLocation: $data, options: $options){
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`,
    saveWithLandings: gql `mutation SaveObservedLocationWithLandings($data: ObservedLocationVOInput!, $options: ObservedLocationSaveOptionsInput!){
    data: saveObservedLocation(observedLocation: $data, options: $options){
      ...ObservedLocationFragment
      landings {
        ...LandingFragment
      }
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${LandingFragments.landing}
  ${TripFragments.embeddedLandedTrip}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}
  ${VesselSnapshotFragments.vesselSnapshot}
  ${DataFragments.sample}`,
    deleteAll: gql `mutation DeleteObservedLocations($ids:[Int]!){
    deleteObservedLocations(ids: $ids)
  }`,
    terminate: gql `mutation TerminateObservedLocation($data: ObservedLocationVOInput!, $options: DataControlOptionsInput){
    data: controlObservedLocation(observedLocation: $data, options: $options) {
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`,
    validate: gql `mutation ValidateObservedLocation($data: ObservedLocationVOInput!, $options: DataValidateOptionsInput) {
    data: validateObservedLocation(observedLocation: $data, options: $options) {
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`,
    unvalidate: gql `mutation UnvalidateObservedLocation($data: ObservedLocationVOInput!, $options: DataValidateOptionsInput) {
    data: unvalidateObservedLocation(observedLocation: $data, options: $options) {
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`,
    qualify: gql `mutation QualifyObservedLocation($data: ObservedLocationVOInput!){
    data: qualifyObservedLocation(observedLocation: $data){
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`
};
const ObservedLocationSubscriptions = {
    listenChanges: gql `subscription UpdateObservedLocation($id: Int!, $interval: Int){
    data: updateObservedLocation(id: $id, interval: $interval) {
      ...LightObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.lightObservedLocation}`
};
let ObservedLocationService = class ObservedLocationService extends RootDataSynchroService {
    constructor(injector, graphql, accountService, network, entities, validatorService, vesselService, landingService, aggregatedLandingService, trashRemoteService, progressBarService, formErrorTranslator, translate, toastController) {
        super(injector, ObservedLocation, ObservedLocationFilter, {
            queries: ObservedLocationQueries,
            mutations: ObservedLocationMutations,
            subscriptions: ObservedLocationSubscriptions
        });
        this.graphql = graphql;
        this.accountService = accountService;
        this.network = network;
        this.entities = entities;
        this.validatorService = validatorService;
        this.vesselService = vesselService;
        this.landingService = landingService;
        this.aggregatedLandingService = aggregatedLandingService;
        this.trashRemoteService = trashRemoteService;
        this.progressBarService = progressBarService;
        this.formErrorTranslator = formErrorTranslator;
        this.translate = translate;
        this.toastController = toastController;
        this.loading = false;
        this._featureName = OBSERVED_LOCATION_FEATURE_NAME;
        // FOR DEV ONLY
        this._debug = !environment.production;
        if (this._debug)
            console.debug('[observed-location-service] Creating service');
    }
    watchAll(offset, size, sortBy, sortDirection, dataFilter, opts) {
        // Load offline
        const offlineData = this.network.offline || ((dataFilter === null || dataFilter === void 0 ? void 0 : dataFilter.synchronizationStatus) && dataFilter.synchronizationStatus !== 'SYNC') || false;
        if (offlineData) {
            return this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts);
        }
        dataFilter = this.asFilter(dataFilter);
        const variables = {
            offset: offset || 0,
            size: size || 20,
            sortBy: sortBy || (opts && opts.trash ? 'updateDate' : 'startDateTime'),
            sortDirection: sortDirection || (opts && opts.trash ? 'desc' : 'asc'),
            trash: opts && opts.trash || false,
            filter: dataFilter === null || dataFilter === void 0 ? void 0 : dataFilter.asPodObject()
        };
        let now = Date.now();
        console.debug('[observed-location-service] Watching observed locations... using options:', variables);
        const withTotal = (!opts || opts.withTotal !== false);
        const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
        return this.mutableWatchQuery({
            queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
            query,
            arrayFieldName: 'data',
            totalFieldName: withTotal ? 'total' : undefined,
            insertFilterFn: dataFilter === null || dataFilter === void 0 ? void 0 : dataFilter.asFilterFn(),
            variables,
            error: { code: DataErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
            fetchPolicy: opts && opts.fetchPolicy || 'cache-and-network'
        })
            .pipe(filter(() => !this.loading), map(({ data, total }) => {
            const entities = (data || []).map(ObservedLocation.fromObject);
            if (now) {
                console.debug(`[observed-location-service] Loaded {${entities.length || 0}} observed locations in ${Date.now() - now}ms`, entities);
                now = undefined;
            }
            return { data: entities, total };
        }));
    }
    watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts) {
        dataFilter = this.asFilter(dataFilter);
        const variables = {
            offset: offset || 0,
            size: size || 20,
            sortBy: sortBy || 'startDateTime',
            sortDirection: sortDirection || 'asc',
            filter: dataFilter && dataFilter.asFilterFn()
        };
        console.debug('[observed-location-service] Watching local observed locations... using options:', variables);
        return this.entities.watchAll(ObservedLocation.TYPENAME, variables)
            .pipe(map(res => {
            const data = (res && res.data || []).map(ObservedLocation.fromObject);
            const total = res && isNotNil(res.total) ? res.total : undefined;
            return { data, total };
        }));
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(id))
                throw new Error('Missing argument \'id\'');
            const now = Date.now();
            if (this._debug)
                console.debug(`[observed-location-service] Loading observed location {${id}}...`);
            this.loading = true;
            try {
                let data;
                // If local entity
                if (id < 0) {
                    data = yield this.entities.load(id, ObservedLocation.TYPENAME);
                    if (!data)
                        throw { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' };
                    if (opts && opts.withLanding) {
                        const { data: landings } = yield this.entities.loadAll(Landing.TYPENAME, { filter: LandingFilter.fromObject({ observedLocationId: id }).asFilterFn() });
                        data = Object.assign(Object.assign({}, data), { landings });
                    }
                }
                else {
                    const res = yield this.graphql.query({
                        query: this.queries.load,
                        variables: { id },
                        error: { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' },
                        fetchPolicy: opts && opts.fetchPolicy || undefined
                    });
                    data = res && res.data;
                }
                const entities = (!opts || opts.toEntity !== false)
                    ? ObservedLocation.fromObject(data)
                    : data;
                if (id > 0 && entities && opts && opts.withLanding) {
                    entities.landings = (yield this.landingService.loadAllByObservedLocation({ observedLocationId: id })).data;
                }
                if (entities && this._debug)
                    console.debug(`[observed-location-service] Observed location #${id} loaded in ${Date.now() - now}ms`, entities);
                return entities;
            }
            finally {
                this.loading = false;
            }
        });
    }
    hasOfflineData() {
        const _super = Object.create(null, {
            hasOfflineData: { get: () => super.hasOfflineData }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield _super.hasOfflineData.call(this);
            if (result)
                return result;
            const res = yield this.entities.loadAll(ObservedLocation.TYPENAME, {
                offset: 0,
                size: 0
            });
            return res && res.total > 0;
        });
    }
    listenChanges(id, opts) {
        if (isNil(id))
            throw new Error('Missing argument \'id\' ');
        // If local entity
        if (EntityUtils.isLocalId(id)) {
            if (this._debug)
                console.debug(this._logPrefix + `Listening for local changes on ${this._logTypeName} {${id}}...`);
            return this.entities.watchAll(ObservedLocation.TYPENAME, { offset: 0, size: 1, filter: (t) => t.id === id })
                .pipe(map(({ data }) => {
                const json = isNotEmptyArray(data) && data[0];
                const entity = (!opts || opts.toEntity !== false) ? this.fromObject(json) : json;
                // Set an updateDate, to force update detection
                if (entity && this._debug)
                    console.debug(this._logPrefix + `${this._logTypeName} {${id}} updated locally !`, entity);
                return entity;
            }));
        }
        if (this._debug)
            console.debug(`[observed-location-service] [WS] Listening changes for observedLocation {${id}}...`);
        return this.graphql.subscribe({
            query: this.subscriptions.listenChanges,
            fetchPolicy: opts && opts.fetchPolicy || undefined,
            variables: { id, interval: toNumber(opts && opts.interval, 10) },
            error: {
                code: DataErrorCodes.SUBSCRIBE_ENTITY_ERROR,
                message: 'ERROR.SUBSCRIBE_ENTITY_ERROR'
            }
        })
            .pipe(map(({ data }) => {
            const entity = data && ObservedLocation.fromObject(data);
            if (entity && this._debug)
                console.debug(`[observed-location-service] Observed location {${id}} updated on server !`, entity);
            return entity;
        }));
    }
    translateControlPath(path, opts) {
        opts = Object.assign({ i18nPrefix: 'OBSERVED_LOCATION.EDIT.' }, opts);
        // Translate PMFM fields
        if (MEASUREMENT_VALUES_PMFM_ID_REGEXP.test(path) && opts.pmfms) {
            const pmfmId = parseInt(path.split('.').pop());
            const pmfm = opts.pmfms.find(p => p.id === pmfmId);
            return PmfmUtils.getPmfmName(pmfm);
        }
        // Default translation
        return this.formErrorTranslator.translateControlPath(path, opts);
    }
    save(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // If is a local entity: force a local save
            if (RootDataEntityUtils.isLocal(entity)) {
                return this.saveLocally(entity, opts);
            }
            opts = Object.assign({ withLanding: false }, opts);
            const now = Date.now();
            if (this._debug)
                console.debug('[observed-location-service] Saving an observed location...');
            // Prepare to save
            this.fillDefaultProperties(entity);
            // Reset quality properties
            this.resetQualityProperties(entity);
            // Transform into json
            const json = this.asObject(entity, SAVE_AS_OBJECT_OPTIONS);
            if (RootDataEntityUtils.isNew(entity))
                delete json.id; // Make to remove temporary id, before sending to graphQL
            if (this._debug)
                console.debug('[observed-location-service] Using minify object, to send:', json);
            const variables = {
                data: json,
                options: {
                    withLanding: opts.withLanding
                }
            };
            const mutation = opts.withLanding ? ObservedLocationMutations.saveWithLandings : this.mutations.save;
            yield this.graphql.mutate({
                mutation,
                variables,
                error: { code: DataErrorCodes.SAVE_ENTITY_ERROR, message: 'ERROR.SAVE_ENTITY_ERROR' },
                update: (proxy, { data }) => {
                    const savedEntity = data && data.data;
                    if (savedEntity !== entity) {
                        if (this._debug)
                            console.debug(`[observed-location-service] Observed location saved in ${Date.now() - now}ms`, entity);
                        this.copyIdAndUpdateDate(savedEntity, entity);
                    }
                    // Add to cache
                    if (RootDataEntityUtils.isNew(entity)) {
                        this.insertIntoMutableCachedQueries(proxy, {
                            queries: this.getLoadQueries(),
                            data: savedEntity
                        });
                    }
                }
            });
            // Update date of children entities, if need (see IMAGINE-276)
            if (!RootDataEntityUtils.isNew(entity)) {
                yield this.updateChildrenDate(entity);
            }
            if (!opts || opts.emitEvent !== false) {
                this.onSave.next([entity]);
            }
            return entity;
        });
    }
    saveAll(entities, opts) {
        const _super = Object.create(null, {
            saveAll: { get: () => super.saveAll }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield _super.saveAll.call(this, entities, opts);
            if (!opts || opts.emitEvent !== false) {
                this.onSave.next(result);
            }
            return result;
        });
    }
    saveLocally(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNotNil(entity.id) && entity.id >= 0)
                throw new Error('Must be a local entity');
            opts = Object.assign({ withLanding: false }, opts);
            const isNew = isNil(entity.id);
            this.fillDefaultProperties(entity);
            // Reset quality properties
            this.resetQualityProperties(entity);
            // Make sure to fill id, with local ids
            yield this.fillOfflineDefaultProperties(entity);
            // Reset synchro status
            entity.synchronizationStatus = 'DIRTY';
            // Extract landings (saved just after)
            const landings = entity.landings;
            delete entity.landings;
            const jsonLocal = this.asObject(entity, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE);
            if (this._debug)
                console.debug('[observed-location-service] [offline] Saving observed location locally...', jsonLocal);
            // Save observed location locally
            yield this.entities.save(jsonLocal, { entityName: ObservedLocation.TYPENAME });
            // Save landings
            if (opts.withLanding && isNotEmptyArray(landings)) {
                const program = yield this.programRefService.loadByLabel(entity.program.label);
                const landingHasDateTime = program.getPropertyAsBoolean(ProgramProperties.LANDING_DATE_TIME_ENABLE);
                landings.forEach(l => {
                    l.id = null; // Clean ID, to force new ids
                    l.observedLocationId = entity.id; // Link to parent entity
                    l.updateDate = undefined;
                    // Copy date to landing and samples (IMAGINE-276)
                    if (!landingHasDateTime) {
                        l.dateTime = entity.startDateTime;
                        (l.samples || []).forEach(s => {
                            s.sampleDate = l.dateTime;
                        });
                    }
                });
                // Save landings
                entity.landings = yield this.landingService.saveAll(landings, { observedLocationId: entity.id });
            }
            // Update date of children entities, if need (see IMAGINE-276)
            else if (!opts.withLanding && !isNew) {
                yield this.updateChildrenDate(entity);
            }
            if (!opts || opts.emitEvent !== false) {
                this.onSave.next([entity]);
            }
            return entity;
        });
    }
    copyLocally(source, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[observed-location-service] Copy trip locally...', source);
            opts = Object.assign({ keepRemoteId: false, deletedFromTrash: false, withLanding: true }, opts);
            const isLocal = RootDataEntityUtils.isLocal(source);
            // Create a new entity (without id and updateDate)
            const json = this.asObject(source, Object.assign(Object.assign({}, COPY_LOCALLY_AS_OBJECT_OPTIONS), { keepRemoteId: opts.keepRemoteId }));
            json.synchronizationStatus = SynchronizationStatusEnum.DIRTY; // To make sure it will be saved locally
            // Save
            const target = yield this.saveLocally(ObservedLocation.fromObject(json), opts);
            // Remove from the local trash
            if (opts.deletedFromTrash) {
                if (isLocal) {
                    yield this.entities.deleteFromTrash(source, { entityName: Trip.TYPENAME });
                }
                else {
                    yield this.trashRemoteService.delete(Trip.ENTITY_NAME, source.id);
                }
            }
            if (opts.displaySuccessToast) {
                yield this.showToast({ message: 'SOCIAL.USER_EVENT.INFO.COPIED_LOCALLY', type: 'info' });
            }
            return target;
        });
    }
    copyLocallyById(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Load existing data
            const source = yield this.load(id, Object.assign(Object.assign({}, opts), { fetchPolicy: 'network-only' }));
            // Copy remote trip to local storage
            return yield this.copyLocally(source, opts);
        });
    }
    /**
     * Delete many observations
     *
     * @param entities
     * @param opts
     */
    deleteAll(entities, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Delete local entities
            const localEntities = entities === null || entities === void 0 ? void 0 : entities.filter(RootDataEntityUtils.isLocal);
            if (isNotEmptyArray(localEntities)) {
                return this.deleteAllLocally(localEntities, opts);
            }
            const remoteEntities = entities === null || entities === void 0 ? void 0 : entities.filter(EntityUtils.isRemote);
            const ids = remoteEntities === null || remoteEntities === void 0 ? void 0 : remoteEntities.map(t => t.id);
            if (isEmptyArray(ids))
                return; // stop if empty
            const now = Date.now();
            if (this._debug)
                console.debug(`[observed-location-service] Deleting {${ids.join(',')}}`, ids);
            yield this.graphql.mutate({
                mutation: this.mutations.deleteAll,
                variables: { ids },
                update: (proxy) => {
                    // Update the cache
                    this.removeFromMutableCachedQueriesByIds(proxy, {
                        queries: this.getLoadQueries(),
                        ids
                    });
                    if (this._debug)
                        console.debug(`[observed-location-service] Observed locations deleted in ${Date.now() - now}ms`);
                    this.onDelete.next(remoteEntities);
                }
            });
        });
    }
    /**
     * Delete many local entities
     *
     * @param entities
     * @param opts
     */
    deleteAllLocally(entities, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get local entity ids, then delete id
            const localEntities = entities && entities
                .filter(RootDataEntityUtils.isLocal);
            // Delete, one by one
            yield chainPromises((localEntities || [])
                .map(entity => () => this.deleteLocally(entity, opts)));
        });
    }
    deleteLocally(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const trash = !opts || opts !== false;
            const trashUpdateDate = trash && moment();
            if (this._debug)
                console.debug(`[observedLocation-service] Deleting observed location #${entity.id}... {trash: ${trash}`);
            try {
                // Load children
                const { data: landings } = yield this.landingService.loadAllByObservedLocation({ observedLocationId: entity.id }, { fullLoad: true /*need to keep content in trash*/, computeRankOrder: false });
                yield this.entities.delete(entity, { entityName: ObservedLocation.TYPENAME });
                this.onDelete.next([entity]);
                if (isNotNil(landings)) {
                    yield this.landingService.deleteAll(landings, { trash: false });
                }
                if (trash) {
                    // Fill observedLocation's operation, before moving it to trash
                    entity.landings = landings;
                    entity.updateDate = trashUpdateDate;
                    const json = entity.asObject(Object.assign(Object.assign({}, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE), { keepLocalId: false }));
                    // Add to trash
                    yield this.entities.saveToTrash(json, { entityName: ObservedLocation.TYPENAME });
                }
            }
            catch (err) {
                console.error('Error during observation location deletion: ', err);
                throw { code: DataErrorCodes.DELETE_ENTITY_ERROR, message: 'ERROR.DELETE_ENTITY_ERROR' };
            }
            this.onDelete.next([entity]);
        });
    }
    control(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = this._debug && Date.now();
            const maxProgression = toNumber(opts === null || opts === void 0 ? void 0 : opts.maxProgression, 100);
            opts = Object.assign(Object.assign({}, opts), { maxProgression });
            opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });
            const progressionStep = maxProgression / 20;
            if (this._debug)
                console.debug(`[observed-location-service] Control {${entity.id}} ...`);
            opts = yield this.fillControlOptions(entity, opts);
            // If control has been disabled (in program's option)
            if (!opts.enable) {
                console.info(`[observed-location-service] Skip control {${entity.id}} (disabled by program option)...`);
                return undefined;
            } // Skip
            const form = this.validatorService.getFormGroup(entity, opts);
            if (!form.valid) {
                // Wait end of validation (e.g. async validators)
                yield AppFormUtils.waitWhilePending(form);
                // Get form errors
                if (form.invalid) {
                    const errors = AppFormUtils.getFormErrors(form);
                    if (this._debug)
                        console.debug(`[observed-location-service] Control {${entity.id}} [INVALID] in ${Date.now() - now}ms`, errors);
                    return {
                        message: 'COMMON.FORM.HAS_ERROR',
                        details: {
                            errors,
                        },
                    };
                }
            }
            if (this._debug)
                console.debug(`[observed-location-service] Control {${entity.id}} [OK] in ${Date.now() - now}ms`);
            if (opts === null || opts === void 0 ? void 0 : opts.progression)
                opts.progression.increment(progressionStep);
            // Get if meta operation and the program label for sub operations
            const subProgramLabel = opts.program.getProperty(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM);
            // If meta, control sub observed location
            if (isNotNilOrBlank(subProgramLabel)) {
                const nbDays = opts.program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT);
                const childrenFilter = ObservedLocationFilter.fromObject({
                    programLabel: subProgramLabel,
                    startDate: entity.startDateTime,
                    endDate: entity.endDateTime || entity.startDateTime.clone().add(nbDays, 'day'),
                });
                const errors = yield this.controlAllByFilter(childrenFilter, {
                    progression: opts === null || opts === void 0 ? void 0 : opts.progression,
                    maxProgression: maxProgression - progressionStep,
                });
                if (errors) {
                    return {
                        message: 'OBSERVED_LOCATION.ERROR.INVALID_SUB',
                        details: {
                            errors: {
                                // TODO Rename sub
                                sub: errors
                            }
                        }
                    };
                }
            }
            // Else control landings
            else {
                const errors = yield this.landingService.controlAllByObservedLocation(entity, {
                    program: opts === null || opts === void 0 ? void 0 : opts.program,
                    strategy: null,
                    progression: opts === null || opts === void 0 ? void 0 : opts.progression,
                    maxProgression: (opts === null || opts === void 0 ? void 0 : opts.maxProgression) - progressionStep
                });
                if (errors) {
                    return {
                        message: 'OBSERVED_LOCATION.ERROR.INVALID_LANDING',
                        details: {
                            errors: {
                                landings: errors
                            }
                        }
                    };
                }
                if (this._debug)
                    console.debug(`[observed-location-service] Control {${entity.id}} [OK] in ${Date.now() - now}ms`);
            }
            // TODO Mark local as controlled ?
            return undefined;
        });
    }
    controlAllByFilter(filter, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const maxProgression = toNumber(opts === null || opts === void 0 ? void 0 : opts.maxProgression, 100);
            opts = Object.assign(Object.assign({}, opts), { maxProgression });
            opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });
            const endProgression = opts.progression.current + maxProgression;
            // Increment
            this.progressBarService.increase();
            try {
                const { data } = yield this.loadAll(0, 1000, undefined, undefined, filter, {});
                if (isEmptyArray(data))
                    return undefined;
                const progressionStep = maxProgression / data.length / 2; // 2 steps by observed location: control, then save
                let errorsById = null;
                for (const entity of data) {
                    const errors = yield this.control(entity, Object.assign(Object.assign({}, opts), { maxProgression: progressionStep }));
                    // Control failed: save error
                    if (errors) {
                        errorsById = errorsById || {};
                        errorsById[entity.id] = errors;
                        // translate, then save normally
                        const errorMessage = this.formErrorTranslator.translateErrors(errors.details.errors, opts.translatorOptions);
                        // const errorMessage = errors.message;
                        entity.controlDate = null;
                        entity.qualificationComments = errorMessage;
                        if ((_a = opts.progression) === null || _a === void 0 ? void 0 : _a.cancelled)
                            return; // Cancel
                        // Save entity
                        yield this.save(entity);
                    }
                    // OK succeed: terminate
                    else {
                        if ((_b = opts.progression) === null || _b === void 0 ? void 0 : _b.cancelled)
                            return; // Cancel
                        // Need to exclude data that already validated (else got exception when pod control already validated data)
                        if (isNil(entity.validationDate))
                            yield this.terminate(entity);
                    }
                    // increament, after save/terminate
                    opts.progression.increment(progressionStep);
                }
                return errorsById;
            }
            catch (err) {
                console.error(err && err.message || err);
                throw err;
            }
            finally {
                this.progressBarService.decrease();
                if (opts.progression.current < endProgression) {
                    opts.progression.current = endProgression;
                }
            }
        });
    }
    synchronize(entity, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            opts = Object.assign({ enableOptimisticResponse: false }, opts);
            const localId = entity === null || entity === void 0 ? void 0 : entity.id;
            if (!EntityUtils.isLocalId(localId))
                throw new Error('Entity must be a local entity');
            if (this.network.offline)
                throw new Error('Could not synchronize if network if offline');
            // Clone (to keep original entity unchanged)
            entity = entity instanceof Entity ? entity.clone() : entity;
            entity.synchronizationStatus = 'SYNC';
            entity.id = undefined;
            const program = yield this.programRefService.loadByLabel((_a = entity.program) === null || _a === void 0 ? void 0 : _a.label);
            const useAggregatedLandings = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE);
            const targetProgramLabel = program.getProperty(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM);
            let landings = [];
            let aggregatedLandings = [];
            if (useAggregatedLandings) {
                // Load aggregated landings
                const { data } = yield this.aggregatedLandingService.loadAllByObservedLocation({ observedLocationId: localId }, { fullLoad: true, rankOrderOnPeriod: false });
                aggregatedLandings = data || [];
            }
            else {
                // Load landings
                const { data } = yield this.landingService.loadAllByObservedLocation({ observedLocationId: localId }, { fullLoad: true, rankOrderOnPeriod: false });
                landings = data || [];
            }
            // Make sure to remove landings here (will be saved AFTER observed location)
            entity.landings = undefined;
            // Get local vessels (not saved)
            const localVessels = arrayDistinct([...landings, ...aggregatedLandings].map(value => value.vesselSnapshot).filter(EntityUtils.isLocal), 'id')
                .map(VesselSnapshot.toVessel);
            if (isNotEmptyArray(localVessels)) {
                const savedVessels = new Map();
                for (const vessel of localVessels) {
                    const vesselLocalId = vessel.id;
                    const savedVessel = yield this.vesselService.synchronize(vessel);
                    savedVessels.set(vesselLocalId, VesselSnapshot.fromVessel(savedVessel));
                }
                //replace landing local vessel's by saved one
                [...landings, ...aggregatedLandings].forEach(landing => {
                    if (savedVessels.has(landing.vesselSnapshot.id)) {
                        landing.vesselSnapshot = savedVessels.get(landing.vesselSnapshot.id);
                    }
                });
            }
            try {
                entity = yield this.save(entity, Object.assign(Object.assign({}, opts), { emitEvent: false /*will emit a onSynchronize, instead of onSave */ }));
                // Check return entity has a valid id
                if (isNil(entity.id) || entity.id < 0) {
                    throw { code: DataErrorCodes.SYNCHRONIZE_ENTITY_ERROR };
                }
                if (!opts || opts.emitEvent !== false) {
                    this.onSynchronize.next({ localId, remoteEntity: entity });
                }
                // synchronize landings
                if (isNotEmptyArray(landings)) {
                    entity.landings = yield Promise.all(landings.map(landing => {
                        landing.observedLocationId = entity.id;
                        landing.location = entity.location;
                        return this.landingService.synchronize(landing);
                    }));
                }
                // Synchronize aggregated landings
                if (isNotEmptyArray(aggregatedLandings)) {
                    yield this.aggregatedLandingService.synchronizeAll(aggregatedLandings, {
                        filter: {
                            observedLocationId: entity.id,
                            startDate: entity.startDateTime,
                            endDate: entity.endDateTime || entity.startDateTime,
                            locationId: (_b = entity.location) === null || _b === void 0 ? void 0 : _b.id,
                            programLabel: targetProgramLabel
                        }
                    });
                }
            }
            catch (err) {
                throw Object.assign(Object.assign({}, err), { code: DataErrorCodes.SYNCHRONIZE_ENTITY_ERROR, message: 'ERROR.SYNCHRONIZE_ENTITY_ERROR', context: entity.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE) });
            }
            try {
                if (this._debug)
                    console.debug(`[observed-location-service] Deleting observedLocation {${entity.id}} from local storage`);
                // Delete observedLocation
                yield this.entities.deleteById(localId, { entityName: ObservedLocation.TYPENAME });
            }
            catch (err) {
                console.error(`[observed-location-service] Failed to locally delete observedLocation {${entity.id}} and its landings`, err);
                // Continue
            }
            // Clear page history
            try {
                // FIXME: find a way o clean only synchronized data ?
                yield this.settings.clearPageHistory();
            }
            catch (err) { /* Continue */ }
            return entity;
        });
    }
    hasSampleWithTagId(observedLocationIds) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check locally
            const localIds = (observedLocationIds || []).filter(EntityUtils.isLocalId);
            if (isNotEmptyArray(localIds)) {
                const hasSampleFn = (observedLocationId) => __awaiter(this, void 0, void 0, function* () {
                    const { data: landings } = yield this.landingService.loadAllByObservedLocation({ observedLocationId }, { fullLoad: false, toEntity: false, computeRankOrder: false, withTotal: false });
                    return (landings || []).some(l => l.samplesCount > 0);
                });
                const hasLocalSamples = (yield chainPromises(localIds.map(observedLocationId => () => hasSampleFn(observedLocationId))))
                    .some(has => has === true);
                if (hasLocalSamples)
                    return true;
            }
            // Check remotely
            const remoteIds = (observedLocationIds || []).filter(EntityUtils.isRemoteId);
            if (isNotEmptyArray(remoteIds)) {
                const filter = SampleFilter.fromObject({ withTagId: true, observedLocationIds: remoteIds });
                const res = yield this.graphql.query({
                    query: ObservedLocationQueries.countSamples,
                    variables: {
                        filter: filter.asPodObject()
                    },
                    error: { code: DataErrorCodes.LOAD_ENTITIES_ERROR, message: 'OBSERVED_LOCATION.ERROR.COUNT_SAMPLES_ERROR' },
                    fetchPolicy: 'network-only'
                });
                return ((res === null || res === void 0 ? void 0 : res.total) || 0) > 0;
            }
            return false;
        });
    }
    /* -- protected methods -- */
    /**
     * List of importation jobs.
     *
     * @protected
     * @param opts
     */
    getImportJobs(filter, opts) {
        var _a, _b;
        filter = filter || ((_a = this.settings.getOfflineFeature(this.featureName)) === null || _a === void 0 ? void 0 : _a.filter);
        filter = this.asFilter(filter);
        const programLabel = filter && ((_b = filter.program) === null || _b === void 0 ? void 0 : _b.label);
        const landingFilter = ObservedLocationFilter.toLandingFilter(filter);
        if (programLabel) {
            return [
                // Store program to opts, for other services (e.g. used by OperationService)
                JobUtils.defer(o => this.programRefService.loadByLabel(programLabel, { fetchPolicy: 'network-only' })
                    .then(program => {
                    opts.program = program;
                    opts.acquisitionLevels = ProgramUtils.getAcquisitionLevels(program);
                    // TODO filter on location level
                    //opts.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_OFFLINE_IMPORT_LOCATION_LEVEL_IDS);
                    // TODO filter on vessel (e.g. OBSBIO)
                })),
                ...super.getImportJobs(filter, opts),
                // Landing (historical data)
                JobUtils.defer(o => this.landingService.executeImport(landingFilter, o), opts)
            ];
        }
        else {
            return super.getImportJobs(null, opts);
        }
    }
    finishImport() {
        super.finishImport();
        // Add vessel offline feature
        this.settings.markOfflineFeatureAsSync(VESSEL_FEATURE_NAME);
    }
    updateChildrenDate(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!entity || !entity.program || !entity.program.label || !entity.startDateTime)
                return; // Skip
            const program = yield this.programRefService.loadByLabel(entity.program.label);
            const landingHasDateTime = program.getPropertyAsBoolean(ProgramProperties.LANDING_DATE_TIME_ENABLE);
            if (landingHasDateTime)
                return; // Not need to update children dates
            const now = Date.now();
            console.info('[observed-location-service] Applying date to children entities (Landing, Sample)...');
            try {
                let res;
                let offset = 0;
                const size = 10; // Use paging, to avoid loading ALL landings once
                do {
                    res = yield this.landingService.loadAll(offset, size, null, null, { observedLocationId: entity.id }, { fullLoad: true, fetchPolicy: 'no-cache' });
                    const updatedLandings = (res.data || []).map(l => {
                        if (!l.dateTime || !l.dateTime.isSame(entity.startDateTime)) {
                            l.dateTime = entity.startDateTime;
                            (l.samples || []).forEach(sample => {
                                sample.sampleDate = l.dateTime;
                            });
                            return l;
                        }
                        return undefined;
                    }).filter(isNotNil);
                    // Save landings, if need
                    if (isNotEmptyArray(updatedLandings)) {
                        yield this.landingService.saveAll(updatedLandings, { observedLocationId: entity.id, enableOptimisticResponse: false });
                    }
                    offset += size;
                } while (offset < res.total);
                console.info(`[observed-location-service] Applying date to children entities (Landing, Sample) [OK] in ${Date.now() - now}ms`);
            }
            catch (err) {
                throw Object.assign(Object.assign({}, err), { code: TripErrorCodes.UPDATE_OBSERVED_LOCATION_CHILDREN_DATE_ERROR, message: 'OBSERVED_LOCATION.ERROR.UPDATE_CHILDREN_DATE_ERROR' });
            }
        });
    }
    fillControlOptions(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            opts = yield this.fillProgramOptions(entity, opts);
            opts = Object.assign(Object.assign({}, opts), { enable: opts.program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CONTROL_ENABLE), withMeasurements: true });
            if (!opts.translatorOptions) {
                opts.translatorOptions = {
                    controlPathTranslator: {
                        translateControlPath: (path) => this.translateControlPath(path, {})
                    }
                };
            }
            return opts;
        });
    }
    fillTerminateOption(entity, opts) {
        const _super = Object.create(null, {
            fillTerminateOption: { get: () => super.fillTerminateOption }
        });
        return __awaiter(this, void 0, void 0, function* () {
            opts = yield _super.fillTerminateOption.call(this, entity, opts);
            return Object.assign({ withChildren: !opts.program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CONTROL_ENABLE) }, opts);
        });
    }
    fillValidateOption(entity, opts) {
        const _super = Object.create(null, {
            fillValidateOption: { get: () => super.fillValidateOption }
        });
        return __awaiter(this, void 0, void 0, function* () {
            opts = yield _super.fillValidateOption.call(this, entity, opts);
            return Object.assign({ withChildren: !opts.program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CONTROL_ENABLE) }, opts);
        });
    }
    showToast(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return Toasts.show(this.toastController, this.translate, opts);
        });
    }
};
ObservedLocationService = __decorate([
    Injectable({ providedIn: 'root' }),
    __param(12, Optional()),
    __param(13, Optional()),
    __metadata("design:paramtypes", [Injector,
        GraphqlService,
        AccountService,
        NetworkService,
        EntitiesStorage,
        ObservedLocationValidatorService,
        VesselService,
        LandingService,
        AggregatedLandingService,
        TrashRemoteService,
        ProgressBarService,
        FormErrorTranslator,
        TranslateService,
        ToastController])
], ObservedLocationService);
export { ObservedLocationService };
//# sourceMappingURL=observed-location.service.js.map