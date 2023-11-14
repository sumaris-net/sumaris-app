import { ChangeDetectionStrategy, Component, Injector, OnInit } from '@angular/core';
import { AccountService, LocalSettingsService, Message, MessageTypes, NetworkService } from '@sumaris-net/ngx-components';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { InboxMessageService } from '@app/social/message/inbox-message.service';
import { UserEventFilter } from '@app/social/user-event/user-event.model';
import { TableElement } from '@e-is/ngx-material-table';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-messages-page',
  templateUrl: 'inbox-messages.page.html',
  //styleUrls: ['inbox-message.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxMessagesPage implements OnInit {
  form: UntypedFormGroup;
  readonly mobile: boolean;
  readonly filter: UserEventFilter;

  constructor(
    injector: Injector,
    protected navController: NavController,
    protected networkService: NetworkService,
    protected inboxMessagesService: InboxMessageService,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    protected formBuilder: UntypedFormBuilder
  ) {
    this.form = formBuilder.group({
      subject: [],
      body: [],
      type: [],
      issuer: [],
      recipients: formBuilder.array([]),
      creationDate: [],
    });
    this.mobile = this.settings.mobile;
    this.filter = UserEventFilter.fromObject({
      types: [MessageTypes.INBOX_MESSAGE],
    });
  }

  ngOnInit() {}

  async reply(event: Event, source: Message): Promise<any> {
    return this.inboxMessagesService.reply(source);
  }

  async forward(event: Event, source: Message): Promise<any> {
    return this.inboxMessagesService.forward(source);
  }

  async openComposeMessageModal(event?: Event): Promise<any> {
    return this.inboxMessagesService.openComposeModal();
  }

  openMessage(message: Message) {
    return this.navController.navigateForward(`/inbox/${message.id}`);
  }

  clickRow(row: TableElement<Message>) {
    return this.openMessage(row.currentData);
  }
}
