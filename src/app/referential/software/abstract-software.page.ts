import {ChangeDetectorRef, Directive, Injector, OnInit, ViewChild} from '@angular/core';
import {AbstractControl, FormGroup} from '@angular/forms';
import {
  AccountService,
  AppEditorOptions,
  AppEntityEditor,
  AppPropertiesForm,
  CORE_CONFIG_OPTIONS, EntityServiceLoadOptions,
  EntityUtils,
  FormFieldDefinition,
  FormFieldDefinitionMap,
  IEntityService,
  isNil, isNotNil,
  PlatformService,
  Software
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
  form: FormGroup;

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
        if (def.type === 'entity') {
          def = Object.assign({}, def); // Copy
          def.autocomplete = def.autocomplete || {};
          def.autocomplete.suggestFn = (value, filter) => this.referentialRefService.suggest(value, filter);
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

    // Convert entities to id
    data.properties = this.propertiesForm.value;
    data.properties
      .filter(property => this.propertyDefinitions.find(def => def.key === property.key && def.type === 'entity'))
      .forEach(property => property.value = property.value.id);

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

  async loadEntityProperties(data: T | null) {

    return Promise.all(Object.keys(data.properties)
      .map(key => this.propertyDefinitions.find(def => def.key === key && def.type === 'entity'))
      .filter(isNotNil)
      .map(def => {
        let value = data.properties[def.key];
        const filter = {...def.autocomplete.filter};
        const joinAttribute = def.autocomplete.filter.joinAttribute || 'id';
        if (joinAttribute === 'id') {
          filter.id = parseInt(value);
          value = '*';
        }
        else {
          filter.searchAttribute = joinAttribute;
        }
        // Fetch entity, as a referential
        return this.referentialRefService.suggest(value, filter)
          .then(matches => {
            data.properties[def.key] = (matches && matches.data && matches.data[0] || {id: value,  label: '??'}) as any;
          })
          // Cannot ch: display an error
          .catch(err => {
            console.error('Cannot fetch entity, from option: ' + def.key + '=' + value, err);
            data.properties[def.key] = ({id: value,  label: '??'}) as any;
          });
      }));
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

}

