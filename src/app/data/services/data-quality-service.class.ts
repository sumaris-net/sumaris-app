import { DataEntity } from './model/data-entity.model';
import { AppErrorWithDetails, FormErrors } from '@sumaris-net/ngx-components';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';
import { IProgressionModel } from '@app/shared/progression/progression.model';
import { Program } from '@app/referential/services/model/program.model';

export interface IProgressionOptions {
  // Progression
  progression?: IProgressionModel;
  maxProgression?: number;
}

export interface IDataEntityQualityService<T extends DataEntity<T, ID>, ID = number, CO extends IProgressionOptions = IProgressionOptions> {
  canUserWrite(data: T, opts?: any): boolean;
  control(data: T, opts?: CO): Promise<AppErrorWithDetails | FormErrors>;
  qualify(data: T, qualityFlagId: number): Promise<T>;
}

const DataQualityServiceFnName: (keyof IDataEntityQualityService<any>)[] = ['canUserWrite', 'control', 'qualify'];
export function isDataQualityService(object: any): object is IDataEntityQualityService<any> {
  return (
    (object && DataQualityServiceFnName.filter((fnName) => typeof object[fnName] === 'function').length === DataQualityServiceFnName.length) || false
  );
}

export interface IRootDataTerminateOptions {
  program?: Program;
  withChildren?: boolean; // false by default
}
export interface IRootDataValidateOptions {
  program?: Program;
  withChildren?: boolean; // false by default
}

export interface IRootDataEntityQualityService<
  T extends RootDataEntity<T, ID>,
  ID = number,
  CO extends IProgressionOptions = IProgressionOptions,
  TO extends IRootDataTerminateOptions = IRootDataTerminateOptions,
  VO extends IRootDataValidateOptions = IRootDataValidateOptions,
> extends IDataEntityQualityService<T, ID, CO> {
  terminate(data: T, opts?: TO): Promise<T>;
  validate(data: T, opts?: VO): Promise<T>;
  unvalidate(data: T, opts?: VO): Promise<T>;
}

const RootDataQualityServiceFnName: (keyof IRootDataEntityQualityService<any>)[] = [
  ...DataQualityServiceFnName,
  'terminate',
  'validate',
  'unvalidate',
];
export function isRootDataQualityService(object: any): object is IRootDataEntityQualityService<any> {
  return (
    (object &&
      RootDataQualityServiceFnName.filter((fnName) => typeof object[fnName] === 'function').length === RootDataQualityServiceFnName.length) ||
    false
  );
}
