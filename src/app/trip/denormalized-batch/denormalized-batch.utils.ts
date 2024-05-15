import { FilterFn, IEntity, isEmptyArray, isNil, isNotNil, ITreeItemEntity } from '@sumaris-net/ngx-components';
import { DenormalizedBatch } from './denormalized-batch.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { Batch } from '@app/trip/batch/common/batch.model';

export class DenormalizedBatchUtils {
  static isSamplingBatch(source: DenormalizedBatch) {
    return BatchUtils.isSamplingBatch(source as any as Batch);
  }

  static arrayToTree<T extends ITreeItemEntity<T, number> & IEntity<T, number>>(sources: T[], parent?: T): T[] {
    if (!sources) return null;
    let excludedBatches: T[] = [];
    if (!parent) {
      const roots =
        sources.filter((s) => {
          if (isNil(s.parentId)) return true;
          excludedBatches.push(s);
          return false;
        }) || [];
      if (isEmptyArray(roots)) return []; // No roots
      roots.forEach((root) => {
        excludedBatches = this.arrayToTree<T>(excludedBatches, root);
      });
      return roots;
    }
    parent.children = sources
      .filter((b) => {
        if (b.parentId === (parent as any).id) return true;
        excludedBatches.push(b);
        return false;
      })
      .map((b) => {
        b.parent = parent;
        return b;
      });
    parent.children.forEach((child) => {
      excludedBatches = this.arrayToTree<T>(excludedBatches, child);
    });
    return excludedBatches;
  }

  static filterTreeComponents(parent: DenormalizedBatch, filter: FilterFn<DenormalizedBatch>) {
    // Skip flirted children
    let reasignChildren = false;
    if (isNotNil(parent?.children) && parent.children.length === 1 && !filter(parent.children[0])) {
      // Reafect children and parents to the not skiped parent
      // TODO get fractions
      parent.children = parent.children[0].children;
      reasignChildren = true;
    }
    // Do the same on children
    parent?.children.forEach((child) => {
      if (reasignChildren) child.parent = parent;
      this.filterTreeComponents(child, filter);
    });
  }

  static computeTreeIndent(parent: DenormalizedBatch, indentComponents: string[] = [], isLast = false, opts?: { html: boolean }) {
    // Compute the treeIndent for the batch itself dependigns on the parametrer givent by the parent

    // If has no indentComponents than mean we are on the root of the tree
    const initializeTree = indentComponents.length === 0;
    if (initializeTree) {
      // Indents alaways start with a blank
      parent.treeIndent = opts?.html ? '<div class="blank"></div>' : '  ';
      indentComponents.push(parent.treeIndent);
    } else {
      // Set the leaf dependings on if the element is the last of the slibing or not
      parent.treeIndent = indentComponents
        .join('')
        .concat(opts?.html ? `<div class="${isLast ? 'last-leaf' : 'leaf'}"></div>` : isLast ? '|_' : '|-');
    }

    // If we are on the end of the tree
    const children = parent?.children;
    if (!children) return;

    // Do the same on children

    // Get last member of the sibling
    const lastChild = children[children.length - 1];

    if (!initializeTree) {
      // Append new indentComponents depending on the element is the last of the sibling
      indentComponents.push(opts?.html ? (isLast ? '<div class="blank"></div>' : '<div class="trunc"></div>') : isLast ? '  ' : '| ');
    }
    children.forEach((child) => {
      const isLast = child.equals(lastChild);
      this.computeTreeIndent(child, indentComponents, isLast, opts);
    });
    indentComponents.pop();
  }
}
