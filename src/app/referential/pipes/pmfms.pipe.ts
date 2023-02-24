import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { PmfmValue, PmfmValueUtils } from '../services/model/pmfm-value.model';
import { IPmfm, PmfmUtils } from '../services/model/pmfm.model';
import { ColorName, DateFormatService, formatLatitude, formatLongitude, isNotNil, isNotNilOrBlank, LocalSettingsService, TranslateContextService } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { PmfmIds } from '@app/referential/services/model/model.enum';

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
        if (contextualTranslation !== i18nKey) return contextualTranslation;
      }

      // I18n translation without context
      const translation = this.translate.instant(i18nKey);
      if (translation !== i18nKey) return translation;
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
    // Multiple values
    if (Array.isArray(value)) {
      return value.map(v => this.transform(v, opts)).join(opts?.separator || ', ');
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

  transform(pmfm: IPmfm): any {
    return pmfm && pmfm.type === 'date';
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

  transform(pmfmValue: any, opts: IPmfm|PmfmValueColorOptions): string | undefined {
    const pmfm = opts['pmfm'] || <IPmfm>opts;
    const mapWithFn = typeof opts['mapWith'] === 'function' ? opts['mapWith'] : undefined;
    if (!pmfm || !mapWithFn) return undefined;

    // Get the color
    const color = mapWithFn(pmfmValue, pmfm);

    // Transform to CSS color (by default)
    if (opts['css'] !== false) {
      return color ? `var(--ion-color-${color})` : undefined;
    }

    return color;
  }
}
