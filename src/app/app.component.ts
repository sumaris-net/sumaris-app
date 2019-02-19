import {Component} from '@angular/core';
import {Platform} from "@ionic/angular";
import {MenuItem} from './core/menu/menu.component';
import {HomePage} from './core/home/home';
import {AccountService, DataService} from './core/core.module';
import {ReferentialRefService} from './referential/referential.module';
import { ConfigService } from './core/services/config.service';
import {Observable} from "rxjs";
import {Configuration} from "./core/services/model";
// import { StatusBar } from "@ionic-native/status-bar";
// import { SplashScreen } from "@ionic-native/splash-screen";
// import { Keyboard } from "@ionic-native/keyboard";
// import { AccountFieldDef, AccountService } from './core/core.module';
// import { Referential } from './core/services/model';
// import { DataService } from './shared/shared.module';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  root: any = HomePage;
  config : Observable<Configuration>;
  logo: String;
  appName: String;
  menuItems: Array<MenuItem> = [
    { title: 'MENU.HOME', path: '/', icon: 'home' },
    { title: 'MENU.TRIPS', path: '/trips', icon: 'pin', profile: 'GUEST'},
    { title: 'MENU.EXTRACTIONS', path: '/extraction/table', icon: 'download', profile: 'SUPERVISOR' },
    { title: 'MENU.ADMINISTRATION_DIVIDER', profile: 'USER' },
    { title: 'MENU.USERS', path: '/admin/users', icon: 'people', profile: 'ADMIN' },
    { title: 'MENU.VESSELS', path: '/referential/vessels', icon: 'boat', profile: 'USER' },
    { title: 'MENU.REFERENTIALS', path: '/referential/list', icon: 'list', profile: 'ADMIN' },
    { title: 'MENU.PODCONFIG', path: '/admin/podconfig', icon: 'settings', profile: 'ADMIN' }

  ];

  constructor(
    private platform: Platform,
    private accountService: AccountService,
    private referentialRefService: ReferentialRefService,
    private configService: ConfigService
    // TODO: waiting ionic-native release
    // private statusBar: StatusBar, 
    // private splashScreen: SplashScreen,
    // private keyboard: Keyboard
  ) {


    platform.ready().then(() => {
      console.info("[app] Setting cordova plugins...");

      /*
      statusBar.styleDefault();
      splashScreen.hide();

      statusBar.overlaysWebView(false);

      // Control Keyboard
      keyboard.disableScroll(true);
      */

      // subscriptions
      this.configService.dataSubject.subscribe(config => this.onConfig(config));

      this.addAccountFields();
    });

  }

  public onActivate(event) {
    // Make sure to scroll on top before changing state
    // See https://stackoverflow.com/questions/48048299/angular-5-scroll-to-top-on-every-route-click
    let scrollToTop = window.setInterval(() => {
      let pos = window.pageYOffset;
      if (pos > 0) {
        window.scrollTo(0, pos - 20); // how far to scroll on each step
      } else {
        window.clearInterval(scrollToTop);
      }
    }, 16);
  }

  protected onConfig(config: Configuration) {

    this.appName = config.label;
    this.logo = config.logo;

    // Update the thme
    this.updateTheme({
      primary: config.properties["sumaris.site.color.primary"],
      secondary: config.properties["sumaris.site.color.secondary"],
      tertiary: config.properties["sumaris.site.color.tertiary"],
      light: config.properties["sumaris.site.color.light"]
    });
  }

  updateTheme(options: {primary?: string; secondary? : string; tertiary?: string; light?: string}) {

    console.debug("[app] Updating theme from config");
    if (options.primary) document.documentElement.style.setProperty(`--ion-color-primary`, options.primary);
    // TODO:
    //if (options.secondary) document.documentElement.style.setProperty(`--ion-color-secondary`, options.secondary);
    //if (options.tertiary) document.documentElement.style.setProperty(`--ion-color-tertiary`, options.tertiary);
    //if (options.light) document.documentElement.style.setProperty(`--ion-color-light`, options.light);
  }

  protected addAccountFields() {

    console.debug("[app] Add additional account fields...");

    // Add account field: department
    this.accountService.addAdditionalAccountField({
      name: 'department',
      label: 'USER.DEPARTMENT',
      required: true,
      dataService: this.referentialRefService as DataService<any, any>,
      dataFilter: { entityName: 'Department' },
      updatable: {
        registration: true,
        account: false
      }
    });
  }
}

