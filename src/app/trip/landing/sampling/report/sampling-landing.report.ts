import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/services/model/landing.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { environment } from '@environments/environment';
import { LandingReport, LandingStats } from '../../report/landing.report';
import { EntityServiceLoadOptions } from '@sumaris-net/ngx-components';
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
export class SamplingLandingReport extends LandingReport {

  constructor(
    injector: Injector,
  ) {
    super(
      injector,
      Landing,
      {
        pathParentIdAttribute: 'observedLocationId',
        pathIdAttribute: 'samplingId',
      }
    );
  }

  async load(id: number, opts?: EntityServiceLoadOptions & { [key: string]: string }): Promise<Landing> {
    const data = await super.load(id, opts);

    // Remove TAG_ID prefix
    const samplePrefix = `${this.stats.strategyLabel}-`;
    (data.samples || []).forEach(sample => {
      const tagId = sample.measurementValues[PmfmIds.TAG_ID];
      if (tagId && tagId.startsWith(samplePrefix)) {
        sample.measurementValues[PmfmIds.TAG_ID] = tagId.substring(samplePrefix.length);
      }
    });

    return data;
  }

  /* -- protected function -- */

  protected async computeStats(data: Landing, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: SamplingLandingStats;
    cache?: boolean;
  }): Promise<SamplingLandingStats> {
    const stats = super.stats(data, opts);
    stats.strategyLabel = data.measurementValues[PmfmIds.STRATEGY_LABEL];
    return stats;
  }

  protected async computeTitle(data: Landing, parent?: ObservedLocation): Promise<string> {
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



  protected computeDefaultBackHref(data: Landing, stats?: LandingStats): string {
    return `/observations/${this.parent.id}/sampling/${data.id}?tab=1`;
  }

  protected addFakeSamplesForDev(data: Landing, count = 25) {
    if (environment.production) return; // Skip

    super.addFakeSamplesForDev(data, count);

    data.samples.forEach((s, index) => s.measurementValues[PmfmIds.TAG_ID] = `${index+1}`);
  }

}
