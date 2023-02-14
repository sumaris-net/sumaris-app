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
  DateUtils,
  EntityServiceLoadOptions,
  EntityUtils,
  fadeInOutAnimation,
  firstNotNilPromise,
  fromDateISOString,
  HistoryPageReference,
  Hotkeys,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  ReferentialUtils,
  sleep,
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
import { from, merge, of, Subscription, timer } from 'rxjs';
import { Measurement, MeasurementUtils } from '@app/trip/services/model/measurement.model';
import { ModalController } from '@ionic/angular';
import { SampleTreeComponent } from '@app/trip/sample/sample-tree.component';
import { IPmfmForm, OperationValidators } from '@app/trip/services/validator/operation.validator';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { APP_ENTITY_EDITOR } from '@app/data/quality/entity-quality-form.component';
import { IDataEntityQualityService } from '@app/data/services/data-quality-service.class';
import { ContextService } from '@app/shared/context.service';
import { Geometries } from '@app/shared/geometries.utils';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { flagsToString, removeFlag } from '@app/shared/flags.utils';
import { PositionUtils } from '@app/trip/services/position.utils';
import { RxState } from '@rx-angular/state';
import { TripPageTabs } from '@app/trip/trip/trip.page';
import { PredefinedColors } from '@ionic/core';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';
import { RootDataEntity, RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';

export interface OperationState {
  hasIndividualMeasures?: boolean;
  physicalGear: PhysicalGear;
  gearId: number;
  acquisitionLevel: string;
  programLabel: string;
  program: Program;
  tripId: number;
  lastOperations: Operation[];
  lastEndDate: Moment;
}

@Component({
  selector: 'app-operation-page',
  templateUrl: './operation.page.html',
  styleUrls: ['./operation.page.scss'],
  animations: [fadeInOutAnimation],
  providers: [
    { provide: APP_ENTITY_EDITOR, useExisting: OperationPage },
    { provide: ContextService, useExisting: TripContextService},
    RxState
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationPage<S extends OperationState = OperationState>
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

  protected readonly _state: RxState<S> = this.injector.get(RxState);
  protected readonly hasIndividualMeasures$ = this._state.select('hasIndividualMeasures');
  protected readonly physicalGear$ = this._state.select('physicalGear');
  protected readonly gearId$ = this._state.select('gearId');

  protected tripService: TripService;
  protected context: TripContextService;
  protected programRefService: ProgramRefService;
  protected settings: LocalSettingsService;
  protected modalCtrl: ModalController;
  protected hotkeys: Hotkeys;

  readonly dateTimePattern: string;
  readonly showLastOperations: boolean;
  readonly mobile: boolean;
  readonly acquisitionLevel$ = this._state.select('acquisitionLevel');
  readonly programLabel$ = this._state.select( 'programLabel');
  readonly lastOperations$ = this._state.select('lastOperations');
  readonly lastEndDate$ = this._state.select('lastEndDate');

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
  toolbarColor:PredefinedColors = 'primary';

  // All second tabs components are disabled, by default (waiting PMFM measurements to decide that to show)
  showCatchTab = false;
  showSamplesTab = false;
  showBatchTables = false;
  showBatchTablesByProgram = true;
  showSampleTablesByProgram = false;
  isDuplicatedData = false;
  operationPasteFlags: number;
  _defaultIsParentOperation: boolean = true;
  newOperationUrl: string = null;
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

  get acquisitionLevel(): string {
    return this._state.get('acquisitionLevel');
  }
  set acquisitionLevel(value: string) {
    this._state.set('acquisitionLevel', () => value);
  }

  get programLabel(): string {
    return this._state.get('programLabel');
  }
  set programLabel(value: string) {
    this._state.set('programLabel', () => value);
  }

  get physicalGear(): PhysicalGear {
    return this._state.get('physicalGear');
  }
  set physicalGear(value: PhysicalGear) {
    this._state.set('physicalGear', () => value);
  }

  get tripId(): number {
    return this._state.get('tripId');
  }
  set tripId(value: number) {
    this._state.set('tripId', () => value);
  }
  get lastEndDate(): Moment {
    return this._state.get('lastEndDate');
  }
  set lastEndDate(value: Moment) {
    this._state.set('lastEndDate', () => value);
  }

  constructor(
    private injector: Injector,
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
    this.context = injector.get(TripContextService);
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
        this.hotkeys.addShortcut({ keys: 'f1', description: 'COMMON.BTN_SHOW_HELP', preventDefault: true })
          .subscribe((event) => this.openHelpModal(event)),
      );
      this.registerSubscription(
        this.hotkeys.addShortcut({ keys: 'control.+', description: 'COMMON.BTN_ADD', preventDefault: true })
          .pipe(filter(e => !this.disabled && this.showFabButton))
          .subscribe((event) => this.onNewFabButtonClick(event)),
      );
    }

    // Watch program, to configure tables from program properties
    this._state.connect('program', this._state.select('programLabel')
      .pipe(
        filter(isNotNilOrBlank),
        switchMap((programLabel: string) => {
          // Try to load by context
          const contextualProgram = this.context?.program;
          if (contextualProgram?.label === programLabel) {
            return of(contextualProgram);
          }
          // Load by service
          return this.programRefService.watchByLabel(programLabel, {debug: this.debug})
        })
      )
    );

    // Apply program
    this._state.hold(this._state.select('program'), program => {
      // Update the context (to avoid a reload, when opening the another operation)
      if (this.context && this.context.program !== program) {
        this.context.setValue('program', program);
      }

      return this.setProgram(program);
    });

    // Watch trip
    this._state.connect('lastOperations', this._state.select('tripId')
      .pipe(
        // Only if tripId changes
        filter(tripId => isNotNil(tripId) && this._lastOperationsTripId !== tripId),

        // Update default back Href
        tap(tripId => {
          this._lastOperationsTripId = tripId; // Remember new trip id
          // Update back href
          const tripHref = `/trips/${tripId}?tab=${TripPageTabs.OPERATIONS}`;
          if (this.defaultBackHref !== tripHref) {
            this.defaultBackHref = tripHref;
            this.markForCheck();
          }
        }),

        // Load last operations (if enabled)
        //filter(_ => this.showLastOperations),

        filter(isNotNil),
        //debounceTime(500),
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
        map(res => res && res.data || [])
      )
    );

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

    const pmfms = await firstNotNilPromise(this.measurementsForm.pmfms$, {stop: this.destroySubject});
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

    // Get physical gear by form
    this._state.connect('physicalGear', this.opeForm.physicalGearControl.valueChanges
      .pipe(
        // skip if loading (when opening an existing operation, physicalGear will be set inside onEntityLoaded() )
        filter((_) => !this.loading)
      )
    )

    this._state.connect('gearId', this.physicalGear$,
      (_, physicalGear) => toNumber(physicalGear?.gear?.id, null));

    this._state.hold(this.gearId$
      .pipe(filter(gearId => isNotNil(gearId) && this.loaded), debounceTime(450)), () => this.markForCheck())
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    if (this.measurementsForm) {
      this.registerSubscription(
        this.measurementsForm.pmfms$
          .pipe(
            filter(isNotNil),
            mergeMap(_ => this.measurementsForm.ready$),
            filter(ready => ready === true)
          )
          .subscribe(_ => this.onMeasurementsFormReady())
      );
    }

    const queryParams = this.route.snapshot.queryParams;
    // Manage tab group
    {
      const subTabIndex = queryParams['subtab'] && parseInt(queryParams['subtab']) || 0;
      this.selectedSubTabIndex = subTabIndex;
    }
    // Manage toolbar color
    if (isNotNilOrBlank(queryParams['color'])) {
      this.toolbarColor = queryParams['color'];
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

            // Propagate acquisition level
            this.acquisitionLevel = acquisitionLevel;

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
      this._measurementSubscription.add(
        hasIndividualMeasuresControl.valueChanges
          .pipe(
            startWith<any, any>(hasIndividualMeasuresControl.value),
            filter(isNotNil)
          )
          .subscribe(value => this._state.set('hasIndividualMeasures', (_) => value))
      );
      this._measurementSubscription.add(
        this.hasIndividualMeasures$.subscribe(value => {
          // Will be done by the template
          this.batchTree.allowSpeciesSampling = value;
          this.batchTree.defaultHasSubBatches = value;
          this.batchTree.allowSubBatches = value;

          // Hide button to toggle hasSubBatches (yes/no) when value if forced
          this.batchTree.setModalOption("showHasSubBatchesButton", !value)
          if (!this.allowParentOperation) {
            this.showCatchTab = this.showBatchTables || this.batchTree.showCatchForm;
            this.tabCount = 1 + (this.showCatchTab ? 1 : 0) + (this.showSamplesTab ? 1 : 0);
          }
          this.updateTablesState();
        })
      );
    }
    else {
      this._state.set('hasIndividualMeasures', (_) => true);
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
        this.batchTree.autoFill({ skipIfDisabled: false, skipIfNotEmpty: true })
          // Make sure to keep data, on the first editor save()
          .then(() => this.batchTree.markAsDirty());
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
            if (!normalProgress) console.debug('[operation] abnormal progress: force comment as required');
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
    this.opeForm.defaultIsParentOperation = this._defaultIsParentOperation;
    this.operationPasteFlags = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_PASTE_FLAGS);
    if (this.debug && this.operationPasteFlags !== 0) {
      console.debug(`[operation-page] Enable duplication with paste flags: ${flagsToString(this.operationPasteFlags, OperationPasteFlags)}`);
    }

    this.measurementsForm.i18nSuffix = i18nSuffix;
    this.measurementsForm.forceOptional = this.forceMeasurementAsOptional;
    this.measurementsForm.maxVisibleButtons = program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS);
    this.measurementsForm.maxItemCountForButtons = program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS);

    this.saveOptions.computeBatchRankOrder = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_RANK_ORDER_COMPUTE);
    this.saveOptions.computeBatchIndividualCount = !this.mobile && program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_INDIVIDUAL_COUNT_COMPUTE);
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
    const clipboard = this.context?.clipboard;
    if (OperationUtils.isOperation(clipboard?.data)) {

      // Do NOT copy dates, when in the on field mode (will be filled later)
      if (this.isOnFieldMode) {
        data.paste(clipboard?.data, removeFlag(this.operationPasteFlags, OperationPasteFlags.DATE));
      }
      else {
        data.paste(clipboard?.data, this.operationPasteFlags);
      }

      // Reset clipboard
      this.context?.setValue('clipboard', {
        data: null, // Reset data
        pasteFlags: this.operationPasteFlags // Keep flags
      });

      this.isDuplicatedData = true;
    }

    // If is on field mode, then fill default values
    if (this.isOnFieldMode) {
      data.startDateTime = DateUtils.moment();

      if (!this.isDuplicatedData) {
        // Wait last operations to be loaded
        const previousOperations = await firstNotNilPromise(this.lastOperations$, {stop: this.destroySubject});

        // Copy from previous operation only if is not a duplicated operation
        const previousOperation = (previousOperations || [])
          .find(ope => ope && ope !== data && ReferentialUtils.isNotEmpty(ope.metier));
        if (previousOperation) {
          data.physicalGear = (trip.gears || []).find(g => EntityUtils.equals(g, previousOperation.physicalGear, 'id')) || data.physicalGear;
          data.metier = previousOperation.metier;
          data.rankOrder = previousOperation.rankOrder + 1;
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

    // Propagate program
    if (data.programLabel) this.programLabel = data.programLabel;

    // Propagate physical gear
    if (data.physicalGear) this.physicalGear = data.physicalGear;

    this.opeForm.showComment = !this.mobile || isNotNilOrBlank(data.comments);
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

    // Select the date to use for title
    let titleDateTime = data.startDateTime || data.fishingStartDateTime;
    if (OperationUtils.hasParentOperation(data)) {
      titleDateTime = DateUtils.min(fromDateISOString(data.endDateTime), fromDateISOString(data.fishingEndDateTime)) || titleDateTime;
    }

    // Format date:
    // - if mobile: display time only if today
    const startDateTime = titleDateTime && (
        this.mobile && DateUtils.moment().isSame(titleDateTime, 'day')
          ? this.dateFormat.transform(titleDateTime, {pattern: 'HH:mm'})
          : this.dateFormat.transform(titleDateTime, {time: true})) as string;

    // Get rankOrder from context, or compute it (if NOT mobile to avoid additional processing time)
    let rankOrder = this.context?.operation?.rankOrder;
    if (isNil(rankOrder) && !this.mobile) {
      // Compute the rankOrder
      const now = this.debug && Date.now();
      if (this.debug) console.debug('[operation-page] Computing rankOrder...');
      rankOrder = await this.service.computeRankOrder(data, { fetchPolicy: 'cache-first' });
      if (this.debug) console.debug(`[operation-page] Computing rankOrder [OK] #${rankOrder} - in ${Date.now()-now}ms`);

      // Update data, and form
      data.rankOrder = rankOrder;
      this.opeForm?.form.patchValue({rankOrder}, {emitEvent: false});
    }
    if (rankOrder) {
      return titlePrefix + (await this.translate.get('TRIP.OPERATION.EDIT.TITLE', {startDateTime,rankOrder}).toPromise()) as string;
    }
    // No rankOrder (e.g. if mobile)
    else {
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

    const saved = this.isOnFieldMode && (!this.dirty || this.valid)
      // If on field mode: try to save silently
      ? await this.save(event, {openTabIndex: -1})
      // If desktop mode: ask before save
      : await this.saveIfDirtyAndConfirm(null, {openTabIndex: -1});

    if (!saved) return; // Skip

    return this.navigateTo(+id);
  }

  async saveAndNew(event: Event): Promise<boolean> {
    if (event?.defaultPrevented) return Promise.resolve(false); // Skip
    event?.preventDefault(); // Avoid propagation to <ion-item>

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const saved = this.isOnFieldMode && (!this.dirty || this.valid)
      // If on field mode AND valid: save silently
      ? await this.save(event, {openTabIndex: -1})
      // Else If desktop mode: ask before save
      : await this.saveIfDirtyAndConfirm(null, {openTabIndex: -1});
    if (!saved) return; // not saved

    // Redirect to /new
    return await this.navigateTo('new');
  }


  async duplicate(event: Event): Promise<any> {
    if (event?.defaultPrevented || !this.context) return Promise.resolve(); // Skip
    event?.preventDefault(); // Avoid propagation to <ion-item>

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const saved = (this.isOnFieldMode && this.dirty && this.valid)
      // If on field mode AND valid: save silently
      ? await this.save(event, {openTabIndex: -1})
      // Else If desktop mode: ask before save
      : await this.saveIfDirtyAndConfirm(null, {openTabIndex: -1});

    if (!saved) return; // User cancelled, or cannot saved => skip

    // Fill context's clipboard
    this.context.setValue('clipboard', {
      data: this.data,
      pasteFlags: this.operationPasteFlags
    });

    // Open new operation
    return this.navigateTo('new');
  }

  async setValue(data: Operation) {
    try {
      const isNewData = isNil(data?.id);
      const jobs: Promise<any>[] = [
          this.opeForm.setValue(data)
      ];

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

      jobs.push(this.measurementsForm.setValue(data && data.measurements || []));

      // Set batch tree
      if (this.batchTree) {
        //this.batchTree.programLabel = this.programLabel;
        this.batchTree.physicalGear = data.physicalGear;
        this.batchTree.gearId = gearId;
        jobs.push(this.batchTree.setValue(data && data.catchBatch || null));
      }

      // Set sample tree
      if (this.sampleTree) jobs.push(this.sampleTree.setValue(data && data.samples || []));

      await Promise.all(jobs);

      console.debug('[operation] setValue() [OK]');

      // If new data, auto fill the table
      if (isNewData) {
        if (this.autoFillDatesFromTrip && !this.isDuplicatedData)
          this.opeForm.fillWithTripDates();
      }
    }
    catch (err) {
      const error = err?.message || err;
      console.debug('[operation] Error during setValue(): ' + error, err);
      this.setError(error);
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
    const errorMessage = this.enabled && this.usageMode === 'DESK' && isNil(data.controlDate) && data.qualificationComments;
    if (errorMessage) {
      this.form.get('qualificationComments').reset();
      setTimeout(() => {
        console.info('[operation-page] Operation errors: ', errorMessage);
        this.markAllAsTouched();
        this.form.updateValueAndValidity();

        const error: AppErrorWithDetails = {details: {message: errorMessage}};
        if (isNil(data.catchBatch?.controlDate) && data.catchBatch?.qualificationComments) {
          error.details.errors = {catch: {invalidOrIncomplete: true}};
        }

        this.setError({message: 'COMMON.FORM.HAS_ERROR', ...error}, {detailsCssClass: 'error-details'});
      });
    }
  }

  async save(event, opts?: OperationSaveOptions & {emitEvent?: boolean; updateRoute?: boolean; openTabIndex?: number}): Promise<boolean> {
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
    const physicalGear = await this.getOrAddPhysicalGear({emitEvent: false});
    if (!physicalGear) {
      this.markForCheck();
      return false; // Stop if failed
    }

    // Force to pass specific saved options to dataService.save()
    const saved = await super.save(event, <OperationSaveOptions>{
      ...this.saveOptions,
      updateLinkedOperation: this.opeForm.isParentOperation || this.opeForm.isChildOperation, // Apply updates on child operation if it exists
      ...opts
    });

    // Continue to mark as saving, to avoid option menu to open
    this.markAsSaving();

    try {
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

      else {

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
    }
    finally {
      this.markAsSaved();
    }
  }

  async saveIfDirtyAndConfirm(event?: Event, opts?: { emitEvent?: boolean; openTabIndex?: number }): Promise<boolean> {
    return super.saveIfDirtyAndConfirm(event, {...this.saveOptions, ...opts});
  }

  async getOrAddPhysicalGear(opts?: {emitEvent: boolean}): Promise<boolean> {
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
      this.opeForm.physicalGearControl.patchValue(savedPhysicalGear, {emitEvent: false});

      // Update the current trip object
      if (!this.trip.gears?.some(g => PhysicalGear.equals(g, savedPhysicalGear))) {
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
    this.children?.forEach(c => c.markAsLoaded(opts));
  }

  setError(error: string | AppErrorWithDetails, opts?: {emitEvent?: boolean; detailsCssClass?: string;}) {

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
  resetError(opts?:  {emitEvent?: boolean}) {
    this.setError(undefined, opts);
  }

  /* -- protected method -- */

  protected computeSampleRowValidator(pmfmForm: IPmfmForm): Subscription {
    return OperationValidators.addSampleValidators(pmfmForm);
  }

  protected async loadTrip(tripId: number): Promise<Trip> {

    // Update trip id (will cause last operations to be watched, if need)
    this.tripId = +tripId;

    let trip = this.context.getValue('trip') as Trip;

    // If not the expected trip: reload
    if (trip?.id !== tripId) {
      trip = await this.tripService.load(tripId, {fullLoad: true});
      // Update the context
      this.context.setValue('trip', trip);
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
    const contextualUsageMode = this.context?.getValue('usageMode') as UsageMode;
    if (contextualUsageMode) return contextualUsageMode;

    // Read the settings
    return this.settings.isUsageMode('FIELD')
      && (
        isNil(this.trip) || (
          isNotNil(this.trip.departureDateTime)
          && fromDateISOString(this.trip.departureDateTime).diff(DateUtils.moment(), 'day') < 15))
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

  protected saveDirtyChildren(): Promise<boolean> {
    return super.saveDirtyChildren();
  }

  protected async getValue(): Promise<Operation> {
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
    DataEntityUtils.markAsNotControlled(json as Operation, {keepQualityFlag: true});

    // Make sure parent operation has quality flag
    if (this.allowParentOperation && EntityUtils.isEmpty(json.parentOperation, 'id')
      && DataEntityUtils.hasNoQualityFlag(json)){
      console.warn('[operation-page] Parent operation does not have quality flag id. Changing to NOT_COMPLETED ');
      json.qualityFlagId = QualityFlagIds.NOT_COMPLETED;

      // Propage this change to the form
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
        let validParent = true;
        try {
          data.parentOperation = await this.dataService.load(parentOperationId, {fullLoad: false, fetchPolicy: 'cache-first'});
          data.parentOperationId = undefined;

          // Check parent operation is not already associated to another remote child operation
          if (data.parentOperation && EntityUtils.isRemoteId(data.parentOperation.childOperationId) && data.parentOperation.childOperationId !== data.id) {
            console.error(`Parent operation exists, but already linked to another remote operation: #${data.parentOperation.childOperationId}: mark parent has missing, to force user to fix it`);
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

  startListenChanges() {
    if (EntityUtils.isLocal(this.data)) return; // Skip if local entity

    super.startListenChanges();
  }

  /**
   * S context, for batch validator
   * @protected
   */
  protected updateDataContext() {
    console.debug('[operation-page] Updating data context...');
    // Date
    const date = this.lastEndDate || this.opeForm.lastStartDateTimeControl?.value;
    this.context.setValue('date', fromDateISOString(date));

    // Fishing area
    if (this.opeForm.showFishingArea) {

      const fishingAreas = this.opeForm.fishingAreasHelper && this.opeForm.fishingAreasHelper.formArray?.value
        || this.data?.fishingAreas;
      this.context.setValue('fishingAreas', fishingAreas);
      this.context.resetValue('vesselPositions');
    }

    // Or vessel positions
    else if (this.opeForm.showPosition) {
      const positions = [
        this.opeForm.firstActivePositionControl?.value,
        this.opeForm.lastActivePositionControl?.value
      ].filter(position => PositionUtils.isNotNilAndValid(position));
      this.context.setValue('vesselPositions', positions);
      this.context.resetValue('fishingAreas');
    }
  }

  /**
   * Navigate to other operation
   * @param id
   * @protected
   */
  protected async navigateTo(id: number|'new', opts?: {queryParams?: any; replaceUrl?: boolean; tripId?: number}): Promise<boolean> {

    const path = this.computePageUrl(id);
    const commands: any[] = (path && typeof path === 'string') ? path.split('/').slice(1) : path as any[];
    if (isNotEmptyArray(commands)) {

      // Change the trip id in path
      if (isNotNil(opts?.tripId) && commands[0] == 'trips' && +commands[1] === this.tripId) {
        commands[1] = opts.tripId;
      }

      // Should replace the current page in history ? (default: true)
      let replaceUrl = !opts || opts.replaceUrl !== false;
      let queryParams = opts?.queryParams || {};


      // Workaround, to force angular to reload a new page
      if (id === 'new') {
        const ok = await this.goBack();
        if (!ok) return;
        await sleep(450);
        replaceUrl = false; // No more need to replace the current page in history
      }
      else {
        queryParams[this.pathIdAttribute] = ''+id;
      }

      return await this.router.navigate(commands, {
        replaceUrl,
        queryParams
      });
    }
    return Promise.reject('Missing page URL');
  }

  async openParentOperation(parent: Operation): Promise<boolean> {

    const saved = this.isOnFieldMode && (!this.dirty || this.valid)
      // If on field mode: try to save silently
      ? await this.save(null, {openTabIndex: -1})
      // If desktop mode: ask before save
      : await this.saveIfDirtyAndConfirm(null, {
        openTabIndex: -1
      });

    if (!saved) return; // Skip

    // Not same trips
    if (this.tripId !== parent.tripId) {
      return this.navigateTo(parent.id, {
        replaceUrl: false, // IMPORTANT: back button will return to the curren OP
        tripId: parent.tripId,
        queryParams: {color: <PredefinedColors>'secondary'}
      });
    }
    else {
      // Open, and replace the current OP
      return this.navigateTo(parent.id);
    }
  }
}
