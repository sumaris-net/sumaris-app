import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppForm } from '@sumaris-net/ngx-components';
import moment from 'moment';
let StrategyModal = class StrategyModal extends AppForm {
    constructor(injector, formBuilder, viewCtrl, cd) {
        super(injector, formBuilder.group({
            year: [null, Validators.required]
        }));
        this.formBuilder = formBuilder;
        this.viewCtrl = viewCtrl;
        this.cd = cd;
    }
    ngOnInit() {
        super.ngOnInit();
        this.form.get('year').setValue(moment());
        this.form.enable();
    }
    computeTitle() {
        return __awaiter(this, void 0, void 0, function* () {
            return 'REFERENTIAL.ENTITY.DUPLICATE_STRATEGY';
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss();
        });
    }
    validDate() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss(this.form.get('year').value);
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
StrategyModal = __decorate([
    Component({
        selector: 'app-strategy-modal',
        templateUrl: './strategy.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        ModalController,
        ChangeDetectorRef])
], StrategyModal);
export { StrategyModal };
//# sourceMappingURL=strategy.modal.js.map