import { ReferentialRef, UsageMode } from '@sumaris-net/ngx-components';
import { VesselPosition } from './vessel-position.model';
import { FishingArea } from '@app/data/services/model/fishing-area.model';
import { Moment } from 'moment';
import { DataEntity } from '@app/data/services/model/data-entity.model';
export interface DataClipboard {
  data?: DataEntity<any>;
  pasteFlags?: number;
}

export interface DataContext {
  usageMode?: UsageMode;
  country?: ReferentialRef;
  date?: Moment;
  fishingAreas?: FishingArea[];
  vesselPositions?: VesselPosition[];
  clipboard?: DataClipboard;
}
