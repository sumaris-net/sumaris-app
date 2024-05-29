import { Pipe, PipeTransform } from '@angular/core';
import { DenormalizedBatch } from './denormalized-batch.model';

@Pipe({
  name: 'denormalizeBatchIsIndividual',
})
export class DenormalizeBatchIsIndividualPipe implements PipeTransform {
  transform(batch: DenormalizedBatch): boolean {
    return batch.label.startsWith('SORTING_BATCH_INDIVIDUAL');
  }
}
