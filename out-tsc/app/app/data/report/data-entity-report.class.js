import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Directive, Injector, Input, Optional } from '@angular/core';
import { AccountService, DateFormatService, isNil, isNotNil } from '@sumaris-net/ngx-components';
import { AppBaseReport, BaseReportStats, } from '@app/data/report/base-report.class';
export class DataReportStats extends BaseReportStats {
}
let AppDataEntityReport = class AppDataEntityReport extends AppBaseReport {
    constructor(injector, dataType, statsType, options) {
        super(injector, dataType, statsType, options);
        this.injector = injector;
        this.dataType = dataType;
        this.statsType = statsType;
        this.logPrefix = '[data-entity-report] ';
        this.accountService = injector.get(AccountService);
        this.dateFormat = injector.get(DateFormatService);
        this.revealOptions = {
            autoInitialize: false,
            disableLayout: this.mobile,
            touch: this.mobile
        };
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
                    if (isNotNil(this.id))
                        this.data = yield this.load(this.id, opts);
                    else
                        this.data = yield this.loadFromRoute(opts);
            if (isNil(this.stats))
                this.stats = yield this.computeStats(this.data, opts);
            const computedContext = this.computeI18nContext(this.stats);
            this.i18nContext = Object.assign(Object.assign(Object.assign({}, computedContext), this.i18nContext), { pmfmPrefix: computedContext === null || computedContext === void 0 ? void 0 : computedContext.pmfmPrefix });
        });
    }
    ;
    dataAsObject(source, opts) {
        if (typeof (source === null || source === void 0 ? void 0 : source.asObject) === 'function')
            return source.asObject(opts);
        const data = new this.dataType();
        data.fromObject(source);
        return data.asObject(opts);
    }
    loadFromRoute(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(`[${this.logPrefix}] load data from route`);
            this.id = this.getIdFromPathIdAttribute(this._pathIdAttribute);
            if (isNil(this.id))
                throw new Error(`Cannot load the entity: No id found in the route!`);
            return this.load(this.id, opts);
        });
    }
    load(id, opts) {
        return __awaiter(this, arguments, void 0, function* () {
            if (this.debug)
                console.debug(`[${this.logPrefix}.load]`, arguments);
            return this.loadData(id, opts);
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], AppDataEntityReport.prototype, "i18nContextSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppDataEntityReport.prototype, "id", void 0);
AppDataEntityReport = __decorate([
    Directive(),
    __param(3, Optional()),
    __metadata("design:paramtypes", [Injector, Function, Function, Object])
], AppDataEntityReport);
export { AppDataEntityReport };
//# sourceMappingURL=data-entity-report.class.js.map