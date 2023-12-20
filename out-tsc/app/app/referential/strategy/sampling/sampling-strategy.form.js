import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppForm, AppFormUtils, DateUtils, DEFAULT_PLACEHOLDER_CHAR, EntityUtils, firstArrayValue, firstNotNilPromise, FormArrayHelper, fromDateISOString, isEmptyArray, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, LocalSettingsService, ReferentialRef, ReferentialUtils, removeDuplicatesFromArray, SharedValidators, StatusIds, suggestFromArray, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { PmfmStrategy } from '../../services/model/pmfm-strategy.model';
import { Program } from '../../services/model/program.model';
import { AppliedPeriod, AppliedStrategy, StrategyDepartment, TaxonNameStrategy } from '../../services/model/strategy.model';
import { ReferentialRefService } from '../../services/referential-ref.service';
import { StrategyService } from '../../services/strategy.service';
import { StrategyValidatorService } from '../../services/validator/strategy.validator';
import { AcquisitionLevelCodes, autoCompleteFractions, FractionIdGroups, LocationLevelGroups, LocationLevelIds, ParameterLabelGroups, PmfmIds, ProgramPrivilegeIds, TaxonomicLevelIds, } from '../../services/model/model.enum';
import { ProgramProperties } from '../../services/config/program.config';
import { BehaviorSubject, merge } from 'rxjs';
import { PmfmService } from '../../services/pmfm.service';
import { SamplingStrategy } from '@app/referential/services/model/sampling-strategy.model';
import { TaxonNameRef, TaxonUtils } from '@app/referential/services/model/taxon-name.model';
import { TaxonNameService } from '@app/referential/services/taxon-name.service';
import { PmfmStrategyValidatorService } from '@app/referential/services/validator/pmfm-strategy.validator';
import { Pmfm } from '@app/referential/services/model/pmfm.model';
import { filter, map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { TaxonNameRefService } from '@app/referential/services/taxon-name-ref.service';
import moment from 'moment';
import { Parameter } from '@app/referential/services/model/parameter.model';
const MIN_PMFM_COUNT = 2;
const STRATEGY_LABEL_UI_PREFIX_REGEXP = new RegExp(/^\d\d [a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z] ___$/);
const STRATEGY_LABEL_UI_REGEXP = new RegExp(/^\d\d [a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z] \d\d\d$/);
let SamplingStrategyForm = class SamplingStrategyForm extends AppForm {
    constructor(injector, validatorService, referentialRefService, pmfmService, strategyService, settings, taxonNameService, taxonNameRefService, pmfmStrategyValidator, cd, formBuilder) {
        super(injector, validatorService.getFormGroup());
        this.validatorService = validatorService;
        this.referentialRefService = referentialRefService;
        this.pmfmService = pmfmService;
        this.strategyService = strategyService;
        this.settings = settings;
        this.taxonNameService = taxonNameService;
        this.taxonNameRefService = taxonNameRefService;
        this.pmfmStrategyValidator = pmfmStrategyValidator;
        this.cd = cd;
        this.formBuilder = formBuilder;
        this._$pmfmGroups = new BehaviorSubject(null);
        this.initJobs = [];
        this.$program = new BehaviorSubject(null);
        this.labelMask = [/\d/, /\d/, ' ', /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, ' ', /\d/, /\d/, /\d/];
        this.hasEffort = false;
        this.autocompleteFilters = {
            analyticReference: false,
            location: false,
            taxonName: false,
            department: false,
            // Pmfms
            lengthPmfm: false,
            weightPmfm: false,
            maturityPmfm: false,
            fractionPmfm: false
        };
        this.showError = true;
        this.i18nFieldPrefix = 'PROGRAM.STRATEGY.EDIT.';
        this.placeholderChar = DEFAULT_PLACEHOLDER_CHAR;
        this.$filteredAnalyticsReferences = new BehaviorSubject(null);
        this.$filteredLocations = new BehaviorSubject(null);
        this.$filteredDepartments = new BehaviorSubject(null);
        this.$filteredTaxonNames = new BehaviorSubject(null);
        this.$filteredLengthPmfms = new BehaviorSubject(null);
        this.$filteredWeightPmfms = new BehaviorSubject(null);
        this.$filteredMaturityPmfms = new BehaviorSubject(null);
        this.$filteredFractionPmfms = new BehaviorSubject(null);
        this.$allFractions = new BehaviorSubject(null);
        this.selectInputContent = AppFormUtils.selectInputContent;
        this.mobile = this.settings.mobile;
        this.debug = !environment.production;
        // Add missing control
        this.form.addControl('year', this.formBuilder.control(null, Validators.required));
        this.form.addControl('sex', this.formBuilder.control(null, Validators.required));
        this.form.addControl('age', this.formBuilder.control(null, Validators.required));
        // Init array helpers
        this.initDepartmentsHelper();
        this.initTaxonNameHelper();
        this.initAppliedStrategiesHelper();
        this.initAppliedPeriodHelper();
        this.initPmfmStrategiesHelpers();
        // Start loading items
        this.loadReferentialItems();
    }
    get value() {
        throw new Error('Not implemented! Please use getValue() instead, that is an async function');
    }
    get pmfmGroups() {
        return this._$pmfmGroups.getValue();
    }
    set pmfmGroups(value) {
        this._$pmfmGroups.next(value);
    }
    set program(value) {
        this.setProgram(value);
    }
    get program() {
        return this.$program.getValue();
    }
    get hasSex() {
        return this.form.get('sex').value;
    }
    get hasAge() {
        return this.form.get('age').value;
    }
    get appliedStrategiesForm() {
        return this.form.controls.appliedStrategies;
    }
    get appliedStrategyForm() {
        return this.appliedStrategiesHelper && this.appliedStrategiesHelper.at(0);
    }
    get appliedPeriodsForm() {
        const appliedStrategyForm = this.appliedStrategyForm;
        return appliedStrategyForm && appliedStrategyForm.controls.appliedPeriods;
    }
    get departmentsFormArray() {
        return this.form.controls.departments;
    }
    get taxonNamesFormArray() {
        return this.form.controls.taxonNames;
    }
    get pmfmsForm() {
        return this.form.controls.pmfms;
    }
    get minPmfmCount() {
        return MIN_PMFM_COUNT;
    }
    get lengthPmfmsForm() {
        return this.form.controls.lengthPmfms;
    }
    get weightPmfmsForm() {
        return this.form.controls.weightPmfms;
    }
    get maturityPmfmsForm() {
        return this.form.controls.maturityPmfms;
    }
    get fractionPmfmsForm() {
        return this.form.controls.fractionPmfms;
    }
    get taxonNameStrategyControl() {
        var _a;
        return (_a = this.taxonNamesHelper) === null || _a === void 0 ? void 0 : _a.at(0);
    }
    get touched() {
        return this.form.touched;
    }
    get untouched() {
        return this.form.untouched;
    }
    enable(opts) {
        super.enable(opts);
        if (this.hasEffort) {
            this.taxonNamesFormArray.disable();
            this.appliedStrategiesForm.disable();
            this.lengthPmfmsForm.disable();
            this.weightPmfmsForm.disable();
            this.maturityPmfmsForm.disable();
            const form = this.form;
            form.get('analyticReference').disable();
            form.get('year').disable();
            form.get('label').disable();
            form.get('age').disable();
            form.get('sex').disable();
            // Allow user to update efforts, even past quarters - Fix issue OBSBIO-48
            this.appliedPeriodsForm.controls.map(control => {
                const formGroupControl = control;
                formGroupControl.enable();
            });
        }
    }
    disable(opts) {
        super.disable(opts);
        // FIXME fractions not disabled
        this.fractionPmfmsHelper.disable();
    }
    ngOnInit() {
        super.ngOnInit();
        this.registerSubscription(this.form.get('age').valueChanges
            .pipe(filter(() => this.loaded))
            .subscribe(hasAge => {
            if (hasAge) {
                this.loadFraction();
                this.fractionPmfmsForm.enable();
            }
            else {
                this.fractionPmfmsForm.disable();
            }
        }));
        this.taxonNamesFormArray.setAsyncValidators((_) => __awaiter(this, void 0, void 0, function* () {
            this.loadFraction();
            return null;
        }));
        const dbTimeZone = this.strategyService.dbTimeZone;
        this.appliedPeriodsForm.setAsyncValidators([
            (control) => __awaiter(this, void 0, void 0, function* () {
                const appliedPeriodsForm = this.appliedPeriodsForm;
                if (this.loading || appliedPeriodsForm.disabled)
                    return;
                const minLength = 1;
                const appliedPeriods = control.controls;
                if (!isEmptyArray(appliedPeriods)) {
                    const values = appliedPeriods.filter(appliedPeriod => toNumber(appliedPeriod.value.acquisitionNumber, 0) >= 1);
                    if (!isEmptyArray(values) && values.length >= minLength) {
                        SharedValidators.clearError(control, 'minLength');
                        return null;
                    }
                }
                if (this.form.touched)
                    appliedPeriodsForm.markAllAsTouched();
                if (this.form.dirty)
                    appliedPeriodsForm.markAsDirty();
                return { minLength: { minLength } };
            }),
            // Check quarter acquisitionNumber is not
            (control) => __awaiter(this, void 0, void 0, function* () {
                const appliedPeriodsForm = this.appliedPeriodsForm;
                if (this.loading || appliedPeriodsForm.disabled)
                    return;
                const appliedPeriods = control.value;
                const invalidQuarters = (appliedPeriods || [])
                    .map(AppliedPeriod.fromObject)
                    .filter(period => {
                    const quarter = period.startDate.tz(dbTimeZone).quarter();
                    const quarterEffort = this.data && this.data.effortByQuarter && this.data.effortByQuarter[quarter];
                    return quarterEffort && quarterEffort.hasRealizedEffort && (isNil(period.acquisitionNumber) || period.acquisitionNumber < 0);
                }).map(period => period.startDate.tz(dbTimeZone).quarter());
                if (isNotEmptyArray(invalidQuarters)) {
                    if (this.form.touched)
                        appliedPeriodsForm.markAllAsTouched();
                    if (this.form.dirty)
                        appliedPeriodsForm.markAsDirty();
                    return { hasRealizedEffort: { quarters: invalidQuarters } };
                }
                SharedValidators.clearError(control, 'hasRealizedEffort');
                return null;
            })
        ]);
        this.appliedPeriodsForm.setErrors({ minLength: true });
        const pmfmValidator = (_) => this.validatePmfmsForm();
        this.pmfmsForm.setAsyncValidators(pmfmValidator);
        this.lengthPmfmsForm.setAsyncValidators(pmfmValidator);
        this.weightPmfmsForm.setAsyncValidators(pmfmValidator);
        this.maturityPmfmsForm.setAsyncValidators(pmfmValidator);
        this.fractionPmfmsForm.setAsyncValidators(pmfmValidator);
        // Force pmfms validation, when sex/age changes
        this.registerSubscription(merge(this.form.get('sex').valueChanges, this.form.get('age').valueChanges)
            .pipe(filter(() => !this.loading && !this.disabled && !this.disableEditionListeners))
            .subscribe(() => {
            this.pmfmsForm.updateValueAndValidity();
            this.validatePmfmsForm();
        }));
        this.registerSubscription(this.form.get('label').valueChanges
            .pipe(filter(() => !this.loading && !this.disabled && !this.disableEditionListeners))
            .subscribe(label => this.onStrategyLabelChanged(label)));
        this.registerSubscription(merge(this.form.get('year').valueChanges.pipe(map(_ => 'year')), this.taxonNameStrategyControl.valueChanges.pipe(map(_ => 'taxonName')))
            .pipe(filter(() => !this.loading && !this.disabled && !this.disableEditionListeners))
            .subscribe(event => this.generateLabelPrefix(event)));
        const idControl = this.form.get('id');
        this.form.get('label').setAsyncValidators((control) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.untouched)
                return;
            const programId = (_a = this.program) === null || _a === void 0 ? void 0 : _a.id;
            if (isNil(programId))
                return; // Skip
            const label = control.value;
            const parts = label.split(' ');
            if (parts.some(str => str.indexOf('_') !== -1)) {
                return { required: true };
            }
            if (label.includes('000')) {
                return { zero: true };
            }
            console.debug('[sampling-strategy-form] Checking of label is unique...');
            const exists = yield this.strategyService.existsByLabel(label, {
                programId,
                excludedIds: isNotNil(idControl.value) ? [idControl.value] : undefined,
                fetchPolicy: 'network-only' // Force to check remotely
            });
            if (exists) {
                console.warn('[sampling-strategy-form] Label not unique!');
                return { unique: true };
            }
            console.debug('[sampling-strategy-form] Checking of label is unique [OK]');
            SharedValidators.clearError(control, 'unique');
            SharedValidators.clearError(control, 'zero');
        }));
        // taxonName autocomplete
        this.registerAutocompleteField('taxonName', {
            suggestFn: (value, filter) => this.suggestTaxonName(value, Object.assign(Object.assign({}, filter), { searchAttribute: 'name', statusIds: [StatusIds.ENABLE], levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES] })),
            attributes: ['name'],
            columnNames: ['REFERENTIAL.NAME'],
            mobile: this.mobile
        });
        // Department autocomplete
        this.registerAutocompleteField('department', {
            suggestFn: (value, filter) => this.suggestDepartments(value, Object.assign(Object.assign({}, filter), { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY] })),
            columnSizes: [4, 8],
            mobile: this.mobile
        });
        // appliedStrategy autocomplete
        this.registerAutocompleteField('location', {
            suggestFn: (value, filter) => this.suggestLocations(value, Object.assign(Object.assign({}, filter), { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY], levelIds: LocationLevelGroups.FISHING_AREA })),
            mobile: this.mobile
        });
        // Analytic reference autocomplete
        this.registerAutocompleteField('analyticReference', {
            suggestFn: (value, filter) => this.suggestAnalyticReferences(value, Object.assign(Object.assign({}, filter), { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY] })),
            columnSizes: [4, 8],
            mobile: this.mobile
        });
        // length PMFM autocomplete
        this.registerAutocompleteField('lengthPmfm', {
            // suggestFn: (value, filter) => this.suggestLengthPmfms(value, {
            suggestFn: (value, filter) => this.suggestLengthPmfms(value, Object.assign(Object.assign({}, filter), { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY], levelLabels: ParameterLabelGroups.LENGTH })),
            attributes: ['name', 'unit.label', 'matrix.name', 'fraction.name', 'method.name'],
            columnNames: ['REFERENTIAL.NAME', 'REFERENTIAL.PMFM.UNIT', 'REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD'],
            mobile: this.mobile
        });
        // appliedStrategy autocomplete
        this.registerAutocompleteField('weightPmfm', {
            suggestFn: (value, filter) => this.suggestWeightPmfms(value, Object.assign(Object.assign({}, filter), { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY], levelLabels: ParameterLabelGroups.WEIGHT })),
            attributes: ['name', 'unit.label', 'matrix.name', 'fraction.name', 'method.name'],
            columnNames: ['REFERENTIAL.NAME', 'REFERENTIAL.PMFM.UNIT', 'REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD'],
            mobile: this.mobile
        });
        // appliedStrategy autocomplete
        this.registerAutocompleteField('maturityPmfm', {
            suggestFn: (value, filter) => this.suggestMaturityPmfms(value, Object.assign(Object.assign({}, filter), { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY], levelLabels: ParameterLabelGroups.MATURITY })),
            attributes: ['name', 'unit.label', 'matrix.name', 'fraction.name', 'method.name'],
            columnNames: ['REFERENTIAL.NAME', 'REFERENTIAL.PMFM.UNIT', 'REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD'],
            mobile: this.mobile
        });
        // Fraction autocomplete
        this.registerAutocompleteField('fractionPmfm', {
            suggestFn: (value, filter) => this.suggestFractionPmfms(value, Object.assign(Object.assign({}, filter), { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY], includedIds: FractionIdGroups.CALCIFIED_STRUCTURE })),
            attributes: ['name'],
            columnNames: ['REFERENTIAL.NAME'],
            mobile: this.mobile
        });
    }
    setDisableEditionListeners(disable) {
        this.disableEditionListeners = disable;
    }
    setProgram(program, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (program && this.program !== program) {
                this.i18nFieldPrefix = 'PROGRAM.STRATEGY.EDIT.';
                const i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX) || '';
                this.i18nFieldPrefix += i18nSuffix !== 'legacy' && i18nSuffix || '';
                // Get location level ids
                this.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.STRATEGY_EDITOR_LOCATION_LEVEL_IDS);
                // Load items from historical data
                this.loadFilteredItems(program);
                this.$program.next(program);
                if (!opts || opts.emitEvent !== false) {
                    this.markForCheck();
                }
            }
        });
    }
    ready() {
        const _super = Object.create(null, {
            ready: { get: () => super.ready }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ready.call(this);
            yield Promise.all([
                firstNotNilPromise(this.$allFractions),
                firstNotNilPromise(this._$pmfmGroups)
            ]);
        });
    }
    loadFraction() {
        var _a;
        const taxonNameStrategies = this.hasAge && this.taxonNamesFormArray.value;
        if (isNotEmptyArray(taxonNameStrategies) && ((_a = taxonNameStrategies[0]) === null || _a === void 0 ? void 0 : _a.taxonName)) {
            const taxonNameStrategy = taxonNameStrategies[0];
            const fractionName = autoCompleteFractions[taxonNameStrategy.taxonName.id];
            if (fractionName) {
                const fraction = this.$allFractions.value.find(f => f.label.toUpperCase() === fractionName.toUpperCase());
                this.fractionPmfmsForm.patchValue([{ fraction }]);
            }
        }
    }
    loadReferentialItems() {
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure all enumerations has been override, by config
            yield this.referentialRefService.ready();
            try {
                console.debug('[sampling-strategy-form] Loading referential items...');
                yield Promise.all([
                    this.referentialRefService.loadAll(0, 1000, null, null, {
                        entityName: 'Fraction',
                        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
                        includedIds: FractionIdGroups.CALCIFIED_STRUCTURE
                    })
                        .then(({ data }) => this.$allFractions.next(data)),
                    // Load pmfm by parameter groups
                    this.pmfmService.loadIdsGroupByParameterLabels()
                        .then(pmfmGroups => {
                        if (this.debug)
                            console.debug('[sampling-strategy-form] Pmfm groups loaded: ', pmfmGroups);
                        this._$pmfmGroups.next(pmfmGroups);
                    })
                ]);
            }
            catch (err) {
                console.error('Error while loading referential items', err);
            }
        });
    }
    loadFilteredItems(program) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get load options, from program properties
            const autoEnableFilter = program.getPropertyAsBoolean(ProgramProperties.STRATEGY_EDITOR_PREDOC_ENABLE);
            const fetchSize = program.getPropertyAsInt(ProgramProperties.STRATEGY_EDITOR_PREDOC_FETCH_SIZE);
            const now = Date.now();
            console.info(`[sampling-strategy-form] Loading filtered items... {autoEnableFilter: ${autoEnableFilter}, fetchSize: ${fetchSize}}`);
            yield Promise.all([
                // Analytic References
                this.strategyService.loadStrategiesReferentials(program.id, 'AnalyticReference', undefined, 0, fetchSize)
                    .then((analyticReferences) => {
                    analyticReferences = removeDuplicatesFromArray(analyticReferences, 'id');
                    this.$filteredAnalyticsReferences.next(analyticReferences);
                    this.autocompleteFilters.analyticReference = autoEnableFilter && isNotEmptyArray(analyticReferences); // Enable filtering, if need by program
                })
                    .catch(err => {
                    console.debug('[sampling-strategy-form] Error while loading filtered analyticReferences: ', err);
                    this.autocompleteFilters.analyticReference = false;
                }),
                // Departments
                this.strategyService.loadStrategiesReferentials(program.id, 'Department', undefined, 0, fetchSize)
                    .then((departments) => {
                    this.$filteredDepartments.next(departments);
                    this.autocompleteFilters.department = autoEnableFilter && isNotEmptyArray(departments); // Enable filtering, if need by program
                })
                    .catch(err => {
                    console.debug('[sampling-strategy-form] Error while loading filtered departments: ', err);
                    this.autocompleteFilters.department = false;
                }),
                // Locations
                this.strategyService.loadStrategiesReferentials(program.id, 'Location', 'SEA', 0, fetchSize)
                    .then(locations => {
                    this.$filteredLocations.next(locations);
                    this.autocompleteFilters.location = autoEnableFilter && isNotEmptyArray(locations); // Enable filtering, if need by program
                })
                    .catch(err => {
                    console.debug('[sampling-strategy-form] Error while loading filtered locations: ', err);
                    this.autocompleteFilters.location = false;
                }),
                // Taxons
                this.strategyService.loadStrategiesReferentials(program.id, 'TaxonName', undefined, 0, fetchSize)
                    .then(taxons => {
                    this.$filteredTaxonNames.next(taxons);
                    this.autocompleteFilters.taxonName = autoEnableFilter && isNotEmptyArray(taxons); // Enable filtering, if need by program
                })
                    .catch(err => {
                    console.debug('[sampling-strategy-form] Error while loading filtered taxonNames: ', err);
                    this.autocompleteFilters.taxonName = false;
                }),
                // Length pmfms
                /*this.strategyService.loadStrategiesReferentials(program.id, 'Pmfm', undefined, 0, fetchSize, 'name')
                  .then(lengthPmfms => {
                    this.$filteredLengthPmfms.next(lengthPmfms);
                    this.autocompleteFilters.lengthPmfm = isNotEmptyArray(lengthPmfms) && autoEnableFilter; // Enable filtering, if need by program
                  }),
          
                // Weight pmfms
                this.strategyService.loadStrategiesReferentials(program.id, 'Pmfm', undefined, 0, fetchSize, 'name')
                  .then(weightPmfms => {
                    this.$filteredWeightPmfms.next(weightPmfms);
                    this.autocompleteFilters.weightPmfm = isNotEmptyArray(weightPmfms) && autoEnableFilter; // Enable filtering, if need by program
                  }),
          
                // Maturity pmfms
                this.strategyService.loadStrategiesReferentials(program.id, 'Pmfm', undefined, 0, fetchSize, 'name')
                  .then(maturityPmfms => {
                    this.$filteredMaturityPmfms.next(maturityPmfms);
                    this.autocompleteFilters.maturityPmfm = isNotEmptyArray(maturityPmfms) && autoEnableFilter; // Enable filtering, if need by program
                  }),*/
                // Fractions pmfm
                this.strategyService.loadStrategiesReferentials(program.id, 'Fraction', undefined, 0, fetchSize)
                    .then((fractions) => {
                    this.$filteredFractionPmfms.next(fractions);
                    this.autocompleteFilters.fractionPmfm = autoEnableFilter && isNotEmptyArray(fractions); // Enable filtering, if need by program
                })
                    .catch(err => {
                    console.debug('[sampling-strategy-form] Error while loading filtered fractions: ', err);
                    this.autocompleteFilters.fractionPmfm = false;
                })
            ]);
            console.info(`[sampling-strategy-form] Loading filtered items [OK] in ${Date.now() - now}ms`);
            this.markForCheck();
        });
    }
    getAnalyticReferenceByLabel(label) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(label))
                return undefined;
            try {
                const res = yield this.strategyService.loadAllAnalyticReferences(0, 1, 'label', 'desc', { label });
                return firstArrayValue(res && res.data || []);
            }
            catch (err) {
                console.debug('Error on load AnalyticReference');
            }
        });
    }
    removeAppliedStrategies(index) {
        // first element AND more than one element
        // this.appliedPeriodsForm.controls become empty array
        let appliedPeriodsFormControls = null;
        if (index === 0 && this.appliedStrategiesHelper.size() > 1) {
            appliedPeriodsFormControls = this.appliedPeriodsForm.controls;
        }
        this.appliedStrategiesHelper.removeAt(index);
        if (index === 0) {
            if (appliedPeriodsFormControls) {
                this.appliedPeriodsForm.controls = appliedPeriodsFormControls;
            }
        }
    }
    /**
     * Select text that can be changed, using the text mask
     *
     * @param input
     */
    selectMask(input) {
        if (!this.labelMask)
            input.select();
        const taxonNameControl = this.taxonNamesHelper.at(0);
        const endIndex = this.labelMask.length;
        if (taxonNameControl.hasError('cannotComputeTaxonCode') || taxonNameControl.hasError('uniqueTaxonCode')) {
            input.setSelectionRange(3, endIndex, 'backward');
        }
        else {
            input.setSelectionRange(11, endIndex, 'backward');
        }
    }
    toggleFilter(fieldName, field) {
        this.autocompleteFilters[fieldName] = !this.autocompleteFilters[fieldName];
        this.markForCheck();
        if (field)
            field.reloadItems();
    }
    /**
     * Suggest autocomplete values
     *
     * @param value
     * @param filter - filters to apply
     */
    suggestDepartments(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
            const newValue = currentControlValue ? '*' : value;
            // Excluded existing locations, BUT keep the current control value
            const excludedIds = (this.departmentsFormArray.value || [])
                .map(pmfmDepartment => pmfmDepartment === null || pmfmDepartment === void 0 ? void 0 : pmfmDepartment.department)
                .filter(ReferentialUtils.isNotEmpty)
                .filter(item => !currentControlValue || currentControlValue !== item)
                .map(item => parseInt(item.id));
            if (this.autocompleteFilters.department) {
                return suggestFromArray(this.$filteredDepartments.getValue(), newValue, Object.assign(Object.assign({}, filter), { excludedIds }));
            }
            else {
                return this.referentialRefService.suggest(newValue, Object.assign(Object.assign({}, filter), { excludedIds, entityName: 'Department' }));
            }
        });
    }
    suggestTaxonName(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.autocompleteFilters.taxonName) {
                return suggestFromArray(this.$filteredTaxonNames.getValue(), value, filter);
            }
            else {
                return this.taxonNameRefService.suggest(value, filter);
            }
        });
    }
    /**
     * Suggest autocomplete values
     *
     * @param value
     * @param filter - filters to apply
     */
    suggestLocations(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = Object.assign({ levelIds: this.locationLevelIds || [LocationLevelIds.DIVISION_ICES] }, filter);
            // DEBUG
            //console.debug("Suggest locations: ", filter);
            if (this.autocompleteFilters.location) {
                return suggestFromArray(this.$filteredLocations.getValue(), value, filter);
            }
            else {
                return this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { entityName: 'Location' }));
            }
        });
    }
    /**
     * Suggest autocomplete values
     *
     * @param value
     * @param filter - filters to apply
     */
    suggestAnalyticReferences(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.autocompleteFilters.analyticReference) {
                return suggestFromArray(this.$filteredAnalyticsReferences.getValue(), value, filter);
            }
            else {
                return this.strategyService.suggestAnalyticReferences(value, filter);
            }
        });
    }
    /**
     * Suggest autocomplete values, for length pmfms
     *
     * @param value
     * @param filter - filters to apply
     */
    suggestLengthPmfms(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
            const newValue = currentControlValue ? '*' : value;
            // Excluded existing locations, BUT keep the current control value
            const excludedIds = (this.lengthPmfmsForm.value || [])
                .map(ps => ps === null || ps === void 0 ? void 0 : ps.pmfm)
                .filter(ReferentialUtils.isNotEmpty)
                .filter(item => !currentControlValue || currentControlValue !== item)
                .map(item => parseInt(item.id));
            if (this.autocompleteFilters.lengthPmfm) {
                return suggestFromArray(this.$filteredLengthPmfms.value, value, Object.assign(Object.assign({}, filter), { excludedIds }));
            }
            else {
                return this.pmfmService.suggest(newValue, Object.assign(Object.assign({}, filter), { excludedIds, entityName: Pmfm.ENTITY_NAME }), 'name');
            }
        });
    }
    /**
     * Suggest autocomplete values, for weight pmfms
     *
     * @param value
     * @param filter - filters to apply
     */
    suggestWeightPmfms(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
            const newValue = currentControlValue ? '*' : value;
            // Excluded existing locations, BUT keep the current control value
            const excludedIds = (this.weightPmfmsForm.value || [])
                .map(ps => ps === null || ps === void 0 ? void 0 : ps.pmfm)
                .filter(ReferentialUtils.isNotEmpty)
                .filter(item => !currentControlValue || currentControlValue !== item)
                .map(item => parseInt(item.id));
            if (this.autocompleteFilters.weightPmfm) {
                return suggestFromArray(this.$filteredWeightPmfms.value, value, Object.assign(Object.assign({}, filter), { excludedIds }));
            }
            else {
                return this.pmfmService.suggest(newValue, Object.assign(Object.assign({}, filter), { excludedIds, entityName: Pmfm.ENTITY_NAME }), 'name');
            }
        });
    }
    /**
     * Suggest autocomplete values, for maturity pmfms
     *
     * @param value
     * @param filter - filters to apply
     */
    suggestMaturityPmfms(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
            const newValue = currentControlValue ? '*' : value;
            // Excluded existing locations, BUT keep the current control value
            const excludedIds = (this.maturityPmfmsForm.value || [])
                .map(ps => ps === null || ps === void 0 ? void 0 : ps.pmfm)
                .filter(ReferentialUtils.isNotEmpty)
                .filter(item => !currentControlValue || currentControlValue !== item)
                .map(item => parseInt(item.id));
            if (this.autocompleteFilters.maturityPmfm) {
                return suggestFromArray(this.$filteredMaturityPmfms.value, value, filter);
            }
            else {
                return this.pmfmService.suggest(newValue, Object.assign(Object.assign({}, filter), { excludedIds, entityName: Pmfm.ENTITY_NAME }), 'name');
            }
        });
    }
    /**
     * Suggest autocomplete values, for age fraction
     *
     * @param value
     * @param filter - filters to apply
     */
    suggestFractionPmfms(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
            const newValue = currentControlValue ? '*' : value;
            // Excluded existing locations, BUT keep the current control value
            const excludedIds = (this.fractionPmfmsForm.value || [])
                .map(ps => ps === null || ps === void 0 ? void 0 : ps.fraction)
                .filter(ReferentialUtils.isNotEmpty)
                .filter(item => !currentControlValue || currentControlValue !== item)
                .map(item => parseInt(item.id));
            if (this.autocompleteFilters.fractionPmfm) {
                return suggestFromArray(this.$filteredFractionPmfms.value, newValue, Object.assign(Object.assign({}, filter), { excludedIds }));
            }
            else {
                const items = yield firstNotNilPromise(this.$allFractions);
                return suggestFromArray(items, newValue, Object.assign(Object.assign({}, filter), { excludedIds }));
            }
        });
    }
    setValue(data, opts) {
        const _super = Object.create(null, {
            setValue: { get: () => super.setValue }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sampling-strategy-form] Setting Strategy value', data);
            if (!data)
                return;
            this.markAsLoading();
            try {
                const isNew = isNil(data.id);
                this.data = SamplingStrategy.fromObject(data);
                // Fill efforts (need by validator)
                this.hasEffort = this.data.hasRealizedEffort;
                // Make sure to have (at least) one department
                data.departments = data.departments && data.departments.length ? data.departments : [null];
                // Resize strategy department array
                this.departmentsHelper.resize(Math.max(1, data.departments.length));
                data.appliedStrategies = isNotEmptyArray(data.appliedStrategies) ? data.appliedStrategies : [new AppliedStrategy()];
                // Resize strategy department array
                this.appliedStrategiesHelper.resize(Math.max(1, data.appliedStrategies.length));
                data.taxonNames = data.taxonNames && data.taxonNames.length ? data.taxonNames : [null];
                // Resize pmfm strategy array
                this.taxonNamesHelper.resize(Math.max(1, data.taxonNames.length));
                // APPLIED_PERIODS
                // get model appliedPeriods which are stored in first applied strategy
                const dbTimeZone = this.strategyService.dbTimeZone;
                const appliedStrategyWithPeriods = firstArrayValue((data.appliedStrategies || []).filter(as => as && isNotEmptyArray(as.appliedPeriods)))
                    || firstArrayValue(data.appliedStrategies || []);
                const appliedPeriods = appliedStrategyWithPeriods.appliedPeriods || [];
                // Find year, from applied period, or use current
                const year = firstArrayValue(appliedPeriods.map(ap => ap.startDate.tz(dbTimeZone).year())) || DateUtils.moment().year();
                // format periods for applied period in view and init default period by quarter if no set
                appliedStrategyWithPeriods.appliedPeriods = [1, 2, 3, 4].map(quarter => {
                    const startMonth = (quarter - 1) * 3 + 1;
                    // INFO CLT : #IMAGINE-643 [Ligne de plan] Décalage heure de début et de fin des efforts
                    // We use local timezone for Imagine instead of utc
                    const startDate = fromDateISOString(`${year}-${startMonth.toString().padStart(2, '0')}-01T00:00:00.000`).tz(dbTimeZone);
                    const endDate = startDate.clone().add(2, 'month').endOf('month').endOf('day');
                    // Find the existing entity, or create a new one
                    const appliedPeriod = appliedPeriods && appliedPeriods.find(period => period.startDate.month() === startDate.month())
                        || AppliedPeriod.fromObject({ acquisitionNumber: undefined });
                    appliedPeriod.startDate = startDate;
                    appliedPeriod.endDate = endDate;
                    return appliedPeriod;
                });
                // Resize applied periods array
                this.appliedPeriodsHelper.resize(4);
                // Get first period
                const firstAppliedPeriod = firstArrayValue(appliedStrategyWithPeriods.appliedPeriods);
                data.year = firstAppliedPeriod ? firstAppliedPeriod.startDate : moment();
                data.pmfms = data.pmfms || [];
                // If new
                if (isNew) {
                    // pmfms = [null, null];
                    data.sex = null;
                    data.age = null;
                }
                else {
                    data.label = ((_a = data.label) === null || _a === void 0 ? void 0 : _a.length) === 12
                        ? data.label.substring(0, 2).concat(' ').concat(data.label.substring(2, 9)).concat(' ').concat(data.label.substring(9, 12))
                        : data.label;
                    data.age = data.pmfms.some(p => { var _a; return ((_a = p.parameter) === null || _a === void 0 ? void 0 : _a.label) && ParameterLabelGroups.AGE.includes(p.parameter.label); });
                    data.sex = data.pmfms.some(p => p.pmfmId && p.pmfmId === PmfmIds.SEX);
                    console.debug('[sampling-strategy-form] Has sex ?', data.sex, PmfmIds.SEX);
                }
                const pmfmGroups = yield firstNotNilPromise(this._$pmfmGroups, { stop: this.destroySubject });
                data.lengthPmfms = this.getPmfmStrategiesByGroup(data.pmfms, pmfmGroups.LENGTH, ParameterLabelGroups.LENGTH);
                data.weightPmfms = this.getPmfmStrategiesByGroup(data.pmfms, pmfmGroups.WEIGHT, ParameterLabelGroups.WEIGHT);
                data.maturityPmfms = this.getPmfmStrategiesByGroup(data.pmfms, pmfmGroups.MATURITY, ParameterLabelGroups.MATURITY);
                data.fractionPmfms = (data.pmfms || [])
                    .filter(p => p.fraction && !p.pmfm)
                    .map(ps => {
                    ps.fraction = this.$allFractions.value.find(fraction => fraction.id === ps.fraction.id);
                    return ps;
                });
                // Min size = 1
                if (isEmptyArray(data.lengthPmfms))
                    data.lengthPmfms = [new PmfmStrategy()];
                if (isEmptyArray(data.weightPmfms))
                    data.weightPmfms = [new PmfmStrategy()];
                if (isEmptyArray(data.maturityPmfms))
                    data.maturityPmfms = [new PmfmStrategy()];
                if (isEmptyArray(data.fractionPmfms))
                    data.fractionPmfms = [new PmfmStrategy()];
                this.lengthPmfmsHelper.resize(Math.max(1, data.lengthPmfms.length));
                this.weightPmfmsHelper.resize(Math.max(1, data.weightPmfms.length));
                this.maturityPmfmsHelper.resize(Math.max(1, data.maturityPmfms.length));
                this.fractionPmfmsHelper.resize(Math.max(1, data.fractionPmfms.length));
                yield _super.setValue.call(this, data, opts);
            }
            catch (err) {
                this.error = err && err.message || err;
                console.error(err);
            }
            finally {
                this.markAsPristine();
                this.markAsLoaded();
            }
        });
    }
    getValue() {
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            console.debug('[sampling-strategy-form] getValue()');
            const json = this.form.getRawValue();
            const target = SamplingStrategy.fromObject(json);
            target.name = target.label || target.name;
            target.label = target.label || target.name;
            target.description = target.label || target.description;
            target.analyticReference = target.analyticReference && EntityUtils.isNotEmpty(target.analyticReference, 'label') ?
                target.analyticReference['label'] :
                EntityUtils.isNotEmpty(this.form.get('analyticReference').value, 'label') ?
                    this.form.get('analyticReference').value.label :
                    this.form.get('analyticReference').value;
            // get taxonName and
            target.taxonNames = (this.form.controls.taxonNames.value || []).map(TaxonNameStrategy.fromObject);
            target.taxonNames.forEach(taxonNameStrategy => {
                delete taxonNameStrategy.strategyId; // Not need when saved
                taxonNameStrategy.priorityLevel = taxonNameStrategy.priorityLevel || 1;
                taxonNameStrategy.taxonName = TaxonNameRef.fromObject(Object.assign(Object.assign({}, taxonNameStrategy.taxonName), { taxonGroupIds: undefined }));
            });
            // Apply observer privilege to departments
            const observerPrivilege = ReferentialRef.fromObject({ id: ProgramPrivilegeIds.OBSERVER, entityName: 'ProgramPrivilege' });
            target.departments = (target.departments || []).map(StrategyDepartment.fromObject);
            target.departments.forEach(department => {
                department.privilege = observerPrivilege;
            });
            // Compute year
            const dbTimeZone = this.strategyService.dbTimeZone;
            const year = isNotNil(this.form.controls.year.value) ? DateUtils.moment(this.form.controls.year.value).tz(dbTimeZone).year() : DateUtils.moment().year();
            // Fishing Area + Efforts --------------------------------------------------------------------------------------------
            const appliedStrategyWithPeriods = firstArrayValue((target.appliedStrategies || []).filter(as => isNotEmptyArray(as.appliedPeriods)));
            if (appliedStrategyWithPeriods) {
                appliedStrategyWithPeriods.appliedPeriods = (appliedStrategyWithPeriods && appliedStrategyWithPeriods.appliedPeriods || [])
                    // Exclude period without acquisition number
                    .filter(period => isNotNil(period.acquisitionNumber))
                    .map(ap => {
                    // Set year (a quarter should be already set)
                    ap.startDate.tz(dbTimeZone).set('year', year);
                    ap.endDate.tz(dbTimeZone).set('year', year);
                    ap.appliedStrategyId = appliedStrategyWithPeriods.id;
                    return ap;
                });
                // Clean periods, on each other applied strategies
                (target.appliedStrategies || [])
                    .filter(as => as !== appliedStrategyWithPeriods)
                    .forEach(appliedStrategy => appliedStrategy.appliedPeriods = []);
            }
            // PMFM + Fractions -------------------------------------------------------------------------------------------------
            let pmfmStrategies = [
                // Add tag id Pmfm
                { pmfmId: PmfmIds.TAG_ID, isMandatory: false, id: this.getPmfmStrategyIdByPmfmId(PmfmIds.TAG_ID) },
                // Add dressing Pmfm
                { pmfmId: PmfmIds.DRESSING, isMandatory: true, id: this.getPmfmStrategyIdByPmfmId(PmfmIds.DRESSING) },
                // Weight
                ...target.weightPmfms,
                // Length
                ...target.lengthPmfms
            ];
            // Add SEX Pmfm
            if (target.sex) {
                pmfmStrategies = pmfmStrategies.concat([
                    { pmfmId: PmfmIds.SEX, id: this.getPmfmStrategyIdByPmfmId(PmfmIds.SEX) },
                    ...target.maturityPmfms
                ]);
            }
            // Add AGE + fraction Pmfms
            if (target.age) {
                // Load AGE parameter
                const ageParameter = yield this.referentialRefService.loadByLabel(ParameterLabelGroups.AGE[0], Parameter.ENTITY_NAME);
                target.fractionPmfms.forEach(ps => ps.parameter = ageParameter);
                pmfmStrategies = pmfmStrategies.concat(...target.fractionPmfms);
            }
            // Fill PmfmStrategy defaults
            let rankOrder = 1;
            target.pmfms = pmfmStrategies
                .filter(isNotNil)
                .map(PmfmStrategy.fromObject)
                .map(pmfmStrategy => {
                pmfmStrategy.strategyId = pmfmStrategy.id;
                pmfmStrategy.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
                pmfmStrategy.acquisitionNumber = 1;
                pmfmStrategy.isMandatory = toBoolean(pmfmStrategy.isMandatory, false);
                pmfmStrategy.rankOrder = rankOrder++;
                return pmfmStrategy;
            })
                // Remove if empty
                .filter(p => isNotNil(p.pmfmId) || isNotNil(p.pmfm) || isNotNil(p.parameter) || isNotNil(p.matrix) || isNotNil(p.fraction) || isNotNil(p.method));
            return target;
        });
    }
    getPmfmStrategyIdByPmfmId(pmfmId) {
        var _a, _b;
        return ((_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.pmfms.find(ps => ps.pmfmId === pmfmId)) === null || _b === void 0 ? void 0 : _b.id) || undefined;
    }
    onStrategyLabelChanged(label) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disableEditionListeners || this.loading)
                return;
            const labelControl = this.form.get('label');
            label = label || labelControl.value;
            if (isNilOrBlank(label))
                return; // Skip is empty
            const taxonNameStrategyControl = this.taxonNameStrategyControl;
            const taxonCode = label.substring(3, 10);
            const taxonName = (_a = taxonNameStrategyControl === null || taxonNameStrategyControl === void 0 ? void 0 : taxonNameStrategyControl.value) === null || _a === void 0 ? void 0 : _a.taxonName;
            // Only prefix has been set
            if (label.match(STRATEGY_LABEL_UI_PREFIX_REGEXP)) {
                const isUnique = yield this.isTaxonNameUnique(taxonCode, taxonName === null || taxonName === void 0 ? void 0 : taxonName.id);
                if (!isUnique) {
                    taxonNameStrategyControl.setErrors({ uniqueTaxonCode: true });
                }
                else {
                    SharedValidators.clearError(taxonNameStrategyControl, 'uniqueTaxonCode');
                }
                labelControl.setErrors({ pattern: true });
            }
            // Full label filled
            else if (label.match(STRATEGY_LABEL_UI_REGEXP)) {
                const isUnique = yield this.isTaxonNameUnique(taxonCode, taxonName === null || taxonName === void 0 ? void 0 : taxonName.id);
                if (!isUnique) {
                    //taxonNameControl.setErrors({ uniqueTaxonCode: true });
                }
                else {
                    SharedValidators.clearError(taxonNameStrategyControl, 'uniqueTaxonCode');
                    labelControl.setValue(label === null || label === void 0 ? void 0 : label.replace(/\s/g, '').toUpperCase(), { emitEvent: false });
                }
            }
        });
    }
    isTaxonNameUnique(label, currentViewTaxonId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(label))
                return true;
            const taxonNameFilter = {
                searchAttribute: 'name',
                excludedIds: [currentViewTaxonId],
                statusIds: [StatusIds.ENABLE],
                levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES],
                withSynonyms: false
            };
            const [first, second] = yield Promise.all([
                // Try without parenthesis
                this.taxonNameService.countAll(Object.assign(Object.assign({}, taxonNameFilter), { searchText: TaxonUtils.generateNameSearchPatternFromLabel(label, false) })),
                // Try WITH parenthesis
                this.taxonNameService.countAll(Object.assign(Object.assign({}, taxonNameFilter), { searchText: TaxonUtils.generateNameSearchPatternFromLabel(label, true) }))
            ]);
            return (first + second) === 0;
        });
    }
    generateLabelPrefix(event) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return __awaiter(this, void 0, void 0, function* () {
            const labelControl = this.form.get('label');
            if (this.loading || labelControl.disabled)
                return; // Skip
            if (this.debug)
                console.debug('[sampling-strategy-fom] Generating label prefix, from event: ' + event);
            const yearCode = this.yearCode;
            if (isNilOrBlank(yearCode) || !this.program)
                return; // Skip
            let errors;
            const taxonNameStrategyControl = this.taxonNameStrategyControl;
            if (!taxonNameStrategyControl)
                return;
            const currentViewTaxon = (_a = taxonNameStrategyControl.value) === null || _a === void 0 ? void 0 : _a.taxonName;
            const currentViewTaxonName = (_c = (_b = taxonNameStrategyControl.value) === null || _b === void 0 ? void 0 : _b.taxonName) === null || _c === void 0 ? void 0 : _c.name;
            const storedDataTaxonName = (_e = (_d = this.data.taxonNames[0]) === null || _d === void 0 ? void 0 : _d.taxonName) === null || _e === void 0 ? void 0 : _e.name;
            const taxonCode = currentViewTaxonName && TaxonUtils.generateLabelFromName(currentViewTaxonName);
            const isUnique = yield this.isTaxonNameUnique(taxonCode, currentViewTaxon === null || currentViewTaxon === void 0 ? void 0 : currentViewTaxon.id);
            const formRawValue = this.form.getRawValue();
            const previousFormTaxonName = (_h = (_g = (_f = formRawValue.taxonNames[0]) === null || _f === void 0 ? void 0 : _f.taxonName) === null || _g === void 0 ? void 0 : _g.name) === null || _h === void 0 ? void 0 : _h.clone;
            const previousFormYear = (_j = fromDateISOString(formRawValue.year)) === null || _j === void 0 ? void 0 : _j.format('YY');
            if (!taxonCode) {
                errors = { cannotComputeTaxonCode: true };
            }
            else if (!isUnique) {
                errors = { uniqueTaxonCode: true };
            }
            // Skip generate label when there is no update on year or taxon
            if (currentViewTaxonName && currentViewTaxonName === previousFormTaxonName && yearCode && yearCode === previousFormYear)
                return;
            // Update label mask
            // @ts-ignore
            this.labelMask = yearCode.split('')
                .concat([' ', /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, ' ', /\d/, /\d/, /\d/]);
            if (errors) {
                // if (this.data.label && this.data.label.substring(0, 2) === yearMask && this.data.label.substring(2, 9) === labelControl.value.toUpperCase().substring(2, 9)) {
                //   labelControl.setValue(this.data.label);
                // } else {
                const computedLabel = `${yearCode} `;
                if (!taxonNameStrategyControl.errors) {
                    if ((this.data.label && this.data.label === labelControl.value) && (storedDataTaxonName && storedDataTaxonName === currentViewTaxonName)) {
                        // When function is called back after save, we do nothing
                    }
                    else {
                        labelControl.setValue(computedLabel);
                    }
                }
                taxonNameStrategyControl.setErrors(errors);
                // }
            }
            else {
                //const computedLabel = this.program && (await this.strategyService.computeNextLabel(this.program.id, `${yearMask}${label}`, 3));
                SharedValidators.clearError(taxonNameStrategyControl, 'cannotComputeTaxonCode');
                //console.info('[sampling-strategy-form] Computed label: ' + computedLabel);
                //labelControl.setValue(computedLabel);
                // if current date and taxon code are same than stored data, set stored data
                const formTaxonCode = (_k = labelControl.value) === null || _k === void 0 ? void 0 : _k.replace(/\s/g, '').toUpperCase().substring(2, 9);
                if (this.data.label && this.data.label.substring(0, 2) === yearCode && this.data.label.substring(2, 9) === formTaxonCode && formTaxonCode === taxonCode) {
                    // Complete label with '___' when increment isn't set in order to throw a warning in validator
                    if (this.data.label.length === 9) {
                        labelControl.setValue(this.data.label + '___');
                    }
                    else {
                        labelControl.setValue(this.data.label);
                    }
                }
                else {
                    // Complete label with '___' when increment isn't set in order to throw a warning in validator
                    labelControl.setValue(`${yearCode} ${taxonCode} ___`);
                }
            }
            labelControl.markAsDirty();
        });
    }
    get canGenerateLabel() {
        var _a;
        return !this.hasEffort && !this.loading && this.program && this.year && ((_a = this.taxonNameStrategyControl.value) === null || _a === void 0 ? void 0 : _a.taxonName) && true;
    }
    generateLabelIncrement() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return; // Skip
            const yearCode = this.yearCode;
            const programId = (_a = this.program) === null || _a === void 0 ? void 0 : _a.id;
            if (isNilOrBlank(yearCode) || isNil(programId))
                return; // Skip
            // Get label, or computed from label
            const labelControl = this.form.get('label');
            const taxonNameStrategyControl = this.taxonNameStrategyControl;
            let inputLabel = labelControl.value;
            inputLabel = inputLabel && inputLabel.replace(/\s/g, '').toUpperCase();
            let taxonCode = inputLabel && inputLabel.substring(2, 9);
            // No taxon code
            if (isNilOrBlank(taxonCode)) {
                const taxonName = (_b = taxonNameStrategyControl.value) === null || _b === void 0 ? void 0 : _b.taxonName;
                if (taxonName) {
                    taxonCode = TaxonUtils.generateLabelFromName(taxonName.name);
                    if (!taxonCode) {
                        taxonNameStrategyControl.setErrors({ cannotComputeTaxonCode: true });
                        return;
                    }
                    const isUnique = yield this.isTaxonNameUnique(taxonCode, taxonName.id);
                    if (!isUnique) {
                        taxonNameStrategyControl.setErrors({ uniqueTaxonCode: true });
                        return;
                    }
                }
            }
            SharedValidators.clearError(taxonNameStrategyControl, 'uniqueTaxonCode');
            SharedValidators.clearError(taxonNameStrategyControl, 'cannotComputeTaxonCode');
            const labelPrefix = yearCode + taxonCode.toUpperCase();
            const label = yield this.strategyService.computeNextLabel(programId, labelPrefix, 3);
            labelControl.setValue(label);
        });
    }
    // TaxonName Helper -----------------------------------------------------------------------------------------------
    initTaxonNameHelper() {
        // appliedStrategies => appliedStrategies.location ?
        this.taxonNamesHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'taxonNames'), (ts) => this.validatorService.getTaxonNameStrategyControl(ts), (t1, t2) => EntityUtils.equals(t1.taxonName, t2.taxonName, 'name'), value => isNil(value) && isNil(value.taxonName), {
            allowEmptyArray: false
        });
        // Create at least one fishing Area
        if (this.taxonNamesHelper.size() === 0) {
            this.taxonNamesHelper.resize(1);
        }
    }
    // appliedStrategies Helper -----------------------------------------------------------------------------------------------
    initAppliedStrategiesHelper() {
        // appliedStrategiesHelper formControl can't have common validator since quarters efforts are optional
        this.appliedStrategiesHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'appliedStrategies'), (appliedStrategy) => this.validatorService.getAppliedStrategiesControl(appliedStrategy), (s1, s2) => EntityUtils.equals(s1.location, s2.location, 'label'), value => isNil(value) && isNil(value.location), {
            allowEmptyArray: false
        });
        // Create at least one fishing Area
        if (this.appliedStrategiesHelper.size() === 0) {
            this.appliedStrategiesHelper.resize(1);
        }
    }
    addAppliedStrategy() {
        this.appliedStrategiesHelper.add(new AppliedStrategy());
    }
    addLengthPmfm() {
        this.lengthPmfmsHelper.add(new PmfmStrategy());
    }
    addWeightPmfm() {
        this.weightPmfmsHelper.add(new PmfmStrategy());
    }
    addMaturityPmfm() {
        this.maturityPmfmsHelper.add(new PmfmStrategy());
    }
    removeLengthPmfm(idx) {
        this.lengthPmfmsHelper.removeAt(idx);
        this.validatePmfmsForm();
    }
    removeWeightPmfm(idx) {
        this.weightPmfmsHelper.removeAt(idx);
        this.validatePmfmsForm();
    }
    removeMaturityPmfm(idx) {
        this.maturityPmfmsHelper.removeAt(idx);
        this.validatePmfmsForm();
    }
    // appliedStrategies Helper -----------------------------------------------------------------------------------------------
    initAppliedPeriodHelper() {
        // Use the first applied strategy form group (created just before)
        const appliedStrategyForm = this.appliedStrategiesHelper.at(0);
        // appliedStrategyForm formControl can't have common validator since quarters efforts are optional
        this.appliedPeriodsHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, appliedStrategyForm, 'appliedPeriods'), (appliedPeriod) => this.validatorService.getAppliedPeriodsControl(appliedPeriod), (p1, p2) => EntityUtils.equals(p1, p2, 'startDate'), value => isNil(value), {
            allowEmptyArray: false,
            validators: [
            // this.requiredPeriodMinLength(1)
            ]
        });
        // Create at least one fishing Area
        if (this.appliedStrategiesHelper.size() === 0) {
            this.departmentsHelper.resize(1);
        }
    }
    // Laboratory Helper -----------------------------------------------------------------------------------------------
    initDepartmentsHelper() {
        this.departmentsHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'departments'), (department) => this.validatorService.getStrategyDepartmentsControl(department), (d1, d2) => EntityUtils.equals(d1.department, d2.department, 'label'), value => isNil(value) && isNil(value.department), {
            allowEmptyArray: false
        });
        // Create at least one laboratory
        if (this.departmentsHelper.size() === 0) {
            this.departmentsHelper.resize(1);
        }
    }
    addDepartment() {
        this.departmentsHelper.add(new StrategyDepartment());
    }
    initPmfmStrategiesHelpers() {
        this.pmfmsHelper = this.createPmfmStrategiesArrayHelper('pmfms', 0);
        this.lengthPmfmsHelper = this.createPmfmStrategiesArrayHelper('lengthPmfms', 1);
        this.weightPmfmsHelper = this.createPmfmStrategiesArrayHelper('weightPmfms', 1);
        this.maturityPmfmsHelper = this.createPmfmStrategiesArrayHelper('maturityPmfms', 1);
        this.fractionPmfmsHelper = this.createPmfmStrategiesArrayHelper('fractionPmfms', 1);
    }
    createPmfmStrategiesArrayHelper(arrayName, minSize) {
        const helper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, arrayName), (data) => this.pmfmStrategyValidator.getFormGroup(data, { withDetails: false, required: false }), PmfmStrategy.equals, PmfmStrategy.isEmpty, {
            allowEmptyArray: false
        });
        // Create at least one fishing Area
        if (minSize && helper.size() < minSize) {
            helper.resize(minSize);
        }
        return helper;
    }
    addPmfmFraction() {
        this.fractionPmfmsHelper.add();
    }
    markForCheck() {
        if (this.cd)
            this.cd.markForCheck();
    }
    // Get the year
    get year() {
        const value = this.form.get('year').value;
        // Value is stored in database in utc, we need to get local timezone moment in order to get year
        const localTimeZoneDate = moment.utc(value).local();
        const year = localTimeZoneDate && +(localTimeZoneDate.format('YYYY'));
        // Skip if too old
        if (year >= 1970)
            return year;
        return undefined;
    }
    // Get year, as string (last 2 digits)
    get yearCode() {
        const year = this.year;
        if (year >= 1970) {
            return year.toString().substring(2);
        }
        return undefined;
    }
    requiredPeriodMinLength(minLength) {
        minLength = minLength || 1;
        return (array) => {
            const values = array.value.flat().filter(period => period.acquisitionNumber !== undefined && period.acquisitionNumber !== null && period.acquisitionNumber >= 1);
            if (!values || values.length < minLength) {
                return { minLength: { minLength } };
            }
            return null;
        };
    }
    isDepartmentDisable(index) {
        return this.departmentsHelper.at(index).status === 'DISABLED';
    }
    isLocationDisable(index) {
        return this.appliedStrategiesHelper.at(index).status === 'DISABLED' || this.hasEffort;
    }
    isFractionDisable(index) {
        return this.fractionPmfmsHelper.at(index).status === 'DISABLED';
    }
    isLengthPmfmDisable(index) {
        return this.lengthPmfmsHelper.at(index).status === 'DISABLED';
    }
    isWeightPmfmDisable(index) {
        return this.weightPmfmsHelper.at(index).status === 'DISABLED';
    }
    isMaturityPmfmDisable(index) {
        return this.maturityPmfmsHelper.at(index).status === 'DISABLED';
    }
    markAsDirty() {
        this.form.markAsDirty();
    }
    /**
     * get pmfm by type
     *
     * @param pmfms
     * @param pmfmIds
     * @param parameterLabels
     * @protected
     */
    getPmfmStrategiesByGroup(pmfms, pmfmIds, parameterLabels) {
        return (pmfms || []).filter(p => {
            if (p) {
                const pmfm = p.pmfm;
                const pmfmId = toNumber(p.pmfmId, pmfm === null || pmfm === void 0 ? void 0 : pmfm.id);
                const parameter = (pmfm === null || pmfm === void 0 ? void 0 : pmfm.parameter) || p.parameter;
                const hasParameterId = (parameter === null || parameter === void 0 ? void 0 : parameter.label) && parameterLabels.includes(parameter.label);
                return pmfmIds.includes(pmfmId) || hasParameterId;
            }
            return false;
        });
    }
    validatePmfmsForm() {
        return __awaiter(this, void 0, void 0, function* () {
            const pmfmsForm = this.pmfmsForm;
            if (this.loading || pmfmsForm.disabled) {
                if (pmfmsForm.errors)
                    pmfmsForm.setErrors(null, { emitEvent: false });
                return;
            }
            // DEBUG
            //console.debug('DEV Call validatePmfmsForm()...');
            const lengthPmfmsCount = (this.lengthPmfmsForm.value || []).filter(PmfmStrategy.isNotEmpty).length;
            const weightPmfmsCount = (this.weightPmfmsForm.value || []).filter(PmfmStrategy.isNotEmpty).length;
            const maturityPmfmsCount = (this.maturityPmfmsForm.value || []).filter(PmfmStrategy.isNotEmpty).length;
            const fractionPmfmCount = (this.fractionPmfmsForm.value || []).filter(value => { var _a; return (value === null || value === void 0 ? void 0 : value.fraction) && ((_a = value.fraction) === null || _a === void 0 ? void 0 : _a.id); }).length;
            let errors;
            // Check weight OR length is present
            if (weightPmfmsCount === 0 && lengthPmfmsCount === 0) {
                errors = {
                    weightOrSize: true
                };
            }
            else {
                SharedValidators.clearError(pmfmsForm, 'weightOrSize');
            }
            // If hasAge and no fraction set explicit error
            if (this.hasAge && fractionPmfmCount === 0) {
                errors = Object.assign(Object.assign({}, errors), { missingFraction: true });
            }
            else {
                SharedValidators.clearError(pmfmsForm, 'missingFraction');
            }
            // Add one to min count to ignore fraction and maturity if they control are set to false
            const pmfmCount = lengthPmfmsCount
                + weightPmfmsCount
                + (this.hasSex ? (1 + maturityPmfmsCount) : 0)
                + (this.hasAge ? 1 : 0);
            if (pmfmCount < MIN_PMFM_COUNT) {
                errors = Object.assign(Object.assign({}, errors), { minLength: { minLength: MIN_PMFM_COUNT } });
            }
            else {
                SharedValidators.clearError(pmfmsForm, 'minLength');
            }
            pmfmsForm.setErrors(errors);
            if (errors) {
                if (this.form.touched)
                    pmfmsForm.markAllAsTouched();
                if (this.form.dirty)
                    pmfmsForm.markAsDirty();
            }
            return null;
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Program),
    __metadata("design:paramtypes", [Program])
], SamplingStrategyForm.prototype, "program", null);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SamplingStrategyForm.prototype, "tabIndex", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplingStrategyForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplingStrategyForm.prototype, "i18nFieldPrefix", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplingStrategyForm.prototype, "placeholderChar", void 0);
SamplingStrategyForm = __decorate([
    Component({
        selector: 'app-sampling-strategy-form',
        templateUrl: './sampling-strategy.form.html',
        styleUrls: ['./sampling-strategy.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        StrategyValidatorService,
        ReferentialRefService,
        PmfmService,
        StrategyService,
        LocalSettingsService,
        TaxonNameService,
        TaxonNameRefService,
        PmfmStrategyValidatorService,
        ChangeDetectorRef,
        UntypedFormBuilder])
], SamplingStrategyForm);
export { SamplingStrategyForm };
//# sourceMappingURL=sampling-strategy.form.js.map