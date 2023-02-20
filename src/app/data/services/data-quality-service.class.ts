import { DataEntity } from './model/data-entity.model';
import { AppErrorWithDetails, FormErrors } from '@sumaris-net/ngx-components';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';
import { BehaviorSubject } from 'rxjs';

export interface IProgressionOptions {
  // Progression
  progression?: BehaviorSubject<number>;
  maxProgression?: number;
  cancelled?: BehaviorSubject<boolean>;
}

export interface IDataEntityQualityService<
  T extends DataEntity<T, ID>,
  ID = number,
  CO extends IProgressionOptions = IProgressionOptions> {

  canUserWrite(data: T, opts?: any): boolean;
  control(data: T, opts?: CO): Promise<AppErrorWithDetails|FormErrors>;
  qualify(data: T, qualityFlagId: number): Promise<T>;

}
const DataQualityServiceFnName: (keyof IDataEntityQualityService<any>)[] = ['canUserWrite', 'control', 'qualify'];
export function isDataQualityService(object: any): object is IDataEntityQualityService<any> {
  return object && DataQualityServiceFnName.filter(fnName => (typeof object[fnName] === 'function'))
    .length === DataQualityServiceFnName.length || false;
}

export interface IRootDataEntityQualityService<
  T extends RootDataEntity<T, ID>,
  ID = number,
  O = any> extends IDataEntityQualityService<T, ID, O> {

  terminate(data: T): Promise<T>;
  validate(data: T): Promise<T>;
  unvalidate(data: T): Promise<T>;
}

const RootDataQualityServiceFnName: (keyof IRootDataEntityQualityService<any>)[] = [...DataQualityServiceFnName, 'terminate', 'validate', 'unvalidate'];
export function isRootDataQualityService(object: any): object is IRootDataEntityQualityService<any> {
  return object && RootDataQualityServiceFnName.filter(fnName => (typeof object[fnName] === 'function'))
    .length === RootDataQualityServiceFnName.length || false;
}

