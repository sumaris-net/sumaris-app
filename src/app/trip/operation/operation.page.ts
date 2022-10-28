import { ChangeDetectionStrategy, Component, Injector, Optional, ViewChild } from '@angular/core';
import { OperationSaveOptions, OperationService } from '../services/operation.service';
import { OperationForm } from './operation.form';
import { TripService } from '../services/trip.service';
import { MeasurementsForm } from '../measurement/measurements.form.component';
import {
  AppEditorOptions,
  AppEntityEditor,
  AppErrorWithDetails,
  AppFormUtils,
  AppHelpModal,
  AppHelpModalOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  fadeInOutAnimation,
  firstNotNilPromise,
  fromDateISOString,
  HistoryPageReference,
  Hotkeys,
  IEntity,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  ReferentialUtils,
  toBoolean,
  toNumber,
  UsageMode,
  WaitForOptions
} from '@sumaris-net/ngx-components';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, startWith, switchMap, takeUntil, tap, throttleTime } from 'rxjs/operators';
import { UntypedFormGroup, Validators } from '@angular/forms';
import { Moment } from 'moment';
import { Program } from '@app/referential/services/model/program.model';
import { Operation, OperationUtils, Trip } from '../services/model/trip.model';
import { OperationPasteFlags, ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, AcquisitionLevelType, PmfmIds, QualitativeLabels, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { IBatchTreeComponent } from '../batch/tree/batch-tree.component';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BehaviorSubject, from, merge, Subscription, timer } from 'rxjs';
import { Measurement, MeasurementUtils } from '@app/trip/services/model/measurement.model';
import { IonRouterOutlet, ModalController } from '@ionic/angular';
import { SampleTreeComponent } from '@app/trip/sample/sample-tree.component';
import { IPmfmForm, OperationValidators } from '@app/trip/services/validator/operation.validator';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { APP_ENTITY_EDITOR } from '@app/data/quality/entity-quality-form.component';
import { IDataEntityQualityService } from '@app/data/services/data-quality-service.class';
import { ContextService } from '@app/shared/context.service';
import { Geometries } from '@app/shared/geometries.utils';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { flagsToString, removeFlag } from '@app/shared/flags.utils';
import { moment } from '@app/vendor';

@Component({
  selector: 'app-operation-page',
  templateUrl: './operation.page.html',
  styleUrls: ['./operation.page.scss'],
  animations: [fadeInOutAnimation],
  providers: [
    { provide: APP_ENTITY_EDITOR, useExisting: OperationPage },
    { provide: ContextService, useExisting: TripContextService},
    {
      provide: IonRouterOutlet,
      useValue: {
        // Tweak the IonRouterOutlet if this component shown in a modal
        canGoBack: () => false,
        nativeEl: '',
      },
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationPage
  extends AppEntityEditor<Operation, OperationService>
  implements IDataEntityQualityService<Operation> {

  protected static TABS = {
    GENERAL: 0,
    CATCH: 1,
    SAMPLE: 2,
  };

  private _lastOperationsTripId: number;
  private _measurementSubscription: Subscription;
  private _sampleRowSubscription: Subscription;
  private _forceMeasurementAsOptionalOnFieldMode = false;

  protected tripService: TripService;
  protected tripContext: TripContextService;
  protected programRefService: ProgramRefService;
  protected settings: LocalSettingsService;
  protected modalCtrl: ModalController;
  protected hotkeys: Hotkeys;

  readonly dateTimePattern: string;
  readonly showLastOperations: boolean;
  readonly mobile: boolean;
  readonly $acquisitionLevel = new BehaviorSubject<string>(null);
  readonly $programLabel = new BehaviorSubject<string>(null);
  readonly $tripId = new BehaviorSubject<number>(null);
  readonly $lastOperations = new BehaviorSubject<Operation[]>(null);
  readonly $lastEndDate = new BehaviorSubject<Moment>(null);

  trip: Trip;
  measurements: Measurement[];
  saveOptions: OperationSaveOptions = {};
  rankOrder: number;
  selectedSubTabIndex = 0;
  allowParentOperation = false;
  autoFillBatch = false;
  autoFillDatesFromTrip = false;
  displayAttributes: {
    gear?: string[];
    [key:string]: string[]
  } = {};

  // All second tabs components are disabled, by default (waiting PMFM measurements to decide that to show)
  showCatchTab = false;
  showSamplesTab = false;
  showBatchTables = false;
  showBatchTablesByProgram = true;
  showSampleTablesByProgram = false;
  isDuplicatedData = false;
  operationPasteFlags: number;
  readonly forceOptionalExcludedPmfmIds: number[];

  @ViewChild('opeForm', { static: true }) opeForm: OperationForm;
  @ViewChild('measurementsForm', { static: true }) measurementsForm: MeasurementsForm;

  // Catch batch, sorting batches, individual measure
  @ViewChild('batchTree', { static: true }) batchTree: IBatchTreeComponent;

  // Sample tables
  @ViewChild('sampleTree', { static: true }) sampleTree: SampleTreeComponent;

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

  constructor(
    injector: Injector,
    dataService: OperationService,
    @Optional() options?: AppEditorOptions
  ) {
    super(injector, Operation, dataService, {
      pathIdAttribute: 'operationId',
      tabCount: 3,
      autoOpenNextTab: !injector.get(LocalSettingsService).mobile,
      i18nPrefix: 'TRIP.OPERATION.EDIT.',
      ...options
    });

    this.tripService = injector.get(TripService);
    this.tripContext = injector.get(TripContextService);
    this.programRefService = injector.get(ProgramRefService);
    this.settings = injector.get(LocalSettingsService);
    this.modalCtrl = injector.get(ModalController);
    this.dateTimePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');
    this.displayAttributes.gear = this.settings.getFieldDisplayAttributes('gear');
    this.hotkeys = injector.get(Hotkeys);

    // Init defaults
    this.mobile = this.settings.mobile;
    this.showLastOperations = this.settings.isUsageMode('FIELD');
    this.forceOptionalExcludedPmfmIds = [
      PmfmIds.SURVIVAL_SAMPLING_TYPE,
      PmfmIds.HAS_ACCIDENTAL_CATCHES,
      PmfmIds.HAS_INDIVIDUAL_MEASURES
    ];

    // Get paste flags from clipboard, if related to Operation
    const clipboard = this.tripContext?.clipboard;
    this.operationPasteFlags = OperationUtils.isOperation(clipboard?.data) && clipboard.pasteFlags || 0;

    // Add shortcut
    if (!this.mobile) {
      this.registerSubscription(
        this.hotkeys.addShortcut({ keys: 'f1', description: 'COMMON.BTN_SHOW_HELP', preventDefault: true })
          .subscribe((event) => this.openHelpModal(event)),
      );
      this.registerSubscription(
        this.hotkeys.addShortcut({ keys: 'control.+', description: 'COMMON.BTN_ADD', preventDefault: true })
          .pipe(filter(e => !this.disabled && this.showFabButton))
          .subscribe((event) => this.onNewFabButtonClick(event)),
      );
    }

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  // TODO Hide lastOperation on to small screen
  /*@HostListener('window:resize', ['$event'])
  onResize(event?: Event) {
    this.showLastOperations = window.innerWidth < ; // XS screen
    console.debug('[menu] Screen size (px): ' + this._screenWidth);
  }*/

  async control(data: Operation, opts?: any): Promise<AppErrorWithDetails> {
    const errors = await this.service.control(data, {
      ...opts,
      trip: this.trip
    });
    if (!errors) return;
    const pmfms = await firstNotNilPromise(this.measurementsForm.$pmfms, {stop: this.destroySubject});
    const errorMessage = this.errorTranslator.translateErrors(errors, {
      controlPathTranslator: {
        translateControlPath: (path) => this.service.translateControlPath(path, {
          i18nPrefix: this.i18nContext.prefix,
          pmfms
        })
      }
    });
    return {
      details: {
        errors,
        message: errorMessage
      }
    };
  }

  canUserWrite(data: Operation, opts?: any): boolean {
    return isNil(this.trip?.validationDate) && this.dataService.canUserWrite(data, {...opts, trip: this.trip});
  }

  qualify(data: Operation, qualityFlagId: number): Promise<Operation> {
    return this.dataService.qualify(data, qualityFlagId);
  }

  async openHelpModal(event) {
    if (event) event.preventDefault();

    console.debug('[operation-page] Open help page...');
    const modal = await this.modalCtrl.create({
      component: AppHelpModal,
      componentProps: <AppHelpModalOptions>{
        title: this.translate.instant('COMMON.HELP.TITLE'),
        markdownUrl: 'https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-doc/-/raw/master/user-manual/index_fr'
      },
      backdropDismiss: true
    });
    return modal.present();
  }

  ngOnInit() {
    super.ngOnInit();

    // Watch program, to configure tables from program properties
    this.registerSubscription(
      this.$programLabel
        .pipe(
          filter(isNotNilOrBlank),
          distinctUntilChanged(),
          switchMap(programLabel => this.programRefService.watchByLabel(programLabel))
        )
        .subscribe(program => this.setProgram(program)));

    // Watch trip
    this.registerSubscription(
      this.$tripId
        .pipe(
          // Only if tripId changes
          filter(tripId => isNotNil(tripId) && this._lastOperationsTripId !== tripId),

          // Update default back Href
          tap(tripId => {
            this._lastOperationsTripId = tripId; // Remember new trip id
            // Update back href
            const tripHref = `/trips/${tripId}?tab=2`;
            if (this.defaultBackHref !== tripHref) {
              this.defaultBackHref = tripHref;
              this.markForCheck();
            }
          }),

          // Load last operations (if enabled)
          //filter(_ => this.showLastOperations),
          filter(isNotNil),
          debounceTime(500),
          switchMap(tripId => this.dataService.watchAll(
            0, 5,
            'startDateTime', 'desc',
            {tripId}, {
              withBatchTree: false,
              withSamples: false,
              computeRankOrder: false,
              withTotal: true,
              fetchPolicy: 'cache-and-network'
            })),
          map(res => res && res.data || []),
          tap(data => this.$lastOperations.next(data))
        )
        .subscribe()
    );

    // Update the data context
    this.registerSubscription(
      merge(
        this.selectedTabIndexChange
          .pipe(
            filter(tabIndex => tabIndex === OperationPage.TABS.CATCH && this.showBatchTables)
          ),
        from(this.ready())
      )
        .pipe(
          debounceTime(500),
          throttleTime(500)
        )
        .subscribe(_ => this.updateDataContext())
    )
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    this.registerSubscription(
      this.opeForm.physicalGearControl.valueChanges
        .subscribe(physicalGear => {
          // skip if loading (when opening an existing operation, setPhysicalGear() is called by onEntityLoaded())
          if (!this.loading) {
            this.setPhysicalGear(physicalGear)
          }
        })
    );

    if (this.measurementsForm) {
      this.registerSubscription(
        this.measurementsForm.$pmfms
          .pipe(
            filter(isNotNil),
            mergeMap(_ => this.measurementsForm.ready())
          )
          .subscribe(_ => this.onMeasurementsFormReady())
      );
    }

    // Manage tab group
    {
      const queryParams = this.route.snapshot.queryParams;
      const subTabIndex = queryParams['subtab'] && parseInt(queryParams['subtab']) || 0;
      this.selectedSubTabIndex = subTabIndex;
    }
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
      this.showCatchTab = this.batchTree.showCatchForm;
      this._measurementSubscription.add(
        samplingTypeControl.valueChanges
          .pipe(
            debounceTime(400),
            startWith<any, any>(samplingTypeControl.value),
            filter(ReferentialUtils.isNotEmpty),
            map(qv => qv.label),
            distinctUntilChanged()
          )
          .subscribe(qvLabel => {

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
            this.showSamplesTab = this.showSampleTablesByProgram;
            this.tabCount = this.showSamplesTab ? 3 : (this.showCatchTab ? 2 : 1);

            // Force first sub tab index, if modification was done from the form
            // This condition avoid to change subtab, when reloading the page
            if (this.selectedTabIndex == OperationPage.TABS.GENERAL) {
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
          .pipe(
            debounceTime(400),
            startWith<any, any>(hasAccidentalCatchesControl.value),
            filter(isNotNil),
            distinctUntilChanged()
          )
          .subscribe(hasAccidentalCatches => {

            if (this.debug) console.debug('[operation] Enable/Disable samples table, because HAS_ACCIDENTAL_CATCHES=' + hasAccidentalCatches);

            // Enable samples, when has accidental catches
            this.showSampleTablesByProgram = hasAccidentalCatches;
            this.showSamplesTab = this.showSampleTablesByProgram;
            this.showCatchTab = this.showBatchTables || this.batchTree?.showCatchForm || false;
            this.tabCount = this.showSamplesTab ? 3 : (this.showCatchTab ? 2 : 1);

            // Force first tab index
            if (this.selectedTabIndex == OperationPage.TABS.GENERAL) {
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
        this.opeForm.onParentChanges
          .pipe(
            startWith<Operation>(this.opeForm.parentControl.value as Operation),
            map(parent => !!parent), // Convert to boolean
            distinctUntilChanged()
          )
          .subscribe(async (hasParent) => {
            let acquisitionLevel: AcquisitionLevelType;
            if (hasParent) {
              if (this.debug) console.debug('[operation] Enable batch tables');
              this.showBatchTables = this.showBatchTablesByProgram;
              this.showCatchTab = this.showBatchTables || this.batchTree?.showCatchForm || false;
              this.showSamplesTab = this.showSampleTablesByProgram;
              this.tabCount = this.showSamplesTab ? 3 : (this.showCatchTab ? 2 : 1);
              acquisitionLevel = AcquisitionLevelCodes.CHILD_OPERATION;
            } else {
              if (this.debug) console.debug('[operation] Disable batch tables');
              this.showBatchTables = false;
              this.showSamplesTab = false;
              this.showCatchTab = false;
              this.tabCount = 1;
              acquisitionLevel = AcquisitionLevelCodes.OPERATION;
            }

            // Change acquisition level, if need
            if (this.$acquisitionLevel.value !== acquisitionLevel) {
              this.$acquisitionLevel.next(acquisitionLevel);
            }

            // Force first tab index
            if (this.selectedTabIndex == OperationPage.TABS.GENERAL) {
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
      if (!this.allowParentOperation) {
        defaultTableStates = true;
      }
      this._measurementSubscription.add(
        hasIndividualMeasuresControl.valueChanges
          .pipe(
            debounceTime(400),
            startWith<any, any>(hasIndividualMeasuresControl.value),
            filter(isNotNil),
            distinctUntilChanged()
          )
          .subscribe(hasIndividualMeasures => {
            this.batchTree.allowSamplingBatches = hasIndividualMeasures;
            this.batchTree.defaultHasSubBatches = hasIndividualMeasures;
            this.batchTree.allowSubBatches = hasIndividualMeasures;
            // Hide button to toggle hasSubBatches (yes/no) when value if forced
            this.batchTree.setModalOption("showHasSubBatchesButton", !hasIndividualMeasures)
            if (!this.allowParentOperation) {
              this.showCatchTab = this.showBatchTables || this.batchTree.showCatchForm;
              this.tabCount = 1 + (this.showCatchTab ? 1 : 0) + (this.showSamplesTab ? 1 : 0);
            }
            this.updateTablesState();
          })
      );
    }

    // Show default tables state
    if (defaultTableStates) {
      if (this.debug) console.debug('[operation] Enable default tables (Nor SUMARiS nor ADAP pmfms were found)');
      this.showBatchTables = this.showBatchTablesByProgram;
      this.showCatchTab = this.showBatchTables || this.batchTree?.showCatchForm || false;
      this.showSamplesTab = this.showSampleTablesByProgram;
      this.tabCount = this.showSamplesTab ? 3 : (this.showCatchTab ? 2 : 1);
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
          .pipe(
            debounceTime(400),
            startWith<any, any>(tripProgressControl.value),
            filter(isNotNilOrBlank),
            distinctUntilChanged()
          )
          .subscribe(normalProgress => {
            if (!normalProgress) console.debug('[operation] Abnormal OPE: comment is now required');
            this.opeForm.requiredComment = !normalProgress;
            this.markForCheck();
          })
      );
    }


    // If has errors from context, applies it on form.
    const error = isNil(this.data?.controlDate) && this.data?.qualificationComments;
    if (error) {
      console.info('[operation-page] Operation errors: ', error);
     // this.setError({message: 'COMMON.FORM.HAS_ERROR', details: {message: error}}, {detailsCssClass: 'error-details'});
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._measurementSubscription?.unsubscribe();
    this._sampleRowSubscription?.unsubscribe();
    this.$acquisitionLevel.complete();
    this.$programLabel.complete();
    this.$lastOperations.complete();
    this.$tripId.complete();
  }

  protected async setProgram(program: Program) {
    if (!program) return; // Skip
    if (this.debug) console.debug(`[operation] Program ${program.label} loaded, with properties: `, program.properties);

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
    this.opeForm.showMetierFilter = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_METIER_FILTER);
    this.opeForm.programLabel = program.label;
    this.opeForm.fishingStartDateTimeEnable = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE);
    this.opeForm.fishingEndDateTimeEnable = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE);
    this.opeForm.endDateTimeEnable = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE);
    this.opeForm.maxShootingDurationInHours = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_SHOOTING_DURATION_HOURS);
    this.opeForm.maxTotalDurationInHours = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_TOTAL_DURATION_HOURS);
    this.operationPasteFlags = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_PASTE_FLAGS);
    if (this.debug && this.operationPasteFlags !== 0) {
      console.debug(`[operation-page] Enable duplication with paste flags: ${flagsToString(this.operationPasteFlags, OperationPasteFlags)}`);
    }

    this.measurementsForm.i18nSuffix = i18nSuffix;
    this.measurementsForm.forceOptional = this.forceMeasurementAsOptional;

    this.saveOptions.computeBatchRankOrder = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_RANK_ORDER_COMPUTE);
    this.saveOptions.computeBatchIndividualCount = !this.mobile && program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_INDIVIDUAL_COUNT_COMPUTE);
    this.saveOptions.computeBatchWeight = !this.mobile && program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE);

    this.showBatchTablesByProgram = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_ENABLE);
    this.showSampleTablesByProgram = program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_ENABLE);

    if (!this.allowParentOperation) {
      this.$acquisitionLevel.next(AcquisitionLevelCodes.OPERATION);
    }

    if (this.batchTree) this.batchTree.program = program;
    if (this.sampleTree) this.sampleTree.program = program;

    // Load available taxon groups (e.g. with taxon groups found in strategies)
    await this.initAvailableTaxonGroups(program.label);

    this.markAsReady();
  }

  protected setPhysicalGear(physicalGear: PhysicalGear) {
    const gearId = toNumber(physicalGear?.gear?.id, null);
    this.measurementsForm.gearId = gearId;
    if (this.batchTree) {
      this.batchTree.gearId = gearId;
      this.batchTree.physicalGear = physicalGear || null;
    }
  }

  load(id?: number, opts?: EntityServiceLoadOptions & { emitEvent?: boolean; openTabIndex?: number; updateRoute?: boolean; [p: string]: any }): Promise<void> {
    return super.load(id, {...opts, withLinkedOperation: true});
  }

  async onNewEntity(data: Operation, options?: EntityServiceLoadOptions): Promise<void> {
    const tripId = options && isNotNil(options.tripId) ? +(options.tripId) :
      isNotNil(this.trip && this.trip.id) ? this.trip.id : (data && data.tripId);
    if (isNil(tripId)) throw new Error('Missing argument \'options.tripId\'!');
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
    const clipboard = this.tripContext?.clipboard;
    if (OperationUtils.isOperation(clipboard?.data)) {

      // Do NOT copy dates, when in the on field mode (will be filled later)
      if (this.isOnFieldMode) {
        data.paste(clipboard?.data, removeFlag(this.operationPasteFlags, OperationPasteFlags.DATE));
      }
      else {
        data.paste(clipboard?.data, this.operationPasteFlags);
      }

      // Reset clipboard
      this.tripContext?.setValue('clipboard', null);

      this.isDuplicatedData = true;
    }

    // If is on field mode, then fill default values
    if (this.isOnFieldMode) {
      data.startDateTime = moment();

      if (!this.isDuplicatedData) {
        // Wait last operations to be loaded
        const previousOperations = await firstNotNilPromise(this.$lastOperations, {stop: this.destroySubject});

        // Copy from previous operation only if is not a duplicated operation
        const previousOperation = (previousOperations || [])
          .find(ope => ope && ope !== data && ReferentialUtils.isNotEmpty(ope.metier));
        if (previousOperation) {
          data.physicalGear = (trip.gears || []).find(g => EntityUtils.equals(g, previousOperation.physicalGear, 'id')) || data.physicalGear;
          data.metier = previousOperation.metier;
          data.rankOrderOnPeriod = previousOperation.rankOrderOnPeriod + 1;
        }
      }
    }

    // Propage program
    if (data.programLabel) this.$programLabel.next(data.programLabel);
  }

  async onEntityLoaded(data: Operation, options?: EntityServiceLoadOptions): Promise<void> {
    const tripId = options && isNotNil(options.tripId) ? +(options.tripId) :
      isNotNil(this.trip && this.trip.id) ? this.trip.id : (data && data.tripId);
    if (isNil(tripId)) throw new Error('Missing argument \'options.tripId\'!');
    data.tripId = tripId;

    const trip = await this.loadTrip(tripId);

    // Replace physical gear by the real entity
    data.physicalGear = (trip.gears || []).find(g => EntityUtils.equals(g, data.physicalGear, 'id')) || data.physicalGear;
    data.programLabel = trip.program?.label;
    data.vesselId = trip.vesselSnapshot?.id;

    await this.loadLinkedOperation(data);

    // Propage program
    if (data.programLabel) this.$programLabel.next(data.programLabel);

    // Propage physical gear
    if (data.physicalGear) this.setPhysicalGear(data.physicalGear);
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
   * @param data
   * @param opts
   */
  protected async computeTitle(data: Operation, opts?: {
    withPrefix?: boolean;
  }): Promise<string> {

    // Trip exists
    const titlePrefix = (!opts || opts.withPrefix !== false) && this.trip && (await this.translate.get('TRIP.OPERATION.TITLE_PREFIX', {
      vessel: this.trip && this.trip.vesselSnapshot && (this.trip.vesselSnapshot.exteriorMarking || this.trip.vesselSnapshot.name) || '',
      departureDateTime: this.trip && this.trip.departureDateTime && this.dateFormat.transform(this.trip.departureDateTime) as string || ''
    }).toPromise()) || '';

    // new ope
    if (!data || isNil(data.id)) {
      return titlePrefix + (await this.translate.get('TRIP.OPERATION.NEW.TITLE').toPromise());
    }

    // Get rankOrder from context, or compute it (if NOT mobile to avoid a long operation)
    let rankOrder = this.tripContext?.operation?.rankOrderOnPeriod;
    if (isNil(rankOrder) && !this.mobile) {
      const now = Date.now();
      console.info('[operation-page] Computing rankOrder...');
      rankOrder = await this.service.computeRankOrder(data, { fetchPolicy: 'cache-first' });
      console.info(`[operation-page] Computing rankOrder [OK] #${rankOrder} - in ${Date.now()-now}ms`);
    }
    if (rankOrder) {
      return titlePrefix + (await this.translate.get('TRIP.OPERATION.EDIT.TITLE', {
        startDateTime: data.startDateTime && this.dateFormat.transform(data.startDateTime, {time: true}) as string,
        rankOrder
      }).toPromise()) as string;
    }
    // No rankOrder (e.g. if mobile)
    else {
      // Display date+time, or time only if today
      const startDateTime = data.startDateTime && (
        moment().isSame(data.startDateTime, 'day')
          ? this.dateFormat.transform(data.startDateTime, {pattern: 'HH:mm'})
          : this.dateFormat.transform(data.startDateTime, {time: true})) as string;
      return titlePrefix + (await this.translate.get('TRIP.OPERATION.EDIT.TITLE_NO_RANK', {startDateTime}).toPromise()) as string;
    }
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {

    if (this.mobile) return; // Skip if mobile

    return {
      ...(await super.computePageHistory(title)),
      icon: 'navigate'
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
    return AppFormUtils.waitIdle(this, opts);
  }

  async onLastOperationClick(event: Event, id: number): Promise<any> {
    if (event?.defaultPrevented) return; // Skip

    if (isNil(id) || this.data.id === id) return; // skip

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const savePromise: Promise<boolean> = this.isOnFieldMode && this.dirty && this.valid
      // If on field mode: try to save silently
      ? this.save(event)
      // If desktop mode: ask before save
      : this.saveIfDirtyAndConfirm(null, {
        emitEvent: false /*do not update view*/
      });
    const canContinue = await savePromise;

    if (canContinue) {
      return this.load(+id, {tripId: this.data.tripId, updateTabAndRoute: true});
    }
  }

  async saveAndNew(event: Event): Promise<any> {
    if (event?.defaultPrevented) return Promise.resolve(); // Skip
    event?.preventDefault(); // Avoid propagation to <ion-item>

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const saved = (this.isOnFieldMode && this.dirty && this.valid)
      // If on field mode AND valid: save silently
      ? await this.save(event)
      // Else If desktop mode: ask before save
      : await this.saveIfDirtyAndConfirm(null, {
        emitEvent: false /*do not update view*/
      });
    if (saved) {
      if (this.mobile) {
        return this.load(undefined, {
          tripId: this.data.tripId,
          updateRoute: true,
          openTabIndex: OperationPage.TABS.GENERAL
        });
      } else {
        return this.router.navigate(['..', 'new'], {
          relativeTo: this.route,
          replaceUrl: true,
          queryParams: {tab: OperationPage.TABS.GENERAL}
        });
      }
    }
  }

  async duplicate(event: Event): Promise<any> {
    if (event?.defaultPrevented || !this.tripContext) return Promise.resolve(); // Skip
    event?.preventDefault(); // Avoid propagation to <ion-item>

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const saved = (this.isOnFieldMode && this.dirty && this.valid)
      // If on field mode AND valid: save silently
      ? await this.save(event)
      // Else If desktop mode: ask before save
      : await this.saveIfDirtyAndConfirm(null, {
        emitEvent: false /*do not update view*/
      });

    if (!saved) return; // User cancelled, or cannot saved => skip

    // Fill context's clipboard
    this.tripContext.setValue('clipboard', {
      data: this.data,
      pasteFlags: this.operationPasteFlags
    });

    // Open new operation
    return this.router.navigate(['..', 'new'], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {tab: OperationPage.TABS.GENERAL}
    });
  }

  async setValue(data: Operation) {
    await this.opeForm.setValue(data);

    // Get gear, from the physical gear
    const physicalGearId = toNumber(data.physicalGear?.id, null);
    const gearId = toNumber(data?.physicalGear?.gear?.id, null);

    // Set measurements form
    this.measurementsForm.gearId = gearId;
    this.measurementsForm.programLabel = this.$programLabel.value;
    const isChildOperation = data.parentOperation || isNotNil(data.parentOperationId);
    const acquisitionLevel = isChildOperation ? AcquisitionLevelCodes.CHILD_OPERATION : AcquisitionLevelCodes.OPERATION;
    if (this.measurementsForm.acquisitionLevel !== acquisitionLevel && !this.measurementsForm.loading) {
      await this.measurementsForm.unload();
    }
    if (this.$acquisitionLevel.value !== acquisitionLevel) {
      this.$acquisitionLevel.next(acquisitionLevel);
    }
    await this.measurementsForm.setValue(data && data.measurements || []);

    // Set batch tree
    if (this.batchTree) {
      this.batchTree.physicalGear = data.physicalGear;
      this.batchTree.gearId = gearId;
      await this.batchTree.setValue(data && data.catchBatch || null);
    }

    // Set sample tree
    if (this.sampleTree) await this.sampleTree.setValue(data && data.samples || []);

    // If new data, auto fill the table
    if (this.isNewData) {
      if (this.autoFillDatesFromTrip && !this.isDuplicatedData)
        this.opeForm.fillWithTripDates();
    }
  }

  cancel(event): Promise<void> {

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

    // Display form error, if  has errors from context, applies it on form.
    const error = this.enabled && this.usageMode === 'DESK' && isNil(data.controlDate) && data.qualificationComments;
    if (error) {
      this.form.get('qualificationComments').reset();
      setTimeout(() => {
        console.info('[operation-page] Operation errors: ', error);
        this.markAllAsTouched();
        this.form.updateValueAndValidity();
        this.setError({message: 'COMMON.FORM.HAS_ERROR', details: {message: error}}, {detailsCssClass: 'error-details'});
      });
    }
  }

  isCurrentData(other: IEntity<any>): boolean {
    return (this.isNewData && isNil(other.id))
      || (this.data && this.data.id === other.id);
  }

  async save(event, opts?: OperationSaveOptions): Promise<boolean> {
    // Save new gear to the trip
    const gearSaved = await this.saveNewPhysicalGear();
    if (!gearSaved) return false; // Stop if failed

    // Force to pass specific saved options to dataService.save()
    const saved = await super.save(event, <OperationSaveOptions>{
      ...this.saveOptions,
      updateLinkedOperation: this.opeForm.isParentOperation || this.opeForm.isChildOperation, // Apply updates on child operation if it exists
      ...opts
    });

    // Display form error on top
    if (!saved) {
      // DEBUG
      console.debug('[operation] Computing form error...');

      let error = '';
      if (this.opeForm.invalid) {
        error = this.opeForm.formError;
      }
      if (this.measurementsForm.invalid){
        error += (isNotNilOrBlank(error) ? ',' : '') + this.measurementsForm.formError;
      }

      this.setError(error);
      this.scrollToTop();
    }

    else if (this.dirty) {
      // Mark component has pristine
      this.batchTree?.markAsPristine();
      this.sampleTree?.markAsPristine();
    }

    return saved;
  }

  async saveIfDirtyAndConfirm(event?: Event, opts?: { emitEvent: boolean }): Promise<boolean> {
    return super.saveIfDirtyAndConfirm(event, {...this.saveOptions, ...opts});
  }

  async saveNewPhysicalGear(): Promise<boolean> {
    if (this.loading || this.saving) return false;
    if (!this.dirty) return true; // Skip

    const physicalGear = this.opeForm.physicalGearControl.value;
    if (!physicalGear || isNotNil(physicalGear.id)) return true; // Skip

    // DEBUG
    console.debug('[operation] Saving new physical gear...');

    this.markAsSaving();
    this.resetError();

    try {
      const savedPhysicalGear = await this.tripService.addGear(this.trip.id, physicalGear);

      // Update form with the new gear
      this.opeForm.physicalGearControl.patchValue(savedPhysicalGear, {emitEvent: false});
      this.trip.gears.push(savedPhysicalGear);

      return true;
    } catch (err) {
      this.setError(err);
      return false;
    } finally {
      this.markAsSaved({emitEvent: false});
    }
  }

  onPrepareSampleForm(pmfmForm: IPmfmForm) {
    console.debug('[operation-page] Initializing sample form (validators...)');
    this._sampleRowSubscription?.unsubscribe();
    this._sampleRowSubscription = this.computeSampleRowValidator(pmfmForm);
  }

  markAsLoaded(opts?: { emitEvent?: boolean }) {
    super.markAsLoaded(opts);
    this.children?.forEach(c => c.markAsLoaded(opts));
  }

  /* -- protected method -- */

  protected computeSampleRowValidator(pmfmForm: IPmfmForm): Subscription {
    return OperationValidators.addSampleValidators(pmfmForm);
  }

  protected async loadTrip(tripId: number): Promise<Trip> {

    // Update trip id (will cause last operations to be watched, if need)
    this.$tripId.next(+tripId);

    let trip = this.tripContext.getValue('trip') as Trip;

    // If not the expected trip: reload
    if (trip?.id !== tripId) {
      trip = await this.tripService.load(tripId, {fullLoad: true});
      // Update the context
      this.tripContext.setValue('trip', trip);
    }
    this.trip = trip;
    this.saveOptions.trip = trip;
    return trip;
  }

  /**
   * Open the first tab that is invalid
   */
  protected getFirstInvalidTabIndex(): number {
    // find invalids tabs (keep order)
    const invalidTabs = [
      this.opeForm.invalid || this.measurementsForm.invalid,
      this.showCatchTab && this.batchTree?.invalid || false,
      this.showSamplesTab && this.sampleTree?.invalid || false
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
    const contextualUsageMode = this.tripContext?.getValue('usageMode') as UsageMode;
    if (contextualUsageMode) return contextualUsageMode;

    // Read the settings
    return this.settings.isUsageMode('FIELD')
      && (
        isNil(this.trip) || (
          isNotNil(this.trip.departureDateTime)
          && fromDateISOString(this.trip.departureDateTime).diff(moment(), 'day') < 15))
        ? 'FIELD' : 'DESK';
  }

  protected registerForms() {
    // Register sub forms & table
    this.addChildForms([
      this.opeForm,
      this.measurementsForm,
      this.batchTree,
      this.sampleTree
    ]);
  }

  protected waitWhilePending(): Promise<void> {
    this.form.updateValueAndValidity();
    return super.waitWhilePending();
  }

  protected async getValue(): Promise<Operation> {
    const data = await super.getValue();

    // Batches
    if (this.showCatchTab && this.batchTree) {
      await this.batchTree.save();

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

    // Make sure parent operation has quality flag
    if (this.allowParentOperation && EntityUtils.isEmpty(json.parentOperation, 'id') && isNil(json.qualityFlagId)){
      console.warn('[operation-page] Parent operation does not have quality flag id');
      json.qualityFlagId = QualityFlagIds.NOT_COMPLETED;
      this.opeForm.qualityFlagControl.patchValue(QualityFlagIds.NOT_COMPLETED, {emitEvent: false});
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
    const qvMeasurement = (this.trip.measurements || []).find(m => m.pmfmId === PmfmIds.SELF_SAMPLING_PROGRAM);
    if (qvMeasurement && ReferentialUtils.isNotEmpty(qvMeasurement.qualitativeValue)) {

      // Retrieve QV from the program pmfm (because measurement's QV has only the 'id' attribute)
      const tripPmfms = await this.programRefService.loadProgramPmfms(programLabel, {acquisitionLevel: AcquisitionLevelCodes.TRIP});
      const pmfm = (tripPmfms || []).find(pmfm => pmfm.id === PmfmIds.SELF_SAMPLING_PROGRAM);
      const qualitativeValue = (pmfm && pmfm.qualitativeValues || []).find(qv => qv.id === qvMeasurement.qualitativeValue.id);

      // Transform QV.label has a list of TaxonGroup.label
      const contextualTaxonGroupLabels = qualitativeValue?.label
        .split(/[^\w]+/) // Split by separator (= not a word)
        .filter(isNotNilOrBlank)
        .map(label => label.trim().toUpperCase());

      // Limit the program list, using the restricted list
      if (isNotEmptyArray(contextualTaxonGroupLabels)) {
        availableTaxonGroups = availableTaxonGroups.filter(tg => contextualTaxonGroupLabels.some(label =>
          label === tg.label
          // Contextual 'RJB' must match RJB_1, RJB_2
          || tg.label.startsWith(label)));
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
        data.childOperation = await this.dataService.load(childOperationId, {fetchPolicy: 'cache-first'});
        data.childOperationId = undefined;
      } catch (err) {
        console.error('Cannot load child operation: reset', err);
        data.childOperation = undefined;
        data.childOperationId = undefined;
        data.parentOperation = undefined;
      }
    }

    else {

      // Load parent operation
      const parentOperationId = toNumber(data.parentOperationId, data.parentOperation?.id);
      if (isNotNil(parentOperationId)) {
        try {
          data.parentOperation = await this.dataService.load(parentOperationId, {fullLoad: false, fetchPolicy: 'cache-first'});
          data.parentOperationId = undefined;
        } catch (err) {
          console.error('Cannot load parent operation: keep existing, to force user to fix it', err);
          data.parentOperationId = undefined;
          data.parentOperation = Operation.fromObject({
            id: parentOperationId,
            startDateTime: data.startDateTime,
            fishingStartDateTime: data.fishingStartDateTime,
            qualityFlagId: QualityFlagIds.MISSING
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

    return this.showCatchTab ? OperationPage.TABS.CATCH :
      (this.showSamplesTab ? OperationPage.TABS.SAMPLE : undefined);
  }

  startListenRemoteChanges() {
    if (EntityUtils.isLocal(this.data)) return; // Skip if local entity

    super.startListenRemoteChanges();
  }

  /**
   * S context, for batch validator
   * @protected
   */
  protected updateDataContext() {
    console.debug('[operation-page] Updating data context...');
    // Date
    const date = this.$lastEndDate.value || this.opeForm.lastStartDateTimeControl?.value;
    this.tripContext.setValue('date', fromDateISOString(date));

    // Fishing area
    if (this.opeForm.showFishingArea) {

      const fishingAreas = this.opeForm.fishingAreasHelper && this.opeForm.fishingAreasHelper.formArray?.value
        || this.data?.fishingAreas;
      this.tripContext.setValue('fishingAreas', fishingAreas);
      this.tripContext.resetValue('vesselPositions');
    }

    // Or vessel positions
    else if (this.opeForm.showPosition) {
      const position = this.opeForm.lastActivePositionControl?.value;
      this.tripContext.setValue('vesselPositions', [position]);
      this.tripContext.resetValue('fishingAreas');
    }
  }
}
