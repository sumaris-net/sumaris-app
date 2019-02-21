import {Component, EventEmitter, Input, OnInit} from '@angular/core';
import {OperationValidatorService} from "../services/operation.validator";
import {Operation, PhysicalGear, Trip} from "../services/trip.model";
import {Platform} from "@ionic/angular";
import {Moment} from 'moment/moment';
import {DateAdapter} from "@angular/material";
import {Observable} from 'rxjs';
import {debounceTime, map, mergeMap} from 'rxjs/operators';
import {merge} from "rxjs/observable/merge";
import {AppForm} from '../../core/core.module';
import {
  EntityUtils,
  ReferentialRef,
  ReferentialRefService,
  referentialToString
} from '../../referential/referential.module';
import * as moment from "moment";

@Component({
    selector: 'form-operation',
    templateUrl: './operation.form.html',
    styleUrls: ['./operation.form.scss']
})
export class OperationForm extends AppForm<Operation> implements OnInit {

    trip: Trip;
    metiers: Observable<ReferentialRef[]>;
    physicalGears: Observable<PhysicalGear[]>;

    onFocusPhysicalGear: EventEmitter<any> = new EventEmitter<any>();
    onFocusMetier: EventEmitter<any> = new EventEmitter<any>();

    @Input() showComment: boolean = true;
    @Input() showError: boolean = true;

    constructor(
        protected dateAdapter: DateAdapter<Moment>,
        protected platform: Platform,
        protected physicalGearValidatorService: OperationValidatorService,
        protected referentialRefService: ReferentialRefService
    ) {

        super(dateAdapter, platform, physicalGearValidatorService.getFormGroup());

    }

    ngOnInit() {
        // Combo: physicalGears
        this.physicalGears =
            merge(
                this.form.get('physicalGear').valueChanges.pipe(debounceTime(300)),
                this.onFocusPhysicalGear.pipe(map(any => this.form.get('physicalGear').value))
            )
                .pipe(
                    map(value => {
                        // Display the selected object
                        if (EntityUtils.isNotEmpty(value)) {
                          if (this.form.enabled) this.form.controls["metier"].enable()
                          else this.form.controls["metier"].disable();
                          return [value];
                        }
                        // Skip if no trip (or no physical gears)
                        if (!this.trip || !this.trip.gears || !this.trip.gears.length) {
                          this.form.controls["metier"].disable();
                          return [];
                        }
                        value = (typeof value === "string" && value !== "*") && value || undefined;
                        // Display all trip gears
                        if (!value) return this.trip.gears;
                        // Search on label or name
                        const ucValue = value.toUpperCase();
                        return this.trip.gears.filter(g => g.gear &&
                            (g.gear.label && g.gear.label.toUpperCase().indexOf(ucValue) != -1)
                            || (g.gear.name && g.gear.name.toUpperCase().indexOf(ucValue) != -1)
                        );
                    }));

        // Combo: metiers
        this.metiers = merge(
            this.form.get('metier').valueChanges.pipe(debounceTime(300)),
            this.onFocusMetier.pipe(map(any => this.form.get('metier').value))
        )
            .pipe(
                mergeMap(value => {
                    if (EntityUtils.isNotEmpty(value)) return Observable.of([value]);
                    const physicalGear = this.form.get('physicalGear').value;
                    if (!physicalGear || !physicalGear.gear) return Observable.of([]);
                    value = (typeof value === "string" && value !== "*") && value || undefined;
                    return this.referentialRefService.loadAll(0, !value ? 30 : 10, undefined, undefined,
                        {
                            entityName: 'Metier',
                            levelId: physicalGear && physicalGear.gear && physicalGear.gear.id || null,
                            searchText: value as string
                        }).first().map(({data}) => data);
                }));

       //  this.form.controls['endDateTime'].patchValue(moment());
       // this.form.controls.startDateTime.patchValue({
       //     startDateTime: moment()
       // });
        
        this.form.patchValue( {
            startDateTime: moment(),
            endDateTime: moment(),
        });
    }

    setTrip(trip: Trip) {
        this.trip = trip;

        // Use trip physical gear Object (if possible)
        let physicalGear = this.form.get("physicalGear").value;
        if (physicalGear && physicalGear.id) {
            physicalGear = (this.trip.gears || [physicalGear])
                .find(g => g.id == physicalGear.id)
            if (physicalGear) {
                this.form.controls["physicalGear"].patchValue(physicalGear);
            }
        }
    }


    physicalGearToString(physicalGear: PhysicalGear) {
        return physicalGear && physicalGear.id ? ("#" + physicalGear.rankOrder + " - " + referentialToString(physicalGear.gear)) : undefined;
    }

    referentialToString = referentialToString;
}
