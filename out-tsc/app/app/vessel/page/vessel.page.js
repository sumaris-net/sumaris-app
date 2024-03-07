import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { VesselService } from '../services/vessel-service';
import { VesselForm } from '../form/form-vessel';
import { Vessel } from '../services/model/vessel.model';
import { AccountService, Alerts, AppEntityEditor, ConfigService, EntityUtils, isNil, isNotNilOrNaN, NetworkService, PlatformService, referentialToString, SharedValidators, StatusIds } from '@sumaris-net/ngx-components';
import { Validators } from '@angular/forms';
import { VesselFeaturesHistoryComponent } from './vessel-features-history.component';
import { VesselRegistrationHistoryComponent } from './vessel-registration-history.component';
import { VesselFeaturesFilter, VesselRegistrationFilter } from '../services/filter/vessel.filter';
import { VesselFeaturesService } from '../services/vessel-features.service';
import { VesselRegistrationService } from '../services/vessel-registration.service';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import moment from 'moment';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { ModalController } from '@ionic/angular';
import { SelectVesselsModal } from '@app/vessel/modal/select-vessel.modal';
import { VESSEL_CONFIG_OPTIONS } from '@app/vessel/services/config/vessel.config';
let VesselPage = class VesselPage extends AppEntityEditor {
    constructor(injector, vesselService, platform, network, accountService, vesselFeaturesService, vesselRegistrationService, dateAdapter, modalCtrl, configService) {
        super(injector, Vessel, vesselService, {
            tabCount: 2
        });
        this.network = network;
        this.accountService = accountService;
        this.vesselFeaturesService = vesselFeaturesService;
        this.vesselRegistrationService = vesselRegistrationService;
        this.dateAdapter = dateAdapter;
        this.modalCtrl = modalCtrl;
        this.configService = configService;
        this._editing = false;
        this.isNewFeatures = false;
        this.isNewRegistration = false;
        this.mobile = false;
        this.replacementEnabled = false;
        this.temporaryStatusId = StatusIds.TEMPORARY;
        this.defaultBackHref = '/vessels';
        this.mobile = platform.mobile;
    }
    get editing() {
        return this._editing || this.isNewFeatures || this.isNewRegistration;
    }
    set editing(value) {
        if (!value) {
            this.isNewFeatures = false;
            this.isNewRegistration = false;
        }
        this._editing = value;
    }
    get form() {
        return this.vesselForm.form;
    }
    ngOnInit() {
        // Make sure template has a form
        if (!this.form)
            throw new Error('No form for value setting');
        this.form.disable();
        this.registerSubscription(this.configService.config.subscribe((config) => {
            this.replacementEnabled = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.TEMPORARY_VESSEL_REPLACEMENT_ENABLE);
        }));
        super.ngOnInit();
    }
    ngAfterViewInit() {
        super.ngAfterViewInit();
        this.registerSubscription(this.onUpdateView.subscribe(() => {
            if (isNotNilOrNaN(this.data.id)) {
                this.featuresHistoryTable.setFilter(VesselFeaturesFilter.fromObject({ vesselId: this.data.id }), { emitEvent: true });
                this.registrationHistoryTable.setFilter(VesselRegistrationFilter.fromObject({ vesselId: this.data.id }), { emitEvent: true });
            }
        }));
    }
    registerForms() {
        this.addChildForm(this.vesselForm);
    }
    onNewEntity(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // If is on field mode, fill default values
            if (this.isOnFieldMode) {
                data.vesselFeatures.startDate = moment();
                data.vesselRegistrationPeriod.startDate = moment();
            }
            this.markAsReady();
        });
    }
    onEntityLoaded(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.markAsReady();
        });
    }
    updateViewState(data, opts) {
        super.updateViewState(data, opts);
        this.form.disable();
        this.editing = false;
        this.previousVessel = undefined;
    }
    canUserWrite(data) {
        // Cannot edit a remote entity, when offline (e.g. when vessel was loaded from the local entity storage)
        if (this.network.offline && EntityUtils.isRemote(data)) {
            return false;
        }
        return !this.editing && this.accountService.canUserWriteDataForDepartment(data.recorderDepartment);
    }
    setValue(data) {
        // Set data to form
        this.vesselForm.value = data;
    }
    getFirstInvalidTabIndex() {
        return this.vesselForm.invalid ? 0 : -1;
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isNewData) {
                return yield this.translate.get('VESSEL.NEW.TITLE').toPromise();
            }
            return yield this.translate.get('VESSEL.EDIT.TITLE', data.vesselFeatures).toPromise();
        });
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { icon: 'boat', subtitle: 'MENU.VESSELS' });
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.reloadWithConfirmation();
        });
    }
    reload() {
        return __awaiter(this, void 0, void 0, function* () {
            this.markAsLoading();
            yield this.load(this.data && this.data.id);
        });
    }
    editFeatures() {
        return __awaiter(this, void 0, void 0, function* () {
            this.editing = true;
            this.previousVessel = undefined;
            this.form.enable();
            // Start date
            const featureStartDate = this.form.get('vesselFeatures.startDate').value;
            const canEditStartDate = isNil(featureStartDate)
                || (yield this.vesselFeaturesService.count({ vesselId: this.data.id }, { fetchPolicy: 'cache-first' }));
            if (!canEditStartDate) {
                this.form.get('vesselFeatures.startDate').disable();
            }
            // disable registration controls
            this.form.get('vesselRegistrationPeriod').disable();
            this.form.get('statusId').disable();
        });
    }
    newFeatures() {
        this.isNewFeatures = true;
        const json = this.form.value;
        this.previousVessel = Vessel.fromObject(json);
        this.form.setValue(Object.assign(Object.assign({}, json), { vesselFeatures: Object.assign(Object.assign({}, json.vesselFeatures), { id: null, startDate: null, endDate: null }) }));
        this.form.get('vesselFeatures.startDate').setValidators([
            Validators.required,
            SharedValidators.dateIsAfter(this.previousVessel.vesselFeatures.startDate, this.dateAdapter.format(this.previousVessel.vesselFeatures.startDate, this.translate.instant('COMMON.DATE_PATTERN')), 'day')
        ]);
        this.form.enable();
        this.form.get('vesselRegistrationPeriod').disable();
        this.form.get('statusId').disable();
    }
    editRegistration() {
        return __awaiter(this, void 0, void 0, function* () {
            this.editing = true;
            this.previousVessel = undefined;
            this.form.enable();
            // Start date
            const registrationStartDate = this.form.get('vesselRegistrationPeriod.startDate').value;
            const canEditStartDate = isNil(registrationStartDate)
                || (yield this.vesselRegistrationService.count({ vesselId: this.data.id }, { fetchPolicy: 'cache-first' })) <= 1;
            if (!canEditStartDate) {
                this.form.get('vesselRegistrationPeriod.startDate').disable();
            }
            // disable features controls
            this.form.get('vesselFeatures').disable();
            this.form.get('vesselType').disable();
            this.form.get('statusId').disable();
        });
    }
    newRegistration() {
        this.isNewRegistration = true;
        const json = this.form.value;
        this.previousVessel = Vessel.fromObject(json);
        this.form.setValue(Object.assign(Object.assign({}, json), { vesselRegistrationPeriod: Object.assign(Object.assign({}, json.vesselRegistrationPeriod), { id: null, registrationCode: null, intRegistrationCode: null, startDate: null, endDate: null }) }));
        this.form.get('vesselRegistrationPeriod.startDate').setValidators([
            Validators.required,
            SharedValidators.dateIsAfter(this.previousVessel.vesselRegistrationPeriod.startDate, this.dateAdapter.format(this.previousVessel.vesselRegistrationPeriod.startDate, this.translate.instant('COMMON.DATE_PATTERN')), 'day')
        ]);
        this.form.enable();
        this.form.get('vesselFeatures').disable();
        this.form.get('vesselType').disable();
        this.form.get('statusId').disable();
    }
    editStatus() {
        this.editing = true;
        this.previousVessel = undefined;
        this.form.enable();
        // disable features controls
        this.form.get('vesselFeatures').disable();
        this.form.get('vesselRegistrationPeriod').disable();
        this.form.get('vesselType').disable();
    }
    replace(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const modal = yield this.modalCtrl.create({
                component: SelectVesselsModal,
                componentProps: {
                    titleI18n: 'VESSEL.SELECT_MODAL.REPLACE_TITLE',
                    vesselFilter: {
                        statusId: StatusIds.ENABLE,
                        onlyWithRegistration: true
                    },
                    disableStatusFilter: true,
                    showVesselTypeColumn: true,
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
                console.debug('[vessel] Vessel selection modal result:', data);
                const vessel = data[0];
                if (yield Alerts.askConfirmation('VESSEL.ACTION.REPLACE_CONFIRMATION', this.alertCtrl, this.translate, event, { vessel: referentialToString(vessel, ['registrationCode', 'name']) })) {
                    try {
                        yield this.service.replaceTemporaryVessel([this.data.id], vessel.id);
                        yield this.goBack(undefined);
                    }
                    catch (e) {
                        yield Alerts.showError(e.message, this.alertCtrl, this.translate);
                    }
                }
            }
            else {
                console.debug('[vessel] Vessel selection modal was cancelled');
            }
        });
    }
    save(event, options) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const saved = yield _super.save.call(this, event, {
                previousVessel: this.previousVessel,
                isNewFeatures: this.isNewFeatures,
                isNewRegistration: this.isNewRegistration
            });
            return saved;
        });
    }
    getJsonValueToSave() {
        return this.form.getRawValue();
    }
};
__decorate([
    ViewChild('vesselForm', { static: true }),
    __metadata("design:type", VesselForm)
], VesselPage.prototype, "vesselForm", void 0);
__decorate([
    ViewChild('featuresHistoryTable', { static: true }),
    __metadata("design:type", VesselFeaturesHistoryComponent)
], VesselPage.prototype, "featuresHistoryTable", void 0);
__decorate([
    ViewChild('registrationHistoryTable', { static: true }),
    __metadata("design:type", VesselRegistrationHistoryComponent)
], VesselPage.prototype, "registrationHistoryTable", void 0);
VesselPage = __decorate([
    Component({
        selector: 'app-vessel-page',
        templateUrl: './vessel.page.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        VesselService,
        PlatformService,
        NetworkService,
        AccountService,
        VesselFeaturesService,
        VesselRegistrationService,
        MomentDateAdapter,
        ModalController,
        ConfigService])
], VesselPage);
export { VesselPage };
//# sourceMappingURL=vessel.page.js.map