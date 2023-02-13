import { EntityAsObjectOptions, fromDateISOString,  isNil, Person, ReferentialAsObjectOptions, ReferentialRef, toDateISOString} from '@sumaris-net/ngx-components';
import {Moment} from 'moment';
import { DataEntity, DataEntityAsObjectOptions, DataEntityUtils, IDataEntity } from './data-entity.model';
import {IWithProgramEntity, IWithRecorderPersonEntity, SynchronizationStatus} from './model.utils';
import { NOT_MINIFY_OPTIONS } from "@app/core/services/model/referential.utils";


export interface IRootDataEntity<T = any,
  ID = number,
  AO extends EntityAsObjectOptions = EntityAsObjectOptions,
  FO = any> extends IDataEntity<T, ID, AO, FO> {
  validationDate: Moment;
  synchronizationStatus?: SynchronizationStatus;
}


export class RootDataEntity<
  T extends RootDataEntity<any, ID, AO>,
  ID = number,
  AO extends DataEntityAsObjectOptions = DataEntityAsObjectOptions,
  FO = any>
  extends DataEntity<T, ID, AO, FO>
  implements IWithRecorderPersonEntity<T, ID>,
    IWithProgramEntity<T, ID>,
    IRootDataEntity<T, ID, AO, FO> {

  static fromObject(source: any): RootDataEntity<any> {
    const target = new RootDataEntity();
    target.fromObject(source);
    return target;
  }

  creationDate: Moment = null;
  validationDate: Moment = null;
  comments: string = null;
  recorderPerson: Person = null;
  program: ReferentialRef = null;
  synchronizationStatus?: SynchronizationStatus = null;

  protected constructor(__typename?: string) {
    super(__typename);
  }

  asObject(options?: AO): any {
    const target = super.asObject(options);
    target.creationDate = toDateISOString(this.creationDate);
    target.validationDate = toDateISOString(this.validationDate);
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(options) || undefined;
    target.program = this.program && this.program.asObject({ ...options, ...NOT_MINIFY_OPTIONS /*always keep for table*/ } as ReferentialAsObjectOptions) || undefined;
    if (options && options.minify) {
      if (target.program) delete target.program.entityName;
      if (options.keepSynchronizationStatus !== true) {
        delete target.synchronizationStatus; // Remove by default, when minify, because not exists on pod's model
      }
    }
    return target;
  }


  fromObject(source: any, opts?: FO) {
    super.fromObject(source, opts);
    this.comments = source.comments;
    this.creationDate = fromDateISOString(source.creationDate);
    this.validationDate = fromDateISOString(source.validationDate);
    this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson);
    // Keep existing program, if not in source (because some forms can disable the program field - e.g. ObservedLocationForm)
    this.program = source.program && ReferentialRef.fromObject(source.program) || this.program;
    this.synchronizationStatus = source.synchronizationStatus;
  }
}

export abstract class RootDataEntityUtils {

  static copyControlAndValidationDate(source: RootDataEntity<any, any> | undefined, target: RootDataEntity<any, any>) {
    if (!source) return;
    DataEntityUtils.copyControlDate(source, target);
    target.validationDate = fromDateISOString(source.validationDate);
  }

  static copyQualificationDateAndFlag = DataEntityUtils.copyQualificationDateAndFlag;

  static isLocal(entity: RootDataEntity<any, any>): boolean {
    return entity && (isNil(entity.id) ? (entity.synchronizationStatus && entity.synchronizationStatus !== 'SYNC') : entity.id < 0);
  }

  static isRemote(entity: RootDataEntity<any, any>): boolean {
    return entity && !RootDataEntityUtils.isLocal(entity);
  }

  static isLocalAndDirty(entity: RootDataEntity<any, any>): boolean {
    return entity && entity.id < 0 && entity.synchronizationStatus === 'DIRTY' || false;
  }

  static isReadyToSync(entity: RootDataEntity<any, any>): boolean {
    return entity && entity.id < 0 && entity.synchronizationStatus === 'READY_TO_SYNC' || false;
  }

  static markAsDirty(entity: RootDataEntity<any, any>) {
    if (!entity) return; // skip

    // Remove control flags
    DataEntityUtils.markAsNotControlled(entity);

    // On local entity: change the synchronization statuc
    if (entity.id < 0) {
      entity.synchronizationStatus = 'DIRTY';
    }
  }
}
