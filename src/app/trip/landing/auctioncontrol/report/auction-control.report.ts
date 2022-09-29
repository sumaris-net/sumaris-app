import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/services/model/landing.model';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { environment } from '@environments/environment';
import { LandingReport } from '../../report/landing.report';

@Component({
  selector: 'app-auction-control-report',
  styleUrls: ['../../report/landing.report.scss', 'auction-control.report.scss'],
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
  }

  /* -- protected function -- */

  protected async onDataLoaded(data: Landing, pmfms: IPmfm[]): Promise<Landing> {
    data = await super.onDataLoaded(data, pmfms);
    // Remove invalid sample label
    (data.samples || []).forEach(sample => {
      if (sample.label?.startsWith('#')) sample.label = null;
    });
    this.stats.taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup;
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


  protected addFakeSamplesForDev(data: Landing, count = 20) {
    if (environment.production) return; // Skip

    super.addFakeSamplesForDev(data, count);

    data.samples.forEach((s, index) => s.label = `${index+1}`);
  }
}
