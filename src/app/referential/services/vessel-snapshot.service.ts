import { Injectable } from '@angular/core';
import { FetchPolicy, gql } from '@apollo/client/core';
import { ErrorCodes } from './errors';
import {
  BaseEntityGraphqlQueries,
  BaseGraphqlService,
  changeCaseToUnderscore,
  ConfigService,
  EntitiesStorage,
  EntityServiceLoadOptions,
  EntityStorageLoadOptions,
  firstNotNilPromise,
  GraphqlService,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  JobUtils,
  LoadResult,
  LocalSettingsService,
  MatAutocompleteFieldAddOptions,
  NetworkService,
  ReferentialRef,
  ReferentialUtils,
  StatusIds,
  SuggestService,
} from '@sumaris-net/ngx-components';
import { ReferentialFragments } from './referential.fragments';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { VesselSnapshot } from './model/vessel-snapshot.model';
import { SortDirection } from '@angular/material/sort';
import { environment } from '@environments/environment';
import { VesselSnapshotFilter } from './filter/vessel.filter';
import { ProgramLabels } from '@app/referential/services/model/model.enum';
import { VESSEL_CONFIG_OPTIONS, VESSEL_FEATURE_NAME } from '@app/vessel/services/config/vessel.config';
import { debounceTime, filter, map } from 'rxjs/operators';
import { SAVE_AS_OBJECT_OPTIONS } from '@app/data/services/model/data-entity.model';
import { mergeLoadResult } from '@app/shared/functions';

export const VesselSnapshotFragments = {
  lightVesselSnapshot: gql`
    fragment LightVesselSnapshotFragment on VesselSnapshotVO {
      id
      name
      exteriorMarking
      registrationCode
      intRegistrationCode
      updateDate
      vesselType {
        ...LightReferentialFragment
      }
      registrationLocation {
        ...LocationFragment
      }
      vesselStatusId
    }
  `,
  lightVesselSnapshotWithPort: gql`
    fragment LightVesselSnapshotWithPortFragment on VesselSnapshotVO {
      id
      name
      exteriorMarking
      registrationCode
      intRegistrationCode
      startDate
      endDate
      updateDate
      vesselType {
        ...LightReferentialFragment
      }
      registrationLocation {
        ...LocationFragment
      }
      basePortLocation {
        ...LocationFragment
      }
      vesselStatusId
    }
  `,
  vesselSnapshot: gql`
    fragment VesselSnapshotFragment on VesselSnapshotVO {
      id
      name
      exteriorMarking
      registrationCode
      intRegistrationCode
      startDate
      endDate
      updateDate
      basePortLocation {
        ...LocationFragment
      }
      vesselType {
        ...LightReferentialFragment
      }
      vesselStatusId
    }
  `,
};

const VesselSnapshotQueries: BaseEntityGraphqlQueries & { loadAllWithPort: any; loadAllWithPortAndTotal: any } = {
  // Load all
  loadAll: gql`
    query VesselSnapshots($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: VesselFilterVOInput, $withDates: Boolean!) {
      data: vesselSnapshots(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
        ...LightVesselSnapshotFragment
        startDate @include(if: $withDates)
        endDate @include(if: $withDates)
      }
    }
    ${VesselSnapshotFragments.lightVesselSnapshot}
    ${ReferentialFragments.location}
    ${ReferentialFragments.lightReferential}
  `,

  // Load all with total
  loadAllWithTotal: gql`
    query VesselSnapshotsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: VesselFilterVOInput) {
      data: vesselSnapshots(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
        ...LightVesselSnapshotFragment
      }
      total: vesselSnapshotsCount(filter: $filter)
    }
    ${VesselSnapshotFragments.lightVesselSnapshot}
    ${ReferentialFragments.location}
    ${ReferentialFragments.lightReferential}
  `,

  // Load one item
  load: gql`
    query VesselSnapshot($vesselId: Int, $vesselFeaturesId: Int) {
      data: vesselSnapshots(filter: { vesselId: $vesselId, vesselFeaturesId: $vesselFeaturesId }) {
        ...LightVesselSnapshotFragment
      }
    }
    ${VesselSnapshotFragments.lightVesselSnapshot}
    ${ReferentialFragments.location}
    ${ReferentialFragments.lightReferential}
  `,

  // Load all WITH base port location
  loadAllWithPort: gql`
    query VesselSnapshotsWithPort($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: VesselFilterVOInput) {
      data: vesselSnapshots(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
        ...LightVesselSnapshotWithPortFragment
      }
    }
    ${VesselSnapshotFragments.lightVesselSnapshotWithPort}
    ${ReferentialFragments.location}
    ${ReferentialFragments.lightReferential}
  `,

  // Load all WITH base port location AND total
  loadAllWithPortAndTotal: gql`
    query VesselSnapshotsWithPortAndTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: VesselFilterVOInput) {
      data: vesselSnapshots(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
        ...LightVesselSnapshotWithPortFragment
      }
      total: vesselSnapshotsCount(filter: $filter)
    }
    ${VesselSnapshotFragments.lightVesselSnapshotWithPort}
    ${ReferentialFragments.location}
    ${ReferentialFragments.lightReferential}
  `,
};

export declare interface VesselServiceLoadOptions extends EntityServiceLoadOptions {
  debug?: boolean;
  withTotal?: boolean;
  withBasePortLocation?: boolean;
}

@Injectable({ providedIn: 'root' })
export class VesselSnapshotService
  extends BaseGraphqlService<VesselSnapshot, VesselSnapshotFilter>
  implements SuggestService<VesselSnapshot, VesselSnapshotFilter>
{
  private defaultFilter: Partial<VesselSnapshotFilter> = null;
  private defaultLoadOptions: Partial<VesselServiceLoadOptions> = null;
  private suggestLengthThreshold = 0;
  private enableSearchRegistrationByPrefix: boolean = VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_SEARCH_REGISTRATION_CODE_AS_PREFIX.defaultValue;

  private get onConfigOrSettingsChanges(): Observable<any> {
    return merge(this.configService.config, this.settings.onChange);
  }

  constructor(
    protected graphql: GraphqlService,
    protected network: NetworkService,
    protected entities: EntitiesStorage,
    protected configService: ConfigService,
    protected settings: LocalSettingsService
  ) {
    super(graphql, environment);
  }

  protected async ngOnStart(): Promise<void> {
    console.info('[vessel-snapshot-service] Starting service...');

    // Restoring local settings
    await Promise.all([this.settings.ready(), this.configService.ready()]);

    await this.initDefaults();

    // Listen for config or settings changes, then update defaults
    this.registerSubscription(
      this.onConfigOrSettingsChanges
        .pipe(
          filter(() => this.started),
          debounceTime(1000)
        )
        .subscribe(() => this.initDefaults())
    );
  }

  /**
   * Load many vessels
   *
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   * @param opts
   */
  async loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<VesselSnapshotFilter>,
    opts?: VesselServiceLoadOptions & { withDates?: boolean }
  ): Promise<LoadResult<VesselSnapshot>> {
    if (!this.started) await this.ready();

    filter = this.asFilter({
      ...this.defaultFilter,
      ...filter,
    });
    opts = {
      ...this.defaultLoadOptions,
      ...opts,
    };

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || (filter?.searchAttributes && filter?.searchAttributes[0]) || VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES[0],
      sortDirection: sortDirection || 'asc',
      withDates: opts?.withDates || false,
    };

    const debug = this._debug && (!opts || opts.debug !== false);
    const now = debug && Date.now();
    if (debug) console.debug('[vessel-snapshot-service] Loading vessel snapshots using options:', variables);

    const withTotal = !opts || opts.withTotal !== false;
    let res: LoadResult<VesselSnapshot>;

    // Offline: use local store
    const forceOffline =
      (this.network.offline && (!opts || opts.fetchPolicy !== 'network-only')) || (isNotNil(filter.vesselId) && filter.vesselId < 0);
    const offline = forceOffline || (filter.synchronizationStatus && filter.synchronizationStatus !== 'SYNC');
    if (offline) {
      res = await this.entities.loadAll(VesselSnapshot.TYPENAME, {
        ...variables,
        filter: filter?.asFilterFn(),
      });
    } else {
      // Online: use GraphQL
      const query = withTotal
        ? opts?.withBasePortLocation
          ? VesselSnapshotQueries.loadAllWithPortAndTotal
          : VesselSnapshotQueries.loadAllWithTotal
        : opts?.withBasePortLocation
          ? VesselSnapshotQueries.loadAllWithPort
          : VesselSnapshotQueries.loadAll;
      res = await this.graphql.query<LoadResult<any>>({
        query,
        variables: {
          ...variables,
          filter: filter?.asPodObject(),
        },
        error: { code: ErrorCodes.LOAD_VESSELS_ERROR, message: 'VESSEL.ERROR.LOAD_ERROR' },
        fetchPolicy: (opts && opts.fetchPolicy) || undefined /*use default*/,
      });

      // Add local temporary vessels
      const needLocalTemporaryVessel =
        this.settings.hasOfflineFeature(VESSEL_FEATURE_NAME) && (isEmptyArray(filter?.statusIds) || filter.statusIds.includes(StatusIds.TEMPORARY));
      if (needLocalTemporaryVessel) {
        const temporaryFilter = filter ? filter.clone() : new VesselSnapshotFilter();
        temporaryFilter.statusIds = [StatusIds.TEMPORARY];
        const localRes: LoadResult<VesselSnapshot> = await this.entities.loadAll(VesselSnapshot.TYPENAME, {
          ...variables,
          filter: temporaryFilter.asFilterFn(),
        });
        // Add to result
        if (localRes.total) {
          res = mergeLoadResult(res, localRes);
        }
      }
    }

    const entities = !opts || opts.toEntity !== false ? (res?.data || []).map(VesselSnapshot.fromObject) : ((res?.data || []) as VesselSnapshot[]);

    const total = res?.total || entities.length;
    res = { total, data: entities };

    // Add fetch more capability, if total was fetched
    if (withTotal) {
      const nextOffset = offset + entities.length;
      if (nextOffset < res.total) {
        res.fetchMore = () => this.loadAll(nextOffset, size, sortBy, sortDirection, filter, opts);
      }
    }

    if (debug) console.debug(`[vessel-snapshot-service] Vessels loaded in ${Date.now() - now}ms`);
    return res;
  }

  async suggest(value: any, filter?: Partial<VesselSnapshotFilter>): Promise<LoadResult<VesselSnapshot>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };

    // Make sure service has been started, before using defaults (e.g. minSearchTextLength)
    if (!this.started) await this.ready();

    const searchText = (typeof value === 'string' && value !== '*' && value) || undefined;

    // Not enough character to launch the search
    if (((searchText && searchText.length) || 0) < this.suggestLengthThreshold) return { data: undefined };

    let searchAttributes = filter.searchAttributes;

    // Exclude search on name, when search by prefix is enabled (by config)
    if (this.enableSearchRegistrationByPrefix) {
      if (searchText && !searchText.startsWith('*') && searchAttributes && searchAttributes[0] !== 'name') {
        searchAttributes = searchAttributes.filter((attr) => attr !== 'name');
      }
    }

    return this.loadAll(
      0,
      !value ? 30 : 20,
      undefined,
      undefined,
      {
        ...filter,
        searchText,
        searchAttributes,
      },
      {
        fetchPolicy: 'cache-first',
      }
    );
  }

  async load(
    id: number,
    opts?: {
      fetchPolicy?: FetchPolicy;
      toEntity?: boolean;
    }
  ): Promise<VesselSnapshot | null> {
    console.debug(`[vessel-snapshot-service] Loading vessel snapshot #${id}`);

    // Offline mode
    const offline = id < 0 || (this.network.offline && (!opts || opts.fetchPolicy !== 'network-only'));
    if (offline) {
      const data = await this.entities.load<VesselSnapshot>(id, VesselSnapshot.TYPENAME);
      if (!data) throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
      return (!opts || opts.toEntity !== false ? VesselSnapshot.fromObject(data) : (data as VesselSnapshot)) || null;
    }

    const { data } = await this.graphql.query<{ data: any[] }>({
      query: VesselSnapshotQueries.load,
      variables: {
        vesselId: id,
        vesselFeaturesId: null,
      },
      fetchPolicy: (opts && opts.fetchPolicy) || undefined,
    });
    const res = data && data[0];
    return (res && (!opts || opts.toEntity !== false ? VesselSnapshot.fromObject(res) : (res as VesselSnapshot))) || null;
  }

  watchAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<VesselSnapshotFilter>,
    opts?: EntityStorageLoadOptions
  ): Observable<LoadResult<VesselSnapshot>> {
    filter = this.asFilter(filter);

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'exteriorMarking',
      sortDirection: sortDirection || 'asc',
      filter: filter?.asFilterFn(),
    };

    if (this._debug) console.debug('[vessel-snapshot-service] Loading local vessel snapshots using options:', variables);

    return this.entities.watchAll<VesselSnapshot>(VesselSnapshot.TYPENAME, variables, opts).pipe(
      map(({ data, total }) => {
        const entities = (data || []).map(VesselSnapshot.fromObject);
        return { data: entities, total };
      })
    );
  }

  /**
   * Save into the local storage
   *
   * @param entity
   */
  async saveLocally(entity: VesselSnapshot): Promise<VesselSnapshot> {
    if (this._debug) console.debug('[vessel-snapshot-service] [offline] Saving vesselSnapshot locally...', entity);

    const json = entity.asObject(SAVE_AS_OBJECT_OPTIONS);

    // Save locally
    return await this.entities.save(json, { entityName: VesselSnapshot.TYPENAME });
  }

  /**
   * Delete vesselSnapshot locally (from the entity storage)
   */
  async deleteLocally(filter: Partial<VesselSnapshotFilter>): Promise<VesselSnapshot[]> {
    if (!filter) throw new Error("Missing arguments 'filter'");

    const dataFilter = this.asFilter(filter);
    const variables = {
      filter: dataFilter && dataFilter.asFilterFn(),
    };

    try {
      // Find vessel snapshot to delete
      const res = await this.entities.loadAll<VesselSnapshot>(VesselSnapshot.TYPENAME, variables, { fullLoad: false });
      const ids = ((res && res.data) || []).map((o) => o.id);
      if (isEmptyArray(ids)) return undefined; // Skip

      // Apply deletion
      return await this.entities.deleteMany(ids, { entityName: VesselSnapshot.TYPENAME });
    } catch (err) {
      console.error(`[vessel-snapshot-service] Failed to delete vessel snapshot ${JSON.stringify(filter)}`, err);
      throw err;
    }
  }

  async executeImport(
    filter: Partial<VesselSnapshotFilter>,
    opts?: {
      progression?: BehaviorSubject<number>;
      maxProgression?: number;
      vesselIds?: number[];
    }
  ): Promise<void> {
    const maxProgression = (opts && opts.maxProgression) || 100;
    filter = {
      ...filter,
      includedIds: opts?.vesselIds,
      statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      // Force the use of the specific program, used for vessels
      program: ReferentialRef.fromObject({ label: ProgramLabels.SIH }),
    };

    if (isNotEmptyArray(filter.includedIds)) {
      console.info(`[vessel-snapshot-service] Importing ${filter.includedIds.length} vessels (snapshot)...`);
    } else {
      console.warn('[vessel-snapshot-service] Importing all vessels (snapshot)...');
    }

    const res = await JobUtils.fetchAllPages(
      (offset, size) =>
        this.loadAll(offset, size, 'id', null, filter, {
          debug: false,
          fetchPolicy: 'no-cache',
          withBasePortLocation: true,
          withTotal: offset === 0, // Compute total only once
          toEntity: false,
        }),
      {
        progression: opts?.progression,
        maxProgression: maxProgression * 0.9,
        logPrefix: '[vessel-snapshot-service]',
      }
    );

    // Save locally
    await this.entities.saveAll(res.data, { entityName: VesselSnapshot.TYPENAME });
  }

  asFilter(source: Partial<VesselSnapshotFilter>) {
    return VesselSnapshotFilter.fromObject(source);
  }

  async getAutocompleteFieldOptions(
    fieldName?: string,
    defaultAttributes?: string[]
  ): Promise<MatAutocompleteFieldAddOptions<VesselSnapshot, VesselSnapshotFilter>> {
    const baseAttributes = this.settings.getFieldDisplayAttributes(
      fieldName || 'vesselSnapshot',
      defaultAttributes || VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES
    );
    const displayAttributes = this.defaultLoadOptions?.withBasePortLocation
      ? baseAttributes.concat(this.settings.getFieldDisplayAttributes('location').map((key) => 'basePortLocation.' + key))
      : baseAttributes;

    // DEBUG
    //if (!displayAttributes.includes('id')) displayAttributes.push('id');

    return <MatAutocompleteFieldAddOptions<VesselSnapshot, VesselSnapshotFilter>>{
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.suggest(value, filter),
      attributes: displayAttributes,
      columnNames: displayAttributes.map((key) => 'VESSEL.VESSEL_SNAPSHOT.' + changeCaseToUnderscore(key).toUpperCase()),
      filter: {
        ...this.defaultFilter,
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        searchAttributes: baseAttributes,
      },
      suggestLengthThreshold: this.suggestLengthThreshold,
      mobile: this.settings.mobile,
    };
  }

  /* -- protected methods -- */

  async initDefaults() {
    // DEBUG
    console.debug('[vessel-snapshot-service] Init defaults load options');

    const config = await firstNotNilPromise(this.configService.config);

    const withBasePortLocation = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.VESSEL_BASE_PORT_LOCATION_VISIBLE);

    // Set default filter (registration location, vessel type)
    const defaultRegistrationLocationId = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_DEFAULT_COUNTRY_ID);
    const defaultVesselTypeId = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_DEFAULT_TYPE_ID);

    const settingsAttributes = this.settings.getFieldDisplayAttributes('vesselSnapshot', VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES);

    // Update default filter
    this.defaultFilter = {
      ...this.defaultFilter,
      searchAttributes: settingsAttributes,
      registrationLocation: isNotNil(defaultRegistrationLocationId) ? <ReferentialRef>{ id: defaultRegistrationLocationId } : undefined,
      vesselTypeId: isNotNil(defaultVesselTypeId) ? defaultVesselTypeId : undefined,
    };

    // Update default options
    this.defaultLoadOptions = {
      ...this.defaultLoadOptions,
      withBasePortLocation,
    };

    this.suggestLengthThreshold = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_MIN_LENGTH);
    this.enableSearchRegistrationByPrefix = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_SEARCH_REGISTRATION_CODE_AS_PREFIX);
  }
}
