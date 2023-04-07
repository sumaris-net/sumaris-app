import {ChangeDetectorRef, Directive, Injector, ViewChild} from '@angular/core';
import {AbstractControl, UntypedFormGroup} from '@angular/forms';
import {
  AccountService,
  AppEditorOptions,
  AppEntityEditor,
  AppPropertiesForm,
  CORE_CONFIG_OPTIONS,
  EntityServiceLoadOptions,
  EntityUtils,
  FormFieldDefinition,
  FormFieldDefinitionMap,
  IEntityService,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  PlatformService,
  Software,
  SuggestFn
} from '@sumaris-net/ngx-components';
import {ReferentialForm} from '../form/referential.form';
import {SoftwareService} from '../services/software.service';
import {SoftwareValidatorService} from '../services/validator/software.validator';
import {ReferentialRefService} from '../services/referential-ref.service';

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AbstractSoftwarePage<
  T extends Software<T>,
  S extends IEntityService<T>>
  extends AppEntityEditor<T, S> {

  protected accountService: AccountService;
  protected platform: PlatformService;
  protected cd: ChangeDetectorRef;
  protected referentialRefService: ReferentialRefService;

  propertyDefinitions: FormFieldDefinition[];
  form: UntypedFormGroup;

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;

  @ViewChild('propertiesForm', { static: true }) propertiesForm: AppPropertiesForm;

  protected constructor(
    injector: Injector,
    dataType: new() => T,
    dataService: S,
    protected validatorService: SoftwareValidatorService,
    configOptions: FormFieldDefinitionMap,
    options?: AppEditorOptions,
    ) {
    super(injector,
      dataType,
      dataService,
      options);
    this.platform = injector.get(PlatformService);
    this.accountService = injector.get(AccountService);
    this.cd = injector.get(ChangeDetectorRef);
    this.referentialRefService = injector.get(ReferentialRefService);

    // Convert map to list of options
    this.propertyDefinitions = Object.values({...CORE_CONFIG_OPTIONS, ...configOptions})
      .map(def => {
        if (def.type === 'entity' || def.type === 'entities') {
          def = Object.assign({}, def); // Copy
          def.autocomplete = {
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
            attributes: ['label', 'name'],
            ...(def.autocomplete || {})
          };
        }
        return def;
      });

    this.form = validatorService.getFormGroup();

  }

  ngOnInit() {
    super.ngOnInit();

    // Set entity name (required for referential form validator)
    this.referentialForm.entityName = 'Software';

    // Check label is unique
    if (this.service instanceof SoftwareService) {
      const softwareService = this.service as SoftwareService;
      this.form.get('label')
        .setAsyncValidators(async (control: AbstractControl) => {
          const label = control.enabled && control.value;
          return label && (await softwareService.existsByLabel(label)) ? {unique: true} : null;
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
    this.addChildForms([this.referentialForm, this.propertiesForm]);
  }

  protected async loadFromRoute(): Promise<void> {

    // Make sure the platform is ready, before loading configuration
    await this.platform.ready();

    return super.loadFromRoute();
  }



  protected setValue(data: T) {
    if (!data) return; // Skip

    this.form.patchValue({
      ...data.asObject(),
      properties: []
    }, {emitEvent: false});


    // Program properties
    this.propertiesForm.value = EntityUtils.getMapAsArray(data.properties || {});

    this.markAsPristine();
  }

  protected async getJsonValueToSave(): Promise<any> {
    const data = await super.getJsonValueToSave();

    // Re add label, because missing when field disable
    data.label = this.form.get('label').value;

    // Transform properties
    data.properties = this.propertiesForm.value;
    data.properties
      .filter(property => this.propertyDefinitions.find(def => def.key === property.key && (def.type === 'entity' || def.type === 'entities')))
      .forEach(property => {
        if (Array.isArray(property.value)) {
          property.value = property.value.map(v => v?.id).filter(isNotNil).join(',');
        }
        else {
          property.value = (property.value as any)?.id
        }
      });

    return data;
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
    await this.loadEntityProperties(data);
    await super.onEntityLoaded(data, options);
    this.markAsReady();
  }

  protected async onEntitySaved(data: T): Promise<void> {
    await this.loadEntityProperties(data);
    await super.onEntitySaved(data);
    this.markAsReady();
  }


  protected async loadEntityProperties(data: T | null) {

    await Promise.all(Object.keys(data.properties)
      .map(key => this.propertyDefinitions.find(def => def.key === key && (def.type === 'entity' || def.type === 'entities')))
      .filter(isNotNil)
      .map(async (def) => {
        if (def.type === 'entities') {
          const values = (data.properties[def.key] || '').trim().split(/[|,]+/);
          if (isNotEmptyArray(values)) {
            const entities = await Promise.all(values.map(value => this.resolveEntity(def, value)));
            data.properties[def.key] = entities as any;
          }
          else {
            data.properties[def.key] = null;
          }
        }
        // If type = 'entity'
        else {
          let value = data.properties[def.key];
          value = typeof value === 'string' ?  value.trim() : value;
          if (isNotNilOrBlank(value)) {
            const entity = await this.resolveEntity(def, value)
            data.properties[def.key] = entity;
          }
          else {
            data.properties[def.key] = null;
          }
        }
      }));
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
    }
    else {
      filter.searchAttribute = joinAttribute;
    }
    const suggestFn: SuggestFn<any, any> = def.autocomplete.suggestFn || this.referentialRefService.suggest;
    try {
      // Fetch entity, as a referential
      const res = await suggestFn(value, filter);
      const data = Array.isArray(res) ? res : res.data;
      return (data && data[0] || {id: value,  label: '??'}) as any;
    }
    catch (err) {
      console.error('Cannot fetch entity, from option: ' + def.key + '=' + value, err);
      return {id: value,  label: '??'};
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

}

