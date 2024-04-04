import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Injectable, Optional } from '@angular/core';
import { gql } from '@apollo/client/core';
import { combineLatest, EMPTY, from } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { AccountService, AppFormUtils, BaseGraphqlService, chainPromises, collectByProperty, DateUtils, EntitiesStorage, EntityUtils, firstNotNilPromise, FormErrorTranslator, GraphqlService, isEmptyArray, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, JobUtils, LocalSettingsService, MINIFY_ENTITY_FOR_LOCAL_STORAGE, NetworkService, PlatformService, ProgressBarService, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { MEASUREMENT_PMFM_ID_REGEXP, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { DataEntityUtils, SAVE_AS_OBJECT_OPTIONS, SERIALIZE_FOR_OPTIMISTIC_RESPONSE } from '@app/data/services/model/data-entity.model';
import { FISHING_AREAS_LOCATION_REGEXP, MINIFY_OPERATION_FOR_LOCAL_STORAGE, Operation, POSITIONS_REGEXP, Trip, VesselPositionUtils, } from '../trip/trip.model';
import { Sample } from '../sample/sample.model';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { AcquisitionLevelCodes, PmfmIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { OperationFilter } from '@app/trip/operation/operation.filter';
import { RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';
import { VesselSnapshotFragments } from '@app/referential/services/vessel-snapshot.service';
import { Metier } from '@app/referential/metier/metier.model';
import { MetierService } from '@app/referential/services/metier.service';
import { PositionUtils } from '@app/data/position/position.utils';
import { DataErrorCodes } from '@app/data/services/errors';
import { mergeLoadResult } from '@app/shared/functions';
import { TripErrorCodes } from '@app/trip/trip.errors';
import { OperationValidatorService } from '@app/trip/operation/operation.validator';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { TranslateService } from '@ngx-translate/core';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { VesselPosition } from '@app/data/position/vessel/vessel-position.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { Geometries } from '@app/shared/geometries.utils';
import { BatchService } from '@app/trip/batch/common/batch.service';
import { TRIP_LOCAL_SETTINGS_OPTIONS } from '@app/trip/trip.config';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { DataCommonFragments, DataFragments } from '@app/trip/common/data.fragments';
export const OperationFragments = {
    lightOperation: gql `fragment LightOperationFragment on OperationVO {
    id
    startDateTime
    endDateTime
    fishingStartDateTime
    fishingEndDateTime
    rankOrder
    rankOrderOnPeriod
    tripId
    comments
    hasCatch
    updateDate
    controlDate
    qualificationComments
    qualityFlagId
    physicalGearId
    physicalGear {
      id
      rankOrder
      gear {
        ...LightReferentialFragment
      }
    }
    metier {
      ...MetierFragment
    }
    recorderDepartment {
      ...LightDepartmentFragment
    }
    positions {
      ...PositionFragment
    }
    fishingAreas {
      id
      location {
        ...LocationFragment
      }
    }
    parentOperationId
    childOperationId
  }
  ${ReferentialFragments.lightDepartment}
  ${ReferentialFragments.metier}
  ${ReferentialFragments.lightReferential}
  ${DataCommonFragments.position},
  ${DataCommonFragments.location}`,
    operation: gql `
    fragment OperationFragment on OperationVO {
      id
      startDateTime
      endDateTime
      fishingStartDateTime
      fishingEndDateTime
      rankOrder
      rankOrderOnPeriod
      controlDate
      qualificationComments
      qualityFlagId
      physicalGearId
      physicalGear {
        id
        rankOrder
        gear {
          ...LightReferentialFragment
        }
      }
      tripId
      comments
      hasCatch
      updateDate
      metier {
        ...MetierFragment
      }
      recorderDepartment {
        ...LightDepartmentFragment
      }
      positions {
        ...PositionFragment
      }
      measurements {
        ...MeasurementFragment
      }
      gearMeasurements {
        ...MeasurementFragment
      }
      samples {
        ...SampleFragment
      }
      batches {
        ...BatchFragment
      }
      fishingAreas {
        ...FishingAreaFragment
      }
      parentOperationId
      childOperationId
    }
    ${ReferentialFragments.lightDepartment}
    ${ReferentialFragments.metier}
    ${ReferentialFragments.lightReferential}
    ${DataCommonFragments.position}
    ${DataCommonFragments.measurement}
    ${DataFragments.sample}
    ${DataFragments.batch}
    ${DataFragments.fishingArea}
  `,
};
export const OperationQueries = {
    // Load many operations (with total)
    loadAllWithTotal: gql `query Operations($filter: OperationFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $pmfmIds: [Int]){
    data: operations(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightOperationFragment
      measurements(pmfmIds: $pmfmIds) {
        ...MeasurementFragment
      }
    }
    total: operationsCount(filter: $filter)
  }
  ${OperationFragments.lightOperation}
  ${DataCommonFragments.measurement}`,
    loadAllWithTripAndTotal: gql `query Operations($filter: OperationFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: operations(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightOperationFragment
      trip {
        id
        program {
          id
          label
        }
        departureDateTime
        returnDateTime
        creationDate
        updateDate
        controlDate
        validationDate
        qualificationDate
        qualityFlagId
        comments
        departureLocation {
          ...LocationFragment
        }
        returnLocation {
          ...LocationFragment
        }
        vesselSnapshot {
          ...LightVesselSnapshotFragment
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
    }
    total: operationsCount(filter: $filter)
  }
  ${OperationFragments.lightOperation}
  ${DataCommonFragments.location}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${DataCommonFragments.referential}`,
    // Load many operations
    loadAll: gql `query Operations($filter: OperationFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: operations(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightOperationFragment
    }
  }
  ${OperationFragments.lightOperation}`,
    // Load one
    load: gql `query Operation($id: Int!) {
    data: operation(id: $id) {
      ...OperationFragment
    }
  }
  ${OperationFragments.operation}`,
    // Load one light
    loadLight: gql `query Operation($id: Int!) {
    data: operation(id: $id) {
      ...LightOperationFragment
    }
  }
  ${OperationFragments.lightOperation}`
};
const OperationMutations = {
    // Save many operations
    saveAll: gql `mutation saveOperations($data:[OperationVOInput]!) {
    data: saveOperations(operations: $data){
      ...OperationFragment
    }
  }
  ${OperationFragments.operation}`,
    // Delete many operations
    deleteAll: gql `mutation deleteOperations($ids:[Int]!) {
    deleteOperations(ids: $ids)
  }`,
    terminate: gql `mutation controlOperation($data:OperationVOInput!) {
    data: controlOperation(operation: $data) {
      ...OperationFragment
    }
  }
  ${OperationFragments.operation}`
};
const OperationSubscriptions = {
    listenChanges: gql `subscription UpdateOperation($id: Int!, $interval: Int){
    data: updateOperation(id: $id, interval: $interval) {
      ...LightOperationFragment
    }
  }
  ${OperationFragments.lightOperation}`
};
let OperationService = class OperationService extends BaseGraphqlService {
    constructor(graphql, network, platform, accountService, settings, metierService, entities, validatorService, batchService, progressBarService, programRefService, translate, formErrorTranslator, geolocation) {
        super(graphql, environment);
        this.graphql = graphql;
        this.network = network;
        this.platform = platform;
        this.accountService = accountService;
        this.settings = settings;
        this.metierService = metierService;
        this.entities = entities;
        this.validatorService = validatorService;
        this.batchService = batchService;
        this.progressBarService = progressBarService;
        this.programRefService = programRefService;
        this.translate = translate;
        this.formErrorTranslator = formErrorTranslator;
        this.geolocation = geolocation;
        this.loading = false;
        this._mutableWatchQueriesMaxCount = 3;
        this._watchQueriesUpdatePolicy = 'update-cache';
        this._logPrefix = '[operation-service] ';
        // -- For DEV only
        this._debug = !environment.production;
    }
    set tripService(value) {
        this._tripService = value;
    }
    get tripService() {
        return this._tripService;
    }
    loadAll(offset, size, sortBy, sortDirection, dataFilter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return firstNotNilPromise(this.watchAll(offset, size, sortBy, sortDirection, dataFilter, opts));
        });
    }
    loadAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts) {
        return firstNotNilPromise(this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts));
    }
    loadAllByTrip(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return firstNotNilPromise(this.watchAllByTrip(filter, opts));
        });
    }
    watchAllByTrip(filter, opts) {
        return this.watchAll(0, -1, null, null, filter, opts);
    }
    /**
     * Load many operations
     *
     * @param offset
     * @param size
     * @param sortBy
     * @param sortDirection
     * @param dataFilter
     * @param opts
     */
    watchAll(offset, size, sortBy, sortDirection, dataFilter, opts) {
        const forceOffline = this.network.offline || (dataFilter && dataFilter.tripId < 0);
        const offline = forceOffline || (opts === null || opts === void 0 ? void 0 : opts.withOffline) || false;
        const online = !forceOffline;
        // When filtering in data quality status, avoid to compute rankOrder
        if (isNotNil(dataFilter === null || dataFilter === void 0 ? void 0 : dataFilter.dataQualityStatus)) {
            opts = Object.assign(Object.assign({}, opts), { computeRankOrder: false });
        }
        // If we have both online and offline, watch all options has to be apply when all results are merged
        let tempOpts = opts;
        if (offline && online) {
            tempOpts = Object.assign(Object.assign({}, opts), { mapFn: undefined, toEntity: false, computeRankOrder: false, sortByDistance: false });
        }
        const offline$ = offline && this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, tempOpts);
        const online$ = online && this.watchAllRemotely(offset, size, sortBy, sortDirection, dataFilter, tempOpts);
        // Merge local and remote
        if (offline$ && online$) {
            return combineLatest([offline$, online$])
                .pipe(map(([res1, res2]) => mergeLoadResult(res1, res2)), mergeMap(({ data, total }) => this.applyWatchOptions({ data, total }, offset, size, sortBy, sortDirection, dataFilter, opts)));
        }
        return offline$ || online$;
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(id))
                throw new Error('Missing argument \'id\' ');
            const now = this._debug && Date.now();
            if (this._debug)
                console.debug(`[operation-service] Loading operation #${id}...`);
            this.loading = true;
            try {
                let json;
                // Load locally
                if (id < 0) {
                    json = yield this.entities.load(id, Operation.TYPENAME, opts);
                    if (!json)
                        throw { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' };
                }
                // Load from pod
                else {
                    const query = (opts === null || opts === void 0 ? void 0 : opts.query) || (opts && opts.fullLoad === false ? OperationQueries.loadLight : OperationQueries.load);
                    const res = yield this.graphql.query({
                        query,
                        variables: { id },
                        error: { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' },
                        fetchPolicy: opts && opts.fetchPolicy || undefined
                    });
                    json = res && res.data;
                }
                // Transform to entity
                const data = (!opts || opts.toEntity !== false)
                    ? Operation.fromObject(json)
                    : json;
                if (data && this._debug)
                    console.debug(`[operation-service] Operation #${id} loaded in ${Date.now() - now}ms`, data);
                return data;
            }
            finally {
                this.loading = false;
            }
        });
    }
    canUserWrite(data, opts) {
        const trip = opts === null || opts === void 0 ? void 0 : opts.trip;
        if (!trip)
            throw new Error('Missing required \'opts.trip\' argument');
        return !!data && trip && this.tripService.canUserWrite(trip, { program: opts === null || opts === void 0 ? void 0 : opts.program });
    }
    controlAllByTrip(trip, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const maxProgression = toNumber(opts === null || opts === void 0 ? void 0 : opts.maxProgression, 100);
            opts = Object.assign(Object.assign({}, opts), { maxProgression });
            opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });
            const endProgression = opts.progression.current + maxProgression;
            // Increment
            this.progressBarService.increase();
            try {
                // Load all (light) operations
                const { data } = yield this.loadAllByTrip({ tripId: trip.id }, { computeRankOrder: false, fullLoad: false, toEntity: false });
                if (isEmptyArray(data))
                    return undefined; // Skip if empty
                // Prepare control options
                opts = yield this.fillControlOptionsForTrip(trip.id, Object.assign({ trip }, opts));
                const progressionStep = maxProgression / data.length / 2; // 2 steps by operation: control, then save
                let errorsById = null;
                // For each entity
                for (let entity of data) {
                    // Load full entity
                    entity = yield this.load(entity.id);
                    const errors = yield this.control(entity, Object.assign(Object.assign({}, opts), { maxProgression: progressionStep }));
                    // Control failed: save error
                    if (errors) {
                        errorsById = errorsById || {};
                        errorsById[entity.id] = errors;
                        // translate, then save normally
                        const errorMessage = this.formErrorTranslator.translateErrors(errors, opts.translatorOptions);
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
    /**
     * Control the validity of an operation
     *
     * @param entity
     * @param opts
     */
    control(entity, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const maxProgression = toNumber(opts === null || opts === void 0 ? void 0 : opts.maxProgression, 100);
            opts = Object.assign(Object.assign({}, opts), { maxProgression });
            opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });
            const progressionStep = maxProgression / 3; // 3 steps: operation control, control batches, and save
            const incrementProgression = () => opts.progression.increment(progressionStep);
            const now = this._debug && Date.now();
            if (this._debug)
                console.debug(`[operation-service] Control #${entity.id}...`, entity);
            // Fill options (trip, program, pmfms, etc. )
            opts = yield this.fillControlOptionsForOperation(entity, opts);
            // Create validator
            const form = this.validatorService.getFormGroup(entity, opts);
            if (!form.valid) {
                // Wait end of validation (e.g. async validators)
                yield AppFormUtils.waitWhilePending(form);
                // Get form errors
                if (form.invalid) {
                    const errors = AppFormUtils.getFormErrors(form);
                    console.info(`[operation-service] Control #${entity.id} [INVALID] in ${Date.now() - now}ms`, errors);
                    incrementProgression(); // Increment progression
                    return errors;
                }
            }
            incrementProgression(); // Increment progression
            let dirty = false;
            // Control batches (skip if abnormal operation)
            if (!entity.abnormal && entity.catchBatch && (opts === null || opts === void 0 ? void 0 : opts.program)) {
                const hasIndividualMeasures = MeasurementUtils.asBooleanValue(entity.measurements, PmfmIds.HAS_INDIVIDUAL_MEASURES);
                const physicalGear = (_a = entity.physicalGear) === null || _a === void 0 ? void 0 : _a.clone();
                const wasInvalid = BatchUtils.isInvalid(entity.catchBatch);
                // Control batches
                const errors = yield this.batchService.control(entity.catchBatch, {
                    program: opts.program,
                    allowSamplingBatches: hasIndividualMeasures,
                    physicalGear,
                    gearId: (_b = physicalGear === null || physicalGear === void 0 ? void 0 : physicalGear.gear) === null || _b === void 0 ? void 0 : _b.id,
                    controlName: 'catch',
                    isOnFieldMode: opts.isOnFieldMode,
                    progression: opts.progression,
                    maxProgression: progressionStep
                });
                if (errors) {
                    yield this.save(entity);
                }
                else {
                    // Mark as dirty, if invalid changed
                    dirty = (wasInvalid !== BatchUtils.isInvalid(entity.catchBatch));
                }
                incrementProgression();
                if (errors) {
                    console.info(`[operation-service] Control operation {${entity.id}} catch batch  [INVALID] in ${Date.now() - now}ms`, errors);
                    // Keep only a simple error message
                    // Detail error should have been saved into batch
                    return { catch: { invalidOrIncomplete: true } };
                }
            }
            console.info(`[operation-service] Control operation {${entity.id}} [OK] in ${Date.now() - now}ms`);
            // Mark local operation has controlled (to have a checkmark icon in the operation table)
            if (entity.tripId < 0) {
                DataEntityUtils.markAsControlled(entity);
                dirty = true;
            }
            if (dirty)
                yield this.save(entity);
            return undefined;
        });
    }
    terminate(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            // Clean error
            entity.qualificationComments = null;
            // Flag anormal operation
            const isAnormalOperation = entity.measurements
                .some(m => m.pmfmId === PmfmIds.TRIP_PROGRESS && m.numericalValue === 0 /*normal = false*/);
            if (isAnormalOperation && entity.qualityFlagId === QualityFlagIds.NOT_QUALIFIED) {
                entity.qualityFlagId = QualityFlagIds.BAD;
                entity.qualificationComments = entity.comments;
            }
            // Save locally if need
            if (entity.tripId < 0) {
                entity.controlDate = entity.controlDate || DateUtils.moment();
                return this.saveLocally(entity);
            }
            const json = this.asObject(entity);
            // Or save remotely (using a specific mutation)
            yield this.graphql.mutate({
                mutation: OperationMutations.terminate,
                variables: {
                    data: json
                },
                error: { code: DataErrorCodes.CONTROL_ENTITY_ERROR, message: 'ERROR.CONTROL_ENTITY_ERROR' },
                update: (cache, { data }) => {
                    const savedEntity = data && data.data;
                    // Update (id and updateDate, and controlDate)
                    EntityUtils.copyIdAndUpdateDate(savedEntity, entity);
                    DataEntityUtils.copyControlDate(savedEntity, entity);
                    // Reset qualification comments, if clean by pod
                    DataEntityUtils.copyQualificationDateAndFlag(savedEntity, entity);
                }
            });
            return entity;
        });
    }
    qualify(data, qualityFlagId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.warn('[operation-service] qualify() not implemented yet !');
            return data;
        });
    }
    delete(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteAll([data]);
        });
    }
    listenChanges(id, opts) {
        if (isNil(id))
            throw new Error('Missing argument \'id\' ');
        // Skip listening local operation (should not be need)
        if (EntityUtils.isLocalId(id)) {
            return EMPTY;
        }
        if (this._debug)
            console.debug(`[operation-service] [WS] Listening changes for operation {${id}}...`);
        return this.graphql.subscribe({
            query: OperationSubscriptions.listenChanges,
            fetchPolicy: opts && opts.fetchPolicy || undefined,
            variables: { id, interval: toNumber(opts && opts.interval, 10) },
            error: {
                code: DataErrorCodes.SUBSCRIBE_ENTITY_ERROR,
                message: 'ERROR.SUBSCRIBE_ENTITY_ERROR'
            }
        })
            .pipe(map(({ data }) => {
            const entity = data && Operation.fromObject(data);
            if (entity && this._debug)
                console.debug(`[operation-service] Operation {${id}} updated on server!`, entity);
            return entity;
        }));
    }
    /**
     * Save many operations
     *
     * @param entities
     * @param opts
     */
    saveAll(entities, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(entities))
                return entities;
            if (this._debug)
                console.debug(`[operation-service] Saving ${entities.length} operations...`);
            const jobsFactories = (entities || []).map(entity => () => this.save(entity, Object.assign({}, opts)));
            return chainPromises(jobsFactories);
        });
    }
    /**
     * Save an operation
     *
     * @param entity
     * @param opts
     */
    save(entity, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // If parent is a local entity: force to save locally
            const tripId = toNumber(entity.tripId, opts && (opts.tripId || ((_a = opts.trip) === null || _a === void 0 ? void 0 : _a.id)));
            if (tripId < 0) {
                return yield this.saveLocally(entity, opts);
            }
            const now = Date.now();
            // Fill default properties (as recorder department and person)
            this.fillDefaultProperties(entity, opts);
            // If new, create a temporary if (for offline mode)
            const isNew = isNil(entity.id);
            // Transform into json
            const json = this.asObject(entity, SAVE_AS_OBJECT_OPTIONS);
            if (this._debug)
                console.debug('[operation-service] Saving operation remotely...', json);
            yield this.graphql.mutate({
                mutation: OperationMutations.saveAll,
                variables: {
                    data: [json]
                },
                error: { code: DataErrorCodes.SAVE_ENTITIES_ERROR, message: 'ERROR.SAVE_ENTITIES_ERROR' },
                offlineResponse: (context) => __awaiter(this, void 0, void 0, function* () {
                    // Make sure to fill id, with local ids
                    yield this.fillOfflineDefaultProperties(entity);
                    // For the query to be tracked (see tracked query link) with a unique serialization key
                    context.tracked = (entity.tripId >= 0);
                    if (isNotNil(entity.id))
                        context.serializationKey = `${Operation.TYPENAME}:${entity.id}`;
                    return { data: [this.asObject(entity, SERIALIZE_FOR_OPTIMISTIC_RESPONSE)] };
                }),
                refetchQueries: this.getRefetchQueriesForMutation(opts),
                awaitRefetchQueries: opts && opts.awaitRefetchQueries,
                update: (cache, { data }) => __awaiter(this, void 0, void 0, function* () {
                    const savedEntity = data && data.data && data.data[0];
                    // Local entity (from an optimistic response): save it
                    if (savedEntity.id < 0) {
                        if (this._debug)
                            console.debug('[operation-service] [offline] Saving operation locally...', savedEntity);
                        // Save response locally
                        yield this.entities.save(savedEntity.asObject(MINIFY_ENTITY_FOR_LOCAL_STORAGE));
                    }
                    // Update the entity and update GraphQL cache
                    else {
                        // Remove existing entity from the local storage
                        if (entity.id < 0 && savedEntity.updateDate) {
                            yield this.entities.delete(entity);
                        }
                        // Copy id and update Date
                        this.copyIdAndUpdateDate(savedEntity, entity);
                        // Reset qualification comments, if clean by pod
                        DataEntityUtils.copyControlDate(savedEntity, entity);
                        DataEntityUtils.copyQualificationDateAndFlag(savedEntity, entity);
                        // Copy gear
                        if (savedEntity.metier && !savedEntity.metier.gear) {
                            savedEntity.metier.gear = savedEntity.metier.gear || (entity.physicalGear && entity.physicalGear.gear && entity.physicalGear.gear.asObject());
                        }
                        // Update parent/child operation
                        if (opts === null || opts === void 0 ? void 0 : opts.updateLinkedOperation) {
                            yield this.updateLinkedOperation(entity, opts);
                        }
                        if (isNew && this._watchQueriesUpdatePolicy === 'update-cache') {
                            this.insertIntoMutableCachedQueries(cache, {
                                queryNames: this.getLoadQueryNames(),
                                data: savedEntity
                            });
                        }
                        if (opts && opts.update) {
                            opts.update(cache, { data });
                        }
                        if (this._debug)
                            console.debug(`[operation-service] Operation saved in ${Date.now() - now}ms`, entity);
                    }
                })
            });
            return entity;
        });
    }
    /**
     * Save many operations
     *
     * @param entities
     * @param opts
     */
    deleteAll(entities, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Delete local entities
            const localEntities = entities === null || entities === void 0 ? void 0 : entities.filter(EntityUtils.isLocal);
            if (isNotEmptyArray(localEntities)) {
                return this.deleteAllLocally(localEntities, opts);
            }
            // Get remote ids, then delete remotely
            const remoteEntities = (entities || []).filter(EntityUtils.isRemote);
            if (isNotEmptyArray(remoteEntities)) {
                const ids = remoteEntities.map(e => e.id);
                const now = Date.now();
                if (this._debug)
                    console.debug('[operation-service] Deleting operations... ids:', ids);
                yield this.graphql.mutate({
                    mutation: OperationMutations.deleteAll,
                    variables: { ids },
                    refetchQueries: this.getRefetchQueriesForMutation(opts),
                    awaitRefetchQueries: opts && opts.awaitRefetchQueries,
                    update: (cache, res) => {
                        // Remove from cached queries
                        if (this._watchQueriesUpdatePolicy === 'update-cache') {
                            this.removeFromMutableCachedQueriesByIds(cache, {
                                queryNames: this.getLoadQueryNames(),
                                ids
                            });
                        }
                        if (opts && opts.update) {
                            opts.update(cache, res);
                        }
                        if (this._debug)
                            console.debug(`[operation-service] Operations deleted in ${Date.now() - now}ms`);
                    }
                });
            }
        });
    }
    deleteAllLocally(entities, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get local ids
            const localIds = entities.map(e => e.id).filter(id => id < 0);
            if (isEmptyArray(localIds))
                return; // Skip if empty
            const parentOperationIds = entities.filter(o => o.parentOperation || o.parentOperationId)
                .map(o => o.parentOperation && o.parentOperation.id || o.parentOperationId);
            if (parentOperationIds && parentOperationIds.length > 0) {
                yield this.removeChildOperationLocally(parentOperationIds);
            }
            const trash = !opts || opts.trash !== false;
            if (this._debug)
                console.debug(`[operation-service] Deleting local operations... {trash: ${trash}}`);
            if (trash) {
                yield this.entities.moveManyToTrash(localIds, { entityName: Operation.TYPENAME });
            }
            else {
                yield this.entities.deleteMany(localIds, { entityName: Operation.TYPENAME });
            }
        });
    }
    /**
     * Delete many operation locally (from the entity storage)
     *
     * @param filter
     */
    deleteAllLocallyByFilter(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check filter, to avoid too many deletion, of local operations
            if (!filter || (isNil(filter.tripId) && (isEmptyArray(filter.includedIds) || !filter.includedIds.some(id => id < 0)))) {
                throw new Error('Missing arguments \'filter.tripId\' or \'filter.includedIds\' with only includedIds > 0');
            }
            const dataFilter = this.asFilter(filter);
            try {
                // Find operations to delete
                const { data } = yield this.entities.loadAll(Operation.TYPENAME, {
                    filter: dataFilter.asFilterFn()
                }, { fullLoad: false });
                const parentOperationIds = (data || []).filter(o => o.parentOperation || o.parentOperationId)
                    .map(o => o.parentOperation && o.parentOperation.id || o.parentOperationId);
                if (parentOperationIds && parentOperationIds.length > 0) {
                    yield this.removeChildOperationLocally(parentOperationIds);
                }
                const ids = (data || []).map(o => o.id);
                if (isEmptyArray(ids))
                    return undefined; // Skip
                // Apply deletion
                return yield this.entities.deleteMany(ids, { entityName: Operation.TYPENAME });
            }
            catch (err) {
                console.error(`[operation-service] Failed to delete operations ${JSON.stringify(filter)}`, err);
                throw err;
            }
        });
    }
    /**
     * Load many remote operations
     *
     * @param offset
     * @param size
     * @param sortBy
     * @param sortDirection
     * @param dataFilter
     * @param opts
     */
    watchAllRemotely(offset, size, sortBy, sortDirection, dataFilter, opts) {
        if (!dataFilter || (isNil(dataFilter.tripId) && isNil(dataFilter.programLabel))) {
            console.warn('[operation-service] Trying to load operations without \'filter.tripId\' or \'filter.programLabel\'. Skipping.');
            return EMPTY;
        }
        if (opts && opts.fullLoad) {
            throw new Error('Loading full operation (opts.fullLoad) is only available for local trips');
        }
        dataFilter = this.asFilter(dataFilter);
        const variables = {
            offset: offset || 0,
            size: size >= 0 ? size : 1000,
            sortBy: (sortBy !== 'id' && sortBy) || (opts && opts.trash ? 'updateDate' : 'endDateTime'),
            sortDirection: sortDirection || (opts && opts.trash ? 'desc' : 'asc'),
            trash: opts && opts.trash || false,
            filter: dataFilter.asPodObject(),
            pmfmIds: [PmfmIds.TRIP_PROGRESS]
        };
        let now = this._debug && Date.now();
        if (this._debug)
            console.debug('[operation-service] Loading operations... using options:', variables);
        const withTotal = !opts || opts.withTotal !== false;
        const query = (opts === null || opts === void 0 ? void 0 : opts.query) || (withTotal ? OperationQueries.loadAllWithTotal : OperationQueries.loadAll);
        const mutable = (!opts || opts.mutable !== false) && ((opts === null || opts === void 0 ? void 0 : opts.fetchPolicy) !== 'no-cache');
        const result$ = mutable
            ? this.mutableWatchQuery({
                queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
                query,
                arrayFieldName: 'data',
                totalFieldName: withTotal ? 'total' : undefined,
                insertFilterFn: dataFilter.asFilterFn(),
                variables,
                error: { code: DataErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
                fetchPolicy: opts && opts.fetchPolicy || 'cache-and-network'
            })
            : from(this.graphql.query({
                query,
                variables,
                error: { code: DataErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
                fetchPolicy: (opts && opts.fetchPolicy) || 'no-cache'
            }));
        return result$
            .pipe(
        // Skip update during load()
        //tap(() => this.loading && console.debug('SKIP loading OP')),
        filter(() => !this.loading), mergeMap(({ data, total }) => __awaiter(this, void 0, void 0, function* () {
            if (now) {
                console.debug(`[operation-service] Loaded ${data.length} operations in ${Date.now() - now}ms`);
                now = undefined;
            }
            return yield this.applyWatchOptions({ data, total }, offset, size, sortBy, sortDirection, dataFilter, opts);
        })));
    }
    /**
     * Watch many local operations
     */
    watchAllLocally(offset, size, sortBy, sortDirection, filter, opts) {
        if (!filter || (isNil(filter.tripId) && isNil(filter.programLabel) && isNil(filter.vesselId) && isEmptyArray(filter.includedIds))) {
            console.warn('[operation-service] Trying to load operations without filter \'tripId\', \'programLabel\', \'vesselId\' or \'includedIds\'. Skipping.');
            return EMPTY;
        }
        if (filter.tripId >= 0)
            throw new Error('Invalid \'filter.tripId\': must be a local ID (id<0)!');
        filter = this.asFilter(filter);
        const variables = {
            offset: offset || 0,
            size: size >= 0 ? size : 1000,
            sortBy: (sortBy !== 'id' && sortBy) || (opts && opts.trash ? 'updateDate' : 'endDateTime'),
            sortDirection: sortDirection || (opts && opts.trash ? 'desc' : 'asc'),
            trash: opts && opts.trash || false,
            filter: filter.asFilterFn()
        };
        if (this._debug)
            console.debug('[operation-service] Loading operations locally... using options:', variables);
        return this.entities.watchAll(Operation.TYPENAME, variables, { fullLoad: opts && opts.fullLoad })
            .pipe(mergeMap(({ data, total }) => __awaiter(this, void 0, void 0, function* () { return yield this.applyWatchOptions({ data, total }, offset, size, sortBy, sortDirection, filter, opts); })));
    }
    loadPracticedMetier(offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const online = !(this.network.offline && (!opts || opts.fetchPolicy !== 'network-only'));
            if (online) {
                return this.metierService.loadAll(offset, size, sortBy, sortDirection, filter, opts);
            }
            const { data, total } = yield firstNotNilPromise(this.watchAllLocally(offset, size, sortBy, sortDirection, {
                vesselId: filter.vesselId,
                startDate: filter.startDate,
                endDate: filter.endDate,
                gearIds: filter.gearIds,
                programLabel: filter.programLabel
            }, {
                toEntity: false,
                fullLoad: false,
                withTotal: opts === null || opts === void 0 ? void 0 : opts.withTotal
            }));
            const useChildAttributes = filter && (filter.searchJoin === 'TaxonGroup' || filter.searchJoin === 'Gear') ? filter.searchJoin : undefined;
            const entities = (data || []).map(source => source.metier)
                .filter((metier, i, res) => res.findIndex(m => m.id === metier.id) === i)
                .map(metier => Metier.fromObject(metier, { useChildAttributes }));
            return { data: entities, total };
        });
    }
    /**
     * Compute rank order of the given operation. This function will load all operations, to compute the rank order.
     * Please use opts={fetchPolicy: 'cache-first'} when possible
     *
     * @param source
     * @param opts
     */
    computeRankOrder(source, opts) {
        return this.watchRankOrder(source, opts)
            .pipe(first())
            .toPromise();
    }
    /**
     * Compute rank order of the operation
     *
     * @param source
     * @param opts
     */
    watchRankOrder(source, opts) {
        console.debug(`[operation-service] Loading rankOrder of operation #${source.id}...`);
        const tripId = source.tripId;
        return this.watchAllByTrip({ tripId }, Object.assign({ fetchPolicy: 'cache-first', fullLoad: false, withSamples: false, withBatchTree: false, mutable: false }, opts))
            .pipe(map(res => {
            const existingOperation = (res && res.data || []).find(o => o.id === source.id);
            return existingOperation ? existingOperation.rankOrder : null;
        }));
    }
    asFilter(source) {
        return OperationFilter.fromObject(source);
    }
    /**
     * Get the position by geo loc sensor
     */
    getCurrentPosition(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const timeout = (options === null || options === void 0 ? void 0 : options.timeout)
                || this.settings.getPropertyAsInt(TRIP_LOCAL_SETTINGS_OPTIONS.OPERATION_GEOLOCATION_TIMEOUT) * 1000;
            const maximumAge = (options === null || options === void 0 ? void 0 : options.maximumAge) || timeout * 2;
            return PositionUtils.getCurrentPosition(this.platform, Object.assign({ maximumAge,
                timeout, enableHighAccuracy: false }, options));
        });
    }
    executeImport(filter, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const maxProgression = opts && opts.maxProgression || 100;
            // Load program
            const program = (opts === null || opts === void 0 ? void 0 : opts.program) || ((filter === null || filter === void 0 ? void 0 : filter.programLabel) && (yield this.programRefService.loadByLabel(filter.programLabel)));
            const allowParentOperation = program && program.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION);
            // No parent/child operation: skip (offline mode not need any historical data)
            if (!program || !allowParentOperation) {
                if (opts === null || opts === void 0 ? void 0 : opts.progression)
                    opts.progression.next(maxProgression);
                console.debug(`${this._logPrefix}Importing operation: disabled by program. Skipping`);
                return;
            }
            filter = Object.assign(Object.assign({ 
                // Can be overwriting by filter
                startDate: DateUtils.moment().add(-15, 'day') }, filter), { 
                // Fixed values
                qualityFlagId: QualityFlagIds.NOT_COMPLETED, excludeChildOperation: true, hasNoChildOperation: true });
            const programLabel = program === null || program === void 0 ? void 0 : program.label;
            console.info(`[operation-service] Importing parent operations, from program '${programLabel}'...`);
            const res = yield JobUtils.fetchAllPages((offset, size) => this.loadAll(offset, size, 'id', null, filter, {
                fetchPolicy: 'no-cache',
                withTotal: (offset === 0),
                toEntity: false,
                computeRankOrder: false,
                query: OperationQueries.loadAllWithTripAndTotal
            }), {
                progression: opts === null || opts === void 0 ? void 0 : opts.progression,
                maxProgression: maxProgression * 0.9,
                logPrefix: this._logPrefix,
                fetchSize: 100
            });
            // Collected ids
            const importedOperations = (res === null || res === void 0 ? void 0 : res.data) || [];
            const importedIds = importedOperations.map(ope => +ope.id);
            // Find data imported previously, that not exists in new imported data
            // Make sure to filter on the filter program (to keep other ope)
            const unusedRemoteOperations = (_a = (yield this.entities.loadAll(Operation.TYPENAME, {
                filter: (ope) => EntityUtils.isRemoteId(ope.id) && !importedIds.includes(+ope.id)
                    && (!ope.programLabel || ope.programLabel === programLabel) // /!\ keep other program
            }, { fullLoad: false }))) === null || _a === void 0 ? void 0 : _a.data;
            // Remove from the local storage
            if (unusedRemoteOperations === null || unusedRemoteOperations === void 0 ? void 0 : unusedRemoteOperations.length) {
                const ids = unusedRemoteOperations.map(o => +o.id);
                yield this.entities.deleteMany(ids, { entityName: Operation.TYPENAME, emitEvent: false });
            }
            if (isNotEmptyArray(res === null || res === void 0 ? void 0 : res.data)) {
                // Patch imported operations (add some attribute from the trip)
                const operationsByTripId = collectByProperty(importedOperations, 'tripId');
                yield chainPromises(Object.keys(operationsByTripId).map(tripId => () => __awaiter(this, void 0, void 0, function* () {
                    const trip = yield this._tripService.load(+tripId, { fullLoad: false, fetchPolicy: 'cache-first', toEntity: false });
                    operationsByTripId[tripId].forEach(o => {
                        var _a;
                        o.vesselId = (_a = trip.vesselSnapshot) === null || _a === void 0 ? void 0 : _a.id;
                        o.programLabel = trip.program.label;
                        o.trip = {
                            id: trip.id,
                            departureDateTime: trip.departureDateTime,
                            returnDateTime: trip.returnDateTime,
                            vesselSnapshot: trip.vesselSnapshot
                        };
                    });
                })));
                // Save result locally
                yield this.entities.saveAll(res.data, { entityName: Operation.TYPENAME, reset: false /* /!\ keep local operations */ });
                console.info(`[operation-service] Successfully import ${res.data.length} parent operations, from program '${programLabel}'`);
            }
        });
    }
    /**
     * Save many operations
     *
     * @param entities
     * @param opts
     */
    saveAllLocally(entities, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(entities))
                return entities;
            if (this._debug)
                console.debug(`[operation-service] Saving locally ${entities.length} operations...`);
            const jobsFactories = (entities || []).map(entity => () => this.saveLocally(entity, Object.assign({}, opts)));
            return chainPromises(jobsFactories);
        });
    }
    /**
     * Save an operation on the local storage
     *
     * @param entity
     * @param opts
     */
    saveLocally(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (entity.tripId >= 0 && entity.qualityFlagId !== QualityFlagIds.NOT_COMPLETED)
                throw new Error('Must be a local entity');
            // Fill default properties (as recorder department and person)
            this.fillDefaultProperties(entity, opts);
            // Make sure to fill id, with local ids
            yield this.fillOfflineDefaultProperties(entity, opts);
            const json = this.asObject(entity, MINIFY_OPERATION_FOR_LOCAL_STORAGE);
            if (this._debug)
                console.debug('[operation-service] [offline] Saving operation locally...', json);
            // Save response locally
            yield this.entities.save(json);
            // Update parent/child operation
            if (opts === null || opts === void 0 ? void 0 : opts.updateLinkedOperation) {
                try {
                    yield this.updateLinkedOperation(entity, opts);
                }
                catch (err) {
                    // Child not exists anymore
                    if ((err === null || err === void 0 ? void 0 : err.code) === TripErrorCodes.CHILD_OPERATION_NOT_FOUND) {
                        // Remove link to child operation, then save
                        entity.childOperationId = null;
                        entity.childOperation = null;
                        entity.qualityFlagId = QualityFlagIds.NOT_COMPLETED;
                        json.childOperationId = null;
                        json.childOperation = null;
                        json.qualityFlagId = QualityFlagIds.NOT_COMPLETED;
                        yield this.entities.save(json);
                    }
                    else if ((err === null || err === void 0 ? void 0 : err.code) === TripErrorCodes.PARENT_OPERATION_NOT_FOUND) {
                        console.error('[operation-service] [offline] Cannot found the parent operation: ' + (err && err.message || err), err);
                    }
                    else {
                        console.error('[operation-service] [offline] Cannot update linked operation: ' + (err && err.message || err), err);
                    }
                }
            }
            return entity;
        });
    }
    updateLinkedOperation(entity, opts) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            //console.debug('[operation-service] Updating linked operation of op #' + entity.id);
            // Update the child operation
            const childOperationId = toNumber((_a = entity.childOperation) === null || _a === void 0 ? void 0 : _a.id, entity.childOperationId);
            if (isNotNil(childOperationId)) {
                const cachedChild = isNotNil((_b = entity.childOperation) === null || _b === void 0 ? void 0 : _b.id) ? entity.childOperation : undefined;
                let child = cachedChild || (yield this.load(childOperationId));
                const needUpdateChild = 
                // Check dates
                !entity.startDateTime.isSame(child.startDateTime)
                    || (entity.fishingStartDateTime && !entity.fishingStartDateTime.isSame(child.fishingStartDateTime))
                    // Check positions
                    || (entity.startPosition && !entity.startPosition.isSamePoint(child.startPosition))
                    || (entity.fishingStartPosition && !entity.fishingStartPosition.isSamePoint(child.fishingStartPosition));
                // Update the child operation, if need
                if (needUpdateChild) {
                    console.info('[operation-service] Updating child operation...');
                    // Replace cached entity by a full entity
                    if (child === cachedChild) {
                        try {
                            child = yield this.load(childOperationId);
                        }
                        catch (err) {
                            // Child not exists
                            if (err.code === DataErrorCodes.LOAD_ENTITY_ERROR) {
                                throw { code: TripErrorCodes.CHILD_OPERATION_NOT_FOUND, message: err.message };
                            }
                            throw err;
                        }
                    }
                    // Update the child
                    child.parentOperationId = entity.id;
                    child.startDateTime = entity.startDateTime;
                    child.fishingStartDateTime = entity.fishingStartDateTime;
                    if (entity.startPosition && isNotNil(entity.startPosition.id)) {
                        child.startPosition = child.startPosition || new VesselPosition();
                        child.startPosition.copyPoint(entity.startPosition);
                    }
                    else {
                        child.startPosition = undefined;
                    }
                    if (entity.fishingStartPosition && isNotNil(entity.fishingStartPosition.id)) {
                        child.fishingStartPosition = child.fishingStartPosition || new VesselPosition();
                        child.fishingStartPosition.copyPoint(entity.fishingStartPosition);
                    }
                    else {
                        child.fishingStartPosition = undefined;
                    }
                    child.updateDate = entity.updateDate;
                    const savedChild = yield this.save(child, Object.assign(Object.assign({}, opts), { updateLinkedOperation: false }));
                    // Update the cached entity
                    if (cachedChild) {
                        cachedChild.startDateTime = savedChild.startDateTime;
                        cachedChild.fishingStartDateTime = savedChild.fishingStartDateTime;
                        cachedChild.updateDate = savedChild.updateDate;
                    }
                }
            }
            else {
                // Update the parent operation (only if parent is a local entity)
                const parentOperationId = toNumber((_c = entity.parentOperation) === null || _c === void 0 ? void 0 : _c.id, entity.parentOperationId);
                if (isNotNil(parentOperationId)) {
                    const cachedParent = entity.parentOperation;
                    let parent = cachedParent || (yield this.load(parentOperationId, { fetchPolicy: 'cache-only' }));
                    let savedParent;
                    if (parent && parent.childOperationId !== entity.id) {
                        console.info('[operation-service] Updating parent operation...');
                        if (EntityUtils.isLocal(parent)) {
                            // Replace cached entity by a full entity
                            if (parent === cachedParent) {
                                try {
                                    parent = yield this.load(parentOperationId);
                                }
                                catch (err) {
                                    // Parent not exists
                                    if (err.code === DataErrorCodes.LOAD_ENTITY_ERROR) {
                                        throw { code: TripErrorCodes.PARENT_OPERATION_NOT_FOUND, message: err.message };
                                    }
                                    throw err;
                                }
                            }
                            // Update the parent
                            parent.childOperationId = entity.id;
                            savedParent = yield this.save(parent, Object.assign(Object.assign({}, opts), { updateLinkedOperation: false }));
                            // Update the cached entity
                            if (cachedParent && savedParent) {
                                cachedParent.updateDate = savedParent.updateDate;
                                cachedParent.childOperationId = savedParent.childOperationId;
                            }
                        }
                        // Remote AND on same trip
                        else if (parent.tripId === entity.tripId) {
                            // FIXME: find to wait to update parent operation, WITHOUT refecthing queries
                            //  (to avoid duplication, if child is insert manually in cache)
                            // savedParent = await this.load(parentOperationId, {fetchPolicy: 'network-only'});
                        }
                    }
                }
            }
        });
    }
    sortByDistance(sources, sortDirection, sortBy) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get current operation
            const currentPosition = yield this.getCurrentPosition();
            if (!currentPosition) {
                console.warn('[operation-service] Cannot sort by position. Cannot get the current position');
                return sources; // Unable to sort
            }
            const propertyName = sortBy === 'startPosition' ? 'startPosition' : 'endPosition';
            const sortedOperations = sources
                // Compute distance on each operation (default distance = 0)
                .map(operation => {
                const position = this.getPosition(operation, propertyName);
                return {
                    distance: PositionUtils.computeDistanceInMiles(currentPosition, position) || 0,
                    operation
                };
            })
                // Sort by distance
                .sort((sortDirection === 'asc')
                ? (d1, d2) => d1.distance - d2.distance
                : (d1, d2) => d2.distance - d1.distance)
                // Extract operations
                .map(d => d.operation);
            return sortedOperations;
        });
    }
    getPosition(operation, propertyName) {
        if (propertyName === 'startPosition') {
            return operation.startPosition || operation.fishingStartPosition
                || (operation.positions.length === 2 && operation.positions[0]);
        }
        else {
            return operation.endPosition || operation.fishingEndPosition
                || (operation.positions.length === 2 && operation.positions[1]);
        }
    }
    areUsedPhysicalGears(tripId, physicalGearIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.loadAll(0, 1, null, null, {
                tripId,
                physicalGearIds
            }, {
                withTotal: false
            });
            const usedGearIds = res.data.map(physicalGear => physicalGear.id);
            return (usedGearIds.length === 0);
        });
    }
    translateControlPath(controlPath, opts) {
        opts = opts || {};
        if (isNilOrBlank(opts.i18nPrefix))
            opts.i18nPrefix = 'TRIP.OPERATION.EDIT.';
        // Translate PMFM field
        if (MEASUREMENT_PMFM_ID_REGEXP.test(controlPath) && opts.pmfms) {
            const pmfmId = parseInt(controlPath.split('.').pop());
            const pmfm = opts.pmfms.find(p => p.id === pmfmId);
            return PmfmUtils.getPmfmName(pmfm);
        }
        // Translate location, inside any fishing areas
        if (FISHING_AREAS_LOCATION_REGEXP.test(controlPath)) {
            return this.translate.instant(opts.i18nPrefix + 'FISHING_AREAS');
        }
        // Translate location, inside any fishing areas
        if (POSITIONS_REGEXP.test(controlPath)) {
            return this.translate.instant(opts.i18nPrefix + 'POSITIONS');
        }
        // Default translation
        return this.formErrorTranslator.translateControlPath(controlPath, opts);
    }
    /* -- protected methods -- */
    asObject(entity, opts) {
        opts = Object.assign(Object.assign({}, MINIFY_OPTIONS), opts);
        const copy = entity.asObject(opts);
        // Full json optimisation
        if (opts.minify && !opts.keepTypename && !opts.keepEntityName) {
            // Clean metier object, before saving
            copy.metier = { id: entity.metier && entity.metier.id };
        }
        return copy;
    }
    fillDefaultProperties(entity, opts) {
        var _a, _b;
        const department = this.accountService.department;
        // Fill Recorder department
        this.fillRecorderDepartment(entity, department);
        this.fillRecorderDepartment(entity.startPosition, department);
        this.fillRecorderDepartment(entity.endPosition, department);
        // Measurements
        (entity.measurements || []).forEach(m => this.fillRecorderDepartment(m, department));
        // Fill position dates
        if (entity.startPosition)
            entity.startPosition.dateTime = entity.fishingStartDateTime || entity.startDateTime;
        if (entity.endPosition)
            entity.endPosition.dateTime = entity.fishingEndDateTime || entity.endDateTime || ((_a = entity.startPosition) === null || _a === void 0 ? void 0 : _a.dateTime);
        // Fill trip ID
        if (isNil(entity.tripId) && opts) {
            entity.tripId = opts.tripId || ((_b = opts.trip) === null || _b === void 0 ? void 0 : _b.id);
        }
        // Fill catch batch label
        if (entity.catchBatch) {
            // Fill catch batch label
            if (isNilOrBlank(entity.catchBatch.label)) {
                entity.catchBatch.label = AcquisitionLevelCodes.CATCH_BATCH;
            }
            // Fill batch tree default (rank order, sum, etc.)
            this.fillBatchTreeDefaults(entity.catchBatch, opts);
        }
    }
    fillRecorderDepartment(entity, department) {
        if (entity && (!entity.recorderDepartment || !entity.recorderDepartment.id)) {
            department = department || this.accountService.department;
            // Recorder department
            if (department) {
                entity.recorderDepartment = department;
            }
        }
    }
    fillOfflineDefaultProperties(entity, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const isNew = isNil(entity.id);
            // If new, generate a local id
            if (isNew) {
                entity.id = yield this.entities.nextValue(entity);
            }
            // Fill all sample ids
            const samples = entity.samples && EntityUtils.listOfTreeToArray(entity.samples) || [];
            yield EntityUtils.fillLocalIds(samples, (_, count) => this.entities.nextValues(Sample.TYPENAME, count));
            // Fill all batches id
            const batches = entity.catchBatch && EntityUtils.treeToArray(entity.catchBatch) || [];
            if (isNotEmptyArray(batches)) {
                yield EntityUtils.fillLocalIds(batches, (_, count) => this.entities.nextValues('BatchVO', count));
                if (this._debug) {
                    console.debug('[operation-service] Preparing batches to be saved locally:');
                    BatchUtils.logTree(entity.catchBatch);
                }
            }
            // Load trip, if need
            const trip = (opts === null || opts === void 0 ? void 0 : opts.trip) || (isNotNil(entity.tripId) && (yield this.entities.load(entity.tripId, Trip.TYPENAME, { fullLoad: false })));
            // Copy some properties from trip - see OperationFilter
            // Keep entity.tripId if exist because entity.tripId and trip.id can be different when linked operation is updated (opts.trip come from child operation)
            // In any case, program and vessel are same for child and parent so we can keep opts.trip values.
            if (trip) {
                entity.tripId = entity.tripId || trip.id;
                entity.programLabel = (_a = trip.program) === null || _a === void 0 ? void 0 : _a.label;
                entity.vesselId = (_b = trip.vesselSnapshot) === null || _b === void 0 ? void 0 : _b.id;
            }
        });
    }
    fillBatchTreeDefaults(catchBatch, opts) {
        if (!opts)
            return;
        // CLean empty
        if (opts.cleanBatchTree)
            BatchUtils.cleanTree(catchBatch);
        // Compute rankOrder (and label)
        if (opts.computeBatchRankOrder)
            BatchUtils.computeRankOrder(catchBatch);
        // Compute individual count (e.g. refresh individual count of BatchGroups)
        if (opts.computeBatchIndividualCount)
            BatchUtils.computeIndividualCount(catchBatch);
        // Compute weight
        if (opts.computeBatchWeight)
            BatchUtils.computeWeight(catchBatch);
    }
    copyIdAndUpdateDate(source, target) {
        var _a;
        if (!source)
            return;
        // Update (id and updateDate)
        EntityUtils.copyIdAndUpdateDate(source, target);
        // Update parent operation
        if (target.parentOperation && source.parentOperation) {
            EntityUtils.copyIdAndUpdateDate(source.parentOperation, target.parentOperation);
        }
        // Update child operation
        if (target.childOperation && source.childOperation) {
            EntityUtils.copyIdAndUpdateDate(source.childOperation, target.childOperation);
        }
        // Update positions (id and updateDate)
        const sortedSourcePositions = (_a = source.positions) === null || _a === void 0 ? void 0 : _a.map(VesselPosition.fromObject).sort(VesselPositionUtils.dateTimeComparator());
        if (isNotEmptyArray(sortedSourcePositions)) {
            [target.startPosition, target.fishingStartPosition, target.fishingEndPosition, target.endPosition]
                .filter(p => p && p.dateTime)
                .forEach(targetPos => {
                targetPos.operationId = source.id;
                // Get the source position, by date
                const sourcePos = VesselPositionUtils.findByDate(sortedSourcePositions, targetPos.dateTime, true);
                EntityUtils.copyIdAndUpdateDate(sourcePos, targetPos);
            });
            if (sortedSourcePositions.length) {
                // Should never append
                console.warn('[operation] Some positions sent by Pod have an unknown dateTime: ', sortedSourcePositions);
            }
        }
        // Update fishing area
        if (target.fishingAreas && source.fishingAreas) {
            target.fishingAreas.forEach(targetFishArea => {
                const sourceFishArea = source.fishingAreas.find(json => targetFishArea.equals(json));
                EntityUtils.copyIdAndUpdateDate(sourceFishArea, targetFishArea);
            });
        }
        // Update measurements
        if (target.measurements && source.measurements) {
            target.measurements.forEach(targetMeas => {
                const sourceMeas = source.measurements.find(json => targetMeas.equals(json));
                EntityUtils.copyIdAndUpdateDate(sourceMeas, targetMeas);
            });
        }
        // Update samples (recursively)
        if (target.samples && source.samples) {
            this.copyIdAndUpdateDateOnSamples(source.samples, target.samples, source);
        }
        // Update batches (recursively)
        if (target.catchBatch && source.batches) {
            this.copyIdAndUpdateDateOnBatch(source.batches, [target.catchBatch]);
        }
    }
    /**
     * Copy Id and update, in sample tree (recursively)
     *
     * @param sources
     * @param targets
     * @param savedOperation
     * @param parentSample
     */
    copyIdAndUpdateDateOnSamples(sources, targets, savedOperation, parentSample) {
        // DEBUG
        //console.debug("[operation-service] Calling copyIdAndUpdateDateOnSamples()");
        // Update samples
        if (sources && targets) {
            // Copy source, to be able to use splice() if array is a readonly (apollo cache)
            sources = [...sources];
            targets.forEach(target => {
                var _a;
                // Set the operation id (required by equals function)
                target.operationId = savedOperation.id;
                // Try to set parent id (need by equals, when new entity)
                target.parentId = (parentSample === null || parentSample === void 0 ? void 0 : parentSample.id) || target.parentId;
                const index = sources.findIndex(json => target.equals(json));
                if (index !== -1) {
                    // Remove from sources list, as it has been found
                    const source = sources.splice(index, 1)[0];
                    EntityUtils.copyIdAndUpdateDate(source, target);
                    RootDataEntityUtils.copyControlAndValidationDate(source, target);
                    // Copy parent Id (need for link to parent)
                    target.parentId = source.parentId;
                    target.parent = null;
                }
                else {
                    console.warn('Missing a sample, equals to this target: ', target);
                    // Apply to children
                    if ((_a = target.children) === null || _a === void 0 ? void 0 : _a.length) {
                        this.copyIdAndUpdateDateOnSamples(sources, target.children, savedOperation, target);
                    }
                }
            });
        }
    }
    /**
     * Copy Id and update, in batch tree (recursively)
     *
     * @param sources
     * @param targets
     */
    copyIdAndUpdateDateOnBatch(sources, targets) {
        if (sources && targets) {
            // Copy source, to be able to use splice() if array is a readonly (apollo cache)
            sources = [...sources];
            targets.forEach(target => {
                var _a;
                const index = sources.findIndex(json => target.equals(json));
                if (index !== -1) {
                    // Remove from sources list, as it has been found
                    const source = sources.splice(index, 1)[0];
                    EntityUtils.copyIdAndUpdateDate(source, target);
                }
                else {
                    console.error('Missing a Batch, equals to this target:', target);
                }
                // Loop on children
                if ((_a = target.children) === null || _a === void 0 ? void 0 : _a.length) {
                    this.copyIdAndUpdateDateOnBatch(sources, target.children);
                }
            });
        }
    }
    computeRankOrderAndSort(data, offset, total, sortBy, sortDirection = 'asc', filter) {
        // Compute rankOrderOnPeriod, by tripId
        if (filter && isNotNil(filter.tripId)) {
            const asc = (!sortDirection || sortDirection !== 'desc');
            let rankOrder = asc ? 1 + offset : (total - offset - data.length + 1);
            // apply a sorted copy (do NOT change original order), then compute rankOrder
            data.slice()
                .sort(Operation.sortByEndDateOrStartDate)
                .forEach(o => o.rankOrder = rankOrder++);
            // sort by rankOrderOnPeriod (received as 'id')
            if (!sortBy || sortBy === 'id' || sortBy === 'rankOrder' || sortBy === 'endDateTime') {
                data.sort(Operation.rankOrderComparator(sortDirection));
            }
        }
    }
    getRefetchQueriesForMutation(opts) {
        if (opts && opts.refetchQueries)
            return opts.refetchQueries;
        // Skip if update policy not used refecth queries
        if (this._watchQueriesUpdatePolicy !== 'refetch-queries')
            return undefined;
        // Find the refetch queries definition
        return this.findRefetchQueries({ queryNames: this.getLoadQueryNames() });
    }
    getLoadQueryNames() {
        return ['LoadAllWithTotal', 'LoadAll'];
    }
    removeChildOperationLocally(parentOperationIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.entities.loadAll(Operation.TYPENAME, {
                filter: (this.asFilter({
                    includedIds: parentOperationIds
                }).asFilterFn())
            }, { fullLoad: true });
            if (isEmptyArray(data))
                return; // no operation to update
            const operations = (data || []).map(json => 
            // Convert to entity (required because entities use readonly objects)
            Operation.fromObject(Object.assign(Object.assign({}, json), { 
                // Clean link to child
                childOperationId: null, childOperation: null })));
            return this.saveAllLocally(operations, {});
        });
    }
    applyWatchOptions({ data, total }, offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            let entities = (!opts || opts.toEntity !== false) ?
                (data || []).map(source => Operation.fromObject(source, opts))
                : (data || []);
            if (opts === null || opts === void 0 ? void 0 : opts.mapFn) {
                entities = yield opts.mapFn(entities);
            }
            if (opts === null || opts === void 0 ? void 0 : opts.sortByDistance) {
                entities = yield this.sortByDistance(entities, sortDirection, sortBy);
            }
            // Compute rankOrder and re-sort (if enable AND total has been fetched)
            if (!opts || opts.computeRankOrder !== false) {
                this.computeRankOrderAndSort(entities, offset, total, sortBy, sortDirection, filter);
            }
            return { data: entities, total };
        });
    }
    fillControlOptionsForOperation(entity, opts) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            opts = opts || {};
            // Fill acquisition level, BEFORE loading pmfms
            opts.isChild = opts.allowParentOperation !== false && (isNotNil(entity.parentOperationId) || isNotNil((_a = entity.parentOperation) === null || _a === void 0 ? void 0 : _a.id));
            opts.acquisitionLevel = opts.isChild ? AcquisitionLevelCodes.CHILD_OPERATION : AcquisitionLevelCodes.OPERATION;
            opts.initialPmfms = null; // Force to reload pmfms, on the same acquisition level
            opts = yield this.fillControlOptionsForTrip(entity.tripId, opts);
            // Adapt options to the current operation
            if (opts.allowParentOperation) {
                opts.isParent = !opts.isChild;
            }
            else {
                opts.isChild = false;
                opts.isParent = false;
            }
            // Filter pmfms for the operation's gear
            const gearId = (_c = (_b = entity.physicalGear) === null || _b === void 0 ? void 0 : _b.gear) === null || _c === void 0 ? void 0 : _c.id;
            if (isNotNil(gearId)) {
                opts.pmfms = (opts.initialPmfms || [])
                    .filter(p => isEmptyArray(p.gearIds) || p.gearIds.includes(gearId));
            }
            else {
                opts.pmfms = (opts.initialPmfms || []);
            }
            return opts;
        });
    }
    fillControlOptionsForTrip(tripId, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Fill options need by the operation validator
            opts = yield this.fillValidatorOptionsForTrip(tripId, opts);
            // Prepare pmfms (the full list, not filtered by gearId)
            if (!opts.initialPmfms) {
                const programLabel = (_a = opts.program) === null || _a === void 0 ? void 0 : _a.label;
                const acquisitionLevel = opts.acquisitionLevel || (opts.isChild ? AcquisitionLevelCodes.CHILD_OPERATION : AcquisitionLevelCodes.OPERATION);
                opts.initialPmfms = programLabel && (yield this.programRefService.loadProgramPmfms(programLabel, { acquisitionLevel })) || [];
            }
            // Prepare error translator
            if (!opts.translatorOptions) {
                opts.translatorOptions = {
                    controlPathTranslator: {
                        translateControlPath: (path) => this.translateControlPath(path, { pmfms: opts.initialPmfms })
                    }
                };
            }
            return opts;
        });
    }
    fillValidatorOptionsForTrip(tripId, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            opts = opts || {};
            // Skip - already loaded
            if (opts.trip && opts.program && isNotNil(opts.withPosition))
                return opts;
            // Load trip, if missing
            if (!opts.trip) {
                opts.trip = yield this.tripService.load(tripId);
            }
            // Load program, if missing
            if (!opts.program) {
                const programLabel = opts.trip.program && opts.trip.program.label || null;
                if (!programLabel)
                    throw new Error('Missing trip\'s program. Unable to control trip\'s operation');
                opts.program = yield this.programRefService.loadByLabel(programLabel);
            }
            const showPosition = toBoolean(MeasurementUtils.asBooleanValue(opts.trip.measurements, PmfmIds.GPS_USED), true)
                && opts.program.getPropertyAsBoolean(ProgramProperties.TRIP_POSITION_ENABLE);
            return Object.assign(Object.assign({}, opts), { withPosition: showPosition, withFishingAreas: !showPosition, allowParentOperation: opts.program.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION), withFishingStart: opts.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE), withFishingEnd: opts.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE), withEnd: opts.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE), maxDistance: opts.program.getPropertyAsInt(ProgramProperties.TRIP_DISTANCE_MAX_ERROR), boundingBox: Geometries.parseAsBBox(opts.program.getProperty(ProgramProperties.TRIP_POSITION_BOUNDING_BOX)), maxTotalDurationInHours: opts.program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_TOTAL_DURATION_HOURS), maxShootingDurationInHours: opts.program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_SHOOTING_DURATION_HOURS), isOnFieldMode: false, withMeasurements: true // Need by full validation
             });
        });
    }
};
OperationService = __decorate([
    Injectable({ providedIn: 'root' }),
    __param(13, Optional()),
    __metadata("design:paramtypes", [GraphqlService,
        NetworkService,
        PlatformService,
        AccountService,
        LocalSettingsService,
        MetierService,
        EntitiesStorage,
        OperationValidatorService,
        BatchService,
        ProgressBarService,
        ProgramRefService,
        TranslateService,
        FormErrorTranslator,
        Geolocation])
], OperationService);
export { OperationService };
//# sourceMappingURL=operation.service.js.map