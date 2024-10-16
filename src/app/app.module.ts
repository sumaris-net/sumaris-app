import { APP_BASE_HREF } from '@angular/common';
import { BrowserModule, HAMMER_GESTURE_CONFIG, HammerModule } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';

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
  APP_JOB_PROGRESSION_SERVICE,
  APP_LOCAL_SETTINGS,
  APP_LOCAL_SETTINGS_OPTIONS,
  APP_LOCAL_STORAGE_TYPE_POLICIES,
  APP_LOCALES,
  APP_LOGGING_SERVICE,
  APP_MENU_ITEMS,
  APP_MENU_OPTIONS,
  APP_NAMED_FILTER_SERVICE,
  APP_PROGRESS_BAR_SERVICE,
  APP_SETTINGS_MENU_ITEMS,
  APP_STORAGE,
  APP_TESTING_PAGES,
  APP_USER_EVENT_SERVICE,
  AppGestureConfig,
  CORE_CONFIG_OPTIONS,
  CORE_TESTING_PAGES,
  DATE_ISO_PATTERN,
  Department,
  EntitiesStorageTypePolicies,
  ENVIRONMENT,
  EnvironmentHttpLoader,
  EnvironmentLoader,
  FormFieldDefinitionMap,
  IMenuItem,
  isAndroid,
  isCapacitor,
  isIOS,
  isMobile,
  JobModule,
  LocalSettings,
  LocalSettingsOptions,
  LoggingService,
  MenuOptions,
  ProgressBarService,
  ProgressInterceptor,
  SOCIAL_TESTING_PAGES,
  StorageService,
  TestingPage,
  UserEventModule,
} from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { AudioManagement } from '@ionic-native/audio-management/ngx';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TRIP_CONFIG_OPTIONS, TRIP_GRAPHQL_TYPE_POLICIES, TRIP_LOCAL_SETTINGS_OPTIONS, TRIP_STORAGE_TYPE_POLICIES } from './trip/trip.config';
import { IonicStorageModule } from '@ionic/storage-angular';
import { IonicModule } from '@ionic/angular';
import { CacheModule } from 'ionic-cache';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TypePolicies } from '@apollo/client/core';
import { TRIP_TESTING_PAGES } from './trip/trip.testing.module';
import { EXTRACTION_CONFIG_OPTIONS, EXTRACTION_GRAPHQL_TYPE_POLICIES } from './extraction/common/extraction.config';
import {
  REFERENTIAL_CONFIG_OPTIONS,
  REFERENTIAL_GRAPHQL_TYPE_POLICIES,
  REFERENTIAL_LOCAL_SETTINGS_OPTIONS,
} from './referential/services/config/referential.config';
import { DATA_CONFIG_OPTIONS, DATA_GRAPHQL_TYPE_POLICIES } from './data/data.config';
import { VESSEL_CONFIG_OPTIONS, VESSEL_GRAPHQL_TYPE_POLICIES, VESSEL_LOCAL_SETTINGS_OPTIONS } from './vessel/services/config/vessel.config';
import { JDENTICON_CONFIG } from 'ngx-jdenticon';
import { REFERENTIAL_TESTING_PAGES } from './referential/referential.testing.module';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppSharedModule } from '@app/shared/shared.module';
import { APP_CORE_CONFIG_OPTIONS } from '@app/core/services/config/core.config';
import { AppCoreModule } from '@app/core/core.module';
import { SAMPLE_VALIDATOR_I18N_ERROR_KEYS } from '@app/trip/sample/sample.validator';
import { Downloader } from '@ionic-native/downloader/ngx';
import { OPERATION_VALIDATOR_I18N_ERROR_KEYS } from '@app/trip/operation/operation.validator';
import { APP_SHARED_TESTING_PAGES } from '@app/shared/shared.testing.module';
import { UserEventService } from '@app/social/user-event/user-event.service';
import { ApolloModule } from 'apollo-angular';
import { DATA_TESTING_PAGES } from '@app/data/data.testing.module';
import { JobProgressionService } from '@app/social/job/job-progression.service';
import { APP_SOCIAL_CONFIG_OPTIONS } from '@app/social/config/social.config';
import { BATCH_VALIDATOR_I18N_ERROR_KEYS } from '@app/trip/batch/common/batch.validator';
import { DEVICE_POSITION_CONFIG_OPTION, DEVICE_POSITION_ENTITY_SERVICES } from '@app/data/position/device/device-position.config';
import { TripService } from '@app/trip/trip/trip.service';
import { ObservedLocationService } from '@app/trip/observedlocation/observed-location.service';
import { DevicePositionService } from '@app/data/position/device/device-position.service';
import { SHARED_LOCAL_SETTINGS_OPTIONS } from '@app/shared/shared.config';
import { NgChartsModule } from 'ng2-charts';
import { PMFM_VALIDATOR_I18N_ERROR_KEYS } from '@app/referential/services/validator/pmfm.validators';
import { IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions } from '@angular/material/form-field';
import { MAT_TABS_CONFIG, MatTabsConfig } from '@angular/material/tabs';
import { SCIENTIFIC_CRUISE_CONFIG_OPTIONS } from '@app/trip/scientific-cruise/scientific-cruise.config';
import { AppEnvironment } from '@environments/environment.class';
import { AppMarkdownModule } from '@app/shared/markdown/markdown.module';
import {
  ACTIVITY_CALENDAR_CONFIG_OPTIONS,
  ACTIVITY_CALENDAR_GRAPHQL_TYPE_POLICIES,
  ACTIVITY_CALENDAR_STORAGE_TYPE_POLICIES,
} from '@app/activity-calendar/activity-calendar.config';
import { ACTIVITY_CALENDAR_TESTING_PAGES } from '@app/activity-calendar/calendar/testing/calendar.testing.module';
import { NamedFilterService } from '@app/shared/service/named-filter.service';
import { ACTIVITY_MONTH_VALIDATOR_I18N_ERROR_KEYS } from '@app/activity-calendar/calendar/activity-month.validator';
import { ACTIVITY_CALENDAR_VALIDATOR_I18N_ERROR_KEYS } from './activity-calendar/model/activity-calendar.validator';
import { MAT_SELECT_CONFIG, MatSelectConfig } from '@angular/material/select';

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ApolloModule,
    IonicModule.forRoot({
      innerHTMLTemplatesEnabled: true,
      // Override platform detection (see issue #323)
      platform: {
        mobile: isMobile,
        ios: isIOS,
        android: isAndroid,
        capacitor: isCapacitor,
      },
    }),
    CacheModule.forRoot({
      keyPrefix: '', // For compatibility
      ...environment.cache,
    }),
    IonicStorageModule.forRoot({
      name: 'sumaris', // default
      ...environment.storage,
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
        deps: [HttpClient],
      },
    }),
    AppMarkdownModule.forRoot(),
    NgChartsModule.forRoot({
      plugins: [],
    }),
    // Need for tap event, in app-toolbar
    HammerModule,
    // functional modules
    AppSharedModule.forRoot({
      loader: {
        provide: EnvironmentLoader,
        deps: [HttpClient],
        useFactory: (httpClient: HttpClient) => new EnvironmentHttpLoader(httpClient, environment),
      },
    }),
    AppCoreModule.forRoot(),
    AppRoutingModule,
    UserEventModule,
    JobModule,
  ],
  providers: [
    // Cordova plugins
    Network,
    AudioManagement,
    Downloader,
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: <MatFormFieldDefaultOptions>{
        appearance: 'fill',
      },
    },
    {
      provide: MAT_TABS_CONFIG,
      useValue: <MatTabsConfig>{
        stretchTabs: false,
      },
    },
    {
      provide: MAT_SELECT_CONFIG,
      useValue: <MatSelectConfig>{
        // Hide the selection  indicator (checkmark, on the right side)
        hideSingleSelectionIndicator: true,
        // FIXME - Workaround find at : https://github.com/angular/components/issues/26000#issuecomment-1563107933
        //overlayPanelClass: 'mat-select-panel-fit-content',
      },
    },
    {
      provide: APP_BASE_HREF,
      useFactory: () => {
        try {
          return document.getElementsByTagName('base')[0].href;
        } catch (err) {
          console.error(err);
          return environment.baseUrl || '/';
        }
      },
    },
    { provide: APP_STORAGE, useExisting: StorageService },
    //{ provide: ErrorHandler, useClass: IonicErrorHandler },
    { provide: APP_PROGRESS_BAR_SERVICE, useClass: ProgressBarService },
    { provide: HTTP_INTERCEPTORS, useClass: ProgressInterceptor, multi: true, deps: [APP_PROGRESS_BAR_SERVICE] },
    {
      provide: APP_LOCALES,
      useValue: [
        {
          key: 'fr',
          value: 'Français',
          country: 'fr',
        },
        {
          key: 'en',
          value: 'English (UK)',
          country: 'gb',
        },
        {
          key: 'en-US',
          value: 'English (US)',
          country: 'us',
        },
      ],
    },
    { provide: MAT_DATE_LOCALE, useValue: environment.defaultLocale || 'en' },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: DATE_ISO_PATTERN,
        },
        display: {
          dateInput: 'L',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        },
      },
    },
    {
      provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS,
      useValue: { strict: false },
    },
    { provide: MomentDateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS] },
    { provide: DateAdapter, useExisting: MomentDateAdapter },
    // Logging
    { provide: APP_LOGGING_SERVICE, useClass: LoggingService },
    // User event
    { provide: UserEventService, useClass: UserEventService },
    { provide: APP_USER_EVENT_SERVICE, useExisting: UserEventService },
    // Job
    { provide: JobProgressionService, useClass: JobProgressionService },
    { provide: APP_JOB_PROGRESSION_SERVICE, useExisting: JobProgressionService },
    // Device position
    { provide: DevicePositionService, useClass: DevicePositionService },
    // Ichthyometer
    { provide: IchthyometerService, useClass: IchthyometerService },
    // Form errors translations
    {
      provide: APP_FORM_ERROR_I18N_KEYS,
      useValue: {
        ...PMFM_VALIDATOR_I18N_ERROR_KEYS,
        ...OPERATION_VALIDATOR_I18N_ERROR_KEYS,
        ...BATCH_VALIDATOR_I18N_ERROR_KEYS,
        ...SAMPLE_VALIDATOR_I18N_ERROR_KEYS,
        ...ACTIVITY_MONTH_VALIDATOR_I18N_ERROR_KEYS,
        ...ACTIVITY_CALENDAR_VALIDATOR_I18N_ERROR_KEYS,
      },
    },
    // Configure hammer gesture
    // FIXME: not working well on tablet
    { provide: HAMMER_GESTURE_CONFIG, useClass: AppGestureConfig },
    // Settings default values
    {
      provide: APP_LOCAL_SETTINGS,
      useValue: <Partial<LocalSettings>>{
        pageHistoryMaxSize: 3,
      },
    },
    // Setting options definition
    {
      provide: APP_LOCAL_SETTINGS_OPTIONS,
      useValue: <LocalSettingsOptions>{
        serializeAsString: true,
        options: {
          ...SHARED_LOCAL_SETTINGS_OPTIONS,
          ...REFERENTIAL_LOCAL_SETTINGS_OPTIONS,
          ...VESSEL_LOCAL_SETTINGS_OPTIONS,
          ...TRIP_LOCAL_SETTINGS_OPTIONS,
        },
      },
    },
    // Config options definition (Core + trip)
    {
      provide: APP_CONFIG_OPTIONS,
      useValue: <FormFieldDefinitionMap>{
        ...CORE_CONFIG_OPTIONS,
        ...APP_CORE_CONFIG_OPTIONS,
        ...APP_SOCIAL_CONFIG_OPTIONS,
        ...REFERENTIAL_CONFIG_OPTIONS,
        ...VESSEL_CONFIG_OPTIONS,
        ...DATA_CONFIG_OPTIONS,
        ...EXTRACTION_CONFIG_OPTIONS,
        ...SCIENTIFIC_CRUISE_CONFIG_OPTIONS,
        ...TRIP_CONFIG_OPTIONS,
        ...ACTIVITY_CALENDAR_CONFIG_OPTIONS,
        ...DEVICE_POSITION_CONFIG_OPTION,
      },
    },
    // Menu config
    {
      provide: APP_MENU_OPTIONS,
      deps: [ENVIRONMENT],
      useFactory: (environment: AppEnvironment) =>
        <MenuOptions>{
          enableSubMenus: true,
          enableSubMenuIcon: true,
          ...environment?.menu,
          ...environment?.menu,
        },
    },
    // Menu items
    {
      provide: APP_MENU_ITEMS,
      useValue: <IMenuItem[]>[
        { title: 'MENU.HOME', path: '/', icon: 'home' },
        // Data entry
        { title: 'MENU.DATA_ENTRY_DIVIDER', profile: 'USER' },
        {
          title: 'MENU.SCIENTIFIC_CRUISES',
          path: '/scientific-cruise',
          matIcon: 'travel_explore',
          profile: 'USER',
          ifProperty: 'sumaris.scientificCruise.enable',
          titleProperty: 'sumaris.scientificCruise.name',
        },
        {
          title: 'MENU.TRIPS',
          path: '/trips',
          matIcon: 'explore',
          profile: 'USER',
          ifProperty: 'sumaris.trip.enable',
          titleProperty: 'sumaris.trip.name',
        },
        {
          title: 'MENU.OCCASIONS',
          path: '/observations',
          icon: 'location',
          profile: 'USER',
          ifProperty: 'sumaris.observedLocation.enable',
          titleProperty: 'sumaris.observedLocation.name',
        },
        {
          title: 'MENU.ACTIVITY_CALENDAR',
          path: '/activity-calendar',
          icon: 'calendar',
          profile: 'USER',
          ifProperty: 'sumaris.activityCalendar.enable',
          titleProperty: 'sumaris.activityCalendar.name',
        },
        // Data extraction
        { title: 'MENU.DATA_ACCESS_DIVIDER', ifProperty: 'sumaris.extraction.enabled', profile: 'GUEST' },
        {
          title: 'MENU.DOWNLOADS',
          path: '/extraction/data',
          icon: 'cloud-download',
          ifProperty: 'sumaris.extraction.product.enable',
          profile: 'GUEST',
        },
        { title: 'MENU.MAP', path: '/extraction/map', icon: 'earth', ifProperty: 'sumaris.extraction.map.enable', profile: 'GUEST' },
        {
          title: 'MENU.DEVICE_POSITION',
          path: '/extraction/device-position',
          icon: 'location-outline',
          ifProperty: 'sumaris.device.position.tracking.enable',
          profile: 'ADMIN',
        },
        // Referential
        { title: 'MENU.REFERENTIAL_DIVIDER', profile: 'USER' },
        { title: 'MENU.VESSELS', path: '/vessels', icon: 'boat', ifProperty: 'sumaris.referential.vessel.enable', profile: 'USER' },
        { title: 'MENU.PROGRAMS', path: '/referential/programs', icon: 'contract', profile: 'SUPERVISOR' },
        { title: 'MENU.REFERENTIAL', path: '/referential/list', icon: 'list', profile: 'ADMIN' },
        { title: 'MENU.USERS', path: '/admin/users', icon: 'people', profile: 'ADMIN' },
        { title: 'MENU.SYSTEM_DIVIDER', profile: 'ADMIN' },
        { title: 'MENU.SERVER', path: '/admin/config', icon: 'server', profile: 'ADMIN' },
        // Settings
        { title: ' ' /*empty divider*/, cssClass: 'flex-spacer' },
        { title: 'MENU.TESTING', path: '/testing', icon: 'code', color: 'danger', ifProperty: 'sumaris.testing.enable', profile: 'SUPERVISOR' },
        { title: 'MENU.INBOX', path: '/inbox', icon: 'mail', profile: 'USER', ifProperty: 'sumaris.social.notification.icons.enable' },
        { title: 'MENU.LOCAL_SETTINGS', path: '/settings', icon: 'settings', color: 'medium' },
        { title: 'MENU.ABOUT', action: 'about', matIcon: 'help_outline', color: 'medium', cssClass: 'visible-mobile' },
        // Logout
        { title: 'MENU.LOGOUT', action: 'logout', icon: 'log-out', profile: 'GUEST', color: 'medium hidden-mobile' },
        { title: 'MENU.LOGOUT', action: 'logout', icon: 'log-out', profile: 'GUEST', color: 'danger visible-mobile' },
      ],
    },
    // Home buttons
    {
      provide: APP_HOME_BUTTONS,
      useValue: [
        // Data entry
        { title: 'MENU.DATA_ENTRY_DIVIDER', profile: 'USER' },
        {
          title: 'MENU.TRIPS',
          path: '/trips',
          matIcon: 'explore',
          profile: 'USER',
          ifProperty: 'sumaris.trip.enable',
          titleProperty: 'sumaris.trip.name',
        },
        {
          title: 'MENU.OCCASIONS',
          path: '/observations',
          icon: 'location',
          profile: 'USER',
          ifProperty: 'sumaris.observedLocation.enable',
          titleProperty: 'sumaris.observedLocation.name',
        },
        {
          title: 'MENU.ACTIVITY_CALENDAR',
          path: '/activity-calendar',
          icon: 'calendar',
          profile: 'USER',
          ifProperty: 'sumaris.activityCalendar.enable',
          titleProperty: 'sumaris.activityCalendar.name',
        },
        { title: '' /*empty divider*/, cssClass: 'visible-mobile' },
      ],
    },
    // Settings menu options
    {
      provide: APP_SETTINGS_MENU_ITEMS,
      useValue: <IMenuItem[]>[
        { title: 'MENU.TESTING', path: '/testing', icon: 'code', color: 'danger', ifProperty: 'sumaris.testing.enable', profile: 'SUPERVISOR' },
      ],
    },
    // About developers
    {
      provide: APP_ABOUT_DEVELOPERS,
      useValue: <Partial<Department>[]>[
        { siteUrl: 'https://www.e-is.pro', logo: 'assets/img/logo/logo-eis_50px.png', label: 'Environmental Information Systems' },
      ],
    },
    // About partners
    {
      provide: APP_ABOUT_PARTNERS,
      useValue: <Partial<Department>[]>[
        {
          siteUrl: 'https://www.interreg2seas.eu',
          logo: 'assets/img/logo/logo-interreg2seas.png',
        },
        {
          siteUrl: 'https://www.fromnord.fr',
          logo: 'assets/img/logo/logo-fromnord_50px.png',
        },
        {
          siteUrl: 'https://www.rederscentrale.be',
          logo: 'assets/img/logo/logo-redercentrale.png',
        },
        {
          siteUrl: 'https://www.ifremer.fr',
          logo: 'assets/img/logo/logo-ifremer.png',
        },
        {
          siteUrl: 'https://www.ilvo.vlaanderen.be/',
          logo: 'assets/img/logo/logo-ilvo-text.png',
        },
        {
          siteUrl: 'https://www.nausicaa.fr',
          logo: 'assets/img/logo/logo-nausicaa.png',
        },
        {
          siteUrl: 'https://www.pecheursdebretagne.eu',
          logo: 'assets/img/logo/logo-lpdb.png',
        },
        {
          siteUrl: 'https://www.aglia.fr',
          logo: 'assets/img/logo/logo-aglia.png',
        },
        {
          siteUrl: 'https://www.sfa.sc',
          logo: 'assets/img/logo/logo-sfa.png',
        },
        {
          siteUrl: 'https://www.comite-peches.fr/',
          logo: 'assets/img/logo/logo-cnpmem.png',
        },
      ],
    },
    // Entities Apollo cache options
    {
      provide: APP_GRAPHQL_TYPE_POLICIES,
      useValue: <TypePolicies>{
        ...REFERENTIAL_GRAPHQL_TYPE_POLICIES,
        ...DATA_GRAPHQL_TYPE_POLICIES,
        ...VESSEL_GRAPHQL_TYPE_POLICIES,
        ...TRIP_GRAPHQL_TYPE_POLICIES,
        ...ACTIVITY_CALENDAR_GRAPHQL_TYPE_POLICIES,
        ...EXTRACTION_GRAPHQL_TYPE_POLICIES,
      },
    },
    // Entities storage options
    {
      provide: APP_LOCAL_STORAGE_TYPE_POLICIES,
      useValue: <EntitiesStorageTypePolicies>{
        ...TRIP_STORAGE_TYPE_POLICIES,
        ...ACTIVITY_CALENDAR_STORAGE_TYPE_POLICIES,
      },
    },
    // Testing pages
    {
      provide: APP_TESTING_PAGES,
      useValue: <TestingPage[]>[
        ...APP_SHARED_TESTING_PAGES,
        ...REFERENTIAL_TESTING_PAGES,
        ...CORE_TESTING_PAGES,
        ...SOCIAL_TESTING_PAGES,
        ...DATA_TESTING_PAGES,
        ...TRIP_TESTING_PAGES,
        ...ACTIVITY_CALENDAR_TESTING_PAGES,
      ],
    },
    // Custom identicon style
    // https://jdenticon.com/icon-designer.html?config=4451860010ff320028501e5a
    {
      provide: JDENTICON_CONFIG,
      useValue: {
        lightness: {
          color: [0.26, 0.8],
          grayscale: [0.3, 0.9],
        },
        saturation: {
          color: 0.5,
          grayscale: 0.46,
        },
        backColor: '#0000',
      },
    },
    {
      provide: DEVICE_POSITION_ENTITY_SERVICES,
      useValue: [TripService, ObservedLocationService],
    },
    {
      provide: APP_NAMED_FILTER_SERVICE,
      useClass: NamedFilterService,
    },
    provideHttpClient(withInterceptorsFromDi()),

    // Zone less
    provideExperimentalZonelessChangeDetection(),
  ],
})
export class AppModule {
  constructor() {
    console.debug('[app] Creating module');
  }
}
