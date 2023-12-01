import { Observable } from 'rxjs';
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Moment } from 'moment';
import { DateUtils, fromDateISOString } from '@sumaris-net/ngx-components';
import { RxState } from '@rx-angular/state';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { RxStateProperty } from '@app/shared/state/state.decorator';

export interface Clipboard<T = any> {
  data?: T;
  pasteFlags?: number;
  updateDate?: Moment;
}
export interface Context<T = any> {
  clipboard?: Clipboard<T>;
  program?: Program;
  strategy?: Strategy;
}

export const APP_MAIN_CONTEXT_SERVICE = new InjectionToken<ContextService>('ContextService');

export const CONTEXT_DEFAULT_STATE = new InjectionToken<Record<string, any>>('ContextDefaultState');


@Injectable()
export class ContextService<S extends Context<T> = Context<any>, T = any> extends RxState<S> {

  constructor(@Optional() @Inject(CONTEXT_DEFAULT_STATE) protected defaultState: Partial<S>) {
    super();

    // Apply default, if any
    this.set(this.defaultState);
  }

  setValue<K extends keyof S>(key: K, value: S[K],) {

    // DEBUG
    //console.debug(`[context-service] Set '${String(key)}'`, value);

    this.set(key, _ => value);
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
    this.set(this.defaultState);
  }

  getValueAsDate<K extends keyof S>(key: K): Moment {
    return fromDateISOString(this.getValue(key));
  }

  @RxStateProperty() program: Program;
  @RxStateProperty() strategy: Strategy;

  @RxStateProperty('clipboard', (_, value) => <T>{...value, updateDate: DateUtils.moment()}) clipboard: Clipboard<T>;
}
