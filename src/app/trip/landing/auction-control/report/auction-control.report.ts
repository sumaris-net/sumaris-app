import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Landing } from '@app/trip/landing/landing.model';
import { BaseLandingReport, LandingStats } from '@app/trip/landing/report/base-landing-report.class';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-auction-control-report',
  styleUrls: ['../../report/landing.report.scss', '../../../../data/report/base-report.scss'],
  templateUrl: './auction-control.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuctionControlReport extends BaseLandingReport {
  constructor() {
    super(LandingStats, {
      pathIdAttribute: 'controlId',
    });
  }

  /* -- protected function -- */

  protected computeTitle(data: Landing, stats: LandingStats): Promise<string> {
    return firstValueFrom(
      this.translate.get('AUCTION_CONTROL.REPORT.TITLE', {
        vessel: data.vesselSnapshot.name,
        date: this.dateFormat.transform(data.dateTime),
      })
    );
  }

  protected computeDefaultBackHref(data: Landing, stats: LandingStats): string {
    return `/observations/${this.data.observedLocationId}/control/${data.id}?tab=1`;
  }

  protected computeShareBasePath(): string {
    return 'observations/report/control';
  }

  protected addFakeSamplesForDev(data: Landing, count = 40) {
    if (environment.production) return; // Skip
    super.addFakeSamplesForDev(data, count);
    data.samples.forEach((s, index) => (s.label = `${index + 1}`));
  }
}
