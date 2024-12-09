import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AppForm, FormFieldDefinitionMap, isEmptyArray, isNil, isNotEmptyArray, LoadResult, suggestFromArray } from '@sumaris-net/ngx-components';
import { BatchGroup } from '../group/batch-group.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { RxState } from '@rx-angular/state';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';

export interface SubSortingCriteria {
  taxonName: TaxonNameRef;
  criteriaPmfm: IPmfm;
  min: number;
  max: number;
  precision: number;
  qvPmfm: IPmfm;
  useOptionalCriteria: boolean;
}
@Component({
  selector: 'app-sub-sorting-criteria-form',
  styleUrls: ['sub-sorting-criteria.form.scss'],
  templateUrl: 'sub-sorting-criteria.form.html',
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubSortingCriteriaForm extends AppForm<SubSortingCriteria> implements OnInit, OnDestroy {
  protected fieldDefinitions: FormFieldDefinitionMap = {};
  protected criteriaPmfms: IPmfm[];
  protected qvPmfms: IPmfm[];
  protected hasRequiredQvPmfm: boolean = false;
  protected disabledPrecision: boolean = false;
  protected showQvPmfm: boolean = false;

  @Input() parentGroup: BatchGroup;
  @Input() programLabel: string;
  @Input() pmfmsFiltered: IPmfm[];

  constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected pmfmService: PmfmService,
    protected programRefService: ProgramRefService,
    private fb: FormBuilder
  ) {
    super(
      injector,
      fb.group({
        taxonName: [null, Validators.required],
        criteriaPmfm: [null, Validators.required],
        min: [null, [Validators.required, Validators.min(0)]],
        max: [null, Validators.required],
        precision: [null, [Validators.required]],
        qvPmfm: [null],
        useOptionalCriteria: [false],
      })
    );
  }

  ngOnInit() {
    super.ngOnInit();
    // Pmfms filtered by type
    this.qvPmfms = this.pmfmsFiltered.filter(PmfmUtils.isQualitative);
    this.criteriaPmfms = this.pmfmsFiltered.filter((pmfm) => !PmfmUtils.isQualitative(pmfm));
    this.hasRequiredQvPmfm = this.qvPmfms.some((p) => p.required);

    this.registerSubscription(
      this.form.get('criteriaPmfm').valueChanges.subscribe((value) => {
        if (value.precision) {
          this.form.get('precision').setValue(value.precision);
          this.disabledPrecision = true;
        } else {
          this.disabledPrecision = false;
        }
      })
    );

    this.registerSubscription(
      this.form.valueChanges.subscribe(() => {
        if (this.form.hasError('minMaxError')) {
          this.form.get('maxStep').setErrors({ minMaxError: true });
        }
      })
    );

    this.registerAutocompleteField('taxonName', {
      suggestFn: (value, filter) => this.suggestTaxonNames(value, filter),
      panelClass: 'min-width-large',
      selectInputContentOnFocus: true,
    });

    this.fieldDefinitions = {
      criteriaPmfm: {
        key: 'criteriaPmfm',
        type: 'entity',
        label: 'TRIP.BATCH.EDIT.INDIVIDUAL_COUNT.SORT_CRITERIA_NUMERIC',
        required: true,
        autocomplete: this.registerAutocompleteField('criteriaPmfm', {
          suggestFn: (value, opts) => this.suggestPmfms(value, { ...opts, isQvPmfm: false }),
          attributes: ['completeName'],
          columnNames: ['TRIP.BATCH.EDIT.INDIVIDUAL_COUNT.SORT_CRITERIA_NUMERIC'],
          showAllOnFocus: true,
          panelWidth: '500px',
        }),
      },
      qvPmfm: {
        key: 'qvPmfm',
        type: 'entity',
        label: 'TRIP.BATCH.EDIT.INDIVIDUAL_COUNT.SORT_CRITERIA_QUALITATIVE',
        required: false,
        autocomplete: this.registerAutocompleteField('qvPmfm', {
          suggestFn: (value, opts) => this.suggestPmfms(value, { ...opts, isQvPmfm: true }),
          attributes: ['completeName'],
          columnNames: ['TRIP.BATCH.EDIT.INDIVIDUAL_COUNT.SORT_CRITERIA_QUALITATIVE'],
          showAllOnFocus: true,
          panelWidth: '500px',
        }),
      },
    };

    // Fill form default values
    // Check if there is only one pmfm in the mandatory pmfms
    if (this.criteriaPmfms.length === 1) {
      this.form.get('criteriaPmfm').setValue(this.criteriaPmfms[0]);
    }
    if (isNotEmptyArray(this.qvPmfms) && this.qvPmfms.length === 1 && this.hasRequiredQvPmfm) {
      this.showQvPmfm = true;
      this.form.get('qvPmfm').setValue(this.qvPmfms[0]);
    } else if (isNotEmptyArray(this.qvPmfms)) {
      this.showQvPmfm = true;
    }

    this.enable();
  }

  protected async suggestTaxonNames(value?: any, options?: any): Promise<LoadResult<TaxonNameRef>> {
    const parentGroup = this.parentGroup;
    if (isNil(parentGroup)) return { data: [] };
    return this.programRefService.suggestTaxonNames(value, {
      programLabel: this.programLabel,
      searchAttribute: options && options.searchAttribute,
      taxonGroupId: (parentGroup && parentGroup.taxonGroup && parentGroup.taxonGroup.id) || undefined,
    });
  }

  protected async suggestPmfms(value: any, opts?: { isQvPmfm?: boolean } & any): Promise<LoadResult<IPmfm>> {
    const pmfms = opts.isQvPmfm ? this.qvPmfms : this.criteriaPmfms;
    if (isEmptyArray(pmfms)) return { data: [] };
    return suggestFromArray(pmfms, value, {
      ...opts,
      anySearch: true,
    });
  }

  protected computeNumberInputStep(pmfm: IPmfm): string {
    return PmfmUtils.getOrComputePrecision(pmfm, null)?.toString() || '';
  }

  doSubmit() {
    const formValue = this.form.value;
    return super.doSubmit(formValue);
  }
}
