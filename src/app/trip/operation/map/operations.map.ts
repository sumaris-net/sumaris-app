import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, NgZone, OnInit } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import * as L from 'leaflet';
import { CRS, LayerGroup, MapOptions, PathOptions, Polygon } from 'leaflet';
import {
  AppTabEditor,
  DateDiffDurationPipe,
  DateFormatPipe,
  EntityUtils,
  fadeInOutAnimation,
  firstNotNilPromise,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LatLongPattern,
  LocalSettingsService,
  PlatformService,
  sleep,
  waitFor
} from '@sumaris-net/ngx-components';
import { Feature, Geometry, LineString, MultiPolygon, Position } from 'geojson';
import { AlertController, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { distinctUntilChanged, filter, switchMap, tap, throttleTime } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgramProperties } from '../../../referential/services/config/program.config';
import { LeafletControlLayersConfig } from '@asymmetrik/ngx-leaflet/src/leaflet/layers/control/leaflet-control-layers-config.model';
import { ProgramRefService } from '../../../referential/services/program-ref.service';
import { Program } from '../../../referential/services/model/program.model';
import { Operation, VesselPositionUtils } from '../../services/model/trip.model';
import { environment } from '@environments/environment';
import { LocationLevels } from '@app/referential/services/model/model.enum';
import { LocationUtils } from '@app/referential/location/location.utils';
import { Geometries } from '@app/shared/geometries.utils';

export interface OperationsMapModalOptions {
  data: Operation[];
  latLongPattern: LatLongPattern;
  programLabel: string;
}

@Component({
  selector: 'app-operations-map',
  templateUrl: './operations.map.html',
  styleUrls: ['./operations.map.scss'],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationsMap extends AppTabEditor<Operation[]> implements OnInit, OperationsMapModalOptions {

  private readonly $programLabel = new BehaviorSubject<string>(undefined);
  private readonly $program = new BehaviorSubject<Program>(undefined);

  // -- Map Layers --
  osmBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '<a href=\'https://www.openstreetmap.org\'>Open Street Map</a>'
  });
  sextantBaseLayer = L.tileLayer(
    'https://sextant.ifremer.fr/geowebcache/service/wmts'
      + '?Service=WMTS&Layer=sextant&Style=&TileMatrixSet=EPSG:3857&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix=EPSG:3857:{z}&TileCol={x}&TileRow={y}',
    {maxZoom: 18, attribution: "<a href='https://sextant.ifremer.fr'>Sextant</a>"});
  sextantGraticuleLayer = L.tileLayer.wms('https://www.ifremer.fr/services/wms1', {
    maxZoom: 18,
    version: '1.3.0',
    crs: CRS.EPSG4326,
    format: "image/png",
    transparent: true
  }).setParams({
    layers: "graticule_4326",
    service: 'WMS'
  });

  options = <MapOptions>{
    layers: [this.sextantBaseLayer],
    maxZoom: 10, // max zoom to sextant layer
    zoom: 5, // (can be override by a program property)
    center: L.latLng(46.879966, -10) // Atlantic (can be override by a program property)
  };
  layersControl = <LeafletControlLayersConfig>{
    baseLayers: {
      'Sextant (Ifremer)': this.sextantBaseLayer,
      'Open Street Map': this.osmBaseLayer
    },
    overlays: {
      'Graticule': this.sextantGraticuleLayer
    }
  };
  map: L.Map;
  $layers = new BehaviorSubject<L.GeoJSON<L.Polygon>[]>(null);
  $onOverFeature = new Subject<Feature>();
  $onOutFeature = new Subject<Feature>();
  $selectedFeature = new BehaviorSubject<Feature>(null);
  modalReady = false; // Need to be false. Will be set to true after a delay

  get isNewData(): boolean {
    return false;
  }

  get modalName(): string {
    return this.constructor.name;
  }

  @Input() data: Operation[];
  @Input() latLongPattern: LatLongPattern;

  @Input()
  set programLabel(value: string) {
    if (isNotNil(value) && this.$programLabel.value !== value) {
      this.$programLabel.next(value);
    }
  }

  get programLabel(): string {
    return this.$programLabel.value;
  }

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected alertCtrl: AlertController,
    protected translate: TranslateService,
    protected platform: PlatformService,
    protected viewCtrl: ModalController,
    protected dateFormatPipe: DateFormatPipe,
    protected dateDiffDurationPipe: DateDiffDurationPipe,
    protected settings: LocalSettingsService,
    protected zone: NgZone,
    protected cd: ChangeDetectorRef,
    protected programRefService: ProgramRefService
  ) {
    super(route, router, alertCtrl, translate);

    this.debug = !environment.production;
  }

  ngOnInit() {

    this.registerSubscription(
      this.$programLabel
        .pipe(
          filter(isNotNilOrBlank),
          distinctUntilChanged(),
          switchMap(programLabel => this.programRefService.watchByLabel(programLabel)),
          tap(program => this.$program.next(program))
        )
        .subscribe());

    this.registerSubscription(
      this.$onOverFeature
        .pipe(
          throttleTime(200),
          filter(feature => feature !== this.$selectedFeature.value
            // Exclude rectangle feature
            && feature.geometry.type === 'LineString'),
          tap(feature => this.$selectedFeature.next(feature))
        ).subscribe());

    this.registerSubscription(
      this.$onOutFeature
        .pipe(
          throttleTime(5000),
          filter(feature => feature === this.$selectedFeature.value),
          tap(_ => this.$selectedFeature.next(undefined))
        ).subscribe());

    sleep(500)
      .then(() => {
        this.modalReady = true;
        this.markForCheck();
      })
      // Wait onMapReady to be called
      .then(() => waitFor(() => !!this.map))
      // Start
      .then(() => this.start());
  }

  onMapReady(leafletMap: L.Map) {
    console.info("[operations-map] Leaflet map is ready");
    this.map = leafletMap;
  }

  async cancel(event?: Event) {
    await this.viewCtrl.dismiss(null, 'cancel');
  }

  /* -- protected functions -- */

  protected async start() {

    if (this.debug) console.debug("[operations-map] Starting...");
    this.markAsLoaded({emitEvent: false});

    // Wait program to be loaded
    const program = await firstNotNilPromise(this.$program);

    // Applying program defaults (center, zoom)
    await this.setProgram(program, {
      emitEvent: false // Refresh not need here, as not loading yet
    });

    // Load layers
    await this.loadLayers();
  }

  loadLayers(): Promise<void> {
    // Should never call load() without leaflet map
    if (!this.map) return; // Skip

    if (this.debug) console.debug('[operations-map] Creating layers...', this.data);
    this.markAsLoading();
    this.error = null;

    try {
      // Clean existing layers, if any
      this.cleanMapLayers();

      const operationLayer = L.geoJSON(null, {
        onEachFeature: this.onEachFeature.bind(this),
        style: (feature) => this.getOperationLayerStyle(feature)
      });
      const layers = [operationLayer];
      let tripCoordinates: Position[] = [];

      // Add operation to layer
      (this.data || [])
        .sort(EntityUtils.sortComparator('rankOrderOnPeriod', 'asc'))
        .forEach((ope, index) => {
          const feature = this.getOperationFeature(ope, index);
          if (!feature) return; // Skip if empty

          // Add feature to layer
          operationLayer.addData(feature);

          // Add to all position array
          if (Geometries.isLineString(feature.geometry)) {
            tripCoordinates = tripCoordinates.concat(...feature.geometry.coordinates);
          }
        });

      // Add trip feature to layer
      if (tripCoordinates.length) {
        const tripLayer = L.geoJSON(null, {
          style: this.getTripLayerStyle()
        });
        layers.push(tripLayer)

        tripLayer.addData(<Feature>{
          type: "Feature",
          id: 'trip',
          geometry: <LineString>{
            type: "LineString",
            coordinates: tripCoordinates
          }
        });

        // Add trip layer to control
        const tripLayerName = this.translate.instant('TRIP.OPERATION.MAP.TRIP_LAYER');
        this.layersControl.overlays[tripLayerName] = tripLayer;

      }

      // Add operations layer to control
      const operationLayerName = this.translate.instant('TRIP.OPERATION.MAP.OPERATIONS_LAYER');
      this.layersControl.overlays[operationLayerName] = operationLayer;

      // Center to start position
      const operationBounds = operationLayer.getBounds();
      if (operationBounds.isValid()) {
        this.map.fitBounds(operationBounds, {maxZoom: 10});
      }

      // Refresh layer
      this.$layers.next(layers);
    } catch (err) {
      console.error("[operations-map] Error while load layers:", err);
      this.error = err && err.message || err;
    } finally {
      this.markAsLoaded();
      this.markForCheck();
    }
  }


  async save(event, options?: any): Promise<any> {
    throw new Error('Nothing to save');
  }

  load(id?: number, options?: any): Promise<void> {
    return this.loadLayers();
  }

  async reload(): Promise<any> {
    return this.load();
  }

  protected onEachFeature(feature: Feature, layer: L.Layer) {
    layer.on('mouseover', (_) => this.zone.run(() => this.$onOverFeature.next(feature)));
    layer.on('mouseout', (_) => this.zone.run(() => this.$onOutFeature.next(feature)));
    layer.on('click', (_) => this.zone.run(() => this.onFeatureClick(feature)));
  }

  protected onFeatureClick(feature: Feature) {
    const operation = this.getOperationFromFeature(feature);
    this.viewCtrl.dismiss(operation);
  }

  protected getOperationFromFeature(feature: Feature): Operation|undefined {
    return feature && (this.data || []).find(ope => ope.id === feature.id) || undefined;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected getTripLayerStyle(): PathOptions {
    return {
      weight: 2,
      opacity: 0.6,
      color: 'green'
    };
  }

  protected getOperationLayerStyle(feature?: Feature): PathOptions {
    return {
      weight: 10,
      opacity: 0.8,
      color: 'blue'
    };
  }

  protected async setProgram(program: Program, opts?: {emitEvent?: boolean; }) {
    if (!program) return; // Skip

    // Map center
    const centerCoords = program.getPropertyAsNumbers(ProgramProperties.TRIP_MAP_CENTER);
    if (isNotEmptyArray(centerCoords) && centerCoords.length === 2) {
      try {
        this.options.center = L.latLng(centerCoords as [number, number]);
      }
      catch(err) {
        console.error(err);
      }
    }

    // Map zoom
    const zoom = program.getProperty(ProgramProperties.TRIP_MAP_ZOOM);
    if (isNotNil(zoom)) {
      this.options.zoom = +zoom;
    }

    // Emit event
    if (!opts || opts.emitEvent !== false) {
      this.markForCheck();
    }
  }

  protected cleanMapLayers() {

    // Remove all layers (except first = graticule)
    Object.getOwnPropertyNames(this.layersControl.overlays)
      .forEach((layerName, index) => {
        if (index === 0) return; // We keep the graticule layer

        const existingLayer = this.layersControl.overlays[layerName] as LayerGroup<any>;
        existingLayer.remove();
        delete this.layersControl.overlays[layerName];
      });
  }

  protected getOperationFeature(ope: Operation, index: number): Feature {

    // Create feature
    const features = <Feature>{
      type: 'Feature',
      geometry: null, // Will be set later
      id: ope.id,
      properties: {
        first: index === 0,
        ...ope,
        // Replace date with a formatted date
        startDateTime: this.dateFormatPipe.transform(ope.startDateTime || ope.fishingStartDateTime, { time: true }),
        endDateTime: this.dateFormatPipe.transform(ope.endDateTime || ope.fishingEndDateTime, { time: true }),
        duration: this.dateDiffDurationPipe.transform({ startValue: ope.startDateTime|| ope.fishingStartDateTime, endValue: ope.endDateTime || ope.fishingEndDateTime}),
        // Add index
        index
      }
    };

    // Use lat/long positions
    let coordinates: [number, number][] = [ope.startPosition, ope.fishingStartPosition, ope.fishingEndPosition, ope.endPosition]
      .filter(VesselPositionUtils.isNoNilOrEmpty)
      .map(pos => [pos.longitude, pos.latitude]);
    features.geometry = coordinates.length && <LineString>{ type: "LineString", coordinates};

    // Use Fishing Areas
    if (!features.geometry) {
      const rectangleLabels: string[] = (ope.fishingAreas || [])
        .map(fa => fa && fa.location?.label)
        .filter(LocationUtils.isStatisticalRectangleLabel);
      features.geometry = rectangleLabels.length && <MultiPolygon>{
        type: 'MultiPolygon',
        coordinates: rectangleLabels.map(rect => LocationUtils.getGeometryFromRectangleLabel(rect))
          .map(geometry => geometry?.coordinates)
      };
    }

    if (!features.geometry) return undefined; // No geometry: skip

    return features;
  }


}
