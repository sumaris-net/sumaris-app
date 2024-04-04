import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { AppFormUtils, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { ModalController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { SamplesTable } from './samples.table';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
let SamplesModal = class SamplesModal {
    constructor(injector, viewCtrl, settings, translate, cd) {
        this.injector = injector;
        this.viewCtrl = viewCtrl;
        this.settings = settings;
        this.translate = translate;
        this.cd = cd;
        this.debug = !environment.production;
        this.loading = false;
        this.$title = new BehaviorSubject(undefined);
        this.mobile = this.settings.mobile;
        this.isNew = false;
        this.showTaxonGroup = true;
        this.showTaxonName = true;
        this.showLabel = false;
        // Default value
        this.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
    }
    get dirty() {
        return this.table.dirty;
    }
    get enabled() {
        return this.table.enabled;
    }
    get invalid() {
        return this.table.invalid;
    }
    get valid() {
        return this.table.valid;
    }
    get $pmfms() {
        return this.table.pmfms$;
    }
    ngOnInit() {
        this.canEdit = toBoolean(this.canEdit, !this.disabled);
        this.disabled = !this.canEdit || toBoolean(this.disabled, true);
        this.i18nSuffix = this.i18nSuffix || '';
        if (this.disabled) {
            this.table.disable();
        }
        // Compute the title
        this.$title.next(this.title || '');
        // Add callback
        this.applyValue();
    }
    applyValue() {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sample-modal] Applying data to form');
            this.table.markAsReady();
            try {
                // Set form value
                this.data = this.data || [];
                this.table.value = this.data;
                // Call ready callback
                if (this.onReady) {
                    const promiseOrVoid = this.onReady(this);
                    if (promiseOrVoid)
                        yield promiseOrVoid;
                }
            }
            finally {
                this.table.markAsUntouched();
                this.table.markAsPristine();
                this.markForCheck();
            }
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss();
        });
    }
    ready() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.table.ready();
        });
    }
    onSubmit(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return; // avoid many call
            yield AppFormUtils.waitWhilePending(this.table);
            if (this.invalid) {
                // if (this.debug) AppFormUtils.logFormErrors(this.table.table., "[sample-modal] ");
                this.table.error = 'COMMON.FORM.HAS_ERROR';
                this.table.markAllAsTouched();
                return;
            }
            this.loading = true;
            // Save table content
            yield this.table.save();
            const data = this.table.value;
            yield this.viewCtrl.dismiss(data);
        });
    }
    /* -- protected methods -- */
    markForCheck() {
        this.cd.markForCheck();
    }
    onNewFabButtonClick(event) {
        this.table.addRow(event);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesModal.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesModal.prototype, "isNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SamplesModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SamplesModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplesModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplesModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SamplesModal.prototype, "pmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplesModal.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplesModal.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SamplesModal.prototype, "canEdit", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesModal.prototype, "defaultSampleDate", void 0);
__decorate([
    Input(),
    __metadata("design:type", TaxonGroupRef)
], SamplesModal.prototype, "defaultTaxonGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesModal.prototype, "showTaxonGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesModal.prototype, "showTaxonName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesModal.prototype, "showLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplesModal.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SamplesModal.prototype, "onReady", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SamplesModal.prototype, "onDelete", void 0);
__decorate([
    ViewChild('table', { static: true }),
    __metadata("design:type", SamplesTable)
], SamplesModal.prototype, "table", void 0);
SamplesModal = __decorate([
    Component({
        selector: 'app-samples-modal',
        templateUrl: 'samples.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        LocalSettingsService,
        TranslateService,
        ChangeDetectorRef])
], SamplesModal);
export { SamplesModal };
//# sourceMappingURL=samples.modal.js.map