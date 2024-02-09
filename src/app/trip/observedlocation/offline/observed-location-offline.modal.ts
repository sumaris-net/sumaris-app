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
  LoadResult,
  NetworkService,
  ReferentialRef,
  referentialsToString,
  referentialToString,
  ReferentialUtils,
  SharedValidators,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ProgramRefQueries, ProgramRefService } from '@app/referential/services/program-ref.service';
import { map, mergeMap, tap } from 'rxjs/operators';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ObservedLocationOfflineFilter } from '../observed-location.filter';
import { DATA_IMPORT_PERIODS } from '@app/data/data.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { Observable } from 'rxjs';
import { Program } from '@app/referential/services/model/program.model';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import DurationConstructor = moment.unitOfTime.DurationConstructor;

export interface IObservedLocationOfflineModalState {
  program: Program;
  locations: ReferentialRef[];
}

@Component({
  selector: 'app-observed-location-offline-modal',
  styleUrls: ['./observed-location-offline.modal.scss'],
  templateUrl: './observed-location-offline.modal.html',
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservedLocationOfflineModal extends AppForm<ObservedLocationOfflineFilter> implements OnInit {

  @RxStateRegister() protected readonly _state: RxState<IObservedLocationOfflineModalState> = inject(RxState<IObservedLocationOfflineModalState>);
  protected readonly networkService = inject(NetworkService);
  protected mobile: boolean;
  protected periodDurationLabels: { key: string; label: string; startDate: Moment }[];

  @RxStateSelect() protected program$: Observable<Program>;
  @RxStateSelect() protected locations$: Observable<ReferentialRef[]>;


  @Input() title = 'OBSERVED_LOCATION.OFFLINE_MODAL.TITLE';

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

  @RxStateProperty() program: Program;

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
        strategy: [null, Validators.required],
        enableHistory: [true, Validators.required],
        location: [null, Validators.required],
        periodDuration: ['15 day', Validators.required],
        vesselSnapshot: [null],
      })
    );
    this._enable = false; // Disable by default
    this.mobile = this.settings.mobile;

    // Prepare start date items
    const datePattern = translate.instant('COMMON.DATE_PATTERN');
    this.periodDurationLabels = DATA_IMPORT_PERIODS.map((v) => {
      const date = DateUtils.moment()
        .utc(false)
        .add(-1 * v.value, v.unit); // Substract the period, from now
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
        acquisitionLevelLabels: [AcquisitionLevelCodes.OBSERVED_LOCATION, AcquisitionLevelCodes.LANDING],
      },
      mobile: this.mobile,
    });

    // Listen program (with properties)
    this._state.connect('program',
      this.form
        .get('program')
        .valueChanges.pipe(
          map(program => program?.label),
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

    const displayAttributes = this.settings.getFieldDisplayAttributes('location');
    this._state.connect('locations', this.program$.pipe(
      mergeMap((program) => {
        if (!program) return Promise.resolve(null);
        const locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_LOCATION_LEVEL_IDS);
        return this.referentialRefService.countAll({
          entityName: 'Location',
          levelIds: locationLevelIds,
        });
      }),
      tap((locationCount) => {
        if (locationCount > 0) {
          this.form.get('location').enable();
        } else {
          this.form.get('location').disable();
        }
      })
    ));
    this.registerAutocompleteField('location', {
      suggestFn: (value, filter) => this.suggestLocation(value, filter),
      displayWith: (arg) => {
        if (Array.isArray(arg)) {
          return referentialsToString(arg, displayAttributes);
        }
        return referentialToString(arg, displayAttributes);
      },
      mobile: this.mobile,
    });

    // Strategies
    this.registerAutocompleteField('strategy', {
      suggestFn: (value, filter) => this.suggestStrategy(value, filter),
      displayWith: (item) => item?.label || '',
      mobile: this.mobile,
      showAllOnFocus: true
    });
    this._state.hold(
      this.program$
        .pipe(
          mergeMap((program) => {
            if (!program) return Promise.resolve(null);
            return this.strategyRefService.loadAll(0, 0, null, null, { levelId: program.id });
          }),
          map((res) => (res && res.total) || 0)
        ), (strategiesCount) => {
          if (strategiesCount > 1) {
            this.form.get('strategy').enable();
          } else {
            this.form.get('strategy').disable();
          }
        }
    );

    // Enable/disable sub controls, from the 'enable history' checkbox
    const subControls = [this.form.get('location'), this.form.get('periodDuration')];
    this.form.get('enableHistory').valueChanges.subscribe((enable) => {
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
    this.vesselSnapshotService.getAutocompleteFieldOptions().then(opts =>
      this.registerAutocompleteField('vesselSnapshot', opts));
  }

  async setValue(value: ObservedLocationOfflineFilter | any) {
    if (!value) return; // skip

    const json = {
      program: null,
      strategy: null,
      location: null,
      periodDuration: null,
      vesselSnapshot: null,
    };

    // Program
    if (value.programLabel) {
      json.program = await this.programRefService.loadByLabel(value.programLabel, { query: ProgramRefQueries.loadLight });
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

    // Location
    if (isNotEmptyArray(value.locationIds)) {
      json.location = await Promise.all(value.locationIds.map((id) => this.referentialRefService.loadById(id, 'Location')));
    }

    // Duration period
    if (value.periodDuration && value.periodDurationUnit) {
      json.periodDuration = `${value.periodDuration} ${value.periodDurationUnit}`;
    }

    // Vessels
    if (isNotEmptyArray(value.vesselIds)) {
      try {
        json.vesselSnapshot = (await this.vesselSnapshotService.loadAll(0, value.vesselIds.length, undefined, undefined, <VesselSnapshotFilter>{
          includedIds: value.vesselIds
        }))?.data;
      }
      catch (err) {
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
    }

    this.form.patchValue(json);

    this.markAsLoaded();
  }

  getValue(): ObservedLocationOfflineFilter {
    const json = this.form.value;

    // DEBUG
    //console.debug('[observed-location-offline] Modal form.value:', json);

    const value = new ObservedLocationOfflineFilter();

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

    // Location
    if (json.location) {
      if (Array.isArray(json.location)) {
        value.locationIds = json.location.map((entity) => entity.id);
      } else {
        value.locationIds = [json.location.id];
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
    }

    // Vessels
    value.vesselIds = isNotEmptyArray(json.vesselSnapshot) ? json.vesselSnapshot.map((v) => v.id) : undefined;

    // DEBUG
    console.debug("[observed-location-offline] Modal result value:", value);

    return value;
  }

  async cancel() {
    await this.viewCtrl.dismiss(null, 'cancel');
  }

  async validate(event?: Event) {
    this.form.markAllAsTouched();

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
      levelLabel: this.program.label
    };

    // Force network, if possible - fix IMAGINE 302
    const fetchPolicy = this.networkService.online ? 'network-only' : undefined; /*default*/

    return this.strategyRefService.suggest(value, filter, 'label', 'asc', { fetchPolicy });
  }

  protected async suggestLocation(value: any, filter?: any): Promise<LoadResult<ReferentialRef>> {
    // Avoid to reload, when value is already a valid strategy
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };

    if (!this.program) return // Program no loaded yet

    const locationLevelIds = this.program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_LOCATION_LEVEL_IDS);


    filter = {
      ...filter,
      entityName: 'Location',
      levelIds: locationLevelIds
    };

    // Force network, if possible - fix IMAGINE 302
    const fetchPolicy = this.networkService.online ? 'network-only' : undefined; /*default*/

    return this.referentialRefService.suggest(value, filter, 'label', 'asc', { fetchPolicy });
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
