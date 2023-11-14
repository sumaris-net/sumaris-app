import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import {
  AppEntityEditor,
  fromDateISOString,
  isNotNilOrBlank,
  LocalSettingsService,
  Message,
  MessageService,
  Person,
  PersonService,
  PersonUtils,
} from '@sumaris-net/ngx-components';
import { UserEvent } from '@app/social/user-event/user-event.model';
import { UserEventService } from '@app/social/user-event/user-event.service';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { DateAdapter } from '@angular/material/core';
import { Moment } from 'moment/moment';

@Component({
  selector: 'app-message-page',
  templateUrl: 'inbox-message.page.html',
  styleUrls: ['inbox-message.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxMessagePage extends AppEntityEditor<UserEvent, UserEventService> implements OnInit {
  form: UntypedFormGroup;

  @Input() bodyAutoHeight = true;
  readonly mobile: boolean;

  constructor(
    injector: Injector,
    protected personService: PersonService,
    protected messageService: MessageService,
    protected settings: LocalSettingsService,
    protected modalCtrl: ModalController,
    protected dateAdapter: DateAdapter<Moment>,
    protected formBuilder: UntypedFormBuilder
  ) {
    super(injector, UserEvent, injector.get(UserEventService), {
      pathIdAttribute: 'messageId',
      tabCount: 1,
    });
    this.form = formBuilder.group({
      subject: [],
      body: [],
      type: [],
      issuer: [],
      recipients: formBuilder.array([]),
      creationDate: [],
    });
    this.mobile = this.settings.mobile;
  }

  ngOnInit() {
    super.ngOnInit();

    this.markAsReady();
  }

  async reply(event?: Event): Promise<any> {
    const source = this.form.value as Message;

    // Prepare recipient
    const recipient = source.issuer && Person.fromObject(source.issuer).asObject({ minify: true });
    if (recipient?.department) recipient.department = recipient.department.asObject();

    // Prepare subject
    const subjectPrefix = this.translate.instant('SOCIAL.MESSAGE.INBOX.REPLY_SUBJECT_PREFIX');
    let subject = source.subject || '';
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

    return this.messageService.openComposeModal({
      suggestFn: (value, filter, sortBy, sortDirection) => this.personService.suggest(value, filter, sortBy, sortDirection),
      data: <Message>{
        recipients: [recipient],
        subject,
        body,
      },
    });
  }

  async forward(event?: Event): Promise<any> {
    const json = this.form.value;
    const source = Message.fromObject(json);
    const creationDate = fromDateISOString(json['creationDate']);

    // Prepare subject
    const subjectPrefix = this.translate.instant('SOCIAL.MESSAGE.INBOX.FORWARD_SUBJECT_PREFIX');
    let subject = source.subject || '';
    if (!subject.trim().startsWith(subjectPrefix)) {
      subject = subjectPrefix + subject;
    }

    const body =
      this.translate.instant('SOCIAL.MESSAGE.INBOX.FORWARD_BODY_PREFIX', {
        issuer: PersonUtils.personToString(source.issuer),
        date: this.dateAdapter.format(creationDate, this.translate.instant('COMMON.DATE_TIME_PATTERN')),
      }) + source.body;

    return this.messageService.openComposeModal({
      suggestFn: (value, filter, sortBy, sortDirection) => this.personService.suggest(value, filter, sortBy, sortDirection),
      data: <Message>{
        subject,
        body,
      },
    });
  }

  get isNewData(): boolean {
    return false;
  }

  protected registerForms(): any {
    // No sub forms
  }

  protected computeTitle(data: UserEvent): Promise<string> {
    return this.translate.get('SOCIAL.MESSAGE.INBOX.TITLE').toPromise();
  }

  protected async setValue(data: UserEvent): Promise<void> {
    // Set form
    const json = {
      ...data.asObject(),
      ...data.content,
    };

    // Load issuers
    if (json.issuer) {
      json.issuer = await this.dataService.getPersonByPubkey(json.issuer);
    }

    this.form.patchValue(json);
  }

  protected getFirstInvalidTabIndex(): number {
    return 0;
  }
}
