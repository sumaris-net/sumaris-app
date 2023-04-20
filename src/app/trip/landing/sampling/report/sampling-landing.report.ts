import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/services/model/landing.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { LandingReport, LandingStats } from '../../report/landing.report';
import { Function } from '@app/shared/functions';

export interface SamplingLandingStats extends LandingStats {
  strategyLabel: string;
}

@Component({
  selector: 'app-sampling-landing-report',
  styleUrls: ['../../report/landing.report.scss'],
  templateUrl: './sampling-landing.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplingLandingReport extends LandingReport<SamplingLandingStats> {

  constructor(
    injector: Injector,
  ) {
    super(
      injector,
      {
        pathParentIdAttribute: 'observedLocationId',
        pathIdAttribute: 'samplingId',
      }
    );
  }

  /* -- protected function -- */

  protected async computeStats(data: Landing, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: SamplingLandingStats;
    cache?: boolean;
  }): Promise<SamplingLandingStats> {
    const stats = await super.computeStats(data, opts);

    stats.strategyLabel = data.measurementValues[PmfmIds.STRATEGY_LABEL];

    const samplePrefix = `${stats.strategyLabel}-`;
    (data.samples || []).forEach(sample => {
      const tagId = sample.measurementValues[PmfmIds.TAG_ID];
      if (tagId && tagId.startsWith(samplePrefix)) {
        sample.measurementValues[PmfmIds.TAG_ID] = tagId.substring(samplePrefix.length);
      }
    });

    return stats;
  }

  protected async computeTitle(data: Landing, stats: SamplingLandingStats): Promise<string> {
    const titlePrefix = await this.translate.get('LANDING.TITLE_PREFIX', {
      location: data.location?.name || '',
      date: this.dateFormat.transform(data.dateTime, {time: false})
    }).toPromise();
    const strategyLabel = this.stats.strategyLabel || data.measurementValues[PmfmIds.STRATEGY_LABEL] || '';
    const title = await this.translate.get('LANDING.REPORT.SAMPLING.TITLE', {
      vessel: data.vesselSnapshot && (data.vesselSnapshot.registrationCode || data.vesselSnapshot.name),
      strategyLabel: strategyLabel
    }).toPromise();
    return titlePrefix + title;
  }

  protected computeDefaultBackHref(data: Landing, stats?: SamplingLandingStats): string {
    return `/observations/${data.observedLocationId}/sampling/${data.id}?tab=1`;
  }

  protected computePrintHref(data: Landing, stats: SamplingLandingStats): string {
    return `/observations/${this.data.observedLocationId}/sampling/${data.id}/report`;
  }

  protected statsFromObject(source:any): SamplingLandingStats {
    return {
      ...super.statsFromObject(source),
      strategyLabel: source.strategyLabel,
    };
  }

  protected statsAsObject(source:SamplingLandingStats): any {
    return {
      ...super.statsAsObject(source),
      strategyLabel: source.strategyLabel,
    }
  }

  protected addFakeSamplesForDev(data: Landing, count = 25) {
    if (environment.production) return; // Skip
    super.addFakeSamplesForDev(data, count);
    data.samples.forEach((s, index) => s.measurementValues[PmfmIds.TAG_ID] = `${index+1}`);
  }

}
