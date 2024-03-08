import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, Component, Inject, Injector, Optional } from '@angular/core';
import { APP_CONFIG_OPTIONS, Software } from '@sumaris-net/ngx-components';
import { SoftwareService } from '../services/software.service';
import { SoftwareValidatorService } from '../services/validator/software.validator';
import { AbstractSoftwarePage } from './abstract-software.page';
let SoftwarePage = class SoftwarePage extends AbstractSoftwarePage {
    constructor(injector, dataService, validatorService, configOptions) {
        super(injector, Software, dataService, validatorService, configOptions);
        // default values
        this.defaultBackHref = '/referential/list?entity=Software';
        this.debug = !this.environment.production;
    }
    onNewEntity(data, options) {
        this.markAsReady();
        return super.onNewEntity(data, options);
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { path: `referential/software/${((_a = this.data) === null || _a === void 0 ? void 0 : _a.id) || 'new'}`, subtitle: 'REFERENTIAL.ENTITY.SOFTWARE', icon: 'server' });
        });
    }
};
SoftwarePage = __decorate([
    Component({
        selector: 'app-software-page',
        templateUrl: 'software.page.html',
        styleUrls: ['./software.page.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __param(3, Optional()),
    __param(3, Inject(APP_CONFIG_OPTIONS)),
    __metadata("design:paramtypes", [Injector,
        SoftwareService,
        SoftwareValidatorService, Object])
], SoftwarePage);
export { SoftwarePage };
//# sourceMappingURL=software.page.js.map