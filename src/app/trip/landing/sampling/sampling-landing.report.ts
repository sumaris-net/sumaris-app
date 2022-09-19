import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/services/model/landing.model';
import { LandingReport } from '@app/trip/landing/landing.report';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';

export class AppDataReportOptions {
  pathIdAttribute?: string;
}

@Component({
  selector: 'app-sampling-landing-report',
  styleUrls: ['../landing.report.scss',
    'sampling-landing.report.scss'],
  templateUrl: './sampling-landing.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplingLandingReport extends LandingReport {

  strategyLabel: string;

  constructor(
    injector: Injector
  ) {
    super(injector, {
      pathParentIdAttribute: 'observedLocationId',
      pathIdAttribute: 'samplingId'
    });
  }

  /* -- protected function -- */

  protected async onDataLoaded(data: Landing): Promise<Landing> {

    this.strategyLabel = data.measurementValues[PmfmIds.STRATEGY_LABEL];

    // Remove TAG_ID prefix
    const samplePrefix = `${this.strategyLabel}-`;
    (data.samples || []).forEach(sample => {
      const tagId = sample.measurementValues[PmfmIds.TAG_ID];
      if (tagId && tagId.startsWith(samplePrefix)) {
        sample.measurementValues[PmfmIds.TAG_ID] = tagId.substring(samplePrefix.length);
      }
    })

    return super.onDataLoaded(data);
  }

  protected async computeTitle(data: Landing, parent?: ObservedLocation): Promise<string> {
    const titlePrefix = await this.translate.get('LANDING.TITLE_PREFIX', {
      location: data.location?.name || '',
      date: this.dateFormatPipe.transform(data.dateTime, {time: false})
    }).toPromise();

    const strategyLabel = this.strategyLabel || data.measurementValues[PmfmIds.STRATEGY_LABEL] || '';

    const title = await this.translate.get('LANDING.REPORT.SAMPLING.TITLE', {
      vessel: data.vesselSnapshot && (data.vesselSnapshot.registrationCode || data.vesselSnapshot.name),
      strategyLabel: strategyLabel
    }).toPromise();

    this.defaultBackHref = `/observations/${parent.id}/sampling/${data.id}?tab=1`;

    return titlePrefix + title;
  }


}
