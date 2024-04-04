import { __awaiter, __decorate, __metadata } from "tslib";
import { Component, Input, ViewChild } from '@angular/core';
import { Vessel } from '../services/model/vessel.model';
import { IonContent, ModalController } from '@ionic/angular';
import { VesselForm } from '../form/form-vessel';
import { VesselService } from '../services/vessel-service';
import { AppFormUtils, ConfigService, isNil, isNilOrBlank, isNotNil, ReferentialRef } from '@sumaris-net/ngx-components';
import { Subscription } from 'rxjs';
import { VESSEL_CONFIG_OPTIONS } from '@app/vessel/services/config/vessel.config';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
let VesselModal = class VesselModal {
    constructor(vesselService, configService, referentialRefService, viewCtrl) {
        this.vesselService = vesselService;
        this.configService = configService;
        this.referentialRefService = referentialRefService;
        this.viewCtrl = viewCtrl;
        this.loading = false;
        this.subscription = new Subscription();
        this.canEditStatus = true;
        this.synchronizationStatus = null;
    }
    get disabled() {
        return this.formVessel.disabled;
    }
    get enabled() {
        return this.formVessel.enabled;
    }
    get valid() {
        return this.formVessel.valid;
    }
    ngOnInit() {
        this.enable(); // Enable the vessel form, by default
        if (isNotNil(this.defaultStatus)) {
            this.formVessel.defaultStatus = this.defaultStatus;
        }
        if (isNotNil(this.defaultRegistrationLocation)) {
            this.formVessel.defaultRegistrationLocation = this.defaultRegistrationLocation;
        }
        if (isNotNil(this.withNameRequired)) {
            this.formVessel.withNameRequired = this.withNameRequired;
        }
        if (isNil(this.defaultStatus) || isNil(this.defaultRegistrationLocation) || isNil(this.withNameRequired)) {
            // Get default status by config
            this.subscription.add(this.configService.config.subscribe((config) => __awaiter(this, void 0, void 0, function* () {
                if (config && config.properties) {
                    if (isNil(this.defaultStatus)) {
                        const defaultStatus = config.properties[VESSEL_CONFIG_OPTIONS.VESSEL_DEFAULT_STATUS.key];
                        if (defaultStatus) {
                            this.formVessel.defaultStatus = +defaultStatus;
                        }
                    }
                    if (isNil(this.defaultRegistrationLocation)) {
                        const defaultRegistrationLocationId = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_DEFAULT_COUNTRY_ID);
                        if (defaultRegistrationLocationId) {
                            this.formVessel.defaultRegistrationLocation = yield this.referentialRefService.loadById(defaultRegistrationLocationId, 'Location');
                        }
                    }
                    if (isNil(this.withNameRequired)) {
                        this.withNameRequired = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.VESSEL_NAME_REQUIRED);
                        this.formVessel.withNameRequired = this.withNameRequired;
                    }
                    this.formVessel.basePortLocationSuggestLengthThreshold = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_BASE_PORT_LOCATION_SEARCH_TEXT_MIN_LENGTH);
                }
            })));
        }
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
    onSave(event) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[vessel-modal] Saving new vessel...');
            // Avoid multiple call
            if (this.disabled)
                return;
            yield AppFormUtils.waitWhilePending(this.formVessel);
            if (this.formVessel.invalid) {
                this.formVessel.markAllAsTouched();
                AppFormUtils.logFormErrors(this.formVessel.form);
                return;
            }
            this.loading = true;
            try {
                const json = this.formVessel.value;
                const data = Vessel.fromObject(json);
                // Applying the input synchronisation status, if any (need for offline storage)
                if (this.synchronizationStatus) {
                    data.synchronizationStatus = this.synchronizationStatus;
                }
                // If vessel name is not required and blank, copy exterior marking on name field
                if (isNotNil(this.withNameRequired) && !this.withNameRequired && isNotNil(data.vesselFeatures) && isNilOrBlank(data.vesselFeatures.name)) {
                    data.vesselFeatures.name = data.vesselFeatures.exteriorMarking;
                }
                this.disable();
                this.formVessel.error = null;
                const savedData = yield this.vesselService.save(data);
                return yield this.viewCtrl.dismiss(savedData);
            }
            catch (err) {
                this.formVessel.error = err && err.message || err;
                this.enable();
                this.loading = false;
                this.scrollToTop();
            }
        });
    }
    disable() {
        this.formVessel.disable();
    }
    enable() {
        this.formVessel.enable();
    }
    cancel() {
        this.viewCtrl.dismiss();
    }
    onReset(event) {
        this.formVessel.setValue(Vessel.fromObject({}));
        this.formVessel.markAsPristine();
        this.formVessel.markAsUntouched();
        this.scrollToTop();
    }
    scrollToTop(duration) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.content) {
                return this.content.scrollToTop(duration);
            }
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Number)
], VesselModal.prototype, "defaultStatus", void 0);
__decorate([
    Input(),
    __metadata("design:type", ReferentialRef)
], VesselModal.prototype, "defaultRegistrationLocation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselModal.prototype, "canEditStatus", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], VesselModal.prototype, "withNameRequired", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselModal.prototype, "maxDate", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], VesselModal.prototype, "synchronizationStatus", void 0);
__decorate([
    ViewChild(VesselForm, { static: true }),
    __metadata("design:type", VesselForm)
], VesselModal.prototype, "formVessel", void 0);
__decorate([
    ViewChild(IonContent, { static: true }),
    __metadata("design:type", IonContent)
], VesselModal.prototype, "content", void 0);
VesselModal = __decorate([
    Component({
        selector: 'app-vessel-modal',
        templateUrl: './vessel-modal.html'
    }),
    __metadata("design:paramtypes", [VesselService,
        ConfigService,
        ReferentialRefService,
        ModalController])
], VesselModal);
export { VesselModal };
//# sourceMappingURL=vessel-modal.js.map