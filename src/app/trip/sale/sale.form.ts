import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { SaleValidatorService } from '../services/validator/sale.validator';
import { Moment } from 'moment';
import { AppForm, OnReady, referentialToString, toNumber } from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Sale } from '../services/model/sale.model';
import { LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';

@Component({
  selector: 'form-sale',
  templateUrl: './sale.form.html',
  styleUrls: ['./sale.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SaleForm extends AppForm<Sale> implements OnInit, OnReady {

  private _minDate: Moment = null;

  @Input() required = true;
  @Input() showError = true;
  @Input() showVessel = true;
  @Input() showEndDateTime = true;
  @Input() showComment = true;
  @Input() showButtons = true;

  @Input() set minDate(value: Moment) {
    if (value && (!this._minDate || !this._minDate.isSame(value))) {
      this._minDate = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get empty(): any {
    const value = this.value;
    return (!value.saleLocation || !value.saleLocation.id)
      && (!value.startDateTime)
      && (!value.endDateTime)
      && (!value.saleType || !value.saleType.id)
      && (!value.comments || !value.comments.length);
  }

  get valid(): any {
    return this.form && (this.required ? this.form.valid : (this.form.valid || this.empty));
  }

  constructor(
    injector: Injector,
    protected validatorService: SaleValidatorService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected referentialRefService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, validatorService.getFormGroup());
  }

  ngOnInit() {
    super.ngOnInit();

    // Set defaults
    this.tabindex = toNumber(this.tabindex, 0);

    // Combo: vessels (if need)
    if (this.showVessel) {
      // Combo: vessels
      this.vesselSnapshotService.getAutocompleteFieldOptions().then(opts =>
        this.registerAutocompleteField('vesselSnapshot', opts)
      );
    } else {
      this.form.get('vesselSnapshot').clearValidators();
    }

    // Combo: sale locations
    this.registerAutocompleteField('location', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelId: LocationLevelIds.PORT
      }
    });

    // Combo: sale types
    this.registerAutocompleteField('saleType', {
      service: this.referentialRefService,
      attributes: ['name'],
      filter: {
        entityName: 'SaleType'
      }
    });
  }

  ngOnReady() {
    this.updateFormGroup();
  }

  protected updateFormGroup(opts?: { emitEvent?: boolean; }) {
    console.info('[sale-form] Updating form group...');
    this.validatorService.updateFormGroup(this.form, {
      required: this.required, // Set if required or not
      minDate: this._minDate
    });

    if (!opts || opts.emitEvent !== false) {
      this.form.updateValueAndValidity();
      this.markForCheck();
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  referentialToString = referentialToString;
}
