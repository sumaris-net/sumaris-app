import { EntityUtils, fromDateISOString, isNil, isNotNil, isNotNilOrBlank, Person, ReferentialRef, ReferentialUtils, toDateISOString } from '@sumaris-net/ngx-components';
import { DataEntityFilter } from './data-filter.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
export class RootDataEntityFilter extends DataEntityFilter {
    fromObject(source, opts) {
        var _a, _b;
        super.fromObject(source, opts);
        this.synchronizationStatus = source.synchronizationStatus || undefined;
        this.program = ReferentialRef.fromObject(source.program) ||
            isNotNilOrBlank(source.programLabel) && ReferentialRef.fromObject({ label: source.programLabel }) || undefined;
        this.strategy = ReferentialRef.fromObject(source.strategy);
        this.recorderPerson = Person.fromObject(source.recorderPerson)
            || isNotNil(source.recorderPersonId) && Person.fromObject({ id: source.recorderPersonId }) || undefined;
        this.startDate = (_a = fromDateISOString(source.startDate)) === null || _a === void 0 ? void 0 : _a.startOf('day');
        this.endDate = (_b = fromDateISOString(source.endDate)) === null || _b === void 0 ? void 0 : _b.endOf('day');
    }
    asObject(opts) {
        var _a, _b, _c, _d, _e, _f, _g;
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            target.startDate = toDateISOString((_a = this.startDate) === null || _a === void 0 ? void 0 : _a.clone().startOf('day'));
            target.endDate = toDateISOString((_b = this.endDate) === null || _b === void 0 ? void 0 : _b.clone().endOf('day'));
            target.programLabel = ((_c = this.program) === null || _c === void 0 ? void 0 : _c.label) || undefined;
            delete target.program;
            target.strategyLabels = ((_d = this.strategy) === null || _d === void 0 ? void 0 : _d.label) ? [this.strategy.label] : undefined;
            delete target.strategy;
            target.recorderPersonId = this.recorderPerson && this.recorderPerson.id || undefined;
            delete target.recorderPerson;
            // Not exits in pod
            delete target.synchronizationStatus;
        }
        else {
            target.startDate = toDateISOString(this.startDate);
            target.endDate = toDateISOString(this.endDate);
            target.program = ((_e = this.program) === null || _e === void 0 ? void 0 : _e.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS))) || undefined;
            target.strategy = ((_f = this.strategy) === null || _f === void 0 ? void 0 : _f.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS))) || undefined;
            target.recorderPerson = ((_g = this.recorderPerson) === null || _g === void 0 ? void 0 : _g.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS))) || undefined;
            target.synchronizationStatus = this.synchronizationStatus;
        }
        return target;
    }
    buildFilter(opts = { skipProgram: false }) {
        const filterFns = super.buildFilter();
        // Program
        if (this.program && !opts.skipProgram) {
            const programId = this.program.id;
            const programLabel = this.program.label;
            if (isNotNil(programId)) {
                filterFns.push(t => (t.program && t.program.id === programId));
            }
            else if (isNotNilOrBlank(programLabel)) {
                filterFns.push(t => (t.program && t.program.label === programLabel));
            }
        }
        // Recorder person
        if (ReferentialUtils.isNotEmpty(this.recorderPerson)) {
            const recorderPersonId = this.recorderPerson.id;
            filterFns.push(t => (t.recorderPerson && t.recorderPerson.id === recorderPersonId));
        }
        // Synchronization status
        if (this.synchronizationStatus) {
            if (this.synchronizationStatus === 'SYNC') {
                filterFns.push(EntityUtils.isRemote);
            }
            else {
                const synchronizationStatus = this.dataQualityStatus === 'CONTROLLED' ? 'READY_TO_SYNC' : undefined;
                filterFns.push(t => EntityUtils.isLocal(t) && (!synchronizationStatus || t.synchronizationStatus === synchronizationStatus));
            }
        }
        // Quality status (only validated status : other case has been processed in the super class)
        if (this.dataQualityStatus === 'VALIDATED') {
            filterFns.push(t => isNil(t.validationDate));
        }
        return filterFns;
    }
}
//# sourceMappingURL=root-data-filter.model.js.map