import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewChild } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AppFormUtils, isEmptyArray } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { AggregatedLandingForm, AggregatedLandingFormOption } from './aggregated-landing.form';
import { AggregatedLanding } from './aggregated-landing.model';
import { Alerts } from '@sumaris-net/ngx-components';
import { referentialToString } from '@sumaris-net/ngx-components';
import { isNil } from '@sumaris-net/ngx-components';
let AggregatedLandingModal = class AggregatedLandingModal {
    constructor(viewCtrl, alertCtrl, translate, cd) {
        this.viewCtrl = viewCtrl;
        this.alertCtrl = alertCtrl;
        this.translate = translate;
        this.cd = cd;
        this.loading = true;
        this._disabled = false;
        this.subscription = new Subscription();
        this.$title = new BehaviorSubject('');
    }
    get disabled() {
        var _a;
        return this._disabled || ((_a = this.form) === null || _a === void 0 ? void 0 : _a.disabled);
    }
    set disabled(value) {
        this._disabled = value;
        if (this.form)
            this.form.disable();
    }
    get canValidate() {
        var _a;
        return !this.loading && !this.disabled && !((_a = this.options) === null || _a === void 0 ? void 0 : _a.readonly);
    }
    get dirty() {
        return this.form ? (this.form.enabled && this.form.dirty) : false;
    }
    ngOnInit() {
        this.form.enable();
        this.form.data = this.data;
        this.updateTitle();
        this.loading = false;
        if (!this._disabled) {
            this.enable();
            // Add first activity
            if (isEmptyArray(this.data.vesselActivities)) {
                this.addActivity();
            }
        }
    }
    addActivity() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.form.ready();
            this.form.addActivity();
        });
    }
    updateTitle() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const title = yield this.translate.get('AGGREGATED_LANDING.TITLE', { vessel: referentialToString((_a = this.data) === null || _a === void 0 ? void 0 : _a.vesselSnapshot, ['exteriorMarking', 'name']) }).toPromise();
            this.$title.next(title);
        });
    }
    onSave(event) {
        return __awaiter(this, void 0, void 0, function* () {
            // Avoid multiple call
            if (this.disabled)
                return;
            yield AppFormUtils.waitWhilePending(this.form);
            if (this.form.invalid) {
                AppFormUtils.logFormErrors(this.form.form);
                this.form.markAllAsTouched();
                return;
            }
            this.loading = true;
            try {
                const value = {
                    aggregatedLanding: this.form.data,
                    saveOnDismiss: false,
                    tripToOpen: undefined
                };
                this.disable();
                this.form.error = null;
                yield this.viewCtrl.dismiss(value);
            }
            catch (err) {
                this.form.error = err && err.message || err;
                this.enable();
                this.loading = false;
            }
        });
    }
    disable() {
        this.form.disable();
        this._disabled = true;
    }
    enable() {
        this.form.enable();
        this._disabled = false;
    }
    cancel() {
        this.viewCtrl.dismiss({
            aggregatedLanding: undefined,
            saveOnDismiss: false,
            tripToOpen: undefined
        });
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    openTrip($event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!$event || !$event.activity)
                return;
            let saveBeforeLeave;
            if (this.dirty) {
                console.warn('The activity is dirty, must save first');
                saveBeforeLeave = yield Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate);
                if (isNil(saveBeforeLeave)) {
                    // user cancel
                    return;
                }
            }
            // set last activity
            this.viewCtrl.dismiss({
                aggregatedLanding: undefined,
                saveOnDismiss: saveBeforeLeave,
                tripToOpen: $event.activity
            });
        });
    }
};
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", AggregatedLandingForm)
], AggregatedLandingModal.prototype, "form", void 0);
__decorate([
    Input(),
    __metadata("design:type", AggregatedLanding)
], AggregatedLandingModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", AggregatedLandingFormOption)
], AggregatedLandingModal.prototype, "options", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AggregatedLandingModal.prototype, "disabled", null);
AggregatedLandingModal = __decorate([
    Component({
        selector: 'app-aggregated-landing-modal',
        templateUrl: './aggregated-landing.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [ModalController,
        AlertController,
        TranslateService,
        ChangeDetectorRef])
], AggregatedLandingModal);
export { AggregatedLandingModal };
//# sourceMappingURL=aggregated-landing.modal.js.map