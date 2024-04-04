import { ChangeDetectionStrategy, Component, Injector, OnInit } from '@angular/core';
import { BaseMap, BaseMapState } from '@app/shared/map/base-map.class';
import { RxState } from '@rx-angular/state';
import { DevicePositionMapState } from '@app/extraction/position/device-position-map-page.component';
import { Feature } from 'geojson';

export interface ActivityCalendarMapState extends BaseMapState {}
@Component({
  selector: 'app-activity-calendar-map',
  templateUrl: './activity-calendar-map.component.html',
  styleUrls: ['./activity-calendar-map.component.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityCalendarMapComponent extends BaseMap<ActivityCalendarMapState> implements OnInit {
  constructor(injector: Injector, state: RxState<DevicePositionMapState>) {
    super(
      injector,
      state,
      {
        maxZoom: 14, // TDO Config option ?
      },
      {
        loading: true,
      }
    );
  }

  ngOnInit() {
    super.ngOnInit();
  }

  protected load() {}

  protected onFeatureClick(feature: Feature) {}
}
