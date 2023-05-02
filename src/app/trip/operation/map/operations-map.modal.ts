import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { BehaviorSubject, from, Subject } from 'rxjs';
import { L } from '@app/shared/map/leaflet';
import { LayerGroup, MapOptions, PathOptions } from 'leaflet';
import {
  AppEditor,
  DateDiffDurationPipe,
  DateFormatService,
  EntityUtils,
  fadeInOutAnimation,
  firstNotNilPromise,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  joinPropertiesPath,
  LatLongPattern,
  LocalSettingsService,
  PlatformService,
  sleep,
  waitFor
} from '@sumaris-net/ngx-components';
import { Feature, LineString, MultiPolygon, Position } from 'geojson';
import { AlertController, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { distinctUntilChanged, filter, switchMap, tap, throttleTime } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { LeafletControlLayersConfig } from '@asymmetrik/ngx-leaflet';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { Program } from '@app/referential/services/model/program.model';
import { Operation, Trip, VesselPositionUtils } from '../../trip/trip.model';
import { environment } from '@environments/environment';
import { LocationUtils } from '@app/referential/location/location.utils';
import { Geometries } from '@app/shared/geometries.utils';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';

export interface OperationsMapModalOptions {
  data: (Trip|Operation[])[];
  latLongPattern: LatLongPattern;
  programLabel: string;

  showToolbar?: boolean;
  showTooltip?: boolean;
}

@Component({
  selector: 'app-operations-map-modal',
  templateUrl: './operations-map.modal.html',
  styleUrls: ['./operations-map.modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationsMapModal implements OnInit, OperationsMapModalOptions {

  debug: boolean;
  modalReady = false; // Need to be false. Will be set to true after a delay

  get modalName(): string {
    return this.constructor.name;
  }

  @Input() showToolbar = true;
  @Input() showTooltip = true;
  @Input() data: (Trip|Operation[])[];
  @Input() latLongPattern: LatLongPattern;
  @Input() programLabel: string;

  constructor(
    protected viewCtrl: ModalController,
    protected cd: ChangeDetectorRef,
    protected programRefService: ProgramRefService
  ) {

    this.debug = !environment.production;
  }

  ngOnInit() {
    sleep(500)
      .then(() => {
        console.debug('[operation-map-modal] Modal is ready: starting map...')
        this.modalReady = true;
        this.cd.markForCheck();
      });
  }

  async cancel(_event?: Event) {
    await this.viewCtrl.dismiss(null, 'cancel');
  }

  onOperationClick(operation: Operation) {
    console.log('CLICK', operation);
    return this.viewCtrl.dismiss(operation);
  }
}
