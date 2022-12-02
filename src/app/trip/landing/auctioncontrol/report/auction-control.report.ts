import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { Landing } from '@app/trip/services/model/landing.model';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { environment } from '@environments/environment';
import { LandingReport, LandingStats } from '../../report/landing.report';
import { isNotEmptyArray } from '@sumaris-net/ngx-components';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';

export interface AuctionControlStats extends LandingStats {
  taxonGroup: TaxonGroupRef;
}

@Component({
  selector: 'app-auction-control-report',
  styleUrls: ['../../report/landing.report.scss'],
  templateUrl: './auction-control.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuctionControlReport extends LandingReport<Landing, AuctionControlStats> {


  constructor(
    injector: Injector
  ) {
    super(injector, {
      pathParentIdAttribute: 'observedLocationId',
      pathIdAttribute: 'controlId'
    });
  }

  /* -- protected function -- */

  protected async onDataLoaded(data: Landing, pmfms: IPmfm[]): Promise<Landing> {
    data = await super.onDataLoaded(data, pmfms);

    // Compute controlled species
    this.stats.taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup;

    return data;
  }

  protected computeTitle(data: Landing, parent?: ObservedLocation): Promise<string> {
    return this.translate.get('AUCTION_CONTROL.REPORT.TITLE', {
      vessel: data.vesselSnapshot.name,
      date: this.dateFormat.transform(data.dateTime),
    }).toPromise();
  }

  protected async computeDefaultBackHref(data: Landing, parent?: ObservedLocation): Promise<string> {
    return `/observations/${parent.id}/control/${data.id}?tab=1`;
  }

  protected addFakeSamplesForDev(data: Landing, count = 40) {
    if (environment.production) return; // Skip

    super.addFakeSamplesForDev(data, count);

    data.samples.forEach((s, index) => s.label = `${index+1}`);
  }

  isNotEmptyArray = isNotEmptyArray;
}
