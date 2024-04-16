import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { SaleValidatorOptions, SaleValidatorService } from './sale.validator';
import { Moment } from 'moment';
import { AppForm, isNilOrBlank, OnReady, referentialToString, ReferentialUtils, StatusIds, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Sale } from './sale.model';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { UntypedFormControl } from '@angular/forms';
import { ProgramRefService } from '@app/referential/services/program-ref.service';

@Component({
  selector: 'app-form-sale',
  templateUrl: './sale.form.html',
  styleUrls: ['./sale.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleForm extends AppForm<Sale> implements OnInit, OnReady {
  private _minDate: Moment = null;
  private _required: boolean;

  protected readonly mobile = this.settings.mobile;

  @Input() showError = true;
  @Input() showProgram = true;
  @Input() showVessel = true;
  @Input() showLocation = true;
  @Input() showEndDateTime = true;
  @Input() showComment = true;
  @Input() showButtons = true;
  @Input() i18nSuffix: string;

  @Input() set required(value: boolean) {
    if (this._required !== value) {
      this._required = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get required(): boolean {
    return this._required;
  }

  @Input() set minDate(value: Moment) {
    if (value && (!this._minDate || !this._minDate.isSame(value))) {
      this._minDate = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get minDate(): Moment {
    return this._minDate;
  }

  get empty(): any {
    const value = this.value;
    return (
      ReferentialUtils.isEmpty(value.saleLocation) &&
      !value.startDateTime &&
      !value.endDateTime &&
      ReferentialUtils.isEmpty(value.saleType) &&
      isNilOrBlank(value.comments)
    );
  }

  get valid(): any {
    return this.form && (this.required ? this.form.valid : this.form.valid || this.empty);
  }

  get startDateTimeControl(): UntypedFormControl {
    return this._form.get('startDateTime') as UntypedFormControl;
  }

  constructor(
    injector: Injector,
    protected validatorService: SaleValidatorService,
    protected programRefService: ProgramRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected referentialRefService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, validatorService.getFormGroup(null, { required: false }));
  }

  ngOnInit() {
    super.ngOnInit();

    // Set defaults
    this.tabindex = toNumber(this.tabindex, 0);
    this._required = toBoolean(this._required, this.showProgram);

    // Combo: programs
    if (this.showProgram) {
      this.registerAutocompleteField('program', {
        service: this.programRefService,
        filter: {
          statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
          acquisitionLevelLabels: [AcquisitionLevelCodes.SALE, AcquisitionLevelCodes.PRODUCT_SALE, AcquisitionLevelCodes.PACKET_SALE],
        },
        mobile: this.mobile,
        showAllOnFocus: this.mobile,
      });
    }

    // Combo: vessels (if need)
    if (this.showVessel) {
      // Combo: vessels
      this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => this.registerAutocompleteField('vesselSnapshot', opts));
    } else {
      this.form.get('vesselSnapshot').clearValidators();
    }

    // Combo: sale locations
    this.registerAutocompleteField('location', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelId: LocationLevelIds.PORT,
      },
    });

    // Combo: sale types
    this.registerAutocompleteField('saleType', {
      service: this.referentialRefService,
      attributes: ['name'],
      filter: {
        entityName: 'SaleType',
      },
    });
  }

  ngOnReady() {
    this.updateFormGroup();
  }

  protected updateFormGroup(opts?: { emitEvent?: boolean }) {
    const validatorOpts: SaleValidatorOptions = {
      required: this._required, // Set if required or not
      minDate: this._minDate,
      withProgram: this.showProgram,
      withVessel: this.showVessel,
    };

    console.info('[sale-form] Updating form group...', validatorOpts);
    this.validatorService.updateFormGroup(this.form, validatorOpts);

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
