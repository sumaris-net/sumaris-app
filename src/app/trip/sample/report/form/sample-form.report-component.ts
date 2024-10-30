import { Component, Input, inject } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/component/form/report-chunk.module';
import { ReportComponent } from '@app/data/report/report-component.class';
import { AppReferentialModule } from '@app/referential/referential.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Operation } from '@app/trip/trip/trip.model';
import { EntityAsObjectOptions, ImageAttachment, isNotEmptyArray, isNotNil, splitById } from '@sumaris-net/ngx-components';

export class SampleFromReportComponentStats extends BaseReportStats {
  options: {
    labelEnabled: boolean;
    taxonNameEnabled: boolean;
    taxonGroupEnabled: boolean;
  };
  pmfms: IPmfm[];
  pmfmsByIds: { [key: number]: IPmfm };
  imagesByOperationId: { [key: number]: ImageAttachment[] };

  fromObject(source: any): void {
    super.fromObject(source);
    this.options = source.options;
    this.pmfms = source.pmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.pmfmsByIds = splitById(this.pmfms);
    this.imagesByOperationId = Object.keys(source.sampleImagesByOperationIds).reduce((acc, key) => {
      acc[key] = source.sampleImagesByOperationIds[key]?.map(ImageAttachment.fromObject);
      return acc;
    }, {});
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      options: this.options,
      pmfms: this.pmfms.map((pmfm) => pmfm.asObject(opts)),
      imagesByOperationId: Object.keys(this.imagesByOperationId).reduce((result, key) => {
        result[key] = this.imagesByOperationId[key].map((item: IPmfm) => item.asObject(opts));
        return result;
      }, {}),
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, AppReferentialModule, AppDataModule, ReportChunkModule],
  selector: 'sample-form-report-component',
  templateUrl: './sample-form.report-component.html',
  styleUrls: ['./sample-form.report-component.scss', '../../../../data/report/base-form-report.scss'],
})
export class SampleFormReportComponent extends ReportComponent<Operation[], SampleFromReportComponentStats> {
  protected logPrefix = '[sample-form-report] ';

  protected programRefService: ProgramRefService = inject(ProgramRefService);
  @Input() samplesByPage = 20;

  constructor() {
    super(Array<Operation>, SampleFromReportComponentStats);
  }

  protected async computeStats(data: Operation[], _?: IComputeStatsOpts<SampleFromReportComponentStats>): Promise<SampleFromReportComponentStats> {
    const stats = new SampleFromReportComponentStats();

    const strategyId = this.strategy?.id;

    stats.options = {
      labelEnabled: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_LABEL_ENABLE),
      taxonGroupEnabled: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_GROUP_ENABLE),
      taxonNameEnabled: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_NAME_ENABLE),
    };

    stats.pmfms = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(this.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
          strategyId,
        })
      : [];

    stats.pmfmsByIds = splitById(stats.pmfms);

    stats.imagesByOperationId = {};
    for (const operation of data || []) {
      stats.imagesByOperationId[operation.id] = (operation.samples || [])
        .filter((s) => isNotEmptyArray(s.images))
        .flatMap((s) => {
          // Add title to image
          s.images.forEach((image) => {
            image.title = stats.options.labelEnabled ? s.label : `#${s.rankOrder}`;
          });
          return s.images;
        });
    }

    return stats;
  }
}
