import { ReferentialRef, UsageMode } from '@sumaris-net/ngx-components';
import { VesselPosition } from '../../position/vessel/vessel-position.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { Moment } from 'moment';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { CONTEXT_DEFAULT_STATE, ContextService } from '@app/shared/context.service';
import { Inject, Injectable, Optional } from '@angular/core';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';

export interface DataClipboard {
  data?: DataEntity<any>;
  pasteFlags?: number;
}

export interface DataContext {
  program?: Program;
  strategy?: Strategy;
  clipboard?: DataClipboard;
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

  get clipboard(): DataClipboard|undefined {
    return this.get('clipboard') as DataClipboard;
  }

  get program(): Program|undefined {
    return this.get('program');
  }

  get strategy(): Strategy|undefined {
    return this.get('strategy');
  }
}
