import { Component, Input } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { DenormalizedBatch } from '@app/trip/denormalized-batch/denormalized-batch.model';
import { DenormalizedBatchModule } from '@app/trip/denormalized-batch/denormalized-batch.module';

@Component({
  standalone: true,
  imports: [AppCoreModule, AppDataModule, AppReferentialModule, AppSharedReportModule, DenormalizedBatchModule],
  selector: 'app-form-batch-report-chunk',
  templateUrl: './form-batch.report-chunk.html',
  styleUrls: ['../../../../data/report/base-form-report.scss'],
})
export class FormBatchReportChunk {
  @Input({ required: true }) isFirstBatchesChunk: boolean;
  @Input({ required: true }) isLastBatchesChunk: boolean;
  @Input({ required: true }) batches: DenormalizedBatch[];
  @Input({ required: true }) pmfmsByIds: { [key: number]: IPmfm };
  @Input({ required: true }) opRankOrder: number;
  @Input() pnrTotalWeight: number;
  @Input() pnrSamplingWeight: number;
}
