import {ChangeDetectionStrategy, Component, Injector, OnInit, ViewChild} from '@angular/core';
import {TableElement, ValidatorService} from '@e-is/ngx-material-table';
import {FormBuilder, FormGroup, ValidationErrors} from '@angular/forms';
import {Program} from '../services/model/program.model';
import {ProgramService} from '../services/program.service';
import {ReferentialForm} from '../form/referential.form';
import {ProgramValidatorService} from '../services/validator/program.validator';
import {StrategiesTable} from '../strategy/strategies.table';
import {
  AccountService,
  AppEntityEditor,
  AppListForm,
  AppPropertiesForm,
  AppTable,
  changeCaseToUnderscore,
  EntityServiceLoadOptions,
  EntityUtils,
  fadeInOutAnimation,
  FormFieldDefinition,
  FormFieldDefinitionMap,
  HistoryPageReference,
  isNil,
  isNotNil,
  ReferentialRef,
  referentialToString,
  ReferentialUtils,
  SharedValidators
} from '@sumaris-net/ngx-components';
import {ReferentialRefService} from '../services/referential-ref.service';
import {ModalController} from '@ionic/angular';
import {ProgramProperties, StrategyEditor} from '../services/config/program.config';
import {ActivatedRoute} from '@angular/router';
import {SelectReferentialModal} from '../list/select-referential.modal';
import {environment} from '../../../environments/environment';
import {Strategy} from '../services/model/strategy.model';
import {SamplingStrategiesTable} from '../strategy/sampling/sampling-strategies.table';
import {ReferentialRefFilter} from '../services/filter/referential-ref.filter';

export enum AnimationState {
  ENTER = 'enter',
  LEAVE = 'leave'
}

@Component({
  selector: 'app-program',
  templateUrl: 'program.page.html',
  providers: [
    {provide: ValidatorService, useExisting: ProgramValidatorService}
  ],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgramPage extends AppEntityEditor<Program, ProgramService> implements OnInit {

  propertyDefinitions: FormFieldDefinition[];
  fieldDefinitions: FormFieldDefinitionMap = {};
  form: FormGroup;
  i18nFieldPrefix = 'PROGRAM.';
  strategyEditor: StrategyEditor = 'legacy';
  i18nTabStrategiesSuffix = '';

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;
  @ViewChild('propertiesForm', { static: true }) propertiesForm: AppPropertiesForm;
  @ViewChild('locationClassificationList', { static: true }) locationClassificationList: AppListForm;
  @ViewChild('legacyStrategiesTable', { static: true }) legacyStrategiesTable: StrategiesTable;
  @ViewChild('samplingStrategiesTable', { static: true }) samplingStrategiesTable: SamplingStrategiesTable;

  get strategiesTable(): AppTable<Strategy> {
    return this.strategyEditor !== 'sampling' ? this.legacyStrategiesTable : this.samplingStrategiesTable;
  }

  constructor(
    protected injector: Injector,
    protected programService: ProgramService,
    protected formBuilder: FormBuilder,
    protected accountService: AccountService,
    protected validatorService: ProgramValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    protected activatedRoute: ActivatedRoute
  ) {
    super(injector,
      Program,
      programService, {
        pathIdAttribute: 'programId',
        tabCount: 3
      });
    this.form = validatorService.getFormGroup();

    // default values
    this.defaultBackHref = "/referential/list?entity=Program";
    this._enabled = this.accountService.isAdmin();
    this.tabCount = 4;

    this.propertyDefinitions = Object.values(ProgramProperties).map(def => {
      if (def.type === 'entity') {
        def = Object.assign({}, def); // Copy
        def.autocomplete = def.autocomplete || {};
        def.autocomplete.suggestFn = (value, filter) => this.referentialRefService.suggest(value, filter);
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
    this.form.get('label').setAsyncValidators([
      async (control) => {
        console.debug('[program-page] Checking of label is unique...');
        const exists = await this.programService.existsByLabel(control.value, {
          excludedIds: isNotNil(idControl.value) ? [idControl.value] : undefined
        });
        if (exists) {
          console.warn('[program-page] Label not unique!');
          return <ValidationErrors>{ unique: true };
        }

        console.debug('[program-page] Checking of label is unique [OK]');
        SharedValidators.clearError(control, 'unique');
      }
    ]);

    this.registerFormField('gearClassification', {
      type: 'entity',
      autocomplete: {
        suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
        filter: {
          entityName: 'GearClassification'
        }
      }
    });

    this.registerFormField('taxonGroupType', {
      key: 'taxonGroupType',
      type: 'entity',
      autocomplete: {
        suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
        filter: {
          entityName: 'TaxonGroupType'
        }
      }
    });

  }

  /* -- protected methods -- */

  async load(id?: number, opts?: EntityServiceLoadOptions): Promise<void> {
    // Force the load from network
    return super.load(id, {...opts, fetchPolicy: "network-only"});
  }
  updateView(data: Program | null, opts?: { emitEvent?: boolean; openTabIndex?: number; updateRoute?: boolean }) {

    this.strategyEditor = data && data.getProperty<StrategyEditor>(ProgramProperties.STRATEGY_EDITOR) || 'legacy';
    this.i18nTabStrategiesSuffix = this.strategyEditor === 'sampling' ? '.SAMPLING' : '';

    super.updateView(data, opts);
  }

  protected async onEntityLoaded(data: Program, options?: EntityServiceLoadOptions): Promise<void> {
    await this.loadEntityProperties(data);
    await super.onEntityLoaded(data, options);
  }

  protected async onEntitySaved(data: Program): Promise<void> {
    await this.loadEntityProperties(data);
    await super.onEntitySaved(data);
  }

  async loadEntityProperties(data: Program | null) {

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


  protected registerFormField(fieldName: string, def: Partial<FormFieldDefinition>) {
    const definition = <FormFieldDefinition>{
      key: fieldName,
      label: this.i18nFieldPrefix + changeCaseToUnderscore(fieldName).toUpperCase(),
      ...def
    };
    this.fieldDefinitions[fieldName] = definition;
  }

  protected canUserWrite(data: Program): boolean {
    // TODO : check user is in program managers
    return (this.isNewData && this.accountService.isAdmin())
      || (ReferentialUtils.isNotEmpty(data) && this.accountService.isSupervisor());

  }

  enable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    super.enable(opts);

    // TODO BLA remove this ?
    this.locationClassificationList.enable(opts);

    if (!this.isNewData) {
      this.form.get('label').disable();
    }
  }

  protected registerForms() {
    this.addChildForms([
      this.referentialForm,
      this.propertiesForm,
      this.locationClassificationList
    ]);
  }

  protected setValue(data: Program) {
    if (!data) return; // Skip

    this.form.patchValue({...data,
      properties: [],
      locationClassifications: [],
      strategies: []}, {emitEvent: false});

    // Program properties
    this.propertiesForm.value = EntityUtils.getMapAsArray(data.properties);

    // Location classification
    this.locationClassificationList.setValue(data.locationClassifications);


    this.markForCheck();
  }

  // TOD BLA: remove this override
  async save(event?: Event, options?: any): Promise<boolean> {
    //console.debug('TODO saving program...');
    return super.save(event, options);
  }

  protected async getJsonValueToSave(): Promise<any> {
    const data = await super.getJsonValueToSave();

    // Re add label, because missing when field disable
    data.label = this.form.get('label').value;
    data.properties = this.propertiesForm.value;
    data.properties
      .filter(property => this.propertyDefinitions.find(def => def.key === property.key && def.type === 'entity'))
      .forEach(property => property.value = property.value.id);

    return data;
  }

  protected computeTitle(data: Program): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return this.translate.get('PROGRAM.NEW.TITLE').toPromise();
    }

    // Existing data
    return this.translate.get('PROGRAM.EDIT.TITLE', data).toPromise();
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      icon: 'contract',
      title: `${this.data.label} - ${this.data.name}`,
      subtitle: 'REFERENTIAL.ENTITY.PROGRAM'
    };
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return 0;
    if (this.strategiesTable && this.strategiesTable.invalid) return 1;
    if (this.propertiesForm.invalid) return 2;
    // TODO users rights
    return 0;
  }

  async addLocationClassification() {
    if (this.disabled) return; // Skip

    const items = await this.openSelectReferentialModal({
      filter: {
        entityName: 'LocationClassification'
      }
    });

    // Add to list
    (items || []).forEach(item => this.locationClassificationList.add(item));

    this.markForCheck();
  }

  async onOpenStrategy({id, row}: { id?: number; row: TableElement<any>; }) {
    const savedOrContinue = await this.saveIfDirtyAndConfirm();
    if (savedOrContinue) {
      this.markAsLoading();
      setTimeout(async () => {
        await this.router.navigate(['referential', 'programs',  this.data.id, 'strategy', this.strategyEditor, id], {
          queryParams: {}
        });
        this.markAsLoaded();
      });
    }
  }

  async onNewStrategy(event?: any) {
    const savedOrContinue = await this.saveIfDirtyAndConfirm();
    if (savedOrContinue) {
      this.markAsLoading();

      setTimeout(async () => {
        await this.router.navigate(['referential', 'programs',  this.data.id, 'strategy', this.strategyEditor, 'new'], {
          queryParams: {}
        });
        this.markAsLoaded();
      });
    }
  }

  protected async openSelectReferentialModal(opts: {
    filter: Partial<ReferentialRefFilter>
  }): Promise<ReferentialRef[]> {

    const modal = await this.modalCtrl.create({ component: SelectReferentialModal,
      componentProps: {
        filter: ReferentialRefFilter.fromObject(opts.filter)
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    await modal.present();

    const {data} = await modal.onDidDismiss();

    return data;
  }

  referentialToString = referentialToString;
  referentialEquals = ReferentialUtils.equals;

  protected markForCheck() {
    this.cd.markForCheck();
  }

}

