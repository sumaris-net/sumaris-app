import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, Component, Inject, Injector, Optional } from '@angular/core';
import { Alerts, APP_CONFIG_OPTIONS, Configuration, firstNotNilPromise, isNotNil, NetworkService, } from '@sumaris-net/ngx-components';
import { SoftwareValidatorService } from '@app/referential/services/validator/software.validator';
import { BehaviorSubject } from 'rxjs';
import { AbstractSoftwarePage } from '@app/referential/software/abstract-software.page';
import { environment } from '@environments/environment';
import { filter, map } from 'rxjs/operators';
import { ConfigurationService } from '@app/admin/config/configuration.service';
let ConfigurationPage = class ConfigurationPage extends AbstractSoftwarePage {
    constructor(injector, validatorService, dataService, network, configOptions) {
        super(injector, Configuration, dataService, validatorService, configOptions, {
            tabCount: 5
        });
        this.network = network;
        this.$partners = new BehaviorSubject(null);
        this.$cacheStatistics = new BehaviorSubject(null);
        this.$cacheStatisticTotal = new BehaviorSubject(null);
        this.$cacheStatisticsCount = this.$cacheStatistics.pipe(filter(isNotNil), map(data => (data === null || data === void 0 ? void 0 : data.length) || 0));
        // default values
        this.defaultBackHref = null;
        this.debug = !environment.production;
    }
    get config() {
        return this.data && this.data || undefined;
    }
    load(id, opts) {
        const _super = Object.create(null, {
            load: { get: () => super.load }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield firstNotNilPromise(this.dataService.config);
            // Force the load of the config
            yield _super.load.call(this, config.id, Object.assign(Object.assign({}, opts), { fetchPolicy: 'network-only' }));
            this.$cacheStatistics.subscribe(value => this.computeStatisticTotal(value));
            // Get server cache statistics
            yield this.loadCacheStat();
        });
    }
    setValue(data) {
        if (!data)
            return; // Skip
        const json = data.asObject();
        this.$partners.next(json.partners);
        super.setValue(data);
    }
    getJsonValueToSave() {
        const _super = Object.create(null, {
            getJsonValueToSave: { get: () => super.getJsonValueToSave }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const json = yield _super.getJsonValueToSave.call(this);
            // Re add partners
            json.partners = this.$partners.getValue();
            return json;
        });
    }
    clearCache(event, cacheName) {
        return __awaiter(this, void 0, void 0, function* () {
            const confirm = yield Alerts.askActionConfirmation(this.alertCtrl, this.translate, true, event);
            if (confirm) {
                yield this.network.clearCache();
                yield this.settings.removeOfflineFeatures();
                yield this.dataService.clearCache({ cacheName });
                yield this.loadCacheStat();
            }
        });
    }
    loadCacheStat() {
        return __awaiter(this, void 0, void 0, function* () {
            const value = yield this.dataService.getCacheStatistics();
            const stats = Object.keys(value).map(cacheName => {
                const stat = value[cacheName];
                return {
                    name: cacheName,
                    size: stat.size,
                    heapSize: stat.heapSize,
                    offHeapSize: stat.offHeapSize,
                    diskSize: stat.diskSize
                };
            });
            this.$cacheStatistics.next(stats);
        });
    }
    computeStatisticTotal(stats) {
        const total = { name: undefined, size: 0, heapSize: 0, offHeapSize: 0, diskSize: 0 };
        (stats || []).forEach(stat => {
            total.size += stat.size;
            total.heapSize += stat.heapSize;
            total.offHeapSize += stat.offHeapSize;
            total.diskSize += stat.diskSize;
        });
        this.$cacheStatisticTotal.next(total);
    }
    computePageHistory(title) {
        return __awaiter(this, void 0, void 0, function* () {
            return null; // No page history
        });
    }
};
ConfigurationPage = __decorate([
    Component({
        selector: 'app-configuration-page',
        templateUrl: './configuration.page.html',
        styleUrls: ['./configuration.page.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(4, Optional()),
    __param(4, Inject(APP_CONFIG_OPTIONS)),
    __metadata("design:paramtypes", [Injector,
        SoftwareValidatorService,
        ConfigurationService,
        NetworkService, Object])
], ConfigurationPage);
export { ConfigurationPage };
//# sourceMappingURL=configuration.page.js.map