import { ProgressionModel } from '@app/shared/progression/progression.model';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppProgressBarComponent implements OnInit{

  @Input() progression: ProgressionModel;
  @Input() cancellable = false;

  constructor() {
  }

  ngOnInit() {
    this.progression = this.progression || new ProgressionModel();
  }
}
