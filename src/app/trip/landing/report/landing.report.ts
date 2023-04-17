import { AfterViewInit, ChangeDetectionStrategy, Component, Injector, OnDestroy, Optional } from '@angular/core';
import { LandingService } from '@app/trip/services/landing.service';
import {
  DateFormatService,
  EntityServiceLoadOptions,
  Image,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNilOrNaN,
  NetworkService,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Landing } from '@app/trip/services/model/landing.model';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { ObservedLocationService } from '@app/trip/services/observed-location.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { environment } from '@environments/environment';
import {AppDataEntityReport, DataEntityReportOptions} from '@app/data/report/data-entity-report.class';
import {Function} from '@app/shared/functions';
import {Program} from '@app/referential/services/model/program.model';
import {TaxonGroupRef} from '@app/referential/services/model/taxon-group.model';

export interface LandingStats {
  sampleCount: number;
  images?: Image[];
  pmfms: IPmfm[];
  program: Program;
  weightDisplayedUnit: WeightUnitSymbol;
  i18nSuffix: string;
  taxonGroup: TaxonGroupRef;
}


@Component({
  selector: 'app-landing-report',
  styleUrls: ['./landing.report.scss'],
  templateUrl: './landing.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingReport<T extends Landing = Landing, S extends LandingStats = LandingStats>
  extends AppDataEntityReport<any>
  implements AfterViewInit, OnDestroy {


  protected readonly network: NetworkService;
  protected readonly observedLocationService: ObservedLocationService;
  protected readonly landingService: LandingService;
  protected readonly dateFormat: DateFormatService;
  protected readonly programRefService: ProgramRefService;

  weightDisplayedUnit: WeightUnitSymbol;

  get parent(): ObservedLocation {return this.data ? this.data.observedLocation : null};

  constructor(
    protected injector: Injector,
    protected dataType: new() => T,
    @Optional() options?: DataEntityReportOptions,
  ) {
    super(injector, dataType, options);
    this.network = injector.get(NetworkService);
    this.observedLocationService = injector.get(ObservedLocationService);
    this.landingService = injector.get(LandingService);

    this.i18nPmfmPrefix = 'TRIP.SAMPLE.PMFM.';
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

  async load(id: number, opts?: EntityServiceLoadOptions & { [key: string]: string }) {

    const data = await this.loadData(id, opts);
    await this.computeParent(data, opts);
    this.stats = await this.computeStats(data);

    // TODO This is not the place for this
    this.i18nContext.suffix = this.stats.i18nSuffix === 'legacy' ? '' : this.stats.i18nSuffix;

    return data;
  }

  /* -- protected function -- */

  protected async loadData(id: number, opts?: EntityServiceLoadOptions & { [key: string]: string }): Promise<Landing> {
    const data = await this.landingService.load(id);
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');

    // Remove technical label (starting with #)
    (data.samples || []).forEach(sample => {
      // Remove invalid sample label
      if (sample.label?.startsWith('#')) sample.label = null;
    });

    return data;
  }

  protected async computeParent(data: Landing, opts?: EntityServiceLoadOptions & { [key: string]: string }): Promise<void> {
    const parentId = toNumber(opts?.[this._pathParentIdAttribute], undefined);
    if (isNotNilOrNaN(parentId)) {
      data.observedLocation = await this.observedLocationService.load(parentId);
    }
    // TODO Ask for why _pathParentIdAttribute is useful
    if (!data.observedLocation || (data && data.observedLocation.id !== data.observedLocationId)) {
      data.observedLocation = await this.observedLocationService.load(data.observedLocationId);
    }
    if (!data.observedLocation) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    // TODO Check this
    //   const parentId = toNumber(opts?.[this._pathParentIdAttribute], undefined);
    //   let [data, parent] = await Promise.all([
    //     this.landingService.load(id),
    //     Promise.resolve(null),
    //     isNotNilOrNaN(parentId) ? this.observedLocationService.load(parentId) : Promise.resolve(null)
    //   ]);
    //
    //   // Make sure to load the parent
    //   if (!parent || (data && parent.id !== data.observedLocationId)) {
    //     parent = await this.observedLocationService.load(data.observedLocationId);
    //   }
  }

  protected async computeTitle(data: T, parent?: ObservedLocation): Promise<string> {
    const titlePrefix = await this.translateContext.get('LANDING.TITLE_PREFIX',
      this.i18nContext.suffix,
      {
        location: data.location?.name || '',
        date: this.dateFormat.transform(data.dateTime, {time: false})
      }).toPromise();
    const title = await this.translate.get('LANDING.REPORT.TITLE').toPromise();
    return titlePrefix + title;
  }

  protected computeDefaultBackHref(data: T, stats: S): string {
    return `/observations/${this.parent.id}/landing/${data.id}?tab=1`;
  }

  protected computePrintHref(data: T, stats: S): string {
    return `/observations/${this.parent.id}/landing/${data.id}/report`;
  }

  protected async computeStats(data: Landing, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: S;
    cache?: boolean;
  }): Promise<S> {
    const stats = opts?.stats || <S>{};
    const parent = data.observedLocation as ObservedLocation;
    // TODO Explicit error message
    if (!parent) throw new Error('ERROR.LOAD_ENTITY_ERROR');

    stats.program = await this.programRefService.loadByLabel(parent.program.label);

    // Compute agg data
    stats.taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup;
    stats.weightDisplayedUnit = stats.program.getProperty(ProgramProperties.LANDING_WEIGHT_DISPLAYED_UNIT) as WeightUnitSymbol;

    let pmfm = await this.programRefService.loadProgramPmfms(stats.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
      taxonGroupId: stats.taxonGroup?.id
    });
    stats.pmfms = (stats.weightDisplayedUnit)
      ? PmfmUtils.setWeightUnitConversions(pmfm, this.weightDisplayedUnit)
      : pmfm;

    stats.i18nSuffix = stats.program.getProperty(ProgramProperties.I18N_SUFFIX);

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

  protected addFakeSamplesForDev(data: Landing, count = 20) {
    if (environment.production || !data.samples.length) return; // Skip
    const samples = new Array(count);
    for (let i = 0; i < count; i++) {
      samples[i] = data.samples[i % data.samples.length].clone();
    }
    data.samples = samples;
  }
}
