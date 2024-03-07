import { RootDataEntity } from './root-data-entity.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
export class DataRootVesselEntity extends RootDataEntity {
    constructor(__typename) {
        super(__typename);
        this.vesselSnapshot = null;
    }
    asObject(options) {
        const target = super.asObject(options);
        target.vesselSnapshot = this.vesselSnapshot && this.vesselSnapshot.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source);
        this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
    }
}
//# sourceMappingURL=root-vessel-entity.model.js.map