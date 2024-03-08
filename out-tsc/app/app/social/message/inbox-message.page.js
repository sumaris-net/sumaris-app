import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core';
import { AppEntityEditor, LocalSettingsService, slideUpDownAnimation } from '@sumaris-net/ngx-components';
import { UserEvent } from '@app/social/user-event/user-event.model';
import { UserEventService } from '@app/social/user-event/user-event.service';
import { UntypedFormBuilder } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { InboxMessageService } from '@app/social/message/inbox-message.service';
import { firstValueFrom } from 'rxjs';
let InboxMessagePage = class InboxMessagePage extends AppEntityEditor {
    constructor(injector, inboxMessageService, settings, modalCtrl, formBuilder) {
        super(injector, UserEvent, injector.get(UserEventService), {
            pathIdAttribute: 'messageId',
            tabCount: 1,
        });
        this.inboxMessageService = inboxMessageService;
        this.settings = settings;
        this.modalCtrl = modalCtrl;
        this.formBuilder = formBuilder;
        this.bodyAutoHeight = true;
        this.form = formBuilder.group({
            id: [],
            subject: [],
            body: [],
            type: [],
            issuer: [],
            recipients: formBuilder.array([]),
            creationDate: [],
        });
        this.mobile = this.settings.mobile;
        this.defaultBackHref = '/inbox';
    }
    ngOnInit() {
        super.ngOnInit();
        this.markAsReady();
    }
    reply(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const source = this.form.value;
            return this.inboxMessageService.reply(source);
        });
    }
    forward(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const source = this.form.value;
            return this.inboxMessageService.forward(source);
        });
    }
    get isNewData() {
        return false;
    }
    registerForms() {
        // No sub forms
    }
    computeTitle(data) {
        return firstValueFrom(this.translate.get('SOCIAL.MESSAGE.INBOX.TITLE'));
    }
    computePageHistory(title) {
        return null; // Skip page history
    }
    setValue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Set form
            const json = Object.assign(Object.assign({}, data.asObject()), data.content);
            // Load issuers
            if (json.issuer) {
                json.issuer = yield this.dataService.getPersonByPubkey(json.issuer);
            }
            this.form.patchValue(json);
        });
    }
    getFirstInvalidTabIndex() {
        return 0;
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], InboxMessagePage.prototype, "bodyAutoHeight", void 0);
InboxMessagePage = __decorate([
    Component({
        selector: 'app-message-page',
        templateUrl: 'inbox-message.page.html',
        styleUrls: ['inbox-message.page.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
        animations: [slideUpDownAnimation],
    }),
    __metadata("design:paramtypes", [Injector,
        InboxMessageService,
        LocalSettingsService,
        ModalController,
        UntypedFormBuilder])
], InboxMessagePage);
export { InboxMessagePage };
//# sourceMappingURL=inbox-message.page.js.map