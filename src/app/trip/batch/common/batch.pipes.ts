import { Pipe, PipeTransform } from '@angular/core';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { Batch } from '@app/trip/batch/common/batch.model';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';

@Pipe({
  name: 'isSamplingRatioComputed'
})
export class IsSamplingRatioComputedPipe implements PipeTransform {
  transform(value: Batch | {samplingRatio: number; samplingRatioText: string; } | string, format?: SamplingRatioFormat): boolean {
    if (!value) return false;
    if (typeof value === 'string') return BatchUtils.isSamplingRatioComputed(value, format);
    return BatchUtils.isSamplingRatioComputed(value.samplingRatioText, format);
  }
}
