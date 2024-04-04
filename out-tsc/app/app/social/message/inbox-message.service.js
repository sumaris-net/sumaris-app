import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { fromDateISOString, isNotNilOrBlank, Message, MessageService, Person, PersonService, PersonUtils, } from '@sumaris-net/ngx-components';
import { DateAdapter } from '@angular/material/core';
let InboxMessageService = class InboxMessageService {
    constructor(translate, dateAdapter, personService, messageService) {
        this.translate = translate;
        this.dateAdapter = dateAdapter;
        this.personService = personService;
        this.messageService = messageService;
    }
    /**
     * Send a message to recipient(s)
     *
     * @param message
     * @param opts
     */
    send(message, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.messageService.send(message, opts);
        });
    }
    openComposeModal(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.messageService.openComposeModal(Object.assign({ suggestFn: (value, filter, sortBy, sortDirection) => this.personService.suggest(value, filter, sortBy, sortDirection) }, options));
        });
    }
    reply(source) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = Message.fromObject(source);
            // Prepare recipient
            const recipient = message.issuer && Person.fromObject(message.issuer).asObject({ minify: true });
            if (recipient === null || recipient === void 0 ? void 0 : recipient.department)
                recipient.department = recipient.department.asObject();
            // Prepare subject
            const subjectPrefix = this.translate.instant('SOCIAL.MESSAGE.INBOX.REPLY_SUBJECT_PREFIX');
            let subject = message.subject || '';
            if (!subject.trim().startsWith(subjectPrefix)) {
                subject = subjectPrefix + subject;
            }
            const body = '\n\n' +
                source.body
                    .split('\n')
                    .filter(isNotNilOrBlank)
                    .map((line) => '> ' + line)
                    .join('\n');
            return this.openComposeModal({
                data: {
                    recipients: [recipient],
                    subject,
                    body,
                },
            });
        });
    }
    forward(source, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = Message.fromObject(source);
            const creationDate = fromDateISOString(source['creationDate']);
            // Prepare subject
            const subjectPrefix = this.translate.instant('SOCIAL.MESSAGE.INBOX.FORWARD_SUBJECT_PREFIX');
            let subject = message.subject || '';
            if (!subject.trim().startsWith(subjectPrefix)) {
                subject = subjectPrefix + subject;
            }
            const body = this.translate.instant('SOCIAL.MESSAGE.INBOX.FORWARD_BODY_PREFIX', {
                issuer: PersonUtils.personToString(message.issuer),
                date: this.dateAdapter.format(creationDate, this.translate.instant('COMMON.DATE_TIME_PATTERN')),
            }) + message.body;
            return this.openComposeModal(Object.assign(Object.assign({}, options), { data: {
                    subject,
                    body,
                } }));
        });
    }
};
InboxMessageService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [TranslateService,
        DateAdapter,
        PersonService,
        MessageService])
], InboxMessageService);
export { InboxMessageService };
//# sourceMappingURL=inbox-message.service.js.map