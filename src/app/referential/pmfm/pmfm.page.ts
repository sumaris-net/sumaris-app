import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { TableElement, ValidatorService } from '@e-is/ngx-material-table';
import { AbstractControl, UntypedFormGroup } from '@angular/forms';
import {
  AccountService,
  AppEntityEditor,
  EntityServiceLoadOptions,
  fadeInOutAnimation,
  FormFieldDefinitionMap,
  HistoryPageReference,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  joinProperties,
  joinPropertiesPath,
  MatAutocompleteFieldConfig,
  Referential,
  ReferentialFilter,
  ReferentialRef,
  referentialToString,
  ReferentialUtils
} from '@sumaris-net/ngx-components';
import { ReferentialForm } from '../form/referential.form';
import { PmfmValidatorService } from '../services/validator/pmfm.validator';
import { Pmfm } from '../services/model/pmfm.model';
import { Parameter } from '../services/model/parameter.model';
import { PmfmService } from '../services/pmfm.service';
import { ReferentialRefService } from '../services/referential-ref.service';
import { ParameterService } from '../services/parameter.service';
import { filter, mergeMap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { environment } from '@environments/environment';
import { ISelectReferentialModalOptions, SelectReferentialModal } from '@app/referential/table/select-referential.modal';
import { IonCheckbox, ModalController } from '@ionic/angular';
import { SimpleReferentialTable } from '@app/referential/table/referential-simple.table';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { UnitIds, UnitLabel } from '@app/referential/services/model/model.enum';

@Component({
  selector: 'app-pmfm',
  templateUrl: 'pmfm.page.html',
  providers: [
    {provide: ValidatorService, useExisting: PmfmValidatorService}
  ],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PmfmPage extends AppEntityEditor<Pmfm> {

  form: UntypedFormGroup;
  fieldDefinitions: FormFieldDefinitionMap;
  $parameter = new BehaviorSubject<Parameter>(null);

  get matrix(): any {
    return this.form.controls.matrix.value;
  }

  get hasMatrix(): boolean {
    return ReferentialUtils.isNotEmpty(this.matrix);
  }

  useDefaultQualitativesValues = true;

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;
  @ViewChild('qualitativeValuesTable', { static: true }) qualitativeValuesTable: SimpleReferentialTable;
  @ViewChild('btnUseDefaultQualitativeValues', { static: true }) btnUseDefaultQualitativeValues: IonCheckbox;

  constructor(
    protected injector: Injector,
    protected accountService: AccountService,
    protected validatorService: PmfmValidatorService,
    protected pmfmService: PmfmService,
    protected parameterService: ParameterService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
  ) {
    super(injector,
      Pmfm,
      pmfmService,
      {tabCount: 2});
    this.form = validatorService.getFormGroup();

    // default values
    this.defaultBackHref = "/referential/list?entity=Pmfm";

    this.debug = !environment.production;


  }
  ngOnInit() {
    super.ngOnInit();

    // Set entity name (required for referential form validator)
    this.referentialForm.entityName = 'Pmfm';

    const autocompleteConfig: MatAutocompleteFieldConfig = {
      suggestFn: (value, opts) => this.referentialRefService.suggest(value, opts),
      displayWith: (value) => value && joinPropertiesPath(value, ['label', 'name']),
      attributes: ['label', 'name'],
      columnSizes: [6, 6]
    };
    this.fieldDefinitions = {

      parameter: {
        key: `parameter`,
        label: `REFERENTIAL.PMFM.PARAMETER`,
        type: 'entity',
        autocomplete: {
          ...autocompleteConfig,
          filter: {entityName: 'Parameter'},
          showAllOnFocus: false
        }
      },
      unit: {
        key: `unit`,
        label: `REFERENTIAL.PMFM.UNIT`,
        type: 'entity',
        autocomplete: {
          ...autocompleteConfig,
          attributes: ['label'],
          filter: {entityName: 'Unit'},
          showAllOnFocus: false
        }
      },

      // Numerical options
      minValue: {
        key: `minValue`,
        label: `REFERENTIAL.PMFM.MIN_VALUE`,
        type: 'double'
      },
      maxValue: {
        key: `maxValue`,
        label: `REFERENTIAL.PMFM.MAX_VALUE`,
        type: 'double'
      },
      defaultValue: {
        key: `defaultValue`,
        label: `REFERENTIAL.PMFM.DEFAULT_VALUE`,
        type: 'double'
      },
      maximumNumberDecimals: {
        key: `maximumNumberDecimals`,
        label: `REFERENTIAL.PMFM.MAXIMUM_NUMBER_DECIMALS`,
        type: 'integer',
        minValue: 0
      },
      signifFiguresNumber: {
        key: `signifFiguresNumber`,
        label: `REFERENTIAL.PMFM.SIGNIF_FIGURES_NUMBER`,
        type: 'integer',
        minValue: 0
      },
      precision: {
        key: `precision`,
        label: `REFERENTIAL.PMFM.PRECISION`,
        type: 'double',
        minValue: 0
      },
      matrix: {
        key: `matrix`,
        label: `REFERENTIAL.PMFM.MATRIX`,
        type: 'entity',
        autocomplete: {
          ...autocompleteConfig,
          filter: {entityName: 'Matrix'},
          showAllOnFocus: false
        }
      },
      fraction: {
        key: `fraction`,
        label: `REFERENTIAL.PMFM.FRACTION`,
        type: 'entity',
        autocomplete: {
          ...autocompleteConfig,
          filter: {entityName: 'Fraction'},
          showAllOnFocus: false
        }
      },
      method: {
        key: `method`,
        label: `REFERENTIAL.PMFM.METHOD`,
        type: 'entity',
        autocomplete: {
          ...autocompleteConfig,
          filter: {entityName: 'Method'},
          showAllOnFocus: false
        }
      }
    };

    // Check fraction
    this.form.get('fraction')
      .setAsyncValidators(async (control: AbstractControl) => {
        const value = control.enabled && control.value;
        return value && (!this.matrix || value.levelId !== this.matrix.id) ? {entity: true} : null;
      });

    // Listen for parameter
    this.registerSubscription(
      this.form.get('parameter').valueChanges
        .pipe(
          filter(ReferentialUtils.isNotEmpty),
          mergeMap(p => this.parameterService.load(p.id))
        )
      .subscribe(p => {
        // If qualitative value: use 'None' unit
        if (p.isQualitative) {
            this.form.get('unit').setValue({id: UnitIds.NONE})
        }
        else {
          // Remove default unit (added just before)
          const unit = this.form.get('unit').value;
          if (unit && (unit.id === UnitIds.NONE && !unit.label)) {
            this.form.get('unit').setValue(null, {emitEvent: false});
          }
        }
        this.$parameter.next(p);
      })
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.$parameter.complete();
  }

  async addNewParameter() {
    await this.router.navigateByUrl(
      '/referential/parameter/new'
    );
    return true;
  }

  async openParameter(parameter?: Parameter) {
    parameter = parameter || this.$parameter.value;
    if (isNil(parameter)) return;

    const succeed = await this.router.navigateByUrl(
      `/referential/parameter/${parameter.id}?label=${parameter.label}`
    );
    return succeed;
  }

  /* -- protected methods -- */

  protected registerForms() {
    this.addChildForms([
      this.referentialForm,
      this.qualitativeValuesTable
    ]);
  }

  protected setValue(data: Pmfm) {
    if (!data) return; // Skip

    const json = data.asObject();
    json.entityName = Pmfm.ENTITY_NAME;

    this.form.patchValue(json, {emitEvent: false});

    // qualitativeValues
    if (isNilOrBlank(data.qualitativeValues)) {
      this.qualitativeValuesTable.value = data.parameter?.qualitativeValues || [];
      this.btnUseDefaultQualitativeValues.checked = true;
      this.useDefaultQualitativesValues = true;
    } else {
      this.qualitativeValuesTable.value = this.data.qualitativeValues.map(d => Referential.fromObject(d.asObject()));
      this.btnUseDefaultQualitativeValues.checked = false;
      this.useDefaultQualitativesValues = false;
    }

    this.markAsPristine();
  }

  protected async getValue(): Promise<Pmfm> {
    const data = await super.getValue();

    // Re add label, because missing when field disable
    data.label = this.form.get('label').value;
    data.label = data.label && data.label.toUpperCase();

    data.qualitativeValues = this.useDefaultQualitativesValues ? null : this.qualitativeValuesTable.value;

    return data;
  }

  protected computeTitle(data: Pmfm): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return this.translate.get('REFERENTIAL.PMFM.NEW.TITLE').toPromise();
    }

    // Existing data
    return this.translate.get('REFERENTIAL.PMFM.EDIT.TITLE', {title: joinProperties(this.data, ['label', 'name'])}).toPromise();
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      title: joinProperties(this.data, ['label', 'name']),
      subtitle: 'REFERENTIAL.ENTITY.PMFM',
      icon: 'list'
    };
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return 0;
    return 0;
  }

  protected async onNewEntity(data: Pmfm, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onNewEntity(data, options);

    // Check label is unique
    this.form.get('label')
      .setAsyncValidators(async (control: AbstractControl) => {
        const label = control.enabled && control.value;
        return label && (await this.pmfmService.existsByLabel(label, {excludedId: this.data.id})) ? {unique: true} : null;
      });

    this.markAsReady();
  }

  protected async onEntityLoaded(data: Pmfm, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onEntityLoaded(data, options);
    this.markAsReady();
  }

  referentialToString = referentialToString;

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async toggleUseDefaultQualitativeValues(event) {
    // NOTE : the status of the check btn is not already updated at this moment this is why is it inverted
    if (!this.btnUseDefaultQualitativeValues.checked) {
      this.qualitativeValuesTable.value = this.data.parameter.qualitativeValues;
      this.useDefaultQualitativesValues = true;
      this.markAsDirty()
    } else {
      this.qualitativeValuesTable.value = null;
      const data = await this.openSelectReferentialModal();
      if (isNilOrBlank(data)) {
        this.btnUseDefaultQualitativeValues.checked = true;
        this.qualitativeValuesTable.value = this.data.parameter.qualitativeValues;
      } else {
        this.useDefaultQualitativesValues = false;
      }
    }
  }

  protected async openSelectReferentialModal(opts?: ISelectReferentialModalOptions): Promise<ReferentialRef[]> {

    const excludedIds = (this.qualitativeValuesTable.value || []).map(q => q.id);
    const filter = <Partial<ReferentialRefFilter>>{
      entityName: 'QualitativeValue',
      levelId: this.form.get('parameter').value.id,
      excludedIds
    };
    console.debug(`[pmfm-page] Opening select PMFM modal, with filter:`, filter);

    const hasTopModal = !!(await this.modalCtrl.getTop());
    const modal = await this.modalCtrl.create({
      component: SelectReferentialModal,
      componentProps: <ISelectReferentialModalOptions>{
        ...opts,
        allowMultipleSelection: true,
        showLevelFilter: false,
        filter
      },
      keyboardClose: true,
      backdropDismiss: false,
      cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large',
    });

    await modal.present();

    const {data} = await modal.onDidDismiss();

    if (isNotEmptyArray(data)) {
      this.qualitativeValuesTable.value = isEmptyArray(this.qualitativeValuesTable.value)
        ? data
        : this.qualitativeValuesTable.value.concat(data);
      this.markAsDirty();
    }

    return data;
  }

  protected onAfterDeleteQualitativeValueRows(deletedRows: TableElement<Referential>[]) {

    this.markAsDirty();
    if (isEmptyArray(this.qualitativeValuesTable.value)) {
      this.useDefaultQualitativesValues = true;
      this.btnUseDefaultQualitativeValues.checked = true;
      this.qualitativeValuesTable.value = this.data?.parameter?.qualitativeValues || [];
    }
  }

  protected onQualitativeValueRowClick(row: TableElement<any>) {
    this.qualitativeValuesTable.selection.toggle(row);
  }

}

