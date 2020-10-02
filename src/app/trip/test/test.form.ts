import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {TripValidatorService} from "../services/validator/trip.validator";
import {TestValidatorService} from "../services/validator/test.validator";
import {ModalController} from "@ionic/angular";
import {Moment} from 'moment/moment';
import {DateAdapter} from "@angular/material/core";
import {LocationLevelIds,} from "../../referential/services/model/model.enum";

import {personToString, UserProfileLabel} from "../../core/services/model/person.model";
import {referentialToString, ReferentialUtils} from "../../core/services/model/referential.model";
import {UsageMode} from "../../core/services/model/settings.model";
import {LocalSettingsService} from "../../core/services/local-settings.service";
import {VesselSnapshotService} from "../../referential/services/vessel-snapshot.service";
import {FormArray, FormBuilder} from "@angular/forms";
import {PersonService} from "../../admin/services/person.service";
import {isNotNilOrBlank, toBoolean} from "../../shared/functions";
import {NetworkService} from "../../core/services/network.service";
import {Vessel} from "../../referential/services/model/vessel.model";
import {Metier} from "../../referential/services/model/taxon.model";
import {METIER_DEFAULT_FILTER, MetierFilter} from "../../referential/services/metier.service";
import {Trip} from "../services/model/trip.model";
import {ReferentialRefFilter, ReferentialRefService} from "../../referential/services/referential-ref.service";
import {debounceTime, filter} from "rxjs/operators";
import {AppForm, FormArrayHelper, isNil, isNotNil, Person, ReferentialRef, StatusIds, IReferentialRef, EntityUtils} from '../../core/core.module';
import {VesselModal} from "../../referential/vessel/modal/modal-vessel";
import {VesselSnapshot} from "../../referential/services/model/vessel-snapshot.model";
import { MatTabGroup } from '@angular/material/tabs';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import { Test } from '../services/model/test.model';
import {BehaviorSubject} from "rxjs";
import {distinctUntilChanged} from "rxjs/operators";


@Component({
  selector: 'form-test',
  templateUrl: './test.form.html',
  styleUrls: ['./test.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {provide: TestValidatorService}
  ],
})
export class TestForm extends AppForm<Test> implements OnInit {

  protected formBuilder: FormBuilder;
  private _taxonGroupSubject = new BehaviorSubject<IReferentialRef[]>(undefined);
  mobile: boolean;

  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected validatorService: TestValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef
  ) {
    super(dateAdapter, validatorService.getFormGroup(), settings);
  }

  ngOnInit() {

    // Taxon group combo
    this.registerAutocompleteField('taxonGroup', {
      items: this._taxonGroupSubject,
      mobile: this.mobile
    });
     
      this.loadTaxonGroupe();
  }
 

  /*setValue(data: Test, opts?: {emitEvent?: boolean; onlySelf?: boolean; }) {
    // Use label and name from metier.taxonGroup
    if (data && data.metier) {
      data.metier = data.metier.clone(); // Leave original object unchanged
      data.metier.label = data.metier.taxonGroup && data.metier.taxonGroup.label || data.metier.label;
      data.metier.name = data.metier.taxonGroup && data.metier.taxonGroup.name || data.metier.name;
    }
    super.setValue(data, opts);
  }*/

  // save buttonn
  save(){
    console.log("save work");
  /* console.log("comment : "+this.form.get("comment").value);*/
  }

  cancel(){
    console.log("cancel works");
  }

  add(){
    console.log("add works");
  }

  close(){
    console.log("close works");
  }


   /* -- protected methods -- */
   
  protected async loadTaxonGroupe() {

    console.log("loadTaxonGroupe works");

    const metierControl = this.form.get('metier');
     metierControl.enable();
      // Refresh metiers
      const taxonGroup = await this.loadTaxonGroupMethod();
      this._taxonGroupSubject.next(taxonGroup);
  }

  // Load taxonGroup Service
  protected async loadTaxonGroupMethod(): Promise<ReferentialRef[]> {
    console.log("loadMetiers works");
    const res = await this.referentialRefService.loadAll(0, 200, null,null, 
      {
        entityName: "TaxonGroup"   
      });

    return res.data;
  }


}
