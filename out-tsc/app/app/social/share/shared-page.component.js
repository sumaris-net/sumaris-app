import { __awaiter, __decorate, __metadata } from "tslib";
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { isNotNil, LocalSettingsService, Toasts } from '@sumaris-net/ngx-components';
import { ContextService } from '@app/shared/context.service';
import { SharedResourceUtils } from '@app/social/share/shared-resource.utils';
import { TranslateService } from '@ngx-translate/core';
let SharedPage = class SharedPage {
    constructor(route, navCtrl, http, settings, context, toast, translate) {
        this.route = route;
        this.navCtrl = navCtrl;
        this.http = http;
        this.settings = settings;
        this.context = context;
        this.toast = toast;
        this.translate = translate;
        this.loading = true;
        this.error = false;
    }
    ngOnInit() {
        this.downloadData();
    }
    downloadData() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.settings.ready();
            const peerUrl = this.settings.settings.peerUrl;
            const uuid = this.route.snapshot.paramMap.get('uuid');
            let res = null;
            try {
                res = yield SharedResourceUtils.downloadByUuid(this.http, peerUrl, uuid);
            }
            catch (e) {
                this.loading = false;
                this.error = true;
                console.error(e);
                Toasts.show(this.toast, this.translate, {
                    message: e.message,
                    color: 'accent',
                    position: 'top',
                    duration: 0,
                    showCloseButton: true,
                });
            }
            if (isNotNil(res)) {
                this.context.clipboard = res.content;
                this.navCtrl.navigateRoot(res.path, {
                    queryParams: Object.assign(Object.assign({}, res.queryParams), { uuid }),
                });
            }
        });
    }
};
SharedPage = __decorate([
    Component({
        selector: 'app-shared-page',
        templateUrl: './shared-page.component.html',
        styleUrls: ['./shared-page.component.scss'],
    }),
    __metadata("design:paramtypes", [ActivatedRoute,
        NavController,
        HttpClient,
        LocalSettingsService,
        ContextService,
        ToastController,
        TranslateService])
], SharedPage);
export { SharedPage };
//# sourceMappingURL=shared-page.component.js.map