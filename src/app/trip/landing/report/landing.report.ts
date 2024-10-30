import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/landing/landing.model';
import { BaseLandingReport, LandingStats } from '@app/trip/landing/report/base-landing-report.class';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-landing-report',
  styleUrls: ['./landing.report.scss', '../../../data/report/base-report.scss'],
  templateUrl: './landing.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingReport extends BaseLandingReport {
  protected logPrefix = 'landing-report';

  constructor(protected injector: Injector) {
    super(LandingStats, { pathIdAttribute: 'landingId' });
  }

  /* -- protected function -- */

  protected async computeTitle(data: Landing, _: LandingStats): Promise<string> {
    const titlePrefix = await lastValueFrom(
      this.translateContext.get('LANDING.TITLE_PREFIX', this.i18nContext.suffix, {
        location: data.location?.name || '',
        date: this.dateFormat.transform(data.dateTime, { time: false }),
      })
    );
    const title = await lastValueFrom(this.translate.get('LANDING.REPORT.TITLE'));
    return titlePrefix + title;
  }

  protected computeDefaultBackHref(data: Landing, _: LandingStats): string {
    return `/observations/${this.data.observedLocationId}/landing/${data.id}?tab=1`;
  }

  protected computeShareBasePath(): string {
    return 'observations/report/landing';
  }
}
