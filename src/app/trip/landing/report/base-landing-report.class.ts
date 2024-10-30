import { Directive, OnDestroy, Optional, inject } from '@angular/core';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { AppDataEntityReport, DataEntityReportOptions, DataReportStats } from '@app/data/report/data-entity-report.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { Landing } from '@app/trip/landing/landing.model';
import { LandingService } from '@app/trip/landing/landing.service';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { ObservedLocationService } from '@app/trip/observedlocation/observed-location.service';
import { TRIP_LOCAL_SETTINGS_OPTIONS } from '@app/trip/trip.config';
import { Trip } from '@app/trip/trip/trip.model';
import { environment } from '@environments/environment';
import {
  EntityAsObjectOptions,
  EntityServiceLoadOptions,
  ImageAttachment,
  ReferentialRef,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrNaN,
} from '@sumaris-net/ngx-components';

export class LandingStats extends DataReportStats {
  sampleCount: number;
  images?: ImageAttachment[];
  pmfms: IPmfm[];
  i18nPmfmPrefix?: string;
  weightDisplayedUnit: WeightUnitSymbol;
  taxonGroup: TaxonGroupRef;
  taxonName: TaxonNameRef;
  strategyLabel: string;
  metiers: ReferentialRef[];
  fishingAreas: FishingArea[];

  fromObject(source: any) {
    super.fromObject(source);
    this.sampleCount = source.sampleCount;
    this.images = source.images.map((item: any) => ImageAttachment.fromObject(item));
    this.pmfms = source.pmfms.map((item: any) => DenormalizedPmfmStrategy.fromObject(item));
    this.weightDisplayedUnit = source.weightDisplayedUnit;
    this.taxonGroup = TaxonGroupRef.fromObject(source.taxonGroup);
    this.taxonName = TaxonNameRef.fromObject(source.taxonName);
    this.strategyLabel = source.strategyLabel;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      sampleCount: this.sampleCount,
      images: this.images.map((item) => item.asObject()),
      pmfms: this.pmfms.map((item) => item.asObject()),
      program: this.program.asObject(),
      weightDisplayedUnit: this.weightDisplayedUnit,
      taxonGroup: this.taxonGroup?.asObject(),
      taxonName: this.taxonName?.asObject(),
      strategyLabel: this.strategyLabel,
    };
  }
}

@Directive()
export abstract class BaseLandingReport<S extends LandingStats = LandingStats> extends AppDataEntityReport<Landing, number, S> implements OnDestroy {
  protected logPrefix = 'base-landing-report';

  protected readonly observedLocationService: ObservedLocationService = inject(ObservedLocationService);
  protected readonly landingService: LandingService = inject(LandingService);
  protected readonly programRefService: ProgramRefService = inject(ProgramRefService);

  constructor(
    protected statsType: new () => S,
    @Optional() options?: DataEntityReportOptions
  ) {
    super(Landing, statsType, options);

    if (!this.route || isNilOrBlank(this._pathIdAttribute)) {
      throw new Error("Unable to load from route: missing 'route' or 'options.pathIdAttribute'.");
    }
  }

  async loadData(id: number, opts?: EntityServiceLoadOptions & { [key: string]: string }): Promise<Landing> {
    console.log(`[${this.logPrefix}] loadData`);
    const data = await this.landingService.load(id);
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');

    // Fill fake sample for testing purpose
    // this.addFakeSamplesForDev(data);

    // Remove technical label (starting with #)
    (data.samples || []).forEach((sample) => {
      // Remove invalid sample label
      if (sample.label?.startsWith('#')) sample.label = null;
    });

    await this.fillParent(data);

    return data as Landing;
  }

  /* -- protected function -- */

  protected async fillParent(data: Landing) {
    let parent: ObservedLocation;
    if (isNotNilOrNaN(data.observedLocationId)) {
      parent = await this.observedLocationService.load(data.observedLocationId);
    }
    if (!parent) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    data.observedLocation = parent;
  }

  protected async computeStats(data: Landing, opts?: IComputeStatsOpts<S>): Promise<S> {
    if (this.debug) console.log(`[${this.logPrefix}.computeStats]`);
    // TODO When we need to get stats from opts ?
    const stats: S = opts?.stats || new this.statsType();

    // TODO Check and send error if data.observedLocation is empty (must be filled `computeParent` in `loadData`)
    const parent = data.observedLocation as ObservedLocation;
    stats.program = await this.programRefService.loadByLabel(parent.program.label);

    // Compute agg data
    stats.taxonGroup = (data.samples || []).find((s) => !!s.taxonGroup?.name)?.taxonGroup;
    stats.taxonName = (data.samples || []).find((s) => isNotNil(s.taxonName?.referenceTaxonId))?.taxonName;
    stats.metiers = (data.trip as Trip)?.metiers || [];
    stats.fishingAreas = (data.trip as Trip)?.fishingAreas || [];

    stats.weightDisplayedUnit = this.settings.getProperty(
      TRIP_LOCAL_SETTINGS_OPTIONS.SAMPLE_WEIGHT_UNIT,
      stats.program.getProperty(ProgramProperties.LANDING_SAMPLE_WEIGHT_UNIT)
    );

    const pmfms =
      stats.pmfms ||
      (await this.programRefService.loadProgramPmfms(stats.program.label, {
        acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
        taxonGroupId: stats.taxonGroup?.id,
        referenceTaxonId: stats.taxonName?.referenceTaxonId,
      }));
    stats.pmfms = stats.weightDisplayedUnit ? PmfmUtils.setWeightUnitConversions(pmfms, stats.weightDisplayedUnit) : pmfms;

    // Compute sample count
    stats.sampleCount = data.samples?.length || 0;

    // Compute images, with title
    stats.images = (data.samples || [])
      .filter((s) => isNotEmptyArray(s.images))
      .flatMap((s) => {
        // Add title to image
        s.images.forEach((image) => {
          image.title = image.title || s.label || `#${s.rankOrder}`;
        });
        return s.images;
      });

    return stats;
  }

  protected computeI18nContext(stats: S): IReportI18nContext {
    return {
      ...super.computeI18nContext(stats),
      pmfmPrefix: 'TRIP.SAMPLE.PMFM.',
    };
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
