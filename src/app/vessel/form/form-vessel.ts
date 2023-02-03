import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, HostListener, Injector, Input, OnInit } from '@angular/core';
import { VesselValidatorOptions, VesselValidatorService } from '../services/validator/vessel.validator';
import { Vessel } from '../services/model/vessel.model';
import { LocationLevelIds } from '@app/referential/services/model/model.enum';
import { AccountService, AppForm, AppFormUtils, isNil, LocalSettingsService, ReferentialRef, StatusById, StatusIds, StatusList, toBoolean } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { UntypedFormGroup } from '@angular/forms';
import { Moment } from 'moment';

@Directive({ selector: 'input[toRegistrationCode]'})
export class ToRegistrationCodeDirective {
  constructor() {
  }

  @HostListener('input', ['$event'])
  onInput(event) {
    // Filters only A-Z 0-9 characters
    event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
}

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

  readonly mobile: boolean
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
      console.debug('[form-vessel] Changing default registration location to:' + value);
      this._defaultRegistrationLocation = value;

      // Apply value, if possible (not yt set)
      const registrationLocationControl = this.registrationForm?.get('registrationLocation');
      if (registrationLocationControl && isNil(registrationLocationControl.value)) {
        registrationLocationControl.patchValue({registrationLocation: value});
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


  get registrationForm(): UntypedFormGroup {
    return this.form.controls.vesselRegistrationPeriod as UntypedFormGroup;
  }

  get featuresForm(): UntypedFormGroup {
    return this.form.controls.vesselFeatures as UntypedFormGroup;
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
    this.mobile = settings.mobile;
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
      },
      mobile: this.mobile
    });
    this.registerAutocompleteField('registrationLocation', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelId: LocationLevelIds.COUNTRY,
        statusId: StatusIds.ENABLE
      },
      mobile: this.mobile
    });
    this.registerAutocompleteField('vesselType', {
      service: this.referentialRefService,
      filter: {
        entityName: 'VesselType',
        statusId: StatusIds.ENABLE
      },
      mobile: this.mobile
    });

    // Combo hull material
    this.registerAutocompleteField('hullMaterial', {
      // TODO use suggest function, and load Pmfm qualitative value, using PmfmIds.HULL_MATERIAL
      service: this.referentialRefService,
      attributes: ['name'],
      filter: {
        entityName: 'QualitativeValue',
        levelLabel: 'HULL_MATERIAL',
        statusId: StatusIds.ENABLE
      },
      mobile: this.mobile
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
