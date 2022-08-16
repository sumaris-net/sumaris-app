import {DataEntityAsObjectOptions} from './model/data-entity.model';
import {Directive, Injector} from '@angular/core';
import {
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityGraphqlSubscriptions,
  BaseEntityService,
  BaseEntityServiceOptions,
  Department, EntitiesServiceWatchOptions, EntityServiceLoadOptions,
  EntityUtils,
  FormErrors,
  GraphqlService,
  isNil,
  isNotNil,
  Person,
  PlatformService,
  ReferentialUtils
} from '@sumaris-net/ngx-components';
import {IDataEntityQualityService} from './data-quality-service.class';
import {DataRootEntityUtils, RootDataEntity} from './model/root-data-entity.model';
import {ErrorCodes} from './errors';
import {IWithRecorderDepartmentEntity} from './model/model.utils';
import {RootDataEntityFilter} from './model/root-data-filter.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { MINIFY_OPTIONS } from "@app/core/services/model/referential.utils";


export interface BaseRootEntityGraphqlMutations extends BaseEntityGraphqlMutations {
  terminate?: any;
  validate?: any;
  unvalidate?: any;
  qualify?: any;
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class BaseRootDataService<
  T extends RootDataEntity<T, ID>,
  F extends RootDataEntityFilter<F, T, ID> = RootDataEntityFilter<any, T, any>,
  ID = number,
  WO extends EntitiesServiceWatchOptions = EntitiesServiceWatchOptions,
  LO extends EntityServiceLoadOptions = EntityServiceLoadOptions,
  Q extends BaseEntityGraphqlQueries = BaseEntityGraphqlQueries,
  M extends BaseRootEntityGraphqlMutations = BaseRootEntityGraphqlMutations,
  S extends BaseEntityGraphqlSubscriptions = BaseEntityGraphqlSubscriptions>
  extends BaseEntityService<T, F, ID, WO, LO, Q, M, S>
  implements IDataEntityQualityService<T, ID> {

  protected accountService: AccountService;
  protected programRefService: ProgramRefService;

  protected constructor(
    injector: Injector,
    dataType: new() => T,
    filterType: new() => F,
    options: BaseEntityServiceOptions<T, ID, Q, M, S>
  ) {
    super(
      injector.get(GraphqlService),
      injector.get(PlatformService),
      dataType,
      filterType,
      options);

    this.accountService = this.accountService || injector && injector.get(AccountService) || undefined;
    this.programRefService = this.programRefService || injector && injector.get(ProgramRefService) || undefined;
  }

  canUserWrite(entity: T, opts?: any): boolean {
    return EntityUtils.isLocal(entity) // For performance, always give write access to local data
      || this.accountService.isAdmin()
      || (this.programRefService.canUserWriteEntity(entity)
        && (isNil(entity.validationDate) || this.accountService.isSupervisor())
      );
  }

  abstract control(entity: T, opts?: any): Promise<FormErrors>;

  async terminate(entity: T): Promise<T> {
    if (!this.mutations.terminate) throw Error('Not implemented');
    if (isNil(entity.id) || +entity.id < 0) {
      throw new Error("Entity must be saved before terminate!");
    }

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const now = this._debug && Date.now();
    if (this._debug) console.debug(this._logPrefix + `Terminate entity {${entity.id}}...`, json);

    await this.graphql.mutate<{ data: T }>({
      mutation: this.mutations.terminate,
      variables: {
        data: json
      },
      error: { code: ErrorCodes.TERMINATE_ENTITY_ERROR, message: "ERROR.TERMINATE_ENTITY_ERROR" },
      update: (proxy, {data}) => {
        this.copyIdAndUpdateDate(data && data.data, entity);
        if (this._debug) console.debug(this._logPrefix + `Entity terminated in ${Date.now() - now}ms`, entity);
      }
    });

    return entity;
  }


  /**
   * Validate an root entity
   * @param entity
   */
  async validate(entity: T): Promise<T> {
    if (!this.mutations.validate) throw Error('Not implemented');
    if (isNil(entity.id) || +entity.id < 0) {
      throw new Error("Entity must be saved once before validate !");
    }
    if (isNil(entity.controlDate)) {
      throw new Error("Entity must be controlled before validate !");
    }
    if (isNotNil(entity.validationDate)) {
      throw new Error("Entity is already validated !");
    }

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const now = Date.now();
    if (this._debug) console.debug(this._logPrefix + `Validate entity {${entity.id}}...`, json);

    await this.graphql.mutate<{ data: T }>({
      mutation: this.mutations.validate,
      variables: {
        data: json
      },
      error: { code: ErrorCodes.VALIDATE_ENTITY_ERROR, message: "ERROR.VALIDATE_ENTITY_ERROR" },
      update: (cache, {data}) => {
        this.copyIdAndUpdateDate(data && data.data, entity);
        if (this._debug) console.debug(this._logPrefix + `Entity validated in ${Date.now() - now}ms`, entity);
      }
    });

    return entity;
  }

  async unvalidate(entity: T): Promise<T> {
    if (!this.mutations.unvalidate) throw Error('Not implemented');
    if (isNil(entity.validationDate)) {
      throw new Error("Entity is not validated yet !");
    }

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const now = Date.now();
    if (this._debug) console.debug(this._logPrefix + "Unvalidate entity...", json);

    await this.graphql.mutate<{ data: T }>({
      mutation: this.mutations.unvalidate,
      variables: {
        data: json
      },
      context: {
        // TODO serializationKey:
        tracked: true
      },
      error: { code: ErrorCodes.UNVALIDATE_ENTITY_ERROR, message: "ERROR.UNVALIDATE_ENTITY_ERROR" },
      update: (proxy, {data}) => {
        const savedEntity = data && data.data;
        if (savedEntity) {
          if (savedEntity !== entity) {
            this.copyIdAndUpdateDate(savedEntity, entity);
          }

          if (this._debug) console.debug(this._logPrefix + `Entity unvalidated in ${Date.now() - now}ms`, entity);
        }
      }
    });

    return entity;
  }

  async qualify(entity: T, qualityFlagId: number): Promise<T> {
    if (!this.mutations.qualify) throw Error('Not implemented');

    if (isNil(entity.validationDate)) {
      throw new Error("Entity is not validated yet !");
    }

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    json.qualityFlagId = qualityFlagId;

    const now = Date.now();
    if (this._debug) console.debug(this._logPrefix + "Qualifying entity...", json);

    await this.graphql.mutate<{ data: T }>({
      mutation: this.mutations.qualify,
      variables: {
        data: json
      },
      error: { code: ErrorCodes.QUALIFY_ENTITY_ERROR, message: "ERROR.QUALIFY_ENTITY_ERROR" },
      update: (cache, {data}) => {
        const savedEntity = data && data.data;
        this.copyIdAndUpdateDate(savedEntity, entity);
        DataRootEntityUtils.copyQualificationDateAndFlag(savedEntity, entity);

        if (this._debug) console.debug(this._logPrefix + `Entity qualified in ${Date.now() - now}ms`, entity);
      }
    });

    return entity;
  }

  copyIdAndUpdateDate(source: T | undefined, target: T) {
    if (!source) return;

    EntityUtils.copyIdAndUpdateDate(source, target);

    // Copy control and validation date
    DataRootEntityUtils.copyControlAndValidationDate(source, target);

  }

  /* -- protected methods -- */

  protected asObject(entity: T, opts?: DataEntityAsObjectOptions): any {
    opts = { ...MINIFY_OPTIONS, ...opts };
    const copy = entity.asObject(opts);

    if (opts && opts.minify) {

      // Comment because need to keep recorder person
      copy.recorderPerson = entity.recorderPerson && <Person>{
        id: entity.recorderPerson.id,
        firstName: entity.recorderPerson.firstName,
        lastName: entity.recorderPerson.lastName
      };

      // Keep id only, on department
      copy.recorderDepartment = entity.recorderDepartment && {id: entity.recorderDepartment && entity.recorderDepartment.id} || undefined;
    }

    return copy;
  }

  protected fillDefaultProperties(entity: T) {
    // If new entity
    const isNew = isNil(entity.id);
    if (isNew) {

      const person = this.accountService.person;

      // Recorder department
      if (person && person.department && !entity.recorderDepartment) {
        entity.recorderDepartment = person.department;
      }

      // Recorder person
      if (person && person.id && !entity.recorderPerson) {
        entity.recorderPerson = person;
      }
    }
  }

  protected fillRecorderDepartment(entities: IWithRecorderDepartmentEntity<any> | IWithRecorderDepartmentEntity<any>[], department?: Department) {

    if (isNil(entities)) return;
    if (!Array.isArray(entities)) {
      entities = [entities];
    }
    department = department || this.accountService.department;

    entities.forEach(entity => {
      if (!entity.recorderDepartment || !entity.recorderDepartment.id) {
        // Recorder department
        if (department) {
          entity.recorderDepartment = department;
        }
      }
    });
  }

  protected resetQualityProperties(entity: T) {
    entity.controlDate = undefined;
    entity.validationDate = undefined;
    entity.qualificationDate = undefined;
    entity.qualityFlagId = undefined;
  }


}
