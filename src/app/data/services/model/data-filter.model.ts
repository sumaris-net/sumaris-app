import {
  Department,
  EntityAsObjectOptions,
  EntityFilter,
  FilterFn,
  ReferentialUtils,
  isNil,
  isNotEmptyArray,
  isNotNil,
} from '@sumaris-net/ngx-components';
import { DataEntity } from './data-entity.model';
import { DataQualityStatusIdType } from '@app/data/services/model/model.utils';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

export abstract class DataEntityFilter<
  T extends DataEntityFilter<T, E, EID, AO, FO>,
  E extends DataEntity<E, EID> = DataEntity<any, any>,
  EID = number,
  AO extends EntityAsObjectOptions = EntityAsObjectOptions,
  FO = any,
> extends EntityFilter<T, E, EID, AO, FO> {
  recorderDepartment: Department;
  qualityFlagId?: number;
  dataQualityStatus?: DataQualityStatusIdType;

  fromObject(source: any, opts?: FO) {
    super.fromObject(source, opts);
    this.recorderDepartment =
      Department.fromObject(source.recorderDepartment) ||
      (isNotNil(source.recorderDepartmentId) && Department.fromObject({ id: source.recorderDepartmentId })) ||
      undefined;
    this.dataQualityStatus = source.dataQualityStatus;
    this.qualityFlagId = source.qualityFlagId;
  }

  asObject(opts?: AO): any {
    const target = super.asObject(opts);
    if (opts && opts.minify) {
      target.recorderDepartmentId = this.recorderDepartment && isNotNil(this.recorderDepartment.id) ? this.recorderDepartment.id : undefined;
      delete target.recorderDepartment;
      delete target.recorderDepartments;
      target.qualityFlagIds = isNotNil(this.qualityFlagId) ? [this.qualityFlagId] : undefined;
      delete target.qualityFlagId;
      target.dataQualityStatus = (this.dataQualityStatus && [this.dataQualityStatus]) || undefined;

      // If filter on NOT qualified data, remove quality flag
      if (
        Array.isArray(target.dataQualityStatus) &&
        target.dataQualityStatus.length &&
        !target.dataQualityStatus.includes(<DataQualityStatusIdType>'QUALIFIED')
      ) {
        delete target.qualityFlagIds;
      }
    } else {
      target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject({ ...opts, ...NOT_MINIFY_OPTIONS });
      target.dataQualityStatus = this.dataQualityStatus;
    }
    return target;
  }

  buildFilter(): FilterFn<E>[] {
    const filterFns = super.buildFilter();

    // Department
    if (this.recorderDepartment) {
      const recorderDepartmentId = this.recorderDepartment.id;
      if (isNotNil(recorderDepartmentId)) {
        filterFns.push((t) => t.recorderDepartment && t.recorderDepartment.id === recorderDepartmentId);
      }
    }

    // Quality flag
    if (isNotNil(this.qualityFlagId)) {
      const qualityFlagId = this.qualityFlagId;
      filterFns.push((t) => isNotNil(t.qualityFlagId) && t.qualityFlagId === qualityFlagId);
    }

    // Quality status
    if (isNotNil(this.dataQualityStatus)) {
      switch (this.dataQualityStatus) {
        case 'MODIFIED':
          filterFns.push((t) => isNil(t.controlDate));
          break;
        case 'CONTROLLED':
          filterFns.push((t) => isNotNil(t.controlDate));
          break;
        case 'VALIDATED':
          // Must be done in sub-classes (see RootDataEntity)
          break;
        case 'QUALIFIED':
          filterFns.push(
            (t) =>
              isNotNil(t.qualityFlagId) &&
              t.qualityFlagId !== QualityFlagIds.NOT_QUALIFIED &&
              // Exclude incomplete OPE (e.g. filage)
              t.qualityFlagId !== QualityFlagIds.NOT_COMPLETED
          );
          break;
      }
    }

    return filterFns;
  }
}
