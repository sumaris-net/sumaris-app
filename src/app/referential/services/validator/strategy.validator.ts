import { Injectable } from "@angular/core";
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from "@angular/forms";
import { toNumber } from "@sumaris-net/ngx-components";
import { SharedValidators } from "@sumaris-net/ngx-components";
import { AppliedPeriod, AppliedStrategy, Strategy, StrategyDepartment, TaxonGroupStrategy, TaxonNameStrategy } from "../model/strategy.model";
import { PmfmStrategyValidatorService } from "./pmfm-strategy.validator";
import { ReferentialValidatorService } from "./referential.validator";

@Injectable({providedIn: 'root'})
export class StrategyValidatorService extends ReferentialValidatorService<Strategy> {

  constructor(
    protected formBuilder: UntypedFormBuilder,
    protected pmfmStrategyValidatorService: PmfmStrategyValidatorService
  ) {
    super(formBuilder);
  }

  getFormGroup(data?: Strategy): UntypedFormGroup {
    //console.debug("[strategy-validator] Creating strategy form");

    return this.formBuilder.group({
      id: [toNumber(data && data.id, null)],
      updateDate: [data && data.updateDate || null],
      creationDate: [data && data.creationDate || null],
      statusId: [data && data.statusId || null/*, Validators.required*/],
      label: this.getLabel(data),
      name: [data && data.name || null/*, Validators.required*/],
      description: [data && data.description || null, Validators.maxLength(255)],
      comments: [data && data.comments || null, Validators.maxLength(2000)],
      analyticReference: [data && data.analyticReference || null, Validators.maxLength(255)],

      gears: this.getGearsFormArray(data),
      taxonGroups: this.getTaxonGroupStrategyFormArray(data),
      taxonNames: this.getTaxonNameStrategyFormArray(data),
      pmfms: this.getPmfmStrategiesFormArray(data),
      appliedStrategies: this.getAppliedStrategiesFormArray(data),
      departments: this.getStrategyDepartmentsFormArray(data),

      programId: [toNumber(data && data.programId, null)],
    });
  }


  getLabel(data?: Strategy) {
    return [data && data.label || null, [Validators.required, (control)=>{
      if (control && control.value && control.value.includes('_')) {
        return {pattern : { pattern : false}}
      }
      return null;
    }]]
  }

  getPmfmStrategiesFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.pmfms || []).map(ps => this.pmfmStrategyValidatorService.getFormGroup(ps))
    );
  }

  getAppliedStrategiesFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.appliedStrategies || []).map(as => this.getAppliedStrategiesControl(as))
    );
  }

  getAppliedStrategiesControl(data?: AppliedStrategy): UntypedFormGroup {
    return this.formBuilder.group({
      id: [toNumber(data && data.id, null)],
      strategyId: [toNumber(data && data.strategyId, null)],
      location: [data && data.location, Validators.compose([Validators.required, SharedValidators.entity])],
      appliedPeriods: this.getAppliedPeriodsFormArray(data)
    });
  }

  getAppliedPeriodsFormArray(data?: AppliedStrategy) {
    return this.formBuilder.array(
      (data && data.appliedPeriods || []).map(ap => this.getAppliedPeriodsControl(ap))
    );
  }

  getAppliedPeriodsControl(data?: AppliedPeriod): UntypedFormGroup {
    return this.formBuilder.group({
      appliedStrategyId: [toNumber(data && data.appliedStrategyId, null)],
      startDate: [data && data.startDate, Validators.compose([Validators.required, SharedValidators.validDate])],
      endDate: [data && data.endDate, Validators.compose([Validators.required, SharedValidators.validDate])],
      acquisitionNumber: [data && data.acquisitionNumber, Validators.compose([SharedValidators.integer, Validators.min(0)])]
    });
  }

  getStrategyDepartmentsFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.departments || []).map(sd => this.getStrategyDepartmentsControl(sd))
    );
  }

  getStrategyDepartmentsControl(data?: StrategyDepartment): UntypedFormGroup {
    return this.formBuilder.group({
      strategyId: [toNumber(data && data.strategyId, null)],
      location: [data && data.location, SharedValidators.entity],
      privilege: [data && data.privilege],
      department: [data && data.department, Validators.compose([Validators.required, SharedValidators.entity])]
    });
  }

  getGearsFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.gears || []).map(g => this.getGearControl(g))
    );
  }

  getGearControl(gear?: any): UntypedFormControl {
    return this.formBuilder.control(gear || null, [Validators.required, SharedValidators.entity]);
  }

  getTaxonNameStrategyFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.taxonNames || []).map(tn => this.getTaxonNameStrategyControl(tn))
    );
  }

  getTaxonNameStrategyControl(data?: TaxonNameStrategy): UntypedFormGroup {
    return this.formBuilder.group({
      strategyId: [toNumber(data && data.strategyId, null)],
      priorityLevel: [data && data.priorityLevel, SharedValidators.integer],
      taxonName: [data && data.taxonName, Validators.compose([Validators.required, SharedValidators.entity])]
    });
  }

  getTaxonGroupStrategyFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.taxonGroups || []).map(tn => this.getTaxonGroupStrategyControl(tn))
    );
  }

  getTaxonGroupStrategyControl(data?: TaxonGroupStrategy): UntypedFormGroup {
    return this.formBuilder.group({
      strategyId: [toNumber(data && data.strategyId, null)],
      priorityLevel: [data && data.priorityLevel, SharedValidators.integer],
      taxonGroup: [data && data.taxonGroup, Validators.compose([Validators.required, SharedValidators.entity])]
    });
  }
}
