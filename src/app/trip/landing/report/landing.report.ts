import {AfterViewInit, ChangeDetectionStrategy, Component, Injector, OnDestroy, Optional} from '@angular/core';
import { LandingService } from '@app/trip/services/landing.service';
import {
  DateFormatService,
  EntityServiceLoadOptions,
  ImageAttachment,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNilOrNaN,
  NetworkService,
} from '@sumaris-net/ngx-components';
import { Landing } from '@app/trip/services/model/landing.model';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { ObservedLocationService } from '@app/trip/services/observed-location.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import {IPmfm, Pmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { environment } from '@environments/environment';
import {AppDataEntityReport, DataEntityReportOptions} from '@app/data/report/data-entity-report.class';
import {Function} from '@app/shared/functions';
import {Program} from '@app/referential/services/model/program.model';
import {TaxonGroupRef} from '@app/referential/services/model/taxon-group.model';
import {IReportStats} from '@app/data/report/base-report.class';

export interface LandingStats extends IReportStats {
  sampleCount: number;
  images?: ImageAttachment[];
  pmfms: IPmfm[];
  i18nPmfmPrefix?: string;
  program: Program;
  weightDisplayedUnit: WeightUnitSymbol;
  taxonGroup: TaxonGroupRef;
}

@Component({
  selector: 'app-landing-report',
  styleUrls: ['./landing.report.scss'],
  templateUrl: './landing.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingReport<
  S extends LandingStats = LandingStats
>
  extends AppDataEntityReport<Landing, number, S>
  implements AfterViewInit, OnDestroy {

  protected logPrefix = 'landing-report';

  protected readonly network: NetworkService;
  protected readonly observedLocationService: ObservedLocationService;
  protected readonly landingService: LandingService;
  protected readonly dateFormat: DateFormatService;
  protected readonly programRefService: ProgramRefService;

  constructor(
    protected injector: Injector,
    @Optional() options?: DataEntityReportOptions,
  ) {
    super(injector, Landing, options);
    this.network = injector.get(NetworkService);
    this.observedLocationService = injector.get(ObservedLocationService);
    this.landingService = injector.get(LandingService);

    if (!this.route || isNilOrBlank(this._pathIdAttribute)) {
      throw new Error('Unable to load from route: missing \'route\' or \'options.pathIdAttribute\'.');
    }
  }

  ngAfterViewInit() {
    // Load data
    //if (this._autoLoad && !this.embedded) { // If !this.embeded start is never called
    if (this._autoLoad) {
      setTimeout(() => this.start(), this._autoLoadDelay);
    }
  }

  ngOnDestroy() {
    this.destroySubject.next();
  }

  async loadData(id: number, opts?: EntityServiceLoadOptions & { [key: string]: string }): Promise<Landing> {
    const data = await this.landingService.load(id);
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');

    // Remove technical label (starting with #)
    (data.samples || []).forEach(sample => {
      // Remove invalid sample label
      if (sample.label?.startsWith('#')) sample.label = null;
    });

    await this.fillParent(data);

    return data as Landing;
  }

  /* -- protected function -- */

  // protected async loadFromClipboard(clipboard: Clipboard, opts?: EntityServiceLoadOptions & { [key: string]: string }) {
  //   const target = await super.loadFromClipboard(clipboard, opts);
  //   target.observedLocation = ObservedLocation.fromObject(clipboard.data.data?.observedLocation);
  //   return target;
  // }

  protected async computeTitle(data: Landing, stats: S): Promise<string> {
    const titlePrefix = await this.translateContext.get('LANDING.TITLE_PREFIX',
      this.i18nContext.suffix,
      {
        location: data.location?.name || '',
        date: this.dateFormat.transform(data.dateTime, {time: false})
      }).toPromise();
    const title = await this.translate.get('LANDING.REPORT.TITLE').toPromise();
    return titlePrefix + title;
  }

  protected computeDefaultBackHref(data: Landing, stats: S): string {
    return `/observations/${this.data.observedLocationId}/landing/${data.id}?tab=1`;
  }

  protected computePrintHref(data: Landing, stats: S): string {
    return `/observations/${this.data.observedLocation.id}/landing/${data.id}/report`;
  }

  protected async computeStats(data: Landing, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: S;
    cache?: boolean;
  }): Promise<S> {
    if (this.debug) console.log(`[${this.logPrefix}] Computing stats...`);
    // TODO When we need to get stats from opts ?
    const stats:S = opts?.stats || <S>{};

    // TODO Check and send error if data.observedLocation is empty (must be filled `computeParent` in `loadData`)
    const parent = data.observedLocation as ObservedLocation;
    stats.program = await this.programRefService.loadByLabel(parent.program.label);

    // Compute agg data
    stats.taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup;
    stats.weightDisplayedUnit = stats.program.getProperty(ProgramProperties.LANDING_WEIGHT_DISPLAYED_UNIT) as WeightUnitSymbol;

    const pmfms = stats.pmfms || await this.programRefService.loadProgramPmfms(stats.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
      taxonGroupId: stats.taxonGroup?.id
    });
    stats.pmfms = (stats.weightDisplayedUnit)
      ? PmfmUtils.setWeightUnitConversions(pmfms, stats.weightDisplayedUnit)
      : pmfms;

    const i18nSuffix = stats.program.getProperty(ProgramProperties.I18N_SUFFIX);
    stats.i18nSuffix = i18nSuffix === 'legacy' ? '' : i18nSuffix;

    // Compute sample count
    stats.sampleCount = data.samples?.length || 0;

    // Compute images, with title
    stats.images = (data.samples || [])
      .filter(s => isNotEmptyArray(s.images))
      .flatMap(s => {
        // Add title to image
        s.images.forEach(image => {
          image.title = image.title || s.label || `#${s.rankOrder}`;
        })
        return s.images;
      });
    return stats;
  }

  protected async fillParent(data: Landing) {
    let parent: ObservedLocation;
    if (isNotNilOrNaN(data.observedLocationId)) {
      parent = await this.observedLocationService.load(data.observedLocationId);
    }
    if (!parent) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    data.observedLocation = parent;
  }

  protected addFakeSamplesForDev(data: Landing, count = 20) {
    if (environment.production || !data.samples.length) return; // Skip
    const samples = new Array(count);
    for (let i = 0; i < count; i++) {
      samples[i] = data.samples[i % data.samples.length].clone();
    }
    data.samples = samples;
  }

  protected dataFromObject(source:any): Landing {
    return Landing.fromObject(source);
  }

  protected statsFromObject(source:any): S {
    const stats:LandingStats = {
      i18nSuffix: source.i18nSuffix,
      sampleCount: source.sampleCount,
      images: source.images.map(item => ImageAttachment.fromObject(item)),
      pmfms: source.pmfms.map(item => Pmfm.fromObject(item)),
      program: Program.fromObject(source.program),
      weightDisplayedUnit: source.weightDisplayedUnit,
      taxonGroup: TaxonGroupRef.fromObject(source.taxonGroup),
    };
    return stats as S;
  }

  protected statsAsObject(source:S): any {
    return  {
      i18nSuffix: source.i18nSuffix,
      sampleCount: source.sampleCount,
      images: source.images.map(item => item.asObject()),
      pmfms: source.pmfms.map(item => item.asObject()),
      program: source.program.asObject(),
      weightDisplayedUnit: source.weightDisplayedUnit,
      taxonGroup: source.taxonGroup.asObject(),
    };
  }


}
