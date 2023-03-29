import { Injectable, Injector, Input } from '@angular/core';
import { isObservable, Observable, of, Subject } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import {
  chainPromises,
  changeCaseToUnderscore,
  CsvUtils,
  EntitiesTableDataSource,
  EntityServiceLoadOptions,
  EntityUtils,
  FileEvent,
  FileResponse,
  FilesUtils,
  firstNotNilPromise,
  FormFieldDefinition,
  IEntityService,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  IStatus,
  JobUtils,
  JsonUtils,
  LoadResult,
  PropertyFormatPipe,
  Referential, ReferentialUtils,
  ShowToastOptions,
  suggestFromArray,
  Toasts
} from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { BaseReferentialFilter, ReferentialFilter } from '../services/filter/referential.filter';
import { HttpEventType } from '@angular/common/http';
import { PopoverController, ToastController } from '@ionic/angular';
import { AppReferentialUtils } from '@app/core/services/model/referential.utils';
import { ReferentialService } from '@app/referential/services/referential.service';
import { ErrorCodes } from '@app/referential/services/errors';

export declare type ReferentialImportPolicy = 'insert-update'|'insert-only'|'update-only'|'delete-only';

@Injectable()
export class ReferentialFileService<
  T extends IReferentialRef<T> = Referential,
  F extends BaseReferentialFilter<F, T> = BaseReferentialFilter<any, any>
>{

  private readonly logPrefix = '[referential-csv-helper] ';
  private readonly translate: TranslateService;
  private readonly toastController: ToastController;
  private readonly popoverController: PopoverController;
  private readonly propertyFormatPipe: PropertyFormatPipe;

  @Input() i18nColumnPrefix: string;
  @Input() dataType: new () => T;
  @Input() dataService: IEntityService<T>;
  @Input() entityName: string;
  @Input() columnDefinitions: FormFieldDefinition[];
  @Input() defaultNewRowValue: () => any;
  @Input() isKnownEntityName: (entityName: string) => boolean;
  @Input() loadByLabel: (label: string, filter: Partial<ReferentialFilter> & {entityName: string}) => Promise<IReferentialRef<any>>
  @Input() loadLevelById: (id: number) => IReferentialRef<any>;
  @Input() loadStatusById: (id: number) => IStatus;
  @Input() importPolicy: ReferentialImportPolicy = 'insert-update';

  constructor(injector: Injector,
              private dataSource: EntitiesTableDataSource<T, F, number>,
              columnDefinitions: FormFieldDefinition[],
              dataService: IEntityService<T>,
              dataType: new () => T) {
    this.translate = injector.get(TranslateService);
    this.toastController = injector.get(ToastController);
    this.popoverController = injector.get(PopoverController);
    this.propertyFormatPipe = injector.get(PropertyFormatPipe);
    this.columnDefinitions = columnDefinitions;
    this.dataService = dataService;
    this.dataType = dataType;
    this.entityName = new dataType()?.entityName;
  }

  async exportToCsv(event?: Event, opts?: {ids?: number[]; context?: any}) {
    const filename = this.getCsvExportFileName(opts?.context);
    const separator = this.getCsvExportSeparator();
    const encoding = this.getExportEncoding();
    const headers = this.columnDefinitions.map(def => def.key);

    const entities = await this.loadEntities(opts);

    const rows = entities.map(data => this.columnDefinitions.map(definition => {
      if (definition.key === 'levelId' && isNotNil(data.levelId) && this.loadLevelById) {
        const levelId = this.loadLevelById(data.levelId);
        return this.propertyFormatPipe.transform({levelId}, definition);
      }
      return this.propertyFormatPipe.transform(data, definition);
    }));

    CsvUtils.exportToFile(rows, {filename, headers, separator, encoding});
  }

  async importFromCsv(event?: Event, filter?: F, opts?: {importPolicy: ReferentialImportPolicy}) {
    let entities: T[];

    try {
      const { data } = await FilesUtils.showUploadPopover(this.popoverController, event, {
        uniqueFile: true,
        fileExtension: '.csv',
        uploadFn: (file) => this.uploadCsvFile(file, filter)
      });

      entities = (data || []).flatMap(file => file.response?.body || []);

    }
    catch (err) {
      const message = err && err.message || err;
      this.showToast({
        type: 'error',
        message: 'REFERENTIAL.ERROR.IMPORT_ENTITIES_ERROR',
        messageParams: { error: message },
        showCloseButton: true,
        duration: -1
      });
      return;
    }

    await this.importEntities(entities, opts);
  }

  protected getCsvExportFileName(context: any): string {
    const key = this.i18nColumnPrefix + 'EXPORT_CSV_FILENAME';
    let filename = this.translate.instant(key, context || {});
    if (filename !== key) return filename;

    return `${changeCaseToUnderscore(this.entityName)}.csv`; // Default filename
  }

  protected getCsvExportSeparator(): string {
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

  protected uploadCsvFile(file: File, dataFilter: F): Observable<FileEvent<T[]>> {
    console.info(this.logPrefix + `Importing CSV file ${file.name}...`);

    const separator = this.getCsvExportSeparator();
    const encoding = this.getExportEncoding();

    return CsvUtils.parseFile(file, {encoding, separator})
      .pipe(
        switchMap(event => {
          if (event.type === HttpEventType.UploadProgress) {
            const loaded = Math.round(event.loaded * 0.8);
            return of({...event, loaded});
          }
          else if (event instanceof FileResponse){
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
    if (!rows || rows.length <= 1) throw {message: 'FILE.CSV.ERROR.EMPTY_FILE'};

    const $progress = new Subject<FileEvent<T[]>>();

    const headerNames = rows.splice(0, 1)[0];
    const total = rows.length;
    console.debug(this.logPrefix + `Importing ${total} rows...`);

    // Check headers
    if (headerNames.length <= 1) {
      const message = this.translate.instant('FILE.CSV.ERROR.NO_HEADER_OR_INVALID_SEPARATOR', {
        separator: this.getCsvExportSeparator()
      });
      throw {message};
    }

    // Check column names
    console.debug(this.logPrefix + `Checking headers: ${headerNames.join(',')}`);
    const expectedHeaders = this.columnDefinitions.map(def => def.key);
    const unknownHeaders = headerNames.filter(h => !expectedHeaders.includes(h));
    if (unknownHeaders.length) {
      const message = this.translate.instant('FILE.CSV.ERROR.UNKNOWN_HEADERS', {
        headers: unknownHeaders.join(', ')
      });
      throw {message};
    }

    $progress.next({type: HttpEventType.UploadProgress, loaded: -1});
    const headers = headerNames.map(key => this.columnDefinitions.find(def => def.key === key));

    this.parseCsvRowsToEntities(headers, rows)
      .then(entities => this.resolveCsvEntityColumns(headers, entities))
      .then(entities => this.fillEntitiesId(entities))
      .then((entities) => {
        $progress.next(new FileResponse({body: entities}));
        $progress.complete();
      })
      .catch(err => $progress.error(err));

    return $progress.asObservable();
  }

  protected async parseCsvRowsToEntities(headers: FormFieldDefinition[], rows: string[][]): Promise<T[]> {
    const defaultValue = this.defaultNewRowValue();
    return rows
      .filter(cells => cells?.length === headers.length)
      .map(cells => {

        // Convert to object
        const source: any = headers.reduce((res, fieldDef, i) => {
          const value = cells[i];

          // Parse sub-object
          const attributes = fieldDef.autocomplete?.attributes;
          if (attributes?.length) {
            res[fieldDef.key] = value?.split(' - ', attributes.length)
              .reduce((o, v, j) => {
                o[attributes[j]] = v;
                return o;
              }, {});
          }
          // Parse simple field
          else {
            if (fieldDef.type === 'integer') {
              res[fieldDef.key] = parseInt(value);
            }
            else if (fieldDef.type === 'double') {
              res[fieldDef.key] = parseFloat(value);
            }
            else {
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
          ...source
        };
      });
  }

  protected async resolveCsvEntityColumns(headers: FormFieldDefinition[], entities: T[]): Promise<T[]> {

    const autocompleteFields = headers.filter(def => def.autocomplete && (!!def.autocomplete.suggestFn || def.autocomplete.items));
    if (isEmptyArray(autocompleteFields)) return entities;

    // Prepare suggest functions, from  autocomplete field
    const suggestFns = autocompleteFields
      .map(def => def.autocomplete)
      .map(autocomplete => {
        return autocomplete.suggestFn
          || (isObservable(autocomplete.items)
            && (async (value, opts) => {
              const items = await firstNotNilPromise(autocomplete.items as Observable<any[]>);
              return suggestFromArray(items, value, opts);
            })
          )
          || ((value, opts) => suggestFromArray(autocomplete.items as any[], value, opts));
      });

    const result: T[] = [];

    // For each entities
    for (let entity of entities) {
      let incomplete = false;

      // For each field to resolve
      for (let i = 0; i < autocompleteFields.length; i++) {
        const field = autocompleteFields[i];
        const suggestFn = suggestFns[i];
        const attributes = field.autocomplete.attributes || [];
        const obj = entity[field.key];
        let resolveObj: any;
        for (let searchAttribute of attributes) {
          const searchValue = obj[searchAttribute];
          if (isNotNilOrBlank(searchValue)) {
            const res = await suggestFn(searchValue, { ...field.autocomplete.filter, searchAttribute });
            const matches = res && (Array.isArray(res) ? res : (res as LoadResult<any>).data);
            if (matches.length === 1) {
              resolveObj = matches[0];
              break;
            }
          }
        }

        // Replace existing object
        if (resolveObj) {
          entity[field.key] = resolveObj;
        }

        // Not resolved: warn
        else if (field.key !== 'parent') {
          incomplete = true;
          console.warn(this.logPrefix + `Cannot resolve field ${field.key}`, obj);
        }

        if (incomplete) break; // Stop if incomplete
      }

      // If complete entity: add to result
      if (!incomplete) result.push(entity)
    }

    // Convert to entity
    return result.map(source => {
      const target: T = new this.dataType();
      target.fromObject(source);
      return target
    });
  }

  protected async fillEntitiesId(entities: T[]): Promise<T[]> {

    if (this.dataService instanceof ReferentialService) return entities;

    await JobUtils.fetchAllPages((offset, size) => {
      return this.dataSource.dataService.watchAll(offset, size, 'id', 'asc', {
        entityName: this.entityName
      } as any).toPromise();
    }, {
      onPageLoaded: ({ data }) => {
        entities.filter(e => isNil(e.id))
          .forEach(entity => {
            // Avoid equals() to use function unique key, instead of id
            entity.id = -1 as any;
            // Try to find the entity (ignoring id)
            const existingEntity = data.find(other => entity.equals(other));

            // Copy ID, or unset
            entity.id = isNotNil(existingEntity) ? existingEntity.id : undefined;
          });
      }
    });

    return entities;
  }

  protected getJsonExportFileName(context: any): string {
    const key = this.i18nColumnPrefix + 'EXPORT_JSON_FILENAME';
    let filename = this.translate.instant(key, context || {});
    if (filename !== key) return filename;

    return `${changeCaseToUnderscore(this.entityName)}.json`; // Default filename
  }

  async exportToJson(event?: Event, opts?: {
    ids?: number[];
    context?: any;
  }) {
    const filename = this.getJsonExportFileName(opts?.context);
    const entities = await this.loadEntities(opts);
    JsonUtils.exportToFile(entities, {filename});
  }


  async importFromJson(event?: Event) {

    const { data } = await FilesUtils.showUploadPopover(this.popoverController, event, {
      uniqueFile: true,
      fileExtension: '.json',
      uploadFn: (file) => this.parseJsonFile(file)
    });

    let sources = (data || []).flatMap(file => file.response?.body || []);
    if (isEmptyArray(sources)) return; // No entities: skip

    return this.importEntities(sources);
  }

  async importEntities(sources: T[], opts?: {importPolicy: ReferentialImportPolicy}) {
    const importPolicy = opts?.importPolicy || this.importPolicy || 'insert-update';

    // Remove entities with id, if policy = 'insert only'
    if (importPolicy === 'insert-only') {
      sources = sources.filter(source => isNil(source.id));
      if (isEmptyArray(sources)) return; // No new entities
    }

    // Sort by ID, to be able to import in the same order
    sources = EntityUtils.sort(sources, 'id', 'asc');

    console.info(`[referential-table] Importing ${sources.length} entities...`, sources);

    let insertCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    const errors = [];

    // Save entities, one by one
    const entities = ((await chainPromises(sources
        // Keep non exists entities
        .filter(source => source
          // Check as label
          && isNotNilOrBlank(source.label)
          // Check expected entity class
          && AppReferentialUtils.getEntityName(source) === this.entityName)
        .map(source => async () => {
          // Clean ids, update_date, etc.
          AppReferentialUtils.cleanIdAndDates(source, false);

          try {
            // Collect all entities
            const missingReferences = [];
            const allSources = AppReferentialUtils.collectEntities(source);

            // For each resource (by not self)
            const internalSources = allSources?.slice(1) || [];
            for (let internalSource of internalSources) {
              const subEntityName = AppReferentialUtils.getEntityName(internalSource);
              const label = internalSource['label'];
              if (subEntityName && isNotNilOrBlank(label) && this.isKnownEntityName(subEntityName)) {
                const existingTarget = await this.loadByLabel(label, {entityName: subEntityName});
                if (existingTarget) {
                  console.debug(`[referential-table] Found match ${subEntityName}#${existingTarget.id} for {label: '${label}'}`);
                  internalSource.id = existingTarget.id;
                }
                else {
                  missingReferences.push(`${subEntityName}#${label}`);
                }
              }
              else {
                // Clean ids, update_date, etc.
                AppReferentialUtils.cleanIdAndDates(internalSource, false);
              }

            }

            if (missingReferences.length) throw this.translate.instant('REFERENTIAL.ERROR.MISSING_REFERENCES', {error: missingReferences.join(', ')})

            const levelId = ReferentialUtils.isNotEmpty(source.levelId) ? source.levelId['id'] : source.levelId;
            const target = new this.dataType();
            let skip = false;
            try {
              const existingTarget = await this.loadByLabel(source.label, {
                entityName: this.entityName, levelId
              });
              target.fromObject({
                ...(existingTarget ? existingTarget.asObject() : {}),
                ...source,
                id: existingTarget?.id,
                updateDate: existingTarget?.updateDate,
                creationDate: existingTarget?.['creationDate']
              });
            } catch (err) {
              // When insert only mode, ignore error when too many reference exists.
              if (err?.code === ErrorCodes.TOO_MANY_REFERENCE_FOUND && importPolicy === 'insert-only') {
                skip = true;
              }
              else throw err;
            }

            const isNew = isNil(target.id);
            skip = skip || (importPolicy === 'insert-only' && !isNew)
              || (importPolicy === 'update-only' && isNew);
            if (skip) {
              skipCount++;
              return null;
            }

            // Check is user can write
            if (!this.dataService.canUserWrite(target)) return; // Cannot write: skip

            // Save
            const savedTarget = await this.dataService.save(target);

            // Update counter
            insertCount += isNew ? 1 : 0;
            updateCount += isNew ? 0 : 1;

            return savedTarget;
          }
          catch (err) {
            let message = err && err.message || err;
            if (typeof message === 'string') message = this.translate.instant(message);
            const fullMessage = this.translate.instant("REFERENTIAL.ERROR.IMPORT_ENTITY_ERROR", {label: source.label, message});
            errors.push(fullMessage);
            console.error(fullMessage);
            return null;
          }
        }))
    ) || []).filter(isNotNil);

    if (isNotEmptyArray(errors)) {
      if (insertCount > 0 || updateCount > 0) {
        console.warn(`[referential-table] Importing ${entities.length} entities [OK] with errors:`, errors);
        this.showToast({
          type: 'warning',
          message: 'REFERENTIAL.INFO.IMPORT_ENTITIES_WARNING',
          messageParams: {insertCount, updateCount, skipCount, errorCount: errors.length, error: `<ul><li>${errors.join('</li><li>')}</li></ul>`},
          showCloseButton: true,
          duration: -1
        });
      }
      else {
        console.error(`[referential-table] Failed to import entities:`, errors);
        this.showToast({
          type: 'error',
          message: 'REFERENTIAL.ERROR.IMPORT_ENTITIES_ERROR',
          messageParams: { error: `<ul><li>${errors.join('</li><li>')}</li></ul>`},
          showCloseButton: true,
          duration: -1
        });
      }
    }
    else {
      console.info(`[referential-table] Importing ${entities.length} entities [OK]`);
      this.showToast({
        type: 'info',
        message: 'REFERENTIAL.INFO.IMPORT_ENTITIES_SUCCEED',
        messageParams: {insertCount, updateCount, skipCount}
      });
    }
  }


  protected  parseJsonFile<T = any>(file: File, opts?: {encoding?: string}): Observable<FileEvent<T[]>> {
    console.info(`[referential-table] Reading JSON file ${file.name}...`);

    return JsonUtils.parseFile(file, {encoding: opts?.encoding})
      .pipe(
        switchMap(event => {
          if (event instanceof FileResponse){
            const body: T[] = Array.isArray(event.body) ? event.body : [event.body];
            return of(new FileResponse({body}));
          }
          // Unknown event: skip
          return of(event);
        }),
        filter(isNotNil)
      );
  }

  protected async loadEntities(opts?: {ids?: number[]}): Promise<T[]> {
    let entities: T[];

    // Load by ids
    if (isNotEmptyArray(opts?.ids)) {

      const loadOpts: EntityServiceLoadOptions & {entityName?: string; statusIds?: number[]} = {fetchPolicy: 'no-cache', fullLoad: true};
      if (this.dataService instanceof ReferentialService) {
        loadOpts.entityName = this.entityName;
      }

      entities = (await chainPromises(opts.ids.map(id => async () => {
        const entity = await this.dataService.load(id, loadOpts);
        return entity?.asObject({keepTypename: true});
      }))).filter(isNotNil);
    }

    // Load from rows
    else {
      entities = this.dataSource.getRows()
        .map(element => element.currentData)
    }

    return entities;
  }

  protected async showToast(opts: ShowToastOptions) {
    if (!this.toastController) throw new Error('Missing toastController in component\'s constructor');
    return Toasts.show(this.toastController, this.translate, opts);
  }
}

