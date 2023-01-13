import { EntityFilter, FilterFn, IEntity, isEmptyArray, isNotNil, ITreeItemEntity } from '@sumaris-net/ngx-components';

export class TreeItemEntityUtils {
  static forward<T extends ITreeItemEntity<any>, ID = number>(node: T, filterFn?: FilterFn<T>, loopCount?: number): T {

    // Stop infinite loop
    if (loopCount === 100) {
      console.error('Infinite loop detected! Make sure there is valid node in this tree!')
      return undefined;
    }

    let indexInParent = node.parent ? (node.parent.children || []).indexOf(node) : -1;
    // Root node
    if (indexInParent === -1) {
      return this.first(node, filterFn);
    }

    // Dive into children
    const firstChild = (node.children || []).map(c => this.first(c, filterFn)).find(isNotNil);
    if (firstChild) return firstChild;

    // Lookup in brothers
    let current = node;
    while (current.parent && indexInParent !== -1)  {
      // Has brother ?
      if (indexInParent + 1 < current.parent.children.length) {
        const brother = (current.parent.children || []).slice(indexInParent + 1)
          .map(c => (!filterFn || filterFn(c)) ? c : this.first(c, filterFn))
          .find(isNotNil);
        // OK, found a brother
        if (brother) return brother;
      }
      // Retry, with parent's brother
      current = current.parent;
      indexInParent = current.parent ? (current.parent.children || []).indexOf(current) : -1;
    }

    return this.first(current, filterFn);
  }

  static backward<T extends ITreeItemEntity<any>, ID = number>(node: T, filterFn?: FilterFn<T>, loopCount?: number): T {

    // Stop infinite loop
    if (loopCount === 100) {
      console.error('Infinite loop detected! Make sure there is valid node in this tree!')
      return undefined;
    }

    const indexInParent = node.parent ? (node.parent.children || []).indexOf(node) : -1;
    // Root node
    if (indexInParent === -1) {
      return this.lastLeaf(node, filterFn);
    }

    // No previous brother (first in parent's list)
    else if (indexInParent === 0) {
      // Return the parent, if match
      return (!filterFn || filterFn(node.parent))
        ? node.parent
        // Or recursively call backward() on the parent
        : this.backward(node.parent, filterFn, (loopCount||0)+1);
    }

    // Lookup in brother
    else {
      const previousBrother = (node.parent.children || []).slice(0, indexInParent)
        .reverse()
        .find(c => !filterFn || filterFn(c));

      // OK, there is a brother before the current index
      if (previousBrother) return this.lastLeaf(previousBrother, filterFn);
    }

    // Not found in brother: recursively call backward() on the parent
    return this.backward(node.parent, filterFn, (loopCount||0)+1);
  }


  static first<T extends ITreeItemEntity<any>>(node: T, filterFn?: FilterFn<T>): T {

    // Node has children: dive into children
    const child = (node.children || []).find(c => (!filterFn || filterFn(c)));
    if (child) return child;

    // Lookup in descendants
    const descendant = (node.children || [])
      .map(c => this.first(c, filterFn))
      .find(isNotNil);
    if (descendant) return descendant;

    // Node match: use it
    return (!filterFn || filterFn(node)) ? node : undefined;
  }

  static lastLeaf<T extends ITreeItemEntity<any>>(node: T, filterFn?: FilterFn<T>): T {
    // Node has children: dive into children
    const childLeaf = (node.children || [])
      // Reverse order (after clone)
      .slice().reverse()
      .map(c => this.lastLeaf(c, filterFn))
      .find(isNotNil);
    if (childLeaf) return childLeaf; // OK, found in children

    // Node is a leaf, or not match found in children: check current
    return (!filterFn || filterFn(node)) ? node : undefined;
  }


  static findByFilter<T extends ITreeItemEntity<T> & IEntity<T>>(node: T, filter: EntityFilter<any, T>): T[] {
    const filterFn = filter?.asFilterFn();
    if (!filterFn) throw new Error('Missing or empty filter argument');

    return this.filterRecursively(node, filterFn);
  }

  /**
   * Delete matches batches
   * @param node
   * @param filter
   */
  static deleteByFilter<T extends ITreeItemEntity<T> & IEntity<T>>(node: T, filter: EntityFilter<any, T>): T[] {
    const filterFn = filter?.asFilterFn();
    if (!filterFn) throw new Error('Missing or empty filter argument');

    return this.deleteRecursively(node, filterFn);
  }

  static filterRecursively<T extends ITreeItemEntity<any>>(node: T, filterFn: (n: T) => boolean): T[] {
    return (node.children || []).reduce((res, child) => {
        return res.concat(this.filterRecursively(child, filterFn));
      },
      // Init result
      filterFn(node) ? [node] : []
    );
  }

  static deleteRecursively<T extends ITreeItemEntity<any>>(node: T, filterFn: (n: T) => boolean): T[] {
    if (isEmptyArray(node.children)) return []; // Skip

    // Delete children
    const deletedBatches = node.children.filter(filterFn);
    node.children = node.children.filter(c => !deletedBatches.includes(c));

    // Recursive call, in still existing children
    return node.children.reduce((res, c) => {
      return res.concat(...this.deleteRecursively(c, filterFn))
    }, deletedBatches);
  }
}
