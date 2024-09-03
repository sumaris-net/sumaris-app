import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import {
  Alerts,
  AppFormUtils,
  AppTable,
  DateUtils,
  EntitiesTableDataSource,
  fromDateISOString,
  isEmptyArray,
  isNilOrNaN,
  isNotEmptyArray,
  isNotNil,
  ObjectMap,
  PersonService,
  PersonUtils,
  ReferentialRef,
  removeDuplicatesFromArray,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  SharedValidators,
  sleep,
  StatusIds,
  toBoolean,
} from '@sumaris-net/ngx-components';
import { Program } from '../../services/model/program.model';
import { LocationLevelGroups, ParameterLabelGroups, TaxonomicLevelIds } from '../../services/model/model.enum';
import { ReferentialRefService } from '../../services/referential-ref.service';
import { ProgramProperties, SAMPLING_STRATEGIES_FEATURE_NAME } from '../../services/config/program.config';
import { environment } from '@environments/environment';
import { SamplingStrategy, StrategyEffort } from '../../services/model/sampling-strategy.model';
import { SamplingStrategyService } from '../../services/sampling-strategy.service';
import { StrategyService } from '../../services/strategy.service';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ParameterService } from '@app/referential/services/parameter.service';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { MatExpansionPanel } from '@angular/material/expansion';
import { TableElement } from '@e-is/ngx-material-table';
import { Subject } from 'rxjs';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { StrategyModal } from '@app/referential/strategy/strategy.modal';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { TaxonNameRefService } from '@app/referential/services/taxon-name-ref.service';
import { TaxonNameRefFilter } from '@app/referential/services/filter/taxon-name-ref.filter';

import moment from 'moment';
import { RxState } from '@rx-angular/state';
import { LandingFilter } from '@app/trip/landing/landing.filter';

export const SamplingStrategiesPageSettingsEnum = {
  PAGE_ID: 'samplingStrategies',
  FILTER_KEY: 'filter',
  FEATURE_ID: SAMPLING_STRATEGIES_FEATURE_NAME,
};

interface SamplingStrategiesTableState {
  canEdit: boolean;
  canDelete: boolean;
}

@Component({
  selector: 'app-sampling-strategies-table',
  templateUrl: 'sampling-strategies.table.html',
  styleUrls: ['sampling-strategies.table.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SamplingStrategiesTable extends AppTable<SamplingStrategy, StrategyFilter> implements OnInit {
  private _program: Program;

  readonly canEdit$ = this._state.select('canEdit');
  readonly canDelete$ = this._state.select('canDelete');
  readonly quarters = Object.freeze([1, 2, 3, 4]);
  readonly parameterGroupLabels: string[];

  highlightedRowId: number;
  errorDetails: any;
  parameterIdsByGroupLabel: ObjectMap<number[]>;

  filterForm: UntypedFormGroup;
  filterCriteriaCount = 0;
  i18nContext: {
    prefix?: string;
    suffix?: string;
  } = {};

  @Input() showToolbar = true;

  @Input() set canEdit(value: boolean) {
    this._state.set('canEdit', (_) => value);
  }
  get canEdit(): boolean {
    return this._state.get('canEdit');
  }
  @Input() set canDelete(value: boolean) {
    this._state.set('canDelete', (_) => value);
  }
  get canDelete(): boolean {
    return this._state.get('canDelete');
  }
  @Input() canOpenRealizedLandings = false;
  @Input() showError = true;
  @Input() showPaginator = true;
  @Input() filterPanelFloating = true;
  @Input() useSticky = true;
  @Input() cellTemplate: TemplateRef<any>;

  @Input() set program(program: Program) {
    this.setProgram(program);
  }

  get program(): Program {
    return this._program;
  }

  @Output() onNewDataFromRow = new Subject<{ row: TableElement<SamplingStrategy>; event: Event }>();

  @ViewChild(MatExpansionPanel, { static: true }) filterExpansionPanel: MatExpansionPanel;

  constructor(
    injector: Injector,
    protected samplingStrategyService: SamplingStrategyService,
    protected strategyService: StrategyService,
    protected referentialRefService: ReferentialRefService,
    protected taxonNameRefService: TaxonNameRefService,
    protected personService: PersonService,
    protected parameterService: ParameterService,
    protected formBuilder: UntypedFormBuilder,
    protected _state: RxState<SamplingStrategiesTableState>,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      // columns
      RESERVED_START_COLUMNS.concat([
        'label',
        'analyticReference',
        'recorderDepartments',
        'locations',
        'taxonNames',
        'comments',
        'parameterGroups',
        'effortQ1',
        'effortQ2',
        'effortQ3',
        'effortQ4',
      ]).concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource(SamplingStrategy, samplingStrategyService, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        readOnly: true,
        watchAllOptions: {
          withTotal: true,
        },
      })
    );

    this.parameterGroupLabels = ['LENGTH', 'WEIGHT', 'SEX', 'MATURITY', 'AGE'];

    this.filterForm = formBuilder.group({
      searchText: [null],
      levelId: [null, Validators.required], // the program id
      analyticReference: [null],
      departments: [null],
      locations: [null],
      taxonNames: [null],
      startDate: [null, SharedValidators.validDate],
      endDate: [null, SharedValidators.validDate],
      //recorderPerson: [null],
      effortByQuarter: formBuilder.group({
        1: [null],
        2: [null],
        3: [null],
        4: [null],
      }),
      parameterGroups: formBuilder.group(
        this.parameterGroupLabels.reduce((controlConfig, label) => {
          controlConfig[label] = [null];
          return controlConfig;
        }, {})
      ),
    });

    this.i18nColumnPrefix = 'PROGRAM.STRATEGY.TABLE.'; // Can be overwritten by a program property - see setProgram()
    this.autoLoad = false; // waiting program to be loaded - see setProgram()
    this.defaultSortBy = 'label';
    this.defaultSortDirection = 'asc';
    this.confirmBeforeDelete = true;
    this.inlineEdition = false;

    // Will be overridden when getting program - see setProgram()
    this.settingsId = SamplingStrategiesPageSettingsEnum.PAGE_ID + '#?';

    this._state.set({
      canEdit: false,
      canDelete: false,
    });

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // By default, use floating filter if toolbar not shown
    this.filterPanelFloating = toBoolean(this.filterPanelFloating, !this.showToolbar);

    // Remove error after changed selection
    this.selection.changed.subscribe(() => this.resetError());

    // Watch 'canEdit' and 'canDelete' to update 'readonly'
    this._state.hold(this._state.select(['canEdit', 'canDelete'], (res) => res).pipe(debounceTime(250)), ({ canEdit, canDelete }) => {
      this.readOnly = !canEdit && !canDelete;
      this.markForCheck();
    });

    // Analytic reference autocomplete
    this.registerAutocompleteField('analyticReference', {
      showAllOnFocus: false,
      suggestFn: (value, filter) =>
        this.strategyService.suggestAnalyticReferences(value, {
          ...filter,
          statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        }),
      columnSizes: [4, 6],
      mobile: this.mobile,
    });

    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('departments', {
      showAllOnFocus: false,
      service: this.referentialRefService,
      filter: {
        entityName: 'Department',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      mobile: this.mobile,
    });

    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('locations', {
      showAllOnFocus: false,
      suggestFn: async (value, filter) => {
        // Note: wait enumeration override, before using LocationLevelGroups.FISHING_AREA
        await this.referentialRefService.ready();
        return this.referentialRefService.suggest(value, {
          ...filter,
          levelIds: LocationLevelGroups.FISHING_AREA,
        });
      },
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      mobile: this.mobile,
    });

    this.registerAutocompleteField<TaxonNameRef, TaxonNameRefFilter>('taxonNames', {
      showAllOnFocus: false,
      service: this.taxonNameRefService,
      attributes: ['name'],
      filter: {
        levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES],
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      mobile: this.mobile,
    });

    // Combo: recorder person (filter)
    this.registerAutocompleteField('person', {
      showAllOnFocus: false,
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      },
      attributes: ['lastName', 'firstName', 'department.name'],
      displayWith: PersonUtils.personToString,
      mobile: this.mobile,
    });

    // Update filter when changes
    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          //debounceTime(250),
          filter((_) => this.filterForm.valid),
          tap((value) => {
            const filter = this.asFilter(value);
            this.filterCriteriaCount = filter.countNotEmptyCriteria() - 1 /* remove the levelId (always exists) */;
            this.markForCheck();
            // Update the filter, without reloading the content
            this.setFilter(filter, { emitEvent: false });
          }),
          // Save filter in settings (after a debounce time)
          debounceTime(500),
          tap((json) => this.settings.savePageSetting(this.settingsId, json, SamplingStrategiesPageSettingsEnum.FILTER_KEY))
        )
        .subscribe()
    );
  }

  highlightRow(row: TableElement<SamplingStrategy>) {
    this.highlightedRowId = row?.id;
    this.markForCheck();
  }

  clickRow(event: MouseEvent | undefined, row: TableElement<SamplingStrategy>): boolean {
    this.highlightedRowId = row?.id;
    return super.clickRow(event, row);
  }

  async deleteSelection(event: Event): Promise<number> {
    const rowsToDelete = this.selection.selected;

    const strategyLabelsWithData = (rowsToDelete || [])
      .map((row) => row.currentData as SamplingStrategy)
      .map(SamplingStrategy.fromObject)
      .filter((strategy) => strategy.hasRealizedEffort)
      .map((s) => s.label);

    // send error if one strategy has landing
    if (isNotEmptyArray(strategyLabelsWithData)) {
      this.errorDetails = { label: strategyLabelsWithData.join(', ') };
      this.setError(strategyLabelsWithData.length === 1 ? 'PROGRAM.STRATEGY.ERROR.STRATEGY_HAS_DATA' : 'PROGRAM.STRATEGY.ERROR.STRATEGIES_HAS_DATA');
      const message = this.translate.instant(
        strategyLabelsWithData.length === 1 ? 'PROGRAM.STRATEGY.ERROR.STRATEGY_HAS_DATA' : 'PROGRAM.STRATEGY.ERROR.STRATEGIES_HAS_DATA',
        this.errorDetails
      );
      await Alerts.showError(message, this.alertCtrl, this.translate);
      return 0;
    }

    // delete if strategy has not effort
    await super.deleteSelection(event);

    //TODO FIX : After delete first time, _dirty = false; Cannot delete second times cause try to save
    super.markAsPristine();

    this.resetError();
  }

  closeFilterPanel(event?: Event) {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    this.filterPanelFloating = true;
  }

  async applyFilterAndClosePanel(event?: Event, waitDebounceTime?: boolean) {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    this.filterPanelFloating = true;

    // Wait end of debounce
    if (waitDebounceTime) await sleep(260);
    this.onRefresh.emit(event);
  }

  resetFilter(json?: any) {
    json = {
      ...json,
      levelId: json?.levelId || this._program?.id,
    };
    const filter = this.asFilter(json);
    AppFormUtils.copyEntity2Form(json, this.filterForm);
    this.setFilter(filter, { emitEvent: true });
  }

  resetFilterAndClose() {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    this.resetFilter();
  }

  onNewData(event: Event, row: TableElement<SamplingStrategy>) {}

  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  /* -- protected methods -- */

  protected setProgram(program: Program) {
    if (program && isNotNil(program.id) && this._program !== program) {
      console.debug('[strategy-table] Setting program:', program);

      this._program = program;
      this.settingsId = SamplingStrategiesPageSettingsEnum.PAGE_ID + '#' + program.id;

      this.i18nColumnPrefix = 'PROGRAM.STRATEGY.TABLE.';
      // Add a i18n suffix (e.g. in Biological sampling program)
      const i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
      this.i18nColumnSuffix = (i18nSuffix !== 'legacy' && i18nSuffix) || '';

      // Restore filter from settings, or load all
      this.restoreFilterOrLoad(program.id);
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async restoreFilterOrLoad(programId: number) {
    this.markAsLoading();

    // Load map of parameter ids, by group label
    if (!this.parameterIdsByGroupLabel) {
      this.parameterIdsByGroupLabel = await this.loadParameterIdsByGroupLabel();
    }

    console.debug('[root-table] Restoring filter from settings...');

    const json = this.settings.getPageSettings(this.settingsId, AppRootTableSettingsEnum.FILTER_KEY) || {};

    this.resetFilter({
      ...json,
      levelId: programId,
    });
  }

  protected asFilter(source?: any): StrategyFilter {
    source = source || this.filterForm.value;

    const filter = StrategyFilter.fromObject(source);

    // Start date: should be the first day of the year
    // End date: should be the last day of the year
    // /!\ Need to use local time, because the DB can use a local time (e.g. SIH-ADAGIO use tz=Europe/Paris)
    //     TODO: use DB Timezone, using the config CORE_CONFIG_OPTIONS.DB_TIMEZONE;
    filter.startDate = filter.startDate?.local(true).startOf('year');
    filter.endDate = filter.endDate?.local(true).endOf('year').startOf('day');

    // Convert periods (from quarters)
    filter.periods = this.asFilterPeriods(source);

    // Convert parameter groups to list of parameter ids
    filter.parameterIds = this.asFilterParameterIds(source);

    return filter;
  }

  protected asFilterParameterIds(source?: any): number[] {
    const checkedParameterGroupLabels = Object.keys(source.parameterGroups || {})
      // Filter on checked item
      .filter((label) => source.parameterGroups[label] === true);

    const parameterIds = checkedParameterGroupLabels.reduce((res, groupLabel) => res.concat(this.parameterIdsByGroupLabel[groupLabel]), []);

    if (isEmptyArray(parameterIds)) return undefined;

    return removeDuplicatesFromArray(parameterIds);
  }

  protected asFilterPeriods(source: any): any[] {
    const selectedQuarters: number[] = source.effortByQuarter && this.quarters.filter((quarter) => source.effortByQuarter[quarter] === true);
    if (isEmptyArray(selectedQuarters)) return undefined; // Skip if no quarters selected

    // Start year (<N - 10> by default)
    // /!\ Need to use local time, because the DB can use a local time (e.g. SIH-ADAGIO use tz=Europe/Paris)
    //     TODO: use DB Timezone, using the config CORE_CONFIG_OPTIONS.DB_TIMEZONE;
    const startYear = fromDateISOString(source.startDate)?.clone().local(true).year() || DateUtils.moment().year() - 10;
    // End year (N + 1 by default)
    const endYear = fromDateISOString(source.endDate)?.clone().local(true).year() || moment().year() + 1;

    if (startYear > endYear) return undefined; // Invalid years

    const periods = [];
    for (let year = startYear; year <= endYear; year++) {
      selectedQuarters.forEach((quarter) => {
        const startMonth = (quarter - 1) * 3;
        const startDate = DateUtils.moment().local(true).year(year).month(startMonth).startOf('month');
        const endDate = startDate.clone().add(2, 'month').endOf('month').startOf('day');
        periods.push({ startDate, endDate });
      });
    }
    return isNotEmptyArray(periods) ? periods : undefined;
  }

  clearControlValue(event: Event, formControl: AbstractControl): boolean {
    if (event) event.stopPropagation(); // Avoid to enter input the field
    formControl.setValue(null);
    return false;
  }

  protected async loadParameterIdsByGroupLabel(): Promise<ObjectMap<number[]>> {
    const result: ObjectMap<number[]> = {};
    await Promise.all(
      this.parameterGroupLabels.map((groupLabel) => {
        const parameterLabels = ParameterLabelGroups[groupLabel];
        return this.parameterService
          .loadAllByLabels(parameterLabels, { toEntity: false, fetchPolicy: 'cache-first' })
          .then((parameters) => (result[groupLabel] = parameters.map((p) => p.id)));
      })
    );
    return result;
  }

  // INFO CLT : Imagine 355. Sampling strategy can be duplicated with selected year.
  // We keep initial strategy and remove year related data like efforts.
  // We update year-related values like applied period as done in sampling-strategy.form.ts getValue()
  async duplicate(event: Event, rows?: TableElement<SamplingStrategy>[]) {
    rows = rows || this.selection?.selected;
    if (!rows.length) return; // No row: skip

    const modal = await this.modalCtrl.create({
      component: StrategyModal,
    });

    // Open the modal
    await modal.present();
    const { data: year } = await modal.onDidDismiss();

    if (isNilOrNaN(year) || year < 1970) return;

    const strategies = rows.map((row) => row.currentData).map(SamplingStrategy.fromObject);

    await this.duplicateStrategies(strategies, year);
    this.selection.clear();
  }

  async duplicateStrategies(sources: SamplingStrategy[], year: number) {
    try {
      this.markAsLoading();

      // Do save
      // This should refresh the table (because of the watchAll updated throught the cache update)
      await this.samplingStrategyService.duplicateAllToYear(sources, year);
    } catch (err) {
      this.setError((err && err.message) || err, { emitEvent: false });
    } finally {
      this.markAsLoaded();
    }
  }

  protected openLandingsByQuarter(event: UIEvent, strategy: SamplingStrategy, quarter: number) {
    const effort: StrategyEffort = strategy?.effortByQuarter?.[quarter];
    if (!this.canOpenRealizedLandings || !effort?.realizedEffort) return; // Skip if nothing to show (no realized effort)

    // Prevent row click action
    event.preventDefault();

    const filter = LandingFilter.fromObject(<Partial<LandingFilter>>{
      program: { id: this.program.id, label: this.program.label },
      startDate: effort.startDate?.clone().startOf('day'),
      endDate: effort.endDate?.clone().endOf('day'),
      strategy: { id: strategy.id, label: strategy.label },
    });
    const filterString = JSON.stringify(filter.asObject());
    console.info(`[sampling-strategies-table] Opening landings for quarter ${quarter} and strategy '${strategy.label}'`, effort);
    return this.navController.navigateForward(`/observations/landings`, {
      queryParams: {
        q: filterString,
      },
    });
  }
}
