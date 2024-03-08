import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { UntypedFormBuilder } from '@angular/forms';
import { AppFormUtils, FormArrayHelper, isNil, isNilOrBlank, isNotEmptyArray, isNotNilOrBlank, toNumber, } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { SampleValidatorService } from './sample.validator';
import { Sample } from './sample.model';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { SubSampleValidatorService } from '@app/trip/sample/sub-sample.validator';
let SampleForm = class SampleForm extends MeasurementValuesForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, validatorService, subValidatorService) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(), {
            skipDisabledPmfmControl: false,
            skipComputedPmfmControl: false,
            onUpdateFormGroup: (form) => this.onUpdateFormGroup(form),
        });
        this.measurementsValidatorService = measurementsValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.validatorService = validatorService;
        this.subValidatorService = subValidatorService;
        this.availableTaxonGroups = null;
        this.requiredLabel = true;
        this.showLabel = true;
        this.showSampleDate = true;
        this.showTaxonGroup = true;
        this.showTaxonName = true;
        this.showComment = true;
        this.showError = true;
        this.isNotHiddenPmfm = PmfmUtils.isNotHidden;
        this.selectInputContent = AppFormUtils.selectInputContent;
        // Set default acquisition level
        this.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
        this._enable = true;
        this.i18nPmfmPrefix = 'TRIP.SAMPLE.PMFM.';
        this.childrenArrayHelper = this.getChildrenFormHelper(this.form);
        // for DEV only
        this.debug = !environment.production;
    }
    ngOnInit() {
        super.ngOnInit();
        this.tabindex = toNumber(this.tabindex, 1);
        this.maxVisibleButtons = toNumber(this.maxVisibleButtons, 4);
        // Taxon group combo
        if (isNotEmptyArray(this.availableTaxonGroups)) {
            this.registerAutocompleteField('taxonGroup', {
                items: this.availableTaxonGroups,
                mobile: this.mobile,
            });
        }
        else {
            this.registerAutocompleteField('taxonGroup', {
                suggestFn: (value, options) => this.programRefService.suggestTaxonGroups(value, Object.assign(Object.assign({}, options), { program: this.programLabel })),
                mobile: this.mobile,
            });
        }
        // Taxon name combo
        this.registerAutocompleteField('taxonName', {
            suggestFn: (value, options) => this.suggestTaxonNames(value, options),
            mobile: this.mobile,
        });
        this.focusFieldName =
            !this.mobile && ((this.showLabel && 'label') || (this.showTaxonGroup && 'taxonGroup') || (this.showTaxonName && 'taxonName'));
    }
    setChildren(children, opts) {
        children = children || [];
        if (this.childrenArrayHelper.size() !== children.length) {
            this.childrenArrayHelper.resize(children.length);
        }
        this.form.patchValue({ children }, opts);
    }
    toggleComment() {
        this.showComment = !this.showComment;
        // Mark form as dirty, if need to reset comment (see getValue())
        if (!this.showComment && isNotNilOrBlank(this.form.get('comments').value))
            this.form.markAsDirty();
        this.markForCheck();
    }
    /* -- protected methods -- */
    onUpdateFormGroup(form) {
        this.validatorService.updateFormGroup(form, {
            requiredLabel: this.requiredLabel,
        });
    }
    onApplyingEntity(data, opts) {
        var _a;
        super.onApplyingEntity(data, opts);
        this.showComment = this.showComment || isNotNilOrBlank(data.comments);
        const childrenCount = ((_a = data.children) === null || _a === void 0 ? void 0 : _a.length) || 0;
        if (this.childrenArrayHelper.size() !== childrenCount) {
            this.childrenArrayHelper.resize(childrenCount);
        }
    }
    getValue() {
        const value = super.getValue();
        // Reset comment, when hidden
        if (!this.showComment)
            value.comments = undefined;
        return value;
    }
    suggestTaxonNames(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const taxonGroup = this.form.get('taxonGroup').value;
            // IF taxonGroup column exists: taxon group must be filled first
            if (this.showTaxonGroup && isNilOrBlank(value) && isNil(taxonGroup))
                return { data: [] };
            return this.programRefService.suggestTaxonNames(value, {
                programLabel: this.programLabel,
                searchAttribute: options && options.searchAttribute,
                taxonGroupId: (taxonGroup && taxonGroup.id) || undefined,
            });
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    getChildrenFormHelper(form) {
        let arrayControl = form.get('children');
        if (!arrayControl) {
            arrayControl = this.formBuilder.array([]);
            form.addControl('children', arrayControl);
        }
        return new FormArrayHelper(arrayControl, (value) => this.subValidatorService.getFormGroup(value, {
            measurementValuesAsGroup: false,
            requiredParent: false, // Not need
        }), (v1, v2) => Sample.equals(v1, v2), (value) => isNil(value), { allowEmptyArray: true });
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], SampleForm.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleForm.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SampleForm.prototype, "tabindex", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SampleForm.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SampleForm.prototype, "availableTaxonGroups", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleForm.prototype, "requiredLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleForm.prototype, "showLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleForm.prototype, "showSampleDate", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleForm.prototype, "showTaxonGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleForm.prototype, "showTaxonName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SampleForm.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SampleForm.prototype, "pmfmValueColor", void 0);
SampleForm = __decorate([
    Component({
        selector: 'app-sample-form',
        templateUrl: 'sample.form.html',
        styleUrls: ['sample.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        SampleValidatorService,
        SubSampleValidatorService])
], SampleForm);
export { SampleForm };
//# sourceMappingURL=sample.form.js.map