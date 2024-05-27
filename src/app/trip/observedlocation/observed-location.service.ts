import { Injectable, Injector, Optional } from '@angular/core';
import {
  AccountService,
  AppErrorWithDetails,
  AppFormUtils,
  arrayDistinct,
  BaseEntityGraphqlQueries,
  chainPromises,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  Entity,
  EntityServiceListenChangesOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  FormErrors,
  FormErrorTranslator,
  FormErrorTranslatorOptions,
  GraphqlService,
  IEntitiesService,
  IEntityService,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  JobUtils,
  LoadResult,
  NetworkService,
  ProgressBarService,
  removeDuplicatesFromArray,
  ShowToastOptions,
  Toasts,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Observable } from 'rxjs';

import { gql } from '@apollo/client/core';
import { filter, map } from 'rxjs/operators';
import {
  COPY_LOCALLY_AS_OBJECT_OPTIONS,
  MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE,
  SAVE_AS_OBJECT_OPTIONS,
} from '@app/data/services/model/data-entity.model';
import { ObservedLocation } from './observed-location.model';
import { RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';
import { SortDirection } from '@angular/material/sort';
import {
  IDataEntityQualityService,
  IProgressionOptions,
  IRootDataTerminateOptions,
  IRootDataValidateOptions,
} from '@app/data/services/data-quality-service.class';
import { LandingFragments, LandingService } from '../landing/landing.service';
import { IDataSynchroService, RootDataEntitySaveOptions, RootDataSynchroService } from '@app/data/services/root-data-synchro-service.class';
import { Landing } from '../landing/landing.model';
import { ObservedLocationValidatorOptions, ObservedLocationValidatorService } from './observed-location.validator';
import { environment } from '@environments/environment';
import { VesselSnapshotFragments } from '@app/referential/services/vessel-snapshot.service';
import { OBSERVED_LOCATION_DEFAULT_PROGRAM_FILTER, OBSERVED_LOCATION_FEATURE_NAME } from '../trip.config';
import { LandingEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { VESSEL_FEATURE_NAME } from '@app/vessel/services/config/vessel.config';
import { LandingFilter } from '../landing/landing.filter';
import { ObservedLocationFilter, ObservedLocationOfflineFilter } from './observed-location.filter';
import { SampleFilter } from '@app/trip/sample/sample.filter';
import { TripFragments } from '@app/trip/trip/trip.service';
import { DataErrorCodes } from '@app/data/services/errors';
import { TripErrorCodes } from '@app/trip/trip.errors';
import { VesselService } from '@app/vessel/services/vessel-service';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { AggregatedLanding } from '@app/trip/aggregated-landing/aggregated-landing.model';
import { AggregatedLandingService } from '@app/trip/aggregated-landing/aggregated-landing.service';
import moment from 'moment';
import { Program, ProgramUtils } from '@app/referential/services/model/program.model';
import { SynchronizationStatusEnum } from '@app/data/services/model/model.utils';
import { TrashRemoteService } from '@app/core/services/trash-remote.service';
import { OverlayEventDetail } from '@ionic/core';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MEASUREMENT_VALUES_PMFM_ID_REGEXP } from '@app/data/measurement/measurement.model';
import { DataCommonFragments, DataFragments } from '@app/trip/common/data.fragments';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { DataStrategyResolution } from '@app/data/form/data-editor.utils';
import { IMPORT_REFERENTIAL_ENTITIES, WEIGHT_CONVERSION_ENTITIES } from '@app/referential/services/referential-ref.service';

export interface ObservedLocationSaveOptions extends RootDataEntitySaveOptions {
  withLanding?: boolean;
  enableOptimisticResponse?: boolean; // True by default
}

export interface ObservedLocationServiceLoadOptions extends EntityServiceLoadOptions {
  withLanding?: boolean;
}

export interface ObservedLocationControlOptions extends ObservedLocationValidatorOptions, IProgressionOptions {
  enable?: boolean; // true by default
  translatorOptions?: FormErrorTranslatorOptions;
}

export const ObservedLocationFragments = {
  lightObservedLocation: gql`
    fragment LightObservedLocationFragment on ObservedLocationVO {
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
  observedLocation: gql`
    fragment ObservedLocationFragment on ObservedLocationVO {
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
      samplingStrata {
        ...LightReferentialFragment
        properties
      }
      measurementValues
    }
  `,
};

// Load query
const ObservedLocationQueries: BaseEntityGraphqlQueries & { countSamples: any } = {
  load: gql`
    query ObservedLocation($id: Int!) {
      data: observedLocation(id: $id) {
        ...ObservedLocationFragment
      }
    }
    ${ObservedLocationFragments.observedLocation}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${DataCommonFragments.location}
    ${DataCommonFragments.referential}
  `,

  loadAll: gql`
    query ObservedLocations(
      $filter: ObservedLocationFilterVOInput
      $offset: Int
      $size: Int
      $sortBy: String
      $sortDirection: String
      $trash: Boolean
    ) {
      data: observedLocations(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash) {
        ...LightObservedLocationFragment
      }
    }
    ${ObservedLocationFragments.lightObservedLocation}
  `,

  loadAllWithTotal: gql`
    query ObservedLocations(
      $filter: ObservedLocationFilterVOInput
      $offset: Int
      $size: Int
      $sortBy: String
      $sortDirection: String
      $trash: Boolean
    ) {
      data: observedLocations(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash) {
        ...LightObservedLocationFragment
      }
      total: observedLocationsCount(filter: $filter, trash: $trash)
    }
    ${ObservedLocationFragments.lightObservedLocation}
  `,

  countSamples: gql`
    query SamplesCountQuery($filter: SampleFilterVOInput!) {
      total: samplesCount(filter: $filter)
    }
  `,
};

const ObservedLocationMutations = {
  save: gql`
    mutation SaveObservedLocation($data: ObservedLocationVOInput!, $options: ObservedLocationSaveOptionsInput!) {
      data: saveObservedLocation(observedLocation: $data, options: $options) {
        ...ObservedLocationFragment
      }
    }
    ${ObservedLocationFragments.observedLocation}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${DataCommonFragments.location}
    ${DataCommonFragments.referential}
  `,

  saveWithLandings: gql`
    mutation SaveObservedLocationWithLandings($data: ObservedLocationVOInput!, $options: ObservedLocationSaveOptionsInput!) {
      data: saveObservedLocation(observedLocation: $data, options: $options) {
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
    ${DataFragments.sample}
  `,

  deleteAll: gql`
    mutation DeleteObservedLocations($ids: [Int]!) {
      deleteObservedLocations(ids: $ids)
    }
  `,

  terminate: gql`
    mutation TerminateObservedLocation($data: ObservedLocationVOInput!, $options: DataControlOptionsInput) {
      data: controlObservedLocation(observedLocation: $data, options: $options) {
        ...ObservedLocationFragment
      }
    }
    ${ObservedLocationFragments.observedLocation}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${DataCommonFragments.location}
    ${DataCommonFragments.referential}
  `,

  validate: gql`
    mutation ValidateObservedLocation($data: ObservedLocationVOInput!, $options: DataValidateOptionsInput) {
      data: validateObservedLocation(observedLocation: $data, options: $options) {
        ...ObservedLocationFragment
      }
    }
    ${ObservedLocationFragments.observedLocation}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${DataCommonFragments.location}
    ${DataCommonFragments.referential}
  `,

  unvalidate: gql`
    mutation UnvalidateObservedLocation($data: ObservedLocationVOInput!, $options: DataValidateOptionsInput) {
      data: unvalidateObservedLocation(observedLocation: $data, options: $options) {
        ...ObservedLocationFragment
      }
    }
    ${ObservedLocationFragments.observedLocation}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${DataCommonFragments.location}
    ${DataCommonFragments.referential}
  `,

  qualify: gql`
    mutation QualifyObservedLocation($data: ObservedLocationVOInput!) {
      data: qualifyObservedLocation(observedLocation: $data) {
        ...ObservedLocationFragment
      }
    }
    ${ObservedLocationFragments.observedLocation}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${DataCommonFragments.location}
    ${DataCommonFragments.referential}
  `,
};

const ObservedLocationSubscriptions = {
  listenChanges: gql`
    subscription UpdateObservedLocation($id: Int!, $interval: Int) {
      data: updateObservedLocation(id: $id, interval: $interval) {
        ...LightObservedLocationFragment
      }
    }
    ${ObservedLocationFragments.lightObservedLocation}
  `,
};

@Injectable({ providedIn: 'root' })
export class ObservedLocationService
  extends RootDataSynchroService<ObservedLocation, ObservedLocationFilter, number, ObservedLocationServiceLoadOptions>
  implements
    IEntitiesService<ObservedLocation, ObservedLocationFilter>,
    IEntityService<ObservedLocation, number, ObservedLocationServiceLoadOptions>,
    IDataEntityQualityService<ObservedLocation, number>,
    IDataSynchroService<ObservedLocation, ObservedLocationFilter, number, ObservedLocationServiceLoadOptions>
{
  protected loading = false;

  constructor(
    injector: Injector,
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected network: NetworkService,
    protected entities: EntitiesStorage,
    protected validatorService: ObservedLocationValidatorService,
    protected vesselService: VesselService,
    protected landingService: LandingService,
    protected aggregatedLandingService: AggregatedLandingService,
    protected trashRemoteService: TrashRemoteService,
    protected progressBarService: ProgressBarService,
    protected formErrorTranslator: FormErrorTranslator,
    protected strategyRefService: StrategyRefService,
    @Optional() protected translate: TranslateService,
    @Optional() protected toastController: ToastController
  ) {
    super(injector, ObservedLocation, ObservedLocationFilter, {
      queries: ObservedLocationQueries,
      mutations: ObservedLocationMutations,
      subscriptions: ObservedLocationSubscriptions,
    });

    this._featureName = OBSERVED_LOCATION_FEATURE_NAME;

    // FOR DEV ONLY
    this._debug = !environment.production;
    if (this._debug) console.debug('[observed-location-service] Creating service');
  }

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<ObservedLocationFilter>,
    opts?: EntitiesServiceWatchOptions
  ): Observable<LoadResult<ObservedLocation>> {
    // Load offline
    const offlineData = this.network.offline || (dataFilter?.synchronizationStatus && dataFilter.synchronizationStatus !== 'SYNC') || false;
    if (offlineData) {
      return this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts);
    }

    dataFilter = this.asFilter(dataFilter);

    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy: sortBy || (opts && opts.trash ? 'updateDate' : 'startDateTime'),
      sortDirection: sortDirection || (opts && opts.trash ? 'desc' : 'asc'),
      trash: (opts && opts.trash) || false,
      filter: dataFilter?.asPodObject(),
    };

    let now = Date.now();
    console.debug('[observed-location-service] Watching observed locations... using options:', variables);

    const withTotal = !opts || opts.withTotal !== false;
    const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
    return this.mutableWatchQuery<LoadResult<ObservedLocation>>({
      queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
      query,
      arrayFieldName: 'data',
      totalFieldName: withTotal ? 'total' : undefined,
      insertFilterFn: dataFilter?.asFilterFn(),
      variables,
      error: { code: DataErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
      fetchPolicy: (opts && opts.fetchPolicy) || 'cache-and-network',
    }).pipe(
      filter(() => !this.loading),
      map(({ data, total }) => {
        const entities = (data || []).map(ObservedLocation.fromObject);
        if (now) {
          console.debug(`[observed-location-service] Loaded {${entities.length || 0}} observed locations in ${Date.now() - now}ms`, entities);
          now = undefined;
        }
        return { data: entities, total };
      })
    );
  }

  watchAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<ObservedLocationFilter>,
    opts?: EntitiesServiceWatchOptions
  ): Observable<LoadResult<ObservedLocation>> {
    dataFilter = this.asFilter(dataFilter);

    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy: sortBy || 'startDateTime',
      sortDirection: sortDirection || 'asc',
      filter: dataFilter && dataFilter.asFilterFn(),
    };

    console.debug('[observed-location-service] Watching local observed locations... using options:', variables);

    return this.entities.watchAll<ObservedLocation>(ObservedLocation.TYPENAME, variables).pipe(
      map((res) => {
        const data = ((res && res.data) || []).map(ObservedLocation.fromObject);
        const total = res && isNotNil(res.total) ? res.total : undefined;
        return { data, total };
      })
    );
  }

  async load(id: number, opts?: ObservedLocationServiceLoadOptions): Promise<ObservedLocation> {
    if (isNil(id)) throw new Error("Missing argument 'id'");

    const now = Date.now();
    if (this._debug) console.debug(`[observed-location-service] Loading observed location {${id}}...`);
    this.loading = true;

    try {
      let data: any;

      // If local entity
      if (id < 0) {
        data = await this.entities.load<ObservedLocation>(id, ObservedLocation.TYPENAME);
        if (!data) throw { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' };

        if (opts && opts.withLanding) {
          const { data: landings } = await this.entities.loadAll<Landing>(Landing.TYPENAME, {
            filter: LandingFilter.fromObject({ observedLocationId: id }).asFilterFn(),
          });
          data = {
            ...data,
            landings,
          };
        }
      } else {
        const res = await this.graphql.query<{ data: ObservedLocation }>({
          query: this.queries.load,
          variables: { id },
          error: { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' },
          fetchPolicy: (opts && opts.fetchPolicy) || undefined,
        });
        data = res && res.data;
      }
      const entities = !opts || opts.toEntity !== false ? ObservedLocation.fromObject(data) : (data as ObservedLocation);
      if (id > 0 && entities && opts && opts.withLanding) {
        entities.landings = (await this.landingService.loadAllByObservedLocation({ observedLocationId: id })).data;
      }

      if (entities && this._debug) console.debug(`[observed-location-service] Observed location #${id} loaded in ${Date.now() - now}ms`, entities);

      return entities;
    } finally {
      this.loading = false;
    }
  }

  async hasOfflineData(): Promise<boolean> {
    const result = await super.hasOfflineData();
    if (result) return result;

    const res = await this.entities.loadAll(ObservedLocation.TYPENAME, {
      offset: 0,
      size: 0,
    });
    return res && res.total > 0;
  }

  public listenChanges(id: number, opts?: EntityServiceListenChangesOptions): Observable<ObservedLocation> {
    if (isNil(id)) throw new Error("Missing argument 'id' ");

    // If local entity
    if (EntityUtils.isLocalId(id)) {
      if (this._debug) console.debug(this._logPrefix + `Listening for local changes on ${this._logTypeName} {${id}}...`);
      return this.entities.watchAll<ObservedLocation>(ObservedLocation.TYPENAME, { offset: 0, size: 1, filter: (t) => t.id === id }).pipe(
        map(({ data }) => {
          const json = isNotEmptyArray(data) && data[0];
          const entity = !opts || opts.toEntity !== false ? this.fromObject(json) : json;
          // Set an updateDate, to force update detection
          if (entity && this._debug) console.debug(this._logPrefix + `${this._logTypeName} {${id}} updated locally !`, entity);
          return entity;
        })
      );
    }

    if (this._debug) console.debug(`[observed-location-service] [WS] Listening changes for observedLocation {${id}}...`);

    return this.graphql
      .subscribe<{ data: ObservedLocation }, { id: number; interval: number }>({
        query: this.subscriptions.listenChanges,
        fetchPolicy: (opts && opts.fetchPolicy) || undefined,
        variables: { id, interval: toNumber(opts && opts.interval, 10) },
        error: {
          code: DataErrorCodes.SUBSCRIBE_ENTITY_ERROR,
          message: 'ERROR.SUBSCRIBE_ENTITY_ERROR',
        },
      })
      .pipe(
        map(({ data }) => {
          const entity = data && ObservedLocation.fromObject(data);
          if (entity && this._debug) console.debug(`[observed-location-service] Observed location {${id}} updated on server !`, entity);
          return entity;
        })
      );
  }

  translateControlPath(path, opts?: { i18nPrefix?: string; pmfms?: IPmfm[] }): string {
    opts = { i18nPrefix: 'OBSERVED_LOCATION.EDIT.', ...opts };
    // Translate PMFM fields
    if (MEASUREMENT_VALUES_PMFM_ID_REGEXP.test(path) && opts.pmfms) {
      const pmfmId = parseInt(path.split('.').pop());
      const pmfm = opts.pmfms.find((p) => p.id === pmfmId);
      return PmfmUtils.getPmfmName(pmfm);
    }
    // Default translation
    return this.formErrorTranslator.translateControlPath(path, opts);
  }

  async save(entity: ObservedLocation, opts?: ObservedLocationSaveOptions): Promise<ObservedLocation> {
    // If is a local entity: force a local save
    if (RootDataEntityUtils.isLocal(entity)) {
      return this.saveLocally(entity, opts);
    }

    opts = {
      withLanding: false,
      ...opts,
    };

    const now = Date.now();
    if (this._debug) console.debug('[observed-location-service] Saving an observed location...');

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Reset quality properties
    this.resetQualityProperties(entity);

    // Transform into json
    const json = this.asObject(entity, SAVE_AS_OBJECT_OPTIONS);
    if (RootDataEntityUtils.isNew(entity)) delete json.id; // Make to remove temporary id, before sending to graphQL
    if (this._debug) console.debug('[observed-location-service] Using minify object, to send:', json);

    const variables = {
      data: json,
      options: {
        withLanding: opts.withLanding,
      },
    };

    const mutation = opts.withLanding ? ObservedLocationMutations.saveWithLandings : this.mutations.save;
    await this.graphql.mutate<{ data: ObservedLocation }>({
      mutation,
      variables,
      error: { code: DataErrorCodes.SAVE_ENTITY_ERROR, message: 'ERROR.SAVE_ENTITY_ERROR' },
      update: (proxy, { data }) => {
        const savedEntity = data && data.data;
        if (savedEntity !== entity) {
          if (this._debug) console.debug(`[observed-location-service] Observed location saved in ${Date.now() - now}ms`, entity);
          this.copyIdAndUpdateDate(savedEntity, entity);
        }

        // Add to cache
        if (RootDataEntityUtils.isNew(entity)) {
          this.insertIntoMutableCachedQueries(proxy, {
            queries: this.getLoadQueries(),
            data: savedEntity,
          });
        }
      },
    });

    // Update date of children entities, if need (see IMAGINE-276)
    if (!RootDataEntityUtils.isNew(entity)) {
      await this.updateChildrenDate(entity);
    }

    if (!opts || opts.emitEvent !== false) {
      this.onSave.next([entity]);
    }
    return entity;
  }

  async saveAll(entities: ObservedLocation[], opts?: ObservedLocationSaveOptions): Promise<ObservedLocation[]> {
    const result = await super.saveAll(entities, opts);

    if (!opts || opts.emitEvent !== false) {
      this.onSave.next(result);
    }

    return result;
  }

  async saveLocally(entity: ObservedLocation, opts?: ObservedLocationSaveOptions): Promise<ObservedLocation> {
    if (isNotNil(entity.id) && entity.id >= 0) throw new Error('Must be a local entity');
    opts = {
      withLanding: false,
      ...opts,
    };

    const isNew = isNil(entity.id);

    this.fillDefaultProperties(entity);

    // Reset quality properties
    this.resetQualityProperties(entity);

    // Make sure to fill id, with local ids
    await this.fillOfflineDefaultProperties(entity);

    // Reset synchro status
    entity.synchronizationStatus = 'DIRTY';

    // Extract landings (saved just after)
    const landings = entity.landings;
    delete entity.landings;

    const jsonLocal = this.asObject(entity, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE);
    if (this._debug) console.debug('[observed-location-service] [offline] Saving observed location locally...', jsonLocal);

    // Save observed location locally
    await this.entities.save(jsonLocal, { entityName: ObservedLocation.TYPENAME });

    // Save landings
    if (opts.withLanding && isNotEmptyArray(landings)) {
      const program = await this.programRefService.loadByLabel(entity.program.label);
      const landingHasDateTime = program.getPropertyAsBoolean(ProgramProperties.LANDING_DATE_TIME_ENABLE);

      landings.forEach((l) => {
        l.id = null; // Clean ID, to force new ids
        l.observedLocationId = entity.id; // Link to parent entity
        l.updateDate = undefined;

        // Copy date to landing and samples (IMAGINE-276)
        if (!landingHasDateTime) {
          l.dateTime = entity.startDateTime;
          (l.samples || []).forEach((s) => {
            s.sampleDate = l.dateTime;
          });
        }
      });

      // Save landings
      entity.landings = await this.landingService.saveAll(landings, { observedLocationId: entity.id });
    }

    // Update date of children entities, if need (see IMAGINE-276)
    else if (!opts.withLanding && !isNew) {
      await this.updateChildrenDate(entity);
    }

    if (!opts || opts.emitEvent !== false) {
      this.onSave.next([entity]);
    }

    return entity;
  }

  async copyLocally(source: ObservedLocation, opts?: ObservedLocationServiceLoadOptions): Promise<ObservedLocation> {
    console.debug('[observed-location-service] Copy trip locally...', source);

    opts = {
      keepRemoteId: false,
      deletedFromTrash: false,
      withLanding: true,
      ...opts,
    };
    const isLocal = RootDataEntityUtils.isLocal(source);

    // Create a new entity (without id and updateDate)
    const json = this.asObject(source, {
      ...COPY_LOCALLY_AS_OBJECT_OPTIONS,
      keepRemoteId: opts.keepRemoteId,
    });
    json.synchronizationStatus = SynchronizationStatusEnum.DIRTY; // To make sure it will be saved locally

    // Save
    const target = await this.saveLocally(ObservedLocation.fromObject(json), opts);

    // Remove from the local trash
    if (opts.deletedFromTrash) {
      if (isLocal) {
        await this.entities.deleteFromTrash(source, { entityName: ObservedLocation.TYPENAME });
      } else {
        await this.trashRemoteService.delete(ObservedLocation.ENTITY_NAME, source.id);
      }
    }

    if (opts.displaySuccessToast) {
      await this.showToast({ message: 'SOCIAL.USER_EVENT.INFO.COPIED_LOCALLY', type: 'info' });
    }

    return target;
  }

  async copyLocallyById(id: number, opts?: ObservedLocationServiceLoadOptions & { displaySuccessToast?: boolean }): Promise<ObservedLocation> {
    // Load existing data
    const source = await this.load(id, { ...opts, fetchPolicy: 'network-only' });
    // Copy remote trip to local storage
    return await this.copyLocally(source, opts);
  }

  /**
   * Delete many observations
   *
   * @param entities
   * @param opts
   */
  async deleteAll(
    entities: ObservedLocation[],
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    // Delete local entities
    const localEntities = entities?.filter(RootDataEntityUtils.isLocal);
    if (isNotEmptyArray(localEntities)) {
      return this.deleteAllLocally(localEntities, opts);
    }

    const remoteEntities = entities?.filter(EntityUtils.isRemote);
    const ids = remoteEntities?.map((t) => t.id);
    if (isEmptyArray(ids)) return; // stop if empty

    const now = Date.now();
    if (this._debug) console.debug(`[observed-location-service] Deleting {${ids.join(',')}}`, ids);

    await this.graphql.mutate<any>({
      mutation: this.mutations.deleteAll,
      variables: { ids },
      update: (proxy) => {
        // Update the cache
        this.removeFromMutableCachedQueriesByIds(proxy, {
          queries: this.getLoadQueries(), // Remove from all queries - fix #437
          ids,
        });

        if (this._debug) console.debug(`[observed-location-service] Observed locations deleted in ${Date.now() - now}ms`);
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
    entities: ObservedLocation[],
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    // Get local entity ids, then delete id
    const localEntities = entities && entities.filter(RootDataEntityUtils.isLocal);

    // Delete, one by one
    await chainPromises((localEntities || []).map((entity) => () => this.deleteLocally(entity, opts)));
  }

  async deleteLocally(
    entity: ObservedLocation,
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    const trash = !opts || opts?.trash !== false;
    const trashUpdateDate = trash && moment();

    if (this._debug) console.debug(`[observedLocation-service] Deleting observed location #${entity.id}... {trash: ${trash}`);

    try {
      // Load children
      const { data: landings } = await this.landingService.loadAllByObservedLocation(
        { observedLocationId: entity.id },
        { fullLoad: true /*need to keep content in trash*/, computeRankOrder: false }
      );

      await this.entities.delete(entity, { entityName: ObservedLocation.TYPENAME });
      this.onDelete.next([entity]);

      if (isNotNil(landings)) {
        await this.landingService.deleteAll(landings, { trash: false });
      }

      if (trash) {
        // Fill observedLocation's operation, before moving it to trash
        entity.landings = landings;
        entity.updateDate = trashUpdateDate;

        const json = entity.asObject({ ...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, keepLocalId: false });

        // Add to trash
        await this.entities.saveToTrash(json, { entityName: ObservedLocation.TYPENAME });
      }
    } catch (err) {
      console.error('Error during observation location deletion: ', err);
      throw { code: DataErrorCodes.DELETE_ENTITY_ERROR, message: 'ERROR.DELETE_ENTITY_ERROR' };
    }
    this.onDelete.next([entity]);
  }

  async control(entity: ObservedLocation, opts?: ObservedLocationControlOptions): Promise<AppErrorWithDetails> {
    const now = this._debug && Date.now();

    const maxProgression = toNumber(opts?.maxProgression, 100);
    opts = { ...opts, maxProgression };
    opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });

    const progressionStep = maxProgression / 20;

    if (this._debug) console.debug(`[observed-location-service] Control {${entity.id}} ...`);

    opts = await this.fillControlOptions(entity, opts);

    // If control has been disabled (in program's option)
    if (!opts.enable) {
      console.info(`[observed-location-service] Skip control {${entity.id}} (disabled by program option)...`);
      return undefined;
    } // Skip

    const form = this.validatorService.getFormGroup(entity, opts);

    if (!form.valid) {
      // Wait end of validation (e.g. async validators)
      await AppFormUtils.waitWhilePending(form);

      // Get form errors
      if (form.invalid) {
        const errors: FormErrors = AppFormUtils.getFormErrors(form);

        if (this._debug) console.debug(`[observed-location-service] Control {${entity.id}} [INVALID] in ${Date.now() - now}ms`, errors);

        return {
          message: 'COMMON.FORM.HAS_ERROR',
          details: {
            errors,
          },
        };
      }
    }

    if (this._debug) console.debug(`[observed-location-service] Control {${entity.id}} [OK] in ${Date.now() - now}ms`);
    if (opts?.progression) opts.progression.increment(progressionStep);

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
      const errors = await this.controlAllByFilter(childrenFilter, {
        progression: opts?.progression,
        maxProgression: maxProgression - progressionStep,
      });
      if (errors) {
        return {
          message: 'OBSERVED_LOCATION.ERROR.INVALID_SUB',
          details: {
            errors: {
              // TODO Rename sub
              sub: errors,
            },
          },
        };
      }
    }
    // Else control landings
    else {
      const errors = await this.landingService.controlAllByObservedLocation(entity, {
        program: opts?.program,
        strategy: null, // Will be load by landingService.fillControlOptions()
        progression: opts?.progression,
        maxProgression: opts?.maxProgression - progressionStep,
      });
      if (errors.landings) {
        return {
          message: 'OBSERVED_LOCATION.ERROR.INVALID_LANDING',
          details: {
            errors: {
              landings: errors.landings,
            },
          },
        };
      }

      if (this._debug) console.debug(`[observed-location-service] Control {${entity.id}} [OK] in ${Date.now() - now}ms`);
    }

    // TODO Mark local as controlled ?

    return undefined;
  }

  protected async controlAllByFilter(filter: ObservedLocationFilter, opts?: ObservedLocationControlOptions): Promise<FormErrors> {
    const maxProgression = toNumber(opts?.maxProgression, 100);
    opts = {
      ...opts,
      maxProgression,
    };
    opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });
    const endProgression = opts.progression.current + maxProgression;

    // Increment
    this.progressBarService.increase();

    try {
      const { data } = await this.loadAll(0, 1000, undefined, undefined, filter, {});

      if (isEmptyArray(data)) return undefined;
      const progressionStep = maxProgression / data.length / 2; // 2 steps by observed location: control, then save

      let errorsById: FormErrors = null;

      for (const entity of data) {
        const errors = await this.control(entity, { ...opts, maxProgression: progressionStep });

        // Control failed: save error
        if (errors) {
          errorsById = errorsById || {};
          errorsById[entity.id] = errors;

          // translate, then save normally
          const errorMessage = this.formErrorTranslator.translateErrors(errors.details.errors, opts.translatorOptions);
          // const errorMessage = errors.message;
          entity.controlDate = null;
          entity.qualificationComments = errorMessage;

          if (opts.progression?.cancelled) return; // Cancel

          // Save entity
          await this.save(entity);
        }
        // OK succeed: terminate
        else {
          if (opts.progression?.cancelled) return; // Cancel
          // Need to exclude data that already validated (else got exception when pod control already validated data)
          if (isNil(entity.validationDate)) await this.terminate(entity);
        }

        // increament, after save/terminate
        opts.progression.increment(progressionStep);
      }

      return errorsById;
    } catch (err) {
      console.error((err && err.message) || err);
      throw err;
    } finally {
      this.progressBarService.decrease();
      if (opts.progression.current < endProgression) {
        opts.progression.current = endProgression;
      }
    }
  }

  async synchronize(entity: ObservedLocation, opts?: ObservedLocationSaveOptions): Promise<ObservedLocation> {
    opts = {
      enableOptimisticResponse: false, // Optimistic response not need
      ...opts,
    };

    const localId = entity?.id;
    if (!EntityUtils.isLocalId(localId)) throw new Error('Entity must be a local entity');
    if (this.network.offline) throw new Error('Could not synchronize if network if offline');

    // Clone (to keep original entity unchanged)
    entity = entity instanceof Entity ? entity.clone() : entity;
    entity.synchronizationStatus = 'SYNC';
    entity.id = undefined;

    const program = await this.programRefService.loadByLabel(entity.program?.label);
    const useAggregatedLandings = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE);
    const targetProgramLabel = program.getProperty(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM);

    let landings: Landing[] = [];
    let aggregatedLandings: AggregatedLanding[] = [];

    if (useAggregatedLandings) {
      // Load aggregated landings
      const { data } = await this.aggregatedLandingService.loadAllByObservedLocation(
        { observedLocationId: localId },
        { fullLoad: true, rankOrderOnPeriod: false }
      );
      aggregatedLandings = data || [];
    } else {
      // Load landings
      const { data } = await this.landingService.loadAllByObservedLocation(
        { observedLocationId: localId },
        { fullLoad: true, rankOrderOnPeriod: false }
      );
      landings = data || [];
    }

    // Make sure to remove landings here (will be saved AFTER observed location)
    entity.landings = undefined;

    // Get local vessels (not saved)
    const localVessels = arrayDistinct(
      [...landings, ...aggregatedLandings].map((value) => value.vesselSnapshot).filter(EntityUtils.isLocal),
      'id'
    ).map(VesselSnapshot.toVessel);
    if (isNotEmptyArray(localVessels)) {
      const savedVessels = new Map<number, VesselSnapshot>();

      for (const vessel of localVessels) {
        const vesselLocalId = vessel.id;
        const savedVessel = await this.vesselService.synchronize(vessel);
        savedVessels.set(vesselLocalId, VesselSnapshot.fromVessel(savedVessel));
      }

      //replace landing local vessel's by saved one
      [...landings, ...aggregatedLandings].forEach((landing) => {
        if (savedVessels.has(landing.vesselSnapshot.id)) {
          landing.vesselSnapshot = savedVessels.get(landing.vesselSnapshot.id);
        }
      });
    }

    try {
      entity = await this.save(entity, { ...opts, emitEvent: false /*will emit a onSynchronize, instead of onSave */ });

      // Check return entity has a valid id
      if (isNil(entity.id) || entity.id < 0) {
        throw { code: DataErrorCodes.SYNCHRONIZE_ENTITY_ERROR };
      }

      if (!opts || opts.emitEvent !== false) {
        this.onSynchronize.next({ localId, remoteEntity: entity });
      }

      // synchronize landings
      if (isNotEmptyArray(landings)) {
        entity.landings = await Promise.all(
          landings.map((landing) => {
            landing.observedLocationId = entity.id;
            landing.location = entity.location;
            return this.landingService.synchronize(landing);
          })
        );
      }

      // Synchronize aggregated landings
      if (isNotEmptyArray(aggregatedLandings)) {
        await this.aggregatedLandingService.synchronizeAll(aggregatedLandings, {
          filter: {
            observedLocationId: entity.id,
            startDate: entity.startDateTime,
            endDate: entity.endDateTime || entity.startDateTime,
            locationId: entity.location?.id,
            programLabel: targetProgramLabel,
          },
        });
      }
    } catch (err) {
      throw {
        ...err,
        code: DataErrorCodes.SYNCHRONIZE_ENTITY_ERROR,
        message: 'ERROR.SYNCHRONIZE_ENTITY_ERROR',
        context: entity.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE),
      };
    }

    try {
      if (this._debug) console.debug(`[observed-location-service] Deleting observedLocation {${entity.id}} from local storage`);

      // Delete observedLocation
      await this.entities.deleteById(localId, { entityName: ObservedLocation.TYPENAME });
    } catch (err) {
      console.error(`[observed-location-service] Failed to locally delete observedLocation {${entity.id}} and its landings`, err);
      // Continue
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

  async hasSampleWithTagId(observedLocationIds: number[]): Promise<boolean> {
    // Check locally
    const localIds = (observedLocationIds || []).filter(EntityUtils.isLocalId);
    if (isNotEmptyArray(localIds)) {
      const hasSampleFn = async (observedLocationId) => {
        const { data: landings } = await this.landingService.loadAllByObservedLocation(
          { observedLocationId },
          { fullLoad: false, toEntity: false, computeRankOrder: false, withTotal: false }
        );
        return (landings || []).some((l) => l.samplesCount > 0);
      };
      const hasLocalSamples = (await chainPromises(localIds.map((observedLocationId) => () => hasSampleFn(observedLocationId)))).some(
        (has) => has === true
      );
      if (hasLocalSamples) return true;
    }

    // Check remotely
    const remoteIds = (observedLocationIds || []).filter(EntityUtils.isRemoteId);
    if (isNotEmptyArray(remoteIds)) {
      const filter = SampleFilter.fromObject({ withTagId: true, observedLocationIds: remoteIds });
      const res = await this.graphql.query<{ total: number }>({
        query: ObservedLocationQueries.countSamples,
        variables: {
          filter: filter.asPodObject(),
        },
        error: { code: DataErrorCodes.LOAD_ENTITIES_ERROR, message: 'OBSERVED_LOCATION.ERROR.COUNT_SAMPLES_ERROR' },
        fetchPolicy: 'network-only',
      });

      return (res?.total || 0) > 0;
    }

    return false;
  }

  /* -- protected methods -- */

  /**
   * List of importation jobs.
   *
   * @protected
   * @param filter
   * @param opts
   */
  protected getImportJobs(
    filter: Partial<ObservedLocationFilter>,
    opts: {
      maxProgression: undefined;
      program?: Program;
      acquisitionLevels?: string[];
      locationLevelIds?: number[];
      entityNames?: string[];
      countryIds?: number[];
      vesselIds?: number[];
    }
  ): Observable<number>[] {
    const synchroFilter = this.settings.getOfflineFeature<ObservedLocationOfflineFilter>(this.featureName)?.filter;
    filter = filter || ObservedLocationOfflineFilter.toObservedLocationFilter(synchroFilter);
    filter = this.asFilter(filter);

    let programLabel = filter && filter.program?.label;
    const vesselIds = filter?.vesselIds || opts?.vesselIds;
    const landingFilter = ObservedLocationFilter.toLandingFilter({ ...filter, vesselIds });

    if (programLabel) {
      return [
        // Store program to opts, for other services (e.g. used by OperationService)
        JobUtils.defer(async (o) => {
          // No program: Try to find one (and only one) for this user
          if (isNilOrBlank(programLabel)) {
            console.warn(`${this._logPrefix}[import] Trying to find a unique program to configure the import...`);
            const { data: programs, total: programCount } = await this.programRefService.loadAll(
              0,
              1,
              null,
              null,
              OBSERVED_LOCATION_DEFAULT_PROGRAM_FILTER,
              { fetchPolicy: 'no-cache', withTotal: true }
            );
            if (programCount === 1) {
              programLabel = programs[0]?.label;
            } else {
              console.warn(`${this._logPrefix}[import] No unique program found, but found ${programCount} program(s)`);
            }
          }
          // Fill options using program
          if (programLabel) {
            console.debug(`${this._logPrefix}[import] Reducing importation to program {${programLabel}}`);
            const program = await this.programRefService.loadByLabel(programLabel, { fetchPolicy: 'network-only' });
            opts.program = program;
            opts.acquisitionLevels = ProgramUtils.getAcquisitionLevels(program);

            // Import weight conversion entities, if enable on program
            const enableWeightConversion = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE);
            if (enableWeightConversion) {
              console.debug(`${this._logPrefix}[import] WeightLengthConversion - import enabled (by program)`);
              opts.entityNames = [...IMPORT_REFERENTIAL_ENTITIES, ...WEIGHT_CONVERSION_ENTITIES];

              // Limit round weight, to the default country location id
              const countryId = program.getPropertyAsInt(ProgramProperties.TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID);
              if (isNotNilOrBlank(countryId)) {
                console.debug(`${this._logPrefix}[import] RoundWeightConversion - country id: ` + countryId);
                opts.countryIds = opts.countryIds || [];
                if (!opts.countryIds.includes(countryId)) opts.countryIds.push(countryId);
              }
            }

            // Filter on location level used by the observed location feature
            opts.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_OFFLINE_IMPORT_LOCATION_LEVEL_IDS);

            // Compute location levels ids, bases on known program's properties
            if (isEmptyArray(opts.locationLevelIds)) {
              const landingEditor = program.getProperty<LandingEditor>(ProgramProperties.LANDING_EDITOR);
              opts.locationLevelIds = removeDuplicatesFromArray([
                ...program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_LOCATION_LEVEL_IDS),
                ...(landingEditor === 'trip'
                  ? program.getPropertyAsNumbers(ProgramProperties.LANDED_TRIP_FISHING_AREA_LOCATION_LEVEL_IDS)
                  : program.getPropertyAsNumbers(ProgramProperties.LANDING_FISHING_AREA_LOCATION_LEVEL_IDS)),
              ]);
            }
            if (isNotEmptyArray(opts.locationLevelIds))
              console.debug(this._logPrefix + '[import] Locations, having level ids: ' + opts.locationLevelIds.join(','));
          }

          // Vessels
          opts.vesselIds = vesselIds;
        }),

        ...super.getImportJobs(filter, opts),

        // Historical data (if enable)
        ...((landingFilter.startDate &&
          isNotEmptyArray(vesselIds) && [
            // Landings
            JobUtils.defer((o) => this.landingService.executeImport(landingFilter, o), opts),
          ]) ||
          []),
      ];
    } else {
      return super.getImportJobs(null, opts);
    }
  }

  protected finishImport() {
    super.finishImport();

    // Add vessel offline feature
    this.settings.markOfflineFeatureAsSync(VESSEL_FEATURE_NAME);
  }

  protected async updateChildrenDate(entity: ObservedLocation) {
    if (!entity || !entity.program || !entity.program.label || !entity.startDateTime) return; // Skip

    const program = await this.programRefService.loadByLabel(entity.program.label);
    const landingHasDateTime = program.getPropertyAsBoolean(ProgramProperties.LANDING_DATE_TIME_ENABLE);
    if (landingHasDateTime) return; // Not need to update children dates

    const now = Date.now();
    console.info('[observed-location-service] Applying date to children entities (Landing, Sample)...');

    try {
      let res: LoadResult<Landing>;
      let offset = 0;
      const size = 10; // Use paging, to avoid loading ALL landings once
      do {
        res = await this.landingService.loadAll(
          offset,
          size,
          null,
          null,
          { observedLocationId: entity.id },
          { fullLoad: true, fetchPolicy: 'no-cache' }
        );

        const updatedLandings = (res.data || [])
          .map((l) => {
            if (!l.dateTime || !l.dateTime.isSame(entity.startDateTime)) {
              l.dateTime = entity.startDateTime;
              (l.samples || []).forEach((sample) => {
                sample.sampleDate = l.dateTime;
              });
              return l;
            }
            return undefined;
          })
          .filter(isNotNil);

        // Save landings, if need
        if (isNotEmptyArray(updatedLandings)) {
          await this.landingService.saveAll(updatedLandings, { observedLocationId: entity.id, enableOptimisticResponse: false });
        }

        offset += size;
      } while (offset < res.total);

      console.info(`[observed-location-service] Applying date to children entities (Landing, Sample) [OK] in ${Date.now() - now}ms`);
    } catch (err) {
      throw {
        ...err,
        code: TripErrorCodes.UPDATE_OBSERVED_LOCATION_CHILDREN_DATE_ERROR,
        message: 'OBSERVED_LOCATION.ERROR.UPDATE_CHILDREN_DATE_ERROR',
      };
    }
  }

  protected async fillControlOptions(entity: ObservedLocation, opts?: ObservedLocationControlOptions): Promise<ObservedLocationControlOptions> {
    opts = await this.fillProgramOptions(entity, opts);

    opts = {
      ...opts,
      enable: opts.program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CONTROL_ENABLE),
      withMeasurements: true, // Need by full validation
    };

    // Load the strategy from measurementValues (if exists)
    if (!opts.strategy) {
      const strategyResolution = opts.program.getProperty(ProgramProperties.DATA_STRATEGY_RESOLUTION) as DataStrategyResolution;
      switch (strategyResolution) {
        case 'user-select': {
          const strategyLabel = entity.measurementValues?.[PmfmIds.STRATEGY_LABEL];
          if (isNotNilOrBlank(strategyLabel)) {
            opts.strategy = await this.strategyRefService.loadByLabel(strategyLabel, { programId: opts.program?.id });
          }
          break;
        }
        case 'spatio-temporal':
          opts.strategy = await this.strategyRefService.loadByFilter({
            programId: opts?.program.id,
            acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION,
            startDate: entity.startDateTime,
            location: entity.location,
          });
          break;
        case 'last':
          opts.strategy = await this.strategyRefService.loadByFilter({
            programId: opts?.program.id,
            acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION,
          });
          break;
      }
      if (!opts.strategy && strategyResolution !== 'none') {
        console.debug(this._logPrefix + 'No strategy loaded from ObservedLocation#' + entity.id);
      }
    }

    if (!opts.translatorOptions) {
      opts.translatorOptions = {
        controlPathTranslator: {
          translateControlPath: (path) => this.translateControlPath(path, {}),
        },
      };
    }
    return opts;
  }

  protected async fillTerminateOption(entity: ObservedLocation, opts?: IRootDataTerminateOptions): Promise<IRootDataTerminateOptions> {
    opts = await super.fillTerminateOption(entity, opts);

    return {
      withChildren: !opts.program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CONTROL_ENABLE),
      ...opts,
    };
  }
  protected async fillValidateOption(entity: ObservedLocation, opts?: IRootDataValidateOptions): Promise<IRootDataValidateOptions> {
    opts = await super.fillValidateOption(entity, opts);

    return {
      withChildren: !opts.program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CONTROL_ENABLE),
      ...opts,
    };
  }

  protected async showToast<T = any>(opts: ShowToastOptions): Promise<OverlayEventDetail<T>> {
    return Toasts.show(this.toastController, this.translate, opts);
  }
}
