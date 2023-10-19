import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { Batch } from '@app/trip/batch/common/batch.model';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { BatchModel } from '@app/trip/batch/tree/batch-tree.model';
import { IBatchTreeStatus } from '@app/trip/batch/tree/batch-tree.component';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-batch-model-tree',
  templateUrl: './batch-model-tree.component.html',
  styleUrls: ['./batch-model-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchModelTreeComponent {
  protected readonly selectionSubject = new BehaviorSubject<BatchModel>(null);
  treeDataSource = new MatTreeNestedDataSource<BatchModel>();
  treeControl = new NestedTreeControl<BatchModel>((node) => node.children);

  @Input() debug = false;
  @Input() mobile = false;

  @Input() set data(value: BatchModel[]) {
    this.treeDataSource.data = value;
    this.expandAll();
  }

  get data(): BatchModel[] {
    return this.treeDataSource.data;
  }

  @Input() set selected(value: BatchModel) {
    this.setSelection(value);
  }

  get selected(): BatchModel {
    return this.selectionSubject.value;
  }

  protected get model(): BatchModel {
    return this.treeDataSource.data?.[0];
  }

  @Input() selectedBatchStatus: IBatchTreeStatus = undefined;

  @Output() itemClick = new EventEmitter<BatchModel>();

  constructor(protected cd: ChangeDetectorRef) {}

  expandAll() {
    (this.data || []).forEach((node) => this.expandDescendants(node));
    this.markForCheck();
  }

  setSelection(node: BatchModel) {
    if (node !== this.selectionSubject.value) {
      this.selectionSubject.next(node);
      this.markForCheck();
    }
  }

  protected click(event: Event, node: BatchModel) {
    event?.stopImmediatePropagation();
    this.itemClick.emit(node);
  }

  protected toggle(event: Event, node: BatchModel) {
    event?.stopImmediatePropagation();
    this.treeControl.toggle(node);
  }

  protected hasChild = (_: number, model: BatchModel) => !model.isLeaf;

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected expandDescendants(model?: BatchModel) {
    model = model || this.model;
    if (!model) return; // Skip
    if (model instanceof BatchModel) {
      this.treeControl.expand(model);
      (model.children || []).filter((node) => this.hasChildrenBatchModel(node)).forEach((node) => this.expandDescendants(node));
    }
  }

  protected hasChildrenBatchModel(node: BatchModel | Batch) {
    return node.children && node.children.some((c) => c instanceof BatchModel);
  }
}
