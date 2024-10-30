import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { Landing } from '@app/trip/landing/landing.model';
import { BaseLandingReport, LandingStats } from '@app/trip/landing/report/base-landing-report.class';
import { environment } from '@environments/environment';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-sampling-landing-report',
  styleUrls: ['../../report/landing.report.scss', '../../../../data/report/base-report.scss'],
  templateUrl: './sampling-landing.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: true,
})
export class SamplingLandingReport extends BaseLandingReport {
  protected referentialRefService: ReferentialRefService = inject(ReferentialRefService);
  constructor() {
    super(LandingStats, {
      pathParentIdAttribute: 'observedLocationId',
      pathIdAttribute: 'samplingId',
    });
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

  protected async computeTitle(data: Landing, _: LandingStats): Promise<string> {
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

  protected computeDefaultBackHref(data: Landing, _?: LandingStats): string {
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
