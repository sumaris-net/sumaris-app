import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, Component, Inject, Injector, Input, Output } from '@angular/core';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { createPromiseEventEmitter, isNotNil, ReferentialRef, SharedValidators, toBoolean, } from '@sumaris-net/ngx-components';
import { PhysicalGearModal } from './physical-gear.modal';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from './physicalgear.service';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PhysicalGearFilter } from './physical-gear.filter';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { debounceTime, filter } from 'rxjs/operators';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { environment } from '@environments/environment';
import { BehaviorSubject, merge, Subscription } from 'rxjs';
import { TripContextService } from '@app/trip/trip-context.service';
import { ProgramProperties } from '@app/referential/services/config/program.config';
export const GEAR_RESERVED_START_COLUMNS = ['gear'];
export const GEAR_RESERVED_END_COLUMNS = ['subGearsCount', 'lastUsed', 'comments'];
let PhysicalGearTable = class PhysicalGearTable extends BaseMeasurementsTable {
    constructor(injector, formBuilder, dataService, context) {
        super(injector, PhysicalGear, PhysicalGearFilter, dataService, null, // No validator = no inline edition
        {
            reservedStartColumns: GEAR_RESERVED_START_COLUMNS,
            reservedEndColumns: GEAR_RESERVED_END_COLUMNS,
            mapPmfms: (pmfms) => this.mapPmfms(pmfms),
            requiredStrategy: true
        });
        this.context = context;
        this.touchedSubject = new BehaviorSubject(false);
        this.canDelete = true;
        this.canSelect = true;
        this.useSticky = false;
        this.title = null;
        this.defaultGear = null;
        this.canEditGear = true;
        this.showError = true;
        this.showFilter = false;
        this.showPmfmDetails = false;
        this.compactFields = true;
        this.minRowCount = 0;
        this.openSelectPreviousGearModal = createPromiseEventEmitter();
        this.filterForm = formBuilder.group({
            tripId: [null],
            startDate: [null, Validators.compose([Validators.required, SharedValidators.validDate])],
            endDate: [null, Validators.compose([SharedValidators.validDate, SharedValidators.dateRangeEnd('startDate')])],
        });
        this.defaultSortBy = 'id';
        this.inlineEdition = false;
        this.i18nColumnPrefix = 'TRIP.PHYSICAL_GEAR.TABLE.';
        this.i18nPmfmPrefix = 'TRIP.PHYSICAL_GEAR.PMFM.';
        this.autoLoad = true;
        this.canEdit = true;
        // Set default acquisition level
        this.acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;
        // Excluded columns, by default
        this.excludesColumns.push('lastUsed');
        this.excludesColumns.push('subGearsCount');
        // FOR DEV ONLY ----
        this.logPrefix = '[physical-gears-table] ';
        this.debug = !environment.production;
    }
    set tripId(tripId) {
        this.setTripId(tripId);
    }
    get tripId() {
        return this.filterForm.get('tripId').value;
    }
    set showSelectColumn(show) {
        this.setShowColumn('select', show);
    }
    set showLastUsedColumn(show) {
        this.setShowColumn('lastUsed', show);
    }
    set showGearColumn(show) {
        this.setShowColumn('gear', show);
    }
    get showGearColumn() {
        return this.getShowColumn('gear');
    }
    set allowChildrenGears(value) {
        this.setModalOption('allowChildrenGears', value);
    }
    get allowChildrenGears() {
        return this.getModalOption('allowChildrenGears');
    }
    set showSubGearsCountColumn(show) {
        this.setShowColumn('subGearsCount', show);
    }
    get showSubGearsCountColumn() {
        return this.getShowColumn('subGearsCount');
    }
    get valid() {
        return super.valid && (this.totalRowCount >= this.minRowCount);
    }
    get invalid() {
        return super.invalid || (this.totalRowCount < this.minRowCount);
    }
    get touched() {
        return this.touchedSubject.value;
    }
    markAllAsTouched(opts) {
        this.touchedSubject.next(true);
        super.markAllAsTouched(opts);
    }
    markAsPristine(opts) {
        this.touchedSubject.next(false);
        super.markAsPristine(opts);
    }
    ngOnInit() {
        super.ngOnInit();
        this.mobile = toBoolean(this.mobile, this.settings.mobile);
        this._enabled = this.canEdit;
        if (!this._enabled || !this.canDelete || !this.mobile)
            this.excludesColumns.push('actions');
        // Update filter when changes
        this.registerSubscription(this.filterForm.valueChanges
            .pipe(debounceTime(250), 
        // DEBUG
        //tap(json => console.debug("filter changed:", json)),
        filter(() => this.filterForm.valid))
            // Applying the filter
            .subscribe((json) => this.setFilter(Object.assign(Object.assign({}, this.filter), json), { emitEvent: true /*always apply*/ })));
        if (this.minRowCount > 0) {
            this.registerSubscription(merge(this.touchedSubject, this.dataSource.rowsSubject)
                .pipe(debounceTime(100), 
            //tap(() => console.debug(this.logPrefix + 'Updating minRowCount error'))
            filter(_ => this.enabled))
                .subscribe(_ => {
                if (this.totalRowCount < this.minRowCount) {
                    const error = this.translate.instant((this.minRowCount === 1
                        ? 'TRIP.PHYSICAL_GEAR.ERROR.NOT_ENOUGH_SUB_GEAR'
                        : 'TRIP.PHYSICAL_GEAR.ERROR.NOT_ENOUGH_SUB_GEARS'), { minRowCount: this.minRowCount });
                    this.setError(error);
                }
                else {
                    this.resetError();
                }
            }));
        }
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.openSelectPreviousGearModal.unsubscribe();
    }
    setTripId(tripId, opts) {
        this.setFilter(Object.assign(Object.assign({}, this.filterForm.value), { tripId }), opts);
    }
    updateView(res, opts) {
        return super.updateView(res, opts);
    }
    setModalOption(key, value) {
        this.modalOptions = this.modalOptions || {};
        this.modalOptions[key] = value;
    }
    getModalOption(key) {
        return this.modalOptions[key];
    }
    setFilter(value, opts) {
        value = PhysicalGearFilter.fromObject(value);
        // Update the form content
        if (!opts || opts.emitEvent !== false) {
            this.filterForm.patchValue(value.asObject(), { emitEvent: false });
        }
        super.setFilter(value, opts);
    }
    setError(error, opts) {
        super.setError(error, opts);
    }
    resetError(opts) {
        this.setError(undefined, opts);
    }
    /* -- protected function -- */
    mapPmfms(pmfms) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const includedPmfmIds = (_a = this.context.program) === null || _a === void 0 ? void 0 : _a.getPropertyAsNumbers(ProgramProperties.TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_IDS);
            // Keep selectivity device, if any
            return pmfms.filter(p => p.required || (includedPmfmIds === null || includedPmfmIds === void 0 ? void 0 : includedPmfmIds.includes(p.id)));
        });
    }
    openNewRowDetail() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            if (this.onNewRow.observers.length) {
                this.onNewRow.emit();
                return true;
            }
            const { data, role } = yield this.openDetailModal();
            if (data && role !== 'delete') {
                if (this.debug)
                    console.debug('Adding new gear:', data);
                yield this.addEntityToTable(data, { confirmCreate: false, editing: false });
            }
            return true;
        });
    }
    openRow(id, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            if (this.onOpenRow.observers.length) {
                this.onOpenRow.emit(row);
                return true;
            }
            // Clone to keep original object unchanged
            const gear = PhysicalGear.fromObject(row.currentData).clone();
            // Convert measurementValues to model, in order to force values of not required PMFM to be converted later, in the modal's form
            gear.measurementValues = MeasurementValuesUtils.asObject(gear.measurementValues, { minify: true });
            const { data, role } = yield this.openDetailModal(gear);
            if (data && role !== 'delete') {
                yield this.updateEntityToTable(data, row);
            }
            else {
                this.editedRow = null;
            }
            return true;
        });
    }
    openDetailModal(dataToOpen) {
        return __awaiter(this, void 0, void 0, function* () {
            const isNew = !dataToOpen && true;
            if (isNew) {
                dataToOpen = new PhysicalGear();
                yield this.onNewEntity(dataToOpen);
            }
            dataToOpen.tripId = this.tripId;
            const subscription = new Subscription();
            const showSearchButton = isNew && this.openSelectPreviousGearModal.observers.length > 0;
            const hasTopModal = !!(yield this.modalCtrl.getTop());
            const modal = yield this.modalCtrl.create({
                component: PhysicalGearModal,
                componentProps: Object.assign({ programLabel: this.programLabel, acquisitionLevel: this.acquisitionLevel, disabled: this.disabled, data: dataToOpen.clone(), // Do a copy, because edition can be cancelled
                    isNew, tripId: this.tripId, canEditGear: this.canEditGear, canEditRankOrder: this.canEditRankOrder, showSearchButton, onAfterModalInit: (modal) => {
                        subscription.add(modal.searchButtonClick.subscribe(event => this.openSelectPreviousGearModal.emit(event)));
                    }, onDelete: (event, data) => this.deleteEntity(event, data), showGear: this.showGearColumn, i18nSuffix: this.i18nColumnSuffix, mobile: this.mobile, usageMode: this.usageMode }, this.modalOptions),
                cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large',
                backdropDismiss: false,
                keyboardClose: true
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data, role } = yield modal.onDidDismiss();
            subscription.unsubscribe();
            if (data && this.debug)
                console.debug(this.logPrefix + 'Modal result: ', data, role);
            return { data: (data instanceof PhysicalGear) ? data : undefined, role };
        });
    }
    pressRow(event, row) {
        return super.pressRow(event, row);
    }
    deleteEntity(event, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.findRowByEntity(data);
            // Row not exists: OK
            if (!row)
                return true;
            const confirmed = yield this.canDeleteRows([row]);
            if (confirmed) {
                return this.deleteRow(null, row, { interactive: false /*already confirmed*/ });
            }
            return confirmed;
        });
    }
    markAsReady(opts) {
        super.markAsReady(opts);
    }
    /* -- protected methods -- */
    onNewEntity(data) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(this.logPrefix + 'Initializing new row data...');
            yield _super.onNewEntity.call(this, data);
            // Default gear
            if (isNotNil(this.defaultGear)) {
                data.gear = this.defaultGear;
            }
            // Link to parent
            data.tripId = this.tripId;
        });
    }
    findRowByEntity(physicalGear) {
        return __awaiter(this, void 0, void 0, function* () {
            return PhysicalGear && this.dataSource.getRows().find(r => r.currentData.equals(physicalGear));
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearTable.prototype, "canDelete", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearTable.prototype, "canSelect", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], PhysicalGearTable.prototype, "copyPreviousGears", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PhysicalGearTable.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", ReferentialRef)
], PhysicalGearTable.prototype, "defaultGear", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearTable.prototype, "canEditGear", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearTable.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearTable.prototype, "showFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearTable.prototype, "showPmfmDetails", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearTable.prototype, "compactFields", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PhysicalGearTable.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PhysicalGearTable.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearTable.prototype, "minRowCount", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], PhysicalGearTable.prototype, "tripId", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PhysicalGearTable.prototype, "showSelectColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PhysicalGearTable.prototype, "showLastUsedColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PhysicalGearTable.prototype, "showGearColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PhysicalGearTable.prototype, "allowChildrenGears", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PhysicalGearTable.prototype, "showSubGearsCountColumn", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], PhysicalGearTable.prototype, "openSelectPreviousGearModal", void 0);
PhysicalGearTable = __decorate([
    Component({
        selector: 'app-physical-gears-table',
        templateUrl: 'physical-gears.table.html',
        styleUrls: ['physical-gears.table.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(2, Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN)),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder, Object, TripContextService])
], PhysicalGearTable);
export { PhysicalGearTable };
//# sourceMappingURL=physical-gears.table.js.map