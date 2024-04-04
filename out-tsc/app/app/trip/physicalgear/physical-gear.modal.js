import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Injector, Input, Output, Self, ViewChild, } from '@angular/core';
import { AcquisitionLevelCodes, PmfmIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { PhysicalGearForm } from './physical-gear.form';
import { AppEntityEditorModal, createPromiseEventEmitter, emitPromiseEvent, firstNotNilPromise, InMemoryEntitiesService, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, toBoolean, toNumber, TranslateContextService, } from '@sumaris-net/ngx-components';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from '@app/trip/physicalgear/physicalgear.service';
import { filter, switchMap } from 'rxjs/operators';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { slideDownAnimation } from '@app/shared/material/material.animation';
import { RxState } from '@rx-angular/state';
import { environment } from '@environments/environment';
const INVALID_GEAR_ID = -999;
let PhysicalGearModal = class PhysicalGearModal extends AppEntityEditorModal {
    constructor(injector, translateContext, childrenGearService, _state, cd) {
        super(injector, PhysicalGear, {
            tabCount: 2,
            i18nPrefix: 'TRIP.PHYSICAL_GEAR.EDIT.',
            enableSwipe: false
        });
        this.translateContext = translateContext;
        this.childrenGearService = childrenGearService;
        this._state = _state;
        this.cd = cd;
        this.gear$ = this._state.select('gear');
        this.gearId$ = this._state.select('gearId');
        this.childrenTable$ = this._state.select('childrenTable');
        this.showChildrenTable$ = this._state.select('showChildrenTable');
        this.childAcquisitionLevel = 'CHILD_PHYSICAL_GEAR';
        this.canEditGear = false;
        this.canEditRankOrder = false;
        this.minChildrenCount = 2;
        this.showGear = true;
        this.showSearchButton = true;
        this.maxItemCountForButtons = 12;
        this.searchButtonClick = createPromiseEventEmitter();
        // Default values
        this._logPrefix = '[physical-gear-modal] ';
        this.acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;
        this.tabGroupAnimationDuration = this.mobile ? this.tabGroupAnimationDuration : '0s';
        // TODO: for DEV only
        this.debug = !environment.production;
    }
    get form() {
        return this.physicalGearForm.form;
    }
    get childrenTable() {
        return this._state.get('childrenTable');
    }
    set childrenTable(table) {
        this._state.set('childrenTable', () => table);
    }
    get showChildrenTable() {
        return this._state.get('showChildrenTable');
    }
    set showChildrenTable(value) {
        this._state.set('showChildrenTable', _ => value);
    }
    ngOnInit() {
        this.allowChildrenGears = toBoolean(this.allowChildrenGears, true);
        super.ngOnInit();
        if (this.enabled && this.isNew) {
            this.markAsLoaded();
        }
    }
    registerForms() {
        this.addChildForms([
            this.physicalGearForm,
            // Will be included by (ngInit)= (see template)
            //this.childrenTable
        ]);
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.searchButtonClick.unsubscribe();
        this.childrenGearService.stop();
    }
    ngAfterViewInit() {
        const _super = Object.create(null, {
            ngAfterViewInit: { get: () => super.ngAfterViewInit }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ngAfterViewInit.call(this);
            this._state.connect('gear', this.physicalGearForm.form.get('gear').valueChanges);
            this._state.connect('gearId', this._state.select('gear'), (_, gear) => toNumber(gear === null || gear === void 0 ? void 0 : gear.id, INVALID_GEAR_ID));
            if (this.allowChildrenGears) {
                this._state.connect('childrenPmfms', this._state.select('childrenTable')
                    .pipe(filter(isNotNil), switchMap((table) => table.pmfms$)), (_, pmfms) => {
                    console.debug('[physical-gear-modal] Receiving new pmfms', pmfms);
                    return pmfms;
                });
                this._state.connect('showChildrenTable', this._state.select(['childrenPmfms', 'gearId'], ({ childrenPmfms, gearId }) => {
                    // DEBUG
                    console.debug('[physical-gear-modal] Should show children table ?', childrenPmfms, gearId);
                    // Check if table has something to display (some PMFM in the strategy)
                    const childrenHasSomePmfms = (childrenPmfms || []).some(p => 
                    // Exclude Pmfm on all gears (e.g. GEAR_LABEL)
                    PmfmUtils.isDenormalizedPmfm(p) && isNotEmptyArray(p.gearIds)
                        // Keep only if applied to the selected gear (if any)
                        // We need to filter by gearId, because sometimes the table pmfms are outdated (e.g. on a previous gearId)
                        && (isNil(gearId) || p.gearIds.includes(gearId)));
                    return (childrenPmfms && isNotNil(gearId) && gearId !== INVALID_GEAR_ID)
                        ? childrenHasSomePmfms
                        : null;
                }));
                this._state.hold(this.showChildrenTable$, () => this.updateChildrenTableState());
            }
            else {
                this.showChildrenTable = false;
            }
            // Focus on the first field, is not in mobile
            if (this.isNew && !this.mobile && this.enabled) {
                setTimeout(() => this.physicalGearForm.focusFirstInput(), 400);
            }
        });
    }
    openSearchModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.searchButtonClick.observers.length === 0)
                return; // Skip
            // Emit event, then wait for a result
            try {
                const selectedData = yield emitPromiseEvent(this.searchButtonClick, this.acquisitionLevel);
                // No result (user cancelled): skip
                if (!selectedData)
                    return;
                // Create a copy
                const data = PhysicalGear.fromObject({
                    gear: selectedData.gear,
                    rankOrder: selectedData.rankOrder,
                    // Convert measurementValues as JSON, in order to force values of not required PMFM to be converted, in the form
                    measurementValues: MeasurementValuesUtils.asObject(selectedData.measurementValues, { minify: true }),
                    measurements: selectedData.measurements,
                }).asObject();
                if (!this.canEditRankOrder) {
                    // Apply computed rankOrder
                    data.rankOrder = this.data.rankOrder;
                }
                // Apply to form
                console.debug('[physical-gear-modal] Paste selected gear:', data);
                yield this.setValue(data);
                this.markAsDirty();
            }
            catch (err) {
                if (err === 'CANCELLED')
                    return; // Skip
                this.setError(err);
                this.scrollToTop();
            }
        });
    }
    // Change to public, to be able to force refresh
    markForCheck() {
        this.cd.markForCheck();
    }
    /* -- protected functions -- */
    initChildrenTable(table) {
        // DEBUG
        console.debug('[physical-gear-modal] Init children table', table);
        // Add children table to the editor
        this.addChildForm(table);
        // Configure table
        table.setModalOption('helpMessage', this.helpMessage);
        table.setModalOption('maxVisibleButtons', this.maxVisibleButtons);
        table.setModalOption('maxItemCountForButtons', this.maxItemCountForButtons);
        // Update state
        this.childrenTable = table;
        this.updateChildrenTableState();
    }
    updateViewState(data, opts) {
        super.updateViewState(data, opts);
        this.updateChildrenTableState(opts);
        // Restore error
        const errorMessage = this.enabled && this.usageMode === 'DESK' && isNil(data.controlDate) ? data.qualificationComments : undefined;
        if (isNotNilOrBlank(errorMessage)) {
            console.info('[physical-gear-modal] Restore error from qualificationComments : ', errorMessage);
            // Clean quality flags
            this.form.patchValue({
                qualificationComments: null,
                qualityFlagId: QualityFlagIds.NOT_QUALIFIED
            }, { emitEvent: false });
            setTimeout(() => {
                this.markAllAsTouched();
                this.form.updateValueAndValidity();
                // Replace newline by a <br> tag, then display
                this.setError(errorMessage.replace(/(\n|\r|<br\/>)+/g, '<br/>'));
            });
        }
    }
    updateChildrenTableState(opts) {
        const table = this.childrenTable;
        if (!table)
            return; // Skip
        const enabled = this.enabled && this.showChildrenTable === true;
        if (enabled && !table.enabled) {
            console.debug('[physical-gear-modal] Enable children table');
            table.enable();
        }
        else if (!enabled && table.enabled) {
            console.debug('[physical-gear-modal] Disable children table');
            table.disable();
        }
    }
    setValue(data) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Save children, before reset (not need in the main form)
            const children = data.children;
            data.children = undefined;
            // Set main form
            yield this.physicalGearForm.setValue(data);
            if (this.allowChildrenGears) {
                const childrenTable = yield firstNotNilPromise(this.childrenTable$, { stop: this.destroySubject, stopError: false });
                childrenTable.gearId = (_a = data.gear) === null || _a === void 0 ? void 0 : _a.id;
                childrenTable.markAsReady();
                this.childrenGearService.value = children || [];
                yield childrenTable.waitIdle({ timeout: 2000, stop: this.destroySubject, stopError: false });
                // Restore children
                data.children = children;
            }
        });
    }
    getValue() {
        return __awaiter(this, void 0, void 0, function* () {
            const data = PhysicalGear.fromObject(this.physicalGearForm.value);
            if (this.allowChildrenGears && this.showChildrenTable) {
                if (this.childrenTable.dirty) {
                    yield this.childrenTable.save();
                }
                data.children = this.childrenGearService.value;
            }
            else {
                data.children = null;
            }
            return data;
        });
    }
    saveAndClose(event) {
        const _super = Object.create(null, {
            saveAndClose: { get: () => super.saveAndClose }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const valid = yield _super.saveAndClose.call(this, event);
            if (!valid) {
                // Need to mark table as touched, to show not enough row error
                this.markAllAsTouched();
            }
            return valid;
        });
    }
    getJsonValueToSave() {
        return __awaiter(this, void 0, void 0, function* () {
            console.warn('Should not used this method! Because form and childrenTable always return Entities!');
            const data = yield this.getValue();
            return data.asObject();
        });
    }
    computeTitle(data) {
        data = data || this.data;
        if (this.isNewData || !data) {
            return this.translateContext.instant('TRIP.PHYSICAL_GEAR.NEW.TITLE', this.i18nSuffix);
        }
        else {
            const label = (data === null || data === void 0 ? void 0 : data.measurementValues[PmfmIds.GEAR_LABEL]) || ('#' + data.rankOrder);
            return this.translateContext.instant('TRIP.PHYSICAL_GEAR.EDIT.TITLE', this.i18nSuffix, { label });
        }
    }
    getFirstInvalidTabIndex() {
        var _a;
        if (this.showChildrenTable && ((_a = this.childrenTable) === null || _a === void 0 ? void 0 : _a.invalid))
            return 1;
        return 0;
    }
    /**
     * Open a modal to select a previous child gear
     *
     * @param event
     */
    openSearchChildrenModal(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!event || !event.detail.success)
                return; // Skip (missing callback)
            if (this.searchButtonClick.observers.length === 0) {
                event.detail.error('CANCELLED');
                return; // Skip
            }
            // Emit event, then wait for a result
            try {
                const selectedData = yield emitPromiseEvent(this.searchButtonClick, event.type);
                if (selectedData) {
                    // Create a copy
                    const data = PhysicalGear.fromObject({
                        gear: selectedData.gear,
                        rankOrder: selectedData.rankOrder,
                        // Convert measurementValues as JSON, in order to force values of not required PMFM to be converted, in the form
                        measurementValues: MeasurementValuesUtils.asObject(selectedData.measurementValues, { minify: true }),
                        measurements: selectedData.measurements
                    }).asObject();
                    event.detail.success(data);
                }
                // User cancelled
                else {
                    event.detail.error('CANCELLED');
                }
            }
            catch (err) {
                console.error(err);
                (_a = event.detail) === null || _a === void 0 ? void 0 : _a.error(err);
            }
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], PhysicalGearModal.prototype, "helpMessage", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PhysicalGearModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PhysicalGearModal.prototype, "childAcquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PhysicalGearModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], PhysicalGearModal.prototype, "tripId", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearModal.prototype, "canEditGear", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearModal.prototype, "canEditRankOrder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PhysicalGearModal.prototype, "allowChildrenGears", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearModal.prototype, "minChildrenCount", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearModal.prototype, "showGear", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearModal.prototype, "showSearchButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], PhysicalGearModal.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearModal.prototype, "maxItemCountForButtons", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], PhysicalGearModal.prototype, "searchButtonClick", void 0);
__decorate([
    ViewChild(PhysicalGearForm, { static: true }),
    __metadata("design:type", PhysicalGearForm)
], PhysicalGearModal.prototype, "physicalGearForm", void 0);
PhysicalGearModal = __decorate([
    Component({
        selector: 'app-physical-gear-modal',
        templateUrl: './physical-gear.modal.html',
        styleUrls: ['./physical-gear.modal.scss'],
        providers: [
            {
                provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
                useFactory: () => new InMemoryEntitiesService(PhysicalGear, PhysicalGearFilter, {
                    equals: PhysicalGear.equals,
                    sortByReplacement: { id: 'rankOrder' }
                })
            },
            RxState
        ],
        animations: [
            slideDownAnimation
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(2, Self()),
    __param(2, Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN)),
    __metadata("design:paramtypes", [Injector,
        TranslateContextService,
        InMemoryEntitiesService,
        RxState,
        ChangeDetectorRef])
], PhysicalGearModal);
export { PhysicalGearModal };
//# sourceMappingURL=physical-gear.modal.js.map