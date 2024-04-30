import { Pipe, PipeTransform } from '@angular/core';
import { DenormalizedBatch } from './denormalized-batch.model';
import { Batch } from '../batch/common/batch.model';
import { isNotNil } from '@sumaris-net/ngx-components';

export type DenormalizedTreeIndentComponent = 'trunc' | 'leaf' | 'final-leaf' | 'blank';

@Pipe({
  name: 'denormalizedBatchGetTreeIndentComponents',
})
export class DenormalizedBatchGetTreeIndentComponentsPipe implements PipeTransform {
  protected logPrefix = '[formatTreeIndent]';
  transform(batch: DenormalizedBatch, opts?: { cleanRootElement?: boolean; cleanSamplingElement?: boolean }): DenormalizedTreeIndentComponent[] {
    const treeLevel = batch.treeLevel;
    let treeIndent = batch.treeIndent || '';
    let result = [];
    while (treeIndent.length > 0) {
      if (treeIndent.slice(0, 3) === '  |' && treeIndent[3] === ' ') {
        treeIndent = treeIndent.slice(3, treeIndent.length);
        result.push('trunc');
      } else if (treeIndent.slice(0, 2) === '|-') {
        treeIndent = treeIndent.slice(2, treeIndent.length);
        result.push('leaf');
      } else if (treeIndent.slice(0, 2) === '|_') {
        treeIndent = treeIndent.slice(2, treeIndent.length);
        result.push('final-leaf');
      } else if (treeIndent.slice(0, 2) === '  ') {
        treeIndent = treeIndent.slice(2, treeIndent.length);
        result.push('blank');
      } else {
        console.warn(`${this.logPrefix} mal formed treeIndentPattern : "${treeIndent}"`);
        break;
      }
    }

    if (isNotNil(treeLevel)) {
      // Remove the tree element added by root
      if (opts?.cleanRootElement && treeLevel > 1) {
        result = result.slice(1);
      }
      if (opts?.cleanSamplingElement) {
        let nbOfParentSamplingElement = batch.label.match(/%/g)?.length || 0;
        result = result.reduce((acc, item) => {
          if (item !== 'blank' || nbOfParentSamplingElement === 0) acc.push(item);
          else nbOfParentSamplingElement--;
          return acc;
        }, []);
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
    return candidates.find((candidate) => batch.label + Batch.SAMPLING_BATCH_SUFFIX === candidate.label) || batch;
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
