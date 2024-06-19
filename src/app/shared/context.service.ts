import { Observable } from 'rxjs';
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Moment } from 'moment';
import { DateUtils, equals, fromDateISOString, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
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

  // A child context, that can be dynamically set (e.g. TripContext, or SaleContext)
  children?: ContextService<any>[];
}

export const APP_MAIN_CONTEXT_SERVICE = new InjectionToken<ContextService>('ContextService');

export const CONTEXT_DEFAULT_STATE = new InjectionToken<Record<string, any>>('ContextDefaultState');

@Injectable()
export class ContextService<S extends Context<TClipboardData> = Context<any>, TClipboardData = any> extends RxState<S> {
  private static ID_SEQUENCE = 1;
  readonly id: number = ContextService.ID_SEQUENCE++;

  @RxStateProperty() program: Program;
  @RxStateProperty() strategy: Strategy;
  @RxStateProperty('clipboard', (_, value) => <S['clipboard']>{ ...value, updateDate: DateUtils.moment() })
  clipboard: S['clipboard'];
  @RxStateProperty() children: ContextService<any>[];

  get empty(): boolean {
    return equals(this.defaultState || {}, this.get());
  }

  constructor(@Optional() @Inject(CONTEXT_DEFAULT_STATE) protected defaultState: Partial<S>) {
    super();

    // Apply default, if any
    if (this.defaultState) this.set(this.defaultState);
  }

  setValue<K extends keyof S>(key: K, value: S[K]) {
    // DEBUG
    //console.debug(`[context-service] Set '${String(key)}'`, value);

    this.set(key, () => value);
  }

  getObservable<K extends keyof S>(key: K): Observable<S[K]> {
    return this.select(key);
  }

  getValue<K extends keyof S>(key: K): S[K] {
    return this.get(key);
  }

  getValueAsDate<K extends keyof S>(key: K): Moment {
    return fromDateISOString(this.getValue(key));
  }

  resetValue<K extends keyof S>(key: K) {
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
}
