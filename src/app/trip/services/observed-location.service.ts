import { Injectable, Injector } from '@angular/core';
import {
  AccountService, AppErrorWithDetails,
  AppFormUtils,
  arrayDistinct,
  chainPromises,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  Entity,
  EntitySaveOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  FormErrors,
  GraphqlService,
  IEntitiesService,
  IEntityService,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  JobUtils,
  LoadResult,
  NetworkService,
  toNumber
} from '@sumaris-net/ngx-components';
import { Observable } from 'rxjs';

import { FetchPolicy, gql } from '@apollo/client/core';
import { DataCommonFragments, DataFragments } from './trip.queries';
import { filter, map } from 'rxjs/operators';
import { MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, SAVE_AS_OBJECT_OPTIONS } from '../../data/services/model/data-entity.model';
import { ObservedLocation } from './model/observed-location.model';
import { DataRootEntityUtils } from '../../data/services/model/root-data-entity.model';
import { SortDirection } from '@angular/material/sort';
import { IDataEntityQualityService } from '../../data/services/data-quality-service.class';
import { LandingFragments, LandingService } from './landing.service';
import { IDataSynchroService, RootDataSynchroService } from '../../data/services/root-data-synchro-service.class';
import { Landing } from './model/landing.model';
import { ObservedLocationValidatorService } from './validator/observed-location.validator';
import { environment } from '../../../environments/environment';
import { VesselSnapshotFragments } from '../../referential/services/vessel-snapshot.service';
import { OBSERVED_LOCATION_FEATURE_NAME } from './config/trip.config';
import { ProgramProperties } from '../../referential/services/config/program.config';
import { VESSEL_FEATURE_NAME } from '../../vessel/services/config/vessel.config';
import { LandingFilter } from './filter/landing.filter';
import { ObservedLocationFilter } from './filter/observed-location.filter';
import { SampleFilter } from '@app/trip/services/filter/sample.filter';
import { TripFragments } from '@app/trip/services/trip.service';
import { ErrorCodes } from '@app/data/services/errors';
import { TripErrorCodes } from '@app/trip/services/trip.errors';
import { VesselService } from '@app/vessel/services/vessel-service';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { AggregatedLanding } from '@app/trip/services/model/aggregated-landing.model';
import { AggregatedLandingService } from '@app/trip/services/aggregated-landing.service';
import moment from 'moment';


export interface ObservedLocationSaveOptions extends EntitySaveOptions {
  withLanding?: boolean;
  enableOptimisticResponse?: boolean; // True by default
}

export interface ObservedLocationLoadOptions extends EntityServiceLoadOptions {
  withLanding?: boolean;
  toEntity?: boolean;
}

export const ObservedLocationFragments = {
  lightObservedLocation: gql`fragment LightObservedLocationFragment on ObservedLocationVO {
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
  observedLocation: gql`fragment ObservedLocationFragment on ObservedLocationVO {
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
  load: gql`query ObservedLocation($id: Int!) {
    data: observedLocation(id: $id) {
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`,

  loadAll: gql`query ObservedLocations($filter: ObservedLocationFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $trash: Boolean){
    data: observedLocations(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash){
      ...LightObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.lightObservedLocation}`,

  loadAllWithTotal: gql`query ObservedLocations($filter: ObservedLocationFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $trash: Boolean){
    data: observedLocations(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash){
      ...LightObservedLocationFragment
    }
    total: observedLocationsCount(filter: $filter, trash: $trash)
  }
  ${ObservedLocationFragments.lightObservedLocation}`
};

const ObservedLocationMutations = {
  save: gql`mutation SaveObservedLocation($data: ObservedLocationVOInput!, $options: ObservedLocationSaveOptionsInput!){
    data: saveObservedLocation(observedLocation: $data, options: $options){
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`,

  saveWithLandings: gql`mutation SaveObservedLocationWithLandings($data: ObservedLocationVOInput!, $options: ObservedLocationSaveOptionsInput!){
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

  deleteAll: gql`mutation DeleteObservedLocations($ids:[Int]!){
    deleteObservedLocations(ids: $ids)
  }`,

  terminate: gql`mutation TerminateObservedLocation($data: ObservedLocationVOInput!){
    data: controlObservedLocation(observedLocation: $data){
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`,

  validate: gql`mutation ValidateObservedLocation($data: ObservedLocationVOInput!){
    data: validateObservedLocation(observedLocation: $data){
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`,

  unvalidate: gql`mutation UnvalidateObservedLocation($data: ObservedLocationVOInput!){
    data: unvalidateObservedLocation(observedLocation: $data){
      ...ObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.observedLocation}
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.location}`,

  qualify: gql`mutation QualifyObservedLocation($data: ObservedLocationVOInput!){
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
  listenChanges: gql`subscription UpdateObservedLocation($id: Int!, $interval: Int){
    updateObservedLocation(id: $id, interval: $interval) {
      ...LightObservedLocationFragment
    }
  }
  ${ObservedLocationFragments.lightObservedLocation}`
};

const CountSamples: any = gql`
  query SamplesCountQuery($filter: SampleFilterVOInput!){
    samplesCount(filter: $filter)
  }
`;

@Injectable({providedIn: 'root'})
export class ObservedLocationService
  extends RootDataSynchroService<ObservedLocation, ObservedLocationFilter, number, ObservedLocationLoadOptions>
  implements IEntitiesService<ObservedLocation, ObservedLocationFilter>,
    IEntityService<ObservedLocation, number, ObservedLocationLoadOptions>,
    IDataEntityQualityService<ObservedLocation, number>,
    IDataSynchroService<ObservedLocation, ObservedLocationFilter, number, ObservedLocationLoadOptions> {

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
    protected aggregatedLandingService: AggregatedLandingService
  ) {
    super(injector, ObservedLocation, ObservedLocationFilter, {
      queries: ObservedLocationQueries,
      mutations: ObservedLocationMutations,
      subscriptions: ObservedLocationSubscriptions
    });

    this._featureName = OBSERVED_LOCATION_FEATURE_NAME;

    // FOR DEV ONLY
    this._debug = !environment.production;
    if (this._debug) console.debug('[observed-location-service] Creating service');
  }

  watchAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection,
           dataFilter?: Partial<ObservedLocationFilter>,
           opts?: EntitiesServiceWatchOptions): Observable<LoadResult<ObservedLocation>> {

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
      trash: opts && opts.trash || false,
      filter: dataFilter?.asPodObject()
    };

    let now = Date.now();
    console.debug('[observed-location-service] Watching observed locations... using options:', variables);

    const withTotal = (!opts || opts.withTotal !== false);
    const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
    return this.mutableWatchQuery<LoadResult<ObservedLocation>>({
      queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
      query,
      arrayFieldName: 'data',
      totalFieldName: withTotal ? 'total' : undefined,
      insertFilterFn: dataFilter?.asFilterFn(),
      variables,
      error: {code: ErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR'},
      fetchPolicy: opts && opts.fetchPolicy || 'cache-and-network'
    })
      .pipe(
        filter(() => !this.loading),
        map(({data, total}) => {
          const entities = (data || []).map(ObservedLocation.fromObject);
          if (now) {
            console.debug(`[observed-location-service] Loaded {${entities.length || 0}} observed locations in ${Date.now() - now}ms`, entities);
            now = undefined;
          }
          return {data: entities, total};
        }));
  }

  watchAllLocally(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection,
                  dataFilter?: Partial<ObservedLocationFilter>,
                  opts?: EntitiesServiceWatchOptions): Observable<LoadResult<ObservedLocation>> {

    dataFilter = this.asFilter(dataFilter);

    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy: sortBy || 'startDateTime',
      sortDirection: sortDirection || 'asc',
      filter: dataFilter && dataFilter.asFilterFn()
    };

    console.debug('[observed-location-service] Watching local observed locations... using options:', variables);

    return this.entities.watchAll<ObservedLocation>(ObservedLocation.TYPENAME, variables)
      .pipe(
        map(res => {
          const data = (res && res.data || []).map(ObservedLocation.fromObject);
          const total = res && isNotNil(res.total) ? res.total : undefined;
          return {data, total};
        }));
  }

  async load(id: number, opts?: ObservedLocationLoadOptions): Promise<ObservedLocation> {
    if (isNil(id)) throw new Error('Missing argument \'id\'');

    const now = Date.now();
    if (this._debug) console.debug(`[observed-location-service] Loading observed location {${id}}...`);
    this.loading = true;

    try {
      let data: any;

      // If local entity
      if (id < 0) {
        data = await this.entities.load<ObservedLocation>(id, ObservedLocation.TYPENAME);
        if (!data) throw {code: ErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR'};

        if (opts && opts.withLanding) {
          data.landings = await this.entities.loadAll<Landing>(Landing.TYPENAME, {
            filter: LandingFilter.fromObject({observedLocationId: id}).asFilterFn()
          }, {
            fullLoad: true
          });
        }
      } else {
        const res = await this.graphql.query<{ data: ObservedLocation }>({
          query: this.queries.load,
          variables: {id},
          error: {code: ErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR'},
          fetchPolicy: opts && opts.fetchPolicy || undefined
        });
        data = res && res.data;
      }
      const entities = (!opts || opts.toEntity !== false)
        ? ObservedLocation.fromObject(data)
        : (data as ObservedLocation);
      if (id > 0 && entities && opts && opts.withLanding) {
        entities.landings = (await this.landingService.loadAllByObservedLocation({observedLocationId: id})).data;
      }

      if (entities && this._debug) console.debug(`[observed-location-service] Observed location #${id} loaded in ${Date.now() - now}ms`, entities);

      return entities;
    } finally {
      this.loading = false;
    }
  }

  public listenChanges(id: number, opts?: {
    interval?: number;
    fetchPolicy: FetchPolicy;
  }): Observable<ObservedLocation> {
    if (!id && id !== 0) throw new Error('Missing argument \'id\' ');

    if (this._debug) console.debug(`[observed-location-service] [WS] Listening changes for observedLocation {${id}}...`);

    return this.graphql.subscribe<{ data: ObservedLocation }, { id: number, interval: number }>({
      query: this.subscriptions.listenChanges,
      fetchPolicy: opts && opts.fetchPolicy || undefined,
      variables: {id, interval: toNumber(opts && opts.interval, 10)},
      error: {
        code: ErrorCodes.SUBSCRIBE_ENTITY_ERROR,
        message: 'ERROR.SUBSCRIBE_ENTITY_ERROR'
      }
    })
      .pipe(
        map(({data}) => {
          const entity = data && ObservedLocation.fromObject(data);
          if (entity && this._debug) console.debug(`[observed-location-service] Observed location {${id}} updated on server !`, entity);
          return entity;
        })
      );
  }

  async save(entity: ObservedLocation, opts?: ObservedLocationSaveOptions): Promise<ObservedLocation> {
    const isNew = isNil(entity.id);

    // If is a local entity: force a local save
    const isLocal = isNew ? (entity.synchronizationStatus && entity.synchronizationStatus !== 'SYNC') : entity.id < 0;
    if (isLocal) {
      return this.saveLocally(entity, opts);
    }

    opts = {
      withLanding: false,
      ...opts
    };

    const now = Date.now();
    if (this._debug) console.debug('[observed-location-service] Saving an observed location...');

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Reset quality properties
    this.resetQualityProperties(entity);

    // Transform into json
    const json = this.asObject(entity, SAVE_AS_OBJECT_OPTIONS);
    if (isNew) delete json.id; // Make to remove temporary id, before sending to graphQL
    if (this._debug) console.debug('[observed-location-service] Using minify object, to send:', json);

    const variables = {
      data: json,
      options: {
        withLanding: opts.withLanding
      }
    };

    const mutation = opts.withLanding ? ObservedLocationMutations.saveWithLandings : this.mutations.save;
    await this.graphql.mutate<{ data: ObservedLocation }>({
      mutation,
      variables,
      error: {code: ErrorCodes.SAVE_ENTITY_ERROR, message: 'ERROR.SAVE_ENTITY_ERROR'},
      update: (proxy, {data}) => {
        const savedEntity = data && data.data;
        if (savedEntity !== entity) {
          if (this._debug) console.debug(`[observed-location-service] Observed location saved in ${Date.now() - now}ms`, entity);
          this.copyIdAndUpdateDate(savedEntity, entity);
        }

        // Add to cache
        if (isNew) {
          this.insertIntoMutableCachedQueries(proxy, {
            queries: this.getLoadQueries(),
            data: savedEntity
          });
        }
      }
    });

    // Update date of children entities, if need (see IMAGINE-276)
    if (!isNew) {
      await this.updateChildrenDate(entity);
    }

    return entity;
  }

  async saveLocally(entity: ObservedLocation, opts?: ObservedLocationSaveOptions): Promise<ObservedLocation> {
    if (isNotNil(entity.id) && entity.id >= 0) throw new Error('Must be a local entity');
    opts = {
      withLanding: false,
      ...opts
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
    await this.entities.save(jsonLocal, {entityName: ObservedLocation.TYPENAME});

    // Save landings
    if (opts.withLanding && isNotEmptyArray(landings)) {

      const program = await this.programRefService.loadByLabel(entity.program.label);
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
      entity.landings = await this.landingService.saveAll(landings, {observedLocationId: entity.id});
    }

    // Update date of children entities, if need (see IMAGINE-276)
    else if (!opts.withLanding && !isNew) {
      await this.updateChildrenDate(entity);
    }

    return entity;
  }

  /**
   * Delete many observations
   * @param entities
   * @param opts
   */
  async deleteAll(entities: ObservedLocation[], opts?: {
    trash?: boolean; // True by default
  }): Promise<any> {

    // Delete local entities
    const localEntities = entities?.filter(DataRootEntityUtils.isLocal);
    if (isNotEmptyArray(localEntities)) {
      return this.deleteAllLocally(localEntities, opts);
    }

    const ids = entities?.filter(EntityUtils.isRemote).map(t => t.id);
    if (isEmptyArray(ids)) return; // stop if empty

    const now = Date.now();
    if (this._debug) console.debug(`[observed-location-service] Deleting {${ids.join(',')}}`, ids);

    await this.graphql.mutate<any>({
      mutation: this.mutations.deleteAll,
      variables: {ids},
      update: (proxy) => {
        // Update the cache
        this.removeFromMutableCachedQueriesByIds(proxy, {
          queryName: 'LoadAll',
          ids
        });

        if (this._debug) console.debug(`[observed-location-service] Observed locations deleted in ${Date.now() - now}ms`);

      }
    });
  }

  /**
   * Delete many local entities
   * @param entities
   * @param opts
   */
  async deleteAllLocally(entities: ObservedLocation[], opts?: {
    trash?: boolean; // True by default
  }): Promise<any> {

    // Get local entity ids, then delete id
    const localEntities = entities && entities
      .filter(DataRootEntityUtils.isLocal);

    // Delete, one by one
    await chainPromises((localEntities || [])
      .map(entity => () => this.deleteLocally(entity, opts))
    );
  }

  async deleteLocally(entity: ObservedLocation, opts?: {
    trash?: boolean; // True by default
  }): Promise<any> {
    const trash = !opts || opts !== false;
    const trashUpdateDate = trash && moment();

    if (this._debug) console.debug(`[observedLocation-service] Deleting observed location #${entity.id}... {trash: ${trash}`);

    try {
      // Load children
      const res = await this.landingService.loadAllByObservedLocation({observedLocationId: entity.id},
        {fullLoad: true, computeRankOrder: false});
      const landings = res && res.data;

      await this.entities.delete(entity, {entityName: ObservedLocation.TYPENAME});

      if (isNotNil(landings)) {
        await this.landingService.deleteAll(landings, {trash: false});
      }

      if (trash) {
        // Fill observedLocation's operation, before moving it to trash
        entity.landings = landings;
        entity.updateDate = trashUpdateDate;

        const json = entity.asObject({...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, keepLocalId: false});

        // Add to trash
        await this.entities.saveToTrash(json, {entityName: ObservedLocation.TYPENAME});
      }
    } catch (err) {
      console.error('Error during observation location deletion: ', err);
      throw {code: ErrorCodes.DELETE_ENTITY_ERROR, message: 'ERROR.DELETE_ENTITY_ERROR'};
    }
  }

  async control(entity: ObservedLocation): Promise<FormErrors> {

    const now = this._debug && Date.now();
    if (this._debug) console.debug(`[observed-location-service] Control {${entity.id}}...`, entity);

    const programLabel = entity.program && entity.program.label || null;
    if (!programLabel) throw new Error('Missing entity\'s program. Unable to control the entity');
    const program = await this.programRefService.loadByLabel(programLabel);

    const form = this.validatorService.getFormGroup(entity, {
      program,
      withMeasurements: true // Need by full validation
    });

    if (!form.valid) {
      // Wait end of validation (e.g. async validators)
      await AppFormUtils.waitWhilePending(form);

      // Get form errors
      if (form.invalid) {
        const errors: FormErrors = AppFormUtils.getFormErrors(form);

        if (this._debug) console.debug(`[observed-location-service] Control {${entity.id}} [INVALID] in ${Date.now() - now}ms`, errors);

        return errors;
      }
    }

    if (this._debug) console.debug(`[observed-location-service] Control ${entity.id}} [OK] in ${Date.now() - now}ms`);

    return undefined;
  }

  async synchronize(entity: ObservedLocation, opts?: ObservedLocationSaveOptions): Promise<ObservedLocation> {
    opts = {
      enableOptimisticResponse: false, // Optimistic response not need
      ...opts
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
      const { data } = await this.aggregatedLandingService.loadAllByObservedLocation({ observedLocationId: localId },
        { fullLoad: true, rankOrderOnPeriod: false });
      aggregatedLandings = data || [];

    } else {

      // Load landings
      const { data } = await this.landingService.loadAllByObservedLocation({ observedLocationId: localId },
        { fullLoad: true, rankOrderOnPeriod: false });
      landings = data || [];

    }

    // Make sure to remove landings here (will be saved AFTER observed location)
    entity.landings = undefined;

    // Get local vessels (not saved)
    const localVessels = arrayDistinct(
      [...landings, ...aggregatedLandings].map(value => value.vesselSnapshot).filter(EntityUtils.isLocal),
      'id'
    )
      .map(VesselSnapshot.toVessel);
    if (isNotEmptyArray(localVessels)) {

      const savedVessels = new Map<number, VesselSnapshot>();

      for (const vessel of localVessels) {
        const vesselLocalId= vessel.id;
        const savedVessel = await this.vesselService.synchronize(vessel);
        savedVessels.set(vesselLocalId, VesselSnapshot.fromVessel(savedVessel));
      }

      //replace landing local vessel's by saved one
      [...landings, ...aggregatedLandings].forEach(landing => {
        if (savedVessels.has(landing.vesselSnapshot.id)){
          landing.vesselSnapshot = savedVessels.get(landing.vesselSnapshot.id);
        }
      });
    }

    try {

      entity = await this.save(entity, opts);

      // Check return entity has a valid id
      if (isNil(entity.id) || entity.id < 0) {
        throw {code: ErrorCodes.SYNCHRONIZE_ENTITY_ERROR};
      }

      // synchronize landings
      if (isNotEmptyArray(landings)) {
        entity.landings = await Promise.all(
          landings.map(landing => {
            landing.observedLocationId = entity.id;
            landing.location = entity.location;
            return this.landingService.synchronize(landing);
          }),
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
            programLabel: targetProgramLabel
          }
        });
      }

    } catch (err) {
      throw {
        ...err,
        code: ErrorCodes.SYNCHRONIZE_ENTITY_ERROR,
        message: 'ERROR.SYNCHRONIZE_ENTITY_ERROR',
        context: entity.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE)
      };
    }

    try {
      if (this._debug) console.debug(`[observed-location-service] Deleting observedLocation {${entity.id}} from local storage`);

      // Delete observedLocation
      await this.entities.deleteById(localId, {entityName: ObservedLocation.TYPENAME});
    } catch (err) {
      console.error(`[observed-location-service] Failed to locally delete observedLocation {${entity.id}} and its landings`, err);
      // Continue
    }

    return entity;
  }

  async countSamples(observedLocationIds: number[]): Promise<number> {
    if (this._debug) console.debug(`[observed-location-service] Count samples...`);

    const filter: Partial<SampleFilter> = {
      observedLocationIds: observedLocationIds
    };

    const res = await this.graphql.query<{ samplesCount: number }>({
      query: CountSamples,
      variables: {
        filter
      },
      error: {code: ErrorCodes.LOAD_ENTITIES_ERROR, message: 'OBSERVED_LOCATION.ERROR.COUNT_SAMPLES_ERROR'},
      fetchPolicy: 'network-only'
    });

    return res && res.samplesCount;
  }

  /* -- protected methods -- */

  /**
   * List of importation jobs.
   * @protected
   * @param opts
   */
  protected getImportJobs(filter: Partial<ObservedLocationFilter>, opts: {
    maxProgression: undefined;
  }): Observable<number>[] {

    filter = filter || this.settings.getOfflineFeature(this.featureName)?.filter;

    if (filter) {
      const landingFilter = ObservedLocationFilter.toLandingFilter(filter);
      return [
        ...super.getImportJobs(filter, opts),

        // Landing (historical data)
        JobUtils.defer(o => this.landingService.executeImport(landingFilter, o), opts)
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
        res = await this.landingService.loadAll(offset, size, null, null, {observedLocationId: entity.id}, {fullLoad: true});

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
          await this.landingService.saveAll(updatedLandings, {observedLocationId: entity.id, enableOptimisticResponse: false});
        }

        offset += size;
      } while (offset < res.total);

      console.info(`[observed-location-service] Applying date to children entities (Landing, Sample) [OK] in ${Date.now() - now}ms`);
    } catch (err) {
      throw {
        ...err,
        code: TripErrorCodes.UPDATE_OBSERVED_LOCATION_CHILDREN_DATE_ERROR,
        message: 'OBSERVED_LOCATION.ERROR.UPDATE_CHILDREN_DATE_ERROR'
      };
    }
  }

}
