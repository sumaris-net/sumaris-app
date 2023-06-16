import { Component, Inject, InjectionToken, Injector, Input, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { debounceTime, filter, map, tap } from 'rxjs/operators';
import { TableElement, ValidatorService } from '@e-is/ngx-material-table';
import { ReferentialValidatorService } from '../services/validator/referential.validator';
import { ReferentialService } from '../services/referential.service';
import { PopoverController } from '@ionic/angular';
import {
  AccountService,
  BaseReferential,
  chainPromises,
  changeCaseToUnderscore,
  EntityServiceLoadOptions,
  EntityUtils,
  firstNotNilPromise,
  FormFieldDefinition,
  FormFieldType,
  IEntitiesService,
  IEntityService,
  IReferentialRef,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  JsonUtils,
  Referential,
  ReferentialRef,
  referentialToString,
  removeDuplicatesFromArray,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  sleep,
  slideUpDownAnimation,
  StatusById, StatusIds,
  StatusList, suggestFromArray,
  toBoolean
} from '@sumaris-net/ngx-components';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '@environments/environment';
import { BaseReferentialFilter, ReferentialFilter } from '../services/filter/referential.filter';
import { MatExpansionPanel } from '@angular/material/expansion';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ReferentialI18nKeys } from '@app/referential/referential.utils';
import { ParameterService } from '@app/referential/services/parameter.service';
import { Parameter } from '@app/referential/services/model/parameter.model';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { Pmfm } from '@app/referential/services/model/pmfm.model';
import { TaxonNameService } from '@app/referential/services/taxon-name.service';
import { TaxonName } from '@app/referential/services/model/taxon-name.model';
import { Method } from '@app/referential/pmfm/method/method.model';
import { BaseReferentialTable } from '@app/referential/table/base-referential.table';
import { MethodValidatorService } from '@app/referential/pmfm/method/method.validator';
import { AppBaseTable } from '@app/shared/table/base.table';
import { ReferentialImportPolicy, ReferentialFileService } from '@app/referential/table/referential-file.service';
import { FullReferential } from '@app/referential/services/model/referential.model';
import { ErrorCodes } from '@app/referential/services/errors';

export const BASE_REFERENTIAL_COLUMNS = ['label','name','parent','level','status','creationDate','updateDate','comments'];
export const IGNORED_ENTITY_COLUMNS = ['__typename', 'entityName', 'id', 'statusId', 'levelId', 'properties', 'parentId'];
export const REFERENTIAL_TABLE_SETTINGS_ENUM = {
  FILTER_KEY: 'filter',
  COMPACT_ROWS_KEY: 'compactRows'
};

export const DATA_TYPE = new InjectionToken<new () => BaseReferential<any, any>>('dataType');
export const FILTER_TYPE = new InjectionToken<new () => BaseReferentialFilter<any, any>>('filterType');
export const DATA_SERVICE = new InjectionToken<new () => IEntityService<any>>('dataService');


@Component({
  selector: 'app-referential-page',
  templateUrl: 'referential.table.html',
  styleUrls: ['referential.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: ReferentialValidatorService},
    {provide: DATA_TYPE, useValue: Referential},
    {provide: FILTER_TYPE, useValue: ReferentialFilter},
    {provide: DATA_SERVICE, useExisting: ReferentialService},
  ],
  animations: [slideUpDownAnimation]
})
export class ReferentialTable<
  T extends BaseReferential<T> = Referential,
  F extends BaseReferentialFilter<F, T> = ReferentialFilter
> extends AppBaseTable<T, F> implements OnInit, OnDestroy {

  static DEFAULT_ENTITY_NAME = "Pmfm";

  private _entityName: string;

  filterForm: UntypedFormGroup;
  $selectedEntity = new BehaviorSubject<{ id: string; label: string; level?: string; levelLabel?: string }>(undefined);
  $entities = new BehaviorSubject<{ id: string; label: string; level?: string; levelLabel?: string }[]>(undefined);
  $levels = new BehaviorSubject<ReferentialRef[]>(undefined);
  columnDefinitions: FormFieldDefinition[];
  i18nLevelName: string;
  i18nParentName: string;
  filterCriteriaCount = 0;
  filterPanelFloating = true;
  readonly detailsPath = {
    'Program': '/referential/programs/:id',
    'Software': '/referential/software/:id?label=:label',
    'Pmfm': '/referential/pmfm/:id?label=:label',
    'Parameter': '/referential/parameter/:id?label=:label',
    'Method': '/referential/method/:id?label=:label',
    'TaxonName': '/referential/taxonName/:id?label=:label',
    'TaxonGroup': '/referential/taxonGroup/:id?label=:label',
    // Extraction (special case)
    'ExtractionProduct': '/extraction/product/:id?label=:label'
  };
  readonly dataTypes: { [key: string]: new () => BaseReferential<any> } = {
    'Parameter': Parameter,
    'Pmfm': Pmfm,
    'TaxonName': TaxonName,
    'Unit': FullReferential,
    'Method': Method,
    'TaxonGroup': FullReferential
  };
  readonly dataServices: { [key: string]: any} = {
    'Parameter': ParameterService,
    'Pmfm': PmfmService,
    'TaxonName': TaxonNameService,
    'Unit': ReferentialService,
    'TaxonGroup': ReferentialService
  }
  readonly dataValidators: { [key: string]: any} = {
    'Method': MethodValidatorService
  };
  readonly entityNamesWithParent = ['TaxonGroup', 'TaxonName'];

  // Pu sub entity class (not editable without a root entity)
  readonly excludedEntityNames: string[] = [
    'QualitativeValue', 'RoundWeightConversion', 'WeightLengthConversion', 'ProgramPrivilege'
  ]

  readonly statusList = StatusList;
  readonly statusById = StatusById;
  protected fileService: ReferentialFileService<IReferentialRef<any>>;
  readonly importPolicies: ReferentialImportPolicy[] = ['insert-update', 'insert-only', 'update-only'];


  @Input() set showLevelColumn(value: boolean) {
    this.setShowColumn('level', value);
  }

  get showLevelColumn(): boolean {
    return this.getShowColumn('level');
  }

  @Input() set showParentColumn(value: boolean) {
    this.setShowColumn('parent', value);
  }

  get showParentColumn(): boolean {
    return this.getShowColumn('parent');
  }

  @Input() canOpenDetail = false;
  @Input() canDownload = false;
  @Input() canUpload = false;
  @Input() canSelectEntity = true;
  @Input() persistFilterInSettings: boolean;
  @Input() title = 'REFERENTIAL.LIST.TITLE';

  @Input() set entityName(value: string) {
    if (this._entityName !== value) {
      this._entityName = value;
      if (!this.loadingSubject.value) {
        this.applyEntityName(value, { skipLocationChange: true });
      }
    }
  }

  get entityName(): string {
    return this._entityName;
  }

  @Input() set importPolicy(value: ReferentialImportPolicy) {
    if (this.fileService && this.canUpload) this.fileService.importPolicy = value;
  }

  get importPolicy(): ReferentialImportPolicy {
    return this.fileService?.importPolicy || 'insert-update';
  }

  @Input() sticky = false;
  @Input() stickyEnd = false;
  @Input() compact = false;

  @ViewChild(MatExpansionPanel, {static: true}) filterExpansionPanel: MatExpansionPanel;

  constructor(
    injector: Injector,
    protected accountService: AccountService,
    protected referentialService: ReferentialService<T>,
    protected referentialRefService: ReferentialRefService,
    protected formBuilder: UntypedFormBuilder,
    protected popoverController: PopoverController,
    protected translate: TranslateService,
    @Optional() @Inject(DATA_TYPE) dataType?: new () => T,
    @Optional() @Inject(FILTER_TYPE) filterType?: new () => F,
    @Optional() @Inject(DATA_SERVICE) entityService?: IEntitiesService<T, F>,
  ) {
    super(injector,
      dataType,
      filterType,
      // columns
      RESERVED_START_COLUMNS
        .concat(BASE_REFERENTIAL_COLUMNS)
        .concat(RESERVED_END_COLUMNS),
      entityService || injector.get(ReferentialService) as unknown as IEntitiesService<T, F>,
      injector.get(ValidatorService),
      {
        prependNewElements: false,
        suppressErrors: environment.production,
        saveOnlyDirtyRows: true
      }
    );

    this.i18nColumnPrefix = 'REFERENTIAL.';
    this.allowRowDetail = false;
    this.confirmBeforeDelete = true;

    // Allow inline edition only if admin
    this.inlineEdition = accountService.isAdmin();
    this.canEdit = accountService.isAdmin();
    this.autoLoad = false; // waiting dataSource to be set

    const filterConfig = this.getFilterFormConfig();
    this.filterForm = this.formBuilder.group(filterConfig || {});

    // Default hidden columns
    this.excludesColumns.push('parent');
    if (this.mobile) this.excludesColumns.push('updateDate');

    // FOR DEV ONLY
    this.debug = true;
  }

  ngOnInit() {
    super.ngOnInit();

    // Defaults
    this.persistFilterInSettings = toBoolean(this.persistFilterInSettings, this.canSelectEntity);


    // Configure autocomplete fields
    this.registerAutocompleteField('level', {
      items: this.$levels,
      mobile: this.mobile
    });
    this.registerAutocompleteField('levelId', {
      items: this.$levels,
      mobile: this.mobile
    });
    this.registerAutocompleteField('parent', {
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        entityName: this.entityName
      }),
      attributes: ['label', 'name'],
      displayWith: referentialToString
    });

    // Load entities
    this.registerSubscription(
      this.referentialService.watchTypes()
        .pipe(
          map(types => types
            .filter(type => !this.excludedEntityNames.includes(type.id))
            .map(type => ({
              id: type.id,
              label: this.getI18nEntityName(type.id),
              level: type.level,
              levelLabel: this.getI18nEntityName(type.level)
            }))),
          map(types => EntityUtils.sort(types, 'label'))
        )
        .subscribe(types => this.$entities.next(types))
    );

    this.registerSubscription(
      this.onRefresh.subscribe(() => {
        this.filterForm.markAsUntouched();
        this.filterForm.markAsPristine();
      }));

    // Update filter when changes
    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(250),
          filter(() => this.filterForm.valid),
          tap(value => {
            const filter = this.asFilter(value);
            this.filterCriteriaCount = filter.countNotEmptyCriteria();
            this.markForCheck();
            // Applying the filter
            this.setFilter(filter, {emitEvent: false});
          }),
          // Save filter in settings (after a debounce time)
          debounceTime(500),
          tap(json => this.persistFilterInSettings && this.settings.savePageSetting(this.settingsId, json, REFERENTIAL_TABLE_SETTINGS_ENUM.FILTER_KEY))
        )
        .subscribe()
      );

    // Restore compact mode
    this.restoreCompactMode();

    if (this.persistFilterInSettings) {
      this.restoreFilterOrLoad();
    }
    else if (this._entityName) {
      this.applyEntityName(this._entityName);
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  async restoreFilterOrLoad() {
    this.markAsLoading();

    const json = this.settings.getPageSettings(this.settingsId, REFERENTIAL_TABLE_SETTINGS_ENUM.FILTER_KEY);
    console.debug("[referentials] Restoring filter from settings...", json);

    if (json?.entityName) {
      const filter = this.asFilter(json);
      this.filterForm.patchValue(json, {emitEvent: false});
      this.filterCriteriaCount = filter.countNotEmptyCriteria();
      this.markForCheck();
      return this.applyEntityName(filter.entityName);
    }

    // Check route parameters
    const {entity, q, level, status} = this.route.snapshot.queryParams;
    if (entity) {
      let levelRef: ReferentialRef;
      if (level) {
        const levels = await firstNotNilPromise(this.$levels);
        levelRef = levels.find(l => l.id === level);
      }

      this.filterForm.patchValue({
        entityName: entity,
        searchText: q || null,
        level: levelRef,
        statusId: isNotNil(status) ? +status : null
      }, {emitEvent: false});
      return this.applyEntityName(entity, {skipLocationChange: true});
    }

    // Load default entity
    await this.applyEntityName(this._entityName || entity || ReferentialTable.DEFAULT_ENTITY_NAME);
  }

  async applyEntityName(entityName: string, opts?: { emitEvent?: boolean; skipLocationChange?: boolean }) {
    opts = {emitEvent: true, skipLocationChange: false, ...opts};
    this._entityName = entityName;

    this.canOpenDetail = false;
    this.canDownload = false;
    this.canUpload = false;
    this.resetError();

    // Wait end of entities loading
    if (this.canSelectEntity) {
      const entities = await firstNotNilPromise(this.$entities);

      const entity = entities.find(e => e.id === entityName);
      if (!entity) {
        throw new Error(`[referential] Entity {${entityName}} not found !`);
      }

      this.$selectedEntity.next(entity);
    }

    try {

      // Load levels
      await this.loadLevels(entityName);

      const showLevelColumn = isNotEmptyArray(this.$levels.value);
      const showParentColumn = this.entityNamesWithParent.includes(entityName);
      const dataType = this.getDataType(entityName);
      const validator = this.getValidator(entityName);
      const dataService = this.getEntityService(entityName);

      const columnDefinitions = this.loadColumnDefinitions(dataType, validator,
        ['statusId', ...(showLevelColumn && ['levelId'] || [])],
        [
          ...IGNORED_ENTITY_COLUMNS,
          'creationDate', 'updateDate',
          ...(!showParentColumn && ['parent'] || [])
        ]);
      if (this.fileService) {
        this.fileService.columnDefinitions = columnDefinitions;
        this.fileService.dataType = dataType;
        this.fileService.dataService = dataService;
        this.fileService.entityName = entityName;
      }
      else {
        this.fileService = new ReferentialFileService<IReferentialRef<any>>(this.injector,
          this.dataSource,
          columnDefinitions,
          dataService,
          dataType);
        this.fileService.i18nColumnPrefix = this.i18nColumnPrefix;
        this.fileService.defaultNewRowValue = () => this.defaultNewRowValue();
        this.fileService.isKnownEntityName = (entityName) => this.isKnownEntityName(entityName);
        this.fileService.loadByLabel = (label, filter) => this.loadByLabel(label, filter);
        this.fileService.entityName = entityName;
        this.fileService.loadLevelById = (levelId) => {
          return (this.$levels.value || []).find(l => l.id === levelId);
        }
        this.fileService.loadStatusById = (statusId) => this.statusById[statusId];
      }

      // Load dynamic columns
      // TODO enable this
      //this.columnDefinitions = this.loadColumnDefinitions(dataType, validator);
      this.columnDefinitions = [];

      this.displayedColumns = this.getDisplayColumns();

      // Show/Hide some columns (only if entityname can change, otherwise user should show/hide using @Input())
      if (this.canSelectEntity) {
        // Level columns
        this.showLevelColumn = isNotEmptyArray(this.$levels.value);

        // Hide parent columns
        this.showParentColumn = this.entityNamesWithParent.includes(entityName);
      }


      this.canOpenDetail = !!this.detailsPath[entityName];
      this.inlineEdition = !this.canOpenDetail;
      this.canDownload = !!this.getEntityService(entityName);
      this.canUpload = this.accountService.isAdmin() && this.canDownload && !!this.getDataType(entityName);
      this.i18nParentName = this.computeI18nParentName(entityName);

      // Applying the filter (will reload if emitEvent = true)
      const filter = this.asFilter({
        ...this.filterForm.value,
        level: null,
        entityName
      });
      this.filterForm.patchValue({ entityName, level: null }, { emitEvent: false });
      this.setFilter(filter, { emitEvent: opts.emitEvent });


      // Update route location
      if (opts.skipLocationChange !== true && this.canSelectEntity) {
        this.router.navigate(['.'], {
          relativeTo: this.route,
          skipLocationChange: false,
          queryParams: {
            entity: entityName
          }
        });
      }
    } catch (err){
      console.error(err);
      this.setError(err);
    }
  }
  protected defaultNewRowValue(): any {
    return {entityName: this.entityName, statusId: StatusIds.ENABLE};
  }

  async onEntityNameChange(entityName: string): Promise<any> {
    // No change: skip
    if (this._entityName === entityName) return;
    this.applyEntityName(entityName);
  }

  async addRow(event?: any): Promise<boolean> {
    // Create new row
    const result = await super.addRow(event);
    if (!result) return result;

    const row = this.dataSource.getRow(-1);
    row.validator.controls['entityName'].setValue(this._entityName);
    return true;
  }

  async loadLevels(entityName: string): Promise<ReferentialRef[]> {

    const res = await this.referentialRefService.loadLevels(entityName, {
      fetchPolicy: 'network-only'
    });

    const levels = (res || []).sort(EntityUtils.sortComparator('label', 'asc'));
    this.$levels.next(levels);

    if (isNotEmptyArray(levels)) {
      const parentEntityName = levels[0].entityName;
      const i18nLevelName = "REFERENTIAL.ENTITY." + changeCaseToUnderscore(parentEntityName).toUpperCase();
      const levelName = this.translate.instant(i18nLevelName);
      this.i18nLevelName = (levelName !== i18nLevelName) ? levelName : ReferentialI18nKeys.DEFAULT_I18N_LEVEL_NAME;
    }
    else {
      this.i18nLevelName = ReferentialI18nKeys.DEFAULT_I18N_LEVEL_NAME;
    }

    return res;
  }

  computeI18nParentName(entityName): string {
    const i18nKey = "REFERENTIAL." + changeCaseToUnderscore(entityName).toUpperCase() + ".PARENT";
    const translation = this.translate.instant(i18nKey);
    return (translation !== i18nKey) ? translation : ReferentialI18nKeys.DEFAULT_I18N_PARENT_NAME;
  }

  getI18nEntityName(entityName: string): string {

    if (isNil(entityName)) return undefined;

    const tableName = entityName.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
    const key = `REFERENTIAL.ENTITY.${tableName}`;
    let message = this.translate.instant(key);

    if (message !== key) return message;
    // No I18n translation: continue

    // Use tableName, but replace underscore with space
    message = tableName.replace(/[_-]+/g, ' ').toUpperCase() || '';
    // First letter as upper case
    if (message.length > 1) {
      return message.substring(0, 1) + message.substring(1).toLowerCase();
    }
    return message;
  }

  async openRow(id: number, row: TableElement<T>): Promise<boolean> {
    const path = this.detailsPath[this._entityName];

    if (isNotNilOrBlank(path)) {
      await this.router.navigateByUrl(
        path
          // Replace the id in the path
          .replace(':id', isNotNil(row.currentData.id) ? row.currentData.id.toString() : '')
          // Replace the label in the path
          .replace(':label', row.currentData.label || '')
      );
      return true;
    }

    return super.openRow(id, row);
  }

  clearControlValue(event: Event, formControl: AbstractControl): boolean {
    if (event) event.stopPropagation(); // Avoid to enter input the field
    formControl.setValue(null);
    return false;
  }

  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  applyFilterAndClosePanel(event?: Event) {
    this.onRefresh.emit(event);
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
  }

  closeFilterPanel() {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
  }

  resetFilter(event?: Event) {
    this.filterForm.reset({entityName: this._entityName}, {emitEvent: true});
    const filter = this.asFilter({});
    this.setFilter(filter, {emitEvent: true});
    this.filterCriteriaCount = 0;
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
  }

  patchFilter(partialFilter: Partial<ReferentialFilter>) {
    this.filterForm.patchValue(partialFilter, {emitEvent: true});
    const filter = this.asFilter(this.filterForm.value);
    this.setFilter(filter, {emitEvent: true});
    this.filterExpansionPanel.close();
  }

  restoreCompactMode(opts?: {emitEvent?: boolean}) {
    if (!this.compact) {
      const compact = this.settings.getPageSettings(this.settingsId, REFERENTIAL_TABLE_SETTINGS_ENUM.COMPACT_ROWS_KEY) || false;
      if (this.compact !== compact) {
        this.compact = compact;

        if (!opts || opts.emitEvent !== false) {
          this.markForCheck();
        }
      }
    }
  }

  toggleCompactMode() {
    this.compact = !this.compact;
    this.markForCheck();
    this.settings.savePageSetting(this.settingsId, this.compact, REFERENTIAL_TABLE_SETTINGS_ENUM.COMPACT_ROWS_KEY);
  }

  async exportToJson(event: Event) {
    if (!this._entityName) return; // Skip
    const ids = this.selection.hasValue() && this.selection.selected.map(row => row.currentData.id);
    await this.fileService.exportToJson(event, {ids, context: this.filter?.asObject()});
  }

  async exportToCsv(event: Event) {
    if (!this._entityName) return; // Skip
    const ids = this.selection.hasValue() && this.selection.selected.map(row => row.currentData.id);
    await this.fileService.exportToCsv(event, {ids, context: this.filter?.asObject()});
  }

  async importFromCsv(event?: Event) {
    if (!this.canEdit) return; // skip
    try {
      await this.fileService.importFromCsv(event);
      await sleep(1000);
      this.onRefresh.emit();
    }
    catch(err) {
      console.error(err)
      this.setError(err);
    }
  }

  async importFromJson(event?: Event) {
    if (!this.canEdit) return; // skip
    try {
      await this.fileService.importFromJson(event);
      await sleep(1000);
      this.onRefresh.emit();
    }
    catch(err) {
      console.error(err)
      this.setError(err);
    }
  }

  /* -- protected functions -- */

  protected async loadByLabel<T extends IReferentialRef<T>>(label: string, filter: Partial<ReferentialFilter> & {entityName: string}): Promise<T> {
    if (isNilOrBlank(label)) throw new Error('Missing required argument \'label\'');
    const entityName = filter?.entityName;
    if (!entityName) throw new Error('Missing required argument \'source.entityName\', or \'filter.entityName\'');
    const service = this.getEntityService(entityName);
    if (!service) throw new Error('No service defined for the entity name: ' + entityName);

    const dataType = this.getDataType(entityName);
    if (!dataType) throw new Error('No dataType defined for the entity name: ' + entityName);

    try {
      const { data, total } = await this.referentialService.loadAll(0, 1, 'label', 'asc', {
        ...filter,
        entityName,
        label
      });
      if (total === 0) return undefined;
      if (total > 1) throw {code: ErrorCodes.TOO_MANY_REFERENCE_FOUND, message: `To many match of ${entityName} with label ${label}`};
      const json = data[0];

      const target = new dataType();
      target.fromObject(json);
      return target as unknown as T;
    }
    catch (err) {
      let message = err && err.message || err;
      console.error(message);
      throw err;
    }
  }

  protected registerAutocompleteFields() {
    // Can be overwritten by subclasses
  }

  protected loadColumnDefinitions(dataType: new () => IReferentialRef<any>,
                                  validatorService?: ValidatorService,
                                  includedProperties?: string[],
                                  excludedProperties?: string[]): FormFieldDefinition[] {

    const properties = BaseReferentialTable.getEntityDisplayProperties(dataType, validatorService, excludedProperties || IGNORED_ENTITY_COLUMNS);

    // Force include properties (e.g. level)
    if (includedProperties) includedProperties?.filter(p => !properties.includes(p)).forEach(p => properties.push(p));

    return properties.map(key => this.getColumnDefinition(key));
  }

  protected getColumnDefinition(key: string): FormFieldDefinition{
    if (this.autocompleteFields[key]) {
      return <FormFieldDefinition>{
        key,
        type: 'entity',
        label: (this.i18nColumnPrefix) + changeCaseToUnderscore(key).toUpperCase(),
        autocomplete: this.autocompleteFields[key]
      };
    }

    return <FormFieldDefinition>{
      key,
      type: this.getColumnType(key),
      label: (this.i18nColumnPrefix) + changeCaseToUnderscore(key).toUpperCase()
    };
  }

  protected getColumnType(key: string): FormFieldType {
    if (key === 'id' || key.endsWith('Id')) return 'integer';
    key = key.toLowerCase();
    if (key.endsWith('date')) return 'date';
    if (key.endsWith('month') || key.endsWith('year')) return 'integer';
    if (key.startsWith('is')) return 'boolean';
    if (key.endsWith('label') || key.endsWith('name') || key.endsWith('code')
      || key.endsWith('description') || key.endsWith('comments')) return 'string';
    return 'string';
  }

  protected getDisplayColumns(): string[] {
    let columns = removeDuplicatesFromArray(super.getDisplayColumns())
      .filter(key => !RESERVED_END_COLUMNS.includes(key));
    const additionalColumns = (this.columnDefinitions || []).map(col => col.key)
      .filter(key => !columns.includes(key));
    return  columns
        .concat(additionalColumns)
        .concat(RESERVED_END_COLUMNS);
  }


  protected getFilterFormConfig(): any {
    console.debug('[referential-table] Creating filter form group...');

    // Base form config
    const config = {
      entityName: [null],
      searchText: [null],
      level: [null],
      parentId: [null],
      statusId: [null]
    };

    // Add other properties
    return Object.keys(new this.filterType())
      .filter(key => !IGNORED_ENTITY_COLUMNS.includes(key) && !config[key])
      .reduce((config, key) => {
        console.debug('[referential-table] Adding filter control: ' + key);
        config[key] = [null];
        return config;
      }, config);
  }

  protected getEntityService<T extends IReferentialRef<any>>(entityName?: string): IEntityService<T> {
    entityName = entityName || this._entityName;
    if (!entityName) throw new Error('Missing required argument \'entityName\'');
    const serviceToken = this.dataServices[entityName];
    const service: IEntitiesService<T, any> & IEntityService<T> = serviceToken && this.injector.get(serviceToken) as IEntitiesService<T, any> & IEntityService<T>;
    if (service && (typeof service.load !== 'function' || typeof service.save !== 'function')) throw new Error('Not a entities service. Missing load() or save()');
    if (service) return service;

    // Check if can be managed by generic service
    if (!this.isKnownEntityName(entityName)) return undefined;

    return this.referentialService as unknown as IEntityService<T>;
  }

  protected getDataType(entityName?: string): new () => BaseReferential<any> {

    entityName = entityName || this._entityName;

    const dataType = this.dataTypes[entityName];
    if (dataType) return dataType;

    // Check if can be managed by generic class
    if (!this.isKnownEntityName(entityName)) return undefined;

    return Referential;
  }

  protected getValidator(entityName?: string): ValidatorService {

    entityName = entityName || this._entityName;

    const validatorToken = this.dataValidators[entityName];
    const validator = validatorToken && this.injector.get(validatorToken);
    if (validator) return validator;

    // Check if can be managed by generic class
    if (!this.isKnownEntityName(entityName)) return undefined;

    return this.validatorService;
  }

  protected isKnownEntityName(entityName: string): boolean {
    if (!entityName) return false;
    return !!(this.$entities.value || []).find(item => item.id === entityName);
  }

  protected async openNewRowDetail(): Promise<boolean> {
    const path = this.detailsPath[this._entityName];

    if (path) {
      await this.router.navigateByUrl(path
        .replace(':id', 'new')
        .replace(':label', ''));
      return true;
    }

    return super.openNewRowDetail();
  }

  protected asFilter(source: any): F {
    return super.asFilter({
      entityName: source?.entityName || this._entityName,
      ...source,
    });
  }

}

