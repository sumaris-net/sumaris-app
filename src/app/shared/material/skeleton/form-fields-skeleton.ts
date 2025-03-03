import { ChangeDetectionStrategy, Component, Input, numberAttribute } from '@angular/core';

@Component({
  selector: 'mat-form-fields-skeleton',
  templateUrl: 'form-fields-skeleton.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatFormFieldsSkeleton {
  protected array: number[];

  @Input({ transform: numberAttribute }) count: number;
  @Input() width: string = '60%';
  @Input() placeholder: string;

  protected get countArray() {
    return Array(this.count || 1);
  }
}
