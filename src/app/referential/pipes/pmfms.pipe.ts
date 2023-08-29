import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { PmfmValue, PmfmValueUtils } from '../services/model/pmfm-value.model';
import { IPmfm, PmfmUtils } from '../services/model/pmfm.model';
import { ColorName, DateFormatService, formatLatitude, formatLongitude, IconRef, isNotNil, isNotNilOrBlank, LocalSettingsService, TranslateContextService } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { ProgramProperties } from '@app/referential/services/config/program.config';

@Pipe({
  name: 'pmfmIdString'
})
export class PmfmIdStringPipe implements PipeTransform {

  constructor(
    protected translate: TranslateService,
    protected translateContext: TranslateContextService
  ) {

  }

  transform(pmfm: IPmfm): string {
    return pmfm && pmfm.id?.toString() || null;
  }
}

@Pipe({
    name: 'pmfmName'
})
@Injectable({providedIn: 'root'})
export class PmfmNamePipe implements PipeTransform {

  constructor(
    protected translate: TranslateService,
    protected translateContext: TranslateContextService
  ) {

  }

  transform(pmfm: IPmfm, opts?: {
    withUnit?: boolean;
    html?: boolean;
    withDetails?: boolean;
    i18nPrefix?: string;
    i18nContext?: string;
  }): string {
    if (!pmfm) return '';
    // Try to resolve PMFM using prefix + label
    if (isNotNilOrBlank(opts?.i18nPrefix)) {
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

}

interface PmfmValueOptions {
  pmfm: IPmfm;
  propertyNames?: string[];
  html?: boolean;
  hideIfDefaultValue?: boolean;
  showLabelForPmfmIds?: number[];
  applyDisplayConversion?: boolean;
}

@Pipe({
  name: 'pmfmValue'
})
@Injectable({providedIn: 'root'})
export class PmfmValuePipe implements PipeTransform {

  constructor(
    private dateFormat: DateFormatService,
    private settings: LocalSettingsService
  ) {
  }

  transform(value: any, opts: PmfmValueOptions & {separator?: string}): any {
    return this.format(value, opts);
  }

  format(value: PmfmValue|any, opts: PmfmValueOptions & {separator?: string}): any {
    // Multiple values
    if (Array.isArray(value)) {
      return value.map(v => this.format(v, opts)).join(opts?.separator || ', ');
    }

    const type = PmfmUtils.getExtendedType(opts?.pmfm);
    switch (type) {
      case 'date':
        return this.dateFormat.transform(value, {time: false});
      case 'dateTime':
        return this.dateFormat.transform(value, {time: true});
      case 'duration':
        return value || null;
      case 'latitude':
        return formatLatitude(value, {pattern: this.settings.latLongFormat, placeholderChar: '0'});
      case 'longitude':
        return formatLongitude(value, {pattern: this.settings.latLongFormat, placeholderChar: '0'});
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
}

@Pipe({
  name: 'isDatePmfm'
})
@Injectable({providedIn: 'root'})
export class IsDatePmfmPipe implements PipeTransform {

  transform(pmfm: IPmfm): boolean {
    return pmfm && PmfmUtils.isDate(pmfm) || false;
  }
}

@Pipe({
  name: 'isComputedPmfm'
})
@Injectable({providedIn: 'root'})
export class IsComputedPmfmPipe implements PipeTransform {

  transform(pmfm: IPmfm): boolean {
    return pmfm?.isComputed || false;
  }
}


@Pipe({
  name: 'isMultiplePmfm'
})
@Injectable({providedIn: 'root'})
export class IsMultiplePmfmPipe implements PipeTransform {

  transform(pmfm: IPmfm): boolean {
    return pmfm?.isMultiple || false;
  }
}


@Pipe({
  name: 'isWeightPmfm'
})
@Injectable({providedIn: 'root'})
export class IsWeightPmfmPipe implements PipeTransform {

  transform(pmfm: IPmfm): boolean {
    return pmfm && PmfmUtils.isWeight(pmfm) || false;
  }
}

@Pipe({
  name: 'pmfmFieldStyle'
})
@Injectable({providedIn: 'root'})
export class PmfmFieldStylePipe implements PipeTransform {

  private readonly _mobile: boolean;

  constructor(settings: LocalSettingsService) {
    this._mobile = settings.mobile;
  }

  transform(pmfm: IPmfm, maxItemCountForButtons?: number): any {
    return pmfm && this._mobile && (
      pmfm.type === 'boolean'
      || (pmfm.isQualitative && pmfm.qualitativeValues?.length <= (maxItemCountForButtons || ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS.defaultValue || 4))
    ) ? 'button' : undefined /*default*/;
  }
}


export type PmfmValueColorFn = (value: PmfmValue, pmfm: IPmfm) => ColorName;
export interface PmfmValueColorOptions {
  pmfm: IPmfm;
  mapWith?: PmfmValueColorFn;
  css?: boolean; // true by default. If false, will return a ColorName
}

@Pipe({
  name: 'pmfmValueColor'
})
export class PmfmValueColorPipe implements PipeTransform {

  transform(pmfmValue: any, opts: IPmfm|PmfmValueColorOptions, data: any): string | undefined {
    const pmfm = opts['pmfm'] || <IPmfm>opts;
    const mapWithFn = typeof opts['mapWith'] === 'function' ? opts['mapWith'] : undefined;
    if (!pmfm || !mapWithFn) return undefined;

    // Get the color
    const color = mapWithFn(pmfmValue, pmfm, data);

    // Transform to CSS color (by default)
    if (opts['css'] !== false) {
      return color ? `var(--ion-color-${color})` : undefined;
    }

    return color;
  }
}

@Pipe({
  name: 'pmfmValueIcon'
})
export class PmfmValueIconPipe implements PipeTransform {

  transform(pmfmValue: any, opts: IPmfm|PmfmValueColorOptions, data: any): IconRef {
    const pmfm = opts['pmfm'] || <IPmfm>opts;
    const mapToColorFn = typeof opts['mapWith'] === 'function' ? opts['mapWith'] : undefined;
    if (!pmfm || !mapToColorFn) return undefined;

    // Get the color
    const color = mapToColorFn(pmfmValue, pmfm, data);
    if (!color) return null;

    const result: IconRef = {color};
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
}
