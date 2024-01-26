import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  AppErrorWithDetails,
  AppFormUtils,
  AppTabEditor,
  AppTable,
  Entity,
  IAppTabEditor,
  InMemoryEntitiesService,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  ReferentialRef,
  toBoolean,
  toNumber,
  UsageMode,
} from '@sumaris-net/ngx-components';
import { AlertController, NavController } from '@ionic/angular';
import { BehaviorSubject, combineLatest, defer, Observable, of } from 'rxjs';
import { UntypedFormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, map, startWith, switchMap, tap } from 'rxjs/operators';
import { Batch } from '../common/batch.model';
import { BatchGroup, BatchGroupUtils } from '../group/batch-group.model';
import { BatchGroupsTable } from '../group/batch-groups.table';
import { SubBatchesTable, SubBatchFilter } from '../sub/sub-batches.table';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { SubBatch, SubBatchUtils } from '../sub/sub-batch.model';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { BatchContext } from '@app/trip/batch/sub/sub-batch.validator';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { IBatchGroupModalOptions } from '@app/trip/batch/group/batch-group.modal';
import { AppSharedFormUtils, FormControlStatus } from '@app/shared/forms.utils';
import { ISubBatchesModalOptions } from '@app/trip/batch/sub/sub-batches.modal';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { CatchBatchForm } from '@app/trip/batch/catch/catch.form';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { RxState } from '@rx-angular/state';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { RxConcurrentStrategyNames } from '@rx-angular/cdk/render-strategies';
import { qualityFlagInvalid } from '@app/data/services/model/model.utils';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';

export interface IBatchTreeComponent extends IAppTabEditor {
  programLabel: string;
  program: Program;
  requiredStrategy: boolean;
  strategyId: number;
  requiredGear: boolean;
  gearId: number;
  physicalGear: PhysicalGear;
  usageMode: UsageMode;
  showCatchForm: boolean;
  showBatchTables: boolean;
  defaultHasSubBatches: boolean;
  allowSpeciesSampling: boolean;
  allowSubBatches: boolean;
  availableTaxonGroups: TaxonGroupRef[];
  showAutoFillButton: boolean;
  showToolbar?: boolean;
  mobile: boolean;
  modalOptions: Partial<IBatchGroupModalOptions>;
  filter: BatchFilter;

  // Form
  disabled: boolean;
  touched: boolean;
  readySubject?: BehaviorSubject<boolean>;

  // Value
  value: Batch;
  setValue(data: Batch, opts?: { emitEvent?: boolean }): Promise<void>;
  getValue(): Batch;

  // Methods
  setModalOption(key: keyof IBatchGroupModalOptions, value: IBatchGroupModalOptions[typeof key]);
  autoFill(opts?: { skipIfDisabled: boolean; skipIfNotEmpty: boolean }): Promise<void>;
  addRow(event: Event);
  getFirstInvalidTabIndex(): number;

  setError(error: string, opts?: { emitEvent?: boolean });

  resetError(opts?: { emitEvent?: boolean });
}

/**
 * Minimal status to use, to summary the batch tree state (e.g. in a badge)
 */
export interface IBatchTreeStatus {
  valid: boolean;
  rowCount: number|undefined;
}

export interface BatchTreeState {
  programLabel: string;
  program: Program;
  physicalGear: PhysicalGear;
  requiredStrategy: boolean;
  strategyId: number;
  requiredGear: boolean;
  gearId: number;

  samplingRatioFormat: SamplingRatioFormat;
  showCatchForm: boolean;
  showBatchTables: boolean;
  allowSpeciesSampling: boolean;
  showSubBatchesTable: boolean;
  allowSubBatches: boolean;
  programAllowMeasure: boolean;
  data: Batch;
}

@Component({
  selector: 'app-batch-tree',
  templateUrl: './batch-tree.component.html',
  styleUrls: ['./batch-tree.component.scss'],
  providers: [{ provide: ContextService, useExisting: TripContextService }, RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchTreeComponent extends AppTabEditor<Batch, any> implements OnInit, AfterViewInit, OnDestroy, IBatchTreeComponent {

  private _subBatchesService: InMemoryEntitiesService<SubBatch, SubBatchFilter>;
  private _listenProgramChanges = true;
  protected _logPrefix = '[batch-tree] ';
  protected _debugData: any;

  @RxStateRegister() protected _state: RxState<BatchTreeState> = inject(RxState, {self: true});

  @RxStateProperty() protected showSubBatchesTable: boolean;
  @RxStateProperty() protected programAllowMeasure: boolean;
  @RxStateProperty() protected data: Batch;

  @RxStateSelect() readonly programLabel$: Observable<string>;
  @RxStateSelect() readonly program$: Observable<Program>;
  readonly showSamplingBatchColumns$ = this._state.select(
    ['allowSpeciesSampling', 'programAllowMeasure'],
    ({ allowSpeciesSampling, programAllowMeasure }) => allowSpeciesSampling && programAllowMeasure
  );
  @RxStateSelect() readonly showCatchForm$: Observable<boolean>;
  @RxStateSelect() readonly showBatchTables$: Observable<boolean>;
  @RxStateSelect() readonly allowSubBatches$: Observable<boolean>;
  @RxStateSelect() readonly requiredStrategy$: Observable<boolean>;
  @RxStateSelect() readonly strategyId$: Observable<number>;
  @RxStateSelect() readonly requiredGear$: Observable<boolean>;
  @RxStateSelect() readonly gearId$: Observable<number>;

  @Input() rootAcquisitionLevel = AcquisitionLevelCodes.CATCH_BATCH;
  @Input() mobile: boolean;
  @Input() showToolbar: boolean;
  @Input() useSticky = false;
  @Input() usageMode: UsageMode;
  @Input() enableWeightLengthConversion: boolean;
  @Input() i18nPmfmPrefix: string;
  @Input() rxStrategy: RxConcurrentStrategyNames = 'normal';
  @Input() showAutoFillButton = true;
  @Input() allowQvPmfmGroup = true;
  @Input() @RxStateProperty() samplingRatioFormat: SamplingRatioFormat;
  @Input() @RxStateProperty() showCatchForm: boolean;
  @Input() @RxStateProperty() showBatchTables: boolean;
  @Input() @RxStateProperty() allowSpeciesSampling: boolean;
  @Input() @RxStateProperty() allowSubBatches: boolean;
  @Input() debug: boolean;

  @Input() set physicalGear(value: PhysicalGear) {
    this._state.set({
      physicalGear: value,
      gearId: toNumber(value?.gear?.id, null),
    });
  }
  get physicalGear(): PhysicalGear {
    return this._state.get('physicalGear');
  }

  @Input() set disabled(value: boolean) {
    if (value && this._enabled) {
      this.disable();
    } else if (!value && !this._enabled) {
      this.enable();
    }
  }

  get disabled(): boolean {
    return !super.enabled;
  }

  get touched(): boolean {
    return this.form?.touched;
  }

  get isNewData(): boolean {
    return isNil(this.data?.id);
  }

  @Input()
  set value(catchBatch: Batch) {
    this.setValue(catchBatch);
  }

  get value(): Batch {
    return this.getValue();
  }

  @Input() @RxStateProperty() programLabel: string;
  @Input() @RxStateProperty() requiredStrategy: boolean;
  @Input() @RxStateProperty() strategyId: number;
  @Input() @RxStateProperty() requiredGear: boolean;
  @Input() @RxStateProperty() gearId: number;

  @Input()
  set program(value: Program) {
    this._listenProgramChanges = false; // Avoid to watch program changes, when program is given by parent component
    this._state.set('program', (_) => value);
  }
  get program(): Program {
    return this._state.get('program');
  }


  @Input() set availableTaxonGroups(value: TaxonGroupRef[]) {
    this.batchGroupsTable.availableTaxonGroups = value;
  }

  get availableTaxonGroups(): TaxonGroupRef[] {
    return this.batchGroupsTable.availableTaxonGroups;
  }

  @Input() set defaultHasSubBatches(value: boolean) {
    this.batchGroupsTable.defaultHasSubBatches = value;
  }

  get defaultHasSubBatches(): boolean {
    return this.batchGroupsTable.defaultHasSubBatches;
  }

  @Input() set filter(value: BatchFilter) {
    this.setFilter(value);
  }

  get filter(): BatchFilter {
    return this.catchBatchForm?.filter;
  }

  get dirty(): boolean {
    return super.dirty || this._subBatchesService?.dirty || false;
  }

  @Input() set modalOptions(modalOptions: Partial<IBatchGroupModalOptions>) {
    this.batchGroupsTable.modalOptions = modalOptions;
  }

  get modalOptions(): Partial<IBatchGroupModalOptions> {
    return this.batchGroupsTable.modalOptions;
  }

  get subBatchesCount(): number {
    return this._subBatchesService ? this._subBatchesService.count + this._subBatchesService.hiddenCount : this.subBatchesTable?.totalRowCount || 0;
  }

  get statusChanges(): Observable<FormControlStatus> {
    const delegates: Observable<any>[] = [
      // Listen on forms
      ...(this.forms || []).filter(c => c.form).map((c) => c.form.statusChanges
        .pipe(
          startWith(c.form.invalid ? 'INVALID': 'VALID')
        ),
      ),
      // Listen on tables
      ...(this.tables || []).map((t) =>
        t.onStartEditingRow
          .pipe(
            //map(_ => t.editedRow),
            switchMap(row => row.validator ? row.validator.statusChanges
                .pipe(
                  startWith(qualityFlagInvalid(row.currentData?.qualityFlagId) ? 'INVALID': 'VALID')
                )
              :
              of(qualityFlagInvalid(row.currentData?.qualityFlagId) ? 'INVALID' : 'VALID')),

            // DEBUG
            // tap(status => console.debug(this._logPrefix + 'table row status=', status)),
            // finalize(() => console.debug(this._logPrefix + 'table row stop')),
          )
      ),
    ];
    // Warn if empty
    if (this.debug && !delegates.length) console.warn(this._logPrefix + 'No child allow to observe the status');

    return combineLatest(delegates).pipe(
      startWith(['VALID']),
      debounceTime(450),
      map((_) => {
        // DEBUG
        //if (this.debug) console.debug(this._logPrefix + 'Computing tree status...', _);

        if (this.loading) return <FormControlStatus>'PENDING';
        if (this.disabled) return <FormControlStatus>'DISABLED';
        if (this.valid) return <FormControlStatus>'VALID';
        return this.pending ? <FormControlStatus>'PENDING' : <FormControlStatus>'INVALID';
      }),
      distinctUntilChanged(),

      // DEBUG
      //tap((status) => this.debug && console.debug(this._logPrefix + 'Status changed: ' + status))
    );
  }

  @ViewChild('catchBatchForm', { static: true }) catchBatchForm: CatchBatchForm;
  @ViewChild('batchGroupsTable', { static: true }) batchGroupsTable: BatchGroupsTable;
  @ViewChild('subBatchesTable', { static: false }) subBatchesTable: SubBatchesTable;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected navController: NavController,
    protected alertCtrl: AlertController,
    protected translate: TranslateService,
    protected programRefService: ProgramRefService,
    protected settings: LocalSettingsService,
    protected context: ContextService<BatchContext>,
    protected cd: ChangeDetectorRef
  ) {
    super(route, router, navController, alertCtrl, translate, {
      tabCount: settings.mobile ? 1 : 2,
    });

    // Defaults
    this.mobile = settings.mobile;
    this.i18nContext = {
      prefix: '',
      suffix: '',
    };
  }

  ngOnInit() {
    // Set defaults
    this.showToolbar = toBoolean(this.showToolbar, !this.mobile);
    this.tabCount = this.mobile ? 1 : 2;
    this.showCatchForm = toBoolean(this.showCatchForm, true);
    this.showBatchTables = toBoolean(this.showBatchTables, true);
    this.allowSpeciesSampling = toBoolean(this.allowSpeciesSampling, true);
    this.allowSubBatches = toBoolean(this.allowSubBatches, true);

    this._subBatchesService = this.mobile
      ? new InMemoryEntitiesService(SubBatch, SubBatchFilter, {
          equals: Batch.equals,
          sortByReplacement: { id: 'rankOrder' },
        })
      : null;

    super.ngOnInit();

    // Register forms
    this.registerForms();

    this._state.connect(
      'showCatchForm',
      combineLatest([this.catchBatchForm.hasContent$, this.catchBatchForm.ready$]).pipe(
        filter(([_, ready]) => ready),
        map(([hasContent, _]) => hasContent),
        tap((showCatchForm) => {
          if (this._enabled) {
            if (showCatchForm && !this.catchBatchForm.enabled) {
              this.catchBatchForm.enable();
            } else if (!showCatchForm && this.catchBatchForm.enabled) {
              this.catchBatchForm.disable();
            }
          }
        })
      )
    );

    this._state.connect(
      'showSubBatchesTable',
      this._state.select(
        ['allowSubBatches', 'programAllowMeasure'],
        ({ allowSubBatches, programAllowMeasure }) => allowSubBatches && programAllowMeasure
      )
    );

    this._state.hold(this._state.select('showSubBatchesTable'), (showSubBatchesTable) => {
      // If disabled
      if (!showSubBatchesTable) {
        // Reset existing sub batches
        if (!this.loading) this.resetSubBatches();
        // Select the first tab
        this.setSelectedTabIndex(0);
      }
      if (!this.loading) this.markForCheck();
    });
  }

  ngAfterViewInit() {
    // Get available sub-batches only when subscribe (for performance reason)
    this.batchGroupsTable.availableSubBatches = defer(() => this.getSubBatches());

    // Watch program, to configure tables from program properties
    this._state.connect(
      'program',
      this.programLabel$.pipe(
        filter(() => this._listenProgramChanges), // Avoid to watch program, if was already set
        filter(isNotNilOrBlank),
        distinctUntilChanged(),
        switchMap((programLabel) => this.programRefService.watchByLabel(programLabel))
      )
    );

    // Apply program
    this._state.hold(this.program$, (program) => this.setProgram(program));

    if (this.subBatchesTable) {
      // Enable sub batches table, only when table pmfms ready
      this._state.connect(
        'showSubBatchesTable',
        combineLatest([
          this.subBatchesTable.hasPmfms$,
          this.subBatchesTable.readySubject,
          this.batchGroupsTable.dataSource.rowsSubject.pipe(map(isNotEmptyArray)),
          this.allowSubBatches$,
        ]).pipe(map(([hasPmfms, ready, howBatchGroupRows, allowSubBatches]) => (hasPmfms && ready && howBatchGroupRows && allowSubBatches) || false))
      );

      // Update available parent on individual batch table, when batch group changes
      this._state.hold(
        this.batchGroupsTable.dataSource.rowsSubject.pipe(
          filter((rows) => !this.loading && this.allowSubBatches && isNotEmptyArray(rows)),
          debounceTime(400),
          map((_) => this.batchGroupsTable.dataSource.getData())
        ),
        (parents) => (this.subBatchesTable.availableParents = parents)
      );
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._subBatchesService?.stop();
  }

  // Change visibility to public
  setError(error: string | AppErrorWithDetails, opts?: { emitEvent?: boolean }) {
    if (!error || typeof error === 'string') {
      super.setError(error as string, opts);
    } else {
      console.log('TODO: apply error to rows ?', error);
    }
  }

  // Change visibility to public
  resetError(opts?: { emitEvent?: boolean }) {
    super.resetError(opts);
  }

  setModalOption(key: keyof IBatchGroupModalOptions, value: IBatchGroupModalOptions[typeof key]) {
    this.batchGroupsTable.setModalOption(key, value);
  }

  setSubBatchesModalOption(key: keyof ISubBatchesModalOptions, value: ISubBatchesModalOptions[typeof key]) {
    this.batchGroupsTable.setSubBatchesModalOption(key, value);
  }

  disable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.disable(opts);
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.enable(opts);
  }

  async save(event?: Event, options?: any): Promise<any> {
    // Create (or fill) the catch form entity
    const source = this.catchBatchForm.value; // Get the JSON (/!\ measurementValues should be Form ready)
    const target = this.data || new Batch();
    target.fromObject(source, { withChildren: false /*will be set after*/ });
    const samplingSource = BatchUtils.getSamplingChild(source);
    const samplingTarget = samplingSource && Batch.fromObject(samplingSource, { withChildren: false /*will be set after*/ });

    // Save batch groups and sub batches
    const [batchGroups, subBatches] = await Promise.all([this.getBatchGroups(true), this.getSubBatches()]);

    // Prepare subBatches for model (set parent)
    if (isNotEmptyArray(subBatches)) {
      SubBatchUtils.linkSubBatchesToParent(batchGroups, subBatches, {
        qvPmfm: this.batchGroupsTable.qvPmfm,
      });
    }

    if (samplingTarget) {
      target.children = [samplingTarget];
      samplingTarget.children = batchGroups;
    } else {
      target.children = batchGroups;
    }

    // DEBUG
    //if (this.debug) BatchUtils.logTree(target);

    this.data = target;

    return true;
  }

  protected getJsonValueToSave(): any {
    // Get only the catch form
    return this.form.value;
  }

  getValue(): Batch {
    return this.data;
  }

  load(id?: number, options?: any): Promise<any> {
    // Unused
    return Promise.resolve(undefined);
  }

  reload() {
    // Unused
    return Promise.resolve(undefined);
  }

  async setValue(source: Batch, opts?: { emitEvent?: boolean }) {
    source =
      source ||
      Batch.fromObject({
        rankOrder: 1,
        label: this.rootAcquisitionLevel,
      });

    // If catch batch (=no parent nor parentId) and rootAcquisitionLevel = CATCH_BATCH
    if (!source.parent && isNil(source.parentId) && this.rootAcquisitionLevel === AcquisitionLevelCodes.CATCH_BATCH) {
      // Check expected label
      if (source.label !== AcquisitionLevelCodes.CATCH_BATCH) {
        throw new Error(`[batch-tree] Invalid catch batch label. Expected: ${AcquisitionLevelCodes.CATCH_BATCH} - Actual: ${source.label}`);
      }
    }
    // Check root batch has the expected label (should start with the rootAcquisitionLevel)
    else if (source.label && !source.label.startsWith(this.rootAcquisitionLevel)) {
      console.warn(`[batch-tree] Invalid root batch label. Expected: ${this.rootAcquisitionLevel} - Actual: ${source.label}`);
    }

    // DEBUG
    //console.debug(this._logPrefix + 'setValue()', source);
    this.markAsLoading({emitEvent: false});
    const wasReady = this.readySubject.value;
    this.markChildrenAsNotReady({emitEvent: false});

    try {
      this.data = source;
      let childrenLabelPrefix =
        this.rootAcquisitionLevel === AcquisitionLevelCodes.CATCH_BATCH ? AcquisitionLevelCodes.SORTING_BATCH + '#' : `${source.label}.`;

      // Set catch batch
      const samplingSource = BatchUtils.getSamplingChild(source);
      {
        const target = source.clone({ withChildren: false });
        if (samplingSource) {
          target.children = [samplingSource.clone({ withChildren: false })];
          childrenLabelPrefix = `${samplingSource.label}.`;
        }

        this.catchBatchForm.requiredStrategy = this.requiredStrategy;
        this.catchBatchForm.strategyId = this.strategyId;
        this.catchBatchForm.gearId = this.gearId;
        this.catchBatchForm.markAsReady();
        await this.catchBatchForm.setValue(target);
      }

      if (this.batchGroupsTable) {
        // Retrieve batch group (make sure label start with acquisition level)
        // Then convert into batch group entities
        const batchGroups: BatchGroup[] = BatchGroupUtils.fromBatchTree(samplingSource || source);

        // Apply to table
        this.batchGroupsTable.requiredStrategy = this.requiredStrategy;
        this.batchGroupsTable.strategyId = this.strategyId;
        this.batchGroupsTable.gearId = this.gearId;
        this.batchGroupsTable.labelPrefix = childrenLabelPrefix;
        this.batchGroupsTable.markAsReady();
        this.batchGroupsTable.value = batchGroups;
        await this.batchGroupsTable.ready(); // Wait loaded (need to be sure the QV pmfm is set)

        const groupQvPmfm = this.batchGroupsTable.qvPmfm;
        const subBatches: SubBatch[] = SubBatchUtils.fromBatchGroups(batchGroups, {
          groupQvPmfm,
        });

        if (this.subBatchesTable) {
          this.subBatchesTable.requiredStrategy = this.requiredStrategy;
          this.subBatchesTable.strategyId = this.strategyId;
          this.subBatchesTable.qvPmfm = groupQvPmfm;
          this.subBatchesTable.value = subBatches;
          const ready = this.subBatchesTable.setAvailableParents(batchGroups, {
            emitEvent: true, // Force refresh pmfms
            linkDataToParent: false, // Not need (will be done later, in value setter)
          });
          this.subBatchesTable.markAsReady();
          await ready;
        } else {
          this._subBatchesService.value = subBatches;
        }
      }
    } finally {
      this.markAsPristine();
      this.markAsUntouched();
      if (wasReady) this.markAsReady();
      this.markAsLoaded({ emitEvent: false });
    }

    // DEBUG the dirty state
    //this.catchBatchForm.form.valueChanges.subscribe(value => {
    //  if (this.loaded) console.error('TODO value change', new Error());
    //})
  }

  /* -- protected method -- */



  protected get form(): UntypedFormGroup {
    return this.catchBatchForm.form;
  }

  protected registerForms() {
    this.addChildForms([this.catchBatchForm, this.batchGroupsTable, () => this.subBatchesTable]);
  }

  /**
   *
   * @param program
   * @param opts allow to avoid program propagation (e.g. see batch tree container)
   * @protected
   */
  async setProgram(program: Program, opts = { emitEvent: true }) {
    if (this.debug) console.debug(`[batch-tree] Program ${program.label} loaded, with properties: `, program.properties);

    this.markAsLoading({emitEvent: false});

    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nContext.suffix = i18nSuffix;

    const programAllowMeasure = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ENABLE);
    this.programAllowMeasure = programAllowMeasure;
    this.allowSpeciesSampling = this.allowSpeciesSampling && programAllowMeasure;
    this.allowSubBatches = this.allowSubBatches && programAllowMeasure;
    this.enableWeightLengthConversion = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE);
    const samplingRatioFormat = program.getProperty(ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT) as SamplingRatioFormat;
    this.samplingRatioFormat = samplingRatioFormat;

    this.catchBatchForm.samplingRatioFormat = samplingRatioFormat;

    this.batchGroupsTable.showWeightColumns = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_WEIGHT_ENABLE);
    this.batchGroupsTable.showTaxonGroupColumn = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_GROUP_ENABLE);
    this.batchGroupsTable.showTaxonNameColumn = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_NAME_ENABLE);
    this.batchGroupsTable.samplingRatioFormat = samplingRatioFormat;
    this.batchGroupsTable.enableWeightLengthConversion = this.enableWeightLengthConversion;
    this.batchGroupsTable.setModalOption('maxVisibleButtons', program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS));
    this.batchGroupsTable.setModalOption(
      'maxItemCountForButtons',
      program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_ITEM_COUNT_FOR_BUTTONS)
    );
    this.batchGroupsTable.setModalOption('enableBulkMode', !program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_AUTO_FILL)); // Disable bulk mode when auto fill is on
    this.batchGroupsTable.i18nColumnSuffix = i18nSuffix;

    // Some specific taxon groups have no weight collected
    const taxonGroupsNoWeight = program.getPropertyAsStrings(ProgramProperties.TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT);
    this.batchGroupsTable.taxonGroupsNoWeight = (taxonGroupsNoWeight || []).map((label) => label.trim().toUpperCase()).filter(isNotNilOrBlank);

    // Some specific taxon groups are never landing
    const taxonGroupsNoLanding = program.getPropertyAsStrings(ProgramProperties.TRIP_BATCH_TAXON_GROUPS_NO_LANDING);
    this.batchGroupsTable.taxonGroupsNoLanding = (taxonGroupsNoLanding || []).map((label) => label.trim().toUpperCase()).filter(isNotNilOrBlank);

    // Store country to context (to be used in sub batches modal)
    const countryId = program.getPropertyAsInt(ProgramProperties.TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID);
    if (isNotNil(countryId) && isNil(this.context.getValue('country'))) {
      this.context.setValue('country', ReferentialRef.fromObject({ id: countryId }));
    } else {
      if (this.enableWeightLengthConversion) {
        console.error(
          `Missing country location id, for round weight conversion! Please define program property '${ProgramProperties.TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID.key}' for ${program.label}`
        );
      }
      this.context.resetValue('country');
    }

    // Force taxon name in sub batches, if not filled in root batch
    const subBatchesTaxonName =
      !this.batchGroupsTable.showTaxonNameColumn && program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_INDIVIDUAL_TAXON_NAME_ENABLE);
    this.batchGroupsTable.setSubBatchesModalOption('showTaxonNameColumn', subBatchesTaxonName);
    this.batchGroupsTable.setSubBatchesModalOption(
      'showBluetoothIcon',
      program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ICHTHYOMETER_ENABLE)
    );
    if (this.subBatchesTable) {
      this.subBatchesTable.showTaxonNameColumn = subBatchesTaxonName;
      this.subBatchesTable.showTaxonNameInParentAutocomplete = !subBatchesTaxonName && this.batchGroupsTable.showTaxonNameColumn;
      this.subBatchesTable.showIndividualCount = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_INDIVIDUAL_COUNT_ENABLE);
      this.subBatchesTable.weightDisplayedUnit = program.getProperty(ProgramProperties.TRIP_BATCH_MEASURE_INDIVIDUAL_WEIGHT_DISPLAYED_UNIT);
      this.subBatchesTable.i18nColumnSuffix = i18nSuffix;
    }

    // Propagate to children components, if need
    if (!opts || opts.emitEvent !== false) {
      // This should be need when program$ has been set by parent, and not from the programLabel$ observable
      if (this.programLabel !== program.label) {
        this.programLabel = program.label;
      }
    }
  }

  markAsLoaded(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsLoaded(opts);
  }

  markAsLoading(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);

      // Emit to children
      if (!opts || opts.onlySelf !== true) {
        this.children.filter(c => c.loading)
          .forEach(c => c.markAsLoading(opts));
      }

      if (!opts || opts.emitEvent !== false) this.markForCheck();
    }

  }

  markAsNotReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    if (this.readySubject.value) {
      this.readySubject.next(false);

      // Emit to children
      if (!opts || opts.onlySelf !== true) {
        this.children
          ?.map((c) => (c as any)['readySubject'])
          .filter(isNotNil)
          .filter((readySubject) => readySubject.value !== false)
          .forEach((readySubject) => readySubject.next(false));
      }

      if (!opts || opts.emitEvent !== false) this.markForCheck();
    }
  }

  markChildrenAsNotReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    // Emit to children
    this.children
      ?.map(c => (c as any)['readySubject'])
      .filter((readySubject) => readySubject && readySubject.value !== false)
      .forEach((readySubject) => readySubject.next(false));
  }

  async onSubBatchesChanges(subbatches: SubBatch[]) {
    if (isNil(subbatches)) return; // user cancelled

    try {
      if (this.subBatchesTable) {
        this.subBatchesTable.value = subbatches;

        // Wait table not busy
        await this.subBatchesTable.waitIdle({ stop: this.destroySubject, stopError: false });

        this.subBatchesTable.markAsDirty();
      } else {
        await this._subBatchesService.saveAll(subbatches);
      }
    } catch (err) {
      console.error(this._logPrefix + 'Error while updating sub batches', err);
    }
  }

  onTabChange(event: MatTabChangeEvent, queryTabIndexParamName?: string) {
    const result = super.onTabChange(event, queryTabIndexParamName);

    if (!this.loading) {
      // On each tables, confirm the current editing row
      if (this.showBatchTables && this.batchGroupsTable) this.batchGroupsTable.confirmEditCreate();
      if (this.allowSubBatches && this.subBatchesTable) this.subBatchesTable.confirmEditCreate();
    }

    return result;
  }

  async autoFill(opts = { skipIfDisabled: true, skipIfNotEmpty: false }): Promise<void> {
    const dirty = this.dirty;

    await this.batchGroupsTable.autoFillTable(opts);

    // Propagate dirty state
    if (!dirty && this.batchGroupsTable.dirty) {
      this.markAsDirty();
    }
  }

  setSelectedTabIndex(value: number, opts?: { emitEvent?: boolean; realignInkBar?: boolean }) {
    super.setSelectedTabIndex(value, {
      realignInkBar: !this.mobile, // Tab header are NOT visible on mobile
      ...opts,
    });
  }

  addRow(event: Event) {
    switch (this.selectedTabIndex) {
      case 0:
        this.batchGroupsTable.addRow(event);
        break;
      case 1:
        this.subBatchesTable.addRow(event);
        break;
    }
  }

  getFirstInvalidTabIndex(): number {
    if (this.showCatchForm && this.catchBatchForm.invalid) return 0;
    if (this.showBatchTables && this.batchGroupsTable.invalid) return 0;
    if (this.allowSubBatches && this.subBatchesTable?.invalid) return 1;
    return -1;
  }

  waitIdle(): Promise<any> {
    return AppFormUtils.waitIdle(this);
  }

  setFilter(dataFilter: BatchFilter) {
    this.catchBatchForm.filter = dataFilter;
    this.batchGroupsTable.setFilter(dataFilter);
  }

  /* -- protected methods -- */

  protected async getBatchGroups(forceSave?: boolean): Promise<BatchGroup[]> {
    if (!this.showBatchTables) return undefined;
    return this.getTableValue(this.batchGroupsTable, forceSave);
  }

  protected async getSubBatches(): Promise<SubBatch[]> {
    if (!this.showBatchTables) return undefined;
    if (this.subBatchesTable) {
      return this.getTableValue(this.subBatchesTable);
    } else {
      return (
        (this._subBatchesService.value || [])
          // make sure to convert into model
          .map((source) => SubBatch.fromObject(source))
      );
    }
  }

  protected resetSubBatches() {
    console.warn(this._logPrefix + 'Resetting sub batches !!');
    if (this.subBatchesTable) this.subBatchesTable.value = [];
    if (this._subBatchesService) this._subBatchesService.setValue([]);
  }

  protected saveDirtyChildren(): Promise<boolean> {
    return super.saveDirtyChildren();
  }

  protected async getTableValue<T extends Entity<T>>(table: AppTable<T> & { value: T[] }, forceSave?: boolean): Promise<T[]> {
    const dirty = table.dirty;
    if (dirty || forceSave) {
      try {
        await table.save();
      } catch (err) {
        if (!forceSave) this.setError((err && err.message) || err);
        throw err;
      }

      // Remember dirty state
      if (dirty) this.markAsDirty({ emitEvent: false });
    }

    return table.value;
  }

  markForCheck() {
    this.cd.markForCheck();
  }
  dumpDebugData(type: 'rowValidator' | 'catchForm'): any {
    switch (type) {
      case 'catchForm':
        this._debugData = AppSharedFormUtils.dumpForm(this.catchBatchForm.form);
        break;
      case 'rowValidator':
        this._debugData = AppSharedFormUtils.dumpForm(this.batchGroupsTable.getDebugData(type));
        break;
      default:
        throw new Error('Unknown type: ' + type);
    }
    this.markForCheck();
  }
}
