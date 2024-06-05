import { Observable } from 'rxjs';
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Moment } from 'moment';
import { DateUtils, equals, fromDateISOString, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { RxState } from '@rx-angular/state';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { RxStateProperty } from '@app/shared/state/state.decorator';
import { CopiedValue } from './copy-tool/copy-calendar.utils';

export interface Clipboard<T = any> {
  data?: T;
  copiedValue?: CopiedValue;
  copiedValues?: CopiedValue[][];
  pasteFlags?: number;
  updateDate?: Moment;
}
export interface Context<T = any> {
  clipboard?: Clipboard<T>;
  program?: Program;
  strategy?: Strategy;

  // A child context, that can be dynamically set (e.g. TripContext, or SaleContext)
  children?: ContextService<any>[];
}

export const APP_MAIN_CONTEXT_SERVICE = new InjectionToken<ContextService>('ContextService');

export const CONTEXT_DEFAULT_STATE = new InjectionToken<Record<string, any>>('ContextDefaultState');

@Injectable()
export class ContextService<S extends Context<T> = Context<any>, T = any> extends RxState<S> {
  private static ID_SEQUENCE = 1;
  readonly id: number = ContextService.ID_SEQUENCE++;
  @RxStateProperty() program: Program;
  @RxStateProperty() strategy: Strategy;
  @RxStateProperty('clipboard', (_, value) => <T>{ ...value, updateDate: DateUtils.moment() }) clipboard: Clipboard<T>;
  @RxStateProperty() children: ContextService<any>[];

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

  resetValue<K extends keyof S>(key: K) {
    this.set(key, () => this.defaultState[key]);
  }

  reset(): void {
    this.children?.forEach((child) => child.reset());

    this.set(this.defaultState);

    this.children = null;
  }

  getValueAsDate<K extends keyof S>(key: K): Moment {
    return fromDateISOString(this.getValue(key));
  }

  registerChild(child: ContextService<any>) {
    if (!child) throw new Error('Missing required argument child context');
    console.debug(`[context#${this.id}] Registering child context#${child.id}`);
    this.set('children', (s) => removeDuplicatesFromArray((s.children || []).concat(child), 'id'));
  }
  unregisterChild(child: ContextService<any>) {
    this.set('children', (s) => (s.children || []).filter((c) => c !== child));
  }
  get empty(): boolean {
    return equals(this.defaultState || {}, this.get());
  }
}
