import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Injector, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import {
  AppForm,
  AppFormUtils,
  DateUtils,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNilOrBlank,
  isNotNilOrNaN,
  RxStateProperty,
  RxStateRegister,
  RxStateSelect,
  SharedValidators,
  StatusIds,
  toBoolean,
} from '@sumaris-net/ngx-components';

import { Moment } from 'moment';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ProgramRefQueries, ProgramRefService } from '@app/referential/services/program-ref.service';
import { TripSynchroImportFilter } from '@app/trip/trip/trip.filter';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { DATA_IMPORT_PERIODS } from '@app/data/data.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { map, mergeMap } from 'rxjs/operators';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { RxState } from '@rx-angular/state';
import { Observable } from 'rxjs';
import DurationConstructor = moment.unitOfTime.DurationConstructor;

export interface TripOfflineModalOptions {
  title?: string;
  value?: TripSynchroImportFilter;
}

export interface TripOfflineModalFormData {
  program: Program;
  vesselSnapshot: VesselSnapshot | VesselSnapshot[];
  enableHistory: boolean;
  periodDuration: string;
}

export interface TripOfflineModalOptionsState {
  program: Program;
  requiredHistory: boolean;
}

@Component({
  selector: 'app-trip-offline-modal',
  styleUrls: ['./trip-offline.modal.scss'],
  templateUrl: './trip-offline.modal.html',
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripOfflineModal extends AppForm<TripSynchroImportFilter> implements OnInit, TripOfflineModalOptions {
  @RxStateRegister() protected readonly _state: RxState<TripOfflineModalOptionsState> = inject(RxState);
  @RxStateSelect() protected program$: Observable<Program>;
  @RxStateSelect() protected requiredHistory$: Observable<boolean>;

  protected mobile: boolean;
  protected periodDurationLabels: { key: string; label: string; startDate: Moment }[];
  @RxStateProperty() protected requiredHistory: boolean;

  @Input() title = 'TRIP.OFFLINE_MODAL.TITLE';

  get value(): any {
    return this.getValue();
  }

  @Input() set value(data: any) {
    this.setValue(data);
  }

  get valid(): boolean {
    return this.form.valid;
  }

  get modalName(): string {
    return this.constructor.name;
  }

  get enableHistory(): boolean {
    return this.form.get('enableHistory').value;
  }

  constructor(
    injector: Injector,
    protected viewCtrl: ModalController,
    protected translate: TranslateService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected referentialRefService: ReferentialRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      formBuilder.group({
        program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
        vesselSnapshot: [null, Validators.required],
        enableHistory: [true, Validators.required],
        periodDuration: ['15 day', Validators.required],
      })
    );
    this.mobile = this.settings.mobile;

    // Prepare start date items
    const datePattern = translate.instant('COMMON.DATE_PATTERN');
    this.periodDurationLabels = DATA_IMPORT_PERIODS.map((v) => {
      const date = DateUtils.moment()
        .utc(false)
        .add(-1 * v.value, v.unit); // Subtract the period, from now
      return {
        key: `${v.value} ${v.unit}`,
        label: `${date.fromNow(true /*no suffix*/)} (${date.format(datePattern)})`,
        startDate: date.startOf('day'), // Reset time
      };
    });

    // Listen program (with properties)
    this._state.connect(
      'program',
      this.form.get('program').valueChanges.pipe(
        map((program) => program?.label || program),
        // Load the program
        mergeMap((programLabel) =>
          isNilOrBlank(programLabel)
            ? Promise.resolve(null)
            : this.programRefService.loadByLabel(programLabel, {
                query: ProgramRefQueries.loadLight,
                fetchPolicy: 'cache-first',
              })
        )
      )
    );

    this._state.connect(
      'requiredHistory',
      this.program$.pipe(map((program) => program?.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION) || false))
    );

    this._state.hold(this.requiredHistory$, (requiredHistory) => {
      if (requiredHistory) {
        this.form.get('enableHistory').setValue(true);
        this.form.get('enableHistory').disable();
      } else if (this.enabled) {
        this.form.get('enableHistory').enable();
      }
    });
  }

  ngOnInit() {
    super.ngOnInit();

    // Program
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        acquisitionLevelLabels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION, AcquisitionLevelCodes.CHILD_OPERATION],
      },
      mobile: this.mobile,
      showAllOnFocus: !this.mobile,
    });

    // Enable/disable sub controls, from the 'enable history' checkbox
    const subControls = [this.form.get('periodDuration')];
    this.form
      .get('enableHistory')
      .valueChanges.pipe(mergeMap((enable) => this.waitIdle({ stop: this.destroySubject }).then(() => enable)))
      .subscribe((enable) => {
        if (enable) {
          subControls.forEach((control) => {
            control.enable();
            control.setValidators(Validators.required);
          });
        } else {
          subControls.forEach((control) => {
            control.disable();
            control.setValidators(null);
          });
        }
      });

    // Combo: vessels
    this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => this.registerAutocompleteField('vesselSnapshot', opts));
  }

  async setValue(value: TripSynchroImportFilter | any) {
    if (!value) return; // skip

    const json: TripOfflineModalFormData = {
      program: null,
      vesselSnapshot: null,
      enableHistory: true,
      periodDuration: null,
    };

    // Program
    if (isNotNilOrBlank(value.programLabel)) {
      try {
        json.program = await this.programRefService.loadByLabel(value.programLabel, { query: ProgramRefQueries.loadLight });
      } catch (err) {
        console.error(`[trip-offline] Error while load program with label ${value.programLabel}`, err);
        json.program = null;
        if (err && err.message) {
          this.setError(err.message);
        }
      }
    }

    // Duration period
    if (value.periodDuration > 0 && value.periodDurationUnit) {
      json.enableHistory = true;
      json.periodDuration = `${value.periodDuration} ${value.periodDurationUnit}`;
    } else {
      json.enableHistory = false;
    }

    // Vessels
    const vesselIds = isNotNilOrNaN(value.vesselId) ? [value.vesselId] : value.vesselIds;
    if (isNotEmptyArray(vesselIds)) {
      try {
        json.vesselSnapshot =
          (
            await this.vesselSnapshotService.loadAll(0, vesselIds.length, undefined, undefined, <VesselSnapshotFilter>{
              includedIds: vesselIds,
            })
          )?.data || null;
      } catch (err) {
        console.error('[trip-offline] Error while loading vessels', err);
        json.vesselSnapshot = null;
        if (err && err.message) {
          this.errorSubject.next(err.message);
        }
      }
    }

    this.enable();

    this.form.patchValue(json);
    this.markAsLoaded();
  }

  getValue(): TripSynchroImportFilter {
    const json = this.form.value;

    // DEBUG
    //console.debug('[trip-offline] Modal form.value:', json);

    const value = new TripSynchroImportFilter();

    // Set program
    value.programLabel = json.program?.label || json.program;

    // Set enable history (e.g. can be undefined, when disabled)
    json.enableHistory = toBoolean(json.enableHistory, this.requiredHistory);

    // Set start date
    if (json.enableHistory && json.periodDuration) {
      const periodDuration = this.periodDurationLabels.find((item) => item.key === json.periodDuration);
      value.startDate = periodDuration && periodDuration.startDate;

      // Keep value of periodDuration (to be able to save it in local settings)
      const parts = json.periodDuration.split(' ');
      value.periodDuration = +parts[0];
      value.periodDurationUnit = parts[1] as DurationConstructor;
    } else {
      value.periodDuration = -1; // None
    }

    // Vessels
    value.vesselIds = isNotEmptyArray(json.vesselSnapshot) ? json.vesselSnapshot.map((v) => v.id) : undefined;

    // DEBUG
    console.debug('[trip-offline] Modal result value:', value);

    return value;
  }

  async cancel() {
    await this.viewCtrl.dismiss(null, 'cancel');
  }

  async validate(event?: Event) {
    this.errorSubject.next(null);

    this.markAllAsTouched();

    if (!this.form.valid) {
      await AppFormUtils.waitWhilePending(this.form);

      if (this.form.invalid) {
        AppFormUtils.logFormErrors(this.form, '[offline-import-config] ');
        return; // stop
      }
    }

    return this.viewCtrl.dismiss(this.getValue(), 'OK');
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
