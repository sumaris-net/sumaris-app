import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import {
  AppEditor,
  arrayDistinct,
  changeCaseToUnderscore,
  equals,
  firstNotNil,
  FormArrayHelper,
  FormErrorTranslatorOptions,
  getPropertyByPath, isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNilOrBlank,
  LocalSettingsService,
  ReferentialRef,
  sleep,
  toBoolean,
  UsageMode,
  WaitForOptions
} from '@sumaris-net/ngx-components';
import { AlertController } from '@ionic/angular';
import { BatchTreeComponent, IBatchTreeComponent } from '@app/trip/batch/tree/batch-tree.component';
import { Batch } from '@app/trip/batch/common/batch.model';
import { IBatchGroupModalOptions } from '@app/trip/batch/group/batch-group.modal';
import { Program } from '@app/referential/services/model/program.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { BatchModel } from '@app/trip/batch/tree/batch-tree.model';
import { MatExpansionPanel } from '@angular/material/expansion';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { BatchModelValidatorService } from '@app/trip/batch/tree/batch-model.validator';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { PhysicalGearService } from '@app/trip/physicalgear/physicalgear.service';
import { TripContextService } from '@app/trip/services/trip-context.service';

@Component({
  selector: 'app-batch-tree-container',
  templateUrl: './batch-tree-container.component.html',
  styleUrls: ['./batch-tree-container.component.scss'],
  providers: [
    { provide: BatchModelValidatorService, useClass: BatchModelValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchTreeContainerComponent extends AppEditor<Batch>
  implements IBatchTreeComponent {


  protected logPrefix = '[batch-tree-container] ';

  editingBatch: BatchModel;
  data: Batch = null;
  $gearId = new BehaviorSubject<number>(null);
  $physicalGear = new BehaviorSubject<PhysicalGear>(null);
  $programLabel = new BehaviorSubject<string>(null);
  $program = new BehaviorSubject<Program>(null);
  $sortingPmfms = new BehaviorSubject<IPmfm[]>(null);
  $catchPmfms = new BehaviorSubject<IPmfm[]>(null);
  listenProgramChanges = true;
  errorTranslatorOptions: FormErrorTranslatorOptions;

  treeControl = new NestedTreeControl<BatchModel>(node => node.children);
  treeDataSource = new MatTreeNestedDataSource<BatchModel>();
  filterPanelFloating = true;
  _form: FormGroup;
  _model: BatchModel;
  _showBatchTables: boolean;

  @ViewChild('batchTree') batchTree!: BatchTreeComponent;
  @ViewChild('filterExpansionPanel') filterExpansionPanel!: MatExpansionPanel;

  @Input() queryTabIndexParamName: string;
  @Input() modalOptions: Partial<IBatchGroupModalOptions>;
  @Input() showCatchForm: boolean;
  @Input() defaultHasSubBatches: boolean;
  @Input() availableTaxonGroups: TaxonGroupRef[];
  @Input() allowSamplingBatches: boolean;
  @Input() showTaxonName: boolean;
  @Input() showTaxonGroup: boolean;
  @Input() allowSubBatches: boolean;
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
    if (this.$programLabel.value !== value) {
      this.$programLabel.next(value);
    }
  }

  get programLabel(): string {
    return this.$programLabel.value || this.$program.value?.label;
  }

  @Input()
  set program(value: Program) {
    if (value !== this.$program.value) {
      this.listenProgramChanges = !!value; // Avoid to watch program changes, when program is given by parent component
      this.$program.next(value);
    }
  }

  get program(): Program {
    return this.$program.value;
  }

  @Input() set gearId(value: number) {
    if (value !== this.$gearId.value) {
      this.$gearId.next(value);
    }
  }

  get gearId(): number {
    return this.$gearId.value;
  }

  get touched(): boolean {
    return this._form?.touched || super.touched;
  }

  get invalid(): boolean {
    return !this.valid;
  }

  get valid(): boolean {
    return (!this._model || this._model.valid);
  }

  get loading(): boolean {
    // Should NOT use batchTree loading state, because it is loaded later
    return this.loadingSubject.value;
  }

  get rootNode(): BatchModel {
    return this._model;
  }

  @Input() set physicalGear(value: PhysicalGear) {
    if (value !== this.$physicalGear.value) {
      this.$physicalGear.next(value);
    }
  }

  get physicalGear(): PhysicalGear {
    return this.$physicalGear.value;
  }

  @Input() set showBatchTables(value: boolean) {
    if (this._showBatchTables !== value) {
      this._showBatchTables = value;
    }
  }

  get showBatchTables(): boolean {
    return this._showBatchTables && this.batchTree?.showBatchTables || false;
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

  get form(): FormGroup {
    return this._form;
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
              protected cd: ChangeDetectorRef) {
    super(route, router, alertCtrl, translate);

    // Defaults
    this.mobile = injector.get(LocalSettingsService).mobile;
    this.i18nContext = {
      prefix: '',
      suffix: ''
    };
    this.errorTranslatorOptions = {separator: '<br/>', controlPathTranslator: this};

    // DEBUG
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    this.showCatchForm = toBoolean(this.showCatchForm, true);
    this._showBatchTables = toBoolean(this._showBatchTables, true);
    this.allowSubBatches = toBoolean(this.allowSubBatches, this._showBatchTables);

    // Watch program, to configure tables from program properties
    this.registerSubscription(
      this.$programLabel
        .pipe(
          filter(() => this.listenProgramChanges), // Avoid to watch program, if was already set
          filter(isNotNilOrBlank),
          distinctUntilChanged(),
          switchMap(programLabel => this.programRefService.watchByLabel(programLabel))
        )
        .subscribe(program => this.$program.next(program))
    );

    this.registerSubscription(
      this.readySubject
        .pipe(
          filter(ready => ready === true),
          // DEBUG
          //tap(key => console.debug(this.logPrefix + 'Starting pmfm key computation')),

          switchMap(() => combineLatest(
              this.$program,
              this.$gearId,
              this.$physicalGear
            )
          ),
          debounceTime(100),
          filter(values => !values.some(isNil)),
          distinctUntilChanged(equals),
          // DEBUG
          //tap(values => console.debug(this.logPrefix + 'Need to reload pmfms: ', values))
        )
        .subscribe(async ([program, gearId, physicalGear]) => {
          await this.setProgram(program);
          await this.loadPmfms(program, gearId, physicalGear);
          // Reload form
          if (!this.loading) {
            this._model = null;
            await this.createForm();
          }
        })
    );

    this.ready()
      .then(() => {
        this.registerSubscription(
          this.batchTree.dirtySubject
            .pipe(
              filter(dirty => dirty === true && this.enabled),
              tap(_ => this.markAsDirty())
            )
            .subscribe()
        )
      })

  }

  protected async setProgram(program: Program) {
    if (this.debug) console.debug(this.logPrefix + `Program ${program.label} loaded, with properties: `, program.properties);

    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nContext.suffix = i18nSuffix;

    const hasBatchMeasure = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ENABLE);
    this.allowSamplingBatches = hasBatchMeasure;
    this.allowSubBatches = hasBatchMeasure;
    this.showTaxonGroup = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_GROUP_ENABLE);
    this.showTaxonName = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_NAME_ENABLE);
  }

  translateControlPath(path: string): string {
    if (path.startsWith('measurementValues.')) {
      const parts = path.split('.');
      const pmfmId = parseInt(parts[parts.length-1]);
      const pmfm = (this.$catchPmfms.value || []).find(p => p.id === pmfmId)
        || (this.$sortingPmfms.value || []).find(p => p.id === pmfmId);
      if (pmfm) return this.pmfmNamePipe.transform(pmfm, {i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nContext?.suffix});
    }
    else if (path.includes('.measurementValues.')) {
      const parts = path.split('.');
      const pmfmId = parseInt(parts[parts.length-1]);
      const pmfm = (this.$sortingPmfms.value || []).find(p => p.id === pmfmId);
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
        const nodeForm = this._form.get(nodePath);
        nodeName = nodeForm?.value?.label;
      }
      const i18nKey = (this.batchTree.i18nContext.prefix || 'TRIP.BATCH.EDIT.') + changeCaseToUnderscore(fieldName).toUpperCase();
      return `${nodeName || path} > ${this.translate.instant(i18nKey)}`;
    }
    return path;
  }

  protected computePmfmsKey(): string {
    const program = this.program;
    const gearId = this.gearId;
    if (!program || isNil(gearId)) return; // Skip

    return [program.label, gearId].join('|');
  }

  protected async loadPmfms(program: Program, gearId: number, physicalGear: PhysicalGear) {
    if (!program || isNil(gearId) || isNil(physicalGear)) return; // Skip

    console.info(this.logPrefix + 'Loading pmfms...');

    // Remember component state
    const enabled = this.enabled;
    const touched = this.touched;
    const dirty = this.dirty;

    try {
      // Save data if dirty and enabled (do not save when disabled, e.g. when reload)
      if (dirty && enabled) {
        console.info('[selectivity-operation] Save batches... (before to reset tabs)')
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

      // Fill CHILD_GEAR pmfms
      const childGearPmfmIndex = sortingPmfms
        .findIndex(p => p.id === PmfmIds.CHILD_GEAR);
      if (childGearPmfmIndex !== -1) {

        // Load physical gear's children
        let subGears = physicalGear.children;
        if (isEmptyArray(subGears)) {
          const tripId = this.tripContext.trip?.id;
          subGears = await this.physicalGearService.loadAllByParentId({tripId, parentGearId: physicalGear.id});
        }

        // Convert to referential item
        const items = (subGears || []).map(pg => ReferentialRef.fromObject({
          id: pg.rankOrder,
          label: pg.rankOrder,
          name: pg.measurementValues[PmfmIds.GEAR_LABEL] || pg.gear.name
        }));

        // DEBUG
        console.debug(`[batch-tree-container] Fill CHILD_GEAR PMFM, with items:`, items);

        sortingPmfms[childGearPmfmIndex] = sortingPmfms[childGearPmfmIndex].clone();
        sortingPmfms[childGearPmfmIndex].qualitativeValues = items;
      }

      this.$catchPmfms.next(catchPmfms);
      this.$sortingPmfms.next(sortingPmfms);

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

  private _listenStatusChangesSubscription: Subscription;

  async startEditBatch(event: UIEvent, source: BatchModel) {

    event?.stopImmediatePropagation();

    if (this.editingBatch === source) {
      if (this.filterPanelFloating) this.closeFilterPanel();
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
        const confirmed = await this.confirmEditingBatch();
        if (!confirmed) return; // Not confirmed = Cannot change
      }

      console.info(this.logPrefix + `Start editing '${source?.name}'...`);

      if (this.filterPanelFloating) this.closeFilterPanel();
      this.editingBatch = source;
      this.editingBatch.editing = true;
      this.markForCheck();

      if (!this.batchTree.loading) {
        console.warn(this.logPrefix + 'Unload batch tree...');
        //await this.batchTree.unload();
      }

      // Configure batch tree
      this.batchTree.gearId = this.gearId;
      this.batchTree.physicalGear = this.physicalGear;
      this.batchTree.i18nContext = this.i18nContext;
      this.batchTree.setSubBatchesModalOption('programLabel', this.programLabel);
      this.batchTree.showCatchForm = this.showCatchForm && source.pmfms && isNotEmptyArray(PmfmUtils.filterPmfms(source.pmfms, { excludeHidden: true }));
      this.batchTree.showBatchTables = this._showBatchTables && source.childrenPmfms && isNotEmptyArray(PmfmUtils.filterPmfms(source.childrenPmfms, { excludeHidden: true }));
      this.batchTree.allowSubBatches = this.allowSubBatches && this.batchTree.showBatchTables;
      this.batchTree.batchGroupsTable.showTaxonGroupColumn = this.showTaxonGroup;
      this.batchTree.batchGroupsTable.showTaxonNameColumn = this.showTaxonName;

      // Pass PMFMS to batch tree sub-components (to avoid a pmfm reloading)
      await this.batchTree.setProgram(this.program, { emitEvent: false /*avoid pmfms reload*/ });
      this.batchTree.rootAcquisitionLevel = !source.parent ? AcquisitionLevelCodes.CATCH_BATCH : AcquisitionLevelCodes.SORTING_BATCH;
      this.batchTree.catchBatchForm.acquisitionLevel = this.batchTree.rootAcquisitionLevel;
      this.batchTree.catchBatchForm.pmfms = source.pmfms;
      this.batchTree.batchGroupsTable.pmfms = source.childrenPmfms || [];

      this.batchTree.markAsReady();
      await this.batchTree.catchBatchForm.ready();
      await this.batchTree.batchGroupsTable.ready();

      if (this.batchTree.subBatchesTable) {
        // TODO: pass sub pmfms
        this.batchTree.subBatchesTable.programLabel = this.programLabel;
        await this.batchTree.subBatchesTable.ready();
      }

      // Apply value (after clone(), to keep pmfms unchanged)
      // const target = Batch.fromObject(source.originalData.asObject({ withChildren: true }));
      // target.parent = source.parent;

      await sleep(100);

      const batch = Batch.fromObject(source.currentData, {withChildren: source.isLeaf});
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

  async createModel(data?: Batch): Promise<BatchModel> {
    data = data || this.data;

    // Reset the editing batch
    this.editingBatch = null;

    const [catchPmfms, sortingPmfms] = await Promise.all([
      firstNotNil(this.$catchPmfms, {stop: this.destroySubject}).toPromise(),
      firstNotNil(this.$sortingPmfms, {stop: this.destroySubject}).toPromise()
    ]);

    // Create a batch model
    const model = BatchModel.fromBatch(data, sortingPmfms);
    if (!model) return;

    // Add catch batches pmfms
    model.pmfms = arrayDistinct([
      ...catchPmfms,
      ...(model.pmfms || [])
    ], 'id');

    if (this.debug) this.logBatchModel(model);

    // Set default catch batch name
    if (!model.parent && !model.name)  {
      model.name = this.translate.instant('TRIP.BATCH.EDIT.CATCH_BATCH');
    }

    return model;
  }

  hasChild = (_: number, model: BatchModel) => !model.isLeaf;

  async createForm(model?: BatchModel, level = 0): Promise<FormGroup> {

    const isCatchBatch = level === 0;
    if (isCatchBatch && this.debug) console.debug(this.logPrefix + 'Creating batch model validator...', model);

    // get or create model
    if (!model && isCatchBatch) model = await this.createModel(this.data);

    const form = this.batchModelValidatorService.getFormGroup(model.originalData, {
      pmfms: model.pmfms,
      withMeasurements: true,
      withMeasurementTypename: true,
      withChildren: model.isLeaf,
      childrenPmfms: model.isLeaf && model.childrenPmfms
    });

    // Update model valid marker (check this BEFORE to add the children form array)
    model.valid = form.valid;

    if (!model.isLeaf) {
      // Recursive call, on each children model
      const childrenFormGroups: FormGroup[] = await Promise.all((model.children || [])
        .map(c => this.createForm(c, level+1)));
      const childrenFormArray = new FormArray(childrenFormGroups);
      if (form.contains('children')) form.setControl('children', childrenFormArray)
      else form.addControl('children', childrenFormArray);
    }

    model.validator = form;

    if (isCatchBatch) {

      form.disable();

      // Remember the root form
      this._form = form;
      this._model = model;

      // Init model tree
      this.treeDataSource.data = [model];

      // Open the panel
      this.openFilterPanel();

      // Final log
      if (this.debug) console.debug(this.logPrefix + 'Batch model validator created');
    }

    return model.validator;
  }

  markAllAsTouched(opts?: { emitEvent?: boolean }) {
    this._form?.markAllAsTouched();
    super.markAllAsTouched(opts);
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this._form?.markAsPristine(opts);
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

  openFilterPanel(event?: UIEvent, opts?: {expandAll?: boolean}) {
    if (event?.defaultPrevented) return; // Cancelled

    // First, expand model tree
    if (!opts || opts.expandAll !== false) {
      this.expandDescendants();
    }

    this.filterExpansionPanel?.open();

  }

  closeFilterPanel() {
    this.filterExpansionPanel?.close();
    this.filterPanelFloating = true;
    this.markForCheck();
  }

  addRow(event: UIEvent) {
    if (this.editingBatch?.isLeaf) {
      this.batchTree.addRow(event);
    }
  }

  unload(opts?: { emitEvent?: boolean; }): Promise<void> {
      throw new Error('Method not implemented.');
  }

  getFirstInvalidTabIndex(): number {
    return 0;
  }

  async setValue(data: Batch, opts?: {emitEvent?: boolean;}) {
    const isNewData = isNil(data?.id);
    data = data || Batch.fromObject({
      rankOrder: 1,
      label: AcquisitionLevelCodes.CATCH_BATCH
    });

    this.data = data;

    this.markAsLoading();

    try {
      await this.ready();

      // Data not changed (e.g. during ready())
      if (data === this.data) {
        if (isNewData) {
          // Reset form and model
          this._form = null;
          this._model = null;
        } else {
          // Create form, from model
          this._form = await this.createForm();
          this.markAsPristine();
        }
      }
    }
    catch (err) {
      console.error(err && err.message || err);
      throw err;
    }
    finally {
      this.markAsLoaded();
    }
  }

  getValue(): Batch {
    return this.data;
  }

  async save(event?: Event): Promise<boolean> {

    try {
      console.info(this.logPrefix + `Saving...`);

      if (this.dirty) {
        // Save editing batch
        const confirmed = await this.confirmEditingBatch();
        if (!confirmed) return false; // Not confirmed = cannot save

        // Get data
        const target = this.data || new Batch();

        const source = this._form.getRawValue();
        target.fromObject(source, {withChildren: true});

        this.data = target;
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
    return super.ready(opts);
  }

  // Unused
  load(id?: number, options?: any): Promise<any> {
    return Promise.resolve(undefined);
  }

  // Unused
  reload() {
    return Promise.resolve(undefined);
  }

  /* -- protected function -- */

  /**
   * Save editing batch
   */
  protected async confirmEditingBatch(): Promise<boolean> {
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

    // Update model
    model.validator.patchValue({
      ...savedBatch.asObject({withChildren: false})
    });
    if (model.isLeaf) {
      const childrenForm = model.validator.get('children') as FormArray;
      if (FormArrayHelper.hasHelper(childrenForm)) {
        childrenForm._helper.patchValue(savedBatch.children);
      }
      else {
        //throw new Error(`Missing FormArrayHelper for children batches, at ${model.path}`);
        const childrenForms = (savedBatch.children || []).map(c => c.asObject({withChildren: true}))
            .map(json => new FormControl(json))
        if (model.validator.contains('children'))
          model.validator.setControl('children', new FormArray(childrenForms))
        else
          model.validator.addControl('children', new FormArray(childrenForms));
      }
    }

    model.valid = model.validator.valid;

    this.editingBatch = null;
    model.editing = false;

    // Reset dirty state
    this.batchTree.markAsPristine();

    // Restore state
    if (dirty) this.markAsDirty();

    return true;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected logBatchModel(batch: BatchModel, treeDepth = 0, treeIndent = '', result: string[] = []) {
    const isCatchBatch = treeDepth === 0;
    // Append current batch to result array
    const pmfmLabelsStr = (batch.pmfms || []).map(p => p.label).join(', ');
    result.push(`${treeIndent} - ${batch.name}`
    + (isNotNilOrBlank(pmfmLabelsStr) ? ': ' : '') + pmfmLabelsStr);

    // Recursive call, for each children
    if (isNotEmptyArray(batch.children)) {
      treeDepth++;
      treeIndent = `${treeIndent}\t`;
      batch.children.forEach(child => this.logBatchModel(child as BatchModel, treeDepth, treeIndent, result));
    }

    // Display result, if root
    if (isCatchBatch && isNotEmptyArray(result)) {
      console.debug(`[selectivity-operation] Batch model: ${result.join('\n')}`);
    }
  }

  protected expandDescendants(model?: BatchModel) {
    model = model || this._model;
    if (!model) return; // Skip
    if (model instanceof BatchModel) {
      this.treeControl.expand(model);
      (model.children || [])
        .filter(node => this.hasChildrenBatchModel(node))
        .forEach(node => this.expandDescendants(node));
    }
  }

  protected hasChildrenBatchModel(node: BatchModel|Batch) {
    return node.children && node.children.some(c => c instanceof BatchModel);
  }

  protected getBatchModelByPath(path: string): BatchModel|undefined {
    const catchBatch = this.treeDataSource.data?.[0];
    return getPropertyByPath(catchBatch, path) as BatchModel|undefined;
  }

  forward(event?: UIEvent, model?: BatchModel) {
    console.debug(this.logPrefix + 'Go foward');
    event?.stopImmediatePropagation();

    model = model || this.editingBatch;
    if (!model) return;

    const next = model.next;
    if (next) {
      this.startEditBatch(null, next);
    }
  }

  backward(event?: UIEvent, model?: BatchModel) {
    console.debug(this.logPrefix + 'Go backward');
    event?.stopImmediatePropagation();

    model = model || this.editingBatch;
    if (!model) return;

    const previous = model.previous;
    if (previous) {
      this.startEditBatch(null, previous);
    }
  }

  isWeightPmfm = PmfmUtils.isWeight;
}
