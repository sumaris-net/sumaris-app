import {EntityAsObjectOptions, EntityClass, EntityFilter, FilterFn, isNotNil, toNumber} from '@sumaris-net/ngx-components';
import {Batch} from '@app/trip/batch/common/batch.model';
import {MeasurementFormValues, MeasurementModelValues, MeasurementUtils, MeasurementValuesUtils} from '@app/trip/services/model/measurement.model';
import {PmfmValueUtils} from '@app/referential/services/model/pmfm-value.model';

@EntityClass({typename: 'BatchFilterVO'})
export class BatchFilter extends EntityFilter<BatchFilter, Batch> {
  operationId: number = null;
  parentId: number = null;
  measurementValues: MeasurementModelValues | MeasurementFormValues = {};
  landingId: number = null; // not used yet

  static fromObject: (source: any, opts?: any) => BatchFilter;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.operationId = source.operationId;
    this.parentId = source.parentId;
    this.measurementValues = source.measurementValues && { ...source.measurementValues } || MeasurementUtils.toMeasurementValues(source.measurements);
    this.landingId = source.landingId;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
    return target;
  }

  protected buildFilter(): FilterFn<Batch>[] {
    const filterFns = super.buildFilter();

    if (isNotNil(this.operationId)) {
      filterFns.push(b => b.operationId === this.operationId);
    }

    if (isNotNil(this.landingId)) {
      filterFns.push(b => b.landingId === this.landingId);
    }

    if (isNotNil(this.parentId)) {
      filterFns.push(b => toNumber(b.parent?.id, b.parentId) === this.parentId);
    }

    if (isNotNil(this.measurementValues)) {
      Object.keys(this.measurementValues).forEach(pmfmId => {
        const pmfmValue = this.measurementValues[pmfmId];
        if (isNotNil(pmfmValue)) {
          filterFns.push(b => isNotNil(b.measurementValues[pmfmId]) && PmfmValueUtils.equals(b.measurementValues[pmfmId], pmfmValue));
        }
      })

    }

    return filterFns;
  }
}
