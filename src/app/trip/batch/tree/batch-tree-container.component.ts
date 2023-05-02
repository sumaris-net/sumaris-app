import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import {
  AppEditor,
  AppErrorWithDetails,
  AppFormUtils,
  changeCaseToUnderscore,
  equals,
  fadeInOutAnimation,
  filterFalse,
  filterTrue,
  firstNotNilPromise,
  FormErrorTranslatorOptions,
  getPropertyByPath,
  isEmptyArray,
  isNil,
  isNotEmptyArray, isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  toBoolean,
  toNumber,
  UsageMode, waitFor,
  WaitForOptions,
  waitForTrue
} from '@sumaris-net/ngx-components';
import { AlertController, IonModal, NavController } from '@ionic/angular';
import { BatchTreeComponent, IBatchTreeComponent } from '@app/trip/batch/tree/batch-tree.component';
import { Batch } from '@app/trip/batch/common/batch.model';
import { IBatchGroupModalOptions } from '@app/trip/batch/group/batch-group.modal';
import { Program } from '@app/referential/services/model/program.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { merge, Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
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
import { PhysicalGearService } from '@app/trip/physicalgear/physicalgear.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { TreeItemEntityUtils } from '@app/shared/tree-item-entity.utils';
import { RxState } from '@rx-angular/state';
import { BatchModelTreeComponent } from '@app/trip/batch/tree/batch-model-tree.component';
import { MatSidenav } from '@angular/material/sidenav';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { ContextService } from '@app/shared/context.service';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';


interface BadgeState {
  hidden: boolean;
  text: string;
  color: 'primary'|'accent';
}

interface ComponentState {
  programAllowMeasure: boolean;
  showBatchTables: boolean;
  allowDiscard: boolean;
  allowSpeciesSampling: boolean;
  allowSubBatches: boolean;
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
  currentBadge: BadgeState;
  treePanelFloating: boolean;
}

@Component({
  selector: 'app-batch-tree-container',
  templateUrl: './batch-tree-container.component.html',
  styleUrls: ['./batch-tree-container.component.scss'],
  providers: [
    { provide: ContextService, useExisting: TripContextService},
    RxState
  ],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchTreeContainerComponent extends AppEditor<Batch>
  implements IBatchTreeComponent {

  private _listenStatusChangesSubscription: Subscription;
  private _listenProgramChanges = true;
  protected _logPrefix = '[batch-tree-container] ';
  protected _lastEditingBatchPath: string;

  protected readonly allowSamplingBatches$ = this._state.select('allowSpeciesSampling');
  protected readonly allowSubBatches$ = this._state.select('allowSubBatches');
  protected readonly programLabel$ = this._state.select('programLabel');
  protected readonly program$ = this._state.select('program');
  protected readonly form$ = this._state.select('form');
  protected readonly editingBatch$ = this._state.select('editingBatch');
  protected readonly currentBadge$ = this._state.select('currentBadge');
  protected readonly treePanelFloating$ = this._state.select('treePanelFloating');

  protected get model(): BatchModel {
    return this._state.get('model');
  }

  protected set editingBatch(value: BatchModel) {
    this._state.set('editingBatch', _ => value);
  }

  protected get editingBatch(): BatchModel {
    return this._state.get('editingBatch');
  }

  protected get catchPmfms(): IPmfm[]{
    return this._state.get('catchPmfms');
  }

  protected get sortingPmfms(): IPmfm[]{
    return this._state.get('sortingPmfms');
  }

  protected set data(value: Batch){
    this._state.set('data', (_) => value);
  }

  protected get data(): Batch{
    return this._state.get('data');
  }
  errorTranslatorOptions: FormErrorTranslatorOptions;

  @ViewChild('batchTree') batchTree: BatchTreeComponent;
  @ViewChild('batchModelTree') batchModelTree!: BatchModelTreeComponent;
  @ViewChild('sidenav') sidenav: MatSidenav;
  @ViewChild('modal') modal!: IonModal;

  @Input() queryTabIndexParamName: string;
  @Input() modalOptions: Partial<IBatchGroupModalOptions>;
  @Input() showCatchForm: boolean;
  @Input() defaultHasSubBatches: boolean;
  @Input() availableTaxonGroups: TaxonGroupRef[];
  @Input() useModal = false;

  @Input() set allowSpeciesSampling(value: boolean) {
    this._state.set('allowSpeciesSampling', (_) => value);
  }
  get allowSpeciesSampling(): boolean {
    return this._state.get('allowSpeciesSampling') ;
  }

  @Input() set allowSubBatches(value: boolean) {
    this._state.set('allowSubBatches', (_) => value);
  }
  get allowSubBatches(): boolean {
    return this._state.get('allowSubBatches');
  }

  @Input() showTaxonName: boolean;
  @Input() showTaxonGroup: boolean;
  @Input() samplingRatioFormat: SamplingRatioFormat = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;
  @Input() selectedTabIndex: number;
  @Input() usageMode: UsageMode;
  @Input() i18nPmfmPrefix: string = 'TRIP.BATCH.PMFM.';
  @Input() useSticky = true;
  @Input() mobile: boolean;
  @Input() debug: boolean;
  @Input() filter: BatchFilter;
  @Input() style: 'tabs'|'menu' = 'menu';
  @Input() showToolbar = true;

  @Input()
  set programLabel(value: string) {
    this._state.set('programLabel', (_) => value);
  }

  get programLabel(): string {
    return this._state.get('programLabel') || this.program?.label;
  }

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

  @Input() set gearId(value: number) {
    this._state.set('gearId', (_) => value);
  }

  get gearId(): number {
    return this._state.get('gearId');
  }

  @Input() set physicalGear(value: PhysicalGear) {
    if (this.physicalGear && value?.id !== this.physicalGear.id) {
      // Reset pmfms, to force a reload
      this.resetRootForm();
    }
    // Apply change
    this._state.set({
      physicalGear: value,
      gearId: toNumber(value?.gear?.id, null)
    });
  }

  get physicalGear(): PhysicalGear {
    return this._state.get('physicalGear');
  }

  @Input() set showBatchTables(value: boolean) {
    this._state.set('showBatchTables', (_) => value);
  }

  get showBatchTables(): boolean {
    return this._state.get('showBatchTables') || false;
  }

  @Input() set allowDiscard(value: boolean) {
    this._state.set('allowDiscard', _ => value);
  }

  get programAllowMeasure(): boolean {
    return this._state.get('programAllowMeasure');
  }

  set programAllowMeasure(value: boolean) {
    this._state.set('programAllowMeasure', _ => value);
  }

  get allowDiscard(): boolean {
    return this._state.get('allowDiscard');
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
    return this.editingBatch?.valid && (
      !this.batchTree?.showBatchTables
      || this.visibleRowCount > 0
    );
  }

  get visibleRowCount(): number {
    return this.batchTree?.showBatchTables
      ? this.batchTree.batchGroupsTable.visibleRowCount
      : 0;
  }

  get isOnFieldMode() {
    return this.usageMode === 'FIELD';
  }

  set treePanelFloating(value: boolean) {
    this._state.set('treePanelFloating', _ => value);
  }

  get treePanelFloating(): boolean {
    return this._state.get('treePanelFloating');
  }

  constructor(injector: Injector,
              route: ActivatedRoute,
              router: Router,
              alertCtrl: AlertController,
              translate: TranslateService,
              protected programRefService: ProgramRefService,
              protected batchModelValidatorService: BatchModelValidatorService,
              protected pmfmNamePipe: PmfmNamePipe,
              protected physicalGearService: PhysicalGearService,
              protected context: TripContextService,
              protected _state: RxState<ComponentState>,
              protected cd: ChangeDetectorRef) {
    super(route, router, injector.get(NavController), alertCtrl, translate);

    // Defaults
    this.mobile = injector.get(LocalSettingsService).mobile;
    this.i18nContext = {
      prefix: '',
      suffix: ''
    };
    this.errorTranslatorOptions = {separator: '<br/>', controlPathTranslator: this};
    this._state.set({
      treePanelFloating: this.mobile, // On desktop, panel is pinned by default
    });

    // Watch program, to configure tables from program properties
    this._state.connect('program', this.programLabel$
      .pipe(
        filter(() => this._listenProgramChanges), // Avoid to watch program, if was already set
        filter(isNotNilOrBlank),
        distinctUntilChanged(),
        switchMap(programLabel => this.programRefService.watchByLabel(programLabel))
      ));

    this._state.hold(filterTrue(this.readySubject)
        .pipe(
          switchMap(() => this._state.select(['program', 'gearId'], s => s)),
          debounceTime(100),
          distinctUntilChanged(equals)
        ),
      async ({program, gearId}) => {
        await this.setProgram(program);
        await this.loadPmfms(program, gearId);
      });

    this._state.connect('model',
      this._state.select(['data', 'physicalGear', 'allowDiscard', 'catchPmfms', 'sortingPmfms'], s => s, {
        data: (d1, d2) => d1 === d2,
        physicalGear: PhysicalGear.equals,
        allowDiscard: (a1, a2) => a1 === a2,
        catchPmfms: equals,
        sortingPmfms: equals
      })
        .pipe(
          filter(({data, physicalGear, allowDiscard, sortingPmfms, catchPmfms}) => sortingPmfms && catchPmfms && physicalGear && true),
          mergeMap(async ({data, physicalGear, allowDiscard, sortingPmfms, catchPmfms}) => {
            // Load physical gear's children (if not already done)
            if (physicalGear && isEmptyArray(physicalGear.children)) {
              const tripId = this.context.trip?.id;
              physicalGear.children = await this.physicalGearService.loadAllByParentId({tripId, parentGearId: physicalGear.id});
            }

            // Create the model
            return this.batchModelValidatorService.createModel(data, {allowDiscard, sortingPmfms, catchPmfms, physicalGear})
          })
        )
    );

    this._state.connect('form', this._state.select(['model', 'allowSpeciesSampling'], s => s)
      .pipe(
        filter(({model, allowSpeciesSampling}) => !!model),
        map(({model, allowSpeciesSampling}) => {
          const form = this.batchModelValidatorService.createFormGroupByModel(model, {
            allowSpeciesSampling,
            isOnFieldMode: this.isOnFieldMode
          });
          form.disable();
          return form;
        })
      )
    );

    // Reload data, when form (or model) changed
    this._state.hold(this.form$
      .pipe(
        filter(form => !this.loading && !!form)
      ),
      (_) => this.updateView(this.data, {markAsPristine: false /*keep dirty state*/}));

    this._state.hold(filterTrue(this.readySubject)
        .pipe(
          switchMap(() => this.batchTree.dirtySubject),
          filter(dirty => dirty === true && this.enabled && this.loaded)
        ),
      () => this.markAsDirty()
    );

    // If now allowed sampling batches: remove it from data
    this._state.hold(filterFalse(this.allowSamplingBatches$), () => this.resetSamplingBatches())

    this._state.connect('currentBadge', this.watchBatchTreeState(), (state, batchTree) => {
      const badge: BadgeState = {
        text: '',
        hidden: true,
        color: 'primary'
      };
      if (!batchTree.valid) {
        badge.text = '!';
        badge.color = 'accent';
        badge.hidden = false;
      }
      else if (batchTree.visibleRowCount) {
        badge.text = batchTree.visibleRowCount.toString();
        badge.hidden = false;
      }
      return badge;
    });

    // DEBUG
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    this.showCatchForm = toBoolean(this.showCatchForm, true);
    this.showBatchTables = toBoolean(this._state.get('showBatchTables'), true);
    this.programAllowMeasure = toBoolean(this._state.get('programAllowMeasure'), this.showBatchTables);
    this.allowSubBatches = toBoolean(this._state.get('allowSubBatches'), this.programAllowMeasure);
    this.allowSpeciesSampling = toBoolean(this._state.get('allowSpeciesSampling'), this.programAllowMeasure);
    this.allowDiscard = toBoolean(this.allowDiscard, true);
    this.treePanelFloating = toBoolean(this.treePanelFloating, true);
  }

  // Change visibility to public
  setError(error: string|AppErrorWithDetails, opts?: { emitEvent?: boolean;  }) {
    if (!error || typeof error === 'string') {
      super.setError(error as string, opts);
    }
    else {
      console.log('TODO: apply error to rows ?', error)
    }
  }

  // Change visibility to public
  resetError(opts?: { emitEvent?: boolean }) {
    super.resetError(opts);
  }

  translateControlPath(path: string): string {
    if (path.startsWith('measurementValues.')) {
      const parts = path.split('.');
      const pmfmId = parseInt(parts[parts.length-1]);
      const pmfm = (this.catchPmfms || []).find(p => p.id === pmfmId)
        || (this.sortingPmfms || []).find(p => p.id === pmfmId);
      if (pmfm) return this.pmfmNamePipe.transform(pmfm, {i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nContext?.suffix});
    }
    else if (path.includes('.measurementValues.')) {
      const parts = path.split('.');
      const pmfmId = parseInt(parts[parts.length-1]);
      const pmfm = (this.sortingPmfms || []).find(p => p.id === pmfmId);
      if (pmfm) {
        const nodePath = parts.slice(0, parts.length - 2).join('.');
        const node = this.getBatchModelByPath(nodePath);
        return `${node?.fullName || path} > ${this.pmfmNamePipe.transform(pmfm, {i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nContext?.suffix})}`;
      }
    }
    if (path.startsWith('children.')){
      const parts = path.split('.');
      const fieldName = parts[parts.length-1];
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

  markAllAsTouched(opts?: { emitEvent?: boolean; withChildren?: boolean; }) {
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

  async autoFill(opts?: { skipIfDisabled: boolean; skipIfNotEmpty: boolean; }): Promise<void> {
    await this.ready();

    console.warn(this._logPrefix + 'autoFill() not implemented yet!');
  }

  toggleFloatingPanel(event?: Event) {
    if (this.sidenav?.opened) this.sidenav.close();
  }

  toggleTreePanelFloating() {
    const previousFloating = this.treePanelFloating;
    this.treePanelFloating = !previousFloating;
    if (!previousFloating) this.sidenav?.close();
  }

  async openTreePanel(event?: Event, opts?: {expandAll?: boolean}) {
    if (event?.defaultPrevented || this.useModal) return; // Cancelled

    // First, expand model tree
    if (!opts || opts.expandAll !== false) {
      this.batchModelTree.expandAll();
    }

    if (!this.useModal) {
      // Wait side nav to be carted
      if (this.sidenav) await waitFor(() => !!this.sidenav, {stop: this.destroySubject});
      // open it
      await this.sidenav.open();
    }

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

  async unload(opts?: { emitEvent?: boolean; }): Promise<void> {
    this.resetRootForm();
    this.data = null;
    this.markAsPristine();
    this.markAsLoading();
  }

  getFirstInvalidTabIndex(): number {
    return 0;
  }

  async setValue(data: Batch, opts?: {emitEvent?: boolean;}) {
    data = data || Batch.fromObject({
      rankOrder: 1,
      label: AcquisitionLevelCodes.CATCH_BATCH
    });

    const dataChanged = (this.data !== data);
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
        await this.updateView(data, {dataChanged});

        if (!opts || opts.emitEvent !== false) {
          this.markAsLoaded();
        }

      }
    }
    catch (err) {
      console.error(err && err.message || err);
      throw err;
    }
  }

  getValue(): Batch {
    return this.data;
  }

  async save(event?: Event, opts?: {keepEditingBatch: boolean}): Promise<boolean> {

    try {
      const now = Date.now();
      console.debug(this._logPrefix + `Saving tree...`);

      if (this.dirty && this.loaded) {
        // Save editing batch
        const confirmed = await this.confirmEditingBatch({keepEditingBatch: true, ...opts});
        if (!confirmed) return false; // Not confirmed = cannot save

        // Get value (using getRawValue(), because some controls are disabled)
        const json = this.form.getRawValue();

        // Update data
        this.data = this.data || new Batch();
        this.data.fromObject(json, {withChildren: true});

        console.debug(this._logPrefix + `Saving tree [OK] in ${Date.now()-now}ms`, this.data);
      }

      return true;
    }
    finally {
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

  }

  realignInkBar() {

  }

  async ready(opts?: WaitForOptions): Promise<void> {
    // DO NOT wait children ready()
    //await Promise.all(this.childTrees.map(c => c.ready()));

    await super.ready(opts);

    // Wait form
    if (this.loading && this.gearId) {
      await waitForTrue(this._state.select(['form', 'model'], _ => true), opts);
    }
    else {
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


  protected async setProgram(program: Program, opts?: {emitEvent: boolean}) {
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
        console.info('[batch-tree-container] Save batches... (before to reset tabs)')
        try {
          await this.save();
        }
        catch (err) {
          // Log then continue
          console.error(err && err.message || err);
        }
      }

      // Load pmfms for batches
      const [catchPmfms, sortingPmfms] = await Promise.all([
        this.programRefService.loadProgramPmfms(program.label, {
          acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH,
          gearId
        }),
        this.programRefService.loadProgramPmfms(program.label, {
          acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
          gearId
        })
      ]);

      // Update the state
      this._state.set((state) => {
        return {...state, catchPmfms, sortingPmfms};
      });

    }
    catch (err) {
      const error = err?.message || err;
      this.setError(error);
    }
    finally {
      // Restore component state
      if (enabled) this.enable();
      if (dirty) this.markAsDirty();
      if (touched) this.markAllAsTouched();
    }
  }

  protected async updateView(data: Batch, opts?: {markAsPristine?: boolean; dataChanged?: boolean}) {
    const model = this.model;
    if (!model) return; // Skip if missing model, or if data changed

    // Set the tree value - only once if data changed, to avoid a tree refresh (e.g. after a save())
    if (!opts || opts.dataChanged !== false) {
      this.batchModelTree.data = [model];
    }
    else {
      // Update the form (e.g. after a save())
      model.validator.reset(data.asObject(), {emitEvent: false});
    }

    // Keep the editing batch
    const editingBatch = isNotNil(this._lastEditingBatchPath) ? model.get(this._lastEditingBatchPath) : undefined;
    if (!editingBatch?.hidden) {

      // Force a reload to update the batch id (e.g. after a save(), to force batch id to be applied)
      if (this.editingBatch === editingBatch) await this.stopEditBatch();

      await this.startEditBatch(null, editingBatch);
    }
    else {
      // Stop editing batch (not found)
      await this.stopEditBatch();

      // Open filter panel
      await this.openTreePanel();
    }

    if (!opts || opts.markAsPristine !== false) {
      this.markAsPristine();
    }
  }

  protected async startEditBatch(event: Event|undefined, model: BatchModel) {
    if (!model || !(model instanceof BatchModel)) throw new Error('Missing required \'model\' argument');

    event?.stopImmediatePropagation();

    if (this.editingBatch === model) {
      if (this.treePanelFloating) this.closeTreePanel();
      this.modal?.present();
      return; // Skip
    }

    this._listenStatusChangesSubscription?.unsubscribe();

    // Save current state
    await this.ready();
    const dirty = this.dirty;
    const touched = this.touched;
    const enabled = this.enabled;

    try {
      // Save previous changes
      const confirmed = await this.confirmEditingBatch({keepEditingBatch: true});
      if (!confirmed) return; // Not confirmed = Cannot change

      console.info(this._logPrefix + `Start editing '${model?.name}'...`);

      if (this.treePanelFloating) this.closeTreePanel();

      this.editingBatch = model;
      model.editing = true;

      if (this.modal && !this.modal.isOpen) {
        if (!this.batchTree) {
          await this.modal.present();
          this.cd.detectChanges();
        }
        else {
          this.modal.present();
        }
      }

      // Remember last editing batch, to be able to restore it later (e.g. see setValue())
      this._lastEditingBatchPath = model.path;

      const rootAcquisitionLevel = !model.parent ? AcquisitionLevelCodes.CATCH_BATCH : AcquisitionLevelCodes.SORTING_BATCH;
      const program = this.program;
      const programLabel = program?.label || this.programLabel;

      // do NOT pass the programLabel here, to avoid a pmfms reload (pmfms will be pass using 'model.state' - see bellow)
      //this.batchTree.programLabel = programLabel;
      if (program !== this.batchTree.program) {
        await this.batchTree.setProgram(program, { emitEvent: false /*avoid pmfms reload*/ });
      }

      // Configure batch tree
      this.batchTree.gearId = this.gearId;
      this.batchTree.physicalGear = this.physicalGear;
      this.batchTree.i18nContext = this.i18nContext;
      this.batchTree.showBatchTables = this.showBatchTables && model.childrenPmfms && isNotEmptyArray(PmfmUtils.filterPmfms(model.childrenPmfms, { excludeHidden: true }));
      this.batchTree.allowSpeciesSampling = this.allowSpeciesSampling;
      this.batchTree.allowSubBatches = this.allowSubBatches;
      this.batchTree.batchGroupsTable.showTaxonGroupColumn = this.showTaxonGroup;
      this.batchTree.batchGroupsTable.showTaxonNameColumn = this.showTaxonName;
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
        // Pass inputs (e.g. pmfms, to avoid a pmfm reloading)
        ...model.state
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
        data = Batch.fromObject(source, {withChildren: false});
        const samplingSource = BatchUtils.getOrCreateSamplingChild(source);
        data.children = [Batch.fromObject(samplingSource, {withChildren: model.isLeaf})];
      }
      else {
        data = Batch.fromObject(model.currentData, {withChildren: model.isLeaf});
      }

      // Waiting end of init jobs
      await Promise.all(jobs);

      // Apply data
      await this.batchTree.setValue(data);

      // Listen batchTree's status, to update the model's one
      const subscription = this.batchTree.statusChanges
        .pipe(
          filter(status => status !== 'PENDING'),
          map(status => status === 'VALID')
        )
        .subscribe(valid => {
          // DEBUG
          //if (this.debug) console.debug(this._logPrefix + 'batchTree status changes: ', status);
          model.valid = valid;
          this.markForCheck();
        });
      this.registerSubscription(subscription);
      this._listenStatusChangesSubscription = subscription;
      subscription.add(() => {
        this.unregisterSubscription(subscription);
        if (this._listenStatusChangesSubscription === subscription) this._listenStatusChangesSubscription = null;
      })
    }
    finally {
      // Restore previous state
      if (dirty) this.markAsDirty();
      if (touched) this.markAllAsTouched({withChildren: false});
      if (enabled && !this.batchTree.enabled) this.batchTree.enable();
    }
  }

  protected async stopEditBatch(event?: Event, source?: BatchModel) {

    source = source || this.editingBatch;
    if (!source) return;

    this._listenStatusChangesSubscription?.unsubscribe();
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
      form: null,
      model: null
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
      const deletedSamplingBatches = BatchUtils.deleteByFilterInTree(this.data, {isSamplingBatch: true});

      // Some batches have been deleted
      if (isNotEmptyArray(deletedSamplingBatches)) {

        // Reapply data
        await this.setValue(this.data, {emitEvent: false});
      }
    }
    finally {
      // Restore dirty state
      if (dirty) this.markAsDirty();
    }
  }

  /**
   * Save editing batch
   */
  protected async confirmEditingBatch(opts?: {keepEditingBatch: boolean;}): Promise<boolean> {
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

    if (batch.label !== model.originalData.label)
      throw new Error(`Invalid saved batch label. Expected: ${model.originalData.label} Actual: ${batch.label}`);

    // Stop listening editing row
    this._listenStatusChangesSubscription?.unsubscribe();

    // Update model value (batch first)
    const json = batch.asObject();
    if (isNotEmptyArray(model.pmfms)) {
      MeasurementValuesUtils.normalizeEntityToForm(json, model.pmfms, model.validator, {keepOtherExistingPmfms: true});
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

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected getBatchModelByPath(path: string): BatchModel|undefined {
    return getPropertyByPath(this.model, path) as BatchModel|undefined;
  }

  forward(event?: Event, model?: BatchModel) {
    console.debug(this._logPrefix + 'Go forward');
    event?.stopImmediatePropagation();

    model = model || this.editingBatch;
    if (!model) return;

    const nextVisible = TreeItemEntityUtils.forward(model, c => !c.hidden);
    if (nextVisible) {
      this.startEditBatch(null, nextVisible);
      this.setSelectedTabIndex(0);
    }
  }

  backward(event?: Event, model?: BatchModel) {
    console.debug(this._logPrefix + 'Go backward');
    event?.stopImmediatePropagation();

    model = model || this.editingBatch;
    if (!model) return;

    const previousVisible = TreeItemEntityUtils.backward(model, c => !c.hidden);
    if (previousVisible) {
      this.startEditBatch(null, previousVisible);
    }
  }

  protected watchBatchTreeState(): Observable<{ valid: boolean; visibleRowCount: number|undefined}> {
    const stop$ = new Subject();
    return new Observable<{ valid: boolean; visibleRowCount: number|undefined}>((subscriber) => {
      const subscription = new Subscription();
      subscription.add(() => stop$.next());
      waitFor(() => !!this.batchTree, {stop: stop$})
        .then(() => {
          subscription.add(
            merge(
              this.batchTree.statusChanges,
              this.batchTree.batchGroupsTable.dataSource.rowsSubject
            )
              .pipe(
                map(_ => {
                  return {
                    valid: !this.batchTree.invalid,
                    visibleRowCount: this.batchTree.showBatchTables
                      ? this.batchTree.batchGroupsTable.visibleRowCount
                      : undefined
                  };
                })
              )
              .subscribe(state => subscriber.next(state))
          );
        })
      return subscription;
    });
  }
}
