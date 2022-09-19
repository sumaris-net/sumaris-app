import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/services/model/landing.model';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { LandingReport } from '@app/trip/landing/landing.report';

@Component({
  selector: 'app-auction-control-report',
  styleUrls: ['../landing.report.scss', 'auction-control.report.scss'],
  templateUrl: './auction-control.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuctionControlReport extends LandingReport {


  constructor(
    private injector: Injector
  ) {
    super(injector, {
      pathIdAttribute: 'observedLocationId',
      pathParentIdAttribute: 'controlId'
    });
  }

  /* -- protected function -- */

  protected async computeTitle(data: Landing, parent?: ObservedLocation): Promise<string> {
    const title = await this.translate.get('AUCTION_CONTROL.REPORT.TITLE', {
      vessel: data.vesselSnapshot.name,
      date: this.dateFormatPipe.transform(data.dateTime),
    }).toPromise();
    return title;
  }

}
