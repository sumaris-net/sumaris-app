import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { AppValidatorService, SharedValidators } from '@sumaris-net/ngx-components';
import { ImageAttachment } from '@app/data/image/image-attachment.model';
import { Validators } from '@angular/forms';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
let ImageAttachmentValidator = class ImageAttachmentValidator extends AppValidatorService {
    getFormGroupConfig(data) {
        return {
            __typename: ImageAttachment.TYPENAME,
            id: [(data === null || data === void 0 ? void 0 : data.id) || null],
            url: [(data === null || data === void 0 ? void 0 : data.url) || null],
            dataUrl: [(data === null || data === void 0 ? void 0 : data.dataUrl) || null],
            dateTime: [(data === null || data === void 0 ? void 0 : data.dateTime) || null],
            comments: [(data === null || data === void 0 ? void 0 : data.comments) || null, Validators.maxLength(2000)],
            updateDate: [(data === null || data === void 0 ? void 0 : data.updateDate) || null],
            creationDate: [(data === null || data === void 0 ? void 0 : data.creationDate) || null],
            qualityFlagId: [(data === null || data === void 0 ? void 0 : data.qualityFlagId) || QualityFlagIds.NOT_QUALIFIED],
            recorderDepartment: [(data === null || data === void 0 ? void 0 : data.recorderDepartment) || null, SharedValidators.entity],
            recorderPerson: [(data === null || data === void 0 ? void 0 : data.recorderPerson) || null, SharedValidators.entity]
        };
    }
};
ImageAttachmentValidator = __decorate([
    Injectable({ providedIn: 'root' })
], ImageAttachmentValidator);
export { ImageAttachmentValidator };
//# sourceMappingURL=image-attachment.validator.js.map