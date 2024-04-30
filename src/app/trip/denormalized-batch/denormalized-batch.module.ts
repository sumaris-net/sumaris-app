import { NgModule } from '@angular/core';
import {
  DenormalizeBatchIsIndividualPipe,
  DenormalizeBatchSamplingChildOrSelfPipe,
  DenormalizedBatchGetTreeIndentComponentsPipe,
} from './denormalized-batch.pipe';

@NgModule({
  declarations: [DenormalizedBatchGetTreeIndentComponentsPipe, DenormalizeBatchSamplingChildOrSelfPipe, DenormalizeBatchIsIndividualPipe],
  exports: [DenormalizedBatchGetTreeIndentComponentsPipe, DenormalizeBatchSamplingChildOrSelfPipe, DenormalizeBatchIsIndividualPipe],
})
export class DenormalizedBatchModule {}
