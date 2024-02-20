import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/landing/landing.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { BaseLandingReport, LandingStats } from '@app/trip/landing/report/base-landing-report.class';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { lastValueFrom } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';

@Component({
  selector: 'app-sampling-landing-report',
  styleUrls: ['../../report/landing.report.scss', '../../../../data/report/base-report.scss'],
  templateUrl: './sampling-landing.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SamplingLandingReport extends BaseLandingReport {
  protected referentialRefService: ReferentialRefService;

  constructor(injector: Injector) {
    super(injector, LandingStats, {
      pathParentIdAttribute: 'observedLocationId',
      pathIdAttribute: 'samplingId',
    });

    this.referentialRefService = this.injector.get(ReferentialRefService);
  }

  /* -- protected function -- */

  protected async computeStats(data: Landing, opts?: IComputeStatsOpts<LandingStats>): Promise<LandingStats> {
    const stats = await super.computeStats(data, opts);

    stats.strategyLabel = data.measurementValues[PmfmIds.STRATEGY_LABEL];

    const samplePrefix = `${stats.strategyLabel}-`;
    (data.samples || []).forEach((sample) => {
      const tagId = sample.measurementValues[PmfmIds.TAG_ID];
      if (tagId && tagId.startsWith(samplePrefix)) {
        sample.measurementValues[PmfmIds.TAG_ID] = tagId.substring(samplePrefix.length);
      }
    });

    return stats;
  }

  protected async computeTitle(data: Landing, stats: LandingStats): Promise<string> {
    const titlePrefix = await lastValueFrom(
      this.translate.get('LANDING.TITLE_PREFIX', {
        location: data.location?.name || '',
        date: this.dateFormat.transform(data.dateTime, { time: false }),
      })
    );
    const strategyLabel = this.stats.strategyLabel || data.measurementValues[PmfmIds.STRATEGY_LABEL] || '';
    const title = await lastValueFrom(
      this.translate.get('LANDING.REPORT.SAMPLING.TITLE', {
        vessel: data.vesselSnapshot && (data.vesselSnapshot.registrationCode || data.vesselSnapshot.name),
        strategyLabel,
      })
    );
    return titlePrefix + title;
  }

  protected computeDefaultBackHref(data: Landing, stats?: LandingStats): string {
    return `/observations/${data.observedLocationId}/sampling/${data.id}?tab=1`;
  }

  protected computeShareBasePath(): string {
    return 'observations/report/sampling';
  }

  protected addFakeSamplesForDev(data: Landing, count = 25) {
    if (environment.production) return; // Skip
    super.addFakeSamplesForDev(data, count);
    data.samples.forEach((s, index) => (s.measurementValues[PmfmIds.TAG_ID] = `${index + 1}`));
  }
}
