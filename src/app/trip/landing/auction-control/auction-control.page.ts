import { AfterViewInit, ChangeDetectionStrategy, Component, forwardRef, Injector, OnInit } from '@angular/core';
import { AcquisitionLevelCodes, LocationLevelIds, PmfmIds, TaxonGroupLabels } from '@app/referential/services/model/model.enum';
import { LandingPage } from '../landing.page';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, startWith, switchMap, tap } from 'rxjs/operators';
import { BehaviorSubject, firstValueFrom, Observable, Subscription } from 'rxjs';
import { Landing } from '../landing.model';
import { AuctionControlValidators } from './auction-control.validators';
import { ModalController } from '@ionic/angular';
import {
  AppHelpModal,
  AppHelpModalOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  fadeInOutAnimation,
  filterNotNil,
  firstNotNilPromise,
  FormErrorTranslateOptions,
  HistoryPageReference,
  IReferentialRef,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNumber,
  LoadResult,
  LocalSettingsService,
  ReferentialUtils,
  SharedValidators,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { ObservedLocation } from '../../observedlocation/observed-location.model';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { Program } from '@app/referential/services/model/program.model';
import { IPmfm, PMFM_ID_REGEXP } from '@app/referential/services/model/pmfm.model';
import { Sample } from '@app/trip/sample/sample.model';
import { AppColors } from '@app/shared/colors.utils';

import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
import { RxState } from '@rx-angular/state';
import { IDataFormPathTranslatorOptions } from '@app/data/services/data-service.class';

@Component({
  selector: 'app-auction-control',
  styleUrls: ['auction-control.page.scss'],
  templateUrl: './auction-control.page.html',
  animations: [fadeInOutAnimation],
  providers: [{ provide: APP_DATA_ENTITY_EDITOR, useExisting: forwardRef(() => AuctionControlPage) }, RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuctionControlPage extends LandingPage implements OnInit, AfterViewInit {
  $taxonGroupTypeId = new BehaviorSubject<number>(null);
  taxonGroupControl: UntypedFormControl;
  showOtherTaxonGroup = false;
  controlledSpeciesPmfmId: number;
  errorTranslateOptions: FormErrorTranslateOptions;

  $taxonGroupPmfm = new BehaviorSubject<IPmfm>(null);
  $taxonGroups = new BehaviorSubject<TaxonGroupRef[]>(null);
  selectedTaxonGroup$: Observable<TaxonGroupRef>;
  helpContent: string;

  constructor(
    injector: Injector,
    protected settings: LocalSettingsService,
    protected formBuilder: UntypedFormBuilder,
    protected modalCtrl: ModalController
  ) {
    super(injector, {
      pathIdAttribute: 'controlId',
      tabGroupAnimationDuration: '0s', // Disable tab animation
      i18nPrefix: 'AUCTION_CONTROL.EDIT.',
      settingsId: 'auctionControl',
    });

    this.taxonGroupControl = this.formBuilder.control(null, [SharedValidators.entity]);
    this.errorTranslateOptions = { separator: '<br/>', pathTranslator: this };

    // FOR DEV ONLY ----
    this.logPrefix = '[auction-control-page] ';
  }

  ngOnInit() {
    super.ngOnInit();

    // Default location levels ids
    this.landingForm.locationLevelIds = [LocationLevelIds.AUCTION];

    // Configure sample table
    this.samplesTable.inlineEdition = !this.mobile;

    const taxonGroupAttributes = this.settings.getFieldDisplayAttributes('taxonGroup');
    this.landingForm.registerAutocompleteField('taxonGroup', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonGroups(value, options),
      columnSizes: taxonGroupAttributes.map((attr) => (attr === 'label' ? 3 : undefined)),
      mobile: this.mobile,
    });
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    // Get program taxon groups
    this.registerSubscription(
      this.programLabel$
        .pipe(
          filter(isNotNil),
          mergeMap((programLabel) => this.programRefService.loadTaxonGroups(programLabel))
        )
        .subscribe((taxonGroups) => {
          console.debug('[control] Program taxonGroups: ', taxonGroups);
          this.$taxonGroups.next(taxonGroups);
        })
    );

    this._state.connect(
      'pmfms',
      filterNotNil(this.$taxonGroups).pipe(
        switchMap(() => this.landingForm.pmfms$),
        filter(isNotNil),
        map((pmfms) =>
          pmfms.map((pmfm) => {
            // Controlled species PMFM
            if (
              pmfm.id === PmfmIds.CONTROLLED_SPECIES ||
              pmfm.id === PmfmIds.TAXON_GROUP_ID ||
              pmfm.label === 'TAXON_GROUP' ||
              pmfm.label === 'TAXON_GROUP_ID'
            ) {
              console.debug(`[control] Replacing pmfm ${pmfm.label} qualitative values`);

              this.controlledSpeciesPmfmId = pmfm.id;

              const taxonGroups = this.$taxonGroups.getValue();
              if (isNotEmptyArray(taxonGroups) && isNotEmptyArray(pmfm.qualitativeValues)) {
                pmfm = pmfm.clone(); // Clone (to keep unchanged the original pmfm)

                // Replace QV.name
                pmfm.qualitativeValues = pmfm.qualitativeValues.reduce((res, qv) => {
                  const taxonGroup = taxonGroups.find((tg) => tg.label === qv.label);
                  // If not found in strategy's taxonGroups: ignore
                  if (!taxonGroup) {
                    console.warn(
                      `Ignore invalid QualitativeValue {label: ${qv.label}} (not found in taxon groups of the program ${this.landingForm.programLabel})`
                    );
                    return res;
                  }
                  // Replace the QV name, using the taxon group name
                  qv.name = taxonGroup.name;
                  qv.entityName = taxonGroup.entityName || 'QualitativeValue';
                  return res.concat(qv);
                }, []);
              } else {
                console.debug(`[control] No qualitative values to replace, or no taxon groups in the strategy`);
              }

              this.$taxonGroupPmfm.next(pmfm);
            }

            // Force other Pmfm to optional (if in on field)
            else if (this.isOnFieldMode && pmfm.required) {
              pmfm = pmfm.clone(); // Skip original pmfm safe
              pmfm.required = false;
            }
            return pmfm;
          })
        )
      )
    );

    // Get the taxon group control
    this.selectedTaxonGroup$ = this.$taxonGroupPmfm
      .pipe(
        map((pmfm) => pmfm && this.form.get(`measurementValues.${pmfm.id}`)),
        filter(isNotNil),
        distinctUntilChanged(),
        switchMap((control) => control.valueChanges.pipe(startWith<any>(control.value), debounceTime(250)))
      )
      .pipe(
        // Update the help content
        tap((qv) => {
          this.helpContent = (qv && qv.description) || null;
          this.markForCheck();
        }),
        map((qv) => (ReferentialUtils.isNotEmpty(qv) && this.$taxonGroups.value.find((tg) => tg.label === qv.label)) || undefined)
      );

    // Load pmfms
    this.registerSubscription(
      this.selectedTaxonGroup$
        .pipe(
          filter(isNotNil),
          distinctUntilChanged((tg1, tg2) => EntityUtils.equals(tg1, tg2, 'id')),
          mergeMap((taxonGroup) =>
            this.programRefService.watchProgramPmfms(this.programLabel, {
              acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
              taxonGroupId: toNumber(taxonGroup && taxonGroup.id, undefined),
            })
          )
        )
        .subscribe(async (pmfms) => {
          // Save existing samples
          if (this.samplesTable.dirty && !this.saving) {
            await this.samplesTable.save();
          }

          // Applying new PMFMs
          console.debug('[control] Applying taxon group PMFMs:', pmfms);
          this.samplesTable.pmfms = pmfms;
        })
    );

    // Update sample tables
    this.registerSubscription(
      this.selectedTaxonGroup$.subscribe((taxonGroup) => {
        if (taxonGroup && taxonGroup.label === TaxonGroupLabels.FISH) {
          this.showOtherTaxonGroup = true;
          const samples = this.samplesTable.value;
          let sameTaxonGroup = (isNotEmptyArray(samples) && samples[0].taxonGroup) || null;
          sameTaxonGroup =
            (sameTaxonGroup && samples.findIndex((s) => !ReferentialUtils.equals(sameTaxonGroup, s.taxonGroup)) === -1 && sameTaxonGroup) || null;
          this.taxonGroupControl.setValue(sameTaxonGroup);
          this.showSamplesTable = true;
        } else {
          this.showOtherTaxonGroup = false;
          this.taxonGroupControl.setValue(taxonGroup);
        }
      })
    );

    this.registerSubscription(
      this.taxonGroupControl.valueChanges.pipe(distinctUntilChanged(ReferentialUtils.equals)).subscribe((taxonGroup) => {
        const hasTaxonGroup = ReferentialUtils.isNotEmpty(taxonGroup);
        console.debug('[control] Selected taxon group:', taxonGroup);
        this.samplesTable.defaultTaxonGroup = taxonGroup;
        this.samplesTable.showTaxonGroupColumn = !hasTaxonGroup;
        this.showSamplesTable = this.showSamplesTable || hasTaxonGroup;
        this.markForCheck();
      })
    );
  }

  protected async setProgram(program: Program) {
    if (!program) return; // Skip
    await super.setProgram(program);

    // Configure landing form
    this.landingForm.showLocation = false;
    this.landingForm.showDateTime = false;
    this.landingForm.showObservers = false;

    this.$taxonGroupTypeId.next(program && program.taxonGroupType ? program.taxonGroupType.id : null);
  }

  protected async onEntityLoaded(data: Landing, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onEntityLoaded(data, options);

    // Send landing date time to sample tables, but leave empty if FIELD mode (= will use current date)
    this.samplesTable.defaultSampleDate = this.isOnFieldMode ? undefined : data.dateTime;

    // Always open the second tab, when existing entity
    this.selectedTabIndex = 1;
    this.tabGroup.realignInkBar();

    this.markForCheck();
  }

  async updateView(
    data: Landing | null,
    opts?: {
      emitEvent?: boolean;
      openTabIndex?: number;
      updateRoute?: boolean;
    }
  ) {
    // if vessel given in query params
    if (this.isNewData && this.route.snapshot.queryParams['vessel']) {
      // Open the second tab
      opts = { ...opts, openTabIndex: 1 };
    }

    await super.updateView(data, opts);
  }

  async save(event?: Event, options?: any): Promise<boolean> {
    return super.save(event, options);
  }

  async openHelpModal(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();

    const modal = await this.modalCtrl.create({
      component: AppHelpModal,
      componentProps: <AppHelpModalOptions>{
        title: this.translate.instant('COMMON.HELP.TITLE'),
        markdownContent: this.helpContent,
      },
      keyboardClose: true,
      cssClass: 'modal-large',
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    await modal.onDidDismiss();
  }

  protected async suggestTaxonGroups(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    let levelId = this.$taxonGroupTypeId.getValue();
    if (isNil(levelId)) {
      console.debug('Waiting program taxon group type ids...');
      levelId = await firstNotNilPromise(this.$taxonGroupTypeId, { stop: this.destroySubject });
    }
    return this.referentialRefService.suggest(value, {
      entityName: 'TaxonGroup',
      levelId,
      searchAttribute: options && options.searchAttribute,
      excludedIds: (this.$taxonGroups.getValue() || []).map((tg) => tg && tg.id).filter(isNotNil),
    });
  }

  getPmfmValueColor(pmfmValue: any, pmfm: IPmfm, data: Sample): AppColors {
    switch (pmfm.id) {
      case PmfmIds.OUT_OF_SIZE_PCT:
        if (isNotNil(pmfmValue)) {
          if (+pmfmValue >= 15) return 'danger';
          if (+pmfmValue >= 10) return 'warning900';
          if (+pmfmValue >= 5) return 'warning';
          return 'success';
        }
        break;

      case PmfmIds.COMPLIANT_PRODUCT:
        if (toBoolean(pmfmValue) === false) {
          return 'danger';
        } else {
          return 'success';
        }

      case PmfmIds.INDIVIDUALS_DENSITY_PER_KG: {
        const auctionDensityCategory = data.measurementValues[PmfmIds.AUCTION_DENSITY_CATEGORY]?.label;

        if (isNotNil(pmfmValue) && auctionDensityCategory) {
          const [min, max] = auctionDensityCategory.split(/[\\/|-]/, 2);
          if (isNumber(min) && isNumber(max)) {
            // Must be greater than the min and strictly lesser than the max
            if (pmfmValue < min || pmfmValue >= max) {
              return 'danger';
            } else {
              return 'success';
            }
          }
        }
        break;
      }
    }

    return null;
  }

  translateFormPath(path: string, opts?: IDataFormPathTranslatorOptions): string {
    // Redirect pmfm control path, to the landing form
    if (PMFM_ID_REGEXP.test(path)) {
      path = `measurementValues.${path}`;
    }
    return this.landingForm.translateFormPath(path, opts);
  }

  async setValue(data: Landing): Promise<void> {
    // Clean invalid sample label
    (data.samples || []).forEach((sample) => {
      if (sample.label?.startsWith('#')) sample.label = '';
    });

    // Fill form and table
    await super.setValue(data);

    if (isNotEmptyArray(data.samples)) {
      let taxonGroup = (isNotEmptyArray(data.samples) && data.samples[0].taxonGroup) || null;
      taxonGroup = (taxonGroup && data.samples.findIndex((s) => !ReferentialUtils.equals(taxonGroup, s.taxonGroup)) === -1 && taxonGroup) || null;
      this.taxonGroupControl.setValue(taxonGroup);
    }
  }

  async getValue(): Promise<Landing> {
    let data = await super.getValue();

    // Convert into entity
    data = Landing.fromObject(data);

    if (this.showSamplesTable && data.samples) {
      const taxonGroup = this.taxonGroupControl.value;
      // Apply the selected taxon group, if any
      if (ReferentialUtils.isNotEmpty<TaxonGroupRef>(taxonGroup)) {
        (data.samples || []).forEach((sample) => (sample.taxonGroup = taxonGroup));
      }

      // CLean invalid sample label
      (data.samples || []).forEach((sample) => {
        if (sample.label?.startsWith('#') || isNil(sample.label)) sample.label = '';
      });
    }
    // Reset samples, if no taxon group
    else {
      data.samples = [];
    }

    if (data.trip) {
      // Force trip to be undefined (unused)
      data.trip = undefined;
    }

    return data;
  }

  /* -- protected method -- */

  protected async computeTitle(data: Landing): Promise<string> {
    const titlePrefix =
      (this.parent &&
        this.parent instanceof ObservedLocation &&
        (await firstValueFrom(
          this.translate.get('AUCTION_CONTROL.TITLE_PREFIX', {
            location: this.parent.location && (this.parent.location.name || this.parent.location.label),
            date: (this.parent.startDateTime && (this.dateFormat.transform(this.parent.startDateTime) as string)) || '',
          })
        ))) ||
      '';

    // new data
    if (!data || (isNil(data.id) && ReferentialUtils.isEmpty(data.vesselSnapshot))) {
      return titlePrefix + this.translate.instant('AUCTION_CONTROL.NEW.TITLE');
    }

    // Existing data
    return (
      titlePrefix +
      this.translate.instant('AUCTION_CONTROL.EDIT.TITLE', {
        vessel: data.vesselSnapshot && (`${data.vesselSnapshot.exteriorMarking} - ${data.vesselSnapshot.name}` || data.vesselSnapshot.name),
      })
    );
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      icon: 'flag',
    };
  }

  protected computePageUrl(id: number | 'new') {
    const parentUrl = this.getParentPageUrl();
    return `${parentUrl}/control/${id}`;
  }

  protected registerSampleRowValidator(form: UntypedFormGroup, pmfms: IPmfm[]): Subscription {
    // DEBUG
    // console.debug('[auction-control-page] Adding row validator');
    return AuctionControlValidators.addSampleValidators(form, pmfms, { markForCheck: () => this.markForCheck() });
  }

  protected getFirstInvalidTabIndex(): number {
    return this.landingForm.invalid && !this.landingForm.measurementValuesForm.invalid
      ? 0
      : this.samplesTable.invalid || this.landingForm.measurementValuesForm.invalid
        ? 1
        : -1;
  }
}
