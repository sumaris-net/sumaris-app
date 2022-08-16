import { DataEntity } from './model/data-entity.model';
import { AppErrorWithDetails } from '@sumaris-net/ngx-components';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';

export interface IDataEntityQualityService<
  T extends DataEntity<T, ID>,
  ID = number,
  CO = any> {

  canUserWrite(data: T, opts?: any): boolean;
  control(data: T, opts?: CO): Promise<AppErrorWithDetails>;
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

