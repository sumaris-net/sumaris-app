import { SamplingRatioType } from '@app/trip/batch/common/batch.form';
import { Pipe, PipeTransform } from '@angular/core';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { Batch } from '@app/trip/batch/common/batch.model';

@Pipe({
  name: 'isSamplingRatioComputed'
})
export class IsSamplingRatioComputedPipe implements PipeTransform {
  transform(value: Batch | {samplingRatio: number; samplingRatioText: string; } | string, type?: SamplingRatioType): boolean {
    if (!value) return false;
    if (typeof value === 'string') return BatchUtils.isSamplingRatioComputed({samplingRatioText: value, samplingRatio: null}, type);
    return BatchUtils.isSamplingRatioComputed(value, type);
  }
}
