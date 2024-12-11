import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { EntityQualityIconComponent } from '@app/data/quality/entity-quality-icon.component';

@Component({
  selector: 'app-entity-quality-badge',
  templateUrl: './entity-quality-badge.component.html',
  styleUrls: ['./entity-quality-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityQualityBadgeComponent extends EntityQualityIconComponent {
  @Input() size: 'small' | 'normal' = 'normal';
}
