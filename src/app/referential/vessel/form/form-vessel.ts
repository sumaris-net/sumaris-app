import {Component, OnInit} from '@angular/core';
import {VesselValidatorService} from "../../services/vessel.validator";
import {FormGroup} from "@angular/forms";
import {EntityUtils, LocationLevelIds, ReferentialRef, referentialToString, VesselFeatures} from "../../services/model";
import {Platform} from '@ionic/angular';
import {Moment} from 'moment/moment';
import {DateAdapter} from "@angular/material";
import {Observable, of} from 'rxjs';
import {first, map, mergeMap} from 'rxjs/operators';
import {AppForm, AppFormUtils} from '../../../core/core.module';
import {ReferentialRefService} from '../../services/referential-ref.service';


@Component({
  selector: 'form-vessel',
  templateUrl: './form-vessel.html',
  styleUrls: ['./form-vessel.scss']
})
export class VesselForm extends AppForm<VesselFeatures> implements OnInit {

  form: FormGroup;
  data: VesselFeatures;
  locations: Observable<ReferentialRef[]>;


  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected platform: Platform,
    protected vesselValidatorService: VesselValidatorService,
    protected referentialRefService: ReferentialRefService
  ) {

    super(dateAdapter, platform, vesselValidatorService.getFormGroup());
  }

  ngOnInit() {
    this.locations = this.form.controls['basePortLocation']
      .valueChanges
      .pipe(
        mergeMap(value => {
          if (EntityUtils.isNotEmpty(value)) return of([value]);
          value = (typeof value == "string" && value !== '*') && value || undefined;
          return this.referentialRefService.loadAll(0, !value ? 30 : 10, undefined, undefined,
            {
              entityName: 'Location',
              levelId: LocationLevelIds.PORT,
              searchText: value as string
            }
          ).pipe(
            first(),
            map(({data}) => data)
          )
        }))
    ;
  }

  referentialToString = referentialToString;
  filterNumberInput = AppFormUtils.filterNumberInput;

}
