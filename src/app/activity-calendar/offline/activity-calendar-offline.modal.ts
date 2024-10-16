import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import {
  AppForm,
  AppFormUtils,
  DateUtils,
  isNotEmptyArray,
  isNotNilOrNaN,
  SharedValidators,
  slideUpDownAnimation,
  StatusIds,
} from '@sumaris-net/ngx-components';

import { Moment } from 'moment';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ProgramRefQueries, ProgramRefService } from '@app/referential/services/program-ref.service';
import { ActivityCalendarSynchroImportFilter } from '../activity-calendar.filter';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { DATA_IMPORT_PERIODS } from '@app/data/data.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { mergeMap } from 'rxjs/operators';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import DurationConstructor = moment.unitOfTime.DurationConstructor;

export interface ActivityCalendarOfflineModalOptions {
  value?: ActivityCalendarSynchroImportFilter;
}

@Component({
  selector: 'app-activity-calendar-offline-modal',
  styleUrls: ['./activity-calendar-offline.modal.scss'],
  templateUrl: './activity-calendar-offline.modal.html',
  animations: [slideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityCalendarOfflineModal
  extends AppForm<ActivityCalendarSynchroImportFilter>
  implements OnInit, ActivityCalendarOfflineModalOptions
{
  protected mobile: boolean;
  protected periodDurationLabels: { key: string; label: string; startDate: Moment }[];

  @Input() title = 'ACTIVITY_CALENDAR.OFFLINE_MODAL.TITLE';

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
  }

  ngOnInit() {
    super.ngOnInit();

    // Program
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        acquisitionLevelLabels: [AcquisitionLevelCodes.ACTIVITY_CALENDAR, AcquisitionLevelCodes.MONTHLY_ACTIVITY],
      },
      mobile: this.mobile,
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

  async setValue(value: ActivityCalendarSynchroImportFilter | any) {
    if (!value) return; // skip

    const json = {
      program: null,
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

    this.form.patchValue(json);
    this.markAsLoaded();
  }

  getValue(): ActivityCalendarSynchroImportFilter {
    const json = this.form.value;

    // DEBUG
    //console.debug('[trip-offline] Modal form.value:', json);

    const value = new ActivityCalendarSynchroImportFilter();

    // Set program
    value.programLabel = (json.program && json.program.label) || json.program;

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
