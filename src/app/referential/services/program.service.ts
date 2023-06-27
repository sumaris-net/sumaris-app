import { Injectable, Injector } from '@angular/core';
import { FetchPolicy, gql, WatchQueryFetchPolicy } from '@apollo/client/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ErrorCodes } from './errors';
import { ReferentialFragments } from './referential.fragments';
import {
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  EntitiesStorage,
  EntitySaveOptions,
  EntityUtils,
  IEntitiesService,
  IEntityService,
  isNil,
  isNotNil,
  LoadResult,
  NetworkService,
  Person,
  ReferentialAsObjectOptions,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { CacheService } from 'ionic-cache';
import { ReferentialRefService } from './referential-ref.service';
import { Program, ProgramPerson } from './model/program.model';
import { SortDirection } from '@angular/material/sort';
import { ReferentialService } from './referential.service';
import { ProgramFragments } from './program.fragments';
import { ProgramRefService } from './program-ref.service';
import { BaseReferentialService } from './base-referential-service.class';
import { StrategyRefService } from './strategy-ref.service';
import { ProgramFilter } from './filter/program.filter';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ProgramPrivilegeIds } from '@app/referential/services/model/model.enum';
import { NOT_MINIFY_OPTIONS } from "@app/core/services/model/referential.utils";
import { mergeMap } from 'rxjs/operators';

export interface ProgramSaveOptions extends EntitySaveOptions {
  withStrategies?: boolean; // False by default
  withDepartmentsAndPersons?: boolean; // True by default
}

const ProgramQueries: BaseEntityGraphqlQueries = {
  // Load by id
  load: gql`query Program($id: Int, $label: String){
    data: program(id: $id, label: $label){
      ...ProgramFragment
    }
  }
  ${ProgramFragments.program}
  ${ReferentialFragments.lightReferential}
  ${ReferentialFragments.lightPerson}`,

  // Load all query
  loadAll: gql`query Programs($filter: ProgramFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightProgramFragment
    }
  }
  ${ProgramFragments.lightProgram}`,

  // Load all query (with total)
  loadAllWithTotal: gql`query ProgramsWithTotal($filter: ProgramFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightProgramFragment
    }
    total: programsCount(filter: $filter)
  }
  ${ProgramFragments.lightProgram}`
};

const ProgramMutations: BaseEntityGraphqlMutations = {
  save: gql`mutation SaveProgram($data: ProgramVOInput!, $options: ProgramSaveOptionsInput!){
    data: saveProgram(program: $data, options: $options){
      ...ProgramFragment
    }
  }
  ${ProgramFragments.program}
  ${ReferentialFragments.lightReferential}
  ${ReferentialFragments.lightPerson}`,

  delete: gql`mutation DeletePrograms($ids:[Int]){
    deleteReferentials(entityName: "Program", ids: $ids)
  }`
};

@Injectable({providedIn: 'root'})
export class ProgramService extends BaseReferentialService<Program, ProgramFilter>
  implements IEntitiesService<Program, ProgramFilter>,
    IEntityService<Program> {

  constructor(
    injector: Injector,
    protected network: NetworkService,
    protected accountService: AccountService,
    protected referentialService: ReferentialService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected strategyRefService: StrategyRefService,
    protected cache: CacheService,
    protected entities: EntitiesStorage
  ) {
    super(injector, Program, ProgramFilter, {
      queries: ProgramQueries,
      mutations: ProgramMutations
    });
    if (this._debug) console.debug('[program-service] Creating service');
  }

  /**
   * Load programs
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param dataFilter
   * @param opts
   */
  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           dataFilter?: ProgramFilter,
           opts?: {
             fetchPolicy?: WatchQueryFetchPolicy;
             withTotal?: boolean;
           }): Observable<LoadResult<Program>> {

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: dataFilter
    };
    const now = Date.now();
    if (this._debug) console.debug("[program-service] Watching programs using options:", variables);

    const withTotal = (!opts || opts.withTotal !== false);
    const query = withTotal ? ProgramQueries.loadAllWithTotal : ProgramQueries.loadAll;
    return this.mutableWatchQuery<LoadResult<any>>({
      queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
      arrayFieldName: 'data',
      totalFieldName: withTotal ? 'total' : undefined,
      query,
      variables,
      error: {code: ErrorCodes.LOAD_PROGRAMS_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAMS_ERROR"},
      fetchPolicy: opts && opts.fetchPolicy || undefined
    })
      .pipe(
        map(({data, total}) => {
            const entities = (data || []).map(Program.fromObject);
            if (this._debug) console.debug(`[program-service] Programs loaded in ${Date.now() - now}ms`, entities);
            return {
              data: entities,
              total
            };
          }
        )
      );
  }

  /**
   * Load programs
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param dataFilter
   * @param opts
   */
  async loadAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           dataFilter?: Partial<ProgramFilter>,
           opts?: {
             query?: any,
             fetchPolicy: FetchPolicy;
             withTotal?: boolean;
             toEntity?: boolean;
             debug?: boolean;
           }): Promise<LoadResult<Program>> {

    dataFilter = this.asFilter(dataFilter);

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc'
    };
    const debug = this._debug && (!opts || opts.debug !== false);
    const now = debug && Date.now();
    if (debug) console.debug("[program-service] Loading programs... using options:", variables);

    let res: LoadResult<any>;

    // Offline mode
    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      console.warn('TODO: remove this local entities call. Use program-ref.servie instead !');
      res = await this.entities.loadAll(Program.TYPENAME,
        {
          ...variables,
          filter: dataFilter && dataFilter.asFilterFn()
        }
      );
    }

    // Online mode
    else {
      const query = opts && opts.query
        || opts && opts.withTotal && ProgramQueries.loadAllWithTotal
        || ProgramQueries.loadAll;
      res = await this.graphql.query<LoadResult<any>>({
        query,
        variables: {
          ...variables,
          filter: dataFilter && dataFilter.asPodObject()
        },
        error: {code: ErrorCodes.LOAD_PROGRAMS_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAMS_ERROR"},
        fetchPolicy: opts && opts.fetchPolicy || undefined
      });
    }

    const entities = (!opts || opts.toEntity !== false) ?
      (res && res.data || []).map(Program.fromObject) :
      (res && res.data || []) as Program[];
    if (debug) console.debug(`[program-service] Programs loaded in ${Date.now() - now}ms`, entities);
    return {
      data: entities,
      total: res && res.total
    };
  }

  async existsByLabel(label: string, opts?: {
    excludedIds?: number[];
    fetchPolicy?: FetchPolicy;
  }): Promise<boolean> {
    if (isNil(label)) return false;
    return await this.referentialService.existsByLabel(label, { ...opts, entityName: 'Pmfm' });
  }


  async save(entity: Program, opts?: ProgramSaveOptions): Promise<Program> {

    // TODO isSamplingStrategyEditor is true on ProgramPage, so can't remove user rights from this page.
    //      see https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-app/-/issues/441
    const isSamplingStrategyEditor = 'sampling' === entity?.properties[ProgramProperties.STRATEGY_EDITOR.key];
    opts = {
      withStrategies: false,
      withDepartmentsAndPersons: !isSamplingStrategyEditor,
      ...opts
    };

    const options: EntitySaveOptions = {
      awaitRefetchQueries: opts.awaitRefetchQueries,
      refetchQueries: opts.refetchQueries,
      update: opts.update
    };

    if (!this.mutations.save) {
      if (!this.mutations.saveAll) throw new Error('Not implemented');

      const data = await this.saveAll([entity], options);
      return data && data[0];
    }

    // Fill default properties
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const isNew = this.isNewFn(json);

    const now = Date.now();
    if (this._debug) console.debug(this._logPrefix + `Saving ${this._logTypeName}...`, json);

    await this.graphql.mutate<{ data: any }>({
      mutation: this.mutations.save,
      refetchQueries: this.getRefetchQueriesForMutation(options),
      awaitRefetchQueries: options && options.awaitRefetchQueries,
      variables: {
        data: json,
        options: {
          withStrategies: opts.withStrategies,
          withDepartmentsAndPersons: opts.withDepartmentsAndPersons
        }
      },
      error: {code: ErrorCodes.SAVE_PROGRAM_ERROR, message: 'ERROR.SAVE_PROGRAM_ERROR'},
      update: (cache, {data}) => {
        // Update entity
        const savedEntity = data && data.data;
        this.copyIdAndUpdateDate(savedEntity, entity);

        // Insert into the cache
        if (isNew && this.watchQueriesUpdatePolicy === 'update-cache') {
          this.insertIntoMutableCachedQueries(cache, {
            queries: this.getLoadQueries(),
            data: savedEntity
          });
        }

        if (options && options.update) {
          options.update(cache, {data});
        }

        if (this._debug) console.debug(this._logPrefix + `${entity.__typename} saved in ${Date.now() - now}ms`, entity);
      }
    });

    return entity;
  }

  async clearCache() {
    // Make sure to clean all strategy references (.e.g Pmfm cache, etc)
    await Promise.all([
      this.programRefService.clearCache(),
      this.strategyRefService.clearCache()
    ]);
  }

  async deleteAll(entities: Program[], options?: any): Promise<any> {
    // Avoid any deletion (need more control, to check if there is linked data, etc.)
    throw new Error('Not implemented yet!');
  }

  canUserWrite(entity: Program, opts?: any) {
    return this.accountService.isAdmin()
      // Check program managers (if entity exists)
      || (isNotNil(entity.id) && this.hasPrivilege(entity, this.accountService.person, ProgramPrivilegeIds.MANAGER));
  }

  listenChanges(id: number, opts?: { query?: any; variables?: any; interval?: number; toEntity?: boolean }): Observable<Program> {
    return this.referentialService.listenChanges(id, {...opts, entityName: Program.ENTITY_NAME})
      .pipe(mergeMap(data => this.load(id, {...opts, fetchPolicy: 'network-only'})));
  }

  copyIdAndUpdateDate(source: Program, target: Program) {
    EntityUtils.copyIdAndUpdateDate(source, target);

    // Update persons
    if (target.persons && source.persons) {
      target.persons.forEach(targetPerson => {
        targetPerson.programId = source.id;
        const sourcePerson = source.persons.find(p => ProgramPerson.equals(p, targetPerson));
        EntityUtils.copyIdAndUpdateDate(sourcePerson, targetPerson);
      });
    }

    // Update strategies
    if (target.strategies && source.strategies) {
      target.strategies.forEach(entity => {

        // Make sure tp copy programId (need by equals)
        entity.programId = source.id;

      });
    }


  }

  /* -- protected methods -- */

  protected asObject(source: Program, opts?: ReferentialAsObjectOptions): any {
    return source.asObject(
      <ReferentialAsObjectOptions>{
        ...opts,
        ...NOT_MINIFY_OPTIONS, // Force NOT minify, because program is a referential that can be minify in just an ID
      });
  }

  protected fillDefaultProperties(program: Program) {
    program.statusId = isNotNil(program.statusId) ? program.statusId : StatusIds.ENABLE;

    // Update strategies
    (program.strategies || []).forEach(strategy => {

      strategy.statusId = isNotNil(strategy.statusId) ? strategy.statusId : StatusIds.ENABLE;

      // Force a valid programId
      // (because a bad copy can leave an old value)
      strategy.programId = isNotNil(program.id) ? program.id : undefined;
    });
  }

  protected hasPrivilege(program: Program, person: Person, privilegeId: number): boolean {
    if (!program || !person || isNil(person.id) || isNil(privilegeId)) return false; // Skip
    // Lookup on person's privileges
    return (program.persons || [])
        .some(p => p.person.id === person.id && p.privilege.id === privilegeId)
      // Lookup on department's privileges
      || (isNotNil(person.department?.id) && (program.departments || [])
        .some(d => d.department.id === person.department.id && d.privilege.id === privilegeId))
    ;
  }
}
