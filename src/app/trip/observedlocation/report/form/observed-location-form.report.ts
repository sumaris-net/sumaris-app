import { Component, inject } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { DataStrategyResolution, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { BASE_REPORT, BaseReportStats, IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { FormReportPageDimensions } from '@app/data/report/common-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { IPmfm, Pmfm } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { environment } from '@environments/environment';
import { EntityAsObjectOptions, isEmptyArray, isNotNil, splitById, splitByProperty } from '@sumaris-net/ngx-components';
import { ReportChunkModule } from '../../../../data/report/form/report-chunk.module';
import { LandingFormReportComponent } from '../../../landing/report/form/landing-form.report-component';
import { ObservedLocationService } from '../../observed-location.service';
import { ObservedLocationFormReportComponent } from './observed-location-form.report-component';
import { LandingService, LandingServiceLoadOptions } from '@app/trip/landing/landing.service';
import { SaleService } from '@app/trip/sale/sale.service';
import { Sale } from '@app/trip/sale/sale.model';
import { Landing } from '@app/trip/landing/landing.model';

export class ObservedLocationFormReportStats extends BaseReportStats {
  options: {
    colorPrimary: string;
    colorSecondary: string;
    displayAttributes: {
      location: string[];
      taxonGroup: string[];
    };
    urlHeaderLogoLeft: string;
    urlHeaderLogoRight: string;
    maxTipsToGoAppendix: number;
    landingTableDividerPmfmId: number;
  };
  fieldsValues: {
    hasPets?: boolean;
  };
  strategy: Strategy;
  pmfms: {
    observedLocation: IPmfm[];
    landing: IPmfm[];
    sortingBatch: IPmfm[];
  };
  pmfmsByIds: {
    observedLocation: { [key: number]: IPmfm };
    landing: { [key: number]: IPmfm };
    sortingBatch: { [key: number]: IPmfm };
  };
  sales: Sale[];
  landingTableDividerPmfm: IPmfm;

  fromObject(source: any) {
    super.fromObject(source);
    this.options = source.options;
    this.strategy = Strategy.fromObject(source.strategy);
    this.fieldsValues = source.fieldsValues;
    this.pmfms = {
      observedLocation: (source?.pmfms?.observedLocation || {}).map(Pmfm.fromObject),
      landing: (source?.pmfms?.landing || {}).map(Pmfm.fromObject),
      sortingBatch: (source?.pmfms?.sortingBatch || {}).map(Pmfm.fromObject),
    };
    this.pmfmsByIds = {
      observedLocation: splitById(this.pmfms.observedLocation),
      landing: splitById(this.pmfms.landing),
      sortingBatch: splitById(this.pmfms.sortingBatch),
    };
    this.sales = source.sales.map(Sale.fromObject);
    this.landingTableDividerPmfm = this.pmfmsByIds.landing?.[this.options.landingTableDividerPmfmId];
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      options: this.options,
      strategy: this.strategy.asObject(opts),
      fieldsValues: this.fieldsValues,
      pmfms: {
        observedLocation: this.pmfms.observedLocation.map((pmfm) => pmfm.asObject(opts)),
        landing: this.pmfms.landing.map((pmfm) => pmfm.asObject(opts)),
        sortingBatch: this.pmfms.sortingBatch.map((pmfm) => pmfm.asObject(opts)),
      },
      sales: this.sales.map((sale) => sale.asObject(opts)),
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, ReportChunkModule, ObservedLocationFormReportComponent, LandingFormReportComponent],
  selector: 'observed-location-form-report',
  templateUrl: './observed-location-form.report.html',
  styleUrls: ['../../../../data/report/base-report.scss', './observed-location-form.report.scss'],
  providers: [{ provide: BASE_REPORT, useExisting: ObservedLocationFormReport }],
})
export class ObservedLocationFormReport extends AppDataEntityReport<ObservedLocation, number, ObservedLocationFormReportStats> {
  protected logPrefix = '[observed-location-form-report]';

  protected readonly observedLocationService = inject(ObservedLocationService);
  protected readonly landingService = inject(LandingService);
  protected readonly saleService = inject(SaleService);
  protected readonly strategyRefService: StrategyRefService = inject(StrategyRefService);

  constructor() {
    super(ObservedLocation, ObservedLocationFormReportStats);

    this.isBlankForm = this.route.snapshot.data?.isBlankForm;
    this.debug = !environment.production;
  }

  computeTitle(data: ObservedLocation, stats: ObservedLocationFormReportStats) {
    return this.translate.instant('OBSERVED_LOCATION.REPORT.FORM.TITLE');
  }

  computeDefaultBackHref(data: ObservedLocation, stats: ObservedLocationFormReportStats) {
    return `/observations/${data.id}`;
  }

  computeShareBasePath() {
    return '/observations/report/form';
  }

  computePrintHref(data: ObservedLocation, stats: ObservedLocationFormReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    return new URL(
      window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + `/report/${this.isBlankForm ? 'blank-' : ''}form/`
    );
  }

  protected async loadData(id: number, opts?: any): Promise<ObservedLocation> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: ObservedLocation;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      const realData = await this.observedLocationService.load(id, { ...opts, withLanding: false });
      data = ObservedLocation.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
        landings: Array(11)
          .fill(null)
          .map((_, index) => Landing.fromObject({ id: (index + 1) * -1 })),
      });
    } else {
      data = await this.observedLocationService.load(id, { ...opts, withLanding: false });
      let loadResult = await this.landingService.loadAllByObservedLocation({ observedLocationId: data.id }, { withSaleIds: true });
      data.landings = loadResult.data;
      while (Object.prototype.hasOwnProperty.call(loadResult, 'fetchMore')) {
        loadResult = await loadResult.fetchMore();
        data.landings.push(...loadResult.data);
      }
    }
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
  }

  protected async computeStats(
    data: ObservedLocation,
    opts?: IComputeStatsOpts<ObservedLocationFormReportStats>
  ): Promise<ObservedLocationFormReportStats> {
    const stats = new ObservedLocationFormReportStats();

    stats.program = await this.programRefService.loadByLabel(data.program.label);
    stats.strategy = await this.loadStrategy(stats.program, data);
    const strategyId = stats.strategy?.id;

    stats.options = {
      colorPrimary: stats.program.getProperty(ProgramProperties.DATA_REPORT_COLOR_PRIMARY) || 'var(--ion-color-primary)',
      colorSecondary: stats.program.getProperty(ProgramProperties.DATA_REPORT_COLOR_SECONDARY) || 'var(--ion-color-secondary)',
      displayAttributes: {
        location: this.settings.getFieldDisplayAttributes('location'),
        taxonGroup: this.settings.getFieldDisplayAttributes('taxonGroup'),
      },
      urlHeaderLogoLeft: stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_HEADER_LEFT_LOGO_URL),
      urlHeaderLogoRight: stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_HEADER_RIGHT_LOGO_URL),
      maxTipsToGoAppendix: stats.program.getPropertyAsInt(ProgramProperties.REPORT_FORM_BLANK_TIPS_MAX_TO_GO_APPENDIX),
      landingTableDividerPmfmId: stats.program.getPropertyAsInt(ProgramProperties.LANDING_ROWS_DIVIDER_PMFM_ID),
    };

    stats.pmfms = {
      observedLocation: isNotNil(strategyId)
        ? await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION,
            strategyId,
          })
        : [],
      landing: isNotNil(strategyId)
        ? await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.LANDING,
            strategyId,
          })
        : [],
      sortingBatch: isNotNil(strategyId)
        ? await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
            strategyId,
          })
        : [],
    };

    stats.pmfmsByIds = {
      observedLocation: splitById(stats.pmfms.observedLocation),
      landing: splitById(stats.pmfms.landing),
      sortingBatch: splitById(stats.pmfms.sortingBatch),
    };

    stats.landingTableDividerPmfm = stats.pmfmsByIds.landing?.[stats.options.landingTableDividerPmfmId];

    stats.fieldsValues = {};
    if (!this.isBlankForm) {
      const measurementFormValues = MeasurementValuesUtils.normalizeValuesToForm(data.measurementValues, stats.pmfms.observedLocation);
      stats.fieldsValues = {
        hasPets: MeasurementValuesUtils.hasPmfmValue(measurementFormValues, PmfmIds.HAS_PETS, true),
      };
    }

    stats.sales = await this.getSalesByLandings(data.landings);

    console.debug('MYTEST observedLocationReport data/stats', { data, stats });
    return stats;
  }

  protected async loadStrategy(program: Program, data: ObservedLocation) {
    const strategyResolution = program.getProperty<DataStrategyResolution>(ProgramProperties.DATA_STRATEGY_RESOLUTION);
    switch (strategyResolution) {
      case DataStrategyResolutions.SPATIO_TEMPORAL:
        return this.strategyRefService.loadByFilter({
          programId: program.id,
          acquisitionLevels: [AcquisitionLevelCodes.OBSERVED_LOCATION],
          startDate: data.startDateTime,
          location: data.location,
        });
      case DataStrategyResolutions.NONE:
        return null;
      case DataStrategyResolutions.LAST:
        return this.strategyRefService.loadByFilter({
          programId: program.id,
          acquisitionLevels: [AcquisitionLevelCodes.OBSERVED_LOCATION],
        });
      // TODO : DataStrategyResolutionsUSER_SELECT
    }
  }

  protected computeI18nContext(stats: ObservedLocationFormReportStats): IReportI18nContext {
    return {
      ...super.computeI18nContext(stats),
      // FIXME
      //pmfmPrefix: 'TRIP.REPORT.FORM.PMFM.',
    };
  }

  protected computeSlidesOptions(data: ObservedLocation, stats: ObservedLocationFormReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: this.pageDimensions.pageWidth,
      height: this.pageDimensions.pageHeight,
      center: false,
    };
  }

  protected computePageDimensions(): FormReportPageDimensions {
    const pageWidth = 210 * 4;
    const pageHeight = 297 * 4;
    const pageHorizontalMargin = 50;
    const availableWidthForTablePortrait = pageWidth - pageHorizontalMargin * 2;
    const availableWidthForTableLandscape = pageHeight - pageHorizontalMargin * 2;
    return {
      pageWidth,
      pageHeight,
      pageHorizontalMargin,
      availableWidthForTableLandscape,
      availableWidthForTablePortrait,
    };
  }

  private async getSalesByLandings(landings: Landing[]): Promise<Sale[]> {
    const result = [];
    for (const landing of landings) {
      if (isEmptyArray(landing.saleIds)) continue;
      if (landing.saleIds.length > 1) {
        console.error(
          `${this.logPrefix} landing "${landing.id} has serval sale. Landing with several is not already supported. Can only take first one."`,
          { saleIds: landing.saleIds }
        );
      }
      // FIXME: This will not be better if we can get sale by ids ?
      //        (need to implement load by ids on pod side)
      // NOTE: For now only one sale by landing is supported,
      //       so only get first available sale id.
      result.push(await this.saleService.load(landing.saleIds[0]));
    }
    return result;
  }
}
