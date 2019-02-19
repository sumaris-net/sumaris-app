import { Component, OnInit, Input } from '@angular/core';
import { SaleValidatorService } from "../services/sale.validator";
import { Sale, VesselFeatures, LocationLevelIds, referentialToString, entityToString, vesselFeaturesToString, EntityUtils, ReferentialRef } from "../services/trip.model";
import { Platform } from '@ionic/angular';
import { Moment } from 'moment/moment';
import { AppForm } from '../../core/core.module';
import { DateAdapter } from "@angular/material";
import {Observable, of} from 'rxjs';
import {mergeMap, debounceTime, first, map} from 'rxjs/operators';
import { VesselService, ReferentialRefService } from '../../referential/referential.module';

@Component({
  selector: 'form-sale',
  templateUrl: './sale.form.html',
  styleUrls: ['./sale.form.scss']
})
export class SaleForm extends AppForm<Sale> implements OnInit {

  vessels: Observable<VesselFeatures[]>;
  locations: Observable<ReferentialRef[]>;
  saleTypes: Observable<ReferentialRef[]>;

  @Input() required: boolean = true;
  @Input() showError: boolean = true;
  @Input() showVessel: boolean = true;
  @Input() showEndDateTime: boolean = true;
  @Input() showComment: boolean = true;
  @Input() showButtons: boolean = true;

  get empty(): any {
    let value = this.value;
    return (!value.saleLocation || !value.saleLocation.id)
      && (!value.startDateTime)
      && (!value.endDateTime)
      && (!value.saleType || !value.saleType.id)
      && (!value.comments || !value.comments.length);
  }

  get valid(): any {
    return this.required ? this.form.valid : (this.form.valid || this.empty);
  }

  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected platform: Platform,
    protected saleValidatorService: SaleValidatorService,
    protected vesselService: VesselService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(dateAdapter, platform, saleValidatorService.getFormGroup());
  }

  ngOnInit() {
    // Combo: vessels (if need)
    if (this.showVessel) {
      this.vessels = this.form.controls['vesselFeatures']
        .valueChanges
        .pipe(
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
    }
    else {
      this.form.controls['vesselFeatures'].clearValidators();
    }

    // Combo: sale locations
    this.locations = this.form.controls['saleLocation']
      .valueChanges
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
        }));

    // Combo: sale types
    this.saleTypes = this.form.controls['saleType']
      .valueChanges
      .pipe(
        debounceTime(250),
        mergeMap(value => {
          if (EntityUtils.isNotEmpty(value)) return of([value]);
          value = (typeof value === "string" && value !== '*') && value || undefined;
          return this.referentialRefService.loadAll(0, !value ? 30 : 10, undefined, undefined,
            {
              entityName: 'SaleType',
              searchText: value as string
            })
            .pipe(
              first(),
              map(({data}) => data)
            );
        }));
  }

  entityToString = entityToString;
  vesselFeaturesToString = vesselFeaturesToString;
  referentialToString = referentialToString;
}
