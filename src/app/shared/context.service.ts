import {BehaviorSubject, Observable} from 'rxjs';
import {Program} from '@app/referential/services/model/program.model';
import {Strategy} from '@app/referential/services/model/strategy.model';
import {Inject, Injectable, InjectionToken, Optional} from '@angular/core';
import {Moment} from 'moment';
import {fromDateISOString} from '@sumaris-net/ngx-components';
import {RxState} from '@rx-angular/state';

export type Context = {
  program?: Program;
  strategy?: Strategy;
}

export const CONTEXT_DEFAULT_STATE = new InjectionToken<Record<string, any>>('ContextDefaultState');


@Injectable()
export class ContextService<S extends object = Context> extends RxState<S> {

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

}
