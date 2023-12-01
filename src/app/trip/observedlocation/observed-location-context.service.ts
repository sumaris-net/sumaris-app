import { Inject, Injectable, Optional } from '@angular/core';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { Landing } from '@app/trip/landing/landing.model';
import { TripContext, TripContextService } from '@app/trip/trip-context.service';
import { APP_MAIN_CONTEXT_SERVICE } from '@app/shared/context.service';

export interface ObservedLocationContext extends TripContext {
  observedLocation?: ObservedLocation;
  landing?: Landing;
}

@Injectable({providedIn: 'root'})
export class ObservedLocationContextService<C extends ObservedLocationContext = ObservedLocationContext> extends TripContextService<C> {

  constructor(@Optional() @Inject(APP_MAIN_CONTEXT_SERVICE) defaultState: C) {
    super(defaultState || <C>{});
  }

  set observedLocation(value: ObservedLocation) {
    this.set('observedLocation', () => value);
  }

  get observedLocation(): ObservedLocation {
    return this.get('observedLocation');
  }

  get landing(): Landing|undefined {
    return this.get('landing');
  }

  set landing(value: Landing) {
    this.set('landing', _ => value);
  }
}
