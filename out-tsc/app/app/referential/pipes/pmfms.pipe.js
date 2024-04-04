import { __decorate, __metadata } from "tslib";
import { Injectable, Pipe } from '@angular/core';
import { PmfmValueUtils } from '../services/model/pmfm-value.model';
import { PmfmUtils } from '../services/model/pmfm.model';
import { DateFormatService, formatLatitude, formatLongitude, isNotNil, isNotNilOrBlank, LocalSettingsService, TranslateContextService } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { ProgramProperties } from '@app/referential/services/config/program.config';
let PmfmIdStringPipe = class PmfmIdStringPipe {
    constructor(translate, translateContext) {
        this.translate = translate;
        this.translateContext = translateContext;
    }
    transform(pmfm) {
        var _a;
        return pmfm && ((_a = pmfm.id) === null || _a === void 0 ? void 0 : _a.toString()) || null;
    }
};
PmfmIdStringPipe = __decorate([
    Pipe({
        name: 'pmfmIdString'
    }),
    __metadata("design:paramtypes", [TranslateService,
        TranslateContextService])
], PmfmIdStringPipe);
export { PmfmIdStringPipe };
let PmfmNamePipe = class PmfmNamePipe {
    constructor(translate, translateContext) {
        this.translate = translate;
        this.translateContext = translateContext;
    }
    transform(pmfm, opts) {
        if (!pmfm)
            return '';
        // Try to resolve PMFM using prefix + label
        if (isNotNilOrBlank(opts === null || opts === void 0 ? void 0 : opts.i18nPrefix)) {
            const i18nKey = opts.i18nPrefix + pmfm.label;
            // I18n translation WITH context, if any
            if (opts.i18nContext) {
                const contextualTranslation = this.translateContext.instant(i18nKey, opts.i18nContext);
                if (contextualTranslation !== i18nKey) {
                    return PmfmUtils.sanitizeName(contextualTranslation, pmfm, opts);
                }
            }
            // I18n translation without context
            const translation = this.translate.instant(i18nKey);
            if (translation !== i18nKey) {
                return PmfmUtils.sanitizeName(translation, pmfm, opts);
            }
        }
        // Default name, computed from the PMFM object
        return PmfmUtils.getPmfmName(pmfm, opts);
    }
};
PmfmNamePipe = __decorate([
    Pipe({
        name: 'pmfmName'
    }),
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [TranslateService,
        TranslateContextService])
], PmfmNamePipe);
export { PmfmNamePipe };
let PmfmValuePipe = class PmfmValuePipe {
    constructor(dateFormat, settings) {
        this.dateFormat = dateFormat;
        this.settings = settings;
    }
    transform(value, opts) {
        return this.format(value, opts);
    }
    format(value, opts) {
        // Multiple values
        if (Array.isArray(value)) {
            return value.map(v => this.format(v, opts)).join((opts === null || opts === void 0 ? void 0 : opts.separator) || ', ');
        }
        const type = PmfmUtils.getExtendedType(opts === null || opts === void 0 ? void 0 : opts.pmfm);
        switch (type) {
            case 'date':
                return this.dateFormat.transform(value, { time: false });
            case 'dateTime':
                return this.dateFormat.transform(value, { time: true });
            case 'duration':
                return value || null;
            case 'latitude':
                return formatLatitude(value, { pattern: this.settings.latLongFormat, placeholderChar: '0' });
            case 'longitude':
                return formatLongitude(value, { pattern: this.settings.latLongFormat, placeholderChar: '0' });
            case 'integer':
            case 'double':
                if (opts.applyDisplayConversion && isNotNil(value) && opts.pmfm.displayConversion) {
                    value = opts.pmfm.displayConversion.conversionCoefficient * value;
                }
                return PmfmValueUtils.valueToString(value, opts);
            default:
                return PmfmValueUtils.valueToString(value, opts);
        }
    }
};
PmfmValuePipe = __decorate([
    Pipe({
        name: 'pmfmValue'
    }),
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [DateFormatService,
        LocalSettingsService])
], PmfmValuePipe);
export { PmfmValuePipe };
let IsDatePmfmPipe = class IsDatePmfmPipe {
    transform(pmfm) {
        return pmfm && PmfmUtils.isDate(pmfm) || false;
    }
};
IsDatePmfmPipe = __decorate([
    Pipe({
        name: 'isDatePmfm'
    }),
    Injectable({ providedIn: 'root' })
], IsDatePmfmPipe);
export { IsDatePmfmPipe };
let IsComputedPmfmPipe = class IsComputedPmfmPipe {
    transform(pmfm) {
        return (pmfm === null || pmfm === void 0 ? void 0 : pmfm.isComputed) || false;
    }
};
IsComputedPmfmPipe = __decorate([
    Pipe({
        name: 'isComputedPmfm'
    }),
    Injectable({ providedIn: 'root' })
], IsComputedPmfmPipe);
export { IsComputedPmfmPipe };
let IsMultiplePmfmPipe = class IsMultiplePmfmPipe {
    transform(pmfm) {
        return (pmfm === null || pmfm === void 0 ? void 0 : pmfm.isMultiple) || false;
    }
};
IsMultiplePmfmPipe = __decorate([
    Pipe({
        name: 'isMultiplePmfm'
    }),
    Injectable({ providedIn: 'root' })
], IsMultiplePmfmPipe);
export { IsMultiplePmfmPipe };
let IsWeightPmfmPipe = class IsWeightPmfmPipe {
    transform(pmfm) {
        return pmfm && PmfmUtils.isWeight(pmfm) || false;
    }
};
IsWeightPmfmPipe = __decorate([
    Pipe({
        name: 'isWeightPmfm'
    }),
    Injectable({ providedIn: 'root' })
], IsWeightPmfmPipe);
export { IsWeightPmfmPipe };
let PmfmFieldStylePipe = class PmfmFieldStylePipe {
    constructor(settings) {
        this._mobile = settings.mobile;
    }
    transform(pmfm, maxItemCountForButtons) {
        var _a;
        return pmfm && this._mobile && (pmfm.type === 'boolean'
            || (pmfm.isQualitative && ((_a = pmfm.qualitativeValues) === null || _a === void 0 ? void 0 : _a.length) <= (maxItemCountForButtons || ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS.defaultValue || 4))) ? 'button' : undefined /*default*/;
    }
};
PmfmFieldStylePipe = __decorate([
    Pipe({
        name: 'pmfmFieldStyle'
    }),
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [LocalSettingsService])
], PmfmFieldStylePipe);
export { PmfmFieldStylePipe };
let PmfmValueColorPipe = class PmfmValueColorPipe {
    transform(pmfmValue, opts, data) {
        const pmfm = opts['pmfm'] || opts;
        const mapWithFn = typeof opts['mapWith'] === 'function' ? opts['mapWith'] : undefined;
        if (!pmfm || !mapWithFn)
            return undefined;
        // Get the color
        const color = mapWithFn(pmfmValue, pmfm, data);
        // Transform to CSS color (by default)
        if (opts['css'] !== false) {
            return color ? `var(--ion-color-${color})` : undefined;
        }
        return color;
    }
};
PmfmValueColorPipe = __decorate([
    Pipe({
        name: 'pmfmValueColor'
    })
], PmfmValueColorPipe);
export { PmfmValueColorPipe };
let PmfmValueIconPipe = class PmfmValueIconPipe {
    transform(pmfmValue, opts, data) {
        const pmfm = opts['pmfm'] || opts;
        const mapToColorFn = typeof opts['mapWith'] === 'function' ? opts['mapWith'] : undefined;
        if (!pmfm || !mapToColorFn)
            return undefined;
        // Get the color
        const color = mapToColorFn(pmfmValue, pmfm, data);
        if (!color)
            return null;
        const result = { color };
        switch (color) {
            case 'success':
                result.icon = 'checkmark-circle';
                break;
            case 'warning':
                result.icon = 'warning';
                break;
            case 'warning900':
            case 'danger':
                result.icon = 'alert-circle';
                break;
        }
        return result;
    }
};
PmfmValueIconPipe = __decorate([
    Pipe({
        name: 'pmfmValueIcon'
    })
], PmfmValueIconPipe);
export { PmfmValueIconPipe };
//# sourceMappingURL=pmfms.pipe.js.map