import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, QueryList, ViewChildren } from '@angular/core';
import {
  AppEditor,
  firstNotNilPromise,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  ReferentialRef,
  toBoolean,
  UsageMode,
  waitFor,
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
import { BehaviorSubject, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { BatchesTable } from '@app/trip/batch/common/batches.table';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { BatchModel, IBatchTreeDefinition } from '@app/trip/batch/tree/batch-tree.model';

@Component({
  selector: 'app-batch-tree-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './batch-tree-container.component.html',
  styleUrls: ['./batch-tree-container.component.scss']
})
export class BatchTreeContainerComponent extends AppEditor<Batch>
  implements IBatchTreeComponent {

  private _touched: boolean;

  data: Batch = null;
  $gearId = new BehaviorSubject<number>(null);
  $physicalGearId = new BehaviorSubject<number>(null);
  $programLabel = new BehaviorSubject<string>(null);
  $program = new BehaviorSubject<Program>(null);
  listenProgramChanges = true;

  modelTreeControl = new NestedTreeControl<Batch>(node => node.children);
  modelDataSource = new MatTreeNestedDataSource<Batch>();

  //@ViewChildren('childTree') childTrees!: QueryList<BatchTreeComponent>;
  @ViewChildren('childTree') childTrees!: QueryList<BatchesTable>;

  @Input() queryTabIndexParamName: string;
  @Input() modalOptions: Partial<IBatchGroupModalOptions>;
  @Input() showCatchForm: boolean;
  @Input() showBatchTables: boolean;
  @Input() defaultHasSubBatches: boolean;
  @Input() availableTaxonGroups: TaxonGroupRef[];
  @Input() allowSamplingBatches: boolean;
  @Input() allowSubBatches: boolean;
  @Input() selectedTabIndex: number;
  @Input() usageMode: UsageMode;
  @Input() mobile: boolean;
  @Input() debug: boolean;
  @Input() filter: BatchFilter;

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
    return !(this.childTrees?.length) || this.loadingSubject.value || this.childTrees.some(c => c.enabled && c.loading) || false;
  }

  markAsLoaded(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {

    super.markAsLoaded(opts);
    // TODO: remove after next ngx-components upgrade
    if (!opts || opts.onlySelf !== true) {
      this.childTrees.forEach(c => c.markAsLoaded(opts));
    }
    if (!opts || opts.emitEvent !== false) this.markForCheck();
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
      .subscribe(() => this.configure())
    );
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

  protected async configure() {
    const program = this.program;
    const gearId = this.gearId;
    if (!program || isNil(gearId)) return; // Skip

    console.info('[batch-tree-container] Configure...');

    // No physical gear selected
    if (isNil(gearId)) {
      // Clean existing tabs
      this.childTrees.forEach(child => this.removeChildForm(child));
      return;
    }

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

    if (this.debug) this.logBatchModel(model);

    this.modelDataSource.data = [model];

    // TODO: optimize: avoid reload when same config
    // if (this.gearId === gearId && this.definitions?.length === definitions.length) {
    //   return; // SKip if no changes
    // }

    // Remove old trees
    //this.childTrees.forEach(child => this.removeChildForm(child));

    // Update definition, and wait for child creation

    //this.cd.detectChanges();
    //await waitFor(() => this.childTrees.length === this.definitions.length, {stop: this.destroySubject});

    // Register each sub batch tree to the main container
    //this.childTrees.forEach(child => {
    //  this.addChildForm(child);
    //  this.configureChild(child, program, pmfms);
    //});

    // Re apply data, and restore component state
    this.markAsReady();
    if (data) {
      await this.setValue(data);
    }
    if (enabled) this.enable();
    if (dirty) this.markAsDirty();
    if (touched) this.markAllAsTouched();
  }

  selectDef(def: IBatchTreeDefinition) {
    this.filter = def.filter;
  }

  hasChild = (_: number, node: IBatchTreeDefinition) => isNotEmptyArray(node.children);
  ifLeaf = (_: number, node: IBatchTreeDefinition) => isEmptyArray(node.children);

  markAllAsTouched(opts?: { emitEvent?: boolean }) {
    this._touched = true;
    super.markAllAsTouched(opts);
  }

  addChildTree(child: IBatchTreeComponent) {
    if (!child) throw new Error('Trying to register an undefined sub batch tree');
    this.addChildForm(child);
  }

  removeChildTree(child: IBatchTreeComponent): IBatchTreeComponent {
    if (!child) throw new Error('Trying to remove an undefined sub batch tree');
    return this.removeChildForm(child) as IBatchTreeComponent;
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
    if (!this.childTrees.length) return;

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


  async save(event?: Event, options?: {keepEditing?: boolean}): Promise<boolean> {

    // Save each sub tree
    const results = await Promise.all(this.childTrees.map(child => child.save(options)));
    const saved = !results.some(res => res === false);

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
    await Promise.all(this.childTrees.map(c => c.ready()));
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

  // protected configureChild(child: IBatchTreeComponent) {
  //   console.debug('[batch-tree-container] Configure child:', child);
  //   child.program = this.program;
  //   child.gearId = this.gearId;
  //   child.physicalGearId = this.physicalGearId;
  //   child.allowSubBatches = this.allowSubBatches;
  //   child.showCatchForm = this.showCatchForm;
  //   child.showBatchTables = this.showBatchTables;
  //   child.usageMode = this.usageMode;
  //   child.mobile = this.mobile;
  //   child.modalOptions = this.modalOptions;
  //   if (this.readySubject.value) {
  //     child.markAsReady();
  //   }
  // }

  protected configureChild(child: BatchesTable, program: Program, pmfms: IPmfm[]) {
    console.debug('[batch-tree-container] Configure child:', child);

    //child.showWeightColumns = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_WEIGHT_ENABLE);
    child.showTaxonGroupColumn = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_GROUP_ENABLE);
    child.showTaxonNameColumn = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_NAME_ENABLE);
    child.samplingRatioFormat = program.getProperty(ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT);
    child.setModalOption('maxVisibleButtons', program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS));
    child.i18nColumnSuffix = this.i18nContext.suffix;

    child.pmfms = pmfms;
    child.gearId = this.gearId;
    child.usageMode = this.usageMode;
    child.mobile = this.mobile;
    child.modalOptions = this.modalOptions;

    if (this.readySubject.value) {
      child.markAsReady();
    }
  }



  protected logBatchModel(batch: BatchModel, treeDepth = 0, treeIndent = '', result: string[] = []) {
    // Append current batch to result array
    result.push(`${treeIndent} - ${batch.name || batch.label} ${batch.pmfms?.length?': ': ''} ${(batch.pmfms || []).map(p => p.label).join(', ')}`);

    // Recursive call, for each children
    if (isNotEmptyArray(batch.children)) {
      treeDepth++;
      treeIndent = `${treeIndent}\t`;
      batch.children.forEach(child => this.logBatchModel(child as BatchModel, treeDepth, treeIndent, result));
    }

    // Display result, if root
    if (treeDepth === 0 && isNotEmptyArray(result)) {
      console.debug(`[selectivity-operation] Batch model: ${result.join('\n')}`);
    }
  }

  isWeightPmfm = PmfmUtils.isWeight;
}
