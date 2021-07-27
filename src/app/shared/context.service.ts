import { Injectable } from "@angular/core";
import { Landing } from "@app/trip/services/model/landing.model";
import { ObservedLocation } from "@app/trip/services/model/observed-location.model";

export type Context = {
    observedLocation?: ObservedLocation,
    landing?: Landing,
}

@Injectable()
export class ContextService<S = Context> {

    constructor(private state: S = ({} as S)) {

    }

    set(key: keyof S, value:  S[typeof key]): void {
        this.state[key] = value;
    }

    get(key: keyof S): S[typeof key] {
        return this.state[key];
    }
}
