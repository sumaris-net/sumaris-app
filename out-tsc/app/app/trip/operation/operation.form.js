import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, Optional, Output, } from '@angular/core';
import { OperationValidatorService } from './operation.validator';
import moment from 'moment';
import { AccountService, Alerts, AppForm, DateFormatService, DateUtils, EntityUtils, firstNotNilPromise, FormArrayHelper, fromDateISOString, getPropertyByPath, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, isNotNilOrNaN, ReferentialUtils, removeDuplicatesFromArray, selectInputContent, StatusIds, suggestFromArray, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Operation } from '../trip/trip.model';
import { BehaviorSubject, combineLatest, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { OperationService } from '@app/trip/operation/operation.service';
import { AlertController, ModalController } from '@ionic/angular';
import { SelectOperationModal } from '@app/trip/operation/select-operation.modal';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { Router } from '@angular/router';
import { PositionUtils } from '@app/data/position/position.utils';
import { FishingAreaValidatorService } from '@app/data/fishing-area/fishing-area.validator';
import { LocationLevelGroups, PmfmIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { PhysicalGearService } from '@app/trip/physicalgear/physicalgear.service';
import { TaxonGroupTypeIds } from '@app/referential/services/model/taxon-group.model';
import { TEXT_SEARCH_IGNORE_CHARS_REGEXP } from '@app/referential/services/base-referential-service.class';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';
export const IS_CHILD_OPERATION_ITEMS = Object.freeze([
    {
        value: false,
        label: 'TRIP.OPERATION.EDIT.TYPE.PARENT'
    },
    {
        value: true,
        label: 'TRIP.OPERATION.EDIT.TYPE.CHILD'
    }
]);
let OperationForm = class OperationForm extends AppForm {
    constructor(injector, router, dateFormat, validatorService, referentialRefService, modalCtrl, alertCtrl, accountService, operationService, physicalGearService, pmfmService, formBuilder, fishingAreaValidatorService, cd, geolocation) {
        super(injector, validatorService.getFormGroup());
        this.router = router;
        this.dateFormat = dateFormat;
        this.validatorService = validatorService;
        this.referentialRefService = referentialRefService;
        this.modalCtrl = modalCtrl;
        this.alertCtrl = alertCtrl;
        this.accountService = accountService;
        this.operationService = operationService;
        this.physicalGearService = physicalGearService;
        this.pmfmService = pmfmService;
        this.formBuilder = formBuilder;
        this.fishingAreaValidatorService = fishingAreaValidatorService;
        this.cd = cd;
        this.geolocation = geolocation;
        this._$physicalGears = new BehaviorSubject(undefined);
        this._$metiers = new BehaviorSubject(undefined);
        this._showMetier = true;
        this._showMetierFilter = false;
        this._allowParentOperation = false;
        this._showPosition = true;
        this._showFishingArea = false;
        this._requiredComment = false;
        this._showGeolocationSpinner = true;
        this.$parentOperationLabel = new BehaviorSubject('');
        this.fishingAreaFocusIndex = -1;
        this.autocompleteFilters = {
            metier: false,
            fishingArea: false
        };
        this.showError = true;
        this.showComment = true;
        this.fishingStartDateTimeEnable = false;
        this.fishingEndDateTimeEnable = false;
        this.endDateTimeEnable = true;
        this.filteredFishingAreaLocations = null;
        this.fishingAreaLocationLevelIds = LocationLevelGroups.FISHING_AREA;
        this.metierTaxonGroupTypeIds = [TaxonGroupTypeIds.METIER_DCF_5];
        this.defaultIsParentOperation = true;
        this.parentChanges = new EventEmitter();
        this.lastEndDateChanges = new EventEmitter();
        this.openParentOperation = new EventEmitter();
        this.selectInputContent = selectInputContent;
        this.mobile = this.settings.mobile;
        this.i18nFieldPrefix = 'TRIP.OPERATION.EDIT.';
        // A boolean control, to store if parent is a parent or child operation
        this.isParentOperationControl = new UntypedFormControl(true, Validators.required);
    }
    set usageMode(usageMode) {
        if (this._usageMode !== usageMode) {
            this._usageMode = usageMode;
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    get usageMode() {
        return this._usageMode;
    }
    set showMetier(value) {
        // Change metier filter button
        if (this._showMetier !== value) {
            this._showMetier = value;
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    get showMetier() {
        return this._showMetier;
    }
    set showMetierFilter(value) {
        this._showMetierFilter = value;
        // Change metier filter button
        if (this._showMetierFilter !== this.autocompleteFilters.metier) {
            this.toggleMetierFilter(null);
        }
    }
    get showMetierFilter() {
        return this._showMetierFilter;
    }
    set allowParentOperation(value) {
        if (this._allowParentOperation !== value) {
            this._allowParentOperation = value;
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    get allowParentOperation() {
        return this._allowParentOperation;
    }
    set showPosition(value) {
        if (this._showPosition !== value) {
            this._showPosition = value;
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    get showPosition() {
        return this._showPosition;
    }
    set boundingBox(value) {
        if (this._boundingBox !== value) {
            this._boundingBox = value;
            console.debug('[operation-form] Position BBox: ' + value);
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    get boundingBox() {
        return this._boundingBox;
    }
    set showFishingArea(value) {
        if (this._showFishingArea !== value) {
            this._showFishingArea = value;
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    get showFishingArea() {
        return this._showFishingArea;
    }
    set requiredComment(value) {
        if (this._requiredComment !== value) {
            this._requiredComment = value;
            const commentControl = this.form.get('comments');
            if (value) {
                commentControl.setValidators(Validators.required);
                commentControl.markAsPending({ onlySelf: true });
            }
            else {
                commentControl.clearValidators();
            }
            commentControl.updateValueAndValidity({ emitEvent: !this.loading, onlySelf: true });
            if (this._requiredComment && !this.showComment) {
                this.showComment = true;
                this.markForCheck();
            }
        }
    }
    get requiredComment() {
        return this._requiredComment;
    }
    get trip() {
        return this._trip;
    }
    set trip(value) {
        this.setTrip(value);
    }
    get parentControl() {
        var _a;
        return (_a = this.form) === null || _a === void 0 ? void 0 : _a.controls.parentOperation;
    }
    get childControl() {
        var _a;
        return (_a = this.form) === null || _a === void 0 ? void 0 : _a.controls.childOperation;
    }
    get fishingAreasForm() {
        var _a;
        return (_a = this.form) === null || _a === void 0 ? void 0 : _a.controls.fishingAreas;
    }
    get qualityFlagControl() {
        var _a;
        return (_a = this.form) === null || _a === void 0 ? void 0 : _a.controls.qualityFlagId;
    }
    get physicalGearControl() {
        var _a;
        return (_a = this.form) === null || _a === void 0 ? void 0 : _a.controls.physicalGear;
    }
    get isParentOperation() {
        return this._allowParentOperation && this.isParentOperationControl.value === true;
    }
    set isParentOperation(value) {
        this.setIsParentOperation(value);
    }
    get isChildOperation() {
        return this.isParentOperationControl.value !== true;
    }
    set isChildOperation(value) {
        this.setIsParentOperation(!value);
    }
    enable(opts) {
        super.enable(opts);
    }
    get formError() {
        return this.getFormError(this.form);
    }
    get lastActivePositionControl() {
        return this.endDateTimeEnable && this.form.get('endPosition')
            || this.fishingEndDateTimeEnable && this.form.get('fishingEndPosition')
            || this.fishingStartDateTimeEnable && this.form.get('fishingStartPosition')
            || this.form.get('startPosition');
    }
    get firstActivePositionControl() {
        return this.form.get('startPosition')
            || this.fishingStartDateTimeEnable && this.form.get('fishingStartPosition')
            || this.fishingEndDateTimeEnable && this.form.get('fishingEndPosition')
            || this.endDateTimeEnable && this.form.get('endPosition');
    }
    get previousFishingEndDateTimeControl() {
        return this.fishingStartDateTimeEnable && this.form.get('fishingStartDateTime')
            || this.form.get('startDateTime');
    }
    get lastStartDateTimeControl() {
        return this.fishingStartDateTimeEnable && this.form.get('fishingStartDateTime')
            || this.form.get('startDateTime');
    }
    get previousEndDateTimeControl() {
        return this.fishingEndDateTimeEnable && this.form.get('fishingEndDateTime')
            || this.fishingStartDateTimeEnable && this.form.get('fishingStartDateTime')
            || this.form.get('startDateTime');
    }
    get isNewData() {
        var _a;
        return isNil((_a = this.form) === null || _a === void 0 ? void 0 : _a.controls.id.value);
    }
    ngOnInit() {
        const isOnFieldMode = this.settings.isOnFieldMode(this.usageMode);
        this.usageMode = isOnFieldMode ? 'FIELD' : 'DESK';
        this.latLongFormat = this.settings.latLongFormat;
        this.enableGeolocation = isOnFieldMode && this.mobile;
        this._allowParentOperation = toBoolean(this._allowParentOperation, false);
        this.enableCopyPosition = !this.enableGeolocation;
        super.ngOnInit();
        // Combo: physicalGears
        const physicalGearAttributes = ['rankOrder']
            .concat(this.settings.getFieldDisplayAttributes('gear')
            .map(key => 'gear.' + key));
        this.registerAutocompleteField('physicalGear', {
            items: this._$physicalGears,
            attributes: physicalGearAttributes,
            mobile: this.mobile,
            showAllOnFocus: true
        });
        // Combo: fishingAreas
        const fishingAreaAttributes = this.settings.getFieldDisplayAttributes('fishingAreaLocation', 
        // TODO: find a way to configure/change this array dynamically (by a set/get input + set by program's option)
        // Est-ce que la SFA a besoin des deux info, label et name ? Par ACSOT/PIFIL non, sur les rect stats
        ['label', 'name']);
        this.registerAutocompleteField('fishingAreaLocation', {
            suggestFn: (value, filter) => this.suggestFishingAreaLocations(value, Object.assign(Object.assign({}, filter), { levelIds: this.fishingAreaLocationLevelIds })),
            filter: {
                entityName: 'Location',
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
            },
            attributes: fishingAreaAttributes,
            suggestLengthThreshold: 2,
            mobile: this.mobile
        });
        // Taxon group combo
        this.registerAutocompleteField('taxonGroup', {
            suggestFn: (value, filter) => this.suggestMetiers(value, filter),
            mobile: this.mobile
        });
        // Listen physical gear, to enable/disable metier
        this.registerSubscription(this.form.get('physicalGear').valueChanges
            .pipe(distinctUntilChanged((o1, o2) => EntityUtils.equals(o1, o2, 'id')))
            .subscribe((physicalGear) => this.onPhysicalGearChanged(physicalGear)));
        // Listen parent operation
        this.registerSubscription(this.parentControl.valueChanges
            .subscribe(value => this.onParentOperationChanged(value)));
        const fishingEndDateTimeControl = this.form.get('fishingEndDateTime');
        const endDateTimeControl = this.form.get('endDateTime');
        this.registerSubscription(combineLatest([
            fishingEndDateTimeControl
                .valueChanges
                .pipe(filter(_ => this.fishingEndDateTimeEnable), startWith(fishingEndDateTimeControl.value) // Need by combineLatest (must be after filter)
            ),
            endDateTimeControl
                .valueChanges
                .pipe(filter(_ => this.endDateTimeEnable), startWith(endDateTimeControl.value) // Need by combineLatest (must be after filter)
            )
        ])
            .pipe(debounceTime(250), map(([d1, d2]) => DateUtils.max(fromDateISOString(d1), fromDateISOString(d2))), distinctUntilChanged())
            .subscribe(max => this.lastEndDateChanges.next(max)));
        this.registerSubscription(this.isParentOperationControl.valueChanges
            .pipe(distinctUntilChanged())
            .subscribe(value => this.setIsParentOperation(value)));
    }
    ngOnReady() {
        if (this.debug)
            console.debug('[operation-form] Form is ready!');
        if (!this.allowParentOperation)
            this.updateFormGroup();
    }
    ngOnDestroy() {
        var _a;
        super.ngOnDestroy();
        this._$physicalGears.complete();
        this._$metiers.complete();
        this.$parentOperationLabel.complete();
        (_a = this._positionSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
    }
    reset(data, opts) {
        this.setValue(data || new Operation(), opts);
    }
    setValue(data, opts) {
        const _super = Object.create(null, {
            setValue: { get: () => super.setValue }
        });
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // Wait ready (= form group updated, by the parent page)
            yield this.ready();
            const isNew = isNil(data === null || data === void 0 ? void 0 : data.id);
            // Use trip physical gear Object (if possible)
            const physicalGear = data.physicalGear;
            const physicalGears = this._$physicalGears.value;
            if (physicalGear && isNotNil(physicalGear.id) && isNotEmptyArray(physicalGears)) {
                data.physicalGear = physicalGears.find(g => g.id === physicalGear.id) || physicalGear;
            }
            // If parent or child operation
            const isChildOperation = data && isNotNil((_a = data.parentOperation) === null || _a === void 0 ? void 0 : _a.id) || !this.defaultIsParentOperation;
            const isParentOperation = !isChildOperation && (isNotNil((_b = data.childOperation) === null || _b === void 0 ? void 0 : _b.id) || this.allowParentOperation);
            if (isChildOperation || isParentOperation) {
                this._allowParentOperation = true; // do not use setter to not update form group
                this.setIsParentOperation(isParentOperation, { emitEvent: false });
                if (isChildOperation)
                    this.updateFormGroup({ emitEvent: false });
            }
            // Use label and name from metier.taxonGroup
            if (!isNew && (data === null || data === void 0 ? void 0 : data.metier)) {
                data.metier = data.metier.clone(); // Leave original object unchanged
                data.metier.label = data.metier.taxonGroup && data.metier.taxonGroup.label || data.metier.label;
                data.metier.name = data.metier.taxonGroup && data.metier.taxonGroup.name || data.metier.name;
            }
            if (!isNew && !this._showPosition) {
                data.positions = [];
                data.startPosition = null;
                data.endPosition = null;
            }
            if (!isNew && !this._showFishingArea)
                data.fishingAreas = [];
            if (!isNew && this._showFishingArea && data.fishingAreas.length) {
                this.fishingAreasHelper.resize(Math.max(data.fishingAreas.length, 1));
            }
            if (isParentOperation && DataEntityUtils.hasNoQualityFlag(data)) {
                data.qualityFlagId = QualityFlagIds.NOT_COMPLETED;
            }
            this.canEditType = isNew;
            setTimeout(() => {
                this.lastEndDateChanges.emit(DateUtils.max(this.fishingEndDateTimeEnable && data.fishingEndDateTime, this.endDateTimeEnable && data.endDateTime));
            });
            // Send value for form
            if (this.debug)
                console.debug('[operation-form] Updating form (using entity)', data);
            _super.setValue.call(this, data, opts);
        });
    }
    setTrip(trip) {
        this._trip = trip;
        if (trip) {
            // Propagate physical gears
            const gearLabelPath = 'measurementValues.' + PmfmIds.GEAR_LABEL;
            const physicalGears = (trip.gears || []).map((pg, i) => {
                const pgCopy = PhysicalGear.fromObject(pg).clone();
                // Keep children (need by selection operation page)
                //physicalGear.children = null;
                // Use physical gear label, if present (see issue #314)
                const physicalGearLabel = getPropertyByPath(pg, gearLabelPath);
                if (isNotNilOrBlank(physicalGearLabel)) {
                    pgCopy.gear.name = physicalGearLabel;
                }
                return pgCopy;
            });
            this._$physicalGears.next(physicalGears);
            // Use trip physical gear Object (if possible)
            const physicalGearControl = this.form.get('physicalGear');
            let physicalGear = physicalGearControl.value;
            if (physicalGear && isNotNil(physicalGear.id)) {
                physicalGear = physicalGears.find(g => g.id === physicalGear.id) || physicalGear;
                if (physicalGear)
                    physicalGearControl.patchValue(physicalGear);
            }
            // Update form group
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    /**
     * // Fill dates using the trip's dates
     */
    fillWithTripDates() {
        if (!this.trip)
            return;
        const endDateTime = fromDateISOString(this.trip.returnDateTime).clone();
        endDateTime.subtract(1, 'second');
        this.form.patchValue({ startDateTime: this.trip.departureDateTime, endDateTime });
    }
    setChildOperation(value, opts) {
        this.childControl.setValue(value, opts);
        if (!opts || opts.emitEvent !== false) {
            this.updateFormGroup();
        }
    }
    setParentOperation(value, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            this.parentControl.setValue(value, opts);
            yield this.onParentOperationChanged(value, { emitEvent: false });
            if (!opts || opts.emitEvent !== false) {
                this.updateFormGroup();
            }
        });
    }
    /**
     * Get the position by GPS sensor
     *
     * @param fieldName
     */
    onFillPositionClick(event, fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event) {
                event.preventDefault();
                event.stopPropagation(); // Avoid focus into the longitude field
            }
            const positionGroup = this.form.controls[fieldName];
            if (positionGroup && positionGroup instanceof UntypedFormGroup) {
                try {
                    // Show loading spinner, when first time
                    if (this._showGeolocationSpinner)
                        this.markAsLoading();
                    // Get position
                    const coords = yield this.operationService.getCurrentPosition();
                    positionGroup.patchValue(coords, { emitEvent: false, onlySelf: true });
                    // OK, next time not need to show a spinner
                    this._showGeolocationSpinner = false;
                }
                catch (err) {
                    this._showGeolocationSpinner = true;
                    // Display error to user
                    let message = (err === null || err === void 0 ? void 0 : err.message) || err;
                    if (typeof message === 'object')
                        message = JSON.stringify(message);
                    this.setError(this.translate.instant('ERROR.GEOLOCATION_ERROR', { message: this.translate.instant(message) }));
                    return; // Stop here
                }
                finally {
                    // Hide loading spinner
                    if (this.loading)
                        this.markAsLoaded();
                }
            }
            // Set also the end date time
            if (fieldName === 'endPosition') {
                const endDateTimeControlName = this.isChildOperation ? 'endDateTime' : 'fishingStartDateTime';
                this.form.get(endDateTimeControlName).setValue(moment(), { emitEvent: false, onlySelf: true });
            }
            this.form.markAsDirty({ onlySelf: true });
            this.form.updateValueAndValidity();
            this.updateDistance({ emitEvent: false /* done after */ });
            this.markForCheck();
        });
    }
    copyPosition(event, source, target) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const value = this.form.get(source).value;
        if (!target && source === 'startPosition') {
            target = (this.fishingStartDateTimeEnable && 'fishingStartPosition')
                || (this.fishingEndDateTimeEnable && 'fishingEndPosition')
                || (this.endDateTimeEnable && 'endPosition') || undefined;
        }
        if (!target)
            return; // Skip
        this.distanceWarning = false;
        this.distance = 0;
        this.form.get(target).patchValue({
            latitude: value.latitude,
            longitude: value.longitude
        }, { emitEvent: true });
        this.markAsDirty();
    }
    openSelectOperationModal() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const currentOperation = this.form.value;
            const parent = currentOperation.parentOperation;
            const trip = this.trip;
            const tripDate = trip && fromDateISOString(trip.departureDateTime).clone() || moment();
            const startDate = tripDate.add(-15, 'day').startOf('day');
            const gearIds = removeDuplicatesFromArray((this._$physicalGears.value || []).map(physicalGear => physicalGear.gear.id));
            const modal = yield this.modalCtrl.create({
                component: SelectOperationModal,
                componentProps: {
                    filter: {
                        programLabel: this.programLabel,
                        vesselId: trip && ((_a = trip.vesselSnapshot) === null || _a === void 0 ? void 0 : _a.id),
                        excludedIds: isNotNil(currentOperation.id) ? [currentOperation.id] : null,
                        excludeChildOperation: true,
                        hasNoChildOperation: true,
                        startDate,
                        //endDate, // No end date
                        gearIds
                    },
                    gearIds,
                    parent,
                    enableGeolocation: this.enableGeolocation
                },
                keyboardClose: true,
                cssClass: 'modal-large'
            });
            yield modal.present();
            const { data } = yield modal.onDidDismiss();
            if (data && this.debug)
                console.debug('[operation-form] Modal result: ', data);
            return (data instanceof Operation) ? data : undefined;
        });
    }
    onParentOperationChanged(parentOperation, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            parentOperation = parentOperation || this.parentControl.value;
            if (this.debug)
                console.debug('[operation-form] Parent operation changed: ', parentOperation);
            if (!opts || opts.emitEvent !== false) {
                this.parentChanges.emit(parentOperation);
            }
            // Compute parent operation label
            let parentLabel = '';
            if (isNotNil(parentOperation === null || parentOperation === void 0 ? void 0 : parentOperation.id)) {
                parentLabel = (yield this.translate.get(this.i18nFieldPrefix + 'TITLE_NO_RANK', {
                    startDateTime: parentOperation.startDateTime && this.dateFormat.transform(parentOperation.startDateTime, { time: true })
                }).toPromise());
                // Append end time
                if (parentOperation.fishingStartDateTime && !parentOperation.startDateTime.isSame(parentOperation.fishingStartDateTime)) {
                    const endSuffix = this.dateFormat.transform(parentOperation.fishingStartDateTime, { pattern: 'HH:mm' });
                    parentLabel += ' -> ' + endSuffix;
                }
            }
            this.$parentOperationLabel.next(parentLabel);
        });
    }
    addParentOperation() {
        return __awaiter(this, void 0, void 0, function* () {
            const parentOperation = yield this.openSelectOperationModal();
            // User cancelled
            if (!parentOperation) {
                this.parentControl.markAsTouched();
                this.parentControl.markAsDirty();
                this.markForCheck();
                return;
            }
            // DEBUG
            console.debug('[operation-form] Set parent operation', parentOperation);
            const form = this.form;
            const metierControl = form.get('metier');
            const physicalGearControl = form.get('physicalGear');
            const startPositionControl = form.get('startPosition');
            const fishingStartPositionControl = form.get('fishingStartPosition');
            const fishingEndPositionControl = form.get('fishingEndPosition');
            const endPositionControl = form.get('endPosition');
            const startDateTimeControl = form.get('startDateTime');
            const fishingStartDateTimeControl = form.get('fishingStartDateTime');
            const qualityFlagIdControl = form.get('qualityFlagId');
            const fishingAreasControl = this._showFishingArea && form.get('fishingAreas');
            this.parentControl.setValue(parentOperation);
            if (this._trip.id === parentOperation.tripId) {
                physicalGearControl.patchValue(parentOperation.physicalGear);
                metierControl.patchValue(parentOperation.metier);
            }
            // Parent is not on the same trip
            else {
                // Load physical gear with measurements
                let physicalGear = (yield this.physicalGearService.load(parentOperation.physicalGear.id, parentOperation.tripId));
                // Clean the local id, before searching (avoid false positive, because local ids are used many times, in different trips)
                if (EntityUtils.isLocalId(physicalGear.id)) {
                    physicalGear.id = undefined;
                }
                // Find trip's similar gears
                const physicalGearMatches = (yield firstNotNilPromise(this._$physicalGears, { stop: this.destroySubject }))
                    .filter(pg => PhysicalGear.equals(physicalGear, pg, { withMeasurementValues: true, withRankOrder: false }));
                if (isEmptyArray(physicalGearMatches)) {
                    physicalGear.id = undefined;
                    physicalGear.trip = undefined;
                    physicalGear.tripId = this.trip.id;
                    physicalGear.rankOrder = null; // Will be computed when saving
                    physicalGear.synchronizationStatus = null;
                    physicalGear.updateDate = null;
                    // Use gear label, if any
                    const physicalGearLabel = getPropertyByPath(physicalGear, `measurementValues.${PmfmIds.GEAR_LABEL}`);
                    if (isNotNilOrBlank(physicalGearLabel)) {
                        physicalGear.gear.name = physicalGearLabel;
                    }
                    // Append this gear to the list
                    this._$physicalGears.next([...physicalGearMatches, physicalGear]);
                }
                else {
                    // Sort by score (desc)
                    if (physicalGearMatches.length > 1) {
                        physicalGearMatches.sort(PhysicalGear.scoreComparator(physicalGear, 'desc', { withMeasurementValues: true, withRankOrder: true }));
                        if (this.debug)
                            console.warn('[operation-form] Several matching physical gear on trip', physicalGearMatches);
                    }
                    // Keep the best match
                    physicalGear = physicalGearMatches[0];
                }
                physicalGearControl.setValue(physicalGear);
                // Use the parent metier
                metierControl.patchValue(parentOperation.metier);
                yield this.loadMetiers(physicalGear);
            }
            // Copy positions
            if (this._showPosition) {
                // Copy parent's positions
                this.setPosition(startPositionControl, parentOperation.startPosition);
                if (this.fishingStartDateTimeEnable)
                    this.setPosition(fishingStartPositionControl, parentOperation.fishingStartPosition);
                // Init child default position
                if (this.fishingEndDateTimeEnable)
                    this.setPosition(fishingEndPositionControl, parentOperation.startPosition);
                if (this.endDateTimeEnable)
                    this.setPosition(endPositionControl, parentOperation.fishingStartPosition);
            }
            // Copy fishing area
            if (this._showFishingArea && isNotEmptyArray(parentOperation.fishingAreas)) {
                const fishingAreasCopy = parentOperation.fishingAreas
                    .filter(fa => ReferentialUtils.isNotEmpty(fa.location))
                    .map(fa => ({ location: fa.location }));
                if (isNotEmptyArray(fishingAreasCopy) && this.fishingAreasHelper.size() <= 1) {
                    this.fishingAreasHelper.resize(fishingAreasCopy.length);
                    fishingAreasControl.patchValue(fishingAreasCopy);
                }
            }
            startDateTimeControl.patchValue(parentOperation.startDateTime);
            fishingStartDateTimeControl.patchValue(parentOperation.fishingStartDateTime);
            qualityFlagIdControl.patchValue(null); // Reset quality flag, on a child operation
            this.markAsDirty();
            return parentOperation;
        });
    }
    addFishingArea() {
        this.fishingAreasHelper.add();
        if (!this.mobile) {
            this.fishingAreaFocusIndex = this.fishingAreasHelper.size() - 1;
        }
    }
    toggleMetierFilter(event, field) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event)
                event.preventDefault();
            this.toggleFilter('metier');
            if (!this.loading) {
                // Refresh metiers
                const physicalGear = this.form.get('physicalGear').value;
                yield this.loadMetiers(physicalGear, { showAlertIfFailed: true, reloadIfFailed: false });
                if (field)
                    field.reloadItems();
            }
        });
    }
    toggleFilter(fieldName, field) {
        this.setFieldFilterEnable(fieldName, !this.isFieldFilterEnable(fieldName), field);
    }
    toggleComment() {
        this.showComment = !this.showComment;
        if (!this.showComment) {
            this.form.get('comments').setValue(null);
        }
        this.markForCheck();
    }
    translateControlPath(controlPath) {
        return this.operationService.translateControlPath(controlPath, { i18nPrefix: this.i18nFieldPrefix });
    }
    /* -- protected methods -- */
    updateFormGroup(opts) {
        const validatorOpts = {
            isOnFieldMode: this.usageMode === 'FIELD',
            trip: this.trip,
            isParent: this.allowParentOperation && this.isParentOperation,
            isChild: this.allowParentOperation && this.isChildOperation,
            withMetier: this._showMetier,
            withPosition: this._showPosition,
            withFishingAreas: this._showFishingArea,
            withFishingStart: this.fishingStartDateTimeEnable,
            withFishingEnd: this.fishingEndDateTimeEnable,
            withEnd: this.endDateTimeEnable,
            maxDistance: this.maxDistanceError,
            boundingBox: this._boundingBox,
            maxShootingDurationInHours: this.maxShootingDurationInHours,
            maxTotalDurationInHours: this.maxTotalDurationInHours
        };
        // DEBUG
        console.debug(`[operation] Updating form group (validators)`, validatorOpts);
        this.validatorService.updateFormGroup(this.form, validatorOpts);
        if (validatorOpts.withFishingAreas)
            this.initFishingAreas(this.form);
        this.initPositionSubscription();
        if (!opts || opts.emitEvent !== false) {
            this.form.updateValueAndValidity();
            this.markForCheck();
        }
    }
    onPhysicalGearChanged(physicalGear) {
        return __awaiter(this, void 0, void 0, function* () {
            const metierControl = this.form.get('metier');
            const physicalGearControl = this.form.get('physicalGear');
            const hasPhysicalGear = EntityUtils.isNotEmpty(physicalGear, 'id');
            const gears = this._$physicalGears.getValue() || this._trip && this._trip.gears;
            // Use same trip's gear Object (if found)
            if (hasPhysicalGear && isNotEmptyArray(gears)) {
                physicalGear = (gears || []).find(g => g.id === physicalGear.id);
                physicalGearControl.patchValue(physicalGear, { emitEvent: false });
            }
            // Change metier status, if need
            if (this._showMetier) {
                const enableMetier = hasPhysicalGear && this.form.enabled && isNotEmptyArray(gears) || this.allowParentOperation;
                if (enableMetier) {
                    if (metierControl.disabled)
                        metierControl.enable();
                    // Refresh metiers
                    yield this.loadMetiers(physicalGear);
                }
                else {
                    if (metierControl.enabled)
                        metierControl.disable();
                }
            }
        });
    }
    loadMetiers(physicalGear, opts = {
        showAlertIfFailed: false,
        reloadIfFailed: true
    }) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Reset previous value
            if (isNotNil(this._$metiers.value))
                this._$metiers.next(null);
            // No gears selected: skip
            if (EntityUtils.isEmpty(physicalGear, 'id') || !this._showMetier)
                return;
            yield this.ready();
            const gear = physicalGear === null || physicalGear === void 0 ? void 0 : physicalGear.gear;
            console.debug('[operation-form] Loading Metier ref items for the gear: ' + (gear === null || gear === void 0 ? void 0 : gear.label));
            let res;
            if (this.autocompleteFilters.metier) {
                res = yield this.operationService.loadPracticedMetier(0, 30, null, null, Object.assign(Object.assign({}, METIER_DEFAULT_FILTER), { searchJoin: 'TaxonGroup', vesselId: this.trip.vesselSnapshot.id, startDate: this.startProgram, endDate: DateUtils.moment().add(1, 'day'), programLabel: this.programLabel, gearIds: gear && [gear.id], levelId: gear && gear.id || undefined }));
            }
            else {
                res = yield this.referentialRefService.loadAll(0, 100, null, null, Object.assign(Object.assign({}, METIER_DEFAULT_FILTER), { searchJoin: 'TaxonGroup', searchJoinLevelIds: this.metierTaxonGroupTypeIds, levelId: gear && gear.id || undefined }), { withTotal: true });
            }
            // No result in filtered metier: retry with all metiers
            if (this.autocompleteFilters.metier && isEmptyArray(res.data)) {
                // Warn the user
                if (opts.showAlertIfFailed) {
                    yield Alerts.showError('TRIP.OPERATION.ERROR.CANNOT_ENABLE_FILTER_METIER_NO_DATA', this.alertCtrl, this.translate, {
                        titleKey: 'TRIP.OPERATION.ERROR.CANNOT_ENABLE_FILTER'
                    }, {});
                }
                // Back to unfiltered list, then loop
                this.toggleFilter('metier');
                if (opts.reloadIfFailed) {
                    return this.loadMetiers(physicalGear);
                }
                return;
            }
            const metierControl = this.form.get('metier');
            const metier = metierControl.value;
            if (ReferentialUtils.isNotEmpty(metier)) {
                // Find new reference, by ID
                let updatedMetier = (res.data || []).find(m => m.id === metier.id);
                // If not found : retry using the label (WARN: because of searchJoin, label = taxonGroup.label)
                updatedMetier = updatedMetier || (res.data || []).find(m => m.label === metier.label);
                // Check if update metier is need (e.g. ID changed)
                if (updatedMetier && !ReferentialUtils.equals(metier, updatedMetier)) {
                    metierControl.patchValue(updatedMetier);
                }
                // Check if need to reset metier
                else if (!updatedMetier && !this.loading && !this.isChildOperation) {
                    // Retry without filter
                    if (this.autocompleteFilters.metier) {
                        this.toggleFilter('metier');
                        return this.loadMetiers(physicalGear); // Loop
                    }
                    // Or clean
                    console.warn('[operation-form] Cleaning metier, as it has not been found in metier');
                    metierControl.patchValue(null);
                }
            }
            if (((_a = res.data) === null || _a === void 0 ? void 0 : _a.length) === 1 && ReferentialUtils.isEmpty(metier)) {
                metierControl.patchValue(res.data[0]);
            }
            this._$metiers.next(res);
        });
    }
    setIsParentOperation(isParent, opts) {
        var _a;
        if (this.debug)
            console.debug('[operation-form] Is parent operation ? ', isParent);
        if (this.isParentOperationControl.value !== isParent) {
            this.isParentOperationControl.setValue(isParent, opts);
        }
        const emitEvent = (!opts || opts.emitEvent !== false);
        // Parent operation (= Filage) (or parent not used)
        if (isParent) {
            if (emitEvent) {
                // Clean child fields
                this.form.patchValue({
                    fishingEndDateTime: null,
                    endDateTime: null,
                    physicalGear: null,
                    metier: null,
                    parentOperation: null
                });
                this.updateFormGroup();
            }
            // Silent mode
            else {
                if (!this.childControl)
                    this.updateFormGroup({ emitEvent: false }); // Create the child control
                // Make sure qualityFlag has been set
                this.qualityFlagControl.reset(QualityFlagIds.NOT_COMPLETED, { emitEvent: false });
            }
        }
        // Child operation (=Virage)
        else {
            if (emitEvent) {
                if (!this.parentControl.value) {
                    // Copy parent fields -> child fields
                    const dates = [this.form.get('startDateTime').value, this.form.get('fishingStartDateTime').value].filter(isNotNil);
                    if (this.fishingEndDateTimeEnable && isNotEmptyArray(dates)) {
                        this.form.get('fishingEndDateTime').patchValue(dates.shift());
                    }
                    if (this.endDateTimeEnable && isNotEmptyArray(dates)) {
                        this.form.get('endDateTime').patchValue(dates.shift());
                    }
                    if (this.showFishingArea)
                        (_a = this.form.get('fishingAreas')) === null || _a === void 0 ? void 0 : _a.patchValue(this.form.get('fishingAreas').value);
                    // Clean parent fields (should be filled after parent selection)
                    this.form.patchValue({
                        startDateTime: null,
                        fishingStartDateTime: null,
                        physicalGear: null,
                        metier: null,
                        childOperation: null
                    });
                    this.updateFormGroup();
                    // Select a parent (or same if user cancelled)
                    this.addParentOperation();
                }
            }
            // Silent mode
            else {
                // Reset qualityFlag
                this.qualityFlagControl.reset(null, { emitEvent: false });
            }
        }
    }
    getI18nFieldName(path) {
        // Replace 'metier' control name, by the UI field name
        if (path === 'metier')
            path = 'targetSpecies';
        return super.getI18nFieldName(path);
    }
    setPosition(positionControl, position) {
        const latitudeControl = positionControl.get('latitude');
        const longitudeControl = positionControl.get('longitude');
        if (isNil(latitudeControl) || isNil(longitudeControl)) {
            console.warn('[operation-form] This control does not contains longitude or latitude field');
            return;
        }
        latitudeControl.patchValue(toNumber(position === null || position === void 0 ? void 0 : position.latitude, null));
        longitudeControl.patchValue(toNumber(position === null || position === void 0 ? void 0 : position.longitude, null));
    }
    updateDistance(opts = { emitEvent: true }) {
        if (!this._showPosition)
            return; // Skip
        const startPosition = this.form.get('startPosition').value;
        const endPositionControl = this.lastActivePositionControl;
        const endPosition = endPositionControl === null || endPositionControl === void 0 ? void 0 : endPositionControl.value;
        if (!startPosition || !endPosition) {
            this.distance = undefined;
            this.distanceWarning = false;
            // Force to update the end control error
            if (endPositionControl === null || endPositionControl === void 0 ? void 0 : endPositionControl.hasError('maxDistance')) {
                endPositionControl.updateValueAndValidity({ emitEvent: false });
            }
        }
        else {
            this.distance = PositionUtils.computeDistanceInMiles(startPosition, endPosition);
            if (this.debug)
                console.debug('[operation-form] Distance between position: ' + this.distance);
            // Distance > max distance warn
            const distanceError = isNotNilOrNaN(this.distance) && this.maxDistanceError > 0 && this.distance > this.maxDistanceError;
            this.distanceWarning = isNotNilOrNaN(this.distance) && !distanceError
                && this.maxDistanceWarning > 0 && this.distance > this.maxDistanceWarning;
            // Force to update the end control error
            if (distanceError || endPositionControl.hasError('maxDistance')) {
                endPositionControl.updateValueAndValidity({ emitEvent: false });
            }
        }
        if (!opts || !opts.emitEvent !== false) {
            this.markForCheck();
        }
    }
    suggestMetiers(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ReferentialUtils.isNotEmpty(value))
                return { data: [value] };
            // Replace '*' character by undefined
            if (!value || value === '*') {
                value = undefined;
            }
            // trim search text, and ignore some characters
            else if (value && typeof value === 'string') {
                value = value.trim().replace(TEXT_SEARCH_IGNORE_CHARS_REGEXP, '*');
            }
            let res = this._$metiers.value;
            if (isNil(res === null || res === void 0 ? void 0 : res.data)) {
                console.debug('[operation-form] Waiting metier to be loaded...');
                res = yield firstNotNilPromise(this._$metiers, { stop: this.destroySubject });
            }
            return suggestFromArray(res.data, value, filter);
        });
    }
    suggestFishingAreaLocations(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
            // Excluded existing locations, BUT keep the current control value
            const excludedIds = (this.fishingAreasForm.value || [])
                .map(fa => fa.location)
                .filter(ReferentialUtils.isNotEmpty)
                .filter(item => !currentControlValue || currentControlValue !== item)
                .map(item => parseInt(item.id));
            if (this.autocompleteFilters.fishingArea && isNotNil(this.filteredFishingAreaLocations)) {
                return suggestFromArray(this.filteredFishingAreaLocations, value, Object.assign(Object.assign({}, filter), { excludedIds }));
            }
            else {
                return this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { excludedIds }));
            }
        });
    }
    isFieldFilterEnable(fieldName) {
        return this.autocompleteFilters[fieldName];
    }
    setFieldFilterEnable(fieldName, value, field, forceReload) {
        if (this.autocompleteFilters[fieldName] !== value || forceReload) {
            this.autocompleteFilters[fieldName] = value;
            this.markForCheck();
            if (field)
                field.reloadItems();
        }
    }
    initFishingAreas(form) {
        this.fishingAreasHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, form, 'fishingAreas'), (fishingArea) => this.fishingAreaValidatorService.getFormGroup(fishingArea, { required: true }), (o1, o2) => isNil(o1) && isNil(o2) || (o1 && o1.equals(o2)), (fishingArea) => !fishingArea || ReferentialUtils.isEmpty(fishingArea.location), { allowEmptyArray: false });
        if (this.fishingAreasHelper.size() === 0) {
            this.fishingAreasHelper.resize(1);
        }
        //this.fishingAreasHelper.formArray.setValidators(SharedFormArrayValidators.requiredArrayMinLength(1));
    }
    initPositionSubscription() {
        var _a;
        (_a = this._positionSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        if (!this.showPosition)
            return;
        const subscription = merge(this.form.get('startPosition').valueChanges, this.lastActivePositionControl.valueChanges)
            .pipe(debounceTime(200))
            .subscribe(_ => this.updateDistance());
        this.registerSubscription(subscription);
        this._positionSubscription = subscription;
        subscription.add(() => {
            this.unregisterSubscription(subscription);
            this._positionSubscription = null;
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationForm.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationForm.prototype, "fishingStartDateTimeEnable", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationForm.prototype, "fishingEndDateTimeEnable", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationForm.prototype, "endDateTimeEnable", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationForm.prototype, "defaultLatitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationForm.prototype, "defaultLongitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], OperationForm.prototype, "filteredFishingAreaLocations", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], OperationForm.prototype, "fishingAreaLocationLevelIds", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], OperationForm.prototype, "metierTaxonGroupTypeIds", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], OperationForm.prototype, "maxDistanceWarning", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], OperationForm.prototype, "maxDistanceError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], OperationForm.prototype, "maxShootingDurationInHours", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], OperationForm.prototype, "maxTotalDurationInHours", void 0);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], OperationForm.prototype, "usageMode", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationForm.prototype, "showMetier", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationForm.prototype, "showMetierFilter", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationForm.prototype, "allowParentOperation", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationForm.prototype, "defaultIsParentOperation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationForm.prototype, "showPosition", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], OperationForm.prototype, "boundingBox", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationForm.prototype, "showFishingArea", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationForm.prototype, "requiredComment", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationForm.prototype, "isParentOperation", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationForm.prototype, "isChildOperation", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], OperationForm.prototype, "parentChanges", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], OperationForm.prototype, "lastEndDateChanges", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], OperationForm.prototype, "openParentOperation", void 0);
OperationForm = __decorate([
    Component({
        selector: 'app-form-operation',
        templateUrl: './operation.form.html',
        styleUrls: ['./operation.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(14, Optional()),
    __metadata("design:paramtypes", [Injector,
        Router,
        DateFormatService,
        OperationValidatorService,
        ReferentialRefService,
        ModalController,
        AlertController,
        AccountService,
        OperationService,
        PhysicalGearService,
        PmfmService,
        UntypedFormBuilder,
        FishingAreaValidatorService,
        ChangeDetectorRef,
        Geolocation])
], OperationForm);
export { OperationForm };
//# sourceMappingURL=operation.form.js.map