import { UntypedFormGroup } from '@angular/forms';
import { DenormalizedPmfmStrategy } from '../../../referential/services/model/pmfm-strategy.model';
import { Subscription } from 'rxjs';
import { AppFormUtils, isNotNil, isNotNilOrBlank, ObjectMap } from '@sumaris-net/ngx-components';
import { PmfmIds } from '../../../referential/services/model/model.enum';
import { SAMPLE_VALIDATOR_I18N_ERROR_KEYS } from '@app/trip/sample/sample.validator';

export class BiologicalSamplingValidators {


  static addSampleValidators(form: UntypedFormGroup,
                             pmfms: DenormalizedPmfmStrategy[],
                             pmfmGroups: ObjectMap<number[]>,
                             opts?: { markForCheck: () => void }): Subscription {
    if (!form) {
      console.warn("Argument 'form' required");
      return null;
    }
    if (!pmfmGroups) {
      console.warn("Argument 'pmfmGroups' required");
      return null;
    }

    pmfms.filter(p => (pmfmGroups.AGE||[]).includes(p.id))
      .filter(p => !p.isComputed)
      .forEach(p => {
        p.isComputed = true;
      })

    // Disable computed pmfms
    AppFormUtils.disableControls(form,
      pmfms
        .filter(p => p.isComputed)
        .map(p => `measurementValues.${p.id}`), {onlySelf: true, emitEvent: false});

    // DEBUG
    //console.debug('Calling BiologicalSamplingValidators.addSampleValidators()')

    form.setValidators( (control) => {
      const measurementValues = form.controls.measurementValues.value;

      const tagId = measurementValues[PmfmIds.TAG_ID];
      if (isNotNilOrBlank(tagId) && tagId.length !== 4) {
        return { tagIdLength: {length: 4} };
      }

      const hasWeight = (pmfmGroups.WEIGHT || []).findIndex(pmfmId => isNotNil(measurementValues[pmfmId.toString()])) !== -1;
      const hasLengthSize = (pmfmGroups.LENGTH || []).findIndex(pmfmId => isNotNil(measurementValues[pmfmId.toString()])) !== -1;
      if (!hasWeight && !hasLengthSize){
        return { missingWeightOrSize: SAMPLE_VALIDATOR_I18N_ERROR_KEYS.missingWeightOrSize };
      }
    });

  }
}
