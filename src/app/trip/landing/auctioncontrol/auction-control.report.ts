import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/services/model/landing.model';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { LandingReport } from '@app/trip/landing/landing.report';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { environment } from '@environments/environment';

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
      pathParentIdAttribute: 'observedLocationId',
      pathIdAttribute: 'controlId'
    });
    this.i18nContext.suffix = 'AUCTION_CONTROL.';
  }

  /* -- protected function -- */

  protected async onDataLoaded(data: Landing, pmfms: IPmfm[]): Promise<Landing> {
    data = await super.onDataLoaded(data, pmfms);

    // Remove invalid sample label
    (data.samples || []).forEach(sample => {
      if (sample.label?.startsWith('#')) sample.label = null;
    });

    return data;
  }

  protected async computeTitle(data: Landing, parent?: ObservedLocation): Promise<string> {
    const title = await this.translate.get('AUCTION_CONTROL.REPORT.TITLE', {
      vessel: data.vesselSnapshot.name,
      date: this.dateFormatPipe.transform(data.dateTime),
    }).toPromise();

    this.defaultBackHref = `/observations/${parent.id}/control/${data.id}?tab=1`;

    return title;
  }


  protected addFakeSamplesForDev(data: Landing) {
    if (environment.production) return; // Skip

    super.addFakeSamplesForDev(data);

    data.samples = data.samples.map((s, i) => {
      const ss = s.clone();
      ss.label = ''+i;
      return ss;
    })
  }
}
