import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { ObservedLocationsPage } from '../table/observed-locations.page';
import { ModalController } from '@ionic/angular';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { Subscription } from 'rxjs';
import { AppFormUtils, isNotNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { ObservedLocationFilter } from '@app/trip/observedlocation/observed-location.filter';
import { ObservedLocationForm } from '@app/trip/observedlocation/form/observed-location.form';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { ObservedLocationService } from '@app/trip/observedlocation/observed-location.service';
let SelectObservedLocationsModal = class SelectObservedLocationsModal {
    constructor(injector, viewCtrl, observedLocationService, cd) {
        this.injector = injector;
        this.viewCtrl = viewCtrl;
        this.observedLocationService = observedLocationService;
        this.cd = cd;
        this.selectedTabIndex = 0;
        this._subscription = new Subscription();
        this._logPrefix = '[select-observed-location-modal]';
        this.filter = null;
        this.settings = injector.get(LocalSettingsService);
        // default value
        this.acquisitionLevel = AcquisitionLevelCodes.OBSERVED_LOCATION;
    }
    get loadingSubject() {
        return this.table.loadingSubject;
    }
    ngOnInit() {
        // Set defaults
        this.mobile = isNotNil(this.mobile) ? this.mobile : this.settings.mobile;
        this.allowMultipleSelection = toBoolean(this.allowMultipleSelection, false);
        this.filter = this.filter || new ObservedLocationFilter();
        const programLabel = this.programLabel || this.filter.program && this.filter.program.label;
        this.table.showFilterProgram = !programLabel;
        this.table.showProgramColumn = !programLabel;
        // Avoid to register and load filter form values when we are in modal
        this.table.settingsId = null;
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            yield this.table.setFilter(this.filter);
            // Select the selected id
            if (!this.allowMultipleSelection && isNotNil(this.selectedId)) {
                this._subscription.add(this.table.dataSource.rowsSubject.subscribe(rows => {
                    this.table.selectRowByData(ObservedLocation.fromObject({ id: this.selectedId }));
                }));
                // TODO use permanent selection
                //this.table.permanentSelection?.setSelection(ObservedLocation.fromObject({id: this.selectedId}));
            }
            if (this.allowNewObservedLocation) {
                if (this.defaultNewObservedLocation)
                    this.form.setValue(this.defaultNewObservedLocation);
                this.form.enable();
                this.form.markAsReady();
            }
            this.selectedTabIndex = 0;
            this.tabGroup.realignInkBar();
            this.markForCheck();
        }), 200);
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    selectRow(row) {
        var _a;
        if (this.allowMultipleSelection) {
            this.table.selection.toggle(row);
        }
        else {
            this.table.selection.setSelection(row);
            if (((_a = row.currentData) === null || _a === void 0 ? void 0 : _a.id) !== this.selectedId) {
                this.close();
            }
        }
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.tabSearch.isActive) {
                    if (this.hasSelection()) {
                        const data = (this.table.selection.selected || [])
                            .map(row => row.currentData)
                            .map(ObservedLocation.fromObject)
                            .filter(isNotNil);
                        return this.viewCtrl.dismiss(data);
                    }
                }
                else if (this.tabNew.isActive) {
                    const newData = yield this.createObservedLocation();
                    if (newData) {
                        return this.viewCtrl.dismiss([newData]);
                    }
                }
                return false;
            }
            catch (err) {
                // nothing to do
                return false;
            }
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss();
        });
    }
    createObservedLocation() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.form)
                throw Error(`${this._logPrefix} No Form`);
            console.debug(`${this._logPrefix} Saving new ObservedLocation...`);
            // Avoid multiple call
            if (this.form.disabled)
                return;
            this.form.error = null;
            yield AppFormUtils.waitWhilePending(this.form);
            if (this.form.invalid) {
                this.form.markAllAsTouched();
                AppFormUtils.logFormErrors(this.form.form);
                return;
            }
            try {
                const json = this.form.value;
                const data = ObservedLocation.fromObject(json);
                this.form.disable();
                return yield this.observedLocationService.save(data);
            }
            catch (err) {
                this.form.error = err && err.message || err;
                this.form.enable();
                return;
            }
        });
    }
    hasSelection() {
        return this.table.selection.hasValue() && this.table.selection.selected.length === 1;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    ViewChild('table', { static: true }),
    __metadata("design:type", ObservedLocationsPage)
], SelectObservedLocationsModal.prototype, "table", void 0);
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", ObservedLocationForm)
], SelectObservedLocationsModal.prototype, "form", void 0);
__decorate([
    ViewChild('tabGroup', { static: true }),
    __metadata("design:type", MatTabGroup)
], SelectObservedLocationsModal.prototype, "tabGroup", void 0);
__decorate([
    ViewChild('tabSearch', { static: true }),
    __metadata("design:type", MatTab)
], SelectObservedLocationsModal.prototype, "tabSearch", void 0);
__decorate([
    ViewChild('tabNew', { static: true }),
    __metadata("design:type", MatTab)
], SelectObservedLocationsModal.prototype, "tabNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", ObservedLocationFilter)
], SelectObservedLocationsModal.prototype, "filter", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SelectObservedLocationsModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SelectObservedLocationsModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectObservedLocationsModal.prototype, "showFilterProgram", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectObservedLocationsModal.prototype, "allowMultipleSelection", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectObservedLocationsModal.prototype, "allowNewObservedLocation", void 0);
__decorate([
    Input(),
    __metadata("design:type", ObservedLocation)
], SelectObservedLocationsModal.prototype, "defaultNewObservedLocation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SelectObservedLocationsModal.prototype, "selectedId", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectObservedLocationsModal.prototype, "mobile", void 0);
SelectObservedLocationsModal = __decorate([
    Component({
        selector: 'app-select-observed-locations-modal',
        templateUrl: './select-observed-locations.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        ObservedLocationService,
        ChangeDetectorRef])
], SelectObservedLocationsModal);
export { SelectObservedLocationsModal };
//# sourceMappingURL=select-observed-locations.modal.js.map