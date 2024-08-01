import { Injectable, InjectionToken } from '@angular/core';
import {
  AccountService,
  AppFormUtils,
  arrayDistinct,
  BaseEntityGraphqlQueries,
  BaseGraphqlService,
  DateUtils,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  EntityUtils,
  firstNotNilPromise,
  FormErrors,
  FormErrorTranslator,
  FormErrorTranslatorOptions,
  GraphqlService,
  IEntitiesService,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  JobUtils,
  LoadResult,
  NetworkService,
  removeDuplicatesFromArray,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Trip } from '../trip/trip.model';
import { environment } from '@environments/environment';
import { BehaviorSubject, combineLatest, EMPTY, Observable } from 'rxjs';
import { filter, first, map, throttleTime } from 'rxjs/operators';
import { gql, WatchQueryFetchPolicy } from '@apollo/client/core';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { SortDirection } from '@angular/material/sort';
import { PhysicalGearFilter } from './physical-gear.filter';
import { TripFilter } from '@app/trip/trip/trip.filter';
import { DataErrorCodes } from '@app/data/services/errors';
import { mergeLoadResult } from '@app/shared/functions';
import { VesselSnapshotFragments } from '@app/referential/services/vessel-snapshot.service';
import { ProgramFragments } from '@app/referential/services/program.fragments';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { PhysicalGearValidatorOptions, PhysicalGearValidatorService } from '@app/trip/physicalgear/physicalgear.validator';
import { IProgressionOptions } from '@app/data/services/data-quality-service.class';
import { AcquisitionLevelCodes, AcquisitionLevelType } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { MEASUREMENT_VALUES_PMFM_ID_REGEXP, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { PhysicalGearFragments } from '@app/trip/common/data.fragments';

const Queries: BaseEntityGraphqlQueries & { loadAllWithTrip: any } = {
  loadAll: gql`
    query PhysicalGears($filter: PhysicalGearFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: physicalGears(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...PhysicalGearFragment
      }
    }
    ${PhysicalGearFragments.physicalGear}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.lightDepartment}
  `,

  load: gql`
    query PhysicalGear($id: Int!) {
      data: physicalGear(id: $id) {
        ...PhysicalGearFragment
      }
    }
    ${PhysicalGearFragments.physicalGear}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.lightDepartment}
  `,

  loadAllWithTrip: gql`
    query PhysicalGearsWithTrip($filter: PhysicalGearFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: physicalGears(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...PhysicalGearFragment
        trip {
          departureDateTime
          returnDateTime
          program {
            ...ProgramRefFragment
          }
          vesselSnapshot {
            ...LightVesselSnapshotFragment
          }
        }
      }
    }
    ${PhysicalGearFragments.physicalGear}
    ${ReferentialFragments.location}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.lightDepartment}
    ${ReferentialFragments.lightDepartment}
    ${VesselSnapshotFragments.lightVesselSnapshot}
    ${ProgramFragments.programRef}
  `,
};

const sortByTripDateFn = (n1: PhysicalGear, n2: PhysicalGear) => {
  const d1 = n1.trip && (n1.trip.returnDateTime || n1.trip.departureDateTime);
  const d2 = n2.trip && (n2.trip.returnDateTime || n2.trip.departureDateTime);
  return d1.isSame(d2) ? 0 : d1.isAfter(d2) ? 1 : -1;
};

export const PHYSICAL_GEAR_DATA_SERVICE_TOKEN = new InjectionToken<IEntitiesService<PhysicalGear, PhysicalGearFilter>>('PhysicalGearDataService');

export declare interface PhysicalGearServiceWatchOptions extends EntitiesServiceWatchOptions {
  fullLoad?: boolean;
  withOffline?: boolean;
  distinctBy?: string[];
  query?: any;
}

export declare interface PhysicalGearControlOptions extends PhysicalGearValidatorOptions, IProgressionOptions {
  acquisitionLevel?: AcquisitionLevelType;
  initialPmfms?: DenormalizedPmfmStrategy[];
  initialChildrenPmfms?: DenormalizedPmfmStrategy[];

  // Translator options
  translatorOptions?: FormErrorTranslatorOptions;
}

@Injectable({ providedIn: 'root' })
export class PhysicalGearService
  extends BaseGraphqlService<PhysicalGear, PhysicalGearFilter>
  implements IEntitiesService<PhysicalGear, PhysicalGearFilter, PhysicalGearServiceWatchOptions>
{
  loading = false;

  constructor(
    protected graphql: GraphqlService,
    protected network: NetworkService,
    protected accountService: AccountService,
    protected entities: EntitiesStorage,
    protected validatorService: PhysicalGearValidatorService,
    protected programRefService: ProgramRefService,
    protected formErrorTranslator: FormErrorTranslator
  ) {
    super(graphql, environment);
    this._logPrefix = '[physical-gear-service] ';

    // -- For DEV only
    this._debug = !environment.production;
  }

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<PhysicalGearFilter>,
    opts?: PhysicalGearServiceWatchOptions
  ): Observable<LoadResult<PhysicalGear>> {
    if (
      !dataFilter ||
      (isNil(dataFilter.parentGearId) && (isNil(dataFilter.program) || (isNil(dataFilter.vesselId) && isNil(dataFilter.startDate))))
    ) {
      console.warn(
        "[physical-gear-service] Missing physical gears filter. At least 'parentGearId', or 'program' and 'vesselId' or 'startDate'. Skipping."
      );
      return EMPTY;
    }

    dataFilter = this.asFilter(dataFilter);

    // Fix sortBy
    sortBy = sortBy !== 'id' ? sortBy : 'rankOrder';
    sortBy = sortBy !== 'label' ? sortBy : 'gear.label';

    const forceOffline =
      this.network.offline ||
      (isNotNil(dataFilter.tripId) && dataFilter.tripId < 0) ||
      (isNotNil(dataFilter.parentGearId) && dataFilter.parentGearId < 0);
    const offline = forceOffline || opts?.withOffline || false;
    const online = !forceOffline;

    const offline$ =
      offline && this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, { ...opts, toEntity: false, distinctBy: undefined });
    const online$ =
      online && this.watchAllRemotely(offset, size, sortBy, sortDirection, dataFilter, { ...opts, toEntity: false, distinctBy: undefined });

    // Merge local and remote
    const res =
      offline$ && online$ ? combineLatest([offline$, online$]).pipe(map(([res1, res2]) => mergeLoadResult(res1, res2))) : offline$ || online$;
    return res.pipe(map((res) => this.applyWatchOptions(res, offset, size, sortBy, sortDirection, dataFilter, opts)));
  }

  async deleteAll(data: PhysicalGear[], options?: any): Promise<any> {
    console.error('PhysicalGearService.deleteAll() not implemented yet');
  }

  async saveAll(data: PhysicalGear[], options?: any): Promise<PhysicalGear[]> {
    console.error('PhysicalGearService.saveAll() not implemented yet !');
    return data;
  }

  protected watchAllRemotely(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<PhysicalGearFilter>,
    opts?: PhysicalGearServiceWatchOptions
  ): Observable<LoadResult<PhysicalGear>> {
    if (
      !dataFilter ||
      (isNil(dataFilter.parentGearId) && (isNil(dataFilter.program) || (isNil(dataFilter.vesselId) && isNil(dataFilter.startDate))))
    ) {
      console.warn(
        "[physical-gear-service] Missing physical gears filter. Expected at least 'parentGearId', or 'program' and 'vesselId' or 'startDate'. Skipping."
      );
      return EMPTY;
    }

    const variables: any = {
      offset: offset || 0,
      size: size >= 0 ? size : 100,
      sortBy: (sortBy !== 'id' && sortBy !== 'lastUsed' && sortBy) || 'rankOrder',
      sortDirection: sortDirection || 'desc',
      filter: dataFilter.asPodObject(),
    };

    let now = this._debug && Date.now();
    if (this._debug) console.debug('[physical-gear-service] Loading physical gears... using options:', variables);

    const withTrip = (isNotNil(dataFilter?.vesselId) || isNotEmptyArray(dataFilter.vesselIds)) && isNil(dataFilter.tripId);
    const query = opts?.query || (withTrip ? Queries.loadAllWithTrip : Queries.loadAll);
    return this.graphql
      .watchQuery<LoadResult<any>>({
        query,
        variables,
        error: { code: DataErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
        fetchPolicy: (opts && opts.fetchPolicy) || undefined,
      })
      .pipe(
        throttleTime(200), // avoid multiple call
        filter(() => !this.loading),
        map(({ data, total }) => {
          if (now) {
            console.debug(`[physical-gear-service] Loaded ${data.length} physical gears in ${Date.now() - now}ms`);
            now = undefined;
          }
          return {
            data,
            total: total || data.length,
          };
        }),
        map((res) => this.applyWatchOptions(res, offset, size, sortBy, sortDirection, dataFilter, opts))
      );
  }

  /**
   * Get physical gears, from trips data, and imported gears (offline mode)
   *
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param dataFilter
   * @param opts
   */
  watchAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<PhysicalGearFilter>,
    opts?: PhysicalGearServiceWatchOptions
  ): Observable<LoadResult<PhysicalGear>> {
    if (!dataFilter || (isNil(dataFilter.parentGearId) && isNil(dataFilter.vesselId) && isEmptyArray(dataFilter.vesselIds))) {
      console.warn("[physical-gear-service] Missing physical gears filter. Expected at least 'vesselId' or 'parentGearId'. Skipping.");
      return EMPTY;
    }

    const withTrip = isNil(dataFilter.tripId);
    const fromTrip$ = this.watchAllLocallyFromTrips(offset, size, sortBy, sortDirection, dataFilter, {
      ...opts,
      toEntity: false,
      distinctBy: undefined,
    });

    // Then, search from predoc (physical gears imported by the offline mode, into the local storage)
    const variables: any = {
      offset: offset || 0,
      size,
      sortBy: (sortBy !== 'id' && sortBy !== 'lastUsed' && sortBy) || 'rankOrder',
      sortDirection: sortDirection || 'desc',
      filter: dataFilter.asFilterFn(),
    };
    if (this._debug) console.debug('[physical-gear-service] Loading physical gears locally... using variables:', variables);
    const fromStorage$ = this.entities.watchAll<PhysicalGear>(PhysicalGear.TYPENAME, variables, { fullLoad: opts && opts.fullLoad });

    const res =
      fromTrip$ && fromStorage$
        ? // Merge local and remote
          combineLatest([fromTrip$, fromStorage$]).pipe(map(([res1, res2]) => mergeLoadResult(res1, res2)))
        : fromTrip$ || fromStorage$;

    return res.pipe(map((res) => this.applyWatchOptions(res, offset, size, sortBy, sortDirection, dataFilter, opts)));
  }

  watchAllLocallyFromTrips(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<PhysicalGearFilter>,
    opts?: PhysicalGearServiceWatchOptions
  ): Observable<LoadResult<PhysicalGear>> {
    if (!dataFilter || (isNil(dataFilter.tripId) && (isNil(dataFilter.vesselId) || isNil(dataFilter.program)))) {
      console.warn('[physical-gear-service] Trying to load gears from trips without [vesselId, program] or without [tripdId]. Skipping.');
      return EMPTY;
    }
    const tripFilter = TripFilter.fromObject(
      dataFilter &&
        <Partial<TripFilter>>{
          id: dataFilter.tripId,
          vesselId: dataFilter.vesselId,
          vesselIds: dataFilter.vesselIds,
          startDate: dataFilter.startDate,
          endDate: dataFilter.endDate,
          program: dataFilter.program,
          excludedIds: isNotNil(dataFilter.excludeTripId) ? [dataFilter.excludeTripId] : undefined,
        }
    );

    size = size >= 0 ? size : 100;
    const variables: any = {
      offset: offset || 0,
      size,
      sortBy: 'id', // Need a trip attribute, not a physicalGear attributes
      sortDirection: sortDirection || 'desc',
      filter: tripFilter.asFilterFn(),
    };

    if (this._debug) console.debug('[physical-gear-service] Loading physical gears, from local trips... using variables:', variables);

    const withTrip = isNil(dataFilter.tripId);

    return this.entities
      .watchAll<Trip>(Trip.TYPENAME, variables, { fullLoad: true }) // FullLoad is needed to get gears
      .pipe(
        // Need only one iteration
        first(),
        // Get trips array
        map((res) => (res && res.data) || []),
        // Extract physical gears, from trip
        map((trips) =>
          trips.reduce(
            (res, trip) =>
              res.concat(
                (trip.gears || []).map((gear) => ({
                  ...gear,
                  // Add metadata on trip, if need
                  trip: withTrip
                    ? {
                        id: trip.id,
                        program: trip.program,
                        departureDateTime: trip.departureDateTime,
                        returnDateTime: trip.returnDateTime,
                      }
                    : undefined,
                }))
              ),
            []
          )
        ),
        // Return as load result
        map((data) => ({ data, total: data.length })),
        map((res) => this.applyWatchOptions(res, offset, size, sortBy, sortDirection, dataFilter, opts))
      );
  }

  protected applyWatchOptions(
    { data, total }: LoadResult<PhysicalGear>,
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<PhysicalGearFilter>,
    opts?: PhysicalGearServiceWatchOptions
  ): LoadResult<PhysicalGear> {
    const toEntity = !opts || opts.toEntity !== false;
    let entities = toEntity ? (data || []).map((source) => PhysicalGear.fromObject(source, opts)) : ((data || []) as PhysicalGear[]);

    // Sort by trip dates
    const withTrip = isNil(filter.tripId);

    // Remove duplicated gears
    if (isNotEmptyArray(opts?.distinctBy)) {
      // Sort by trip dates desc, to keep newer
      if (toEntity && withTrip) entities.sort(sortByTripDateFn).reverse();

      entities = arrayDistinct(entities, opts?.distinctBy);
    }

    // Sort
    if (sortBy) {
      entities = toEntity ? entities : entities.slice(); // Make sure to source array, as it can be a readonly array
      if (sortBy === 'lastUsed') {
        if (toEntity && withTrip) {
          entities.sort(sortByTripDateFn);
          if (sortDirection === 'desc') {
            entities.reverse();
          }
        }
      } else {
        EntityUtils.sort(entities, sortBy, sortDirection);
      }
    }

    return { data: entities, total };
  }

  async load(
    id: number,
    tripId?: number,
    opts?: {
      distinctByRankOrder?: boolean;
      toEntity?: boolean;
      fullLoad?: boolean;
    }
  ): Promise<PhysicalGear | null> {
    if (isNil(id)) throw new Error("Missing argument 'id' ");

    const now = this._debug && Date.now();
    if (this._debug) console.debug(`[physical-gear-service] Loading physical gear #${id}...`);
    this.loading = true;

    try {
      let json: any;
      const offline = this.network.offline || id < 0;

      // Load locally
      if (offline) {
        // Watch on storage
        json = await this.entities.load<PhysicalGear>(id, PhysicalGear.TYPENAME);

        if (!json) {
          // If not on storage, watch on trip
          const trip = await this.entities.load<Trip>(tripId, Trip.TYPENAME);
          if (trip && trip.gears) {
            json = trip.gears.find((g) => g.id === id);
          }
        }
        if (!json) throw { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' };
      }

      // Load from pod
      else {
        const res = await this.graphql.query<{ data: PhysicalGear }>({
          query: Queries.load,
          variables: { id },
          error: { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' },
        });
        json = res && res.data;
      }

      // Transform to entity
      const data = !opts || opts.toEntity !== false ? PhysicalGear.fromObject(json) : (json as PhysicalGear);
      if (data && this._debug) console.debug(`[physical-gear-service] Physical gear #${id} loaded in ${Date.now() - now}ms`, data);
      return data;
    } finally {
      this.loading = false;
    }
  }

  async loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<PhysicalGearFilter>,
    opts?: {
      distinctByRankOrder?: boolean;
      fetchPolicy?: WatchQueryFetchPolicy;
      toEntity?: boolean;
      withTotal?: boolean;
      query?: any;
    }
  ): Promise<LoadResult<PhysicalGear>> {
    return firstNotNilPromise(this.watchAll(offset, size, sortBy, sortDirection, dataFilter, opts));
  }

  async loadAllByParentId(
    filter: { tripId?: number; parentGearId: number },
    opts?: {
      fetchPolicy?: WatchQueryFetchPolicy;
      toEntity?: boolean;
      withTotal?: boolean;
    }
  ): Promise<PhysicalGear[]> {
    // If we know the local trip, load it
    if (isNotNil(filter.tripId) && filter.tripId < 0) {
      const trip = (await this.entities.load(filter.tripId, Trip.TYPENAME)) as Trip;
      return (trip.gears || []).find((g) => g.id === filter.parentGearId)?.children;
    }

    const res = await this.loadAll(0, 100, 'rankOrder', 'asc', filter, opts);
    return res?.data;
  }

  async controlAllByTrip(trip: Trip, opts?: PhysicalGearControlOptions): Promise<FormErrors> {
    const maxProgression = toNumber(opts?.maxProgression, 100);
    opts = {
      ...opts,
      maxProgression,
    };
    opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });
    const endProgression = opts.progression.current + maxProgression;

    try {
      const entities = trip.gears;
      if (isEmptyArray(entities)) return undefined; // Skip if empty

      // Prepare control options
      opts = await this.fillControlOptionsForTrip(trip.id, opts);
      const progressionStep = maxProgression / entities.length; // 2 steps by gear: control, then save

      let errorsById: FormErrors = null;

      // For each entity
      for (const entity of entities) {
        const errors = await this.control(entity, opts);

        // Control failed: save error
        if (errors) {
          errorsById = errorsById || {};
          errorsById[entity.id] = errors;

          // translate, and update the entity
          const errorMessage = this.formErrorTranslator.translateErrors(errors, opts.translatorOptions);

          DataEntityUtils.markAsInvalid(entity, errorMessage);
        }
        // OK succeed: mark as controlled
        else {
          DataEntityUtils.markAsControlled(entity);
        }

        if (opts.progression?.cancelled) return; // Cancel
        opts.progression.increment(progressionStep);
      }

      return errorsById;
    } catch (err) {
      console.error((err && err.message) || err);
      throw err;
    } finally {
      if (opts.progression.current < endProgression) {
        opts.progression.current = endProgression;
      }
    }
  }

  async control(entity: PhysicalGear, opts?: PhysicalGearControlOptions): Promise<FormErrors> {
    const now = this._debug && Date.now();
    if (this._debug) console.debug(`[physical-gear-service] Control #${entity.id}...`, entity);

    // Prepare control options
    opts = await this.fillControlOptionsForGear(entity, opts);

    // Make sure to convert ALL pmfms to form (sometime we convert only required pmfms - e.g. see optimization in the physical gear table)
    if (MeasurementValuesUtils.isMeasurementFormValues(entity.measurementValues)) {
      entity.measurementValues.__typename = undefined;
      entity.measurementValues = MeasurementValuesUtils.normalizeValuesToForm(entity.measurementValues, opts.pmfms, {
        keepSourceObject: true,
        onlyExistingPmfms: true,
      });
    }

    // Create validator
    const form = this.validatorService.getFormGroup(entity, opts);

    if (!form.valid) {
      // Wait end of validation (e.g. async validators)
      await AppFormUtils.waitWhilePending(form);

      // Get form errors
      if (form.invalid) {
        const errors = AppFormUtils.getFormErrors(form);
        console.info(`[physical-gear-service] Control #${entity.id} [INVALID] in ${Date.now() - now}ms`, errors);

        return errors;
      }
    }
  }

  async executeImport(
    filter: Partial<PhysicalGearFilter>,
    opts?: {
      progression?: BehaviorSubject<number>;
      maxProgression?: number;
    }
  ): Promise<void> {
    const maxProgression = (opts && opts.maxProgression) || 100;
    filter = {
      startDate: DateUtils.moment().add(-1, 'month'), // Can be overwritten by given filter
      ...filter,
    };

    console.info('[physical-gear-service] Importing physical gears...');

    const res = await JobUtils.fetchAllPages(
      (offset, size) =>
        this.loadAll(offset, size, 'id', null, filter, {
          fetchPolicy: 'no-cache',
          distinctByRankOrder: true,
          toEntity: false,
          query: Queries.loadAllWithTrip,
        }),
      {
        progression: opts?.progression,
        maxProgression: maxProgression * 0.9,
        logPrefix: this._logPrefix,
        fetchSize: 100,
      }
    );

    // Save result locally
    await this.entities.saveAll(res.data, { entityName: PhysicalGear.TYPENAME, reset: true });
  }

  asFilter(filter: Partial<PhysicalGearFilter>): PhysicalGearFilter {
    return PhysicalGearFilter.fromObject(filter);
  }

  translateFormPath(path: string, opts?: { i18nPrefix?: string; pmfms?: IPmfm[] }): string {
    opts = opts || {};
    opts.i18nPrefix = opts.i18nPrefix || 'TRIP.PHYSICAL_GEAR.EDIT.';

    // Translate PMFM field
    if (MEASUREMENT_VALUES_PMFM_ID_REGEXP.test(path) && opts.pmfms) {
      const pmfmId = parseInt(path.split('.').pop());
      const pmfm = opts.pmfms.find((p) => p.id === pmfmId);
      return PmfmUtils.getPmfmName(pmfm);
    }

    // Default translation
    return this.formErrorTranslator.translateFormPath(path, opts);
  }

  /* -- protected methods -- */

  protected async fillValidatorOptionsForTrip(tripId: number, opts?: PhysicalGearValidatorOptions): Promise<PhysicalGearValidatorOptions> {
    opts = opts || {};

    // Check program filled
    if (!opts.program) throw new Error("Missing program in options. Unable to control trip's physical gears");

    const allowChildren = opts?.program.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN);

    return {
      acquisitionLevel: AcquisitionLevelCodes.PHYSICAL_GEAR, // Default value. Can be override isf gear has parent
      withChildren: allowChildren,
      minChildrenCount: allowChildren && opts?.program.getPropertyAsInt(ProgramProperties.TRIP_PHYSICAL_GEAR_MIN_CHILDREN_COUNT),
      ...opts,
      withMeasurementValues: true, // Need for a full validation
    };
  }

  protected async fillControlOptionsForTrip(tripId: number, opts?: PhysicalGearControlOptions): Promise<PhysicalGearControlOptions> {
    // Fill options need by the operation validator
    opts = await this.fillValidatorOptionsForTrip(tripId, opts);

    // Prepare pmfms (the full list, not filtered by gearId)
    if (!opts.initialPmfms) {
      const programLabel = opts.program?.label;
      const acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;
      opts.initialPmfms = (programLabel && (await this.programRefService.loadProgramPmfms(programLabel, { acquisitionLevel }))) || [];
    }

    // Prepare children pmfms (the full list, not filtered by gearId)
    if (opts.withChildren && !opts.initialChildrenPmfms) {
      const programLabel = opts.program?.label;
      const acquisitionLevel = AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR;
      opts.initialChildrenPmfms = (programLabel && (await this.programRefService.loadProgramPmfms(programLabel, { acquisitionLevel }))) || [];
    }

    // Prepare error translator
    if (!opts.translatorOptions) {
      opts.translatorOptions = {
        pathTranslator: {
          translateFormPath: (path) => this.translateFormPath(path, { pmfms: opts.initialPmfms }),
        },
      };
    }

    return opts;
  }

  protected async fillControlOptionsForGear(entity: PhysicalGear, opts?: PhysicalGearControlOptions): Promise<PhysicalGearControlOptions> {
    opts = opts || {};

    opts = await this.fillControlOptionsForTrip(entity.tripId, opts);

    // Fill acquisition level
    const isChild = isNotNil(toNumber(entity.parentId, entity.parent?.id));
    opts.withChildren = opts.withChildren && !isChild;
    opts.acquisitionLevel = isChild ? AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR : AcquisitionLevelCodes.PHYSICAL_GEAR;

    // Filter pmfms for the operation's gear
    const initialPmfms = isChild ? opts.initialChildrenPmfms : opts.initialPmfms;
    const gearId = entity.gear?.id;
    if (isNotNil(gearId)) {
      opts.pmfms = initialPmfms.filter((p) => isEmptyArray(p.gearIds) || p.gearIds.includes(gearId));
    } else {
      opts.pmfms = initialPmfms || [];
    }

    // Filter children pmfms, for children gears
    const childrenGearIds = opts.withChildren ? removeDuplicatesFromArray((entity.children || []).map((child) => child.gear?.id)) : undefined;
    if (isNotEmptyArray(childrenGearIds) && opts.initialChildrenPmfms) {
      opts.childrenPmfms = opts.initialChildrenPmfms.filter((p) => isEmptyArray(p.gearIds) || p.gearIds.some((id) => childrenGearIds.includes(id)));
    } else {
      opts.childrenPmfms = opts.initialChildrenPmfms || [];
    }

    return opts;
  }
}
