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
  ReportTips,
  TableHeadPmfmNameReportChunk,
  TipsReportChunk,
} from '@app/data/report/report-table-component.class';
import { AppReferentialModule } from '@app/referential/referential.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IDenormalizedPmfm, IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { arrayPluck } from '@app/shared/functions';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Operation } from '@app/trip/trip/trip.model';
import { EntityAsObjectOptions, ImageAttachment, arrayDistinct, isNil, isNotEmptyArray, isNotNil, splitById } from '@sumaris-net/ngx-components';
import { Sample } from '../../sample.model';

interface SampleFormReportComponentPageDimension extends ReportTableComponentPageDimension {
  columnPmfmWidthCompact: number;
  columnPmfmWidth: number;
  columnRankOrderWidth: number;
  columnNumOpWidth: number;
  columnLabelWidth: number;
  columnTaxonGroupWidth: number;
  columnTaxonNameWidth: number;
  columnCommentWidth: number;
  columnDateWidth: number;
}

export class SampleFromReportComponentStats extends BaseReportStats {
  options: {
    labelEnabled: boolean;
    multiOp: boolean;
    fillRankOrder: boolean;
    showRankOrder: boolean;
    showSampleDateColumn: boolean;
    showOpDateColumn: boolean;
    showQualitativeValuesCheckBox: boolean;
    showTaxonGroupColumn: boolean;
    showTaxonNameColumn: boolean;
    limitTipsToShowOnAnnex: number;
  };
  samplePmfms: IDenormalizedPmfm[];
  samplePmfmsById: { [key: number]: IDenormalizedPmfm };
  releasedPmfms: IDenormalizedPmfm[];
  releasedPmfmsById: { [key: number]: IDenormalizedPmfm };
  imagesByOperationId: { [key: number]: ImageAttachment[] };
  individualSamplePeerOpId: { [key: number]: Sample[] };
  releasedSamplePeerOpId: { [key: number]: Sample[] };
  allIndividualSample?: Sample[];
  allReleasedSample?: Sample[];
  sampleTableParts: number[][];
  releasedTableParts: number[][];
  samplePmfmTipsByPmfmIdByTableParts: ReportPmfmsTipsByPmfmIds[];
  releasedPmfmTipsByPmfmIdByTablePart: ReportPmfmsTipsByPmfmIds[];
  sampleTipsByTablePart: ReportTips[][];
  releasedTipsByTablePart: ReportTips[][];
  pmfmsColumnsWidthByPmfmIds?: { [key: number]: number };
  operationRankOrderByOperationIds?: { [key: number]: number };
  nbIndividualSamplesByPage: number;
  nbReleasedSamplesByPage: number;

  fromObject(source: any): void {
    super.fromObject(source);
    this.options = source.options;
    this.samplePmfms = source.samplePmfm.map(DenormalizedPmfmStrategy.fromObject);
    this.samplePmfmsById = splitById(this.samplePmfms);
    this.releasedPmfms = source.releasedPmfm.map(DenormalizedPmfmStrategy.fromObject);
    this.releasedPmfmsById = splitById(this.samplePmfms);
    this.individualSamplePeerOpId = Object.keys(source.individualSamplePeerOpId || []).reduce((acc, key) => {
      acc[key] = source.individualSamplePeerOpId[key]?.map(Sample.fromObject);
      return acc;
    }, {});
    this.releasedSamplePeerOpId = Object.keys(source.releasedSamplePeerOpId || []).reduce((acc, key) => {
      acc[key] = source.releasedSamplePeerOpId[key]?.map(Sample.fromObject);
      return acc;
    }, {});
    this.allIndividualSample = source.allIndividualSample.map((sample: Sample) => Sample.fromObject(sample));
    this.allReleasedSample = source.allReleasedSample.map((sample: Sample) => Sample.fromObject(sample));
    this.imagesByOperationId = Object.keys(source.sampleImagesByOperationIds).reduce((acc, key) => {
      acc[key] = source.sampleImagesByOperationIds[key]?.map(ImageAttachment.fromObject);
      return acc;
    }, {});
    this.sampleTableParts = source.sampleTablePart;
    this.releasedTableParts = source.releasedTableParts;
    this.samplePmfmTipsByPmfmIdByTableParts = source.samplePmfmTipsByPmfmIdByTableParts;
    this.releasedPmfmTipsByPmfmIdByTablePart = source.releasedPmfmTipsByPmfmIdByTablePart;
    this.pmfmsColumnsWidthByPmfmIds = source.pmfmsColumnsWidthByPmfmIds;
    this.sampleTipsByTablePart = source.sampleTipsByTablePart;
    this.releasedTipsByTablePart = source.releasedTipsByTablePart;
    this.operationRankOrderByOperationIds = source.operationRankOrderByOperationIds;
    this.nbIndividualSamplesByPage = source.individualSamplesByPage;
    this.nbReleasedSamplesByPage = source.releasedSamplesByPage;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      options: this.options,
      samplePmfm: this.samplePmfms.map((pmfm) => pmfm.asObject(opts)),
      releasedPmfm: this.releasedPmfms.map((pmfm) => pmfm.asObject(opts)),
      individualSamplePeerOpId: Object.keys(this.individualSamplePeerOpId).reduce((result, key) => {
        result[key] = this.individualSamplePeerOpId[key].map((item: IPmfm) => item.asObject(opts));
        return result;
      }, {}),
      releasedSample: Object.keys(this.releasedSamplePeerOpId).reduce((result, key) => {
        result[key] = this.releasedSamplePeerOpId[key].map((item: IPmfm) => item.asObject(opts));
        return result;
      }, {}),
      imagesByOperationId: Object.keys(this.imagesByOperationId).reduce((result, key) => {
        result[key] = this.imagesByOperationId[key].map((item: IPmfm) => item.asObject(opts));
        return result;
      }, {}),
      allIndividualSample: this.allIndividualSample.map((sample) => sample.asObject(opts)),
      allReleasedSample: this.allReleasedSample.map((sample) => sample.asObject(opts)),
      sampleTablePart: this.sampleTableParts,
      releasedTableParts: this.releasedTableParts,
      pmfmsColumnsWidthByPmfmIds: this.pmfmsColumnsWidthByPmfmIds,
      samplePmfmTipsByPmfmIdByTableParts: this.samplePmfmTipsByPmfmIdByTableParts,
      releasedPmfmTipsByPmfmIdByTablePart: this.releasedPmfmTipsByPmfmIdByTablePart,
      sampleTipsByTablePart: this.sampleTipsByTablePart,
      releasedTipsByTablePart: this.releasedTipsByTablePart,
      operationRankOrderByOperationIds: this.operationRankOrderByOperationIds,
      nbIndividualSamplesByPage: this.nbIndividualSamplesByPage,
      nbReleasedSamplesByPage: this.nbReleasedSamplesByPage,
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
      columnNumOpWidth: 30,
      columnLabelWidth: 90,
      columnTaxonGroupWidth: 140,
      columnTaxonNameWidth: 140,
      columnCommentWidth: 250,
      columnDateWidth: 90,
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
        fillRankOrder: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_FORM_BLANK_FILL_RANK_ORDER),
        showRankOrder: !this.isBlankForm && !this.program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_FORM_BLANK_SHOW_SAMPLE_RANK_ORDER),
        showSampleDateColumn,
        showOpDateColumn: this.isBlankForm && !showSampleDateColumn && multiOp,
        showTaxonGroupColumn: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_GROUP_ENABLE),
        showTaxonNameColumn: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_NAME_ENABLE),
        showQualitativeValuesCheckBox: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_FORM_BLANK_SHOW_QUALITATIVE_VALUES_CHECK_BOX),
        limitTipsToShowOnAnnex: this.program.getPropertyAsInt(ProgramProperties.TRIP_REPORT_FORM_BLANK_TIPS_LIMIT_TO_SHOW_ON_ANNEX),
      };
    }

    stats.operationRankOrderByOperationIds = data.reduce((result, op) => {
      result[op.id] = op.rankOrder;
      return result;
    }, {});

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

    const allPmfms = arrayDistinct(stats.samplePmfms.concat(stats.releasedPmfms), 'id');
    stats.pmfmsColumnsWidthByPmfmIds = this.computePmfmColumnsWidthByPmfmIds(
      allPmfms,
      !this.isBlankForm,
      stats.options.showQualitativeValuesCheckBox
    );

    const tableLeftColumnsWidth =
      (stats.options.multiOp ? this.pageDimensions.columnNumOpWidth : 0) +
      (stats.options.labelEnabled ? this.pageDimensions.columnLabelWidth : this.pageDimensions.columnRankOrderWidth) +
      (stats.options.showTaxonGroupColumn ? this.pageDimensions.columnTaxonGroupWidth : 0) +
      (stats.options.showTaxonNameColumn ? this.pageDimensions.columnTaxonNameWidth : 0);
    stats.options.showSampleDateColumn || stats.options.showOpDateColumn ? this.pageDimensions.columnDateWidth : 0;
    const tableRightColumnsWidth = this.pageDimensions.columnCommentWidth;

    stats.sampleTableParts = this.computeTablePart(
      stats.samplePmfms,
      stats.pmfmsColumnsWidthByPmfmIds,
      this.parentPageDimension.availableWidthForTableLandscape,
      tableLeftColumnsWidth,
      tableRightColumnsWidth
    );
    stats.releasedTableParts = this.computeTablePart(
      stats.releasedPmfms,
      stats.pmfmsColumnsWidthByPmfmIds,
      this.parentPageDimension.availableWidthForTableLandscape,
      tableLeftColumnsWidth,
      tableRightColumnsWidth
    );

    if (stats.options.multiOp) {
      const allSamples = arrayPluck(data, 'samples').flat() as unknown as Sample[];
      stats.allIndividualSample = allSamples.filter((sample) => isNil(sample.parentId));
      stats.allReleasedSample = allSamples.filter((sample) => isNotNil(sample.parentId));
    } else {
      stats.individualSamplePeerOpId = data.reduce((result, op) => {
        result[op.id] = op.samples.filter((s) => isNil(s.parentId));
        return result;
      }, {});
      stats.releasedSamplePeerOpId = data.reduce((result, op) => {
        result[op.id] = op.samples.filter((s) => isNotNil(s.parentId));
        // Put the parent tagId in the children
        result[op.id].forEach((sample: Sample) => {
          const parent = stats.individualSamplePeerOpId[op.id].find((parent) => parent.id == sample.parentId);
          if (parent) {
            const tagIdMeasure = parent.measurementValues?.[PmfmIds.TAG_ID];
            if (tagIdMeasure) {
              sample.measurementValues[PmfmIds.TAG_ID] = tagIdMeasure;
            }
          }
        });
        return result;
      }, {});
    }

    stats.samplePmfmTipsByPmfmIdByTableParts = this.computeReportPmfmsTips(
      stats.sampleTableParts,
      stats.samplePmfms,
      stats.options.limitTipsToShowOnAnnex
    );
    stats.releasedPmfmTipsByPmfmIdByTablePart = this.computeReportPmfmsTips(
      stats.releasedTableParts,
      stats.releasedPmfms,
      stats.options.limitTipsToShowOnAnnex
    );

    stats.sampleTipsByTablePart = stats.samplePmfmTipsByPmfmIdByTableParts.map((item) => Object.values(item));
    stats.releasedTipsByTablePart = stats.releasedPmfmTipsByPmfmIdByTablePart.map((item) => Object.values(item));

    // show TaxonName column add all taxonName in tips
    if (stats.options.showTaxonNameColumn) {
      stats.sampleTipsByTablePart[0].push(
        this.computeReferentialRefTips(
          '*',
          this.translate.instant('TRIP.SAMPLE.TABLE.TAXON_NAME', this.i18nContext),
          arrayPluck(this.strategy.taxonNames, 'taxonName') as TaxonNameRef[],
          stats.options.limitTipsToShowOnAnnex
        )
      );
    }
    // show TaxonGroup column add all taxonName in tips
    if (stats.options.showTaxonGroupColumn) {
      stats.sampleTipsByTablePart[0].push(
        this.computeReferentialRefTips(
          stats.options.showTaxonNameColumn ? '**' : '*',
          this.translate.instant('TRIP.SAMPLE.TABLE.TAXON_GROUP', this.i18nContext),
          arrayPluck(this.strategy.taxonGroups, 'taxonGroup') as TaxonGroupRef[],
          stats.options.limitTipsToShowOnAnnex
        )
      );
    }

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

    {
      stats.nbIndividualSamplesByPage = 16;
      const maxTipsLength = Math.max(...stats.sampleTipsByTablePart.map((item) => item.length));
      if (maxTipsLength > 0) {
        stats.nbIndividualSamplesByPage -= Math.ceil((maxTipsLength - 1) / 3);
      }
    }
    {
      stats.nbReleasedSamplesByPage = 16;
      const maxTipsLength = Math.max(...stats.releasedTipsByTablePart.map((item) => item.length));
      if (maxTipsLength > 0) {
        stats.nbReleasedSamplesByPage -= Math.ceil((maxTipsLength - 1) / 3);
      }
    }

    return stats;
  }

  protected computePmfmColumnsWidthByPmfmIds(pmfms: IPmfm[], compact: boolean, showQualitativeValuesCheckBox: boolean): { [key: number]: number } {
    if (compact) {
      return pmfms.reduce((result, pmfm) => {
        result[pmfm.id] = this.pageDimensions.columnPmfmWidthCompact;
        return result;
      }, {});
    }
    const result = {};
    for (const pmfm of pmfms) {
      const type = PmfmUtils.getExtendedType(pmfm);
      if (type === 'boolean') {
        // Boolean -> half size
        result[pmfm.id] = this.pageDimensions.columnPmfmWidth / 2;
      } else if (type === 'qualitative_value') {
        if (showQualitativeValuesCheckBox) {
          const nbQualitativeValue = pmfm.qualitativeValues.length;
          result[pmfm.id] = (this.pageDimensions.columnPmfmWidth / 2) * Math.round(nbQualitativeValue / 2);
        } else {
          result[pmfm.id] = this.pageDimensions.columnPmfmWidth;
        }
      } else if (type === 'latitude' || type === 'longitude') {
        result[pmfm.id] = 140;
      } else {
        result[pmfm.id] = this.pageDimensions.columnPmfmWidth;
      }
    }
    return result;
  }

  protected computeTablePart(
    pmfms: IPmfm[],
    columnWidthByPmfmsIds: { [key: number]: number },
    availableWidthForTable: number,
    leftPartWidth: number,
    rightPartWidth: number
  ): number[][] {
    const availableWidthOnePage = availableWidthForTable - rightPartWidth - leftPartWidth;

    // const totalWidthConsumedByAllPmfms = Object.values(columnWidthByPmfmsIds).reduce((total, width) => total + width, 0);
    const totalWidthConsumedByAllPmfms = pmfms.reduce((total, pmfm) => total + columnWidthByPmfmsIds[pmfm.id], 0);

    // If all pmfm column can fit in one page : there is only one table part that contain all pmfms
    if (totalWidthConsumedByAllPmfms <= availableWidthOnePage) return [[0, Object.keys(columnWidthByPmfmsIds).length]];

    const availableWidthOnFirstPage = availableWidthForTable - leftPartWidth;
    const availableWidthOnLastPage = availableWidthForTable - rightPartWidth;

    // If all columns can fit in tow table part : return two table part with all the content
    if (totalWidthConsumedByAllPmfms <= availableWidthOnePage + availableWidthOnLastPage) {
      let nbPmfmsThatCanFitOnFirstPage = 0;
      let widthConsumedOnFirstPage = 0;
      for (const pmfm of pmfms) {
        widthConsumedOnFirstPage += columnWidthByPmfmsIds[pmfm.id];
        if (widthConsumedOnFirstPage > availableWidthOnFirstPage) break;
        nbPmfmsThatCanFitOnFirstPage++;
      }
      return [
        [0, nbPmfmsThatCanFitOnFirstPage - 1],
        [nbPmfmsThatCanFitOnFirstPage - 1, pmfms.length],
      ];
    }

    // Else use middle page
    const availableWidthOnMiddlePage = availableWidthForTable;

    // Compute nbPmfms on the first page
    let nbPmfmsThatCanFitOnFirstPage = 0;
    let widthConsumedOnFirstPage = 0;
    for (const pmfm of pmfms) {
      widthConsumedOnFirstPage += columnWidthByPmfmsIds[pmfm.id];
      if (widthConsumedOnFirstPage > availableWidthOnFirstPage) break;
      nbPmfmsThatCanFitOnFirstPage++;
    }

    const pagePart = [[0, nbPmfmsThatCanFitOnFirstPage - 1]];
    let remainPmfms = pmfms.slice(nbPmfmsThatCanFitOnFirstPage - 1);
    let remainWidth = remainPmfms.reduce((total, pmfm) => total + columnWidthByPmfmsIds[pmfm.id], 0);

    while (remainWidth > availableWidthOnLastPage) {
      let nbPmfmsThatCanFitOnThisPage = 0;
      let widthConsumedByThisPage = 0;
      for (const pmfm of remainPmfms) {
        widthConsumedByThisPage += columnWidthByPmfmsIds[pmfm.id];
        if (widthConsumedByThisPage > availableWidthOnMiddlePage) break;
        remainWidth -= columnWidthByPmfmsIds[pmfm.id];
        nbPmfmsThatCanFitOnThisPage++;
      }
      remainPmfms = remainPmfms.slice(nbPmfmsThatCanFitOnThisPage - 1);
      const currentPagePartNum = pagePart[pagePart.length - 1][1] - 1;
      pagePart.push([currentPagePartNum, currentPagePartNum + nbPmfmsThatCanFitOnFirstPage]);
    }

    // Append last page
    pagePart.push([pagePart[pagePart.length - 1][1]]);

    return pagePart;
  }
}
