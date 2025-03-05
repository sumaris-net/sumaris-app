import { Component, Input, ViewEncapsulation, inject } from '@angular/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { AppCoreModule } from '@app/core/core.module';
import { MeasurementFormValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { CommonReportComponentStats, ReportAppendixSection } from '@app/data/report/report-component.class';
import { ReportTableComponent, ReportTableComponentPageDimension } from '@app/data/report/report-table-component.class';
import { RootVesselEntityUtils } from '@app/data/services/model/root-vessel-entity.utils';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { arrayPluck } from '@app/shared/functions';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Sale } from '@app/trip/sale/sale.model';
import {
  EntityAsObjectOptions,
  IReferentialRef,
  ReferentialRef,
  isEmptyArray,
  isNil,
  referentialToString,
  splitById,
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { Landing } from '../../landing.model';

export interface LandingFormReportPageDimension extends ReportTableComponentPageDimension {
  headerHeight: number;
  footerHeight: number;
  fieldsHeight: number;
  rowHeight: number;
}

export class LandingFormReportComponentStats extends CommonReportComponentStats {
  options: {
    footerText: string;
  };
  fieldsValues: {
    totalVesselSampled: number;
    numberOfSampledPrioritySpecies: number;
    hasPets: boolean;
    sizeUnliCatLabelsByLandingId: { [key: number]: string };
  };
  observedSpecies: ReferentialRef[];
  observedSpeciesByIds: { [key: number]: ReferentialRef };
  pagesSlice: { start: number; end: number }[];

  fromObject(source: any) {
    super.fromObject(source);
    this.options = source.options;
    this.fieldsValues = source.fieldsValues;
    this.observedSpecies = source.observedSpecies.map(ReferentialRef.fromObject);
    this.observedSpeciesByIds = splitById(this.observedSpecies);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      options: this.options,
      fieldsValues: this.fieldsValues,
      observedSpecies: this.observedSpecies.map((source) => source.asObject(opts)),
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, AppReferentialPipesModule, ReportChunkModule],
  selector: 'landing-form-report-component',
  templateUrl: './landing-form.report-component.html',
  styleUrls: ['../../../../data/report/base-report.scss', '../../../../data/report/base-form-report.scss', './landing-form.report-component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingFormReportComponent extends ReportTableComponent<Landing[], LandingFormReportComponentStats, LandingFormReportPageDimension> {
  protected readonly nbLinesPeerPage = 12;

  protected readonly referentialRefService = inject(ReferentialRefService);
  protected dateAdapter: MomentDateAdapter = inject(MomentDateAdapter);

  @Input({ required: true }) sales: Sale[];
  @Input({ required: true }) displayAttributesLocation: string[];
  @Input({ required: true }) displayAttributesTaxonGroup: string[];
  @Input({ required: true }) landTripDate: Moment;
  @Input({ required: true }) landTripLocation: IReferentialRef;
  @Input({ required: true }) pmfms: IPmfm[];
  @Input({ required: true }) sortingBatchPmfmsByIds: { [key: number]: IPmfm };
  @Input() displayedColumns: string[] = ['maritimDistrict', 'specie', 'sizeUnliCat', 'comments'];

  constructor() {
    super(Array<Landing>, LandingFormReportComponentStats);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    return []; // There is no appendix blocks
  }

  protected async computeStats(data: Landing[], _?: IComputeStatsOpts<LandingFormReportComponentStats>): Promise<LandingFormReportComponentStats> {
    const stats = new LandingFormReportComponentStats();
    const datePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');
    const observedSpeciesIds = this.computeObservedSpeciesIds(data);
    stats.observedSpecies = await this.referentialRefService.loadAllByIds(observedSpeciesIds, 'TaxonGroup');
    stats.observedSpeciesByIds = splitById(stats.observedSpecies);

    stats.headerItems = [
      this.translate.instant('OBSERVED_LOCATION.REPORT.FORM.LAND_TRIP_PLAN.HEADER.DATE') +
        ' ' +
        (this.isBlankForm ? '.................................' : this.dateAdapter.format(this.landTripDate, datePattern)),
      this.translate.instant('OBSERVED_LOCATION.REPORT.FORM.LAND_TRIP_PLAN.HEADER.LOCATION') +
        ' ' +
        (this.isBlankForm ? '.................................' : referentialToString(this.landTripLocation, this.displayAttributesLocation)),
    ];

    stats.options = {
      footerText: this.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_LAND_TRIP_PLAN_FOOTER_TEXT),
    };

    stats.fieldsValues = {
      totalVesselSampled: RootVesselEntityUtils.getDistinctVessel(data).length,
      numberOfSampledPrioritySpecies: observedSpeciesIds.length,
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

  private computeObservedSpeciesIds(landings: Landing[]): number[] {
    return MeasurementValuesUtils.getDistinctValuesByPmfmId(
      arrayPluck(landings, 'measurementValues', true) as MeasurementFormValues[],
      PmfmIds.TAXON_GROUP_ID
    )
      .filter((v) => typeof v === 'string')
      .map((v: string) => parseInt(v));
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
