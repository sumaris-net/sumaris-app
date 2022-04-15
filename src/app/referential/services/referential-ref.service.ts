import { Injectable } from '@angular/core';
import { FetchPolicy, gql } from '@apollo/client/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ErrorCodes } from './errors';
import {
  AccountService,
  BaseEntityGraphqlQueries,
  BaseGraphqlService,
  chainPromises,
  ConfigService,
  Configuration,
  EntitiesStorage,
  firstNotNilPromise,
  fromDateISOString,
  GraphqlService,
  IEntitiesService,
  isEmptyArray,
  JobUtils,
  LoadResult,
  NetworkService,
  ObjectMap,
  Referential,
  ReferentialRef,
  ReferentialUtils,
  StatusIds,
  SuggestService
} from '@sumaris-net/ngx-components';
import { ReferentialService } from './referential.service';
import {
  FractionIdGroups,
  LocationLevelIds,
  MatrixIds,
  MethodIds,
  ParameterGroupIds,
  ParameterLabelGroups,
  PmfmIds,
  ProgramLabel,
  QualitativeValueIds,
  TaxonGroupTypeIds,
  TaxonomicLevelIds,
  UnitIds,
  UnitLabelGroups
} from './model/model.enum';
import { TaxonGroupRef } from './model/taxon-group.model';
import { TaxonNameRef } from './model/taxon-name.model';
import { ReferentialFragments } from './referential.fragments';
import { SortDirection } from '@angular/material/sort';
import { Moment } from 'moment';
import { environment } from '@environments/environment';
import { TaxonNameRefFilter } from './filter/taxon-name-ref.filter';
import { ReferentialRefFilter } from './filter/referential-ref.filter';
import { REFERENTIAL_CONFIG_OPTIONS } from './config/referential.config';
import { TaxonNameQueries } from '@app/referential/services/taxon-name.service';
import { MetierFilter } from '@app/referential/services/filter/metier.filter';
import { Metier } from '@app/referential/services/model/metier.model';
import { MetierService } from '@app/referential/services/metier.service';
import { WeightLengthConversionFilter } from '@app/referential/services/filter/weight-length-conversion.filter';
import { WeightLengthConversion, WeightLengthConversionRef } from '@app/referential/weight-length-conversion/weight-length-conversion.model';
import { WeightLengthConversionRefService } from '@app/referential/weight-length-conversion/weight-length-conversion-ref.service';
import { ProgramPropertiesUtils } from '@app/referential/services/config/program.config';
import { TEXT_SEARCH_IGNORE_CHARS_REGEXP } from '@app/referential/services/base-referential-service.class';
import { RoundWeightConversionRefService } from '@app/referential/round-weight-conversion/round-weight-conversion-ref.service';
import { RoundWeightConversionFilter } from '@app/referential/round-weight-conversion/round-weight-conversion.filter';
import { RoundWeightConversionRef } from '@app/referential/round-weight-conversion/round-weight-conversion.model';
import { TaxonNameRefService } from '@app/referential/services/taxon-name-ref.service';
import { EntityServiceLoadOptions, LoadResultByPageFn } from '@sumaris-net/ngx-components/src/app/shared/services/entity-service.class';
import { TaxonGroupRefService } from '@app/referential/services/taxon-group-ref.service';

const ReferentialRefQueries = <BaseEntityGraphqlQueries & { lastUpdateDate: any }>{
  lastUpdateDate: gql`query LastUpdateDate{
    lastUpdateDate
  }`,

  loadAll: gql`query ReferentialRefs($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...ReferentialFragment
    }
  }
  ${ReferentialFragments.referential}`,

  loadAllWithTotal: gql`query ReferentialRefsWithTotal($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...ReferentialFragment
    }
    total: referentialsCount(entityName: $entityName, filter: $filter)
  }
  ${ReferentialFragments.referential}`
};



export const IMPORT_REFERENTIAL_ENTITIES = ['Location', 'Gear', 'Metier', 'MetierTaxonGroup', 'TaxonGroup', 'TaxonName', 'Department', 'QualityFlag', 'SaleType', 'VesselType'];

export const WEIGHT_CONVERSION_ENTITIES = ['WeightLengthConversion', 'RoundWeightConversion'];

@Injectable({providedIn: 'root'})
export class ReferentialRefService extends BaseGraphqlService<ReferentialRef, ReferentialRefFilter>
  implements SuggestService<ReferentialRef, ReferentialRefFilter>,
    IEntitiesService<ReferentialRef, ReferentialRefFilter> {

  private _importedEntityNames: string[];

  get importedEntityNames(): string [] {
    return this._importedEntityNames;
  }

  constructor(
    protected graphql: GraphqlService,
    protected referentialService: ReferentialService,
    protected metierService: MetierService,
    protected taxonNameRefService: TaxonNameRefService,
    protected taxonGroupRefService: TaxonGroupRefService,
    protected weightLengthConversionRefService: WeightLengthConversionRefService,
    protected roundWeightConversionRefService: RoundWeightConversionRefService,
    protected accountService: AccountService,
    protected configService: ConfigService,
    protected network: NetworkService,
    protected entities: EntitiesStorage
  ) {
    super(graphql, environment);

    this.start();
  }

  protected async ngOnStart(): Promise<void> {
    await super.ngOnStart();

    const config = await firstNotNilPromise(this.configService.config);
    this.updateModelEnumerations(config);
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
      console.error('[referential-ref-service] Missing filter.entityName');
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'};
    }

    const entityName = filter.entityName;
    filter = this.asFilter(filter);

    const variables: any = {
      entityName,
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
    } else {
      const withTotal = (!opts || opts.withTotal !== false);
      const query = withTotal ? ReferentialRefQueries.loadAllWithTotal : ReferentialRefQueries.loadAll;
      res = this.graphql.watchQuery<LoadResult<any>>({
        query,
        variables: {
          ...variables,
          filter: filter && filter.asPodObject()
        },
        error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'},
        fetchPolicy: opts && opts.fetchPolicy || 'cache-first'
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
      console.error('[referential-ref-service] Missing filter.entityName');
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'};
    }

    filter = this.asFilter(filter);
    const uniqueEntityName = entityName + (filter.searchJoin || '');

    const debug = this._debug && (!opts || opts.debug !== false);

    const variables = {
      entityName,
      offset: offset || 0,
      size: size || 100,
      sortBy: (sortBy || filter.searchAttribute || (filter.searchAttributes && filter.searchAttributes[0]) || 'label'),
      sortDirection: sortDirection || 'asc',
      filter: filter.asPodObject()
    };
    const now = debug && Date.now();
    if (debug) console.debug(`[referential-ref-service] Loading ${uniqueEntityName} items (ref)...`, variables);

    // Online mode: use graphQL
    const withTotal = !opts || opts.withTotal !== false; // default to true
    const query = withTotal ? ReferentialRefQueries.loadAllWithTotal : ReferentialRefQueries.loadAll;
    const {data, total} = await this.graphql.query<LoadResult<any>>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'},
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
    };

    // Add fetch more capability, if total was fetched
    if (withTotal) {
      const nextOffset = (offset || 0) + entities.length;
      if (nextOffset < total) {
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
      console.error('[referential-ref-service] Missing argument \'filter.entityName\'');
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'};
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

    const res: LoadResult<ReferentialRef> = {data: entities, total};

    // Add fetch more function
    const nextOffset = (offset || 0) + entities.length;
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
    const { total } = await this.loadAll(0, 0, null, null, filter, {...opts, withTotal: true});
    return total;
  }

  async loadById(id: number,
                 entityName: string,
                 opts?: {
                   [key: string]: any;
                   fetchPolicy?: FetchPolicy;
                   debug?: boolean;
                   toEntity?: boolean;
                 }): Promise<ReferentialRef> {
    const { data } = await this.loadAll(0, 1, null, null,
      {includedIds: [id], entityName},
      {...opts, withTotal: false /*not need total*/}
    );
    return data?.length ? data[0] : undefined;
  }

  async suggest(value: any, filter?: Partial<ReferentialRefFilter>,
                sortBy?: keyof Referential | 'rankOrder',
                sortDirection?: SortDirection,
                opts?: {
                  fetchPolicy?: FetchPolicy;
                }): Promise<LoadResult<ReferentialRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return {data: [value]};
    // Replace '*' character by undefined
    if (!value || value === '*') {
      value = undefined;
    }
    // trim search text, and ignore some characters
    else if (value && typeof value === 'string') {
      value = value.trim().replace(TEXT_SEARCH_IGNORE_CHARS_REGEXP, '*');
    }
    return this.loadAll(0, !value ? 30 : 10, sortBy, sortDirection,
      {...filter, searchText: value},
      {withTotal: true /* Used by autocomplete */, ...opts}
    );
  }

  saveAll(data: ReferentialRef[], options?: any): Promise<ReferentialRef[]> {
    throw new Error('Not implemented yet');
  }

  deleteAll(data: ReferentialRef[], options?: any): Promise<any> {
    throw new Error('Not implemented yet');
  }

  async lastUpdateDate(opts?: { fetchPolicy?: FetchPolicy }): Promise<Moment> {
    try {
      const {lastUpdateDate} = await this.graphql.query<{ lastUpdateDate: string }>({
        query: ReferentialRefQueries.lastUpdateDate,
        variables: {},
        fetchPolicy: opts && opts.fetchPolicy || 'network-only'
      });

      return fromDateISOString(lastUpdateDate);
    } catch (err) {
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
                             }): Promise<{ [key: string]: ReferentialRef[] }> {
    const entityName = filter && filter.entityName;
    const groupKeys = Object.keys(groupBy.levelIds || groupBy.levelLabels); // AGE, SEX, MATURITY, etc

    // Check arguments
    if (!entityName) throw new Error('Missing \'filter.entityName\' argument');
    if (isEmptyArray(groupKeys)) throw new Error('Missing \'levelLabelsMap\' argument');
    if ((groupBy.levelIds && groupBy.levelLabels) || (!groupBy.levelIds && !groupBy.levelLabels)) {
      throw new Error('Invalid groupBy value: one (and only one) required: \'levelIds\' or \'levelLabels\'');
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

  async executeImport(filter: {
                        statusIds?: number[];
                        [key: string]: any;
                      },
                      opts: {
                        maxProgression?: number;
                        entityNames?: string[];
                        progression?: BehaviorSubject<number>;
                      }) {

    const entityNames = opts?.entityNames || IMPORT_REFERENTIAL_ENTITIES;

    const maxProgression = opts && opts.maxProgression || 100;
    const entityCount = entityNames.length;
    const entityMaxProgression = Math.round((maxProgression / entityNames.length) * 10000 - 0.5) / 10000;

    const now = Date.now();
    console.info(`[referential-ref-service] Starting importation of ${entityNames.length} referential...`);
    if (this._debug) console.debug(`[referential-ref-service] - with : {entityMaxProgression=${entityMaxProgression}, entityCount=${entityCount}, maxProgression=${maxProgression}`);

    const importedEntityNames = [];
    await chainPromises(entityNames.map(entityName =>
        () => this.executeImportEntity({...filter, entityName}, {...opts, maxProgression: entityMaxProgression})
          .then(() => importedEntityNames.push(entityName))
      )
    );

    // Not all entity imported: error
    if (importedEntityNames.length < entityNames.length) {
      console.error(`[referential-ref-service] Importation failed in ${Date.now() - now}ms`);
      if (opts?.progression) opts.progression.error({code: ErrorCodes.IMPORT_REFERENTIAL_ERROR, message: 'ERROR.IMPORT_REFERENTIAL_ERROR'});
    } else {
      // Success
      console.info(`[referential-ref-service] Successfully import ${entityNames.length} referential in ${Date.now() - now}ms`);
      this._importedEntityNames = importedEntityNames;
    }
  }

  async executeImportEntity(filter: Partial<ReferentialRefFilter> & {entityName: string},
                            opts: {
                              progression?: BehaviorSubject<number>;
                              maxProgression?: number;
                            }) {
    const entityName = filter?.entityName;
    if (!entityName) throw new Error('Missing \'filter.entityName\'');

    const progression = opts?.progression;
    const maxProgression = opts?.maxProgression || 100;
    const logPrefix = this._debug && `[referential-ref-service] [${entityName}]`;
    const statusIds = filter?.statusIds || [StatusIds.ENABLE, StatusIds.TEMPORARY];

    try {
      let getLoadOptions = (offset) => (<EntityServiceLoadOptions>{
        fetchPolicy: 'no-cache',
        toEntity: false,
        withTotal: offset === 0});
      let loadPageFn: LoadResultByPageFn<any>;

      switch (entityName) {
        // Taxon name
        case 'TaxonName':
          loadPageFn = (offset, size) => this.taxonNameRefService
            .loadAll(offset, size, 'id', null, {
                statusIds: [StatusIds.ENABLE],
                levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES]
              }, getLoadOptions(offset));
          break;

        // Taxon group
        case 'TaxonGroup':
          loadPageFn = (offset, size) => this.taxonGroupRefService
            .loadAll(offset, size, 'id', null,
            {...filter, statusIds, levelIds: [TaxonGroupTypeIds.FAO]}, getLoadOptions(offset));
          break;

        // Metier
        case 'MetierTaxonGroup':
          loadPageFn = (offset, size) => this.metierService.loadAll(offset, size, 'id', null,
                {entityName: 'Metier', statusIds, searchJoin: 'TaxonGroup'}, getLoadOptions(offset));
          break;

        // Locations
        case 'Location':
          filter = {
            ...filter, statusIds,
            levelIds: Object.keys(LocationLevelIds).reduce((res, item) => {
                return res.concat(LocationLevelIds[item]);
              }, [])
              // TODO: Exclude rectangles (because more than 7200 rect exists !)
              // => Maybe find a way to add it, depending on the program properties ?
              //.filter(id => id !== LocationLevelIds.ICES_RECTANGLE
            //  && id !== LocationLevelIds.GFCM_RECTANGLE)
          };
          break;

        // WeightLengthConversion (RTP)
        case 'WeightLengthConversion':
          // TODO limit to program locationIds ? (if location class = SEA) and referenceTaxon from program (taxon groups) + referenceTaxons ?
          loadPageFn = (offset, size) => this.weightLengthConversionRefService
            .loadAll(offset, size, 'id', 'asc', {statusIds}, getLoadOptions(offset));
          break;

        // RoundWeightConversion
        case 'RoundWeightConversion':
          // TODO limit to program locationIds ? (if location class = SEA) and referenceTaxon from program (taxon groups) + referenceTaxons ?
          loadPageFn = (offset, size) => this.roundWeightConversionRefService
            .loadAll(offset, size, 'id', 'asc', {statusIds}, getLoadOptions(offset));
          break;

        // Other entities
        default:
          filter = {...filter, statusIds};
          break;
      }

      // Fallback load function
      if (!loadPageFn) {
        loadPageFn =(offset, size) => this.referentialService.loadAll(offset, size, 'id', null, filter, getLoadOptions(offset));
      }

      // Fetch all pages
      const { data } = await JobUtils.fetchAllPages<any>(loadPageFn, { progression, maxProgression, logPrefix });

      // Save locally
      await this.entities.saveAll(data, {
        entityName: entityName + 'VO',
        reset: true
      });

    } catch (err) {
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
      console.warn('[referential-ref] No properties found in pod config! Skip model enumerations update');
      return;
    }
    console.info('[referential-ref] Updating model enumerations...');

    // Program
    ProgramLabel.SIH = config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PROGRAM_SIH_LABEL);

    // Location Levels
    LocationLevelIds.COUNTRY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_COUNTRY_ID);
    LocationLevelIds.PORT = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_PORT_ID);
    LocationLevelIds.AUCTION = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_AUCTION_ID);
    LocationLevelIds.ICES_RECTANGLE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_ICES_RECTANGLE_ID);
    LocationLevelIds.ICES_DIVISION = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_ICES_DIVISION_ID);
    LocationLevelIds.LOCATIONS_AREA = config.getPropertyAsNumbers(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_LOCATIONS_AREA_IDS);
    LocationLevelIds.WEIGHT_LENGTH_CONVERSION_AREA = config.getPropertyAsNumbers(REFERENTIAL_CONFIG_OPTIONS.WEIGHT_LENGTH_CONVERSION_AREA_IDS);

    // Taxonomic Levels
    TaxonomicLevelIds.FAMILY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_FAMILY_ID);
    TaxonomicLevelIds.GENUS = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_GENUS_ID);
    TaxonomicLevelIds.SPECIES = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_SPECIES_ID);
    TaxonomicLevelIds.SUBSPECIES = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_SUBSPECIES_ID);

    // Parameters Groups
    ParameterLabelGroups.AGE = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_AGE_LABELS);
    ParameterLabelGroups.SEX = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_SEX_LABELS);
    ParameterLabelGroups.WEIGHT = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_WEIGHT_LABELS);
    ParameterLabelGroups.LENGTH = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_LENGTH_LABELS);
    ParameterLabelGroups.MATURITY = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_MATURITY_LABELS);

    // Fractions Groups
    FractionIdGroups.CALCIFIED_STRUCTURE = config.getPropertyAsNumbers(REFERENTIAL_CONFIG_OPTIONS.FRACTION_GROUP_CALCIFIED_STRUCTURE_IDS);

    // Unit groups
    UnitLabelGroups.LENGTH = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.UNIT_GROUP_LENGTH_LABELS);

    // PMFM
    // TODO generefy this, using Object.keys(PmfmIds) iteration
    PmfmIds.TAG_ID = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_TAG_ID);
    PmfmIds.DRESSING = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_DRESSING);
    PmfmIds.PRESERVATION = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_PRESERVATION);
    PmfmIds.STRATEGY_LABEL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_STRATEGY_LABEL_ID);
    PmfmIds.AGE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_AGE_ID);
    PmfmIds.SEX = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_SEX_ID);
    PmfmIds.PACKAGING = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_PACKAGING_ID);
    PmfmIds.SIZE_CATEGORY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_SIZE_CATEGORY_ID);
    PmfmIds.TOTAL_PRICE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_TOTAL_PRICE_ID);
    PmfmIds.AVERAGE_PACKAGING_PRICE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_AVERAGE_PACKAGING_PRICE_ID);
    PmfmIds.AVERAGE_WEIGHT_PRICE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_AVERAGE_WEIGHT_PRICE_ID);
    PmfmIds.SALE_ESTIMATED_RATIO = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_SALE_ESTIMATED_RATIO_ID);
    PmfmIds.SALE_RANK_ORDER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_SALE_RANK_ORDER_ID);
    PmfmIds.REFUSED_SURVEY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_REFUSED_SURVEY_ID);
    PmfmIds.GEAR_LABEL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_GEAR_LABEL_ID);
    PmfmIds.HAS_ACCIDENTAL_CATCHES = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_HAS_ACCIDENTAL_CATCHES_ID);

    // Methods
    MethodIds.MEASURED_BY_OBSERVER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_MEASURED_BY_OBSERVER_ID);
    MethodIds.OBSERVED_BY_OBSERVER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_OBSERVED_BY_OBSERVER_ID);
    MethodIds.ESTIMATED_BY_OBSERVER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_ESTIMATED_BY_OBSERVER_ID);
    MethodIds.CALCULATED = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_CALCULATED_ID);

    // Matrix
    MatrixIds.INDIVIDUAL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.FRACTION_INDIVIDUAL_ID);

    // Units
    UnitIds.NONE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.UNIT_NONE_ID);

    // ParameterGroups
    ParameterGroupIds.SURVEY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_SURVEY_ID);

    // Qualitative value
    QualitativeValueIds.DISCARD_OR_LANDING.LANDING = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_LANDING_ID);
    QualitativeValueIds.DISCARD_OR_LANDING.DISCARD = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_DISCARD_ID);
    QualitativeValueIds.DRESSING.WHOLE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_DRESSING_WHOLE_ID);
    QualitativeValueIds.PRESERVATION.FRESH = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_PRESERVATION_FRESH_ID);

    // Taxon group type
    TaxonGroupTypeIds.FAO = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXON_GROUP_TYPE_FAO_ID);
    TaxonGroupTypeIds.NATIONAL_METIER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXON_GROUP_TYPE_NATIONAL_METIER_ID);
    TaxonGroupTypeIds.DCF_METIER_LVL_5 = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXON_GROUP_TYPE_DCF_METIER_LVL_5_ID);

    // TODO: add all enumerations

    // Force an update of ProgramProperties default values (e.g. when using LocationLevelId)
    ProgramPropertiesUtils.refreshDefaultValues();

  }
}
