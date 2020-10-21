import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {Moment} from 'moment/moment';
import {DateAdapter} from "@angular/material/core";
import {LocalSettingsService} from "../../core/services/local-settings.service";
import {FormBuilder} from "@angular/forms";
import {ReferentialRefService} from "../../referential/services/referential-ref.service";
import {AppForm, ReferentialRef, IReferentialRef} from '../../core/core.module';
import {StatusIds} from "../../core/services/model/model.enum";
import {BehaviorSubject} from "rxjs";
import { Planification } from 'src/app/trip/services/model/planification.model';
import { PlanificationValidatorService } from 'src/app/trip/services/validator/planification.validator';

@Component({
  selector: 'form-planification',
  templateUrl: './planification.form.html',
  styleUrls: ['./planification.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {provide: PlanificationValidatorService}
  ],
})
export class PlanificationForm extends AppForm<Planification> implements OnInit {

  protected formBuilder: FormBuilder;
  private _taxonNameSubject = new BehaviorSubject<IReferentialRef[]>(undefined);
  mobile: boolean;
  enableTaxonNameFilter = false;
  canFilterTaxonName = true;

  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected validatorService: PlanificationValidatorService,
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

    // taxonName combo
    this.registerAutocompleteField('taxonName', {
      /*suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        entityName: 'TaxonName',
        statusId: StatusIds.ENABLE
      }),*/
      items: this._taxonNameSubject,
      mobile: this.mobile
    });

    this.loadTaxonNames();
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
  
  toggleFilteredTaxonName() {
      this.enableTaxonNameFilter = !this.enableTaxonNameFilter;
      this.loadTaxonNames();
      console.log("enableTaxonNameFilter: " + this.enableTaxonNameFilter);
  }

  /* -- protected methods -- */

  protected async loadTaxonNames() {
    console.log("loadTaxonNames works");
    const taxonNameControl = this.form.get('taxonName');
    taxonNameControl.enable();
    // Refresh taxonNames
    if (this.enableTaxonNameFilter) {
      const taxonNames = await this.loadFilteredTaxonNamesMethod();
      this._taxonNameSubject.next(taxonNames);
    } else {
      const taxonNames = await this.loadTaxonNamesMethod();
      this._taxonNameSubject.next(taxonNames);
    }
  }

  // Load taxonName Service
  protected async loadTaxonNamesMethod(): Promise<ReferentialRef[]> {
    console.log("loadTaxonName works");
    const res = await this.referentialRefService.loadAll(0, 200, null, null, {entityName: "TaxonName"});
    return res.data;
  }

  // Load Filtered taxonName Service
  protected async loadFilteredTaxonNamesMethod(): Promise<ReferentialRef[]> {
    console.log("loadFilteredTaxonName works");
    // TODO replace with dataService.loadAlreadyFilledTaxonName(0, 200, null, null)
    const res = await this.referentialRefService.loadAll(2, 3, null, null, {entityName: "TaxonName"});
    return res.data;
  }


}
