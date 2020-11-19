import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {Moment} from 'moment/moment';
import {DateAdapter} from "@angular/material/core";
import {LocalSettingsService} from "../../core/services/local-settings.service";
import {AbstractControl, ControlValueAccessor, FormBuilder} from "@angular/forms";
import {ReferentialRefService} from "../../referential/services/referential-ref.service";
import {AppForm, ReferentialRef, IReferentialRef} from '../../core/core.module';
import {StatusIds} from "../../core/services/model/model.enum";
import {BehaviorSubject} from "rxjs";
import { Planification } from 'src/app/trip/services/model/planification.model';
import { PlanificationValidatorService } from 'src/app/trip/services/validator/planification.validator';
import { Program } from '../services/model/program.model';
import { DEFAULT_PLACEHOLDER_CHAR } from 'src/app/shared/constants';
import { InputElement } from 'src/app/shared/shared.module';
import { MatAutocompleteFieldConfig } from 'src/app/shared/material/material.autocomplete';

@Component({
  selector: 'form-planification',
  templateUrl: './planification.form.html',
  styleUrls: ['./planification.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {provide: PlanificationValidatorService}
  ],
})
export class PlanificationForm extends AppForm<Planification> implements OnInit, ControlValueAccessor, InputElement {

  protected formBuilder: FormBuilder;
  private _eotpSubject = new BehaviorSubject<IReferentialRef[]>(undefined);
  private _calcifiedTypeSubject = new BehaviorSubject<IReferentialRef[]>(undefined);



  private eotpList: Array<{id,label: string, name: string, statusId : number, entityName: string}> = [
    {id: '1', label: 'P101-0001-01-DF', name: 'GRAND PORT MARITIME DE GUADELOUPE - FCT', statusId:1,entityName:"Eotp"},
    {id: '2', label: 'P101-0002-01-RE', name: 'SOCLE HALIEUTIQUE - RE', statusId:1,entityName:"Eotp"},
    {id: '3', label: 'P101-0003-01-RE', name: 'DCF- Recettes',statusId:1,entityName:"Eotp"},
    {id: '4', label: 'P101-0005-01-DF', name: 'CONV TRIPARTITE AAMP-DPMA-IFR-FCT',statusId:1,entityName:"Eotp"},
    {id: '5', label: 'P101-0006-01-DF', name: 'APP EMR DGEC - état des lieux - DF',statusId:1,entityName:"Eotp"}
  ];

  private FiltredEotpList: Array<{id,label: string, name: string, statusId : number, entityName: string}> = [
    {id: '3', label: 'P101-0003-01-RE', name: 'DCF- Recettes',statusId:1,entityName:"Eotp"},
    {id: '5', label: 'P101-0006-01-DF', name: 'APP EMR DGEC - état des lieux - DF',statusId:1,entityName:"Eotp"}
  ];

  mobile: boolean;

  enableTaxonNameFilter = true;
  canFilterTaxonName = true;

  enableEotpFilter = true;
  canFilterEotp = true;

  enableLaboratoryFilter = true;
  canFilterLaboratory = true;

  enableFishingAreaFilter = true;
  canFilterFishingArea = true;


  enableLandingAreaFilter = true;
  canFilterLandingArea = true;

  enableCalcifiedTypeFilter = true;
  canFilterCalcifiedType = true;


  @Input() program: Program;

  sampleRowCode: string = '';

  @Input() placeholderChar: string = DEFAULT_PLACEHOLDER_CHAR;


  sampleRowCodeModel: any;
  public sampleRowCodeMask = {
    guide: true,
    showMask : true,
    mask: [/\d/, /\d/, /\d/, /\d/, '-', 'B', 'I', '0', '-', /\d/, /\d/, /\d/, /\d/]
  };

  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected validatorService: PlanificationValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef
  ) {
    super(dateAdapter, validatorService.getFormGroup(), settings);
  }
  tabIndex?: number;
  hidden?: boolean;
  focus() {
    throw new Error('Method not implemented.');
  }
  writeValue(value: any): void {
     if (value !== this.sampleRowCode) {
          this.sampleRowCode = value;
        }
  }
  registerOnChange(fn: any): void {
    throw new Error('Method not implemented.');
  }
  registerOnTouched(fn: any): void {
    throw new Error('Method not implemented.');
  }
  setDisabledState?(isDisabled: boolean): void {
    throw new Error('Method not implemented.');
  }

  ngOnInit() {

    //set current year
    const currentYear = new Date ();
    this.form.get('year').setValue(currentYear);

    // taxonName autocomplete
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value, filter) => this.suggest(value, {
        ...filter, statusId : 1
      },
      'TaxonName',
      this.enableTaxonNameFilter),
      attributes: ['name'],
      columnNames: [ 'REFERENTIAL.NAME'],
      columnSizes: [2,10],
      mobile: this.settings.mobile
    });

    // laboratory autocomplete
    this.registerAutocompleteField('laboratory', {
      suggestFn: (value, filter) => this.suggest(value, {
        ...filter, statusId : 1
      },
      'Department',
      this.enableLaboratoryFilter),
      columnSizes : [4,6],
      mobile: this.settings.mobile
    });

    // fishingArea autocomplete
    this.registerAutocompleteField('fishingArea', {
      suggestFn: (value, filter) => this.suggest(value, {
        ...filter, statusId : 0, levelId : 111
      },
      'Location',
      this.enableFishingAreaFilter),
      mobile: this.settings.mobile
    });

    // landingArea autocomplete
    this.registerAutocompleteField('landingArea', {
      suggestFn: (value, filter) => this.suggest(value, {
        ...filter, statusId : 1, levelId : 6
      },
      'Location',
      this.enableLandingAreaFilter),
      mobile: this.settings.mobile
    });

     // eotp combo -------------------------------------------------------------------
     this.registerAutocompleteField('eotp', {
      columnSizes : [4,6],
      items: this._eotpSubject,
      mobile: this.mobile
    });
    this.loadEotps();

    // Calcified type combo ------------------------------------------------------------
    this.registerAutocompleteField('calcifiedType', {
      attributes: ['name'],
      columnNames: [ 'REFERENTIAL.NAME'],
      columnSizes: [2,10],
      items: this._calcifiedTypeSubject,
      mobile: this.mobile
    });
    this.loadCalcifiedType();

  }

  /**
   * Suggest autocomplete values
   * @param value
   * @param filter - filters to apply
   * @param entityName - referential to request
   * @param filtered - boolean telling if we load prefilled data
   */
  protected async suggest(value: string, filter: any, entityName: string, filtered: boolean) : Promise<IReferentialRef[]> {
    if(filtered) {
      //TODO a remplacer par recuperation des donnees deja saisies
      const res = await this.referentialRefService.loadAll(0, 5, null, null,
        { ...filter,
          entityName : entityName
        },
        { withTotal: false /* total not need */ }
      );
      return res.data;
    } else {
      return this.referentialRefService.suggest(value, {
        ...filter,
        entityName : entityName
      });
    }
  }

  toggleFilteredItems(fieldName: string){
    let value : boolean;
    switch (fieldName) {
      case 'eotp':
        this.enableEotpFilter = value = !this.enableEotpFilter;
        this.loadEotps();
        break;
      case 'laboratory':
        this.enableLaboratoryFilter = value = !this.enableLaboratoryFilter;
        break;
      case 'fishingArea':
        this.enableFishingAreaFilter = value = !this.enableFishingAreaFilter;
        break;
      case 'landingArea':
        this.enableLandingAreaFilter = value = !this.enableLandingAreaFilter;
        break;
      case 'taxonName':
        this.enableTaxonNameFilter = value = !this.enableTaxonNameFilter;
        break;
      case 'calcifiedType':
        this.enableCalcifiedTypeFilter = value = !this.enableCalcifiedTypeFilter;
        this.loadCalcifiedType();
        break;
      default:
        break;
    }
    this.markForCheck();
    console.debug(`[planification] set enable filtered ${fieldName} items to ${value}`);
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

  // Calcified Type ---------------------------------------------------------------------------------------------
      private calcifiedTypesList: Array<{id,label: string, name: string, statusId : number, entityName: string}> = [
        {id: '1', label: 'écaille', name: 'écaille', statusId:1,entityName:"calcifiedType"},
        {id: '2', label: 'illicium', name: 'illicium', statusId:1,entityName:"calcifiedType"},
        {id: '3', label: 'vertèbre', name: 'vertèbre',statusId:1,entityName:"calcifiedType"},
        {id: '4', label: 'otolithe', name: 'otolithe',statusId:1,entityName:"calcifiedType"}
      ];
    private filteredcalcifiedTypesList: Array<{id,label: string, name: string, statusId : number, entityName: string}> = [
        {id: '1', label: 'écaille', name: 'écaille', statusId:1,entityName:"calcifiedType"},
        {id: '2', label: 'illicium', name: 'illicium', statusId:1,entityName:"calcifiedType"}
      ];
      protected async loadCalcifiedType() {
      const calcifiedTypeControl = this.form.get('calcifiedType');


      calcifiedTypeControl.enable();
        // Refresh filtred departments
        if (this.enableCalcifiedTypeFilter) {
          //const calcifiedTypes = await this.loadFilteredCalcifiedTypesMethod();
          // Mocked data
          const calcifiedTypes = this.filteredcalcifiedTypesList;
          this._calcifiedTypeSubject.next(calcifiedTypes);
        } else {
          // Refresh filtred departments
          //const calcifiedTypes = await this.loadCalcifiedTypesMethod();
          // Mocked data
            const calcifiedTypes = this.calcifiedTypesList;
            this._calcifiedTypeSubject.next(calcifiedTypes);
        }
    }

  protected  loadEotps() {
    const eotpAreaControl = this.form.get('eotp');
    eotpAreaControl.enable();

    if (this.enableEotpFilter) {
      // Refresh filtred eotp
      const eotps =  this.FiltredEotpList;
      this._eotpSubject.next(eotps);
    }
    else {
      // Refresh eotp
      const eotps =  this.eotpList;
      this._eotpSubject.next(eotps);
    }
  }
 //--------------------------------------------------------------------------------------------------------------------


}
