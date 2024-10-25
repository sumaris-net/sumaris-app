import { Observable } from 'rxjs';
import { Inject, Injectable, InjectionToken, Optional, inject } from '@angular/core';
import { Moment } from 'moment';
import { DateUtils, StorageService, equals, fromDateISOString, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { RxState } from '@rx-angular/state';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { RxStateProperty } from '@app/shared/state/state.decorator';

export interface Clipboard<TData = any> {
  source?: any;
  data?: TData;
  pasteFlags?: number;
  updateDate?: Moment;
}

export interface Context<TClipboardData = any> {
  clipboard?: Clipboard<TClipboardData>;
  program?: Program;
  strategy?: Strategy;

  // Child contexts, that can be dynamically set (e.g. TripContext, or SaleContext)
  children?: ContextService<any>[];
}

export const APP_MAIN_CONTEXT_SERVICE = new InjectionToken<ContextService>('ContextService');

export const CONTEXT_DEFAULT_STATE = new InjectionToken<Record<string, any>>('ContextDefaultState');

@Injectable()
export class ContextService<S extends Context<TClipboardData> = Context<any>, TClipboardData = any> extends RxState<S> {
  static SHARED_CLIPBOARD_KEY = 'sharedClipboard';

  private static ID_SEQUENCE = 1;
  readonly id: number = ContextService.ID_SEQUENCE++;

  protected storageService: StorageService = inject(StorageService);

  @RxStateProperty() program: Program;
  @RxStateProperty() strategy: Strategy;
  @RxStateProperty('clipboard', (_, value) => <S['clipboard']>{ ...value, updateDate: DateUtils.moment() })
  clipboard: S['clipboard'];
  @RxStateProperty() children: ContextService<any>[];

  get empty(): boolean {
    return equals(this.defaultState, this.get());
  }

  constructor(@Optional() @Inject(CONTEXT_DEFAULT_STATE) protected defaultState: Partial<S>) {
    super();

    // Apply default, if any
    if (this.defaultState) this.set(this.defaultState);
  }

  setValue<K extends keyof S>(key: K, value: S[K]) {
    // DEBUG
    //console.debug(`[context-service] Set '${String(key)}'`, value);

    console.debug('TODO context setValue', key);
    this.set(key, () => value);
  }

  getObservable<K extends keyof S>(key: K): Observable<S[K]> {
    return this.select(key);
  }

  getValue<K extends keyof S>(key: K): S[K] {
    return super.get(key);
  }

  getValueAsDate<K extends keyof S>(key: K): Moment {
    return fromDateISOString(this.getValue(key));
  }

  resetValue<K extends keyof S>(key: K) {
    console.debug('TODO context resetValue', key);
    this.set(key, () => this.defaultState[key]);
  }

  reset(opts?: { onlySelf?: boolean }): void {
    // Cascade to children
    if (opts?.onlySelf !== false) {
      this.children?.forEach((child) => child.reset(opts));
    }

    // Reset to default state
    this.set(this.defaultState);
  }

  resetClipboard(opts?: { onlySelf?: boolean }) {
    console.debug('TODO resetClipboard');
    // Cascade to children
    if (opts?.onlySelf !== false) {
      this.children?.forEach((child) => child.resetClipboard(opts));
    }

    this.set('clipboard', () => null);
  }

  registerChild(child: ContextService<any>) {
    if (!child) throw new Error('Missing required argument child context');
    console.debug(`[context#${this.id}] Registering child context#${child.id}`);
    this.set('children', (s) => removeDuplicatesFromArray((s.children || []).concat(child), 'id'));
  }

  unregisterChild(child: ContextService<any>) {
    this.set('children', (s) => (s.children || []).filter((c) => c !== child));
  }

  getMerged() {
    const state = this.get();
    const children = state?.children;
    if (!children) return state;

    delete state.children;

    // Merge all children's states
    return [state, ...children.filter((c) => !c.empty).map((child) => child.getMerged())].reduce((res, state) => ({ ...res, ...state }), {});
  }

  async saveClipboard(): Promise<any> {
    console.debug('TODO saveClipboard');
    return await this.storageService.set(ContextService.SHARED_CLIPBOARD_KEY, JSON.stringify(this.clipboard));
  }

  async restoreClipboard(cleanContent: boolean = true) {
    const raw = await this.storageService.get(ContextService.SHARED_CLIPBOARD_KEY);
    console.debug('TODO restoreClipboard', raw);
    this.clipboard = JSON.parse(raw);
    if (cleanContent) {
      console.debug('TODO restoreClipboard cleanContent');
      this.storageService.remove(ContextService.SHARED_CLIPBOARD_KEY);
    }
  }
}
