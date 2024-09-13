import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import {
  AccountService,
  ConfigService,
  Configuration,
  CORE_CONFIG_OPTIONS,
  equals,
  FormFieldDefinition,
  getColorContrast,
  getColorShade,
  getColorTint,
  hexToRgbArray,
  isNotNil,
  isNotNilOrBlank,
  joinPropertiesPath,
  LocalSettingsService,
  mixHex,
  PlatformService,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { DOCUMENT } from '@angular/common';
import { distinctUntilChanged, filter, map, throttleTime } from 'rxjs/operators';
import { ReferentialRefService } from './referential/services/referential-ref.service';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { APP_SOCIAL_CONFIG_OPTIONS } from '@app/social/config/social.config';
import { DevicePositionService } from '@app/data/position/device/device-position.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  protected logo: string;
  protected appName: string;
  protected enabledNotificationIcons = false;

  constructor(
    @Inject(DOCUMENT) private _document: Document,
    private platform: PlatformService,
    private accountService: AccountService,
    private referentialRefService: ReferentialRefService,
    private configService: ConfigService,
    private settings: LocalSettingsService,
    private devicePositionService: DevicePositionService,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
    private cd: ChangeDetectorRef
  ) {
    console.info('[app] Starting...');
    this.platform.start();
  }

  async ngOnInit() {
    await this.platform.ready();

    // Listen for config changed
    this.configService.config.subscribe((config) => this.onConfigChanged(config));

    // Listen settings dark mode
    this.settings.onChange
      .pipe(
        map((settings) => settings.darkMode),
        filter(isNotNil),
        distinctUntilChanged()
      )
      .subscribe((darkMode) => this.updateTheme({ darkMode }));

    // Add additional account fields
    this.addAccountFields();

    // Add custom icons
    this.addCustomSVGIcons();

    await this.startServiceWorkers();

    console.info('[app] Starting [OK]');
  }

  onActivate(event) {
    /* eslint-disable @rx-angular/no-zone-critical-browser-apis */
    // Make sure to scroll on top before changing state
    // See https://stackoverflow.com/questions/48048299/angular-5-scroll-to-top-on-every-route-click
    const scrollToTop = window.setInterval(() => {
      const pos = window.scrollY;
      if (pos > 0) {
        window.scrollTo(0, pos - 20); // how far to scroll on each step
      } else {
        window.clearInterval(scrollToTop);
      }
    }, 16);
  }

  protected onConfigChanged(config: Configuration) {
    this.logo = config.smallLogo || config.largeLogo;
    this.appName = config.label;

    // Set document title
    const title = isNotNil(config.name) ? `${config.label} - ${config.name}` : this.appName;
    this._document.getElementById('appTitle').textContent = title || '';

    if (config.properties) {
      // Set document favicon
      const favicon = config.getProperty(CORE_CONFIG_OPTIONS.FAVICON);
      if (isNotNil(favicon)) {
        this._document.getElementById('appFavicon').setAttribute('href', favicon);
      }

      // Enable user event and notification icons
      this.enabledNotificationIcons = config.getPropertyAsBoolean(APP_SOCIAL_CONFIG_OPTIONS.ENABLE_NOTIFICATION_ICONS);

      // Set theme colors
      this.updateTheme({
        darkMode: this.settings.isDarkMode,
        colors: {
          primary: config.properties['sumaris.color.primary'],
          secondary: config.properties['sumaris.color.secondary'],
          tertiary: config.properties['sumaris.color.tertiary'],
          success: config.properties['sumaris.color.success'],
          warning: config.properties['sumaris.color.warning'],
          accent: config.properties['sumaris.color.accent'],
          danger: config.properties['sumaris.color.danger'],
        },
        vars: {
          '--app-form-field-background-color': config.getProperty(CORE_CONFIG_OPTIONS.FORM_FIELD_BACKGROUND_COLOR),
          '--app-form-field-focus-background-color': config.getProperty(CORE_CONFIG_OPTIONS.FORM_FIELD_FOCUS_BACKGROUND_COLOR),
          '--app-form-field-disabled-background-color': config.getProperty(CORE_CONFIG_OPTIONS.FORM_FIELD_DISABLED_BACKGROUND_COLOR),
        },
      });

      this.cd.markForCheck();
    }
  }

  protected updateTheme(options: { darkMode?: boolean; colors?: { [color: string]: string }; vars?: { [color: string]: string } }) {
    if (!options) return;
    const classList = document.documentElement.classList;
    const style = document.documentElement.style;

    // options.colors = {
    //   ...options.colors,
    //   primary: '#124541',
    // };

    // Set dark mode
    if (isNotNil(options.darkMode)) {
      console.info('[app] Theme dark mode? ' + options.darkMode);
      if (options.darkMode) {
        classList.add('dark');
      } else {
        classList.remove('dark');
      }
    }

    // Set colors
    if (options.colors) {
      console.info('[app] Changing theme colors ', options.colors);

      // Add 100 & 900 color for primary and secondary color
      ['primary', 'secondary'].forEach((colorName) => {
        const color = options.colors[colorName];
        options.colors[colorName + '100'] = (color && mixHex('#ffffff', color, 10)) || undefined;
        options.colors[colorName + '900'] = (color && mixHex('#000000', color, 12)) || undefined;
      });

      Object.getOwnPropertyNames(options.colors).forEach((colorName) => {
        // Remove existing value
        style.removeProperty(`--ion-color-${colorName}`);
        style.removeProperty(`--ion-color-${colorName}-rgb`);
        style.removeProperty(`--ion-color-${colorName}-contrast`);
        style.removeProperty(`--ion-color-${colorName}-contrast-rgb`);
        style.removeProperty(`--ion-color-${colorName}-shade`);
        style.removeProperty(`--ion-color-${colorName}-tint`);

        // Set new value, if any
        const color = options.colors[colorName];
        if (isNotNilOrBlank(color)) {
          // Base color
          style.setProperty(`--ion-color-${colorName}`, color);
          style.setProperty(`--ion-color-${colorName}-rgb`, hexToRgbArray(color).join(', '));

          // Contrast color
          const contrastColor = getColorContrast(color, true);
          style.setProperty(`--ion-color-${colorName}-contrast`, contrastColor);
          style.setProperty(`--ion-color-${colorName}-contrast-rgb`, hexToRgbArray(contrastColor).join(', '));

          // Shade color
          style.setProperty(`--ion-color-${colorName}-shade`, getColorShade(color));

          // Tint color
          style.setProperty(`--ion-color-${colorName}-tint`, getColorTint(color));
        }
      });
    }

    // Set CSS vars
    if (options.vars) {
      console.info('[app] Changing theme vars ', options.vars);
      Object.getOwnPropertyNames(options.vars).forEach((varName) => {
        // Set new value, if any
        const value = options.vars[varName];
        if (isNotNilOrBlank(value)) {
          style.setProperty(varName, value);
        } else {
          style.removeProperty(varName);
        }
      });
    }
  }

  protected addAccountFields() {
    console.debug('[app] Add additional account fields...');

    const departmentAttributes = this.settings.getFieldDisplayAttributes('department');
    const departmentDefinition = <FormFieldDefinition>{
      key: 'department',
      label: 'USER.DEPARTMENT.TITLE',
      type: 'entity',
      autocomplete: {
        suggestFn: (value, filter) =>
          this.referentialRefService.suggest(value, {
            statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
            ...filter,
          }),
        filter: { entityName: 'Department' },
        displayWith: (value) => value && joinPropertiesPath(value, departmentAttributes),
        attributes: departmentAttributes,
      },
      extra: {
        registration: {
          required: true,
        },
        account: {
          required: true,
          disabled: true,
        },
      },
    };

    // Add account field: department
    this.accountService.registerAdditionalField(departmentDefinition);

    // Update departmentDefinition the display fn, when settings changed
    this.settings.onChange.pipe(throttleTime(400)).subscribe(() => {
      const attributes = this.settings.getFieldDisplayAttributes('department');
      if (!equals(departmentDefinition.autocomplete.attributes, attributes)) {
        departmentDefinition.autocomplete.attributes = attributes;
        departmentDefinition.autocomplete.displayWith = (value) => (value && joinPropertiesPath(value, attributes)) || undefined;
      }
    });
  }

  protected addCustomSVGIcons() {
    [
      'fish',
      'fish-oblique',
      'fish-packet',
      'down-arrow',
      'rollback-arrow',
      'operation-parent',
      'operation-child',
      // ,'dolphin-damage' //PIFIL
    ].forEach((filename) =>
      this.matIconRegistry.addSvgIcon(filename, this.domSanitizer.bypassSecurityTrustResourceUrl(`../assets/icons/${filename}.svg`))
    );
  }

  protected async startServiceWorkers() {
    await this.devicePositionService.start();
  }
}
