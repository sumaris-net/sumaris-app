import { Pipe, PipeTransform } from '@angular/core';
import { DenormalizedBatch } from './denormalized-batch.model';
import { isNil, isNotNil } from '@sumaris-net/ngx-components';

@Pipe({
  name: 'denormalizeBatchIsIndividual',
})
export class DenormalizeBatchIsIndividualPipe implements PipeTransform {
  transform(batch: DenormalizedBatch): boolean {
    return (
      batch?.label?.startsWith('SORTING_BATCH_INDIVIDUAL') ||
      (isNotNil(batch.inheritedTaxonGroup) && isNotNil(batch.inheritedTaxonName) && isNil(batch.taxonGroup) && isNil(batch.taxonName))
    );
  }
}
