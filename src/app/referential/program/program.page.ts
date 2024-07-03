import { ChangeDetectionStrategy, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { TableElement, ValidatorService } from '@e-is/ngx-material-table';
import { UntypedFormBuilder, UntypedFormGroup, ValidationErrors } from '@angular/forms';
import { Program } from '../services/model/program.model';
import { ProgramSaveOptions, ProgramService } from '../services/program.service';
import { ReferentialForm } from '../form/referential.form';
import { ProgramValidatorService } from '../services/validator/program.validator';
import { StrategiesTable } from '../strategy/strategies.table';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import {
  AccountService,
  AppEntityEditor,
  AppListForm,
  AppPropertiesForm,
  AppTable,
  changeCaseToUnderscore,
  ConfigService,
  EntityServiceLoadOptions,
  EntityUtils,
  fadeInOutAnimation,
  FormFieldDefinition,
  FormFieldDefinitionMap,
  HistoryPageReference,
  IEntity,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  OnReady,
  Property,
  ReferentialRef,
  referentialToString,
  ReferentialUtils,
  removeDuplicatesFromArray,
  SharedValidators,
  StatusIds,
  SuggestFn,
  toBoolean,
} from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '../services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { ProgramProperties, StrategyEditor } from '../services/config/program.config';
import { ISelectReferentialModalOptions, SelectReferentialModal } from '../table/select-referential.modal';
import { environment } from '@environments/environment';
import { Strategy } from '../services/model/strategy.model';
import { SamplingStrategiesTable } from '../strategy/sampling/sampling-strategies.table';
import { PersonPrivilegesTable } from '@app/referential/program/privilege/person-privileges.table';
import { LocationLevels } from '@app/referential/services/model/model.enum';
import { RxState } from '@rx-angular/state';
import { ReferentialImportPolicy } from '@app/referential/table/referential-file.service';
import { PropertiesFileService } from '@app/referential/properties/properties-file.service';
import { REFERENTIAL_CONFIG_OPTIONS } from '@app/referential/services/config/referential.config';

export const PROGRAM_TABS = {
  GENERAL: 0,
  LOCATIONS: 1,
  STRATEGIES: 2,
  OPTIONS: 3,
  PERSONS: 4,
};

export interface ProgramPageState {
  strategiesTables: AppTable<Strategy>;
}

@Component({
  selector: 'app-program',
  templateUrl: 'program.page.html',
  styleUrls: ['./program.page.scss'],
  providers: [{ provide: ValidatorService, useExisting: ProgramValidatorService }, RxState],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramPage extends AppEntityEditor<Program, ProgramService> implements OnInit, OnReady {
  readonly TABS = PROGRAM_TABS;
  readonly mobile: boolean;

  protected readonly strategiesTable$ = this._state.select('strategiesTables');
  protected readonly importPolicies: ReferentialImportPolicy[] = ['insert-update', 'insert-only', 'update-only'];

  protected propertyDefinitions: FormFieldDefinition[];
  protected fieldDefinitions: FormFieldDefinitionMap = {};
  protected form: UntypedFormGroup;
  protected i18nFieldPrefix = 'PROGRAM.';
  protected strategyEditor: StrategyEditor = 'legacy';
  protected i18nTabStrategiesSuffix = '';
  protected readOnlyPrivilegesByConfig = toBoolean(REFERENTIAL_CONFIG_OPTIONS.PROGRAM_PRIVILEGE_READONLY.defaultValue);
  protected readOnlyPrivilegesByProgram = toBoolean(ProgramProperties.PROGRAM_PRIVILEGE_READONLY.defaultValue);

  protected propertiesFileService: PropertiesFileService;

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;
  @ViewChild('propertiesForm', { static: true }) propertiesForm: AppPropertiesForm;
  @ViewChild('locationClassificationList', { static: true }) locationClassificationList: AppListForm;
  @ViewChild('legacyStrategiesTable', { static: true }) legacyStrategiesTable: StrategiesTable;
  @ViewChild('samplingStrategiesTable', { static: true }) samplingStrategiesTable: SamplingStrategiesTable;
  @ViewChild('personsTable', { static: true }) personsTable: PersonPrivilegesTable;
  @ViewChild('locationList', { static: true }) locationList: AppListForm<ReferentialRef>;

  get readOnlyPrivileges(): boolean {
    return this.readOnlyPrivilegesByConfig || this.readOnlyPrivilegesByProgram;
  }

  get strategiesTable(): AppTable<Strategy> {
    return this._state.get('strategiesTables');
  }

  set strategiesTable(value: AppTable<Strategy>) {
    this._state.set('strategiesTables', () => value);
  }

  @Input() set propertiesImportPolicy(value: ReferentialImportPolicy) {
    if (this.propertiesFileService && this.enabled) this.propertiesFileService.importPolicy = value;
  }

  get propertiesImportPolicy(): ReferentialImportPolicy {
    return this.propertiesFileService?.importPolicy || 'insert-update';
  }

  constructor(
    protected injector: Injector,
    protected programService: ProgramService,
    protected formBuilder: UntypedFormBuilder,
    protected accountService: AccountService,
    protected validatorService: ProgramValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    protected configService: ConfigService,
    protected _state: RxState<ProgramPageState>
  ) {
    super(injector, Program, programService, {
      pathIdAttribute: 'programId',
      autoOpenNextTab: false,
      tabCount: 5,
    });
    this.form = validatorService.getFormGroup();
    this.propertiesFileService = new PropertiesFileService(this.injector);

    // default values
    this.mobile = this.settings.mobile;
    this.defaultBackHref = '/referential/programs';
    this._enabled = this.accountService.isAdmin();

    this.propertyDefinitions = Object.values(ProgramProperties).map((def) => {
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

    // Set entity name (required for referential form validator)
    this.referentialForm.entityName = 'Program';

    // Check label is unique
    // TODO BLA: FIXME: le control reste en pending !
    const idControl = this.form.get('id');
    this.form.get('label').setAsyncValidators(async (control) => {
      console.debug('[program-page] Checking of label is unique...');
      const exists = await this.programService.existsByLabel(
        control.value,
        {
          excludedIds: isNotNil(idControl.value) ? [idControl.value] : undefined,
        },
        { fetchPolicy: 'network-only' }
      );
      if (exists) {
        console.warn('[program-page] Label not unique!');
        return <ValidationErrors>{ unique: true };
      }

      console.debug('[program-page] Checking of label is unique [OK]');
      SharedValidators.clearError(control, 'unique');
    });

    this.registerFormField('gearClassification', {
      type: 'entity',
      autocomplete: {
        suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
        filter: {
          entityName: 'GearClassification',
        },
      },
    });

    this.registerFormField('taxonGroupType', {
      key: 'taxonGroupType',
      type: 'entity',
      autocomplete: {
        suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
        filter: {
          entityName: 'TaxonGroupType',
        },
      },
    });

    this.markAsReady();
  }

  async ngOnReady() {
    if (this.debug) console.debug(`${this._logPrefix} Page is ready!`);
    const config = await this.configService.ready();

    this.readOnlyPrivilegesByConfig = config.getPropertyAsBoolean(REFERENTIAL_CONFIG_OPTIONS.PROGRAM_PRIVILEGE_READONLY);
  }

  load(id?: number, opts?: EntityServiceLoadOptions): Promise<void> {
    // Force the load from network
    return super.load(id, { ...opts, fetchPolicy: 'network-only' });
  }

  async save(event?: Event, opts?: ProgramSaveOptions): Promise<boolean> {
    return super.save(event, {
      ...opts,
      // Save privileges only if NOT readonly
      withPersons: !this.readOnlyPrivileges,
      // Department privileges not implemented
      withDepartments: false,
    });
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.enable(opts);

    // TODO BLA remove this ?
    this.locationClassificationList.enable(opts);

    if (!this.isNewData) {
      this.form.get('label').disable();
    }
  }

  /* -- protected methods -- */

  protected registerForms() {
    this.addForms([this.referentialForm, this.propertiesForm, this.locationClassificationList, this.locationList, this.personsTable]);
  }

  protected registerFormField(fieldName: string, def: Partial<FormFieldDefinition>) {
    const definition = <FormFieldDefinition>{
      key: fieldName,
      label: this.i18nFieldPrefix + changeCaseToUnderscore(fieldName).toUpperCase(),
      ...def,
    };
    this.fieldDefinitions[fieldName] = definition;
  }

  protected async onNewEntity(data: Program, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onNewEntity(data, options);
    this.markAsReady();
  }

  protected async onEntityLoaded(data: Program, options?: EntityServiceLoadOptions): Promise<void> {
    await this.loadEntityProperties(data);
    await super.onEntityLoaded(data, options);

    this.strategyEditor = (data && data.getProperty<StrategyEditor>(ProgramProperties.STRATEGY_EDITOR)) || 'legacy';
    this.i18nTabStrategiesSuffix = this.strategyEditor === 'sampling' ? 'SAMPLING.' : '';
    this.readOnlyPrivilegesByProgram = data.getPropertyAsBoolean(ProgramProperties.PROGRAM_PRIVILEGE_READONLY);

    this.cd.detectChanges();
    this.markAsReady();
  }

  protected async onEntitySaved(data: Program): Promise<void> {
    await this.onEntityLoaded(data);
    await super.onEntitySaved(data);
  }

  setValue(data: Program) {
    data = data || new Program();

    this.form.patchValue({ ...data, properties: [], locationClassifications: [], strategies: [], persons: [] }, { emitEvent: false });

    // Program properties
    this.propertiesForm.value = EntityUtils.getMapAsArray(data.properties);

    // Location classification
    this.locationClassificationList.setValue(data.locationClassifications || []);

    // Locations
    this.locationList.setValue(data.locations || []);

    // Users
    this.personsTable.setValue(data.persons || []);

    this.markForCheck();
  }

  protected async loadEntityProperties(data: Program | null) {
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

  protected async getJsonValueToSave(): Promise<any> {
    const data = await super.getJsonValueToSave();

    // Re add label, because missing when field disable
    data.label = this.form.get('label').value;

    // Get properties
    data.properties = this.getPropertiesValue();

    // Users
    if (this.personsTable.dirty) {
      await this.personsTable.save();
    }
    data.persons = this.personsTable.value;

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

  protected computeTitle(data: Program): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return this.translate.instant('PROGRAM.NEW.TITLE');
    }

    // Existing data
    return this.translate.instant('PROGRAM.EDIT.TITLE', data);
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      icon: 'contract',
      title: `${this.data.label} - ${this.data.name}`,
      subtitle: 'REFERENTIAL.ENTITY.PROGRAM',
    };
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return PROGRAM_TABS.GENERAL;
    if (this.locationList.invalid) return PROGRAM_TABS.LOCATIONS;
    if (this.strategiesTable?.invalid) return PROGRAM_TABS.STRATEGIES;
    if (this.propertiesForm.invalid) return PROGRAM_TABS.OPTIONS;
    if (this.personsTable.invalid) return PROGRAM_TABS.PERSONS;
    return PROGRAM_TABS.GENERAL;
  }

  async addLocationClassification() {
    if (this.disabled) return; // Skip

    const items = await this.openSelectReferentialModal({
      allowMultipleSelection: true,
      filter: {
        entityName: 'LocationClassification',
      },
    });

    // Add to list
    (items || []).forEach((item) => this.locationClassificationList.add(item));

    this.markForCheck();
  }

  async addLocation() {
    if (this.disabled) return; // Skip

    const classificationIds = (this.locationClassificationList.value || []).map((item) => item.id);
    const rectangleLocationLevelIds = LocationLevels.getStatisticalRectangleLevelIds();
    const levelIds = (
      await this.referentialRefService.loadAll(0, 1000, null, null, {
        entityName: 'LocationLevel',
        levelIds: classificationIds,
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      })
    )?.data
      .map((item) => item.id)
      // Exclude rectangle level ids
      .filter((levelId) => !rectangleLocationLevelIds.includes(levelId));
    const excludedIds = (this.locationList.value || []).map((item) => item.id);
    const items = await this.openSelectReferentialModal({
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
        levelIds,
        excludedIds,
      },
    });

    // Add to list
    (items || []).forEach((item) => this.locationList.add(item));

    this.markForCheck();
  }

  async onOpenStrategy<T extends IEntity<any>>(row: TableElement<T>) {
    const saved = await this.saveIfDirtyAndConfirm();
    if (!saved) return; // Cannot save

    this.markAsLoading();

    setTimeout(async () => {
      await this.router.navigate(['referential', 'programs', this.data.id, 'strategies', this.strategyEditor, row.currentData.id], {
        queryParams: {},
      });
      this.markAsLoaded();
    });
  }

  async onNewStrategy(event?: any) {
    const savedOrContinue = await this.saveIfDirtyAndConfirm();
    if (savedOrContinue) {
      this.markAsLoading();

      setTimeout(async () => {
        await this.router.navigate(['referential', 'programs', this.data.id, 'strategies', this.strategyEditor, 'new'], {
          queryParams: {},
        });
        this.markAsLoaded();
      });
    }
  }

  protected async openSelectReferentialModal(opts: ISelectReferentialModalOptions): Promise<ReferentialRef[]> {
    const hasTopModal = !!(await this.modalCtrl.getTop());
    const modal = await this.modalCtrl.create({
      component: SelectReferentialModal,
      componentProps: opts,
      keyboardClose: true,
      backdropDismiss: false,
      cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large',
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    return data;
  }

  protected exportPropertiesToCsv() {
    if (this.isNewData) return; // Skip if new
    const properties = this.getPropertiesValue();
    this.propertiesFileService.exportToCsv(properties, { context: { label: this.data.label } });
  }

  protected async uploadPropertiesFromCsv(event?: Event) {
    if (!this.enabled || this.loading) return; // skip

    this.markAsLoading();

    try {
      const properties = await this.propertiesFileService.uploadPropertiesFromCsv(event);

      switch (this.propertiesImportPolicy) {
        case 'insert-update':
          // Use imported properties first, and remove old
          this.propertiesForm.value = removeDuplicatesFromArray([...properties, ...this.propertiesForm.value], 'key');
          break;
        case 'insert-only':
          // Prefer existing properties, then insert new
          this.propertiesForm.value = removeDuplicatesFromArray([...this.propertiesForm.value, ...properties], 'key');
          break;
        case 'update-only':
          this.propertiesForm.value = (this.propertiesForm.value || []).map((target) => {
            return properties.find((p) => p.key === target.key) || target;
          });
          break;
      }

      this.markAsDirty();
    } catch (err) {
      this.setError(err);
      this.selectedTabIndex = PROGRAM_TABS.GENERAL;
    } finally {
      this.markAsLoaded();
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  referentialToString = referentialToString;
  referentialEquals = ReferentialUtils.equals;
}
