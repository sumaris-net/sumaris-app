import { Moment } from 'moment';
import {
  DateUtils,
  Department,
  Entity,
  EntityAsObjectOptions,
  fromDateISOString,
  IEntity,
  isNil,
  isNotNil,
  ReferentialAsObjectOptions,
  removeEnd,
  toDateISOString,
  toNumber,
} from '@sumaris-net/ngx-components';
import { IWithObserversEntity, IWithRecorderDepartmentEntity } from './model.utils';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import {StoreObject} from '@apollo/client/core';

export interface DataEntityAsObjectOptions extends ReferentialAsObjectOptions {
  keepSynchronizationStatus?: boolean;

  keepRemoteId?: boolean; // Allow to clean id (e.g. when restoring entities from trash)
  keepUpdateDate?: boolean; // Allow to clean updateDate (e.g. when restoring entities from trash)
}

export const SERIALIZE_FOR_OPTIMISTIC_RESPONSE = Object.freeze(<DataEntityAsObjectOptions>{
  minify: false,
  keepTypename: true,
  keepEntityName: true,
  keepLocalId: true,
  keepSynchronizationStatus: true
});
export const MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE = Object.freeze(<DataEntityAsObjectOptions>{
  minify: true,
  keepTypename: true,
  keepEntityName: true,
  keepLocalId: true,
  keepSynchronizationStatus: true
});

export const SAVE_AS_OBJECT_OPTIONS = Object.freeze(<DataEntityAsObjectOptions>{
  minify: true,
  keepTypename: false,
  keepEntityName: false,
  keepLocalId: false,
  keepSynchronizationStatus: false
});
export const COPY_LOCALLY_AS_OBJECT_OPTIONS = Object.freeze(<DataEntityAsObjectOptions>{
  ...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE,
  keepLocalId: false,
  keepRemoteId: false,
  keepUpdateDate: false
});
export const CLONE_AS_OBJECT_OPTIONS = Object.freeze(<DataEntityAsObjectOptions>{
  ...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE,
  minify: false
});


export interface IDataEntity<T = any,
  ID = number,
  AO extends EntityAsObjectOptions = EntityAsObjectOptions,
  FO = any
  > extends IEntity<T, ID, AO, FO>, IWithRecorderDepartmentEntity<T, ID, AO, FO> {
  recorderDepartment: Department;
  controlDate: Moment;
  qualificationDate: Moment;
  qualityFlagId: number;
}

export abstract class DataEntity<
  T extends DataEntity<T, ID, AO>,
  ID = number,
  AO extends DataEntityAsObjectOptions = DataEntityAsObjectOptions,
  FO = any>
  extends Entity<T, ID, AO>
  implements IDataEntity<T, ID, AO, FO> {

  recorderDepartment: Department;
  controlDate: Moment;
  qualificationDate: Moment;
  qualificationComments: string;
  qualityFlagId: number;

  protected constructor(__typename?: string) {
    super(__typename);
    this.recorderDepartment = null;
  }

  asObject(opts?: AO): any {
    const target:StoreObject = super.asObject(opts);
    if (opts && opts.keepRemoteId === false && (target.id as number) >= 0) delete target.id;
    if (opts && opts.keepUpdateDate === false && (target.id as number) >= 0) delete target.updateDate;
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(opts) || undefined;
    target.controlDate = toDateISOString(this.controlDate);
    target.qualificationDate = toDateISOString(this.qualificationDate);
    target.qualificationComments = this.qualificationComments || undefined;
    target.qualityFlagId = toNumber(this.qualityFlagId, undefined);
    return target;
  }

  fromObject(source: any, opts?: FO) {
    super.fromObject(source);
    this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
    this.controlDate = fromDateISOString(source.controlDate);
    this.qualificationDate = fromDateISOString(source.qualificationDate);
    this.qualificationComments = source.qualificationComments;
    this.qualityFlagId = toNumber(source.qualityFlagId, QualityFlagIds.NOT_QUALIFIED);
  }

  getStrategyDateTime(): Moment | undefined {
    return undefined;
  }

}


export abstract class DataEntityUtils {

  static copyControlDate(source: DataEntity<any, any> | undefined, target: DataEntity<any, any>) {
    if (!source) return;
    target.controlDate = fromDateISOString(source.controlDate);
  }

  static copyQualificationDateAndFlag(source: DataEntity<any, any> | undefined, target: DataEntity<any, any>) {
    if (!source) return;
    target.qualificationDate = fromDateISOString(source.qualificationDate);
    target.qualificationComments = source.qualificationComments;
    target.qualityFlagId = source.qualityFlagId;
  }

  /**
   * Reset controlDate, and reset quality fLag and comment
   *
   * @param entity
   * @param opts
   */
  static markAsNotControlled(entity: DataEntity<any, any>|undefined, opts?: {keepQualityFlag?: boolean}) {
    // Mark as controlled
    entity.controlDate = null;
    // Clean quality flag
    if (!opts || opts.keepQualityFlag !== true) {
      entity.qualityFlagId = QualityFlagIds.NOT_QUALIFIED;
    }
    // Clean qualification data
    entity.qualificationComments = null;
    entity.qualificationDate = null;
  }

  /**
   * Check if an entity has been controlled
   *
   * @param entity
   */
  static isControlled(entity: DataEntity<any, any>|undefined): boolean {
    return !!entity?.controlDate;
  }
  /**
   * Set controlDate, and reset quality fLag and comment
   *
   * @param entity
   * @param opts
   */
  static markAsControlled(entity: DataEntity<any, any>|undefined, opts?: {controlDate?: Moment}) {
    if (!entity) return; // skip
    // Mark as controlled
    entity.controlDate = opts?.controlDate || DateUtils.moment();
    // Clean quality flag
    entity.qualityFlagId = QualityFlagIds.NOT_QUALIFIED;
    // Clean qualification data
    entity.qualificationComments = null;
    entity.qualificationDate = null;
  }

  /**
   * Mark as invalid, using qualityFlag
   *
   * @param entity
   * @param errorMessage
   */
  static markAsInvalid(entity: DataEntity<any, any>|undefined, errorMessage: string) {
    if (!entity) return; // skip
    // Clean date
    entity.controlDate = null;
    entity.qualificationDate = null;

    // Register error message, into qualificationComments
    entity.qualificationComments = errorMessage;

    // Clean quality flag
    entity.qualityFlagId = QualityFlagIds.BAD;
  }

  /**
   * Check if an entity has been mark as invalid
   *
   * @param entity
   */
  static isInvalid(entity: DataEntity<any, any>|undefined) {
    if (!entity) return false; // skip
    return isNil(entity.controlDate) && isNil(entity.qualificationDate) && entity.qualityFlagId === QualityFlagIds.BAD;
  }

  /**
   * Reset controlDate, and reset quality fLag and comment
   *
   * @param entity
   * @param opts
   */
  static hasNoQualityFlag(entity: DataEntity<any, any>|undefined): boolean {
    return isNil(entity.qualityFlagId) || entity.qualityFlagId === QualityFlagIds.NOT_QUALIFIED;
  }

  /**
   * Get entity name from the __typename of an entity
   *
   * @param entity
   */
  static getEntityName(entity: DataEntity<any, any>|undefined): string|undefined {
    return entity && removeEnd(entity.__typename || 'UnknownVO', 'VO');
  }

  static isWithObservers<T extends IEntity<any, any> = IEntity<any, any>>(entity: T|undefined): entity is T & IWithObserversEntity<T> {
    return isNotNil(entity?.['observers']);
  }
}
