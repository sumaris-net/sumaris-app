import { ChangeDetectionStrategy, Component, Directive, HostListener, Input, OnInit } from '@angular/core';
import { VesselValidatorOptions, VesselValidatorService } from '../services/validator/vessel.validator';
import { Vessel } from '../services/model/vessel.model';
import { LocationLevelIds } from '@app/referential/services/model/model.enum';
import {
  AccountService,
  AppForm,
  AppFormUtils,
  isNil,
  MatAutocompleteFieldConfig,
  ReferentialRef,
  StatusById,
  StatusIds,
  StatusList,
  toBoolean,
} from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { UntypedFormGroup } from '@angular/forms';
import { Moment } from 'moment';
import { VESSEL_CONFIG_OPTIONS } from '@app/vessel/services/config/vessel.config';

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: 'input[toRegistrationCode]' })
export class ToRegistrationCodeDirective {
  constructor() {}

  @HostListener('input', ['$event'])
  onInput(event) {
    // Filters only A-Z 0-9 characters
    event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
}

@Component({
  selector: 'app-form-vessel',
  templateUrl: './form-vessel.html',
  styleUrls: ['./form-vessel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VesselForm extends AppForm<Vessel> implements OnInit {
  private _defaultStatus: number;
  private _defaultRegistrationLocation: ReferentialRef;
  private _withNameRequired: boolean;
  private _maxDate: Moment;
  private _basePortLocationSuggestLengthThreshold: number = +VESSEL_CONFIG_OPTIONS.VESSEL_BASE_PORT_LOCATION_SEARCH_TEXT_MIN_LENGTH.defaultValue;

  data: Vessel;

  readonly mobile: boolean;
  readonly statusList = StatusList;
  readonly statusById = StatusById;

  @Input() canEditStatus: boolean;
  @Input() showError: boolean;
  @Input() registrationLocationLevelIds: number[];
  @Input() basePortLocationLevelIds: number[];

  @Input() set defaultStatus(value: number) {
    if (this._defaultStatus !== value) {
      this._defaultStatus = value;
      console.debug('[form-vessel] Changing default status to:' + value);
      if (this.form) {
        this.form.patchValue({ statusId: this.defaultStatus });
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
        registrationLocationControl.patchValue({ registrationLocation: value });
      }
    }
  }

  get defaultRegistrationLocation(): ReferentialRef {
    return this._defaultRegistrationLocation;
  }

  @Input() set basePortLocationSuggestLengthThreshold(value: number) {
    if (this._basePortLocationSuggestLengthThreshold !== value) {
      this._basePortLocationSuggestLengthThreshold = value;

      // Update fields
      if (this.autocompleteFields.basePortLocation) {
        this.autocompleteFields.basePortLocation.suggestLengthThreshold = value;
      }
    }
  }

  get basePortLocationSuggestLengthThreshold() {
    return this._basePortLocationSuggestLengthThreshold;
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
    protected vesselValidatorService: VesselValidatorService,
    protected referentialRefService: ReferentialRefService,
    private accountService: AccountService
  ) {
    super(vesselValidatorService.getFormGroup());
    this.mobile = this.settings.mobile;
    this.canEditStatus = this.accountService.isAdmin();
  }

  ngOnInit() {
    super.ngOnInit();

    // Compute defaults
    this.showError = toBoolean(this.showError, true);
    this.canEditStatus = toBoolean(this.canEditStatus, !this._defaultStatus || this.isAdmin());
    this.referentialRefService.ready().then(() => {
      this.registrationLocationLevelIds = this.registrationLocationLevelIds || [LocationLevelIds.COUNTRY];
    });

    // Combo location
    const locationConfig: MatAutocompleteFieldConfig = {
      attributes: this.settings.getFieldDisplayAttributes('location'),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      mobile: this.mobile,
    };
    this.registerAutocompleteField('basePortLocation', {
      ...locationConfig,
      suggestLengthThreshold: this._basePortLocationSuggestLengthThreshold,
      suggestFn: (value, filter) => {
        return this.referentialRefService.suggest(value, { ...filter, levelIds: this.basePortLocationLevelIds || [LocationLevelIds.PORT] });
      },
    });
    this.registerAutocompleteField('registrationLocation', {
      ...locationConfig,
      suggestFn: (value, filter) => {
        return this.referentialRefService.suggest(value, { ...filter, levelIds: this.registrationLocationLevelIds || [LocationLevelIds.COUNTRY] });
      },
    });
    this.registerAutocompleteField('vesselType', {
      service: this.referentialRefService,
      attributes: ['name'],
      filter: {
        entityName: 'VesselType',
        statusId: StatusIds.ENABLE,
      },
      mobile: this.mobile,
    });

    // Combo hull material
    this.registerAutocompleteField('hullMaterial', {
      // TODO use suggest function, and load Pmfm qualitative value, using PmfmIds.HULL_MATERIAL
      service: this.referentialRefService,
      attributes: ['name'],
      filter: {
        entityName: 'QualitativeValue',
        levelLabel: 'HULL_MATERIAL',
        statusId: StatusIds.ENABLE,
      },
      mobile: this.mobile,
    });

    if (this._defaultStatus) {
      this.form.patchValue({
        statusId: this._defaultStatus,
      });
    }

    if (this._defaultRegistrationLocation) {
      this.registrationForm.patchValue({
        registrationLocation: this._defaultRegistrationLocation,
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
      maxDate: this.maxDate,
    };

    // DEBUG
    console.debug(`[form-vessel] Updating form group (validators)`, validatorOpts);

    this.vesselValidatorService.updateFormGroup(this.form, validatorOpts);

    if (!opts || opts.emitEvent !== false) {
      this.form.updateValueAndValidity();
      this.markForCheck();
    }
  }
}
