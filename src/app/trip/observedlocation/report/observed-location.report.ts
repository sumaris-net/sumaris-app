import { AfterViewInit, ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { LandingEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { IPmfm, Pmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
import {
  arrayDistinct,
  EntityAsObjectOptions,
  EntityServiceLoadOptions,
  isNotEmptyArray,
  isNotNil,
  WaitForOptions,
} from '@sumaris-net/ngx-components';
import { LandingReport } from '@app/trip/landing/report/landing.report';
import { AppDataEntityReport, DataReportStats } from '@app/data/report/data-entity-report.class';
import { LANDING_I18N_PMFM_PREFIX, LANDING_TABLE_DEFAULT_I18N_PREFIX } from '@app/trip/landing/landings.table';
import { AuctionControlReport } from '@app/trip/landing/auction-control/report/auction-control.report';
import { SamplingLandingReport } from '../../landing/sampling/report/sampling-landing.report';
import { IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { LandingStats } from '@app/trip/landing/report/base-landing-report.class';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { ObservedLocationService } from '@app/trip/observedlocation/observed-location.service';
import { LandingService } from '@app/trip/landing/landing.service';
import { lastValueFrom } from 'rxjs';
import { Landing } from '@app/trip/landing/landing.model';

export class ObservedLocationStats extends DataReportStats {
  vesselCount: number;
  pmfms: IPmfm[];
  landingPmfms: IPmfm[];
  landingEditor: LandingEditor;
  landingI18nPmfmPrefix: string;
  landingI18nColumnPrefix: string;
  landingShowSampleCount: boolean;
  landingSamplesPmfms: IPmfm[][];
  landingsStats?: LandingStats[];

  fromObject(source: any) {
    this.vesselCount = source.vesselCount;
    this.pmfms = source.pmfms.map((item) => Pmfm.fromObject(item));
    this.landingPmfms = source.landingPmfms.map((item) => Pmfm.fromObject(item));
    this.landingEditor = source.landingEditor; // TODO : make it from object
    this.landingI18nPmfmPrefix = source.landingI18nPmfmPrefix;
    this.landingI18nColumnPrefix = source.landingI18nColumnPrefix;
    this.landingShowSampleCount = source.landingShowSampleCount;
    this.landingSamplesPmfms = source.landingSamplesPmfms.map((lv1) => lv1.map((lv2) => Pmfm.fromObject(lv2)));
    this.landingsStats = source.landingsStats.map((s) => {
      const stats = new LandingStats();
      stats.fromObject(s);
      return stats;
    });
  }

  asObject(opts?: EntityAsObjectOptions): any {
    let target = super.asObject(opts);
    // TODO
    target = {
      ...target,
      vesselCount: this.vesselCount,
      pmfms: this.pmfms.map((item) => item.asObject()),
      landingPmfms: this.landingPmfms.map((item) => item.asObject()),
      landingEditor: this.landingEditor, // TODO : make it as object
      landingI18nPmfmPrefix: this.landingI18nPmfmPrefix,
      landingI18nColumnPrefix: this.landingI18nColumnPrefix,
      landingShowSampleCount: this.landingShowSampleCount,
      landingSamplesPmfms: this.landingSamplesPmfms.map((lv1) => lv1.map((lv2) => lv2.asObject())),
      // NOTE : can not be sure that landing stats are present at this moment because they are not computed in ObservedLocationReport:computeStats
      //        see ObservedLocationReport:statsAsObject
      landingsStats: this.landingsStats.map((s) => s.asObject(opts)),
    };
    return target;
  }
}

@Component({
  selector: 'app-observed-location-report',
  templateUrl: './observed-location.report.html',
  styleUrls: ['../../landing/report/landing.report.scss', '../../../data/report/base-report.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservedLocationReport extends AppDataEntityReport<ObservedLocation, number, ObservedLocationStats> implements AfterViewInit, OnDestroy {
  protected logPrefix = 'observed-location-report';

  protected readonly isNotEmptyArray = isNotEmptyArray;
  protected readonly isNotNil = isNotNil;
  protected readonly AuctionControlReport = AuctionControlReport;
  protected readonly SamplingLandingReport = SamplingLandingReport;
  protected readonly LandingReport = LandingReport;

  private readonly observedLocationService: ObservedLocationService;
  private readonly landingService: LandingService;

  @Input() showToolbar = true;
  @Input() showError = true;

  @ViewChild(RevealComponent) reveal!: RevealComponent;
  @ViewChildren('landingReport') children!: QueryList<LandingReport>;

  constructor(injector: Injector) {
    super(injector, ObservedLocation, ObservedLocationStats, { pathIdAttribute: 'observedLocationId' });

    this.observedLocationService = injector.get(ObservedLocationService);
    this.landingService = injector.get(LandingService);
  }

  async loadData(id: number, opts?: EntityServiceLoadOptions & { [key: string]: string }): Promise<ObservedLocation> {
    if (this.debug) console.log(`[${this.logPrefix}] load data...`);
    const data = await this.observedLocationService.load(id, { withLanding: true });
    if (!data) {
      throw new Error('ERROR.LOAD_ENTITY_ERROR');
    }

    // Load full landings
    data.landings = await Promise.all(data.landings.map((landing) => this.landingService.load(landing.id)));

    // Inject the parent on all landing // TODO put a copy of the parent that have embeded landing removed
    //                                     Or manage this when we serialize/deserialize the object
    //                                     (we do not want embeded parent parent when we serialise landing)
    data.landings.forEach((landing) => (landing.observedLocation = data));

    return data;
  }

  dataFromObject(source: any): ObservedLocation {
    const result = ObservedLocation.fromObject(source);
    result.landings.forEach((l) => (l.observedLocation = result));
    return result;
  }

  dataAsObject(source: ObservedLocation, opts?: EntityAsObjectOptions): any {
    const copySource = source.clone();
    // Clean observed location from exported data
    // (this is redundant because observed location is the root of data itself)
    copySource.landings.forEach((l) => delete l.observedLocation);
    return copySource.asObject();
  }

  markAsReady() {
    super.markAsReady();
    if (!this.children.length && isNotEmptyArray(this.data?.landings)) {
      this.cd.detectChanges();
    }
    this.children.map((c) => c.markAsReady());
  }

  async updateView() {
    if (this.debug) console.debug(`${this.logPrefix}updateView`);

    this.cd.detectChanges();
    await this.waitIdle({ stop: this.destroySubject });

    this.reveal.initialize();
  }

  statsAsObject(source: ObservedLocationStats, opts?: EntityAsObjectOptions): any {
    // TODO This is not really the place and the moment for push children stats in this stats, try to find a better way to do this
    //      (can not be done in computeStats because children was not available at this moment)
    source.landingsStats = this.children.map((c) => c.stats);
    return source.asObject(opts);
  }

  protected async computeTitle(data: ObservedLocation, stats: ObservedLocationStats): Promise<string> {
    return await lastValueFrom(
      this.translate.get('OBSERVED_LOCATION.REPORT.TITLE', {
        location: data.location.name,
        dateTime: this.dateFormat.transform(data.startDateTime, { time: true }),
      })
    );
  }

  protected computeDefaultBackHref(data: ObservedLocation): string {
    return `/observations/${data.id}?tab=1`;
  }
  protected async computeStats(data: ObservedLocation, opts?: IComputeStatsOpts<ObservedLocationStats>): Promise<ObservedLocationStats> {
    if (this.debug) console.log(`[${this.logPrefix}.computeStats]`);
    const stats: ObservedLocationStats = opts?.stats || new this.statsType();
    stats.program = await this.programRefService.loadByLabel(data.program.label);

    stats.vesselCount = arrayDistinct(data.landings, 'vesselSnapshot.id').length;

    stats.landingEditor = stats.program.getProperty(ProgramProperties.LANDING_EDITOR);
    // Force landing editor to default for testing
    //this.landingEditor = 'landing'
    stats.landingShowSampleCount = stats.program.getPropertyAsBoolean(ProgramProperties.LANDING_SAMPLES_COUNT_ENABLE);

    stats.pmfms = await this.programRefService.loadProgramPmfms(stats.program.label, { acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION });

    stats.landingSamplesPmfms = await this.loadLandingsPmfms(this.data.landings, stats.program);

    stats.landingPmfms = await this.programRefService.loadProgramPmfms(stats.program.label, { acquisitionLevel: AcquisitionLevelCodes.LANDING });

    stats.landingI18nColumnPrefix = LANDING_TABLE_DEFAULT_I18N_PREFIX;
    stats.landingI18nPmfmPrefix = LANDING_I18N_PMFM_PREFIX;

    return stats;
  }

  protected computeI18nContext(stats: ObservedLocationStats): IReportI18nContext {
    return {
      ...super.computeI18nContext(stats),
      pmfmPrefix: 'OBSERVED_LOCATION.PMFM.',
    };
  }

  protected computeShareBasePath(): string {
    return 'observations/report';
  }

  protected async loadLandingsPmfms(landings: Landing[], program: Program): Promise<IPmfm[][]> {
    const weightDisplayedUnit = (await program.getProperty(ProgramProperties.LANDING_SAMPLE_WEIGHT_UNIT)) as WeightUnitSymbol;
    return Promise.all(
      landings.map(async (landing) => {
        const taxonGroup = (landing.samples || []).find((s) => !!s.taxonGroup?.name)?.taxonGroup || ({} as TaxonGroupRef);
        const pmfms = await this.programRefService.loadProgramPmfms(program.label, {
          acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
          taxonGroupId: taxonGroup?.id,
        });
        if (weightDisplayedUnit) {
          PmfmUtils.setWeightUnitConversions(pmfms, weightDisplayedUnit);
        }
        return pmfms;
      })
    );
  }

  async waitIdle(opts: WaitForOptions) {
    await super.waitIdle(opts);

    // this.cd.detectChanges();
    await Promise.all(
      this.children.map((c) => {
        console.debug(`[${this.logPrefix}] Waiting for child`);
        return c.waitIdle(opts);
      })
    );
  }

  isQualitativePmfm(pmfm: IPmfm) {
    return pmfm.isQualitative && pmfm.qualitativeValues?.length <= 3;
  }

  isNotQualitativePmfm(pmfm: IPmfm) {
    return !pmfm.isQualitative || !pmfm.qualitativeValues?.length || pmfm.qualitativeValues.length > 3;
  }

  hasSamples(landing: Landing): boolean {
    return isNotEmptyArray(landing?.samples);
  }
}
