var BatchFilter_1;
import { __decorate } from "tslib";
import { EntityClass, EntityFilter, isNotNil, toNumber } from '@sumaris-net/ngx-components';
import { MeasurementUtils, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
let BatchFilter = BatchFilter_1 = class BatchFilter extends EntityFilter {
    constructor() {
        super(...arguments);
        this.operationId = null;
        this.saleId = null; // not used yet
        this.parentId = null;
        this.isSamplingBatch = null;
        this.measurementValues = null;
        this.parentFilter = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.operationId = source.operationId;
        this.saleId = source.saleId;
        this.parentId = source.parentId;
        this.isSamplingBatch = source.isSamplingBatch;
        this.measurementValues = source.measurementValues && Object.assign({}, source.measurementValues) || MeasurementUtils.toMeasurementValues(source.measurements);
        this.parentFilter = source.parentFilter && BatchFilter_1.fromObject(source.parentFilter);
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
        target.parentFilter = this.parentFilter && this.parentFilter.asObject(opts);
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        if (isNotNil(this.operationId)) {
            filterFns.push(b => b.operationId === this.operationId);
        }
        if (isNotNil(this.saleId)) {
            filterFns.push(b => b.saleId === this.saleId);
        }
        if (isNotNil(this.parentId)) {
            filterFns.push(b => { var _a; return toNumber((_a = b.parent) === null || _a === void 0 ? void 0 : _a.id, b.parentId) === this.parentId; });
        }
        if (isNotNil(this.isSamplingBatch)) {
            filterFns.push(BatchUtils.isSamplingBatch);
        }
        if (isNotNil(this.measurementValues)) {
            Object.keys(this.measurementValues).forEach(pmfmId => {
                const pmfmValue = this.measurementValues[pmfmId];
                if (isNotNil(pmfmValue)) {
                    filterFns.push(b => isNotNil(b.measurementValues[pmfmId]) && PmfmValueUtils.equals(b.measurementValues[pmfmId], pmfmValue));
                }
            });
        }
        // Parent filter
        const parentFilter = this.parentFilter && BatchFilter_1.fromObject(this.parentFilter);
        if (parentFilter && !parentFilter.isEmpty()) {
            const parentFilterFn = parentFilter.asFilterFn();
            filterFns.push(b => b.parent && parentFilterFn(b.parent));
        }
        return filterFns;
    }
};
BatchFilter = BatchFilter_1 = __decorate([
    EntityClass({ typename: 'BatchFilterVO' })
], BatchFilter);
export { BatchFilter };
//# sourceMappingURL=batch.filter.js.map