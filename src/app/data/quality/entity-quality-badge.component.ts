import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EntityQualityIconComponent } from '@app/data/quality/entity-quality-icon.component';

@Component({
  selector: 'app-entity-quality-badge',
  template:
    '<ion-badge [color]="color"><ion-icon [name]="icon" slot="icon-only" style="pointer-events: none;"></ion-icon>{{title|translate}}</ion-badge>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityQualityBadgeComponent extends EntityQualityIconComponent {}
