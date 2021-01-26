import {Injectable} from "@angular/core";
import {ValidatorService} from "@e-is/ngx-material-table";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {SharedFormGroupValidators, SharedValidators} from "../../../shared/validator/validators";
import {Sample} from "../model/sample.model";
import {isNotNil, toNumber} from "../../../shared/functions";
import {PmfmStrategy} from "../../../referential/services/model/pmfm-strategy.model";
import {PmfmUtils} from "../../../referential/services/model/pmfm.model";
import {Subscription} from "rxjs";
import {ParameterLabelStrategies} from "../../../referential/services/model/model.enum";

@Injectable({providedIn: 'root'})
export class SampleValidatorService implements ValidatorService {

  constructor(private formBuilder: FormBuilder) {
  }

  getRowValidator(): FormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: Sample): FormGroup {
    return this.formBuilder.group({
      __typename: [Sample.TYPENAME],
      id: [toNumber(data && data.id, null)],
      updateDate: [data && data.updateDate || null],
      creationDate: [data && data.creationDate || null],
      rankOrder: [toNumber(data && data.rankOrder, null), Validators.required],
      label: [data && data.label || null, Validators.required],
      individualCount: [toNumber(data && data.individualCount, null), Validators.compose([Validators.min(0), SharedValidators.integer])],
      sampleDate: [data && data.sampleDate || null, Validators.required],
      taxonGroup: [data && data.taxonGroup || null, SharedValidators.entity],
      taxonName: [data && data.taxonName || null, SharedValidators.entity],
      matrixId: [toNumber(data && data.matrixId, null)],
      batchId: [toNumber(data && data.batchId, null)],
      size: [toNumber(data && data.size, null)],
      sizeUnit: [data && data.sizeUnit || null],
      comments: [data && data.comments || null],
      parent: [data && data.parent || null, SharedValidators.entity],
      measurementValues: this.formBuilder.group({}),
      children: this.formBuilder.array([])
    }, {
      validators: [
        SharedFormGroupValidators.requiredIfEmpty('taxonGroup', 'taxonName'),
        SharedFormGroupValidators.requiredIfEmpty('taxonName', 'taxonGroup')
      ]
    });
  }

  static addSampleValidators(form: FormGroup, pmfms: PmfmStrategy[],
                             opts?: { markForCheck: () => void }): Subscription {
    if (!form) {
      console.warn("Argument 'form' required");
      return null;
    }

    // TODO : to uncomment after updating model.enum : merege develop-ifremer => develop-ifremer-sprint5
    /*const weightPmfms = pmfms.filter(p => PmfmUtils.hasParameterLabel(ParameterLabel.WEIGHT));
    const sizePmfms = pmfms.filter(p => PmfmUtils.hasParameterLabelIncludes(ParameterLabelList.SIZE));*/

    // TODO : to remove after updating model.enum : merege develop-ifremer => develop-ifremer-sprint5
    const weightPmfms = pmfms.filter(p => PmfmUtils.hasParameterLabelIncludes(p.pmfm,ParameterLabelStrategies.WEIGHTS));
    const sizePmfms = pmfms.filter(p => PmfmUtils.hasParameterLabelIncludes(p.pmfm,ParameterLabelStrategies.LENGTHS));

    form.setAsyncValidators(async (control) => {
      const formGroup = control as FormGroup;
      const measValues = formGroup.get('measurementValues').value;
      const missingWeight = weightPmfms.findIndex(p => isNotNil(measValues[p.pmfmId])) !== -1;
      const missingSize = sizePmfms.findIndex(p => isNotNil(measValues[p.pmfmId])) !== -1;

      const error = { missingWeightOrSize: true };

      if(!missingSize && !missingWeight){
        return error;
      }
    });

  }


}
