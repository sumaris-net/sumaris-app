import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { AppEditor, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, toBoolean, UsageMode, WaitForOptions } from '@sumaris-net/ngx-components';
import { AlertController } from '@ionic/angular';
import { IBatchTreeComponent } from '@app/trip/batch/tree/batch-tree.component';
import { Batch } from '@app/trip/batch/common/batch.model';
import { IBatchGroupModalOptions } from '@app/trip/batch/group/batch-group.modal';
import { Program } from '@app/referential/services/model/program.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, mergeMap, switchMap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';

@Component({
  selector: 'app-batch-tree-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ion-grid class="form-container" *ngIf="debug">
    <ion-row>
      <ion-col size="0" size-md="3" size-lg="3">
        <ion-label class="ion-float-end">Debug :</ion-label>
      </ion-col>
      <ion-col>
        <ion-text color="primary" class="text-italic">
          <small>
            batchTreeWrapper.loading: {{loading}}<br/>
            batchTreeWrapper.ready: {{readySubject|async}}<br/>
            batchTreeWrapper.dirty: {{dirty}}<br/>
          </small>
        </ion-text>
      </ion-col>
    </ion-row>
  </ion-grid>`
})
export class BatchTreeContainerComponent extends AppEditor<Batch>
  implements IBatchTreeComponent {

  private _childrenTrees: IBatchTreeComponent[] = [];
  private _touched: boolean;

  data: Batch = null;
  $gearId = new BehaviorSubject<number>(null);
  $physicalGearId = new BehaviorSubject<number>(null);
  $programLabel = new BehaviorSubject<string>(null);
  $program = new BehaviorSubject<Program>(null);
  listenProgramChanges = true;

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
    this.listenProgramChanges = false; // Avoid to watch program changes, when program is given by parent component
    this.$program.next(value);
  }

  get program(): Program {
    return this.$program.value;
  }

  @Input() set gearId(value: number) {
    this.$gearId.next(value);
  }

  get gearId(): number {
    return this.$gearId.value;
  }

  get touched(): boolean {
    return this._touched;
  }

  @Input() set physicalGearId(value: number) {
    this.$physicalGearId.next(value);
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
        mergeMap(() => this.ready()),
        debounceTime(500)
      )
      .subscribe(() => {
        console.debug('[batch-tree-wrapper] Detect changes');
        this.configureChildren();
      })
    );
  }

  markAllAsTouched(opts?: { emitEvent?: boolean }) {
    this._touched = true;
    super.markAllAsTouched(opts);
  }

  addChildTree(batchTree: IBatchTreeComponent) {
    if (!batchTree) throw new Error('Trying to register an undefined sub batch tree');
    this.addChildForm(batchTree);
    this._childrenTrees.push(batchTree);
  }

  removeChildTree(batchTree: IBatchTreeComponent): IBatchTreeComponent {
    if (!batchTree) throw new Error('Trying to remove an undefined sub batch tree');
    this.removeChildForm(batchTree);

    const index = this._childrenTrees.findIndex(f => f === batchTree);
    if (index === -1) return undefined; // not found
    return this._childrenTrees.splice(index, 1)[0];
  }

  async autoFill(opts?: { skipIfDisabled: boolean; skipIfNotEmpty: boolean; }): Promise<void> {
    await this.ready();

    this._childrenTrees.forEach(subTree => {
      subTree.autoFill(opts);
    });
  }

  addRow(event: UIEvent) {

      throw new Error('Method not implemented.');
  }

  unload(opts?: { emitEvent?: boolean; }): Promise<void> {
      throw new Error('Method not implemented.');
  }

  getFirstInvalidTabIndex(): number {
    return this._childrenTrees.map(subBatchTree => subBatchTree.invalid ? subBatchTree.getFirstInvalidTabIndex() : undefined)
      .find(isNotNil);
  }


  async setValue(data: Batch, opts?: {emitEvent?: boolean;}) {
    data = data || Batch.fromObject({
      rankOrder: 1,
      label: AcquisitionLevelCodes.CATCH_BATCH
    });
    this.markAsLoading();

    try {
      this.data = data;

      await this.ready();

      // Data not changed (e.g. during ready())
      if (data === this.data) {

        await Promise.all(
          this._childrenTrees.map(subBatchTree => {
            const catchBatch = data.clone();

            // Filter sorting batches, if need
            if (catchBatch.children) {
              const filterFn = BatchFilter.fromObject(subBatchTree.filter)?.asFilterFn();
              if (filterFn && catchBatch.children) {
                catchBatch.children = catchBatch.children
                  .filter(filterFn);
              }
            }

            return subBatchTree.setValue(catchBatch, opts);
          })
        );

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


  async save(event?: Event, options?: any): Promise<boolean> {

    // Save each sub tree
    const results = await Promise.all(this._childrenTrees.map(subBatchTree => subBatchTree.save(event, options)));
    const saved = !results.some(res => res === false);

    // Update data
    const data = this.data || new Batch();
    data.measurementValues = {};
    data.children = [];

    this._childrenTrees.forEach(subBatchTree => {
      const subData = subBatchTree.value;

      // Merge measurements
      if (subData.measurementValues) {
        data.measurementValues = {
          ...data.measurementValues,
          ...subData.measurementValues
        };
      }

      // Merge batches
      if (isNotEmptyArray(subData.children)) {
        data.children = [
          ...data.children,
          ...subData.children
        ];
      }
    });

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

    // Make sure has some sub trees
    //await waitFor(() => this._subTrees.length > 0);
    await Promise.all((this._childrenTrees || []).map(c => c.ready()))

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

  protected configureChildren() {
    this._childrenTrees.forEach(subBatchTree => this.configureChild(subBatchTree));
  }

  protected configureChild(subBatchTree: IBatchTreeComponent) {
    console.debug('[batch-tree-wrapper] Configure child:', subBatchTree);
    subBatchTree.program = this.program;
    subBatchTree.gearId = this.gearId;
    subBatchTree.physicalGearId = this.physicalGearId;
    subBatchTree.allowSubBatches = this.allowSubBatches;
    subBatchTree.showCatchForm = this.showCatchForm;
    subBatchTree.showBatchTables = this.showBatchTables;
    subBatchTree.usageMode = this.usageMode;
    subBatchTree.mobile = this.mobile;
    subBatchTree.modalOptions = this.modalOptions;
    if (this.readySubject.value) {
      subBatchTree.markAsReady();
    }
  }
}
