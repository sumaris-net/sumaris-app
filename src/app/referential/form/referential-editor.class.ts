import { Directive, Injector } from '@angular/core';
import { AbstractControl, UntypedFormGroup } from '@angular/forms';
import {
  AccountService,
  AppEditorOptions,
  AppEntityEditor, BaseReferential,
  changeCaseToUnderscore,
  EntityServiceLoadOptions,
  EntityUtils,
  firstNotNilPromise,
  FormFieldDefinition,
  FormFieldDefinitionMap,
  HistoryPageReference,
  IEntityService,
  isNil,
  isNotNil,
  Referential,
  ReferentialRef,
  ReferentialUtils,
  WaitForOptions
} from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '../services/referential-ref.service';
import { environment } from '@environments/environment';
import { ReferentialService } from '@app/referential/services/referential.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AppReferentialEditorOptions extends AppEditorOptions {
  entityName: string;
  uniqueLabel?: boolean;
  withLevels?: boolean;
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppReferentialEditor<
  T extends BaseReferential<T, ID>,
  S extends IEntityService<T, ID> = IEntityService<T, any>,
  ID = number
  >
  extends AppEntityEditor<T, S, ID> {

  readonly mobile: boolean;
  readonly entityName: string;
  readonly uniqueLabel: boolean;
  readonly form: UntypedFormGroup;
  readonly fieldDefinitions: FormFieldDefinitionMap = {};

  readonly withLevels: boolean;
  readonly $levels = new BehaviorSubject<ReferentialRef[]>(undefined);

  protected accountService: AccountService;
  protected referentialService: ReferentialService;
  protected referentialRefService: ReferentialRefService;
  protected _logPrefix: string;

  constructor(
    protected injector: Injector,
    dataType: new () => T,
    dataService: S,
    form: UntypedFormGroup,
    opts: AppReferentialEditorOptions
  ) {
    super(injector,
      dataType,
      dataService,
      {
        i18nPrefix: opts?.i18nPrefix
          || `REFERENTIAL.${changeCaseToUnderscore(opts.entityName).toUpperCase()}.`,
        ...opts
      }
    );
    this.accountService = injector.get(AccountService);
    this.referentialService = injector.get(ReferentialService);
    this.referentialRefService = injector.get(ReferentialRefService);

    this.mobile = this.settings.mobile;
    this.entityName = opts.entityName;
    this.form = form;

    // default values
    this.uniqueLabel = opts?.uniqueLabel === true;
    this.defaultBackHref = `/referential/list?entity=${this.entityName}`;
    this._logPrefix = this.entityName
      ? `[${changeCaseToUnderscore(this.entityName).replace(/_/g, '-')}-page] `
      : '[referential-page] ';
    this.debug = !environment.production;
    this.withLevels = opts?.withLevels || false;

    if (this.withLevels) {
      this.loadLevels();
    }
  }

  ngOnInit() {
    super.ngOnInit();
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    await super.ready(opts);

    // Wait levels to be loaded
    if (this.withLevels) await firstNotNilPromise(this.$levels);
  }

  load(id?: ID, opts?: EntityServiceLoadOptions & { emitEvent?: boolean; openTabIndex?: number; updateTabAndRoute?: boolean; [p: string]: any }): Promise<void> {
    return super.load(id, {entityName: this.entityName, ...opts});
  }

  listenChanges(id: ID, opts?: any): Observable<T|undefined> {
    return super.listenChanges(id, {...opts, entityName: this.entityName});
  }

  enable() {
    super.enable();

    if (this.uniqueLabel && !this.isNewData) {
      this.form.get('label').disable();
    }
  }

  /* -- protected methods -- */

  protected registerFieldDefinition(opts: FormFieldDefinition) {
    this.fieldDefinitions[opts.key] = opts;
  }

  protected setValue(data: T) {
    if (!data) return; // Skip

    const json = data.asObject();

    // Load level as an object
    if (this.withLevels && isNotNil(data.levelId) && typeof data.levelId === 'number') {
      json.levelId = (this.$levels.value || []).find(l => l.id === data.levelId);
    }

    json.entityName = json.entityName || this.entityName;

    this.form.patchValue(json, {emitEvent: false});

    this.markAsPristine();
  }

  protected async getValue(): Promise<T> {
    const data = await super.getValue();

    // Re add label, because missing when field disable
    if (this.uniqueLabel) {
      data.label = this.form.get('label').value;
      data.label = data.label && data.label.toUpperCase();
    }

    // Transform level object into levelId
    if (this.withLevels && isNotNil(data.levelId)) {
      data.levelId = ReferentialUtils.isNotEmpty(data.levelId) ? (data.levelId as unknown as any).id : data.levelId;
    }

    return data;
  }

  protected computeTitle(data: T): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return this.translate.get(this.i18nContext.prefix + 'NEW.TITLE').toPromise();
    }

    // Existing data
    return this.translate.get(this.i18nContext.prefix + 'EDIT.TITLE', data).toPromise();
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      title: `${this.data.label} - ${this.data.name}`,
      subtitle: `REFERENTIAL.ENTITY.${changeCaseToUnderscore(this.entityName).toUpperCase()}`,
      icon: 'list'
    };
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.form.invalid) return 0;
    return -1;
  }

  protected async onNewEntity(data: T, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onNewEntity(data, options);

    // Check label is unique
    if (this.uniqueLabel) {
    this.form.get('label')
      .setAsyncValidators(async (control: AbstractControl) => {
        const label = control.enabled && control.value;
        const filter = {
          entityName: this.entityName,
          excludedIds: isNotNil(this.data.id) ? [this.data.id as unknown as number] : undefined
        };
        return label && (await this.referentialService.existsByLabel(label, filter)) ? {unique: true} : null;
      });
    }

    this.markAsReady();
  }

  protected async onEntityLoaded(data: T, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onEntityLoaded(data, options);

    this.markAsReady();
  }

  async loadLevels() {
    const levels = await this.referentialRefService.loadLevels(this.entityName);

    const sortAttributes = this.fieldDefinitions.level?.autocomplete.attributes;
    if (sortAttributes.length) {
      levels.sort(EntityUtils.sortComparator('label', 'asc'));
    }
    this.$levels.next(levels);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}

