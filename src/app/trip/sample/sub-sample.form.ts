import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { MeasurementValuesForm } from '../measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '../services/validator/measurement.validator';
import { UntypedFormBuilder } from '@angular/forms';
import { AppFormUtils, EntityUtils, isNil, isNotEmptyArray, isNotNil, joinPropertiesPath, LocalSettingsService, startsWithUpperCase, toNumber, UsageMode } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { Sample } from '../services/model/sample.model';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { SubSampleValidatorService } from '@app/trip/services/validator/sub-sample.validator';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { merge, Subject } from 'rxjs';
import { distinctUntilChanged, filter, mergeMap } from 'rxjs/operators';


@Component({
  selector: 'app-sub-sample-form',
  templateUrl: 'sub-sample.form.html',
  styleUrls: ['sub-sample.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubSampleForm extends MeasurementValuesForm<Sample>
  implements OnInit, OnDestroy {

  private _availableParents: Sample[] = [];
  private _availableSortedParents: Sample[] = [];
  focusFieldName: string;
  displayAttributes: string[];
  onParentChanges = new Subject();
  i18nFullSuffix: string;

  @Input() i18nPmfmSuffix: string;
  @Input() i18nSuffix: string;

  @Input() mobile: boolean;
  @Input() tabindex: number;
  @Input() usageMode: UsageMode;
  @Input() showLabel = false;
  @Input() showParent = true;
  @Input() showComment = true;
  @Input() showError = true;
  @Input() maxVisibleButtons: number;
  @Input() defaultLatitudeSign: '+' | '-';
  @Input() defaultLongitudeSign: '+' | '-';
  @Input() displayParentPmfm: IPmfm;

  @Input()
  set availableParents(parents: Sample[]) {
    if (this._availableParents !== parents) {
      this._availableParents = parents;
      if (!this.loading) this.onParentChanges.next();
    }
  }

  get availableParents(): Sample[] {
    return this._availableParents;
  }

  constructor(
    protected injector: Injector,
    protected measurementValidatorService: MeasurementsValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected cd: ChangeDetectorRef,
    protected validatorService: SubSampleValidatorService,
    protected settings: LocalSettingsService,
  ) {
    super(injector, measurementValidatorService, formBuilder, programRefService,
      validatorService.getFormGroup(),
      {
        mapPmfms: (pmfms) => this.mapPmfms(pmfms)
      }
    );

    this._enable = true;
    this.i18nPmfmPrefix = 'TRIP.SAMPLE.PMFM.';

    // for DEV only
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Set defaults
    this.acquisitionLevel = this.acquisitionLevel || AcquisitionLevelCodes.INDIVIDUAL_MONITORING;
    this.tabindex = toNumber(this.tabindex, 1);
    this.maxVisibleButtons = toNumber(this.maxVisibleButtons, 4);
    this.focusFieldName = !this.mobile && (this.showLabel ? 'label' :
      (this.showParent ? 'parent' : null));
    this.i18nFieldPrefix = this.i18nFieldPrefix || `TRIP.SUB_SAMPLE.`;
    this.i18nSuffix = this.i18nSuffix || '';
    this.i18nFullSuffix = `${this.acquisitionLevel}.${this.i18nSuffix}`;

    // Parent combo
    this.registerAutocompleteField('parent', {
      suggestFn: (value: any, options?: any) => this.suggestParent(value),
      showAllOnFocus: true,
      mobile: this.mobile
    });

    this.registerSubscription(
      merge(
        this.onParentChanges.pipe(mergeMap(() => this.pmfms$)),
        this.pmfms$
      )
        .pipe(
          filter(isNotEmptyArray),
        ).subscribe((pmfms) => this.updateParents(pmfms))
    )

    if (!this.showParent) {
      this.form.parent?.disable();
    }
  }

  /* -- protected methods -- */

  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    // DEBUG
    console.debug('[sub-sample-form] Mapping PMFMs...', pmfms);

    const tagIdPmfmIndex = pmfms.findIndex(p => p.id === PmfmIds.TAG_ID)
    const tagIdPmfm = tagIdPmfmIndex!== -1 && pmfms[tagIdPmfmIndex];
    this.displayParentPmfm = tagIdPmfm?.required ? tagIdPmfm : null;

    // Force the parent PMFM to be hidden, and NOT required
    if (this.displayParentPmfm && !this.displayParentPmfm.hidden) {
      const cloneParentPmfm = this.displayParentPmfm.clone();
      cloneParentPmfm.hidden = true;
      cloneParentPmfm.required = false;
      pmfms[tagIdPmfmIndex] = cloneParentPmfm;
    }

    return pmfms;
  }

  protected getValue(): Sample {
    const value = super.getValue();

    // Copy parent measurement, if any
    if (this.displayParentPmfm && value.parent) {
      const parentPmfmId = this.displayParentPmfm.id.toString();
      value.measurementValues = value.measurementValues || {};
      value.measurementValues[parentPmfmId] = value.parent.measurementValues[parentPmfmId];
    }

    if (!this.showComment) value.comments = undefined;
    return value;
  }

  protected async updateParents(pmfms: IPmfm[]) {
    // DEBUG
    console.debug('[sub-sample-form] Update parents...');

    const parents = this._availableParents || [];
    const hasTaxonName = parents.some(s => isNotNil(s.taxonName?.id));
    const attributeName = hasTaxonName ? 'taxonName' : 'taxonGroup';
    const baseDisplayAttributes = this.settings.getFieldDisplayAttributes(attributeName)
      .map(key => `${attributeName}.${key}`);

    // If display parent using by a pmfm
    if (this.displayParentPmfm) {
      const parentDisplayPmfmIdStr = this.displayParentPmfm.id.toString();
      const parentDisplayPmfmPath = `measurementValues.${parentDisplayPmfmIdStr}`;
      // Keep parents without this pmfms
      const filteredParents = parents.filter(s => isNotNil(s.measurementValues[parentDisplayPmfmIdStr]));
      this._availableSortedParents = EntityUtils.sort(filteredParents, parentDisplayPmfmPath);

      this.autocompleteFields.parent.attributes = [parentDisplayPmfmPath].concat(baseDisplayAttributes);
      this.autocompleteFields.parent.columnSizes = [4].concat(baseDisplayAttributes.map(attr =>
        // If label then col size = 2
        attr.endsWith('label') ? 2 : undefined));
      this.autocompleteFields.parent.columnNames = [PmfmUtils.getPmfmName(this.displayParentPmfm)];
      this.autocompleteFields.parent.displayWith = (obj) => obj && obj.measurementValues
        && PmfmValueUtils.valueToString(obj.measurementValues[parentDisplayPmfmIdStr], {pmfm: this.displayParentPmfm})
        || undefined;
    }
    else {
      const displayAttributes = ['rankOrder'].concat(baseDisplayAttributes);
      this._availableSortedParents = EntityUtils.sort(parents.slice(), 'rankOrder');
      this.autocompleteFields.parent.attributes = displayAttributes;
      this.autocompleteFields.parent.columnSizes = undefined; // use defaults
      this.autocompleteFields.parent.columnNames = undefined; // use defaults
      this.autocompleteFields.parent.displayWith = (obj) => obj && joinPropertiesPath(obj, displayAttributes) || undefined;
    }

    this.markForCheck();
  }

  protected async suggestParent(value: any): Promise<any[]> {
    if (EntityUtils.isNotEmpty(value, 'label')) {
      return [value];
    }
    value = (typeof value === 'string' && value !== '*') && value || undefined;
    if (isNil(value)) return this._availableSortedParents; // All

    if (this.debug) console.debug(`[sub-sample-form] Searching parent {${value || '*'}}...`);
    if (this.displayParentPmfm) { // Search on a specific Pmfm (e.g Tag-ID)
      return this._availableSortedParents.filter(p => startsWithUpperCase(p.measurementValues[this.displayParentPmfm.id], value));
    }
    // Search on rankOrder
    return this._availableSortedParents.filter(p => p.rankOrder.toString().startsWith(value));
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  isNotHiddenPmfm = PmfmUtils.isNotHidden;
  selectInputContent = AppFormUtils.selectInputContent;

}
