import { Injectable } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AbstractControl, AbstractControlOptions, AsyncValidatorFn, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { PositionValidatorService } from './position.validator';
import {
  AppFormUtils,
  equals,
  FormErrors,
  fromDateISOString,
  isNil,
  isNotNil,
  LocalSettingsService,
  SharedFormGroupValidators,
  SharedValidators,
  toBoolean,
  toNumber
} from '@sumaris-net/ngx-components';
import { DataEntityValidatorOptions, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { AcquisitionLevelCodes, PmfmIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { Program } from '@app/referential/services/model/program.model';
import { MeasurementsValidatorService } from './measurement.validator';
import { Operation, Trip } from '../model/trip.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { FishingAreaValidatorService } from '@app/trip/services/validator/fishing-area.validator';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { merge, Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { PositionUtils } from '@app/trip/services/position.utils';
import { BBox } from 'geojson';
import { VesselPosition } from '@app/data/services/model/vessel-position.model';
import { Geometries } from '@app/shared/geometries.utils';
import { TranslateService } from '@ngx-translate/core';
import { getFormOptions, setFormOptions } from '@app/trip/batch/common/batch.validator';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import {PhysicalGearValidatorOptions} from '@app/trip/physicalgear/physicalgear.validator';


export interface IPmfmForm {
  form: UntypedFormGroup;
  pmfms: IPmfm[];
  markForCheck: () => void;
}

export interface OperationValidatorOptions extends DataEntityValidatorOptions {
  program?: Program;
  withMeasurements?: boolean;
  allowParentOperation?: boolean;
  isChild?: boolean;
  isParent?: boolean;
  withPosition?: boolean;
  withFishingAreas?: boolean;
  withChildOperation?: boolean;
  withFishingStart?: boolean;
  withFishingEnd?: boolean;
  withEnd?: boolean;
  maxDistance?: number;
  maxShootingDurationInHours?: number;
  maxTotalDurationInHours?: number;
  boundingBox?: BBox;
  trip?: Trip;
  pmfms?: DenormalizedPmfmStrategy[];
}


@Injectable({providedIn: 'root'})
export class OperationValidatorService<O extends OperationValidatorOptions = OperationValidatorOptions>
  extends DataEntityValidatorService<Operation, O>
  implements ValidatorService {

  static readonly DEFAULT_MAX_TOTAL_DURATION_HOURS = 100 * 24; // 100 days
  static readonly DEFAULT_MAX_SHOOTING_DURATION_HOURS = 12; // 12 hours

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    private positionValidator: PositionValidatorService,
    private fishingAreaValidator: FishingAreaValidatorService,
    private programRefService: ProgramRefService,
    protected measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: Operation, opts?: O): UntypedFormGroup {
    opts = opts || <O>{};

    const form = super.getFormGroup(data, opts);

    // Do not store options here - will be done in updateFormGroup()
    //setFormOptions(form, opts);

    // Add measurement form
    if (opts.withMeasurements) {
      if (!opts.pmfms) {
        const acquisitionLevel = opts.isChild ? AcquisitionLevelCodes.CHILD_OPERATION : AcquisitionLevelCodes.OPERATION;
        opts.pmfms = (opts.program?.strategies?.[0] && opts.program.strategies[0].denormalizedPmfms || [])
          .filter(p => p.acquisitionLevel === acquisitionLevel);
      }
      form.addControl('measurements', this.measurementsValidatorService.getFormGroup(data && data.measurements, {
        forceOptional: opts.isOnFieldMode,
        pmfms: opts.pmfms
      }));
    }

    // Add position
    if (opts.withPosition) {
      form.addControl('startPosition', this.positionValidator.getFormGroup(data?.startPosition || null, {
        __typename: VesselPosition.TYPENAME,
        required: true,
        boundingBox: opts?.boundingBox
      }));

      if (opts.withFishingStart) {
        form.addControl('fishingStartPosition', this.positionValidator.getFormGroup(data?.fishingStartPosition || null, {
          __typename: VesselPosition.TYPENAME,
          required: opts && !opts.isOnFieldMode,
          boundingBox: opts?.boundingBox
        }));
      }
      if (opts.withFishingEnd) {
        form.addControl('fishingEndPosition', this.positionValidator.getFormGroup(data?.fishingEndPosition || null, {
          __typename: VesselPosition.TYPENAME,
          required: opts && !opts.isOnFieldMode,
          boundingBox: opts?.boundingBox
        }));
      }
      if (opts.withEnd) {
        form.addControl('endPosition', this.positionValidator.getFormGroup(data?.endPosition || null, {
          __typename: VesselPosition.TYPENAME,
          required: opts && !opts.isOnFieldMode,
          boundingBox: opts?.boundingBox
        }));
      }
    }

    // Add fishing Ares
    if (opts.withFishingAreas) {
      form.addControl('fishingAreas', this.getFishingAreasArray(data, {required: true}));
    }

    // Add child operation
    if (opts.withChildOperation) {
      form.addControl('childOperation', this.createChildOperationControl(data?.childOperation));
    }

    // Execute once, to be sure validators are same
    this.updateFormGroup(form, opts);


    return form;
  }

  getFormGroupConfig(data?: Operation, opts?: O): { [key: string]: any } {

    const formConfig = Object.assign(
      super.getFormGroupConfig(data, opts),
      {
        __typename: [Operation.TYPENAME],
        startDateTime: [data && data.startDateTime || null, Validators.required],
        fishingStartDateTime: [data && data.fishingStartDateTime || null],
        fishingEndDateTime: [data && data.fishingEndDateTime || null],
        endDateTime: [data && data.endDateTime || null, SharedValidators.copyParentErrors(['dateRange', 'dateMaxDuration'])],
        tripId: [toNumber(data?.tripId, null)],
        rankOrder: [toNumber(data?.rankOrder, null)],
        rankOrderOnPeriod: [toNumber(data?.rankOrderOnPeriod, null)],
        metier: [data && data.metier || null, Validators.compose([Validators.required, SharedValidators.entity])],
        // Use object validator instead of entity because physical gear may have no id when it's adding from parent operation and doesn't exist yet on trip
        physicalGear: [data && data.physicalGear || null, Validators.compose([Validators.required, SharedValidators.object])],
        comments: [data && data.comments || null, Validators.maxLength(2000)],

        parentOperation: [data && data.parentOperation || null], // Validators define later, in updateFormGroup
        parentOperationId: [toNumber(data && data.parentOperationId, null)],
        childOperationId: [toNumber(data && data.childOperationId, null)]
      });

    return formConfig;
  }

  getFormGroupOptions(data?: Operation, opts?: O): AbstractControlOptions {

    // Parent operation (=Filage)
    if (opts?.isParent || data?.childOperation) {
      return {
        validators: Validators.compose([
          // Make sure date range
          SharedFormGroupValidators.dateRange('startDateTime', 'fishingStartDateTime'),
          // Check shooting (=Filage) max duration
          SharedFormGroupValidators.dateMaxDuration('startDateTime', 'fishingStartDateTime', opts?.maxShootingDurationInHours || OperationValidatorService.DEFAULT_MAX_SHOOTING_DURATION_HOURS, 'hour')
        ])
      };
    }

    // Child operation (=Virage)
    else if (opts?.isChild || data?.parentOperation) {
      return {
        validators: Validators.compose([
          // Make sure date range
          SharedFormGroupValidators.dateRange('fishingEndDateTime', 'endDateTime'),
          // Check shooting (=Virage) max duration
          SharedFormGroupValidators.dateMaxDuration('fishingEndDateTime', 'endDateTime', opts?.maxShootingDurationInHours || OperationValidatorService.DEFAULT_MAX_SHOOTING_DURATION_HOURS, 'hour'),
          // Check total max duration
          SharedFormGroupValidators.dateMaxDuration('startDateTime', 'endDateTime', opts?.maxTotalDurationInHours || OperationValidatorService.DEFAULT_MAX_TOTAL_DURATION_HOURS, 'hour'),
        ])
      };

    }

    // Default case
    else {
      return {
        validators: Validators.compose([
          SharedFormGroupValidators.dateRange('startDateTime', 'endDateTime'),
          // Check total max duration
          SharedFormGroupValidators.dateMaxDuration('startDateTime', 'endDateTime', opts?.maxTotalDurationInHours || OperationValidatorService.DEFAULT_MAX_TOTAL_DURATION_HOURS, 'hour')
        ])
      };

    }

  }

  /**
   * Update form group, with new options
   * @param form
   * @param opts
   */
  updateFormGroup(form: UntypedFormGroup, opts?: O) {
    opts = this.fillDefaultOptions(opts);

    const previousOptions = getFormOptions(form);

    // Skip if same
    if (equals(previousOptions, opts)) {
      console.debug('[operation-validator] Skipping form update (same options)')
      return;
    }

    setFormOptions(form, opts);

    // DEBUG
    console.debug(`[operation-validator] Updating form group validators`);

    const positionOpts = {
      __typename: VesselPosition.TYPENAME,
      boundingBox: opts?.boundingBox
    }
    // Start position
    if (opts.withPosition) {
      if (!form.controls.startPosition) {
        form.addControl('startPosition', this.positionValidator.getFormGroup(null, {
          ...positionOpts,
          required: true
        }));
      }
      else {
        this.positionValidator.updateFormGroup(form.controls.startPosition, {
          ...positionOpts,
          required: true
        })
      }
    } else {
      if (form.controls.startPosition) form.removeControl('startPosition');
    }

    // Fishing start position
    if (opts.withPosition && opts.withFishingStart) {
      if (!form.controls.fishingStartPosition) {
        form.addControl('fishingStartPosition', this.positionValidator.getFormGroup(null, {
            ...positionOpts,
          boundingBox: opts?.boundingBox
        }));
      }
      else {
        this.positionValidator.updateFormGroup(form.controls.fishingStartPosition, {
          ...positionOpts,
          required: opts && !opts.isOnFieldMode
        });
      }
    } else {
      if (form.controls.fishingStartPosition) form.removeControl('fishingStartPosition');
    }

    // Fishing end position
    if (opts.withPosition && opts.withFishingEnd && !opts.isParent) {
      if (!form.controls.fishingEndPosition) {
        form.addControl('fishingEndPosition', this.positionValidator.getFormGroup(null, {
          ...positionOpts,
          required: opts && !opts.isOnFieldMode
        }));
      }
      else {
        this.positionValidator.updateFormGroup(form.controls.fishingEndPosition, {
          ...positionOpts,
          required: opts && !opts.isOnFieldMode
        });
      }
    } else {
      if (form.controls.fishingEndPosition) form.removeControl('fishingEndPosition');
    }

    // End position
    if (opts.withPosition && opts.withEnd && !opts.isParent) {
      if (!form.controls.endPosition) {
        form.addControl('endPosition', this.positionValidator.getFormGroup(null, {
          ...positionOpts,
          required: opts && !opts.isOnFieldMode
        }));
      }
      else {
        this.positionValidator.updateFormGroup(form.controls.endPosition, {
          ...positionOpts,
          required: opts && !opts.isOnFieldMode
        });
      }
    } else {
      if (form.controls.endPosition) form.removeControl('endPosition');
    }

    // Add fishing areas
    if (opts.withFishingAreas) {
      if (!form.controls.fishingAreas) form.addControl('fishingAreas', this.getFishingAreasArray(null, {required: true}));
    } else {
      if (form.controls.fishingAreas) form.removeControl('fishingAreas');
    }

    const parentControl = form.get('parentOperation');
    let childControl = form.get('childOperation');
    const qualityFlagControl = form.get('qualityFlagId');
    const fishingStartDateTimeControl = form.get('fishingStartDateTime');
    const fishingEndDateTimeControl = form.get('fishingEndDateTime');
    const startDateTimeControl = form.get('startDateTime');
    const endDateTimeControl = form.get('endDateTime');
    const fishingStartPositionControl = form.get('fishingStartPosition');
    const fishingEndPositionControl = form.get('fishingEndPosition');
    const endPositionControl = form.get('endPosition');

    // Validator to date inside the trip
    const tripDatesValidators = opts?.trip && [this.createTripDatesValidator(opts.trip)] || [];

    // Is a parent
    if (opts.isParent) {
      console.info('[operation-validator] Updating validator -> Parent operation');
      parentControl.clearValidators();
      parentControl.disable();

      if (!childControl) {
        console.info('[operation-validator] Updating validator -> Add childOperation control');
        childControl = this.createChildOperationControl(null);
        form.addControl('childOperation', childControl);
      }
      childControl.enable();

      // Set Quality flag, to mark as parent operation
      qualityFlagControl.setValidators(Validators.required);
      qualityFlagControl.patchValue(QualityFlagIds.NOT_COMPLETED, {emitEvent: false});

      // startDateTime = START
      // fishingStartDateTime = END
      if (opts.withFishingStart) {
        const fishingStartDateTimeValidators = [
          ...tripDatesValidators,
          SharedValidators.dateRangeEnd('startDateTime'),
          opts.withFishingEnd
            ? SharedValidators.dateRangeStart('childOperation.fishingEndDateTime', 'TRIP.OPERATION.ERROR.FIELD_DATE_AFTER_CHILD_OPERATION')
            : SharedValidators.dateRangeStart('childOperation.endDateTime', 'TRIP.OPERATION.ERROR.FIELD_DATE_AFTER_CHILD_OPERATION'),
        ];
        fishingStartDateTimeControl.setValidators(opts?.isOnFieldMode
          ? Validators.compose(fishingStartDateTimeValidators)
          : Validators.compose([Validators.required, ...fishingStartDateTimeValidators]));
        fishingStartDateTimeControl.enable();

        // Enable position
        fishingStartPositionControl?.enable();
      } else {
        //If not fishing start, make control on start
        startDateTimeControl.setValidators(Validators.compose([
          ...tripDatesValidators,
          Validators.required,
          SharedValidators.dateRangeStart('childOperation.fishingEndDateTime', 'TRIP.OPERATION.ERROR.FIELD_DATE_AFTER_CHILD_OPERATION')
        ]));
        startDateTimeControl.enable();

        fishingStartDateTimeControl.disable();
        fishingStartDateTimeControl.clearValidators();

        // Disable position
        fishingStartPositionControl?.clearValidators();
        fishingStartPositionControl?.disable();
      }

      // Disable unused controls
      fishingEndDateTimeControl.disable();
      fishingEndDateTimeControl.clearValidators();
      endDateTimeControl.disable();
      endDateTimeControl.clearValidators();
      fishingEndPositionControl?.clearValidators();
      fishingEndPositionControl?.disable();
      endPositionControl?.clearValidators();
      endPositionControl?.disable();
    }

    // Is a child
    else if (opts.isChild) {
      console.info('[operation-validator] Updating validator -> Child operation');
      const tripIdControl = form.controls.tripId as UntypedFormGroup;
      const parentValidators = [Validators.required,
        opts && !opts.isOnFieldMode ? OperationValidators.remoteParent(tripIdControl) : SharedValidators.entity,
        OperationValidators.existsParent
      ];
      parentControl.setValidators(Validators.compose(parentValidators));
      parentControl.enable();

      if (childControl) {
        form.removeControl('childOperation');
      }

      // Clear quality flag
      qualityFlagControl.clearValidators();
      if (isNil(qualityFlagControl.value) || qualityFlagControl.value === QualityFlagIds.NOT_COMPLETED) {
        qualityFlagControl.patchValue(QualityFlagIds.NOT_QUALIFIED, {emitEvent: false});
      }

      // fishingEndDateTime = START
      if (opts.withFishingEnd) {
        fishingEndDateTimeControl.setValidators(Validators.compose([
          Validators.required,
          // Should be after parent dates
          opts.withFishingStart
            ? SharedValidators.dateRangeEnd('fishingStartDateTime', 'TRIP.OPERATION.ERROR.FIELD_DATE_BEFORE_PARENT_OPERATION')
            : SharedValidators.dateRangeEnd('startDateTime', 'TRIP.OPERATION.ERROR.FIELD_DATE_BEFORE_PARENT_OPERATION')
        ]));
        fishingEndDateTimeControl.enable();

        // Enable position
        fishingEndPositionControl?.enable();
      } else {
        fishingEndDateTimeControl.clearValidators();
        fishingEndDateTimeControl.disable();

        // Disable position
        fishingEndPositionControl?.clearValidators();
        fishingEndPositionControl?.disable();
      }

      if (opts.withEnd) {
        // endDateTime = END
        const endDateTimeValidators = [
          ...tripDatesValidators,
          SharedValidators.copyParentErrors(['dateRange', 'dateMaxDuration'])
        ];
        endDateTimeControl.setValidators(opts?.isOnFieldMode
          ? Validators.compose(endDateTimeValidators)
          : Validators.compose([Validators.required, ...endDateTimeValidators]));
        endDateTimeControl.enable();

        // Enable position
        endPositionControl?.enable();
      } else {
        endDateTimeControl.clearValidators();
        endDateTimeControl.disable();

        // Disable position
        endPositionControl?.clearValidators();
        endPositionControl?.disable();
      }

      // Disable unused controls
      // Remove tripDatesValidators set on these controls on first page load as parent operation (allow startDateTime and fishingStartDateTime to be before tripDepartureDateTime)
      startDateTimeControl.clearValidators();
      fishingStartDateTimeControl.clearValidators();
      startDateTimeControl.enable();
      fishingStartDateTimeControl.enable();
      fishingStartDateTimeControl.updateValueAndValidity({emitEvent: false});
    }

    // Default case
    else {
      console.info('[operation-validator] Applying default validator');
      parentControl.clearValidators();
      parentControl.disable();

      if (childControl) {
        form.removeControl('childOperation');
      }

      // Clear quality flag
      qualityFlagControl.clearValidators();
      if (isNil(qualityFlagControl.value) || qualityFlagControl.value === QualityFlagIds.NOT_COMPLETED) {
        qualityFlagControl.patchValue(QualityFlagIds.NOT_QUALIFIED, {emitEvent: false});
      }

      if (opts.withEnd) {
        // = END DATE
        const endDateTimeValidators = [
          ...tripDatesValidators,
          SharedValidators.copyParentErrors(['dateRange', 'dateMaxDuration'])
        ];
        endDateTimeControl.setValidators(opts?.isOnFieldMode
          ? Validators.compose(endDateTimeValidators)
          : Validators.compose([Validators.required, ...endDateTimeValidators]));
        endDateTimeControl.enable();

        // Enable position
        endPositionControl?.enable();
      } else {
        endDateTimeControl.clearValidators();
        endDateTimeControl.disable();

        // Disable position
        endPositionControl?.clearValidators();
        endPositionControl?.disable();
      }
      // Disable unused controls
      // TODO: use program options xxx.enable
      fishingStartDateTimeControl.disable();
      fishingStartDateTimeControl.clearValidators();
      fishingEndDateTimeControl.disable();
      fishingEndDateTimeControl.clearValidators();

      fishingEndPositionControl?.disable();
      fishingEndPositionControl?.clearValidators();
    }

    // Max distance validators
    if (opts.withPosition) {
      if (opts.maxDistance > 0) {
        const startPositionControl = form.controls.startPosition as UntypedFormGroup;
        const lastEndPositionControl = [endPositionControl, fishingEndPositionControl, fishingStartPositionControl]
          .find(c => c?.enabled);
        if (lastEndPositionControl) {
          lastEndPositionControl.setValidators(
            OperationValidators.maxDistance(startPositionControl, opts.maxDistance)
          );
          lastEndPositionControl.updateValueAndValidity({emitEvent: false});
        }
      }
    }

    // Update form group validators
    const formValidators = this.getFormGroupOptions(null, opts)?.validators;
    form.setValidators(formValidators);
  }

  /* -- protected methods -- */

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);

    opts.withMeasurements = toBoolean(opts.withMeasurements, toBoolean(!!opts.program, false));
    opts.withPosition = toBoolean(opts.withPosition, toBoolean(opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_POSITION_ENABLE), true));
    opts.withFishingAreas = toBoolean(opts.withFishingAreas, !opts.withPosition);
    opts.withChildOperation = toBoolean(opts.withChildOperation, toBoolean(opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION), false));
    opts.withFishingStart = toBoolean(opts.withFishingStart, toBoolean(opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE), false));
    opts.withFishingEnd = toBoolean(opts.withFishingEnd, toBoolean(opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE), false));
    opts.withEnd = toBoolean(opts.withEnd, toBoolean(opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE), true));
    opts.maxDistance = toNumber(opts.maxDistance, opts.program?.getPropertyAsInt(ProgramProperties.TRIP_DISTANCE_MAX_ERROR));
    opts.boundingBox = opts.boundingBox || Geometries.parseAsBBox(opts.program?.getProperty(ProgramProperties.TRIP_POSITION_BOUNDING_BOX));
    opts.maxTotalDurationInHours = toNumber(opts.maxTotalDurationInHours, opts.program?.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_TOTAL_DURATION_HOURS));
    opts.maxShootingDurationInHours = toNumber(opts.maxShootingDurationInHours, opts.program?.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_SHOOTING_DURATION_HOURS));

    // DEBUG
    //console.debug("[operation-validator] Ope Validator will use options:", opts);

    return opts;
  }

  protected composeToAsync(validators: ValidatorFn[]): AsyncValidatorFn {
    return async (control) => {
      if (!control.touched && !control.dirty) return null;

      const errors: ValidationErrors = validators
        .map(validator => validator(control))
        .find(isNotNil) || null;

      // Clear unused errors
      if (!errors || !errors.msg) SharedValidators.clearError(control, 'msg');
      if (!errors || !errors.required) SharedValidators.clearError(control, 'required');
      return errors;
    };
  }

  protected createTripDatesValidator(trip): ValidatorFn {
    return (control) => {
      const dateTime = fromDateISOString(control.value);
      const tripDepartureDateTime = fromDateISOString(trip.departureDateTime);
      const tripReturnDateTime = fromDateISOString(trip.returnDateTime);

      // Make sure trip.departureDateTime < operation.endDateTime
      if (dateTime && tripDepartureDateTime && tripDepartureDateTime.isBefore(dateTime) === false) {
        console.warn(`[operation] Invalid operation: before the trip`, dateTime, tripDepartureDateTime);
        return <ValidationErrors>{msg: 'TRIP.OPERATION.ERROR.FIELD_DATE_BEFORE_TRIP'};
      }
      // Make sure operation.endDateTime < trip.returnDateTime
      else if (dateTime && tripReturnDateTime && dateTime.isBefore(tripReturnDateTime) === false) {
        console.warn(`[operation] Invalid operation: after the trip`, dateTime, tripReturnDateTime);
        return <ValidationErrors>{msg: 'TRIP.OPERATION.ERROR.FIELD_DATE_AFTER_TRIP'};
      }
    };
  }

  protected getFishingAreasArray(data?: Operation, opts?: { required?: boolean }) {
    const required = !opts || opts.required !== false;
    return this.formBuilder.array(
      (data && data.fishingAreas || [null]).map(fa => this.fishingAreaValidator.getFormGroup(fa, {required})),
      required ? OperationValidators.requiredArrayMinLength(1) : undefined
    );
  }

  protected createChildOperationControl(data?: Operation): AbstractControl {
    return this.formBuilder.group({
      id: [toNumber(data && data.id, null)],
      startDateTime: [data && data.startDateTime || null],
      fishingStartDateTime: [data && data.fishingStartDateTime || null],
      fishingEndDateTime: [data && data.fishingEndDateTime || null],
      endDateTime: [data && data.endDateTime || null]
    });
  }

}

export class OperationValidators {


  static requiredArrayMinLength(minLength?: number): ValidatorFn {
    minLength = minLength || 1;
    return (array: UntypedFormArray): ValidationErrors | null => {
      if (!array || array.length < minLength) {
        return {required: true};
      }
      return null;
    };
  }

  static addSampleValidators(pmfmForm: IPmfmForm): Subscription {
    const {form, pmfms} = pmfmForm;
    if (!form) {
      console.warn('Argument \'form\' required');
      return null;
    }

    // Disable computed pmfms
    AppFormUtils.disableControls(form,
      pmfms
        .filter(p => p.isComputed)
        .map(p => `measurementValues.${p.id}`), {onlySelf: true, emitEvent: false});

    const observables = [
      OperationValidators.listenIndividualOnDeck(pmfmForm)
    ].filter(isNotNil);

    if (!observables.length) return null;
    if (observables.length === 1) return observables[0].subscribe();
    return merge(observables).subscribe();
  }

  /**
   * Validate and compute
   * @param event
   */
  static listenIndividualOnDeck(event: IPmfmForm): Observable<any> | null {
    const {form, pmfms, markForCheck} = event;
    const measFormGroup = form.controls['measurementValues'] as UntypedFormGroup;

    // Create listener on column 'INDIVIDUAL_ON_DECK' value changes
    const individualOnDeckPmfm = pmfms.find(pmfm => pmfm.id === PmfmIds.INDIVIDUAL_ON_DECK);
    const individualOnDeckControl = individualOnDeckPmfm && measFormGroup.controls[individualOnDeckPmfm.id];
    if (individualOnDeckControl) {
      console.debug('[operation-validator] Listening if on deck...');

      return individualOnDeckControl.valueChanges
        .pipe(
          startWith(individualOnDeckControl.value),
          map((individualOnDeck) => {
            if (individualOnDeck) {
              if (form.enabled) {
                pmfms.filter(pmfm => pmfm.rankOrder > individualOnDeckPmfm.rankOrder && pmfm.id !== PmfmIds.TAG_ID)
                  .map(pmfm => {
                    const control = measFormGroup.controls[pmfm.id];
                    if (pmfm.required) {
                      control.setValidators(Validators.required);
                    }
                    control.enable();
                  });
                if (markForCheck) markForCheck();
              }
            } else {
              if (form.enabled) {
                pmfms.filter(pmfm => pmfm.rankOrder > individualOnDeckPmfm.rankOrder && pmfm.id !== PmfmIds.TAG_ID)
                  .map(pmfm => {
                    const control = measFormGroup.controls[pmfm.id];
                    control.disable();
                    control.reset(null, {emitEvent: false});
                    control.setValidators(null);
                  });
                if (markForCheck) markForCheck();
              }
            }
            return null;
          })
        );
    }
    return null;
  }


  static maxDistance(otherPositionForm: UntypedFormGroup, maxInMiles: number): ValidatorFn {
    return (control): FormErrors => {
      const distance = PositionUtils.computeDistanceInMiles(otherPositionForm.value, control.value);
      if (distance > maxInMiles) {
        return {maxDistance: {distance, max: maxInMiles}};
      }
      return undefined;
    };
  }

  static remoteParent(tripIdControl: UntypedFormGroup): ValidatorFn {
    return (control): FormErrors => {
      const parent = control.value;
      const parentId = parent?.id;
      // Error if the parent is a local operation, defined in another trip
      // Same trip should be OK
      if (isNotNil(parentId) && parentId < 0) {
        const tripId = toNumber(tripIdControl.value);
        const parentTripId = parent?.tripId;
        if (isNotNil(parentTripId) && parentTripId !== tripId) {
          return <ValidationErrors>{ remoteParent: true };
        }
      }
      return null;
    };
  }

  static existsParent(control): ValidationErrors|undefined {
    const parent = control.value as DataEntity<any>;
    const qualityFlagId = parent?.qualityFlagId;
    if (qualityFlagId === QualityFlagIds.MISSING) {
      return {existsParent: true}
    }
    return null;
  }
}


export const OPERATION_VALIDATOR_I18N_ERROR_KEYS = {
  maxDistance: 'TRIP.OPERATION.ERROR.TOO_LONG_DISTANCE',
  remoteParent: 'TRIP.OPERATION.ERROR.LOCAL_PARENT_OPERATION',
  existsParent: 'TRIP.OPERATION.ERROR.MISSING_PARENT_OPERATION',
  invalidOrIncomplete: 'ERROR.INVALID_OR_INCOMPLETE_FILL'
};
