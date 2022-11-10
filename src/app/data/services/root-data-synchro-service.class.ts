import { concat, defer, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { DataRootEntityUtils, RootDataEntity } from './model/root-data-entity.model';
import {
  BaseEntityGraphqlQueries,
  BaseEntityGraphqlSubscriptions,
  BaseEntityServiceOptions,
  chainPromises,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  EntityServiceLoadOptions,
  EntityUtils,
  isEmptyArray,
  isNil,
  isNilOrNaN,
  isNotEmptyArray,
  JobUtils,
  LocalSettingsService,
  NetworkService,
  PersonService
} from '@sumaris-net/ngx-components';
import { BaseRootDataService, BaseRootEntityGraphqlMutations } from './root-data-service.class';

import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Injector } from '@angular/core';
import { Moment } from 'moment';
import { MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE } from './model/data-entity.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ErrorCodes } from './errors';
import { FetchPolicy } from '@apollo/client/core';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { RootDataEntityFilter } from './model/root-data-filter.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { SynchronizationStatusEnum } from '@app/data/services/model/model.utils';
import DurationConstructor = moment.unitOfTime.DurationConstructor;
import moment from 'moment';



export class DataSynchroImportFilter {
  programLabel?: string;
  vesselId?: number;
  startDate?: Date | Moment;
  endDate?: Date | Moment
  periodDuration?: number;
  periodDurationUnit?: DurationConstructor;
}

export interface IDataSynchroService<
  T extends RootDataEntity<T, ID>,
  F extends RootDataEntityFilter<F, T, ID> = RootDataEntityFilter<any, T, any>,
  ID = number,
  LO extends EntityServiceLoadOptions = EntityServiceLoadOptions> {

  load(id: ID, opts?: LO): Promise<T>;

  executeImport(filter?: Partial<F>, opts?: {
    maxProgression?: number;
  }): Observable<number>;

  terminateById(id: ID): Promise<T>;

  terminate(entity: T): Promise<T>;

  synchronizeById(id: ID): Promise<T>;

  synchronize(data: T, opts?: any): Promise<T>;

  hasOfflineData(): Promise<boolean>;

  lastUpdateDate(): Promise<Moment>;
}

const DataSynchroServiceFnName: (keyof IDataSynchroService<any>)[] = ['load', 'executeImport', 'synchronizeById', 'synchronize', 'lastUpdateDate'];

export function isDataSynchroService(object: any): object is IDataSynchroService<any> {
  return object && DataSynchroServiceFnName.filter(fnName => (typeof object[fnName] === 'function'))
    .length === DataSynchroServiceFnName.length || false;
}

export const DEFAULT_FEATURE_NAME = 'synchro';

export abstract class RootDataSynchroService<
  T extends RootDataEntity<T, ID>,
  F extends RootDataEntityFilter<F, T, ID> = RootDataEntityFilter<any, T, any>,
  ID = number,
  WO extends EntitiesServiceWatchOptions = EntitiesServiceWatchOptions,
  LO extends EntityServiceLoadOptions = EntityServiceLoadOptions,
  Q extends BaseEntityGraphqlQueries = BaseEntityGraphqlQueries,
  M extends BaseRootEntityGraphqlMutations = BaseRootEntityGraphqlMutations,
  S extends BaseEntityGraphqlSubscriptions = BaseEntityGraphqlSubscriptions>
  extends BaseRootDataService<T, F, ID, WO, LO, Q, M, S>
  implements IDataSynchroService<T, F, ID, LO> {

  protected _featureName: string;

  protected referentialRefService: ReferentialRefService;
  protected personService: PersonService;
  protected vesselSnapshotService: VesselSnapshotService;
  protected programRefService: ProgramRefService;
  protected entities: EntitiesStorage;
  protected network: NetworkService;
  protected settings: LocalSettingsService;

  protected importationProgress$: Observable<number>;
  protected loading = false;

  get featureName(): string {
    return this._featureName || DEFAULT_FEATURE_NAME;
  }

  protected constructor (
    injector: Injector,
    dataType: new() => T,
    filterType: new() => F,
    options: BaseEntityServiceOptions<T, ID, Q, M, S>
  ) {
    super(injector, dataType, filterType, options);

    this.referentialRefService = injector.get(ReferentialRefService);
    this.personService = injector.get(PersonService);
    this.vesselSnapshotService = injector.get(VesselSnapshotService);
    this.programRefService = injector.get(ProgramRefService);
    this.entities = injector.get(EntitiesStorage);
    this.network = injector.get(NetworkService);
    this.settings = injector.get(LocalSettingsService);
  }

  executeImport(filter?: Partial<F>,
                opts?: { maxProgression?: number; }
  ): Observable<number>{
    if (this.importationProgress$) return this.importationProgress$; // Avoid many call

    const totalProgression = opts && opts.maxProgression || 100;
    const jobOpts = { maxProgression: undefined /* set later, when jobs length is known */};
    const jobs: Observable<number>[] = [
      // Clear caches
      defer(() => this.network.clearCache()
        .then(() => jobOpts.maxProgression as number)
      ),

      // Execute import Jobs
      ...this.getImportJobs(filter, jobOpts),

      // Save data to local storage, then set progression to the max
      defer(() => this.entities.persist()
          .then(() => jobOpts.maxProgression as number))
    ];
    const jobCount = jobs.length;
    const jobMaxProgression = Math.trunc(totalProgression / jobCount);
    jobOpts.maxProgression = jobMaxProgression;

    const now = Date.now();
    console.info(`[root-data-service] Starting ${this.featureName} importation (${jobs.length} jobs)...`);

    // Execute all jobs, one by one
    let jobIndex = 0;
    this.importationProgress$ = concat(
      ...jobs.map((job: Observable<number>, index) => {
        return job
          .pipe(
            map(jobProgression => {
              jobIndex = index;
              if (isNilOrNaN(jobProgression) || jobProgression < 0) {
                if (this._debug) console.warn(`[root-data-service] WARN job #${jobIndex} sent invalid progression ${jobProgression}`);
                jobProgression = 0;
              }
              else if (jobProgression > jobMaxProgression) {
                if (this._debug) console.warn(`[root-data-service] WARN job #${jobIndex} sent invalid progression ${jobProgression} > ${jobMaxProgression}`);
                jobProgression = jobMaxProgression;
              }
              // Compute total progression (= job offset + job progression)
              return (index * jobMaxProgression) + jobProgression;
            })
          );
      }),

      // Finish (force totalProgression)
      of(totalProgression)
        .pipe(
          tap(() => {
            this.importationProgress$ = null;
            this.finishImport();
            console.info(`[root-data-service] Importation finished in ${Date.now() - now}ms`)
          })
        )
      ) // end of concat

      .pipe(
        catchError((err) => {
          this.importationProgress$ = null;
          console.error(`[root-data-service] Error during importation (job #${jobIndex + 1}): ${err && err.message || err}`, err);
          throw err;
        }),
        map((progression) =>  Math.min(progression, totalProgression))
      );

    return this.importationProgress$;
  }


  async terminateById(id: ID): Promise<T> {
    const entity = await this.load(id);

    return this.terminate(entity);
  }

  async terminate(entity: T): Promise<T> {
    // If local entity
    if (EntityUtils.isLocal(entity)) {

      // Make sure to fill id, with local ids
      await this.fillOfflineDefaultProperties(entity);

      // Update sync status
      entity.synchronizationStatus = 'READY_TO_SYNC';

      const json = this.asObject(entity, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE);
      if (this._debug) console.debug(`${this._logPrefix}Terminate {${entity.id}} locally...`, json);

      // Save entity locally
      await this.entities.save(json);

      return entity;
    }

    // Terminate a remote entity
    return super.terminate(entity);
  }

  async synchronizeById(id: ID): Promise<T> {
    const entity = await this.load(id);

    if (!EntityUtils.isLocal(entity)) return; // skip if not a local entity

    return await this.synchronize(entity);
  }

  /**
   * Check if there is offline data.
   * Can be override by subclasses (e.g. to check in the entities storage)
   */
  async hasOfflineData(): Promise<boolean> {
    const featuresName = this._featureName || DEFAULT_FEATURE_NAME;
    return this.settings.hasOfflineFeature(featuresName);
  }

  /**
   * Get remote last update date. By default, check on referential tables.
   * Can be override by subclasses (e.g. to check in the entities storage)
   */
  lastUpdateDate(): Promise<Moment> {
    return this.referentialRefService.lastUpdateDate();
  }

  async load(id: ID, opts?: LO & {
    fetchPolicy?: FetchPolicy;
    toEntity?: boolean;
  }): Promise<T> {
    if (!this.queries.load) throw new Error('Not implemented');
    if (isNil(id)) throw new Error("Missing argument 'id'");

    const now = Date.now();
    if (this._debug) console.debug(`${this._logPrefix}Loading ${this._logTypeName} #${id}...`);
    this.loading = true;

    try {
      let data: any;

      // If local entity
      if (EntityUtils.isLocalId(+id)) {
        data = await this.entities.load(+id, this._typename);
        if (!data) throw {code: ErrorCodes.LOAD_ENTITY_ERROR, message: "ERROR.LOAD_ENTITY_ERROR"};
      }

      else {
        const res = await this.graphql.query<{ data: any }>({
          query: this.queries.load,
          variables: { id },
          error: {code: ErrorCodes.LOAD_ENTITY_ERROR, message: "ERROR.LOAD_ENTITY_ERROR"},
          fetchPolicy: opts && opts.fetchPolicy || undefined
        });
        data = res && res.data;
      }

      // COnvert to entity
      const entity = (!opts || opts.toEntity !== false)
        ? this.fromObject(data)
        : (data as T);

      if (entity && this._debug) console.debug(`${this._logPrefix}${this._logTypeName} #${id} loaded in ${Date.now() - now}ms`, entity);

      return entity;
    }
    finally {
      this.loading = false;
    }
  }

  async deleteAll(entities: T[], opts?: any): Promise<any> {
    // Delete local entities
    const localEntities = entities && entities.filter(DataRootEntityUtils.isLocal);
    if (isNotEmptyArray(localEntities)) {
      return this.deleteAllLocally(localEntities, opts);
    }

    const ids = entities && entities.map(t => t.id)
      .filter(id => +id >= 0);
    if (isEmptyArray(ids)) return; // stop if empty

    return super.deleteAll(entities, opts);
  }

  abstract synchronize(data: T, opts?: any): Promise<T>;

  /* -- protected methods -- */

  protected async fillOfflineDefaultProperties(entity: T) {
    const isNew = isNil(entity.id);

    // If new, generate a local id
    if (isNew) {
      entity.id = (await this.entities.nextValue(entity)) as unknown as ID;
    }

    // Fill default synchronization status
    entity.synchronizationStatus = entity.synchronizationStatus || SynchronizationStatusEnum.DIRTY;

  }

  /**
   * List of importation jobs. Can be override by subclasses, to add or remove some jobs
   * @param opts
   * @protected
   */
  protected getImportJobs(filter: Partial<F>, opts: {
    maxProgression?: number;
    [key: string]: any;
  }): Observable<number>[] {
    return JobUtils.defers([
      (o) => this.referentialRefService.executeImport(filter, o),
      (o) => this.personService.executeImport(filter as any, o),
      (o) => this.vesselSnapshotService.executeImport(filter as any, o),
      (o) => this.programRefService.executeImport(filter as any, o)
    ], opts);
  }

  protected finishImport() {
    this.settings.markOfflineFeatureAsSync(this.featureName);
  }

  /**
   * Delete many local entities
   * @param entities
   * @param opts
   */
  protected async deleteAllLocally(entities: T[], opts?: { trash?: boolean; }): Promise<any> {

    // Get local entity ids, then delete id
    const localEntities = entities && entities
      .filter(DataRootEntityUtils.isLocal);

    if (isEmptyArray(localEntities)) return; // Skip if empty

    const trash = !opts || opts.trash !== false;
    const trashUpdateDate = trash && moment();

    if (this._debug) console.debug(`${this._logPrefix}Deleting ${this._logTypeName} locally... {trash: ${trash}`);

    await chainPromises(localEntities.map(entity => async () => {

      await this.entities.delete<T, ID>(entity, {entityName: this._typename});

      if (trash) {
        // Fill observedLocation's operation, before moving it to trash
        entity.updateDate = trashUpdateDate;

        const json = entity.asObject({...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, keepLocalId: false});

        // Add to trash
        await this.entities.saveToTrash(json, {entityName: ObservedLocation.TYPENAME});
      }

    }));
  }

}
