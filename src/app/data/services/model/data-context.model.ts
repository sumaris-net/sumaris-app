import {ReferentialRef, UsageMode} from '@sumaris-net/ngx-components';
import {VesselPosition} from './vessel-position.model';
import {FishingArea} from '@app/data/services/model/fishing-area.model';
import {Moment} from 'moment';
import {DataEntity} from '@app/data/services/model/data-entity.model';
import {Clipboard, Context, CONTEXT_DEFAULT_STATE, ContextService} from '@app/shared/context.service';
import {Inject, Injectable, Optional} from '@angular/core';
import {Program} from '@app/referential/services/model/program.model';
import {Strategy} from '@app/referential/services/model/strategy.model';

export interface DataContext extends Context<DataEntity<any>> {
  usageMode?: UsageMode;
  country?: ReferentialRef;
  date?: Moment;
  fishingAreas?: FishingArea[];
  vesselPositions?: VesselPosition[];
}

@Injectable()
export abstract class DataContextService<S extends DataContext = DataContext> extends ContextService<S> {

  protected constructor(@Optional() @Inject(CONTEXT_DEFAULT_STATE) defaultState: S) {
    super(defaultState || <S>{});
  }
}
