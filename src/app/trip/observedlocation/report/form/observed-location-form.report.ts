import { Component, inject } from '@angular/core';
import { DataStrategyResolution, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { BASE_REPORT, BaseReportStats, IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { FormReportPageDimensions } from '@app/data/report/common-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { EntityAsObjectOptions, isNotNil } from '@sumaris-net/ngx-components';
import { ObservedLocationService } from '../../observed-location.service';
import { environment } from '@environments/environment';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppCoreModule } from '@app/core/core.module';
import { ReportChunkModule } from '../../../../data/report/form/report-chunk.module';
import { ObservedLocationFormReportComponent } from './observed-location-form.report-component';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { IDenormalizedPmfm } from '@app/referential/services/model/pmfm.model';

export class ObservedLocationFormReportStats extends BaseReportStats {
  options: {
    colorPrimary: string;
    colorSecondary: string;
    displayAttributesLocation: string[];
  };
  strategy: Strategy;
  pmfms: {
    trip: IDenormalizedPmfm[];
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.options = source.options;
    this.strategy = Strategy.fromObject(source.strategy);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      options: this.options,
      strategy: this.strategy.asObject(opts),
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, ReportChunkModule, ObservedLocationFormReportComponent],
  selector: 'observed-location-form-report',
  templateUrl: './observed-location-form.report.html',
  styleUrls: ['../../../../data/report/base-report.scss', './observed-location-form.report.scss'],
  providers: [{ provide: BASE_REPORT, useExisting: ObservedLocationFormReport }],
})
export class ObservedLocationFormReport extends AppDataEntityReport<ObservedLocation, number, ObservedLocationFormReportStats> {
  protected logPrefix = '[observed-location-form-report]';

  protected observedLocationService: ObservedLocationService = inject(ObservedLocationService);
  protected readonly strategyRefService: StrategyRefService = inject(StrategyRefService);

  constructor() {
    super(ObservedLocation, ObservedLocationFormReportStats);

    this.isBlankForm = this.route.snapshot.data?.isBlankForm;
    this.debug = !environment.production;
  }

  dataAsObject(opts?: EntityAsObjectOptions): any {
    // TODO
    return {};
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
        displayAttributesLocation: this.settings.getFieldDisplayAttributes('location'),
    };

    stats.pmfms = {
      trip: isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(data.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION,
          strategyId,
        })
      : [],
    };

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

  protected async loadData(id: number, opts?: any): Promise<ObservedLocation> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: ObservedLocation;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      const realData = await this.observedLocationService.load(id, { ...opts, withLanding: false });
      data = ObservedLocation.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
        landings: [],
      });
    } else {
      data = await this.observedLocationService.load(id, { ...opts, withLanding: true });
    }
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
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
}
