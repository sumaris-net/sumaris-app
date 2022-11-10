import {Injectable} from "@angular/core";
import {UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {SharedValidators} from "@sumaris-net/ngx-components";
import {ExtractionProduct} from "./product.model";
import {AppValidatorService}  from "@sumaris-net/ngx-components";
import {toBoolean, toNumber} from "@sumaris-net/ngx-components";
import { AggregationStrata } from '@app/extraction/strata/strata.model';
import { AggregationStrataValidatorService } from '@app/extraction/strata/strata.validator';

@Injectable({providedIn: 'root'})
export class ExtractionProductValidatorService extends AppValidatorService<ExtractionProduct> {

  constructor(
    protected formBuilder: UntypedFormBuilder,
    protected strataValidatorService: AggregationStrataValidatorService,
    ) {
    super(formBuilder);
  }

  getFormGroup(data?: ExtractionProduct): UntypedFormGroup {
    return this.formBuilder.group({
      __typename: ExtractionProduct.TYPENAME,
      id: [data && data.id || null],
      format: [data && data.format || null, Validators.required],
      version: [data && data.version || null, Validators.maxLength(10)],
      label: [data && data.label || null, Validators.required],
      name: [data && data.name || null, Validators.required],
      description: [data && data.description || null, Validators.maxLength(255)],
      comments: [data && data.comments || null, Validators.maxLength(2000)],
      updateDate: [data && data.updateDate || null],
      creationDate: [data && data.creationDate || null],
      filter: [data && data.filter || null],
      filterContent: [data && data.filterContent || null, Validators.maxLength(10000)],
      documentation: [data && data.documentation || null, Validators.maxLength(10000)],
      statusId: [toNumber(data && data.statusId, null), Validators.required],
      isSpatial: [toBoolean(data && data.isSpatial, false)],
      processingFrequencyId: [toNumber(data && data.processingFrequencyId, null), Validators.required],
      recorderDepartment: [data && data.recorderDepartment || null, SharedValidators.entity],
      recorderPerson: [data && data.recorderPerson || null, SharedValidators.entity],
      stratum: this.getStratumArray(data),
    });
  }

  getStratumArray(data?: ExtractionProduct): UntypedFormArray {
    return this.formBuilder.array(
      (data && data.stratum || []).map(this.getStrataFormGroup)
    );
  }

  getStrataFormGroup(data?: AggregationStrata) {
    return this.strataValidatorService.getFormGroup(data);
  }
}
