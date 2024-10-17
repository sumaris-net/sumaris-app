import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Injector, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import {
  AppForm,
  AppFormUtils,
  DateUtils,
  isEmptyArray,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrNaN,
  LoadResult,
  NetworkService,
  ReferentialRef,
  ReferentialUtils,
  SharedValidators,
  slideUpDownAnimation,
  StatusIds,
} from '@sumaris-net/ngx-components';

import { Moment } from 'moment';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ProgramRefQueries, ProgramRefService } from '@app/referential/services/program-ref.service';
import { TripSynchroImportFilter } from '@app/trip/trip/trip.filter';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { DATA_IMPORT_PERIODS } from '@app/data/data.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { mergeMap } from 'rxjs/operators';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';
import { Program } from '@app/referential/services/model/program.model';
import { map, Observable } from 'rxjs';
import { RxState } from '@rx-angular/state';
import DurationConstructor = moment.unitOfTime.DurationConstructor;

export interface TripOfflineModalOptions {
  value?: TripSynchroImportFilter;
}

export interface ITripOfflineModalState {
  program: Program;
}

@Component({
  selector: 'app-trip-offline-modal',
  styleUrls: ['./trip-offline.modal.scss'],
  templateUrl: './trip-offline.modal.html',
  animations: [slideUpDownAnimation],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripOfflineModal extends AppForm<TripSynchroImportFilter> implements OnInit, TripOfflineModalOptions {
  @RxStateRegister() protected readonly _state: RxState<ITripOfflineModalState> = inject(RxState<ITripOfflineModalState>);

  @RxStateSelect() protected program$: Observable<Program>;

  protected readonly networkService = inject(NetworkService);

  protected mobile: boolean;
  protected periodDurationLabels: { key: string; label: string; startDate: Moment }[];

  @RxStateProperty() program: Program;

  @Input() title = 'TRIP.OFFLINE_MODAL.TITLE';

  get value(): any {
    return this.getValue();
  }

  set value(data: any) {
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
    protected strategyRefService: StrategyRefService,
    protected referentialRefService: ReferentialRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      formBuilder.group({
        program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
        vesselSnapshot: [null, Validators.required],
        strategy: [null, Validators.required],
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
    });

    // Strategies
    this.registerAutocompleteField('strategy', {
      suggestFn: (value, filter) => this.suggestStrategy(value, filter),
      displayWith: (item) => item?.label || '',
      mobile: this.mobile,
      showAllOnFocus: true,
    });
    this._state.hold(
      this.program$.pipe(
        mergeMap((program) => {
          if (!program) return Promise.resolve(null);
          return this.strategyRefService.loadAll(0, 0, null, null, { levelId: program.id });
        }),
        map((res) => (res && res.total) || 0)
      ),
      (strategiesCount) => {
        if (strategiesCount > 1) {
          this.form.get('strategy').enable();
        } else {
          this.form.get('strategy').disable();
        }
      }
    );

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

    const json = {
      program: null,
      strategy: null,
      vesselSnapshot: null,
      enableHistory: true,
      periodDuration: null,
    };

    // Program
    if (value.programLabel) {
      try {
        json.program = await this.programRefService.loadByLabel(value.programLabel, { query: ProgramRefQueries.loadLight });
      } catch (err) {
        console.error(err);
        json.program = null;
        if (err && err.message) {
          this.setError(err.message);
        }
      }
    }

    // Strategy
    if (isNotEmptyArray(value.strategyIds) && isNotNil(json.program.id)) {
      json.strategy = (
        await this.strategyRefService.loadAll(0, value.strategyIds.length, 'label', 'asc', {
          levelId: json.program?.id,
          includedIds: value.strategyIds,
        })
      )?.data;
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
        json.vesselSnapshot = (
          await this.vesselSnapshotService.loadAll(0, vesselIds.length, undefined, undefined, <VesselSnapshotFilter>{
            includedIds: vesselIds,
          })
        )?.data;
      } catch (err) {
        console.error(err);
        json.vesselSnapshot = null;
        if (err && err.message) {
          this.errorSubject.next(err.message);
        }
      }
    }

    this.enable();

    if (isEmptyArray(json.strategy)) {
      this.form.get('strategy').disable(); // Disable by default, when empty
      this.cd.markForCheck();
    }

    this.form.patchValue(json);
    this.markAsLoaded();
  }

  getValue(): TripSynchroImportFilter {
    const json = this.form.value;

    // DEBUG
    //console.debug('[trip-offline] Modal form.value:', json);

    const value = new TripSynchroImportFilter();

    // Set program
    value.programLabel = (json.program && json.program.label) || json.program;

    // Strategy
    if (json.strategy) {
      if (Array.isArray(json.strategy)) {
        value.strategyIds = json.strategy.map((entity) => entity.id);
      } else {
        value.strategyIds = [json.strategy.id];
      }
    }

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

  protected async suggestStrategy(value: any, filter?: any): Promise<LoadResult<ReferentialRef>> {
    // Avoid to reload, when value is already a valid strategy
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };
    if (isNilOrBlank(this.program?.label)) return undefined; // Program no loaded yet
    filter = {
      ...filter,
      levelLabel: this.program.label,
    };

    // Force network, if possible - fix IMAGINE 302
    const fetchPolicy = this.networkService.online ? 'network-only' : undefined; /*default*/

    return this.strategyRefService.suggest(value, filter, 'label', 'asc', { fetchPolicy });
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
