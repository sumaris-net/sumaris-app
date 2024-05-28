import { Inject, Injectable, InjectionToken, Injector, Optional } from '@angular/core';
import { gql } from '@apollo/client/core';
import { map } from 'rxjs/operators';

import {
  APP_USER_EVENT_SERVICE,
  AppErrorWithDetails,
  AppFormUtils,
  BaseEntityGraphqlQueries,
  chainPromises,
  DateUtils,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  Entity,
  EntityServiceListenChangesOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  FormErrorTranslator,
  GraphqlService,
  IEntitiesService,
  IEntityService,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  IUserEventService,
  JobUtils,
  LoadResult,
  LocalSettingsService,
  NetworkService,
  PersonService,
  ShowToastOptions,
  Toasts,
  toNumber,
} from '@sumaris-net/ngx-components';
import {
  COPY_LOCALLY_AS_OBJECT_OPTIONS,
  DataEntityAsObjectOptions,
  MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE,
  SAVE_AS_OBJECT_OPTIONS,
  SERIALIZE_FOR_OPTIMISTIC_RESPONSE,
} from '@app/data/services/model/data-entity.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { IProgressionOptions, IRootDataEntityQualityService } from '@app/data/services/data-quality-service.class';
import { VesselSnapshotFragments, VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { IMPORT_REFERENTIAL_ENTITIES, ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ActivityCalendarValidatorOptions, ActivityCalendarValidatorService } from './model/activity-calendar.validator';
import { ActivityCalendar } from './model/activity-calendar.model';
import { RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';
import { fillRankOrder, SynchronizationStatusEnum } from '@app/data/services/model/model.utils';
import { SortDirection } from '@angular/material/sort';
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from '@ionic/angular';
import { ACTIVITY_CALENDAR_FEATURE_DEFAULT_PROGRAM_FILTER, ACTIVITY_CALENDAR_FEATURE_NAME } from './activity-calendar.config';
import { IDataSynchroService, RootDataEntitySaveOptions, RootDataSynchroService } from '@app/data/services/root-data-synchro-service.class';
import { environment } from '@environments/environment';
import { DataErrorCodes } from '@app/data/services/errors';
import { VESSEL_FEATURE_NAME } from '@app/vessel/services/config/vessel.config';
import { TrashRemoteService } from '@app/core/services/trash-remote.service';
import { BaseRootEntityGraphqlMutations } from '@app/data/services/root-data-service.class';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MEASUREMENT_PMFM_ID_REGEXP } from '@app/data/measurement/measurement.model';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Program, ProgramUtils } from '@app/referential/services/model/program.model';
import { BBox } from 'geojson';
import { UserEvent, UserEventTypeEnum } from '@app/social/user-event/user-event.model';
import moment, { Moment } from 'moment';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { ActivityCalendarFilter, ActivityCalendarSynchroImportFilter } from '@app/activity-calendar/activity-calendar.filter';
import { DataCommonFragments, DataFragments } from '@app/trip/common/data.fragments';
import { OverlayEventDetail } from '@ionic/core';
import { ImageAttachmentFragments } from '@app/data/image/image-attachment.service';
import { ImageAttachment } from '@app/data/image/image-attachment.model';

export const ActivityCalendarFragments = {
  lightActivityCalendar: gql`
    fragment LightActivityCalendarFragment on ActivityCalendarVO {
      id
      program {
        id
        label
      }
      year
      directSurveyInvestigation
      economicSurvey
      creationDate
      updateDate
      controlDate
      validationDate
      qualityFlagId
      qualificationDate
      qualificationComments
      comments
      vesselSnapshot {
        ...LightVesselSnapshotFragment
      }
      recorderDepartment {
        ...LightDepartmentFragment
      }
      recorderPerson {
        ...LightPersonFragment
      }
    }
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${VesselSnapshotFragments.lightVesselSnapshot}
    ${DataCommonFragments.referential}
    ${DataCommonFragments.location}
  `,

  activityCalendar: gql`
    fragment ActivityCalendarFragment on ActivityCalendarVO {
      id
      program {
        id
        label
      }
      year
      directSurveyInvestigation
      economicSurvey
      creationDate
      updateDate
      controlDate
      validationDate
      qualityFlagId
      qualificationDate
      qualificationComments
      comments
      measurementValues
      vesselSnapshot {
        ...LightVesselSnapshotFragment
      }
      recorderDepartment {
        ...LightDepartmentFragment
      }
      recorderPerson {
        ...LightPersonFragment
      }
      vesselUseFeatures {
        ...VesselUseFeaturesFragment
      }
      gearUseFeatures {
        ...GearUseFeaturesFragment
      }
      images {
        ...LightImageAttachmentFragment
      }
    }
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${DataCommonFragments.referential}
    ${DataCommonFragments.location}
    ${VesselSnapshotFragments.lightVesselSnapshot}
    ${DataFragments.vesselUseFeatures}
    ${DataFragments.gearUseFeatures}
    ${DataCommonFragments.metier}
    ${DataFragments.fishingArea}
    ${ImageAttachmentFragments.light}
  `,
};

export interface ActivityCalendarLoadOptions extends EntityServiceLoadOptions {
  toEntity?: boolean;
  fullLoad?: boolean;
}

export interface ActivityCalendarSaveOptions extends RootDataEntitySaveOptions {
  enableOptimisticResponse?: boolean; // True by default
}

export interface ActivityCalendarServiceCopyOptions extends ActivityCalendarSaveOptions {
  keepRemoteId?: boolean;
  deletedFromTrash?: boolean;
  displaySuccessToast?: boolean;
}

export interface ActivityCalendarWatchOptions extends EntitiesServiceWatchOptions {
  query?: any;
  fullLoad?: boolean;
}

export interface ActivityCalendarControlOptions extends ActivityCalendarValidatorOptions, IProgressionOptions {}

const ActivityCalendarQueries: BaseEntityGraphqlQueries & { loadAllFull: any } = {
  // Load a activityCalendar
  load: gql`
    query ActivityCalendar($id: Int!) {
      data: activityCalendar(id: $id) {
        ...ActivityCalendarFragment
      }
    }
    ${ActivityCalendarFragments.activityCalendar}
  `,

  loadAll: gql`
    query ActivityCalendars(
      $offset: Int
      $size: Int
      $sortBy: String
      $sortDirection: String
      $trash: Boolean
      $filter: ActivityCalendarFilterVOInput
    ) {
      data: activityCalendars(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash) {
        ...LightActivityCalendarFragment
      }
    }
    ${ActivityCalendarFragments.lightActivityCalendar}
  `,

  loadAllFull: gql`
    query ActivityCalendarsFull(
      $offset: Int
      $size: Int
      $sortBy: String
      $sortDirection: String
      $trash: Boolean
      $filter: ActivityCalendarFilterVOInput
    ) {
      data: activityCalendars(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash) {
        ...ActivityCalendarFragment
      }
    }
    ${ActivityCalendarFragments.activityCalendar}
  `,

  loadAllWithTotal: gql`
    query ActivityCalendarsWithTotal(
      $offset: Int
      $size: Int
      $sortBy: String
      $sortDirection: String
      $trash: Boolean
      $filter: ActivityCalendarFilterVOInput
    ) {
      data: activityCalendars(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash) {
        ...LightActivityCalendarFragment
      }
      total: activityCalendarsCount(filter: $filter, trash: $trash)
    }
    ${ActivityCalendarFragments.lightActivityCalendar}
  `,
};

// Save a activityCalendar
const ActivityCalendarMutations = <BaseRootEntityGraphqlMutations>{
  save: gql`
    mutation saveActivityCalendar($data: ActivityCalendarVOInput!) {
      data: saveActivityCalendar(activityCalendar: $data) {
        ...ActivityCalendarFragment
      }
    }
    ${ActivityCalendarFragments.activityCalendar}
  `,

  // Delete
  deleteAll: gql`
    mutation DeleteActivityCalendars($ids: [Int]!) {
      deleteActivityCalendars(ids: $ids)
    }
  `,

  // Terminate
  terminate: gql`
    mutation ControlActivityCalendar($data: ActivityCalendarVOInput!) {
      data: controlActivityCalendar(activityCalendar: $data) {
        ...ActivityCalendarFragment
      }
    }
    ${ActivityCalendarFragments.activityCalendar}
  `,

  validate: gql`
    mutation ValidateActivityCalendar($data: ActivityCalendarVOInput!) {
      data: validateActivityCalendar(activityCalendar: $data) {
        ...ActivityCalendarFragment
      }
    }
    ${ActivityCalendarFragments.activityCalendar}
  `,

  qualify: gql`
    mutation QualifyActivityCalendar($data: ActivityCalendarVOInput!) {
      data: qualifyActivityCalendar(activityCalendar: $data) {
        ...ActivityCalendarFragment
      }
    }
    ${ActivityCalendarFragments.activityCalendar}
  `,

  unvalidate: gql`
    mutation UnvalidateActivityCalendar($data: ActivityCalendarVOInput!) {
      data: unvalidateActivityCalendar(activityCalendar: $data) {
        ...ActivityCalendarFragment
      }
    }
    ${ActivityCalendarFragments.activityCalendar}
  `,
};

const ActivityCalendarSubscriptions = {
  listenChanges: gql`
    subscription UpdateActivityCalendar($id: Int!, $interval: Int) {
      data: updateActivityCalendar(id: $id, interval: $interval) {
        ...LightActivityCalendarFragment
      }
    }
    ${ActivityCalendarFragments.lightActivityCalendar}
  `,
};

@Injectable({ providedIn: 'root' })
export class ActivityCalendarService
  extends RootDataSynchroService<ActivityCalendar, ActivityCalendarFilter, number, ActivityCalendarWatchOptions, ActivityCalendarLoadOptions>
  implements
    IEntitiesService<ActivityCalendar, ActivityCalendarFilter>,
    IEntityService<ActivityCalendar, number, ActivityCalendarLoadOptions>,
    IRootDataEntityQualityService<ActivityCalendar>,
    IDataSynchroService<ActivityCalendar, ActivityCalendarFilter, number, ActivityCalendarLoadOptions>
{
  constructor(
    injector: Injector,
    protected graphql: GraphqlService,
    protected network: NetworkService,
    protected referentialRefService: ReferentialRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected personService: PersonService,
    protected entities: EntitiesStorage,
    protected settings: LocalSettingsService,
    protected validatorService: ActivityCalendarValidatorService,
    protected trashRemoteService: TrashRemoteService,
    protected formErrorTranslator: FormErrorTranslator,
    @Inject(APP_USER_EVENT_SERVICE) @Optional() protected userEventService: IUserEventService<any, any>,
    @Optional() protected translate: TranslateService,
    @Optional() protected toastController: ToastController
  ) {
    super(injector, ActivityCalendar, ActivityCalendarFilter, {
      queries: ActivityCalendarQueries,
      mutations: ActivityCalendarMutations,
      subscriptions: ActivityCalendarSubscriptions,
      defaultSortBy: 'year',
      defaultSortDirection: 'desc',
    });

    this._featureName = ACTIVITY_CALENDAR_FEATURE_NAME;

    // Register user event actions
    if (userEventService) {
      userEventService.registerListener({
        accept: (e) => this.isDebugData(e),
        onReceived: (event) => {
          event.addAction({
            name: this.translate.instant('SOCIAL.USER_EVENT.BTN_COPY_TO_LOCAL'),
            color: 'success',
            iconRef: {
              matIcon: 'content_copy',
            },
            executeAction: async (e) => {
              // Fetch event's content, if not present
              if (!event.content) {
                event = await userEventService.load(e.id, { withContent: true });
              }
              const context = this.getEventContext(event);
              if (context) {
                await this.copyLocally(ActivityCalendar.fromObject(context), { displaySuccessToast: true });
              } else {
                await this.showToast({ message: 'ERROR.LOAD_DATA_ERROR', type: 'error' });
              }
            },
          });
          return event;
        },
      });
    }

    // FOR DEV ONLY
    this._debug = !environment.production;
    if (this._debug) console.debug('[activity-calendar-service] Creating service');
  }

  getEventContext(event: UserEvent): any {
    const context = event.content?.context;
    if (context && typeof context === 'string') {
      try {
        return JSON.parse(context);
      } catch (e) {
        // Invalid JSON: continue
      }
    }
    return context;
  }

  isDebugData(event: UserEvent): boolean {
    return (
      event.type === UserEventTypeEnum.DEBUG_DATA &&
      // If content not fetched, use only the hasContent flag (BUT insecured, because data can be NOT a ActivityCalendar)
      ((!event.content && event.hasContent) ||
        // If content fetched, make sure data is a ActivityCalendar
        this.getEventContext(event)?.__typename === ActivityCalendar.TYPENAME)
    );
  }

  async loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<ActivityCalendarFilter>,
    opts?: EntityServiceLoadOptions & {
      query?: any;
      debug?: boolean;
      withTotal?: boolean;
      fullLoad?: boolean;
    }
  ): Promise<LoadResult<ActivityCalendar>> {
    const offlineData = this.network.offline || (filter && filter.synchronizationStatus && filter.synchronizationStatus !== 'SYNC') || false;
    if (offlineData) {
      return this.loadAllLocally(offset, size, sortBy, sortDirection, filter, opts);
    }

    const query = opts?.fullLoad ? ActivityCalendarQueries.loadAllFull : undefined;
    return super.loadAll(offset, size, sortBy, sortDirection, filter, { query, ...opts });
  }

  async loadAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<ActivityCalendarFilter>,
    opts?: EntityServiceLoadOptions & {
      query?: any;
      debug?: boolean;
      withTotal?: boolean;
    }
  ): Promise<LoadResult<ActivityCalendar>> {
    filter = this.asFilter(filter);

    const variables = {
      offset: offset || 0,
      size: size >= 0 ? size : 1000,
      sortBy: (sortBy !== 'id' && sortBy) || (opts && opts.trash ? 'updateDate' : 'endDateTime'),
      sortDirection: sortDirection || (opts && opts.trash ? 'desc' : 'asc'),
      trash: (opts && opts.trash) || false,
      filter: filter.asFilterFn(),
    };

    const res = await this.entities.loadAll<ActivityCalendar>('ActivityCalendarVO', variables, { fullLoad: opts && opts.fullLoad });
    const entities =
      !opts || opts.toEntity !== false ? (res.data || []).map((json) => this.fromObject(json)) : ((res.data || []) as ActivityCalendar[]);

    return { data: entities, total: res.total };
  }

  /**
   * Load many activityCalendars
   *
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param dataFilter
   * @param opts
   */
  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<ActivityCalendarFilter>,
    opts?: ActivityCalendarWatchOptions
  ): Observable<LoadResult<ActivityCalendar>> {
    // Load offline
    const offline = this.network.offline || (dataFilter && dataFilter.synchronizationStatus && dataFilter.synchronizationStatus !== 'SYNC') || false;
    if (offline) {
      return this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts);
    }

    if (opts?.trash) {
      sortBy = sortBy || 'updateDate';
      sortDirection = sortDirection || 'desc';
    }

    const fullLoad = opts && opts.fullLoad === true; // false by default
    const withTotal = !opts || opts.withTotal !== false;
    const query = fullLoad ? ActivityCalendarQueries.loadAllFull : withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;

    return super.watchAll(offset, size, sortBy, sortDirection, dataFilter as ActivityCalendarFilter, {
      query,
      fetchPolicy: opts?.fetchPolicy || 'cache-and-network',
      ...opts,
      variables: {
        ...opts?.variables,
        trash: opts?.trash || false,
      },
    });
  }

  watchAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<ActivityCalendarFilter>,
    options?: ActivityCalendarWatchOptions
  ): Observable<LoadResult<ActivityCalendar>> {
    dataFilter = this.asFilter(dataFilter);
    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy: sortBy || 'departureDateTime',
      sortDirection: sortDirection || 'asc',
      trash: (options && options.trash) || false,
      filter: dataFilter && dataFilter.asFilterFn(),
    };

    if (this._debug) console.debug('[activity-calendar-service] Watching local activityCalendars... using options:', variables);

    return this.entities.watchAll<ActivityCalendar>(ActivityCalendar.TYPENAME, variables).pipe(
      map((res) => {
        const data = ((res && res.data) || []).map(ActivityCalendar.fromObject);
        const total = res && isNotNil(res.total) ? res.total : undefined;
        return { data, total };
      })
    );
  }

  async load(id: number, opts?: ActivityCalendarLoadOptions): Promise<ActivityCalendar | null> {
    if (isNil(id)) throw new Error("Missing argument 'id'");

    const now = this._debug && Date.now();
    if (this._debug) console.debug(`[activity-calendar-service] Loading activityCalendar #${id}...`);
    this.loading = true;

    try {
      let source: any;

      // If local entity
      if (EntityUtils.isLocalId(id)) {
        source = await this.entities.load<ActivityCalendar>(id, ActivityCalendar.TYPENAME, opts);
        if (!source) throw { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' };
      } else {
        // Load remotely
        const { data } = await this.graphql.query<{ data: ActivityCalendar }>({
          query: ActivityCalendarQueries.load,
          variables: { id },
          error: { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' },
          fetchPolicy: (opts && opts.fetchPolicy) || undefined,
        });
        source = data;
      }

      // Transform to entity
      const target = !opts || opts.toEntity !== false ? ActivityCalendar.fromObject(source) : (source as ActivityCalendar);

      if (target && this._debug) console.debug(`[activity-calendar-service] ActivityCalendar #${id} loaded in ${Date.now() - now}ms`, target);
      return target;
    } finally {
      this.loading = false;
    }
  }

  async loadImages(id: number, opts?: ActivityCalendarLoadOptions): Promise<ImageAttachment[]> {
    const res = await this.graphql.query({
      query: gql`
        query ActivityCalendarImages($id: Int!) {
          data: activityCalendar(id: $id) {
            id
            images {
              ...LightImageAttachmentFragment
            }
          }
        }
        ${ImageAttachmentFragments.light}
      `,
    });
    console.log(res);
    return [];
  }

  async hasOfflineData(): Promise<boolean> {
    const result = await super.hasOfflineData();
    if (result) return result;

    const res = await this.entities.loadAll(ActivityCalendar.TYPENAME, {
      offset: 0,
      size: 0,
    });
    return res && res.total > 0;
  }

  listenChanges(id: number, opts?: EntityServiceListenChangesOptions): Observable<ActivityCalendar> {
    if (isNil(id)) throw new Error("Missing argument 'id' ");

    if (EntityUtils.isLocalId(id)) {
      if (this._debug) console.debug(this._logPrefix + `Listening for local changes on ${this._logTypeName} {${id}}...`);
      return this.entities.watchAll<ActivityCalendar>(ActivityCalendar.TYPENAME, { offset: 0, size: 1, filter: (t) => t.id === id }).pipe(
        map(({ data }) => {
          const json = isNotEmptyArray(data) && data[0];
          const entity = !opts || opts.toEntity !== false ? this.fromObject(json) : json;
          // Set an updateDate, to force update detection
          if (entity && this._debug) console.debug(this._logPrefix + `${this._logTypeName} {${id}} updated locally !`, entity);
          return entity;
        })
      );
    }

    return super.listenChanges(id, opts);
  }

  /**
   * Save many activityCalendars
   *
   * @param entities
   * @param opts
   */
  async saveAll(entities: ActivityCalendar[], opts?: ActivityCalendarSaveOptions): Promise<ActivityCalendar[]> {
    if (isEmptyArray(entities)) return entities;

    if (this._debug) console.debug(`[activity-calendar-service] Saving ${entities.length} activityCalendars...`);
    const jobsFactories = (entities || []).map((entity) => () => this.save(entity, { ...opts }));
    const result = await chainPromises<ActivityCalendar>(jobsFactories);
    this.onSave.next(result);
    return result;
  }

  /**
   * Save many activityCalendars locally
   *
   * @param entities
   * @param opts
   */
  async saveAllLocally(entities: ActivityCalendar[], opts?: ActivityCalendarSaveOptions): Promise<ActivityCalendar[]> {
    if (!entities) return entities;

    if (this._debug) console.debug(`[landing-service] Saving ${entities.length} activityCalendars locally...`);
    const jobsFactories = (entities || []).map((entity) => () => this.saveLocally(entity, { ...opts }));
    return chainPromises<ActivityCalendar>(jobsFactories);
  }

  /**
   * Save a activityCalendar
   *
   * @param entity
   * @param opts
   */
  async save(entity: ActivityCalendar, opts?: ActivityCalendarSaveOptions): Promise<ActivityCalendar> {
    // If is a local entity: force a local save
    if (RootDataEntityUtils.isLocal(entity)) {
      entity.updateDate = DateUtils.moment(); // Set a local time (need be EntityEditor.listenChanges())
      return this.saveLocally(entity, opts);
    }

    opts = {
      ...opts,
    };

    const now = Date.now();
    if (this._debug) console.debug('[activity-calendar-service] Saving activityCalendar...', entity);

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Reset quality properties
    this.resetQualityProperties(entity);

    // Provide an optimistic response, if connection lost
    const offlineResponse =
      !opts || opts.enableOptimisticResponse !== false
        ? async (context) => {
            // Make sure to fill id, with local ids
            await this.fillOfflineDefaultProperties(entity);

            // For the query to be tracked (see tracked query link) with a unique serialization key
            context.tracked = !entity.synchronizationStatus || entity.synchronizationStatus === 'SYNC';
            if (isNotNil(entity.id)) context.serializationKey = `${ActivityCalendar.TYPENAME}:${entity.id}`;

            return {
              data: [this.asObject(entity, SERIALIZE_FOR_OPTIMISTIC_RESPONSE)],
            };
          }
        : undefined;

    // Transform into json
    const json = this.asObject(entity, SAVE_AS_OBJECT_OPTIONS);
    if (this._debug) console.debug('[activity-calendar-service] Using minify object, to send:', json);

    const variables = {
      data: json,
    };
    await this.graphql.mutate<{ data: any }>({
      mutation: this.mutations.save,
      variables,
      offlineResponse,
      refetchQueries: this.getRefetchQueriesForMutation(opts),
      awaitRefetchQueries: opts && opts.awaitRefetchQueries,
      error: { code: DataErrorCodes.SAVE_ENTITY_ERROR, message: 'ERROR.SAVE_ENTITY_ERROR' },
      update: async (cache, { data }) => {
        const savedEntity = data && data.data;

        // Local entity (optimistic response): save it
        if (savedEntity.id < 0) {
          if (this._debug) console.debug('[activity-calendar-service] [offline] Saving activityCalendar locally...', savedEntity);

          // Save response locally
          await this.entities.save<ActivityCalendar>(savedEntity);
        }

        // Update the entity and update GraphQL cache
        else {
          // Remove existing entity from the local storage
          if (entity.id < 0 && (savedEntity.id > 0 || savedEntity.updateDate)) {
            if (this._debug) console.debug(`[activity-calendar-service] Deleting activityCalendar {${entity.id}} from local storage`);
            await this.entities.delete(entity);
          }

          // Copy id and update Date
          this.copyIdAndUpdateDate(savedEntity, entity, opts);

          // Insert into the cache
          if (RootDataEntityUtils.isNew(entity) && this.watchQueriesUpdatePolicy === 'update-cache') {
            this.insertIntoMutableCachedQueries(cache, {
              queries: this.getLoadQueries(),
              data: savedEntity,
            });
          }

          if (opts && opts.update) {
            opts.update(cache, { data });
          }

          if (this._debug) console.debug(`[activity-calendar-service] ActivityCalendar saved remotely in ${Date.now() - now}ms`, entity);
        }
      },
    });

    if (!opts || opts.emitEvent !== false) {
      this.onSave.next([entity]);
    }
    return entity;
  }

  async saveLocally(entity: ActivityCalendar, opts?: ActivityCalendarSaveOptions): Promise<ActivityCalendar> {
    if (entity.id >= 0) throw new Error('Must be a local entity');
    opts = {
      ...opts,
    };

    this.fillDefaultProperties(entity);

    // Reset quality properties
    this.resetQualityProperties(entity);

    // Make sure to fill id, with local ids
    await this.fillOfflineDefaultProperties(entity);

    // Reset synchro status
    entity.synchronizationStatus = SynchronizationStatusEnum.DIRTY;

    const jsonLocal = this.asObject(entity, { ...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, batchAsTree: false });
    if (this._debug) console.debug('[activity-calendar-service] [offline] Saving activityCalendar locally...', jsonLocal);

    // Save activityCalendar locally
    await this.entities.save(jsonLocal, { entityName: ActivityCalendar.TYPENAME });

    this.onSave.next([entity]);
    return entity;
  }

  async synchronize(entity: ActivityCalendar, opts?: any): Promise<ActivityCalendar> {
    opts = {
      enableOptimisticResponse: false, // Optimistic response not need
      ...opts,
    };

    const localId = entity.id;
    if (isNil(localId) || localId >= 0) {
      throw new Error('Entity must be a local entity');
    }
    if (this.network.offline) {
      throw new Error('Cannot synchronize: app is offline');
    }

    // Clone (to keep original entity unchanged)
    entity = entity instanceof Entity ? entity.clone() : entity;
    entity.synchronizationStatus = 'SYNC';
    entity.id = undefined;

    try {
      // Save activityCalendar (and operations or operation groups)
      entity = await this.save(entity, opts);

      // Check return entity has a valid id
      if (isNil(entity.id) || entity.id < 0) {
        throw { code: DataErrorCodes.SYNCHRONIZE_ENTITY_ERROR };
      }

      if (!opts || opts.emitEvent !== false) {
        this.onSynchronize.next({ localId, remoteEntity: entity });
      }
    } catch (err) {
      throw {
        ...err,
        code: DataErrorCodes.SYNCHRONIZE_ENTITY_ERROR,
        message: 'ERROR.SYNCHRONIZE_ENTITY_ERROR',
        context: entity.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE),
      };
    }

    // Clean local activityCalendar
    try {
      if (this._debug) console.debug(`[activity-calendar-service] Deleting activityCalendar {${entity.id}} from local storage`);

      // Delete activityCalendar
      await this.entities.deleteById(localId, { entityName: ActivityCalendar.TYPENAME });
    } catch (err) {
      console.error(`[activity-calendar-service] Failed to locally delete activityCalendar {${entity.id}} and its operations`, err);
      // Continue
    }

    // Importing historical data (need to get parent operation in the local storage)
    try {
      const offlineFilter = this.settings.getOfflineFeature<ActivityCalendarSynchroImportFilter>(this.featureName)?.filter;
      const filter = ActivityCalendarSynchroImportFilter.toActivityCalendarFilter(offlineFilter || {});

      // Force the data program, because user can fill data on many programs (e.g. PIFIL and ACOST) but have configured only once for offline data importation
      filter.program = entity.program;

      // Force the vessel
      filter.vesselId = toNumber(entity.vesselSnapshot?.id, filter.vesselId);

      // Make sure the period include the actual activityCalendar
      const entityStartDate: Moment = DateUtils.moment().year(entity.year).utc(false).startOf('year');
      filter.startDate = DateUtils.min(entityStartDate, filter.startDate);
      filter.endDate = null;

      // Run importation
      await this.importHistoricalData(filter, {});
    } catch (err) {
      console.error(`[activity-calendar-service] Failed to import historical data`, err);
      // Continue, after warn
      this.showToast({ message: 'WARNING.SYNCHRONIZE_NO_HISTORICAL_DATA', type: 'warning' });
    }

    // Clear page history
    try {
      // FIXME: find a way o clean only synchronized data ?
      await this.settings.clearPageHistory();
    } catch (err) {
      /* Continue */
    }

    return entity;
  }

  async control(entity: ActivityCalendar, opts?: ActivityCalendarControlOptions): Promise<AppErrorWithDetails> {
    const now = this._debug && Date.now();

    const maxProgression = toNumber(opts?.maxProgression, 100);
    opts = { ...opts, maxProgression };
    opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });

    const progressionStep = maxProgression / 20;
    if (this._debug) console.debug(`[activity-calendar-service] Control {${entity.id}}...`, entity);

    const programLabel = (entity.program && entity.program.label) || null;
    if (!programLabel) throw new Error("Missing activityCalendar's program. Unable to control the activityCalendar");
    const program = await this.programRefService.loadByLabel(programLabel);

    const form = this.validatorService.getFormGroup(entity, {
      ...opts,
      program,
      isOnFieldMode: false, // Always disable 'on field mode'
      withMeasurements: true, // Need by full validation
    });

    if (!form.valid) {
      // Wait end of validation (e.g. async validators)
      await AppFormUtils.waitWhilePending(form);

      // Get form errors
      if (form.invalid) {
        const errors = AppFormUtils.getFormErrors(form);

        if (this._debug)
          console.debug(`[activity-calendar-service] Control activityCalendar {${entity.id}} [INVALID] in ${Date.now() - now}ms`, errors);
        return {
          message: 'COMMON.FORM.HAS_ERROR',
          details: {
            errors,
          },
        };
      }
    }

    if (opts?.progression) opts.progression.increment(progressionStep);

    // If activityCalendar is valid: continue
    if (!opts) {
      // Control operations
    }

    if (this._debug) console.debug(`[activity-calendar-service] Control activityCalendar {${entity.id}} [OK] in ${Date.now() - now}ms`);

    return undefined;
  }

  async delete(data: ActivityCalendar): Promise<any> {
    if (!data) return; // skip
    await this.deleteAll([data]);
  }

  /**
   * Delete many activityCalendars
   *
   * @param entities
   * @param opts
   */
  async deleteAll(
    entities: ActivityCalendar[],
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    // Delete local entities
    const localEntities = entities?.filter(RootDataEntityUtils.isLocal);
    if (isNotEmptyArray(localEntities)) {
      return this.deleteAllLocally(localEntities, opts);
    }

    const remoteEntities = entities && entities.filter((t) => t.id >= 0);
    const ids = remoteEntities && remoteEntities.map((t) => t.id);
    if (isEmptyArray(ids)) return; // stop if empty

    const now = Date.now();
    if (this._debug) console.debug(`[activity-calendar-service] Deleting activityCalendars ids: {${ids.join(',')}`);

    await this.graphql.mutate<any>({
      mutation: this.mutations.deleteAll,
      variables: { ids },
      update: (proxy) => {
        // Update the cache
        this.removeFromMutableCachedQueriesByIds(proxy, {
          queryNames: ['loadAll', 'loadAllWithTotal'],
          ids,
        });

        if (this._debug) console.debug(`[activity-calendar-service] ActivityCalendars deleted remotely in ${Date.now() - now}ms`);
        this.onDelete.next(remoteEntities);
      },
    });
  }

  /**
   * Delete many local entities
   *
   * @param entities
   * @param opts
   */
  async deleteAllLocally(
    entities: ActivityCalendar[],
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    // Get local entities
    const localEntities = entities?.filter(RootDataEntityUtils.isLocal);

    // Delete, one by one
    await chainPromises((localEntities || []).map((entity) => () => this.deleteLocally(entity, opts)));
  }

  async deleteLocallyById(
    id: number,
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    const activityCalendar = await this.load(id);
    return this.deleteLocally(activityCalendar, opts);
  }

  async deleteLocally(
    entity: ActivityCalendar,
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    const trash = !opts || opts.trash !== false;
    const trashUpdateDate = trash && moment();
    if (this._debug) console.debug(`[activity-calendar-service] Deleting activityCalendar #${entity.id}... {trash: ${trash}`);

    try {
      await this.entities.delete(entity, { entityName: ActivityCalendar.TYPENAME });
      this.onDelete.next([entity]);

      if (trash) {
        const json = entity.asObject({ ...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, keepLocalId: false });

        // Force the updateDate
        json.updateDate = trashUpdateDate;

        // Add to trash
        await this.entities.saveToTrash(json, { entityName: ActivityCalendar.TYPENAME });
      }
    } catch (err) {
      console.error('Error during activityCalendar deletion: ', err);
      throw { code: DataErrorCodes.DELETE_ENTITY_ERROR, message: 'ERROR.DELETE_ENTITY_ERROR' };
    }
    this.onDelete.next([entity]);
  }

  /**
   * Copy entities (local or remote) to the local storage
   *
   * @param entities
   * @param opts
   */
  copyAllLocally(entities: ActivityCalendar[], opts?: ActivityCalendarServiceCopyOptions): Promise<ActivityCalendar[]> {
    return chainPromises(entities.map((source) => () => this.copyLocally(source, opts)));
  }

  async copyLocallyById(id: number, opts?: ActivityCalendarLoadOptions & { displaySuccessToast?: boolean }): Promise<ActivityCalendar> {
    // Load existing data
    const source = await this.load(id, { ...opts, fetchPolicy: 'network-only' });

    // Copy remote activityCalendar to local storage
    const target = await this.copyLocally(source, opts);

    return target;
  }

  /**
   * Copy an entity (local or remote) to the local storage
   *
   * @param source
   * @param opts
   */
  async copyLocally(source: ActivityCalendar, opts?: ActivityCalendarServiceCopyOptions): Promise<ActivityCalendar> {
    console.debug('[activity-calendar-service] Copy activityCalendar locally...', source);

    opts = {
      keepRemoteId: false,
      deletedFromTrash: false,
      ...opts,
    };
    const isLocal = RootDataEntityUtils.isLocal(source);

    // Create a new entity (without id and updateDate)
    const json = this.asObject(source, { ...COPY_LOCALLY_AS_OBJECT_OPTIONS, keepRemoteId: opts.keepRemoteId });
    json.synchronizationStatus = SynchronizationStatusEnum.DIRTY; // To make sure it will be saved locally

    // Save
    const target = await this.saveLocally(ActivityCalendar.fromObject(json), opts);

    // Remove from the local trash
    if (opts.deletedFromTrash) {
      if (isLocal) {
        await this.entities.deleteFromTrash(source, { entityName: ActivityCalendar.TYPENAME });
      } else {
        await this.trashRemoteService.delete(ActivityCalendar.ENTITY_NAME, source.id);
      }
    }

    if (opts.displaySuccessToast) {
      await this.showToast({ message: 'SOCIAL.USER_EVENT.INFO.COPIED_LOCALLY', type: 'info' });
    }

    return target;
  }

  copyIdAndUpdateDate(source: ActivityCalendar | undefined, target: ActivityCalendar, opts?: ActivityCalendarSaveOptions) {
    if (!source) return;

    // Update (id and updateDate)
    super.copyIdAndUpdateDate(source, target);

    // Update VUF
    if (source.vesselUseFeatures && target.vesselUseFeatures) {
      target.vesselUseFeatures.forEach((targetVuf) => {
        const sourceVuf = source.vesselUseFeatures.find((f) => targetVuf.equals(f));
        EntityUtils.copyIdAndUpdateDate(sourceVuf, targetVuf);
      });
    }

    // Update GUF
    if (source.gearUseFeatures && target.gearUseFeatures) {
      target.gearUseFeatures.forEach((targetGuf) => {
        const sourceGuf = source.gearUseFeatures.find((f) => targetGuf.equals(f));
        EntityUtils.copyIdAndUpdateDate(sourceGuf, targetGuf);

        // Update fishing areas
        if (targetGuf.fishingAreas && sourceGuf.fishingAreas) {
          targetGuf.fishingAreas.forEach((entity) => {
            const savedFishingArea = sourceGuf.fishingAreas.find((f) => entity.equals(f));
            EntityUtils.copyIdAndUpdateDate(savedFishingArea, entity);
          });
        }
      });
    }
  }

  translateControlPath(path, opts?: { i18nPrefix?: string; pmfms?: IPmfm[] }): string {
    opts = { i18nPrefix: 'ACTIVITY_CALENDAR.EDIT.', ...opts };
    // Translate PMFM fields
    if (MEASUREMENT_PMFM_ID_REGEXP.test(path) && opts.pmfms) {
      const pmfmId = parseInt(path.split('.').pop());
      const pmfm = opts.pmfms.find((p) => p.id === pmfmId);
      return PmfmUtils.getPmfmName(pmfm);
    }
    // Default translation
    return this.formErrorTranslator.translateControlPath(path, opts);
  }

  /* -- protected methods -- */

  protected asObject(entity: ActivityCalendar, opts?: DataEntityAsObjectOptions & { batchAsTree?: boolean }): any {
    opts = { ...MINIFY_OPTIONS, ...opts };
    const copy: any = entity.asObject(opts);

    // Full json optimisation
    if (opts.minify && !opts.keepEntityName && !opts.keepTypename) {
      // Clean vessel features object, before saving
      copy.vesselSnapshot = { id: entity.vesselSnapshot && entity.vesselSnapshot.id };
    }

    return copy;
  }

  protected fillDefaultProperties(entity: ActivityCalendar) {
    super.fillDefaultProperties(entity);

    if (entity.vesselUseFeatures) {
      this.fillRecorderDepartment(entity.vesselUseFeatures, entity.recorderDepartment);
    }
    if (entity.gearUseFeatures) {
      this.fillRecorderDepartment(entity.vesselUseFeatures, entity.recorderDepartment);
    }

    // GearUseFeatures: compute rankOrder
    fillRankOrder(entity.gearUseFeatures);
  }

  protected async fillOfflineDefaultProperties(entity: ActivityCalendar) {
    await super.fillOfflineDefaultProperties(entity);
  }

  /**
   * List of importation jobs.
   *
   * @protected
   * @param filter
   * @param opts
   */
  protected getImportJobs(
    filter: Partial<ActivityCalendarFilter>,
    opts: {
      maxProgression: number;
      program?: Program;
      boundingBox?: BBox;
      locationLevelIds?: number[];
      countryIds?: number[];
      referentialEntityNames?: string[];
      acquisitionLevels?: string[];
      [key: string]: any;
    }
  ): Observable<number>[] {
    filter = filter || this.settings.getOfflineFeature(this.featureName)?.filter;
    filter = this.asFilter(filter);

    let programLabel = filter?.program?.label;

    return [
      // Store program to opts, for other services (e.g. used by OperationService)
      JobUtils.defer(async (o) => {
        // No program: Try to find one (and only one) for this user
        if (isNilOrBlank(programLabel)) {
          console.warn('[activity-calendar-service] [import] Trying to find a unique program to configure the import...');
          const { data: programs, total: programCount } = await this.programRefService.loadAll(
            0,
            1,
            null,
            null,
            ACTIVITY_CALENDAR_FEATURE_DEFAULT_PROGRAM_FILTER,
            { fetchPolicy: 'no-cache', withTotal: true }
          );
          if (programCount === 1) {
            programLabel = programs[0]?.label;
          } else {
            console.warn(`[activity-calendar-service] [import] No unique program found, but found ${programCount} program(s)`);
          }
        }

        // No program
        if (isNilOrBlank(programLabel)) {
          console.warn('[activity-calendar-service] [import] Cannot reducing importation (no program): can be long!');
          opts.entityNames = [...IMPORT_REFERENTIAL_ENTITIES];
        }

        // Fill options using program
        else {
          console.debug(`[activity-calendar-service] [import] Reducing importation to program {${programLabel}}`);
          const program = await this.programRefService.loadByLabel(programLabel, { fetchPolicy: 'network-only' });
          opts.program = program;
          opts.acquisitionLevels = ProgramUtils.getAcquisitionLevels(program);

          // Limit locations (e.g. rectangle, sub-rectangle)
          // TODO limit to location levels used
          //opts.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.ACTIVITY_CALENDAR_OFFLINE_IMPORT_LOCATION_LEVEL_IDS);
          if (isNotEmptyArray(opts.locationLevelIds))
            console.debug('[activity-calendar-service] [import] Location - level ids: ' + opts.locationLevelIds.join(','));
        }
      }),

      ...super.getImportJobs(filter, opts),

      // TODO: import calendars ?
      // TODO: import predoc calendars ?
    ];
  }

  /**
   * Reimport historical gears, or pending operations (parent OP without child)
   *
   * @param filter
   * @param opts
   * @protected
   */
  protected async importHistoricalData(
    filter?: Partial<ActivityCalendarFilter>,
    opts?: {
      progression?: BehaviorSubject<number>;
      maxProgression?: number;
    }
  ): Promise<void> {
    const maxProgression = (opts && opts.maxProgression) || 100;
    opts = {
      maxProgression,
      ...opts,
    };
    opts.progression = opts.progression || new BehaviorSubject<number>(0);

    filter = filter || this.settings.getOfflineFeature(this.featureName)?.filter;
    filter = this.asFilter(filter);

    const programLabel = filter?.program?.label;

    if (isNotNilOrBlank(programLabel)) {
      console.info('[activity-calendar-service] Importing historical data, from filter: ', filter);

      // TODO import predoc + N-1

      // Import pending operations
      // const operationFilter = ActivityCalendarFilter.toOperationFilter(filter);
      // await this.operationService.executeImport(operationFilter, {
      //   ...opts, maxProgression: maxProgression / 2
      // });
      //
      // // Import physical gears
      // const gearFilter = ActivityCalendarFilter.toPhysicalGearFilter(filter);
      // await this.physicalGearService.executeImport(gearFilter, {
      //   ...opts, maxProgression: maxProgression / 2
      // });
    }

    if (opts?.progression) opts?.progression.next(maxProgression);
  }

  protected showToast<T = any>(opts: ShowToastOptions): Promise<OverlayEventDetail<T>> {
    return Toasts.show(this.toastController, this.translate, opts);
  }

  protected finishImport() {
    super.finishImport();

    // Add vessel offline feature
    this.settings.markOfflineFeatureAsSync(VESSEL_FEATURE_NAME);
  }
}
