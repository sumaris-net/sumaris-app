import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Injector, Input, OnInit, Output } from '@angular/core';
import {
  AppFormUtils,
  AppInMemoryTable,
  changeCaseToUnderscore,
  EntitiesTableDataSourceConfig,
  EntityUtils,
  firstNotNilPromise,
  FormFieldDefinition,
  FormFieldDefinitionMap,
  InMemoryEntitiesService,
  IReferentialRef,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  ReferentialUtils,
  removeDuplicatesFromArray,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { TableElement } from '@e-is/ngx-material-table';
import { environment } from '@environments/environment';
import { PmfmStrategyValidatorService } from '../services/validator/pmfm-strategy.validator';
import { ReferentialRefService } from '../services/referential-ref.service';
import { merge, Observable, of } from 'rxjs';
import { PmfmService } from '../services/pmfm.service';
import { Pmfm } from '../services/model/pmfm.model';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, startWith, takeUntil } from 'rxjs/operators';
import { PmfmStrategy } from '../services/model/pmfm-strategy.model';
import { PmfmValue, PmfmValueUtils } from '../services/model/pmfm-value.model';
import { PmfmStrategyFilter } from '@app/referential/services/filter/pmfm-strategy.filter';
import { PmfmFilter } from '@app/referential/services/filter/pmfm.filter';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';

export interface PmfmStrategiesTableState {
  acquisitionLevels: IReferentialRef[];
  qualitativeValues: IReferentialRef[];
  showPmfmLabel: boolean;
}

@Component({
  selector: 'app-pmfm-strategies-table',
  templateUrl: './pmfm-strategies.table.html',
  styleUrls: ['./pmfm-strategies.table.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PmfmStrategiesTable extends AppInMemoryTable<PmfmStrategy, PmfmStrategyFilter> implements OnInit {
  @RxStateRegister() protected readonly _state: RxState<PmfmStrategiesTableState> = inject(RxState, { self: true });

  @RxStateSelect() protected readonly acquisitionLevels$: Observable<IReferentialRef[]>;
  @RxStateSelect() protected readonly showPmfmLabel$: Observable<boolean>;

  protected fieldDefinitions: FormFieldDefinitionMap = {};
  protected columnDefinitions: FormFieldDefinition[] = [];
  filterCriteriaCount = 0;

  @RxStateProperty() acquisitionLevels: IReferentialRef[];

  @Input() showToolbar = true;
  @Input() showPaginator = true;
  @Input() showHeaderRow = true;
  @Input() withDetails = true;
  @Input() pmfmFilter: PmfmFilter;
  @Input() @RxStateProperty() showPmfmLabel = true;
  @Input() allowEmpty = false;
  @Input() canEdit = false;
  @Input() sticky = false;

  @Input() set showDetailsColumns(value: boolean) {
    // Set details columns visibility
    this.setShowColumn('acquisitionLevel', value);
    this.setShowColumn('rankOrder', value);
    this.setShowColumn('isMandatory', value);
    this.setShowColumn('acquisitionNumber', value);
    this.setShowColumn('minValue', value);
    this.setShowColumn('maxValue', value);
    this.setShowColumn('defaultValue', value);

    // Inverse visibility of the parameter columns
    this.setShowColumn('parameter', !value);
  }

  @Input()
  set showIdColumn(value: boolean) {
    this.setShowColumn('id', value);
  }

  get showIdColumn(): boolean {
    return this.getShowColumn('id');
  }

  @Input()
  set showSelectColumn(value: boolean) {
    this.setShowColumn('select', value);
  }

  get showSelectColumn(): boolean {
    return this.getShowColumn('select');
  }

  @Input() title: string;

  @Output() get selectionChanges(): Observable<TableElement<PmfmStrategy>[]> {
    return this.selection.changed.pipe(map((_) => this.selection.selected));
  }

  get loading$(): Observable<boolean> {
    return merge(
      this.loadingSubject,
      this.acquisitionLevels$.pipe(
        startWith(true),
        filter(isNotNil),
        map((_) => false)
      )
    ).pipe(distinctUntilChanged());
  }

  get filterIsEmpty(): boolean {
    return this.filterCriteriaCount === 0;
  }

  constructor(
    protected injector: Injector,
    protected validatorService: PmfmStrategyValidatorService,
    protected pmfmService: PmfmService,
    protected referentialRefService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      // columns
      RESERVED_START_COLUMNS.concat([
        'acquisitionLevel',
        'rankOrder',
        'pmfm',
        'parameter',
        'isMandatory',
        'acquisitionNumber',
        'minValue',
        'maxValue',
        'defaultValue',
        'conditions',
      ]).concat(RESERVED_END_COLUMNS),
      PmfmStrategy,
      new InMemoryEntitiesService(PmfmStrategy, PmfmStrategyFilter, {
        onLoad: (data) => this.onLoadData(data),
        equals: PmfmStrategy.equals,
      }),
      validatorService,
      <EntitiesTableDataSourceConfig<PmfmStrategy>>{
        prependNewElements: false,
        suppressErrors: true,
        onRowCreated: (row) => this.onRowCreated(row),
      },
      new PmfmStrategyFilter()
    );

    this.i18nColumnPrefix = 'PROGRAM.STRATEGY.PMFM_STRATEGY.';
    this.inlineEdition = true;
    this.defaultSortBy = 'id';
    this.defaultSortDirection = 'asc';
    this.saveBeforeDelete = true;
    this.saveBeforeSort = true;
    this.saveBeforeFilter = true;

    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    this.validatorService.withDetails = this.withDetails;

    // Load acquisition levels
    this._state.connect('acquisitionLevels', this.watchAcquisitionLevels());

    // Load default qualitative value
    this._state.connect('qualitativeValues', this.watchQualitativeValues());

    // Acquisition level
    this.registerColumnDefinition({
      key: 'acquisitionLevel',
      type: 'entity',
      required: true,
      autocomplete: this.registerAutocompleteField('acquisitionLevel', {
        items: this.acquisitionLevels$,
        attributes: ['name'],
        showAllOnFocus: true,
        class: 'mat-autocomplete-panel-large-size',
      }),
    });

    // Rank order
    this.registerColumnDefinition({
      key: 'rankOrder',
      type: 'integer',
      minValue: 1,
      defaultValue: 1,
      required: true,
    });

    // Pmfm
    this.registerPmfmColumnDefinition(this.showPmfmLabel);
    this._state.hold(this.showPmfmLabel$, (showPmfmLabel) => this.registerPmfmColumnDefinition(showPmfmLabel));

    // PMFM.PARAMETER
    const pmfmParameterAttributes = ['label', 'name'];
    this.registerColumnDefinition({
      key: 'parameter',
      type: 'entity',
      required: false,
      autocomplete: this.registerAutocompleteField('parameter', {
        suggestFn: (value, opts) => this.suggestParameters(value, opts),
        attributes: pmfmParameterAttributes,
        columnSizes: [4, 8],
        columnNames: ['REFERENTIAL.PARAMETER.CODE', 'REFERENTIAL.PARAMETER.NAME'],
        showAllOnFocus: false,
        class: 'mat-autocomplete-panel-large-size',
      }),
    });

    // Is mandatory
    this.registerColumnDefinition({
      key: 'isMandatory',
      type: 'boolean',
      defaultValue: false,
      required: true,
    });

    // Acquisition number
    this.registerColumnDefinition({
      key: 'acquisitionNumber',
      type: 'integer',
      minValue: 0,
      defaultValue: 1,
      required: true,
    });

    // Min / Max
    this.registerColumnDefinition({
      key: 'minValue',
      type: 'double',
      required: false,
    });
    this.registerColumnDefinition({
      key: 'maxValue',
      type: 'double',
      required: false,
    });

    // Register default value definition
    this.registerFieldDefinition({
      key: 'defaultValue',
      type: 'double',
      required: false,
    });
    const qvAttributes = this.settings.getFieldDisplayAttributes('qualitativeValue', ['label', 'name']);
    this.registerFieldDefinition({
      key: 'defaultQualitativeValue',
      type: 'entity',
      autocomplete: {
        attributes: qvAttributes,
        items: this._state.select('qualitativeValues'),
        showAllOnFocus: true,
        class: 'mat-autocomplete-panel-large-size',
      },
      required: false,
    });
  }

  protected registerPmfmColumnDefinition(showPmfmLabel: boolean) {
    console.log('TODO register pmfm column definition', showPmfmLabel);

    const basePmfmAttributes = this.settings.getFieldDisplayAttributes('pmfm', ['label', 'name']);
    const pmfmAttributes = basePmfmAttributes
      .map((attr) => (attr === 'label' && !showPmfmLabel ? 'parameter.label' : attr === 'name' ? 'parameter.name' : attr))
      .concat(['unit.label', 'matrix.name', 'fraction.name', 'method.name']);
    const pmfmColumnNames = basePmfmAttributes
      .map((attr) => 'REFERENTIAL.' + attr.toUpperCase())
      .concat(['REFERENTIAL.PMFM.UNIT', 'REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD']);
    this.registerColumnDefinition({
      key: 'pmfm',
      type: 'entity',
      required: false,
      autocomplete: this.registerAutocompleteField('pmfm', {
        suggestFn: (value, opts) => this.suggestPmfms(value, opts),
        attributes: pmfmAttributes,
        columnSizes: pmfmAttributes.map((attr) => {
          switch (attr) {
            case 'label':
              return 2;
            case 'name':
              return 3;
            case 'unit.label':
              return 1;
            case 'method.name':
              return 4;
            default:
              return undefined;
          }
        }),
        columnNames: pmfmColumnNames,
        displayWith: (pmfm) => this.displayPmfm(pmfm, { withUnit: true, withDetails: true }),
        showAllOnFocus: false,
        class: 'mat-mdc-autocomplete-panel-full-size',
      }),
    });
  }

  protected getDisplayColumns(): string[] {
    let userColumns = this.getUserColumns();

    // No user override: use defaults
    if (!userColumns) {
      userColumns = this.columns;
    }

    // Get fixed start columns
    const fixedStartColumns = this.columns.filter((c) => RESERVED_START_COLUMNS.includes(c));

    // Remove end columns
    const fixedEndColumns = this.columns.filter((c) => RESERVED_END_COLUMNS.includes(c));

    // Remove fixed columns from user columns
    userColumns = userColumns.filter((c) => !fixedStartColumns.includes(c) && !fixedEndColumns.includes(c) && this.columns.includes(c));

    return (
      fixedStartColumns
        .concat(userColumns)
        .concat(fixedEndColumns)
        // Remove columns to hide
        .filter((column) => !this.excludesColumns.includes(column))
    );
  }

  protected editRow(event: Event | undefined, row: TableElement<PmfmStrategy>, opts?: { focusColumn?: string }): boolean {
    return super.editRow(event, row, opts);
  }

  setFilter(source: Partial<PmfmStrategyFilter>, opts?: { emitEvent: boolean }) {
    const target = new PmfmStrategyFilter();
    Object.assign(target, source);

    // Update criteria count
    const criteriaCount = target.countNotEmptyCriteria();
    if (criteriaCount !== this.filterCriteriaCount) {
      this.filterCriteriaCount = criteriaCount;
      this.markForCheck();
    }

    super.setFilter(target, opts);
  }

  protected async onLoadData(sources: PmfmStrategy[]): Promise<PmfmStrategy[]> {
    // Wait acquisition levels to be loaded
    const acquisitionLevels = await firstNotNilPromise(this.acquisitionLevels$);

    // Add at least one item
    if (!this.allowEmpty && isEmptyArray(sources)) {
      console.debug('[pmfm-strategy-table] Force add empty PmfmSTrategy, because allowEmpty=false');
      sources = [new PmfmStrategy()];
    }

    console.debug('[pmfm-strategy-table] Adapt loaded data to table...');
    return sources.map((source) => {
      const target = PmfmStrategy.fromObject(source);

      // Convert acquisition level, from string to entity
      if (typeof target.acquisitionLevel === 'string') {
        target.acquisitionLevel = acquisitionLevels.find((i) => i.label === target.acquisitionLevel);
      }

      if (isNotNil(target.defaultValue) && target.pmfm) {
        target.defaultValue = target.pmfm && (PmfmValueUtils.fromModelValue(target.defaultValue, target.pmfm) as PmfmValue);
        console.debug('[pmfm-strategy-table] Received default value: ', target.defaultValue);
      } else {
        target.defaultValue = null;
      }

      return target;
    });
  }

  protected async onRowCreated(row: TableElement<PmfmStrategy>): Promise<void> {
    // Creating default values, from the current filter
    const filter = this.filter;
    const acquisitionLevelLabel = filter && filter.acquisitionLevel;
    const acquisitionLevel = acquisitionLevelLabel && (this.acquisitionLevels || []).find((item) => item.label === acquisitionLevelLabel);
    const gearIds = filter && filter.gearIds;
    const taxonGroupIds = filter && filter.taxonGroupIds;
    const referenceTaxonIds = filter && filter.referenceTaxonIds;

    let rankOrder: number = null;
    if (acquisitionLevel) {
      rankOrder = ((await this.getMaxRankOrder(acquisitionLevel)) || 0) + 1;
    }
    const defaultValues = {
      acquisitionLevel,
      rankOrder,
      gearIds,
      taxonGroupIds,
      referenceTaxonIds,
    };

    // Applying defaults
    if (row.validator) {
      row.validator.patchValue(defaultValues);
    } else {
      Object.assign(row.currentData, defaultValues);
    }
  }

  protected async getMaxRankOrder(acquisitionLevel: IReferentialRef): Promise<number> {
    const rows = this.dataSource.getRows();
    return rows
      .map((row) => row.currentData)
      .filter((data) => ReferentialUtils.equals(data.acquisitionLevel, acquisitionLevel))
      .reduce((res, data) => Math.max(res, data.rankOrder || 0), 0);
  }

  protected registerColumnDefinition(def: Partial<FormFieldDefinition> & { key: string }) {
    const definition = <FormFieldDefinition>{
      label: this.i18nColumnPrefix + changeCaseToUnderscore(def.key).toUpperCase(),
      ...def,
    };
    const index = this.columnDefinitions.findIndex((c) => c.key === def.key);
    if (index === -1) this.columnDefinitions.push(definition);
    else {
      this.columnDefinitions[index] = definition;
      this.markForCheck();
    }
  }

  protected registerFieldDefinition(def: Partial<FormFieldDefinition> & { key: string }) {
    const definition = <FormFieldDefinition>{
      label: this.i18nColumnPrefix + changeCaseToUnderscore(def.key).toUpperCase(),
      ...def,
    };
    this.fieldDefinitions[def.key] = definition;
  }

  protected watchAcquisitionLevels(): Observable<IReferentialRef[]> {
    return this.referentialRefService
      .watchAll(
        0,
        100,
        null,
        null,
        {
          entityName: 'AcquisitionLevel',
        },
        { withTotal: false }
      )
      .pipe(map((res) => res?.data || []));
  }

  protected watchQualitativeValues(): Observable<IReferentialRef[]> {
    return this.onStartEditingRow.pipe(
      // DEBUG
      //tap(row => console.debug('DEV - Starting editing row', row.currentData)),
      debounceTime(200),
      mergeMap((row) => {
        const control = row.validator?.get('pmfm');
        if (control) {
          return control.valueChanges.pipe(startWith<any>(control.value), takeUntil(this.onStartEditingRow));
        } else {
          return of(row.currentData.pmfm);
        }
      }),
      map((pmfm) => pmfm?.id),
      filter(isNotNil),

      //tap(pmfmId => console.debug("TODO current pmdm id=", pmfmId)),
      //distinctUntilChanged(),
      //debounceTime(200),
      mergeMap((pmfmId) => this.pmfmService.load(pmfmId)),
      map(
        (pmfm) => ((isNotEmptyArray(pmfm.qualitativeValues) ? pmfm.qualitativeValues : pmfm.parameter?.qualitativeValues) || []) as IReferentialRef[]
      ),
      filter(isNotEmptyArray)

      // DEBUG
      //,tap(items => console.debug("TODO Check Pmfm QV", items))
    );
  }

  async resetRow(event: Event, row: TableElement<PmfmStrategy>): Promise<boolean> {
    if (event?.defaultPrevented) return false;

    console.debug('[pmfm-strategies-table] Resetting row');
    if (event) event.preventDefault(); // Avoid clickRow to be executed

    AppFormUtils.copyEntity2Form({}, row.validator);
    row.validator.markAsUntouched();
    row.validator.markAsPristine();
    row.validator.disable();
    this.editedRow = undefined;

    return true;
  }

  get valueChanges(): Observable<any[]> {
    return merge(
      this.dataSource.connect(null),
      this.onStartEditingRow.pipe(
        filter((row) => !!row.validator),
        mergeMap((row) =>
          row.validator.valueChanges.pipe(
            //debounceTime(250),
            map((_) => this.dataSource.getRows()),
            map((rows) => rows.map((r) => (r.id === row.id ? row : r)))
          )
        )
      )
    ).pipe(map((rows) => (rows || []).map((r) => r.currentData)));
  }

  protected async duplicateSelection(event: UIEvent) {
    if (this.selection.isEmpty()) return; // Skip if empty
    if (!this.confirmEditCreate()) return; // Stop if cannot confirm previous row

    try {
      const rows = this.selection.selected
        // Sort by ID desc (need to insertAt)
        .sort((r1, r2) => (r1.id > r2.id ? -1 : 1));
      console.debug(`[pmfm-strategy-table] Duplicating ${rows.length} rows...`);
      for (const sourceRow of rows) {
        const source = PmfmStrategy.fromObject(sourceRow.currentData);
        const target = source.clone();
        EntityUtils.cleanIdAndUpdateDate(target);
        const targetRow = await this.addRowToTable(sourceRow.id + 1, { editing: false });
        if (!targetRow) break;

        targetRow.validator.patchValue(target);

        if (!this.confirmEditCreate(null, targetRow)) break;
        this.selection.deselect(sourceRow);
      }
    } finally {
      this.markAsDirty();
    }
  }

  /* -- protected functions -- */

  protected async suggestPmfms(value: any, opts?: any): Promise<LoadResult<Pmfm>> {
    return this.pmfmService.suggest(value, {
      searchJoin: 'parameter',
      //searchAttribute: !this.showPmfmLabel ? 'name' : undefined /*label + name*/,
      ...this.pmfmFilter,
    });
  }

  protected async suggestParameters(value: any, opts?: any): Promise<IReferentialRef[] | LoadResult<IReferentialRef>> {
    if (this.pmfmFilter) {
      const { data } = await this.pmfmService.suggest(value, {
        searchJoin: 'parameter',
        ...this.pmfmFilter,
      });
      const pmfmParameters = data.map((p) => p.parameter).filter(isNotNil);
      return removeDuplicatesFromArray(pmfmParameters, 'label');
    } else {
      return await this.referentialRefService.suggest(value, {
        ...opts,
        entityName: 'Parameter',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      });
    }
  }

  /**
   * Compute a PMFM.NAME, with the last part of the name
   *
   * @param pmfm
   * @param opts
   */
  protected displayPmfm(
    pmfm: Pmfm,
    opts?: {
      withUnit?: boolean;
      html?: boolean;
      withDetails?: boolean;
    }
  ): string {
    if (!pmfm) return undefined;

    let name = pmfm.parameter?.name;
    if (opts?.withDetails) {
      name = [name, pmfm.matrix?.name, pmfm.fraction?.name, pmfm.method?.name].filter(isNotNil).join(' - ');
    }

    // Append unit
    const unitLabel = (pmfm.type === 'integer' || pmfm.type === 'double') && pmfm.unit?.label;
    if ((!opts || opts.withUnit !== false) && unitLabel) {
      if (opts?.html) {
        name += `<small><br/>(${unitLabel})</small>`;
      } else {
        name += ` (${unitLabel})`;
      }
    }
    return name;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
