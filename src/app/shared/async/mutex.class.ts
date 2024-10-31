import { isNil } from '@sumaris-net/ngx-components';

type QueueItem = { resolve: () => void; reject: (err?: any) => void };

export class Mutex<T = any> {
  private _globalQueue: QueueItem[];
  private _objectQueues: Map<T, QueueItem[]>;
  private _globalLocked: boolean;
  private _closed: boolean = false;

  get locked(): boolean {
    return this._globalLocked || this._objectQueues.size > 0;
  }

  get queueCount(): number {
    return this._globalQueue.length + Array.from(this._objectQueues.entries()).reduce((res, queue) => res + queue.length, 0);
  }

  constructor() {
    this._globalQueue = [];
    this._objectQueues = new Map();
    this._globalLocked = false;
  }

  isLocked(obj?: T): boolean {
    if (isNil(obj)) return this._globalLocked;
    return this._objectQueues.get(obj)?.length > 0;
  }

  getQueueCount(obj?: T): number {
    if (isNil(obj)) return this._globalQueue.length;
    return this._objectQueues.get(obj)?.length ?? 0;
  }

  async lock(obj?: T): Promise<() => void> {
    if (this._closed) throw new Error('Mutex is closed');

    if (obj === undefined) {
      return this._lockGlobal();
    } else {
      return this._lockObject(obj);
    }
  }

  unlock(obj?: T) {
    if (this._closed) return;

    if (isNil(obj)) {
      this._unlockGlobal();
    } else {
      this._unlockObject(obj);
    }
  }

  close(err?: T) {
    this._closed = true;

    // Handle global queue
    this._globalQueue.forEach(({ reject }) => reject(err || 'STOP'));
    this._globalQueue = [];

    // Handle object queues
    this._objectQueues.forEach((queue) => {
      queue.forEach(({ reject }) => reject(err || 'STOP'));
    });
    this._objectQueues.clear();

    // Clear global locks
    this._globalLocked = false;
  }

  /* -- private functions -- */

  private async _lockGlobal(): Promise<() => void> {
    if (this._globalLocked) {
      await new Promise<void>((resolve, reject) => this._globalQueue.push({ resolve, reject }));
    }
    this._globalLocked = true;
    return () => this.unlock();
  }

  private async _lockObject(obj: any): Promise<() => void> {
    let queue = this._objectQueues.get(obj);
    if (queue?.length > 0) {
      await new Promise<void>((resolve, reject) => {
        queue.push({ resolve, reject });
      });
    } else {
      this._objectQueues.set(obj, [{ resolve: () => {}, reject: () => {} }]); // Mark as locked
    }
    return () => this.unlock(obj);
  }

  private _unlockGlobal() {
    if (this._globalQueue.length > 0) {
      const { resolve } = this._globalQueue.shift();
      resolve();
    } else {
      this._globalLocked = false;
    }
  }

  private _unlockObject(obj: any) {
    const queue = this._objectQueues.get(obj);

    // Already unlock (nof found in objet queue)
    if (!queue) return;

    // Get resolve from queue's top
    const { resolve } = queue.shift();

    // Remove queue if empty
    if (queue.length === 0) {
      this._objectQueues.delete(obj);
    }

    // Resolve top element
    resolve();
  }
}
