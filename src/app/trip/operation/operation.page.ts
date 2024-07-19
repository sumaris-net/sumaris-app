import { AfterViewInit, ChangeDetectionStrategy, Component, inject, Injector, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { OperationSaveOptions, OperationService } from './operation.service';
import { OperationForm } from './operation.form';
import { TripService } from '../trip/trip.service';
import { MapPmfmEvent, MeasurementsForm } from '@app/data/measurement/measurements.form.component';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import {
  AppErrorWithDetails,
  AppFormUtils,
  AppHelpModal,
  AppHelpModalOptions,
  DateUtils,
  EntityServiceLoadOptions,
  EntityUtils,
  equals,
  fadeInOutAnimation,
  FilesUtils,
  firstNotNilPromise,
  fromDateISOString,
  HistoryPageReference,
  Hotkeys,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  MINIFY_ENTITY_FOR_LOCAL_STORAGE,
  PlatformService,
  ReferentialRef,
  ReferentialUtils,
  sleep,
  toBoolean,
  toInt,
  toNumber,
  UsageMode,
  WaitForOptions,
} from '@sumaris-net/ngx-components';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, startWith, switchMap, takeUntil, tap, throttleTime } from 'rxjs/operators';
import { UntypedFormGroup, Validators } from '@angular/forms';
import { Moment } from 'moment';
import { Program } from '@app/referential/services/model/program.model';
import { Operation, OperationUtils, Trip } from '../trip/trip.model';
import { OperationPasteFlags, ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, AcquisitionLevelType, PmfmIds, QualitativeLabels, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { IBatchTreeComponent } from '../batch/tree/batch-tree.component';
import { from, merge, Observable, of, Subscription, timer } from 'rxjs';
import { MeasurementUtils } from '@app/data/measurement/measurement.model';
import { ModalController } from '@ionic/angular';
import { SampleTreeComponent } from '@app/trip/sample/sample-tree.component';
import { IPmfmForm, OperationValidators } from '@app/trip/operation/operation.validator';
import { TripContextService } from '@app/trip/trip-context.service';
import { IDataEntityQualityService } from '@app/data/services/data-quality-service.class';
import { ContextService } from '@app/shared/context.service';
import { Geometries } from '@app/shared/geometries.utils';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { flagsToString, removeFlag } from '@app/shared/flags.utils';
import { PositionUtils } from '@app/data/position/position.utils';
import { RxState } from '@rx-angular/state';
import { TripPage } from '@app/trip/trip/trip.page';
import { PredefinedColors } from '@ionic/core';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';
import { RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';
import { ExtractionType } from '@app/extraction/type/extraction-type.model';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { AppDataEditorOptions, AppDataEditorState, AppDataEntityEditor } from '@app/data/form/data-editor.class';
import { APP_DATA_ENTITY_EDITOR, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { VesselPosition } from '@app/data/position/vessel/vessel-position.model';
import { Batch } from '@app/trip/batch/common/batch.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import moment from 'moment/moment';

export interface OperationState extends AppDataEditorState {
  hasIndividualMeasures?: boolean;
  physicalGear: PhysicalGear;
  gearId: number;
  tripId: number;
  trip: Trip;
  lastOperations: Operation[];
  lastEndDate: Moment;
}

@Component({
  selector: 'app-operation-page',
  templateUrl: './operation.page.html',
  styleUrls: ['./operation.page.scss'],
  animations: [fadeInOutAnimation],
  providers: [{ provide: APP_DATA_ENTITY_EDITOR, useExisting: OperationPage }, { provide: ContextService, useExisting: TripContextService }, RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationPage<S extends OperationState = OperationState>
  extends AppDataEntityEditor<Operation, OperationService, number, S>
  implements IDataEntityQualityService<Operation>, AfterViewInit, OnInit, OnDestroy
{
  protected static TABS = {
    GENERAL: 0,
    CATCH: 1,
    SAMPLE: 2,
  };

  private _lastOperationsTripId: number;
  private _measurementSubscription: Subscription;
  private _sampleRowSubscription: Subscription;
  private _forceMeasurementAsOptionalOnFieldMode = false;

  @RxStateSelect() protected readonly hasIndividualMeasures$: Observable<boolean>;
  @RxStateSelect() protected readonly physicalGear$: Observable<PhysicalGear>;
  @RxStateSelect() protected readonly gearId$: Observable<number>;
  @RxStateSelect() protected readonly lastOperations$: Observable<Operation[]>;
  @RxStateSelect() protected readonly lastEndDate$: Observable<Moment>;

  protected readonly tripService = inject(TripService);
  protected readonly tripContext = inject(TripContextService);
  protected readonly referentialRefService = inject(ReferentialRefService);
  protected readonly modalCtrl = inject(ModalController);
  protected readonly hotkeys = inject(Hotkeys);
  protected readonly platformService = inject(PlatformService);

  protected readonly dateTimePattern: string;
  protected readonly showLastOperations: boolean;
  protected readonly xsMobile: boolean;

  saveOptions: OperationSaveOptions = {};
  selectedSubTabIndex = 0;
  allowParentOperation = false;
  autoFillBatch = false;
  autoFillDatesFromTrip = false;
  displayAttributes: {
    gear?: string[];
    [key: string]: string[];
  } = {};
  toolbarColor: PredefinedColors = 'primary';
  canDownload = false;

  // All second tabs components are disabled, by default (waiting PMFM measurements to decide that to show)
  showCatchTab = false;
  showSamplesTab = false;
  showBatchTables = false;
  showBatchTablesByProgram = true;
  showSampleTablesByProgram = false;
  isDuplicatedData = false;
  operationPasteFlags: number;
  helpUrl: string;
  _defaultIsParentOperation = true;
  readonly forceOptionalExcludedPmfmIds: number[];

  @RxStateProperty() tripId: number;
  @RxStateProperty() trip: Trip;
  @RxStateProperty() physicalGear: PhysicalGear;
  @RxStateProperty() lastEndDate: Moment;
  @RxStateProperty() hasIndividualMeasures: boolean;

  get form(): UntypedFormGroup {
    return this.opeForm.form;
  }

  get showFabButton(): boolean {
    if (!this._enabled) return false;
    switch (this._selectedTabIndex) {
      case OperationPage.TABS.CATCH:
        return this.showBatchTables;
      case OperationPage.TABS.SAMPLE:
        return this.showSamplesTab;
      default:
        return false;
    }
  }

  get forceMeasurementAsOptional(): boolean {
    return this._forceMeasurementAsOptionalOnFieldMode && this.isOnFieldMode;
  }

  /**
   * Allow to override function from OperationService, by passing the trip into options
   */
  get entityQualityService(): IDataEntityQualityService<Operation> {
    return this;
  }

  get canDuplicate(): boolean {
    return this.operationPasteFlags !== 0;
  }

  @ViewChild('opeForm', { static: true }) opeForm: OperationForm;
  @ViewChild('measurementsForm', { static: true }) measurementsForm: MeasurementsForm;

  // Catch batch, sorting batches, individual measure
  @ViewChild('batchTree', { static: true }) batchTree: IBatchTreeComponent;

  // Sample tables
  @ViewChild('sampleTree', { static: true }) sampleTree: SampleTreeComponent;

  constructor(injector: Injector, dataService: OperationService, @Optional() options?: AppDataEditorOptions) {
    super(injector, Operation, dataService, {
      pathIdAttribute: 'operationId',
      tabCount: 3,
      i18nPrefix: 'TRIP.OPERATION.EDIT.',
      acquisitionLevel: AcquisitionLevelCodes.OPERATION,
      ...options,
    });

    this.dateTimePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');
    this.displayAttributes.gear = this.settings.getFieldDisplayAttributes('gear');
    this.xsMobile = this.mobile && !this.platformService.is('tablet');

    // Init defaults
    this.showLastOperations = this.settings.isUsageMode('FIELD');
    this.tripId = toInt(this.route.snapshot.params['tripId']);
    this.forceOptionalExcludedPmfmIds = [
      PmfmIds.SURVIVAL_SAMPLING_TYPE,
      PmfmIds.HAS_ACCIDENTAL_CATCHES,
      // Let the user save OP, even if not set
      //PmfmIds.HAS_INDIVIDUAL_MEASURES
    ];
    this._defaultIsParentOperation = this.route.snapshot.queryParams['type'] !== 'child';

    // Get paste flags from clipboard, if related to Operation
    const clipboard = this.context?.clipboard;
    this.operationPasteFlags = toNumber(clipboard?.pasteFlags, 0);

    // Add shortcut
    if (!this.mobile) {
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'f1', description: 'COMMON.BTN_SHOW_HELP', preventDefault: true })
          .subscribe((event) => this.openHelpModal(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'control.+', description: 'COMMON.BTN_ADD', preventDefault: true })
          .pipe(filter((_) => !this.disabled && this.showFabButton))
          .subscribe((event) => this.onNewFabButtonClick(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'control.o', description: 'QUALITY.BTN_CONTROL', preventDefault: true })
          .pipe(filter(() => !this.disabled))
          .subscribe(() => this.saveAndControl())
      );
    }

    // Watch program, to configure tables from program properties
    this._state.connect(
      'program',
      this._state.select('programLabel').pipe(
        filter(isNotNilOrBlank),
        switchMap((programLabel: string) => {
          // Try to load by context
          const contextualProgram = this.context?.program;
          if (contextualProgram?.label === programLabel) {
            return of(contextualProgram);
          }
          // Load by service
          return this.programRefService.watchByLabel(programLabel, { debug: this.debug });
        })
      )
    );

    // Apply program
    this._state.hold(this._state.select('program'), (program) => {
      // Update the context (to avoid a reload, when opening the another operation)
      if (this.context && this.context.program !== program) {
        this.context.setValue('program', program);
      }

      return this.setProgram(program);
    });

    // Watch trip
    this._state.connect(
      'lastOperations',
      this._state.select('tripId').pipe(
        // Only if tripId changes
        filter((tripId) => isNotNil(tripId) && this._lastOperationsTripId !== tripId),

        // Update default back Href
        tap((tripId) => {
          this._lastOperationsTripId = tripId; // Remember new trip id
          // Update back href
          const tripHref = `/trips/${tripId}?tab=${TripPage.TABS.OPERATIONS}`;
          if (this.defaultBackHref !== tripHref) {
            this.defaultBackHref = tripHref;
            this.markForCheck();
          }
        }),

        // Load last operations
        filter(isNotNil),
        switchMap((tripId) =>
          this.dataService.watchAll(
            0,
            this.showLastOperations ? 5 : 1, // Load one if only need to fill defaults
            'startDateTime',
            'desc',
            { tripId },
            {
              withBatchTree: false,
              withSamples: false,
              computeRankOrder: false,
              withTotal: true,
              fetchPolicy: 'cache-and-network',
            }
          )
        ),
        map((res) => (res && res.data) || [])
      )
    );

    // FOR DEV ONLY ----
    this.logPrefix = '[operation-page] ';
  }

  // TODO Hide lastOperation on to small screen
  /*@HostListener('window:resize', ['$event'])
  onResize(event?: Event) {
    this.showLastOperations = window.innerWidth < ; // XS screen
    console.debug('[menu] Screen size (px): ' + this._screenWidth);
  }*/

  async saveAndControl(event?: Event, opts?: { emitEvent?: false }) {
    if (event?.defaultPrevented) return false; // Skip
    event?.preventDefault(); // Avoid propagation to <ion-item>

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const saved =
      (this.mobile || this.isOnFieldMode) && this.dirty && this.valid
        ? // If on field mode AND valid: save silently
          await this.save(event, { openTabIndex: -1 })
        : // Else If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm(null, { openTabIndex: -1 });
    if (!saved) return; // not saved

    // Control (using a clone)
    const data = this.data.clone();
    const errors: AppErrorWithDetails = await this.control(data);
    const valid = isNil(errors);

    if (!valid) {
      // Force the desktop mode (to enable strict validation)
      this.usageMode = 'DESK';

      // Load data with error (e.g. quality flags)
      await this.updateView(data, opts);

      errors.message = errors.message || 'COMMON.FORM.HAS_ERROR';

      this.setError(errors, opts);
      this.markAllAsTouched(opts);
      this.scrollToTop();
    } else {
      // Clean previous error
      this.resetError(opts);

      await this.updateView(data);
    }
  }

  async control(data: Operation, opts?: any): Promise<AppErrorWithDetails> {
    const errors = await this.service.control(data, {
      ...opts,
      trip: this.trip,
    });

    if (errors) {
      const pmfms = await firstNotNilPromise(this.measurementsForm.pmfms$, { stop: this.destroySubject });
      const errorMessage = this.errorTranslator.translateErrors(errors, {
        pathTranslator: {
          translateFormPath: (path) =>
            this.service.translateFormPath(path, {
              i18nPrefix: this.i18nContext.prefix,
              pmfms,
            }),
        },
      });
      return {
        details: {
          errors,
          message: errorMessage,
        },
      };
    }

    // Show success toast
    if (!opts || opts.emitEvent !== false) {
      await this.showToast({ message: 'TRIP.OPERATION.INFO.CONTROL_SUCCEED', type: 'info' });
    }

    return; // No errors
  }

  translateFormPath(controlPath: string): string {
    return this.dataService.translateFormPath(controlPath, { i18nPrefix: this.i18nContext.prefix, pmfms: this.measurementsForm.pmfms });
  }

  canUserWrite(data: Operation, opts?: any): boolean {
    return (
      isNil(this.trip?.validationDate) &&
      this.dataService.canUserWrite(data, {
        ...opts,
        trip: this.trip,
        program: this.program,
      })
    );
  }

  qualify(data: Operation, qualityFlagId: number): Promise<Operation> {
    return this.dataService.qualify(data, qualityFlagId);
  }

  async openHelpModal(event: Event) {
    if (event) event.preventDefault();
    if (!this.helpUrl) return;

    console.debug(`[operation-page] Open help page {${this.helpUrl}}...`);
    const modal = await this.modalCtrl.create({
      component: AppHelpModal,
      componentProps: <AppHelpModalOptions>{
        title: this.translate.instant('COMMON.HELP.TITLE'),
        markdownUrl: this.helpUrl,
      },
      backdropDismiss: true,
    });
    return modal.present();
  }

  ngOnInit() {
    super.ngOnInit();

    // Update the data context
    this.registerSubscription(
      merge(this.selectedTabIndexChange.pipe(filter((tabIndex) => tabIndex === OperationPage.TABS.CATCH && this.showBatchTables)), from(this.ready()))
        .pipe(debounceTime(500), throttleTime(500))
        .subscribe((_) => this.updateDataContext())
    );

    // Get physical gear by form
    this._state.connect(
      'physicalGear',
      this.opeForm.physicalGearControl.valueChanges.pipe(
        // skip if loading (when opening an existing operation, physicalGear will be set inside onEntityLoaded() )
        filter((_) => !this.loading)
      )
    );

    this._state.connect('gearId', this.physicalGear$, (_, physicalGear) => toNumber(physicalGear?.gear?.id, null));

    this._state.hold(
      this.gearId$.pipe(
        filter((gearId) => isNotNil(gearId) && this.loaded),
        debounceTime(450)
      ),
      () => this.markForCheck()
    );
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    if (this.measurementsForm) {
      this.registerSubscription(
        this.measurementsForm.pmfms$
          .pipe(
            filter(isNotNil),
            mergeMap((_) => this.measurementsForm.ready$),
            filter((ready) => ready === true)
          )
          .subscribe((_) => this.onMeasurementsFormReady())
      );
    }

    // Manage tab group
    const queryParams = this.route.snapshot.queryParams;
    this.selectedSubTabIndex = toNumber(queryParams['subtab'], 0);

    // Manage toolbar color
    if (isNotNilOrBlank(queryParams['color'])) {
      this.toolbarColor = queryParams['color'];
    }
  }

  protected async mapPmfms(event: MapPmfmEvent) {
    if (!event || !event.detail.success) return; // Skip (missing callback)
    let pmfms: IPmfm[] = event.detail.pmfms;

    // If PMFM date/time, set default date, in on field mode
    if (this.isNewData && this.isOnFieldMode && pmfms?.some(PmfmUtils.isDate)) {
      pmfms = pmfms.map((p) => {
        if (PmfmUtils.isDate(p)) {
          p = p.clone();
          p.defaultValue = DateUtils.markNoTime(DateUtils.resetTime(moment()));
        }
        return p;
      });
    }

    event.detail.success(pmfms);
  }

  /**
   * Configure specific behavior
   */
  protected async onMeasurementsFormReady() {
    // Wait program to be loaded
    //await this.ready();

    // DEBUG
    console.debug('[operation-page] Measurement form is ready');

    // Clean existing subscription (e.g. when acquisition level change, this function can= be called many times)
    this._measurementSubscription?.unsubscribe();
    this._measurementSubscription = new Subscription();

    const formGroup = this.measurementsForm.form as UntypedFormGroup;
    let defaultTableStates = true;

    // If PMFM "Sampling type" exists (e.g. SUMARiS), then use to enable/disable some tables
    const samplingTypeControl = formGroup?.controls[PmfmIds.SURVIVAL_SAMPLING_TYPE];
    if (isNotNil(samplingTypeControl) && this.batchTree) {
      defaultTableStates = false;
      this.showCatchTab = this.batchTree?.showCatchForm;
      this._measurementSubscription.add(
        samplingTypeControl.valueChanges
          .pipe(
            debounceTime(400),
            startWith<any, any>(samplingTypeControl.value),
            filter(ReferentialUtils.isNotEmpty),
            map((qv) => qv.label),
            distinctUntilChanged()
          )
          .subscribe((qvLabel) => {
            switch (qvLabel as string) {
              case QualitativeLabels.SURVIVAL_SAMPLING_TYPE.SURVIVAL:
                if (this.debug) console.debug('[operation] Enable samples tables');
                this.showBatchTablesByProgram = false;
                this.showSampleTablesByProgram = true;
                break;
              case QualitativeLabels.SURVIVAL_SAMPLING_TYPE.CATCH_HAUL:
                if (this.debug) console.debug('[operation] Enable batches tables');
                this.showBatchTablesByProgram = true;
                this.showSampleTablesByProgram = false;
                break;
              case QualitativeLabels.SURVIVAL_SAMPLING_TYPE.UNSAMPLED:
                if (this.debug) console.debug('[operation] Disable samples and batches tables');
                this.showBatchTablesByProgram = false;
                this.showSampleTablesByProgram = false;
            }

            this.showBatchTables = this.showBatchTablesByProgram;
            this.showCatchTab = this.showBatchTables || this.batchTree?.showCatchForm || false;
            this.showSamplesTab = this.showSampleTablesByProgram;
            this.tabCount = this.showSamplesTab ? 3 : this.showCatchTab ? 2 : 1;

            // Force first sub tab index, if modification was done from the form
            // This condition avoid to change subtab, when reloading the page
            if (this.selectedTabIndex === OperationPage.TABS.GENERAL) {
              this.selectedSubTabIndex = 0;
            }
            this.updateTablesState();
            this.markForCheck();
          })
      );
    }

    // If PMFM "Has accidental catches ?" exists, then use to enable/disable sample tables
    const hasAccidentalCatchesControl = formGroup?.controls[PmfmIds.HAS_ACCIDENTAL_CATCHES];
    if (isNotNil(hasAccidentalCatchesControl)) {
      defaultTableStates = true; // Applying defaults (because will not manage the catch)
      hasAccidentalCatchesControl.setValidators(Validators.required);
      this._measurementSubscription.add(
        hasAccidentalCatchesControl.valueChanges
          .pipe(debounceTime(400), startWith<any, any>(hasAccidentalCatchesControl.value), filter(isNotNil), distinctUntilChanged())
          .subscribe((hasAccidentalCatches) => {
            if (this.debug) console.debug('[operation] Enable/Disable samples table, because HAS_ACCIDENTAL_CATCHES=' + hasAccidentalCatches);

            // Enable samples, when has accidental catches
            this.showSampleTablesByProgram = hasAccidentalCatches;
            this.showSamplesTab = this.showSampleTablesByProgram;
            this.showCatchTab = this.showBatchTables || this.batchTree?.showCatchForm || false;
            this.tabCount = this.showSamplesTab ? 3 : this.showCatchTab ? 2 : 1;

            // Force first tab index
            if (this.selectedTabIndex === OperationPage.TABS.GENERAL) {
              this.selectedSubTabIndex = 0;
            }
            this.updateTablesState();
            this.markForCheck();
          })
      );
    }

    if (this.allowParentOperation) {
      defaultTableStates = false;
      this._measurementSubscription.add(
        this.opeForm.parentChanges
          .pipe(
            startWith<Operation>(this.opeForm.parentControl.value as Operation),
            map((parent) => !!parent), // Convert to boolean
            distinctUntilChanged()
          )
          .subscribe(async (hasParent) => {
            let acquisitionLevel: AcquisitionLevelType;
            if (hasParent) {
              if (this.debug) console.debug('[operation] Enable batch tables');
              this.showBatchTables = this.showBatchTablesByProgram;
              this.showCatchTab = this.showBatchTables || this.batchTree?.showCatchForm || false;
              this.showSamplesTab = this.showSampleTablesByProgram;
              this.tabCount = this.showSamplesTab ? 3 : this.showCatchTab ? 2 : 1;
              acquisitionLevel = AcquisitionLevelCodes.CHILD_OPERATION;
            } else {
              if (this.debug) console.debug('[operation] Disable batch tables');
              this.showBatchTables = false;
              this.showSamplesTab = false;
              this.showCatchTab = false;
              this.tabCount = 1;
              acquisitionLevel = AcquisitionLevelCodes.OPERATION;
            }

            // Propagate acquisition level
            this.acquisitionLevel = acquisitionLevel;

            // Force first tab index
            if (this.selectedTabIndex === OperationPage.TABS.GENERAL) {
              this.selectedSubTabIndex = 0;
            }

            // Auto fill batches (if new data)
            if (this.showBatchTables && this.autoFillBatch && this.batchTree && this.isNewData) {
              await this.batchTree.autoFill({ skipIfDisabled: false, skipIfNotEmpty: true });
            }

            this.updateTablesState();
            this.markForCheck();
          })
      );
    }

    const hasIndividualMeasuresControl = formGroup?.controls[PmfmIds.HAS_INDIVIDUAL_MEASURES];
    if (isNotNil(hasIndividualMeasuresControl) && this.batchTree) {
      this._measurementSubscription.add(
        hasIndividualMeasuresControl.valueChanges
          .pipe(startWith<any, any>(hasIndividualMeasuresControl.value), filter(isNotNil))
          .subscribe((value) => (this.hasIndividualMeasures = value))
      );
      this._measurementSubscription.add(
        this.hasIndividualMeasures$.subscribe((value) => {
          // Will be done by the template
          this.batchTree.allowSpeciesSampling = value;
          this.batchTree.defaultHasSubBatches = value;
          this.batchTree.allowSubBatches = value;

          // Hide button to toggle hasSubBatches (yes/no) when value if forced
          this.batchTree.setModalOption('showHasSubBatchesButton', !value);
          if (!this.allowParentOperation) {
            this.showCatchTab = this.showBatchTables || this.batchTree.showCatchForm;
            this.tabCount = 1 + (this.showCatchTab ? 1 : 0) + (this.showSamplesTab ? 1 : 0);
          }
          this.updateTablesState();
        })
      );
    } else {
      this._state.set('hasIndividualMeasures', (_) => true);
    }

    // Show default tables state
    if (defaultTableStates) {
      if (this.debug) console.debug('[operation] Enable default tables (Nor SUMARiS nor ADAP pmfms were found)');
      this.showBatchTables = this.showBatchTablesByProgram;
      this.showCatchTab = this.showBatchTables || this.batchTree?.showCatchForm || false;
      this.showSamplesTab = this.showSampleTablesByProgram;
      this.tabCount = this.showSamplesTab ? 3 : this.showCatchTab ? 2 : 1;
      this.updateTablesState();
      this.markForCheck();

      // Auto fill batches (if new data)
      if (this.showBatchTables && this.autoFillBatch && this.batchTree && this.isNewData) {
        this.batchTree.autoFill({ skipIfDisabled: false, skipIfNotEmpty: true });
      }
    }

    // Anormal trip => Change comments as required
    const tripProgressControl = formGroup?.controls[PmfmIds.TRIP_PROGRESS];
    if (isNotNil(tripProgressControl)) {
      this._measurementSubscription.add(
        tripProgressControl.valueChanges
          .pipe(debounceTime(400), startWith<any, any>(tripProgressControl.value), filter(isNotNilOrBlank), distinctUntilChanged())
          .subscribe((normalProgress) => {
            if (!normalProgress) console.debug('[operation] abnormal progress: force comment as required');
            this.opeForm.requiredComment = !normalProgress;
            this.markForCheck();
          })
      );
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._measurementSubscription?.unsubscribe();
    this._sampleRowSubscription?.unsubscribe();
  }

  protected async setProgram(program: Program) {
    if (!program) return; // Skip

    await super.setProgram(program);

    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nContext.suffix = i18nSuffix;

    this.allowParentOperation = program.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION);
    this.autoFillBatch = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_AUTO_FILL);
    this.autoFillDatesFromTrip = program.getPropertyAsBoolean(ProgramProperties.TRIP_APPLY_DATE_ON_NEW_OPERATION);
    this._forceMeasurementAsOptionalOnFieldMode = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE);
    const isGPSUsed = toBoolean(MeasurementUtils.asBooleanValue(this.trip?.measurements, PmfmIds.GPS_USED), true);
    const enablePosition = isGPSUsed && program.getPropertyAsBoolean(ProgramProperties.TRIP_POSITION_ENABLE);
    this.opeForm.trip = this.trip;
    this.opeForm.showPosition = enablePosition;
    this.opeForm.boundingBox = enablePosition && Geometries.parseAsBBox(program.getProperty(ProgramProperties.TRIP_POSITION_BOUNDING_BOX));
    // TODO: make possible to have both showPosition and showFishingArea at true (ex SFA artisanal logbook program)
    this.opeForm.showFishingArea = !enablePosition; // Trip has gps in use, so active positions controls else active fishing area control
    this.opeForm.fishingAreaLocationLevelIds = program.getPropertyAsNumbers(ProgramProperties.TRIP_OPERATION_FISHING_AREA_LOCATION_LEVEL_IDS);
    const defaultLatitudeSign: '+' | '-' = program.getProperty(ProgramProperties.TRIP_LATITUDE_SIGN);
    const defaultLongitudeSign: '+' | '-' = program.getProperty(ProgramProperties.TRIP_LONGITUDE_SIGN);
    this.opeForm.defaultLatitudeSign = defaultLatitudeSign;
    this.opeForm.defaultLongitudeSign = defaultLongitudeSign;
    this.opeForm.metierTaxonGroupTypeIds = program.getPropertyAsNumbers(ProgramProperties.TRIP_OPERATION_METIER_TAXON_GROUP_TYPE_IDS);
    this.opeForm.maxDistanceWarning = program.getPropertyAsInt(ProgramProperties.TRIP_DISTANCE_MAX_WARNING);
    this.opeForm.maxDistanceError = program.getPropertyAsInt(ProgramProperties.TRIP_DISTANCE_MAX_ERROR);
    this.opeForm.allowParentOperation = this.allowParentOperation;
    this.opeForm.startProgram = program.creationDate;
    this.opeForm.showMetier = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_METIER_ENABLE);
    this.opeForm.showMetierFilter = this.opeForm.showMetier && program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_METIER_FILTER);
    this.opeForm.programLabel = program.label;
    this.opeForm.fishingStartDateTimeEnable = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE);
    this.opeForm.fishingEndDateTimeEnable = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE);
    this.opeForm.endDateTimeEnable = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE);
    this.opeForm.maxShootingDurationInHours = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_SHOOTING_DURATION_HOURS);
    this.opeForm.maxTotalDurationInHours = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_TOTAL_DURATION_HOURS);
    this.opeForm.defaultIsParentOperation = this._defaultIsParentOperation;
    this.operationPasteFlags = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_PASTE_FLAGS);
    if (this.debug && this.operationPasteFlags !== 0) {
      console.debug(`[operation-page] Enable duplication with paste flags: ${flagsToString(this.operationPasteFlags, OperationPasteFlags)}`);
    }
    this.helpUrl = program.getProperty(ProgramProperties.TRIP_OPERATION_HELP_URL) || program.getProperty(ProgramProperties.TRIP_HELP_URL);

    this.measurementsForm.i18nSuffix = i18nSuffix;
    this.measurementsForm.forceOptional = this.forceMeasurementAsOptional;
    this.measurementsForm.maxVisibleButtons = program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS);
    this.measurementsForm.maxItemCountForButtons = program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS);

    this.saveOptions.computeBatchRankOrder = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_RANK_ORDER_COMPUTE);
    this.saveOptions.computeBatchIndividualCount =
      !this.mobile && program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_INDIVIDUAL_COUNT_COMPUTE);
    this.saveOptions.computeBatchWeight = !this.mobile && program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE);

    // NOT need here, while 'updateLinkedOperation' is forced in save()
    //this.saveOptions.updateLinkedOperation = this.allowParentOperation;

    this.showBatchTablesByProgram = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_ENABLE);
    this.showSampleTablesByProgram = program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_ENABLE);

    if (!this.allowParentOperation) {
      this.acquisitionLevel = AcquisitionLevelCodes.OPERATION;
    }
    // When route ask for a child operation
    else if (!this._defaultIsParentOperation) {
      this.acquisitionLevel = AcquisitionLevelCodes.CHILD_OPERATION;
    }

    if (this.batchTree) this.batchTree.program = program;
    if (this.sampleTree) this.sampleTree.program = program;

    // Load available taxon groups (e.g. with taxon groups found in strategies)
    await this.initAvailableTaxonGroups(program.label);

    this.markAsReady();
  }

  protected watchStrategyFilter(program: Program): Observable<Partial<StrategyFilter>> {
    switch (this.strategyResolution) {
      // Spatio-temporal
      case DataStrategyResolutions.SPATIO_TEMPORAL:
        return this._state
          .select(['acquisitionLevel', 'trip'], (_) => _, {
            acquisitionLevel: equals,
            trip: (t1, t2) => t1 === t2 || (t1 && t1.equals(t2)),
          })
          .pipe(
            map(({ acquisitionLevel, trip }) => {
              return <Partial<StrategyFilter>>{
                acquisitionLevel,
                programId: program.id,
                startDate: trip.departureDateTime,
                endDate: trip.departureDateTime,
                location: trip.departureLocation,
              };
            }),
            // DEBUG
            tap((values) => console.debug(this.logPrefix + 'Strategy filter changed:', values))
          );
      default:
        return super.watchStrategyFilter(program);
    }
  }

  load(
    id?: number,
    opts?: EntityServiceLoadOptions & { emitEvent?: boolean; openTabIndex?: number; updateRoute?: boolean; [p: string]: any }
  ): Promise<void> {
    return super.load(id, { ...opts, withLinkedOperation: true });
  }

  async onNewEntity(data: Operation, options?: EntityServiceLoadOptions): Promise<void> {
    const tripId = options && isNotNil(options.tripId) ? +options.tripId : isNotNil(this.trip && this.trip.id) ? this.trip.id : data && data.tripId;
    if (isNil(tripId)) throw new Error("Missing argument 'options.tripId'!");
    data.tripId = tripId;

    // Load parent trip
    const trip = await this.loadTrip(tripId);

    // Use the default gear, if only one
    if (trip && trip.gears && trip.gears.length === 1) {
      data.physicalGear = trip.gears[0];
    }

    // Copy some trip's properties (need by filter)
    data.programLabel = trip.program?.label;
    data.vesselId = trip.vesselSnapshot?.id;

    // Paste clipboard, if not already a duplicated operation
    const clipboard = this.context?.clipboard;
    if (OperationUtils.isOperation(clipboard?.data)) {
      // Do NOT copy dates, when in the on field mode (will be filled later)
      if (this.isOnFieldMode) {
        data.paste(clipboard?.data, removeFlag(this.operationPasteFlags, OperationPasteFlags.DATE));
      } else {
        data.paste(clipboard?.data, this.operationPasteFlags);
      }

      // Reset clipboard
      this.context?.setValue('clipboard', {
        data: null, // Reset data
        pasteFlags: this.operationPasteFlags, // Keep flags
      });

      this.isDuplicatedData = true;
    }

    // If is on field mode, then fill default values
    if (this.isOnFieldMode) {
      data.startDateTime = DateUtils.moment();

      if (!this.isDuplicatedData) {
        // Wait last operations to be loaded
        const previousOperations = await firstNotNilPromise(this.lastOperations$, { stop: this.destroySubject });

        // Copy from previous operation only if is not a duplicated operation
        const previousOperation = (previousOperations || []).find((ope) => ope && ope !== data && ReferentialUtils.isNotEmpty(ope.metier));
        if (previousOperation) {
          data.physicalGear = (trip.gears || []).find((g) => EntityUtils.equals(g, previousOperation.physicalGear, 'id')) || data.physicalGear;
          data.metier = previousOperation.metier;
          data.rankOrder = previousOperation.rankOrder + 1;
        } else {
          data.rankOrder = 1;
        }
      }
    }

    // Propagate program
    if (data.programLabel) this.programLabel = data.programLabel;

    // Propagate physical gear
    if (data.physicalGear) this.physicalGear = data.physicalGear;

    this.opeForm.showComment = !this.mobile;
  }

  async onEntityLoaded(data: Operation, options?: EntityServiceLoadOptions): Promise<void> {
    const tripId = options && isNotNil(options.tripId) ? +options.tripId : isNotNil(this.trip && this.trip.id) ? this.trip.id : data && data.tripId;
    if (isNil(tripId)) throw new Error("Missing argument 'options.tripId'!");
    data.tripId = tripId;

    const trip = await this.loadTrip(tripId);

    // Replace physical gear by the real entity
    data.physicalGear = (trip.gears || []).find((g) => EntityUtils.equals(g, data.physicalGear, 'id')) || data.physicalGear;
    data.programLabel = trip.program?.label;
    data.vesselId = trip.vesselSnapshot?.id;

    await this.loadLinkedOperation(data);

    // Propagate program
    if (data.programLabel) this.programLabel = data.programLabel;

    // Propagate physical gear
    if (data.physicalGear) this.physicalGear = data.physicalGear;

    this.opeForm.showComment = !this.mobile || isNotNilOrBlank(data.comments);

    this.canDownload = !this.mobile && EntityUtils.isRemoteId(data?.id);
  }

  onNewFabButtonClick(event: Event) {
    switch (this.selectedTabIndex) {
      case OperationPage.TABS.CATCH:
        if (this.showBatchTables && this.batchTree) this.batchTree.addRow(event);
        break;
      case OperationPage.TABS.SAMPLE:
        if (this.showSamplesTab && this.sampleTree) this.sampleTree.addRow(event);
        break;
    }
  }

  /**
   * Compute the title
   *
   * @param data
   * @param opts
   */
  protected async computeTitle(
    data: Operation,
    opts?: {
      withPrefix?: boolean;
    }
  ): Promise<string> {
    // Trip exists
    const titlePrefix =
      ((!opts || opts.withPrefix !== false) &&
        this.trip &&
        (await this.translate.instant('TRIP.OPERATION.TITLE_PREFIX', {
          vessel: (this.trip && this.trip.vesselSnapshot && (this.trip.vesselSnapshot.exteriorMarking || this.trip.vesselSnapshot.name)) || '',
          departureDateTime: (this.trip && this.trip.departureDateTime && (this.dateFormat.transform(this.trip.departureDateTime) as string)) || '',
        }))) ||
      '';

    // new ope
    if (!data || isNil(data.id)) {
      return titlePrefix + (await this.translate.instant('TRIP.OPERATION.NEW.TITLE'));
    }

    // Select the date to use for title
    let titleDateTime = data.startDateTime || data.fishingStartDateTime;
    if (OperationUtils.hasParentOperation(data)) {
      titleDateTime = DateUtils.min(fromDateISOString(data.endDateTime), fromDateISOString(data.fishingEndDateTime)) || titleDateTime;
    }

    // Format date:
    // - if mobile: display time only if today
    const startDateTime =
      titleDateTime &&
      ((this.mobile && DateUtils.moment().isSame(titleDateTime, 'day')
        ? this.dateFormat.transform(titleDateTime, { pattern: 'HH:mm' })
        : this.dateFormat.transform(titleDateTime, { time: true })) as string);

    // Get rankOrder from context, or compute it (if NOT mobile to avoid additional processing time)
    let rankOrder = !this.mobile && this.tripContext?.operation?.rankOrder;
    if (isNil(rankOrder) && !this.mobile) {
      // Compute the rankOrder
      const now = this.debug && Date.now();
      if (this.debug) console.debug('[operation-page] Computing rankOrder...');
      rankOrder = await this.service.computeRankOrder(data, { fetchPolicy: 'cache-first' });
      if (this.debug) console.debug(`[operation-page] Computing rankOrder [OK] #${rankOrder} - in ${Date.now() - now}ms`);

      // Update data, and form
      data.rankOrder = rankOrder;
      this.opeForm?.form.patchValue({ rankOrder }, { emitEvent: false });
    }
    if (rankOrder) {
      return (titlePrefix + (await this.translate.instant('TRIP.OPERATION.EDIT.TITLE', { startDateTime, rankOrder }))) as string;
    }
    // No rankOrder (e.g. if mobile)
    else {
      return (titlePrefix + (await this.translate.instant('TRIP.OPERATION.EDIT.TITLE_NO_RANK', { startDateTime }))) as string;
    }
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    if (this.mobile) return; // Skip if mobile

    return {
      ...(await super.computePageHistory(title)),
      icon: 'navigate',
    };
  }

  onTabChange(event: MatTabChangeEvent, queryParamName?: string): boolean {
    const changed = super.onTabChange(event, queryParamName);
    if (changed) {
      switch (this.selectedTabIndex) {
        case OperationPage.TABS.CATCH:
          if (this.showBatchTables && this.batchTree) this.batchTree.realignInkBar();
          this.markForCheck();
          break;
        case OperationPage.TABS.SAMPLE:
          if (this.showSamplesTab && this.sampleTree) this.sampleTree.realignInkBar();
          this.markForCheck();
          break;
      }
    }
    return changed;
  }

  waitIdle(opts?: WaitForOptions): Promise<void> {
    return AppFormUtils.waitIdle(this, { stop: this.destroySubject, ...opts });
  }

  async onLastOperationClick(event: Event, id: number): Promise<any> {
    if (event?.defaultPrevented) return; // Skip

    if (isNil(id) || this.data.id === id) return; // skip

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const saved =
      (this.mobile || this.isOnFieldMode) && (!this.dirty || this.valid)
        ? // If on field mode: try to save silently
          await this.save(event, { openTabIndex: -1 })
        : // If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm(null, { openTabIndex: -1 });

    if (!saved) return; // Skip

    return this.navigateTo(+id);
  }

  async saveAndNew(event: Event): Promise<boolean> {
    if (event?.defaultPrevented) return false; // Skip
    event?.preventDefault(); // Avoid propagation to <ion-item>

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const saved =
      (this.mobile || this.isOnFieldMode) && (!this.dirty || this.valid)
        ? // If on field mode AND valid: save silently
          await this.save(event, { openTabIndex: -1 })
        : // Else If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm(null, { openTabIndex: -1 });
    if (!saved) return; // not saved

    // Redirect to /new
    return await this.navigateTo('new');
  }

  async duplicate(event: Event): Promise<any> {
    if (event?.defaultPrevented || !this.context) return; // Skip
    event?.preventDefault(); // Avoid propagation to <ion-item>

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const saved =
      (this.mobile || this.isOnFieldMode) && this.dirty && this.valid
        ? // If on field mode AND valid: save silently
          await this.save(event, { openTabIndex: -1 })
        : // Else If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm(null, { openTabIndex: -1 });

    if (!saved) return; // User cancelled, or cannot saved => skip

    // Fill context's clipboard
    this.context.setValue('clipboard', {
      data: this.data,
      pasteFlags: this.operationPasteFlags,
    });

    // Open new operation
    return this.navigateTo('new');
  }

  async setValue(data: Operation) {
    try {
      const isNewData = isNil(data?.id);
      const jobs: Promise<any>[] = [this.opeForm.setValue(data)];

      // Get gear, from the physical gear
      const gearId = toNumber(data?.physicalGear?.gear?.id, null);

      // Set measurements form
      this.measurementsForm.gearId = gearId;
      this.measurementsForm.programLabel = this.programLabel;
      const isChildOperation = data.parentOperation || isNotNil(data.parentOperationId) || !this._defaultIsParentOperation;
      const acquisitionLevel = isChildOperation ? AcquisitionLevelCodes.CHILD_OPERATION : AcquisitionLevelCodes.OPERATION;

      // Propagate acquisition level, if changed
      if (this.acquisitionLevel !== acquisitionLevel) {
        this.measurementsForm.unload();
        this.measurementsForm.acquisitionLevel = acquisitionLevel;
        this.measurementsForm.markAsReady();
        this.acquisitionLevel = acquisitionLevel;
      }

      // Do not wait measurements forms when no default gear (because of requiredGear=true)
      if (this.isNewData && isNil(gearId)) {
        this.measurementsForm.pmfms = [];
      }
      jobs.push(this.measurementsForm.setValue((data && data.measurements) || []));

      // Set batch tree
      if (this.batchTree) {
        this.batchTree.physicalGear = data.physicalGear;
        this.batchTree.requiredStrategy = this.requiredStrategy;
        this.batchTree.strategyId = this.strategy?.id;
        this.batchTree.gearId = gearId;
        jobs.push(this.batchTree.setValue(data?.catchBatch || null));
      }

      // Set sample tree
      if (this.sampleTree) {
        this.sampleTree.requiredStrategy = this.requiredStrategy;
        this.sampleTree.strategyId = this.strategy?.id;
        this.sampleTree.gearId = gearId;
        //jobs.push(this.sampleTree.setValue((data && data.samples) || []));
        console.debug('[operation] Before settings samples ...');
        await this.sampleTree.setValue(data?.samples || []);
      }

      await Promise.all(jobs);

      console.debug('[operation] children setValue() [OK]');

      // If new data, autofill the table
      if (isNewData) {
        if (this.autoFillDatesFromTrip && !this.isDuplicatedData) this.opeForm.fillWithTripDates();
      }
    } catch (err) {
      const error = err?.message || err;
      console.debug('[operation] Error during setValue(): ' + error, err);
      this.setError(error);
    }
  }

  cancel(event?: Event): Promise<void> {
    // Avoid to reload/unload if page destroyed
    timer(500)
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => super.cancel(event));

    // nothing
    return Promise.resolve();
  }

  unload(): Promise<void> {
    return super.unload();
  }

  updateViewState(data: Operation, opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.updateViewState(data, opts);

    // Display form error, if has errors from context, applies it on form.
    const errorMessage = this.enabled && this.usageMode === 'DESK' && isNil(data.controlDate) ? data.qualificationComments : undefined;
    if (isNotNilOrBlank(errorMessage)) {
      console.info('[operation-page] Restore error from qualificationComments : ', errorMessage);

      // Clean error
      this.form.get('qualificationComments').reset();

      setTimeout(() => {
        this.markAllAsTouched();
        this.form.updateValueAndValidity();

        const error: AppErrorWithDetails = { details: { message: errorMessage } };
        if (isNil(data.catchBatch?.controlDate) && data.catchBatch?.qualificationComments) {
          error.details.errors = { catch: { invalidOrIncomplete: true } };
        }

        this.setError({ message: 'COMMON.FORM.HAS_ERROR', ...error }, { detailsCssClass: 'error-details' });
      });
    }
  }

  async save(event: Event, opts?: OperationSaveOptions & { emitEvent?: boolean; updateRoute?: boolean; openTabIndex?: number }): Promise<boolean> {
    if (this.loading || this.saving) {
      console.debug('[data-editor] Skip save: editor is busy (loading or saving)');
      return false;
    }
    if (!this.dirty) {
      console.debug('[data-editor] Skip save: editor not dirty');
      return true;
    }

    // Workaround to avoid the option menu to be selected
    if (this.mobile) await sleep(50);

    // Save new gear to the trip
    const physicalGear = await this.getOrAddPhysicalGear({ emitEvent: false });
    if (!physicalGear) {
      this.markForCheck();
      return false; // Stop if failed
    }

    // Force to pass specific saved options to dataService.save()
    const saved = await super.save(event, <OperationSaveOptions>{
      ...this.saveOptions,
      trip: this.trip,
      updateLinkedOperation: this.opeForm.isParentOperation || this.opeForm.isChildOperation, // Apply updates on child operation if it exists
      ...opts,
    });

    // Continue to mark as saving, to avoid option menu to open
    this.markAsSaving();

    try {
      // Display form error on top
      if (!saved) {
        let error = this.error;
        if (isNilOrBlank(error)) {
          // DEBUG
          //console.debug('[operation] Computing form error...');

          if (this.opeForm.invalid) {
            error = this.opeForm.formError;
          }
          if (this.measurementsForm.invalid) {
            error = (isNotNilOrBlank(error) ? error + ', ' : '') + this.measurementsForm.formError;
          }

          this.setError(error);
        }
        this.scrollToTop();
      } else {
        // Workaround, to make sure the editor is not dirty anymore
        // => mark components as pristine
        if (this.dirty) {
          console.warn('[operation] FIXME: manually mark children to pristine, but it should be done by editor save()!');
          this.batchTree?.markAsPristine();
          this.sampleTree?.markAsPristine();
        }

        // Mark trip as dirty
        if (RootDataEntityUtils.isReadyToSync(this.trip)) {
          RootDataEntityUtils.markAsDirty(this.trip);
          this.trip = await this.tripService.save(this.trip);
          // Update the context
          this.context.setValue('trip', this.trip);
        }
      }

      return saved;
    } finally {
      this.markAsSaved();
    }
  }

  async saveIfDirtyAndConfirm(event?: Event, opts?: { emitEvent?: boolean; openTabIndex?: number }): Promise<boolean> {
    return super.saveIfDirtyAndConfirm(event, { ...this.saveOptions, ...opts });
  }

  async getOrAddPhysicalGear(opts?: { emitEvent: boolean }): Promise<boolean> {
    if (this.loading || this.saving) return false;
    if (!this.dirty) return true; // Skip

    const physicalGear = this.opeForm.physicalGearControl.value;
    if (!physicalGear || isNotNil(physicalGear.id)) return true; // Skip

    // DEBUG
    console.debug('[operation-page] Saving new physical gear...');

    this.markAsSaving();
    this.resetError();

    try {
      const savedPhysicalGear = await this.tripService.getOrAddGear(this.trip.id, physicalGear);

      // Update form with the new gear
      this.opeForm.physicalGearControl.patchValue(savedPhysicalGear, { emitEvent: false });

      // Update the current trip object
      if (!this.trip.gears?.some((g) => PhysicalGear.equals(g, savedPhysicalGear))) {
        this.trip.gears.push(savedPhysicalGear);
      }

      return true;
    } catch (err) {
      this.setError(err);
      return false;
    } finally {
      this.markAsSaved(opts);
    }
  }

  onPrepareSampleForm(pmfmForm: IPmfmForm) {
    console.debug('[operation-page] Initializing sample form (validators...)');
    this._sampleRowSubscription?.unsubscribe();
    this._sampleRowSubscription = this.computeSampleRowValidator(pmfmForm);
  }

  markAsLoaded(opts?: { emitEvent?: boolean }) {
    super.markAsLoaded(opts);
    this.children?.forEach((c) => c.markAsLoaded(opts));
  }

  setError(error: string | AppErrorWithDetails, opts?: { emitEvent?: boolean; detailsCssClass?: string }) {
    // If errors in operations
    if (typeof error === 'object' && error?.details?.errors?.catch) {
      // Show error in batch tree
      this.batchTree.setError('ERROR.INVALID_OR_INCOMPLETE_FILL', {
        //showOnlyInvalidRows: true
      });

      // Open the operation tab
      this.tabGroup.selectedIndex = OperationPage.TABS.CATCH;

      // Reset other errors
      super.setError(undefined, opts);
    } else {
      super.setError(error, opts);

      // Reset batch tree error
      this.batchTree.resetError(opts);
    }
  }

  // change visibility to public
  resetError(opts?: { emitEvent?: boolean }) {
    this.setError(undefined, opts);
  }

  /* -- protected method -- */

  protected computeSampleRowValidator(pmfmForm: IPmfmForm): Subscription {
    return OperationValidators.addSampleValidators(pmfmForm);
  }

  protected async loadTrip(tripId: number): Promise<Trip> {
    // Update trip id (will cause last operations to be watched, if need)
    this.tripId = +tripId;

    // Check if trip exists in the context
    let trip = this.tripContext.trip;

    if (trip?.id === tripId) {
      if (this.tripContext.strategy) {
        this.strategy = this.tripContext.strategy;
      }
    }

    // Reload if not the expected trip
    else {
      trip = await this.tripService.load(tripId, { fullLoad: true });
      // Update the context
      this.tripContext.trip = trip;
    }

    // Remember the trip
    this.trip = trip;

    // NOT need here, as it force in save() function
    //this.saveOptions.trip = trip;

    return trip;
  }

  /**
   * Open the first tab that is invalid
   */
  protected getFirstInvalidTabIndex(): number {
    // find invalids tabs (keep order)
    const invalidTabs = [
      this.opeForm.invalid || this.measurementsForm.invalid,
      (this.showCatchTab && this.batchTree?.invalid) || false,
      (this.showSamplesTab && this.sampleTree?.invalid) || false,
    ];

    // Open the first invalid tab
    const invalidTabIndex = invalidTabs.indexOf(true);

    // If catch tab, open the invalid sub tab
    if (invalidTabIndex === OperationPage.TABS.CATCH) {
      this.selectedSubTabIndex = this.batchTree?.getFirstInvalidTabIndex();
      this.updateTablesState();
    }
    // If sample tab, open the invalid sub tab
    else if (invalidTabIndex === OperationPage.TABS.SAMPLE) {
      this.selectedSubTabIndex = this.sampleTree?.getFirstInvalidTabIndex();
      this.updateTablesState();
    }
    return invalidTabIndex;
  }

  protected computeUsageMode(operation: Operation): UsageMode {
    // Allow to override the usageMode, by context (e.g. when control a trip)
    const contextualUsageMode = this.context?.getValue('usageMode') as UsageMode;
    if (contextualUsageMode) return contextualUsageMode;

    // Read the settings
    return this.settings.isUsageMode('FIELD') &&
      (isNil(this.trip) ||
        (isNotNil(this.trip.departureDateTime) && fromDateISOString(this.trip.departureDateTime).diff(DateUtils.moment(), 'day') < 15))
      ? 'FIELD'
      : 'DESK';
  }

  protected registerForms() {
    // Register sub forms & table
    this.addForms([this.opeForm, this.measurementsForm, this.batchTree, this.sampleTree]);
  }

  protected waitWhilePending(): Promise<void> {
    this.form.updateValueAndValidity();
    return super.waitWhilePending();
  }

  protected saveDirtyChildren(): Promise<boolean> {
    return super.saveDirtyChildren();
  }

  async getValue(): Promise<Operation> {
    const data = await super.getValue();

    // Batches
    if (this.showCatchTab && this.batchTree) {
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

    // Samples
    if (this.showSamplesTab && this.sampleTree) {
      await this.sampleTree.save();
      data.samples = this.sampleTree.value;
    } else {
      data.samples = undefined;
    }

    return data;
  }

  protected getJsonValueToSave(): Promise<any> {
    const json = this.opeForm.value;

    // Mark as not controlled (remove control date, etc.)
    // BUT keep qualityFlag (e.g. need to keep it when = NOT_COMPLETED - see below)
    DataEntityUtils.markAsNotControlled(json as Operation, { keepQualityFlag: true });

    // Make sure parent operation has quality flag
    if (this.allowParentOperation && EntityUtils.isEmpty(json.parentOperation, 'id') && DataEntityUtils.hasNoQualityFlag(json)) {
      console.warn('[operation-page] Parent operation does not have quality flag id. Changing to NOT_COMPLETED ');
      json.qualityFlagId = QualityFlagIds.NOT_COMPLETED;

      // Propage this change to the form
      this.opeForm.qualityFlagControl.patchValue(QualityFlagIds.NOT_COMPLETED, { emitEvent: false });
    }

    // Clean childOperation if empty
    if (EntityUtils.isEmpty(json.childOperation, 'id')) {
      delete json.childOperation;
    }
    json.measurements = this.measurementsForm.value;
    json.tripId = this.trip.id;

    return json;
  }

  protected async initAvailableTaxonGroups(programLabel: string) {
    if (this.debug) console.debug('[operation] Setting available taxon groups...');

    // Load program's taxon groups
    let availableTaxonGroups = await this.programRefService.loadTaxonGroups(programLabel);

    // Retrieve the trip measurements on SELF_SAMPLING_PROGRAM, if any
    const qvMeasurement = (this.trip.measurements || []).find((m) => m.pmfmId === PmfmIds.SELF_SAMPLING_PROGRAM);
    if (qvMeasurement && ReferentialUtils.isNotEmpty(qvMeasurement.qualitativeValue)) {
      // Retrieve QV from the program pmfm (because measurement's QV has only the 'id' attribute)
      const tripPmfms = await this.programRefService.loadProgramPmfms(programLabel, { acquisitionLevel: AcquisitionLevelCodes.TRIP });
      const pmfm = (tripPmfms || []).find((p) => p.id === PmfmIds.SELF_SAMPLING_PROGRAM);
      const qualitativeValue = (pmfm?.qualitativeValues || []).find((qv) => qv.id === qvMeasurement.qualitativeValue.id);

      // Transform QV.label has a list of TaxonGroup.label
      const contextualTaxonGroupLabels = qualitativeValue?.label
        .split(/[^\w]+/) // Split by separator (= not a word)
        .filter(isNotNilOrBlank)
        .map((label) => label.trim().toUpperCase());

      // Limit the program list, using the restricted list
      if (isNotEmptyArray(contextualTaxonGroupLabels)) {
        availableTaxonGroups = availableTaxonGroups.filter((tg) =>
          contextualTaxonGroupLabels.some(
            (label) =>
              label === tg.label ||
              // Contextual 'RJB' must match RJB_1, RJB_2
              tg.label.startsWith(label)
          )
        );
      }
    }

    // Set table's default taxon groups
    if (this.batchTree) this.batchTree.availableTaxonGroups = availableTaxonGroups;
    if (this.sampleTree) this.sampleTree.availableTaxonGroups = availableTaxonGroups;
  }

  protected updateTablesState() {
    if (this.enabled) {
      if (this.showCatchTab) {
        if (this.batchTree?.disabled) {
          this.batchTree.enable();
          this.batchTree.realignInkBar();
        }
      }
      if (this.showSamplesTab) {
        if (this.sampleTree?.disabled) {
          this.sampleTree.enable();
          this.sampleTree.realignInkBar();
        }
      }
    } else {
      if (this.showCatchTab && this.batchTree?.enabled) {
        this.batchTree.disable();
      }
      if (this.showSamplesTab && this.sampleTree?.enabled) {
        this.sampleTree.disable();
      }
    }
    // Force expected sub tab index
    if (this.showBatchTables && this.batchTree && this.batchTree.selectedTabIndex !== this.selectedSubTabIndex) {
      this.batchTree.setSelectedTabIndex(this.selectedSubTabIndex);
    } else if (this.showSamplesTab && this.sampleTree && this.sampleTree.selectedTabIndex !== this.selectedSubTabIndex) {
      this.sampleTree.setSelectedTabIndex(this.selectedSubTabIndex);
    }
  }

  protected async loadLinkedOperation(data: Operation): Promise<void> {
    const childOperationId = toNumber(data.childOperationId, data.childOperation?.id);
    // Load child operation
    if (isNotNil(childOperationId)) {
      try {
        data.childOperation = await this.dataService.load(childOperationId, { fetchPolicy: 'cache-first' });
        data.childOperationId = undefined;
      } catch (err) {
        console.error('Cannot load child operation: reset', err);
        data.childOperation = undefined;
        data.childOperationId = undefined;
        data.parentOperation = undefined;
      }
    } else {
      // Load parent operation
      const parentOperationId = toNumber(data.parentOperationId, data.parentOperation?.id);
      if (isNotNil(parentOperationId)) {
        let validParent = true;
        try {
          data.parentOperation = await this.dataService.load(parentOperationId, { fullLoad: false, fetchPolicy: 'cache-first' });
          data.parentOperationId = undefined;

          // Check parent operation is not already associated to another remote child operation
          if (
            data.parentOperation &&
            EntityUtils.isRemoteId(data.parentOperation.childOperationId) &&
            data.parentOperation.childOperationId !== data.id
          ) {
            console.error(
              `Parent operation exists, but already linked to another remote operation: #${data.parentOperation.childOperationId}: mark parent has missing, to force user to fix it`
            );
            validParent = false;
          }
        } catch (err) {
          console.error('Cannot load parent operation: keep existing, to force user to fix it', err);
          validParent = false;
        }
        if (!validParent) {
          data.parentOperationId = undefined;
          // We create a fake Operation, with a qualityFlag = MISSING
          // This is required to detect error at validation time (see OperationValidators.existsParent)
          data.parentOperation = Operation.fromObject({
            id: parentOperationId,
            startDateTime: data.startDateTime,
            fishingStartDateTime: data.fishingStartDateTime,
            qualityFlagId: QualityFlagIds.MISSING,
          });
        }
      }
    }
  }

  protected computePageUrl(id: number | 'new'): string | any[] {
    const parentUrl = this.getParentPageUrl();
    return parentUrl && `${parentUrl}/operation/${id}`;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected computeNextTabIndex(): number | undefined {
    if (this.selectedTabIndex > 0) return undefined; // Already on the next tab

    return this.showCatchTab ? OperationPage.TABS.CATCH : this.showSamplesTab ? OperationPage.TABS.SAMPLE : undefined;
  }

  startListenChanges() {
    if (EntityUtils.isLocal(this.data)) return; // Skip if local entity

    super.startListenChanges();
  }

  /**
   * Update context, for batch validator
   *
   * @protected
   */
  protected updateDataContext() {
    console.debug('[operation-page] Updating data context...');
    // Date
    const date = this.lastEndDate || this.opeForm.lastStartDateTimeControl?.value;
    this.context.setValue('date', fromDateISOString(date));

    // Fishing area
    if (this.opeForm.showFishingArea) {
      const fishingAreas = this.opeForm.fishingAreasForm?.value || this.data?.fishingAreas;
      this.context.setValue('fishingAreas', fishingAreas);
      this.context.resetValue('vesselPositions');
    }

    // Or vessel positions
    else if (this.opeForm.showPosition) {
      const positions = [this.opeForm.firstActivePositionControl?.value, this.opeForm.lastActivePositionControl?.value].filter((position) =>
        PositionUtils.isNotNilAndValid(position)
      );
      this.context.setValue('vesselPositions', positions);
      this.context.resetValue('fishingAreas');
    }
  }

  /**
   * Navigate to other operation
   *
   * @param id
   * @param opts
   * @protected
   */
  protected async navigateTo(id: number | 'new', opts?: { queryParams?: any; replaceUrl?: boolean; tripId?: number }): Promise<boolean> {
    const path = this.computePageUrl(id);
    const commands: any[] = path && typeof path === 'string' ? path.split('/').slice(1) : (path as any[]);
    if (isNotEmptyArray(commands)) {
      // Change the trip id in path
      if (isNotNil(opts?.tripId) && commands[0] === 'trips' && +commands[1] === this.tripId) {
        commands[1] = opts.tripId;
      }

      // Should replace the current page in history ? (default: true)
      let replaceUrl = !opts || opts.replaceUrl !== false;
      const queryParams = opts?.queryParams || {};

      // Workaround, to force angular to reload a new page
      if (id === 'new') {
        const ok = await this.goBack();
        if (!ok) return;
        await sleep(450);
        replaceUrl = false; // No more need to replace the current page in history
      } else {
        queryParams[this.pathIdAttribute] = '' + id;
      }

      return await this.router.navigate(commands, {
        replaceUrl,
        queryParams,
      });
    }
    return Promise.reject('Missing page URL');
  }

  async openParentOperation(parent: Operation): Promise<boolean> {
    const saved =
      (this.mobile || this.isOnFieldMode) && (!this.dirty || this.valid)
        ? // If on field mode: try to save silently
          await this.save(null, { openTabIndex: -1 })
        : // If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm(null, {
            openTabIndex: -1,
          });

    if (!saved) return; // Skip

    // Not same trips
    if (this.tripId !== parent.tripId) {
      return this.navigateTo(parent.id, {
        replaceUrl: false, // IMPORTANT: back button will return to the curren OP
        tripId: parent.tripId,
        queryParams: { color: <PredefinedColors>'secondary' },
      });
    } else {
      // Open, and replace the current OP
      return this.navigateTo(parent.id);
    }
  }

  protected async downloadAsJson(event?: UIEvent) {
    const confirmed = await this.saveIfDirtyAndConfirm(event);
    if (confirmed === false) return;

    if (!EntityUtils.isRemoteId(this.data?.id)) return; // Skip

    // Create file content
    const data = await this.dataService.load(this.data.id, { fullLoad: true });
    const json = data.asObject(MINIFY_ENTITY_FOR_LOCAL_STORAGE);
    const content = JSON.stringify([json]);

    // Write to file
    FilesUtils.writeTextToFile(content, {
      filename: this.translate.instant('TRIP.OPERATION.LIST.DOWNLOAD_JSON_FILENAME'),
      type: 'application/json',
    });
  }

  protected async openDownloadPage(type: ExtractionType) {
    const confirmed = await this.saveIfDirtyAndConfirm();
    if (confirmed === false) return;

    const trip = this.trip;
    if (!EntityUtils.isRemoteId(trip?.id) || !EntityUtils.isRemoteId(this.data?.id)) return; // Skip

    // Create extraction type and filter
    type = type || ExtractionType.fromLiveLabel('PMFM_TRIP');
    const programLabel = trip.program?.label;
    const tripId = trip.id;
    const operationId = this.data.id;
    const filter = ExtractionUtils.createTripFilter(programLabel, [tripId], [operationId]);
    const queryParams = ExtractionUtils.asQueryParams(type, filter);

    // Open extraction
    await this.router.navigate(['extraction', 'data'], { queryParams });
  }

  // For DEV only
  async devFillTestValue() {
    console.debug(this.logPrefix + 'DEV auto fill data');
    await this.ready();
    await this.waitIdle({ stop: this.destroySubject });

    const startDateTime = this.trip?.departureDateTime?.clone().add(1, 'hour') || DateUtils.moment().startOf('hour');
    const fishingStartDateTime = startDateTime.clone().add(1, 'hour');
    const fishingEndDateTime = fishingStartDateTime.clone().add(2, 'hour');
    const endDateTime = fishingEndDateTime.clone().add(1, 'hour');

    const physicalGear = this.data?.physicalGear?.asObject();
    const gearId = physicalGear?.gear?.id;
    let metiers: ReferentialRef[];
    if (isNotNil(gearId)) {
      metiers = (
        await this.referentialRefService.loadAll(
          0,
          1,
          null,
          null,
          <Partial<ReferentialRefFilter>>{
            ...METIER_DEFAULT_FILTER,
            searchJoin: 'TaxonGroup',
            searchJoinLevelIds: this.opeForm.metierTaxonGroupTypeIds,
            levelId: gearId,
          },
          { withTotal: false }
        )
      )?.data;
    }
    const operation = Operation.fromObject(<Operation>{
      trip: this.trip.asObject(),
      physicalGear,
      metier: metiers?.[0],
      startDateTime,
      fishingStartDateTime: this.opeForm.fishingStartDateTimeEnable ? fishingStartDateTime : undefined,
      fishingEndDateTime: this.opeForm.fishingEndDateTimeEnable ? fishingEndDateTime : undefined,
      endDateTime: this.opeForm.endDateTimeEnable ? endDateTime : undefined,
      positions: [
        <VesselPosition>{ dateTime: startDateTime, latitude: 49.5, longitude: -6.8 },
        <VesselPosition>{ dateTime: fishingStartDateTime, latitude: 49.505, longitude: -6.85 },
        <VesselPosition>{ dateTime: fishingEndDateTime, latitude: 49.52, longitude: -6.95 },
        <VesselPosition>{ dateTime: endDateTime, latitude: 49.525, longitude: -6.98 },
      ],
      measurements: [
        { numericalValue: 1, pmfmId: PmfmIds.TRIP_PROGRESS },
        { numericalValue: 1, pmfmId: PmfmIds.HAS_INDIVIDUAL_MEASURES },
        // APASE
        { numericalValue: 1, pmfmId: PmfmIds.DIURNAL_OPERATION },
        //{ numericalValue: 1, pmfmId: 188 }, // GPS_USED
      ],
      catchBatch: <Batch>{
        label: AcquisitionLevelCodes.CATCH_BATCH,
        rankOrder: 1,
      },
    });

    this.measurementsForm.value = operation.measurements;
    this.form.patchValue(operation);
  }
}
