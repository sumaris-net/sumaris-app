import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input, QueryList, ViewChild, ViewChildren, } from '@angular/core';
import { Batch } from '../common/batch.model';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { SubBatchValidatorService } from './sub-batch.validator';
import { AppFormUtils, EntityUtils, focusNextInput, focusPreviousInput, getPropertyByPath, isEmptyArray, isNil, isNilOrBlank, isNotNil, isNotNilOrBlank, ReferentialUtils, SharedValidators, startsWithUpperCase, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { debounceTime, delay, distinctUntilChanged, filter, map, mergeMap, skip, startWith, takeUntil, tap } from 'rxjs/operators';
import { AcquisitionLevelCodes, MethodIds, PmfmIds, QualitativeLabels, } from '@app/referential/services/model/model.enum';
import { BehaviorSubject, combineLatest, from, Subject } from 'rxjs';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { PmfmFormField } from '@app/referential/pmfm/field/pmfm.form-field.component';
import { BatchGroup, BatchGroupUtils } from '../group/batch-group.model';
import { TranslateService } from '@ngx-translate/core';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { environment } from '@environments/environment';
import { IonButton } from '@ionic/angular';
import { IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
let SubBatchForm = class SubBatchForm extends MeasurementValuesForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, validatorService, referentialRefService, ichthyometerService, translate) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(null, {
            rankOrderRequired: false, // Avoid to have form.invalid, in Burst mode
        }), {
            mapPmfms: (pmfms) => this.mapPmfms(pmfms),
            onUpdateFormGroup: (form) => this.onUpdateControls(form)
        });
        this.measurementsValidatorService = measurementsValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.validatorService = validatorService;
        this.referentialRefService = referentialRefService;
        this.ichthyometerService = ichthyometerService;
        this.translate = translate;
        this._availableParents = [];
        this._disableByDefaultControls = [];
        this.computingWeight$ = this._state.select('computingWeight');
        this.$taxonNames = new BehaviorSubject(undefined);
        this.selectedTaxonNameIndex = -1;
        this.showParentGroup = true;
        this.showIndividualCount = true;
        this.showError = true;
        this.showWarning = true;
        this.showSubmitButton = true;
        this.selectInputContent = AppFormUtils.selectInputContent;
        this.filterNumberInput = AppFormUtils.filterNumberInput;
        // Remove required label/rankOrder
        this.form.controls.label.setValidators(null);
        this.form.controls.rankOrder.setValidators(null);
        // Set default values
        this.mobile = this.settings.mobile;
        this._enable = false;
        this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL;
        this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
        // Control for indiv. count enable
        this.enableIndividualCountControl = this.formBuilder.control(false, Validators.required);
        this.enableIndividualCountControl.setValue(false, { emitEvent: false });
        // Freeze QV value control
        this.freezeQvPmfmControl = this.formBuilder.control(true, Validators.required);
        this.freezeQvPmfmControl.setValue(true, { emitEvent: false });
        this.freezeTaxonNameControl = this.formBuilder.control(!this.mobile, Validators.required);
        // Listen pending status
        this._state.connect('computingWeight', this.form.statusChanges.pipe(map(status => status === 'PENDING'), filter(v => v === true)));
        // For DEV only
        this.debug = !environment.production;
    }
    set showTaxonName(show) {
        var _a;
        this._showTaxonName = show;
        const taxonNameControl = (_a = this.form) === null || _a === void 0 ? void 0 : _a.get('taxonName');
        if (taxonNameControl) {
            if (show) {
                taxonNameControl.setValidators([SharedValidators.entity, Validators.required]);
            }
            else {
                taxonNameControl.setValidators(null);
            }
        }
    }
    get showTaxonName() {
        return this._showTaxonName;
    }
    get taxonNames() {
        return this.$taxonNames.getValue();
    }
    set qvPmfm(value) {
        this._qvPmfm = value;
        // If already loaded, re apply pmfms, to be able to execute mapPmfms
        if (value && !this.loading) {
            this.setPmfms(this.pmfms);
        }
    }
    get qvPmfm() {
        return this._qvPmfm;
    }
    set availableParents(value) {
        if (this._availableParents !== value) {
            this.setAvailableParents(value);
        }
    }
    get availableParents() {
        return this._availableParents;
    }
    get enableIndividualCount() {
        return this.enableIndividualCountControl.value;
    }
    get freezeTaxonName() {
        return this.freezeTaxonNameControl.value;
    }
    set freezeTaxonName(value) {
        this.freezeTaxonNameControl.setValue(value);
        if (!value) {
            this.form.get('taxonName').reset(null);
        }
    }
    get freezeQvPmfm() {
        return this.freezeQvPmfmControl.value;
    }
    set freezeQvPmfm(value) {
        this.freezeQvPmfmControl.setValue(value);
        if (!value) {
            this.form.get('measurements.' + this.qvPmfm.id).reset(null);
        }
    }
    get parentGroup() {
        return this.form.controls.parentGroup.value;
    }
    set parentGroup(value) {
        this.form.controls.parentGroup.setValue(value);
    }
    get computingWeight() {
        return this._state.get('computingWeight');
    }
    set computingWeight(value) {
        this._state.set('computingWeight', _ => value);
    }
    ngOnInit() {
        super.ngOnInit();
        // Default values
        this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
        this.isNew = toBoolean(this.isNew, false);
        this.maxVisibleButtons = toNumber(this.maxVisibleButtons, 4);
        this.freezeTaxonNameControl.setValue(!this.mobile, { emitEvent: false });
        // Get display attributes for parent
        this._parentAttributes = this.settings.getFieldDisplayAttributes('taxonGroup').map(attr => 'taxonGroup.' + attr)
            .concat(!this.showTaxonName ? this.settings.getFieldDisplayAttributes('taxonName').map(attr => 'taxonName.' + attr) : []);
        // Parent combo
        const parentControl = this.form.get('parentGroup');
        this.registerAutocompleteField('parentGroup', {
            suggestFn: (value, options) => this.suggestParents(value, options),
            attributes: ['rankOrder'].concat(this._parentAttributes),
            showAllOnFocus: true,
            mobile: this.mobile
        });
        // Taxon name
        const taxonNameControl = this.form.get('taxonName');
        if (this.showTaxonName) {
            // Add required validator on TaxonName
            taxonNameControl.setValidators([SharedValidators.entity, Validators.required]);
        }
        this.registerAutocompleteField('taxonName', {
            items: this.$taxonNames,
            mobile: this.mobile
        });
        // Fill taxon names, from the parent changes
        if (this.showTaxonName) {
            // Mobile
            if (this.mobile) {
                // Compute taxon names when parent has changed
                let currentParenLabel;
                this.registerSubscription(parentControl.valueChanges
                    .pipe(filter(parent => isNotNilOrBlank(parent === null || parent === void 0 ? void 0 : parent.label) && currentParenLabel !== parent.label), tap(parent => currentParenLabel = parent.label), mergeMap((_) => this.suggestTaxonNames()), tap(({ data }) => this.$taxonNames.next(data)) // Update taxon names
                )
                    .subscribe());
                this.waitIdle().then(() => {
                    // Init the value on form when there is only 1 value because the input is hidden and never set
                    this.registerSubscription(this.$taxonNames.pipe(filter(values => (values === null || values === void 0 ? void 0 : values.length) === 1)).subscribe(values => {
                        taxonNameControl.setValue(values[0], { emitEvent: false });
                    }));
                    // Update taxonName when need
                    let lastTaxonName;
                    this.registerSubscription(combineLatest([
                        this.$taxonNames,
                        taxonNameControl.valueChanges.pipe(tap(v => lastTaxonName = v))
                    ])
                        .pipe(filter(([items, value]) => isNotNil(items)))
                        .subscribe(([items, value]) => {
                        let index = -1;
                        // Compute index in list, and get value
                        if (items && items.length === 1) {
                            index = 0;
                        }
                        else if (ReferentialUtils.isNotEmpty(lastTaxonName)) {
                            index = items.findIndex(v => TaxonNameRef.equalsOrSameReferenceTaxon(v, lastTaxonName));
                        }
                        const newTaxonName = (index !== -1) ? items[index] : null;
                        // Apply to form, if need
                        if (!ReferentialUtils.equals(lastTaxonName, newTaxonName)) {
                            taxonNameControl.setValue(newTaxonName, { emitEvent: false });
                            lastTaxonName = newTaxonName;
                            this.markAsDirty();
                        }
                        // Apply to button index, if need
                        if (this.selectedTaxonNameIndex !== index) {
                            this.selectedTaxonNameIndex = index;
                            this.markForCheck();
                        }
                    }));
                })
                    .catch(err => console.error(err));
            }
            // Desktop
            else {
                // Reset taxon name combo when parent changed
                this.registerSubscription(parentControl.valueChanges
                    .pipe(
                // Warn: skip the first trigger (ignore set value)
                skip(1), debounceTime(250), 
                // Ignore changes if parent is not an entity (WARN: we use 'label' because id can be null, when not saved yet)
                filter(parent => this.form.enabled && EntityUtils.isNotEmpty(parent, 'label')), distinctUntilChanged(Batch.equals), mergeMap(() => this.suggestTaxonNames()))
                    .subscribe(({ data }) => {
                    // Update taxon names
                    this.$taxonNames.next(data);
                    // Is only one value
                    if (data.length === 1) {
                        const defaultTaxonName = data[0];
                        // Set the field
                        taxonNameControl.patchValue(defaultTaxonName, { emitEVent: false });
                        // Remember for next form reset
                        this.data.taxonName = defaultTaxonName;
                    }
                    else {
                        taxonNameControl.reset(null, { emitEVent: false });
                        // Remember for next form reset
                        this.data.taxonName = undefined;
                    }
                }));
            }
        }
        // Compute taxon names when parent has changed
        this.registerSubscription(parentControl.valueChanges
            .pipe(
        // Detected parent changes
        filter(parentGroup => { var _a; return parentGroup && !BatchGroupUtils.equals(parentGroup, (_a = this.data) === null || _a === void 0 ? void 0 : _a.parentGroup); }))
            .subscribe(parentGroup => {
            // Remember (for next values changes, or next form reset)
            this.data.parentGroup = parentGroup;
            // Update pmfms (it can depends on the selected parent's taxon group - see mapPmfm())
            if (!this.starting)
                this._onRefreshPmfms.emit();
        }));
        this.registerSubscription(this.enableIndividualCountControl.valueChanges
            .pipe(startWith(this.enableIndividualCountControl.value))
            .subscribe((enable) => {
            const individualCountControl = this.form.get('individualCount');
            if (enable) {
                individualCountControl.enable();
                individualCountControl.setValidators([Validators.required, Validators.min(0)]);
            }
            else {
                individualCountControl.disable();
                individualCountControl.setValue(null);
            }
        }));
        // Listen icthyometer values
        if (this.mobile) {
            this.registerSubscription(this.listenIchthyometer());
        }
        this.ngInitExtension();
    }
    doNewParentClick(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.onNewParentClick)
                return; // No callback: skip
            const res = yield this.onNewParentClick();
            if (res instanceof Batch) {
                this.form.get('parent').setValue(res);
            }
        });
    }
    checkIfSubmit(event, submitButton) {
        if (event === null || event === void 0 ? void 0 : event.defaultPrevented)
            return false;
        submitButton = submitButton || this.submitButton;
        if (event.currentTarget === submitButton['el']) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            event.returnValue = false;
            this.doSubmit(null);
            return false;
        }
        return true;
    }
    onApplyingEntity(data, opts) {
        super.onApplyingEntity(data);
        // Replace parent with value from availableParents
        if (!opts || opts.linkToParent !== false) {
            this.linkToParentGroup(data);
        }
    }
    updateView(data, opts) {
        const _super = Object.create(null, {
            updateView: { get: () => super.updateView }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Reset taxon name button index
            if (this.mobile && data && data.taxonName && isNotNil(data.taxonName.id)) {
                this.selectedTaxonNameIndex = (this.$taxonNames.getValue() || []).findIndex(tn => tn.id === data.taxonName.id);
            }
            else {
                this.selectedTaxonNameIndex = -1;
            }
            // Parent not found
            if (!data.parentGroup) {
                // Force to allow parent selection
                this.showParentGroup = this.showParentGroup || true;
            }
            // Inherited method
            yield _super.updateView.call(this, data, opts);
        });
    }
    enable(opts) {
        super.enable(opts);
        if (!this.enableIndividualCount) {
            this.form.get('individualCount').disable(opts);
        }
        // Other field to disable by default (e.g. discard reason, in SUMARiS program)
        this._disableByDefaultControls.forEach(c => c.disable(opts));
    }
    onTaxonNameButtonClick(event, taxonName, minTabindex) {
        this.form.patchValue({ taxonName });
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.focusNextInput(null, { minTabindex });
    }
    focusFirstEmptyInput(event) {
        return focusNextInput(event, this.inputFields, {
            excludeEmptyInput: true,
            minTabindex: -1,
            // DEBUG
            //debug: this.debug
        });
    }
    focusNextInput(event, opts) {
        // DEBUG
        //return focusNextInput(event, this.inputFields, opts{debug: this.debug, ...opts});
        return focusNextInput(event, this.inputFields, opts);
    }
    focusPreviousInput(event, opts) {
        // DEBUG
        // return focusPreviousInput(event, this.inputFields, {debug: this.debug, ...opts});
        return focusPreviousInput(event, this.inputFields, opts);
    }
    focusNextInputOrSubmit(event, isLastPmfm) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event.defaultPrevented)
                return; // Skip
            event.preventDefault();
            if (isLastPmfm) {
                if (this.enableIndividualCount) {
                    // Focus to last (=individual count input)
                    this.inputFields.last.nativeElement.focus();
                    return true;
                }
                yield this.doSubmit(null);
                return true;
            }
            return this.focusNextInput(event);
        });
    }
    trySubmit(event, opts) {
        if (event === null || event === void 0 ? void 0 : event.defaultPrevented)
            return false;
        super.doSubmit(event, opts);
        return true;
    }
    doSubmit(event, opts) {
        if (event === null || event === void 0 ? void 0 : event.defaultPrevented) {
            console.debug('[sub-batch-form] Cancel submit (event.defaultPrevented=true)');
            return;
        }
        return super.doSubmit(event, opts);
    }
    /* -- protected method -- */
    ngInitExtension() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ready();
            const discardOrLandingControl = this.form.get('measurementValues.' + PmfmIds.DISCARD_OR_LANDING);
            const discardReasonControl = this.form.get('measurementValues.' + PmfmIds.DISCARD_REASON);
            // Manage DISCARD_REASON validator
            if (discardOrLandingControl && discardReasonControl) {
                // Always disable by default, while discard/Landing not set
                this._disableByDefaultControls.push(discardReasonControl);
                this.registerSubscription(discardOrLandingControl.valueChanges
                    .pipe(
                // IMPORTANT: add a delay, to make sure to be executed AFTER the form.enable()
                delay(200))
                    .subscribe((value) => {
                    if (ReferentialUtils.isNotEmpty(value) && value.label === QualitativeLabels.DISCARD_OR_LANDING.DISCARD) {
                        if (this.form.enabled) {
                            discardReasonControl.enable();
                        }
                        discardReasonControl.setValidators(Validators.required);
                        discardReasonControl.updateValueAndValidity({ onlySelf: true });
                        this.form.updateValueAndValidity({ onlySelf: true });
                    }
                    else {
                        discardReasonControl.setValue(null);
                        discardReasonControl.setValidators(null);
                        discardReasonControl.disable();
                    }
                }));
            }
        });
    }
    setAvailableParents(value) {
        this._availableParents = value;
        // DEBUG
        //console.debug('[sub-batch-form] setAvailableParents() ', value);
        // Reset  parentGroup control, if no more in the list
        if (!this.loading && this.showParentGroup) {
            const selectedParent = this.parentGroup;
            const selectedParentExists = selectedParent && (this._availableParents || []).findIndex(parent => BatchGroup.equals(parent, this.parentGroup)) !== -1;
            if (selectedParent && !selectedParentExists) {
                this.form.patchValue({ parentGroup: null, taxonName: null });
            }
        }
    }
    suggestParents(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Has select a valid parent: return the parent
            if (EntityUtils.isNotEmpty(value, 'label'))
                return [value];
            value = (typeof value === 'string' && value !== '*') && value || undefined;
            if (isNilOrBlank(value))
                return this._availableParents; // All
            const ucValueParts = value.trim().toUpperCase().split(' ', 1);
            if (this.debug)
                console.debug(`[sub-batch-form] Searching parent {${value || '*'}}...`);
            // Search on attributes
            return this._availableParents.filter(parent => ucValueParts
                .filter(valuePart => this._parentAttributes
                .findIndex(attr => startsWithUpperCase(getPropertyByPath(parent, attr), valuePart.trim())) !== -1).length === ucValueParts.length);
        });
    }
    suggestTaxonNames(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const parentGroup = this.parentGroup;
            if (isNil(parentGroup))
                return { data: [] };
            if (this.debug)
                console.debug(`[sub-batch-form] Searching taxon name {${value || '*'}}...`);
            return this.programRefService.suggestTaxonNames(value, {
                programLabel: this.programLabel,
                searchAttribute: options && options.searchAttribute,
                taxonGroupId: parentGroup && parentGroup.taxonGroup && parentGroup.taxonGroup.id || undefined
            });
        });
    }
    mapPmfms(pmfms) {
        // Hide the QV pmfm
        if (this._qvPmfm) {
            const index = pmfms.findIndex(pmfm => pmfm.id === this._qvPmfm.id);
            if (index !== -1) {
                const qvPmfm = this._qvPmfm.clone();
                qvPmfm.hidden = true;
                qvPmfm.required = true;
                pmfms[index] = qvPmfm;
            }
            else {
                console.warn('Cannot found the QVPmfm with ID=' + this._qvPmfm.id);
            }
        }
        // If there is a parent: filter on parent's taxon group
        const parentTaxonGroupId = this.parentGroup && this.parentGroup.taxonGroup && this.parentGroup.taxonGroup.id;
        if (isNotNil(parentTaxonGroupId)) {
            pmfms = pmfms.filter(pmfm => !PmfmUtils.isDenormalizedPmfm(pmfm)
                || isEmptyArray(pmfm.taxonGroupIds)
                || pmfm.taxonGroupIds.includes(parentTaxonGroupId));
        }
        // Check weight-length conversion is enabled
        pmfms = pmfms.filter(pmfm => {
            // If RTP weight: enable conversion, and hidden pmfms
            if (pmfm.id === PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH
                || pmfm.methodId === MethodIds.CALCULATED_WEIGHT_LENGTH) {
                this.enableLengthWeightConversion = true;
                if (this.weightDisplayedUnit) {
                    pmfm = PmfmUtils.setWeightUnitConversion(pmfm, this.weightDisplayedUnit);
                }
                this.weightPmfm = pmfm;
                return false;
            }
            return true;
        });
        return pmfms;
    }
    onUpdateControls(form) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // If QV: must be required
            if (this._qvPmfm) {
                const measFormGroup = form.get('measurementValues');
                const qvControl = measFormGroup.get(this._qvPmfm.id.toString());
                if (qvControl) {
                    qvControl.setValidators(Validators.required);
                }
            }
            // Weight/length computation
            (_a = this._weightConversionSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
            if (this.enableLengthWeightConversion) {
                // DEBUG
                if (this.debug)
                    console.debug('[sub-batch-form] Enabling weight/length conversion...');
                try {
                    const subscription = yield this.validatorService.enableWeightLengthConversion(form, {
                        pmfms: this.pmfms,
                        qvPmfm: this._qvPmfm,
                        parentGroup: !this.showParentGroup ? this.parentGroup : undefined /*will use parent control*/,
                        onError: (err) => {
                            this.warning = err && err.message || 'TRIP.SUB_BATCH.ERROR.WEIGHT_LENGTH_CONVERSION_FAILED';
                            this.computingWeight = false;
                            this.markForCheck();
                        },
                        markForCheck: () => this.computingWeight = false,
                        // DEBUG
                        debug: this.debug
                    });
                    if (subscription) {
                        this.registerSubscription(subscription);
                        this._weightConversionSubscription = subscription;
                        subscription.add(() => {
                            this.unregisterSubscription(subscription);
                            this._weightConversionSubscription = null;
                        });
                    }
                }
                catch (err) {
                    console.error('[sub-batch-form] Failed to enable weight/length conversion:', err);
                }
            }
        });
    }
    getValue() {
        if (!this.form.dirty)
            return this.data;
        const json = this.form.value;
        // Read the individual count (if has been disable)
        if (!this.enableIndividualCount) {
            json.individualCount = this.form.get('individualCount').value || 1;
        }
        const measurementValuesForm = this.measurementValuesForm;
        // Adapt measurement values for entity
        if (measurementValuesForm) {
            const pmfms = this.pmfms || [];
            json.measurementValues = Object.assign({}, this.data.measurementValues || {}, // Keep additional PMFM values
            MeasurementValuesUtils.normalizeValuesToModel(measurementValuesForm.value, pmfms));
        }
        else {
            json.measurementValues = {};
        }
        this.data.fromObject(json);
        return this.data;
    }
    linkToParentGroup(data) {
        if (!data)
            return;
        // Find the parent
        const parentGroup = data.parentGroup;
        if (!parentGroup)
            return; // no parent = nothing to link
        data.parentGroup = (this._availableParents || []).find(p => Batch.equals(p, parentGroup));
        // Get the parent of the parent (e.g. if parent is a sample batch)
        if (data.parentGroup && data.parent && !data.parent.hasTaxonNameOrGroup && data.parent.parent && data.parent.parent.hasTaxonNameOrGroup) {
            data.parentGroup = BatchGroup.fromBatch(data.parent.parent);
        }
    }
    listenIchthyometer() {
        const stopSubject = new Subject();
        return combineLatest([
            this.ichthyometerService.enabled$,
            from(this.ready()),
            this.pmfms$
        ])
            .pipe(filter(([enabled, _, __]) => enabled), 
        // DEBUG
        //tap(pmfms => console.debug('[sub-batch-form] Looking for length pmfms: ' + JSON.stringify(pmfms))),
        mergeMap(([_, __, pmfms]) => {
            // Cancel previous watch
            stopSubject.next();
            // Collect all length fields
            const lengthFields = (pmfms || []).filter(PmfmUtils.isLength)
                .reduce((res, pmfm) => {
                const control = this._measurementValuesForm.get(pmfm.id.toString());
                if (!control)
                    return res; // No control: skip
                const unit = (pmfm.unitLabel || 'cm');
                const precision = PmfmUtils.getOrComputePrecision(pmfm, 0.000001); // 6 decimals by default
                return res.concat({ control, unit, precision });
            }, []);
            // No length pmfms found: stop here
            if (isEmptyArray(lengthFields)) {
                console.debug('[sub-batch-form] Cannot used ichthyometer: no length pmfm found');
                return;
            }
            console.debug(`[sub-batch-form] Start watching length from ichthyometer...`);
            return this.ichthyometerService.watchLength()
                .pipe(takeUntil(stopSubject), map(({ value, unit }) => {
                console.debug(`[sub-batch-form] Receiving value: ${value} ${unit}`);
                // Find first length control enabled
                const lengthField = lengthFields.find(field => field.control.enabled);
                if (lengthField) {
                    // Convert value into the expected unit/precision
                    const convertedValue = PmfmValueUtils.convertLengthValue(value, unit, lengthField.unit, lengthField.precision);
                    // Apply converted value to control
                    lengthField.control.setValue(convertedValue);
                    // Try to submit the form (e.g. when only one control)
                    this.trySubmit(null);
                }
            }));
        }))
            .subscribe();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], SubBatchForm.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchForm.prototype, "showParentGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchForm.prototype, "showIndividualCount", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchForm.prototype, "showWarning", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchForm.prototype, "showSubmitButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchForm.prototype, "displayParentPmfm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubBatchForm.prototype, "isNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SubBatchForm.prototype, "tabindex", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubBatchForm.prototype, "floatLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubBatchForm.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SubBatchForm.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SubBatchForm.prototype, "maxItemCountForButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubBatchForm.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubBatchForm.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubBatchForm.prototype, "weightDisplayedUnit", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SubBatchForm.prototype, "onNewParentClick", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Object])
], SubBatchForm.prototype, "showTaxonName", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], SubBatchForm.prototype, "qvPmfm", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], SubBatchForm.prototype, "availableParents", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SubBatchForm.prototype, "freezeTaxonName", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SubBatchForm.prototype, "freezeQvPmfm", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], SubBatchForm.prototype, "parentGroup", null);
__decorate([
    ViewChildren(PmfmFormField),
    __metadata("design:type", QueryList)
], SubBatchForm.prototype, "measurementFormFields", void 0);
__decorate([
    ViewChildren('inputField'),
    __metadata("design:type", QueryList)
], SubBatchForm.prototype, "inputFields", void 0);
__decorate([
    ViewChild('submitButton'),
    __metadata("design:type", IonButton)
], SubBatchForm.prototype, "submitButton", void 0);
SubBatchForm = __decorate([
    Component({
        selector: 'app-sub-batch-form',
        templateUrl: 'sub-batch.form.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        SubBatchValidatorService,
        ReferentialRefService,
        IchthyometerService,
        TranslateService])
], SubBatchForm);
export { SubBatchForm };
//# sourceMappingURL=sub-batch.form.js.map