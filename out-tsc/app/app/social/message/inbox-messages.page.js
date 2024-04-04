import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AccountService, LocalSettingsService, MessageTypes, NetworkService, slideUpDownAnimation } from '@sumaris-net/ngx-components';
import { UntypedFormBuilder } from '@angular/forms';
import { InboxMessageService } from '@app/social/message/inbox-message.service';
import { UserEventFilter } from '@app/social/user-event/user-event.model';
import { NavController } from '@ionic/angular';
import { environment } from '@environments/environment';
let InboxMessagesPage = class InboxMessagesPage {
    constructor(navController, networkService, inboxMessagesService, accountService, settings, formBuilder) {
        this.navController = navController;
        this.networkService = networkService;
        this.inboxMessagesService = inboxMessagesService;
        this.accountService = accountService;
        this.settings = settings;
        this.formBuilder = formBuilder;
        this.form = formBuilder.group({
            subject: [null],
            body: [null],
            type: [MessageTypes.INBOX_MESSAGE],
            issuer: [null],
            recipients: formBuilder.array([]),
            creationDate: [null],
        });
        this.mobile = this.settings.mobile;
        this.filter = UserEventFilter.fromObject({
            types: [MessageTypes.INBOX_MESSAGE],
            recipients: [],
        });
        // DEV only
        this.canSearch = !environment.production;
    }
    ngOnInit() {
        const account = this.accountService.account;
        this.recipient = account === null || account === void 0 ? void 0 : account.pubkey;
    }
    reply(event, source) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.inboxMessagesService.reply(source);
        });
    }
    forward(event, source) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.inboxMessagesService.forward(source);
        });
    }
    openComposeMessageModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.inboxMessagesService.openComposeModal();
        });
    }
    openMessage(message) {
        return this.navController.navigateForward(`/inbox/${message.id}`);
    }
    clickRow(row) {
        return this.openMessage(row.currentData);
    }
    search(event) {
        console.info('[inbox-messages] Searching in message: ', event);
    }
};
InboxMessagesPage = __decorate([
    Component({
        selector: 'app-messages-page',
        templateUrl: 'inbox-messages.page.html',
        //styleUrls: ['inbox-message.page.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
        animations: [slideUpDownAnimation],
    }),
    __metadata("design:paramtypes", [NavController,
        NetworkService,
        InboxMessageService,
        AccountService,
        LocalSettingsService,
        UntypedFormBuilder])
], InboxMessagesPage);
export { InboxMessagesPage };
//# sourceMappingURL=inbox-messages.page.js.map