import { ChangeDetectionStrategy, Component, Input } from '@angular/core';


@Component({
  selector: 'mat-form-fields-skeleton',
  templateUrl: 'form-fields-skeleton.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatFormFieldsSkeleton {
  @Input() count: string;
}
