import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { AppErrorItem } from '@app/shared/error/error-item.component';
import { slideDownAnimation } from '@app/shared/material/material.animation';

@Component({
  selector: 'app-warning-item',
  templateUrl: './error-item.component.html',
  styleUrls: ['./error-item.component.scss'],
  animations: [slideDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IonicModule, TranslateModule],
})
export class AppWarningItem extends AppErrorItem {
  // eslint-disable-next-line @angular-eslint/no-input-rename
  @Input('class') classList: string;
  constructor() {
    super();
    this.icon = 'warning';
    this.defaultColor = 'tertiary';
  }

  ngOnInit() {
    super.ngOnInit();
  }
}
