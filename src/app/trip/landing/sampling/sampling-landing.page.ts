import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Injector, OnInit } from '@angular/core';
import { UntypedFormGroup, ValidationErrors } from '@angular/forms';
import { filter, firstValueFrom, merge, mergeMap, of, Subscription } from 'rxjs';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { ParameterLabelGroups, Parameters, PmfmIds } from '@app/referential/services/model/model.enum';
import {
  AccountService,
  EntityServiceLoadOptions,
  fadeInOutAnimation,
  firstNotNilPromise,
  HistoryPageReference,
  isEmptyArray,
  isNil,
  isNotNil,
  isNotNilOrBlank,
  Referential,
  ReferentialRef,
  SharedValidators,
} from '@sumaris-net/ngx-components';
import { BiologicalSamplingValidators } from './biological-sampling.validators';
import { LandingPage, LandingPageState } from '../landing.page';
import { Landing } from '../landing.model';
import { ObservedLocation } from '../../observedlocation/observed-location.model';
import { SamplingStrategyService } from '@app/referential/services/sampling-strategy.service';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { LandingService } from '@app/trip/landing/landing.service';
import { Trip } from '@app/trip/trip/trip.model';
import { debounceTime, map } from 'rxjs/operators';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
import { Parameter } from '@app/referential/services/model/parameter.model';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { RxState } from '@rx-angular/state';
import { Program } from '@app/referential/services/model/program.model';

export interface SamplingLandingPageState extends LandingPageState {
  ageParameterIds: number[];
  ageFractions: ReferentialRef[];
}

@Component({
  selector: 'app-sampling-landing-page',
  templateUrl: './sampling-landing.page.html',
  styleUrls: ['./sampling-landing.page.scss'],
  providers: [{ provide: APP_DATA_ENTITY_EDITOR, useExisting: SamplingLandingPage }, RxState],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SamplingLandingPage extends LandingPage<SamplingLandingPageState> implements OnInit, AfterViewInit {
  onRefreshEffort = new EventEmitter<any>();
  zeroEffortWarning = false;
  noEffortError = false;
  warning: string = null;
  fractionDisplayAttributes: string[];

  readonly ageFractions$ = this._state.select('ageFractions');

  constructor(
    injector: Injector,
    protected samplingStrategyService: SamplingStrategyService,
    protected accountService: AccountService,
    protected landingService: LandingService
  ) {
    super(injector, {
      pathIdAttribute: 'samplingId',
      enableListenChanges: false,
    });
    this.i18nContext.suffix = 'SAMPLING.';
    this.fractionDisplayAttributes = this.settings.getFieldDisplayAttributes('fraction', ['name']);
    this.strategyResolution = 'user-select';

    // FOR DEV ONLY ----
    this.logPrefix = '[sampling-landing-page] ';
  }

  ngOnInit() {
    super.ngOnInit();

    // Configure sample table
    this.samplesTable.defaultSortBy = PmfmIds.TAG_ID.toString(); // Change if referential ref is not ready (see ngAfterViewInit() )
    this.samplesTable.defaultSortDirection = 'asc';

    this._state.hold(
      this.onRefreshEffort.pipe(
        debounceTime(250),
        map(() => this.strategy)
      ),
      (strategy) => this.checkStrategyEffort(strategy)
    );

    // Load age parameter ids
    this._state.connect(
      'ageParameterIds',
      of<string[]>(ParameterLabelGroups.AGE).pipe(
        mergeMap((parameterLabels) => this.referentialRefService.loadAllByLabels(parameterLabels, Parameter.ENTITY_NAME)),
        map((parameters) => parameters.map((p) => p.id))
      )
    );

    // Load strategy's age fractions
    this._state.connect(
      'ageFractions',
      this._state
        .select(['strategy', 'ageParameterIds'], (s) => s)
        .pipe(
          mergeMap(async ({ strategy, ageParameterIds }) => {
            const ageFractionIds = (strategy?.denormalizedPmfms || [])
              .filter((pmfm) => isNotNil(pmfm.parameterId) && ageParameterIds.includes(pmfm.parameterId))
              .map((pmfm) => pmfm.fractionId);

            if (isEmptyArray(ageFractionIds)) return [];

            const sortBy = this.fractionDisplayAttributes?.[0] || 'name';
            return this.referentialRefService.loadAllByIds(ageFractionIds, 'Fraction', sortBy as keyof Referential<any>, 'asc');
          })
        )
    );

    // Redirect form and table error, to main error
    this.registerSubscription(
      merge(this.landingForm.errorSubject, this.samplesTable.errorSubject.pipe(filter(() => !this.mobile))).subscribe((error) => this.setError(error))
    );
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    // Wait referential ready (before reading enumerations)
    this.referentialRefService
      .ready()
      // Load Pmfm groups
      .then(() => {
        const parameterLabelsGroups = Parameters.getSampleParameterLabelGroups({
          // Exclude the parameter PRESERVATION (=Etat) - Need by IMAGINE (see issue #458)
          excludedParameterLabels: ['PRESERVATION'],
        });
        return this.pmfmService.loadIdsGroupByParameterLabels(parameterLabelsGroups);
      })
      .then((pmfmGroups) => {
        // Configure sample table
        this.samplesTable.defaultSortBy = PmfmIds.TAG_ID.toString();
        this.samplesTable.readonlyPmfmGroups = ParameterLabelGroups.AGE;
        this.samplesTable.pmfmIdsToCopy = [PmfmIds.DRESSING];
        this.samplesTable.pmfmGroups = pmfmGroups;
      });
  }

  /* -- protected functions -- */

  // protected registerForms() {
  //   this.addForms([this.landingForm, this.samplesTable]);
  // }

  protected loadStrategy(strategyFilter: Partial<StrategyFilter>): Promise<Strategy> {
    if (this.debug) console.debug(this.logPrefix + 'Loading strategy, using filter:', strategyFilter);
    return this.strategyRefService.loadByFilter(strategyFilter, {
      failIfMissing: true,
      fullLoad: true, // Need taxon names
      debug: this.debug,
    });
  }

  updateViewState(data: Landing, opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.updateViewState(data);

    // Update tabs state (show/hide)
    this.updateTabsState(data);
  }

  updateTabsState(data: Landing) {
    // Enable landings ta
    this.showSamplesTable = this.showSamplesTable || !this.isNewData || this.isOnFieldMode;

    // confirmation pop-up on quite form if form not touch
    if (this.isNewData && this.isOnFieldMode) {
      this.markAsDirty();
    }

    // Move to second tab
    if (this.showSamplesTable && this.autoOpenNextTab && !this.isNewData && this.selectedTabIndex === 0) {
      this.selectedTabIndex = 1;
      this.tabGroup.realignInkBar();
      this.autoOpenNextTab = false; // Should switch only once
    }
  }

  protected async setProgram(program: Program): Promise<void> {
    await super.setProgram(program);
  }

  protected async setStrategy(strategy: Strategy) {
    await super.setStrategy(strategy);

    this.onRefreshEffort.emit(strategy);
  }

  protected async checkStrategyEffort(strategy?: Strategy) {
    strategy = strategy || this.landingForm?.strategyControl?.value;
    console.debug(this.logPrefix + 'Loading strategy effort...');

    try {
      const [program] = await Promise.all([
        firstNotNilPromise(this.program$, { stop: this.destroySubject }),
        this.landingForm.waitIdle({ stop: this.destroySubject }),
      ]);

      if (strategy?.label) {
        const dateTime =
          (this.landingForm.showDateTime && this.data.dateTime) ||
          (this.parent instanceof Trip && this.parent.departureDateTime) ||
          (this.parent instanceof ObservedLocation && this.parent.startDateTime);

        // If no date (e.g. no parent selected yet) : skip
        if (!dateTime) {
          // DEBUG
          console.debug(this.logPrefix + 'Skip strategy effort loaded: no date found (in form and parent entity)');
          return;
        }

        const startTime = Date.now();
        // Add validator errors on expected effort for this sampleRow (issue #175)
        const strategyEffort = await this.samplingStrategyService.loadStrategyEffortByDate(program.label, strategy.label, dateTime, {
          // Not need realized effort (issue #492)
          withRealized: false,
        });

        // DEBUG
        console.debug(this.logPrefix + `Strategy effort loaded in ${Date.now() - startTime}ms `, strategyEffort);

        // No effort defined
        if (!strategyEffort) {
          this.noEffortError = true;
          this.samplesTable.disable();
          this.zeroEffortWarning = false;
          this.landingForm.strategyControl.setErrors(<ValidationErrors>{ noEffort: true });
          this.landingForm.strategyControl.markAsTouched();
        }
        // Effort is set, but = 0
        else if (strategyEffort.expectedEffort === 0) {
          this.zeroEffortWarning = true;
          this.noEffortError = false;
          SharedValidators.clearError(this.landingForm.strategyControl, 'noEffort');
        }
        // And positive effort has been defined: OK
        else {
          this.zeroEffortWarning = false;
          this.noEffortError = false;
          SharedValidators.clearError(this.landingForm.strategyControl, 'noEffort');
        }
      }

      // No strategy
      else {
        this.zeroEffortWarning = false;
        this.noEffortError = false;
        SharedValidators.clearError(this.landingForm.strategyControl, 'noEffort');
      }

      if (this.noEffortError) {
        this.samplesTable.disable();
      } else if (this.enabled) {
        this.samplesTable.enable();
      }
    } catch (err) {
      const error = err?.message || err;
      console.error(this.logPrefix + 'Error while checking strategy effort', err);
      this.setError(error);
    } finally {
      this.markForCheck();
    }
  }

  protected async onEntityLoaded(data: Landing, options?: EntityServiceLoadOptions): Promise<void> {
    //console.debug('Calling onEntityLoaded', data);
    await super.onEntityLoaded(data, options);
  }

  async getValue(): Promise<Landing> {
    let data = await super.getValue();

    // Convert into entity
    data = Landing.fromObject(data);

    // Compute final TAG_ID, using the strategy label
    const strategyLabel = data.measurementValues?.[PmfmIds.STRATEGY_LABEL];
    if (isNotNilOrBlank(strategyLabel)) {
      const sampleLabelPrefix = strategyLabel + '-';
      data.samples = (data.samples || []).map((sample) => {
        const tagId = sample.measurementValues[PmfmIds.TAG_ID];
        if (tagId && !tagId.startsWith(sampleLabelPrefix)) {
          // Clone to keep existing data unchanged.
          // This is required by the samples-table in the readonly/mobile mode,
          // because the table has no validator service (row.currentData will be a Sample entity):
          // and when an error occur during save() this entities will be restore, and the sampleLabelPrefix will be shown
          // -> see issue #455 for details
          // TODO : Add the prefix to the TAG_ID a the last moment when the landing service save the data.
          //        Manage this beahviours by creating specific save option.
          sample = sample.clone();

          // Add the sample prefix
          sample.measurementValues[PmfmIds.TAG_ID] = sampleLabelPrefix + tagId;
        }
        return sample;
      });
    }

    if (data.trip) {
      const trip = data.trip as Trip;

      // Force trip.operations and trip.operationGroup as empty array (instead of undefined)
      // This is useful to avoid a unused fetch in the pod, after saving a landing
      if (!trip.operations) trip.operations = [];
      if (!trip.operationGroups) trip.operationGroups = [];
    }

    if (isNil(data.id) && isNotNil(data.observedLocationId)) {
      // Workaround (see issue IMAGINE-639 - Saisie de plusieurs espèces sur un même navire)
      await this.landingService.fixLandingTripDate(data);
    }

    return data;
  }

  async setValue(data: Landing): Promise<void> {
    if (!data) return; // Skip

    if (this.parent instanceof ObservedLocation && isNotNil(data.id)) {
      const recorderIsNotObserver = !(this.parent.observers && this.parent.observers.find((p) => p.equals(data.recorderPerson)));
      this.warning = recorderIsNotObserver ? 'LANDING.WARNING.NOT_OBSERVER_ERROR' : null;
    }

    const strategyLabel = data.measurementValues?.[PmfmIds.STRATEGY_LABEL.toString()];
    if (strategyLabel) {
      // Propagate strategy
      this.strategyLabel = strategyLabel;

      // Remove sample's TAG_ID prefix
      {
        const samplePrefix = strategyLabel + '-';
        let prefixCount = 0;
        console.info(`${this.logPrefix}Removing prefix '${samplePrefix}' in samples TAG_ID...`);
        (data.samples || []).map((sample) => {
          const tagId = sample.measurementValues?.[PmfmIds.TAG_ID];
          if (tagId?.startsWith(samplePrefix)) {
            sample.measurementValues[PmfmIds.TAG_ID] = tagId.substring(samplePrefix.length);
            prefixCount++;
          }
        });

        // Check if replacements has been done on every sample. If not, log a warning
        if (prefixCount > 0 && prefixCount !== data.samples.length) {
          const invalidTagIds = data.samples
            .map((sample) => sample.measurementValues?.[PmfmIds.TAG_ID])
            .filter((tagId) => !tagId || tagId.length > 4 || tagId.indexOf('-') !== -1);
          console.warn(`${this.logPrefix}${data.samples.length - prefixCount} samples found with a wrong prefix`, invalidTagIds);
        }
      }
    }

    // Apply the value into form and table
    await super.setValue(data);
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      icon: 'boat',
    };
  }

  protected computePageUrl(id: number | 'new') {
    const parentUrl = this.getParentPageUrl();
    return `${parentUrl}/sampling/${id}`;
  }

  protected registerSampleRowValidator(form: UntypedFormGroup, pmfms: DenormalizedPmfmStrategy[]): Subscription {
    console.debug(this.logPrefix + 'Adding row validator');

    return BiologicalSamplingValidators.addSampleValidators(form, pmfms, this.samplesTable.pmfmGroups || {}, {
      markForCheck: () => this.markForCheck(),
    });
  }

  protected async computeTitle(data: Landing): Promise<string> {
    const program = await firstNotNilPromise(this.program$, { stop: this.destroySubject });
    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = (i18nSuffix !== 'legacy' && i18nSuffix) || '';

    const titlePrefix =
      (this.parent &&
        this.parent instanceof ObservedLocation &&
        (await firstValueFrom(
          this.translate.get('LANDING.TITLE_PREFIX', {
            location: this.parent.location && (this.parent.location.name || this.parent.location.label),
            date: (this.parent.startDateTime && (this.dateFormat.transform(this.parent.startDateTime) as string)) || '',
          })
        ))) ||
      '';

    // new data
    if (!data || isNil(data.id)) {
      return titlePrefix + this.translate.instant(`LANDING.NEW.${i18nSuffix}TITLE`);
    }
    // Existing data
    const strategy = await firstNotNilPromise(this.strategy$, { stop: this.destroySubject });

    return (
      titlePrefix +
      this.translate.instant(`LANDING.EDIT.${i18nSuffix}TITLE`, {
        vessel: data.vesselSnapshot && (data.vesselSnapshot.registrationCode || data.vesselSnapshot.name),
        strategyLabel: strategy && strategy.label,
      })
    );
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }): boolean {
    const done = super.enable(opts);

    // Keep sample table disabled, when no effort
    if (done && this.noEffortError) {
      this.samplesTable.disable(opts);
    }
    return done;
  }
}
