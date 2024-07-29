import { Component, Injector } from '@angular/core';
import { BaseReportStats, IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { ObservedLocation } from '../../observed-location.model';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { ObservedLocationService } from '../../observed-location.service';
import { Program } from '@app/referential/services/model/program.model';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';

export class FormObservedLocationReportStats extends BaseReportStats {}

@Component({
  selector: 'app-form-observed-location',
  templateUrl: './form-observed-location.report.html',
  styleUrls: ['./form-observed-location.report.css'],
})
export class FormObservedLocationReport extends AppDataEntityReport<ObservedLocation, number, FormObservedLocationReportStats> {
  protected logPrefix = 'form-observed-location-report';
  protected isBlankForm: boolean;

  protected readonly observedLocationService: ObservedLocationService;

  constructor(injector: Injector) {
    super(injector, ObservedLocation, FormObservedLocationReportStats);
    this.observedLocationService = injector.get(ObservedLocationService);
  }

  protected async loadData(id: number, opts?: any): Promise<ObservedLocation> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: ObservedLocation;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      const realData = await this.observedLocationService.load(id, { ...opts });
      data = ObservedLocation.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
        // operations: new Array(this.nbOfOpOnBlankPage).fill(null).map((_, index) => Operation.fromObject({ rankOrder: index + 1 })),
      });
    } else {
      data = await this.observedLocationService.load(id, { ...opts, withOperation: true });
    }
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
  }

  protected computeSlidesOptions(data: ObservedLocation, stats: FormObservedLocationReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: 210 * 4,
      height: 297 * 4,
      center: false,
    };
  }

  protected async computeStats(
    data: ObservedLocation,
    opts?: IComputeStatsOpts<FormObservedLocationReportStats>
  ): Promise<FormObservedLocationReportStats> {
    const stats = new FormObservedLocationReportStats();
    return stats;
  }

  protected async computeTitle(data: ObservedLocation, stats: FormObservedLocationReportStats): Promise<string> {
    return this.translate.instant('OBSERVED_LOCATION.REPORT.FORM.TITLE');
  }

  protected computeDefaultBackHref(data: ObservedLocation, stats: FormObservedLocationReportStats): string {
    return `/observations/${data.id}`;
  }

  protected computeShareBasePath(): string {
    return 'observations/report/form';
  }

  protected computeI18nContext(stats: FormObservedLocationReportStats): IReportI18nContext {
    return {
      ...super.computeI18nContext(stats),
      pmfmPrefix: 'OBSERVED_LOCATION.REPORT.FORM.PMFM.',
    };
  }
}
