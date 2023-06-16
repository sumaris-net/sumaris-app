import { Pipe, PipeTransform } from '@angular/core';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { Batch } from '@app/trip/batch/common/batch.model';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { IconRef, isNil, toNumber } from '@sumaris-net/ngx-components';
import { roundHalfUp } from '@app/shared/functions';
import { PmfmValue, PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';

@Pipe({
  name: 'isSamplingRatioComputed'
})
export class IsSamplingRatioComputedPipe implements PipeTransform {
  transform(batch: Batch | {samplingRatio: number; samplingRatioText: string; samplingRatioComputed?: boolean; } | string, format?: SamplingRatioFormat): boolean {
    if (!batch) return false;
    if (typeof batch === 'string') return BatchUtils.isSamplingRatioComputed(batch, format);
    return batch.samplingRatioComputed || BatchUtils.isSamplingRatioComputed(batch.samplingRatioText, format);
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

@Pipe({
  name: 'batchSortingValueIcon'
})
export class BatchSortingValueIconPipe implements PipeTransform {
  transform(value: PmfmValue, pmfm: IPmfm): IconRef {
    if (isNil(value) || !pmfm) return undefined;
    switch (pmfm.id) {
      // Discard or landing
      case PmfmIds.DISCARD_OR_LANDING:
        // Landing
        if (PmfmValueUtils.equals(value, QualitativeValueIds.DISCARD_OR_LANDING.LANDING)) {
          return {icon: 'file-tray-stacked'};
        }
        // Discard
        else {
          return {icon: 'remove-circle'};
        }

      // Vrac / Hors vrac
      /*case PmfmIds.BATCH_SORTING:
        // Vrac
        if (PmfmValueUtils.equals(value, QualitativeValueIds.BATCH_SORTING.BULK)) {
          return {icon: 'file-tray-stacked'};
        }
        // Hors vrac
        else {
          return {matIcon: 'playlist_remove'};
        }*/

      // No icon
      default:
        return undefined;
    }
  }
}
