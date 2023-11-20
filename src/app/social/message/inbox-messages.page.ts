import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AccountService, LocalSettingsService, Message, MessageTypes, NetworkService, slideUpDownAnimation } from '@sumaris-net/ngx-components';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { InboxMessageService } from '@app/social/message/inbox-message.service';
import { UserEventFilter } from '@app/social/user-event/user-event.model';
import { TableElement } from '@e-is/ngx-material-table';
import { NavController } from '@ionic/angular';
import { SearchbarChangeEventDetail } from '@ionic/core/dist/types/components/searchbar/searchbar-interface';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-messages-page',
  templateUrl: 'inbox-messages.page.html',
  //styleUrls: ['inbox-message.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideUpDownAnimation],
})
export class InboxMessagesPage implements OnInit {
  protected form: UntypedFormGroup;
  protected readonly mobile: boolean;
  protected readonly filter: UserEventFilter;
  protected readonly canSearch: boolean;

  protected recipient: string;

  constructor(
    protected navController: NavController,
    protected networkService: NetworkService,
    protected inboxMessagesService: InboxMessageService,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    protected formBuilder: UntypedFormBuilder
  ) {
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
    this.recipient = account?.pubkey;
  }

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

  search(event: CustomEvent<SearchbarChangeEventDetail>) {
    console.info('[inbox-messages] Searching in message: ', event);
  }
}
