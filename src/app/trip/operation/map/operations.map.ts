import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import * as L from 'leaflet';
import { LayerGroup, MapOptions, PathOptions } from 'leaflet';
import {
  AppEditor,
  DateDiffDurationPipe,
  DateFormatPipe,
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
import { Operation, Trip, VesselPositionUtils } from '../../services/model/trip.model';
import { environment } from '@environments/environment';
import { LocationUtils } from '@app/referential/location/location.utils';
import { Geometries } from '@app/shared/geometries.utils';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';

export interface OperationsMapModalOptions {
  data: (Trip|Operation[])[];
  latLongPattern: LatLongPattern;
  programLabel: string;
}
const maxZoom = 18;

@Component({
  selector: 'app-operations-map',
  templateUrl: './operations.map.html',
  styleUrls: ['./operations.map.scss'],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationsMap extends AppEditor<Operation[]> implements OnInit, OnDestroy, OperationsMapModalOptions {

  private readonly $programLabel = new BehaviorSubject<string>(undefined);
  private readonly $program = new BehaviorSubject<Program>(undefined);

  // -- Map Layers --
  osmBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom,
    attribution: '<a href=\'https://www.openstreetmap.org\'>Open Street Map</a>'
  });
  sextantBaseLayer = L.tileLayer(
    'https://sextant.ifremer.fr/geowebcache/service/wmts'
      + '?Service=WMTS&Layer=sextant&Style=&TileMatrixSet=EPSG:3857&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix=EPSG:3857:{z}&TileCol={x}&TileRow={y}',
    {maxZoom, attribution: "<a href='https://sextant.ifremer.fr'>Sextant</a>"});

  options = <MapOptions>{
    layers: [this.sextantBaseLayer],
    maxZoom, // max zoom to sextant layer
  };
  layersControl = <LeafletControlLayersConfig>{
    baseLayers: {
      'Sextant (Ifremer)': this.sextantBaseLayer,
      'Open Street Map': this.osmBaseLayer
    },
    overlays: {
    }
  };

  map: L.Map;
  $onOverFeature = new Subject<Feature>();
  $onOutFeature = new Subject<Feature>();
  $selectedFeature = new BehaviorSubject<Feature>(null);
  modalReady = false; // Need to be false. Will be set to true after a delay
  vesselSnapshotAttributes: string[];
  destroySubject = new Subject();

  get isNewData(): boolean {
    return false;
  }

  get modalName(): string {
    return this.constructor.name;
  }

  @Input() modal = true;
  @Input() data: (Trip|Operation[])[];
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

  // TODO REMOVE THIS AFTER UPDATE OF ngx-component > 1.23.42
  get loaded(): boolean {
    return !this.loading;
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
    protected vesselSnapshotService: VesselSnapshotService,
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
          switchMap(programLabel => this.programRefService.watchByLabel(programLabel, {fetchPolicy: 'cache-first'})),
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
      .then(() => waitFor(() => !!this.map, {stop: this.destroySubject}))
      // Start
      .then(() => this.start());
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.destroySubject.next();
    this.destroySubject.unsubscribe();
  }

  onMapReady(leafletMap: L.Map) {
    console.info("[operations-map] Leaflet map is ready");
    this.map = leafletMap;
  }

  async cancel(_event?: Event) {
    await this.viewCtrl.dismiss(null, 'cancel');
  }

  protected getFirstInvalidTabIndex(): number {
    return 0;
  }

  /* -- protected functions -- */

  protected async start() {

    if (this.debug) console.debug("[operations-map] Starting...");
    this.markAsLoaded({emitEvent: false});

    // Wait program to be loaded
    const program = await firstNotNilPromise(this.$program, {stop: this.destroySubject});

    // Applying program defaults (center, zoom)
    await this.setProgram(program, {
      emitEvent: false // Refresh not need here, as not loading yet
    });

    // Get vessel display mode
    this.vesselSnapshotAttributes = (await this.vesselSnapshotService.getAutocompleteFieldOptions())?.attributes;

    // Load layers
    await this.loadLayers();
  }

  loadLayers(): Promise<void> {
    // Should never call load() without leaflet map
    if (!this.map) return; // Skip

    if (this.debug) console.debug('[operations-map] Creating layers...');
    this.markAsLoading();
    this.error = null;

    try {
      // Clean existing layers, if any
      this.cleanMapLayers();

      let bounds: L.LatLngBounds;

      (this.data || []).forEach(tripContent => {

        let tripCoordinates: Position[] = [];
        const trip = !Array.isArray(tripContent) ? tripContent : undefined;
        // Add trip layer to control
        const tripTitle = trip
          && this.translate.instant('TRIP.OPERATION.MAP.TRIP_LAYER_WITH_DETAILS', {
            vessel: joinPropertiesPath(trip.vesselSnapshot, this.vesselSnapshotAttributes),
            departureDateTime: this.dateFormatPipe.transform(trip.departureDateTime, { time: false })
          });

        const operations = Array.isArray(tripContent) ? tripContent : trip.operations;

        // Create a layer for all trip's operations
        const operationLayer = L.geoJSON(null, {
          onEachFeature: this.onEachFeature.bind(this),
          style: (feature) => this.getOperationLayerStyle(feature)
        });

        // Add each operation to layer
        (operations || [])
          .sort(EntityUtils.sortComparator('rankOrderOnPeriod', 'asc'))
          .forEach((ope, index) => {
            const feature = this.getOperationFeature(ope, index);
            if (!feature) return; // Skip if empty

            // Add trip to feature
            feature.properties.source = ope;
            if (tripTitle) feature.properties.trip = tripTitle;

            // Add feature to layer
            operationLayer.addData(feature);

            // Add to all position array
            if (Geometries.isLineString(feature.geometry)) {
              tripCoordinates = tripCoordinates.concat(feature.geometry.coordinates);
            }
          });

        // Add trip feature to layer
        if (tripCoordinates.length) {
          const tripLayer = L.geoJSON(<Feature>{
            type: 'Feature',
            id: 'trip',
            geometry: <LineString>{
              type: 'LineString',
              coordinates: tripCoordinates
            }
          }, {
            style: this.getTripLayerStyle()
          });

          // Add trip layer to control
          const tripLayerName = tripTitle || this.translate.instant('TRIP.OPERATION.MAP.TRIP_LAYER');
          this.layersControl.overlays[tripLayerName] = tripLayer;
          this.map.addLayer(tripLayer);
        }

        // Add operations layer to control
        const operationLayerName = tripTitle
        ? this.translate.instant('TRIP.OPERATION.MAP.OPERATIONS_LAYER_WITH_DETAILS', {
            trip: tripTitle
          })
        : this.translate.instant('TRIP.OPERATION.MAP.OPERATIONS_LAYER');
        this.layersControl.overlays[operationLayerName] = operationLayer;

        // Update layers bounds
        if (!bounds) {
          bounds = operationLayer.getBounds();
        } else {
          bounds.extend(operationLayer.getBounds());
        }

        this.map.addLayer(operationLayer);

      });

      if (bounds.isValid()) {
        this.map.fitBounds(bounds, {maxZoom: 10});
      }

    } catch (err) {
      console.error("[operations-map] Error while load layers:", err);
      this.error = err && err.message || err;
    } finally {
      this.markAsLoaded();
      this.markForCheck();
    }
  }


  async save(_event, _options?: any): Promise<any> {
    throw new Error('Nothing to save');
  }

  load(_id?: number, _options?: any): Promise<void> {
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
    if (isNil(feature?.id) || !this.data) return undefined;
    return this.data
      .map(tripContent => {
        const operations = Array.isArray(tripContent) ? tripContent : tripContent.operations;
        return (operations || []).find(ope => ope.id === feature.id);
      })
      .find(isNotNil) || undefined;
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

  protected getOperationLayerStyle(_feature?: Feature): PathOptions {
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
