import { ReferentialRef, UsageMode } from '@sumaris-net/ngx-components';
import { VesselPosition } from './vessel-position.model';
import { FishingArea } from '@app/data/services/model/fishing-area.model';
import { Moment } from 'moment';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { ContextService } from '@app/shared/context.service';
import { Directive, Injectable } from '@angular/core';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { Operation, Trip } from '@app/trip/services/model/trip.model';
import { TripContext } from '@app/trip/services/trip-context.service';
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

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class DataContextService<S extends DataContext = DataContext> extends ContextService<S> {

  protected constructor(defaultState: S) {
    super(defaultState);
  }

  get clipboard(): DataClipboard|undefined {
    return this.getValue('clipboard') as DataClipboard;
  }

  get program(): Program|undefined {
    return this.getValue('program') as unknown as Program;
  }

  get strategy(): Strategy|undefined {
    return this.getValue('strategy') as unknown as  Strategy;
  }
}
