import { __awaiter, __decorate, __metadata } from "tslib";
import { Directive, Injector, Input } from '@angular/core';
import { ExtractionFilter, ExtractionType } from '@app/extraction/type/extraction-type.model';
import { AppBaseReport, BaseReportStats } from '@app/data/report/base-report.class';
import { isNil, isNotNil } from '@sumaris-net/ngx-components';
export class ExtractionReportStats extends BaseReportStats {
}
let AppExtractionReport = class AppExtractionReport extends AppBaseReport {
    constructor(injector, dataType, statsType) {
        super(injector, dataType, statsType);
        this.dataType = dataType;
        this.statsType = statsType;
        this.logPrefix = 'extraction-report';
    }
    ngOnStart(opts) {
        const _super = Object.create(null, {
            ngOnStart: { get: () => super.ngOnStart }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ngOnStart.call(this, opts);
            // If data is not filled by the input or by the clipboad , fill it by loading and computing
            if (isNil(this.data))
                if (isNil(this.uuid))
                    if (isNotNil(this.filter))
                        this.data = yield this.load(this.filter, opts);
                    else
                        this.data = yield this.loadFromRoute(opts);
            if (isNil(this.stats))
                this.stats = yield this.computeStats(this.data, opts);
            const computedContext = this.computeI18nContext(this.stats);
            this.i18nContext = Object.assign(Object.assign(Object.assign({}, computedContext), this.i18nContext), { pmfmPrefix: computedContext === null || computedContext === void 0 ? void 0 : computedContext.pmfmPrefix });
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", ExtractionFilter)
], AppExtractionReport.prototype, "filter", void 0);
__decorate([
    Input(),
    __metadata("design:type", ExtractionType)
], AppExtractionReport.prototype, "type", void 0);
AppExtractionReport = __decorate([
    Directive(),
    __metadata("design:paramtypes", [Injector, Function, Function])
], AppExtractionReport);
export { AppExtractionReport };
//# sourceMappingURL=extraction-report.class.js.map