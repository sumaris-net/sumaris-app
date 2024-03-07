import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { AlertController, ModalController, PopoverController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService, Alerts, ConfigService, FilesUtils, isNil, isNotEmptyArray, isNotNil, LocalSettingsService, referentialToString, StatusIds, } from '@sumaris-net/ngx-components';
import { Location } from '@angular/common';
import { VesselsTable } from './vessels.table';
import { VESSEL_CONFIG_OPTIONS, VESSEL_FEATURE_NAME } from '../services/config/vessel.config';
import { SelectVesselsModal } from '@app/vessel/modal/select-vessel.modal';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { VesselService } from '@app/vessel/services/vessel-service';
import { FileTransferService } from '@app/shared/service/file-transfer.service';
import { Vessel } from '@app/vessel/services/model/vessel.model';
export const VesselsPageSettingsEnum = {
    PAGE_ID: 'vessels',
    FEATURE_ID: VESSEL_FEATURE_NAME,
};
let VesselsPage = class VesselsPage {
    constructor(route, router, location, modalCtrl, alertCtrl, accountService, configService, translate, settings, vesselService, popoverController, transferService, cd) {
        this.route = route;
        this.router = router;
        this.location = location;
        this.modalCtrl = modalCtrl;
        this.alertCtrl = alertCtrl;
        this.accountService = accountService;
        this.configService = configService;
        this.translate = translate;
        this.settings = settings;
        this.vesselService = vesselService;
        this.popoverController = popoverController;
        this.transferService = transferService;
        this.cd = cd;
        this.enableReplacement = false;
        this.enableFileImport = false;
        this._subscription = new Subscription();
        this.mobile = settings.mobile;
        const isAdmin = this.accountService.isAdmin();
        this.canEdit = isAdmin || this.accountService.isUser();
        this.canDelete = isAdmin;
        this.canReplace = isAdmin;
        this.canImportFile = isAdmin;
    }
    get replacementDisabled() {
        return (!this.canReplace && this.table.selection.isEmpty())
            || this.table.selection.selected.some(row => row.currentData.statusId !== StatusIds.TEMPORARY);
    }
    ngOnInit() {
        this.table.settingsId = VesselsPageSettingsEnum.PAGE_ID;
        this._subscription.add(this.configService.config.subscribe((config) => {
            this.enableReplacement = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.TEMPORARY_VESSEL_REPLACEMENT_ENABLE);
            this.enableFileImport = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.REFERENTIAL_VESSEL_IMPORT_ENABLE);
            this.vesselTypeId = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_DEFAULT_TYPE_ID);
            this.table.vesselTypeId = this.vesselTypeId;
            this.table.showVesselTypeFilter = isNil(this.vesselTypeId);
            this.table.showVesselTypeColumn = isNil(this.vesselTypeId);
            this.table.markAsReady();
        }));
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    /**
     * Action triggered when user swipes
     */
    onSwipeTab(event) {
        // DEBUG
        // console.debug("[vessels] onSwipeTab()");
        // Skip, if not a valid swipe event
        if (!event
            || event.defaultPrevented || (event.srcEvent && event.srcEvent.defaultPrevented)
            || event.pointerType !== 'touch') {
            return false;
        }
        this.table.toggleSynchronizationStatus();
        return true;
    }
    replace(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.table.selection.isEmpty())
                return;
            const modal = yield this.modalCtrl.create({
                component: SelectVesselsModal,
                componentProps: {
                    titleI18n: 'VESSEL.SELECT_MODAL.REPLACE_TITLE',
                    vesselFilter: {
                        statusId: StatusIds.ENABLE,
                        onlyWithRegistration: true
                    },
                    disableStatusFilter: true,
                    showVesselTypeColumn: isNil(this.vesselTypeId),
                    showBasePortLocationColumn: true,
                },
                keyboardClose: true,
                cssClass: 'modal-large'
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data } = yield modal.onDidDismiss();
            if (data && data[0] instanceof VesselSnapshot) {
                console.debug('[vessels-page] Vessel selection modal result:', data);
                const vessel = data[0];
                if (yield Alerts.askConfirmation('VESSEL.ACTION.REPLACE_MANY_CONFIRMATION', this.alertCtrl, this.translate, event, { vessel: referentialToString(vessel, ['registrationCode', 'name']) })) {
                    try {
                        // Replace temp vessels (from selected rows)
                        yield this.vesselService.replaceTemporaryVessel(this.table.selection.selected.map(row => row.currentData.id), vessel.id);
                    }
                    catch (e) {
                        yield Alerts.showError(e.message, this.alertCtrl, this.translate);
                    }
                    // Clear selection and refresh
                    this.table.selection.clear();
                    this.table.onRefresh.emit();
                    this.markForCheck();
                }
            }
            else {
                console.debug('[observed-location] Vessel selection modal was cancelled');
            }
        });
    }
    /* -- protected methods -- */
    markForCheck() {
        this.cd.markForCheck();
    }
    onOpenRow(row) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.router.navigateByUrl(`/vessels/${row.currentData.id}`);
        });
    }
    importFromCsv(event, format = 'siop') {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield FilesUtils.showUploadPopover(this.popoverController, event, {
                uniqueFile: true,
                fileExtension: '.csv',
                uploadFn: (file) => this.transferService.uploadResource(file, {
                    resourceType: Vessel.ENTITY_NAME,
                    resourceId: Date.now().toString(),
                    replace: true
                })
            });
            console.debug('[vessel] Vessel files uploaded! Response: ', data);
            const uploadedFileNames = (data || [])
                .map(file => { var _a; return (_a = file.response) === null || _a === void 0 ? void 0 : _a.body; })
                .filter(isNotNil)
                .map(({ fileName }) => fileName);
            if (isNotEmptyArray(uploadedFileNames)) {
                const jobs = yield Promise.all(uploadedFileNames.map(uploadedFileName => this.vesselService.importFile(uploadedFileName, format)));
                console.info('[vessel] Vessel imported with success!: ', jobs);
            }
        });
    }
};
__decorate([
    ViewChild('table', { static: true }),
    __metadata("design:type", VesselsTable)
], VesselsPage.prototype, "table", void 0);
VesselsPage = __decorate([
    Component({
        selector: 'app-vessels-page',
        styleUrls: ['vessels.page.scss'],
        templateUrl: 'vessels.page.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [ActivatedRoute,
        Router,
        Location,
        ModalController,
        AlertController,
        AccountService,
        ConfigService,
        TranslateService,
        LocalSettingsService,
        VesselService,
        PopoverController,
        FileTransferService,
        ChangeDetectorRef])
], VesselsPage);
export { VesselsPage };
//# sourceMappingURL=vessels.page.js.map