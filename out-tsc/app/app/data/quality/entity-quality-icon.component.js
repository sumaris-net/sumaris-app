import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { EntityUtils } from '@sumaris-net/ngx-components';
import { qualityFlagToColor } from '@app/data/services/model/model.utils';
let EntityQualityIconComponent = class EntityQualityIconComponent {
    constructor(cd) {
        this.cd = cd;
    }
    set value(value) {
        this.setValue(value);
    }
    get value() {
        return this._value;
    }
    setValue(value) {
        this._value = value;
        // DEBUG
        //console.debug('icon: TODO Computing icon for', value);
        // Local data
        if (EntityUtils.isLocal(value)) {
            switch (value['synchronizationStatus']) {
                case 'READY_TO_SYNC':
                    this.icon = 'time-outline';
                    this.title = 'QUALITY.READY_TO_SYNC';
                    this.color = 'danger';
                    break;
                case 'SYNC':
                    this.icon = 'checkmark-circle';
                    this.title = 'QUALITY.VALIDATED';
                    this.color = 'danger';
                    break;
                case 'DIRTY':
                default:
                    this.icon = 'pencil';
                    this.title = 'QUALITY.MODIFIED_OFFLINE';
                    this.color = 'danger';
                    break;
            }
        }
        // Remote data
        else {
            if (!value.controlDate) {
                this.icon = 'pencil';
                this.title = 'QUALITY.MODIFIED';
                this.color = 'secondary';
            }
            else if (!value['validationDate']) {
                this.icon = 'checkmark';
                this.title = 'QUALITY.CONTROLLED';
                this.color = 'tertiary';
            }
            else if (!value.qualificationDate) {
                this.icon = 'checkmark-circle';
                this.title = 'QUALITY.VALIDATED';
                this.color = 'tertiary';
            }
            else {
                this.icon = 'flag';
                this.title = 'QUALITY.QUALIFIED';
                this.color = qualityFlagToColor(value.qualityFlagId);
            }
        }
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], EntityQualityIconComponent.prototype, "value", null);
EntityQualityIconComponent = __decorate([
    Component({
        selector: 'app-entity-quality-icon',
        template: '<div [title]="title|translate"><ion-icon [color]="color" [name]="icon" slot="icon-only" style="pointer-events: none;"></ion-icon></div>',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [ChangeDetectorRef])
], EntityQualityIconComponent);
export { EntityQualityIconComponent };
//# sourceMappingURL=entity-quality-icon.component.js.map