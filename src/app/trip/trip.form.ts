import {Component, Input, OnInit} from '@angular/core';
import {TripValidatorService} from "./services/trip.validator";
import {LocationLevelIds, Referential, Trip, VesselFeatures, vesselFeaturesToString} from "./services/trip.model";
import {ModalController, Platform} from "@ionic/angular";
import {Moment} from 'moment/moment';
import {DateAdapter} from "@angular/material";
import {Observable, of} from 'rxjs';
import {debounceTime, first, map, mergeMap, startWith} from 'rxjs/operators';
import {merge} from "rxjs/observable/merge";
import {AppForm} from '../core/core.module';
import {
  EntityUtils,
  ReferentialRef,
  ReferentialRefService,
  referentialToString,
  VesselModal,
  VesselService
} from "../referential/referential.module";

@Component({
  selector: 'form-trip',
  templateUrl: './trip.form.html',
  styleUrls: ['./trip.form.scss']
})
export class TripForm extends AppForm<Trip> implements OnInit {

  programs: Observable<ReferentialRef[]>;
  vessels: Observable<VesselFeatures[]>;
  locations: Observable<ReferentialRef[]>;

  @Input() showComment: boolean = true;
  @Input() showError: boolean = true;

  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected platform: Platform,
    protected tripValidatorService: TripValidatorService,
    protected vesselService: VesselService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController
  ) {

    super(dateAdapter, platform, tripValidatorService.getFormGroup());
  }

  ngOnInit() {
    // Combo: vessels
    this.programs = this.form.controls['program']
      .valueChanges
      .pipe(
        startWith(''),
        debounceTime(250),
        mergeMap(value => {
          if (EntityUtils.isNotEmpty(value)) return of([value]);
          value = (typeof value === "string" && value !== "*") && value || undefined;
          return this.referentialRefService.loadAll(0, !value ? 50 : 10, undefined, undefined,
            {
              entityName: 'Program',
              searchText: value as string
            })
            .pipe(
              first(),
              map(({data}) => data)
            );
        }));

    // Combo: vessels
    this.vessels = this.form.controls['vesselFeatures']
      .valueChanges
      .pipe(
        debounceTime(250),
        mergeMap(value => {
          if (EntityUtils.isNotEmpty(value)) return of([value]);
          value = (typeof value === "string") && value || undefined;
          return this.vesselService.loadAll(0, 10, undefined, undefined,
            { searchText: value as string }
          )
            .pipe(
              first(),
              map(({data}) => data)
            );
        }));

    // Combo: sale location
    this.locations =
      merge(
        this.form.controls['departureLocation'].valueChanges,
        this.form.controls['returnLocation'].valueChanges
      )
        .pipe(
          debounceTime(250),
          mergeMap(value => {
            if (EntityUtils.isNotEmpty(value)) return of([value]);
            value = (typeof value === "string" && value !== '*') && value || undefined;
            return this.referentialRefService.loadAll(0, !value ? 30 : 10, undefined, undefined,
              {
                entityName: 'Location',
                levelId: LocationLevelIds.PORT,
                searchText: value as string
              })
              .pipe(
                first(),
                map(({data}) => data)
              );
          })
        );
  }

  async addVesselModal(): Promise<any> {
    const modal = await this.modalCtrl.create({ component: VesselModal });
    modal.onDidDismiss().then(res => {
      // if new vessel added, use it
      if (res && res.data instanceof VesselFeatures) {
        console.debug("[trip-form] New vessel added : updating form...", res.data);
        this.form.controls['vesselFeatures'].setValue(res.data);
      }
      else {
        console.debug("[trip-form] No vessel added (user cancelled)");
      }
    });
    return modal.present();
  }

  vesselFeaturesToString = vesselFeaturesToString;
  referentialToString = referentialToString;

  programToString(value: Referential) {
    return referentialToString(value, ['label']);
  }
}
