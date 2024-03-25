import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { BaseTripReport, BaseTripReportStats } from '../base-trip.report';
import { OnboardExtractionData } from './onboard-trip-report.model';
import { OnboardTripReportService } from './onboard-trip-report.service';
import { TripReportService } from '../trip-report.service';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { isNotNil } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';

export class OnboardTripReportStats extends BaseTripReportStats {
  gearPmfms: DenormalizedPmfmStrategy[];
}

@Component({
  selector: 'app-onboard-trip-report',
  templateUrl: './onboard-trip.report.html',
  styleUrls: ['../trip.report.scss', './onboard-trip.report.scss', '../../../../data/report/base-report.scss'],
  providers: [{ provide: TripReportService, useClass: OnboardTripReportService }],
  encapsulation: ViewEncapsulation.None,
})
export class OnboardTripReport extends BaseTripReport<OnboardExtractionData, OnboardTripReportStats> {
  constructor(injector: Injector, onboardReportService: TripReportService<OnboardExtractionData>) {
    super(injector, onboardReportService, OnboardTripReportStats);
  }

  protected async computeStats(data: OnboardExtractionData, opts?: IComputeStatsOpts<OnboardTripReportStats>): Promise<OnboardTripReportStats> {
    const stats = await super.computeStats(data, opts);
    const programLabel = (data.TR || []).map((t) => t.project).find(isNotNil);
    stats.program = stats.programLabel && (await this.programRefService.loadByLabel(stats.programLabel));
    stats.gearPmfms = await this.programRefService.loadProgramPmfms(programLabel, {
      acquisitionLevels: [AcquisitionLevelCodes.PHYSICAL_GEAR, AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR],
    });
    return stats;
  }

  protected computeSlidesOptions(data: OnboardExtractionData, stats: OnboardTripReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      // width: 960,
      // height: 1385,
      width: 210 * 4,
      height: 297 * 4,
      center: false,
    };
  }

  // Skip : no map on the remport
  async showMap() {}
}
