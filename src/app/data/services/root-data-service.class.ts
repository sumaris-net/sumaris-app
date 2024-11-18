import { DataEntityAsObjectOptions } from './model/data-entity.model';
import { Directive, inject, Injector } from '@angular/core';
import {
  AppErrorWithDetails,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityGraphqlSubscriptions,
  BaseEntityServiceOptions,
  Department,
  EntitiesServiceWatchOptions,
  EntityServiceListenChangesOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  FormErrors,
  isNil,
  isNotNil,
  Person,
} from '@sumaris-net/ngx-components';
import { IDataEntityQualityService, IRootDataTerminateOptions, IRootDataValidateOptions } from './data-quality-service.class';
import { RootDataEntity, RootDataEntityUtils } from './model/root-data-entity.model';
import { DataErrorCodes } from './errors';
import { IWithRecorderDepartmentEntity } from './model/model.utils';
import { RootDataEntityFilter } from './model/root-data-filter.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Observable, of } from 'rxjs';
import { Program } from '@app/referential/services/model/program.model';
import { BaseDataService } from '@app/data/services/data-service.class';

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
    WO extends EntitiesServiceWatchOptions = EntitiesServiceWatchOptions<T>,
    LO extends EntityServiceLoadOptions = EntityServiceLoadOptions<T>,
    Q extends BaseEntityGraphqlQueries = BaseEntityGraphqlQueries,
    M extends BaseRootEntityGraphqlMutations = BaseRootEntityGraphqlMutations,
    S extends BaseEntityGraphqlSubscriptions = BaseEntityGraphqlSubscriptions,
    TO extends IRootDataTerminateOptions = IRootDataTerminateOptions,
    VO extends IRootDataValidateOptions = IRootDataValidateOptions,
  >
  extends BaseDataService<T, F, ID, WO, LO, Q, M, S>
  implements IDataEntityQualityService<T, ID>
{
  protected programRefService = inject(ProgramRefService);

  protected constructor(injector: Injector, dataType: new () => T, filterType: new () => F, options: BaseEntityServiceOptions<T, ID, Q, M, S>) {
    super(injector, dataType, filterType, options);
  }

  canUserWrite(entity: T, opts?: { program?: Program }): boolean {
    return (
      EntityUtils.isLocal(entity) || // For performance, always give write access to local data
      this.accountService.isAdmin() ||
      (this.programRefService.canUserWriteEntity(entity, opts) && (isNil(entity.validationDate) || this.accountService.isSupervisor()))
    );
  }

  listenChanges(id: ID, opts?: EntityServiceListenChangesOptions): Observable<T> {
    if (EntityUtils.isLocalId(+id)) return of();
    return super.listenChanges(id, opts);
  }

  abstract control(entity: T, opts?: any): Promise<AppErrorWithDetails | FormErrors>;

  async terminate(entity: T, opts?: TO): Promise<T> {
    if (!this.mutations.terminate) throw Error('Not implemented');
    if (isNil(entity.id) || +entity.id < 0) {
      throw new Error('Entity must be saved before terminate!');
    }

    // Fill options
    opts = await this.fillTerminateOption(entity, opts);

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const now = this._debug && Date.now();
    if (this._debug) console.debug(this._logPrefix + `Terminate entity {${entity.id}}...`, json);

    await this.graphql.mutate<{ data: T }>({
      mutation: this.mutations.terminate,
      variables: {
        data: json,
        options: opts?.withChildren ? { withChildren: true } : undefined,
      },
      error: { code: DataErrorCodes.TERMINATE_ENTITY_ERROR, message: 'ERROR.TERMINATE_ENTITY_ERROR' },
      update: (proxy, { data }) => {
        this.copyIdAndUpdateDate(data && data.data, entity);
        if (this._debug) console.debug(this._logPrefix + `Entity terminated in ${Date.now() - now}ms`, entity);
      },
    });

    return entity;
  }

  /**
   * Validate an root entity
   *
   * @param entity
   * @param opts
   */
  async validate(entity: T, opts?: VO): Promise<T> {
    if (!this.mutations.validate) throw Error('Not implemented');
    if (isNil(entity.id) || EntityUtils.isLocal(entity)) {
      throw new Error('Entity must be saved once before validate !');
    }
    if (isNil(entity.controlDate)) {
      throw new Error('Entity must be controlled before validate !');
    }
    if (isNotNil(entity.validationDate)) {
      throw new Error('Entity is already validated !');
    }

    // Fill options
    opts = await this.fillValidateOption(entity, opts);

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const now = Date.now();
    if (this._debug) console.debug(this._logPrefix + `Validate entity {${entity.id}}...`, json);

    await this.graphql.mutate<{ data: T }>({
      mutation: this.mutations.validate,
      variables: {
        data: json,
        options: opts?.withChildren ? { withChildren: true } : undefined,
      },
      error: { code: DataErrorCodes.VALIDATE_ENTITY_ERROR, message: 'ERROR.VALIDATE_ENTITY_ERROR' },
      update: (cache, { data }) => {
        this.copyIdAndUpdateDate(data && data.data, entity);
        if (this._debug) console.debug(this._logPrefix + `Entity validated in ${Date.now() - now}ms`, entity);

        this.refetchMutableWatchQueries({ queries: this.getLoadQueries() });
      },
    });

    return entity;
  }

  async unvalidate(entity: T, opts?: VO): Promise<T> {
    if (!this.mutations.unvalidate) throw Error('Not implemented');
    if (isNil(entity.validationDate)) {
      throw new Error('Entity is not validated yet !');
    }

    // Fill options
    opts = await this.fillValidateOption(entity, opts);

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const now = Date.now();
    if (this._debug) console.debug(this._logPrefix + 'Unvalidate entity...', json);

    await this.graphql.mutate<{ data: T }>({
      mutation: this.mutations.unvalidate,
      variables: {
        data: json,
        options: opts?.withChildren ? { withChildren: true } : undefined,
      },
      context: {
        // TODO serializationKey:
        tracked: true,
      },
      error: { code: DataErrorCodes.UNVALIDATE_ENTITY_ERROR, message: 'ERROR.UNVALIDATE_ENTITY_ERROR' },
      update: (proxy, { data }) => {
        const savedEntity = data && data.data;
        if (savedEntity) {
          if (savedEntity !== entity) {
            this.copyIdAndUpdateDate(savedEntity, entity);
          }

          if (this._debug) console.debug(this._logPrefix + `Entity unvalidated in ${Date.now() - now}ms`, entity);
        }

        this.refetchMutableWatchQueries({ queries: this.getLoadQueries() });
      },
    });

    return entity;
  }

  async qualify(entity: T, qualityFlagId: number): Promise<T> {
    if (!this.mutations.qualify) throw Error('Not implemented');

    if (isNil(entity.validationDate)) {
      throw new Error('Entity is not validated yet !');
    }

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    json.qualityFlagId = qualityFlagId;

    const now = Date.now();
    if (this._debug) console.debug(this._logPrefix + 'Qualifying entity...', json);

    await this.graphql.mutate<{ data: T }>({
      mutation: this.mutations.qualify,
      variables: {
        data: json,
      },
      error: { code: DataErrorCodes.QUALIFY_ENTITY_ERROR, message: 'ERROR.QUALIFY_ENTITY_ERROR' },
      update: (cache, { data }) => {
        const savedEntity = data && data.data;
        this.copyIdAndUpdateDate(savedEntity, entity);
        RootDataEntityUtils.copyQualificationDateAndFlag(savedEntity, entity);

        if (this._debug) console.debug(this._logPrefix + `Entity qualified in ${Date.now() - now}ms`, entity);
      },
    });

    return entity;
  }

  copyIdAndUpdateDate(source: T | undefined, target: T) {
    if (!source) return;

    EntityUtils.copyIdAndUpdateDate(source, target);

    // Copy control and validation date
    RootDataEntityUtils.copyControlAndValidationDate(source, target);
  }

  /* -- protected methods -- */

  protected asObject(source: T, opts?: DataEntityAsObjectOptions): any {
    opts = { ...MINIFY_OPTIONS, ...opts };
    const target = super.asObject(source, opts);

    if (opts.minify) {
      // Keep recorder person
      target.recorderPerson =
        source.recorderPerson &&
        <Person>{
          id: source.recorderPerson.id,
          firstName: source.recorderPerson.firstName,
          lastName: source.recorderPerson.lastName,
        };
    }

    return target;
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

    entities.forEach((entity) => {
      if (!entity.recorderDepartment || !entity.recorderDepartment.id) {
        // Recorder department
        if (department) {
          entity.recorderDepartment = department;
        }
      }
    });
  }

  protected async fillTerminateOption(entity: T, opts?: TO): Promise<TO> {
    return this.fillProgramOptions(entity, opts);
  }

  protected async fillValidateOption(entity: T, opts?: VO): Promise<VO> {
    return this.fillProgramOptions(entity, opts);
  }

  protected async fillProgramOptions<O extends { program?: Program }>(entity: T, opts?: O): Promise<O> {
    opts = opts || <O>{};

    // Load program (need only properties)
    const programLabel = entity?.program?.label;
    if (opts.program?.label !== programLabel) {
      opts.program = await this.programRefService.loadByLabel(programLabel);
    }

    return opts;
  }

  protected resetQualityProperties(entity: T) {
    super.resetQualityProperties(entity);
    entity.validationDate = undefined;
  }
}
