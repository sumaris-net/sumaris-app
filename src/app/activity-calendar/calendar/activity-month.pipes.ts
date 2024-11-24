import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';
import { AsyncTableElement } from '@e-is/ngx-material-table';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { equals, FormErrorTranslateOptions, FormErrorTranslator, isNilOrBlank } from '@sumaris-net/ngx-components';

@Pipe({
  name: 'activityMonthRowError',
  pure: false,
})
export class ActivityMonthRowErrorPipe implements PipeTransform, OnDestroy {
  private _value = '';
  private _lastRow: AsyncTableElement<ActivityMonth> | null = null;
  private _lastOptions: FormErrorTranslateOptions | null = null;
  private _onFormValueChanges: Subscription | undefined;

  constructor(
    private service: FormErrorTranslator,
    private _ref: ChangeDetectorRef
  ) {}

  transform(row: AsyncTableElement<ActivityMonth>, opts?: FormErrorTranslateOptions): string {
    if (!row) {
      this._dispose();
      return '';
    }

    // if we ask another time for the same form and opts, return the last value
    if (row === this._lastRow && equals(opts, this._lastOptions)) {
      return this._value;
    }

    // store the query, in case it changes
    this._lastRow = row;

    // store the params, in case they change
    this._lastOptions = opts;

    // set the value
    this._updateValue(row, opts);

    // if there is a subscription to onLangChange, clean it
    this._dispose();

    // subscribe to onTranslationChange event, in case the translations change
    if (!this._onFormValueChanges && row.validator) {
      this._onFormValueChanges = row.validator.valueChanges.subscribe((val) => {
        this._updateValue(row, opts);
      });
    }

    return this._value;
  }

  ngOnDestroy(): void {
    this._dispose();
  }

  private _updateValue(row: AsyncTableElement<ActivityMonth>, opts?: FormErrorTranslateOptions) {
    let newValue: string = row.currentData.qualificationComments;
    if (isNilOrBlank(newValue) && row.validator?.invalid) {
      newValue = this.service.translateFormErrors(row.validator, opts);
    } else {
      newValue = undefined;
    }
    if (newValue !== this._value) {
      this._value = newValue;
      this._ref.markForCheck();
    }
  }

  /**
   * Clean any existing subscription to change events
   */
  private _dispose(): void {
    this._onFormValueChanges?.unsubscribe();
    this._onFormValueChanges = undefined;
  }
}
