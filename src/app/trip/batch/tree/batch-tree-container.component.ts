import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild} from '@angular/core';
import {AppEditor, firstNotNil, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, toBoolean, UsageMode, WaitForOptions} from '@sumaris-net/ngx-components';
import {AlertController} from '@ionic/angular';
import {BatchTreeComponent, IBatchTreeComponent} from '@app/trip/batch/tree/batch-tree.component';
import {Batch} from '@app/trip/batch/common/batch.model';
import {IBatchGroupModalOptions} from '@app/trip/batch/group/batch-group.modal';
import {Program} from '@app/referential/services/model/program.model';
import {TaxonGroupRef} from '@app/referential/services/model/taxon-group.model';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {BehaviorSubject, merge} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, map, switchMap, tap} from 'rxjs/operators';
import {environment} from '@environments/environment';
import {ProgramRefService} from '@app/referential/services/program-ref.service';
import {BatchFilter} from '@app/trip/batch/common/batch.filter';
import {AcquisitionLevelCodes} from '@app/referential/services/model/model.enum';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeNestedDataSource} from '@angular/material/tree';
import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import {ProgramProperties} from '@app/referential/services/config/program.config';
import {BatchModel} from '@app/trip/batch/tree/batch-tree.model';
import {MatExpansionPanel} from '@angular/material/expansion';
import {FormArray, FormGroup} from '@angular/forms';
import {BatchModelValidatorService} from '@app/trip/batch/tree/batch-model.validator';

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

  private _touched: boolean;
  private _logPrefix = '[batch-tree-container] ';

  protected editingBatch: BatchModel;
  data: Batch = null;
  $gearId = new BehaviorSubject<number>(null);
  $physicalGearId = new BehaviorSubject<number>(null);
  $programLabel = new BehaviorSubject<string>(null);
  $program = new BehaviorSubject<Program>(null);
  $sortingPmfms = new BehaviorSubject<IPmfm[]>(null);
  $catchPmfms = new BehaviorSubject<IPmfm[]>(null);
  listenProgramChanges = true;

  treeControl = new NestedTreeControl<Batch>(node => node.children);
  treeDataSource = new MatTreeNestedDataSource<Batch>();
  filterPanelFloating = false; // TODO true;

  filterForm: FormGroup;

  @ViewChild('batchTree') batchTree!: BatchTreeComponent;
  @ViewChild('filterExpansionPanel') filterExpansionPanel!: MatExpansionPanel;

  @Input() queryTabIndexParamName: string;
  @Input() modalOptions: Partial<IBatchGroupModalOptions>;
  @Input() showCatchForm: boolean;
  @Input() showBatchTables: boolean;
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

  @Input()
  set programLabel(value: string) {
    if (this.$programLabel.value !== value) {
      this.$programLabel.next(value);
    }
  }

  get programLabel(): string {
    return this.$programLabel.value;
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
    return this._touched;
  }

  get invalid(): boolean {
    return !this.editingBatch || this.batchTree.invalid;
  }

  @Input() set physicalGearId(value: number) {
    if (value !== this.$physicalGearId.value) {
      this.$physicalGearId.next(value);
    }
  }

  get physicalGearId(): number {
    return this.$physicalGearId.value;
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

  get loading(): boolean {
    //return !(this.batchTree?.length) || this.loadingSubject.value || this.childTrees.some(c => c.enabled && c.loading) || false;
    return this.batchTree?.loading || this.loadingSubject.value || false;
  }

  markAsLoaded(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {

    super.markAsLoaded(opts);
    // TODO: remove after next ngx-components upgrade
    // if (!opts || opts.onlySelf !== true) {
    //   this.childTrees.forEach(c => c.markAsLoaded(opts));
    // }
    // if (!opts || opts.emitEvent !== false) this.markForCheck();
  }

  markAsLoading(opts?: {onlySelf?: boolean; emitEvent?: boolean;}){
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);
      if (!opts || opts.emitEvent !== false) this.markForCheck();
    }
  }

  constructor(injector: Injector,
              route: ActivatedRoute,
              router: Router,
              alertCtrl: AlertController,
              translate: TranslateService,
              protected programRefService: ProgramRefService,
              protected validatorService: BatchModelValidatorService,
              protected cd: ChangeDetectorRef) {
    super(route, router, alertCtrl, translate);

    // DEBUG
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    this.showCatchForm = toBoolean(this.showCatchForm, true);
    this.showBatchTables = toBoolean(this.showBatchTables, true);
    this.allowSubBatches = toBoolean(this.allowSubBatches, this.showBatchTables);

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
          switchMap(() => merge(
              this.$program,
              this.$gearId,
              this.$physicalGearId
            )
          ),
          debounceTime(100),
          map(() => this.computePmfmsKey()),
          filter(isNotNil),
          tap(key => console.debug(this._logPrefix + 'computed key for loadPmfms():  ' + key)),
          distinctUntilChanged()
        )
        .subscribe(() => this.loadPmfms())
    );

  }

  protected async setProgram(program: Program) {
    if (this.debug) console.debug(this._logPrefix + `Program ${program.label} loaded, with properties: `, program.properties);

    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nContext.suffix = i18nSuffix;

    const hasBatchMeasure = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ENABLE);
    this.allowSamplingBatches = hasBatchMeasure;
    this.allowSubBatches = hasBatchMeasure;
    this.showTaxonGroup = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_GROUP_ENABLE);
    this.showTaxonName = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_NAME_ENABLE);
  }

  protected computePmfmsKey(): string {
    const program = this.program;
    const gearId = this.gearId;
    if (!program || isNil(gearId)) return; // Skip

    return [program.label, gearId].join('|');
  }

  protected async loadPmfms() {
    const program = this.program;
    const gearId = this.gearId;
    if (!program || isNil(gearId)) return; // Skip

    console.info(this._logPrefix + 'Loading pmfms...');

    // Remember component state
    const enabled = this.enabled;
    const touched = this.touched;
    const dirty = this.dirty;

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

    // Remember existing data, to reapply later (avoid data lost)
    const data = this.value;

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

    this.$catchPmfms.next(catchPmfms);
    this.$sortingPmfms.next(sortingPmfms);

    // if (data) {
    //   await this.loadModel(data);
    // }

    if (enabled) this.enable();
    if (dirty) this.markAsDirty();
    if (touched) this.markAllAsTouched();

  }

  async selectParentBatch(event: UIEvent, source: BatchModel, batchTree?: BatchTreeComponent) {

    batchTree = batchTree || this.batchTree;
    if (!batchTree) throw new Error('Missing batchTree component');

    event?.preventDefault();
    event.stopPropagation();

    if (this.editingBatch === source) {
      this.closeFilterPanel();
      return; // Skip
    }

    await this.ready();
    const dirty = this.dirty;
    const touched = this.touched;

    console.info(this._logPrefix + `Selected parent ${source?.label}`);

    // Save previous changes
    if (this.editingBatch) {
      if (this.enabled && batchTree.dirty) {

        console.info(this._logPrefix + `Saving previous parent ${this.editingBatch?.label}`);
        const saved = await batchTree.save();
        if (!saved) {
          console.warn(this._logPrefix + `Failed to save previous parent !`);
           this.editingBatch.error = batchTree.error;
           this.editingBatch.invalid = true;
           event.preventDefault();
           return; // Cannot save
        }

        const savedBatch = batchTree.value;
        console.debug(this._logPrefix + `Replacing ${this.editingBatch?.label} with ${savedBatch.label}`);
        this.editingBatch.measurementValues = savedBatch.measurementValues;
        if (!isEmptyArray(this.editingBatch.childrenPmfms)) {
          this.editingBatch.children = savedBatch.children;
        }

        this.editingBatch.invalid = batchTree.invalid;
      }
    }

    //if (this.filterPanelFloating)
    this.closeFilterPanel();
    this.editingBatch = source;
    this.markForCheck();

    //await batchTree.unload();

    // Configure batch tree
    batchTree.gearId = this.gearId;
    batchTree.physicalGearId = this.physicalGearId;
    batchTree.showCatchForm = this.showCatchForm && isNotEmptyArray(PmfmUtils.filterPmfms(source.pmfms, {excludeHidden: true}));
    batchTree.showBatchTables = this.showBatchTables && isNotEmptyArray(PmfmUtils.filterPmfms(source.childrenPmfms, {excludeHidden: true}));
    batchTree.allowSubBatches = this.allowSubBatches && batchTree.showBatchTables;
    batchTree.batchGroupsTable.showTaxonGroupColumn = this.showTaxonGroup;
    batchTree.batchGroupsTable.showTaxonNameColumn = this.showTaxonName;

    // Pass PMFMS to batch tree sub-components (to avoid a pmfm reloading)
    await batchTree.setProgram(this.program, {emitEvent: false /*avoid pmfms reload*/});
    batchTree.catchBatchForm.pmfms = source.pmfms;
    batchTree.batchGroupsTable.pmfms = source.childrenPmfms || [];

    batchTree.markAsReady();
    await batchTree.catchBatchForm.ready();
    await batchTree.batchGroupsTable.ready();
    //if (!firstUpdate) await batchTree.batchGroupsTable.waitIdle();

    // Apply value (afert clone(), to keep pmfms unchanged)
    const target = Batch.fromObject(source.asObject({withChildren: true}));
    target.parent = source.parent;
    await batchTree.setValue(target);

    // restore previous state
    if (dirty) this.markAsDirty();
    if (touched) this.markAllAsTouched();
  }

  async loadModel(data?: Batch): Promise<BatchModel> {
    data = data || this.data;

    const [catchPmfms, sortingPmfms] = await Promise.all([
      firstNotNil(this.$catchPmfms, {stop: this.destroySubject}).toPromise(),
      firstNotNil(this.$sortingPmfms, {stop: this.destroySubject}).toPromise()
    ]);
    // Compute batch tree
    const model = BatchModel.fromBatch(data, sortingPmfms);
    if (!model) return;

    // Add catch batches pmfms
    model.pmfms = [
      ...catchPmfms,
      ...model.pmfms
    ];

    this.filterForm = this.createFilterForm(model);
    console.log(this.filterForm);

    if (this.debug) this.logBatchModel(model);

    // Set default catch batch name
    if (!model.name) {
      model.name = 'TRIP.BATCH.EDIT.CATCH_BATCH';
    }

    this.treeDataSource.data = [model];

    // Expand all
    this.expandDescendants(model);
    this.openFilterPanel();

    return model;
  }

  hasChild = (_: number, node: BatchModel) => isNotEmptyArray(node.children) && isEmptyArray(node.childrenPmfms);

  createFilterForm(model: BatchModel, level = 0): FormGroup {
    const isRoot = !level;
    if (isRoot && this.debug) console.debug(this._logPrefix + 'Creating filter form, from batch model...', model);
    const isLeaf = !this.hasChild(undefined, model);

    const form = this.validatorService.getFormGroup(model, {
      pmfms: model.pmfms,
      withMeasurements: true,
      withMeasurementTypename: true,
      withChildren: isLeaf,
      childrenPmfms: model.childrenPmfms
    });

    level = level+1;
    if (!isLeaf && level <= 2) {
      const childrenForms = (model.children || [])
        .filter(c => c instanceof BatchModel)
        .map(c => this.createFilterForm(c as BatchModel), level);
      //let childrenArray = form.get('children') as FormArray;
      //if (!childrenArray) {
        let childrenArray = new FormArray(childrenForms);
        form.setControl('children', childrenArray);
      //}
      //else {
//        childrenArray.length
      //    }
    }
    if (isRoot && this.debug) console.debug(this._logPrefix + 'Filter form created: ', form);

    return form;
  }

  markAllAsTouched(opts?: { emitEvent?: boolean }) {
    this._touched = true;
    super.markAllAsTouched(opts);
  }

  async autoFill(opts?: { skipIfDisabled: boolean; skipIfNotEmpty: boolean; }): Promise<void> {
    await this.ready();

    // this.childTrees.forEach(subTree => {
    //   subTree.autoFill(opts);
    // });
  }


  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  openFilterPanel() {
    this.filterExpansionPanel?.open();
  }

  closeFilterPanel() {
    this.filterExpansionPanel?.close();
    this.filterPanelFloating = true;
    this.markForCheck();
  }

  addRow(event: UIEvent) {
      throw new Error('Method not implemented.');
  }

  unload(opts?: { emitEvent?: boolean; }): Promise<void> {
      throw new Error('Method not implemented.');
  }

  getFirstInvalidTabIndex(): number {
    return 0;
    // return this.childTrees.map(subBatchTree => subBatchTree.invalid ? subBatchTree.getFirstInvalidTabIndex() : undefined)
    //   .find(isNotNil);
  }

  async setValue(data: Batch, opts?: {emitEvent?: boolean;}) {
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
        await this.loadModel(data);
        this.markAsPristine();
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

    console.info(this._logPrefix + `Saving...`);

    // Update data
    const data = this.data || new Batch();
    data.measurementValues = {};
    data.children = [];

    // Save previous changes
    if (this.editingBatch && this.batchTree.dirty) {

      console.info(this._logPrefix + `Saving previous parent ${this.editingBatch?.label}`);
      const saved = await this.batchTree.save();
      if (!saved) {
        console.warn(this._logPrefix + `Failed to save previous parent !`);
        this.editingBatch.error = this.batchTree.error;
        event.preventDefault();
        return false; // Cannot save
      }

      const savedBatch = this.batchTree.value;
      console.debug(this._logPrefix + `Replacing ${this.editingBatch?.label} with ${savedBatch.label}`);
      this.editingBatch.measurementValues = savedBatch.measurementValues;
      if (!isEmptyArray(this.editingBatch.childrenPmfms)) {
        this.editingBatch.children = savedBatch.children;
      }
    }

    this.data = data;

    return true;
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

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected logBatchModel(batch: BatchModel, treeDepth = 0, treeIndent = '', result: string[] = []) {
    const isCatchBatch = treeDepth === 0;
    // Append current batch to result array
    const pmfmLabelsStr = (batch.pmfms || []).map(p => p.label).join(', ');
    result.push(`${treeIndent} - ${batch.name || batch.label}`
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

  protected expandDescendants(node: BatchModel|Batch) {
    if (node instanceof BatchModel) {
      this.treeControl.expand(node);
      (node.children || [])
        .filter(node => this.hasChildrenBatchModel(node))
        .forEach(node => this.expandDescendants(node));
    }
  }

  protected hasChildrenBatchModel(node: BatchModel|Batch) {
    return node.children && node.children.some(c => c instanceof BatchModel);
  }

  isWeightPmfm = PmfmUtils.isWeight;
}
