import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/services/model/landing.model';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { environment } from '@environments/environment';
import { LandingReport, LandingStats } from '../../report/landing.report';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import {Function} from '@app/shared/functions';

export interface AuctionControlStats extends LandingStats {
  taxonGroup: TaxonGroupRef;
}

@Component({
  selector: 'app-auction-control-report',
  styleUrls: ['../../report/landing.report.scss'],
  templateUrl: './auction-control.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuctionControlReport extends LandingReport<AuctionControlStats> {

  constructor(
    injector: Injector,
  ) {
    super(
      injector,
      {pathIdAttribute: 'controlId'},
    );
  }

  /* -- protected function -- */

  protected async computeStats(data: Landing, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: AuctionControlStats;
    cache?: boolean;
  }): Promise<AuctionControlStats> {
    const stats = await super.computeStats(data, opts);
    stats.taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup;
    return stats;
  }

  protected computeTitle(data: Landing, stats: LandingStats): Promise<string> {
    return this.translate.get('AUCTION_CONTROL.REPORT.TITLE', {
      vessel: data.vesselSnapshot.name,
      date: this.dateFormat.transform(data.dateTime),
    }).toPromise();
  }

  protected computeDefaultBackHref(data: Landing, stats: LandingStats): string {
    return `/observations/${this.parent.id}/control/${data.id}?tab=1`;
  }

  protected computePrintHref(data: Landing, stats: AuctionControlStats): string {
    return `/observations/${this.parent.id}/control/${data.id}/report`;
  }

  protected addFakeSamplesForDev(data: Landing, count = 40) {
    if (environment.production) return; // Skip

    super.addFakeSamplesForDev(data, count);

    data.samples.forEach((s, index) => s.label = `${index+1}`);
  }

}
