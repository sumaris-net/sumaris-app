import { Validators } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';
import { DataRootEntityValidatorService } from './root-data-entity.validator';
export class DataRootVesselEntityValidatorService extends DataRootEntityValidatorService {
    constructor(formBuilder, translate, settings) {
        super(formBuilder, translate, settings);
    }
    getFormGroupConfig(data, opts) {
        return Object.assign(super.getFormGroupConfig(data), {
            vesselSnapshot: [data && data.vesselSnapshot || null, Validators.compose([Validators.required, SharedValidators.entity])]
        });
    }
}
//# sourceMappingURL=root-vessel-entity.validator.js.map