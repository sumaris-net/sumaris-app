import { BehaviorSubject, interval } from 'rxjs';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { Injectable } from '@angular/core';

export type Context = {
  program?: Program;
  strategy?: Strategy;
}

export type ContextOptions = {
  ttl?: number,
};

export type ObservableValues<T> = {
  [key in keyof T]: BehaviorSubject<T[keyof T]>;
}

export class ContextService<S extends Record<string, any> = Context> {

  protected observableState: ObservableValues<S>;

  constructor(protected defaultState: S) {
    this.reset();
  }

  setValue(key: keyof S, value: S[typeof key], options: ContextOptions = {}): ObservableValues<S>[typeof key] {
    const { ttl } = options;

    // DEBUG
    console.debug(`[context-service] Set '${key}'`, value);

    const observableValue = this.toObservableValue(value);

    if (ttl) {
      const ttl$ = interval(ttl);
      const ttlSub = ttl$.subscribe({
        next: () => {
          // DEBUG
          console.debug(`[context-service] Cleaning '${key}'`);

          if (observableValue.observers?.length > 0) return; // Skip if has observers
          observableValue.complete();
          observableValue.unsubscribe();
          ttlSub.unsubscribe();
        }
      });
    }

    this.observableState[key] = observableValue;
    return this.getValue(key);
  }

  getObservable(key: keyof ObservableValues<S>): BehaviorSubject<S[typeof key]> {
    return this.observableState[key];
  }

  getValue(key: keyof ObservableValues<S>): S[typeof key] {
    return this.getObservable(key)?.closed ? undefined : this.getObservable(key)?.getValue();
  }

  resetValue(key, opts = {}) {
    !!this.observableState?.[key] && this.observableState?.[key].complete();
    this.setValue(key, this.defaultState[key], opts);
  }

  reset(): void {
    this.observableState && Object.values(this.observableState).forEach(obs => obs.complete());
    this.observableState = this.toObservableValues(this.defaultState);
  }

  /* -- private functions -- */

  private toObservableValue<T extends S[keyof S]>(value: T): BehaviorSubject<T> {
    return new BehaviorSubject<T>(value);
  }

  private toObservableValues<T extends Partial<S>>(state: T): ObservableValues<T> {
    return Object.entries(state).reduce((acc, [key, value]) => {
      return {
        ...acc,
        [key]: this.toObservableValue(value)
      };
    }, {}) as ObservableValues<T>;
  }
}
