import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { AppEntityEditor, HistoryPageReference, LocalSettingsService } from '@sumaris-net/ngx-components';
import { UserEvent } from '@app/social/user-event/user-event.model';
import { UserEventService } from '@app/social/user-event/user-event.service';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { InboxMessageService } from '@app/social/message/inbox-message.service';
import { firstValueFrom } from 'rxjs';

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
    protected inboxMessageService: InboxMessageService,
    protected settings: LocalSettingsService,
    protected modalCtrl: ModalController,
    protected formBuilder: UntypedFormBuilder
  ) {
    super(injector, UserEvent, injector.get(UserEventService), {
      pathIdAttribute: 'messageId',
      tabCount: 1,
    });
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

  async reply(event?: Event): Promise<any> {
    const source = this.form.value;
    return this.inboxMessageService.reply(source);
  }

  async forward(event?: Event): Promise<any> {
    const source = this.form.value;
    return this.inboxMessageService.forward(source);
  }

  get isNewData(): boolean {
    return false;
  }

  protected registerForms(): any {
    // No sub forms
  }

  protected computeTitle(data: UserEvent): Promise<string> {
    return firstValueFrom(this.translate.get('SOCIAL.MESSAGE.INBOX.TITLE'));
  }

  protected computePageHistory(title: string): Promise<HistoryPageReference> {
    return null; // Skip page history
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
