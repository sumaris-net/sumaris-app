import { __decorate, __metadata, __param } from "tslib";
import { Component, Input, Optional } from '@angular/core';
import { BatchForm } from '@app/trip/batch/common/batch.form';
import { AppFormUtils, toBoolean } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
let BatchFormContent = class BatchFormContent {
    constructor(delegate) {
        this.selectInputContent = AppFormUtils.selectInputContent;
        this.delegate = delegate;
    }
    ngOnInit() {
        var _a, _b;
        this.debug = toBoolean(this.debug, ((_a = this.delegate) === null || _a === void 0 ? void 0 : _a.debug) || !environment.production);
        this.showError = toBoolean(this.showError, (_b = this.delegate) === null || _b === void 0 ? void 0 : _b.showError);
    }
};
__decorate([
    Input(),
    __metadata("design:type", BatchForm)
], BatchFormContent.prototype, "delegate", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchFormContent.prototype, "debug", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchFormContent.prototype, "showError", void 0);
BatchFormContent = __decorate([
    Component({
        selector: 'app-batch-form-content',
        templateUrl: './batch.form.content.html',
        styleUrls: ['./batch.form.content.scss'],
        // Do not enable this, because fields with a computed class will not be refreshed well
        //changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(0, Optional()),
    __metadata("design:paramtypes", [BatchForm])
], BatchFormContent);
export { BatchFormContent };
//# sourceMappingURL=batch.form.content.js.map