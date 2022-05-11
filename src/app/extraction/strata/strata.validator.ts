import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppValidatorService } from '@sumaris-net/ngx-components';
import { ExtractionProduct } from '../product/product.model';
import { AggregationStrata } from '@app/extraction/strata/strata.model';

@Injectable({providedIn: 'root'})
export class AggregationStrataValidatorService extends AppValidatorService<ExtractionProduct> {

  constructor(
    protected formBuilder: FormBuilder) {
    super(formBuilder);
  }

  getFormGroup(data?): FormGroup {
    return this.formBuilder.group({
      __typename: [AggregationStrata.TYPENAME],
      id: [null],
      sheetName: [data && data.sheetName || null, Validators.required],
      timeColumnName: [data && data.timeColumnName || 'year', Validators.required],
      spatialColumnName: [data && data.spatialColumnName || 'square', Validators.required],
      aggColumnName: [data && data.aggColumnName || null, Validators.required],
      aggFunction: [data && data.aggFunction || 'SUM', Validators.required],
      techColumnName: [data && data.techColumnName || null]
    });
  }
}
