import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { FormArrayHelper, isNotNilOrBlank, NetworkService, ReferentialUtils } from '@sumaris-net/ngx-components';
import { AggregatedLandingService } from './aggregated-landing.service';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { VesselActivityValidatorService } from './vessel-activity.validator';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { MetierFilter } from '@app/referential/services/filter/metier.filter';
let VesselActivityForm = class VesselActivityForm extends MeasurementValuesForm {
    constructor(injector, formBuilder, dataService, programRefService, validatorService, measurementsValidatorService, referentialRefService, modalCtrl, network) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, null, {
            mapPmfms: (pmfms) => this.mapPmfms(pmfms)
        });
        this.formBuilder = formBuilder;
        this.dataService = dataService;
        this.programRefService = programRefService;
        this.validatorService = validatorService;
        this.measurementsValidatorService = measurementsValidatorService;
        this.referentialRefService = referentialRefService;
        this.modalCtrl = modalCtrl;
        this.network = network;
        this.showError = true;
        this.showComment = false;
        this.onRefresh = new EventEmitter();
        this.metierFilter = MetierFilter.fromObject(METIER_DEFAULT_FILTER);
        this.metierFocusIndex = -1;
        this.enableMetierFilter = false;
        this._enable = true;
        this.mobile = this.settings.mobile;
    }
    get metiersForm() {
        return this.form.controls.metiers;
    }
    ngOnInit() {
        super.ngOnInit();
        // Combo: metiers
        const metierAttributes = this.settings.getFieldDisplayAttributes('metier');
        this.registerAutocompleteField('metier', {
            service: this.referentialRefService,
            // Increase default column size, for 'label'
            columnSizes: metierAttributes.map(a => a === 'label' ? 3 : undefined /*auto*/),
            mobile: this.mobile
        });
    }
    onApplyingEntity(data, opts) {
        var _a;
        // Make sure to have (at least) one metier
        if (data === null || data === void 0 ? void 0 : data.metiers) {
            data.metiers = data.metiers && data.metiers.length ? data.metiers : [null];
        }
        if (!this.metiersHelper) {
            this.initMetiersHelper();
        }
        // Resize metiers array
        this.metiersHelper.resize(Math.max(1, (_a = data === null || data === void 0 ? void 0 : data.metiers) === null || _a === void 0 ? void 0 : _a.length));
        this.showComment = isNotNilOrBlank(data === null || data === void 0 ? void 0 : data.comments);
    }
    addMetier() {
        this.metiersHelper.add();
        if (!this.mobile) {
            this.metierFocusIndex = this.metiersHelper.size() - 1;
        }
    }
    removeMetier(index) {
        // TODO add confirmation if tripId != null
        this.metiersHelper.removeAt(index);
    }
    initMetiersHelper() {
        this.metiersHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'metiers'), (metier) => this.validatorService.getMetierFormControl(metier), ReferentialUtils.equals, ReferentialUtils.isEmpty, {
            allowEmptyArray: false
        });
        // Create at least one metier
        if (this.metiersHelper.size() === 0) {
            this.metiersHelper.resize(1);
        }
    }
    toggleComment() {
        this.showComment = !this.showComment;
        if (!this.showComment) {
            this.form.get('comments').setValue(null);
        }
        this.markForCheck();
    }
    mapPmfms(pmfms) {
        return pmfms.filter(p => p.required);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselActivityForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], VesselActivityForm.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], VesselActivityForm.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], VesselActivityForm.prototype, "showComment", void 0);
VesselActivityForm = __decorate([
    Component({
        selector: 'app-vessel-activity-form',
        templateUrl: './vessel-activity.form.html',
        styleUrls: ['./vessel-activity.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        AggregatedLandingService,
        ProgramRefService,
        VesselActivityValidatorService,
        MeasurementsValidatorService,
        ReferentialRefService,
        ModalController,
        NetworkService])
], VesselActivityForm);
export { VesselActivityForm };
//# sourceMappingURL=vessel-activity.form.js.map