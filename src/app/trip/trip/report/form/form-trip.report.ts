import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { FormTripReportService } from './form-trip-report.service';
import { TripReportService } from '../trip-report.service';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { TripService } from '../../trip.service';
import { Trip } from '../../trip.model';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { TripReport } from '../trip.report';

export class FormTripReportStats extends BaseReportStats {
  // gearPmfms: DenormalizedPmfmStrategy[];
}

@Component({
  selector: 'app-form-trip-report',
  templateUrl: './form-trip.report.html',
  styleUrls: ['../trip.report.scss', './form-trip.report.scss', '../../../../data/report/base-report.scss'],
  providers: [{ provide: TripReportService, useClass: FormTripReportService }],
  encapsulation: ViewEncapsulation.None,
})
export class FormTripReport extends AppDataEntityReport<Trip, number, FormTripReportStats> {
  protected logPrefix = 'trip-form-report';

  protected readonly tripService: TripService;

  constructor(injector: Injector) {
    super(injector, Trip, FormTripReportStats);
    this.tripService = injector.get(TripService);
  }

  protected async loadData(id: number, opts?: any): Promise<Trip> {
    console.log(`[${this.logPrefix}] loadData`);
    const data = await this.tripService.load(id, { ...opts, withOperation: true });
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
  }

  protected computeSlidesOptions(data: Trip, stats: FormTripReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: 210 * 4,
      height: 297 * 4,
      center: false,
    };
  }

  protected async computeStats(data: Trip, opts?: IComputeStatsOpts<FormTripReportStats>): Promise<FormTripReportStats> {
    const stats = new FormTripReportStats();
    stats.program = await this.programRefService.loadByLabel(data.program.label);
    return stats;
  }

  protected async computeTitle(data: Trip, stats: FormTripReportStats): Promise<string> {
    // TODO
    return "DOSSIER D'OBSERVATION EN MER";
  }

  protected computeDefaultBackHref(data: Trip, stats: FormTripReportStats): string {
    return `/trips/${data.id}`;
  }

  protected computeShareBasePath(): string {
    // TODO
    return 'trip/report/form';
  }

  computePrintHref(data: Trip, stats: FormTripReportStats): URL {
    // TODO Solve path in parrent fuction
    if (this.uuid) return new URL(`${this.baseHref}/${this.computeShareBasePath()}?uuid=${this.uuid}`);
    else return new URL(window.location.origin + this.computeDefaultBackHref(data, stats) + '/report/form');
  }
}
