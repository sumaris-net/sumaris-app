import {
  EntityAsObjectOptions,
  EntityClass,
  EntityUtils,
  FilterFn,
  fromDateISOString,
  isNotEmptyArray,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
  toDateISOString
} from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { AppliedPeriod, Strategy } from '@app/referential/services/model/strategy.model';
import { Moment } from 'moment';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';

@EntityClass({typename: 'StrategyFilterVO'})
export class StrategyFilter extends BaseReferentialFilter<StrategyFilter, Strategy> {

  static fromObject: (source: any, opts?: any) => StrategyFilter;

  startDate: Moment;
  endDate: Moment;
  department: ReferentialRef;
  location: ReferentialRef;
  taxonName: TaxonNameRef;
  analyticReference: ReferentialRef;

  parameterIds?: number[];
  periods?: any[];
  programId: number;

  fromObject(source: any) {
    super.fromObject(source);
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.department = source.department && ReferentialRef.fromObject(source.department) || undefined;
    this.location = source.location && ReferentialRef.fromObject(source.location) || undefined;
    this.taxonName = source.taxonName && TaxonNameRef.fromObject(source.taxonName) || undefined;
    this.analyticReference = source.analyticReference && ReferentialRef.fromObject(source.analyticReference) || undefined;

    this.parameterIds = source.parameterIds;
    this.periods = source.periods;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);

    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);

    if (opts && opts.minify) {
      target.departmentIds = ReferentialUtils.isNotEmpty(this.department) ? [this.department.id] : undefined;
      target.locationIds = ReferentialUtils.isNotEmpty(this.location) ? [this.location.id] : undefined;
      target.referenceTaxonIds = EntityUtils.isNotEmpty(this.taxonName, 'referenceTaxonId') ? [this.taxonName.referenceTaxonId] : undefined;
      target.analyticReferences = EntityUtils.isNotEmpty(this.analyticReference, 'label') ? [this.analyticReference.label] : undefined;
      delete target.department;
      delete target.location;
      delete target.taxonName;
      delete target.analyticReference;
    }
    else {
      target.department = this.department && this.department.asObject(opts);
      target.location = this.location && this.location.asObject(opts);
      target.taxonName = this.taxonName && this.taxonName.asObject(opts);
      target.analyticReference = this.analyticReference && this.analyticReference.asObject(opts);
    }

    return target;
  }

  buildFilter(): FilterFn<Strategy>[] {
    const levelId = this.levelId;
    const levelIds = this.levelIds;
    const programId = this.programId || levelId || (isNotEmptyArray(levelIds) ? levelIds[0] : null);

    // Remove, to avoid filter on LevelId and levelIds
    this.levelId = null;
    this.levelIds = null;
    const filterFns = super.buildFilter();
    // Restore values
    this.levelId = levelId;
    this.levelIds = levelIds;

    // Filter on program (= level)
    if (isNotNil(programId)) {
      filterFns.push(t => t.programId === programId || t.levelId === programId);
    }

    // Reference taxon
    const referenceTaxonId = this.taxonName?.referenceTaxonId;
    if (isNotNil(referenceTaxonId)) {
      filterFns.push(t => t.taxonNames && t.taxonNames.some(tns => tns.taxonName?.referenceTaxonId === referenceTaxonId));
    }

    // Department
    const departmentId = this.department?.id;
    if (isNotNil(departmentId)) {
      filterFns.push(t => t.departments && t.departments.some(d => d.id === departmentId));
    }

    // Location
    const locationId = this.location?.id;
    if (isNotNil(locationId)) {
      filterFns.push(t => t.appliedStrategies && t.appliedStrategies.some(as => as.location?.id === locationId));
    }

    // Analytic reference
    const analyticReference = this.analyticReference?.label;
    if (isNotNil(analyticReference)) {
      filterFns.push(t => t.analyticReference === analyticReference);
    }

    // Start/end period
    if (this.startDate || this.endDate) {
      const startDate = this.startDate && this.startDate.clone();
      const endDate = this.endDate && this.endDate.clone().add(1, 'day').startOf('day');
      const appliedPeriodTest = (ap: AppliedPeriod) => (
        (!startDate || startDate.isSameOrBefore(ap.endDate)) && (!endDate || endDate.isAfter(ap.startDate))
      );
      filterFns.push(t => t.appliedStrategies && t.appliedStrategies.some(as => as.appliedPeriods && as.appliedPeriods.some(appliedPeriodTest)));
    }

    // TODO: filter on parameters

    return filterFns;
  }
}
