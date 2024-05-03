import { ReferentialRef, UsageMode } from '@sumaris-net/ngx-components';
import { VesselPosition } from '../../position/vessel/vessel-position.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { Moment } from 'moment';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { APP_MAIN_CONTEXT_SERVICE, Context, ContextService } from '@app/shared/context.service';
import { Inject, Injectable, Optional } from '@angular/core';

export interface DataContext<T extends DataEntity<any> = DataEntity<any>> extends Context<T> {
  usageMode?: UsageMode;
  country?: ReferentialRef;
  date?: Moment;
  fishingAreas?: FishingArea[];
  vesselPositions?: VesselPosition[];
}

@Injectable()
export abstract class DataContextService<C extends DataContext = DataContext> extends ContextService<C> {
  protected constructor(@Optional() @Inject(APP_MAIN_CONTEXT_SERVICE) defaultState: Partial<C>) {
    super(defaultState);
  }
}
