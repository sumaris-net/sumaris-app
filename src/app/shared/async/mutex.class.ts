import { queue, Subscription } from 'rxjs';
import { TeardownLogic } from 'rxjs/src/internal/types';
import { OnDestroy } from '@angular/core';

export class Mutex {
  private _queue: Array<{ resolve: () => void; reject: (err?: any) => void }>;
  private _locked: boolean;
  private _closed: boolean = false;

  get locked(): boolean {
    return this._locked;
  }

  get queueCount(): number {
    return this._queue.length;
  }

  constructor() {
    this._queue = [];
    this._locked = false;
  }

  async lock() {
    if (this._closed) throw new Error('Mutex is closed');
    if (this._locked) {
      await new Promise<void>((resolve, reject) => this._queue.push({ resolve, reject }));
    }
    this._locked = true;
    return () => this.unlock();
  }

  unlock() {
    if (this._closed) return; // Nothing to do
    if (this._queue.length > 0) {
      const { resolve } = this._queue.shift();
      resolve();
    } else {
      this._locked = false;
    }
  }

  stop(err?: any) {
    this._closed = true;
    const queue = this._queue?.slice().reverse();
    this._queue = [];
    queue?.forEach(({ reject }) => reject(err || 'STOP'));
  }
}
