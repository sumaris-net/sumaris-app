import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {PhysicalGearValidatorService} from "../services/physicalgear.validator";
import {isNotNil, Measurement, PhysicalGear} from "../services/trip.model";
import {Platform} from "@ionic/angular";
import {Moment} from 'moment/moment'
import {DateAdapter} from "@angular/material";
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {debounceTime, distinct, distinctUntilChanged, filter, map, startWith} from 'rxjs/operators';
import {AppForm} from '../../core/core.module';
import {
  EntityUtils,
  ProgramService,
  ReferentialRef,
  ReferentialRefService,
  referentialToString
} from "../../referential/referential.module";
import {MeasurementsForm} from '../measurement/measurements.form.component';
import {environment} from '../../../environments/environment';

@Component({
    selector: 'form-physical-gear',
    templateUrl: './physicalgear.form.html',
    styleUrls: ['./physicalgear.form.scss']
})
export class PhysicalGearForm extends AppForm<PhysicalGear> implements OnInit {

    private _gears: ReferentialRef[] = [];

    loading = false;
    filteredGears: Observable<ReferentialRef[]>;
    measurements: Measurement[];
    gear: Subject<string> = new BehaviorSubject<string>(null);
    programSubject = new Subject<string>();

    @Input() set program(program: string) {
      this.programSubject.next(program);
    }

    @Input() showComment: boolean = true;

    @ViewChild('measurementsForm') measurementsForm: MeasurementsForm;

    @Output()
    valueChanges: EventEmitter<any> = new EventEmitter<any>();


    get dirty(): boolean {
        return this.form.dirty || this.measurementsForm.dirty;
    }
    get invalid(): boolean {
        return this.form.invalid || this.measurementsForm.invalid;
    }
    get valid(): boolean {
        return this.form.valid && this.measurementsForm.valid;
    }

    constructor(
        protected dateAdapter: DateAdapter<Moment>,
        protected platform: Platform,
        protected physicalGearValidatorService: PhysicalGearValidatorService,
        protected programService: ProgramService,
        protected referentialRefService: ReferentialRefService
    ) {

        super(dateAdapter, platform, physicalGearValidatorService.getFormGroup());
    }

    async ngOnInit() {

      this.registerSubscription(
        this.programSubject
          .pipe(
            filter(isNotNil),
            distinct()
          )
          .subscribe(async(program) => {
              this._gears = await this.programService.loadGears(program);
          })
      );

      // Combo: gears
      this.filteredGears = this.form.controls['gear'].valueChanges
          .pipe(
              //distinctUntilChanged(),
              debounceTime(250),
              startWith(''),
              map((value: any) => {
                  if (EntityUtils.isNotEmpty(value)) {
                      // apply value for measurements sub-form
                      //this.gear.next(value.label);
                      return [value];
                  }
                  value = (typeof value === "string" && value !== '*') && value || undefined;
                  if (!value) return this._gears; // all gears
                  // Search on label or name
                  const ucValue = value.toUpperCase();
                  return this._gears.filter(g =>
                      (g.label && g.label.toUpperCase().indexOf(ucValue) === 0)
                      || (g.name && g.name.toUpperCase().indexOf(ucValue) != -1)
                  );
              })
          );

        this.form.controls['gear'].valueChanges
            .filter(value => EntityUtils.isNotEmpty(value) && !this.loading)
            .subscribe(value => {
                this.measurementsForm.gear = value.label;
                this.measurementsForm.updateControls('[physical-gear-form] gear changed');
            });

        this.measurementsForm.valueChanges
            /*.pipe(
                debounceTime(300)
            )*/
            .subscribe(measurements => {
                // Skip if noloading or no observers
                if (this.loading || !this.valueChanges.observers.length) return;

                if (this.debug) console.debug("[physical-gear-form] measurementsForm.valueChanges => propagate event");
                this.valueChanges.emit(this.value);
            });

        this.form.valueChanges
            /*.pipe(
                debounceTime(300)
            )*/
            .subscribe(json => {
                // Skip if not loading or no observers
                if (this.loading || !this.valueChanges.observers.length) return;

                if (this.debug) console.debug("[physical-gear-form] form(=gear).valueChanges => propagate event");
                this.valueChanges.emit(this.value);
            });
    }

    referentialToString = referentialToString;

    set value(data: PhysicalGear) {
        if (this.loading) {
            // Avoid to reload when previous not finish
            throw new Error("Previous value load not finish! Please check 'loading === false' before setting a value to this form!")
        }

        this.loading = true;

        super.setValue(data);

        const measurements = data && data.measurements || [];

        this.measurementsForm.gear = data && data.gear && data.gear.label;
        this.measurementsForm.value = measurements;
        this.measurementsForm.updateControls('[physical-gear-form] set value');

        if (!this.measurementsForm.gear) {
            // No gear yet
            this.loading = false;
        }
        else {
            // Wait the end of pmfms loading
            this.measurementsForm.onLoading
                .filter(loading => !loading)
                .first()
                .subscribe(() => this.loading = false);
        }

        // Restore enable state (because form.setValue() can change it !)
        if (this._enable) {
          this.enable({onlySelf: true, emitEvent: false});
        }
        else {
          this.disable({onlySelf: true, emitEvent: false});
        }
    }

    get value(): PhysicalGear {
        if (this.loading) {
            // Avoid to send not loading data
            console.error("Component not loading !");
            return undefined;
        }

        const json = this.form.value;
        json.measurements = this.measurementsForm.value;

        return json;
    }

    public disable(opts?: {
        onlySelf?: boolean;
        emitEvent?: boolean;
    }): void {
        super.disable(opts);
        this.measurementsForm.disable(opts);
    }

    public enable(opts?: {
        onlySelf?: boolean;
        emitEvent?: boolean;
    }): void {
        super.enable(opts);
        this.measurementsForm.enable(opts);
    }

    public markAsPristine() {
        super.markAsPristine();
        this.measurementsForm.markAsPristine();
    }

    public markAsUntouched() {
        super.markAsUntouched();
        this.measurementsForm.markAsUntouched();
    }

    public markAsTouched() {
        super.markAsTouched();
        this.measurementsForm.markAsTouched();
    }
}
