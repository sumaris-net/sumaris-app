var OperationValidatorService_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators, } from '@angular/forms';
import { PositionValidatorService } from '@app/data/position/position.validator';
import { AppFormArray, AppFormUtils, equals, fromDateISOString, isNil, isNotNil, LocalSettingsService, SharedFormArrayValidators, SharedFormGroupValidators, SharedValidators, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { AcquisitionLevelCodes, PmfmIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Operation } from '../trip/trip.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { FishingAreaValidatorService } from '@app/data/fishing-area/fishing-area.validator';
import { merge } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { PositionUtils } from '@app/data/position/position.utils';
import { VesselPosition } from '@app/data/position/vessel/vessel-position.model';
import { Geometries } from '@app/shared/geometries.utils';
import { TranslateService } from '@ngx-translate/core';
import { getFormOptions, setFormOptions } from '@app/trip/batch/common/batch.validator';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
let OperationValidatorService = OperationValidatorService_1 = class OperationValidatorService extends DataEntityValidatorService {
    constructor(formBuilder, translate, settings, positionValidator, fishingAreaValidator, measurementsValidatorService) {
        super(formBuilder, translate, settings);
        this.positionValidator = positionValidator;
        this.fishingAreaValidator = fishingAreaValidator;
        this.measurementsValidatorService = measurementsValidatorService;
    }
    getFormGroup(data, opts) {
        var _a, _b;
        opts = opts || {};
        const form = super.getFormGroup(data, opts);
        // Do not store options here - will be done in updateFormGroup()
        //setFormOptions(form, opts);
        // Add measurement form
        if (opts.withMeasurements) {
            if (!opts.pmfms) {
                const acquisitionLevel = opts.isChild ? AcquisitionLevelCodes.CHILD_OPERATION : AcquisitionLevelCodes.OPERATION;
                opts.pmfms = (((_b = (_a = opts.program) === null || _a === void 0 ? void 0 : _a.strategies) === null || _b === void 0 ? void 0 : _b[0]) && opts.program.strategies[0].denormalizedPmfms || [])
                    .filter(p => p.acquisitionLevel === acquisitionLevel);
            }
            form.addControl('measurements', this.measurementsValidatorService.getFormGroup(data && data.measurements, {
                forceOptional: opts.isOnFieldMode,
                pmfms: opts.pmfms
            }));
        }
        // Add position
        if (opts.withPosition) {
            form.addControl('startPosition', this.positionValidator.getFormGroup((data === null || data === void 0 ? void 0 : data.startPosition) || null, {
                __typename: VesselPosition.TYPENAME,
                required: true,
                boundingBox: opts === null || opts === void 0 ? void 0 : opts.boundingBox
            }));
            if (opts.withFishingStart) {
                form.addControl('fishingStartPosition', this.positionValidator.getFormGroup((data === null || data === void 0 ? void 0 : data.fishingStartPosition) || null, {
                    __typename: VesselPosition.TYPENAME,
                    required: opts && !opts.isOnFieldMode,
                    boundingBox: opts === null || opts === void 0 ? void 0 : opts.boundingBox
                }));
            }
            if (opts.withFishingEnd) {
                form.addControl('fishingEndPosition', this.positionValidator.getFormGroup((data === null || data === void 0 ? void 0 : data.fishingEndPosition) || null, {
                    __typename: VesselPosition.TYPENAME,
                    required: opts && !opts.isOnFieldMode,
                    boundingBox: opts === null || opts === void 0 ? void 0 : opts.boundingBox
                }));
            }
            if (opts.withEnd) {
                form.addControl('endPosition', this.positionValidator.getFormGroup((data === null || data === void 0 ? void 0 : data.endPosition) || null, {
                    __typename: VesselPosition.TYPENAME,
                    required: opts && !opts.isOnFieldMode,
                    boundingBox: opts === null || opts === void 0 ? void 0 : opts.boundingBox
                }));
            }
        }
        // Add fishing Ares
        if (opts.withFishingAreas) {
            form.addControl('fishingAreas', this.getFishingAreasArray(data === null || data === void 0 ? void 0 : data.fishingAreas, { required: true }));
        }
        // Add child operation
        if (opts.withChildOperation) {
            form.addControl('childOperation', this.createChildOperationControl(data === null || data === void 0 ? void 0 : data.childOperation));
        }
        // Execute once, to be sure validators are same
        this.updateFormGroup(form, opts);
        return form;
    }
    getFormGroupConfig(data, opts) {
        const formConfig = Object.assign(super.getFormGroupConfig(data, opts), {
            __typename: [Operation.TYPENAME],
            startDateTime: [data && data.startDateTime || null, Validators.required],
            fishingStartDateTime: [data && data.fishingStartDateTime || null],
            fishingEndDateTime: [data && data.fishingEndDateTime || null],
            endDateTime: [data && data.endDateTime || null, SharedValidators.copyParentErrors(['dateRange', 'dateMaxDuration'])],
            tripId: [toNumber(data === null || data === void 0 ? void 0 : data.tripId, null)],
            rankOrder: [toNumber(data === null || data === void 0 ? void 0 : data.rankOrder, null)],
            rankOrderOnPeriod: [toNumber(data === null || data === void 0 ? void 0 : data.rankOrderOnPeriod, null)],
            // Use object validator instead of entity because physical gear may have no id when it's adding from parent operation and doesn't exist yet on trip
            physicalGear: [data && data.physicalGear || null, Validators.compose([Validators.required, SharedValidators.object])],
            comments: [data && data.comments || null, Validators.maxLength(2000)],
            // Parent / child
            parentOperation: [data && data.parentOperation || null],
            parentOperationId: [toNumber(data && data.parentOperationId, null)],
            childOperationId: [toNumber(data && data.childOperationId, null)]
        });
        // Add metier
        if (opts.withMetier) {
            formConfig['metier'] = [data && data.metier || null, Validators.compose([Validators.required, SharedValidators.entity])];
        }
        return formConfig;
    }
    getFormGroupOptions(data, opts) {
        // Parent operation (=Filage)
        if ((opts === null || opts === void 0 ? void 0 : opts.isParent) || (data === null || data === void 0 ? void 0 : data.childOperation)) {
            return {
                validators: Validators.compose([
                    // Make sure date range
                    SharedFormGroupValidators.dateRange('startDateTime', 'fishingStartDateTime'),
                    // Check shooting (=Filage) max duration
                    SharedFormGroupValidators.dateMaxDuration('startDateTime', 'fishingStartDateTime', (opts === null || opts === void 0 ? void 0 : opts.maxShootingDurationInHours) || OperationValidatorService_1.DEFAULT_MAX_SHOOTING_DURATION_HOURS, 'hour')
                ])
            };
        }
        // Child operation (=Virage)
        else if ((opts === null || opts === void 0 ? void 0 : opts.isChild) || (data === null || data === void 0 ? void 0 : data.parentOperation)) {
            return {
                validators: Validators.compose([
                    // Make sure date range
                    SharedFormGroupValidators.dateRange('fishingEndDateTime', 'endDateTime'),
                    // Check shooting (=Virage) max duration
                    SharedFormGroupValidators.dateMaxDuration('fishingEndDateTime', 'endDateTime', (opts === null || opts === void 0 ? void 0 : opts.maxShootingDurationInHours) || OperationValidatorService_1.DEFAULT_MAX_SHOOTING_DURATION_HOURS, 'hour'),
                    // Check total max duration
                    SharedFormGroupValidators.dateMaxDuration('startDateTime', 'endDateTime', (opts === null || opts === void 0 ? void 0 : opts.maxTotalDurationInHours) || OperationValidatorService_1.DEFAULT_MAX_TOTAL_DURATION_HOURS, 'hour'),
                ])
            };
        }
        // Default case
        else {
            return {
                validators: Validators.compose([
                    SharedFormGroupValidators.dateRange('startDateTime', 'endDateTime'),
                    // Check total max duration
                    SharedFormGroupValidators.dateMaxDuration('startDateTime', 'endDateTime', (opts === null || opts === void 0 ? void 0 : opts.maxTotalDurationInHours) || OperationValidatorService_1.DEFAULT_MAX_TOTAL_DURATION_HOURS, 'hour')
                ])
            };
        }
    }
    /**
     * Update form group, with new options
     *
     * @param form
     * @param opts
     */
    updateFormGroup(form, opts) {
        var _a;
        opts = this.fillDefaultOptions(opts);
        const previousOptions = getFormOptions(form);
        // Skip if same options
        if (equals(previousOptions, opts)) {
            console.debug('[operation-validator] Skipping form update (same options)');
            return;
        }
        // DEBUG
        console.debug(`[operation-validator] Updating form group validators`);
        // Remember options, for next call
        setFormOptions(form, opts);
        const enabled = form.enabled;
        // Metier control
        if (opts.withMetier) {
            if (!form.controls.metier)
                form.addControl('metier', this.formBuilder.control(null, [Validators.required, SharedValidators.entity]));
        }
        else {
            if (form.controls.metier)
                form.removeControl('metier');
        }
        const positionOpts = {
            __typename: VesselPosition.TYPENAME,
            boundingBox: opts === null || opts === void 0 ? void 0 : opts.boundingBox
        };
        // Start position
        if (opts.withPosition) {
            if (!form.controls.startPosition) {
                form.addControl('startPosition', this.positionValidator.getFormGroup(null, Object.assign(Object.assign({}, positionOpts), { required: true })));
            }
            else {
                this.positionValidator.updateFormGroup(form.controls.startPosition, Object.assign(Object.assign({}, positionOpts), { required: true }));
            }
        }
        else {
            if (form.controls.startPosition)
                form.removeControl('startPosition');
        }
        // Fishing start position
        if (opts.withPosition && opts.withFishingStart) {
            if (!form.controls.fishingStartPosition) {
                form.addControl('fishingStartPosition', this.positionValidator.getFormGroup(null, Object.assign(Object.assign({}, positionOpts), { boundingBox: opts === null || opts === void 0 ? void 0 : opts.boundingBox })));
            }
            else {
                this.positionValidator.updateFormGroup(form.controls.fishingStartPosition, Object.assign(Object.assign({}, positionOpts), { required: opts && !opts.isOnFieldMode }));
            }
        }
        else {
            if (form.controls.fishingStartPosition)
                form.removeControl('fishingStartPosition');
        }
        // Fishing end position
        if (opts.withPosition && opts.withFishingEnd && !opts.isParent) {
            if (!form.controls.fishingEndPosition) {
                form.addControl('fishingEndPosition', this.positionValidator.getFormGroup(null, Object.assign(Object.assign({}, positionOpts), { required: opts && !opts.isOnFieldMode })));
            }
            else {
                this.positionValidator.updateFormGroup(form.controls.fishingEndPosition, Object.assign(Object.assign({}, positionOpts), { required: opts && !opts.isOnFieldMode }));
            }
        }
        else {
            if (form.controls.fishingEndPosition)
                form.removeControl('fishingEndPosition');
        }
        // End position
        if (opts.withPosition && opts.withEnd && !opts.isParent) {
            if (!form.controls.endPosition) {
                form.addControl('endPosition', this.positionValidator.getFormGroup(null, Object.assign(Object.assign({}, positionOpts), { required: opts && !opts.isOnFieldMode })));
            }
            else {
                this.positionValidator.updateFormGroup(form.controls.endPosition, Object.assign(Object.assign({}, positionOpts), { required: opts && !opts.isOnFieldMode }));
            }
        }
        else {
            if (form.controls.endPosition)
                form.removeControl('endPosition');
        }
        // Add fishing areas
        if (opts.withFishingAreas) {
            if (!form.controls.fishingAreas)
                form.addControl('fishingAreas', this.getFishingAreasArray(null, { required: true }));
        }
        else {
            if (form.controls.fishingAreas)
                form.removeControl('fishingAreas');
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
        const tripDatesValidators = (opts === null || opts === void 0 ? void 0 : opts.trip) && [this.createTripDatesValidator(opts.trip)] || [];
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
            qualityFlagControl.patchValue(QualityFlagIds.NOT_COMPLETED, { emitEvent: false });
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
                fishingStartDateTimeControl.setValidators((opts === null || opts === void 0 ? void 0 : opts.isOnFieldMode)
                    ? Validators.compose(fishingStartDateTimeValidators)
                    : Validators.compose([Validators.required, ...fishingStartDateTimeValidators]));
                fishingStartDateTimeControl.enable();
                // Enable position
                fishingStartPositionControl === null || fishingStartPositionControl === void 0 ? void 0 : fishingStartPositionControl.enable();
            }
            else {
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
                fishingStartPositionControl === null || fishingStartPositionControl === void 0 ? void 0 : fishingStartPositionControl.clearValidators();
                fishingStartPositionControl === null || fishingStartPositionControl === void 0 ? void 0 : fishingStartPositionControl.disable();
            }
            // Disable unused controls
            fishingEndDateTimeControl.disable();
            fishingEndDateTimeControl.clearValidators();
            endDateTimeControl.disable();
            endDateTimeControl.clearValidators();
            fishingEndPositionControl === null || fishingEndPositionControl === void 0 ? void 0 : fishingEndPositionControl.clearValidators();
            fishingEndPositionControl === null || fishingEndPositionControl === void 0 ? void 0 : fishingEndPositionControl.disable();
            endPositionControl === null || endPositionControl === void 0 ? void 0 : endPositionControl.clearValidators();
            endPositionControl === null || endPositionControl === void 0 ? void 0 : endPositionControl.disable();
        }
        // Is a child
        else if (opts.isChild) {
            console.info('[operation-validator] Updating validator -> Child operation');
            const tripIdControl = form.controls.tripId;
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
                qualityFlagControl.patchValue(QualityFlagIds.NOT_QUALIFIED, { emitEvent: false });
            }
            // fishingEndDateTime = START
            if (opts.withFishingEnd) {
                const fishingEndDateTimeValidators = [
                    Validators.required,
                    // Should be after parent dates
                    opts.withFishingStart
                        ? SharedValidators.dateRangeEnd('fishingStartDateTime', 'TRIP.OPERATION.ERROR.FIELD_DATE_BEFORE_PARENT_OPERATION')
                        : SharedValidators.dateRangeEnd('startDateTime', 'TRIP.OPERATION.ERROR.FIELD_DATE_BEFORE_PARENT_OPERATION')
                ];
                fishingEndDateTimeControl.setValidators(opts.withEnd
                    ? fishingEndDateTimeValidators
                    // If no endDateTime, add trip dates validator
                    : [...tripDatesValidators, ...fishingEndDateTimeValidators]);
                if (enabled) {
                    fishingEndDateTimeControl.enable();
                    // Enable position
                    fishingEndPositionControl === null || fishingEndPositionControl === void 0 ? void 0 : fishingEndPositionControl.enable();
                }
            }
            else {
                fishingEndDateTimeControl.clearValidators();
                fishingEndDateTimeControl.disable();
                // Disable position
                fishingEndPositionControl === null || fishingEndPositionControl === void 0 ? void 0 : fishingEndPositionControl.clearValidators();
                fishingEndPositionControl === null || fishingEndPositionControl === void 0 ? void 0 : fishingEndPositionControl.disable();
            }
            if (opts.withEnd) {
                // endDateTime = END
                const endDateTimeValidators = [
                    ...tripDatesValidators,
                    SharedValidators.copyParentErrors(['dateRange', 'dateMaxDuration'])
                ];
                endDateTimeControl.setValidators(opts.isOnFieldMode
                    ? endDateTimeValidators
                    : [Validators.required, ...endDateTimeValidators]);
                if (enabled) {
                    endDateTimeControl.enable();
                    // Enable position
                    endPositionControl === null || endPositionControl === void 0 ? void 0 : endPositionControl.enable();
                }
            }
            else {
                endDateTimeControl.clearValidators();
                endDateTimeControl.disable();
                // Disable position
                endPositionControl === null || endPositionControl === void 0 ? void 0 : endPositionControl.clearValidators();
                endPositionControl === null || endPositionControl === void 0 ? void 0 : endPositionControl.disable();
            }
            // Disable unused controls
            // Remove tripDatesValidators set on these controls on first page load as parent operation (allow startDateTime and fishingStartDateTime to be before tripDepartureDateTime)
            startDateTimeControl.clearValidators();
            fishingStartDateTimeControl.clearValidators();
            startDateTimeControl.enable();
            fishingStartDateTimeControl.enable();
            fishingStartDateTimeControl.updateValueAndValidity({ emitEvent: false });
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
                qualityFlagControl.patchValue(QualityFlagIds.NOT_QUALIFIED, { emitEvent: false });
            }
            if (opts.withEnd) {
                // = END DATE
                const endDateTimeValidators = [
                    ...tripDatesValidators,
                    SharedValidators.copyParentErrors(['dateRange', 'dateMaxDuration'])
                ];
                endDateTimeControl.setValidators((opts === null || opts === void 0 ? void 0 : opts.isOnFieldMode)
                    ? Validators.compose(endDateTimeValidators)
                    : Validators.compose([Validators.required, ...endDateTimeValidators]));
                if (enabled) {
                    endDateTimeControl.enable();
                    // Enable position
                    endPositionControl === null || endPositionControl === void 0 ? void 0 : endPositionControl.enable();
                }
            }
            else {
                endDateTimeControl.clearValidators();
                endDateTimeControl.disable();
                // Disable position
                endPositionControl === null || endPositionControl === void 0 ? void 0 : endPositionControl.clearValidators();
                endPositionControl === null || endPositionControl === void 0 ? void 0 : endPositionControl.disable();
            }
            // Disable unused controls
            // TODO: use program options xxx.enable
            fishingStartDateTimeControl.disable();
            fishingStartDateTimeControl.clearValidators();
            fishingEndDateTimeControl.disable();
            fishingEndDateTimeControl.clearValidators();
            fishingEndPositionControl === null || fishingEndPositionControl === void 0 ? void 0 : fishingEndPositionControl.disable();
            fishingEndPositionControl === null || fishingEndPositionControl === void 0 ? void 0 : fishingEndPositionControl.clearValidators();
        }
        // Max distance validators
        if (opts.withPosition) {
            if (opts.maxDistance > 0) {
                const startPositionControl = form.controls.startPosition;
                const lastEndPositionControl = [endPositionControl, fishingEndPositionControl, fishingStartPositionControl]
                    .find(c => c === null || c === void 0 ? void 0 : c.enabled);
                if (lastEndPositionControl) {
                    lastEndPositionControl.setValidators(OperationValidators.maxDistance(startPositionControl, opts.maxDistance));
                    lastEndPositionControl.updateValueAndValidity({ emitEvent: false });
                }
            }
        }
        // Update form group validators
        const formValidators = (_a = this.getFormGroupOptions(null, opts)) === null || _a === void 0 ? void 0 : _a.validators;
        form.setValidators(formValidators);
    }
    /* -- protected methods -- */
    fillDefaultOptions(opts) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        opts = super.fillDefaultOptions(opts);
        opts.withMeasurements = toBoolean(opts.withMeasurements, toBoolean(!!opts.program, false));
        opts.withMetier = toBoolean(opts.withMetier, toBoolean((_a = opts.program) === null || _a === void 0 ? void 0 : _a.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_METIER_ENABLE), true));
        opts.withPosition = toBoolean(opts.withPosition, toBoolean((_b = opts.program) === null || _b === void 0 ? void 0 : _b.getPropertyAsBoolean(ProgramProperties.TRIP_POSITION_ENABLE), true));
        opts.withFishingAreas = toBoolean(opts.withFishingAreas, !opts.withPosition);
        opts.withChildOperation = toBoolean(opts.withChildOperation, toBoolean((_c = opts.program) === null || _c === void 0 ? void 0 : _c.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION), false));
        opts.withFishingStart = toBoolean(opts.withFishingStart, toBoolean((_d = opts.program) === null || _d === void 0 ? void 0 : _d.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE), false));
        opts.withFishingEnd = toBoolean(opts.withFishingEnd, toBoolean((_e = opts.program) === null || _e === void 0 ? void 0 : _e.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE), false));
        opts.withEnd = toBoolean(opts.withEnd, toBoolean((_f = opts.program) === null || _f === void 0 ? void 0 : _f.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE), true));
        opts.maxDistance = toNumber(opts.maxDistance, (_g = opts.program) === null || _g === void 0 ? void 0 : _g.getPropertyAsInt(ProgramProperties.TRIP_DISTANCE_MAX_ERROR));
        opts.boundingBox = opts.boundingBox || Geometries.parseAsBBox((_h = opts.program) === null || _h === void 0 ? void 0 : _h.getProperty(ProgramProperties.TRIP_POSITION_BOUNDING_BOX));
        opts.maxTotalDurationInHours = toNumber(opts.maxTotalDurationInHours, (_j = opts.program) === null || _j === void 0 ? void 0 : _j.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_TOTAL_DURATION_HOURS));
        opts.maxShootingDurationInHours = toNumber(opts.maxShootingDurationInHours, (_k = opts.program) === null || _k === void 0 ? void 0 : _k.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_SHOOTING_DURATION_HOURS));
        // DEBUG
        //console.debug("[operation-validator] Ope Validator will use options:", opts);
        return opts;
    }
    composeToAsync(validators) {
        return (control) => __awaiter(this, void 0, void 0, function* () {
            if (!control.touched && !control.dirty)
                return null;
            const errors = validators
                .map(validator => validator(control))
                .find(isNotNil) || null;
            // Clear unused errors
            if (!errors || !errors.msg)
                SharedValidators.clearError(control, 'msg');
            if (!errors || !errors.required)
                SharedValidators.clearError(control, 'required');
            return errors;
        });
    }
    createTripDatesValidator(trip) {
        return (control) => {
            const dateTime = fromDateISOString(control.value);
            const tripDepartureDateTime = fromDateISOString(trip.departureDateTime);
            const tripReturnDateTime = fromDateISOString(trip.returnDateTime);
            // Make sure trip.departureDateTime < operation.endDateTime
            if (dateTime && tripDepartureDateTime && tripDepartureDateTime.isBefore(dateTime) === false) {
                console.warn(`[operation] Invalid operation: before the trip`, dateTime, tripDepartureDateTime);
                return { msg: 'TRIP.OPERATION.ERROR.FIELD_DATE_BEFORE_TRIP' };
            }
            // Make sure operation.endDateTime < trip.returnDateTime
            else if (dateTime && tripReturnDateTime && dateTime.isBefore(tripReturnDateTime) === false) {
                console.warn(`[operation] Invalid operation: after the trip`, dateTime, tripReturnDateTime);
                return { msg: 'TRIP.OPERATION.ERROR.FIELD_DATE_AFTER_TRIP' };
            }
        };
    }
    getFishingAreasArray(data, opts) {
        const required = !opts || opts.required !== false;
        const formArray = new AppFormArray((fa) => this.fishingAreaValidator.getFormGroup(fa, { required }), FishingArea.equals, FishingArea.isEmpty, {
            allowEmptyArray: false,
            validators: required ? SharedFormArrayValidators.requiredArrayMinLength(1) : undefined
        });
        if (data)
            formArray.patchValue(data);
        return formArray;
    }
    createChildOperationControl(data) {
        return this.formBuilder.group({
            id: [toNumber(data && data.id, null)],
            startDateTime: [data && data.startDateTime || null],
            fishingStartDateTime: [data && data.fishingStartDateTime || null],
            fishingEndDateTime: [data && data.fishingEndDateTime || null],
            endDateTime: [data && data.endDateTime || null]
        });
    }
};
OperationValidatorService.DEFAULT_MAX_TOTAL_DURATION_HOURS = 100 * 24; // 100 days
OperationValidatorService.DEFAULT_MAX_SHOOTING_DURATION_HOURS = 12; // 12 hours
OperationValidatorService = OperationValidatorService_1 = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        PositionValidatorService,
        FishingAreaValidatorService,
        MeasurementsValidatorService])
], OperationValidatorService);
export { OperationValidatorService };
export class OperationValidators {
    static requiredArrayMinLength(minLength) {
        minLength = minLength || 1;
        return (array) => {
            if (!array || array.length < minLength) {
                return { required: true };
            }
            return null;
        };
    }
    static addSampleValidators(pmfmForm) {
        const { form, pmfms } = pmfmForm;
        if (!form) {
            console.warn('Argument \'form\' required');
            return null;
        }
        // Disable computed pmfms
        AppFormUtils.disableControls(form, pmfms
            .filter(p => p.isComputed)
            .map(p => `measurementValues.${p.id}`), { onlySelf: true, emitEvent: false });
        const observables = [
            OperationValidators.listenIndividualOnDeck(pmfmForm)
        ].filter(isNotNil);
        if (!observables.length)
            return null;
        if (observables.length === 1)
            return observables[0].subscribe();
        return merge(observables).subscribe();
    }
    /**
     * Validate and compute
     *
     * @param event
     */
    static listenIndividualOnDeck(event) {
        const { form, pmfms, markForCheck } = event;
        const measFormGroup = form.controls['measurementValues'];
        // Create listener on column 'INDIVIDUAL_ON_DECK' value changes
        const individualOnDeckPmfm = pmfms.find(pmfm => pmfm.id === PmfmIds.INDIVIDUAL_ON_DECK);
        const individualOnDeckControl = individualOnDeckPmfm && measFormGroup.controls[individualOnDeckPmfm.id];
        if (individualOnDeckControl) {
            console.debug('[operation-validator] Listening if on deck...');
            return individualOnDeckControl.valueChanges
                .pipe(startWith(individualOnDeckControl.value), map((individualOnDeck) => {
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
                        if (markForCheck)
                            markForCheck();
                    }
                }
                else {
                    if (form.enabled) {
                        pmfms.filter(pmfm => pmfm.rankOrder > individualOnDeckPmfm.rankOrder && pmfm.id !== PmfmIds.TAG_ID)
                            .map(pmfm => {
                            const control = measFormGroup.controls[pmfm.id];
                            control.disable();
                            control.reset(null, { emitEvent: false });
                            control.setValidators(null);
                        });
                        if (markForCheck)
                            markForCheck();
                    }
                }
                return null;
            }));
        }
        return null;
    }
    static maxDistance(otherPositionForm, maxInMiles) {
        return (control) => {
            const distance = PositionUtils.computeDistanceInMiles(otherPositionForm.value, control.value);
            if (distance > maxInMiles) {
                return { maxDistance: { distance, max: maxInMiles } };
            }
            return undefined;
        };
    }
    static remoteParent(tripIdControl) {
        return (control) => {
            const parent = control.value;
            const parentId = parent === null || parent === void 0 ? void 0 : parent.id;
            // Error if the parent is a local operation, defined in another trip
            // Same trip should be OK
            if (isNotNil(parentId) && parentId < 0) {
                const tripId = toNumber(tripIdControl.value);
                const parentTripId = parent === null || parent === void 0 ? void 0 : parent.tripId;
                if (isNotNil(parentTripId) && parentTripId !== tripId) {
                    return { remoteParent: true };
                }
            }
            return null;
        };
    }
    static existsParent(control) {
        const parent = control.value;
        const qualityFlagId = parent === null || parent === void 0 ? void 0 : parent.qualityFlagId;
        if (qualityFlagId === QualityFlagIds.MISSING) {
            return { existsParent: true };
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
//# sourceMappingURL=operation.validator.js.map