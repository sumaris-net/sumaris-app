import { Injectable } from "@angular/core";
import { SamplingStrategy } from "@app/referential/services/model/sampling-strategy.model";
import { Landing } from "@app/trip/services/model/landing.model";
import { ObservedLocation } from "@app/trip/services/model/observed-location.model";
import { BehaviorSubject, interval } from "rxjs";

export type Context = {
    samplingStrategy?: SamplingStrategy,
}

export type ContextOptions = {
    ttl?: number,
};

export type ObservableValues<T> = {
    [key in keyof T]: BehaviorSubject<T[keyof T]>;
}

@Injectable({providedIn: 'root'})
export class ContextService<S extends Record<string, any> = Context> {
    protected observableState: ObservableValues<S>;

    private toObservableValue<T extends S[keyof S]>(value: T): BehaviorSubject<T> {
        return new BehaviorSubject<T>(value);
    }

    private toObservableValues<T extends Partial<S>>(state: T): ObservableValues<T> {
        return Object.entries(state).reduce((acc, [key, value]) => {
            return {
                ...acc,
                [key]: this.toObservableValue(value),
            }
        }, {}) as ObservableValues<T>;
    }

    constructor(protected defaultState: S = ({} as S)) {
        this.reset();
    }

    setValue(key: keyof S, value:  S[typeof key], options: ContextOptions = {}): ObservableValues<S>[typeof key] {
        const { ttl } = options;
        const observableValue = this.toObservableValue(value);

        if(ttl) {
            const ttl$ = interval(ttl);
            const ttlSub = ttl$.subscribe({
                next: () => {
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
        return this.getObservable(key).closed ? undefined : this.getObservable(key).getValue();
    }

    reset(): void {
        this.observableState = this.toObservableValues(this.defaultState);
    }
}
