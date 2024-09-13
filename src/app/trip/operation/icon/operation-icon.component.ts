import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { isNil, isNotNil, MatBadgeFill } from '@sumaris-net/ngx-components';
import { qualityFlagToColor, qualityFlagToIcon, QualityIonIcon } from '@app/data/services/model/model.utils';
import { Operation } from '@app/trip/trip/trip.model';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import { AppColors } from '@app/shared/colors.utils';
import { MatBadgeSize } from '@angular/material/badge';
import { TranslateService } from '@ngx-translate/core';

export declare type OperationMatSvgIcons = 'operation-child' | 'operation-parent';
export declare type OperationIonIcon = 'navigate';

@Component({
  selector: 'app-operation-icon',
  templateUrl: 'operation-icon.component.html',
  styleUrls: ['./operation-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationIconComponent {
  icon: OperationIonIcon = null;
  matSvgIcon: OperationMatSvgIcons = null;
  color: AppColors = null;
  badgeIcon: QualityIonIcon = null;
  badgeColor: AppColors = null;
  badgeFill: MatBadgeFill = 'clear';
  badgeSize: MatBadgeSize = 'small';
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

  constructor(
    private translate: TranslateService,
    private cd: ChangeDetectorRef
  ) {}

  protected setValue(value: Operation) {
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
      this.matSvgIcon = 'operation-child';
      this.icon = null;
    }
    // Is parent, and has a child
    else if (isNotNil(value.childOperationId) || value.qualityFlagId === QualityFlagIds.NOT_COMPLETED || this.allowParentOperation) {
      this.matSvgIcon = 'operation-parent';
      this.icon = null;
      this.badgeIcon = isNil(value.childOperationId) ? 'time-outline' : null;
      this.badgeColor = (this.badgeIcon && 'accent') || null;
    }
    // Other
    else {
      this.icon = 'navigate';
      this.matSvgIcon = null;
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
        this.badgeIcon = this.badgeIcon || null;
      }
    }
    // Controlled, not qualified
    else if (isNil(value.qualificationDate)) {
      if (this.icon === 'navigate') {
        this.icon = 'checkmark' as OperationIonIcon;
        this.color = 'tertiary';
        if (isNotNil(value.qualityFlagId) && value.qualificationComments) {
          this.badgeIcon = qualityFlagToIcon(value.qualityFlagId);
          this.badgeColor = qualityFlagToColor(value.qualityFlagId);
          this.badgeFill = 'clear';
          this.badgeSize = 'medium';
          this.title = value.qualificationComments;
        }
      } else {
        this.badgeIcon = 'checkmark';
        this.badgeColor = 'tertiary';
      }
    } else if (isNil(value.qualityFlagId) || value.qualityFlagId === QualityFlagIds.NOT_QUALIFIED) {
      this.badgeIcon = 'checkmark-circle';
      this.badgeColor = 'tertiary';
    } else {
      if (value.qualityFlagId === QualityFlagIds.BAD) {
        this.badgeIcon = 'alert-circle';
        this.badgeColor = 'danger';
        this.badgeFill = 'clear';
        this.badgeSize = 'medium';
      } else {
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

  private reset(opts?: { emitEvent: boolean }) {
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
