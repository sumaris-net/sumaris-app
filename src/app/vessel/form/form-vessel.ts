import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit} from '@angular/core';
import {VesselValidatorOptions, VesselValidatorService} from '../services/validator/vessel.validator';
import {Vessel} from '../services/model/vessel.model';
import {LocationLevelIds} from '@app/referential/services/model/model.enum';
import {AccountService, AppForm, AppFormUtils, LocalSettingsService, ReferentialRef, StatusById, StatusIds, StatusList, toBoolean} from '@sumaris-net/ngx-components';
import {ReferentialRefService} from '@app/referential/services/referential-ref.service';
import {FormGroup} from '@angular/forms';
import {Moment} from 'moment';


@Component({
  selector: 'form-vessel',
  templateUrl: './form-vessel.html',
  styleUrls: ['./form-vessel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VesselForm extends AppForm<Vessel> implements OnInit {

  private _defaultStatus: number;
  private _defaultRegistrationLocation: ReferentialRef;
  private _withNameRequired: boolean;
  private _maxDate: Moment;

  data: Vessel;

  readonly statusList = StatusList;
  readonly statusById = StatusById;

  @Input() canEditStatus: boolean;
  @Input() showError: boolean;

  @Input() set defaultStatus(value: number) {
    if (this._defaultStatus !== value) {
      this._defaultStatus = value;
      console.debug('[form-vessel] Changing default status to:' + value);
      if (this.form) {
        this.form.patchValue({statusId: this.defaultStatus});
      }
      this.canEditStatus = !this._defaultStatus || this.isAdmin();
    }
  }

  get defaultStatus(): number {
    return this._defaultStatus;
  }

  @Input() set defaultRegistrationLocation(value: ReferentialRef) {
    if (this._defaultRegistrationLocation !== value) {
      this._defaultRegistrationLocation = value;
      console.debug('[form-vessel] Changing default registration location to:' + value);
      if (this.registrationForm) {
        this.registrationForm.patchValue({registrationLocation: this.defaultRegistrationLocation});
      }
    }
  }

  get defaultRegistrationLocation(): ReferentialRef {
    return this._defaultRegistrationLocation;
  }

  @Input() set withNameRequired(value: boolean) {
    if (this._withNameRequired !== value) {
      this._withNameRequired = value;
      if (this.form) {
        this.updateFormGroup();
      }
    }
  }

  get withNameRequired(): boolean {
    return this._withNameRequired;
  }

  @Input() set maxDate(value: Moment) {
    if (this._maxDate !== value) {
      this._maxDate = value;
      if (this.form) {
        this.updateFormGroup();
      }
    }
  }

  get maxDate(): Moment {
    return this._maxDate;
  }


  get registrationForm(): FormGroup {
    return this.form.controls.vesselRegistrationPeriod as FormGroup;
  }

  get featuresForm(): FormGroup {
    return this.form.controls.vesselFeatures as FormGroup;
  }

  constructor(
    injector: Injector,
    protected vesselValidatorService: VesselValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected cd: ChangeDetectorRef,
    protected settings: LocalSettingsService,
    private accountService: AccountService
  ) {

    super(injector,
      vesselValidatorService.getFormGroup());

    this.canEditStatus = this.accountService.isAdmin();
  }

  ngOnInit() {
    super.ngOnInit();

    // Compute defaults
    this.showError = toBoolean(this.showError, true);
    this.canEditStatus = toBoolean(this.canEditStatus, !this._defaultStatus || this.isAdmin());

    // Combo location
    this.registerAutocompleteField('basePortLocation', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelId: LocationLevelIds.PORT,
        statusId: StatusIds.ENABLE
      }
    });
    this.registerAutocompleteField('registrationLocation', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelId: LocationLevelIds.COUNTRY,
        statusId: StatusIds.ENABLE
      }
    });
    this.registerAutocompleteField('vesselType', {
      service: this.referentialRefService,
      filter: {
        entityName: 'VesselType',
        statusId: StatusIds.ENABLE
      }
    });

    if (this._defaultStatus) {
      this.form.patchValue({
        statusId: this._defaultStatus
      });
    }

    if (this._defaultRegistrationLocation){
      this.registrationForm.patchValue({
        registrationLocation: this._defaultRegistrationLocation
      });
    }
  }

  isAdmin(): boolean {
    return this.accountService.isAdmin();
  }

  filterNumberInput = AppFormUtils.filterNumberInput;


  /* -- protected methods -- */


  protected updateFormGroup(opts?: { emitEvent?: boolean }) {

    const validatorOpts = <VesselValidatorOptions>{
      withNameRequired: this.withNameRequired,
      maxDate: this.maxDate
    };

    // DEBUG
    console.debug(`[form-vessel] Updating form group (validators)`, validatorOpts);

    this.vesselValidatorService.updateFormGroup(this.form, validatorOpts);

    if (!opts || opts.emitEvent !== false) {
      this.form.updateValueAndValidity();
      this.markForCheck();
    }
  }


  protected markForCheck() {
    this.cd.markForCheck();
  }
}
