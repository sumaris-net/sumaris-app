import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, Output, ViewChild, } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { OperationValidatorService } from './operation.validator';
import { OperationService } from './operation.service';
import { AccountService, AppFormUtils, isNotNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { OperationsMapModal } from './map/operations-map.modal';
import { environment } from '@environments/environment';
import { Operation } from '../trip/trip.model';
import { OperationFilter } from '@app/trip/operation/operation.filter';
import { from, merge } from 'rxjs';
import { UntypedFormBuilder } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material/expansion';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { DataQualityStatusEnum, DataQualityStatusIds, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { AppBaseTable } from '@app/shared/table/base.table';
let OperationsTable = class OperationsTable extends AppBaseTable {
    constructor(injector, settings, validatorService, _dataService, accountService, formBuilder, cd) {
        super(injector, Operation, OperationFilter, settings.mobile
            ? ['quality', 'physicalGear', 'targetSpecies', 'startDateTime', 'endDateTime', 'fishingEndDateTime', 'fishingArea']
            : [
                'quality',
                'physicalGear',
                'targetSpecies',
                'startDateTime',
                'startPosition',
                'endDateTime',
                'fishingEndDateTime',
                'endPosition',
                'fishingArea',
                'comments',
            ], _dataService, null, 
        // DataSource options
        {
            i18nColumnPrefix: 'TRIP.OPERATION.LIST.',
            prependNewElements: false,
            suppressErrors: environment.production,
            readOnly: false,
            watchAllOptions: {
                withBatchTree: false,
                withSamples: false,
                withTotal: true,
            },
        });
        this.settings = settings;
        this.validatorService = validatorService;
        this._dataService = _dataService;
        this.accountService = accountService;
        this.formBuilder = formBuilder;
        this.cd = cd;
        this.statusList = DataQualityStatusList.filter((s) => s.id !== DataQualityStatusIds.VALIDATED);
        this.statusById = DataQualityStatusEnum;
        this.filterForm = this.formBuilder.group({
            tripId: [null],
            dataQualityStatus: [null],
        });
        this.useSticky = true;
        this.allowParentOperation = false;
        this.showQuality = true;
        this.showRowError = false;
        // eslint-disable-next-line @angular-eslint/no-output-on-prefix
        this.onDuplicateRow = new EventEmitter();
        this.inlineEdition = false;
        this.confirmBeforeDelete = true;
        this.saveBeforeSort = false;
        this.saveBeforeFilter = false;
        this.saveBeforeDelete = false;
        this.autoLoad = false; // waiting parent to be loaded
        this.defaultPageSize = -1; // Do not use paginator
        this.defaultSortBy = this.mobile ? 'startDateTime' : 'endDateTime';
        this.defaultSortDirection = this.mobile ? 'desc' : 'asc';
        this.loadingSubject.next(false);
        // Listen settings changed
        this.registerSubscription(merge(from(this.settings.ready()), this.settings.onChange).subscribe((_) => this.configureFromSettings()));
    }
    set tripId(tripId) {
        this.setTripId(tripId);
    }
    get tripId() {
        return this.filterForm.get('tripId').value;
    }
    set showQualityColumn(value) {
        this.setShowColumn('quality', value);
    }
    get showQualityColumn() {
        return this.getShowColumn('quality');
    }
    get sortActive() {
        const sortActive = super.sortActive;
        // Local sort
        if (this.tripId < 0) {
            switch (sortActive) {
                case 'physicalGear':
                //return 'physicalGear.gear.' + this.displayAttributes.gear[0];
                case 'targetSpecies':
                //return 'metier.taxonGroup.' + this.displayAttributes.taxonGroup[0];
                case 'fishingArea':
                    //return 'fishingAreas.location.' + this.displayAttributes.fishingArea[0];
                    // Fix issue on rankOrder computation
                    return 'id';
                default:
                    return sortActive;
            }
        }
        // Remote sort
        else {
            switch (sortActive) {
                case 'targetSpecies':
                //return 'metier';
                case 'fishingArea':
                //return 'fishingAreas.location.' + this.displayAttributes.fishingArea[0];
                case 'physicalGear':
                    // Fix issue on rankOrder computation
                    return 'id';
                default:
                    return sortActive;
            }
        }
    }
    set showPosition(show) {
        this.setShowColumn('startPosition', show);
        this.setShowColumn('endPosition', show);
    }
    get showPosition() {
        return this.getShowColumn('startPosition') && this.getShowColumn('endPosition');
    }
    set showFishingArea(show) {
        this.setShowColumn('fishingArea', show);
    }
    get showFishingArea() {
        return this.getShowColumn('fishingArea');
    }
    set showEndDateTime(show) {
        this.setShowColumn('endDateTime', show);
    }
    get showEndDateTime() {
        return this.getShowColumn('endDateTime');
    }
    set showFishingEndDateTime(show) {
        this.setShowColumn('fishingEndDateTime', show);
    }
    get showFishingEndDateTime() {
        return this.getShowColumn('fishingEndDateTime');
    }
    get filterIsEmpty() {
        return this.filterCriteriaCount === 0;
    }
    get filterDataQualityControl() {
        return this.filterForm.controls.dataQualityStatus;
    }
    ngOnInit() {
        super.ngOnInit();
        // Default values
        this.showMap = toBoolean(this.showMap, false);
        // Mark filter form as pristine
        this.registerSubscription(this.onRefresh.subscribe(() => {
            this.filterForm.markAsUntouched();
            this.filterForm.markAsPristine();
        }));
        // Update filter when changes
        this.registerSubscription(this.filterForm.valueChanges
            .pipe(debounceTime(250), filter((_) => {
            const valid = this.filterForm.valid;
            if (!valid && this.debug)
                AppFormUtils.logFormErrors(this.filterForm);
            return valid && !this.loading;
        }), 
        // Update the filter, without reloading the content
        tap((json) => this.setFilter(json, { emitEvent: false })), 
        // Save filter in settings (after a debounce time)
        debounceTime(500), tap((json) => this.settings.savePageSetting(this.settingsId, json, AppRootTableSettingsEnum.FILTER_KEY)))
            .subscribe());
        // Apply trip id, if already set
        if (isNotNil(this.tripId)) {
            this.setTripId(this.tripId);
        }
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.onDuplicateRow.unsubscribe();
    }
    setTripId(tripId, opts) {
        this.setFilter(Object.assign(Object.assign({}, this.filterForm.value), { tripId }), opts);
    }
    openMapModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this._dataService.loadAllByTrip({
                tripId: this.tripId,
            }, { fetchPolicy: 'cache-first', fullLoad: false, withTotal: true /*to make sure cache has been filled*/ });
            if (!res.total)
                return; // No data
            const modal = yield this.modalCtrl.create({
                component: OperationsMapModal,
                componentProps: {
                    data: [res.data],
                    latLongPattern: this.latLongPattern,
                    programLabel: this.programLabel,
                },
                keyboardClose: true,
                cssClass: 'modal-large',
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data } = yield modal.onDidDismiss();
            if (data instanceof Operation) {
                console.info('[operation-table] User select an operation from the map:', data);
                // Open the row
                let row = this.dataSource.getRows().find((r) => r.currentData.id === data.id);
                if (row) {
                    this.clickRow(null, row);
                }
                else {
                    // Create a fake row
                    row = yield this.dataSource.createNew(null, { editing: true });
                    try {
                        row.currentData = data;
                        yield this.openRow(data.id, row);
                    }
                    finally {
                        row.cancelOrDelete();
                    }
                }
            }
        });
    }
    duplicateRow(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            event === null || event === void 0 ? void 0 : event.stopPropagation();
            row = row || this.singleSelectedRow;
            if (!row || !this.confirmEditCreate(event, row)) {
                return false;
            }
            this.onDuplicateRow.emit({ data: row.currentData });
            this.selection.clear();
        });
    }
    getUsedPhysicalGearIds() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataSource
                .getRows()
                .map((ope) => ope.currentData.physicalGear)
                .filter(isNotNil)
                .map((gear) => gear.id)
                .reduce((res, id) => (res.includes(id) ? res : res.concat(id)), []);
        });
    }
    // Changed as public
    getI18nColumnName(columnName) {
        return super.getI18nColumnName(columnName);
    }
    resetFilter(value, opts) {
        super.resetFilter(Object.assign(Object.assign({}, value), { tripId: this.tripId }), opts);
        this.resetError();
    }
    toggleFilterPanelFloating() {
        this.filterPanelFloating = !this.filterPanelFloating;
        this.markForCheck();
    }
    closeFilterPanel() {
        if (this.filterExpansionPanel)
            this.filterExpansionPanel.close();
        this.filterPanelFloating = true;
    }
    clearFilterValue(key, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.filterForm.get(key).reset(null);
    }
    // Change visibility to public
    setError(error, opts) {
        super.setError(error, opts);
        // If error
        if (error) {
            // Add filter on invalid rows (= not controlled)
            if (!opts || opts.showOnlyInvalidRows !== false) {
                this.showRowError = true;
                const filter = this.filter || new OperationFilter();
                filter.dataQualityStatus = 'MODIFIED'; // = not controlled operations
                this.setFilter(filter);
            }
        }
        // No errors
        else {
            // Remove filter on invalid rows
            if (!opts || opts.showOnlyInvalidRows !== true) {
                this.showRowError = false;
                const filter = this.filter || new OperationFilter();
                if (filter.dataQualityStatus === 'MODIFIED') {
                    filter.dataQualityStatus = undefined;
                    this.setFilter(filter);
                }
            }
        }
    }
    // Change visibility to public
    resetError(opts) {
        this.setError(undefined, opts);
    }
    trackByFn(index, row) {
        return row.currentData.id;
    }
    /* -- protected methods -- */
    asFilter(source) {
        source = source || this.filterForm.value;
        return OperationFilter.fromObject(source);
    }
    configureFromSettings(settings) {
        console.debug('[operation-table] Configure from local settings (latLong format, display attributes)...');
        settings = settings || this.settings.settings;
        if (settings.accountInheritance) {
            const account = this.accountService.account;
            this.latLongPattern = (account && account.settings && account.settings.latLongFormat) || this.settings.latLongFormat;
        }
        else {
            this.latLongPattern = this.settings.latLongFormat;
        }
        this.displayAttributes = {
            gear: this.settings.getFieldDisplayAttributes('gear'),
            physicalGear: this.settings.getFieldDisplayAttributes('gear', ['rankOrder', 'gear.label', 'gear.name']),
            taxonGroup: this.settings.getFieldDisplayAttributes('taxonGroup'),
            fishingArea: this.settings.getFieldDisplayAttributes('fishingArea', ['label']),
        };
        this.markForCheck();
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationsTable.prototype, "latLongPattern", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], OperationsTable.prototype, "showMap", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationsTable.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationsTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationsTable.prototype, "allowParentOperation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationsTable.prototype, "showQuality", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationsTable.prototype, "showRowError", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationsTable.prototype, "detailEditor", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], OperationsTable.prototype, "canDuplicate", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], OperationsTable.prototype, "tripId", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationsTable.prototype, "showQualityColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationsTable.prototype, "showPosition", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationsTable.prototype, "showFishingArea", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationsTable.prototype, "showEndDateTime", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationsTable.prototype, "showFishingEndDateTime", null);
__decorate([
    Output('duplicateRow'),
    __metadata("design:type", Object)
], OperationsTable.prototype, "onDuplicateRow", void 0);
__decorate([
    ViewChild(MatExpansionPanel, { static: true }),
    __metadata("design:type", MatExpansionPanel)
], OperationsTable.prototype, "filterExpansionPanel", void 0);
OperationsTable = __decorate([
    Component({
        selector: 'app-operations-table',
        templateUrl: 'operations.table.html',
        styleUrls: ['operations.table.scss'],
        providers: [{ provide: ValidatorService, useExisting: OperationValidatorService }],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        LocalSettingsService,
        ValidatorService,
        OperationService,
        AccountService,
        UntypedFormBuilder,
        ChangeDetectorRef])
], OperationsTable);
export { OperationsTable };
//# sourceMappingURL=operations.table.js.map