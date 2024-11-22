import { Component, Input, inject } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { FormReportPageDimensions } from '@app/data/report/common-report.class';
import { ReportChunkModule } from '@app/data/report/component/form/report-chunk.module';
import {
  ReportPmfmsTipsByPmfmIds,
  ReportTableComponent,
  ReportTableComponentPageDimension,
  TableHeadPmfmNameReportChunk,
  TableTipsReportChunk,
} from '@app/data/report/report-table-component.class';
import { AppReferentialModule } from '@app/referential/referential.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Operation } from '@app/trip/trip/trip.model';
import { EntityAsObjectOptions, ImageAttachment, isNil, isNotEmptyArray, isNotNil, splitById } from '@sumaris-net/ngx-components';
import { Sample } from '../../sample.model';

interface SampleFormReportComponentPageDimension extends ReportTableComponentPageDimension {
  columnPmfmWidthCompact: number;
  columnPmfmWidth: number;
  columnRankOrderWidth: number;
  columnLabelWidth: number;
  columnTaxonGroupWidth: number;
  columnTaxonNameWidth: number;
  columnCommentWidth: number;
}

export class SampleFromReportComponentStats extends BaseReportStats {
  options: {
    labelEnabled: boolean;
    taxonNameEnabled: boolean;
    taxonGroupEnabled: boolean;
  };
  samplePmfms: IPmfm[];
  samplePmfmsById: { [key: number]: IPmfm };
  releasedPmfms: IPmfm[];
  releasedPmfmsById: { [key: number]: IPmfm };
  imagesByOperationId: { [key: number]: ImageAttachment[] };
  individualSample: Sample[];
  releasedSample: Sample[];
  sampleTableParts: number[][];
  releasedTableParts: number[][];
  samplePmfmsTips: ReportPmfmsTipsByPmfmIds;
  releasedPmfmsTips: ReportPmfmsTipsByPmfmIds;

  fromObject(source: any): void {
    super.fromObject(source);
    this.options = source.options;
    this.samplePmfms = source.samplePmfm.map(DenormalizedPmfmStrategy.fromObject);
    this.samplePmfmsById = splitById(this.samplePmfms);
    this.releasedPmfms = source.releasedPmfm.map(DenormalizedPmfmStrategy.fromObject);
    this.releasedPmfmsById = splitById(this.samplePmfms);
    this.individualSample = source.individualSample?.map((sample: any) => Sample.fromObject(sample));
    this.releasedSample = source.releasedSample?.map((sample: any) => Sample.fromObject(sample));
    this.imagesByOperationId = Object.keys(source.sampleImagesByOperationIds).reduce((acc, key) => {
      acc[key] = source.sampleImagesByOperationIds[key]?.map(ImageAttachment.fromObject);
      return acc;
    }, {});
    this.sampleTableParts = source.sampleTablePart;
    this.releasedTableParts = source.releasedTableParts;
    this.samplePmfmsTips = source.samplePmfmsTips;
    this.releasedPmfmsTips = source.releasedPmfmsTips;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      options: this.options,
      samplePmfm: this.samplePmfms.map((pmfm) => pmfm.asObject(opts)),
      releasedPmfm: this.releasedPmfms.map((pmfm) => pmfm.asObject(opts)),
      individualSample: this.individualSample?.map((sample) => sample.asObject(opts)),
      releasedSample: this.releasedSample?.map((sample) => sample.asObject(opts)),
      imagesByOperationId: Object.keys(this.imagesByOperationId).reduce((result, key) => {
        result[key] = this.imagesByOperationId[key].map((item: IPmfm) => item.asObject(opts));
        return result;
      }, {}),
      sampleTablePart: this.sampleTableParts,
      releasedTableParts: this.releasedTableParts,
      samplePmfmsTips: this.samplePmfmsTips,
      releasedPmfmsTips: this.releasedPmfmsTips,
    };
  }
}

@Component({
  standalone: true,
  imports: [
    AppCoreModule,
    AppSharedReportModule,
    AppReferentialModule,
    AppDataModule,
    ReportChunkModule,
    TableTipsReportChunk,
    TableHeadPmfmNameReportChunk,
  ],
  selector: 'sample-form-report-component',
  templateUrl: './sample-form.report-component.html',
  styleUrls: ['./sample-form.report-component.scss', '../../../../data/report/base-form-report.scss'],
})
export class SampleFormReportComponent extends ReportTableComponent<
  Operation[],
  SampleFromReportComponentStats,
  SampleFormReportComponentPageDimension
> {
  @Input() samplesByPage = 20;
  @Input({ required: true }) parentPageDimension: FormReportPageDimensions;

  protected logPrefix = '[sample-form-report] ';
  protected programRefService: ProgramRefService = inject(ProgramRefService);
  protected readonly releasedTableOptions = Object.freeze({ labelEnabled: false, taxonGroupEnabled: false, taxonNameEnabled: false });

  constructor() {
    super(Array<Operation>, SampleFromReportComponentStats);
  }

  protected computePageDimensions(): SampleFormReportComponentPageDimension {
    return {
      columnPmfmWidth: 90,
      columnPmfmWidthCompact: 30,
      columnRankOrderWidth: 30,
      columnLabelWidth: 90,
      columnTaxonGroupWidth: 140,
      columnTaxonNameWidth: 140,
      columnCommentWidth: 400,
    };
  }

  protected async computeStats(data: Operation[], _?: IComputeStatsOpts<SampleFromReportComponentStats>): Promise<SampleFromReportComponentStats> {
    const stats = new SampleFromReportComponentStats();

    const strategyId = this.strategy?.id;

    // options

    stats.options = {
      labelEnabled: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_LABEL_ENABLE),
      taxonGroupEnabled: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_GROUP_ENABLE),
      taxonNameEnabled: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_NAME_ENABLE),
    };

    // pmfm

    stats.samplePmfms = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(this.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
          strategyId,
        })
      : [];
    stats.samplePmfmsById = splitById(stats.samplePmfms);
    stats.releasedPmfms = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(this.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.INDIVIDUAL_RELEASE,
          strategyId,
        })
      : [];
    stats.releasedPmfmsById = splitById(stats.releasedPmfms);

    const tableLeftColumnsWidth =
      (stats.options.labelEnabled ? this.pageDimensions.columnLabelWidth : this.pageDimensions.columnRankOrderWidth) +
      (stats.options.taxonGroupEnabled ? this.pageDimensions.columnTaxonGroupWidth : 0) +
      (stats.options.taxonNameEnabled ? this.pageDimensions.columnTaxonNameWidth : 0);
    const tableRightColumnsWidth = this.pageDimensions.columnCommentWidth;

    stats.sampleTableParts = this.computeTablePart(
      stats.samplePmfms,
      this.parentPageDimension.availableWidthForTableLandscape,
      tableLeftColumnsWidth,
      tableRightColumnsWidth,
      this.pageDimensions.columnPmfmWidthCompact
    );
    stats.releasedTableParts = this.computeTablePart(
      stats.releasedPmfms,
      this.parentPageDimension.availableWidthForTableLandscape,
      tableLeftColumnsWidth,
      tableRightColumnsWidth,
      this.pageDimensions.columnPmfmWidth
    );

    const samples = data.reduce((result, op) => {
      return result.concat(op.samples);
    }, []);
    stats.individualSample = samples.filter((sample) => isNil(sample.parentId));
    stats.releasedSample = samples.filter((samples) => isNotNil(samples.parentId));
    // Put the parent tagId in the children
    stats.releasedSample.forEach((sample) => {
      const parent = stats.individualSample.find((parent) => parent.id == sample.parentId);
      if (parent) {
        const tagIdMeasure = parent.measurementValues?.[PmfmIds.TAG_ID];
        if (tagIdMeasure) {
          sample.measurementValues[PmfmIds.TAG_ID] = tagIdMeasure;
        }
      }
    });

    stats.samplePmfmsTips = this.computeReportPmfmsTips(stats.sampleTableParts, stats.samplePmfms);
    stats.releasedPmfmsTips = this.computeReportPmfmsTips(stats.releasedTableParts, stats.releasedPmfms);

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
