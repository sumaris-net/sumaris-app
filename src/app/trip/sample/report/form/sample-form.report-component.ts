import { Component, inject, Input } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import {
  CommonReportComponentStats,
  ReportAppendixSection,
  ReportPmfmsTipsByPmfmIds,
  ReportTips,
  TipsReportChunk,
} from '@app/data/report/report-component.class';
import { ReportTableComponent, ReportTableComponentPageDimension, TableHeadPmfmNameReportChunk } from '@app/data/report/report-table-component.class';
import { AppReferentialModule } from '@app/referential/referential.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IDenormalizedPmfm, IPmfm } from '@app/referential/services/model/pmfm.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { arrayPluck } from '@app/shared/functions';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Operation } from '@app/trip/trip/trip.model';
import { EntityAsObjectOptions, ImageAttachment, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, splitById } from '@sumaris-net/ngx-components';
import { Sample } from '../../sample.model';

interface SampleFormReportComponentPageDimension extends ReportTableComponentPageDimension {
  columnRankOrderWidth: number;
  columnNumOpWidth: number;
  columnLabelWidth: number;
  columnTaxonGroupWidth: number;
  columnTaxonNameWidth: number;
  columnCommentWidth: number;
  columnDateWidth: number;
  columnTripNumberWidth: number;
  columnGearWidth: number;
  columnSpeciesWidth: number;
}

export class SampleFromReportComponentStats extends CommonReportComponentStats {
  options: {
    labelEnabled: boolean;
    multiOp: boolean;
    showRankOrder: boolean;
    showSampleDateColumn: boolean;
    showOpDateColumn: boolean;
    showQualitativeValuesCheckBox: boolean;
    showTaxonGroupColumn: boolean;
    showTaxonNameColumn: boolean;
  };
  samplePmfms: IDenormalizedPmfm[];
  samplePmfmsById: { [key: number]: IDenormalizedPmfm };
  releasedPmfms: IDenormalizedPmfm[];
  releasedPmfmsById: { [key: number]: IDenormalizedPmfm };
  individualSamplePeerOpId: { [key: number]: Sample[] };
  releasedSamplePeerOpId: { [key: number]: Sample[] };
  imagesByOperationId: { [key: number]: ImageAttachment[] };
  sampleTableParts: number[][];
  releasedTableParts: number[][];
  samplePmfmTipsByPmfmIdByTableParts: ReportPmfmsTipsByPmfmIds[];
  releasedPmfmTipsByPmfmIdByTablePart: ReportPmfmsTipsByPmfmIds[];
  samplePmfmsColumnsWidthByPmfmIds?: { [key: number]: number };
  releasedPmfmsColumnsWidthByPmfmIds?: { [key: number]: number };
  sampleTipsByTablePart: ReportTips[][];
  releasedTipsByTablePart: ReportTips[][];
  operationRankOrderByOperationIds?: { [key: number]: number };
  nbIndividualSamplesPeerPage: number;
  nbReleasedSamplesPeerPage: number;
  showSampleCommentColumn: boolean;

  fromObject(source: any): void {
    this.options = source.options;
    this.samplePmfms = source.samplePmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.samplePmfmsById = splitById(this.samplePmfms);
    this.releasedPmfms = source.releasedPmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.releasedPmfmsById = splitById(this.releasedPmfms);
    this.individualSamplePeerOpId = Object.keys(source.individualSamplePeerOpId || []).reduce((acc, key) => {
      acc[key] = source.individualSamplePeerOpId[key]?.map(Sample.fromObject);
      return acc;
    }, {});
    this.releasedSamplePeerOpId = Object.keys(source?.releasedSamplePeerOpId || []).reduce((acc, key) => {
      acc[key] = source.releasedSamplePeerOpId[key]?.map(Sample.fromObject);
      return acc;
    }, {});
    this.imagesByOperationId = Object.keys(source?.imagesByOperationId || []).reduce((acc, key) => {
      acc[key] = source.imagesByOperationId[key]?.map(ImageAttachment.fromObject);
      return acc;
    }, {});
    this.sampleTableParts = source.sampleTableParts;
    this.releasedTableParts = source.releasedTableParts;
    this.samplePmfmTipsByPmfmIdByTableParts = source.samplePmfmTipsByPmfmIdByTableParts;
    this.releasedPmfmTipsByPmfmIdByTablePart = source.releasedPmfmTipsByPmfmIdByTablePart;
    this.samplePmfmsColumnsWidthByPmfmIds = source.samplePmfmsColumnsWidthByPmfmIds;
    this.releasedPmfmsColumnsWidthByPmfmIds = source.releasedPmfmsColumnsWidthByPmfmIds;
    this.sampleTipsByTablePart = source.sampleTipsByTablePart;
    this.releasedTipsByTablePart = source.releasedTipsByTablePart;
    this.operationRankOrderByOperationIds = source.operationRankOrderByOperationIds;
    this.nbIndividualSamplesPeerPage = source.nbIndividualSamplesPeerPage;
    this.nbReleasedSamplesPeerPage = source.nbReleasedSamplesPeerPage;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      options: this.options,
      samplePmfms: this.samplePmfms.map((pmfm) => pmfm.asObject(opts)),
      releasedPmfms: this.releasedPmfms.map((pmfm) => pmfm.asObject(opts)),
      individualSamplePeerOpId: Object.keys(this.individualSamplePeerOpId).reduce((result, key) => {
        result[key] = this.individualSamplePeerOpId[key].map((item: IPmfm) => item.asObject(opts));
        return result;
      }, {}),
      releasedSamplePeerOpId: Object.keys(this.releasedSamplePeerOpId).reduce((result, key) => {
        result[key] = this.releasedSamplePeerOpId[key].map((item: IPmfm) => item.asObject(opts));
        return result;
      }, {}),
      imagesByOperationId: Object.keys(this.imagesByOperationId).reduce((result, key) => {
        result[key] = this.imagesByOperationId[key].map((item: IPmfm) => item.asObject(opts));
        return result;
      }, {}),
      sampleTableParts: this.sampleTableParts,
      releasedTableParts: this.releasedTableParts,
      samplePmfmsColumnsWidthByPmfmIds: this.samplePmfmsColumnsWidthByPmfmIds,
      releasedPmfmsColumnsWidthByPmfmIds: this.releasedPmfmsColumnsWidthByPmfmIds,
      samplePmfmTipsByPmfmIdByTableParts: this.samplePmfmTipsByPmfmIdByTableParts,
      releasedPmfmTipsByPmfmIdByTablePart: this.releasedPmfmTipsByPmfmIdByTablePart,
      sampleTipsByTablePart: this.sampleTipsByTablePart,
      releasedTipsByTablePart: this.releasedTipsByTablePart,
      operationRankOrderByOperationIds: this.operationRankOrderByOperationIds,
      nbIndividualSamplesPeerPage: this.nbIndividualSamplesPeerPage,
      nbReleasedSamplesPeerPage: this.nbReleasedSamplesPeerPage,
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
    TipsReportChunk,
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
  static NB_LINE_PEER_PAGE = 16;

  protected readonly programRefService = inject(ProgramRefService);
  protected readonly releasedTableOptions = Object.freeze({ labelEnabled: false, taxonGroupEnabled: false, taxonNameEnabled: false });

  protected logPrefix = '[sample-form-report] ';

  @Input({ required: true }) multiTrip: boolean;
  @Input() defaultPmfmColumnWidthByPmfmId: { [key: number]: number };

  constructor() {
    super(Array<Operation>, SampleFromReportComponentStats);
  }

  async ngOnStart(opts?: any): Promise<void> {
    // Set defaults
    this.defaultPmfmColumnWidthByPmfmId = this.defaultPmfmColumnWidthByPmfmId ?? {
      [PmfmIds.PINGER_CODE]: 120,
      [PmfmIds.PINGER_ACCESSIBLE]: 40,
    };

    return super.ngOnStart(opts);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    this.checkIfStatsAreComputed();
    return [
      {
        title: this.translate.instant('TRIP.SAMPLE.TABLE.TITLE'),
        blocks: this.flatPmfmTipsForAnnex(this.stats.samplePmfmTipsByPmfmIdByTableParts),
      },
      {
        title: this.translate.instant('TRIP.SAMPLE.TABLE.TAB_INDIVIDUAL_RELEASES'),
        blocks: this.flatPmfmTipsForAnnex(this.stats.releasedPmfmTipsByPmfmIdByTablePart),
      },
    ];
  }

  protected computePageDimensions(): SampleFormReportComponentPageDimension {
    return {
      ...super._computePageDimensions(),
      columnPmfmWidth: this.multiTrip ? 60 : 90,
      columnPmfmBooleanWidth: 30,
      columnPmfmNumberWidth: this.multiTrip ? 45 : 60,
      columnPmfmDateTimeWidth: this.multiTrip ? 90 : 135,
      columnPmfmQualitativeValueWidth: this.multiTrip ? 30 : 45,
      columnPmfmLatLongWidth: this.multiTrip ? 90 : 180,
      columnRankOrderWidth: 30,
      columnNumOpWidth: 30,
      columnLabelWidth: 90,
      columnTaxonGroupWidth: this.multiTrip ? 80 : 140,
      columnTaxonNameWidth: this.multiTrip ? 80 : 140,
      columnCommentWidth: 200,
      columnDateWidth: this.multiTrip ? 90 : 140,
      columnTripNumberWidth: 30,
      columnGearWidth: 40,
      columnSpeciesWidth: 40,
    };
  }

  protected async computeStats(data: Operation[], _?: IComputeStatsOpts<SampleFromReportComponentStats>): Promise<SampleFromReportComponentStats> {
    const stats = new SampleFromReportComponentStats();
    const strategyId = this.strategy?.id;

    // options
    {
      const showSampleDateColumn = this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_DATE_TIME_ENABLE);
      const multiOp = this.program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_FORM_SAMPLE_TABLE_MULTI_OP);
      stats.options = {
        labelEnabled: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_LABEL_ENABLE),
        multiOp,
        showRankOrder: !this.isBlankForm || this.program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_FORM_BLANK_SHOW_SAMPLE_RANK_ORDER),
        showSampleDateColumn,
        showOpDateColumn: this.isBlankForm && !showSampleDateColumn && multiOp,
        showTaxonGroupColumn: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_GROUP_ENABLE),
        showTaxonNameColumn: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_NAME_ENABLE),
        showQualitativeValuesCheckBox: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_FORM_BLANK_SHOW_QUALITATIVE_VALUES_CHECK_BOX),
      };
    }

    stats.operationRankOrderByOperationIds = data.reduce((result, op) => {
      result[op.id] = op.rankOrder;
      return result;
    }, {});

    // pmfm
    stats.samplePmfms = isNotNil(strategyId)
      ? (
          await this.programRefService.loadProgramPmfms(this.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
            strategyId,
          })
        ).filter((pmfm) => !this.hiddenPmfms.includes(pmfm.id))
      : [];
    stats.releasedPmfms = isNotNil(strategyId)
      ? (
          await this.programRefService.loadProgramPmfms(this.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.INDIVIDUAL_RELEASE,
            strategyId,
          })
        ).filter((pmfm) => !this.hiddenPmfms.includes(pmfm.id))
      : [];
    if (this.multiTrip) {
      stats.samplePmfms = stats.samplePmfms.concat(stats.releasedPmfms.filter((pmfm) => pmfm.id != PmfmIds.TAG_ID));
    }
    stats.samplePmfmsById = splitById(stats.samplePmfms);
    stats.releasedPmfmsById = splitById(stats.releasedPmfms);

    stats.samplePmfmsColumnsWidthByPmfmIds = this.computePmfmColumnsWidthByPmfmIds(
      stats.samplePmfms,
      !this.isBlankForm,
      stats.options.showQualitativeValuesCheckBox,
      this.defaultPmfmColumnWidthByPmfmId
    );

    stats.releasedPmfmsColumnsWidthByPmfmIds = this.computePmfmColumnsWidthByPmfmIds(
      stats.releasedPmfms,
      !this.isBlankForm,
      stats.options.showQualitativeValuesCheckBox,
      this.defaultPmfmColumnWidthByPmfmId
    );

    const individualTableLeftColumnsWidth =
      (this.multiTrip ? this.pageDimensions.columnTripNumberWidth : 0) +
      (stats.options.multiOp ? this.pageDimensions.columnNumOpWidth : 0) +
      (stats.options.labelEnabled ? this.pageDimensions.columnLabelWidth : this.pageDimensions.columnRankOrderWidth) +
      (stats.options.showTaxonGroupColumn ? this.pageDimensions.columnTaxonGroupWidth : 0) +
      (stats.options.showTaxonNameColumn ? this.pageDimensions.columnTaxonNameWidth : 0);
    stats.options.showSampleDateColumn || stats.options.showOpDateColumn ? this.pageDimensions.columnDateWidth : 0;
    const releasedTableLeftColumnsWidth =
      (this.multiTrip ? this.pageDimensions.columnTripNumberWidth : 0) + (stats.options.multiOp ? this.pageDimensions.columnNumOpWidth : 0);

    const allPmfmColumnWidth = Object.values(stats.samplePmfmsColumnsWidthByPmfmIds).reduce((result, width) => (result += width), 0);
    stats.showSampleCommentColumn =
      !this.isBlankForm ||
      !this.multiTrip ||
      this.parentPageDimensions.availableWidthForTableLandscape - (individualTableLeftColumnsWidth + allPmfmColumnWidth) >=
        this.pageDimensions.columnCommentWidth;
    const tableRightColumnsWidth = stats.showSampleCommentColumn ? this.pageDimensions.columnCommentWidth : 0;

    stats.sampleTableParts = this.computeTablePart(
      stats.samplePmfms,
      stats.samplePmfmsColumnsWidthByPmfmIds,
      this.parentPageDimensions.availableWidthForTableLandscape,
      individualTableLeftColumnsWidth,
      tableRightColumnsWidth
    );
    stats.releasedTableParts = this.computeTablePart(
      stats.releasedPmfms,
      stats.releasedPmfmsColumnsWidthByPmfmIds,
      this.parentPageDimensions.availableWidthForTableLandscape,
      releasedTableLeftColumnsWidth,
      tableRightColumnsWidth
    );

    stats.samplePmfmTipsByPmfmIdByTableParts = this.computeReportPmfmsTips(stats.sampleTableParts, stats.samplePmfms, this.limitTipsToShowOnAppendix);
    stats.releasedPmfmTipsByPmfmIdByTablePart = this.computeReportPmfmsTips(
      stats.releasedTableParts,
      stats.releasedPmfms,
      this.limitTipsToShowOnAppendix
    );

    stats.sampleTipsByTablePart = stats.samplePmfmTipsByPmfmIdByTableParts.map((item) => Object.values(item));
    stats.releasedTipsByTablePart = stats.releasedPmfmTipsByPmfmIdByTablePart.map((item) => Object.values(item));

    // show TaxonName column add all taxonName in tips
    if (stats.options.showTaxonNameColumn) {
      stats.sampleTipsByTablePart[0].push(
        this.computeReferentialRefTips(
          '*',
          this.translateContext.instant('TRIP.SAMPLE.TABLE.TAXON_NAME', this.i18nContext.suffix),
          arrayPluck(this.strategy.taxonNames, 'taxonName') as TaxonNameRef[],
          this.limitTipsToShowOnAppendix
        )
      );
    }
    // show TaxonGroup column add all taxonName in tips
    if (stats.options.showTaxonGroupColumn) {
      const index = stats.options.showTaxonNameColumn ? '**' : '*';
      const title = this.translateContext.instant('TRIP.SAMPLE.TABLE.TAXON_GROUP', this.i18nContext.suffix);
      // CHeck if help tip exist
      const customTipText = this.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_BLANK_SAMPLE_TAXON_GROUP_HELP);

      if (isNotNilOrBlank(customTipText)) {
        stats.sampleTipsByTablePart[0].push({
          index,
          title,
          text: customTipText,
          showOnAppendix: false,
        });
      } else {
        stats.sampleTipsByTablePart[0].push(
          this.computeReferentialRefTips(
            index,
            title,
            arrayPluck(this.strategy.taxonGroups, 'taxonGroup') as TaxonGroupRef[],
            this.limitTipsToShowOnAppendix
          )
        );
      }
      stats.sampleTipsByTablePart[0].push(
        this.computeReferentialRefTips(
          stats.options.showTaxonNameColumn ? '**' : '*',
          this.translate.instant('TRIP.SAMPLE.TABLE.TAXON_GROUP', this.i18nContext),
          arrayPluck(this.strategy.taxonGroups, 'taxonGroup') as TaxonGroupRef[],
          this.limitTipsToShowOnAppendix
        )
      );
    }

    stats.imagesByOperationId = {};
    if (stats.options.multiOp) {
      stats.imagesByOperationId[0] = arrayPluck(data, 'samples')
        .flat()
        .filter((s: Sample) => isNotEmptyArray(s.images))
        .flatMap((s: Sample) => {
          // Add title to image
          s.images.forEach((image) => {
            image.title = `op[${s.operationId}] - ` + (stats.options.labelEnabled ? s.label : `#${s.rankOrder}`);
          });
          return s.images;
        });
    } else {
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
    }

    {
      stats.nbIndividualSamplesPeerPage = SampleFormReportComponent.NB_LINE_PEER_PAGE - (stats.options.multiOp ? 0 : 1);
      const maxTipsLength = Math.max(...stats.sampleTipsByTablePart.map((item) => item.length));
      if (maxTipsLength > 0) {
        stats.nbIndividualSamplesPeerPage -= Math.ceil((maxTipsLength - 1) / 3);
      }
    }
    {
      stats.nbReleasedSamplesPeerPage = SampleFormReportComponent.NB_LINE_PEER_PAGE - (stats.options.multiOp ? 0 : 1);
      const maxTipsLength = Math.max(...stats.releasedTipsByTablePart.map((item) => item.length));
      if (maxTipsLength > 0) {
        stats.nbReleasedSamplesPeerPage -= Math.ceil((maxTipsLength - 1) / 3);
      }
    }

    if (this.isBlankForm) {
      const nbOfIndividualSamplePage = this.program.getPropertyAsInt(ProgramProperties.TRIP_REPORT_FORM_BLANK_NB_OF_INDIVIDUAL_SAMPLE_PAGE);
      const nbOfReleasedSamplePage = this.program.getPropertyAsInt(ProgramProperties.TRIP_REPORT_FORM_BLANK_NB_OF_RELEASED_SAMPLE_PAGE);
      stats.individualSamplePeerOpId = {
        0: new Array(nbOfIndividualSamplePage * stats.nbIndividualSamplesPeerPage).fill(null).map((_, index: number) =>
          Sample.fromObject({
            operationId: 1,
            rankOrder: index,
          })
        ),
      };
      stats.releasedSamplePeerOpId = {
        0: new Array(nbOfReleasedSamplePage * stats.nbReleasedSamplesPeerPage).fill(null).map((_, index) =>
          Sample.fromObject({
            operationId: 1,
            rankOrder: index + 1,
            parentId: index + 1,
          })
        ),
      };
    } else {
      if (stats.options.multiOp) {
        stats.individualSamplePeerOpId = {
          0: data.reduce((result, op) => {
            result = result.concat(op.samples.filter((sample) => isNil(sample.parentId)));
            return result;
          }, []),
        };
        stats.releasedSamplePeerOpId = {
          0: data.reduce((result, op) => {
            result = result.concat(op.samples.filter((sample) => isNotNil(sample.parentId))).map((sample) => {
              const parentId = sample.parentId;
              const parent = stats.individualSamplePeerOpId[0].find((individualSample) => individualSample.id === parentId);
              sample.measurementValues[PmfmIds.TAG_ID] = parent.measurementValues[PmfmIds.TAG_ID];
              return sample;
            });
            return result;
          }, []),
        };
      } else {
        stats.individualSamplePeerOpId = data.reduce((result, op) => {
          result[op.id] = op.samples.filter((sample) => isNil(sample.parentId));
          return result;
        }, {});
        const allIndividualSamples = Object.values(stats.individualSamplePeerOpId).flat();
        stats.releasedSamplePeerOpId = data.reduce((result, op) => {
          result[op.id] = op.samples
            .filter((sample) => isNotNil(sample.parentId))
            .map((sample) => {
              const parentId = sample.parentId;
              const parent = allIndividualSamples.find((individualSample) => individualSample.id === parentId);
              sample.measurementValues[PmfmIds.TAG_ID] = parent.measurementValues[PmfmIds.TAG_ID];
              return sample;
            });
          return result;
        }, {});
      }
    }

    // header items
    {
      if (this.multiTrip) {
        stats.headerItems = [];
      } else {
        stats.headerItems = [
          this.translate.instant('TRIP.REPORT.FORM.TRIP_DEPARTURE_DATE_TIME') +
            this.translate.instant('COMMON.COLON') +
            ' ' +
            (this.isBlankForm ? '...../...../......' : this.departureDateTime),
        ];
      }
      stats.headerItems.push(
        this.translate.instant('TRIP.REPORT.FORM.VESSEL_NAME') +
          this.translate.instant('COMMON.COLON') +
          ' ' +
          (this.isBlankForm ? '.................................' : this.vesselName)
      );
      if (this.multiTrip) {
        stats.headerItems.push(
          this.translate.instant('TRIP.REPORT.VESSEL_EXTERIOR_MARKING') +
            this.translate.instant('COMMON.COLON') +
            ' ' +
            '.................................'
        );
      }
    }

    return stats;
  }
}
