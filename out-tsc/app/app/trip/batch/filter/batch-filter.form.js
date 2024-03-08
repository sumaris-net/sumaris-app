import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { AppForm, firstArrayValue } from '@sumaris-net/ngx-components';
import { tap } from 'rxjs/operators';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
let BatchFilterForm = class BatchFilterForm extends AppForm {
    constructor(injector, formBuilder, cd) {
        super(injector, formBuilder.group({
            measurementValues: formBuilder.group({})
        }));
        this.formBuilder = formBuilder;
        this.cd = cd;
        this.debounceTime = 0;
        this.valueChanges = new EventEmitter();
    }
    set pmfms(value) {
        this.setPmfms(value);
    }
    get pmfms() {
        return this._pmfms;
    }
    ngOnInit() {
        this.enable();
        this.markAsReady();
    }
    ngAfterViewInit() {
        this.registerSubscription(this.form.valueChanges
            .pipe(
        //map(BatchFilter.fromObject),
        // DEBUG
        tap(value => console.debug('[batch-filter] Filter change to:', value)))
            .subscribe(value => this.valueChanges.emit(value)));
    }
    applyPmfmValue(pmfm, value) {
        const control = this.form.get(`measurementValues.${pmfm.id}`);
        control.patchValue(PmfmValueUtils.toModelValue(value, pmfm));
    }
    /**
     * Use in ngFor, for trackBy
     *
     * @param index
     * @param pmfm
     */
    trackPmfmFn(index, pmfm) {
        return pmfm.id;
    }
    setPmfms(pmfms) {
        const measurementValuesForm = this.form.get('measurementValues');
        // Remove previous controls
        const existingControlKeys = Object.keys(measurementValuesForm.controls);
        (pmfms || []).forEach(pmfm => {
            const key = pmfm.id.toString();
            let control = measurementValuesForm.get(key);
            if (!control) {
                control = this.formBuilder.control(null);
                measurementValuesForm.addControl(key, control);
                if (pmfm.type === 'qualitative_value') {
                    const value = firstArrayValue(pmfm.qualitativeValues);
                    this.applyPmfmValue(pmfm, value);
                }
            }
            else {
                existingControlKeys.splice(existingControlKeys.indexOf(key), 1);
            }
        });
        // Remove unused
        existingControlKeys.forEach(key => measurementValuesForm.removeControl(key));
        this._pmfms = pmfms;
        this.cd.detectChanges();
    }
    realignInkBar() {
        this.navBars.forEach(tab => tab._alignInkBarToSelectedTab());
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchFilterForm.prototype, "debounceTime", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], BatchFilterForm.prototype, "pmfms", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], BatchFilterForm.prototype, "valueChanges", void 0);
__decorate([
    ViewChildren('navBar'),
    __metadata("design:type", QueryList)
], BatchFilterForm.prototype, "navBars", void 0);
BatchFilterForm = __decorate([
    Component({
        selector: 'app-batch-filter-form',
        templateUrl: './batch-filter.form.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        ChangeDetectorRef])
], BatchFilterForm);
export { BatchFilterForm };
//# sourceMappingURL=batch-filter.form.js.map