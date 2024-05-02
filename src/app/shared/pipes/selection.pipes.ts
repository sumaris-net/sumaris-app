import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'isSelected',
  pure: false,
})
/**
 * Remove all HTML tags, from an input string
 */
export class IsSelectedPipe implements PipeTransform, OnDestroy {
  private _result: boolean = undefined;

  private _lastSelection: SelectionModel<any> | null = null;
  private _lastValue: any;
  private _onSelectionChanges: Subscription | undefined;
  constructor(private _ref: ChangeDetectorRef) {}

  transform<T = any>(selection: SelectionModel<T>, value: T): boolean {
    if (!selection) {
      this._dispose();
      return undefined;
    }

    // if we ask another time for the same form and opts, return the last value
    if (selection === this._lastSelection && value === this._lastValue) {
      return this._result;
    }

    // store the query, in case it changes
    this._lastSelection = selection;

    // store the params, in case they change
    this._lastValue = value;

    // set the result
    this._result = selection.isSelected(value);

    // if there is already a subscription, clean it
    this._dispose();

    // subscribe to valueChanges event
    this._onSelectionChanges = selection.changed.subscribe((selectionChange) => {
      if (!this._result && selectionChange.added?.includes(value)) {
        this._result = true;
        this._ref.markForCheck();
      } else if (this._result && selectionChange.removed?.includes(value)) {
        this._result = false;
        this._ref.markForCheck();
      }
    });

    return this._result;
  }

  ngOnDestroy(): void {
    this._dispose();
  }

  /**
   * Clean any existing subscription to change events
   */
  private _dispose(): void {
    this._onSelectionChanges?.unsubscribe();
    this._onSelectionChanges = undefined;
  }
}
