import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { slideUpDownAnimation } from '@sumaris-net/ngx-components';
import { IonicModule } from '@ionic/angular';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AppErrorItem } from '@app/shared/error/error-item.component';

@Component({
  selector: 'app-warning-item',
  templateUrl: './error-item.component.html',
  styleUrls: ['./error-item.component.scss'],
  animations: [slideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IonicModule, NgIf, TranslateModule],
})
export class AppWarningItem extends AppErrorItem {
  // eslint-disable-next-line @angular-eslint/no-input-rename
  @Input('class') classList: string;
  constructor() {
    super();
    // Set defaults
    this.color = 'tertiary';
    this.icon = 'warning';
  }
}
