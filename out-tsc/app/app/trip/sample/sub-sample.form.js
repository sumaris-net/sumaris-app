import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { UntypedFormBuilder } from '@angular/forms';
import { AppFormUtils, EntityUtils, isNil, isNotEmptyArray, isNotNil, joinPropertiesPath, LocalSettingsService, startsWithUpperCase, toNumber } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { SubSampleValidatorService } from '@app/trip/sample/sub-sample.validator';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { merge, Subject } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
let SubSampleForm = class SubSampleForm extends MeasurementValuesForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, cd, validatorService, settings) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(), {
            mapPmfms: (pmfms) => this.mapPmfms(pmfms)
        });
        this.injector = injector;
        this.measurementsValidatorService = measurementsValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.cd = cd;
        this.validatorService = validatorService;
        this.settings = settings;
        this._availableParents = [];
        this._availableSortedParents = [];
        this.onParentChanges = new Subject();
        this.showLabel = false;
        this.showParent = true;
        this.showComment = true;
        this.showError = true;
        this.isNotHiddenPmfm = PmfmUtils.isNotHidden;
        this.selectInputContent = AppFormUtils.selectInputContent;
        this._enable = true;
        this.i18nPmfmPrefix = 'TRIP.SAMPLE.PMFM.';
        // for DEV only
        this.debug = !environment.production;
    }
    set availableParents(parents) {
        if (this._availableParents !== parents) {
            this._availableParents = parents;
            if (!this.loading)
                this.onParentChanges.next();
        }
    }
    get availableParents() {
        return this._availableParents;
    }
    ngOnInit() {
        var _a;
        super.ngOnInit();
        // Set defaults
        this.acquisitionLevel = this.acquisitionLevel || AcquisitionLevelCodes.INDIVIDUAL_MONITORING;
        this.tabindex = toNumber(this.tabindex, 1);
        this.maxVisibleButtons = toNumber(this.maxVisibleButtons, 4);
        this.focusFieldName = !this.mobile && (this.showLabel ? 'label' :
            (this.showParent ? 'parent' : null));
        this.i18nFieldPrefix = this.i18nFieldPrefix || `TRIP.SUB_SAMPLE.`;
        this.i18nSuffix = this.i18nSuffix || '';
        this.i18nFullSuffix = `${this.acquisitionLevel}.${this.i18nSuffix}`;
        // Parent combo
        this.registerAutocompleteField('parent', {
            suggestFn: (value, options) => this.suggestParent(value),
            showAllOnFocus: true,
            mobile: this.mobile
        });
        this.registerSubscription(merge(this.onParentChanges.pipe(mergeMap(() => this.pmfms$)), this.pmfms$)
            .pipe(filter(isNotEmptyArray)).subscribe((pmfms) => this.updateParents(pmfms)));
        if (!this.showParent) {
            (_a = this.form.parent) === null || _a === void 0 ? void 0 : _a.disable();
        }
    }
    toggleComment() {
        this.showComment = !this.showComment;
        this.markForCheck();
    }
    /* -- protected methods -- */
    mapPmfms(pmfms) {
        // DEBUG
        console.debug('[sub-sample-form] Mapping PMFMs...', pmfms);
        const tagIdPmfmIndex = pmfms.findIndex(p => p.id === PmfmIds.TAG_ID);
        const tagIdPmfm = tagIdPmfmIndex !== -1 && pmfms[tagIdPmfmIndex];
        this.displayParentPmfm = (tagIdPmfm === null || tagIdPmfm === void 0 ? void 0 : tagIdPmfm.required) ? tagIdPmfm : null;
        // Force the parent PMFM to be hidden, and NOT required
        if (this.displayParentPmfm && !this.displayParentPmfm.hidden) {
            const cloneParentPmfm = this.displayParentPmfm.clone();
            cloneParentPmfm.hidden = true;
            cloneParentPmfm.required = false;
            pmfms[tagIdPmfmIndex] = cloneParentPmfm;
        }
        return pmfms;
    }
    getValue() {
        const value = super.getValue();
        // Copy parent measurement, if any
        if (this.displayParentPmfm && value.parent) {
            const parentPmfmId = this.displayParentPmfm.id.toString();
            value.measurementValues = value.measurementValues || {};
            value.measurementValues[parentPmfmId] = value.parent.measurementValues[parentPmfmId];
        }
        if (!this.showComment)
            value.comments = undefined;
        return value;
    }
    updateParents(pmfms) {
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            console.debug('[sub-sample-form] Update parents...');
            const parents = this._availableParents || [];
            const hasTaxonName = parents.some(s => { var _a; return isNotNil((_a = s.taxonName) === null || _a === void 0 ? void 0 : _a.id); });
            const attributeName = hasTaxonName ? 'taxonName' : 'taxonGroup';
            const baseDisplayAttributes = this.settings.getFieldDisplayAttributes(attributeName)
                .map(key => `${attributeName}.${key}`);
            // If display parent using by a pmfm
            if (this.displayParentPmfm) {
                const parentDisplayPmfmIdStr = this.displayParentPmfm.id.toString();
                const parentDisplayPmfmPath = `measurementValues.${parentDisplayPmfmIdStr}`;
                // Keep parents without this pmfms
                const filteredParents = parents.filter(s => isNotNil(s.measurementValues[parentDisplayPmfmIdStr]));
                this._availableSortedParents = EntityUtils.sort(filteredParents, parentDisplayPmfmPath);
                this.autocompleteFields.parent.attributes = [parentDisplayPmfmPath].concat(baseDisplayAttributes);
                this.autocompleteFields.parent.columnSizes = [4].concat(baseDisplayAttributes.map(attr => 
                // If label then col size = 2
                attr.endsWith('label') ? 2 : undefined));
                this.autocompleteFields.parent.columnNames = [PmfmUtils.getPmfmName(this.displayParentPmfm)];
                this.autocompleteFields.parent.displayWith = (obj) => obj && obj.measurementValues
                    && PmfmValueUtils.valueToString(obj.measurementValues[parentDisplayPmfmIdStr], { pmfm: this.displayParentPmfm })
                    || undefined;
            }
            else {
                const displayAttributes = ['rankOrder'].concat(baseDisplayAttributes);
                this._availableSortedParents = EntityUtils.sort(parents.slice(), 'rankOrder');
                this.autocompleteFields.parent.attributes = displayAttributes;
                this.autocompleteFields.parent.columnSizes = undefined; // use defaults
                this.autocompleteFields.parent.columnNames = undefined; // use defaults
                this.autocompleteFields.parent.displayWith = (obj) => obj && joinPropertiesPath(obj, displayAttributes) || undefined;
            }
            this.markForCheck();
        });
    }
    suggestParent(value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (EntityUtils.isNotEmpty(value, 'label')) {
                return [value];
            }
            value = (typeof value === 'string' && value !== '*') && value || undefined;
            if (isNil(value))
                return this._availableSortedParents; // All
            if (this.debug)
                console.debug(`[sub-sample-form] Searching parent {${value || '*'}}...`);
            if (this.displayParentPmfm) { // Search on a specific Pmfm (e.g Tag-ID)
                return this._availableSortedParents.filter(p => startsWithUpperCase(p.measurementValues[this.displayParentPmfm.id], value));
            }
            // Search on rankOrder
            return this._availableSortedParents.filter(p => p.rankOrder.toString().startsWith(value));
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleForm.prototype, "i18nPmfmSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleForm.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubSampleForm.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SubSampleForm.prototype, "tabindex", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleForm.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSampleForm.prototype, "showLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSampleForm.prototype, "showParent", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSampleForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSampleForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SubSampleForm.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleForm.prototype, "defaultLatitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleForm.prototype, "defaultLongitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSampleForm.prototype, "displayParentPmfm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], SubSampleForm.prototype, "availableParents", null);
SubSampleForm = __decorate([
    Component({
        selector: 'app-sub-sample-form',
        templateUrl: 'sub-sample.form.html',
        styleUrls: ['sub-sample.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        ChangeDetectorRef,
        SubSampleValidatorService,
        LocalSettingsService])
], SubSampleForm);
export { SubSampleForm };
//# sourceMappingURL=sub-sample.form.js.map