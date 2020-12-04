import {Injectable} from "@angular/core";
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {AppliedPeriod, AppliedStrategy, Strategy, StrategyDepartment, TaxonGroupStrategy, TaxonNameStrategy} from "../model/strategy.model";
import {PmfmStrategyValidatorService} from "./pmfm-strategy.validator";
import {SharedFormArrayValidators, SharedValidators} from "../../../shared/validator/validators";
import {toNumber} from "../../../shared/functions";
import {ReferentialValidatorService} from "./referential.validator";

@Injectable({providedIn: 'root'})
export class StrategyValidatorService extends ReferentialValidatorService<Strategy> {

  constructor(
    protected formBuilder: FormBuilder,
    protected pmfmStrategyValidatorService: PmfmStrategyValidatorService
  ) {
    super(formBuilder);
  }

  getFormGroup(data?: Strategy): FormGroup {
    //console.debug("[strategy-validator] Creating strategy form");

    return this.formBuilder.group({
      id: [toNumber(data && data.id, null)],
      updateDate: [data && data.updateDate || null],
      creationDate: [data && data.creationDate || null],
      statusId: [data && data.statusId || null, Validators.required],
      label: [data && data.label || null, Validators.required],
      name: [data && data.name || null, Validators.required],
      description: [data && data.description || null, Validators.maxLength(255)],
      comments: [data && data.comments || null, Validators.maxLength(2000)],
      analyticReference: [data && data.analyticReference || null, Validators.maxLength(255)],

      gears: this.getGearsFormArray(data),
      taxonGroups: this.getTaxonGroupStrategyFormArray(data),
      taxonNames: this.getTaxonNameStrategyFormArray(data),
      pmfmStrategies: this.getPmfmStrategiesFormArray(data),
      appliedStrategies: this.getAppliedStrategiesFormArray(data),
      strategyDepartments: this.getStrategyDepartmentsFormArray(data),

      //gears: [data && data.gears || null], // WARN: Do NOT use special validator here
      //taxonGroups: [data && data.taxonGroups || null], // WARN: Do NOT use special validator here
      //taxonNames: [data && data.taxonNames || null], // WARN: Do NOT use special validator here
      //pmfmStrategies: [data && data.pmfmStrategies || null], // WARN: Do NOT use special validator here

      programId: [toNumber(data && data.programId, null)],
    });
  }

  getPmfmStrategiesFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.pmfmStrategies || []).map(ps => this.pmfmStrategyValidatorService.getFormGroup(ps))
    );
  }

  getAppliedStrategiesFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.appliedStrategies || []).map(as => this.getAppliedStrategiesControl(as))
    );
  }

  getAppliedStrategiesControl(data?: AppliedStrategy): FormGroup {
    return this.formBuilder.group({
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

  getAppliedPeriodsControl(data?: AppliedPeriod): FormGroup {
    return this.formBuilder.group({
      appliedStrategyId: [toNumber(data && data.appliedStrategyId, null)],
      startDate: [data && data.startDate, Validators.compose([Validators.required, SharedValidators.validDate])],
      endDate: [data && data.endDate, Validators.compose([Validators.required, SharedValidators.validDate])],
      acquisitionNumber: [data && data.acquisitionNumber, Validators.compose([SharedValidators.integer, Validators.min(0)])]
    });
  }

  getStrategyDepartmentsFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.strategyDepartments || []).map(sd => this.getStrategyDepartmentsControl(sd))
    );
  }

  getStrategyDepartmentsControl(data?: StrategyDepartment): FormGroup {
    return this.formBuilder.group({
      strategyId: [toNumber(data && data.strategyId, null)],
      location: [data && data.location, SharedValidators.entity],
      privilege: [data && data.privilege, Validators.compose([Validators.required, SharedValidators.entity])],
      department: [data && data.department, Validators.compose([Validators.required, SharedValidators.entity])]
    });
  }

  getGearsFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.gears || []).map(g => this.getGearControl(g))
    );
  }

  getGearControl(gear?: any): FormControl {
    return this.formBuilder.control(gear || null, [Validators.required, SharedValidators.entity]);
  }

  getTaxonNameStrategyFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.taxonNames || []).map(tn => this.getTaxonNameStrategyControl(tn))
    );
  }

  getTaxonNameStrategyControl(data?: TaxonNameStrategy): FormGroup {
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

  getTaxonGroupStrategyControl(data?: TaxonGroupStrategy): FormGroup {
    return this.formBuilder.group({
      strategyId: [toNumber(data && data.strategyId, null)],
      priorityLevel: [data && data.priorityLevel, SharedValidators.integer],
      taxonGroup: [data && data.taxonGroup, Validators.compose([Validators.required, SharedValidators.entity])]
    });
  }
}
