import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { FormTripReportService } from './form-trip-report.service';
import { TripReportService } from '../trip-report.service';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { TripService } from '../../trip.service';
import { Operation, Trip } from '../../trip.model';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ReferentialRef } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';

export class FormTripReportStats extends BaseReportStats {
  // gearPmfms: DenormalizedPmfmStrategy[];
  subtitle?: string;
  footerText?: string;
  logoHeadLeftUrl?: string;
  logoHeadRightUrl?: string;
  saleTypes?: string[];
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
  protected readonly isBlankFormParam = 'blank-form';
  protected isBlankForm: boolean;
  protected readonly nbOfOpOnBalankPage = 9;
  protected readonly maxLinePeerTable = 9;

  protected readonly tripService: TripService;
  protected readonly referentialRefService: ReferentialRefService;

  constructor(injector: Injector) {
    super(injector, Trip, FormTripReportStats);
    this.tripService = injector.get(TripService);
    this.referentialRefService = injector.get(ReferentialRefService);

    this.isBlankForm = new URLSearchParams(window.location.search).has(this.isBlankFormParam);
  }

  protected async loadData(id: number, opts?: any): Promise<Trip> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: Trip;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      const realData = await this.tripService.load(id, { ...opts, withOperation: false });
      data = Trip.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
        operations: Array(this.nbOfOpOnBalankPage)
          .fill(null)
          .reduce((acc, _, idx) => {
            const op = Operation.fromObject({ id: idx + 1 });
            acc.push(op);
            return acc;
          }, []),
      });
    } else {
      data = await this.tripService.load(id, { ...opts, withOperation: true });
    }
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

    stats.subtitle = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_SUBTITLE);
    stats.footerText = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_FOOTER);
    stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_LEFT_URL);
    stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_RIGHT_URL);
    stats.saleTypes = (await this.referentialRefService.loadAll(0, 1000, null, null, { entityName: 'SaleType' })).data // .data.filter(i => i.name != 'Other').map(i => i.label);
      .map((i) => i.label);

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

  protected(data: Trip, stats: FormTripReportStats): URL {
    // TODO Solve path in parrent fuction
    if (this.uuid) return new URL(`${this.baseHref}/${this.computeShareBasePath()}?uuid=${this.uuid}`);
    else return new URL(window.location.origin + this.computeDefaultBackHref(data, stats) + '/report/form');
  }
}
