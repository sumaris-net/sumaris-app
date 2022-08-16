import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewEncapsulation } from '@angular/core';
import { isNil, isNotNil, MatBadgeFill } from '@sumaris-net/ngx-components';
import { qualityFlagToColor, qualityFlagToIcon, QualityIonIcon } from '@app/data/services/model/model.utils';
import { Operation } from '@app/trip/services/model/trip.model';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import { AppColors } from '@app/shared/colors.utils';
import { MatBadgeSize } from '@angular/material/badge';

export declare type OperationMatSvgIcons = 'down-arrow' | 'rollback-arrow';
export declare type OperationIonIcon = 'navigate';

@Component({
  selector: 'app-operation-icon',
  templateUrl: 'operation-icon.component.html',
  styleUrls: ['./operation-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class OperationIconComponent {

  icon: OperationIonIcon = null;
  matSvgIcon: OperationMatSvgIcons = null;
  color: AppColors = null;
  badgeIcon: QualityIonIcon = null;
  badgeColor: AppColors = null;
  badgeFill: MatBadgeFill = 'clear';
  badgeSize: MatBadgeSize = 'small'
  title: string = null;

  @Input() set value(value: Operation) {
    this.setValue(value);
  }

  get value(): Operation {
    return this._value;
  }

  @Input() set allowParentOperation(value: boolean) {
    if (this._allowParentOperation !== value) {
      this._allowParentOperation = value;
      if (this._value) this.setValue(this._value); // Recompute
    }
  }

  get allowParentOperation(): boolean {
    return this._allowParentOperation;
  }

  @Input() set showError(value: boolean) {
    if (this._showError !== value) {
      this._showError = value;
      if (this._value) this.setValue(this._value); // Recompute
    }
  }

  get showError(): boolean {
    return this._showError;
  }

  private _value: Operation;
  private _allowParentOperation: boolean;
  private _showError = false;

  constructor(private cd: ChangeDetectorRef) {
  }

  setValue(value: Operation) {
    if (!value) {
      this.reset();
      return;
    }

    // DEBUG
    //console.debug('[operation-icon] Computing icon for operation #' + value.id);

    this.reset({emitEvent: false});
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
      } else {
        this.badgeIcon = this.badgeIcon || undefined;
      }
    }
    // Controlled, not qualified
    else if (isNil(value.qualificationDate)) {
      if (this.icon == 'navigate') {
        this.icon = 'checkmark' as OperationIonIcon;
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
    this.color = this.color || 'primary';
    this.cd.markForCheck();
  }

  private reset(opts?: {emitEvent: boolean}) {
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
}
