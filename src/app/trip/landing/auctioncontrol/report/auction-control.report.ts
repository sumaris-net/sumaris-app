import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/services/model/landing.model';
import { environment } from '@environments/environment';
import { LandingReport, LandingStats } from '../../report/landing.report';

@Component({
  selector: 'app-auction-control-report',
  styleUrls: ['../../report/landing.report.scss'],
  templateUrl: './auction-control.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuctionControlReport extends LandingReport {

  constructor(
    injector: Injector,
  ) {
    super(
      injector,
      {pathIdAttribute: 'controlId'},
    );
  }

  /* -- protected function -- */

  protected computeTitle(data: Landing, stats: LandingStats): Promise<string> {
    return this.translate.get('AUCTION_CONTROL.REPORT.TITLE', {
      vessel: data.vesselSnapshot.name,
      date: this.dateFormat.transform(data.dateTime),
    }).toPromise();
  }

  protected computeDefaultBackHref(data: Landing, stats: LandingStats): string {
    return `/observations/${this.data.observedLocationId}/control/${data.id}?tab=1`;
  }

  protected computePrintHref(data: Landing, stats: LandingStats): string {
    return `/observations/${this.data.observedLocationId}/control/${data.id}/report`;
  }

  protected addFakeSamplesForDev(data: Landing, count = 40) {
    if (environment.production) return; // Skip
    super.addFakeSamplesForDev(data, count);
    data.samples.forEach((s, index) => s.label = `${index+1}`);
  }

}
