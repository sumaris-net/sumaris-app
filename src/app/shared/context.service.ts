import { THIS_EXPR } from "@angular/compiler/src/output/output_ast";
import { Injectable } from "@angular/core";
import { Landing } from "@app/trip/services/model/landing.model";
import { ObservedLocation } from "@app/trip/services/model/observed-location.model";

export type Context = {
    observedLocation?: ObservedLocation,
    landing?: Landing,
    [key: string]: any,
}

@Injectable()
export class ContextService<S = Context> {
    protected state: S;

    constructor(protected defaultState: S = ({} as S)) {
        this.state = defaultState;
    }

    set(key: keyof S, value:  S[typeof key]): S[typeof key] {
        this.state[key] = value;
        return this.state[key];
    }

    get(key: keyof S): S[typeof key] {
        return this.state[key];
    }

    reset(): S {
        this.state = this.defaultState;
        return this.state;
    }
}
