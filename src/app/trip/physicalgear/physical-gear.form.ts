import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Injector, Input, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { PhysicalGearValidatorService } from './physicalgear.validator';
import { BehaviorSubject, from, merge, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap } from 'rxjs/operators';
import { MeasurementValuesForm } from '../measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '../services/validator/measurement.validator';
import { FormBuilder } from '@angular/forms';
import {
  AppFormUtils,
  focusNextInput,
  GetFocusableInputOptions,
  InputElement, isNil, isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  ReferentialRef,
  ReferentialUtils,
  selectInputContent,
  toBoolean,
  toNumber, waitFor
} from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, AcquisitionLevelType, PmfmIds } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { OperationService } from '@app/trip/services/operation.service';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { AppMeasurementsTable } from '@app/trip/measurement/measurements.table.class';
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';

@Component({
  selector: 'app-physical-gear-form',
  templateUrl: './physical-gear.form.html',
  styleUrls: ['./physical-gear.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhysicalGearForm extends MeasurementValuesForm<PhysicalGear> implements OnInit, AfterViewInit {

  _childAcquisitionLevel: AcquisitionLevelType;
  _showChildrenTable = false;
  $gears = new BehaviorSubject<ReferentialRef[]>(undefined);

  @Input() mobile: boolean;
  @Input() showComment: boolean;
  @Input() tabindex: number;
  @Input() canEditRankOrder = false;
  @Input() canEditGear = true;
  @Input() maxVisibleButtons: number;
  @Input() allowChildrenGears: boolean;
  @Input() i18nSuffix: string = null;

  @Input()
  set gears(value: ReferentialRef[]) {
    this.$gears.next(value);
  }

  get showGear(): boolean {
    return isNil(this.data?.parent);
  }

  get dirty(): boolean {
    return super.dirty || (this.allowChildrenGears && this.childrenTable?.dirty) || false;
  }

  get valid(): boolean {
    return super.valid && (!this.allowChildrenGears || !this.childrenTable || this.childrenTable.valid) || false;
  }

  get invalid(): boolean {
    return super.invalid && (this.allowChildrenGears && this.childrenTable?.invalid) || false;
  }

  get pending(): boolean {
    return super.pending || (this.allowChildrenGears && this.childrenTable?.pending) || false;
  }

  @Output() onSubmit = new EventEmitter<any>();

  @ViewChild('firstInput', {static: true}) firstInputField: InputElement;
  @ViewChildren('inputField') inputFields: QueryList<ElementRef>;

  @ViewChild('childrenTable') childrenTable: AppMeasurementsTable<PhysicalGear, PhysicalGearFilter> & {value: PhysicalGear[]};

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
    this.requiredGear = true;

    // Set default acquisition level
    this._acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;
    this._childAcquisitionLevel = AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR;

    // Load gears from program
    this.registerSubscription(
      this.$programLabel
        .pipe(
          filter(isNotNil),
          distinctUntilChanged(),
          mergeMap(program => this.programRefService.loadGears(program))
        )
        .subscribe(gears => this.$gears.next(gears))
    );

    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.allowChildrenGears = toBoolean(this.allowChildrenGears, true);
    this.mobile = toBoolean(this.mobile, this.settings.mobile);
    this.tabindex = toNumber(this.tabindex, 1);
    this.showComment = !this.mobile || isNotNilOrBlank(this.data?.comments);

    // Combo: gears
    this.registerAutocompleteField('gear', {
      items: this.$gears,
      mobile: this.mobile
    });

    // Disable gear field
    const gearControl = this.form.get('gear');
    if (!this.canEditGear && gearControl.enabled) {
      gearControl.disable();
    }

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
          this.markForCheck();
        })
    );
  }

  ngAfterViewInit() {
    // Show/Hide children table
    if (this.allowChildrenGears) {
      this.registerSubscription(
        this.childrenTable.$pmfms
          .subscribe(pmfms => {
            const hasChildrenPmfms = (pmfms||[]).filter(p => p.id !== PmfmIds.GEAR_LABEL).length > 0;
            if (this._showChildrenTable !== hasChildrenPmfms) {
              this._showChildrenTable = hasChildrenPmfms;
              this.markForCheck();
            }
          })
      );
    }
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.enable(opts);
    if (!this.canEditGear) {
      this.form.get('gear').disable(opts);
    }
  }

  focusFirstInput() {
    this.firstInputField?.focus();
  }

  focusNextInput(event: UIEvent, opts?: Partial<GetFocusableInputOptions>): boolean {

    // DEBUG
    //return focusNextInput(event, this.inputFields, opts{debug: this.debug, ...opts});

    return focusNextInput(event, this.inputFields, opts);
  }

  async setValue(data: PhysicalGear, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [p: string]: any; waitIdle?: boolean }) {
    // For ce to clean previous gearId (to for pmfms recomputation)
    if (isNotNil(this.gearId)) {
      this.gearId = null;
    }

    // Can edite only if not used yet, in any operation
    if (isNotNil(data?.tripId) && this.canEditGear) {
      this.canEditGear =  await this.operationService.areUsedPhysicalGears(data.tripId,[data.id]);
    }

    this.showComment = this.showComment || isNotNilOrBlank(data.comments);

    await super.setValue(data, opts);

    if (this.allowChildrenGears) {
      this.childrenTable.gearId = this.gearId;
      this.childrenTable.value = data.children || [];
    }
  }

  markAsReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsReady(opts);
    if (this.allowChildrenGears) {
      waitFor(() => !!this.childrenTable).then(() => this.childrenTable.markAsReady());
    }
  }

  toggleComment() {
    this.showComment = !this.showComment;
    if (!this.showComment) {
      this.form.get('comments').setValue(null);
    }
    this.markForCheck();
  }


  async save(): Promise<boolean> {
    if (!this.form.valid) {
      await AppFormUtils.waitWhilePending(this.form);

      if (this.form.invalid) {
        return false;
      }
    }

    if (this.allowChildrenGears && this.childrenTable.dirty) {
      return await this.childrenTable.save();
    }

    return true;
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

  protected getValue(): PhysicalGear {
    const data = super.getValue();

    if (this.allowChildrenGears) {
      data.children = this.childrenTable.value;
    }
    else {
      data.children = null;
    }
    return data;
  }

  selectInputContent = selectInputContent;
}
