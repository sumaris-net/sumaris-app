import {ChangeDetectionStrategy, Component, Injector} from '@angular/core';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import {BaseLandingReport, LandingStats} from '@app/trip/landing/report/base-landing-report.class';
import {ObservedLocationService} from '@app/trip/observedlocation/observed-location.service';
import {LandingService} from '@app/trip/landing/landing.service';
import {Landing} from '@app/trip/landing/landing.model';
import {lastValueFrom} from 'rxjs';

@Component({
  selector: 'app-landing-report',
  styleUrls: [
    './landing.report.scss',
    '../../../data/report/base-report.scss',
  ],
  templateUrl: './landing.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingReport extends BaseLandingReport {

  protected logPrefix = 'landing-report';

  protected readonly observedLocationService: ObservedLocationService;
  protected readonly landingService: LandingService;
  protected readonly programRefService: ProgramRefService;

  constructor(
    protected injector: Injector,
  ) {
    super(
      injector,
      LandingStats,
      {pathIdAttribute: 'landingId'});
  }

  /* -- protected function -- */

  protected async computeTitle(data: Landing, stats: LandingStats): Promise<string> {
    const titlePrefix = await lastValueFrom(this.translateContext.get('LANDING.TITLE_PREFIX',
      this.i18nContext.suffix,
      {
        location: data.location?.name || '',
        date: this.dateFormat.transform(data.dateTime, {time: false})
      }));
    const title = await lastValueFrom(this.translate.get('LANDING.REPORT.TITLE'));
    return titlePrefix + title;
  }

  protected computeDefaultBackHref(data: Landing, stats: LandingStats): string {
    return `/observations/${this.data.observedLocationId}/landing/${data.id}?tab=1`;
  }

  protected computeShareBasePath(): string {
    return 'observations/report/landing';
  }


}
