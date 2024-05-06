import { Component, OnInit, ViewChild } from '@angular/core';
import { CalendarComponent, CalendarComponentStyle } from '@app/activity-calendar/calendar/calendar.component';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import {
  EntitiesStorage,
  EntityUtils,
  firstNotNilPromise,
  isNil,
  isNotNil,
  MatAutocompleteConfigHolder,
  SharedValidators,
  waitFor,
} from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivityCalendarTestUtils } from '@app/activity-calendar/calendar/testing/calendar-test.utils';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ActivityMonthUtils } from '@app/activity-calendar/calendar/activity-month.utils';

@Component({
  selector: 'app-calendar-test',
  templateUrl: './calendar-test.page.html',
  styleUrls: ['./calendar-test.page.scss'],
})
export class CalendarTestPage implements OnInit {
  protected debug: boolean;
  protected styles: CalendarComponentStyle[] = ['table', 'accordion'];
  protected $programLabel = new BehaviorSubject<string>(undefined);
  protected filterForm: UntypedFormGroup;
  protected autocomplete = new MatAutocompleteConfigHolder();
  protected data: ActivityCalendar;
  protected outputs: {
    [key: string]: string;
  } = {};

  @ViewChild(CalendarComponent) calendar: CalendarComponent;

  constructor(
    formBuilder: UntypedFormBuilder,
    private referentialRefService: ReferentialRefService,
    private entities: EntitiesStorage
  ) {
    this.filterForm = formBuilder.group({
      program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      strategy: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      style: [null, Validators.required],
      example: [null, Validators.required],
    });
    this.debug = !environment.production;
  }

  ngOnInit() {
    // Program
    this.autocomplete.add('program', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, {
          ...filter,
          entityName: 'Program',
        }),
      attributes: ['label', 'name'],
    });
    // Strategy
    this.autocomplete.add('strategy', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, {
          ...filter,
          levelLabel: this.$programLabel.getValue(),
          entityName: 'Strategy',
        }),
      attributes: ['label', 'name'],
    });
    this.filterForm
      .get('program')
      .valueChanges.pipe(
        map((p) => p?.label),
        distinctUntilChanged(),
        filter(isNotNil)
      )
      .subscribe(async (programLabel) => {
        this.$programLabel.next(programLabel);
        const { data, total } = await this.referentialRefService.loadAll(
          0,
          1,
          null,
          null,
          {
            levelLabel: programLabel,
            entityName: 'Strategy',
          },
          { withTotal: true }
        );
        if (total === 1) {
          this.filterForm.patchValue({ strategy: data[0] });
        }
      });
    // Input example
    this.autocomplete.add('example', {
      items: ActivityCalendarTestUtils.EXAMPLES.map((label, index) => ({ id: index + 1, label })),
      attributes: ['label'],
      showAllOnFocus: true,
    });
    this.filterForm
      .get('example')
      .valueChanges //.pipe(debounceTime(450))
      .subscribe((example) => {
        if (example && typeof example.label == 'string') {
          const json = ActivityCalendarTestUtils.getExample(example.label);
          if (this.outputs.example) {
            this.dumpData(ActivityCalendar.fromObject(json), 'example');
          }
        }
      });

    this.filterForm.patchValue({
      program: { id: 110, label: 'SIH-ACTIFLOT' },

      style: 'table',
      //style: 'accordion',

      example: { id: 1, label: 'default' },
    });

    this.applyExample();
  }

  async applyExample(key?: string) {
    if (isNil(key)) {
      key = this.filterForm.get('example').value?.label;
    }

    // Wait enumerations override
    await this.referentialRefService.ready();

    const data = await this.getExample(key);
    await this.updateView(data);
  }

  // Load data into components
  async updateView(data: ActivityCalendar) {
    // wait for program
    await firstNotNilPromise(this.$programLabel);
    await waitFor(() => !!this.calendar);

    this.calendar.timezone = 'UTC';
    this.calendar.markAsReady();

    this.calendar.value = ActivityMonthUtils.fromActivityCalendar(data);
    this.calendar.enable();
  }

  async getExample(key?: string): Promise<ActivityCalendar> {
    if (!key) {
      const example = this.filterForm.get('example').value;
      key = (example && example.label) || 'default';
    }

    // Load example
    const json = ActivityCalendarTestUtils.getExample(key);

    // Add :
    // - a local ID
    const data = ActivityCalendar.fromObject(json);
    await EntityUtils.fillLocalIds([data], (_, count) => this.entities.nextValues(ActivityCalendar.TYPENAME, count));

    return data;
  }

  async dumpExample(key?: string) {
    const data = await this.getExample(key);
    this.dumpData(data, 'example');
  }

  dumpData(data: Partial<ActivityCalendar>, outputName: string) {
    if (!outputName) return;

    if (data) {
      const json = ActivityCalendar.fromObject(data).asObject();
      this.outputs[outputName] = JSON.stringify(json);
      console.debug('Dumping ' + outputName, json);
    } else {
      this.outputs[outputName] = '&nbsp;No result';
    }
  }

  doSubmit(event?: Event) {
    // Nothing to do
  }
}
