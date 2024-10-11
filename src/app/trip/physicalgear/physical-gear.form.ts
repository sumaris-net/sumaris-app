import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  Input,
  numberAttribute,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { PhysicalGearValidatorService } from './physicalgear.validator';
import { filter, mergeMap } from 'rxjs/operators';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { UntypedFormBuilder } from '@angular/forms';
import {
  focusNextInput,
  getFocusableInputElements,
  GetFocusableInputOptions,
  isNotNil,
  isNotNilOrBlank,
  ReferentialRef,
  ReferentialUtils,
  selectInputContent,
  toBoolean,
  toNumber,
  waitFor,
} from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { OperationService } from '@app/trip/operation/operation.service';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { MeasurementsFormState } from '@app/data/measurement/measurements.utils';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { Observable } from 'rxjs';

interface PhysicalGearFormState extends MeasurementsFormState {
  gears: ReferentialRef[];
}

@Component({
  selector: 'app-physical-gear-form',
  templateUrl: './physical-gear.form.html',
  styleUrls: ['./physical-gear.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class PhysicalGearForm extends MeasurementValuesForm<PhysicalGear, PhysicalGearFormState> implements OnInit {
  @RxStateSelect() gears$: Observable<ReferentialRef[]>;

  @Input({ transform: numberAttribute }) tabindex: number;
  @Input({ transform: booleanAttribute }) canEditRankOrder = false;
  @Input({ transform: booleanAttribute }) canEditGear = true;
  @Input({ transform: numberAttribute }) maxVisibleButtons: number;
  @Input({ transform: numberAttribute }) maxItemCountForButtons = 12;
  @Input({ transform: booleanAttribute }) showGear = true;
  @Input({ transform: booleanAttribute }) showError = false;
  @Input({ transform: booleanAttribute }) showComment: boolean;
  @Input() i18nSuffix: string = null;
  @Input({ transform: booleanAttribute }) mobile: boolean;

  @Input() @RxStateProperty() gears: ReferentialRef[];

  @ViewChildren('matInput') matInputs: QueryList<ElementRef<any>>;

  constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: PhysicalGearValidatorService,
    protected operationService: OperationService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup());
    this._enable = true;

    // Set defaults
    this.acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;
    this.requiredGear = true;
    this.i18nPmfmPrefix = 'TRIP.PHYSICAL_GEAR.PMFM.';

    // Load gears from program
    this._state.connect('gears', this.programLabel$.pipe(mergeMap((programLabel) => this.programRefService.loadGears(programLabel))));

    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    this.mobile = toBoolean(this.mobile, this.settings.mobile);
    this.tabindex = toNumber(this.tabindex, 1);
    this.showComment = !this.mobile || isNotNilOrBlank(this.data?.comments);

    // Combo: gears
    this.registerAutocompleteField('gear', {
      items: this.gears$,
      mobile: this.mobile,
      showAllOnFocus: true,
    });

    // Disable gear field
    const gearControl = this.form.get('gear');
    if (!this.canEditGear && gearControl.enabled) {
      gearControl.disable();
    }

    // Propagate data.gear into gearId
    this.registerSubscription(
      this.form
        .get('gear')
        .valueChanges.pipe(filter(ReferentialUtils.isNotEmpty))
        .subscribe((gear) => {
          this.gearId = gear.id;
          this.markForCheck();
        })
    );
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.enable(opts);
    if (!this.canEditGear) {
      this.form.get('gear').disable(opts);
    }
  }

  async focusFirstInput() {
    await waitFor(() => this.enabled, { timeout: 2000 });

    const inputElements = getFocusableInputElements(this.matInputs);
    if (inputElements.length) inputElements[0].focus();
  }

  focusNextInput(event: Event, opts?: Partial<GetFocusableInputOptions>): boolean {
    // DEBUG
    //return focusNextInput(event, this.inputFields, opts{debug: this.debug, ...opts});

    return focusNextInput(event, this.matInputs, opts);
  }

  async setValue(
    data: PhysicalGear,
    opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [p: string]: any; waitIdle?: boolean }
  ) {
    // For ce to clean previous gearId (to for pmfms recomputation)
    if (isNotNil(this.gearId)) {
      this.gearId = null;
    }

    // Can edite only if not used yet, in any operation
    if (isNotNil(data?.tripId) && this.canEditGear) {
      this.canEditGear = await this.operationService.areUsedPhysicalGears(data.tripId, [data.id]);
    }

    this.showComment = this.showComment || isNotNilOrBlank(data.comments);

    await super.setValue(data, opts);
  }

  getValue(): PhysicalGear {
    const target = super.getValue();

    // Re Add gear, if control has been disabled
    const jsonGear = this.form.get('gear').value;
    target.gear = jsonGear && ReferentialRef.fromObject(jsonGear);

    return target;
  }

  toggleComment() {
    if (this.disabled) return;

    this.showComment = !this.showComment;
    if (!this.showComment) {
      this.form.get('comments').setValue(null);
    }
    this.markForCheck();
  }

  /* -- protected methods -- */

  protected onApplyingEntity(data: PhysicalGear, opts?: { [key: string]: any }) {
    if (!data) return; // Skip

    super.onApplyingEntity(data, opts);

    // Propagate the gear
    if (ReferentialUtils.isNotEmpty(data.gear)) {
      this.gearId = data.gear.id;
    }

    // Applying the rankOrder (without waiting ready)
    this.form.get('rankOrder').patchValue(toNumber(data?.rankOrder, null), { emitEvent: false });
  }

  selectInputContent = selectInputContent;
}
