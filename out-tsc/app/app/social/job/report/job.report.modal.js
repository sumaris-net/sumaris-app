import { __decorate, __metadata } from "tslib";
import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Job } from '@app/social/job/job.model';
import { capitalizeFirstLetter, changeCaseToUnderscore, isNotNilOrBlank, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
let JobReportModal = class JobReportModal {
    constructor(translate, modalCtrl, settings) {
        this.translate = translate;
        this.modalCtrl = modalCtrl;
        this.settings = settings;
        this.showLog = false;
    }
    ngOnInit() {
        var _a, _b;
        this.mobile = toBoolean(this.mobile, this.settings.mobile);
        this.items = Object.entries(((_a = this.job) === null || _a === void 0 ? void 0 : _a.report) || {})
            .filter(([key, value]) => isNotNilOrBlank(value) && key !== 'message')
            .map(([key, value]) => {
            const i18nKey = 'SOCIAL.JOB.REPORT.STATS.' + changeCaseToUnderscore(key).toUpperCase();
            let message = this.translate.instant(i18nKey, this.job.report);
            // Missing i18n key
            if (message === i18nKey) {
                message = `${capitalizeFirstLetter(key)}: ${value}`;
            }
            return message;
        });
        this.message = (_b = this.job.report) === null || _b === void 0 ? void 0 : _b.message;
    }
    close(event) {
        this.modalCtrl.dismiss();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], JobReportModal.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Job)
], JobReportModal.prototype, "job", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], JobReportModal.prototype, "mobile", void 0);
JobReportModal = __decorate([
    Component({
        selector: 'app-job-report-modal',
        templateUrl: './job.report.modal.html'
    }),
    __metadata("design:paramtypes", [TranslateService,
        ModalController,
        LocalSettingsService])
], JobReportModal);
export { JobReportModal };
//# sourceMappingURL=job.report.modal.js.map