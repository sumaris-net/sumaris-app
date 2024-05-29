import { AfterViewInit, Directive, Injector, Input, OnInit, ViewChild } from '@angular/core';
import {
  AppFormUtils,
  changeCaseToUnderscore,
  CsvUtils,
  EntitiesServiceWatchOptions,
  Entity,
  EntityFilter,
  FileEvent,
  FileResponse,
  FilesUtils,
  firstNotNilPromise,
  FormFieldDefinition,
  FormFieldType,
  IEntitiesService,
  isEmptyArray,
  isNil,
  isNotNil,
  isNotNilOrBlank,
  IStatus,
  LoadResult,
  PropertyFormatPipe,
  sleep,
  StartableService,
  StatusById,
  StatusList,
  suggestFromArray,
} from '@sumaris-net/ngx-components';
import { AppBaseTable, BASE_TABLE_SETTINGS_ENUM, BaseTableConfig, BaseTableState } from '@app/shared/table/base.table';
import { UntypedFormBuilder } from '@angular/forms';
import { debounceTime, filter, switchMap, tap } from 'rxjs/operators';
import { IonInfiniteScroll, PopoverController } from '@ionic/angular';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { ValidatorService } from '@e-is/ngx-material-table';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { BehaviorSubject, isObservable, Observable, of, Subject } from 'rxjs';
import { HttpEventType } from '@angular/common/http';

export interface BaseReferentialTableState extends BaseTableState {}

export interface BaseReferentialTableOptions<
  T extends Entity<T, ID>,
  ID = number,
  ST extends BaseReferentialTableState = BaseReferentialTableState,
  O extends EntitiesServiceWatchOptions = EntitiesServiceWatchOptions,
> extends BaseTableConfig<T, ID, ST, O> {
  propertyNames?: string[];
  canUpload?: boolean;
}

export const IGNORED_ENTITY_COLUMNS = ['__typename', 'id', 'updateDate'];

@Directive()
export abstract class BaseReferentialTable<
    T extends Entity<T, ID>,
    F extends EntityFilter<any, T, any>,
    S extends IEntitiesService<T, F> = IEntitiesService<T, F>,
    V extends BaseValidatorService<T, ID> = any,
    ID = number,
    ST extends BaseReferentialTableState = BaseReferentialTableState,
    O extends BaseReferentialTableOptions<T, ID, ST> = BaseReferentialTableOptions<T, ID, ST>,
  >
  extends AppBaseTable<T, F, S, V, ID, ST, O>
  implements OnInit, AfterViewInit
{
  /**
   * Compute columns from entity
   *
   * @param dataType
   * @param validatorService
   * @param excludedProperties
   */
  static getEntityDisplayProperties<T>(dataType: new () => T, validatorService?: ValidatorService, excludedProperties?: string[]): string[] {
    excludedProperties = excludedProperties || IGNORED_ENTITY_COLUMNS;
    return Object.keys((validatorService && validatorService.getRowValidator().controls) || new dataType()).filter(
      (key) => !excludedProperties.includes(key)
    );
  }

  static getFirstEntityColumn<T>(dataType: new () => T, excludedProperties?: string[]): string {
    excludedProperties = excludedProperties || IGNORED_ENTITY_COLUMNS;
    return Object.keys(new dataType()).find((key) => !excludedProperties.includes(key));
  }

  @Input() title: string;
  @Input() showIdColumn = false;
  @Input() canDownload = false;
  @Input() canUpload = false;

  @ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;

  columnDefinitions: FormFieldDefinition[];

  protected popoverController: PopoverController;
  protected propertyFormatPipe: PropertyFormatPipe;
  protected referentialRefService: ReferentialRefService;

  protected $status = new BehaviorSubject<IStatus[]>(null);
  private readonly withStatusId: boolean;

  protected constructor(injector: Injector, dataType: new () => T, filterType: new () => F, entityService: S, validatorService?: V, options?: O) {
    super(
      injector,
      dataType,
      filterType,
      options?.propertyNames || BaseReferentialTable.getEntityDisplayProperties(dataType),
      entityService,
      validatorService,
      options
    );

    this.referentialRefService = injector.get(ReferentialRefService);
    this.propertyFormatPipe = injector.get(PropertyFormatPipe);
    this.popoverController = injector.get(PopoverController);
    this.title = (this.i18nColumnPrefix && this.i18nColumnPrefix + 'TITLE') || '';
    this.logPrefix = '[base-referential-table] ';
    this.canUpload = options?.canUpload || false;
    this.withStatusId = this.columns.includes('statusId');

    const filterFormConfig = this.getFilterFormConfig();
    this.filterForm = filterFormConfig && injector.get(UntypedFormBuilder).group(filterFormConfig);
  }

  ngOnInit() {
    super.ngOnInit();

    // Status
    if (this.withStatusId) {
      this.registerSubscription(
        this.translate.get(StatusList.map((status) => status.label)).subscribe((translations) => {
          const items = StatusList.map((status) => ({ ...status, label: translations[status.label] }));
          this.$status.next(items);
        })
      );
      this.registerAutocompleteField('statusId', {
        showAllOnFocus: false,
        items: this.$status,
        attributes: ['label'],
        displayWith: (statusId) => {
          if (typeof statusId === 'object') {
            return statusId['label'];
          }
          return this.translate.instant(StatusById[statusId].label);
        },
        mobile: this.mobile,
      });
    }

    // Register autocomplete fields, BEFORE loading column definitions
    this.registerAutocompleteFields();

    this.columnDefinitions = this.loadColumnDefinitions(this.options);
    this.defaultSortBy = this.columnDefinitions[0]?.key || 'id';

    this.registerSubscription(
      this.onRefresh.subscribe(() => {
        this.filterForm.markAsUntouched();
        this.filterForm.markAsPristine();
      })
    );

    // Update filter when changes
    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(250),
          filter((_) => {
            const valid = this.filterForm.valid;
            if (!valid && this.debug) AppFormUtils.logFormErrors(this.filterForm);
            return valid;
          }),
          // Update the filter, without reloading the content
          tap((json) => this.setFilter(json, { emitEvent: false })),
          // Save filter in settings (after a debounce time)
          debounceTime(500),
          tap((json) => this.settings.savePageSetting(this.settingsId, json, BASE_TABLE_SETTINGS_ENUM.FILTER_KEY))
        )
        .subscribe()
    );

    this.ready().then(() => this.restoreFilterOrLoad());
  }

  async ready(): Promise<void> {
    await (this._dataService instanceof StartableService ? this._dataService.ready() : this.settings.ready());

    return super.ready();
  }

  async exportToCsv(event: Event) {
    const filename = this.getExportFileName();
    const separator = this.getExportSeparator();
    const encoding = this.getExportEncoding();
    const headers = this.columnDefinitions.map((def) => def.key);
    const rows = this.dataSource
      .getRows()
      .map((element) => element.currentData)
      .map((data) => this.columnDefinitions.map((definition) => this.propertyFormatPipe.transform(data, definition)));

    CsvUtils.exportToFile(rows, { filename, headers, separator, encoding });
  }

  async importFromCsv(event?: Event) {
    const { data } = await FilesUtils.showUploadPopover(this.popoverController, event, {
      uniqueFile: true,
      fileExtension: '.csv',
      uploadFn: (file) => this.uploadFile(file),
    });

    const entities = (data || []).flatMap((file) => file.response?.body || []);
    if (isEmptyArray(entities)) return; // No entities: skip

    console.info(this.logPrefix + `Importing ${entities.length} entities...`, entities);

    // Keep non exists entities
    const newEntities = entities.filter((entity) => isNil(entity.id));

    // Add entities, one by one
    await this.dataSource.dataService.saveAll(newEntities);

    await sleep(1000);

    this.onRefresh.emit();
  }

  /* -- protected functions -- */

  protected loadColumnDefinitions(options?: O): FormFieldDefinition[] {
    return (options?.propertyNames || BaseReferentialTable.getEntityDisplayProperties(this.dataType)).map((key) =>
      this.getColumnDefinition(key, options)
    );
  }

  protected registerAutocompleteFields() {
    // Can be overwritten by subclasses
  }

  protected getColumnDefinition(key: string, options?: O): FormFieldDefinition {
    if (this.autocompleteFields[key]) {
      return <FormFieldDefinition>{
        key,
        type: 'entity',
        label: this.i18nColumnPrefix + changeCaseToUnderscore(key).toUpperCase(),
        autocomplete: this.autocompleteFields[key],
      };
    }

    return <FormFieldDefinition>{
      key,
      type: this.getColumnType(key),
      label: this.i18nColumnPrefix + changeCaseToUnderscore(key).toUpperCase(),
    };
  }

  protected getColumnType(key: string): FormFieldType {
    if (key === 'id' || key.endsWith('Id')) return 'integer';
    key = key.toLowerCase();
    if (key.endsWith('date')) return 'date';
    if (key.endsWith('month') || key.endsWith('year')) return 'integer';
    if (key.startsWith('is')) return 'boolean';
    if (key.endsWith('label') || key.endsWith('name') || key.endsWith('code') || key.endsWith('description') || key.endsWith('comments'))
      return 'string';
    return 'string';
  }

  protected getFilterFormConfig(): any {
    console.debug(this.logPrefix + ' Creating filter form group...');
    return BaseReferentialTable.getEntityDisplayProperties(this.filterType, this.validatorService).reduce((config, key) => {
      console.debug(this.logPrefix + ' Adding filter control: ' + key);
      config[key] = [null];
      return config;
    }, {});
  }

  protected getExportFileName(): string {
    const key = this.i18nColumnPrefix + 'EXPORT_CSV_FILENAME';
    const filename = this.translate.instant(key, this.filter?.asObject());
    if (filename !== key) return filename;
    return 'export.csv'; // Default filename
  }

  protected getExportSeparator(): string {
    const key = 'FILE.CSV.SEPARATOR';
    const separator = this.translate.instant(key);
    if (separator !== key) return separator;
    return ','; // Default separator
  }

  protected getExportEncoding(): string {
    const key = 'FILE.CSV.ENCODING';
    const encoding = this.translate.instant(key);
    if (encoding !== key) return encoding;
    return 'UTF-8'; // Default encoding
  }

  protected uploadFile(file: File): Observable<FileEvent<T[]>> {
    console.info(this.logPrefix + `Importing CSV file ${file.name}...`);

    const separator = this.getExportSeparator();
    const encoding = this.getExportEncoding();

    return CsvUtils.parseFile(file, { encoding, separator }).pipe(
      switchMap((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const loaded = Math.round(event.loaded * 0.8);
          return of({ ...event, loaded });
        } else if (event instanceof FileResponse) {
          return this.uploadCsvRows(event.body);
        }
        // Unknown event: skip
        else {
          return of<FileEvent<T[]>>();
        }
      }),
      filter(isNotNil)
    );
  }

  protected uploadCsvRows(rows: string[][]): Observable<FileEvent<T[]>> {
    if (!rows || rows.length <= 1) throw { message: 'FILE.CSV.ERROR.EMPTY_FILE' };

    const $progress = new Subject<FileEvent<T[]>>();

    const headerNames = rows.splice(0, 1)[0];
    const total = rows.length;
    console.debug(this.logPrefix + `Importing ${total} rows...`);

    // Check headers
    if (headerNames.length <= 1) {
      const message = this.translate.instant('FILE.CSV.ERROR.NO_HEADER_OR_INVALID_SEPARATOR', {
        separator: this.getExportSeparator(),
      });
      throw { message };
    }

    // Check column names
    console.debug(this.logPrefix + `Checking headers: ${headerNames.join(',')}`);
    const expectedHeaders = this.columnDefinitions.map((def) => def.key);
    const unknownHeaders = headerNames.filter((h) => !expectedHeaders.includes(h));
    if (unknownHeaders.length) {
      const message = this.translate.instant('FILE.CSV.ERROR.UNKNOWN_HEADERS', {
        headers: unknownHeaders.join(', '),
      });
      throw { message };
    }

    $progress.next({ type: HttpEventType.UploadProgress, loaded: -1 });
    const headers = headerNames.map((key) => this.columnDefinitions.find((def) => def.key === key));

    this.parseCsvRowsToEntities(headers, rows)
      .then((entities) => this.resolveEntitiesFields(headers, entities))
      .then((entities) => this.fillEntitiesId(entities))
      .then((entities) => {
        $progress.next(new FileResponse({ body: entities }));
        $progress.complete();
      })
      .catch((err) => $progress.error(err));

    return $progress.asObservable();
  }

  protected async parseCsvRowsToEntities(headers: FormFieldDefinition[], rows: string[][]): Promise<T[]> {
    const defaultValue = this.defaultNewRowValue();
    return rows
      .filter((cells) => cells?.length === headers.length)
      .map((cells) => {
        // Convert to object
        const source: any = headers.reduce((res, fieldDef, i) => {
          const value = cells[i];

          // Parse sub-object
          const attributes = fieldDef.autocomplete?.attributes;
          if (attributes?.length) {
            res[fieldDef.key] = value?.split(' - ', attributes.length).reduce((o, v, j) => {
              o[attributes[j]] = v;
              return o;
            }, {});
          }
          // Parse simple field
          else {
            if (fieldDef.type === 'integer') {
              res[fieldDef.key] = parseInt(value);
            } else if (fieldDef.type === 'double') {
              res[fieldDef.key] = parseFloat(value);
            } else {
              res[fieldDef.key] = isNotNilOrBlank(value) ? value : undefined;
            }
          }

          // Remove null value, to force keeping defaultValue
          if (isNil(res[fieldDef.key])) {
            delete res[fieldDef.key];
          }
          return res;
        }, {});
        return {
          ...defaultValue,
          ...source,
        };
      });
  }

  protected async resolveEntitiesFields(headers: FormFieldDefinition[], entities: T[]): Promise<T[]> {
    const autocompleteFields = headers.filter((def) => def.autocomplete && (!!def.autocomplete.suggestFn || def.autocomplete.items));
    if (isEmptyArray(autocompleteFields)) return entities;

    // Prepare suggest functions, from  autocomplete field
    const suggestFns = autocompleteFields
      .map((def) => def.autocomplete)
      .map(
        (autocomplete) =>
          autocomplete.suggestFn ||
          (isObservable(autocomplete.items) &&
            (async (value, opts) => {
              const items = await firstNotNilPromise(autocomplete.items as Observable<any[]>);
              return suggestFromArray(items, value, opts);
            })) ||
          ((value, opts) => suggestFromArray(autocomplete.items as any[], value, opts))
      );

    const result: T[] = [];

    // For each entities
    for (const entity of entities) {
      let incomplete = false;

      // For each field to resolve
      for (let i = 0; i < autocompleteFields.length; i++) {
        const field = autocompleteFields[i];
        const suggestFn = suggestFns[i];
        const attributes = field.autocomplete.attributes || [];
        const obj = entity[field.key];
        let resolveObj: any;
        for (const searchAttribute of attributes) {
          const searchValue = obj[searchAttribute];
          const res = await suggestFn(searchValue, { ...field.autocomplete.filter, searchAttribute });
          const matches = res && (Array.isArray(res) ? res : (res as LoadResult<any>).data);
          if (matches.length === 1) {
            resolveObj = matches[0];
            break;
          }
        }

        // Replace existing object
        if (resolveObj) {
          entity[field.key] = resolveObj;
        }

        // Not resolved: warn
        else {
          incomplete = true;
          console.warn(this.logPrefix + `Cannot resolve field ${field.key}`, obj);
        }

        if (incomplete) break; // Stop if incomplete
      }

      // If complete entity: add to result
      if (!incomplete) result.push(entity);
    }

    // Convert to entity
    return result.map((source) => {
      const target: T = new this.dataType();
      target.fromObject(source);
      return target;
    });
  }

  protected async fillEntitiesId(entities: T[]): Promise<T[]> {
    // TODO: manage pagination - using JobUtils.fetchAllPages() ?
    const existingEntities = await this.dataSource.getData();

    // DEBUG - DEV only
    /*entities.forEach((entity, i) => {
      entity.id = -1 as any; // Avoid using ID in equals()
      const other = existingEntities[i];
      if (!entity.equals(other)) {
        console.debug('[diff] There is diff between: ', entity, other);
        DebugUtils.logEntityDiff(entity, other);
      }
    });*/

    entities.forEach((entity) => {
      entity.id = -1 as any; // Avoid equals() to use function unique key, instead of id
      const existingEntity = existingEntities.find((other) => entity.equals(other));
      // Copy ID, or unset
      entity.id = isNotNil(existingEntity) ? existingEntity.id : undefined;
    });

    return entities;
  }

  protected defaultNewRowValue(): any {
    const statusId = (this.withStatusId && (this.$status.value || [])[0]) || undefined;
    return {
      statusId,
    };
  }
}
