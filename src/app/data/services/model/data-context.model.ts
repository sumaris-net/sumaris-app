import { UsageMode } from '@sumaris-net/ngx-components';
import { VesselPosition } from './vessel-position.model';
import { FishingArea } from '@app/data/services/model/fishing-area.model';
import { Moment } from 'moment';

export interface DataContext {
  usageMode?: UsageMode;
  date?: Moment;
  fishingAreas?: FishingArea[];
  vesselPositions?: VesselPosition[];
}
