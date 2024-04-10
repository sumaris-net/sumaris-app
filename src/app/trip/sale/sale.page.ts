import { AfterViewInit, ChangeDetectionStrategy, Component, inject, Injector, OnInit, Optional, ViewChild } from '@angular/core';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import {
  AppEditorOptions,
  DateUtils,
  EntityServiceLoadOptions,
  EntityUtils,
  equals,
  fadeInOutAnimation,
  firstNotNilPromise,
  fromDateISOString,
  HistoryPageReference,
  isNil,
  isNotEmptyArray,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
  toNumber,
  TranslateContextService,
  UsageMode,
} from '@sumaris-net/ngx-components';
import { SaleForm } from './sale.form';
import { SaleService } from './sale.service';
import { RootDataEditorOptions, RootDataEntityEditorState } from '@app/data/form/root-data-editor.class';
import { UntypedFormGroup } from '@angular/forms';
import { TripService } from '../trip/trip.service';
import { debounceTime, filter, map, tap, throttleTime } from 'rxjs/operators';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Sale } from './sale.model';
import { Trip } from '../trip/trip.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Program } from '@app/referential/services/model/program.model';
import { STRATEGY_SUMMARY_DEFAULT_I18N_PREFIX, StrategySummaryCardComponent } from '@app/data/strategy/strategy-summary-card.component';
import { from, merge, Observable } from 'rxjs';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { AcquisitionLevelCodes, AcquisitionLevelType } from '@app/referential/services/model/model.enum';
import { OBSERVED_LOCATION_FEATURE_NAME } from '@app/trip/trip.config';
import { SaleFilter } from './sale.filter';

import { APP_DATA_ENTITY_EDITOR, DataStrategyResolution } from '@app/data/form/data-editor.utils';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { RxState } from '@rx-angular/state';
import { RxStateProperty } from '@app/shared/state/state.decorator';
import { AppDataEntityEditor } from '@app/data/form/data-editor.class';
import { FishingAreaForm } from '@app/data/fishing-area/fishing-area.form';
import { AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { LandingService } from '@app/trip/landing/landing.service';
import { Landing } from '@app/trip/landing/landing.model';
import { IBatchTreeComponent } from '@app/trip/batch/tree/batch-tree.component';

export class SaleEditorOptions extends RootDataEditorOptions {}

export interface SalePageState extends RootDataEntityEditorState {
  strategyLabel: string;
}
export const SalesPageSettingsEnum = {
  PAGE_ID: 'sale',
  FILTER_KEY: AppRootTableSettingsEnum.FILTER_KEY,
  FEATURE_NAME: OBSERVED_LOCATION_FEATURE_NAME,
}; //todo mf to be check
@Component({
  selector: 'app-sale-page',
  templateUrl: './sale.page.html',
  styleUrls: ['./sale.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInOutAnimation],
  providers: [
    { provide: APP_DATA_ENTITY_EDITOR, useExisting: SalePage },
    {
      provide: AppEditorOptions,
      useValue: {
        pathIdAttribute: 'saleId',
      },
    },
    RxState,
  ],
})
export class SalePage<ST extends SalePageState = SalePageState>
  extends AppDataEntityEditor<Sale, SaleService, number, ST>
  implements OnInit, AfterViewInit
{
  static TABS = {
    GENERAL: 0,
    BATCHES: 1,
  };
  protected parent: Trip | Landing;
  protected tripService = inject(TripService);
  protected landingService = inject(LandingService);
  protected pmfmService = inject(PmfmService);
  protected referentialRefService = inject(ReferentialRefService);
  protected vesselSnapshotService = inject(VesselSnapshotService);
  protected translateContext = inject(TranslateContextService);
  protected selectedSubTabIndex = 0;
  showParent = false;
  showEntityMetadata = false;
  showQualityForm = false;
  showFishingArea = false;
  enableReport = false;
  parentAcquisitionLevel: AcquisitionLevelType;
  showBatchTablesByProgram = false;
  showBatchTables = true;
  @RxStateProperty() strategyLabel: string;

  get form(): UntypedFormGroup {
    return this.saleForm.form;
  }

  get showCatchTab(): boolean {
    return this.showBatchTablesByProgram && this.showBatchTables;
  }

  @ViewChild('saleForm', { static: true }) saleForm: SaleForm;
  @ViewChild('fishingAreaForm', { static: true }) fishingAreaForm: FishingAreaForm;
  @ViewChild('strategyCard', { static: false }) strategyCard: StrategySummaryCardComponent;

  // Catch batch, sorting batches, individual measure
  @ViewChild('batchTree', { static: true }) batchTree: IBatchTreeComponent;

  constructor(injector: Injector, @Optional() options: SaleEditorOptions) {
    super(injector, Sale, injector.get(SaleService), {
      pathIdAttribute: 'saleId',
      tabCount: 2,
      i18nPrefix: 'SALE.EDIT.',
      enableListenChanges: true,
      acquisitionLevel: AcquisitionLevelCodes.SALE,
      settingsId: AcquisitionLevelCodes.SALE.toLowerCase(),
      ...options,
    });
    this.parentAcquisitionLevel = this.route.snapshot.queryParamMap.get('parent') as AcquisitionLevelType;
    this.showParent = !!this.parentAcquisitionLevel;

    // FOR DEV ONLY ----
    this.logPrefix = '[sale-page] ';
  }

  ngOnInit() {
    super.ngOnInit();

    // Update the data context
    this.registerSubscription(
      merge(this.selectedTabIndexChange.pipe(filter((tabIndex) => tabIndex === SalePage.TABS.BATCHES && this.showBatchTables)), from(this.ready()))
        .pipe(debounceTime(500), throttleTime(500))
        .subscribe((_) => this.updateDataContext())
    );
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    // Manage sub tab group
    const queryParams = this.route.snapshot.queryParams;
    this.selectedSubTabIndex = (queryParams['subtab'] && parseInt(queryParams['subtab'])) || 0;
  }

  canUserWrite(data: Sale, opts?: any): boolean {
    return isNil(this.parent?.validationDate) && super.canUserWrite(data, opts);
  }

  async reload(): Promise<void> {
    this.markAsLoading();
    const route = this.route.snapshot;
    await this.load(this.data && this.data.id, route.params);
  }

  protected watchStrategyFilter(program: Program): Observable<Partial<StrategyFilter>> {
    console.debug(this.logPrefix + 'watchStrategyFilter', this.acquisitionLevel);
    if (this.strategyResolution === 'user-select') {
      return this._state
        .select(['acquisitionLevel', 'strategyLabel'], (s) => s)
        .pipe(
          // DEBUG
          tap((s) => console.debug(this.logPrefix + 'Received strategy label: ', s)),
          map(({ acquisitionLevel, strategyLabel }) => {
            return <Partial<StrategyFilter>>{
              acquisitionLevel,
              programId: program.id,
              label: strategyLabel,
            };
          })
        );
    }

    return super.watchStrategyFilter(program);
  }

  async updateView(
    data: Sale | null,
    opts?: {
      emitEvent?: boolean;
      openTabIndex?: number;
      updateRoute?: boolean;
    }
  ) {
    await super.updateView(data, opts);

    // this.saleForm.showParent = this.showParent;
    // this.saleForm.parentAcquisitionLevel = this.parentAcquisitionLevel;

    if (this.parent) {
      // Parent is a trip
      if (this.parent instanceof Trip) {
        this.saleForm.showProgram = false;
        this.saleForm.showVessel = false;
        this.showFishingArea = false;
      }

      // Parent is a landing
      else if (this.parent instanceof Landing) {
        this.saleForm.showProgram = false;
        this.saleForm.showVessel = true;
        this.showFishingArea = true;
      }
    }
    // No parent defined
    else {
      // If show parent
      if (this.showParent) {
        console.warn('[sale-page] Sale without parent: show parent field');
        // this.saleForm.showProgram = false;
        this.saleForm.showVessel = true;
        // this.saleForm.showLocation = false;
        // this.saleForm.showDateTime = false;
        this.showQualityForm = true;
        this.showFishingArea = false;
      }
      // Sale is root
      else {
        console.warn('[sale-page] Sale as ROOT has not been tested !');
        // this.saleForm.showProgram = true;
        this.saleForm.showVessel = true;
        this.saleForm.showLocation = true;
        // this.saleForm.showDateTime = true;
        this.showQualityForm = true;
        this.showFishingArea = false;
      }
    }

    if (!this.isNewData && this.requiredStrategy) {
      // this.saleForm.canEditStrategy = false;
    }
    this.defaultBackHref = this.computeDefaultBackHref();

    if (!opts || opts.emitEvent !== false) {
      this.markForCheck();
    }
  }

  async openReport(event: Event) {
    if (this.dirty) {
      const data = await this.saveAndGetDataIfValid();
      if (!data) return; // Cancel
    }
    return this.router.navigateByUrl(this.computePageUrl(this.data.id) + '/report');
  }

  /* -- protected methods  -- */

  protected registerForms() {
    this.addChildForms([this.saleForm, this.fishingAreaForm, this.batchTree]);
  }

  protected async onNewEntity(data: Sale, options?: EntityServiceLoadOptions): Promise<void> {
    const queryParams = this.route.snapshot.queryParams;

    // DEBUG
    //console.debug('DEV - Creating new sale entity');

    // Mask quality cards
    this.showEntityMetadata = false;
    this.showQualityForm = false;

    if (this.isOnFieldMode) {
      data.startDateTime = DateUtils.moment();
    }

    // Fill parent ids
    data.tripId = toNumber(options?.tripId, undefined);
    data.landingId = toNumber(options?.landingId, undefined);

    // Set rankOrder
    if (isNotNil(queryParams['rankOrder'])) {
      data.rankOrder = +queryParams['rankOrder'];
    } else {
      data.rankOrder = 1;
    }

    // Fill defaults, from table's filter.
    const tableId = this.queryParams['tableId'];
    const searchFilter = tableId && this.settings.getPageSettings<SaleFilter>(tableId, SalesPageSettingsEnum.FILTER_KEY);
    if (searchFilter) {
      // Synchronization status
      if (searchFilter.synchronizationStatus && searchFilter.synchronizationStatus !== 'SYNC') {
        data.synchronizationStatus = 'DIRTY';
      }

      // program
      if (searchFilter.program && searchFilter.program.label) {
        data.program = ReferentialRef.fromObject(searchFilter.program);
      }

      // Location
      // if (searchFilter.location && this.saleForm.showLocation) {
      //   data.location = ReferentialRef.fromObject(searchFilter.location);
      // }

      // Strategy
      if (searchFilter.strategy) {
        // data.strategy = Strategy.fromObject(searchFilter.strategy);
      }
    }

    // Load parent
    this.parent = await this.loadParent(data);

    await this.fillPropertiesFromParent(data, this.parent);

    // Get contextual strategy
    const contextualStrategy = this.context.getValue('strategy') as Strategy;
    const strategyLabel = contextualStrategy?.label || queryParams['strategyLabel'];
    // if (strategyLabel) {
    //   data.measurementValues = data.measurementValues || {};
    //   data.measurementValues[PmfmIds.STRATEGY_LABEL] = strategyLabel;
    //   if (EntityUtils.isEmpty(data.strategy, 'id')) {
    //     data.strategy = contextualStrategy || (await this.strategyRefService.loadByLabel(strategyLabel));
    //   }
    // }

    // Emit program, strategy
    const programLabel = data.program?.label;
    if (programLabel) this.programLabel = programLabel;
    if (strategyLabel) this.strategyLabel = strategyLabel;
  }

  protected async onEntityLoaded(data: Sale, options?: EntityServiceLoadOptions): Promise<void> {
    this.parent = await this.loadParent(data);

    // Copy not fetched data
    if (this.parent) {
      // Set program using parent's program, if not already set
      data.program = ReferentialUtils.isNotEmpty(data.program) ? data.program : this.parent.program;
      data.observers = (isNotEmptyArray(data.observers) && data.observers) || this.parent.observers;

      if (this.parent instanceof Trip) {
        data.saleLocation = data.saleLocation || this.parent.returnLocation || this.parent.departureLocation;
        // data.dateTime = data.dateTime || this.parent.startDateTime || this.parent.endDateTime;
        data.trip = this.showParent ? this.parent : undefined;
        data.tripId = this.showParent ? null : this.parent.id;
        data.landingId = undefined;
      } else if (this.parent instanceof Landing) {
        data.saleLocation = data.saleLocation || this.parent.location;
        // data.dateTime = data.dateTime || this.parent.startDateTime || this.parent.endDateTime;
        data.landing = this.showParent ? this.parent : undefined;
        data.landingId = this.showParent ? null : this.parent.id;
        data.tripId = undefined;
      }

      this.showEntityMetadata = EntityUtils.isRemote(data);
      this.showQualityForm = false;
    }
    // Sale as root
    else {
      this.showEntityMetadata = EntityUtils.isRemote(data);
      this.showQualityForm = this.showEntityMetadata;
    }

    // const strategyLabel = data.measurementValues && data.measurementValues[PmfmIds.STRATEGY_LABEL];
    // this.saleForm.canEditStrategy = isNil(strategyLabel) || isEmptyArray(data.samples);

    // Emit program, strategy
    const programLabel = data.program?.label;
    if (programLabel) this.programLabel = programLabel;
    // if (strategyLabel) this.strategyLabel = strategyLabel;
  }

  protected async onParentChanged(parent: Trip | Landing) {
    if (!equals(parent, this.parent)) {
      console.debug('[sale] Parent changed to: ', parent);
      this.parent = parent;

      // Update data (copy some properties)
      if (this.loaded && !this.saving) {
        const data = await this.getValue();
        await this.fillPropertiesFromParent(data, parent);
        await this.setValue(data);
        this.markAsDirty();
      }
    }
  }

  protected async fillPropertiesFromParent(data: Sale, parent: Trip | Landing) {
    // DEBUG
    console.debug('[sale-page] Fill some properties from parent', parent);

    const queryParams = this.route.snapshot.queryParams;

    if (parent) {
      // Copy parent program and observers
      data.program = parent.program;
      data.observers = parent.observers;

      if (parent instanceof Trip) {
        // data.trip = this.showParent ? parent : undefined;
        data.vesselSnapshot = parent.vesselSnapshot;
        data.saleLocation = parent.returnLocation || parent.departureLocation;
        // data.dateTime = parent.returnDateTime || parent.departureDateTime;
        data.landing = undefined;
        data.landingId = undefined;
      } else if (parent instanceof Landing) {
        // data.observedLocation = this.showParent ? parent : undefined;
        data.landingId = this.showParent ? null : this.parent.id;
        // TODO enable this ?
        //data.saleLocation = (this.saleForm.showLocation && data.location) || parent.location;
        //data.startDateTime = (this.saleForm.showDateTime && data.dateTime) || parent.startDateTime || parent.endDateTime;
        data.landing = undefined;
        data.tripId = undefined;

        // Load the vessel, if any
        if (isNotNil(queryParams['vessel']) && !data.vesselSnapshot) {
          const vesselId = +queryParams['vessel'];
          console.debug(`[sale-page] Loading vessel {${vesselId}}...`);
          data.vesselSnapshot = await this.vesselSnapshotService.load(vesselId, { fetchPolicy: 'cache-first' });
        }
      }
    }

    // No parent
    else {
      const contextualProgram = this.context.getValue('program');
      const programLabel = data.program?.label || contextualProgram?.label || queryParams['program'];
      if (programLabel && EntityUtils.isEmpty(data?.program, 'id')) {
        data.program = contextualProgram || (await this.programRefService.loadByLabel(programLabel));
      }
    }
  }

  protected computeDefaultBackHref() {
    if (this.parent && !this.showParent) {
      // Back to parent trip
      if (this.parent instanceof Trip) {
        return `/trips/${this.parent.id}?tab=2`;
      }

      // Back to parent landing
      else if (this.parent instanceof Landing) {
        return `/observations/${this.parent.id}?tab=1`;
      }
    }
    if (this.parentAcquisitionLevel) {
      // Back to entity table
      switch (this.parentAcquisitionLevel) {
        case 'OBSERVED_LOCATION':
          return `/observations/landings`;
        default:
          throw new Error('Cannot compute the back href, for parent ' + this.parentAcquisitionLevel);
      }
    }
  }

  protected async setProgram(program: Program) {
    if (!program) return; // Skip

    const showStrategy =
      program.getPropertyAsBoolean(ProgramProperties.LANDING_STRATEGY_ENABLE) ||
      program.getProperty<DataStrategyResolution>(ProgramProperties.DATA_STRATEGY_RESOLUTION) === 'user-select';
    const isNewData = this.isNewData;
    const requiredStrategy = showStrategy && !isNewData;

    this.requiredStrategy = requiredStrategy;
    this.strategyResolution = showStrategy ? 'user-select' : program.getProperty<DataStrategyResolution>(ProgramProperties.DATA_STRATEGY_RESOLUTION);

    // Customize the UI, using program options
    // this.saleForm.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_LOCATION_LEVEL_IDS);
    // this.saleForm.allowAddNewVessel = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CREATE_VESSEL_ENABLE);
    // this.saleForm.showStrategy = showStrategy;
    // this.saleForm.requiredStrategy = requiredStrategy;
    // this.saleForm.canEditStrategy = showStrategy && isNewData;
    // this.saleForm.showObservers = program.getPropertyAsBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE);
    // this.saleForm.showDateTime = program.getPropertyAsBoolean(ProgramProperties.LANDING_DATE_TIME_ENABLE);
    // this.saleForm.showLocation = program.getPropertyAsBoolean(ProgramProperties.LANDING_LOCATION_ENABLE);
    // this.saleForm.fishingAreaLocationLevelIds = program.getPropertyAsNumbers(ProgramProperties.LANDING_FISHING_AREA_LOCATION_LEVEL_IDS);

    // Compute i18n prefix
    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix && i18nSuffix !== 'legacy' ? i18nSuffix : this.i18nContext?.suffix || '';
    this.i18nContext.suffix = i18nSuffix;
    this.saleForm.i18nSuffix = i18nSuffix;

    this.enableReport = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_REPORT_ENABLE);
    this.showBatchTablesByProgram = program.getPropertyAsBoolean(ProgramProperties.SALE_BATCH_ENABLE);

    if (this.strategyCard) {
      this.strategyCard.i18nPrefix = STRATEGY_SUMMARY_DEFAULT_I18N_PREFIX + i18nSuffix;
    }

    if (this.batchTree) this.batchTree.program = program;

    // Emit ready event (should allow children forms to apply value)
    // If strategy is required, markAsReady() will be called in setStrategy()
    if (!requiredStrategy || (isNewData && this.strategyResolution === 'user-select')) {
      this.markAsReady();
    }

    // Listen program's strategies change (will reload strategy if need)
    // if (this.network.online) {
    //   this.startListenProgramRemoteChanges(program);
    //   this.startListenStrategyRemoteChanges(program);
    // }
  }

  protected async setStrategy(strategy: Strategy, opts?: { emitReadyEvent?: boolean }) {
    console.log(this.logPrefix + 'Setting strategy', strategy);
    await super.setStrategy(strategy);

    const program = this.program;
    if (!strategy || !program) return; // Skip if empty

    // Configure batch tree - TODO
    // if (this.samplesTable && this.samplesTable.acquisitionLevel) {
    //   this.samplesTable.strategyLabel = strategy.label;
    //   const taxonNameStrategy = firstArrayValue(strategy.taxonNames);
    //   this.samplesTable.defaultTaxonName = taxonNameStrategy && taxonNameStrategy.taxonName;
    //   this.samplesTable.showTaxonGroupColumn = false;
    //
    //   // Load strategy's pmfms
    //   await this.setTablePmfms(this.samplesTable, program.label, strategy.label);
    // }

    this.markAsReady();
    this.markForCheck();
  }

  protected async loadParent(data: Sale): Promise<Landing | Trip> {
    let parent: Landing | Trip;

    if (isNotNil(data.tripId)) {
      console.debug(`[sale-page] Loading parent trip #${data.tripId} ...`);
      parent = await this.tripService.load(data.tripId, { fetchPolicy: 'cache-first' });
    } else if (isNotNil(data.landingId)) {
      console.debug(`[sale-page] Loading parent landing #${data.landingId} ...`);
      parent = await this.landingService.load(data.landingId, { fetchPolicy: 'cache-first' });
    }

    return parent;
  }

  protected async setValue(data: Sale): Promise<void> {
    if (!data) return; // Skip

    await this.saleForm.setValue(data);

    const jobs: Promise<any>[] = [];

    this.fishingAreaForm.value = data.fishingAreas?.[0] || {};

    // Set batch tree
    if (this.batchTree) {
      this.batchTree.requiredStrategy = this.requiredStrategy;
      this.batchTree.strategyId = this.strategy?.id;
      jobs.push(this.batchTree.setValue(data?.catchBatch || null));
    }

    await Promise.all(jobs);

    console.debug('[operation] children setValue() [OK]');
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      icon: 'boat',
    };
  }

  protected async computeTitle(data: Sale): Promise<string> {
    const program = await firstNotNilPromise(this.program$, { stop: this.destroySubject });
    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = (i18nSuffix !== 'legacy' && i18nSuffix) || '';

    let titlePrefix = '';

    if (this.parent instanceof Trip) {
      // TODO
    } else if (this.parent instanceof Landing) {
      titlePrefix = this.translate.instant('SALE.TITLE_PREFIX', {
        location: this.parent.location?.name || this.parent.location?.label || '',
        date: this.dateFormat.transform(this.parent.dateTime) as string,
      });

      // TODO Add taxonName, form landing.measurementValues[PmfmIds.TAXON_GROUP] ?
    }

    // new data
    if (!data || isNil(data.id)) {
      return titlePrefix + this.translateContext.instant(`SALE.NEW.TITLE`, i18nSuffix);
    }

    // Existing data
    return (
      titlePrefix +
      this.translateContext.instant(`SALE.EDIT.TITLE`, i18nSuffix, {
        vessel: data.vesselSnapshot && (data.vesselSnapshot.exteriorMarking || data.vesselSnapshot.name),
      })
    );
  }

  protected computePageUrl(id: number | 'new') {
    const parentUrl = this.getParentPageUrl();
    return `${parentUrl}/sale/${id}`;
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.saleForm.invalid) return 0;
    // if (this.samplesTable.invalid || this.samplesTable.error) return 1;
    return -1;
  }

  protected computeUsageMode(sale: Sale): UsageMode {
    return this.settings.isUsageMode('FIELD') &&
      // Force desktop mode if sale date/time is 1 day later than now
      (isNil(sale && sale.startDateTime) || sale.startDateTime.diff(DateUtils.moment(), 'day') <= 1)
      ? 'FIELD'
      : 'DESK';
  }

  protected async getValue(): Promise<Sale> {
    // DEBUG
    //console.debug('[sale-page] getValue()');

    const data = await super.getValue();

    // Batches
    if (this.showBatchTables && this.batchTree) {
      // Do not need to save here, because editor should do it
      //await this.batchTree.save();

      // Get batch tree,rom the batch tree component
      data.catchBatch = this.batchTree.value;

      // Make sure to clean species groups, if not batch enable
      if (!this.showBatchTables) {
        data.catchBatch.children = undefined;
      }
    } else {
      data.catchBatch = undefined;
    }

    // DEBUG
    //console.debug('[sale-page] DEV check getValue() result:', data);

    return data;
  }

  protected async getJsonValueToSave(): Promise<any> {
    const json = await super.getJsonValueToSave();

    const fishingAreaJson = this.fishingAreaForm.value;
    json.fishingAreas = fishingAreaJson ? [fishingAreaJson] : [];

    // Add program, because can be disabled
    json.program = this.data.program?.asObject() || json.program;

    return json;
  }

  /**
   * Update context, for batch validator
   *
   * @protected
   */
  protected updateDataContext() {
    console.debug('[sale-page] Updating data context...');

    // Date
    const date = this.saleForm.startDateTimeControl?.value;
    this.context.setValue('date', fromDateISOString(date));

    // Fishing area
    if (this.showFishingArea) {
      const fishingArea = this.fishingAreaForm?.value;
      const fishingAreas = fishingArea ? [fishingArea] : this.data?.fishingAreas;
      this.context.setValue('fishingAreas', fishingAreas);
    }

    this.context.resetValue('vesselPositions');
  }
}
