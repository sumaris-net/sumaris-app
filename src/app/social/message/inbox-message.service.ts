import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Moment } from 'moment';
import {
  fromDateISOString,
  isNotNilOrBlank,
  Message,
  MessageModalOptions,
  MessageService,
  Person,
  PersonService,
  PersonUtils,
} from '@sumaris-net/ngx-components';
import { DateAdapter } from '@angular/material/core';

@Injectable({ providedIn: 'root' })
export class InboxMessageService {
  constructor(
    protected translate: TranslateService,
    protected dateAdapter: DateAdapter<Moment>,
    protected personService: PersonService,
    protected messageService: MessageService
  ) {}

  /**
   * Send a message to recipient(s)
   *
   * @param message
   * @param opts
   */
  async send(message: Message, opts?: { showToast?: boolean }): Promise<boolean> {
    return this.messageService.send(message, opts);
  }

  async openComposeModal(options?: Partial<MessageModalOptions> & { showToast?: boolean }): Promise<any> {
    return this.messageService.openComposeModal({
      suggestFn: (value, filter, sortBy, sortDirection) => this.personService.suggest(value, filter, sortBy, sortDirection),
      ...options,
    });
  }

  async reply(source: Partial<Message>): Promise<any> {
    const message = Message.fromObject(source);

    // Prepare recipient
    const recipient = message.issuer && Person.fromObject(message.issuer).asObject({ minify: true });
    if (recipient?.department) recipient.department = recipient.department.asObject();

    // Prepare subject
    const subjectPrefix = this.translate.instant('SOCIAL.MESSAGE.INBOX.REPLY_SUBJECT_PREFIX');
    let subject = message.subject || '';
    if (!subject.trim().startsWith(subjectPrefix)) {
      subject = subjectPrefix + subject;
    }

    const body =
      '\n\n' +
      source.body
        .split('\n')
        .filter(isNotNilOrBlank)
        .map((line) => '> ' + line)
        .join('\n');

    return this.openComposeModal({
      data: <Message>{
        recipients: [recipient],
        subject,
        body,
      },
    });
  }

  async forward(source: Partial<Message> & { creationDate?: Moment }, options?: MessageModalOptions & { showToast?: boolean }): Promise<any> {
    const message = Message.fromObject(source);
    const creationDate = fromDateISOString(source['creationDate']);

    // Prepare subject
    const subjectPrefix = this.translate.instant('SOCIAL.MESSAGE.INBOX.FORWARD_SUBJECT_PREFIX');
    let subject = message.subject || '';
    if (!subject.trim().startsWith(subjectPrefix)) {
      subject = subjectPrefix + subject;
    }

    const body =
      this.translate.instant('SOCIAL.MESSAGE.INBOX.FORWARD_BODY_PREFIX', {
        issuer: PersonUtils.personToString(message.issuer),
        date: this.dateAdapter.format(creationDate, this.translate.instant('COMMON.DATE_TIME_PATTERN')),
      }) + message.body;

    return this.openComposeModal({
      ...options,
      data: <Message>{
        subject,
        body,
      },
    });
  }
}
