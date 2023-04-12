import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import {
  AppTable,
  changeCaseToUnderscore,
  Entity,
  EntityUtils,
  isNotEmptyArray,
  ReferentialRef, ReferentialUtils,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  StatusById,
  StatusList
} from '@sumaris-net/ngx-components';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { debounceTime, filter } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ReferentialFilter } from '../services/filter/referential.filter';
import { BehaviorSubject } from 'rxjs';
import { ReferentialI18nKeys } from '@app/referential/referential.utils';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';


@Component({
  selector: 'app-referential-ref-table',
  templateUrl: './referential-ref.table.html',
  styleUrls: ['./referential-ref.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReferentialRefTable<T extends Entity<T>, F extends ReferentialFilter> extends AppTable<T, F> {

  readonly statusList = StatusList;
  readonly statusById = StatusById;

  filterForm: UntypedFormGroup;
  $levels = new BehaviorSubject<ReferentialRef[]>(undefined);
  i18nLevelName: string;

  @Input() showFilter = true;
  @Input() showLevelFilter = true;
  @Input() showToolbar = false;
  @Input() showPaginator = true;

  @Input() set entityName(entityName: string) {
    this.setFilter({
      ...this.filter,
      entityName
    });
  }

  get entityName(): string {
    return this.filter?.entityName;
  }

  constructor(
    injector: Injector,
    formBuilder: UntypedFormBuilder,
    protected referentialRefService: ReferentialRefService,
    protected cd: ChangeDetectorRef,
  ) {
    super(injector,
      // columns
      RESERVED_START_COLUMNS
        .concat([
          'label',
          'name',
          'description',
          'status',
          'comments'])
        .concat(RESERVED_END_COLUMNS));

    this.i18nColumnPrefix = 'REFERENTIAL.';
    this.inlineEdition = false;
    this.autoLoad = false; // waiting dataSource to be set

    this.filterForm = formBuilder.group({
      searchText: [null],
      level: [null],
      statusId: [null]
    });

    // Update filter when changes
    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(250),
          filter(() => this.filterForm.valid)
        )
        // Applying the filter
        .subscribe((json) => {
          // Copy previous filter
          const baseFilter = Object.assign({}, this.filter);

          // Override levelId/levelIds, if user choose a level
          if (ReferentialUtils.isNotEmpty(json.level)) {
            json.levelIds = [json.level.id];
            baseFilter.levelIds = null;
            baseFilter.levelId = null;
          }

          this.setFilter({
              ...baseFilter, // Keep previous filter
              ...json},
            {emitEvent: this.mobile || !this.showToolbar})
        })
    );

    this.debug = !environment.production;

  }

  async ngOnInit() {
    super.ngOnInit();

    // Level autocomplete
    this.registerAutocompleteField('level', {
      items: this.$levels,
      showAllOnFocus: true,
      mobile: this.mobile
    });

    // Load levels
    await this.loadLevels(this.entityName);
  }

  clearControlValue(event: Event, formControl: AbstractControl): boolean {
    if (event) event.stopPropagation(); // Avoid to enter input the field
    formControl.setValue(null);
    return false;
  }

  /* -- protected methods -- */

  protected async loadLevels(entityName: string): Promise<ReferentialRef[]> {
    let levels = await this.referentialRefService.loadLevels(entityName);

    // Filter with input levelIds, if any
    const filter = this.filter;
    if (levels && isNotEmptyArray(filter?.levelIds)) {
      levels = levels.filter(l => filter.levelIds.includes(l.id));
    }

    // Sort by label
    if (levels) levels.sort(EntityUtils.sortComparator('label', 'asc'));

    this.$levels.next(levels);

    if (isNotEmptyArray(levels)) {
      const typeName = levels[0].entityName;
      const i18nLevelName = "REFERENTIAL.ENTITY." + changeCaseToUnderscore(typeName).toUpperCase();
      const levelName = this.translate.instant(i18nLevelName);
      this.i18nLevelName = (levelName !== i18nLevelName) ? levelName : ReferentialI18nKeys.DEFAULT_I18N_LEVEL_NAME;
    }
    else {
      this.i18nLevelName = ReferentialI18nKeys.DEFAULT_I18N_LEVEL_NAME;
    }

    this.showLevelFilter = this.showLevelFilter && isNotEmptyArray(levels);

    return levels;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}

