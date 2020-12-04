import {Injectable} from "@angular/core";
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {AppliedPeriod, AppliedStrategy, Strategy, StrategyDepartment, TaxonGroupStrategy, TaxonNameStrategy} from "../model/strategy.model";
import {PmfmStrategyValidatorService} from "./pmfm-strategy.validator";
import {SharedFormArrayValidators, SharedValidators} from "../../../shared/validator/validators";
import {toNumber} from "../../../shared/functions";
import {ReferentialValidatorService} from "./referential.validator";
import {StrategyValidatorService} from "./strategy.validator";
import {SimpleStrategy} from "../model/simpleStrategy.model";

@Injectable({providedIn: 'root'})
export class SimpleStrategyValidatorService extends StrategyValidatorService {

  constructor(
    protected formBuilder: FormBuilder,
    protected pmfmStrategyValidatorService: PmfmStrategyValidatorService
  ) {
    super(formBuilder,pmfmStrategyValidatorService);
  }

  getFormGroup(data?: SimpleStrategy): FormGroup {
    //console.debug("[strategy-validator] Creating strategy form");

    return this.formBuilder.group({

      year: [data && data.year || null, Validators.required],
      sampleRowCode: [data && data.sampleRowCode || null, Validators.required],
      comments: [data && data.comments || null,Validators.nullValidator],
      taxonName: [data && data.taxonName || null, Validators.compose([Validators.required, SharedValidators.entity])],
      sex: [data && data.sex || null,Validators.nullValidator],
      age: [data && data.age || null,Validators.nullValidator],
      calcifiedTypes : this.getCalcifiedTypesArray(data),
      laboratories : this.getLaboratoriesArray(data),
      fishingAreas : this.getFishingAreasArray(data),
      eotp: [data && data.eotp || null, Validators.compose([Validators.nullValidator, SharedValidators.entity])],
      weightPmfmStrategies: this.getWeightPmfmStrategiesFormArray(data),
      sizePmfmStrategies: this.getSizePmfmStrategiesFormArray(data),
      maturityPmfmStrategies: this.getMaturityPmfmStrategiesFormArray(data),

    });
  }

  getWeightPmfmStrategiesFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.pmfmStrategies || []).map(ps => this.pmfmStrategyValidatorService.getFormGroup(ps))
    );
  }
  getSizePmfmStrategiesFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.pmfmStrategies || []).map(ps => this.pmfmStrategyValidatorService.getFormGroup(ps))
    );
  }
  getMaturityPmfmStrategiesFormArray(data?: Strategy) {
    return this.formBuilder.array(
      (data && data.pmfmStrategies || []).map(ps => this.pmfmStrategyValidatorService.getFormGroup(ps))
    );
  }

  // FishingArea Control -----------------------------------------------------------------------------------
  getFishingAreasArray(data?: SimpleStrategy) {
    return this.formBuilder.array(
      (data && data.fishingAreas || []).map(fishingArea => this.getControl(fishingArea)),
      SharedFormArrayValidators.requiredArrayMinLength(1)
    );
  }

  // Laboratory Control --------------------------------------------------------------------------------------
  getLaboratoriesArray(data?: SimpleStrategy) {
    return this.formBuilder.array(
      (data && data.laboratories || []).map(laboratory => this.getControl(laboratory)),
      SharedFormArrayValidators.requiredArrayMinLength(1)
    );
  }


  // CalcifiedType Control -----------------------------------------------------------------------------------
  getCalcifiedTypesArray(data?: SimpleStrategy) {
    return this.formBuilder.array(
      (data && data.calcifiedTypes || []).map(calcifiedType => this.getControl(calcifiedType)),
      SharedFormArrayValidators.requiredArrayMinLength(1)
    );
  }

  getControl(value: any) {
    return this.formBuilder.control(value || null, [Validators.required, SharedValidators.entity]);
  }
}
