import { NgModule } from '@angular/core';
import { DenormalizeBatchIsIndividualPipe } from './denormalized-batch.pipe';

@NgModule({
  declarations: [DenormalizeBatchIsIndividualPipe],
  exports: [DenormalizeBatchIsIndividualPipe],
})
export class DenormalizedBatchModule {}
