import { Component, inject, Input } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import {
  CommonReportComponentStats,
  ReportAppendixSection,
  ReportPmfmsTipsByPmfmIds,
  ReportTips,
  TipsReportChunk,
} from '@app/data/report/report-component.class';
import { ReportTableComponent, ReportTableComponentPageDimension, TableHeadPmfmNameReportChunk } from '@app/data/report/report-table-component.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { IDenormalizedPmfm } from '@app/referential/services/model/pmfm.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { arrayPluck } from '@app/shared/functions';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { EntityAsObjectOptions, isNotNil, LocalSettingsService, ReferentialRef, splitById } from '@sumaris-net/ngx-components';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { Trip } from '../../trip.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';

interface TripTableFormReportComponentPageDimension extends ReportTableComponentPageDimension {
  columnIdWidth: number;
  columnTripNumberWidth: number;
  columnObserversWidth: number;
  columnLocation: number;
  columnDateTime: number;
  columnCommentWidth: number;
}

export class TripTableFormReportComponentStats extends CommonReportComponentStats {
  options: {
    showObservers: boolean;
    showQualitativeValuesCheckBox: boolean;
  };
  pmfms: IDenormalizedPmfm[];
  pmfmsByIds?: { [key: number]: IDenormalizedPmfm };
  pmfmsColumnsWidthByPmfmIds?: { [key: number]: number };
  tableParts: number[][];
  tipsByPmfmIdByTablePart: ReportPmfmsTipsByPmfmIds[];
  tipsByTablePart: ReportTips[][];
  nbLinesPeerPage: number;
  locationLevels: ReferentialRef[];

  fromObject(source: any) {
    this.options = source.options;
    this.pmfms = source.pmfms?.map(DenormalizedPmfmStrategy.fromObject);
    this.pmfmsByIds = splitById(this.pmfms);
    this.pmfmsColumnsWidthByPmfmIds = source.pmfmsColumnsWidthByPmfmIds;
    this.tableParts = source.tableParts;
    this.tipsByPmfmIdByTablePart = source.tipsByTablePart;
    this.tipsByTablePart = source.tipsByTablePart;
    this.locationLevels = source.locationLevels.map((ref: any) => ReferentialRef.fromObject(ref));
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      options: this.options,
      pmfms: this.pmfms.map((item) => item.asObject(opts)),
      pmfmsColumnsWidthByPmfmIds: this.pmfmsColumnsWidthByPmfmIds,
      tablePart: this.tableParts,
      tipsByPmfmIdByTablePart: this.tipsByPmfmIdByTablePart,
      tipsByTablePart: this.tipsByTablePart,
      locationLevels: this.locationLevels.map((ref) => ref.asObject(opts)),
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, TipsReportChunk, TableHeadPmfmNameReportChunk, AppReferentialPipesModule, ReportChunkModule],
  selector: 'trip-table-form-report-component',
  templateUrl: './trip-table-from.report-component.html',
  styleUrls: ['../../../../data/report/base-form-report.scss'],
})
export class TripTableFromReportComponent extends ReportTableComponent<
  Trip[],
  TripTableFormReportComponentStats,
  TripTableFormReportComponentPageDimension
> {
  public static NB_LINE_PEER_PAGE = 9;

  @Input() footerText: string;

  protected readonly settings = inject(LocalSettingsService);
  protected readonly referentialRefService = inject(ReferentialRefService);

  constructor() {
    super(Array<Trip>, TripTableFormReportComponentStats);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    this.checkIfStatsAreComputed();
    return [
      {
        title: this.translate.instant('TRIP.REPORT.FORM.TRIP.TITLE'),
        blocks: this.flatPmfmTipsForAnnex(this.stats.tipsByPmfmIdByTablePart),
      },
    ];
  }

  protected computePageDimensions(): TripTableFormReportComponentPageDimension {
    return {
      ...this._computePageDimensions(),
      columnIdWidth: 30,
      columnTripNumberWidth: 30,
      columnObserversWidth: 10,
      columnDateTime: 120,
      columnLocation: 240,
      columnCommentWidth: 250,
      columnPmfmWidth: 90,
      columnPmfmWidthCompact: 30,
    };
  }

  protected async computeStats(data: Trip[], _?: IComputeStatsOpts<TripTableFormReportComponentStats>): Promise<TripTableFormReportComponentStats> {
    const stats = new TripTableFormReportComponentStats();

    stats.options = {
      showObservers: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE),
      showQualitativeValuesCheckBox: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_FORM_BLANK_SHOW_QUALITATIVE_VALUES_CHECK_BOX),
    };

    stats.nbLinesPeerPage = TripTableFromReportComponent.NB_LINE_PEER_PAGE;

    // Compute stats PMFM
    stats.pmfms = isNotNil(this.strategy.id)
      ? (
          await this.programRefService.loadProgramPmfms(this.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.TRIP,
            strategyId: this.strategy.id,
          })
        ).filter((pmfm) => !this.hiddenPmfms.includes(pmfm.id))
      : [];
    stats.pmfmsByIds = splitById(stats.pmfms);

    stats.pmfmsColumnsWidthByPmfmIds = this.computePmfmColumnsWidthByPmfmIds(
      stats.pmfms,
      !this.isBlankForm,
      stats.options.showQualitativeValuesCheckBox
    );

    const tableLeftColumnsWidth =
      (stats.options.showObservers ? this.pageDimensions.columnObserversWidth : 0) +
      this.pageDimensions.columnLocation * 2 +
      this.pageDimensions.columnDateTime * 2;
    const tableRightColumnsWidth = this.pageDimensions.columnCommentWidth;

    stats.tableParts = this.computeTablePart(
      stats.pmfms,
      stats.pmfmsColumnsWidthByPmfmIds,
      this.parentPageDimensions.availableWidthForTableLandscape,
      tableLeftColumnsWidth,
      tableRightColumnsWidth
    );

    stats.tipsByPmfmIdByTablePart = this.computeReportPmfmsTips(stats.tableParts, stats.pmfms, this.limitTipsToShowOnAppendix);
    stats.tipsByTablePart = stats.tipsByPmfmIdByTablePart.map((item) => Object.values(item));

    // trip location level
    {
      const locationLevelIds = this.program.getPropertyAsNumbers(ProgramProperties.TRIP_LOCATION_LEVEL_IDS);
      stats.locationLevels = await this.referentialRefService.loadAllByIds(locationLevelIds, 'LocationLevel');
      if (stats.locationLevels.length > 1) {
        stats.tipsByTablePart[0].push({
          index: '*',
          showOnAppendix: false,
          title: this.translate.instant('TRIP.REPORT.FORM.TRIP.LOCATION_LEVEL') + this.translate.instant('COMMON.COLON'),
          text: `${this.translate.instant('REFERENTIAL.EXPERTISE_AREA.LOCATION_LEVEL')}${this.translate.instant('COMMON.COLON')} ${arrayPluck(stats.locationLevels, 'name').join(', ')}`,
        });
      }
    }

    // header items
    {
      stats.headerItems = [
        this.translate.instant('TRIP.REPORT.FORM.VESSEL_NAME') + this.translate.instant('COMMON.COLON') + ' ' + '.................................',
        this.translate.instant('TRIP.REPORT.VESSEL_EXTERIOR_MARKING') +
          this.translate.instant('COMMON.COLON') +
          ' ' +
          '.................................',
      ];
    }

    return stats;
  }
}
