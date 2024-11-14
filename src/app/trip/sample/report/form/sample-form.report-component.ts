import { Component, Input, inject } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/component/form/report-chunk.module';
import { ReportComponent } from '@app/data/report/report-component.class';
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
import { FormTripReportPageDimensions } from '@app/trip/trip/report/form/form-trip.report';

export class SampleFromReportComponentStats extends BaseReportStats {
  options: {
    labelEnabled: boolean;
    taxonNameEnabled: boolean;
    taxonGroupEnabled: boolean;
  };
  samplePmfm: IPmfm[];
  samplePmfmById: { [key: number]: IPmfm };
  releasedPmfm: IPmfm[];
  releasedPmfmById: { [key: number]: IPmfm };
  imagesByOperationId: { [key: number]: ImageAttachment[] };
  individualSample: Sample[];
  releasedSample: Sample[];
  sampleTableParts: number[][];
  releasedTableParts: number[][];

  fromObject(source: any): void {
    super.fromObject(source);
    this.options = source.options;
    this.samplePmfm = source.pmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.samplePmfmById = splitById(this.samplePmfm);
    this.releasedPmfm = source.pmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.releasedPmfmById = splitById(this.samplePmfm);
    this.individualSample = source.individualSample?.map((sample: any) => Sample.fromObject(sample));
    this.releasedSample = source.releasedSample?.map((sample: any) => Sample.fromObject(sample));
    this.imagesByOperationId = Object.keys(source.sampleImagesByOperationIds).reduce((acc, key) => {
      acc[key] = source.sampleImagesByOperationIds[key]?.map(ImageAttachment.fromObject);
      return acc;
    }, {});
    this.sampleTableParts = source.sampleTablePart;
    this.releasedTableParts = source.releasedTableParts;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      options: this.options,
      samplePmfm: this.samplePmfm.map((pmfm) => pmfm.asObject(opts)),
      releasedPmfm: this.releasedPmfm.map((pmfm) => pmfm.asObject(opts)),
      individualSample: this.individualSample?.map((sample) => sample.asObject(opts)),
      releasedSample: this.releasedSample?.map((sample) => sample.asObject(opts)),
      imagesByOperationId: Object.keys(this.imagesByOperationId).reduce((result, key) => {
        result[key] = this.imagesByOperationId[key].map((item: IPmfm) => item.asObject(opts));
        return result;
      }, {}),
      sampleTablePart: this.sampleTableParts,
      releasedTableParts: this.releasedTableParts,
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
  readonly pageDimensions = Object.freeze({
    rankOrderColumnWidth: 30,
    labelColumnWidth: 90,
    pmfmColumnWidth: 90,
    taxonGroupColumnWidth: 140,
    taxonNameColumnWidth: 140,
    commentColumnWidth: 300,
  });

  @Input() samplesByPage = 20;
  @Input({ required: true }) parentPageDimension: FormTripReportPageDimensions;

  protected logPrefix = '[sample-form-report] ';
  protected programRefService: ProgramRefService = inject(ProgramRefService);
  protected readonly releasedTableOptions = Object.freeze({ labelEnabled: false, taxonGroupEnabled: false, taxonNameEnabled: false });

  constructor() {
    super(Array<Operation>, SampleFromReportComponentStats);
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

    stats.samplePmfm = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(this.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
          strategyId,
        })
      : [];
    stats.samplePmfmById = splitById(stats.samplePmfm);
    stats.releasedPmfm = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(this.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.INDIVIDUAL_RELEASE,
          strategyId,
        })
      : [];
    stats.releasedPmfmById = splitById(stats.releasedPmfm);

    stats.sampleTableParts = this.computeTablePart(stats.samplePmfm, stats.options);
    stats.releasedTableParts = this.computeTablePart(stats.releasedPmfm, this.releasedTableOptions);

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

  private computeTablePart(pmfms: IPmfm[], opts: { labelEnabled: boolean; taxonGroupEnabled: boolean; taxonNameEnabled: boolean }): number[][] {
    const firstColumnWidth = opts.labelEnabled ? this.pageDimensions.labelColumnWidth : this.pageDimensions.rankOrderColumnWidth;
    const rightPartWidth =
      firstColumnWidth +
      (opts.taxonGroupEnabled ? this.pageDimensions.taxonGroupColumnWidth : 0) +
      (opts.taxonNameEnabled ? this.pageDimensions.taxonNameColumnWidth : 0);

    const nbPmfmsThatCanFitOnOnePart = Math.trunc(
      (this.parentPageDimension.availableWidthForTableLandscape - rightPartWidth - this.pageDimensions.commentColumnWidth) /
        this.pageDimensions.pmfmColumnWidth
    );

    // If all pmfm column can fit in one page : there is only one table part that contain all pmfms
    if (pmfms.length <= nbPmfmsThatCanFitOnOnePart) return [[0, pmfms.length]];

    const nbPmfmsThatCanFitOnFirstPage = Math.trunc(
      (this.parentPageDimension.availableWidthForTableLandscape - rightPartWidth) / this.pageDimensions.pmfmColumnWidth
    );
    const nbPmfmsThatCanFitOnLastPage = Math.trunc(
      (this.parentPageDimension.availableWidthForTableLandscape - this.pageDimensions.commentColumnWidth) / this.pageDimensions.pmfmColumnWidth
    );

    // If all columns can fit in tow table part : return two table part with all the content
    if (pmfms.length <= nbPmfmsThatCanFitOnFirstPage + nbPmfmsThatCanFitOnLastPage) {
      return [
        [0, nbPmfmsThatCanFitOnFirstPage - 1],
        [nbPmfmsThatCanFitOnFirstPage - 1, pmfms.length],
      ];
    }

    // Else add enough part to display everything
    const remainNbOfPmfms = this.stats.samplePmfm.length - (nbPmfmsThatCanFitOnFirstPage + nbPmfmsThatCanFitOnLastPage);
    const nbOfPmfmThatCanFitOnFullPage = Math.trunc(
      (this.parentPageDimension.availableWidthForTableLandscape - firstColumnWidth) / this.pageDimensions.pmfmColumnWidth
    );
    const result = [[0, nbPmfmsThatCanFitOnFirstPage]];
    for (let i = nbOfPmfmThatCanFitOnFullPage; i <= pmfms.length - remainNbOfPmfms; i += nbOfPmfmThatCanFitOnFullPage) {
      result.push([i, i + nbOfPmfmThatCanFitOnFullPage]);
    }
    // concat add the last part
    return result.concat([result[-1][1], pmfms.length]);
  }
}
