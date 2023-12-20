import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { AccountService, ConfigService, CORE_CONFIG_OPTIONS, getColorContrast, getColorShade, getColorTint, hexToRgbArray, isNotNil, joinPropertiesPath, LocalSettingsService, mixHex, PlatformService, StatusIds, } from '@sumaris-net/ngx-components';
import { DOCUMENT } from '@angular/common';
import { throttleTime } from 'rxjs/operators';
import { ReferentialRefService } from './referential/services/referential-ref.service';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { APP_SOCIAL_CONFIG_OPTIONS } from '@app/social/config/social.config';
import { DevicePositionService } from '@app/data/position/device/device-position.service';
let AppComponent = class AppComponent {
    constructor(_document, platform, accountService, referentialRefService, configService, settings, devicePositionService, matIconRegistry, domSanitizer, cd) {
        this._document = _document;
        this.platform = platform;
        this.accountService = accountService;
        this.referentialRefService = referentialRefService;
        this.configService = configService;
        this.settings = settings;
        this.devicePositionService = devicePositionService;
        this.matIconRegistry = matIconRegistry;
        this.domSanitizer = domSanitizer;
        this.cd = cd;
        this.enabledNotificationIcons = false;
        console.info('[app] Starting...');
        this.platform.start();
    }
    ngOnInit() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.platform.ready();
            // Listen for config changed
            this.configService.config.subscribe((config) => this.onConfigChanged(config));
            // Add additional account fields
            this.addAccountFields();
            // Add custom icons
            this.addCustomSVGIcons();
            yield this.startServiceWorkers();
            console.info('[app] Starting [OK]');
        });
    }
    onActivate(event) {
        // Make sure to scroll on top before changing state
        // See https://stackoverflow.com/questions/48048299/angular-5-scroll-to-top-on-every-route-click
        const scrollToTop = window.setInterval(() => {
            const pos = window.scrollY;
            if (pos > 0) {
                window.scrollTo(0, pos - 20); // how far to scroll on each step
            }
            else {
                window.clearInterval(scrollToTop);
            }
        }, 16);
    }
    onConfigChanged(config) {
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
                colors: {
                    primary: config.properties['sumaris.color.primary'],
                    secondary: config.properties['sumaris.color.secondary'],
                    tertiary: config.properties['sumaris.color.tertiary'],
                    success: config.properties['sumaris.color.success'],
                    warning: config.properties['sumaris.color.warning'],
                    accent: config.properties['sumaris.color.accent'],
                    danger: config.properties['sumaris.color.danger'],
                },
            });
            this.cd.markForCheck();
        }
    }
    updateTheme(options) {
        if (!options)
            return;
        // Setting colors
        if (options.colors) {
            console.info('[app] Changing theme colors ', options);
            const style = document.documentElement.style;
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
                if (isNotNil(color)) {
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
    }
    addAccountFields() {
        console.debug('[app] Add additional account fields...');
        const departmentAttributes = this.settings.getFieldDisplayAttributes('department');
        const departmentDefinition = {
            key: 'department',
            label: 'USER.DEPARTMENT.TITLE',
            type: 'entity',
            autocomplete: {
                suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign({ statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY] }, filter)),
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
        // When settings changed
        this.settings.onChange.pipe(throttleTime(400)).subscribe(() => {
            // Update the display fn
            const attributes = this.settings.getFieldDisplayAttributes('department');
            departmentDefinition.autocomplete.attributes = attributes;
            departmentDefinition.autocomplete.displayWith = (value) => (value && joinPropertiesPath(value, attributes)) || undefined;
        });
    }
    addCustomSVGIcons() {
        [
            'fish',
            'fish-oblique',
            'fish-packet',
            'down-arrow',
            'rollback-arrow',
            // ,'dolphin-damage' //PIFIL
        ].forEach((filename) => this.matIconRegistry.addSvgIcon(filename, this.domSanitizer.bypassSecurityTrustResourceUrl(`../assets/icons/${filename}.svg`)));
    }
    startServiceWorkers() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.devicePositionService.start();
        });
    }
};
AppComponent = __decorate([
    Component({
        selector: 'app-root',
        templateUrl: './app.component.html',
        styleUrls: ['./app.component.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __param(0, Inject(DOCUMENT)),
    __metadata("design:paramtypes", [Document,
        PlatformService,
        AccountService,
        ReferentialRefService,
        ConfigService,
        LocalSettingsService,
        DevicePositionService,
        MatIconRegistry,
        DomSanitizer,
        ChangeDetectorRef])
], AppComponent);
export { AppComponent };
//# sourceMappingURL=app.component.js.map