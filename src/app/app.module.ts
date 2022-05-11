import './vendor';

import { APP_BASE_HREF } from '@angular/common';
import { BrowserModule, HAMMER_GESTURE_CONFIG, HammerModule } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, SecurityContext } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';

// Ionic plugins
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { NativeAudio } from '@ionic-native/native-audio/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';


// App modules
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import {
  APP_ABOUT_DEVELOPERS,
  APP_ABOUT_PARTNERS,
  APP_CONFIG_OPTIONS,
  APP_FORM_ERROR_I18N_KEYS,
  APP_GRAPHQL_TYPE_POLICIES,
  APP_HOME_BUTTONS,
  APP_LOCAL_SETTINGS,
  APP_LOCAL_SETTINGS_OPTIONS,
  APP_LOCAL_STORAGE_TYPE_POLICIES,
  APP_LOCALES,
  APP_MENU_ITEMS,
  APP_TESTING_PAGES,
  AppGestureConfig,
  CORE_CONFIG_OPTIONS,
  DATE_ISO_PATTERN,
  Department,
  EntitiesStorageTypePolicies,
  FormFieldDefinitionMap,
  LocalSettings,
  SHARED_TESTING_PAGES,
  TestingPage
} from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Camera } from '@ionic-native/camera/ngx';
import { Network } from '@ionic-native/network/ngx';
import { AudioManagement } from '@ionic-native/audio-management/ngx';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TRIP_CONFIG_OPTIONS, TRIP_GRAPHQL_TYPE_POLICIES, TRIP_LOCAL_SETTINGS_OPTIONS, TRIP_STORAGE_TYPE_POLICIES } from './trip/services/config/trip.config';
import { IonicStorageModule } from '@ionic/storage';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { IonicModule } from '@ionic/angular';
import { CacheModule } from 'ionic-cache';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MarkdownModule, MarkedOptions } from 'ngx-markdown';
import { TypePolicies } from '@apollo/client/core';
import { TRIP_TESTING_PAGES } from './trip/trip.testing.module';
import { EXTRACTION_CONFIG_OPTIONS, EXTRACTION_GRAPHQL_TYPE_POLICIES } from './extraction/common/extraction.config';
import { REFERENTIAL_CONFIG_OPTIONS, REFERENTIAL_GRAPHQL_TYPE_POLICIES, REFERENTIAL_LOCAL_SETTINGS_OPTIONS } from './referential/services/config/referential.config';
import { DATA_CONFIG_OPTIONS, DATA_GRAPHQL_TYPE_POLICIES } from './data/services/config/data.config';
import { VESSEL_CONFIG_OPTIONS, VESSEL_GRAPHQL_TYPE_POLICIES, VESSEL_LOCAL_SETTINGS_OPTIONS } from './vessel/services/config/vessel.config';
import { JDENTICON_CONFIG } from 'ngx-jdenticon';
import { REFERENTIAL_TESTING_PAGES } from './referential/referential.testing.module';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppSharedModule } from '@app/shared/shared.module';
import { APP_CORE_CONFIG_OPTIONS } from '@app/core/services/config/core.config';
import { AppCoreModule } from '@app/core/core.module';
import { SAMPLE_VALIDATOR_I18N_ERROR_KEYS } from '@app/trip/services/validator/sample.validator';
import { Downloader } from '@ionic-native/downloader/ngx';
import { OPERATION_VALIDATOR_I18N_ERROR_KEYS } from '@app/trip/services/validator/operation.validator';
import { IMAGE_TESTING_PAGES } from '@app/image/image.testing.module';
import { AppImageModule } from '@app/image/image.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    IonicModule.forRoot(), // FIXME: After Ionic v6 upgrade, override platform detection (see issue #323)
    CacheModule.forRoot(),
    IonicStorageModule.forRoot({
      name: 'sumaris', // default
      ...environment.storage
    }),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (httpClient) => {
          if (environment.production) {
            // This is need to force a reload, after an app update
            return new TranslateHttpLoader(httpClient, './assets/i18n/', `-${environment.version}.json`);
          }
          return new TranslateHttpLoader(httpClient, './assets/i18n/', `.json`);
        },
        deps: [HttpClient]
      }
    }),
    MarkdownModule.forRoot({
      loader: HttpClient, // Allow to load using [src]
      sanitize: SecurityContext.NONE,
      markedOptions: {
        provide: MarkedOptions,
        useValue: <MarkedOptions>{
          gfm: true,
          breaks: false,
          pedantic: false,
          smartLists: true,
          smartypants: false,
        },
      }
    }),
    // Need for tap event, in app-toolbar
    HammerModule,

    // functional modules
    AppSharedModule.forRoot(environment),
    AppCoreModule.forRoot(),
    AppImageModule.forRoot(),
    // TODO: should be enabled, when start using notifications
    //SocialModule.forRoot(),
    AppRoutingModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    Keyboard,
    Camera,
    Network,
    NativeAudio,
    Vibration,
    InAppBrowser,
    AudioManagement,
    Downloader,

    {provide: APP_BASE_HREF, useFactory: function () {
        try {
          return document.getElementsByTagName('base')[0].href;
        }
        catch (err) {
          console.error(err);
          return environment.baseUrl || '/';
        }
      }
    },

    {provide: APP_LOCALES, useValue:
        [
          {
            key: 'fr',
            value: 'Français',
            country: 'fr'
          },
          {
            key: 'en',
            value: 'English (UK)',
            country: 'gb'
          },
          {
            key: 'en-US',
            value: 'English (US)',
            country: 'us'
          }
        ]
    },

    {provide: MAT_DATE_LOCALE, useValue: environment.defaultLocale || 'en'},
    {
      provide: MAT_DATE_FORMATS, useValue: {
        parse: {
          dateInput: DATE_ISO_PATTERN,
        },
        display: {
          dateInput: 'L',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        }
      }
    },
    {provide: MomentDateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE]},
    {provide: DateAdapter, useExisting: MomentDateAdapter},

    // Form errors translations
    {provide: APP_FORM_ERROR_I18N_KEYS, useValue: {
      ...OPERATION_VALIDATOR_I18N_ERROR_KEYS,
      ...SAMPLE_VALIDATOR_I18N_ERROR_KEYS
    }},

    // Configure hammer gesture
    // FIXME: not working well on tab
    {provide: HAMMER_GESTURE_CONFIG, useClass: AppGestureConfig},

    // Settings default values
    { provide: APP_LOCAL_SETTINGS, useValue: <Partial<LocalSettings>>{
        pageHistoryMaxSize: 3
      }
    },

    // Setting options definition
    { provide: APP_LOCAL_SETTINGS_OPTIONS, useValue: <FormFieldDefinitionMap>{
        ...REFERENTIAL_LOCAL_SETTINGS_OPTIONS,
        ...VESSEL_LOCAL_SETTINGS_OPTIONS,
        ...TRIP_LOCAL_SETTINGS_OPTIONS
      }
    },

    // Config options definition (Core + trip)
    { provide: APP_CONFIG_OPTIONS, useValue: <FormFieldDefinitionMap>{
      ...CORE_CONFIG_OPTIONS,
      ...APP_CORE_CONFIG_OPTIONS,
      ...REFERENTIAL_CONFIG_OPTIONS,
      ...VESSEL_CONFIG_OPTIONS,
      ...DATA_CONFIG_OPTIONS,
      ...EXTRACTION_CONFIG_OPTIONS,
      ...TRIP_CONFIG_OPTIONS
    }},

    // Menu items
    { provide: APP_MENU_ITEMS, useValue: [
        {title: 'MENU.HOME', path: '/', icon: 'home'},

        // Data entry
        {title: 'MENU.DATA_ENTRY_DIVIDER', profile: 'USER'},
        {title: 'MENU.TRIPS', path: '/trips',
          matIcon: 'explore',
          profile: 'USER',
          ifProperty: 'sumaris.trip.enable',
          titleProperty: 'sumaris.trip.name'
        },
        {
          title: 'MENU.OCCASIONS', path: '/observations',
          icon: 'location',
          profile: 'USER',
          ifProperty: 'sumaris.observedLocation.enable',
          titleProperty: 'sumaris.observedLocation.name'
        },

        // Data extraction
        {title: 'MENU.DATA_ACCESS_DIVIDER', ifProperty: 'sumaris.extraction.enabled', profile: 'GUEST'},
        {title: 'MENU.DOWNLOADS', path: '/extraction/data', icon: 'cloud-download', ifProperty: 'sumaris.extraction.product.enable', profile: 'GUEST'},
        {title: 'MENU.MAP', path: '/extraction/map', icon: 'earth', ifProperty: 'sumaris.extraction.map.enable', profile: 'GUEST'},

        // Referential
        {title: 'MENU.REFERENTIAL_DIVIDER', profile: 'USER'},
        {title: 'MENU.VESSELS', path: '/vessels', icon: 'boat', ifProperty: 'sumaris.referential.vessel.enable', profile: 'USER'},
        {title: 'MENU.PROGRAMS', path: '/referential/programs', icon: 'contract', profile: 'SUPERVISOR'},
        {title: 'MENU.REFERENTIAL', path: '/referential/list', icon: 'list', profile: 'ADMIN'},
        {title: 'MENU.USERS', path: '/admin/users', icon: 'people', profile: 'ADMIN'},
        {title: 'MENU.SERVER', path: '/admin/config', icon: 'server', profile: 'ADMIN'},

        // Settings
        {title: '' /*empty divider*/, cssClass: 'flex-spacer'},
        {title: 'MENU.TESTING', path: '/testing', icon: 'code', color: 'danger', ifProperty: 'sumaris.testing.enable', profile: 'SUPERVISOR'},
        {title: 'MENU.LOCAL_SETTINGS', path: '/settings', icon: 'settings', color: 'medium'},
        {title: 'MENU.ABOUT', action: 'about', matIcon: 'help_outline', color: 'medium', cssClass: 'visible-mobile'},

        // Logout
        {title: 'MENU.LOGOUT', action: 'logout', icon: 'log-out', profile: 'GUEST', color: 'medium hidden-mobile'},
        {title: 'MENU.LOGOUT', action: 'logout', icon: 'log-out', profile: 'GUEST', color: 'danger visible-mobile'}

      ]
    },

    // Home buttons
    { provide: APP_HOME_BUTTONS, useValue: [
        // Data entry
        { title: 'MENU.DATA_ENTRY_DIVIDER', profile: 'USER'},
        { title: 'MENU.TRIPS', path: '/trips',
          matIcon: 'explore',
          profile: 'USER',
          ifProperty: 'sumaris.trip.enable',
          titleProperty: 'sumaris.trip.name'
        },
        { title: 'MENU.OCCASIONS', path: '/observations',
          matIcon: 'verified',
          profile: 'USER',
          ifProperty: 'sumaris.observedLocation.enable',
          titleProperty: 'sumaris.observedLocation.name'
        },
        { title: '' /*empty divider*/, cssClass: 'visible-mobile'}
      ]
    },

    // About developers
    {
      provide: APP_ABOUT_DEVELOPERS, useValue: <Partial<Department>[]>[
        {siteUrl: 'https://www.e-is.pro', logo: 'assets/img/logo/logo-eis_50px.png', label: 'Environmental Information Systems'}
      ]
    },

    // About partners
    { provide: APP_ABOUT_PARTNERS, useValue: <Partial<Department>[]>[
        {
          siteUrl: 'https://www.interreg2seas.eu', logo: 'assets/img/logo/logo-interreg2seas.png'
        },
        {
          siteUrl: 'https://www.fromnord.fr', logo: 'assets/img/logo/logo-fromnord_50px.png'
        },
        {
          siteUrl: 'https://www.rederscentrale.be', logo: 'assets/img/logo/logo-redercentrale.png'
        },
        {
          siteUrl: 'https://www.ifremer.fr', logo: 'assets/img/logo/logo-ifremer.png'
        },
        {
          siteUrl: 'https://www.ilvo.vlaanderen.be/', logo: 'assets/img/logo/logo-ilvo-text.png'
        },
        {
          siteUrl: 'https://www.nausicaa.fr', logo: 'assets/img/logo/logo-nausicaa.png'
        },
        {
          siteUrl: 'https://www.pecheursdebretagne.eu', logo: 'assets/img/logo/logo-lpdb.png'
        },
        {
          siteUrl: 'https://www.aglia.fr', logo: 'assets/img/logo/logo-aglia.png'
        },
        {
          siteUrl: 'https://www.sfa.sc', logo: 'assets/img/logo/logo-sfa.jpg'
        },
        {
          siteUrl: 'https://www.comite-peches.fr/', logo: 'assets/img/logo/logo-cnpmem.png'
        }
      ]
    },

    // Entities Apollo cache options
    { provide: APP_GRAPHQL_TYPE_POLICIES, useValue: <TypePolicies>{
        ...REFERENTIAL_GRAPHQL_TYPE_POLICIES,
        ...DATA_GRAPHQL_TYPE_POLICIES,
        ...VESSEL_GRAPHQL_TYPE_POLICIES,
        ...TRIP_GRAPHQL_TYPE_POLICIES,
        ...EXTRACTION_GRAPHQL_TYPE_POLICIES
      }
    },

    // Entities storage options
    { provide: APP_LOCAL_STORAGE_TYPE_POLICIES, useValue: <EntitiesStorageTypePolicies>{
      ...TRIP_STORAGE_TYPE_POLICIES
    }},

    // Testing pages
    { provide: APP_TESTING_PAGES, useValue: <TestingPage[]>[
        ...SHARED_TESTING_PAGES,
        ...REFERENTIAL_TESTING_PAGES,
        ...IMAGE_TESTING_PAGES,
        ...TRIP_TESTING_PAGES
      ]},

    // Custom identicon style
    // https://jdenticon.com/icon-designer.html?config=4451860010ff320028501e5a
    {
      provide: JDENTICON_CONFIG,
      useValue: {
        lightness: {
          color: [0.26, 0.80],
          grayscale: [0.30, 0.90],
        },
        saturation: {
          color: 0.50,
          grayscale: 0.46,
        },
        backColor: '#0000'
      }
    }
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {

  constructor() {
    console.debug('[app] Creating module');
  }
}
