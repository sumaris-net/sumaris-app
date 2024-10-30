import { ChangeDetectionStrategy, Component, Injector, OnInit } from '@angular/core';
import { BaseMap, BaseMapState } from '@app/shared/map/base-map.class';
import { RxState } from '@rx-angular/state';
import { DevicePositionMapState } from '@app/extraction/position/device-position-map-page.component';
import { Feature } from 'geojson';

export interface SpatialItemMapState extends BaseMapState {}

@Component({
  selector: 'app-spatial-item-map',
  templateUrl: './spatial-item-map.component.html',
  styleUrls: ['./spatial-item-map.component.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpatialItemMapComponent extends BaseMap<SpatialItemMapState> implements OnInit {
  protected mapPanelWidth = 30;
  protected showMapPanel = true;

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
