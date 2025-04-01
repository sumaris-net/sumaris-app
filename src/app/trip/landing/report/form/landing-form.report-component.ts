import { Component, Input, ViewEncapsulation, inject } from '@angular/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatTableDataSource } from '@angular/material/table';
import { AppCoreModule } from '@app/core/core.module';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { CommonReportComponentStats, ReportAppendixSection } from '@app/data/report/report-component.class';
import { ReportTableComponent, ReportTableComponentPageDimension, TableHeadPmfmNameReportChunk } from '@app/data/report/report-table-component.class';
import { RootVesselEntityUtils } from '@app/data/services/model/root-vessel-entity.utils';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { PmfmIds, QualitativeValueIds, VesselIds } from '@app/referential/services/model/model.enum';
import { IDenormalizedPmfm } from '@app/referential/services/model/pmfm.model';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Sale } from '@app/trip/sale/sale.model';
import {
  EntityAsObjectOptions,
  IReferentialRef,
  ReferentialRef,
  isEmptyArray,
  isNil,
  isNotNil,
  referentialToString,
  splitById,
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { Landing } from '../../landing.model';
import { LandingUtils } from '../../landing.utils';
import { LandingsTable } from '../../landings.table';

export interface LandingFormReportPageDimension extends ReportTableComponentPageDimension {
  headerHeight: number;
  footerHeight: number;
  fieldsHeight: number;
  rowHeight: number;
}

export class LandingFormReportComponentStats extends CommonReportComponentStats {
  fieldsValues: {
    totalVesselSampled: number;
    numberOfSampledPrioritySpecies: number;
    hasPets: boolean;
    sizeUnliCatLabelsByLandingId: { [key: number]: string };
  };
  pagesSlice: { start: number; end: number }[];

  fromObject(source: any) {
    super.fromObject(source);
    this.fieldsValues = source.fieldsValues;
    this.pagesSlice = source.pageSlice;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      fieldsValues: this.fieldsValues,
      pageSlice: this.pagesSlice,
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, AppReferentialPipesModule, ReportChunkModule, TableHeadPmfmNameReportChunk],
  selector: 'landing-form-report-component',
  templateUrl: './landing-form.report-component.html',
  styleUrls: ['../../../../data/report/base-report.scss', '../../../../data/report/base-form-report.scss', './landing-form.report-component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingFormReportComponent extends ReportTableComponent<Landing[], LandingFormReportComponentStats, LandingFormReportPageDimension> {
  readonly randomLandingsRankOrderOffset = LandingsTable.RANDOM_LANDINGS_RANK_ORDER_OFFSET;
  protected readonly nbLinesPeerPage = 12;

  protected dateAdapter: MomentDateAdapter = inject(MomentDateAdapter);
  protected pages: MatTableDataSource<Landing>[];
  protected displayedColumns: string[];

  @Input({ required: true }) displayAttributesLocation: string[];
  @Input({ required: true }) displayAttributesTaxonGroup: string[];
  @Input({ required: true }) landTripDate: Moment;
  @Input({ required: true }) landTripLocation: IReferentialRef;
  @Input({ required: true }) pmfms: IDenormalizedPmfm[];
  @Input({ required: true }) sales: Sale[];
  @Input({ required: true }) sortingBatchPmfmsByIds: { [key: number]: IDenormalizedPmfm };
  @Input({ required: true }) dividerPmfm: IDenormalizedPmfm;
  @Input({ required: true }) observedSpeciesByIds: { [key: number]: ReferentialRef };
  @Input({ required: true }) footerText: string;

  constructor() {
    super(Array<Landing>, LandingFormReportComponentStats);
  }

  async ngOnStart(opts?: any): Promise<void> {
    await super.ngOnStart(opts);
    this.displayedColumns = this.computeDisplayedColumns();
    this.pages = this.computePagesRows(this.data);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    return []; // There is no appendix blocks
  }

  protected async computeStats(data: Landing[], _?: IComputeStatsOpts<LandingFormReportComponentStats>): Promise<LandingFormReportComponentStats> {
    const stats = new LandingFormReportComponentStats();
    const datePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');

    stats.headerItems = [
      this.translate.instant('OBSERVED_LOCATION.REPORT.FORM.LAND_TRIP_PLAN.HEADER.DATE') +
        ' ' +
        (this.isBlankForm ? '.................................' : this.dateAdapter.format(this.landTripDate, datePattern)),
      this.translate.instant('OBSERVED_LOCATION.REPORT.FORM.LAND_TRIP_PLAN.HEADER.LOCATION') +
        ' ' +
        (this.isBlankForm ? '.................................' : referentialToString(this.landTripLocation, this.displayAttributesLocation)),
    ];

    stats.fieldsValues = {
      totalVesselSampled: RootVesselEntityUtils.getDistinctVessel(data).length,
      numberOfSampledPrioritySpecies: Object.keys(this.observedSpeciesByIds).length,
      hasPets: this.computeHasPets(data),
      sizeUnliCatLabelsByLandingId: this.computeSizeUnliCatLabelsByLandingId(this.sales),
    };

    stats.pagesSlice = this.computePageSlice(data.length);
    return stats;
  }

  protected computePageDimensions(): LandingFormReportPageDimension {
    return {
      ...super._computePageDimensions(),
      headerHeight: 70,
      footerHeight: 20,
      fieldsHeight: 40 + (this.isBlankForm ? 10 : 0),
      rowHeight: 38 + (this.isBlankForm ? 10 : 0),
    };
  }

  protected computeDisplayedColumns(): string[] {
    const pmfmsDisplayedColumns = this.pmfms.map((pmfm) => pmfm.id.toString());
    let result = ['maritimDistrict', 'specie', 'sizeUnliCat', ...pmfmsDisplayedColumns, 'comments'];
    if (!this.isBlankForm) {
      result = ['rankOrder', ...result];
    }
    return result;
  }

  protected isDivider(index: number, landing: Landing): boolean {
    return landing.__typename === 'divider';
  }

  protected isLanding(index: number, landing: Landing): boolean {
    return landing.__typename !== 'divider';
  }

  private computePagesRows(data: Landing[]): MatTableDataSource<Landing>[] {
    const landingWithKnownsVessel = data.filter((landing) => {
      const vesselId = landing?.vesselSnapshot?.id;
      if (vesselId) {
        return vesselId != VesselIds.UNKNOWN;
      }
      return true;
    });
    this.fixRankOrder(data);
    const row = isNotNil(this.dividerPmfm) ? LandingUtils.injectDividerLines(landingWithKnownsVessel, this.dividerPmfm) : landingWithKnownsVessel;
    return this.stats.pagesSlice.map((slice) => new MatTableDataSource(row.slice(slice.start, slice.end)));
  }

  private fixRankOrder(landings: Landing[]) {
    landings.forEach((landing) => {
      const measureSpeciesListOrigin = landing.measurementValues[PmfmIds.SPECIES_LIST_ORIGIN];
      if (measureSpeciesListOrigin && measureSpeciesListOrigin == QualitativeValueIds.SPECIES_LIST_ORIGIN.RANDOM) {
        landing.rankOrder -= this.randomLandingsRankOrderOffset;
      }
    });
  }

  private computeHasPets(landings: Landing[]): boolean {
    const foundHasPets = landings.filter((landing) => {
      const measurementFormValues = MeasurementValuesUtils.normalizeValuesToForm(landing.measurementValues, this.pmfms);
      const value = MeasurementValuesUtils.getFormValue(measurementFormValues, this.pmfms, PmfmIds.SPECIES_LIST_ORIGIN);
      if (value instanceof ReferentialRef) {
        return value.id === QualitativeValueIds.SPECIES_LIST_ORIGIN.PETS;
      }
      return false;
    });
    return foundHasPets.length > 0;
  }

  private computeSizeUnliCatLabelsByLandingId(sales: Sale[]): { [key: number]: string } {
    const result = {};
    const sizeUniCatPmfm = this.sortingBatchPmfmsByIds[PmfmIds.SIZE_UNLI_CAT];
    const qualitativeValuesById = splitById(sizeUniCatPmfm.qualitativeValues);
    for (const sale of sales) {
      if (isNil(sale.landingId)) continue;
      const categories = [];
      if (isNil(sale.catchBatch) || isEmptyArray(sale.catchBatch.children)) continue;
      for (const batch of sale.catchBatch.children) {
        const sizeUnliCatQvId = parseInt(batch.measurementValues?.[PmfmIds.SIZE_UNLI_CAT]);
        if (isNaN(sizeUnliCatQvId)) continue;
        const qvLabel = qualitativeValuesById[sizeUnliCatQvId].label;
        categories.push(qvLabel);
      }
      result[sale.landingId] = categories.join(', ');
    }
    return result;
  }

  private computePageSlice(nbLines: number) {
    const availableSpaceOnThePage =
      this.parentPageDimensions.availableWidthForTablePortrait -
      this.pageDimensions.headerHeight -
      this.pageDimensions.footerHeight -
      this.pageDimensions.rowHeight; // Row for columns title
    const availableSpaceOnFirstPage = availableSpaceOnThePage - this.pageDimensions.fieldsHeight;
    const nbRowOnFirstPage = Math.trunc(availableSpaceOnFirstPage / this.pageDimensions.rowHeight);
    const nbRowOnOtherPage = Math.trunc(availableSpaceOnThePage / this.pageDimensions.rowHeight);
    const result = [{ start: 0, end: nbRowOnFirstPage }];
    for (let i = nbRowOnFirstPage; i < nbLines; i = i + nbRowOnOtherPage) {
      const start = i;
      const end = i + nbRowOnOtherPage;
      result.push({ start, end });
    }
    return result;
  }
}
