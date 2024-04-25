import { Pipe, PipeTransform } from '@angular/core';
import { DenormalizedBatch } from './denormalized-batch.model';
import { BatchUtils } from '../batch/common/batch.utils';
import { Batch } from '../batch/common/batch.model';

export type DenormalizedTreeIndentComponent = 'trunc' | 'leaf' | 'final-leaf' | 'blank';

@Pipe({
  name: 'denormalizedBatchGetTreeIndentComponents',
})
export class DenormalizedBatchGetTreeIndentComponentsPipe implements PipeTransform {
  protected logPrefix = '[formatTreeIndent]';
  transform(treeIndentPattern: string): DenormalizedTreeIndentComponent[] {
    const result = [];
    while (treeIndentPattern.length > 0) {
      if (treeIndentPattern.slice(0, 3) === '  |' && treeIndentPattern[3] === ' ') {
        treeIndentPattern = treeIndentPattern.slice(3, treeIndentPattern.length);
        result.push('trunc');
      } else if (treeIndentPattern.slice(0, 2) === '|-') {
        treeIndentPattern = treeIndentPattern.slice(2, treeIndentPattern.length);
        result.push('leaf');
      } else if (treeIndentPattern.slice(0, 2) === '|_') {
        treeIndentPattern = treeIndentPattern.slice(2, treeIndentPattern.length);
        result.push('final-leaf');
      } else if (treeIndentPattern.slice(0, 2) === '  ') {
        treeIndentPattern = treeIndentPattern.slice(2, treeIndentPattern.length);
        result.push('blank');
      } else {
        console.warn(`${this.logPrefix} mal formed treeIndentPattern : "${treeIndentPattern}"`);
        break;
      }
    }
    return result;
  }
}

@Pipe({
  name: 'denormalizeBatchSamplingChildOrSelf',
})
export class DenormalizeBatchSamplingChildOrSelfPipe implements PipeTransform {
  transform(batch: DenormalizedBatch, candidates: DenormalizedBatch[]): DenormalizedBatch {
    return candidates.find((candidate) => batch.label + '.%' === candidate.label) || batch;
  }
}

@Pipe({
  name: 'denormalizeBatchIsIndividual',
})
export class DenormalizeBatchIsIndividualPipe implements PipeTransform {
  transform(batch: DenormalizedBatch): boolean {
    return batch.label.startsWith('SORTING_BATCH_INDIVIDUAL');
  }
}
