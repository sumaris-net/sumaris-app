import {Component, OnInit, Input, ViewChild} from '@angular/core';
import { MenuController, ModalController } from "@ionic/angular";

import { Router } from "@angular/router";
import {Account, Configuration, UserProfileLabel} from "../services/model";
import { AccountService } from "../services/account.service";
import { AboutModal } from '../about/modal-about';

import { environment } from '../../../environments/environment';
import { HomePage } from '../home/home';
import { ConfigService } from '../services/config.service';

import { Subject } from 'rxjs';
import { fadeInAnimation } from '../../shared/material/material.animations';
import {Components} from "@ionic/core";
import IonSplitPane = Components.IonSplitPane;

export interface MenuItem {
  title: string;
  path?: string;
  page?: string | any;
  icon?: string;
  profile?: UserProfileLabel;
  exactProfile?: UserProfileLabel;
}

const SPLIT_PANE_SHOW_WHEN = 'lg';

@Component({
  selector: 'app-menu',
  templateUrl: 'menu.component.html',
  styleUrls: ['./menu.component.scss'],
  animations: [fadeInAnimation]
})
export class MenuComponent implements OnInit {

  public loading = true;
  public isLogin: boolean = false;
  public account: Account;
  @Input() logo: String;

  @Input() appName: String;

  filteredItems = new Subject<MenuItem[]>();

  @Input()
  appVersion: String = environment.version;

  @Input() content: any;

  @Input() side: string = "left";

  root: any = HomePage;

  @Input()
  items: Array<MenuItem>;

  @ViewChild('splitPane') splitPane: IonSplitPane;

  constructor(
    protected accountService: AccountService,
    protected router: Router,
    protected menu: MenuController,
    protected configService: ConfigService,
    protected modalCtrl: ModalController
  ) {

  }

  async ngOnInit() {
    // subscriptions
    this.accountService.onLogin.subscribe(account => this.onLogin(account));
    this.accountService.onLogout.subscribe(() => this.onLogout());
    this.configService.dataSubject.subscribe(config => this.onConfigChanged(config));

    if (this.accountService.isLogin()) {
      this.onLogin(this.accountService.account);
      setTimeout(() => {
        this.loading = false;
      }, 1000);
    }
    else {
      this.isLogin = false;
      setTimeout(() => {
        this.updateItems();
        this.loading = false;
      }, 1000);
    }

    this.splitPane.when=SPLIT_PANE_SHOW_WHEN;
  }

  onConfigChanged(config: Configuration) {
    if (!config) return;
    this.logo = config.logo;
    this.appName = config.name;
  }

  onLogin(account: Account) {
    //console.debug('[menu] Logged account: ', account);
    console.info('[menu] Account logged');
    this.account = account;
    this.isLogin = true;
    this.updateItems();
  }

  onLogout() {
    //console.debug("[menu] logout");
    this.updateItems();
    this.isLogin = false;

    // Wait the end of fadeout, to reset the account
    setTimeout(() => {
      this.account = null;
    }, 1000);

    this.router.navigate(['']);
  }

  logout(): void {
    this.accountService.logout();
  }

  async openAboutModal(event) {
    const modal = await this.modalCtrl.create({ component: AboutModal });
    return modal.present();
  }

  updateItems() {
    if (!this.isLogin) {
      this.filteredItems.next((this.items || []).filter(i => !i.profile));
    }
    else {
      this.filteredItems.next((this.items || []).filter(i => {
        let res;
        if (i.profile) {
          res = this.accountService.hasMinProfile(i.profile);
          if (!res) {
            console.debug("[menu] User does not have minimal profile '" + i.profile + "' need by ", (i.path || i.page));
          }
        }
        else if (i.exactProfile) {
          res = !i.profile || this.accountService.hasExactProfile(i.profile);
          if (!res) {
            console.debug("[menu] User does not have exact profile '" + i.profile + "' need by ", (i.path || i.page));
          }
        }
        else {
          res = true;
        }

        return res;
      }));
    }
  }

  trackByFn(index, item) {
    return item.title;
  }

  toggleSplitPane($event: MouseEvent) {
    if (this.splitPane.when === SPLIT_PANE_SHOW_WHEN) {
      this.splitPane.when = false;
    }
    else {
      this.splitPane.when = SPLIT_PANE_SHOW_WHEN;
    }
    $event.preventDefault();
  }

  isSplitPaneOpened() {
    return this.splitPane.when === SPLIT_PANE_SHOW_WHEN;
  }
}

