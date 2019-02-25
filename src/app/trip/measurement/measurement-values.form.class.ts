import {EventEmitter, Input} from '@angular/core';
import {MeasurementUtils, PmfmStrategy} from "../services/trip.model";
import {Platform} from "@ionic/angular";
import {Moment} from 'moment/moment';
import {DateAdapter} from "@angular/material";
import {Subject} from 'rxjs';
import {zip} from "rxjs/observable/zip";
import {AppForm, AppFormUtils} from '../../core/core.module';
import {ProgramService} from "../../referential/referential.module";
import {FormBuilder, FormGroup} from '@angular/forms';
import {MeasurementsValidatorService} from '../services/measurement.validator';

export abstract class MeasurementValuesForm<T extends { measurementValues: { [key: string]: any } }> extends AppForm<T> {

    protected _onValueChange = new EventEmitter<any>();
    protected _onRefreshPmfms = new EventEmitter<any>();
    protected _program: string;
    protected _gear: string = null;
    protected _acquisitionLevel: string;
    protected data: T;
    protected _debugAcquisitionLevel: string;

    loading: boolean = false;
    pmfms = new Subject<PmfmStrategy[]>();
    cachedPmfms: PmfmStrategy[];

    @Input() requiredGear: boolean = false;

    get program(): string {
        return this._program;
    }

    @Input()
    set program(value: string) {
        if (this._program === value) return; // Skip if same
        this._program = value;
        if (!this.loading) {
            this._onRefreshPmfms.emit('set program');
        }
    }


    get acquisitionLevel(): string {
        return this._acquisitionLevel;
    }

    @Input()
    set acquisitionLevel(value: string) {
        if (this._acquisitionLevel == value) return; // Skip if same
        this._acquisitionLevel = value;
        if (!this.loading) {
            this._onRefreshPmfms.emit('set acquisitionLevel');
        }
    }

    get gear(): string {
        return this._gear;
    }

    @Input()
    set gear(value: string) {
        if (this._gear == value) return; // Skip if same
        this._gear = value;
        if (!this.loading || this.requiredGear) {
            this._onRefreshPmfms.emit('set gear');
        }
    }

    public set value(value: T) {
        //this.logDebug("Set form value", value);
        if (this.data === value) return;
        this.data = value;
        if (value) {
            this._onValueChange.emit('set value');
        }
    }

    public get value(): T {

        if (this.form.controls.measurementValues) {
            const pmfmForm = this.form.controls.measurementValues as FormGroup;
            // Find dirty pmfms, to avoid full update
            const dirtyPmfms = (this.cachedPmfms || []).filter(pmfm => pmfmForm.controls[pmfm.pmfmId].dirty);
            if (dirtyPmfms.length) {
                this.data.measurementValues = Object.assign({}, this.data.measurementValues, MeasurementUtils.toEntityValues(pmfmForm.value, dirtyPmfms));
                //this.logDebug("Update data: ", this.data);
            }
        }

        return this.data;
    }

    constructor(protected dateAdapter: DateAdapter<Moment>,
        protected platform: Platform,
        protected measurementValidatorService: MeasurementsValidatorService,
        protected formBuilder: FormBuilder,
        protected programService: ProgramService,
        form: FormGroup
    ) {
        super(dateAdapter, platform, form);
    }

    ngOnInit() {
        super.ngOnInit();

        this.registerSubscription(
            this._onRefreshPmfms.asObservable()
                .subscribe(async (event: any) => {
                    // Skip if missing: program, acquisition (or gear, if required)
                    const candLoadPmfms = !!this._program && !!this._acquisitionLevel && (!this.requiredGear || !!this._gear)
                    if (!candLoadPmfms) {
                        this.pmfms.next([]);
                        this.loading = true;
                        return;
                    }

                    // Log 
                    //if (event) this.logDebug(`call _onRefreshPmfms.emit('${event}')`);
                    //this.logDebug(`Loading pmfms for '${this._program}/${this._acquisitionLevel}' and gear '${this._gear}'...`);
                    const now = Date.now();

                    // Load pmfms
                    const pmfms = (await this.programService.loadProgramPmfms(
                        this._program,
                        {
                            acquisitionLevel: this._acquisitionLevel,
                            gear: this._gear
                        })) || [];

                    if (!pmfms.length) {
                        const acquisitionLevel = this._acquisitionLevel.toLowerCase().replace(/[_]/g, '-');
                        console.warn(`[meas-form-${acquisitionLevel}] No pmfm found for '${this.program}' and gear '${this._gear}'. Please fill program's strategies for acquisition level '${this._acquisitionLevel}'.`);
                        this.loading = false; // mark as loaded
                    }
                    else {
                        //this.logDebug(`Pmfms for '${this._program}' loaded in ${Date.now() - now}ms`, pmfms);
                        this.pmfms.next(pmfms);
                        // If not first call: emit measurement (because of zip() will wait for measurement event)
                        if (!this.loading && this.data) {
                            this._onValueChange.emit('_onRefreshPmfms.subscribe');
                        }
                    }
                    this.cachedPmfms = pmfms;
                }));

        // Update the form group
        this.registerSubscription(
            zip(
                this._onValueChange.asObservable(),
                this.pmfms
            )
                .subscribe(([event, pmfms]) => {

                    this.loading = true;

                    //if (event) this.logDebug(`call _onMeasurementsChange.emit('${event}')`);

                    //const now = Date.now();
                    //this.logDebug("Updating form, using pmfms:", pmfms);

                    if (!this.form.controls['measurementValues']) {
                        this.form.addControl('measurementValues', this.measurementValidatorService.getFormGroup(pmfms));
                    }
                    else {
                        const form = this.form.controls['measurementValues'] as FormGroup;
                        this.measurementValidatorService.updateFormGroup(form, pmfms);
                        form.markAsPristine();
                        form.markAsUntouched();
                    }
                    const json = AppFormUtils.getFormValueFromEntity(this.data, this.form);
                    json.measurementValues = MeasurementUtils.normalizeFormValues(json.measurementValues, pmfms);
                    this.form.patchValue(json, {
                        onlySelf: true,
                        emitEvent: false
                    });
                    this.form.updateValueAndValidity();

                    //this.logDebug(`Form updated in ${Date.now() - now}ms`, json);

                    this.markAsUntouched();
                    this.markAsPristine();
                    this.cachedPmfms = pmfms;
                    this.loading = false;
                }));

        if (this._program && this._acquisitionLevel) {
            this._onRefreshPmfms.next('ngOnInit');
        }
        if (this.data) {
            this._onValueChange.next('ngOnInit');
        }

    }

    public markAsTouched() {
        this.form.markAsTouched();
        //this.form.updateValueAndValidity();
        if (this.cachedPmfms && this.form && this.form.controls['measurementValues']) {
            const pmfmForm = this.form.controls['measurementValues'] as FormGroup;
            this.cachedPmfms.forEach(pmfm => {
                pmfmForm.controls[pmfm.pmfmId].markAsTouched();
            });
        }
    }

    /* -- protected methods -- */

    protected logDebug(message: string, args?: any) {
        if (this.debug && (!this._debugAcquisitionLevel || (!this._acquisitionLevel || this._acquisitionLevel == this._debugAcquisitionLevel))) {
            const acquisitionLevel = this._acquisitionLevel && this._acquisitionLevel.toLowerCase().replace(/[_]/g, '-') || '?';
            if (!args) console.debug(`[meas-form-${acquisitionLevel}] ${message}`)
            else console.debug(`[meas-form-${acquisitionLevel}] ${message}`, args);
        }
    }
}
