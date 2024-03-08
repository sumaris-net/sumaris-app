import { __decorate, __metadata } from "tslib";
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { toBoolean } from '@sumaris-net/ngx-components';
let AppProgressBarComponent = class AppProgressBarComponent {
    constructor() {
        this.cancel = new EventEmitter();
    }
    ngOnInit() {
        this.progression = this.progression || new ProgressionModel();
        this.cancellable = toBoolean(this.cancellable, this.cancel.observers.length > 0);
    }
    cancelClick(event) {
        this.progression.cancel();
        this.cancel.emit(event);
    }
};
__decorate([
    Input(),
    __metadata("design:type", ProgressionModel)
], AppProgressBarComponent.prototype, "progression", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], AppProgressBarComponent.prototype, "cancellable", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], AppProgressBarComponent.prototype, "cancel", void 0);
AppProgressBarComponent = __decorate([
    Component({
        selector: 'app-progress-bar',
        templateUrl: './progress-bar.component.html',
        styleUrls: ['./progress-bar.component.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [])
], AppProgressBarComponent);
export { AppProgressBarComponent };
//# sourceMappingURL=progress-bar.component.js.map