import {AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Injector, OnInit} from '@angular/core';
import {UntypedFormGroup, ValidationErrors} from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import {DenormalizedPmfmStrategy} from '@app/referential/services/model/pmfm-strategy.model';
import { AcquisitionLevelCodes, ParameterLabelGroups, PmfmIds, SampleParameterLabelsGroups } from '@app/referential/services/model/model.enum';
import {PmfmService} from '@app/referential/services/pmfm.service';
import {
  AccountService,
  EntityServiceLoadOptions,
  fadeInOutAnimation,
  firstNotNilPromise,
  HistoryPageReference,
  isNil,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService, ReferentialUtils,
  SharedValidators
} from '@sumaris-net/ngx-components';
import {BiologicalSamplingValidators} from './biological-sampling.validators';
import {LandingPage} from '../landing.page';
import {Landing} from '../landing.model';
import {ObservedLocation} from '../../observedlocation/observed-location.model';
import {SamplingStrategyService} from '@app/referential/services/sampling-strategy.service';
import {Strategy} from '@app/referential/services/model/strategy.model';
import {ProgramProperties} from '@app/referential/services/config/program.config';
import {LandingService} from '@app/trip/landing/landing.service';
import {Trip} from '@app/trip/trip/trip.model';
import {Program} from '@app/referential/services/model/program.model';
import {debounceTime} from 'rxjs/operators';


@Component({
  selector: 'app-sampling-landing-page',
  templateUrl: './sampling-landing.page.html',
  styleUrls: ['./sampling-landing.page.scss'],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplingLandingPage extends LandingPage implements AfterViewInit {


  onRefreshEffort = new EventEmitter<any>()
  zeroEffortWarning = false;
  noEffortError = false;
  warning: string = null;
  canDelete = false;

  constructor(
    injector: Injector,
    protected samplingStrategyService: SamplingStrategyService,
    protected pmfmService: PmfmService,
    protected accountService: AccountService,
    protected landingService: LandingService,
  ) {
    super(injector, {
      pathIdAttribute: 'samplingId',
      autoOpenNextTab: !injector.get(LocalSettingsService).mobile,
      enableListenChanges: false
    });
    this.i18nContext.suffix = 'SAMPLING.';
  }

  ngOnInit() {
    super.ngOnInit();

    // Configure sample table
    this.samplesTable.defaultSortBy = PmfmIds.TAG_ID.toString(); // Change if referential ref is not ready (see ngAfterViewInit() )
    this.samplesTable.defaultSortDirection = 'asc';

    this.registerSubscription(
      this.onRefreshEffort.pipe(
        debounceTime(250)
      )
      .subscribe(strategy => this.checkStrategyEffort(strategy))
    );
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    // Set sample table acquisition level
    this.samplesTable.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;

    // Wait referential ready (before reading enumerations)
    this.referentialRefService.ready()
      // Load Pmfm groups
      .then(() => this.pmfmService.loadIdsGroupByParameterLabels(SampleParameterLabelsGroups))
      .then(pmfmGroups => {
        // Configure sample table
        this.samplesTable.defaultSortBy = PmfmIds.TAG_ID.toString();
        this.samplesTable.computedPmfmGroups = ParameterLabelGroups.AGE;
        this.samplesTable.pmfmIdsToCopy = [PmfmIds.DRESSING];
        this.samplesTable.pmfmGroups = pmfmGroups;
      });
  }

  /* -- protected functions -- */

  protected async setProgram(program: Program): Promise<void> {
    return super.setProgram(program);
  }

  updateViewState(data: Landing, opts?: {onlySelf?: boolean; emitEvent?: boolean}) {
    super.updateViewState(data);

    // Update tabs state (show/hide)
    this.updateTabsState(data);

    this.canDelete = this.canUserDelete(data);
  }

  updateTabsState(data: Landing) {
    // Enable landings tab
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

  canUserDelete(data: Landing, opts?: any): boolean {
    const canWrite = this.canUserWrite(data);
    if (canWrite) return true;

    // Observers can delete - https://youtrack.ifremer.fr/issue/IMAGINE-632
    const currentPerson = this.accountService.person;
    if (isNil(this.data.validationDate) && isNil(this.parent?.validationDate)) {
      const isObserver = (data?.observers || [])
        .concat(this.parent?.observers || [])
        .some(observer => ReferentialUtils.equals(currentPerson, observer))
      if (isObserver) return true;
    }

    return false;
  }

  protected async setStrategy(strategy: Strategy) {
    await super.setStrategy(strategy);

    this.onRefreshEffort.emit(strategy);
  }

  protected async checkStrategyEffort(strategy?: Strategy) {

    strategy = strategy || this.landingForm.strategyControl?.value;

    try {
      const [program] = await Promise.all([
        firstNotNilPromise(this.$program, {stop: this.destroySubject}),
        this.landingForm.waitIdle({stop: this.destroySubject})
      ]);

      if (strategy?.label) {
        const dateTime = (this.landingForm.showDateTime && this.data.dateTime)
          || (this.parent instanceof Trip && this.parent.departureDateTime)
          || (this.parent instanceof ObservedLocation && this.parent.startDateTime);

        // If no date (e.g. no parent selected yet) : skip
        if (!dateTime) {
          // DEBUG
          console.debug('[sampling-landing-page] Skip strategy effort loaded: no date (no parent entity)');
          return;
        }

        // Add validator errors on expected effort for this sampleRow (issue #175)
        const strategyEffort = await this.samplingStrategyService.loadStrategyEffortByDate(program.label, strategy.label, dateTime);

        // DEBUG
        console.debug('[sampling-landing-page] Strategy effort loaded: ', strategyEffort);

        // No effort defined
        if (!strategyEffort) {
          this.noEffortError = true;
          this.samplesTable.disable();
          this.zeroEffortWarning = false;
          this.landingForm.strategyControl.setErrors(<ValidationErrors>{noEffort: true});
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
      }
      else if (this.enabled) {
        this.samplesTable.enable();
      }
    }
    catch (err) {
      const error = err?.message || err;
      console.error('[sampling-landing-page] Error while checking strategy effort', err);
      this.setError(error);
    }
    finally {
      this.markForCheck();
    }
  }

  protected async onNewEntity(data: Landing, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onNewEntity(data, options);

    // By default, set location to parent location
    if (this.parent instanceof ObservedLocation) {
      this.landingForm.form.get('location').patchValue(data.location);
    }
    else if (this.parent instanceof Trip) {
      data.trip = this.parent;
    }
  }

  protected async onEntityLoaded(data: Landing, options?: EntityServiceLoadOptions): Promise<void> {
    //console.debug('Calling onEntityLoaded', data);
    await super.onEntityLoaded(data, options);

  }

  protected async getValue(): Promise<Landing> {
    let data = await super.getValue();

    // Convert into entity
    data = Landing.fromObject(data);

    // Compute final TAG_ID, using the strategy label
    const strategyLabel = data.measurementValues?.[PmfmIds.STRATEGY_LABEL];
    if (isNotNilOrBlank(strategyLabel)) {
      const sampleLabelPrefix = strategyLabel + '-';
      (data.samples || []).forEach(sample => {
        const tagId = sample.measurementValues[PmfmIds.TAG_ID];
        if (tagId && !tagId.startsWith(sampleLabelPrefix)) {
          sample.measurementValues[PmfmIds.TAG_ID] = sampleLabelPrefix + tagId;
        }
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

  protected async setValue(data: Landing): Promise<void> {
    if (!data) return; // Skip

    const strategyLabel = data.measurementValues?.[PmfmIds.STRATEGY_LABEL.toString()]
    if (strategyLabel) {
      this.$strategyLabel.next(strategyLabel);
    }

    if (this.parent instanceof ObservedLocation && isNotNil(data.id)) {
      const recorderIsNotObserver = !(this.parent.observers && this.parent.observers.find(p => p.equals(data.recorderPerson)));
      this.warning = recorderIsNotObserver ? 'LANDING.WARNING.NOT_OBSERVER_ERROR' : null;
    }

    // Remove sample's TAG_ID prefix
    if (strategyLabel) {
      const samplePrefix = strategyLabel + '-';
      let prefixCount = 0;
      console.info(`[sampling-landing-page] Removing prefix '${samplePrefix}' in samples TAG_ID...`);
      (data.samples || []).map(sample => {
        const tagId = sample.measurementValues?.[PmfmIds.TAG_ID];
        if (tagId?.startsWith(samplePrefix)) {
          sample.measurementValues[PmfmIds.TAG_ID] = tagId.substring(samplePrefix.length);
          prefixCount++;
        }
      });
      // Check if replacements has been done on every sample. If not, log a warning
      if (prefixCount > 0 && prefixCount !== data.samples.length) {
        const invalidTagIds = data.samples.map(sample => sample.measurementValues?.[PmfmIds.TAG_ID])
          .filter(tagId => !tagId || tagId.length > 4 || tagId.indexOf('-') !== -1);
        console.warn(`[sampling-landing-page] ${data.samples.length - prefixCount} samples found with a wrong prefix`, invalidTagIds);
      }
    }

    await super.setValue(data);
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ... (await super.computePageHistory(title)),
      icon: 'boat'
    };
  }

  protected computePageUrl(id: number|'new') {
    const parentUrl = this.getParentPageUrl();
    return `${parentUrl}/sampling/${id}`;
  }

  protected registerSampleRowValidator(form: UntypedFormGroup, pmfms: DenormalizedPmfmStrategy[]): Subscription {
    console.debug('[sampling-landing-page] Adding row validator');

    return BiologicalSamplingValidators.addSampleValidators(form, pmfms, this.samplesTable.pmfmGroups || {}, {
      markForCheck: () => this.markForCheck()
    });
  }

  protected async computeTitle(data: Landing): Promise<string> {

    const program = await firstNotNilPromise(this.$program, {stop: this.destroySubject});
    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' && i18nSuffix || '';

    const titlePrefix = this.parent && (this.parent instanceof ObservedLocation) &&
      await firstValueFrom(this.translate.get('LANDING.TITLE_PREFIX', {
        location: (this.parent.location && (this.parent.location.name || this.parent.location.label)),
        date: this.parent.startDateTime && this.dateFormat.transform(this.parent.startDateTime) as string || ''
      })) || '';

    // new data
    if (!data || isNil(data.id)) {
      return titlePrefix + this.translate.instant(`LANDING.NEW.${i18nSuffix}TITLE`);
    }
    // Existing data
    const strategy = await firstNotNilPromise(this.$strategy, {stop: this.destroySubject});

    return titlePrefix + this.translate.instant(`LANDING.EDIT.${i18nSuffix}TITLE`, {
      vessel: data.vesselSnapshot && (data.vesselSnapshot.registrationCode || data.vesselSnapshot.name),
      strategyLabel: strategy && strategy.label
    });
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
