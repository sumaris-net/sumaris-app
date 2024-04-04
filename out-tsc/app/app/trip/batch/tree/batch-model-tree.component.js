import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { BatchModel } from '@app/trip/batch/tree/batch-tree.model';
import { BehaviorSubject } from 'rxjs';
let BatchModelTreeComponent = class BatchModelTreeComponent {
    constructor(cd) {
        this.cd = cd;
        this.selectionSubject = new BehaviorSubject(null);
        this.treeDataSource = new MatTreeNestedDataSource();
        this.treeControl = new NestedTreeControl((node) => node.children);
        this.debug = false;
        this.mobile = false;
        this.selectedBatchStatus = undefined;
        this.itemClick = new EventEmitter();
        this.hasChild = (_, model) => !model.isLeaf;
    }
    set data(value) {
        this.treeDataSource.data = value;
        this.expandAll();
    }
    get data() {
        return this.treeDataSource.data;
    }
    set selected(value) {
        this.setSelection(value);
    }
    get selected() {
        return this.selectionSubject.value;
    }
    get model() {
        var _a;
        return (_a = this.treeDataSource.data) === null || _a === void 0 ? void 0 : _a[0];
    }
    expandAll() {
        (this.data || []).forEach((node) => this.expandDescendants(node));
        this.markForCheck();
    }
    setSelection(node) {
        if (node !== this.selectionSubject.value) {
            this.selectionSubject.next(node);
            this.markForCheck();
        }
    }
    click(event, node) {
        event === null || event === void 0 ? void 0 : event.stopImmediatePropagation();
        this.itemClick.emit(node);
    }
    toggle(event, node) {
        event === null || event === void 0 ? void 0 : event.stopImmediatePropagation();
        this.treeControl.toggle(node);
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    expandDescendants(model) {
        model = model || this.model;
        if (!model)
            return; // Skip
        if (model instanceof BatchModel) {
            this.treeControl.expand(model);
            (model.children || []).filter((node) => this.hasChildrenBatchModel(node)).forEach((node) => this.expandDescendants(node));
        }
    }
    hasChildrenBatchModel(node) {
        return node.children && node.children.some((c) => c instanceof BatchModel);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchModelTreeComponent.prototype, "debug", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchModelTreeComponent.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], BatchModelTreeComponent.prototype, "data", null);
__decorate([
    Input(),
    __metadata("design:type", BatchModel),
    __metadata("design:paramtypes", [BatchModel])
], BatchModelTreeComponent.prototype, "selected", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchModelTreeComponent.prototype, "selectedBatchStatus", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], BatchModelTreeComponent.prototype, "itemClick", void 0);
BatchModelTreeComponent = __decorate([
    Component({
        selector: 'app-batch-model-tree',
        templateUrl: './batch-model-tree.component.html',
        styleUrls: ['./batch-model-tree.component.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [ChangeDetectorRef])
], BatchModelTreeComponent);
export { BatchModelTreeComponent };
//# sourceMappingURL=batch-model-tree.component.js.map