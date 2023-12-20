import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewChild, ViewEncapsulation } from '@angular/core';
import { LandingsTable } from '../../landing/landings.table';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ModalController } from '@ionic/angular';
import { Landing } from '../../landing/landing.model';
import { VesselService } from '@app/vessel/services/vessel-service';
import { VesselFilter } from '@app/vessel/services/filter/vessel.filter';
import { VesselsTable } from '@app/vessel/list/vessels.table';
import { AppFormUtils, ConfigService, isEmptyArray, isNil, isNotNil, ReferentialRef, toBoolean } from '@sumaris-net/ngx-components';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { VesselForm } from '@app/vessel/form/form-vessel';
import { Vessel } from '@app/vessel/services/model/vessel.model';
import { Subscription } from 'rxjs';
import { MatTabGroup } from '@angular/material/tabs';
import { LandingFilter } from '../../landing/landing.filter';
import { VESSEL_CONFIG_OPTIONS } from '@app/vessel/services/config/vessel.config';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { debounceTime, mergeMap } from 'rxjs/operators';
let SelectVesselsForDataModal = class SelectVesselsForDataModal {
    constructor(vesselService, configService, viewCtrl, referentialRefService, cd) {
        this.vesselService = vesselService;
        this.configService = configService;
        this.viewCtrl = viewCtrl;
        this.referentialRefService = referentialRefService;
        this.cd = cd;
        this.selectedTabIndex = 0;
        this._subscription = new Subscription();
        this.landingFilter = null;
        this.vesselFilter = null;
    }
    get loading() {
        const table = this.table;
        return table && table.loading;
    }
    get table() {
        return (this.showVessels && this.vesselsTable) || (this.showLandings && this.landingsTable);
    }
    get showLandings() {
        return this.selectedTabIndex === 0;
    }
    set showLandings(value) {
        if (this.showLandings !== value) {
            this.selectedTabIndex = value ? 0 : 1;
            this.markForCheck();
        }
    }
    get showVessels() {
        return this.selectedTabIndex === 1;
    }
    set showVessels(value) {
        if (this.showVessels !== value) {
            this.selectedTabIndex = value ? 1 : 0;
            this.markForCheck();
        }
    }
    get isNewVessel() {
        return this.selectedTabIndex === 2;
    }
    ngOnInit() {
        // Init landing table
        this.landingFilter = this.landingFilter || new LandingFilter();
        this.landingsTable.filter = this.landingFilter;
        this.landingsTable.programLabel = this.landingFilter.program && this.landingFilter.program.label;
        this.landingsTable.acquisitionLevel = AcquisitionLevelCodes.LANDING;
        // Set defaults
        this.allowMultiple = toBoolean(this.allowMultiple, false);
        this.allowAddNewVessel = toBoolean(this.allowAddNewVessel, true);
        this.showVesselTypeColumn = toBoolean(this.showVesselTypeColumn, false);
        this.showBasePortLocationColumn = toBoolean(this.showBasePortLocationColumn, true);
        // Init vessel table filter
        this.vesselsTable.filter = this.vesselFilter;
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            // Load landings
            this.landingsTable.onRefresh.next('modal');
            this.selectedTabIndex = 0;
            this.tabGroup.realignInkBar();
            this.markForCheck();
        }), 200);
    }
    ngAfterViewInit() {
        // Get default status by config
        if (this.allowAddNewVessel && this.vesselForm) {
            this._subscription.add(this.configService.config
                .pipe(debounceTime(100), mergeMap((config) => __awaiter(this, void 0, void 0, function* () {
                this.vesselForm.defaultStatus = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_DEFAULT_STATUS);
                this.vesselForm.enable();
                if (isNil(this.defaultRegistrationLocation)) {
                    const defaultRegistrationLocationId = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_DEFAULT_COUNTRY_ID);
                    if (defaultRegistrationLocationId) {
                        this.vesselForm.defaultRegistrationLocation = yield this.referentialRefService.loadById(defaultRegistrationLocationId, 'Location');
                    }
                }
                if (isNil(this.withNameRequired)) {
                    this.withNameRequired = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.VESSEL_NAME_REQUIRED);
                    this.vesselForm.withNameRequired = this.withNameRequired;
                }
            })))
                .subscribe());
        }
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    selectRow(row) {
        return __awaiter(this, void 0, void 0, function* () {
            const table = this.table;
            if (row && table) {
                if (!this.allowMultiple) {
                    table.selection.clear();
                    table.selection.select(row);
                    yield this.close();
                }
                else {
                    table.selection.select(row);
                }
            }
        });
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let vessels;
                if (this.isNewVessel) {
                    const vessel = yield this.createVessel();
                    if (!vessel)
                        return false;
                    vessels = [vessel];
                }
                else if (this.hasSelection()) {
                    if (this.showLandings) {
                        vessels = (this.landingsTable.selection.selected || [])
                            .map(row => row.currentData)
                            .map(Landing.fromObject)
                            .filter(isNotNil)
                            .map(l => l.vesselSnapshot);
                    }
                    else if (this.showVessels) {
                        vessels = (this.vesselsTable.selection.selected || [])
                            .map(row => row.currentData)
                            .map(VesselSnapshot.fromVessel)
                            .filter(isNotNil);
                    }
                }
                if (isEmptyArray(vessels)) {
                    console.warn('[select-vessel-modal] no selection');
                }
                this.viewCtrl.dismiss(vessels);
                return true;
            }
            catch (err) {
                // nothing to do
                return false;
            }
        });
    }
    createVessel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.vesselForm)
                throw Error('No Vessel Form');
            console.debug('[select-vessel-modal] Saving new vessel...');
            // Avoid multiple call
            if (this.vesselForm.disabled)
                return;
            this.vesselForm.error = null;
            yield AppFormUtils.waitWhilePending(this.vesselForm);
            if (this.vesselForm.invalid) {
                this.vesselForm.markAllAsTouched();
                AppFormUtils.logFormErrors(this.vesselForm.form);
                return;
            }
            try {
                const json = this.vesselForm.value;
                const data = Vessel.fromObject(json);
                this.vesselForm.disable();
                const savedData = yield this.vesselService.save(data);
                return VesselSnapshot.fromVessel(savedData);
            }
            catch (err) {
                this.vesselForm.error = err && err.message || err;
                this.vesselForm.enable();
                return;
            }
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss();
        });
    }
    hasSelection() {
        if (this.isNewVessel)
            return false;
        const table = this.table;
        return table && table.selection.hasValue() && (this.allowMultiple || table.selection.selected.length === 1);
    }
    get canValidate() {
        return (this.isNewVessel && this.vesselForm && this.vesselForm.valid) || this.hasSelection();
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    ViewChild(LandingsTable, { static: true }),
    __metadata("design:type", LandingsTable)
], SelectVesselsForDataModal.prototype, "landingsTable", void 0);
__decorate([
    ViewChild(VesselsTable, { static: true }),
    __metadata("design:type", VesselsTable)
], SelectVesselsForDataModal.prototype, "vesselsTable", void 0);
__decorate([
    ViewChild(VesselForm, { static: false }),
    __metadata("design:type", VesselForm)
], SelectVesselsForDataModal.prototype, "vesselForm", void 0);
__decorate([
    ViewChild('tabGroup', { static: true }),
    __metadata("design:type", MatTabGroup)
], SelectVesselsForDataModal.prototype, "tabGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", LandingFilter)
], SelectVesselsForDataModal.prototype, "landingFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", VesselFilter)
], SelectVesselsForDataModal.prototype, "vesselFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsForDataModal.prototype, "allowMultiple", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsForDataModal.prototype, "allowAddNewVessel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsForDataModal.prototype, "showVesselTypeColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsForDataModal.prototype, "showBasePortLocationColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsForDataModal.prototype, "showSamplesCountColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SelectVesselsForDataModal.prototype, "defaultVesselSynchronizationStatus", void 0);
__decorate([
    Input(),
    __metadata("design:type", ReferentialRef)
], SelectVesselsForDataModal.prototype, "defaultRegistrationLocation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsForDataModal.prototype, "withNameRequired", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SelectVesselsForDataModal.prototype, "maxDateVesselRegistration", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsForDataModal.prototype, "showOfflineVessels", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SelectVesselsForDataModal.prototype, "showLandings", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SelectVesselsForDataModal.prototype, "showVessels", null);
SelectVesselsForDataModal = __decorate([
    Component({
        selector: 'app-select-vessel-for-data-modal',
        templateUrl: 'select-vessel-for-data.modal.html',
        styleUrls: ['select-vessel-for-data.modal.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
        encapsulation: ViewEncapsulation.None
    }),
    __metadata("design:paramtypes", [VesselService,
        ConfigService,
        ModalController,
        ReferentialRefService,
        ChangeDetectorRef])
], SelectVesselsForDataModal);
export { SelectVesselsForDataModal };
//# sourceMappingURL=select-vessel-for-data.modal.js.map