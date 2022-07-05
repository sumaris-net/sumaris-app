import { ChangeDetectionStrategy, Component, Injector, Input, QueryList, ViewChildren } from '@angular/core';
import { AppEditor, AppForm, AppTabEditor, fadeInOutAnimation, InputElement, isNil } from '@sumaris-net/ngx-components';
import { APP_ENTITY_EDITOR } from '@app/data/quality/entity-quality-form.component';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { AlertController, IonRouterOutlet } from '@ionic/angular';
import { OperationPage } from '@app/trip/operation/operation.page';
import { OperationService } from '@app/trip/services/operation.service';
import { Operation } from '@app/trip/services/model/trip.model';
import { BatchTreeComponent, IBatchTreeComponent } from '@app/trip/batch/batch-tree.component';
import { Batch } from '@app/trip/batch/common/batch.model';
import { IBatchGroupModalOptions } from '@app/trip/batch/group/batch-group.modal';
import { Program } from '@app/referential/services/model/program.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AppTabEditorOptions } from '@sumaris-net/ngx-components/src/app/core/form/editor.class';

@Component({
  selector: 'app-batch-tree-wrapper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`
})

export class BatchTreeWrapperComponent extends AppEditor<Batch> implements IBatchTreeComponent {

  data: Batch = null;

  @Input() delegates;
  @Input() program: Program;
  @Input() gearId: number;
  @Input() showCatchForm: boolean;
  @Input() defaultHasSubBatches: boolean;
  @Input() availableTaxonGroups: TaxonGroupRef[];
  @Input() allowSamplingBatches: boolean;
  @Input() allowSubBatches: boolean;
  @Input() selectedTabIndex: number;

  get isNewData(): boolean {
    return isNil(this.data?.id);
  }

  set value(value: Batch) {
    this.setValue(value);
  }

  get value(): Batch {
    return this.getValue();
  }

  @ViewChildren(BatchTreeComponent) subBatchTrees!: QueryList<BatchTreeComponent>;

  constructor(injector: Injector,
              route: ActivatedRoute,
              router: Router,
              alertCtrl: AlertController,
              translate: TranslateService) {
    super(route, router, alertCtrl, translate);
  }

  addSubTree(batchTree: IBatchTreeComponent) {
    this.addChildForm(batchTree);
  }

  autoFill(opts?: { skipIfDisabled: boolean; skipIfNotEmpty: boolean; }): Promise<void> {
      throw new Error('Method not implemented.');
  }
  addRow(event: UIEvent) {
      throw new Error('Method not implemented.');
  }
  unload(opts?: { emitEvent?: boolean; }): Promise<void> {
      throw new Error('Method not implemented.');
  }
  getFirstInvalidTabIndex(): number {
      throw new Error('Method not implemented.');
  }
  save(event?: Event, options?: any): Promise<boolean> {
      throw new Error('Method not implemented.');
  }

  setValue(data: Batch, opts?: {emitEvent?: boolean;}) {
    // TODO
    this.data = data;
  }

  setModalOption(key: keyof IBatchGroupModalOptions, value: IBatchGroupModalOptions[typeof key]) {
    // TODO
    //this.batchGroupsTable.setModalOption(key, value);
  }

  setSelectedTabIndex(value: number) {

  }

  realignInkBar() {

  }

  getValue(): Batch {
    return this.data;
  }

  // Unused
  load(id?: number, options?: any): Promise<any> {
    return Promise.resolve(undefined);
  }

  // Unused
  reload() {
    return Promise.resolve(undefined);
  }
}
