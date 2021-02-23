import {DataEntityAsObjectOptions} from "../../data/services/model/data-entity.model";
import {Directive, Injector} from "@angular/core";
import {AccountService} from "../../core/services/account.service";
import {GraphqlService} from "../../core/graphql/graphql.service";
import {IDataEntityQualityService} from "../../data/services/data-quality-service.class";
import {FormErrors} from "../../core/form/form.utils";
import {DataRootEntityUtils, RootDataEntity} from "../../data/services/model/root-data-entity.model";
import {MINIFY_OPTIONS} from "../../core/services/model/referential.model";
import {ErrorCodes} from "./trip.errors";
import {IWithRecorderDepartmentEntity} from "../../data/services/model/model.utils";
import {Department} from "../../core/services/model/department.model";
import {isNil, isNotNil} from "../../shared/functions";
import {EntityUtils} from "../../core/services/model/entity.model";
import {Person} from "../../core/services/model/person.model";
import {
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityGraphqlSubscriptions,
  BaseEntityService,
  BaseEntityServiceOptions
} from "../../referential/services/base-entity-service.class";
import {PlatformService} from "../../core/services/platform.service";
import {StoreObject} from "@apollo/client/core";


export interface BaseRootEntityGraphqlMutations extends BaseEntityGraphqlMutations {
  terminate?: any;
  validate?: any;
  unvalidate?: any;
  qualify?: any;
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class BaseRootDataService<T extends RootDataEntity<T>,
  F = any,
  Q extends BaseEntityGraphqlQueries = BaseEntityGraphqlQueries,
  M extends BaseRootEntityGraphqlMutations = BaseRootEntityGraphqlMutations,
  S extends BaseEntityGraphqlSubscriptions = BaseEntityGraphqlSubscriptions>
  extends BaseEntityService<T, F, Q, M, S>
  implements IDataEntityQualityService<T> {

  protected accountService: AccountService;

  protected constructor(
    injector: Injector,
    dataType: new() => T,
    options: BaseEntityServiceOptions<T, F, Q, M, S>
  ) {
    super(
      injector.get(GraphqlService),
      injector.get(PlatformService),
      dataType,
      options);

    this.accountService = this.accountService || injector && injector.get(AccountService) || undefined;
  }

  canUserWrite(entity: T): boolean {
    if (!entity) return false;

    // If the user is the recorder: can write
    if (entity.recorderPerson && this.accountService.account.asPerson().equals(entity.recorderPerson)) {
      return true;
    }

    // TODO: check rights on program (need model changes)
    return this.accountService.canUserWriteDataForDepartment(entity.recorderDepartment);
  }

  abstract control(entity: T, opts?: any): Promise<FormErrors>;

  async terminate(entity: T): Promise<T> {
    if (!this.mutations.terminate) throw Error('Not implemented');
    if (isNil(entity.id) || entity.id < 0) {
      throw new Error("Entity must be saved before terminate!");
    }

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const now = this._debug && Date.now();
    if (this._debug) console.debug(this._debugPrefix + `Terminate entity {${entity.id}}...`, json);

    await this.graphql.mutate<{ data: T }>({
      mutation: this.mutations.terminate,
      variables: {
        data: json
      },
      error: { code: ErrorCodes.TERMINATE_ENTITY_ERROR, message: "ERROR.TERMINATE_ENTITY_ERROR" },
      update: (proxy, {data}) => {
        this.copyIdAndUpdateDate(data && data.data, entity);
        if (this._debug) console.debug(this._debugPrefix + `Entity terminated in ${Date.now() - now}ms`, entity);
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
    if (isNil(entity.id) || entity.id < 0) {
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
    if (this._debug) console.debug(this._debugPrefix + `Validate entity {${entity.id}}...`, json);

    await this.graphql.mutate<{ data: T }>({
      mutation: this.mutations.validate,
      variables: {
        data: json
      },
      error: { code: ErrorCodes.VALIDATE_ENTITY_ERROR, message: "ERROR.VALIDATE_ENTITY_ERROR" },
      update: (cache, {data}) => {
        this.copyIdAndUpdateDate(data && data.data, entity);
        if (this._debug) console.debug(this._debugPrefix + `Entity validated in ${Date.now() - now}ms`, entity);
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
    if (this._debug) console.debug(this._debugPrefix + "Unvalidate entity...", json);

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

          if (this._debug) console.debug(this._debugPrefix + `Entity unvalidated in ${Date.now() - now}ms`, entity);
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
    if (this._debug) console.debug(this._debugPrefix + "Qualifying entity...", json);

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

        if (this._debug) console.debug(this._debugPrefix + `Entity qualified in ${Date.now() - now}ms`, entity);
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

  protected asObject(entity: T, opts?: DataEntityAsObjectOptions): StoreObject {
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
