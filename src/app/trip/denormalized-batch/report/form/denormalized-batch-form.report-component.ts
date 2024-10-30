import { Component, Input, inject } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/component/form/report-chunk.module';
import { ReportComponent } from '@app/data/report/report-component.class';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Operation } from '@app/trip/trip/trip.model';
import { EntityAsObjectOptions, TreeItemEntityUtils, isNotEmptyArray, isNotNil, splitById } from '@sumaris-net/ngx-components';
import { DenormalizedBatch } from '../../denormalized-batch.model';
import { DenormalizedBatchModule } from '../../denormalized-batch.module';
import { DenormalizedBatchService } from '../../denormalized-batch.service';
import { DenormalizedBatchUtils } from '../../denormalized-batch.utils';

export class DenormalizedBatchReportFormComponentStats extends BaseReportStats {
  options: {};
  pmfms: IPmfm[];
  pmfmsByIds: { [key: number]: IPmfm };
  denormalizedBatchByOp: {
    [key: number]: {
      landing?: DenormalizedBatch[];
      discard?: DenormalizedBatch[];
    };
  };
  operationRankOrderByOperationIds: { [key: number]: number };

  fromObject(source: any): void {
    super.fromObject(source);
    this.options = source.options;
    this.pmfms = source.pmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.pmfmsByIds = splitById(this.pmfms);
    this.denormalizedBatchByOp = Object.keys(source.denormalizedBatchByOp).reduce((acc, key) => {
      acc[key] = {
        landing: source.denormalizedBatchByOp[key]?.landing.map(DenormalizedBatch.fromObject),
        discard: source.denormalizedBatchByOp[key]?.discard.map(DenormalizedBatch.fromObject),
      };
      return acc;
    }, {});
    this.operationRankOrderByOperationIds = source.operationRankOrderByOperationIds;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      options: this.options,
      pmfms: this.pmfms.map((pmfm) => pmfm.asObject(opts)),
      denormalizedBatchByOp: Object.keys(this.denormalizedBatchByOp).reduce((acc, key) => {
        acc[key] = {
          landing: this.denormalizedBatchByOp[key].landing.map((item: any) => item.asObject(opts)),
          discard: this.denormalizedBatchByOp[key].discard.map((item: any) => item.asObject(opts)),
        };
        return acc;
      }, {}),
      operationRankOrderByOperationIds: this.operationRankOrderByOperationIds,
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, AppReferentialModule, AppDataModule, ReportChunkModule, DenormalizedBatchModule],
  selector: 'denormalized-batch-form-report-component',
  templateUrl: './denormalized-batch-form.report-component.html',
  styleUrls: ['./denormalized-batch-form.report-component.scss', '../../../../data/report/base-form-report.scss'],
})
export class DenormalizedBatchFormReportComponent extends ReportComponent<Operation[], DenormalizedBatchReportFormComponentStats> {
  protected readonly denormalizedBatchService: DenormalizedBatchService = inject(DenormalizedBatchService);
  protected readonly programRefService: ProgramRefService = inject(ProgramRefService);

  @Input({ required: true }) tripId: number;

  constructor() {
    super(Array<Operation>, DenormalizedBatchReportFormComponentStats);
  }

  dataAsObject(source: Operation[], opts?: EntityAsObjectOptions) {
    throw new Error('Method not implemented.');
  }

  protected async computeStats(
    data: Operation[],
    _?: IComputeStatsOpts<DenormalizedBatchReportFormComponentStats>
  ): Promise<DenormalizedBatchReportFormComponentStats> {
    let stats = new DenormalizedBatchReportFormComponentStats();

    const strategyId = this.strategy?.id;

    stats.pmfms = isNotNil(strategyId)
      ? [
          ...(await this.programRefService.loadProgramPmfms(this.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
            strategyId,
          })),
          ...(await this.programRefService.loadProgramPmfms(this.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL,
            strategyId,
          })),
        ]
      : [];

    stats.pmfmsByIds = splitById(stats.pmfms);

    stats.operationRankOrderByOperationIds = data.reduce((acc, op) => {
      acc[op.id] = op.rankOrder;
      return acc;
    }, []);

    stats = await this.computeDenormalizedBatchByOp(data, stats);

    return stats;
  }

  private async computeDenormalizedBatchByOp(
    data: Operation[],
    stats: DenormalizedBatchReportFormComponentStats
  ): Promise<DenormalizedBatchReportFormComponentStats> {
    stats.denormalizedBatchByOp = {};

    // Ensures that batches be denormalized for this trip before generate report
    await this.denormalizedBatchService.denormalizeTrip(this.tripId);

    for (const op of data) {
      const denormalizedBatches = (await this.denormalizedBatchService.loadAll(0, 1000, null, null, { operationId: op.id })).data;
      const [catchBatch] = DenormalizedBatchUtils.arrayToTree(denormalizedBatches);

      // Copy sampling batch properties to parent
      const samplingBatches = denormalizedBatches
        .filter((b) => DenormalizedBatchUtils.isSamplingBatch(b))
        .map((b) => {
          const parent = b.parent;
          parent.samplingRatio = b.samplingRatio;
          parent.samplingRatioText = b.samplingRatioText;
          parent.weight = b.weight;
          parent.indirectWeight = b.indirectWeight;
          parent.individualCount = b.individualCount;
          parent.indirectIndividualCount = b.indirectIndividualCount;
          return b;
        });

      // Exclude not visible batches
      const landings = catchBatch && TreeItemEntityUtils.filterRecursively(catchBatch, (b) => b?.isLanding && !samplingBatches.includes(b));
      const discards = catchBatch && TreeItemEntityUtils.filterRecursively(catchBatch, (b) => b?.isDiscard && !samplingBatches.includes(b));

      // Compute tre indent text
      [landings, discards].filter(isNotEmptyArray).forEach((batches) => {
        DenormalizedBatchUtils.filterTreeComponents(batches[0], (b) => !DenormalizedBatchUtils.isSamplingBatch(b));
        DenormalizedBatchUtils.computeTreeIndent(batches[0], [], false, { html: true });
      });

      if (isNotEmptyArray(landings) || isNotEmptyArray(discards))
        stats.denormalizedBatchByOp[op.id] = {
          landing: landings,
          discard: discards,
        };
    }

    return stats;
  }
}
