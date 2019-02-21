import {Component} from '@angular/core';
import {Platform} from "@ionic/angular";
import {MenuItem} from './core/menu/menu.component';
import {HomePage} from './core/home/home';
import {AccountService, DataService} from './core/core.module';
import {ReferentialRefService} from './referential/referential.module';
import { PodConfigService } from './core/services/podconfig.service';
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
  logo: String;
  appName: String;
  menuItems: Array<MenuItem> = [
    { title: 'MENU.HOME', path: '/', icon: 'home', hideOnClick : true },
    { title: 'MENU.TRIPS', path: '/trips', icon: 'pin', profile: 'GUEST' },
    { title: 'MENU.EXTRACTIONS', path: '/extraction/table', icon: 'download', profile: 'SUPERVISOR', hideOnClick : true  },
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
    private configurationService: PodConfigService
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

      this.initConfig();

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

  protected async initConfig() {

    const config = await this.configurationService.getConfs();

    this.logo = config.logo;
    this.appName = config.label;
    this.updateColors(    
      config.properties["sumaris.site.color.primary"],
      config.properties["sumaris.site.color.secondary"],
      config.properties["sumaris.site.color.tertiary"]
    );

  }

  updateColors(primary, secondary, tertiary) {

    console.log("Updating Colors based on configuration - 1- " + primary + " 2- " + secondary + " 3- "+ tertiary );

    document.documentElement.style.setProperty(`--ion-color-primary`, primary);

    document.documentElement.style.setProperty(`--ion-color-light`, secondary); 
    document.documentElement.style.setProperty(`--ion-color-secondary`, secondary); 
    
    document.documentElement.style.setProperty(`--ion-color-tertiary`, tertiary);
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

