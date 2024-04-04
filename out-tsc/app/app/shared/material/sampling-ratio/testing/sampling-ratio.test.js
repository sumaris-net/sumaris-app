import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ProgramProperties } from '@app/referential/services/config/program.config';
let AppSamplingRatioTestPage = class AppSamplingRatioTestPage {
    constructor(formBuilder, cd) {
        this.formBuilder = formBuilder;
        this.cd = cd;
        this.maxDecimals = 6;
        this.format = '%';
        this.formats = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.values;
        this.floatLabels = ['never', 'auto', 'always'];
        this.reload = true;
        this.form = formBuilder.group({
            empty: [null, Validators.required],
            enable: [0.15],
            disable: [0.15]
        });
        this.form.get('disable').disable();
        // Copy enable value to disable form
        this.form.get('enable').valueChanges
            .subscribe(value => this.form.get('disable').setValue(value));
    }
    ngOnInit() {
        setTimeout(() => this.loadData(), 250);
    }
    setFormat(type) {
        this.format = type;
        this.refresh();
    }
    setMaxDecimals(maxDecimals) {
        this.maxDecimals = maxDecimals;
        this.refresh();
    }
    setFloatLabel(type) {
        this.floatLabel = type;
        this.refresh();
    }
    refresh() {
        this.reload = false;
        setTimeout(() => {
            this.reload = true;
            this.cd.markForCheck();
        }, 100);
    }
    // Load the form with data
    loadData() {
        return __awaiter(this, void 0, void 0, function* () {
            const data = {
                empty: null,
                enable: 0.15,
                disable: 0.15,
            };
            this.form.setValue(data);
        });
    }
    doSubmit(event) {
        console.debug('Validate form: ', this.form.value);
    }
};
AppSamplingRatioTestPage = __decorate([
    Component({
        selector: 'app-sampling-ratio-test',
        templateUrl: './sampling-ratio.test.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        ChangeDetectorRef])
], AppSamplingRatioTestPage);
export { AppSamplingRatioTestPage };
//# sourceMappingURL=sampling-ratio.test.js.map