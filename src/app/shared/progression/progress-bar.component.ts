import { ProgressionModel } from '@app/shared/progression/progression.model';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { toBoolean } from '@sumaris-net/ngx-components';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppProgressBarComponent implements OnInit {
  @Input() progression: ProgressionModel;
  @Input() cancellable: boolean;
  @Output() cancel = new EventEmitter<Event>();

  constructor() {}

  ngOnInit() {
    this.progression = this.progression || new ProgressionModel();
    this.cancellable = toBoolean(this.cancellable, this.cancel.observed);
  }

  protected cancelClick(event: Event) {
    this.progression.cancel();
    this.cancel.emit(event);
  }
}
