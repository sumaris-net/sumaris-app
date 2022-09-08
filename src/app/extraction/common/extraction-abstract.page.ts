import { Directive, EventEmitter, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  AccountService,
  AppTabEditor,
  capitalizeFirstLetter,
  firstNotNilPromise,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  LocalSettingsService,
  PlatformService,
  propertyComparator
} from '@sumaris-net/ngx-components';
import { ExtractionCategories, ExtractionColumn, ExtractionFilter, ExtractionType, ExtractionTypeUtils } from '../type/extraction-type.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first, map, mergeMap } from 'rxjs/operators';
import { ExtractionCriteriaForm } from '../criteria/extraction-criteria.form';
import { TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExtractionService } from './extraction.service';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { ExtractionUtils } from './extraction.utils';
import { ExtractionHelpModal, ExtractionHelpModalOptions } from '../help/help.modal';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';


export const DEFAULT_CRITERION_OPERATOR = '=';

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class ExtractionAbstractPage<T extends ExtractionType> extends AppTabEditor<T> {

  type: T;
  form: FormGroup;
  canEdit = false;
  mobile: boolean;

  onRefresh = new EventEmitter<any>();
  $types = new BehaviorSubject<T[]>(undefined);

  @ViewChild('criteriaForm', {static: true}) criteriaForm: ExtractionCriteriaForm;

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

  protected constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected alertCtrl: AlertController,
    protected toastController: ToastController,
    protected translate: TranslateService,
    protected accountService: AccountService,
    protected service: ExtractionService,
    protected settings: LocalSettingsService,
    protected formBuilder: FormBuilder,
    protected platform: PlatformService,
    protected modalCtrl: ModalController
  ) {
    super(route, router, alertCtrl, translate);
    this.mobile = settings.mobile;
    // Create the main form
    this.form = formBuilder.group({
      sheetName: [null, Validators.required]
    });
  }

  ngOnInit() {
    super.ngOnInit();

    this.addChildForm(this.criteriaForm);

    // Load types
    this.registerSubscription(
      this.watchAllTypes()
        .pipe(
          map(({data, total}) => {
            // Compute i18n name
            data = data.map(t => ExtractionTypeUtils.computeI18nName(this.translate, t))
              // Then sort by name
              .sort(propertyComparator('name'));

            return { data, total };
          }))
        .subscribe(({data}) => {
          this.$types.next(data);
          this.markAsReady();
        })
    );

    // Listen route parameters
    this.registerSubscription(
      this.route.queryParams
        .pipe(
          first(),
          // Convert query params into a valid type
          mergeMap(async ({category, label, sheet}) => {
            const paramType = this.fromObject({category, label});

            // Read type
            const types = await firstNotNilPromise(this.$types);
            let selectedType;

            // If not type found in params, redirect to first one
            if (isNil(paramType.category) || isNil(paramType.label)) {
              selectedType = types && types[0];
            }

            // Select the exact type object in the filter form
            else {
              selectedType = types.find(t => this.isEquals(t, paramType)) || paramType;
            }

            const selectedSheetName = sheet || (selectedType && selectedType.sheetNames && selectedType.sheetNames.length && selectedType.sheetNames[0]);
            if (selectedSheetName && selectedType && !selectedType.sheetNames) {
              selectedType.sheetNames = [selectedSheetName];
            }

            return {selectedType, selectedSheetName};
          })
        )
        .subscribe(async ({selectedType, selectedSheetName}) => {
          // Set the type
          const changed = await this.setType(selectedType, {
            sheetName: selectedSheetName,
            emitEvent: false,
            skipLocationChange: true // Here, we not need an update of the location
          });

          // Execute the first load
          if (changed) await this.loadData();

        }));
  }

  async setType(type: T, opts?: { emitEvent?: boolean; skipLocationChange?: boolean; sheetName?: string; }): Promise<boolean> {
    opts = opts || {};
    opts.emitEvent = isNotNil(opts.emitEvent) ? opts.emitEvent : true;
    opts.skipLocationChange = isNotNil(opts.skipLocationChange) ? opts.skipLocationChange : false;

    // If empty: skip
    if (!type) return false;

    // If same: skip
    const typeChanged = !this.type || !this.isEquals(type, this.type);
    if (!typeChanged) {
      type = this.type;
    }
    else {
      // Replace by the full entity
      type = await this.findTypeByFilter(ExtractionTypeFilter.fromType(type));
      if (!type) {
        console.warn("[extraction-form] Type not found:", type);
        return false;
      }
      console.debug(`[extraction-form] Set type to {${type.label}}`, type);
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
    if (opts.skipLocationChange === false) {
      setTimeout(() => this.updateLocationParams(type), 500);
    }

    // Refresh data
    if (!opts || opts.emitEvent !== true) {
      this.onRefresh.emit();
    }

    return typeChanged;
  }

  protected getFirstInvalidTabIndex(): number {
    return 0;
  }

  setSheetName(sheetName: string, opts?: { emitEvent?: boolean; skipLocationChange?: boolean; }) {
    if (sheetName === this.sheetName) return; //skip

    this.form.patchValue({sheetName}, opts);
    this.criteriaForm.sheetName = sheetName;

    if (opts.skipLocationChange !== true) {
      setTimeout(() => this.updateLocationParams(this.type), 500);
    }

    if (!opts || opts.emitEvent !== false) {
      this.onRefresh.emit();
    }
  }

  /**
   * Update the URL
   */
  async updateLocationParams(type: T) {
    console.debug('[extraction-form] Updating query params', type);

    await this.router.navigate(['.'], {
      relativeTo: this.route,
      skipLocationChange: false,
      queryParams: ExtractionUtils.asQueryParams(type, this.getFilterValue())
    });
  }

  async downloadAsFile(event?: UIEvent) {
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

  async load(id?: number, options?: any): Promise<any> {
    const type = (this.$types.value || []).find(t => t.id === id);
    const changed = type && await this.setType(type, {emitEvent: false});
    if (changed) {
      await this.loadData();
    }
    return undefined;
  }


  async save(event): Promise<any> {
    console.warn("Not allow to save extraction filter yet!");

    return undefined;
  }

  protected abstract loadData(): Promise<void>;

  async reload(): Promise<any> {
    return this.load(this.type?.id);
  }

  async openHelpModal(event?: UIEvent) {
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


  /* -- protected method -- */

  protected resetError(opts = {emitEvent: true}) {
    this.error = null;
    if (opts.emitEvent !== false){
      this.markForCheck();
    }
  }

  protected abstract watchAllTypes(): Observable<LoadResult<T>>;

  protected abstract fromObject(type?: any): T;

  protected abstract isEquals(t1: T, t2: T): boolean;

  async findTypeByFilter(filter: Partial<ExtractionTypeFilter>) {
    if (!filter) throw new Error('Missing \'filter\'');
    filter = filter instanceof ExtractionTypeFilter ? filter : ExtractionTypeFilter.fromObject(filter);
    const types = await firstNotNilPromise(this.$types);
    return (types || []).find(filter.asFilterFn());
  }

  protected getFilterValue(): ExtractionFilter {
    const res = {
      sheetName: this.sheetName,
      criteria: this.criteriaForm.getValue()
    };

    return this.service.asFilter(res);
  }

  getFilterAsQueryParams(): any {
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

  getI18nSheetName(sheetName?: string, type?: T, self?: ExtractionAbstractPage<any>): string {
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

  protected translateColumns(columns: ExtractionColumn[]) {
    if (isEmptyArray(columns)) return; // Skip, to avoid error when calling this.translate.instant([])

    const i19nPrefix = `EXTRACTION.TABLE.${this.type.category.toUpperCase()}.`;
    const names = columns.map(column => (column.name || column.columnName).toUpperCase());

    const i18nKeys = names.map(name => i19nPrefix + name)
      .concat(names.map(name => `EXTRACTION.COLUMNS.${name}`));

    const i18nMap = this.translate.instant(i18nKeys);
    columns.forEach((column, i) => {

      let key = i18nKeys[i];
      column.name = i18nMap[key];

      // No I18n translation
      if (column.name === key) {

        // Try to get common translation
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

  getI18nColumnName(columnName?: string) {
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

  hasFilterCriteria(sheetName: string) {
    return this.criteriaForm.hasFilterCriteria(sheetName);
  }
}
