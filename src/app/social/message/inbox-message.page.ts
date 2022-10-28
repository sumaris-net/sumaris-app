import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core';
import { AppEntityEditor, LocalSettingsService, Message, MessageModal, MessageModalOptions, MessageService, Person, PersonService } from '@sumaris-net/ngx-components';
import { UserEvent } from '@app/social/user-event/user-event.model';
import { UserEventService } from '@app/social/user-event/user-event.service';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-message-page',
  templateUrl: 'inbox-message.page.html',
  styleUrls: ['inbox-message.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InboxMessagePage extends AppEntityEditor<UserEvent, UserEventService> {

  form: UntypedFormGroup;

  @Input() bodyAutoHeight = true;

  constructor(injector: Injector,
              protected personService: PersonService,
              protected messageService: MessageService,
              protected settings: LocalSettingsService,
              protected modalCtrl: ModalController,
              protected formBuilder: UntypedFormBuilder) {
    super(injector, UserEvent, injector.get(UserEventService), {
      pathIdAttribute: 'messageId',
      tabCount: 1
    });
    this.form = formBuilder.group({
      subject: [],
      body: [],
      type: [],
      issuer: [],
      recipients: formBuilder.array([]),
      creationDate: []
    });
  }

  ngOnInit() {
    super.ngOnInit();

    this.markAsReady();
  }



  async reply(event?: Event): Promise<any> {

    const source = this.form.value as Message;

    // Prepare recipient
    const recipient = source.issuer && Person.fromObject(source.issuer)
        .asObject({minify: true});
    if (recipient?.department) recipient.department = recipient.department.asObject();

    // Prepare subject
    const subjectPrefix = this.translate.instant('SOCIAL.MESSAGE.INBOX.REPLY_SUBJECT_PREFIX');
    let subject = source.subject || '';
    if (!subject.trim().startsWith(subjectPrefix)) {
      subject = subjectPrefix + subject;
    }

    const hasTopModal = !!(await this.modalCtrl.getTop());
    const modal = await this.modalCtrl.create({
      component: MessageModal,
      componentProps: <MessageModalOptions>{
        suggestFn: (value, filter, sortBy, sortDirection) => this.personService.suggest(value, null, sortBy, sortDirection),
        data: <Message>{
          recipients: [recipient],
          subject
        }
      },
      cssClass: hasTopModal && 'stack-modal'
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const {data} = await modal.onDidDismiss();
    if (!data || !(data instanceof Message)) return; // CANCELLED

    console.info('[users] received message to send: ', data);
    await this.messageService.send(data);
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
      ...data.content
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
