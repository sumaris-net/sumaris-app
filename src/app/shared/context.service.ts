import {Observable} from 'rxjs';
import {Inject, Injectable, InjectionToken, Optional} from '@angular/core';
import {Moment} from 'moment';
import {DateUtils, fromDateISOString} from '@sumaris-net/ngx-components';
import {RxState} from '@rx-angular/state';
import {Program} from '@app/referential/services/model/program.model';
import {Strategy} from '@app/referential/services/model/strategy.model';

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

export const CONTEXT_DEFAULT_STATE = new InjectionToken<Record<string, any>>('ContextDefaultState');


@Injectable()
export class ContextService<S extends Context<T> = Context<any>, T = any> extends RxState<S> {

  constructor(@Optional() @Inject(CONTEXT_DEFAULT_STATE) protected defaultState: S) {
    super()
    this.reset();
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

  resetValue(key) {
    this.set(key, () => this.defaultState[key]);
  }

  reset(): void {
    this.set(this.defaultState);
  }

  getValueAsDate<K extends keyof S>(key: K): Moment {
    return fromDateISOString(this.getValue(key));
  }

  get clipboard(): Clipboard<T> | undefined {
    return this.get('clipboard') as Clipboard<T>;
  }

  set clipboard(value: Clipboard<T> | undefined) {
    this.set('clipboard', _ => ({...value, updateDate: DateUtils.moment()}));
  }

  get program(): Program|undefined {
    return this.get('program');
  }

  get strategy(): Strategy|undefined {
    return this.get('strategy');
  }
}
