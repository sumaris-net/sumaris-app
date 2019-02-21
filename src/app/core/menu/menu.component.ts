import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { MenuController, ModalController } from "@ionic/angular";

import { Router } from "@angular/router";
import { Account, UserProfileLabel } from "../services/model";
import { AccountService } from "../services/account.service";
import { AboutModal } from '../about/modal-about';

import { environment } from '../../../environments/environment';
import { HomePage } from '../home/home';
import { PodConfigService } from '../services/podconfig.service';
import { Components }  from '@ionic/core';
import { Subject } from 'rxjs';
import { fadeInAnimation } from '../../shared/material/material.animations';

export interface MenuItem {
  title: string;
  path?: string;
  page?: string | any;
  icon?: string;
  profile?: UserProfileLabel;
  exactProfile?: UserProfileLabel;
  hideOnClick?: boolean;
}

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

  //filteredItems: Array<MenuItem> = [];
  filteredItems = new Subject<MenuItem[]>();

  @Input()
  appVersion: String = environment.version;

  @Input() content: any;

  @Input() side: string = "left";

  @ViewChild('mainMenu') pane : Components.IonSplitPane;

  root: any = HomePage;

  @Input()
  items: Array<MenuItem>;

  constructor(
    protected accountService: AccountService,
    protected router: Router,
    protected menu: MenuController,
    protected configurationService: PodConfigService,
    protected modalCtrl: ModalController
  ) {

  }

  ngOnInit() {
    // subscriptions
    this.accountService.onLogin.subscribe(account => this.onLogin(account));
    this.accountService.onLogout.subscribe(() => this.onLogout());

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
    this.configurationService.getConfs().then(conf =>{
      this.logo = conf.logo;
      this.appName = conf.name;
    })

  }

  hideMenu(event, item){
    console.log("event : " +this.pane.when +"  " + event + "  " + item);
    console.dir(event);
    console.dir(item);
    console.log( ( this.pane.when === 'lg' ) + "   " + item.hideOnClick);
    this.pane.when = true || '';
    if(item.hideOnClick){
      this.pane.when = true;
      this.menu.close();
    }else {
        this.pane.when = 'lg';
        this.menu.close();
    }
  
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
}

