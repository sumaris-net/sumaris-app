import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { IRootDataEntity } from '@app/data/services/model/root-data-entity.model';
import { EntityUtils } from '@sumaris-net/ngx-components';
import { PredefinedColors } from '@ionic/core';
import { qualityFlagToColor, QualityIonIcon } from '@app/data/services/model/model.utils';
import { IDataEntity } from '@app/data/services/model/data-entity.model';

export declare type SynchronizationIonIcon = 'time-outline'|'hourglass-outline'|'pencil';

@Component({
  selector: 'app-entity-quality-icon',
  template: '<div [title]="title|translate"><ion-icon [color]="color" [name]="icon" slot="icon-only" style="pointer-events: none;"></ion-icon></div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityQualityIconComponent {

  icon: QualityIonIcon;
  color: PredefinedColors;
  title: string;

  @Input() set value(value: IDataEntity | IRootDataEntity) {
    this.setValue(value);
  }

  get value(): IDataEntity | IRootDataEntity {
    return this._value;
  }

  private _value: IDataEntity | IRootDataEntity;

  constructor(private cd: ChangeDetectorRef) {
  }

  setValue(value: IDataEntity | IRootDataEntity) {
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
      } else if (!value['validationDate']) {
        this.icon = 'checkmark';
        this.title = 'QUALITY.CONTROLLED';
        this.color = 'tertiary';
      } else if (!value.qualificationDate) {
        this.icon = 'checkmark-circle';
        this.title = 'QUALITY.VALIDATED';
        this.color = 'tertiary';
      } else {
        this.icon = 'flag';
        this.title = 'QUALITY.QUALIFIED';
        this.color = qualityFlagToColor(value.qualityFlagId);
      }
    }
    this.cd.markForCheck();
  }
}
