import { ChangeDetectionStrategy, Component, EventEmitter, Inject, Injector, Input, OnInit, Optional, Output, ViewChild } from '@angular/core';
import {
  APP_LOGGING_SERVICE,
  AppEditor,
  AppErrorWithDetails,
  AppFormUtils,
  changeCaseToUnderscore,
  equals,
  fadeInAnimation,
  fadeInOutAnimation,
  filterFalse,
  filterTrue,
  firstNotNilPromise,
  FormErrorTranslateOptions,
  getPropertyByPath,
  ILogger,
  ILoggingService,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  toBoolean,
  toNumber,
  TreeItemEntityUtils,
  UsageMode,
  waitFor,
  WaitForOptions,
  waitForTrue,
} from '@sumaris-net/ngx-components';
import { IonModal } from '@ionic/angular';
import { BatchTreeComponent, IBatchTreeComponent, IBatchTreeStatus } from '@app/trip/batch/tree/batch-tree.component';
import { Batch } from '@app/trip/batch/common/batch.model';
import { IBatchGroupModalOptions } from '@app/trip/batch/group/batch-group.modal';
import { Program } from '@app/referential/services/model/program.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { combineLatestWith, Observable, Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { BatchModel } from '@app/trip/batch/tree/batch-tree.model';
import { UntypedFormGroup } from '@angular/forms';
import { BatchModelValidatorService } from '@app/trip/batch/tree/batch-model.validator';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { TripContextService } from '@app/trip/trip-context.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { RxState } from '@rx-angular/state';
import { BatchModelTreeComponent } from '@app/trip/batch/tree/batch-model-tree.component';
import { MatSidenav } from '@angular/material/sidenav';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { ContextService } from '@app/shared/context.service';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { RxConcurrentStrategyNames } from '@rx-angular/cdk/render-strategies';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

interface BadgeState {
  hidden: boolean;
  text: string;
  color: 'primary' | 'accent';
}

interface BatchTreeContainerState {
  programAllowMeasure: boolean;
  showCatchForm: boolean;
  showBatchTables: boolean;
  allowDiscard: boolean;
  allowSpeciesSampling: boolean;
  allowSubBatches: boolean;
  requiredGear: boolean;
  gearId: number;
  physicalGear: PhysicalGear;
  programLabel: string;
  program: Program;
  sortingPmfms: IPmfm[];
  catchPmfms: IPmfm[];
  model: BatchModel;
  form: UntypedFormGroup;
  data: Batch;
  editingBatch: BatchModel;
  batchTreeStatus: IBatchTreeStatus;
  currentBadge: BadgeState;
  treePanelFloating: boolean;
}

export const BatchTreeContainerSettingsEnum = {
  PAGE_ID: 'batch-tree-container',
  TREE_PANEL_FLOATING_KEY: 'treePanelFloating',
};

@Component({
  selector: 'app-batch-tree-container',
  templateUrl: './batch-tree-container.component.html',
  styleUrls: ['./batch-tree-container.component.scss'],
  providers: [{ provide: ContextService, useExisting: TripContextService }, RxState],
  animations: [fadeInAnimation, fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchTreeContainerComponent extends AppEditor<Batch> implements IBatchTreeComponent, OnInit {
  private _listenProgramChanges = true;
  protected _logger: ILogger;
  protected _logPrefix = '[batch-tree-container] ';
  protected _lastEditingBatchPath: string;
  protected errorTranslateOptions: FormErrorTranslateOptions;

  @RxStateSelect() protected readonly allowSamplingBatches$: Observable<boolean>;
  @RxStateSelect() protected readonly allowSubBatches$: Observable<boolean>;
  @RxStateSelect() protected readonly programLabel$: Observable<string>;
  @RxStateSelect() protected readonly program$: Observable<Program>;
  @RxStateSelect() protected readonly requiredStrategy$: Observable<boolean>;
  @RxStateSelect() protected readonly strategyId$: Observable<number>;
  @RxStateSelect() protected readonly requiredGear$: Observable<boolean>;
  @RxStateSelect() protected readonly gearId$: Observable<number>;
  @RxStateSelect() protected readonly form$: Observable<UntypedFormGroup>;
  @RxStateSelect() protected readonly editingBatch$: Observable<BatchModel>;
  @RxStateSelect() protected readonly currentBadge$: Observable<BadgeState>;
  @RxStateSelect() protected readonly treePanelFloating$: Observable<boolean>;
  @RxStateSelect() protected readonly model$: Observable<BatchModel>;
  @RxStateSelect() protected readonly batchTreeStatus$: Observable<IBatchTreeStatus>;

  @RxStateProperty() protected model: BatchModel;
  @RxStateProperty() protected programAllowMeasure: boolean;
  @RxStateProperty() protected editingBatch: BatchModel;
  @RxStateProperty() protected catchPmfms: IPmfm[];
  @RxStateProperty() protected sortingPmfms: IPmfm[];
  @RxStateProperty() protected data: Batch;
  @RxStateProperty() protected treePanelFloating: boolean;

  @ViewChild('sidenav') sidenav: MatSidenav;
  @ViewChild('batchModelTree') batchModelTree!: BatchModelTreeComponent;
  @ViewChild('batchTree', { static: false }) batchTree: BatchTreeComponent;
  @ViewChild('modal', { static: false }) modal: IonModal;

  @Input() queryTabIndexParamName: string;
  @Input() modalOptions: Partial<IBatchGroupModalOptions>;
  @Input() defaultHasSubBatches: boolean;
  @Input() availableTaxonGroups: TaxonGroupRef[];
  @Input() showTaxonName: boolean;
  @Input() showTaxonGroup: boolean;
  @Input() showAutoFillButton: boolean;
  @Input() samplingRatioFormat: SamplingRatioFormat = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;
  @Input() selectedTabIndex: number;
  @Input() usageMode: UsageMode;
  @Input() i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
  @Input() useSticky = true;
  @Input() mobile: boolean;
  @Input() showToolbar = true;
  @Input() debug: boolean;
  @Input() filter: BatchFilter;
  @Input() style: 'tabs' | 'menu' = 'menu';
  @Input() useModal = false;
  @Input() rxStrategy: RxConcurrentStrategyNames = 'userBlocking';
  @Input() controlButtonText: 'QUALITY.BTN_CONTROL';

  @Input() @RxStateProperty() programLabel: string;
  @Input() @RxStateProperty() requiredStrategy: boolean;
  @Input() @RxStateProperty() strategyId: number;
  @Input() @RxStateProperty() requiredGear: boolean;
  @Input() @RxStateProperty() gearId: number;
  @Input() @RxStateProperty() allowSpeciesSampling: boolean;
  @Input() @RxStateProperty() allowSubBatches: boolean;
  @Input() @RxStateProperty() allowDiscard: boolean;
  @Input() @RxStateProperty() showCatchForm: boolean;
  @Input() @RxStateProperty() showBatchTables: boolean;

  @Input()
  set program(value: Program) {
    // Disable watchByLabel, when changing programLabel
    // Avoid to watch program changes, when program is given by parent component
    this._listenProgramChanges = false;
    this._state.set('program', (_) => value);
  }
  get program(): Program {
    return this._state.get('program');
  }

  @Input() set physicalGear(value: PhysicalGear) {
    if (this.physicalGear && !PhysicalGear.equals(value, this.physicalGear)) {
      // Reset pmfms, to force a reload
      this.resetRootForm();
    }
    // Apply change
    this._state.set({
      physicalGear: value,
      gearId: toNumber(value?.gear?.id, null),
    });
  }
  get physicalGear(): PhysicalGear {
    return this._state.get('physicalGear');
  }

  get touched(): boolean {
    return this.form?.touched || super.touched;
  }

  get invalid(): boolean {
    return !this.valid;
  }

  get valid(): boolean {
    return !this.model || this.model.valid;
  }

  get loading(): boolean {
    // Should NOT use batchTree loading state, because it is load later (when gearId is known)
    return this.model && this.loadingSubject.value;
  }

  get isNewData(): boolean {
    return isNil(this.data?.id);
  }

  set value(value: Batch) {
    this.setValue(value);
  }

  get value(): Batch {
    return this.data;
  }

  get form(): UntypedFormGroup {
    return this._state.get('form');
  }

  get highlightForwardButton(): boolean {
    return this.editingBatch?.valid && (!this.batchTree?.showBatchTables || this.visibleRowCount > 0);
  }

  get visibleRowCount(): number {
    return this.batchTree?.showBatchTables ? this.batchTree.batchGroupsTable.visibleRowCount : 0;
  }

  get isOnFieldMode() {
    return this.usageMode === 'FIELD';
  }

  @Output() control = new EventEmitter<Event>();

  constructor(
    injector: Injector,
    protected programRefService: ProgramRefService,
    protected batchModelValidatorService: BatchModelValidatorService,
    protected pmfmNamePipe: PmfmNamePipe,
    protected context: TripContextService,
    protected _state: RxState<BatchTreeContainerState>,
    protected settings: LocalSettingsService,
    @Optional() @Inject(APP_LOGGING_SERVICE) loggingService?: ILoggingService
  ) {
    super();

    // Defaults
    this.mobile = settings.mobile;
    this.i18nContext = {
      prefix: '',
      suffix: '',
    };
    this.errorTranslateOptions = { separator: '<br/>', pathTranslator: this };
    this._state.set({
      treePanelFloating:
        this.settings.getPageSettings(BatchTreeContainerSettingsEnum.PAGE_ID, BatchTreeContainerSettingsEnum.TREE_PANEL_FLOATING_KEY) || this.mobile, // On desktop, panel is pinned by default
    });

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

    this._state.hold(
      filterTrue(this.readySubject).pipe(
        switchMap(() => this._state.select(['program', 'gearId'], (s) => s)),
        //debounceTime(100), // WARN: is enable, physical gear changes will NOT be detected, and pmfms not reload
        distinctUntilChanged(equals)
      ),
      async ({ program, gearId }) => {
        await this.setProgram(program);
        await this.loadPmfms(program, gearId);
      }
    );

    this._state.connect(
      'model',
      this._state
        .select(['data', 'physicalGear', 'allowDiscard', 'catchPmfms', 'sortingPmfms'], (s) => s, {
          data: (d1, d2) => d1 === d2,
          physicalGear: PhysicalGear.equals,
          allowDiscard: (a1, a2) => a1 === a2,
          catchPmfms: PmfmUtils.arrayEquals,
          sortingPmfms: PmfmUtils.arrayEquals,
        })
        .pipe(
          filter(({ data, physicalGear, allowDiscard, sortingPmfms, catchPmfms }) => sortingPmfms && catchPmfms && physicalGear && true),
          mergeMap(({ data, physicalGear, allowDiscard, sortingPmfms, catchPmfms }) => {
            // Create the model
            return this.batchModelValidatorService.createModel(data, {
              catchPmfms,
              sortingPmfms,
              physicalGear,
              allowDiscard,
              i18nSuffix: this.i18nContext?.suffix,
            });
          })
        )
    );

    this._state.connect(
      'form',
      this._state
        .select(['model', 'allowSpeciesSampling'], (s) => s)
        .pipe(
          filter(({ model }) => !!model),
          map(({ model, allowSpeciesSampling }) => {
            const form = this.batchModelValidatorService.createFormGroupByModel(model, {
              allowSpeciesSampling,
              isOnFieldMode: this.isOnFieldMode,
            });
            form.disable();
            return form;
          })
        )
    );

    // Reload data, when form (or model) changed
    this._state.hold(this.form$.pipe(filter((form) => !this.loading && !!form)), (_) => {
      this.updateView(this.data, { markAsPristine: false /*keep dirty state*/ });
      // When model was reload: force as dirty (e.g. when allowDiscard change: the batch tree will changed)
      if (!this.dirty) this.markAsDirty();
    });

    this._state.hold(
      filterTrue(this.readySubject).pipe(
        switchMap(() => this.batchTree.dirtySubject),
        filter((dirty) => dirty === true && this.enabled && this.loaded)
      ),
      () => this.markAsDirty()
    );

    // If now allowed sampling batches: remove it from data
    this._state.hold(filterFalse(this.allowSamplingBatches$), () => this.resetSamplingBatches());

    this._state.connect('batchTreeStatus', this.watchBatchTreeStatus());

    this._state.connect('currentBadge', this.batchTreeStatus$, (_, status) => {
      if (!status.valid) {
        return {
          text: '!',
          hidden: false,
          color: 'accent',
        };
      } else if (status.rowCount) {
        return {
          text: status.rowCount.toString(),
          hidden: false,
          color: 'primary',
        };
      }
      return {
        text: '',
        hidden: true,
        color: 'primary',
      };
    });

    // Workaround need by the sidenav, when included inside a MatTabGroup
    const parentTabGroup = injector.get(MatTabGroup);
    if (parentTabGroup) {
      const parentTab = injector.get(MatTab);
      this._state.hold(parentTabGroup.animationDone, () => {
        // Visible
        if (parentTab.isActive) {
          if (!this.treePanelFloating || !this.editingBatch) {
            this.openTreePanel();
          }
        } else {
          this.closeTreePanel();
        }
      });
    }

    // DEBUG
    this._logger = loggingService?.getLogger('batch-tree-container');
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    this.showCatchForm = toBoolean(this.showCatchForm, true);
    this.showBatchTables = toBoolean(this.showBatchTables, true);
    this.programAllowMeasure = toBoolean(this.programAllowMeasure, this.showBatchTables);
    this.allowSubBatches = toBoolean(this.allowSubBatches, this.programAllowMeasure);
    this.allowSpeciesSampling = toBoolean(this.allowSpeciesSampling, this.programAllowMeasure);
    this.allowDiscard = toBoolean(this.allowDiscard, true);
    this.treePanelFloating = toBoolean(this.treePanelFloating, true);

    // Disable all children components
    // FIXME: try to enable this (like in a data editor)
    this.disable();
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

  translateFormPath(path: string): string {
    if (path.startsWith('measurementValues.')) {
      const parts = path.split('.');
      const pmfmId = parseInt(parts[parts.length - 1]);
      const pmfm = (this.catchPmfms || []).find((p) => p.id === pmfmId) || (this.sortingPmfms || []).find((p) => p.id === pmfmId);
      if (pmfm) return this.pmfmNamePipe.transform(pmfm, { i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nContext?.suffix });
    } else if (path.includes('.measurementValues.')) {
      const parts = path.split('.');
      const pmfmId = parseInt(parts[parts.length - 1]);
      const pmfm = (this.sortingPmfms || []).find((p) => p.id === pmfmId);
      if (pmfm) {
        const nodePath = parts.slice(0, parts.length - 2).join('.');
        const node = this.getBatchModelByPath(nodePath);
        return `${node?.fullName || path} > ${this.pmfmNamePipe.transform(pmfm, { i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nContext?.suffix })}`;
      }
    }
    if (path.startsWith('children.')) {
      const parts = path.split('.');
      const fieldName = parts[parts.length - 1];
      const nodePath = parts.slice(0, parts.length - 1).join('.');
      let nodeName = this.getBatchModelByPath(nodePath)?.fullName;
      if (!nodeName) {
        const nodeForm = this.form?.get(nodePath);
        nodeName = nodeForm?.value?.label;
      }
      const i18nKey = (this.batchTree.i18nContext.prefix || 'TRIP.BATCH.EDIT.') + changeCaseToUnderscore(fieldName).toUpperCase();
      return `${nodeName || path} > ${this.translate.instant(i18nKey)}`;
    }
    return path;
  }

  markAllAsTouched(opts?: { emitEvent?: boolean; withChildren?: boolean }) {
    this.form?.markAllAsTouched();
    // Mark children component as touched also
    if (!opts || opts.withChildren !== false) {
      super.markAllAsTouched(opts);
    }
    // Mark as touched the component itself, but NOT the child batch tree
    else {
      if (this.touchedSubject.value !== true) {
        this.touchedSubject.next(true);
      }
      if (!this.loading && (!opts || opts.emitEvent !== false)) this.markForCheck();
    }
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this.form?.markAsPristine(opts);
    super.markAsPristine(opts);
  }

  async autoFill(opts?: { skipIfDisabled: boolean; skipIfNotEmpty: boolean }): Promise<void> {
    await this.ready();

    console.warn(this._logPrefix + 'autoFill() not implemented yet!');
  }

  toggleTreePanelFloating() {
    const previousFloating = this.treePanelFloating;
    this.treePanelFloating = !previousFloating;
    this.settings.savePageSetting(
      BatchTreeContainerSettingsEnum.PAGE_ID,
      this.treePanelFloating,
      BatchTreeContainerSettingsEnum.TREE_PANEL_FLOATING_KEY
    );
    if (!previousFloating) this.sidenav?.close();
  }

  async openTreePanel(event?: Event, opts?: { expandAll?: boolean }) {
    if (event?.defaultPrevented || this.useModal) return; // Cancelled

    // First, expand model tree
    if (!opts || opts.expandAll !== false) {
      if (!this.batchModelTree) this.cd.detectChanges();
      this.batchModelTree?.expandAll();
    }

    // Wait side nav to be created
    if (!this.sidenav) await waitFor(() => !!this.sidenav, { stop: this.destroySubject });
    // open it, if need
    if (!this.sidenav.opened) await this.sidenav.open();

    this.markForCheck();
  }

  closeTreePanel() {
    this.sidenav?.close();
    this.markForCheck();
  }

  toggleTreePanel() {
    this.sidenav?.toggle();
    this.markForCheck();
  }

  addRow(event: Event) {
    if (this.editingBatch?.isLeaf) {
      this.batchTree.addRow(event);
    }
  }

  async unload(opts?: { emitEvent?: boolean }): Promise<void> {
    this.resetRootForm();
    this.data = null;
    this.markAsPristine();
    this.markAsLoading();
  }

  getFirstInvalidTabIndex(): number {
    return 0;
  }

  async setValue(data: Batch, opts?: { emitEvent?: boolean }) {
    data =
      data ||
      Batch.fromObject({
        rankOrder: 1,
        label: AcquisitionLevelCodes.CATCH_BATCH,
      });

    const dataChanged = this.data !== data;
    if (dataChanged) {
      this.data = data;

      // By default, select the root batch in tree
      if (!this._lastEditingBatchPath && !this.useModal) {
        this._lastEditingBatchPath = '';
      }
    }

    // Mark as loading
    if (!opts || opts.emitEvent !== false) this.markAsLoading();

    try {
      // Wait component is ready
      await this.ready();

      // Update the view
      if (data === this.data) {
        await this.updateView(data, { dataChanged });

        if (!opts || opts.emitEvent !== false) {
          this.markAsLoaded();
        }
      }
    } catch (err) {
      console.error((err && err.message) || err);
      throw err;
    }
  }

  getValue(): Batch {
    return this.data;
  }

  async save(event?: Event, opts?: { keepEditingBatch: boolean }): Promise<boolean> {
    try {
      const now = Date.now();
      console.debug(this._logPrefix + `Saving tree...`);

      if (this.dirty && this.loaded) {
        // Save editing batch
        const confirmed = await this.confirmEditingBatch({ keepEditingBatch: true, ...opts });
        if (!confirmed) return false; // Not confirmed = cannot save

        // Get value (using getRawValue(), because some controls are disabled)
        const json = (await firstNotNilPromise(this.form$, { stop: this.destroySubject })).getRawValue();

        // Update data
        this.data = this.data || new Batch();
        this.data.fromObject(json, { withChildren: true });

        console.debug(this._logPrefix + `Saving tree [OK] in ${Date.now() - now}ms`, this.data);
      }

      return true;
    } catch (err) {
      this._logger?.error('save', `Error while saving batch tree: ${err?.message || err}`);
      throw err;
    } finally {
      this.markAllAsTouched();
      if (!this.submitted) {
        this.submitted = true;
        this.markForCheck();
      }
    }
  }

  setModalOption(key: keyof IBatchGroupModalOptions, value: IBatchGroupModalOptions[typeof key]) {
    this.modalOptions = this.modalOptions || {};
    this.modalOptions[key as any] = value;
  }

  setSelectedTabIndex(value: number) {
    this.batchTree?.setSelectedTabIndex(value);
  }

  realignInkBar() {
    this.batchTree?.realignInkBar();
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    // DO NOT wait children ready()
    //await Promise.all(this.childTrees.map(c => c.ready()));

    await super.ready(opts);

    // Wait form
    if (this.loading && this.gearId) {
      await waitForTrue(
        this._state.select(['form', 'model'], (_) => true),
        opts
      );
    } else {
      await firstNotNilPromise(this.program$, opts);
    }
  }

  // Unused
  load(id?: number, options?: any): Promise<any> {
    return Promise.resolve(undefined);
  }

  // Unused
  reload() {
    return this.setValue(this.data);
  }

  /* -- protected function -- */

  protected async setProgram(program: Program, opts?: { emitEvent: boolean }) {
    if (this.debug) console.debug(this._logPrefix + `Program ${program.label} loaded, with properties: `, program.properties);

    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nContext.suffix = i18nSuffix;

    const programAllowMeasure = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ENABLE);
    this.programAllowMeasure = programAllowMeasure;
    this.allowSpeciesSampling = this.allowSpeciesSampling && programAllowMeasure;
    this.allowSubBatches = this.allowSubBatches && programAllowMeasure;
    this.showTaxonGroup = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_GROUP_ENABLE);
    this.showTaxonName = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_NAME_ENABLE);
    this.samplingRatioFormat = program.getProperty(ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT);

    // Propagate to children components, if need
    if (!opts || opts.emitEvent !== false) {
      // This should be need when program$ has been set by parent, and not from the programLabel$ observable
      if (this.programLabel !== program.label) {
        this.programLabel = program.label;
      }
    }

    // Propagate to state, if need
    if (this.program !== program) {
      this.program = program;
    }
    this.markForCheck();
  }

  protected async loadPmfms(program: Program, gearId: number) {
    if (!program || isNil(gearId)) return; // Skip

    console.info(this._logPrefix + 'Loading pmfms...');

    // Remember component state
    const enabled = this.enabled;
    const touched = this.touched;
    const dirty = this.dirty;

    try {
      // Save data if dirty and enabled (do not save when disabled, e.g. when reload)
      if (dirty && enabled) {
        console.info('[batch-tree-container] Save batches... (before to reset tabs)');
        try {
          await this.save();
        } catch (err) {
          // Log then continue
          console.error((err && err.message) || err);
        }
      }

      // Load pmfms for batches
      const [catchPmfms, sortingPmfms] = await Promise.all([
        this.programRefService.loadProgramPmfms(program.label, {
          acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH,
          gearId,
        }),
        this.programRefService.loadProgramPmfms(program.label, {
          acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
          gearId,
        }),
      ]);

      // Update the state
      this._state.set((state) => ({ ...state, catchPmfms, sortingPmfms }));
    } catch (err) {
      const error = err?.message || err;
      this.setError(error);
    } finally {
      // Restore component state
      if (enabled) this.enable();
      if (dirty) this.markAsDirty();
      if (touched) this.markAllAsTouched();
    }
  }

  protected async updateView(data: Batch, opts?: { markAsPristine?: boolean; dataChanged?: boolean }) {
    const model = this.model;
    if (!model) return; // Skip if missing model, or if data changed

    // Set the tree value - only once if data changed, to avoid a tree refresh (e.g. after a save())
    if (!opts || opts.dataChanged !== false) {
      this.batchModelTree.data = [model];
    } else {
      // Update the form (e.g. after a save())
      model.validator.reset(data.asObject(), { emitEvent: false });
    }

    // Keep the editing batch
    const editingBatch = isNotNil(this._lastEditingBatchPath) ? model.get(this._lastEditingBatchPath) : undefined;
    if (editingBatch && !editingBatch.hidden && !this.useModal) {
      // Force a reload to update the batch id (e.g. after a save(), to force batch id to be applied)
      if (this.editingBatch === editingBatch) await this.stopEditBatch();

      await this.startEditBatch(null, editingBatch);
    } else {
      // Stop editing batch (not found)
      await this.stopEditBatch();
    }

    if (!opts || opts.markAsPristine !== false) {
      this.markAsPristine();
    }
  }

  protected async startEditBatch(event: Event | undefined, model: BatchModel) {
    if (!model || !(model instanceof BatchModel)) throw new Error("Missing required 'model' argument");

    event?.stopImmediatePropagation();

    if (this.editingBatch === model) {
      if (this.treePanelFloating) this.closeTreePanel();
      if (this.useModal) await this.modal?.present();
      return; // Skip
    }

    // Save current state
    await this.ready();
    const dirty = this.dirty;
    const touched = this.touched;
    const enabled = this.enabled;

    try {
      // Save previous changes
      const confirmed = await this.confirmEditingBatch({ keepEditingBatch: true });
      if (!confirmed) return; // Not confirmed = Cannot change

      console.info(this._logPrefix + `Start editing '${model?.name}'...`);

      if (this.treePanelFloating) this.closeTreePanel();

      model.editing = true;

      if (this.modal && !this.modal.isOpen) {
        if (!this.batchTree) {
          await this.modal.present();
          this.cd.detectChanges();
        } else {
          this.modal.present();
        }
      }

      // Remember last editing batch, to be able to restore it later (e.g. see setValue())
      this._lastEditingBatchPath = model.path;
      this.batchTree.markAsNotReady();

      const rootAcquisitionLevel = !model.parent ? AcquisitionLevelCodes.CATCH_BATCH : AcquisitionLevelCodes.SORTING_BATCH;
      const program = this.program;
      const programLabel = program?.label || this.programLabel;

      // do NOT pass the programLabel here, to avoid a pmfms reload (pmfms will be pass using 'model.state' - see bellow)
      //this.batchTree.programLabel = programLabel;
      if (program !== this.batchTree.program) {
        await this.batchTree.setProgram(program, { emitEvent: false /*avoid pmfms reload*/ });
      }

      // Configure batch tree
      this.batchTree.physicalGear = this.physicalGear;
      this.batchTree.requiredStrategy = this.requiredStrategy;
      this.batchTree.strategyId = this.strategyId;
      this.batchTree.gearId = this.gearId;
      this.batchTree.i18nContext = this.i18nContext;
      this.batchTree.showBatchTables =
        this.showBatchTables && model.childrenPmfms && isNotEmptyArray(PmfmUtils.filterPmfms(model.childrenPmfms, { excludeHidden: true }));
      this.batchTree.allowSpeciesSampling = this.allowSpeciesSampling;
      const allowSubBatches = toBoolean(model.childrenState?.allowSubBatches, this.allowSubBatches);
      this.batchTree.allowSubBatches = allowSubBatches;
      this.batchTree.batchGroupsTable.showTaxonGroupColumn = toBoolean(model.childrenState?.showTaxonGroupColumn, this.showTaxonGroup);
      this.batchTree.batchGroupsTable.showTaxonNameColumn = toBoolean(model.childrenState?.showTaxonNameColumn, this.showTaxonName);
      this.batchTree.batchGroupsTable.showSamplingBatchColumns = toBoolean(model.childrenState?.showSamplingBatchColumns, this.allowSubBatches);
      this.batchTree.batchGroupsTable.showIndividualCountColumns = toBoolean(model.childrenState?.showIndividualCountColumns, !this.mobile);
      this.batchTree.batchGroupsTable.showAutoFillButton = toBoolean(model.childrenState?.showAutoFillButton, false);
      this.batchTree.batchGroupsTable.allowSubBatches = allowSubBatches;
      this.batchTree.batchGroupsTable.samplingRatioFormat = this.samplingRatioFormat;
      this.batchTree.rootAcquisitionLevel = rootAcquisitionLevel;
      this.batchTree.setSubBatchesModalOption('programLabel', programLabel);
      this.batchTree.batchGroupsTable.pmfms = model.childrenPmfms || [];

      // Configure catch form state
      this.batchTree.catchBatchForm.applyState({
        acquisitionLevel: rootAcquisitionLevel,
        // defaults
        showSamplingBatch: false,
        samplingBatchEnabled: false,
        samplingRatioFormat: this.samplingRatioFormat,
        // Pass inputs (e.g. initialPmfms, to avoid a pmfm reloading)
        ...model.state,
      });

      this.batchTree.markAsReady();

      const jobs: Promise<void>[] = [this.batchTree.catchBatchForm.ready(), this.batchTree.batchGroupsTable.ready()];

      if (this.batchTree.subBatchesTable) {
        // TODO: pass sub batches pmfms. For now there are recomputed
        this.batchTree.subBatchesTable.programLabel = programLabel;
        jobs.push(this.batchTree.subBatchesTable.ready());
      }

      // Prepare data to set
      let data: Batch;
      if (model.state?.showSamplingBatch) {
        const source = model.currentData;
        data = Batch.fromObject(source, { withChildren: false });
        const samplingSource = BatchUtils.getOrCreateSamplingChild(source);
        data.children = [Batch.fromObject(samplingSource, { withChildren: model.isLeaf })];
      } else {
        data = Batch.fromObject(model.currentData, { withChildren: model.isLeaf });
      }

      // Waiting end of init jobs
      await Promise.all(jobs);

      // Apply data
      await this.batchTree.setValue(data);
      this.editingBatch = model;
    } finally {
      // Restore previous state
      if (dirty) this.markAsDirty();
      if (touched) this.markAllAsTouched({ withChildren: false });
      if (enabled && !this.batchTree.enabled) this.batchTree.enable();
    }
  }

  protected async stopEditBatch(event?: Event, source?: BatchModel) {
    source = source || this.editingBatch;
    if (!source) return;

    this.editingBatch = null;
    source.editing = false;

    // Forget the last editing batch
    this._lastEditingBatchPath = null;
  }

  private resetRootForm() {
    // Reset pmfms, form and model
    this._state.set({
      sortingPmfms: null,
      catchPmfms: null,
      gearId: null,
      form: null,
      model: null,
    });
    this._lastEditingBatchPath = null;
  }

  private async resetSamplingBatches() {
    if (!this.loaded) return;

    const dirty = this.dirty;

    // Save if need
    if (dirty) {
      const saved = await this.save();
      if (!saved) return; // Skip
    }

    try {
      // Delete sampling batches in data
      const deletedSamplingBatches = BatchUtils.deleteByFilterInTree(this.data, { isSamplingBatch: true });

      // Some batches have been deleted
      if (isNotEmptyArray(deletedSamplingBatches)) {
        // Reapply data
        await this.setValue(this.data, { emitEvent: false });
      }
    } finally {
      // Restore dirty state
      if (dirty) this.markAsDirty();
    }
  }

  /**
   * Save editing batch
   */
  protected async confirmEditingBatch(opts?: { keepEditingBatch: boolean }): Promise<boolean> {
    const model = this.editingBatch;
    if (!model) return true; // No editing batch: ok (not need to save)

    // Save current state
    const dirty = this.dirty;

    // Save if need
    if (this.batchTree.dirty) {
      console.info(this._logPrefix + `Saving ${model.originalData.label} ...`);
      const saved = await this.batchTree.save();
      if (!saved) {
        model.valid = this.batchTree.valid;
        return false;
      }
    }

    // Get saved data
    const batch = this.batchTree.value?.clone();

    if (batch.label && batch.label !== model.originalData.label) {
      console.error(`Invalid saved batch label. Expected: ${model.originalData.label} Actual: ${batch.label}`);
      throw new Error(`Invalid saved batch label. Expected: ${model.originalData.label} Actual: ${batch.label}`);
    }

    // Update model value (batch first)
    const json = batch.asObject();
    if (isNotEmptyArray(model.pmfms)) {
      MeasurementValuesUtils.normalizeEntityToForm(json, model.pmfms, model.validator, { keepOtherExistingPmfms: true });
    }

    // Update batch weight (need by validator)
    if (model.state.showWeight) {
      json.weight = BatchUtils.getWeight(json, model.weightPmfms);
    }
    if (model.state.showSampleWeight) {
      const samplingJson = BatchUtils.getSamplingChild(json);
      samplingJson.weight = BatchUtils.getWeight(samplingJson, model.weightPmfms);
    }
    model.validator.patchValue(json);

    // Wait validation finished
    if (!model.validator.valid) {
      await AppFormUtils.waitWhilePending(model.validator);
      // Log invalid
      if (this.debug && model.validator.invalid) {
        AppFormUtils.logFormErrors(model.validator, '[batch-tree-container] ');
      }
    }

    // Update model validity
    model.valid = model.validator.valid;

    // Update rowCount
    if (model.isLeaf) {
      model.rowCount = this.batchTree.batchGroupsTable.visibleRowCount;
    }

    if (!opts || opts.keepEditingBatch !== true) {
      this.editingBatch = null;
      model.editing = false;

      this.modal?.dismiss();
    }

    // Reset dirty state
    this.batchTree.markAsPristine();

    // Restore the previous dirty state
    if (dirty) this.markAsDirty();

    return true;
  }

  protected getBatchModelByPath(path: string): BatchModel | undefined {
    return getPropertyByPath(this.model, path) as BatchModel | undefined;
  }

  async forward(event?: Event, model?: BatchModel) {
    console.debug(this._logPrefix + 'Go forward');
    event?.stopImmediatePropagation();

    model = model || this.editingBatch;
    if (!model) return;

    const nextVisible = TreeItemEntityUtils.forward(model, (c) => !c.hidden);
    if (nextVisible.disabled) return this.forward(null, nextVisible);
    if (nextVisible) {
      await this.startEditBatch(null, nextVisible);
      this.setSelectedTabIndex(0);
    }
  }

  async backward(event?: Event, model?: BatchModel) {
    console.debug(this._logPrefix + 'Go backward');
    event?.stopImmediatePropagation();

    model = model || this.editingBatch;
    if (!model) return;

    const previousVisible = TreeItemEntityUtils.backward(model, (c) => !c.hidden);
    if (previousVisible.disabled) return this.backward(null, previousVisible);
    if (previousVisible) {
      await this.startEditBatch(null, previousVisible);
      this.setSelectedTabIndex(0);
    }
  }

  protected watchBatchTreeStatus(): Observable<IBatchTreeStatus> {
    const stopSubject = new Subject<void>();
    return new Observable<IBatchTreeStatus>((subscriber) => {
      const subscription = new Subscription();
      subscription.add(() => stopSubject.next());
      waitFor(() => !!this.batchTree, { stop: stopSubject }).then(() => {
        subscription.add(
          this.batchTree.statusChanges
            .pipe(
              combineLatestWith(this.batchTree.batchGroupsTable.dataSource.rowsSubject),
              map(([status, rows]) => {
                return {
                  valid: status !== 'INVALID',
                  rowCount: this.batchTree.showBatchTables ? rows?.length || 0 : undefined,
                };
              })
            )
            .subscribe((state) => subscriber.next(state))
        );
      });
      return subscription;
    });
  }
}
