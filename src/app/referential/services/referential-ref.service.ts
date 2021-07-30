import {Injectable} from "@angular/core";
import {FetchPolicy, gql} from "@apollo/client/core";
import {BehaviorSubject, Observable} from "rxjs";
import {map} from "rxjs/operators";
import {ErrorCodes} from "./errors";
import {AccountService, BaseEntityGraphqlQueries} from '@sumaris-net/ngx-components';
import {Referential, ReferentialRef, ReferentialUtils}  from "@sumaris-net/ngx-components";
import {ReferentialService} from "./referential.service";
import {IEntitiesService, LoadResult, SuggestService} from "@sumaris-net/ngx-components";
import {GraphqlService}  from "@sumaris-net/ngx-components";
import {LocationLevelIds, MatrixIds, MethodIds, ParameterLabelGroups, PmfmIds, TaxonGroupIds, TaxonomicLevelIds} from './model/model.enum';
import {Metier, TaxonNameRef} from "./model/taxon.model";
import {NetworkService}  from "@sumaris-net/ngx-components";
import {EntitiesStorage}  from "@sumaris-net/ngx-components";
import {ReferentialFragments} from "./referential.fragments";
import {SortDirection} from "@angular/material/sort";
import {Moment} from "moment";
import {isEmptyArray} from "@sumaris-net/ngx-components";
import {JobUtils} from "@sumaris-net/ngx-components";
import {chainPromises} from "@sumaris-net/ngx-components";
import {BaseGraphqlService}  from "@sumaris-net/ngx-components";
import {StatusIds}  from "@sumaris-net/ngx-components";
import {environment} from '@environments/environment';
import {fromDateISOString} from "@sumaris-net/ngx-components";
import {ObjectMap} from "@sumaris-net/ngx-components";
import {TaxonNameRefFilter} from "./filter/taxon-name-ref.filter";
import {ReferentialRefFilter} from "./filter/referential-ref.filter";
import {Configuration}  from "@sumaris-net/ngx-components";
import {REFERENTIAL_CONFIG_OPTIONS} from "./config/referential.config";
import {ConfigService}  from "@sumaris-net/ngx-components";

const LastUpdateDate: any = gql`
  query LastUpdateDate{
    lastUpdateDate
  }
`;

const LoadAllQuery: any = gql`
  query ReferentialRefs($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...ReferentialFragment
    }
  }
  ${ReferentialFragments.referential}
`;

const LoadAllWithTotalQuery: any = gql`
  query ReferentialRefsWithTotal($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...ReferentialFragment
    }
    total: referentialsCount(entityName: $entityName, filter: $filter)
  }
  ${ReferentialFragments.referential}
`;

const LoadAllTaxonNamesQuery: any = gql`
  query TaxonNames($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: TaxonNameFilterVOInput){
    data: taxonNames(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...FullTaxonNameFragment
    }
  }
  ${ReferentialFragments.fullTaxonName}
`;
const LoadAllWithTotalTaxonNamesQuery: any = gql`
  query TaxonNames($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: TaxonNameFilterVOInput){
    data: taxonNames(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...FullTaxonNameFragment
    }
    total: taxonNameCount(filter: $filter)
  }
  ${ReferentialFragments.fullTaxonName}
`;

export const ReferentialRefQueries: BaseEntityGraphqlQueries = {
  loadAll: LoadAllQuery,
  loadAllWithTotal: LoadAllWithTotalQuery,
};

@Injectable({providedIn: 'root'})
export class ReferentialRefService extends BaseGraphqlService<ReferentialRef, ReferentialRefFilter>
  implements SuggestService<ReferentialRef, ReferentialRefFilter>,
      IEntitiesService<ReferentialRef, ReferentialRefFilter> {

  private _importedEntities: string[];

  constructor(
    protected graphql: GraphqlService,
    protected referentialService: ReferentialService,
    protected accountService: AccountService,
    protected configService: ConfigService,
    protected network: NetworkService,
    protected entities: EntitiesStorage
  ) {
    super(graphql, environment);

    configService.config.subscribe(config => this.updateModelEnumerations(config));
  }

  /**
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   * @param opts
   */
  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           filter?: Partial<ReferentialRefFilter>,
           opts?: {
             [key: string]: any;
             fetchPolicy?: FetchPolicy;
             withTotal?: boolean;
             toEntity?: boolean;
           }): Observable<LoadResult<ReferentialRef>> {

    if (!filter || !filter.entityName) {
      console.error("[referential-ref-service] Missing filter.entityName");
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"};
    }

    const entityName = filter.entityName;
    filter = this.asFilter(filter);

    const variables: any = {
      entityName: entityName,
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || filter.searchAttribute || 'label',
      sortDirection: sortDirection || 'asc'
    };

    let now = this._debug && Date.now();
    if (this._debug) console.debug(`[referential-ref-service] Watching ${entityName} items...`, variables);
    let res: Observable<LoadResult<any>>;

    if (this.network.offline) {
      res = this.entities.watchAll(entityName,
        {
          ...variables,
          filter: filter && filter.asFilterFn()
        });
    }

    else {
      const query = (!opts || opts.withTotal !== false) ? LoadAllWithTotalQuery : LoadAllQuery;
      res = this.graphql.watchQuery<LoadResult<any>>({
        query,
        variables: {
          ...variables,
          filter: filter && filter.asPodObject()
        },
        error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"},
        fetchPolicy: opts && opts.fetchPolicy || "cache-first"
      });
    }

    return res
      .pipe(
        map(({data, total}) => {
          const entities = (!opts || opts.toEntity !== false)
            ? (data || []).map(ReferentialRef.fromObject)
            : (data || []) as ReferentialRef[];
          if (now) {
            console.debug(`[referential-ref-service] References on ${entityName} loaded in ${Date.now() - now}ms`);
            now = undefined;
          }
          return {
            data: entities,
            total: total || entities.length
          };
        })
      );
  }

  async loadAll(offset: number,
                size: number,
                sortBy?: string,
                sortDirection?: SortDirection,
                filter?: Partial<ReferentialRefFilter>,
                opts?: {
                  [key: string]: any;
                  fetchPolicy?: FetchPolicy;
                  debug?: boolean;
                  withTotal?: boolean;
                  toEntity?: boolean;
                }): Promise<LoadResult<ReferentialRef>> {


    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      return this.loadAllLocally(offset, size, sortBy, sortDirection, filter, opts);
    }

    const entityName = filter && filter.entityName;
    if (!entityName) {
      console.error("[referential-ref-service] Missing filter.entityName");
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"};
    }

    filter = this.asFilter(filter);
    const uniqueEntityName = entityName + (filter.searchJoin || '');

    const debug = this._debug && (!opts || opts.debug !== false);

    const variables = {
      entityName,
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || filter.searchAttribute
        || filter.searchAttributes && filter.searchAttributes.length && filter.searchAttributes[0]
        || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter.asPodObject()
    };
    const now = debug && Date.now();
    if (debug) console.debug(`[referential-ref-service] Loading ${uniqueEntityName} items (ref)...`, variables);

    // Online mode: use graphQL
    const withTotal = !opts || opts.withTotal !== false;
    const query = withTotal ? LoadAllWithTotalQuery : LoadAllQuery;
    const { data, total } = await this.graphql.query<LoadResult<any>>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"},
      fetchPolicy: opts && opts.fetchPolicy || 'cache-first'
    });

    const entities = (!opts || opts.toEntity !== false) ?
      (data || []).map(ReferentialRef.fromObject) :
      (data || []) as ReferentialRef[];

    // Force entity name (if searchJoin)
    if (filter.entityName !== uniqueEntityName) {
      entities.forEach(item => item.entityName = uniqueEntityName);
    }

    const res: LoadResult<ReferentialRef> = {
      data: entities,
      total
    }

    // Add fetch more capability, if total was fetched
    if (withTotal) {
      const nextOffset = offset + entities.length;
      if (nextOffset < res.total) {
        res.fetchMore = () => this.loadAll(nextOffset, size, sortBy, sortDirection, filter, opts);
      }
    }

    if (debug) console.debug(`[referential-ref-service] Loading ${uniqueEntityName} items (ref) [OK] ${entities.length} items, in ${Date.now() - now}ms`);
    return res;
  }

  protected async loadAllLocally(offset: number,
                size: number,
                sortBy?: string,
                sortDirection?: SortDirection,
                filter?: Partial<ReferentialRefFilter>,
                opts?: {
                  [key: string]: any;
                  toEntity?: boolean;
                }): Promise<LoadResult<ReferentialRef>> {

    if (!filter || !filter.entityName) {
      console.error("[referential-ref-service] Missing argument 'filter.entityName'");
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"};
    }
    const uniqueEntityName = filter.entityName + (filter.searchJoin || '');
    filter = this.asFilter(filter);

    const variables = {
      entityName: filter.entityName,
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || filter.searchAttribute
        || filter.searchAttributes && filter.searchAttributes.length && filter.searchAttributes[0]
        || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter.asFilterFn()
    };

    const {data, total} = await this.entities.loadAll(uniqueEntityName + 'VO', variables);

    const entities = (!opts || opts.toEntity !== false) ?
      (data || []).map(ReferentialRef.fromObject) :
      (data || []) as ReferentialRef[];

    // Force entity name (if searchJoin)
    if (filter.entityName !== uniqueEntityName) {
      entities.forEach(item => item.entityName = uniqueEntityName);
    }

    const res: LoadResult<ReferentialRef> = { data: entities, total };

    // Add fetch more function
    const nextOffset = offset + entities.length;
    if (nextOffset < total) {
      res.fetchMore = () => this.loadAll(nextOffset, size, sortBy, sortDirection, filter, opts);
    }

    return res;
  }

  async countAll(filter?: Partial<ReferentialRefFilter>,
                 opts?: {
                   [key: string]: any;
                   fetchPolicy?: FetchPolicy;
                 }): Promise<number> {
    // TODO use specific query
    const res = await this.loadAll(0, 0, null, null, filter, {...opts, withTotal: true});
    return res.total;
  }

  async loadById(id: number,
                 entityName: string,
                 opts?: {
                   [key: string]: any;
                   fetchPolicy?: FetchPolicy;
                   debug?: boolean;
                   toEntity?: boolean;
                 }): Promise<ReferentialRef> {
    const res = await this.loadAll(0, 1, null, null, {id, entityName}, opts);
    if (!res || isEmptyArray(res.data)) return undefined;
    return res.data[0];
  }

  async suggest(value: any, filter?: Partial<ReferentialRefFilter>,
                sortBy?: keyof Referential | 'rankOrder',
                sortDirection?: SortDirection,
                opts?: {
                  fetchPolicy?: FetchPolicy;
                }): Promise<LoadResult<ReferentialRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return {data: [value]};
    value = (typeof value === "string" && value !== '*') && value || undefined;
    return this.loadAll(0, !value ? 30 : 10, sortBy, sortDirection,
      { ...filter, searchText: value},
      { withTotal: true /* Used by autocomplete */ , ...opts }
    );
  }

  async loadAllTaxonNames(offset: number,
                          size: number,
                          sortBy?: string,
                          sortDirection?: SortDirection,
                          filter?: Partial<TaxonNameRefFilter>,
                          opts?: {
                            [key: string]: any;
                            fetchPolicy?: FetchPolicy;
                            debug?: boolean;
                            toEntity?: boolean;
                            withTotal?: boolean;
                          }): Promise<LoadResult<TaxonNameRef>> {

    filter = TaxonNameRefFilter.fromObject(filter);
    if (!filter) {
      console.error("[referential-ref-service] Missing filter");
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"};
    }

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || filter.searchAttribute || 'label',
      sortDirection: sortDirection || 'asc'
    };

    const debug = this._debug && (!opts || opts.debug !== false);
    const now = debug && Date.now();
    if (debug) console.debug(`[referential-ref-service] Loading TaxonName items...`, variables);

    let res: LoadResult<any>;

    // Offline mode
    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      res = await this.entities.loadAll(TaxonNameRef.TYPENAME, {
        ...variables,
        filter: filter.asFilterFn()
      });
    }

    // Online mode
    else {
      res = await this.graphql.query<LoadResult<any>>({
        query: opts && opts.withTotal ? LoadAllWithTotalTaxonNamesQuery : LoadAllTaxonNamesQuery,
        variables: {
          ...variables,
          filter: filter.asPodObject()
        },
        error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"},
        fetchPolicy: opts && opts.fetchPolicy || "cache-first"
      });
    }

    const entities = (!opts || opts.toEntity !== false) ?
      (res && res.data || []).map(TaxonNameRef.fromObject) :
      (res && res.data || []) as TaxonNameRef[];
    if (debug) console.debug(`[referential-ref-service] TaxonName items loaded in ${Date.now() - now}ms`, entities);

    const total = res.total || entities.length;
    const end = offset + entities.length;

    const result: any = {
      data: entities,
      total
    };

    if (end < result.total) {
      offset = end;
      result.fetchMore = () => this.loadAllTaxonNames(offset, size, sortBy, sortDirection, filter, opts);
    }
    return result;


  }

  suggestTaxonNames(value: any, filter?: Partial<TaxonNameRefFilter>): Promise<LoadResult<TaxonNameRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return Promise.resolve({data: [value]});
    value = (typeof value === "string" && value !== '*') && value || undefined;
    return this.loadAllTaxonNames(0, !value ? 20 : 10, undefined, undefined,
      {
        entityName: 'TaxonName',
        ...filter,
        searchText: value as string
      },
      {
        withTotal: true
      });
  }

  saveAll(data: ReferentialRef[], options?: any): Promise<ReferentialRef[]> {
    throw new Error('Not implemented yet');
  }

  deleteAll(data: ReferentialRef[], options?: any): Promise<any> {
    throw new Error('Not implemented yet');
  }

  async lastUpdateDate(opts?: {fetchPolicy?: FetchPolicy}): Promise<Moment> {
    try {
      const {lastUpdateDate} = await this.graphql.query<{lastUpdateDate: string}>({
        query: LastUpdateDate,
        variables: {},
        fetchPolicy: opts && opts.fetchPolicy || 'network-only'
      });

      return fromDateISOString(lastUpdateDate);
    }
    catch (err) {
      console.error('[referential-ref] Cannot get remote lastUpdateDate: ' + (err && err.message || err), err);
      return undefined;
    }
  }

  /**
   * Get referential references, group by level
   * @param filter
   * @param groupBy
   * @param opts
   */
  async loadAllGroupByLevels(filter: Partial<ReferentialRefFilter>,
                             groupBy: {
                               levelIds?: ObjectMap<number[]>
                               levelLabels?: ObjectMap<string[]>,
                             },
                             opts?: {
                               [key: string]: any;
                               fetchPolicy?: FetchPolicy;
                               debug?: boolean;
                               withTotal?: boolean;
                               toEntity?: boolean;
                             }): Promise<{[key: string]: ReferentialRef[]}> {
    const entityName = filter && filter.entityName;
    const groupKeys = Object.keys(groupBy.levelIds || groupBy.levelLabels); // AGE, SEX, MATURITY, etc

    // Check arguments
    if (!entityName) throw new Error("Missing 'filter.entityName' argument");
    if (isEmptyArray(groupKeys)) throw new Error("Missing 'levelLabelsMap' argument");
    if ((groupBy.levelIds && groupBy.levelLabels) || (!groupBy.levelIds && !groupBy.levelLabels)) {
      throw new Error("Invalid groupBy value: one (and only one) required: 'levelIds' or 'levelLabels'");
    }

    const debug = this._debug || (opts && opts.debug);
    const now = debug && Date.now();
    if (debug) console.debug(`[referential-ref-service] Loading grouped ${entityName}...`);

    const result: { [key: string]: ReferentialRef[]; } = {};
    await Promise.all(groupKeys.map(key => this.loadAll(0, 1000, 'id', 'asc', {
        ...filter,
        levelIds: groupBy.levelIds && groupBy.levelIds[key],
        levelLabels: groupBy.levelLabels && groupBy.levelLabels[key]
      }, {
        withTotal: false,
        ...opts
      })
      .then(({data}) => {
        result[key] = data || [];
      })
    ));

    if (debug) console.debug(`[referential-ref-service] Grouped ${entityName} loaded in ${Date.now() - now}ms`, result);

    return result;
  }

  async executeImport(progression: BehaviorSubject<number>,
                      opts?: {
                        maxProgression?: number;
                        entityNames?: string[],
                        statusIds?: number[];
                      }) {

    const entityNames = opts && opts.entityNames || ['Location', 'Gear', 'Metier', 'MetierTaxonGroup', 'TaxonGroup', 'TaxonName', 'Department', 'QualityFlag', 'SaleType', 'VesselType'];

    const maxProgression = opts && opts.maxProgression || 100;
    const stepCount = entityNames.length;
    const progressionStep = maxProgression ? (maxProgression / (stepCount + 1)) : undefined;

    const now = Date.now();
    if (this._debug) {
      console.info(`[referential-ref-service] Starting importation of ${entityNames.length} referential... (progressionStep=${progressionStep}, stepCount=${stepCount}, maxProgression=${maxProgression}`);
    }
    else {
      console.info(`[referential-ref-service] Starting importation of ${entityNames.length} referential...`);
    }

    const importedEntities = [];
    await chainPromises(entityNames.map(entityName =>
      () => this.executeImportEntity(progression, {
          ...opts,
          entityName,
          maxProgression: progressionStep
          })
          .then(() => importedEntities.push(entityName))
      )
    );

    // Not all entity imported: error
    if (importedEntities.length < entityNames.length) {
      console.error(`[referential-ref-service] Importation failed in ${Date.now() - now}ms`);
      progression.error({code: ErrorCodes.IMPORT_REFERENTIAL_ERROR, message: 'ERROR.IMPORT_REFERENTIAL_ERROR'});
    }
    else {
      // Success
      console.info(`[referential-ref-service] Successfully import ${entityNames.length} entities in ${Date.now() - now}ms`);
      this._importedEntities = importedEntities;
    }
  }

  async executeImportEntity(progression: BehaviorSubject<number>,
                            opts: {
                              entityName: string;
                              maxProgression?: number;
                              statusIds?: number[];
                            }) {
    const entityName = opts && opts.entityName;
    if (!entityName) throw new Error("Missing 'opts.entityName'");

    const maxProgression = opts.maxProgression || 100;
    const logPrefix = this._debug && `[referential-ref-service] [${entityName}]`;
    const statusIds = opts && opts.statusIds || [StatusIds.ENABLE, StatusIds.TEMPORARY];

    try {
      let res: LoadResult<any>;
      let filter: any;

      switch (entityName) {
        case 'TaxonName':
          res = await JobUtils.fetchAllPages<any>((offset, size) =>
              this.loadAllTaxonNames(offset, size, 'id', null, {
                statusIds: [StatusIds.ENABLE],
                levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES]
              }, {
                fetchPolicy: 'network-only',
                debug: false,
                toEntity: false
              }),
            progression,
            {maxProgression, logPrefix}
            );
          break;
        case 'MetierTaxonGroup':
          filter = {entityName: 'Metier', statusIds, searchJoin: 'TaxonGroup'};
          break;
        case 'TaxonGroup':
          filter = {entityName, statusIds, levelIds: [TaxonGroupIds.FAO]};
          break;
        case 'Location':
          filter = {
            entityName, statusIds, levelIds: Object.values(LocationLevelIds)
              // Exclude rectangles (because more than 7200 rect exists !)
              // => Maybe find a way to add it, depending on the program properties ?
              .filter(id => id !== LocationLevelIds.ICES_RECTANGLE)
          };
          break;
        default:
          filter = {entityName, statusIds};
          break;
      }

      if (!res) {
        res = await JobUtils.fetchAllPages<any>((offset, size) =>
            this.referentialService.loadAll(offset, size, 'id', null, filter, {
              debug: false,
              fetchPolicy: 'network-only',
              withTotal: (offset === 0), // Compute total only once
              toEntity: false
            }),
          progression,
          {
            maxProgression,
            logPrefix
          });
      }

      // Save locally
      await this.entities.saveAll(res.data, {
          entityName: entityName + 'VO',
          reset: true
        });

    }
    catch (err) {
      const detailMessage = err && err.details && (err.details.message || err.details) || undefined;
      console.error(`[referential-ref-service] Failed to import ${entityName}: ${detailMessage || err && err.message || err}`);
      throw err;
    }
  }

  asFilter(filter: Partial<ReferentialRefFilter>): ReferentialRefFilter {
    return ReferentialRefFilter.fromObject(filter);
  }

  private updateModelEnumerations(config: Configuration) {
    if (!config.properties) {
      console.warn("[referential-ref] No properties found in pod config! Skip model enumerations update");
      return;
    }
    console.info("[referential-ref] Updating model enumerations...");

    // Location Levels
    LocationLevelIds.COUNTRY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_COUNTRY_ID);
    LocationLevelIds.PORT = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_PORT_ID);
    LocationLevelIds.AUCTION = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_AUCTION_ID);
    LocationLevelIds.ICES_RECTANGLE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_ICES_RECTANGLE_ID);
    LocationLevelIds.ICES_DIVISION = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_ICES_DIVISION_ID);

    // Taxonomic Levels
    TaxonomicLevelIds.FAMILY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_FAMILY_ID);
    TaxonomicLevelIds.GENUS = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_GENUS_ID);
    TaxonomicLevelIds.SPECIES = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_SPECIES_ID);
    TaxonomicLevelIds.SUBSPECIES = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_SUBSPECIES_ID);

    // Parameters
    ParameterLabelGroups.AGE = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_AGE_LABELS);
    ParameterLabelGroups.SEX = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_SEX_LABELS);
    ParameterLabelGroups.WEIGHT = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_WEIGHT_LABELS);
    ParameterLabelGroups.LENGTH = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_LENGTH_LABELS);
    ParameterLabelGroups.MATURITY = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_MATURITY_LABELS);

    // PMFM
    PmfmIds.TAG_ID = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_TAG_ID);
    PmfmIds.DRESSING = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_DRESSING);
    PmfmIds.STRATEGY_LABEL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_STRATEGY_LABEL_ID);
    PmfmIds.AGE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_AGE_ID);
    PmfmIds.SEX = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_SEX_ID);

    // Methods
    MethodIds.MEASURED_BY_OBSERVER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_MEASURED_BY_OBSERVER_ID);
    MethodIds.OBSERVED_BY_OBSERVER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_OBSERVED_BY_OBSERVER_ID);
    MethodIds.ESTIMATED_BY_OBSERVER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_ESTIMATED_BY_OBSERVER_ID);
    MethodIds.CALCULATED = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_CALCULATED_ID);

    // Matrix
    MatrixIds.INDIVIDUAL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.FRACTION_INDIVIDUAL_ID);

    // Taxon group
    // TODO: add all enumerations
    //TaxonGroupIds.FAO =
  }
}
