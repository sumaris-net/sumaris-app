import { Directive, EventEmitter, Input, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AccountService,
  AppTabEditor,
  capitalizeFirstLetter,
  changeCaseToUnderscore,
  DateUtils,
  EntityServiceLoadOptions,
  firstNotNilPromise,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  LocalSettingsService,
  PlatformService,
  propertyComparator,
  toBoolean,
  toDateISOString,
  TranslateContextService
} from '@sumaris-net/ngx-components';
import { ExtractionCategories, ExtractionColumn, ExtractionFilter, ExtractionFilterCriterion, ExtractionType, ExtractionTypeUtils } from '../type/extraction-type.model';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { map } from 'rxjs/operators';
import { ExtractionCriteriaForm } from '../criteria/extraction-criteria.form';
import { TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExtractionService } from './extraction.service';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { ExtractionUtils } from './extraction.utils';
import { ExtractionHelpModal, ExtractionHelpModalOptions } from '../help/help.modal';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';
import { RxState } from '@rx-angular/state';
import { Location } from '@angular/common';


export const DEFAULT_CRITERION_OPERATOR = '=';

export const EXTRACTION_SETTINGS_ENUM = {
  filterKey: 'filter',
  compactRowsKey: 'compactRows'
};


export interface ExtractionState<T extends ExtractionType> {
  types: T[];
  type: T;
  started: boolean;
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class ExtractionAbstractPage<T extends ExtractionType, S extends ExtractionState<T>> extends AppTabEditor<T> {

  protected readonly type$ = this._state.select('type');
  protected readonly types$ = this._state.select('types');

  form: UntypedFormGroup;
  mobile: boolean;
  settingsId: string;
  onRefresh = new EventEmitter<any>();

  @Input() canEdit = false;

  get started(): boolean {
    return this._state.get('started');
  }

  get types(): T[] {
    return this._state.get('types');
  }

  @Input() set types(value: T[]) {
    this._state.set('types', _ => value);
  }

  get type(): T {
    return this._state.get('type');
  }

  @Input() set type(value: T) {
    this._state.set('type', (_) => value);
  }

  get sheetName(): string {
    return this.form.controls.sheetName.value;
  }

  set sheetName(value: string) {
    this.form.get('sheetName').setValue(value);
  }

  markAsDirty(opts?: {onlySelf?: boolean}) {
    this.criteriaForm.markAsDirty(opts);
  }

  get isNewData(): boolean {
    return false;
  }

  get excludeInvalidData(): boolean {
    return toBoolean(this.form.get('meta').value?.excludeInvalidData, true);
  }

  @ViewChild('criteriaForm', {static: true}) criteriaForm: ExtractionCriteriaForm;

  protected constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected location: Location,
    protected alertCtrl: AlertController,
    protected toastController: ToastController,
    protected translate: TranslateService,
    protected translateContext: TranslateContextService,
    protected accountService: AccountService,
    protected service: ExtractionService,
    protected settings: LocalSettingsService,
    protected formBuilder: UntypedFormBuilder,
    protected platform: PlatformService,
    protected modalCtrl: ModalController,
    protected _state: RxState<S>
  ) {
    super(route, router, alertCtrl, translate);
    this.mobile = settings.mobile;
    // Create the filter form
    this.form = formBuilder.group({
      sheetName: [null, Validators.required],
      meta: [null]
    });
    this.settingsId = this.generateTableId();
  }

  ngOnInit() {
    super.ngOnInit();

    this.addChildForm(this.criteriaForm);

    // Load types (if not set by types
    if (!this.types) {
      this._state.connect('types',
        this.watchAllTypes()
          .pipe(
            map(({ data, total }) => {
              // Compute i18n name
              return data.map(t => ExtractionTypeUtils.computeI18nName(this.translate, t))
                // Then sort by name
                .sort(propertyComparator('name'));
            })));
    }

    this._state.hold(this.types$, (_) => this.markAsReady());

  }

  protected async loadFromRouteOrSettings(): Promise<boolean> {

    let found = false;
    try {
      // Read the route queryParams
      {
        const { category, label, sheet, q, meta } = this.route.snapshot.queryParams;
        if (this.debug) console.debug('[extraction-abstract-page] Reading route queryParams...', this.route.snapshot.queryParams);
        found = await this.loadQueryParams({ category, label, sheet, q, meta }, {emitEvent: false});
        if (found) return true; // found! stop here
      }

      // Read the settings
      {
        const json = this.settings.getPageSettings(this.settingsId, EXTRACTION_SETTINGS_ENUM.filterKey);
        if (json) {
          const updateDate = fromDateISOString(json.updateDate);
          const settingsAgeInHours = updateDate?.diff(DateUtils.moment(), 'hour') || 0;
          if (settingsAgeInHours <= 12 /* Apply filter, if age <= 12h */) {
            if (this.debug) console.debug('[extraction-abstract-page] Restoring from settings...', json);
            const { category, label, sheet, q, meta } = json;
            found = await this.loadQueryParams({ category, label, sheet, q, meta }, {emitEvent: false});
            if (found) return true; // found! stop here
          }
        }
      }

      return false; // not loaded
    }
    finally {
      if (found) {
        // Mark as started, with a delay, to avoid reload twice, because of listen on page/sort
        setTimeout(() => this.markAsStarted(), 450);
      }
    }
  }

  /**
   * Load type from a query params `{category, label, sheet, q}`
   */
  protected async loadQueryParams(queryParams: {category: string; label: string; sheet: string; q: string, meta: any},
                                  opts?: {emitEvent?: boolean}): Promise<boolean> {
    // Convert query params into a valid type
    const {category, label, sheet, q, meta} = queryParams;
    const paramType = this.fromObject({category, label});

    const types = await firstNotNilPromise(this.types$, {stop: this.destroySubject});

    //DEBUG
    //console.debug('[extraction-abstract-page] Extraction types found:', types);

    // Read type
    let selectedType;

    // If not type found in params, redirect to first one
    if (isNil(paramType.category) || isNil(paramType.label)) {
      console.debug('[extraction-abstract-page] No extraction type found, in route.');
      this.markAsLoaded();
      return false; // Stop here
    }

    // Select the exact type object in the filter form
    else {
      selectedType = types.find(t => this.isEquals(t, paramType)) || paramType;
    }

    const selectedSheetName = sheet || (selectedType && selectedType.sheetNames && selectedType.sheetNames.length && selectedType.sheetNames[0]);
    if (selectedSheetName && selectedType && !selectedType.sheetNames) {
      selectedType.sheetNames = [selectedSheetName];
    }

    // Set the type
    const changed = await this.setType(selectedType, {
      sheetName: selectedSheetName,
      emitEvent: false, // Should not reload data now (will be done just after, after filter update)
      skipLocationChange: true // Here, we not need an update of the location
    });

    // Update filter form
    if (isNotNilOrBlank(q)) {
      const criteria = this.parseCriteriaFromString(q, sheet);
      await this.criteriaForm.setValue(criteria, {emitEvent: false});
    }

    // Update meta
    if (meta) {
      const metaValue = this.parseMetaFromString(meta)
      this.form.get('meta').patchValue(metaValue, {emitEvent: false});
    }

    // Execute the first load
    if (changed) {
      await this.loadData();
    }
    return true;
  }

  async setType(type: T, opts?: { emitEvent?: boolean; skipLocationChange?: boolean; sheetName?: string; }): Promise<boolean> {
    opts = opts || {};
    opts.emitEvent = isNotNil(opts.emitEvent) ? opts.emitEvent : true;
    opts.skipLocationChange = isNotNil(opts.skipLocationChange) ? opts.skipLocationChange : false;

    // If empty: skip
    if (!type) return false;

    // If same: skip
    const changed = !this.type || !this.isEquals(type, this.type);
    if (changed) {
      // Replace by the full entity
      type = await this.findTypeByFilter(ExtractionTypeFilter.fromType(type));
      if (!type) {
        console.warn("[extraction-form] Type not found:", type);
        return false;
      }
      console.debug(`[extraction-form] Set type to {${type.label}}`, type);
      this.form.patchValue({})
      this.type = type;
      this.criteriaForm.type = type;

      // Check if user can edit (admin or supervisor in the rec department)
      this.canEdit = this.canUserWrite(type);

      // Select the given sheet (if exists), or select the first one
      const sheetName = opts.sheetName && (type.sheetNames || []).find(s => s === opts.sheetName)
        || (type.sheetNames && type.sheetNames[0]);
      this.setSheetName(sheetName || null,
        {
          emitEvent: false,
          skipLocationChange: true
        });
    }

    // Update the window location
    if (opts?.skipLocationChange !== true) {
      setTimeout(() => this.updateQueryParams(), 500);
    }

    // Refresh data
    if (!opts || opts.emitEvent !== false) {
      this.onRefresh.emit();
    }

    return changed;
  }

  setSheetName(sheetName: string, opts?: { emitEvent?: boolean; skipLocationChange?: boolean; }) {
    if (sheetName === this.sheetName) return; //skip

    this.form.patchValue({sheetName}, opts);
    this.criteriaForm.sheetName = sheetName;

    if (opts?.skipLocationChange !== true) {
      setTimeout(() => this.updateQueryParams(), 500);
    }

    if (!opts || opts.emitEvent !== false) {
      this.onRefresh.emit();
    }
  }

  /**
   * Update the URL
   */
  async updateQueryParams(type?: T, opts = {skipLocationChange: false}) {
    type = type || this.type;
    if (this.type !== type) return; // Skip

    const queryParams = ExtractionUtils.asQueryParams(type, this.getFilterValue());
    console.debug('[extraction-form] Updating query params', queryParams);

    // Update route query params
    await this.router.navigate(['.'], {
      relativeTo: this.route,
      skipLocationChange: opts.skipLocationChange,
      queryParams
    });

    // Update settings
    {
      const json = {...queryParams, updateDate: toDateISOString(DateUtils.moment())};
      await this.settings.savePageSetting(this.settingsId, json, EXTRACTION_SETTINGS_ENUM.filterKey);
    }
  }

  async downloadAsFile(event?: Event) {
    if (this.loading || isNil(this.type)) return;

    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    console.debug(`[extraction-form] Downloading ${this.type.category} ${this.type.label}...`);

    this.markAsLoading();
    this.resetError();

    // Get filter
    const filter = this.getFilterValue();
    delete filter.sheetName; // Force to download all sheets

    this.disable();

    try {
      // Download file
      const uri = await this.service.downloadFile(this.type, filter);
      if (isNotNil((uri))) {
        await this.platform.download({uri});
      }

    } catch (err) {
      console.error(err);
      this.error = err && err.message || err;
    } finally {
      this.markAsLoaded();
      this.enable();
    }
  }

  async load(id?: number, opts?: { filter?: Partial<ExtractionFilter>, emitEvent?: boolean; } ): Promise<any> {

    let types: T[] = this.types;
    if (isNil(types)) await this.ready();

    let type: T = (types || []).find(t => t.id === id);
    // Not found in type (try without cache)
    if (!type) {
      type = await this.loadType(id, {fetchPolicy: 'no-cache'});
    }

    // Set type (need by the criteria form)
    let changed = type && await this.setType(type, {emitEvent: false});

    if (opts?.filter){
      await this.setFilterValue(ExtractionFilter.fromObject(opts?.filter), { emitEvent: false });
      changed = true;
    }

    // Load data
    if (changed && (!opts || opts.emitEvent !== false)) {
      await this.loadData();
    }

    // Mark as started (with a delay, because 'started' can be read in setType()
    if (!this.started) {
      setTimeout(() => this.markAsStarted(), 500);
    }

    return undefined;
  }

  async save(event): Promise<any> {
    console.warn("Not allow to save extraction filter yet!");

    return undefined;
  }

  async reload(): Promise<any> {
    return this.load(this.type?.id);
  }

  async openHelpModal(event?: Event) {
    if (!this.type) return;

    if (event) {
      event.preventDefault();
    }

    const modal = await this.modalCtrl.create({
      component: ExtractionHelpModal,
      componentProps: <ExtractionHelpModalOptions>{
        type: this.type
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    await modal.onDidDismiss();
  }


  /* -- abstract protected methods -- */

  protected abstract loadData(): Promise<void>;

  protected abstract watchAllTypes(): Observable<LoadResult<T>>;

  protected abstract loadType(id: number, opts?: EntityServiceLoadOptions): Promise<T>;

  protected abstract fromObject(type?: any): T;

  protected abstract isEquals(t1: T, t2: T): boolean;


  async setFilterValue(filter: ExtractionFilter, opts?: {emitEvent?: boolean}) {

    filter = this.service.asFilter(filter);

    // Patch the main form
    this.form.patchValue(filter?.asObject(), {emitEvent: false});

    // Patch criteria form
    await this.criteriaForm.setValue([
      // Input criteria
      ...(filter.criteria || []).map(ExtractionFilterCriterion.fromObject),
      // Add an empty criteria
      ExtractionFilterCriterion.fromObject({operator: '='})
    ], opts);

    // Emit changes
    if (!opts || opts?.emitEvent !== false) {
      this.onRefresh.emit();
    }
  }

  getFilterValue(): ExtractionFilter {
    const res = {
      sheetName: this.sheetName,
      criteria: this.criteriaForm.getValue(),
      meta: this.form.get('meta').value
    };

    return this.service.asFilter(res);
  }

  /* -- protected methods -- */

  protected getFirstInvalidTabIndex(): number {
    return 0;
  }

  protected parseCriteriaFromString(queryString: string, sheet?: string): ExtractionFilterCriterion[] {
    return ExtractionUtils.parseCriteriaFromString(queryString, sheet);
  }

  protected parseMetaFromString(metaString: string): any {
    return ExtractionUtils.parseMetaString(metaString);
  }

  private generateTableId() {
    const id = this.location.path(true)
        .replace(/[?].*$/g, '')
        .replace(/\/[\d]+/g, '_id')
      + '_'
      // Get a component unique name - See https://stackoverflow.com/questions/60114682/how-to-access-components-unique-encapsulation-id-in-angular-9
      + (this.constructor['ɵcmp']?.id || this.constructor.name);
    //if (this.debug) console.debug("[table] id = " + id);
    return id;
  }

  protected resetError(opts = {emitEvent: true}) {
    this.error = null;
    if (opts.emitEvent !== false){
      this.markForCheck();
    }
  }


  protected async findTypeByFilter(filter: Partial<ExtractionTypeFilter>) {
    if (!filter) throw new Error('Missing \'filter\'');
    filter = filter instanceof ExtractionTypeFilter ? filter : ExtractionTypeFilter.fromObject(filter);
    const types = await firstNotNilPromise(this.types$);
    return (types || []).find(filter.asFilterFn());
  }

  protected getFilterAsQueryParams(): any {
    const filter = this.getFilterValue();
    const params = {sheet: undefined, q: undefined};
    if (filter.sheetName) {
      params.sheet = filter.sheetName;
    }
    if (isNotEmptyArray(filter.criteria)) {
      params.q = filter.criteria.reduce((res, criterion) => {
        if (criterion.endValue) {
          return res.concat(`${criterion.name}${criterion.operator}${criterion.value}:${criterion.endValue}`);
        } else {
          return res.concat(`${criterion.name}${criterion.operator}${criterion.value}`);
        }
      }, []).join(";");
    }
    return params;
  }

  protected canUserWrite(type: ExtractionType): boolean {
    return type.category === ExtractionCategories.PRODUCT && (
      this.accountService.isAdmin()
      || (this.accountService.isUser() && type.recorderPerson?.id === this.accountService.person.id)
      || (this.accountService.isSupervisor() && this.accountService.canUserWriteDataForDepartment(type.recorderDepartment)));
  }

  protected getI18nSheetName(sheetName?: string, type?: T, self?: ExtractionAbstractPage<T, S>): string {
    self = self || this;
    type = type || self.type;
    sheetName = sheetName || this.sheetName;
    if (isNil(sheetName) || isNil(type)) return undefined;

    // Try from specific translation
    let key = `EXTRACTION.${type.category.toUpperCase()}.${type.label.toUpperCase()}.SHEET.${sheetName}`;
    let message = self.translate.instant(key);
    if (message !== key) return message;

    // Try from generic translation
    key = `EXTRACTION.SHEET.${sheetName}`;
    message = self.translate.instant(key);
    if (message !== key) {
      // Append sheet name
      return (sheetName.length === 2) ? `${message} (${sheetName})` : message;
    }

    // No translation found: replace underscore with space
    return sheetName.replace(/[_-]+/g, " ").toUpperCase();
  }

  protected translateColumns(columns: ExtractionColumn[], context?: string) {
    if (isEmptyArray(columns)) return; // Skip, to avoid error when calling this.translate.instant([])

    const i19nPrefix = `EXTRACTION.FORMAT.${changeCaseToUnderscore(this.type.format)}.`.toUpperCase();
    const names = columns.map(column => (column.name || column.columnName).toUpperCase());

    const i18nKeys = names.map(name => i19nPrefix + name)
      .concat(names.map(name => `EXTRACTION.COLUMNS.${name}`));

    const i18nMap = this.translateContext.instant(i18nKeys, context);

    columns.forEach((column, i) => {

      let key = i18nKeys[i];
      column.name = i18nMap[key];

      // No I18n translation
      if (column.name === key) {

        // Fallback to the common translation
        key = i18nKeys[names.length + i];
        column.name = i18nMap[key];

        // Or split column name
        if (column.name === key) {

          // Replace underscore with space
          column.name = column.columnName.replace(/[_-]+/g, " ").toLowerCase();

          // First letter as upper case
          if (column.name.length > 1) column.name = capitalizeFirstLetter(column.name);
        }
      }
   });

  }

  protected getI18nColumnName(columnName?: string) {
    if (!columnName) return '';
    let key = `EXTRACTION.TABLE.${this.type.format.toUpperCase()}.${columnName.toUpperCase()}`;
    let message = this.translate.instant(key);

    // No I18n translation
    if (message === key) {

      // Try to get common translation
      key = `EXTRACTION.TABLE.COLUMNS.${columnName.toUpperCase()}`;
      message = this.translate.instant(key);

      // Or split column name
      if (message === key) {

        // Replace underscore with space
        message = columnName.replace(/[_-]+/g, " ").toUpperCase();
        if (message.length > 1) {
          // First letter as upper case
          message = message.substring(0, 1) + message.substring(1).toLowerCase();
        }
      }
    }
    return message;
  }

  protected hasFilterCriteria(sheetName: string) {
    return this.criteriaForm.hasFilterCriteria(sheetName);
  }

  protected markAsStarted(opts = {emitEvent: true}){
    this._state.set('started', (_) => true);
    if (!opts || opts.emitEvent !== false) this.markForCheck();
  }

  protected toggleExcludeInvalidData(event?: Event, opts?: {emitEvent?: boolean}) {
    const excludeInvalidData = this.excludeInvalidData;
    this.form.get('meta').setValue({
      excludeInvalidData: !excludeInvalidData
    }, opts);
    if (!opts || opts.emitEvent !== false) {
      this.markForCheck();
      this.onRefresh.emit();
    }
  }
}
