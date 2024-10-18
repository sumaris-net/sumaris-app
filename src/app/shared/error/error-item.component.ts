import { booleanAttribute, ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SharedPipesModule, slideUpDownAnimation } from '@sumaris-net/ngx-components';
import { AppColors } from '@app/shared/colors.utils';
import { IonicModule } from '@ionic/angular';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-error-item',
  templateUrl: './error-item.component.html',
  styleUrls: ['./error-item.component.scss'],
  animations: [slideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IonicModule, NgIf, TranslateModule, SharedPipesModule],
})
export class AppErrorItem {
  @Input() message: string;
  @Input() icon = 'alert-circle';
  @Input() backgroundColor: AppColors = 'transparent';
  @Input() color: AppColors = 'danger';
  @Input({ transform: booleanAttribute }) animated = true;
  // eslint-disable-next-line @angular-eslint/no-input-rename
  @Input('class') classList: string;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  constructor() {}
}
