import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild} from '@angular/core';
import {
  AppEditor,
  AppErrorWithDetails,
  changeCaseToUnderscore,
  equals, fadeInOutAnimation,
  filterFalse,
  filterTrue,
  firstNotNilPromise,
  FormErrorTranslatorOptions,
  getPropertyByPath,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNilOrBlank,
  LocalSettingsService,
  toBoolean,
  toNumber,
  UsageMode,
  WaitForOptions,
  waitForTrue
} from '@sumaris-net/ngx-components';
import {AlertController, IonModal} from '@ionic/angular';
import {BatchTreeComponent, IBatchTreeComponent} from '@app/trip/batch/tree/batch-tree.component';
import {Batch} from '@app/trip/batch/common/batch.model';
import {IBatchGroupModalOptions} from '@app/trip/batch/group/batch-group.modal';
import {Program} from '@app/referential/services/model/program.model';
import {TaxonGroupRef} from '@app/referential/services/model/taxon-group.model';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {Subscription} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, map, mergeMap, switchMap} from 'rxjs/operators';
import {environment} from '@environments/environment';
import {ProgramRefService} from '@app/referential/services/program-ref.service';
import {BatchFilter} from '@app/trip/batch/common/batch.filter';
import {AcquisitionLevelCodes} from '@app/referential/services/model/model.enum';
import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import {ProgramProperties} from '@app/referential/services/config/program.config';
import {BatchModel} from '@app/trip/batch/tree/batch-tree.model';
import {MatExpansionPanel} from '@angular/material/expansion';
import {UntypedFormGroup} from '@angular/forms';
import {BatchModelValidatorService} from '@app/trip/batch/tree/batch-model.validator';
import {PmfmNamePipe} from '@app/referential/pipes/pmfms.pipe';
import {PhysicalGear} from '@app/trip/physicalgear/physical-gear.model';
import {PhysicalGearService} from '@app/trip/physicalgear/physicalgear.service';
import {TripContextService} from '@app/trip/services/trip-context.service';
import {BatchUtils} from '@app/trip/batch/common/batch.utils';
import {TreeItemEntityUtils} from '@app/shared/tree-item-entity.utils';
import {RxState} from '@rx-angular/state';
import {BatchModelTreeComponent} from '@app/trip/batch/tree/batch-model-tree.component';
import {MatSidenav} from '@angular/material/sidenav';

interface ComponentState {
  showBatchTables: boolean;
  allowDiscard: boolean;
  allowSamplingBatches: boolean;
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
}

@Component({
  selector: 'app-batch-tree-container',
  templateUrl: './batch-tree-container.component.html',
  styleUrls: ['./batch-tree-container.component.scss'],
  providers: [
    RxState
  ],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchTreeContainerComponent extends AppEditor<Batch>
  implements IBatchTreeComponent {

  private _listenStatusChangesSubscription: Subscription;
  protected logPrefix = '[batch-tree-container] ';
  protected _lastEditingBatchPath: string;
  protected _programAllowMeasure: boolean;
  protected _listenProgramChanges = true;

  protected readonly allowSamplingBatches$ = this.state.select('allowSamplingBatches');
  protected readonly allowSubBatches$ = this.state.select('allowSubBatches');
  protected readonly programLabel$ = this.state.select('programLabel');
  protected readonly program$ = this.state.select('program');
  protected readonly form$ = this.state.select('form');
  protected readonly model$ = this.state.select('model');
  protected readonly editingBatch$ = this.state.select('editingBatch');

  protected get model(): BatchModel {
    return this.state.get('model');
  }

  protected set editingBatch(value: BatchModel) {
    this.state.set('editingBatch', _ => value);
  }

  protected get editingBatch(): BatchModel {
    return this.state.get('editingBatch');
  }

  protected get catchPmfms(): IPmfm[]{
    return this.state.get('catchPmfms');
  }

  protected get sortingPmfms(): IPmfm[]{
    return this.state.get('sortingPmfms');
  }

  protected set data(value: Batch){
    this.state.set('data', (_) => value);
  }

  protected get data(): Batch{
    return this.state.get('data');
  }
  errorTranslatorOptions: FormErrorTranslatorOptions;

  filterPanelFloating = true;
  @ViewChild('batchTree') batchTree: BatchTreeComponent;
  @ViewChild('batchModelTree') batchModelTree!: BatchModelTreeComponent;
  @ViewChild('filterExpansionPanel') filterExpansionPanel: MatExpansionPanel;
  @ViewChild('sidenav') sidenav: MatSidenav;
  @ViewChild('modal') modal!: IonModal;

  @Input() queryTabIndexParamName: string;
  @Input() modalOptions: Partial<IBatchGroupModalOptions>;
  @Input() showCatchForm: boolean;
  @Input() defaultHasSubBatches: boolean;
  @Input() availableTaxonGroups: TaxonGroupRef[];

  // TODO review this code, and remove is unused
  @Input() useModal = false;

  @Input() set allowSamplingBatches(value: boolean) {
    this.state.set('allowSamplingBatches', (_) => value);
  }
  get allowSamplingBatches(): boolean {
    return this.state.get('allowSamplingBatches');
  }

  @Input() set allowSubBatches(value: boolean) {
    this.state.set('allowSubBatches', (_) => value);
  }
  get allowSubBatches(): boolean {
    return this.state.get('allowSubBatches');
  }

  @Input() showTaxonName: boolean;
  @Input() showTaxonGroup: boolean;
  @Input() selectedTabIndex: number;
  @Input() usageMode: UsageMode;
  @Input() i18nPmfmPrefix: string;
  @Input() useSticky = true;
  @Input() mobile: boolean;
  @Input() debug: boolean;
  @Input() filter: BatchFilter;
  @Input() style: 'tabs'|'menu' = 'menu';
  @Input() showToolbar = true;

  @Input()
  set programLabel(value: string) {
    this.state.set('programLabel', (_) => value);
  }

  get programLabel(): string {
    return this.state.get('programLabel') || this.program?.label;
  }

  @Input()
  set program(value: Program) {
    // Disable watchByLabel, when changing programLabel
    // Avoid to watch program changes, when program is given by parent component
    this._listenProgramChanges = false;
    this.state.set('program', (_) => value);
  }

  get program(): Program {
    return this.state.get('program');
  }

  @Input() set gearId(value: number) {
    this.state.set('gearId', (_) => value);
  }

  get gearId(): number {
    return this.state.get('gearId');
  }

  @Input() set physicalGear(value: PhysicalGear) {
    if (this.physicalGear && value?.id !== this.physicalGear.id) {
      // Reset pmfms, to force a reload
      this.resetRootForm();
    }
    // Apply change
    this.state.set({
      physicalGear: value,
      gearId: toNumber(value?.gear?.id, null)
    });
  }

  get physicalGear(): PhysicalGear {
    return this.state.get('physicalGear');
  }

  @Input() set showBatchTables(value: boolean) {
    this.state.set('showBatchTables', (_) => value);
  }

  get showBatchTables(): boolean {
    return this.state.get('showBatchTables') || false;
  }

  @Input() set allowDiscard(value: boolean) {
    this.state.set('allowDiscard', _ => value);
  }

  get allowDiscard(): boolean {
    return this.state.get('allowDiscard');
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
    return this.loadingSubject.value;
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
    return this.state.get('form');
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


  constructor(injector: Injector,
              route: ActivatedRoute,
              router: Router,
              alertCtrl: AlertController,
              translate: TranslateService,
              protected programRefService: ProgramRefService,
              protected batchModelValidatorService: BatchModelValidatorService,
              protected pmfmNamePipe: PmfmNamePipe,
              protected physicalGearService: PhysicalGearService,
              protected tripContext: TripContextService,
              protected state: RxState<ComponentState>,
              protected cd: ChangeDetectorRef) {
    super(route, router, alertCtrl, translate);

    // Defaults
    this.mobile = injector.get(LocalSettingsService).mobile;
    this.i18nContext = {
      prefix: '',
      suffix: ''
    };
    this.errorTranslatorOptions = {separator: '<br/>', controlPathTranslator: this};

    // Watch program, to configure tables from program properties
    this.state.connect('program', this.programLabel$
      .pipe(
        filter(() => this._listenProgramChanges), // Avoid to watch program, if was already set
        filter(isNotNilOrBlank),
        distinctUntilChanged(),
        switchMap(programLabel => this.programRefService.watchByLabel(programLabel))
      ));

    this.state.hold(filterTrue(this.readySubject)
        .pipe(
          switchMap(() => this.state.select(['program', 'gearId'], s => s)),
          debounceTime(100),
          distinctUntilChanged(equals)
        ),
      async ({program, gearId}) => {
        await this.setProgram(program);
        await this.loadPmfms(program, gearId);
      });

    this.state.connect('model',
      this.state.select(['data', 'physicalGear', 'allowDiscard', 'catchPmfms', 'sortingPmfms'], s => s)
        .pipe(
          filter(({data, physicalGear, allowDiscard, sortingPmfms, catchPmfms}) => sortingPmfms && catchPmfms && physicalGear && true),
          mergeMap(async ({data, physicalGear, allowDiscard, sortingPmfms, catchPmfms}) => {
            // Load physical gear's children (if not already done)
            if (physicalGear && isEmptyArray(physicalGear.children)) {
              const tripId = this.tripContext.trip?.id;
              physicalGear.children = await this.physicalGearService.loadAllByParentId({tripId, parentGearId: physicalGear.id});
            }

            // Create the model
            return this.batchModelValidatorService.createModel(data, {allowDiscard, sortingPmfms, catchPmfms, physicalGear})
          })
        )
    );

    this.state.connect('form', this.state.select(['model', 'allowSamplingBatches'], s => s)
      .pipe(
        filter(({model, allowSamplingBatches}) => !!model),
        map(({model, allowSamplingBatches}) => {
          const form = this.batchModelValidatorService.createFormGroupByModel(model, {allowSamplingBatches});
          form.disable();
          return form;
        })
      )
    );

    // Reload data, when form (or model) changed
    this.state.hold(this.form$
      .pipe(
        filter(() => !this.loading)
      ),
      (_) => this.updateView(this.data, {markAsPristine: false /*keep dirty state*/}));

    this.state.hold(filterTrue(this.readySubject)
        .pipe(
          switchMap(() => this.batchTree.dirtySubject),
          filter(dirty => dirty === true && this.enabled && this.loaded)
        ),
      () => this.markAsDirty()
    );

    // If now allowed sampling batches: remove it from data
    this.state.hold(filterFalse(this.allowSamplingBatches$), () => this.resetSamplingBatches())

    // DEBUG
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    this.showCatchForm = toBoolean(this.showCatchForm, true);
    this.showBatchTables = toBoolean(this.state.get('showBatchTables'), true);
    this._programAllowMeasure = toBoolean(this._programAllowMeasure, this.state.get('showBatchTables'));
    this.allowSubBatches = toBoolean(this.allowSubBatches, this._programAllowMeasure);
    this.allowSamplingBatches = toBoolean(this.allowSamplingBatches, this._programAllowMeasure);
    this.allowDiscard = toBoolean(this.allowDiscard, true);


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




   markAllAsTouched(opts?: { emitEvent?: boolean }) {
    this.form?.markAllAsTouched();
    super.markAllAsTouched(opts);
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this.form?.markAsPristine(opts);
    super.markAsPristine(opts);
  }

  async autoFill(opts?: { skipIfDisabled: boolean; skipIfNotEmpty: boolean; }): Promise<void> {
    await this.ready();

    console.warn(this.logPrefix + 'autoFill() not implemented yet!');
  }

  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  async openFilterPanel(event?: Event, opts?: {expandAll?: boolean}) {
    if (event?.defaultPrevented) return; // Cancelled

    // First, expand model tree
    if (!opts || opts.expandAll !== false) {
      this.batchModelTree.expandAll();
    }

    if (this.filterExpansionPanel) this.filterExpansionPanel.open();
    if (this.sidenav) await this.sidenav.open();

    this.markForCheck();
  }

  closeFilterPanel() {
    this.filterExpansionPanel?.close();
    this.sidenav?.close();
    this.filterPanelFloating = true;
    this.markForCheck();
  }

  toggleFilterPanel() {
    this.filterExpansionPanel?.toggle();
    this.sidenav?.toggle();
    this.filterPanelFloating = true;
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

    this.data = data;

    // Mark as loading
    if (!opts || opts.emitEvent !== false) this.markAsLoading();

    try {
      // Wait component is ready
      await this.ready();

      // Update the view
      if (data === this.data) {
        await this.updateView(data);

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
      console.debug(this.logPrefix + `Saving tree...`);

      if (this.dirty && this.loaded) {
        // Save editing batch
        const confirmed = await this.confirmEditingBatch({keepEditingBatch: true, ...opts});
        if (!confirmed) return false; // Not confirmed = cannot save

        // Get value (using getRawValue(), because some controls are disabled)
        const json = this.form.getRawValue();

        // Update data
        this.data = this.data || new Batch();
        this.data.fromObject(json, {withChildren: true});

        console.debug(this.logPrefix + `Saving tree [OK] in ${Date.now()-now}ms`, this.data);
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
      await waitForTrue(this.state.select(['form', 'model'], _ => true), opts);
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


  protected async setProgram(program: Program) {
    if (this.debug) console.debug(this.logPrefix + `Program ${program.label} loaded, with properties: `, program.properties);

    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nContext.suffix = i18nSuffix;

    this._programAllowMeasure = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ENABLE);
    this.allowSamplingBatches = this.allowSamplingBatches;
    this.allowSubBatches = this.allowSubBatches;
    this.showTaxonGroup = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_GROUP_ENABLE);
    this.showTaxonName = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_NAME_ENABLE);
    this.markForCheck();
  }

  protected async loadPmfms(program: Program, gearId: number) {
    if (!program || isNil(gearId)) return; // Skip

    console.info(this.logPrefix + 'Loading pmfms...');

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
      this.state.set((state) => {
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

  protected async updateView(data: Batch, opts?: {markAsPristine?: boolean}) {
    const model = this.model; // await firstNotNilPromise(this.model$, {stop: this.destroySubject});
    if (!model) return; // Skip if missing model, or if data changed

    // Init tree datasource
    this.batchModelTree.data = [model];

    // Keep the editing batch
    const editingBatch = this._lastEditingBatchPath && model.get(this._lastEditingBatchPath);
    if (editingBatch) {
      await this.startEditBatch(null, editingBatch);
    }
    else {
      // Stop editing batch (not found)
      await this.stopEditBatch();

      // Open filter panel
      await this.openFilterPanel();
    }

    if (!opts || opts.markAsPristine !== false) {
      this.markAsPristine();
    }
  }

  protected async startEditBatch(event: Event|undefined, source: BatchModel) {
    if (!source || !(source instanceof BatchModel)) throw new Error('Missing required \'source\' argument');

    event?.stopImmediatePropagation();

    if (this.editingBatch === source) {
      if (this.filterPanelFloating) this.closeFilterPanel();
      this.modal?.present();
      return; // Skip
    }


    this._listenStatusChangesSubscription?.unsubscribe();

    // Save current state
    await this.ready();
    const dirty = this.dirty;
    const touched = this.touched;

    try {
      // Save previous changes
      if (this.editingBatch?.editing) {
        const confirmed = await this.confirmEditingBatch({keepEditingBatch: true});
        if (!confirmed) return; // Not confirmed = Cannot change
      }

      console.info(this.logPrefix + `Start editing '${source?.name}'...`);

      if (this.filterPanelFloating) this.closeFilterPanel();
      this.editingBatch = source;
      this.editingBatch.editing = true;

      if (this.modal && !this.modal.isOpen) {
        if (!this.batchTree) {
          await this.modal.present();
          this.cd.detectChanges(); //markForCheck();
        }
        else {
          this.modal.present();
        }
      }


      // Remember last editing batch, to be able to restore it later (e.g. see setValue())
      this._lastEditingBatchPath = source.path;

      // Configure batch tree
      this.batchTree.gearId = this.gearId;
      this.batchTree.physicalGear = this.physicalGear;
      this.batchTree.i18nContext = this.i18nContext;
      this.batchTree.setSubBatchesModalOption('programLabel', this.programLabel);
      this.batchTree.showCatchForm = this.showCatchForm && source.pmfms && isNotEmptyArray(PmfmUtils.filterPmfms(source.pmfms, { excludeHidden: true }));
      this.batchTree.showBatchTables = this.showBatchTables && source.childrenPmfms && isNotEmptyArray(PmfmUtils.filterPmfms(source.childrenPmfms, { excludeHidden: true }));
      this.batchTree.allowSamplingBatches = this.allowSamplingBatches;
      this.batchTree.allowSubBatches = this.allowSubBatches;
      this.batchTree.batchGroupsTable.showTaxonGroupColumn = this.showTaxonGroup;
      this.batchTree.batchGroupsTable.showTaxonNameColumn = this.showTaxonName;

      // Pass PMFMS to batch tree sub-components (to avoid a pmfm reloading)
      await this.batchTree.setProgram(this.program, { emitEvent: false /*avoid pmfms reload*/ });

      this.batchTree.rootAcquisitionLevel = !source.parent ? AcquisitionLevelCodes.CATCH_BATCH : AcquisitionLevelCodes.SORTING_BATCH;
      this.batchTree.catchBatchForm.acquisitionLevel = this.batchTree.rootAcquisitionLevel;
      this.batchTree.catchBatchForm.pmfms = source.pmfms;
      this.batchTree.batchGroupsTable.pmfms = source.childrenPmfms || [];

      this.batchTree.markAsReady();
      const jobs: Promise<void>[] = [this.batchTree.catchBatchForm.ready(), this.batchTree.batchGroupsTable.ready()];

      if (this.batchTree.subBatchesTable) {
        // TODO: pass sub pmfms
        this.batchTree.subBatchesTable.programLabel = this.programLabel;
        jobs.push(this.batchTree.subBatchesTable.ready())
      }

      // Apply value (after clone(), to keep pmfms unchanged)
      // const target = Batch.fromObject(source.originalData.asObject({ withChildren: true }));
      // target.parent = source.parent;

      const batch = Batch.fromObject(source.currentData, {withChildren: source.isLeaf});

      await Promise.all(jobs);
      await this.batchTree.setValue(batch);

      // Listen row status, when editing a row
      const subscription = this.batchTree.statusChanges
        .pipe(
          filter(status => source === this.editingBatch && status !== 'PENDING')
        )
        .subscribe(status => {
          if (this.debug) console.debug(this.logPrefix + 'batchTree status changes: ', status);
          this.editingBatch.valid = (status === 'VALID');
          this.markForCheck();
        });
      this.registerSubscription(subscription);
      subscription.add(() => {
        this.unregisterSubscription(subscription);
        if (this._listenStatusChangesSubscription === subscription) this._listenStatusChangesSubscription = null;
      })
    }
    finally {
      // Restore previous state
      if (dirty) this.markAsDirty();
      if (touched) this.markAllAsTouched();
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
    this.state.set({
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
    if (!model) return true; // Already saved

    // Save current state
    const dirty = this.dirty;

    // Save if need
    if (this.batchTree.dirty) {
      console.info(this.logPrefix + `Saving ${model.originalData.label} ...`);
      const saved = await this.batchTree.save();
      if (!saved) {
        model.valid = this.batchTree.valid;
        return false;
      }
    }

    // Get saved data
    const savedBatch = this.batchTree.value;

    if (savedBatch.label !== model.originalData.label)
      throw new Error(`Invalid saved batch label. Expected: ${model.originalData.label} Actual: ${savedBatch.label}`);

    // Stop listening editing row
    this._listenStatusChangesSubscription?.unsubscribe();

    // Update model value (batch first)
    const json = savedBatch.asObject({
      // If not leaf, avoid to override children, in the next patchValue()
      withChildren: model.isLeaf
    });

    // Update model's data
    model.validator.patchValue(json);

    // Update the model state
    model.valid = model.validator.valid;

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

  protected hasChildrenBatchModel(node: BatchModel|Batch) {
    return node.children && node.children.some(c => c instanceof BatchModel);
  }

  protected getBatchModelByPath(path: string): BatchModel|undefined {
    return getPropertyByPath(this.model, path) as BatchModel|undefined;
  }

  forward(event?: Event, model?: BatchModel) {
    console.debug(this.logPrefix + 'Go foward');
    event?.stopImmediatePropagation();

    model = model || this.editingBatch;
    if (!model) return;

    const nextVisible = TreeItemEntityUtils.forward(model, c => !c.hidden);
    if (nextVisible) {
      this.startEditBatch(null, nextVisible);
    }
  }

  backward(event?: Event, model?: BatchModel) {
    console.debug(this.logPrefix + 'Go backward');
    event?.stopImmediatePropagation();

    model = model || this.editingBatch;
    if (!model) return;

    const previousVisible = TreeItemEntityUtils.backward(model, c => !c.hidden);
    if (previousVisible) {
      this.startEditBatch(null, previousVisible);
    }
  }
}
