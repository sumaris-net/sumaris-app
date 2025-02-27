import { booleanAttribute, Component, inject, Input, OnInit } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { MeasurementFormValues, MeasurementUtils } from '@app/data/measurement/measurement.model';
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
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { arrayPluck } from '@app/shared/functions';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Operation } from '@app/trip/trip/trip.model';
import {
  EntityAsObjectOptions,
  isNotNil,
  isNotNilOrBlank,
  LatLongPattern,
  LocalSettingsService,
  removeDuplicatesFromArray,
  splitById,
} from '@sumaris-net/ngx-components';

interface OperationWithChildFormReportComponentPageDimension extends ReportTableComponentPageDimension {
  columnNumOpWidth: number;
  columnIndividualMeasureWidth: number;
  columnTripProgressWidth: number;
  columnGearSpeciesWidth: number;
  columnDateWidth: number;
  columnLatLongWidth: number;
  columnTripNumberWidth: number;
}

export class OperationWithChildFromReportComponentStats extends CommonReportComponentStats {
  options: {
    showFishingStartDate: boolean;
    showFishingEndDate: boolean;
    showEndDate: boolean;
    latLongPattern: LatLongPattern;
    fishingAreaDisplayAttributes: string[];
    enableVesselAssociation: boolean;
    onePosition?: boolean;
    commentsHelpText?: string;
    allowParentOperation?: boolean;
  };
  parentPmfms: IDenormalizedPmfm[];
  pmfmsById: { [key: number]: IPmfm };
  childPmfms: IDenormalizedPmfm[];
  childPmfmsById: { [key: number]: IPmfm };
  tableHeadColspanLeft: number;
  tableHeadColspanParent: number;
  tableHeadColspanChild: number;
  pmfmsTipsByPmfmIdByTableParts: ReportPmfmsTipsByPmfmIds[];
  measurementValues: MeasurementFormValues[];
  tipsByTablePart: ReportTips[][];
  pmfmTablePart: number[][];
  pmfmsColumnWidthByPmfmsIds: { [key: number]: number };
  nbOperationByPage: number;
  dummyOps: Operation[];

  fromObject(source: any): void {
    this.options = source.options;
    this.parentPmfms = source.pmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.pmfmsById = splitById(this.parentPmfms);
    this.childPmfms = source.childPmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.childPmfmsById = splitById(this.childPmfms);
    this.tableHeadColspanLeft = source.tableHeadColspanLeft;
    this.tableHeadColspanChild = source.tableHeadColspanChild;
    this.tableHeadColspanParent = source.tableHeadColspanParent;
    this.pmfmsTipsByPmfmIdByTableParts = source.pmfmsTipsByPmfmIdByTableParts;
    this.measurementValues = source.measurementValues;
    this.tipsByTablePart = source.tipsByTablePart;
    this.pmfmTablePart = source.parentPmfmTablePart;
    this.pmfmsColumnWidthByPmfmsIds = source.pmfmsColumnWidthByPmfmsIds;
    this.nbOperationByPage = source.nbOperationByPage;
    this.dummyOps = source.dummyOps?.map(Operation.fromObject);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      options: this.options,
      pmfms: this.parentPmfms.map((pmfm) => pmfm.asObject(opts)),
      childPmfms: this.childPmfms?.map((pmfm) => pmfm.asObject(opts)),
      tableHeadColspanLeft: this.tableHeadColspanLeft,
      tableHeadColspanChild: this.tableHeadColspanChild,
      tableHeadColspanParent: this.tableHeadColspanParent,
      pmfmsTipsByPmfmIdByTableParts: this.pmfmsTipsByPmfmIdByTableParts,
      measurementValues: this.measurementValues,
      parentPmfmTablePart: this.pmfmTablePart,
      tipsByTablePart: this.tipsByTablePart,
      pmfmsColumnWidthByPmfmsIds: this.pmfmsColumnWidthByPmfmsIds,
      nbOperationByPage: this.nbOperationByPage,
      dummyOps: this.dummyOps?.map((op) => op.asObject(opts)),
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
    TableHeadPmfmNameReportChunk,
    TipsReportChunk,
  ],
  selector: 'operation-with-child-form-report-component',
  templateUrl: './operation-with-child-form.report-component.html',
  styleUrls: ['./operation-form.report-component.scss', '../../../../data/report/base-form-report.scss'],
})
export class OperationWithChildFormReportComponent
  extends ReportTableComponent<Operation[], OperationWithChildFromReportComponentStats, OperationWithChildFormReportComponentPageDimension>
  implements OnInit
{
  public static NB_LINE_PEER_PAGE = 10;

  protected readonly referentialRefService = inject(ReferentialRefService);
  protected readonly programRefService = inject(ProgramRefService);
  protected logPrefix = '[operation-with-child-form-report] ';

  @Input({ required: true }) enablePosition: boolean;
  @Input({ required: true }) cameraUsed: boolean;
  @Input({ required: true }) multiTrip: boolean;
  @Input({ transform: booleanAttribute }) hideComments: boolean = false;
  @Input({ transform: booleanAttribute }) useColumnGearNumber = false;
  @Input() defaultPmfmColumnWidthByPmfmId: { [key: number]: number };

  constructor(protected settings: LocalSettingsService) {
    super(Array<Operation>, OperationWithChildFromReportComponentStats);
  }

  ngOnInit() {
    super.ngOnInit();

    // Set defaults
    this.i18nContext.pmfmPrefix = isNotNilOrBlank(this.i18nContext.pmfmPrefix) ? this.i18nContext.pmfmPrefix : 'TRIP.OPERATION.PMFM.';
  }

  async ngOnStart(opts?: any): Promise<void> {
    // Set defaults
    this.defaultPmfmColumnWidthByPmfmId = this.defaultPmfmColumnWidthByPmfmId ?? {
      [PmfmIds.HAS_ACCIDENTAL_CATCHES]: 40,
    };

    return super.ngOnStart(opts);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    this.checkIfStatsAreComputed();
    return [
      {
        title: this.translate.instant('TRIP.REPORT.FORM.OPERATION.TITLE'),
        blocks: this.flatPmfmTipsForAnnex(this.stats.pmfmsTipsByPmfmIdByTableParts),
      },
    ];
  }

  protected computePageDimensions(): OperationWithChildFormReportComponentPageDimension {
    return {
      ...super._computePageDimensions(),
      columnNumOpWidth: 30,
      columnIndividualMeasureWidth: 30,
      columnTripProgressWidth: 30,
      columnGearSpeciesWidth: 60,
      columnDateWidth: this.cameraUsed ? 160 : 80,
      columnLatLongWidth: 80,
      columnTripNumberWidth: 30,
    };
  }

  protected async computeStats(
    data: Operation[],
    _?: IComputeStatsOpts<OperationWithChildFromReportComponentStats>
  ): Promise<OperationWithChildFromReportComponentStats> {
    const stats = new OperationWithChildFromReportComponentStats();

    const strategyId = this.strategy?.id;

    stats.options = {
      showFishingStartDate: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE),
      showFishingEndDate: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE),
      showEndDate: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE),
      latLongPattern: this.settings.latLongFormat,
      fishingAreaDisplayAttributes: this.settings.getFieldDisplayAttributes('fishingArea', ['label', 'name']),
      enableVesselAssociation: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_ENABLE_VESSEL_ASSOCIATION),
      onePosition: true, // TODO add program option
      commentsHelpText: this.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_OPERATION_COMMENT_HELP_TEXT),
    };

    if (stats.options.onePosition) {
      this.pageDimensions.columnDateWidth += 20;
      this.pageDimensions.columnLatLongWidth += 20;
    }

    stats.nbOperationByPage = OperationWithChildFormReportComponent.NB_LINE_PEER_PAGE;
    // In the case the header will be more hight, so we have less place du display lines

    const parentPmfms = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(this.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.OPERATION,
          strategyId,
        })
      : [];

    stats.parentPmfms = parentPmfms.filter((pmfm) => !this.hiddenPmfms.includes(pmfm.id));

    const childPmfms = isNotNil(strategyId)
      ? (
          await this.programRefService.loadProgramPmfms(this.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.CHILD_OPERATION,
            strategyId,
          })
        ).filter((pmfm) => !this.hiddenPmfms.includes(pmfm.id))
      : [];

    stats.childPmfms = childPmfms.filter((pmfm) => !this.hiddenPmfms.includes(pmfm.id));

    const allPmfms = removeDuplicatesFromArray([...stats.parentPmfms, ...stats.childPmfms], 'id');
    stats.pmfmsById = splitById(allPmfms);

    stats.pmfmsColumnWidthByPmfmsIds = this.computePmfmColumnsWidthByPmfmIds(
      allPmfms,
      true, // FIXME DO we need a NOT compact mode ?
      !this.isBlankForm,
      this.defaultPmfmColumnWidthByPmfmId
    );

    stats.tableHeadColspanLeft = 3 + (this.multiTrip ? 1 : 0);
    stats.tableHeadColspanParent = (this.cameraUsed ? 1 : 2 + (stats.options.showFishingStartDate ? 2 : 0)) + stats.parentPmfms.length;
    stats.tableHeadColspanChild =
      (this.cameraUsed ? 1 : 2 + (stats.options.showFishingEndDate ? 1 : 0) + (stats.options.showEndDate ? 1 : 0)) + stats.childPmfms.length;

    // Get all needed measurement values in suitable format
    stats.measurementValues = data.map((op) => MeasurementUtils.toMeasurementValues(op.measurements));

    // TODO: for now all is in one page, pmfmTablePart is not use in the template
    stats.pmfmTablePart = this.computeTablePart(
      allPmfms,
      stats.pmfmsColumnWidthByPmfmsIds,
      this.parentPageDimensions.availableWidthForTableLandscape,
      this.parentPageDimensions.availableWidthForTableLandscape, // TODO False value : compute it
      0
    );

    stats.pmfmsTipsByPmfmIdByTableParts = this.computeReportPmfmsTips(stats.pmfmTablePart, allPmfms, this.limitTipsToShowOnAppendix);
    stats.tipsByTablePart = stats.pmfmsTipsByPmfmIdByTableParts.map((item) => Object.values(item));
    // FIXME: add an program option to add set this help tip (e.g. 'sumaris.report.form.trip.operation.gear.helpTip')
    if (!this.useColumnGearNumber) {
      stats.tipsByTablePart[0].push({
        index: '*',
        showOnAppendix: false,
        text: this.translate.instant('TRIP.REPORT.FORM.OPERATION.HELP.ONE_STAR'),
      });
    }

    if ((!this.enablePosition || this.isBlankForm) && !this.cameraUsed && this.enablePosition) {
      const fishingAreaLocationLevelIds = this.program.getPropertyAsNumbers(ProgramProperties.TRIP_OPERATION_FISHING_AREA_LOCATION_LEVEL_IDS);
      const locationLevels = await this.referentialRefService.loadAllByIds(fishingAreaLocationLevelIds, 'LocationLevel');
      stats.tipsByTablePart[0].push({
        index: this.useColumnGearNumber ? '*' : '**',
        showOnAppendix: false,
        title: this.translate.instant('TRIP.REPORT.FORM.OPERATION.TABLE.FISHING_AREA'),
        text: `${arrayPluck(locationLevels, 'name').join(', ')}`,
      });
    }
    // For each 4 line in tips remove one operation line in the page to keep
    // the place tu put all tips
    const maxTipsLength = Math.max(...stats.tipsByTablePart.map((item) => item.length));
    if (maxTipsLength > 0) {
      stats.nbOperationByPage -= Math.ceil((maxTipsLength - 1) / 4);
    }

    if (this.isBlankForm) {
      const nbOfOperationPage = this.program.getPropertyAsInt(ProgramProperties.TRIP_REPORT_FORM_BLANK_NB_OF_OPERATION_PAGE);
      stats.dummyOps = new Array(stats.nbOperationByPage * nbOfOperationPage).fill(null).map((_, index) =>
        Operation.fromObject({
          id: index + 1,
          rankOrder: index + 1,
        })
      );
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

  protected markAsLoaded(opts = { emitEvent: true }) {
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected computeTablePart(
    pmfms: IPmfm[],
    columnWidthByPmfmsIds: { [key: number]: number } | null,
    availableWidthForTable: number,
    leftPartWidth: number,
    rightPartWidth: number
  ): number[][] {
    const availableWidthOnePage = availableWidthForTable - rightPartWidth - leftPartWidth;
    const nbPmfmsThatCanFitOnOnePage = Math.trunc(availableWidthOnePage / this.pageDimensions.columnPmfmWidthCompact);

    // If all pmfm column can fit in one page : there is only one table part that contain all pmfms
    if (pmfms.length <= nbPmfmsThatCanFitOnOnePage) return [[0, pmfms.length]];

    const availableWidthOnFirstPage = availableWidthForTable - leftPartWidth;

    const nbPmfmsThatCanFitOnFirstPage = Math.trunc(availableWidthOnFirstPage / this.pageDimensions.columnPmfmWidthCompact);

    return [
      [0, nbPmfmsThatCanFitOnFirstPage - 1],
      [nbPmfmsThatCanFitOnFirstPage - 1, pmfms.length],
    ];
  }
}
