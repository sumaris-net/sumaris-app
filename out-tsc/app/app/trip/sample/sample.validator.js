import { __decorate, __metadata, __param } from "tslib";
import { Injectable, Optional } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppFormArray, SharedFormGroupValidators, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { Sample } from './sample.model';
import { TranslateService } from '@ngx-translate/core';
import { ImageAttachmentValidator } from '@app/data/image/image-attachment.validator';
import { ImageAttachment } from '@app/data/image/image-attachment.model';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
let SampleValidatorService = class SampleValidatorService extends BaseValidatorService {
    constructor(formBuilder, translate, imageAttachmentValidator) {
        super(formBuilder, translate);
        this.formBuilder = formBuilder;
        this.translate = translate;
        this.imageAttachmentValidator = imageAttachmentValidator;
    }
    getFormGroupConfig(data, opts) {
        const config = {
            __typename: [Sample.TYPENAME],
            id: [toNumber(data && data.id, null)],
            updateDate: [data && data.updateDate || null],
            creationDate: [data && data.creationDate || null],
            rankOrder: [toNumber(data && data.rankOrder, null), Validators.required],
            label: [data && data.label || null, (!opts || opts.requiredLabel !== false) ? Validators.required : null],
            individualCount: [toNumber(data && data.individualCount, null), Validators.compose([Validators.min(0), SharedValidators.integer])],
            sampleDate: [data && data.sampleDate || null, Validators.required],
            taxonGroup: [data && data.taxonGroup || null, SharedValidators.entity],
            taxonName: [data && data.taxonName || null, SharedValidators.entity],
            matrixId: [toNumber(data && data.matrixId, null)],
            batchId: [toNumber(data && data.batchId, null)],
            size: [toNumber(data && data.size, null)],
            sizeUnit: [data && data.sizeUnit || null],
            comments: [data && data.comments || null],
            children: this.formBuilder.array([]),
            parent: [data && data.parent || null, SharedValidators.entity],
            // Quality properties
            controlDate: [data && data.controlDate || null],
            validationDate: [data && data.validationDate || null],
            qualificationDate: [data && data.qualificationDate || null],
            qualificationComments: [data && data.qualificationComments || null],
            qualityFlagId: [toNumber(data && data.qualityFlagId, QualityFlagIds.NOT_QUALIFIED)],
        };
        // Add children form array
        if (!opts || opts.withChildren !== false) {
            config['children'] = this.formBuilder.array([]);
        }
        // Add measurement values
        if (!opts || opts.measurementValuesAsGroup !== false) {
            config['measurementValues'] = this.formBuilder.group({});
        }
        else {
            config['measurementValues'] = this.formBuilder.control((data === null || data === void 0 ? void 0 : data.measurementValues) || null);
        }
        // Add image attachments
        if (this.imageAttachmentValidator && ((opts === null || opts === void 0 ? void 0 : opts.withImages) === true)) {
            config['images'] = this.getImagesFormArray(data === null || data === void 0 ? void 0 : data.images);
        }
        return config;
    }
    getFormGroupOptions(data, opts) {
        return {
            validators: [
                SharedFormGroupValidators.requiredIfEmpty('taxonGroup', 'taxonName'),
                SharedFormGroupValidators.requiredIfEmpty('taxonName', 'taxonGroup')
            ]
        };
    }
    updateFormGroup(form, opts) {
        console.debug('[sample-validator] Updating form group...', opts);
        // Label required validator
        const labelControl = form.get('label');
        if ((!opts || opts.requiredLabel !== false)) {
            if (labelControl && !labelControl.hasValidator(Validators.required)) {
                labelControl.setValidators(Validators.required);
            }
        }
        else if (labelControl && labelControl.hasValidator(Validators.required)) {
            labelControl.removeValidators(Validators.required);
        }
        // Add image attachments
        let imageFormArray = form.get('images');
        if (this.imageAttachmentValidator && ((opts === null || opts === void 0 ? void 0 : opts.withImages) === true)) {
            if (!imageFormArray) {
                imageFormArray = this.getImagesFormArray();
                form.addControl('images', imageFormArray);
            }
        }
        else if (imageFormArray) {
            form.removeControl('images');
        }
    }
    getI18nError(errorKey, errorContent) {
        if (SAMPLE_VALIDATOR_I18N_ERROR_KEYS[errorKey])
            return this.translate.instant(SAMPLE_VALIDATOR_I18N_ERROR_KEYS[errorKey], errorContent);
        return super.getI18nError(errorKey, errorContent);
    }
    getImagesFormArray(data, opts) {
        const formArray = new AppFormArray((image) => this.imageAttachmentValidator.getFormGroup(image), ImageAttachment.equals, ImageAttachment.isEmpty);
        if (data)
            formArray.patchValue(data);
        return formArray;
    }
};
SampleValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __param(2, Optional()),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        ImageAttachmentValidator])
], SampleValidatorService);
export { SampleValidatorService };
export const SAMPLE_VALIDATOR_I18N_ERROR_KEYS = {
    missingWeightOrSize: 'TRIP.SAMPLE.ERROR.WEIGHT_OR_LENGTH_REQUIRED',
    tagIdLength: 'TRIP.SAMPLE.ERROR.INVALID_TAG_ID_LENGTH',
    outOfRange: 'TRIP.SAMPLE.ERROR.OUT_OF_RANGE',
};
//# sourceMappingURL=sample.validator.js.map