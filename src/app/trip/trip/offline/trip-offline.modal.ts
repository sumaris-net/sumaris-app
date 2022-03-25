import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AppForm, AppFormUtils, SharedValidators, slideUpDownAnimation } from '@sumaris-net/ngx-components';
import * as momentImported from 'moment';
import { Moment } from 'moment';
import { ReferentialRefService } from '../../../referential/services/referential-ref.service';
import { ProgramRefQueries, ProgramRefService } from '../../../referential/services/program-ref.service';
import { Program } from '../../../referential/services/model/program.model';
import { TripOfflineFilter } from '@app/trip/services/filter/trip.filter';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Subject } from 'rxjs';
import DurationConstructor = moment.unitOfTime.DurationConstructor;
import { DATA_IMPORT_PERIODS } from '@app/data/services/config/data.config';

const moment = momentImported;

@Component({
  selector: 'app-trip-offline-modal',
  styleUrls: [
    './trip-offline.modal.scss'
  ],
  templateUrl: './trip-offline.modal.html',
  animations: [slideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TripOfflineModal extends AppForm<TripOfflineFilter> implements OnInit{

  mobile: boolean;
  errorSubject = new Subject<string>();
  periodDurationLabels: { key: string; label: string; startDate: Moment; }[];

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

  constructor(
    injector: Injector,
    protected viewCtrl: ModalController,
    protected translate: TranslateService,
    protected formBuilder: FormBuilder,
    protected programRefService: ProgramRefService,
    protected referentialRefService: ReferentialRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector,
      formBuilder.group({
        program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
        vesselSnapshot: [null, Validators.required],
        periodDuration: ['15 day', Validators.required],
      }));
    this._enable = false; // Disable by default
    this.mobile = this.settings.mobile;

    // Prepare start date items
    const datePattern = translate.instant('COMMON.DATE_PATTERN');
    this.periodDurationLabels = DATA_IMPORT_PERIODS.map(v => {
      const date = moment().utc(false)
        .add(-1 * v.value, v.unit); // Substract the period, from now
      return {
        key: `${v.value} ${v.unit}`,
        label: `${date.fromNow(true/*no suffix*/)} (${date.format(datePattern)})`,
        startDate: date.startOf('day') // Reset time
      };
    });
  }

  ngOnInit() {
    super.ngOnInit();

    // Program
    this.registerAutocompleteField('program', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Program'
      },
      mobile: this.mobile
    });

    // Combo: vessels
    this.vesselSnapshotService.getAutocompleteFieldOptions().then(opts =>
      this.registerAutocompleteField('vesselSnapshot', opts));
  }

  async setValue(value: TripOfflineFilter | any) {
    if (!value) return; // skip

    const json = {
      program: null,
      vesselSnapshot: null,
      periodDuration: null
    };

    // Program
    if (value.programLabel) {
      try {
        json.program = await this.programRefService.loadByLabel(value.programLabel, {query: ProgramRefQueries.loadLight});
      }
      catch (err) {
        console.error(err);
        json.program = null;
        if (err && err.message) {
          this.errorSubject.next(err.message);
        }
      }
    }

    if (value.vesselId){
      try {
        json.vesselSnapshot = await this.vesselSnapshotService.load(value.vesselId);
      }
      catch (err) {
        console.error(err);
        json.vesselSnapshot = null;
        if (err && err.message) {
          this.errorSubject.next(err.message);
        }
      }
    }

    // Duration period
    if (value.periodDuration && value.periodDurationUnit) {
      json.periodDuration = `${value.periodDuration} ${value.periodDurationUnit}`;
    }

    this.form.patchValue(json);

    this.enable();
    this.markAsLoaded();
  }

  getValue(): TripOfflineFilter {
    const json = this.form.value;

    // DEBUG
    console.debug('[trip-offline] Modal form.value:', json);

    const value = new TripOfflineFilter();

    // Set program
    value.programLabel = json.program && json.program.label || json.program;

    value.vesselId = json.vesselSnapshot && json.vesselSnapshot.id || json.vesselSnapshot;

    // Set start date
    if (json.periodDuration) {
      const periodDuration = this.periodDurationLabels.find(item => item.key === json.periodDuration);
      value.startDate = periodDuration && periodDuration.startDate;

      // Keep value of periodDuration (to be able to save it in local settings)
      const parts = json.periodDuration.split(' ');
      value.periodDuration = +parts[0];
      value.periodDurationUnit = parts[1] as DurationConstructor;
    }

    return value;
  }

  cancel() {
    this.viewCtrl.dismiss(null, 'CANCEL');
  }

  async validate(event?: UIEvent) {

    this.errorSubject.next(null);

    this.markAllAsTouched();

    await AppFormUtils.waitWhilePending(this.form);

    if (this.form.invalid) {
      AppFormUtils.logFormErrors(this.form, '[offline-import-config] ');
      return; // stop
    }

    return this.viewCtrl.dismiss(this.getValue(), 'OK');
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
