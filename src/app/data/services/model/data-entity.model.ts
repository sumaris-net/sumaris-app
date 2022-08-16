import { Moment } from 'moment';
import { Department, Entity, EntityAsObjectOptions, fromDateISOString, IEntity, isNotNil, ReferentialAsObjectOptions, toDateISOString } from '@sumaris-net/ngx-components';
import { IWithRecorderDepartmentEntity } from './model.utils';


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
    const target = super.asObject(opts);
    if (opts && opts.keepRemoteId === false && target.id >= 0) delete target.id;
    if (opts && opts.keepUpdateDate === false && target.id >= 0) delete target.updateDate;
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(opts) || undefined;
    target.controlDate = toDateISOString(this.controlDate);
    target.qualificationDate = toDateISOString(this.qualificationDate);
    target.qualificationComments = this.qualificationComments || undefined;
    target.qualityFlagId = isNotNil(this.qualityFlagId) ? this.qualityFlagId : undefined;
    return target;
  }

  fromObject(source: any, opts?: FO) {
    super.fromObject(source);
    this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
    this.controlDate = fromDateISOString(source.controlDate);
    this.qualificationDate = fromDateISOString(source.qualificationDate);
    this.qualificationComments = source.qualificationComments;
    this.qualityFlagId = source.qualityFlagId;
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
}
