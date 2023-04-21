import {AfterViewInit, ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, QueryList, ViewChild, ViewChildren} from '@angular/core';
import { LandingEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import {IPmfm, Pmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
import {
  arrayDistinct,
  EntityServiceLoadOptions,
  firstFalsePromise,
  isNotEmptyArray,
  WaitForOptions
} from '@sumaris-net/ngx-components';
import {LandingReport,} from '@app/trip/landing/report/landing.report';
import { LandingService } from '@app/trip/services/landing.service';
import { Landing } from '@app/trip/services/model/landing.model';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { ObservedLocationService } from '@app/trip/services/observed-location.service';
import {IReportStats} from '@app/data/report/base-report.class';
import {AppDataEntityReport} from '@app/data/report/data-entity-report.class';
import {LANDING_I18N_PMFM_PREFIX, LANDING_TABLE_DEFAULT_I18N_PREFIX} from '@app/trip/landing/landings.table';

export interface ObservedLocationStats extends IReportStats {
  vesselCount: number,
  pmfms: IPmfm[],
  landingPmfms: IPmfm[],
  landingEditor: LandingEditor,
  landingI18nPmfmPrefix: string,
  landingI18nColumnPrefix: string,
  landingShowSampleCount: boolean,
  landingSamplesPmfms: IPmfm[][],
}

@Component({
  selector: 'app-observed-location',
  templateUrl: './observed-location.report.html',
  styleUrls: ['../../landing/report/landing.report.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservedLocationReport extends AppDataEntityReport<ObservedLocation, number, ObservedLocationStats> implements AfterViewInit, OnDestroy {

  private readonly observedLocationService: ObservedLocationService;
  private readonly landingService: LandingService;
  private readonly landingEditor: LandingEditor;

  i18nContext = {
    prefix: '',
    suffix: ''
  };

  @Input() showToolbar = true;
  @Input() showError = true;

  @ViewChild(RevealComponent) reveal!: RevealComponent;
  @ViewChildren("landingReport") children!: QueryList<LandingReport>;

  constructor(
    injector: Injector,
  ) {
    super(injector, ObservedLocation, {pathIdAttribute: 'observedLocationId'});

    this.observedLocationService = injector.get(ObservedLocationService);
    this.landingService = injector.get(LandingService);

    // if (!this.route || isNilOrBlank(this._pathIdAttribute)) {
    //   throw new Error('Unable to load from route: missing \'route\'.');
    // }
  }
  async loadData(id: number, opts?: EntityServiceLoadOptions & { [key: string]: string }): Promise<ObservedLocation> {
    const data = await this.observedLocationService.load(id, {withLanding: true});
    if (!data) {
      throw new Error('ERROR.LOAD_ENTITY_ERROR');
    }

    // Load full landings
    data.landings = await Promise.all(data.landings.map(landing => this.landingService.load(landing.id)));

    // Inject the parent on all landing // TODO put a copy of the parent that have embeded landing removed
    //                                     Or manage this when we serialize/deserialize the object
    //                                     (we do not want embeded parent parent when we serialise landing)
    data.landings.forEach(landing => landing.observedLocation = data);

    return data;
  }

  markAsReady() {
    super.markAsReady();
    if (!this.children.length && isNotEmptyArray(this.data?.landings)) {
      this.cd.detectChanges();
    }
    this.children.map(c => c.markAsReady());
  }

  protected async computeTitle(data: ObservedLocation, stats: ObservedLocationStats): Promise<string> {
    return await this.translate.get('OBSERVED_LOCATION.REPORT.TITLE', {
      location: data.location.name,
      dateTime: this.dateFormat.transform(data.startDateTime, {time: true}),
    }).toPromise();
  }

  protected computeDefaultBackHref(data: ObservedLocation): string {
    return `/observations/${data.id}?tab=1`;
  }

  protected computePrintHref(data: ObservedLocation): string {
    return `/observations/${data.id}/report`;
  }

  protected async computeStats(data: ObservedLocation, opts?: {
    // getSubCategory?: Function<any, string>;
    stats?: ObservedLocationStats;
    cache?: boolean;
  }): Promise<ObservedLocationStats> {
    const stats:ObservedLocationStats = opts?.stats || <ObservedLocationStats>{};
    const program = await this.programRefService.loadByLabel(data.program.label);

    stats.vesselCount = arrayDistinct(data.landings, 'vesselSnapshot.id').length;

    stats.landingEditor = program.getProperty(ProgramProperties.LANDING_EDITOR);
    // Force landing editor to default for testing
    //this.landingEditor = 'landing'
    stats.landingShowSampleCount = program.getPropertyAsBoolean(ProgramProperties.LANDING_SAMPLES_COUNT_ENABLE);

    stats.pmfms = await this.programRefService.loadProgramPmfms(
      program.label, {acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION}
    );

    stats.landingSamplesPmfms = await this.loadLandingsPmfms(this.data.landings, program);

    stats.landingPmfms = await this.programRefService.loadProgramPmfms(
      program.label, {acquisitionLevel: AcquisitionLevelCodes.LANDING}
    );

    stats.landingI18nColumnPrefix = LANDING_TABLE_DEFAULT_I18N_PREFIX;
    stats.landingI18nPmfmPrefix = LANDING_I18N_PMFM_PREFIX;

    return stats;
  }

  protected statsFromObject(source:any): ObservedLocationStats {
    return {
      i18nSuffix: source.i18nSuffix,
      vesselCount: source.vesselCount,
      pmfms: source.pmfms.map(item => item.asObject()),
      landingPmfms: source.landingPmfms.map(item => Pmfm.fromObject(item)),
      landingEditor: source.landingEditor, // TODO : make it from object
      landingI18nPmfmPrefix: source.landingI18nPmfmPrefix,
      landingI18nColumnPrefix: source.landingI18nColumnPrefix,
      landingShowSampleCount: source.landingShowSampleCount,
      landingSamplesPmfms: source.landingSamplesPmfms.map(lv1 => lv1.map(lv2 => Pmfm.fromObject(lv2))),
    };
  }

  protected statsAsObject(source: ObservedLocationStats): any {
    return {
      i18nSuffix: source.i18nSuffix,
      vesselCount: source.vesselCount,
      pmfms: source.pmfms.map(item => item.asObject()),
      landingPmfms: source.landingPmfms.map(item => item.asObject()),
      landingEditor: source.landingEditor, // TODO : make it as object
      landingI18nPmfmPrefix: source.landingI18nPmfmPrefix,
      landingI18nColumnPrefix: source.landingI18nColumnPrefix,
      landingShowSampleCount: source.landingShowSampleCount,
      landingSamplesPmfms: source.landingSamplesPmfms.map(lv1 => lv1.map(lv2 => lv2.asObject())),
    };
  }

  protected async loadLandingsPmfms(landings: Landing[], program: Program): Promise<IPmfm[][]> {
    const weightDisplayedUnit = await program.getProperty(ProgramProperties.LANDING_WEIGHT_DISPLAYED_UNIT) as WeightUnitSymbol;
    return Promise.all(
      landings.map(async (landing) => {
        const taxonGroup = (landing.samples || [])
          .find(s => !!s.taxonGroup?.name)?.taxonGroup || {} as TaxonGroupRef;
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
    if (this.debug) console.debug(`[${this.logPrefix}.waitIdle]`);
    if (this.loaded) return;
    await firstFalsePromise(this.loadingSubject, { stop: this.destroySubject, ...opts });
    this.children.map(c => c.waitIdle(opts));
  }

  protected dataFromObject(source:any): ObservedLocation {
    return ObservedLocation.fromObject(source);
  }

  isQualitativePmfm(pmfm: IPmfm) {
    return pmfm.isQualitative && pmfm.qualitativeValues?.length <= 3;
  }

  isNotQualitativePmfm(pmfm: IPmfm) {
    return !pmfm.isQualitative || !pmfm.qualitativeValues?.length || (pmfm.qualitativeValues.length > 3);
  }

  hasSamples(landing: Landing): boolean {
    return isNotEmptyArray(landing?.samples);
  }

}
