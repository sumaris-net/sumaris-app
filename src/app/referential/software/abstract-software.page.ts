import { Directive, inject, Injector, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, UntypedFormGroup } from '@angular/forms';
import {
  AccountService,
  AppEditorOptions,
  AppEntityEditor,
  AppPropertiesForm,
  CORE_CONFIG_OPTIONS,
  EntityServiceLoadOptions,
  FormFieldDefinition,
  FormFieldDefinitionMap,
  FormFieldDefinitionUtils,
  IEntityService,
  isNil,
  MatAutocompleteFieldConfig,
  PlatformService,
  ReferentialRef,
  Software,
} from '@sumaris-net/ngx-components';
import { ReferentialForm } from '../form/referential.form';
import { SoftwareService } from '../services/software.service';
import { SoftwareValidatorService } from '../services/validator/software.validator';
import { ReferentialRefService } from '../services/referential-ref.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AbstractSoftwarePage<T extends Software<T>, S extends IEntityService<T>> extends AppEntityEditor<T, S> implements OnInit {
  protected accountService: AccountService = inject(AccountService);
  protected platform: PlatformService = inject(PlatformService);
  protected referentialRefService: ReferentialRefService = inject(ReferentialRefService);

  protected propertyDefinitions: FormFieldDefinition[];
  protected form: UntypedFormGroup;

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;

  @ViewChild('propertiesForm', { static: true }) propertiesForm: AppPropertiesForm;

  protected constructor(
    injector: Injector,
    dataType: new () => T,
    dataService: S,
    protected validatorService: SoftwareValidatorService,
    configOptions: FormFieldDefinitionMap,
    options?: AppEditorOptions
  ) {
    super(injector, dataType, dataService, options);

    // Default autocomplete config
    const defaultAutocomplete = <Partial<MatAutocompleteFieldConfig<ReferentialRef, ReferentialRefFilter>>>{
      suggestFn: (value, filter, sortBy, sortDirection, opts) =>
        this.referentialRefService.suggest(value, filter, sortBy as keyof ReferentialRef, sortDirection, { withProperties: true, ...opts }),
      attributes: ['label', 'name'],
    };
    // Convert map to list of options
    const propertyDefinitions = Object.values({ ...CORE_CONFIG_OPTIONS, ...configOptions }).map((def) => {
      if (def.type === 'entity' || def.type === 'entities') {
        def = {
          ...def,
          autocomplete: {
            ...defaultAutocomplete,
            ...(def.autocomplete || {}),
          },
        };
      }
      return def;
    });

    // Resolve (injection tokens)
    this.propertyDefinitions = FormFieldDefinitionUtils.prepareDefinitions(injector, propertyDefinitions);

    this.form = validatorService.getFormGroup();
  }

  ngOnInit() {
    super.ngOnInit();

    // Set entity name (required for referential form validator)
    this.referentialForm.entityName = 'Software';

    // Check label is unique
    if (this.service instanceof SoftwareService) {
      const softwareService = this.service as SoftwareService;
      this.form.get('label').setAsyncValidators(async (control: AbstractControl) => {
        const label = control.enabled && control.value;
        return label && (await softwareService.existsByLabel(label)) ? { unique: true } : null;
      });
    }
  }

  /* -- protected methods -- */

  enable() {
    super.enable();

    if (!this.isNewData) {
      this.form.get('label').disable();
    }
  }

  protected registerForms() {
    this.addForms([this.referentialForm, this.propertiesForm]);
  }

  protected async loadFromRoute(): Promise<void> {
    // Make sure the platform is ready, before loading configuration
    await this.platform.ready();

    return super.loadFromRoute();
  }

  setValue(data: T) {
    if (!data) return; // Skip

    const json = data.asObject();
    delete json.properties;

    this.form.patchValue(json, { emitEvent: false });
    this.propertiesForm.setValue(data.properties || {});

    this.markAsPristine();
  }

  protected async getJsonValueToSave(): Promise<any> {
    const json = await super.getJsonValueToSave();

    // Re add label, because missing when field disable
    json.label = this.form.get('label').value;

    // Get properties
    json.properties = this.propertiesForm.getValueAsJson();

    return json;
  }

  protected computeTitle(data: T): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return this.translate.get('CONFIGURATION.NEW.TITLE').toPromise();
    }

    return this.translate.get('CONFIGURATION.EDIT.TITLE', data).toPromise();
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return 0;
    if (this.propertiesForm.invalid) return 1;
    return -1;
  }

  protected async onEntityLoaded(data: T, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onEntityLoaded(data, options);
    this.markAsReady();
  }

  protected async onEntitySaved(data: T): Promise<void> {
    await super.onEntitySaved(data);
    this.markAsReady();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
