import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Injector, Input, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { PhysicalGearValidatorService } from '../services/validator/physicalgear.validator';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, filter, mergeMap } from 'rxjs/operators';
import { MeasurementValuesForm } from '../measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '../services/validator/measurement.validator';
import { FormBuilder } from '@angular/forms';
import { focusNextInput, GetFocusableInputOptions, InputElement, isNotNil, ReferentialRef, ReferentialUtils, selectInputContent, toNumber } from '@sumaris-net/ngx-components';
import { PhysicalGear } from '../services/model/trip.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { OperationService } from '@app/trip/services/operation.service';

@Component({
  selector: 'app-physical-gear-form',
  templateUrl: './physical-gear.form.html',
  styleUrls: ['./physical-gear.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhysicalGearForm extends MeasurementValuesForm<PhysicalGear> implements OnInit {

  gearsSubject = new BehaviorSubject<ReferentialRef[]>(undefined);
  mobile: boolean;

  @Input() showComment = true;
  @Input() tabindex: number;
  @Input() canEditRankOrder = false;
  @Input() canEditGear = true;

  @Input()
  set gears(value: ReferentialRef[]) {
    this.gearsSubject.next(value);
  }

  @Output() onSubmit = new EventEmitter<any>();

  @ViewChild('firstInput', {static: true}) firstInputField: InputElement;
  @ViewChildren('inputField') inputFields: QueryList<ElementRef>;

  constructor(
    injector: Injector,
    protected measurementValidatorService: MeasurementsValidatorService,
    protected formBuilder: FormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: PhysicalGearValidatorService,
    protected operationService: OperationService,
    protected referentialRefService: ReferentialRefService,
  ) {
    super(injector, measurementValidatorService, formBuilder, programRefService, validatorService.getFormGroup());
    this._enable = true;
    this.mobile = this.settings.mobile;
    this.requiredGear = true;

    // Set default acquisition level
    this._acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;

    // Load gears from program
    this.registerSubscription(
      this.$programLabel
        .pipe(
          filter(isNotNil),
          distinctUntilChanged(),
          mergeMap(program => this.programRefService.loadGears(program))
        )
        .subscribe(gears => this.gearsSubject.next(gears))
    );

    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.tabindex = toNumber(this.tabindex, 1);

    // Combo: gears
    this.registerAutocompleteField('gear', {
      items: this.gearsSubject,
      mobile: this.mobile
    });

    // Propagate data.gear into gearId
    this.registerSubscription(
      this.form.get('gear').valueChanges
        .pipe(
          filter(ReferentialUtils.isNotEmpty)
        )
        .subscribe(gear => {
          this.data = this.data || new PhysicalGear();
          this.data.gear = gear;
          this.gearId = gear.id;
        })
    );
  }

  focusFirstInput() {
    this.firstInputField.focus();
  }

  focusNextInput(event: UIEvent, opts?: Partial<GetFocusableInputOptions>): boolean {

    // DEBUG
    //return focusNextInput(event, this.inputFields, opts{debug: this.debug, ...opts});

    return focusNextInput(event, this.inputFields, opts);
  }

  async setValue(data: PhysicalGear, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [p: string]: any; waitIdle?: boolean }) {
    // For ce to clean previous gearId (to for pmfms recomputation)
    if (this.gearId) {
      this.gearId = null;
    }

    // If !tripId, trip was never saved and doesn't have any operation
    if (data?.tripId) {
      this.canEditGear =  await this.operationService.areUsedPhysicalGears(data.tripId,[data.id]);
    }

    return super.setValue(data, opts);
  }

  /* -- protected methods -- */

  protected onApplyingEntity(data: PhysicalGear, opts?: {[key: string]: any;}) {

    if (!data) return; // Skip

    super.onApplyingEntity(data, opts);

    // Propagate the gear
    if (ReferentialUtils.isNotEmpty(data.gear)) {
      this.gearId = data.gear.id;
    }
  }

  selectInputContent = selectInputContent;
}
