import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { sleep } from '@sumaris-net/ngx-components';
import { ModalController } from '@ionic/angular';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { environment } from '@environments/environment';
let OperationsMapModal = class OperationsMapModal {
    constructor(viewCtrl, cd, programRefService) {
        this.viewCtrl = viewCtrl;
        this.cd = cd;
        this.programRefService = programRefService;
        this.modalReady = false; // Need to be false. Will be set to true after a delay
        this.showToolbar = true;
        this.showTooltip = true;
        this.debug = !environment.production;
    }
    get modalName() {
        return this.constructor.name;
    }
    ngOnInit() {
        sleep(500)
            .then(() => {
            console.debug('[operation-map-modal] Modal is ready: starting map...');
            this.modalReady = true;
            this.cd.markForCheck();
        });
    }
    cancel(_event) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss(null, 'cancel');
        });
    }
    onOperationClick(operation) {
        console.log('CLICK', operation);
        return this.viewCtrl.dismiss(operation);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationsMapModal.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationsMapModal.prototype, "showTooltip", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], OperationsMapModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationsMapModal.prototype, "latLongPattern", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationsMapModal.prototype, "programLabel", void 0);
OperationsMapModal = __decorate([
    Component({
        selector: 'app-operations-map-modal',
        templateUrl: './operations-map.modal.html',
        styleUrls: ['./operations-map.modal.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [ModalController,
        ChangeDetectorRef,
        ProgramRefService])
], OperationsMapModal);
export { OperationsMapModal };
//# sourceMappingURL=operations-map.modal.js.map