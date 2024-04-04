var SamplingLandingPage_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, EventEmitter, Injector } from '@angular/core';
import { firstValueFrom, merge, mergeMap, of } from 'rxjs';
import { AcquisitionLevelCodes, ParameterLabelGroups, Parameters, PmfmIds } from '@app/referential/services/model/model.enum';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { AccountService, fadeInOutAnimation, firstNotNilPromise, isEmptyArray, isNil, isNotNil, isNotNilOrBlank, SharedValidators, } from '@sumaris-net/ngx-components';
import { BiologicalSamplingValidators } from './biological-sampling.validators';
import { LandingPage } from '../landing.page';
import { Landing } from '../landing.model';
import { ObservedLocation } from '../../observedlocation/observed-location.model';
import { SamplingStrategyService } from '@app/referential/services/sampling-strategy.service';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { LandingService } from '@app/trip/landing/landing.service';
import { Trip } from '@app/trip/trip/trip.model';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
import { Parameter } from '@app/referential/services/model/parameter.model';
let SamplingLandingPage = SamplingLandingPage_1 = class SamplingLandingPage extends LandingPage {
    constructor(injector, samplingStrategyService, pmfmService, accountService, landingService) {
        super(injector, {
            pathIdAttribute: 'samplingId',
            enableListenChanges: false,
        });
        this.samplingStrategyService = samplingStrategyService;
        this.pmfmService = pmfmService;
        this.accountService = accountService;
        this.landingService = landingService;
        this.onRefreshEffort = new EventEmitter();
        this.zeroEffortWarning = false;
        this.noEffortError = false;
        this.warning = null;
        this.ageFractions$ = this._state.select('ageFractions');
        this.i18nContext.suffix = 'SAMPLING.';
        this.fractionDisplayAttributes = this.settings.getFieldDisplayAttributes('fraction', ['name']);
    }
    ngOnInit() {
        super.ngOnInit();
        // Configure sample table
        this.samplesTable.defaultSortBy = PmfmIds.TAG_ID.toString(); // Change if referential ref is not ready (see ngAfterViewInit() )
        this.samplesTable.defaultSortDirection = 'asc';
        this._state.hold(this.strategy$.pipe(debounceTime(250)), (strategy) => this.checkStrategyEffort(strategy));
        this._state.connect('strategyLabel', merge(this.landingForm.strategyLabel$, this.landingForm.strategyChanges.pipe(map((s) => s === null || s === void 0 ? void 0 : s.label))).pipe(distinctUntilChanged(), filter(isNotNilOrBlank)));
        // Load age parameter ids
        this._state.connect('ageParameterIds', of(ParameterLabelGroups.AGE).pipe(mergeMap((parameterLabels) => this.referentialRefService.loadAllByLabels(parameterLabels, Parameter.ENTITY_NAME)), map((parameters) => parameters.map((p) => p.id))));
        // Load strategy's age fractions
        this._state.connect('ageFractions', this._state
            .select(['strategy', 'ageParameterIds'], (s) => s)
            .pipe(mergeMap(({ strategy, ageParameterIds }) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const ageFractionIds = ((strategy === null || strategy === void 0 ? void 0 : strategy.denormalizedPmfms) || [])
                .filter((pmfm) => isNotNil(pmfm.parameterId) && ageParameterIds.includes(pmfm.parameterId))
                .map((pmfm) => pmfm.fractionId);
            if (isEmptyArray(ageFractionIds))
                return [];
            const sortBy = ((_a = this.fractionDisplayAttributes) === null || _a === void 0 ? void 0 : _a[0]) || 'name';
            return this.referentialRefService.loadAllByIds(ageFractionIds, 'Fraction', sortBy, 'asc');
        }))));
    }
    ngAfterViewInit() {
        super.ngAfterViewInit();
        // Set sample table acquisition level
        this.samplesTable.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
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
    loadStrategy(strategyFilter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(this.logPrefix + 'Loading strategy, using filter:', strategyFilter);
            return this.strategyRefService.loadByFilter(strategyFilter, {
                failIfMissing: true,
                fullLoad: true,
                debug: this.debug,
            });
        });
    }
    updateViewState(data, opts) {
        super.updateViewState(data);
        // Update tabs state (show/hide)
        this.updateTabsState(data);
    }
    updateTabsState(data) {
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
    setStrategy(strategy) {
        const _super = Object.create(null, {
            setStrategy: { get: () => super.setStrategy }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.setStrategy.call(this, strategy);
            this.onRefreshEffort.emit(strategy);
        });
    }
    checkStrategyEffort(strategy) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            strategy = strategy || ((_a = this.landingForm.strategyControl) === null || _a === void 0 ? void 0 : _a.value);
            try {
                const [program] = yield Promise.all([
                    firstNotNilPromise(this.program$, { stop: this.destroySubject }),
                    this.landingForm.waitIdle({ stop: this.destroySubject }),
                ]);
                if (strategy === null || strategy === void 0 ? void 0 : strategy.label) {
                    const dateTime = (this.landingForm.showDateTime && this.data.dateTime) ||
                        (this.parent instanceof Trip && this.parent.departureDateTime) ||
                        (this.parent instanceof ObservedLocation && this.parent.startDateTime);
                    // If no date (e.g. no parent selected yet) : skip
                    if (!dateTime) {
                        // DEBUG
                        console.debug('[sampling-landing-page] Skip strategy effort loaded: no date (no parent entity)');
                        return;
                    }
                    // Add validator errors on expected effort for this sampleRow (issue #175)
                    const strategyEffort = yield this.samplingStrategyService.loadStrategyEffortByDate(program.label, strategy.label, dateTime, {
                        // Not need realized effort (issue #492)
                        withRealized: false,
                    });
                    // DEBUG
                    console.debug('[sampling-landing-page] Strategy effort loaded: ', strategyEffort);
                    // No effort defined
                    if (!strategyEffort) {
                        this.noEffortError = true;
                        this.samplesTable.disable();
                        this.zeroEffortWarning = false;
                        this.landingForm.strategyControl.setErrors({ noEffort: true });
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
                const error = (err === null || err === void 0 ? void 0 : err.message) || err;
                console.error('[sampling-landing-page] Error while checking strategy effort', err);
                this.setError(error);
            }
            finally {
                this.markForCheck();
            }
        });
    }
    onEntityLoaded(data, options) {
        const _super = Object.create(null, {
            onEntityLoaded: { get: () => super.onEntityLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            //console.debug('Calling onEntityLoaded', data);
            yield _super.onEntityLoaded.call(this, data, options);
        });
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let data = yield _super.getValue.call(this);
            // Convert into entity
            data = Landing.fromObject(data);
            // Compute final TAG_ID, using the strategy label
            const strategyLabel = (_a = data.measurementValues) === null || _a === void 0 ? void 0 : _a[PmfmIds.STRATEGY_LABEL];
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
                const trip = data.trip;
                // Force trip.operations and trip.operationGroup as empty array (instead of undefined)
                // This is useful to avoid a unused fetch in the pod, after saving a landing
                if (!trip.operations)
                    trip.operations = [];
                if (!trip.operationGroups)
                    trip.operationGroups = [];
            }
            if (isNil(data.id) && isNotNil(data.observedLocationId)) {
                // Workaround (see issue IMAGINE-639 - Saisie de plusieurs espèces sur un même navire)
                yield this.landingService.fixLandingTripDate(data);
            }
            return data;
        });
    }
    setValue(data) {
        const _super = Object.create(null, {
            setValue: { get: () => super.setValue }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                return; // Skip
            if (this.parent instanceof ObservedLocation && isNotNil(data.id)) {
                const recorderIsNotObserver = !(this.parent.observers && this.parent.observers.find((p) => p.equals(data.recorderPerson)));
                this.warning = recorderIsNotObserver ? 'LANDING.WARNING.NOT_OBSERVER_ERROR' : null;
            }
            const strategyLabel = (_a = data.measurementValues) === null || _a === void 0 ? void 0 : _a[PmfmIds.STRATEGY_LABEL.toString()];
            if (strategyLabel) {
                // Propagate strategy
                this.strategyLabel = strategyLabel;
                // Remove sample's TAG_ID prefix
                {
                    const samplePrefix = strategyLabel + '-';
                    let prefixCount = 0;
                    console.info(`[sampling-landing-page] Removing prefix '${samplePrefix}' in samples TAG_ID...`);
                    (data.samples || []).map((sample) => {
                        var _a;
                        const tagId = (_a = sample.measurementValues) === null || _a === void 0 ? void 0 : _a[PmfmIds.TAG_ID];
                        if (tagId === null || tagId === void 0 ? void 0 : tagId.startsWith(samplePrefix)) {
                            sample.measurementValues[PmfmIds.TAG_ID] = tagId.substring(samplePrefix.length);
                            prefixCount++;
                        }
                    });
                    // Check if replacements has been done on every sample. If not, log a warning
                    if (prefixCount > 0 && prefixCount !== data.samples.length) {
                        const invalidTagIds = data.samples
                            .map((sample) => { var _a; return (_a = sample.measurementValues) === null || _a === void 0 ? void 0 : _a[PmfmIds.TAG_ID]; })
                            .filter((tagId) => !tagId || tagId.length > 4 || tagId.indexOf('-') !== -1);
                        console.warn(`[sampling-landing-page] ${data.samples.length - prefixCount} samples found with a wrong prefix`, invalidTagIds);
                    }
                }
            }
            // Apply the value into form and table
            yield _super.setValue.call(this, data);
        });
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { icon: 'boat' });
        });
    }
    computePageUrl(id) {
        const parentUrl = this.getParentPageUrl();
        return `${parentUrl}/sampling/${id}`;
    }
    registerSampleRowValidator(form, pmfms) {
        console.debug('[sampling-landing-page] Adding row validator');
        return BiologicalSamplingValidators.addSampleValidators(form, pmfms, this.samplesTable.pmfmGroups || {}, {
            markForCheck: () => this.markForCheck(),
        });
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = yield firstNotNilPromise(this.program$, { stop: this.destroySubject });
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = (i18nSuffix !== 'legacy' && i18nSuffix) || '';
            const titlePrefix = (this.parent &&
                this.parent instanceof ObservedLocation &&
                (yield firstValueFrom(this.translate.get('LANDING.TITLE_PREFIX', {
                    location: this.parent.location && (this.parent.location.name || this.parent.location.label),
                    date: (this.parent.startDateTime && this.dateFormat.transform(this.parent.startDateTime)) || '',
                })))) ||
                '';
            // new data
            if (!data || isNil(data.id)) {
                return titlePrefix + this.translate.instant(`LANDING.NEW.${i18nSuffix}TITLE`);
            }
            // Existing data
            const strategy = yield firstNotNilPromise(this.strategy$, { stop: this.destroySubject });
            return (titlePrefix +
                this.translate.instant(`LANDING.EDIT.${i18nSuffix}TITLE`, {
                    vessel: data.vesselSnapshot && (data.vesselSnapshot.registrationCode || data.vesselSnapshot.name),
                    strategyLabel: strategy && strategy.label,
                }));
        });
    }
    enable(opts) {
        const done = super.enable(opts);
        // Keep sample table disabled, when no effort
        if (done && this.noEffortError) {
            this.samplesTable.disable(opts);
        }
        return done;
    }
};
SamplingLandingPage = SamplingLandingPage_1 = __decorate([
    Component({
        selector: 'app-sampling-landing-page',
        templateUrl: './sampling-landing.page.html',
        styleUrls: ['./sampling-landing.page.scss'],
        providers: [{ provide: APP_DATA_ENTITY_EDITOR, useExisting: SamplingLandingPage_1 }],
        animations: [fadeInOutAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        SamplingStrategyService,
        PmfmService,
        AccountService,
        LandingService])
], SamplingLandingPage);
export { SamplingLandingPage };
//# sourceMappingURL=sampling-landing.page.js.map