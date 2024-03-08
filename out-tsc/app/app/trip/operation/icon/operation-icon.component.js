import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { isNil, isNotNil } from '@sumaris-net/ngx-components';
import { qualityFlagToColor, qualityFlagToIcon } from '@app/data/services/model/model.utils';
import { Operation } from '@app/trip/trip/trip.model';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import { TranslateService } from '@ngx-translate/core';
let OperationIconComponent = class OperationIconComponent {
    constructor(translate, cd) {
        this.translate = translate;
        this.cd = cd;
        this.icon = null;
        this.matSvgIcon = null;
        this.color = null;
        this.badgeIcon = null;
        this.badgeColor = null;
        this.badgeFill = 'clear';
        this.badgeSize = 'small';
        this.title = null;
        this._showError = false;
    }
    set value(value) {
        this.setValue(value);
    }
    get value() {
        return this._value;
    }
    set allowParentOperation(value) {
        if (this._allowParentOperation !== value) {
            this._allowParentOperation = value;
            if (this._value)
                this.setValue(this._value); // Recompute
        }
    }
    get allowParentOperation() {
        return this._allowParentOperation;
    }
    set showError(value) {
        if (this._showError !== value) {
            this._showError = value;
            if (this._value)
                this.setValue(this._value); // Recompute
        }
    }
    get showError() {
        return this._showError;
    }
    setValue(value) {
        if (!value) {
            this.reset();
            return;
        }
        // DEBUG
        //console.debug('[operation-icon] Computing icon for operation #' + value.id);
        this.reset({ emitEvent: false });
        this._value = value;
        // Is child
        if (isNotNil(value.parentOperationId)) {
            this.matSvgIcon = 'rollback-arrow';
            this.icon = undefined;
        }
        // Is parent, and has a child
        else if (isNotNil(value.childOperationId) || value.qualityFlagId === QualityFlagIds.NOT_COMPLETED || this.allowParentOperation) {
            this.matSvgIcon = 'down-arrow';
            this.icon = undefined;
            this.badgeIcon = isNil(value.childOperationId) ? 'time-outline' : undefined;
            this.badgeColor = this.badgeIcon && 'accent' || undefined;
        }
        // Other
        else {
            this.icon = 'navigate';
            this.matSvgIcon = undefined;
        }
        // Not controlled
        if (isNil(value.controlDate)) {
            this.color = this.color || 'secondary';
            // With error (stored in the qualification comments)
            if (this.showError && value.qualificationComments) {
                this.badgeIcon = 'alert';
                this.badgeColor = 'danger';
                this.badgeFill = 'solid';
                this.badgeSize = 'small';
                this.title = value.qualificationComments;
            }
            else {
                this.badgeIcon = this.badgeIcon || undefined;
            }
        }
        // Controlled, not qualified
        else if (isNil(value.qualificationDate)) {
            if (this.icon === 'navigate') {
                this.icon = 'checkmark';
                this.color = 'tertiary';
                if (isNotNil(value.qualityFlagId) && value.qualificationComments) {
                    this.badgeIcon = qualityFlagToIcon(value.qualityFlagId);
                    this.badgeColor = qualityFlagToColor(value.qualityFlagId);
                    this.badgeFill = 'clear';
                    this.badgeSize = 'medium';
                    this.title = value.qualificationComments;
                }
            }
            else {
                this.badgeIcon = 'checkmark';
                this.badgeColor = 'tertiary';
            }
        }
        else if (isNil(value.qualityFlagId) || value.qualityFlagId === QualityFlagIds.NOT_QUALIFIED) {
            this.badgeIcon = 'checkmark-circle';
            this.badgeColor = 'tertiary';
        }
        else {
            if (value.qualityFlagId === QualityFlagIds.BAD) {
                this.badgeIcon = 'alert-circle';
                this.badgeColor = 'danger';
                this.badgeFill = 'clear';
                this.badgeSize = 'medium';
            }
            else {
                this.badgeIcon = 'flag';
                this.badgeColor = qualityFlagToColor(value.qualityFlagId);
            }
        }
        // Abnormal operation
        if (value.abnormal) {
            this.badgeIcon = 'warning';
            this.badgeColor = 'tertiary';
            this.badgeFill = 'clear';
            this.badgeSize = 'small';
            this.title = this.translate.instant('TRIP.OPERATION.WARNING.ABNORMAL_PROGRESS', { comments: value.comments });
        }
        this.color = this.color || 'primary';
        this.cd.markForCheck();
    }
    reset(opts) {
        this.icon = null;
        this.matSvgIcon = null;
        this.color = null;
        this.badgeIcon = null;
        this.badgeFill = 'clear';
        this.badgeColor = null;
        this.badgeSize = 'small';
        this.title = null;
        if (!opts || opts.emitEvent !== false) {
            this.cd.markForCheck();
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Operation),
    __metadata("design:paramtypes", [Operation])
], OperationIconComponent.prototype, "value", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationIconComponent.prototype, "allowParentOperation", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OperationIconComponent.prototype, "showError", null);
OperationIconComponent = __decorate([
    Component({
        selector: 'app-operation-icon',
        templateUrl: 'operation-icon.component.html',
        styleUrls: ['./operation-icon.component.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [TranslateService,
        ChangeDetectorRef])
], OperationIconComponent);
export { OperationIconComponent };
//# sourceMappingURL=operation-icon.component.js.map