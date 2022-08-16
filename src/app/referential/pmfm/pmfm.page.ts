import {ChangeDetectionStrategy, Component, Injector, OnInit, ViewChild} from '@angular/core';
import {ValidatorService} from '@e-is/ngx-material-table';
import {AbstractControl, FormGroup} from '@angular/forms';
import {
  AccountService,
  AppEntityEditor,
  EntityServiceLoadOptions,
  fadeInOutAnimation, firstNotNil, firstNotNilPromise,
  FormFieldDefinitionMap,
  HistoryPageReference,
  isNil, joinProperties,
  joinPropertiesPath,
  MatAutocompleteFieldConfig,
  referentialToString,
  ReferentialUtils, toNumber,
} from '@sumaris-net/ngx-components';
import {ReferentialForm} from '../form/referential.form';
import {PmfmValidatorService} from '../services/validator/pmfm.validator';
import {Pmfm} from '../services/model/pmfm.model';
import {Parameter} from '../services/model/parameter.model';
import {PmfmService} from '../services/pmfm.service';
import {ReferentialRefService} from '../services/referential-ref.service';
import {ParameterService} from '../services/parameter.service';
import {filter, mergeMap} from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';
import {environment} from '@environments/environment';

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

  canEdit: boolean;
  form: FormGroup;
  fieldDefinitions: FormFieldDefinitionMap;
  $parameter = new BehaviorSubject<Parameter>(null);

  get matrix(): any {
    return this.form.controls.matrix.value;
  }

  get hasMatrix(): boolean {
    return ReferentialUtils.isNotEmpty(this.matrix);
  }

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;

  constructor(
    protected injector: Injector,
    protected accountService: AccountService,
    protected validatorService: PmfmValidatorService,
    protected pmfmService: PmfmService,
    protected parameterService: ParameterService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(injector,
      Pmfm,
      pmfmService);
    this.form = validatorService.getFormGroup();

    // default values
    this.defaultBackHref = "/referential/pmfm";
    this.canEdit = this.accountService.isAdmin();

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
      .subscribe(p => this.$parameter.next(p))
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

  enable() {
    super.enable();

    if (!this.isNewData) {
      //this.form.get('label').disable();
    }
  }

  protected registerForms() {
    this.addChildForm(this.referentialForm);
  }

  protected setValue(data: Pmfm) {
    if (!data) return; // Skip

    const json = data.asObject();
    json.entityName = Pmfm.ENTITY_NAME;

    this.form.patchValue(json, {emitEvent: false});

    // qualitativeValues
    //this.qualitativeValuesTable.value = data.qualitativeValues.slice(); // force update

    this.markAsPristine();
  }

  protected async getValue(): Promise<Pmfm> {
    const data = await super.getValue();

    // Re add label, because missing when field disable
    data.label = this.form.get('label').value;
    data.label = data.label && data.label.toUpperCase();

    //await this.qualitativeValuesTable.save();
    //data.qualitativeValues = this.qualitativeValuesTable.value;

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

    this.canEdit = this.canUserWrite(data);

    this.markAsReady();
  }

  referentialToString = referentialToString;

  protected markForCheck() {
    this.cd.markForCheck();
  }

}

