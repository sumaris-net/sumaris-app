import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'mat-form-fields-skeleton',
  templateUrl: 'form-fields-skeleton.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatFormFieldsSkeleton {
  protected array: number[];

  @Input() count: number;
  @Input() width: string = '60%';

  protected get countArray() {
    return Array(this.count || 1);
  }
}
