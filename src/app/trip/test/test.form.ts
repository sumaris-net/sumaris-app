import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {TestValidatorService} from "../services/validator/test.validator";
import {Moment} from 'moment/moment';
import {DateAdapter} from "@angular/material/core";
import {LocalSettingsService} from "../../core/services/local-settings.service";
import {FormBuilder, FormControl} from "@angular/forms";
import {ReferentialRefService} from "../../referential/services/referential-ref.service";
import {AppForm, ReferentialRef, IReferentialRef} from '../../core/core.module';
import { Test } from '../services/model/test.model';
import {BehaviorSubject} from "rxjs";
import { areAllEquivalent } from '@angular/compiler/src/output/output_ast';


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

    //set current year
    const currentYear = new Date ();
    this.form.get('year').setValue(currentYear);

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

    console.log(this.form.get("comment"));

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
