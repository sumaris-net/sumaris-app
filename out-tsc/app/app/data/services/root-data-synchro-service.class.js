import { __awaiter } from "tslib";
import { concat, defer, of, Subject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { RootDataEntityUtils } from './model/root-data-entity.model';
import { chainPromises, EntitiesStorage, EntityUtils, fromDateISOString, isEmptyArray, isNil, isNilOrNaN, isNotEmptyArray, JobUtils, LocalSettingsService, NetworkService, PersonService, toDateISOString } from '@sumaris-net/ngx-components';
import { BaseRootDataService } from './root-data-service.class';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE } from './model/data-entity.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { DataErrorCodes } from './errors';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { SynchronizationStatusEnum } from '@app/data/services/model/model.utils';
import moment from 'moment';
export class DataSynchroImportFilter {
    static fromObject(source) {
        const target = new DataSynchroImportFilter();
        target.fromObject(source);
        return target;
    }
    fromObject(source, opts) {
        this.programLabel = source.programLabel;
        this.strategyIds = source.strategyIds;
        this.vesselId = source.vesselId;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.periodDuration = source.periodDuration;
        this.periodDurationUnit = source.periodDurationUnit;
    }
    asObject(opts) {
        const target = Object.assign({}, this);
        target.startDate = toDateISOString(this.startDate);
        target.endDate = toDateISOString(this.endDate);
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            delete target.periodDurationUnit;
        }
        return target;
    }
}
const DataSynchroServiceFnName = ['load', 'runImport', 'synchronizeById', 'synchronize', 'lastUpdateDate'];
export function isDataSynchroService(object) {
    return object && DataSynchroServiceFnName.filter(fnName => (typeof object[fnName] === 'function'))
        .length === DataSynchroServiceFnName.length || false;
}
export const DEFAULT_FEATURE_NAME = 'synchro';
export class RootDataSynchroService extends BaseRootDataService {
    constructor(injector, dataType, filterType, options) {
        super(injector, dataType, filterType, options);
        this.loading = false;
        this.onSave = new Subject();
        this.onDelete = new Subject();
        this.onSynchronize = new Subject();
        this.referentialRefService = injector.get(ReferentialRefService);
        this.personService = injector.get(PersonService);
        this.vesselSnapshotService = injector.get(VesselSnapshotService);
        this.programRefService = injector.get(ProgramRefService);
        this.entities = injector.get(EntitiesStorage);
        this.network = injector.get(NetworkService);
        this.settings = injector.get(LocalSettingsService);
    }
    get featureName() {
        return this._featureName || DEFAULT_FEATURE_NAME;
    }
    runImport(filter, opts) {
        if (this.importationProgress$)
            return this.importationProgress$; // Avoid many call
        const totalProgression = opts && opts.maxProgression || 100;
        const jobOpts = { maxProgression: undefined /* set later, when jobs length is known */ };
        const jobs = [
            // Clear caches
            defer(() => this.network.clearCache()
                .then(() => jobOpts.maxProgression)),
            // Execute import Jobs
            ...this.getImportJobs(filter, jobOpts),
            // Save data to local storage, then set progression to the max
            defer(() => this.entities.persist()
                .then(() => jobOpts.maxProgression))
        ];
        const jobCount = jobs.length;
        const progressionStep = Math.trunc(totalProgression / jobCount);
        jobOpts.maxProgression = progressionStep;
        const now = Date.now();
        console.info(`[root-data-service] Starting ${this.featureName} importation (${jobs.length} jobs)...`);
        // Execute all jobs, one by one
        let currentJobIndex = 0;
        this.importationProgress$ = concat(...jobs.map((job, index) => job
            .pipe(map(jobProgression => {
            currentJobIndex = index;
            if (isNilOrNaN(jobProgression) || jobProgression < 0) {
                if (this._debug)
                    console.warn(`[root-data-service] WARN job #${currentJobIndex} sent invalid progression ${jobProgression}`);
                jobProgression = 0;
            }
            else if (jobProgression > progressionStep) {
                if (this._debug)
                    console.warn(`[root-data-service] WARN job #${currentJobIndex} sent invalid progression ${jobProgression} > ${progressionStep}`);
                jobProgression = progressionStep;
            }
            // Compute total progression (= job offset + job progression)
            return (index * progressionStep) + jobProgression;
        }))), 
        // Finish (force totalProgression)
        of(totalProgression)
            .pipe(tap(() => {
            this.importationProgress$ = null;
            this.finishImport();
            console.info(`[root-data-service] Importation finished in ${Date.now() - now}ms`);
        }))) // end of concat
            .pipe(catchError((err) => {
            this.importationProgress$ = null;
            console.error(`[root-data-service] Error during importation (job #${currentJobIndex + 1}): ${err && err.message || err}`, err);
            throw err;
        }), map((progression) => Math.min(progression, totalProgression)));
        return this.importationProgress$;
    }
    terminateById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const entity = yield this.load(id);
            return this.terminate(entity);
        });
    }
    terminate(entity) {
        const _super = Object.create(null, {
            terminate: { get: () => super.terminate }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // If local entity
            if (EntityUtils.isLocal(entity)) {
                // Make sure to fill id, with local ids
                yield this.fillOfflineDefaultProperties(entity);
                // Update sync status
                entity.synchronizationStatus = 'READY_TO_SYNC';
                const json = this.asObject(entity, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE);
                if (this._debug)
                    console.debug(`${this._logPrefix}Terminate {${entity.id}} locally...`, json);
                // Save entity locally
                yield this.entities.save(json);
                return entity;
            }
            // Terminate a remote entity
            return _super.terminate.call(this, entity);
        });
    }
    synchronizeById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const entity = yield this.load(id);
            if (!EntityUtils.isLocal(entity))
                return; // skip if not a local entity
            return yield this.synchronize(entity);
        });
    }
    /**
     * Check if there is offline data.
     * Can be override by subclasses (e.g. to check in the entities storage)
     */
    hasOfflineData() {
        return __awaiter(this, void 0, void 0, function* () {
            const featuresName = this._featureName || DEFAULT_FEATURE_NAME;
            return this.settings.hasOfflineFeature(featuresName);
        });
    }
    /**
     * Get remote last update date. By default, check on referential tables.
     * Can be override by subclasses (e.g. to check in the entities storage)
     */
    lastUpdateDate() {
        return this.referentialRefService.lastUpdateDate();
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.queries.load)
                throw new Error('Not implemented');
            if (isNil(id))
                throw new Error('Missing argument \'id\'');
            const now = Date.now();
            if (this._debug)
                console.debug(`${this._logPrefix}Loading ${this._logTypeName} #${id}...`);
            this.loading = true;
            try {
                let data;
                // If local entity
                if (EntityUtils.isLocalId(+id)) {
                    data = yield this.entities.load(+id, this._typename);
                    if (!data)
                        throw { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' };
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
                // Convert to entity
                const entity = (!opts || opts.toEntity !== false)
                    ? this.fromObject(data)
                    : data;
                if (entity && this._debug)
                    console.debug(`${this._logPrefix}${this._logTypeName} #${id} loaded in ${Date.now() - now}ms`, entity);
                return entity;
            }
            finally {
                this.loading = false;
            }
        });
    }
    deleteAll(entities, opts) {
        const _super = Object.create(null, {
            deleteAll: { get: () => super.deleteAll }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Delete local entities
            const localEntities = entities && entities.filter(RootDataEntityUtils.isLocal);
            if (isNotEmptyArray(localEntities)) {
                return this.deleteAllLocally(localEntities, opts);
            }
            const ids = entities && entities.map(t => t.id)
                .filter(id => +id >= 0);
            if (isEmptyArray(ids))
                return; // stop if empty
            return _super.deleteAll.call(this, entities, opts);
        });
    }
    /* -- protected methods -- */
    fillOfflineDefaultProperties(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            const isNew = isNil(entity.id);
            // If new, generate a local id
            if (isNew) {
                entity.id = (yield this.entities.nextValue(entity));
            }
            // Fill default synchronization status
            entity.synchronizationStatus = entity.synchronizationStatus || SynchronizationStatusEnum.DIRTY;
        });
    }
    /**
     * List of importation jobs. Can be override by subclasses, to add or remove some jobs
     *
     * @param opts
     * @protected
     */
    getImportJobs(filter, opts) {
        return JobUtils.defers([
            (o) => this.referentialRefService.executeImport(filter, o),
            (o) => this.personService.executeImport(filter, o),
            (o) => this.vesselSnapshotService.executeImport(filter, o),
            (o) => this.programRefService.executeImport(filter, o)
        ], opts);
    }
    finishImport() {
        this.settings.markOfflineFeatureAsSync(this.featureName);
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
            if (isEmptyArray(localEntities))
                return; // Skip if empty
            const trash = !opts || opts.trash !== false;
            const trashUpdateDate = trash && moment();
            if (this._debug)
                console.debug(`${this._logPrefix}Deleting ${this._logTypeName} locally... {trash: ${trash}`);
            yield chainPromises(localEntities.map(entity => () => __awaiter(this, void 0, void 0, function* () {
                yield this.entities.delete(entity, { entityName: this._typename });
                if (trash) {
                    // Fill observedLocation's operation, before moving it to trash
                    entity.updateDate = trashUpdateDate;
                    const json = entity.asObject(Object.assign(Object.assign({}, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE), { keepLocalId: false }));
                    // Add to trash
                    yield this.entities.saveToTrash(json, { entityName: ObservedLocation.TYPENAME });
                }
            })));
        });
    }
}
//# sourceMappingURL=root-data-synchro-service.class.js.map