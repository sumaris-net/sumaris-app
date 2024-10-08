import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { AppTable, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, StatusById, StatusList } from '@sumaris-net/ngx-components';
import { debounceTime, filter } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { Pmfm } from '../../services/model/pmfm.model';
import { PmfmFilter } from '@app/referential/services/filter/pmfm.filter';

@Component({
  selector: 'app-pmfms-table',
  templateUrl: './pmfms.table.html',
  styleUrls: ['./pmfms.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PmfmsTable extends AppTable<Pmfm, PmfmFilter> {
  filterForm: UntypedFormGroup;

  readonly statusList = StatusList;
  readonly statusById = StatusById;

  @Input() showToolbar = false;
  @Input() showFilter = true;
  @Input() allowMultipleSelection = true;
  @Input() showPaginator = true;
  @Input() sticky = true;

  constructor(formBuilder: UntypedFormBuilder) {
    super(
      // columns
      RESERVED_START_COLUMNS.concat(['name', 'unit', 'matrix', 'fraction', 'method', 'status']).concat(RESERVED_END_COLUMNS)
    );

    this.i18nColumnPrefix = 'REFERENTIAL.';
    this.inlineEdition = false;
    this.autoLoad = false; // waiting dataSource to be set

    this.filterForm = formBuilder.group({
      searchText: [null],
    });

    // Update filter when changes
    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(250),
          filter(() => this.filterForm.valid)
        )
        // Applying the filter
        .subscribe((json) =>
          this.setFilter(
            {
              ...this.filter, // Keep previous filter
              ...json,
            },
            { emitEvent: this.mobile }
          )
        )
    );

    this.debug = !environment.production;
  }

  clearControlValue(event: Event, formControl: AbstractControl): boolean {
    if (event) event.stopPropagation(); // Avoid to enter input the field
    formControl.setValue(null);
    return false;
  }
}
