import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, ViewChild } from "@angular/core";
import { ValidatorService } from "@e-is/ngx-material-table";
import { VesselValidatorService } from "../services/validator/vessel.validator";
import { VesselService } from "../services/vessel-service";
import { VesselModal } from "../modal/vessel-modal";
import { Vessel } from "../services/model/vessel.model";
import { AccountService, isNil, isNotEmptyArray, isNotNil, LocalSettingsService, ReferentialUtils, SharedValidators, StatusById, StatusIds, StatusList, trimEmptyToNull } from "@sumaris-net/ngx-components";
import { tap } from "rxjs";
import { UntypedFormBuilder } from "@angular/forms";
import { SynchronizationStatusEnum } from "@app/data/services/model/model.utils";
import { LocationLevelIds } from "@app/referential/services/model/model.enum";
import { ReferentialRefService } from "@app/referential/services/referential-ref.service";
import { environment } from "@environments/environment";
import { AppRootDataTable } from "@app/data/table/root-table.class";
import { VESSEL_FEATURE_NAME } from "../services/config/vessel.config";
import { VesselFilter } from "../services/filter/vessel.filter";
import { MatExpansionPanel } from "@angular/material/expansion";
import { debounceTime, filter } from "rxjs/operators";
export const VesselsTableSettingsEnum = {
    TABLE_ID: 'vessels',
    FEATURE_ID: VESSEL_FEATURE_NAME,
};
let VesselsTable = class VesselsTable extends AppRootDataTable {
    constructor(injector, formBuilder, accountService, settings, vesselService, referentialRefService, cd) {
        super(injector, Vessel, VesselFilter, 
        // columns
        ['status', 'vesselFeatures.exteriorMarking', 'vesselRegistrationPeriod.registrationCode']
            .concat(settings.mobile ? [] : ['vesselFeatures.startDate', 'vesselFeatures.endDate'])
            .concat(['vesselFeatures.name', 'vesselType', 'vesselFeatures.basePortLocation'])
            .concat(settings.mobile ? [] : ['comments']), vesselService, null, {
            prependNewElements: false,
            suppressErrors: environment.production,
            saveOnlyDirtyRows: true,
            watchAllOptions: {
                fetchPolicy: 'cache-and-network',
            },
        });
        this.accountService = accountService;
        this.settings = settings;
        this.vesselService = vesselService;
        this.referentialRefService = referentialRefService;
        this.cd = cd;
        this.statusList = StatusList;
        this.statusById = StatusById;
        this.onSearchBarChanged = new EventEmitter();
        this.showFabButton = false;
        this.showError = true;
        this.useSticky = true;
        this.disableStatusFilter = false;
        this.showVesselTypeFilter = true;
        this.showSearchbar = false;
        this.showToolbarFilterButton = true;
        this.i18nColumnPrefix = 'VESSEL.';
        this.defaultSortBy = 'vesselFeatures.exteriorMarking';
        this.defaultSortDirection = 'asc';
        this.filterForm = formBuilder.group({
            program: [null, SharedValidators.entity],
            basePortLocation: [null, SharedValidators.entity],
            registrationLocation: [null, SharedValidators.entity],
            vesselType: [null, SharedValidators.entity],
            date: [null, SharedValidators.validDate],
            searchText: [null],
            statusId: [null],
            synchronizationStatus: [null],
            onlyWithRegistration: [null],
        });
        this.searchTextControl = this.filterForm.get('searchText');
        this.inlineEdition = false;
        this.confirmBeforeDelete = true;
        this.autoLoad = false;
        this.showIdColumn = accountService.isAdmin();
        this.debug = !environment.production;
    }
    set showIdColumn(value) {
        this.setShowColumn('id', value);
    }
    get showIdColumn() {
        return this.getShowColumn('id');
    }
    set showVesselTypeColumn(value) {
        this.setShowColumn('vesselType', value);
    }
    get showVesselTypeColumn() {
        return this.getShowColumn('vesselType');
    }
    set showBasePortLocationColumn(value) {
        this.setShowColumn('vesselFeatures.basePortLocation', value);
    }
    get showBasePortLocationColumn() {
        return this.getShowColumn('vesselFeatures.basePortLocation');
    }
    get searchText() {
        return this.searchTextControl.value;
    }
    ngOnInit() {
        // Use a fixed value, to be able to restore settings.
        // Keep a special case when filter's status field is disable (to avoid a restoration the status column - e.g. in select vessel modal)
        this.settingsId = VesselsTableSettingsEnum.TABLE_ID + (this.disableStatusFilter ? '_statusFilterDisabled' : '');
        this.featureName = VesselsTableSettingsEnum.FEATURE_ID;
        super.ngOnInit();
        // Locations
        const locationAttributes = this.settings.getFieldDisplayAttributes('location');
        // Base port locations
        this.registerAutocompleteField('basePortLocation', {
            attributes: locationAttributes,
            service: this.referentialRefService,
            filter: {
                entityName: 'Location',
                levelId: LocationLevelIds.PORT,
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
            },
            mobile: this.mobile,
        });
        // Registration locations
        this.registerAutocompleteField('registrationLocation', {
            attributes: locationAttributes,
            service: this.referentialRefService,
            filter: {
                entityName: 'Location',
                levelId: LocationLevelIds.COUNTRY,
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
            },
            mobile: this.mobile,
        });
        // Vessel type
        this.registerAutocompleteField('vesselType', {
            attributes: ['name'],
            service: this.referentialRefService,
            filter: {
                entityName: 'VesselType',
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
            },
            mobile: this.mobile,
        });
        // Restore filter from settings, or load all
        this.ready().then(() => this.restoreFilterOrLoad());
    }
    ionSearchBarChanged(event) {
        // Applying the filter, on any changes
        if (!this.onSearchBarChanged.observed) {
            this.registerSubscription(this.onSearchBarChanged
                .pipe(filter((_) => !this.filterExpansionPanel.expanded), tap((_) => this.markAsLoading()), debounceTime(650))
                .subscribe((searchText) => this.patchFilter({ searchText })));
        }
        const value = trimEmptyToNull(event === null || event === void 0 ? void 0 : event.detail.value);
        this.onSearchBarChanged.emit(value);
    }
    openNewRowDetail() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return Promise.resolve(false);
            const defaultStatus = this.synchronizationStatus !== 'SYNC' ? StatusIds.TEMPORARY : undefined;
            const modal = yield this.modalCtrl.create({
                component: VesselModal,
                componentProps: {
                    defaultStatus,
                    synchronizationStatus: this.synchronizationStatus !== 'SYNC' ? SynchronizationStatusEnum.DIRTY : undefined,
                    canEditStatus: isNil(defaultStatus),
                },
                backdropDismiss: false,
                cssClass: 'modal-large',
            });
            yield modal.present();
            const { data } = yield modal.onDidDismiss();
            // if new vessel added, refresh the table
            if (isNotNil(data))
                this.onRefresh.emit();
            return true;
        });
    }
    resetFilter(event) {
        const defaultFilter = {
            statusId: this.disableStatusFilter ? this.filter.statusId : undefined,
            vesselType: !this.showVesselTypeFilter ? this.filter.vesselType : undefined,
            synchronizationStatus: this.synchronizationStatus,
        };
        // Keep searchbar text
        if (this.showSearchbar && this.showToolbar) {
            defaultFilter.searchText = this.searchText;
        }
        super.resetFilter(defaultFilter);
    }
    clearFilterStatus(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.filterForm.patchValue({ statusId: null });
    }
    /* -- protected methods -- */
    setFilter(filter, opts) {
        if (isNotNil(this.vesselTypeId)) {
            super.setFilter(Object.assign(Object.assign({}, filter), { vesselType: { id: this.vesselTypeId } }), opts);
        }
        else {
            super.setFilter(filter, opts);
        }
    }
    countNotEmptyCriteria(filter) {
        return super.countNotEmptyCriteria(filter)
            // Remove fixed value
            - (this.disableStatusFilter && (isNotNil(filter.statusId) || isNotEmptyArray(filter.statusIds)) ? 1 : 0)
            - (!this.showVesselTypeFilter && ReferentialUtils.isNotEmpty(filter.vesselType) ? 1 : 0);
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], VesselsTable.prototype, "canDelete", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselsTable.prototype, "showFabButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselsTable.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselsTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselsTable.prototype, "disableStatusFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselsTable.prototype, "showVesselTypeFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselsTable.prototype, "showSearchbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselsTable.prototype, "showToolbarFilterButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], VesselsTable.prototype, "vesselTypeId", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], VesselsTable.prototype, "showIdColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], VesselsTable.prototype, "showVesselTypeColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], VesselsTable.prototype, "showBasePortLocationColumn", null);
__decorate([
    ViewChild(MatExpansionPanel, { static: true }),
    __metadata("design:type", MatExpansionPanel)
], VesselsTable.prototype, "filterExpansionPanel", void 0);
VesselsTable = __decorate([
    Component({
        selector: 'app-vessels-table',
        templateUrl: 'vessels.table.html',
        styleUrls: ['./vessels.table.scss'],
        providers: [{ provide: ValidatorService, useClass: VesselValidatorService }],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        AccountService,
        LocalSettingsService,
        VesselService,
        ReferentialRefService,
        ChangeDetectorRef])
], VesselsTable);
export { VesselsTable };
//# sourceMappingURL=vessels.table.js.map