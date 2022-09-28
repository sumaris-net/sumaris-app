import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { AppEditor, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, toBoolean, UsageMode, WaitForOptions } from '@sumaris-net/ngx-components';
import { AlertController } from '@ionic/angular';
import { BatchTreeComponent, IBatchTreeComponent } from '@app/trip/batch/tree/batch-tree.component';
import { Batch } from '@app/trip/batch/common/batch.model';
import { IBatchGroupModalOptions } from '@app/trip/batch/group/batch-group.modal';
import { Program } from '@app/referential/services/model/program.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { BatchModel } from '@app/trip/batch/tree/batch-tree.model';

@Component({
  selector: 'app-batch-tree-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './batch-tree-container.component.html',
  styleUrls: ['./batch-tree-container.component.scss']
})
export class BatchTreeContainerComponent extends AppEditor<Batch>
  implements IBatchTreeComponent {

  private _touched: boolean;
  private _loadPmfmKey: string;

  protected editingBatch: BatchModel;
  data: Batch = null;
  $gearId = new BehaviorSubject<number>(null);
  $physicalGearId = new BehaviorSubject<number>(null);
  $programLabel = new BehaviorSubject<string>(null);
  $program = new BehaviorSubject<Program>(null);
  listenProgramChanges = true;

  modelTreeControl = new NestedTreeControl<Batch>(node => node.children);
  modelDataSource = new MatTreeNestedDataSource<Batch>();

  //@ViewChildren('childTree') childTrees!: QueryList<BatchTreeComponent>;
  // @ViewChildren('childTree') childTrees!: QueryList<BatchesTable>;
  // @ViewChildren('childTree') childTrees!: QueryList<BatchesTable>;
  @ViewChild('batchTree') batchTree!: BatchTreeComponent;

  @Input() queryTabIndexParamName: string;
  @Input() modalOptions: Partial<IBatchGroupModalOptions>;
  @Input() showCatchForm: boolean;
  @Input() showBatchTables: boolean;
  @Input() defaultHasSubBatches: boolean;
  @Input() availableTaxonGroups: TaxonGroupRef[];
  @Input() allowSamplingBatches: boolean;
  @Input() allowSubBatches: boolean;
  @Input() showTaxonGroup: boolean;
  @Input() selectedTabIndex: number;
  @Input() usageMode: UsageMode;
  @Input() i18nPmfmPrefix: string;
  @Input() useSticky = false;
  @Input() mobile: boolean;
  @Input() debug: boolean;
  @Input() filter: BatchFilter;

  addChildTree(batchTree: IBatchTreeComponent) {
  }

  removeChildTree(batchTree: IBatchTreeComponent) {
  }

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
    return this.getValue();
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
              protected cd: ChangeDetectorRef) {
    super(route, router, alertCtrl, translate);
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
      merge(
        this.$program,
        this.$gearId,
        this.$physicalGearId,
        this.readySubject
      )
      .pipe(
        //mergeMap(() => this.ready()),
        filter(_ => !!this.$program.value && isNotNil(this.$gearId.value)),
        debounceTime(500)
      )
      .subscribe(() => this.loadPmfms())
    );
  }

  protected registerForms() {
    this.addChildForm(this.batchTree);
  }

  protected async setProgram(program: Program) {
    if (this.debug) console.debug(`[batch-tree] Program ${program.label} loaded, with properties: `, program.properties);

    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nContext.suffix = i18nSuffix;

    const hasBatchMeasure = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ENABLE);
    this.allowSamplingBatches = hasBatchMeasure;
    this.allowSubBatches = hasBatchMeasure;
  }

  protected async loadPmfms() {
    const program = this.program;
    const gearId = this.gearId;
    if (!program || isNil(gearId)) return; // Skip

    const loadPmfmKey = [program.label, gearId].join('|');
    if (this._loadPmfmKey === loadPmfmKey) return; // skip if unchanged
    this._loadPmfmKey = loadPmfmKey;
    console.info('[batch-tree-container] Loading pmfms...');

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
    const pmfms = await this.programRefService.loadProgramPmfms(program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
      gearId
    });

    // Compute batch tree
    const model = BatchModel.fromBatch(data, pmfms);
    if (!model) return;


    model.pmfms = [
      ...(await this.programRefService.loadProgramPmfms(program.label, {
        acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH,
        gearId
      })),
      ...model.pmfms
    ];

    if (this.debug) this.logBatchModel(model);

    // Set default catch batch name
    if (model && !model.name) {
      model.name = 'TRIP.BATCH.EDIT.CATCH_BATCH';
    }

    this.modelDataSource.data = [model];

    // Expand all
    this.expandDescendants(model);

    //await this.setParentBatch(null, model);

    // Re apply data, and restore component state
    this.markAsReady();
    if (data) {
      await this.setValue(data);
    }
    if (enabled) this.enable();
    if (dirty) this.markAsDirty();
    if (touched) this.markAllAsTouched();
  }


  async editBatch(event: UIEvent, parent: BatchModel) {

    if (this.editingBatch === parent) return; // Skip

    // Save previous changes
    if (this.editingBatch) {
      if (this.enabled && this.batchTree.dirty) {
        const saved = await this.batchTree.save();
        if (!saved) {
          this.editingBatch.error = this.batchTree.error;
          event.preventDefault();
          return; // Cannot saved
        }

        parent.children = this.batchTree.value?.children;
      }
    }

    console.debug('[batch-tree-container] New parent batch: ', parent);
    this.editingBatch = parent;

    // Configure batch tree
    this.batchTree.gearId = this.gearId;
    this.batchTree.physicalGearId = this.physicalGearId;
    this.batchTree.showCatchForm = this.showCatchForm && isNotEmptyArray(PmfmUtils.filterPmfms(parent.pmfms, {excludeHidden: true}));
    this.batchTree.showBatchTables = this.showBatchTables && isNotEmptyArray(PmfmUtils.filterPmfms(parent.childrenPmfms, {excludeHidden: true}));
    this.batchTree.allowSubBatches = this.allowSubBatches && this.batchTree.showBatchTables;

    // Pass PMFMS to batch tree sub-components (to avoid a pmfm reloading)
    this.batchTree.catchBatchForm.pmfms = parent.pmfms;
    this.batchTree.batchGroupsTable.pmfms = parent.childrenPmfms;

    await this.batchTree.setProgram(this.program, {emitEvent: false /*avoid pmfms reload*/});

    if (this.readySubject.value) {
      this.batchTree.markAsReady();
      this.batchTree.value = parent.clone({withChildren: true});
    }
  }

  hasChild = (_: number, node: BatchModel) => isNotEmptyArray(node.children) && isEmptyArray(node.childrenPmfms);

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

    // No children: stop here AND keep as loading
    //if (!this.childTrees.length) return;

    this.markAsLoading();

    try {

      await this.ready();

      // Data not changed (e.g. during ready())
      if (data === this.data) {
        console.log('TODO set value of child table ?')

        //this.dataSource.data = this.data;
        // await Promise.all(
        //   this.childTrees.map(child => {
        //     const catchBatch = data.clone();
        //
        //     // Filter sorting batches, if need
        //     if (catchBatch.children) {
        //       const filterFn = BatchFilter.fromObject(child.filter)?.asFilterFn();
        //       if (filterFn && catchBatch.children) {
        //         catchBatch.children = catchBatch.children
        //           .filter(filterFn);
        //       }
        //     }
        //
        //     child.value = catchBatch.children;
        //     return child.ready();
        //   })
        // );

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

    // Save each sub tree
    //const results = await Promise.all(this.childTrees.map(child => child.save(options)));
    //const saved = !results.some(res => res === false);
    const saved = await this.batchTree.save();

    // Update data
    const data = this.data || new Batch();
    data.measurementValues = {};
    data.children = [];

    // this.childTrees.forEach(subBatchTree => {
    //   const subData = subBatchTree.value;
    //
    //   // Merge measurements
    //   if (subData.measurementValues) {
    //     data.measurementValues = {
    //       ...data.measurementValues,
    //       ...subData.measurementValues
    //     };
    //   }
    //
    //   // Merge batches
    //   if (isNotEmptyArray(subData.children)) {
    //     data.children = [
    //       ...data.children,
    //       ...subData.children
    //     ];
    //   }
    // });

    this.data = data;

    return saved;
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
      this.modelTreeControl.expand(node);
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
