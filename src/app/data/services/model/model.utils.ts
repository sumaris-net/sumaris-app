import { Department, EntityAsObjectOptions, IEntity, isNotNilOrNaN, ITreeItemEntity, Person, Referential, ReferentialRef, StatusIds } from '@sumaris-net/ngx-components';
import {PredefinedColors} from '@ionic/core';
import {QualityFlagIds} from '@app/referential/services/model/model.enum';
import { SynchronizationIonIcon } from '@app/data/quality/entity-quality-icon.component';

/* -- Enumerations -- */

export type SynchronizationStatus = 'DIRTY' | 'READY_TO_SYNC' | 'SYNC' | 'DELETED' | 'TEMPORARY';

export const SynchronizationStatusEnum = Object.freeze({
  DIRTY: <SynchronizationStatus>'DIRTY',
  READY_TO_SYNC: <SynchronizationStatus>'READY_TO_SYNC',
  SYNC: <SynchronizationStatus>'SYNC',
  DELETED: <SynchronizationStatus>'DELETED',
  TEMPORARY: <SynchronizationStatus>'TEMPORARY'
});

export type DataQualityStatusIdType = 'MODIFIED' | 'CONTROLLED' | 'VALIDATED' | 'QUALIFIED';

export const DataQualityStatusIds = Object.freeze({
  MODIFIED: <DataQualityStatusIdType>'MODIFIED',
  CONTROLLED: <DataQualityStatusIdType>'CONTROLLED',
  VALIDATED: <DataQualityStatusIdType>'VALIDATED',
  QUALIFIED: <DataQualityStatusIdType>'QUALIFIED',
})

export declare interface IDataQualityStatus {
  id: DataQualityStatusIdType;
  icon?: string;
  label: string;
}

export const DataQualityStatusEnum = Object.freeze({
  MODIFIED: <IDataQualityStatus>{
    id: DataQualityStatusIds.MODIFIED,
    icon: 'pencil',
    label: 'QUALITY.MODIFIED'
  },
  CONTROLLED: <IDataQualityStatus>{
    id: DataQualityStatusIds.CONTROLLED,
    icon: 'checkmark',
    label: 'QUALITY.CONTROLLED'
  },
  VALIDATED: <IDataQualityStatus>{
    id: DataQualityStatusIds.VALIDATED,
    icon: 'checkmark-circle',
    label: 'QUALITY.VALIDATED'
  },
  QUALIFIED: <IDataQualityStatus>{
    id: DataQualityStatusIds.QUALIFIED,
    icon: 'flag',
    label: 'QUALITY.QUALIFIED'
  }
});

export const DataQualityStatusList = Object.freeze([
  DataQualityStatusEnum.MODIFIED,
  DataQualityStatusEnum.CONTROLLED,
  DataQualityStatusEnum.VALIDATED,
  DataQualityStatusEnum.QUALIFIED
]);


/* -- Interface -- */

export interface IWithRecorderDepartmentEntity<T,
  ID = number,
  AO extends EntityAsObjectOptions = EntityAsObjectOptions,
  FO = any
  >
  extends IEntity<T, ID, AO, FO> {
  recorderDepartment: Department|ReferentialRef|Referential;
}
export interface IWithRecorderPersonEntity<T, ID = number> extends IEntity<T, ID, any> {
  recorderPerson: Person;
}
export interface IWithObserversEntity<T, ID = number> extends IEntity<T, ID, any> {
  observers: Person[];
}
export interface IWithProgramEntity<T, ID = number> extends IEntity<T, ID, any> {
  program: Referential | any;
  recorderPerson?: Person;
  recorderDepartment: Referential | any;
}

/* -- Helper function -- */

export function getMaxRankOrder(values: { rankOrder: number }[]): number {
  let maxRankOrder = 0;
  (values || []).forEach(m => {
    if (m.rankOrder && m.rankOrder > maxRankOrder) maxRankOrder = m.rankOrder;
  });
  return maxRankOrder;
}

export function fillRankOrder(values: { rankOrder: number }[]) {
  if (!values) return; // Skip
  // Compute rankOrder
  let maxRankOrder = getMaxRankOrder(values);
  (values || []).forEach(m => {
    m.rankOrder = m.rankOrder || ++maxRankOrder;
  });
}

export function fillTreeRankOrder(values: (ITreeItemEntity<any> & { rankOrder: number })[]) {
  // Compute rankOrder
  let maxRankOrder = getMaxRankOrder(values);
  (values || []).forEach(m => {
    m.rankOrder = m.rankOrder || ++maxRankOrder;
    if (m.children) fillTreeRankOrder(m.children);
  });
}

/**
 * Compare unique rankOrder from values with values count
 * @param values
 * @return true if all rankOrder are unique
 */
export function isRankOrderValid(values: { rankOrder: number }[]): boolean {
  return (values || []).length ===
    (values || []).filter((v1, i, array) => array.findIndex(v2 => v2.rankOrder === v1.rankOrder) === i).length;
}

export function qualityFlagToColor(qualityFlagId: number): PredefinedColors {
  switch (qualityFlagId) {
    case QualityFlagIds.NOT_QUALIFIED:
      return 'secondary';
    case QualityFlagIds.GOOD:
    case QualityFlagIds.FIXED:
      return 'success';
    case QualityFlagIds.OUT_STATS:
    case QualityFlagIds.DOUBTFUL:
      return 'warning';
    case QualityFlagIds.BAD:
    case QualityFlagIds.MISSING:
    case QualityFlagIds.NOT_COMPLETED:
      return 'danger';
    default:
      return 'secondary';
  }
}

export function qualityFlagInvalid(qualityFlagId: number): boolean {
  switch (qualityFlagId) {
    case QualityFlagIds.BAD:
    case QualityFlagIds.MISSING:
    case QualityFlagIds.NOT_COMPLETED:
      return true;
    default:
      return false;
  }
}

export declare type QualityIonIcon = SynchronizationIonIcon |'checkmark'|'checkmark-circle'|'flag'|'alert'|'alert-circle'|'alert-circle-outline'|'warning';

export function qualityFlagToIcon(qualityFlagId: number): QualityIonIcon {
  switch (qualityFlagId) {
    case QualityFlagIds.NOT_QUALIFIED:
      return undefined;
    case QualityFlagIds.GOOD:
    case QualityFlagIds.FIXED:
      return 'flag';
    case QualityFlagIds.OUT_STATS:
    case QualityFlagIds.DOUBTFUL:
      return 'warning';
    case QualityFlagIds.BAD:
    case QualityFlagIds.MISSING:
      return 'alert-circle';
    case QualityFlagIds.NOT_COMPLETED:
      return 'time-outline';
    default:
      return 'flag';
  }
}

export function statusToColor(statusId: number): PredefinedColors {
  switch (statusId) {
    case StatusIds.ENABLE:
      return 'tertiary';
    case StatusIds.TEMPORARY:
      return 'secondary';
    case StatusIds.DISABLE:
      return 'danger';
    default:
      return 'secondary';
  }
}
