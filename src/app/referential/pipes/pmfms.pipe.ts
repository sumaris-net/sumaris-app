import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { PmfmValueUtils } from '../services/model/pmfm-value.model';
import { IPmfm, PmfmUtils } from '../services/model/pmfm.model';
import { DateFormatPipe, formatLatitude, formatLongitude, isNotNil, isNotNilOrBlank, LocalSettingsService, TranslateContextService } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';

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
    private dateFormatPipe: DateFormatPipe,
    private settings: LocalSettingsService
  ) {
  }

  transform(value: any, opts: PmfmValueOptions): any {
    const type = PmfmUtils.getExtendedType(opts?.pmfm);
    switch (type) {
      case 'date':
        return this.dateFormatPipe.transform(value, {time: false});
      case 'dateTime':
        return this.dateFormatPipe.transform(value, {time: true});
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

  transform(pmfm: IPmfm): any {

    return pmfm && pmfm.isComputed;
  }
}


@Pipe({
  name: 'isMultiplePmfm'
})
@Injectable({providedIn: 'root'})
export class IsMultiplePmfmPipe implements PipeTransform {

  transform(pmfm: IPmfm): any {
    return pmfm && pmfm.isMultiple;
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

  transform(pmfm: IPmfm, maxVisibleButtons?: number): any {
    return pmfm && this._mobile && (
      pmfm.type === 'boolean'
      || (pmfm.isQualitative && pmfm.qualitativeValues?.length <= (maxVisibleButtons || 4))
    ) ? 'button' : undefined /*default*/;
  }
}
