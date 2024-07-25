import { ChangeDetectionStrategy, Component, Injector, OnInit, ViewChild } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Strategy } from '../services/model/strategy.model';
import {
  AccountService,
  Alerts,
  AppEntityEditor,
  AppPropertiesForm,
  ConfigService,
  EntityServiceLoadOptions,
  EntityUtils,
  firstNotNilPromise,
  FormFieldDefinition,
  HistoryPageReference,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  Property,
  SuggestFn,
  toBoolean,
} from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '../services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { StrategyForm } from './strategy.form';
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { StrategyService } from '../services/strategy.service';
import { BehaviorSubject } from 'rxjs';
import { Program } from '../services/model/program.model';
import { ReferentialForm } from '../form/referential.form';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ProgramRefService } from '../services/program-ref.service';
import { TranscribingItemTable } from '@app/referential/transcribing/transcribing-item.table';
import { PROGRAM_TABS } from '@app/referential/program/program.page';
import { PROGRAMS_PAGE_PATH } from '@app/referential/program/programs.page';
import { REFERENTIAL_CONFIG_OPTIONS } from '@app/referential/services/config/referential.config';
import { StrategyProperties } from '../services/config/strategy.config';

@Component({
  selector: 'app-strategy',
  templateUrl: 'strategy.page.html',
  styleUrls: ['./strategy.page.scss'],
  providers: [{ provide: ValidatorService, useExisting: StrategyValidatorService }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategyPage extends AppEntityEditor<Strategy, StrategyService> implements OnInit {
  private initialPmfmCount: number;
  protected propertyDefinitions: FormFieldDefinition[];

  $program = new BehaviorSubject<Program>(null);
  showImportModal = false;
  showPmfmLabel = true;

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;
  @ViewChild('strategyForm', { static: true }) strategyForm: StrategyForm;
  @ViewChild('propertiesForm', { static: true }) propertiesForm: AppPropertiesForm;

  get form(): UntypedFormGroup {
    return this.strategyForm.form;
  }

  constructor(
    protected injector: Injector,
    protected formBuilder: UntypedFormBuilder,
    protected accountService: AccountService,
    protected validatorService: StrategyValidatorService,
    dataService: StrategyService,
    protected programRefService: ProgramRefService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    protected configService: ConfigService
  ) {
    super(injector, Strategy, dataService, {
      pathIdAttribute: 'strategyId',
    });

    // default values
    this._enabled = this.accountService.isAdmin();
    this.tabCount = 5;

    this.propertyDefinitions = Object.values(StrategyProperties).map((def: FormFieldDefinition) => {
      // Add default configuration for entity/entities
      if (def.type === 'entity' || def.type === 'entities') {
        def = Object.assign({}, def); // Copy
        def.autocomplete = {
          suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
          attributes: ['label', 'name'],
          ...(def.autocomplete || {}),
        };
      }
      return def;
    });

    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.registerSubscription(
      this.referentialForm.form.valueChanges
        .pipe(
          debounceTime(100),
          filter(() => this.referentialForm.valid),
          // DEBUG
          tap((value) => console.debug('[strategy-page] referentialForm value changes:', value))
        )
        .subscribe((value) => this.strategyForm.form.patchValue({ ...value, entityName: undefined }))
    );

    // Update back href, when program changed
    this.registerSubscription(this.$program.subscribe((program) => this.setProgram(program)));
  }

  setError(err: any) {
    // Special case when user cancelled save. See strategy form
    if (err === 'CANCELLED') {
      this.askConfirmationToReload();
      return;
    }

    super.setError(err);
  }

  async load(id?: number, opts?: EntityServiceLoadOptions): Promise<void> {
    // Force the load from network
    return super.load(id, { ...opts, fetchPolicy: 'network-only' });
  }

  canUserWrite(data: Strategy, opts?: any): boolean {
    return super.canUserWrite(data, {
      ...opts,
      // Important: sent the opts.program, to check if user is a program manager
      program: this.$program.value,
    });
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.enable(opts);

    if (!this.isNewData) {
      this.form.get('label').disable();
    }
  }

  /* -- protected methods -- */

  protected registerForms() {
    this.addForms([this.referentialForm, this.strategyForm, this.propertiesForm]);
  }

  protected async onNewEntity(data: Strategy, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onNewEntity(data, options);
    data.programId = options.programId;

    const program = await this.programRefService.load(data.programId);
    this.$program.next(program);
  }

  protected async onEntityLoaded(data: Strategy, options?: EntityServiceLoadOptions): Promise<void> {
    await this.loadEntityProperties(data);
    await super.onEntityLoaded(data, options);
    const program = await this.programRefService.load(data.programId);
    this.$program.next(program);
  }

  protected async setProgram(program: Program) {
    if (isNotNil(program?.id)) {
      const config = await this.configService.ready();

      // DEBUG
      //console.log('config loaded', config?.getPropertyAsBoolean(REFERENTIAL_CONFIG_OPTIONS.PMFM_LABEL_ENABLE));

      this.showPmfmLabel = toBoolean(config?.getPropertyAsBoolean(REFERENTIAL_CONFIG_OPTIONS.PMFM_LABEL_ENABLE), true);

      const programPath = [PROGRAMS_PAGE_PATH, program.id].join('/');
      this.defaultBackHref = `${programPath}?tab=${PROGRAM_TABS.STRATEGIES}`;
      this.markAsReady();
      this.markForCheck();
    }
  }

  async setValue(data: Strategy) {
    if (!data) return; // Skip

    this.referentialForm.setValue(data);

    // Strategy properties
    this.propertiesForm.value = EntityUtils.getMapAsArray(data.properties);

    await this.strategyForm.updateView(data);

    // Remember count - see getJsonValueToSave()
    this.initialPmfmCount = data.pmfms?.length;

    this.markAsPristine();
  }

  protected async getJsonValueToSave(): Promise<any> {
    if (this.strategyForm.dirty) {
      const saved = await this.strategyForm.save();
      if (!saved) return; // Skip
    }
    const data = this.strategyForm.form.value;

    // Re add label, because missing when field disable
    data.label = this.referentialForm.form.get('label').value;

    // Get properties
    data.properties = this.getPropertiesValue();

    console.debug('[strategy-page] JSON value to save:', data);

    // Workaround to avoid to many PMFM_STRATEGY deletion
    const deletedPmfmCount = (this.initialPmfmCount || 0) - (data.pmfms?.length || 0);
    if (deletedPmfmCount > 1) {
      const confirm = await Alerts.askConfirmation('PROGRAM.STRATEGY.CONFIRM.MANY_PMFM_DELETED', this.alertCtrl, this.translate, null, {
        count: deletedPmfmCount,
      });
      if (!confirm) throw 'CANCELLED'; // Stop
    }

    return data;
  }

  protected getPropertiesValue() {
    const properties = this.propertiesForm.value;

    // Serialize properties
    properties
      .filter((property) => this.propertyDefinitions.find((def) => def.key === property.key && (def.type === 'entity' || def.type === 'entities')))
      .forEach((property) => {
        if (Array.isArray(property.value)) {
          property.value = property.value
            .map((v) => v?.id)
            .filter(isNotNil)
            .join(',');
        } else {
          property.value = (property.value as any)?.id;
        }
      });
    properties
      .filter((property) => this.propertyDefinitions.find((def) => def.key === property.key && def.type === 'enums'))
      .forEach((property) => {
        if (Array.isArray(property.value)) {
          property.value = property.value
            .map((v) => v?.key)
            .filter(isNotNil)
            .join(',');
        } else {
          property.value = (property.value as any)?.key;
        }
      });
    return properties;
  }

  protected async loadEntityProperties(data: Strategy | null) {
    await Promise.all(
      Object.keys(data.properties)
        .map((key) =>
          this.propertyDefinitions.find((def) => def.key === key && (def.type === 'entity' || def.type === 'entities' || def.type === 'enums'))
        )
        .filter(isNotNil)
        .map(async (def) => {
          let value = data.properties[def.key];
          switch (def.type) {
            case 'entity': {
              value = typeof value === 'string' ? value.trim() : value;
              if (isNotNilOrBlank(value)) {
                const entity = await this.resolveEntity(def, value);
                data.properties[def.key] = entity;
              } else {
                data.properties[def.key] = null;
              }
              break;
            }
            case 'entities': {
              const values = (value || '').trim().split(/[|,]+/);
              if (isNotEmptyArray(values)) {
                const entities = await Promise.all(values.map((v) => this.resolveEntity(def, v)));
                data.properties[def.key] = entities;
              } else {
                data.properties[def.key] = null;
              }
              break;
            }
            case 'enums': {
              const keys = (value || '').trim().split(/[|,]+/);
              if (isNotEmptyArray(keys)) {
                const enumValues = keys.map((key) =>
                  (def.values as (string | Property)[])?.find((defValue) => defValue && key === (defValue['key'] || defValue))
                );
                data.properties[def.key] = enumValues || null;
              } else {
                data.properties[def.key] = null;
              }
              break;
            }
          }
        })
    );
  }

  protected async resolveEntity(def: FormFieldDefinition, value: any): Promise<any> {
    if (!def.autocomplete) {
      console.warn('Missing autocomplete, in definition of property ' + def.key);
      return; // Skip
    }

    const filter = Object.assign({}, def.autocomplete.filter); // Copy filter
    const joinAttribute = def.autocomplete.filter?.joinAttribute || 'id';
    if (joinAttribute === 'id') {
      filter.id = parseInt(value);
      value = '*';
    } else {
      filter.searchAttribute = joinAttribute;
    }
    const suggestFn: SuggestFn<any, any> = def.autocomplete.suggestFn || this.referentialRefService.suggest;
    try {
      // Fetch entity, as a referential
      const res = await suggestFn(value, filter);
      const data = Array.isArray(res) ? res : res.data;
      return ((data && data[0]) || { id: value, label: '??' }) as any;
    } catch (err) {
      console.error('Cannot fetch entity, from option: ' + def.key + '=' + value, err);
      return { id: value, label: '??' };
    }
  }

  protected async downloadAsJson(event?: Event, opts = { keepRemoteId: false }) {
    if (event?.defaultPrevented) return false; // Skip
    event?.preventDefault(); // Avoid propagation

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const saved =
      this.dirty && this.valid
        ? // If on field mode AND valid: save silently
          await this.save(event)
        : // Else If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm();
    if (!saved) return; // not saved

    // Download as JSON
    await this.service.downloadAsJson(this.data, {
      keepRemoteId: false,
      ...opts,
      program: this.$program.value,
    });
  }

  protected async askConfirmationToReload() {
    const confirm = await Alerts.askConfirmation('PROGRAM.STRATEGY.CONFIRM.RELOAD_PAGE', this.alertCtrl, this.translate, null);
    if (confirm) {
      return this.reload();
    }
  }

  protected async computeTitle(data: Strategy): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return this.translate.get('PROGRAM.STRATEGY.NEW.TITLE').toPromise();
    }

    // Existing data
    const program = await firstNotNilPromise(this.$program);
    return this.translate.instant('PROGRAM.STRATEGY.EDIT.TITLE', {
      program: program.label,
      label: data.label || '#' + data.id,
    });
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      matIcon: 'date_range',
      title: `${this.data.label} - ${this.data.name}`,
      subtitle: 'REFERENTIAL.ENTITY.PROGRAM',
    };
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return 0;
    if (this.strategyForm.invalid) return 1;
    return -1;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected initTranscribingItemTable(table: TranscribingItemTable) {}

  protected startImport(event?: Event) {}
}
