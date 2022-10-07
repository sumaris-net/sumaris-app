import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild} from '@angular/core';
import {
  AppEditor, arrayDistinct,
  firstNotNil,
  FormErrorTranslatorOptions,
  getPropertyByPath,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank, LocalSettingsService,
  toBoolean,
  UsageMode,
  WaitForOptions
} from '@sumaris-net/ngx-components';
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
import {changeCaseToUnderscore} from '../../../../../ngx-sumaris-components/src/app/shared/functions';

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

  protected logPrefix = '[batch-tree-container] ';
  protected editingBatch: BatchModel;

  data: Batch = null;
  $gearId = new BehaviorSubject<number>(null);
  $physicalGearId = new BehaviorSubject<number>(null);
  $programLabel = new BehaviorSubject<string>(null);
  $program = new BehaviorSubject<Program>(null);
  $sortingPmfms = new BehaviorSubject<IPmfm[]>(null);
  $catchPmfms = new BehaviorSubject<IPmfm[]>(null);
  listenProgramChanges = true;
  errorTranslatorOptions: FormErrorTranslatorOptions;

  treeControl = new NestedTreeControl<Batch>(node => node.children);
  treeDataSource = new MatTreeNestedDataSource<Batch>();
  filterPanelFloating = true;
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
    return this.filterForm?.touched || this.batchTree.touched || false;
  }

  get invalid(): boolean {
    return this.filterForm?.invalid || this.batchTree.invalid || false;
  }

  get valid(): boolean {
    return this.filterForm?.valid && this.batchTree.valid || false;
  }

  get loading(): boolean {
    return this.loadingSubject.value;
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

  constructor(injector: Injector,
              route: ActivatedRoute,
              router: Router,
              alertCtrl: AlertController,
              translate: TranslateService,
              protected programRefService: ProgramRefService,
              protected batchModelValidatorService: BatchModelValidatorService,
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
          tap(key => console.debug(this.logPrefix + 'Starting pmfm key computation')),
          switchMap(() => merge(
              this.$program,
              this.$gearId,
              this.$physicalGearId
            )
          ),
          debounceTime(100),
          map(() => this.computePmfmsKey()),
          tap(key => console.debug(this.logPrefix + 'Pmfm key changed to: ' + key)),
          filter(isNotNil),
          distinctUntilChanged()
        )
        .subscribe(async () => {
          await this.setProgram(this.$program.value);
          await this.loadPmfms();
        })
    );

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
      if (pmfm) return PmfmUtils.getPmfmName(pmfm);
    }
    else if (path.includes('.measurementValues.')) {
      const parts = path.split('.');
      const pmfmId = parseInt(parts[parts.length-1]);
      const pmfm = (this.$sortingPmfms.value || []).find(p => p.id === pmfmId);
      if (pmfm) {
        const nodePath = parts.slice(0, parts.length - 2).join('.');
        const node = this.getBatchModelByPath(nodePath);
        return `${node?.fullName || path} > ${PmfmUtils.getPmfmName(pmfm)}`;
      }
    }
    if (path.startsWith('children.')){
      const parts = path.split('.');
      const fieldName = parts[parts.length-1];
      const nodePath = parts.slice(0, parts.length - 1).join('.');
      let nodeName = this.getBatchModelByPath(nodePath)?.fullName;
      if (!nodeName) {
        const nodeForm = this.filterForm.get(nodePath);
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

  protected async loadPmfms() {
    const program = this.program;
    const gearId = this.gearId;
    if (!program || isNil(gearId)) return; // Skip

    console.info(this.logPrefix + 'Loading pmfms...');

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
    //const data = this.data;

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

    if (enabled) this.enable();
    if (dirty) this.markAsDirty();
    if (touched) this.markAllAsTouched();
  }


  async editBatch(event: UIEvent, source: BatchModel) {

    event?.preventDefault();
    event?.stopPropagation();

    if (this.editingBatch === source) {
      if (this.filterPanelFloating) this.closeFilterPanel();
      return; // Skip
    }

    // Save current state
    await this.ready();
    const dirty = this.dirty;
    const touched = this.touched;

    try {
      // Save previous changes
      if (this.enabled && this.editingBatch && this.batchTree.dirty) {
        const saved = await this.saveEditingBatch();
        if (!saved) return; // Cannot save
      }

      console.info(this.logPrefix + `Selected parent ${source?.label}`);

      if (this.filterPanelFloating) this.closeFilterPanel();
      this.editingBatch = source;
      this.markForCheck();

      if (!this.batchTree.loading) {
        console.warn(this.logPrefix + 'Unload batch tree...');
        //await this.batchTree.unload();
      }

      // Configure batch tree
      this.batchTree.gearId = this.gearId;
      this.batchTree.physicalGearId = this.physicalGearId;
      this.batchTree.i18nContext = this.i18nContext;
      this.batchTree.showCatchForm = this.showCatchForm && isNotEmptyArray(PmfmUtils.filterPmfms(source.pmfms, { excludeHidden: true }));
      this.batchTree.showBatchTables = this.showBatchTables && isNotEmptyArray(PmfmUtils.filterPmfms(source.childrenPmfms, { excludeHidden: true }));
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
        this.batchTree.subBatchesTable.programLabel = this.programLabel;
        //await this.batchTree.subBatchesTable.ready();
      }

      // Apply value (after clone(), to keep pmfms unchanged)
      const target = Batch.fromObject(source.asObject({ withChildren: true }));
      target.parent = source.parent;
      await this.batchTree.setValue(target);

    }
    finally {
      // Restore previous state
      if (dirty) this.markAsDirty();
      if (touched) this.markAllAsTouched();
    }
  }

  async loadModel(source?: Batch): Promise<BatchModel> {
    source = source || this.data;

    const [catchPmfms, sortingPmfms] = await Promise.all([
      firstNotNil(this.$catchPmfms, {stop: this.destroySubject}).toPromise(),
      firstNotNil(this.$sortingPmfms, {stop: this.destroySubject}).toPromise()
    ]);

    // Create a batch model
    const target = BatchModel.fromBatch(source, sortingPmfms);
    if (!target) return;

    // Add catch batches pmfms
    target.pmfms = arrayDistinct([
      ...catchPmfms,
      ...target.pmfms
    ], 'id');

    if (this.debug) this.logBatchModel(target);

    // Set default catch batch name
    if (!target.parent && !target.name)  {
      target.name = 'TRIP.BATCH.EDIT.CATCH_BATCH';
    }

    return target;
  }

  hasChild = (_: number, node: BatchModel) => isNotEmptyArray(node.children) && isEmptyArray(node.childrenPmfms);

  createFilterForm(model: BatchModel, level = 0): FormGroup {
    const isCatchBatch = level === 0;
    const isLeaf = !this.hasChild(undefined, model);
    if (isCatchBatch && this.debug) console.debug(this.logPrefix + 'Creating filter form, from batch model...', model);

    const form = this.batchModelValidatorService.getFormGroup(model, {
      pmfms: model.pmfms,
      withMeasurements: true,
      withMeasurementTypename: true,
      withChildren: isLeaf,
      childrenPmfms: isLeaf && model.childrenPmfms
    });
    model.form = form;

    level = level+1;
    if (!isLeaf) {
      // Recursive call, on each children model
      const childrenForm = new FormArray((model.children || [])
        .filter(c => c instanceof BatchModel)
        .map(c => this.createFilterForm(c as BatchModel, level)));
      if (form.contains('children')) form.setControl('children', childrenForm)
      else form.addControl('children', childrenForm);
    }

    // Final log
    if (isCatchBatch && this.debug) console.debug(this.logPrefix + 'Filter form created: ', form);

    return form;
  }

  markAllAsTouched(opts?: { emitEvent?: boolean }) {
    this.filterForm.markAllAsTouched();
    super.markAllAsTouched(opts);
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this.filterForm.markAsPristine(opts);
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
        const model = await this.loadModel(data);
        if (!model) throw 'Invalid model';

        // Apply model
        this.filterForm = this.createFilterForm(model);
        this.treeDataSource.data = [model];

        this.expandDescendants(model);
        this.openFilterPanel();
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

    console.info(this.logPrefix + `Saving...`);

    if (this.dirty) {
      // Save editing batch
      const saved = await this.saveEditingBatch();
      if (!saved) return false; // Cannot save

      // Get data
      const data = Batch.fromObject(this.filterForm.value, {withChildren: true});

      this.data = data;
    }

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

  /**
   * Save editing batch
   */
  protected async saveEditingBatch(): Promise<boolean> {
    if (!this.editingBatch) return true; // Already saved

    // Update filter form
    const path = this.editingBatch.path;
    const form = isNotNilOrBlank(path) ? this.filterForm?.get(path) : this.filterForm;
    if (!form || !(form instanceof FormGroup)) throw new Error('Invalid filterForm path: ' + this.editingBatch.path);
    const withChildren = isNotEmptyArray(this.editingBatch.childrenPmfms);

    // Save if need
    let saved = true;
    if (this.batchTree.dirty) {
      console.info(this.logPrefix + `Saving editing batch ${this.editingBatch.label} ...`);
      saved = await this.batchTree.save();
    }

    // Check if valid
    if (!saved || this.batchTree.invalid) {
      this.batchTree.logFormErrors(this.editingBatch.path);
      this.editingBatch.error = this.batchTree.error;
      this.setError(this.editingBatch.error);
      return false;
    }

    // Get saved data
    const savedBatch = this.batchTree.value;
    this.batchTree.markAsPristine();

    // Update the model
    this.editingBatch.measurementValues = {
      ...this.editingBatch.measurementValues,
      ...savedBatch.measurementValues
    };
    if (withChildren) {
      this.editingBatch.children = savedBatch.children;
    }

    // Update the filter form
    //const json = savedBatch.asObject({withChildren: false});
    form.patchValue({
      measurementValues: savedBatch.measurementValues
    });
    if (withChildren) {
      // const childrenArray = new FormArray(
      //   (savedBatch.children || [])
      //     .map(c => this.batchModelValidatorService.getFormGroup(c as BatchModel, {pmfms: this.editingBatch.childrenPmfms, withChildren: true}))
      // );
      //form.setControl('children', childrenArray);
    }

    return form.valid;
  }

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

  protected getBatchModelByPath(path: string): BatchModel|undefined {
    const catchBatch = this.treeDataSource.data?.[0];
    return getPropertyByPath(catchBatch, path) as BatchModel|undefined;
  }

  isWeightPmfm = PmfmUtils.isWeight;
}
