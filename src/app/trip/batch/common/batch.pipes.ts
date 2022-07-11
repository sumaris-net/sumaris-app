import { Pipe, PipeTransform } from '@angular/core';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { Batch } from '@app/trip/batch/common/batch.model';
import { DEFAULT_MAX_DECIMALS, SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { isNil, toNumber } from '@sumaris-net/ngx-components';
import { roundHalfUp } from '@app/shared/functions';

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

@Pipe({
  name: 'samplingRatioFormat'
})
export class SamplingRatioFormatPipe implements PipeTransform {
  transform(value: number, format?: SamplingRatioFormat, maxDecimals?: number): string {
    if (isNil(value) || !format) return '';
    maxDecimals = toNumber(maxDecimals, 2);
    switch (format) {
      case '%':
        const percent = roundHalfUp(value * 100, maxDecimals)
        return '' + percent + '%̀';
      case '1/w':
        const ratio = roundHalfUp(1 / value, 2);
        return '1/' + ratio;
    }
  }
}
