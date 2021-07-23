import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, Output, ViewChild} from '@angular/core';
import {
  AppFormUtils,
  AppTable,
  DefaultStatusList,
  EntitiesTableDataSource,
  fromDateISOString,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
  ObjectMap,
  PersonService,
  PersonUtils,
  removeDuplicatesFromArray,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  SharedValidators,
  sleep,
  StatusIds,
  toBoolean
} from '@sumaris-net/ngx-components';
import {Program} from '../../services/model/program.model';
import {ActivatedRoute, Router} from '@angular/router';
import {ModalController, Platform} from '@ionic/angular';
import {Location} from '@angular/common';
import {LocationLevelIds, ParameterLabelGroups, TaxonomicLevelIds} from '../../services/model/model.enum';
import {ReferentialFilter} from '../../services/filter/referential.filter';
import {ReferentialRefService} from '../../services/referential-ref.service';
import {ProgramProperties, SAMPLING_STRATEGIES_FEATURE_NAME} from '../../services/config/program.config';
import {environment} from '@environments/environment';
import {SamplingStrategy} from '../../services/model/sampling-strategy.model';
import {SamplingStrategyService} from '../../services/sampling-strategy.service';
import {StrategyService} from '../../services/strategy.service';
import * as momentImported from 'moment';
import {AbstractControl, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ParameterService} from '@app/referential/services/parameter.service';
import {debounceTime, filter, tap} from 'rxjs/operators';
import {AppRootTableSettingsEnum} from '@app/data/table/root-table.class';
import {MatExpansionPanel} from '@angular/material/expansion';
import {TableElement} from '@e-is/ngx-material-table/src/app/ngx-material-table/table-element';
import {Subject} from 'rxjs';
import {StrategyFilter} from '@app/referential/services/filter/strategy.filter';

const moment = momentImported;

export const SamplingStrategiesPageSettingsEnum = {
  PAGE_ID: "samplingStrategies",
  FILTER_KEY: "filter",
  FEATURE_ID: SAMPLING_STRATEGIES_FEATURE_NAME
};

@Component({
  selector: 'app-sampling-strategies-table',
  templateUrl: 'sampling-strategies.table.html',
  styleUrls: ['sampling-strategies.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplingStrategiesTable extends AppTable<SamplingStrategy, StrategyFilter> {

  private _program: Program;

  readonly quarters = Object.freeze([1, 2, 3, 4]);
  readonly parameterGroupLabels: string[];

  errorDetails: any;
  statusList = DefaultStatusList;
  statusById: any;
  parameterIdsByGroupLabel: ObjectMap<number[]>;

  filterForm: FormGroup;
  filterCriteriaCount = 0;
  i18nContext: {
    prefix?: string;
    suffix?: string;
  } = {}

  @Input() showToolbar = true;
  @Input() canEdit = false;
  @Input() canDelete = false;
  @Input() showError = true;
  @Input() showPaginator = true;
  @Input() filterPanelFloating = true;
  @Input() useSticky = true;

  @Input() set program(program: Program) {
   this.setProgram(program);
  }

  get program(): Program {
    return this._program;
  }

  @Output() onNewDataFromRow = new Subject<TableElement<SamplingStrategy>>()

  @ViewChild(MatExpansionPanel, {static: true}) filterExpansionPanel: MatExpansionPanel;

  constructor(
    route: ActivatedRoute,
    router: Router,
    platform: Platform,
    location: Location,
    modalCtrl: ModalController,
    localSettingsService: LocalSettingsService,
    injector: Injector,
    dataService: SamplingStrategyService,
    protected referentialRefService: ReferentialRefService,
    protected personService: PersonService,
    protected parameterService: ParameterService,
    protected strategyService: StrategyService,
    protected formBuilder: FormBuilder,
    protected cd: ChangeDetectorRef
  ) {
    super(route,
      router,
      platform,
      location,
      modalCtrl,
      localSettingsService,
      // columns
      RESERVED_START_COLUMNS
        .concat([
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
          'effortQ4'])
        .concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource(SamplingStrategy, dataService, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        dataServiceOptions: {
          readOnly: true,
        }
      }),
      null,
      injector);

    this.parameterGroupLabels = Object.keys(ParameterLabelGroups)
      .filter(label => label !== 'TAG_ID' && label !== 'DRESSING');

    this.filterForm = formBuilder.group({
      searchText: [null],
      levelId: [null, Validators.required], // the program id
      analyticReference: [null],
      department: [null, SharedValidators.entity],
      location: [null, SharedValidators.entity],
      taxonName: [null, SharedValidators.entity],
      startDate: [null, SharedValidators.validDate],
      endDate: [null, SharedValidators.validDate],
      //recorderPerson: [null, SharedValidators.entity],
      effortByQuarter : formBuilder.group({
        1: [null],
        2: [null],
        3: [null],
        4: [null]
      }),
      parameterGroups : formBuilder.group(
        this.parameterGroupLabels.reduce((controlConfig, label) => {
          controlConfig[label] = [null];
          return controlConfig;
        }, {})
      )
    });

    this.i18nColumnPrefix = 'PROGRAM.STRATEGY.TABLE.'; // Can be overwrite by a program property - see setProgram()
    this.autoLoad = false; // waiting program to be loaded - see setProgram()
    this.defaultSortBy = 'label';
    this.defaultSortDirection = 'asc';
    this.confirmBeforeDelete = true;
    this.inlineEdition = false;

    // Will be override when getting program - see setProgram()
    this.settingsId = SamplingStrategiesPageSettingsEnum.PAGE_ID + '#?';

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // By default, use floating filter if toolbar not shown
    this.filterPanelFloating = toBoolean(this.filterPanelFloating, !this.showToolbar)

      // Remove error after changed selection
    this.selection.changed.subscribe(() => {
      this.error = null;
    });

    // Analytic reference autocomplete
    this.registerAutocompleteField('analyticReference', {
      suggestFn: (value, filter) => this.strategyService.suggestAnalyticReferences(value, {
        ...filter, statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }),
      columnSizes: [4, 6],
      mobile: this.settings.mobile
    });

    this.registerAutocompleteField('department', {
      service: this.referentialRefService,
      filter: <ReferentialFilter>{
        entityName: 'Department',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }
    });

    this.registerAutocompleteField('location', {
      service: this.referentialRefService,
      filter: <ReferentialFilter>{
        entityName: 'Location',
        // TODO BLA: rendre ceci paramètrable par program properties
        levelIds: [LocationLevelIds.ICES_DIVISION],
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }
    });

    this.registerAutocompleteField('taxonName', {
      suggestFn: (value, filter) => this.referentialRefService.suggestTaxonNames(value, filter),
      attributes: ['name'],
      filter: <ReferentialFilter>{
        levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES],
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }
    });

    // Combo: recorder person (filter)
    this.registerAutocompleteField('person', {
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: ['lastName', 'firstName', 'department.name'],
      displayWith: PersonUtils.personToString,
      mobile: this.mobile
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
            this.setFilter(filter, {emitEvent: false});
          }),
          // Save filter in settings (after a debounce time)
          debounceTime(500),
          tap(json => this.settings.savePageSetting(this.settingsId, json, SamplingStrategiesPageSettingsEnum.FILTER_KEY))
        )
        .subscribe());
  }


  protected setProgram(program: Program) {
    if (program && isNotNil(program.id) && this._program !== program) {
      console.debug('[strategy-table] Setting program:', program);

      this._program = program;
      this.settingsId = SamplingStrategiesPageSettingsEnum.PAGE_ID + '#' + program.id;

      this.i18nColumnPrefix = 'PROGRAM.STRATEGY.TABLE.';
      // Add a i18n suffix (e.g. in Biological sampling program)
      const i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
      this.i18nColumnPrefix += i18nSuffix !== 'legacy' && i18nSuffix || '';

      // Restore filter from settings, or load all
      this.restoreFilterOrLoad(program.id);
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  async deleteSelection(event: UIEvent): Promise<number> {
    const rowsToDelete = this.selection.selected;

    const strategyLabelsWithRealizedEffort = (rowsToDelete || [])
      .map(row => row.currentData as SamplingStrategy)
      .map(SamplingStrategy.fromObject)
      .filter(strategy => strategy.hasRealizedEffort)
      .map(s => s.label);

    // send error if one strategy has realized effort
    if (isNotEmptyArray(strategyLabelsWithRealizedEffort)) {
      this.errorDetails = {label: strategyLabelsWithRealizedEffort.join(', ')};
      this.error = strategyLabelsWithRealizedEffort.length === 1
        ? 'PROGRAM.STRATEGY.ERROR.STRATEGY_HAS_REALIZED_EFFORT'
        : 'PROGRAM.STRATEGY.ERROR.STRATEGIES_HAS_REALIZED_EFFORT';
      return 0;
    }

    // delete if strategy has not effort
    await super.deleteSelection(event);

    //TODO FIX : After delete first time, _dirty = false; Cannot delete second times cause try to save
    super.markAsPristine();

    this.error = null;
  }

  closeFilterPanel(event?: UIEvent) {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    this.filterPanelFloating = true;
  }

  async applyFilterAndClosePanel(event?: UIEvent, waitDebounceTime?: boolean) {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    this.filterPanelFloating = true;

    // Wait end of debounce
    if (waitDebounceTime) await sleep(260);
    this.onRefresh.emit(event);
  }

  resetFilter(json?: any) {
    json = {
      ...json,
      levelId: json.levelId || this._program?.id
    };
    const filter = this.asFilter(json);
    AppFormUtils.copyEntity2Form(json, this.filterForm);
    this.setFilter(filter, {emitEvent: true});
  }

  resetFilterAndClose() {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    this.resetFilter();
  }

  onNewData(event: UIEvent, row: TableElement<SamplingStrategy>) {

  }

  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  /* -- protected methods -- */

  protected async restoreFilterOrLoad(programId: number) {
    this.markAsLoading();

    // Load map of parameter ids, by group label
    if (!this.parameterIdsByGroupLabel) {
      this.parameterIdsByGroupLabel = await this.loadParameterIdsByGroupLabel();
    }

    console.debug("[root-table] Restoring filter from settings...");

    const json = this.settings.getPageSettings(this.settingsId, AppRootTableSettingsEnum.FILTER_KEY) || {};

    this.resetFilter({
      ...json,
      levelId: programId
    });
  }

  protected asFilter(source?: any): StrategyFilter {
    source = source || this.filterForm.value;

    const filter = StrategyFilter.fromObject(source);

    // Start date: should be the first day of the year
    filter.startDate = filter.startDate && filter.startDate.utc().startOf('year');
    // End date: should be the last day of the year
    filter.endDate = filter.endDate && filter.endDate.endOf('year').utc().startOf('day');

    // Convert periods (from quarters)
    filter.periods = this.asFilterPeriods(source);

    // Convert parameter groups to list of parameter ids
    filter.parameterIds = this.asFilterParameterIds(source);

    return filter;
  }


  protected asFilterParameterIds(source?: any): number[] {

    const checkedParameterGroupLabels = Object.keys(source.parameterGroups || {})
      // Filter on checked item
      .filter(label => source.parameterGroups[label] === true);

    const parameterIds = checkedParameterGroupLabels.reduce((res, groupLabel) => {
      return res.concat(this.parameterIdsByGroupLabel[groupLabel]);
    }, []);

    if (isEmptyArray(parameterIds)) return undefined

    return removeDuplicatesFromArray(parameterIds);
  }

  protected asFilterPeriods(source: any): any[] {
    const selectedQuarters: number[] = source.effortByQuarter && this.quarters.filter(quarter => source.effortByQuarter[quarter] === true);
    if (isEmptyArray(selectedQuarters)) return undefined; // Skip if no quarters selected

    // Start year (<N - 10> by default)
    const startYear = source.startDate && fromDateISOString(source.startDate).year() || (moment().year() - 10);
    // End year (N + 1 by default)
    const endYear = source.endDate && fromDateISOString(source.endDate).year() || (moment().year() + 1);

    if (startYear > endYear) return undefined; // Invalid years

    const periods = [];
    for (let year = startYear; year <= endYear; year++) {
      selectedQuarters.forEach(quarter => {
        const startMonth = (quarter - 1) * 3 + 1;
        const startDate = fromDateISOString(`${year}-${startMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`).utc();
        const endDate = startDate.clone().add(2, 'month').endOf('month').startOf('day');
        periods.push({startDate, endDate});
      });
    }
    return isNotEmptyArray(periods) ? periods : undefined;
  }

  clearControlValue(event: UIEvent, formControl: AbstractControl): boolean {
    if (event) event.stopPropagation(); // Avoid to enter input the field
    formControl.setValue(null);
    return false;
  }

  protected async loadParameterIdsByGroupLabel(): Promise<ObjectMap<number[]>> {
    const result: ObjectMap<number[]> = {};
    await Promise.all(this.parameterGroupLabels.map(groupLabel => {
      const parameterLabels = ParameterLabelGroups[groupLabel];
      return this.parameterService.loadAllByLabels(parameterLabels, {toEntity: false, fetchPolicy: 'cache-first'})
        .then(parameters => result[groupLabel] = parameters.map(p => p.id))
    }));
    return result;
  }
}

