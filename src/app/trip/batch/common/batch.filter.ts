import { EntityClass, EntityFilter, FilterFn, isNotNil } from '@sumaris-net/ngx-components';
import { Batch } from '@app/trip/batch/common/batch.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementUtils, MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';
import { EntityAsObjectOptions } from '@sumaris-net/ngx-components/src/app/core/services/model/entity.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';

@EntityClass({typename: 'BatchFilterVO'})
export class BatchFilter extends EntityFilter<BatchFilter, Batch> {
  operationId: number = null;
  landingId: number = null;
  measurementValues: MeasurementModelValues | MeasurementFormValues = {};

  static fromObject: (source: any, opts?: any) => BatchFilter;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.operationId = source.operationId;
    this.landingId = source.landingId;
    this.measurementValues = source.measurementValues && { ...source.measurementValues } || MeasurementUtils.toMeasurementValues(source.measurements);
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


export class MeasurementValue extends EntityFilter<BatchFilter, Batch> {
  operationId?: number;
  landingId?: number;


  protected buildFilter(): FilterFn<Batch>[] {
    const filterFns = super.buildFilter();

    if (isNotNil(this.operationId)) {
      filterFns.push(b => b.operationId === this.operationId);
    }

    return filterFns;
  }
}
