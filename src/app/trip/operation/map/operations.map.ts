import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { L } from '@app/shared/map/leaflet';
import { MapOptions, PathOptions } from 'leaflet';
import {
  ConfigService,
  DateDiffDurationPipe,
  DateFormatService,
  EntityUtils,
  fadeInOutAnimation,
  firstNotNilPromise,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  joinPropertiesPath,
  LatLongPattern,
  LocalSettingsService,
  PlatformService,
  sleep
} from '@sumaris-net/ngx-components';
import { Feature, LineString, MultiPolygon, Position } from 'geojson';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap, throttleTime } from 'rxjs/operators';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { LeafletControlLayersConfig } from '@asymmetrik/ngx-leaflet';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { Program } from '@app/referential/services/model/program.model';
import { Operation, Trip, VesselPositionUtils } from '../../services/model/trip.model';
import { environment } from '@environments/environment';
import { LocationUtils } from '@app/referential/location/location.utils';
import { Geometries } from '@app/shared/geometries.utils';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';

import { MapGraticule } from '@app/shared/map/map.graticule';
import { v4 as uuidv4 } from 'uuid';
import { MapUtils } from '@app/shared/map/map.utils';

const maxZoom = MapUtils.MAX_ZOOM;

@Component({
  selector: 'app-operations-map',
  templateUrl: './operations.map.html',
  styleUrls: ['./operations.map.scss'],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationsMap implements OnInit, OnDestroy {

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

  protected readonly subscription = new Subscription();
  protected readonly destroySubject = new Subject();
  protected readonly loadingSubject = new BehaviorSubject<boolean>(true);
  protected layers: L.Layer[];
  protected graticule: MapGraticule;
  protected $center = new BehaviorSubject<{center: L.LatLng, zoom: number}>(undefined);

  debug: boolean;
  map: L.Map;
  mapId: string;
  error: string;
  $onOverFeature = new Subject<Feature>();
  $onOutFeature = new Subject<Feature>();
  $selectedFeature = new BehaviorSubject<Feature>(null);
  $fitToBounds = new Subject<L.LatLngBounds>();
  vesselSnapshotAttributes: string[];

  @Input() showTooltip: boolean;
  @Input() data: (Trip|Operation[])[];
  @Input() latLongPattern: LatLongPattern;
  @Input() flyToBoundsDelay = 450;
  @Input() flyToBoundsDuration = 1; // seconds
  @Input() showGraticule = false;
  @Input() showTripTarget = true;

  @Input()
  set programLabel(value: string) {
    if (isNotNil(value) && this.$programLabel.value !== value) {
      this.$programLabel.next(value);
    }
  }

  get programLabel(): string {
    return this.$programLabel.value;
  }

  @Output('ready') onReady = new EventEmitter();
  @Output('operationClick') onOperationClick = new EventEmitter<Operation>();

  constructor(
    protected translate: TranslateService,
    protected platform: PlatformService,
    protected viewCtrl: ModalController,
    protected dateFormat: DateFormatService,
    protected dateDiffDurationPipe: DateDiffDurationPipe,
    protected settings: LocalSettingsService,
    protected configService: ConfigService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected zone: NgZone,
    protected cd: ChangeDetectorRef,
    protected programRefService: ProgramRefService
  ) {

    this.debug = !environment.production;
  }


  ngOnInit() {
    // Default values
    this.latLongPattern = this.latLongPattern || this.settings.latLongFormat;
    this.mapId = uuidv4();


    this.subscription.add(
      this.$programLabel
        .pipe(
          filter(isNotNilOrBlank),
          distinctUntilChanged(),
          switchMap(programLabel => this.programRefService.watchByLabel(programLabel, {fetchPolicy: 'cache-first'})),
          tap(program => this.$program.next(program))
        )
        .subscribe());

    this.subscription.add(
      this.configService.config.subscribe(config => this.$center.next(MapUtils.getMapCenter(config)))
    );

    if (this.showTooltip) {
      this.subscription.add(
        this.$onOverFeature
          .pipe(
            throttleTime(200),
            filter(feature => feature !== this.$selectedFeature.value
              // Exclude rectangle feature
              && feature.geometry.type === 'LineString'),
            tap(feature => this.$selectedFeature.next(feature))
          ).subscribe());

      this.subscription.add(
        this.$onOutFeature
          .pipe(
            throttleTime(5000),
            filter(feature => feature === this.$selectedFeature.value),
            tap(_ => this.$selectedFeature.next(undefined))
          ).subscribe());
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.destroySubject.next();
    this.destroySubject.unsubscribe();
  }

  async onMapReady(map: L.Map) {
    console.info("[operations-map] Leaflet map is ready", map);

    // Create graticule
    if (this.showGraticule) {
      this.graticule = new MapGraticule({latLngPattern: this.latLongPattern});
      this.graticule.addTo(map);
    }

    // Center map
    const { center, zoom } = await firstNotNilPromise(this.$center, { stop: this.destroySubject });

    // Call ready in a timeout to let leaflet map to initialize
    setTimeout(() => {
      if (this.flyToBoundsDelay > 0 || this.flyToBoundsDuration > 0) {
        if (center && (center.lat !== 0 || center.lng !== 0)) {
          console.debug(`[extraction-map] Center: `, center);
          map.setView(center, zoom);
        } else {
          map.fitWorld();
        }
      }
      this.map = map;

      this.load();
    });
  }

  /* -- protected functions -- */

  protected async load() {

    if (this.debug) console.debug("[operations-map] Loading...");
    this.loadingSubject.next(true);
    this.error = null;

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

    this.onReady.next();
    this.loadingSubject.next(false);
  }

  async loadLayers(): Promise<void> {
    // Should never call load() without leaflet map
    if (!this.map) return; // Skip

    if (this.debug) console.debug('[operations-map] Creating layers...');

    try {
      // Clean existing layers, if any
      this.cleanMapLayers();

      (this.data || []).forEach(tripContent => {

        let tripCoordinates: Position[] = [];
        const trip = !Array.isArray(tripContent) ? tripContent : undefined;
        // Add trip layer to control
        const tripTitle = trip
          && this.translate.instant('TRIP.OPERATION.MAP.TRIP_LAYER_WITH_DETAILS', {
            vessel: joinPropertiesPath(trip.vesselSnapshot, this.vesselSnapshotAttributes),
            departureDateTime: this.dateFormat.transform(trip.departureDateTime, { time: false })
          });

        const operations = Array.isArray(tripContent) ? tripContent : trip.operations;

        // Create a layer for all trip's operations
        const operationLayer = L.geoJSON(null, {
          onEachFeature: this.showTooltip ? this.onEachFeature.bind(this) : undefined,
          style: (feature) => this.getOperationLayerStyle(feature)
        });
        this.layers.push(operationLayer);

        // Add each operation to layer
        (operations || [])
          .sort(EntityUtils.sortComparator('rankOrder', 'asc'))
          .forEach((ope, index) => {
            const feature = this.getOperationFeature(ope, index);
            if (!feature) return; // Skip if empty

            // Add trip to feature
            feature.properties.source = ope;
            if (tripTitle) feature.properties.trip = tripTitle;

            // Add feature to layer
            operationLayer.addData(feature);

            // Add to all position array
            if (this.showTripTarget && Geometries.isLineString(feature.geometry))  {
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
          this.layers.push(tripLayer);

          // Add trip layer to control
          const tripLayerName = tripTitle || this.translate.instant('TRIP.OPERATION.MAP.TRIP_LAYER');
          this.layersControl.overlays[tripLayerName] = tripLayer;
        }

        // Add operations layer to control
        const operationLayerName = tripTitle
        ? this.translate.instant('TRIP.OPERATION.MAP.OPERATIONS_LAYER_WITH_DETAILS', {
            trip: tripTitle
          })
        : this.translate.instant('TRIP.OPERATION.MAP.OPERATIONS_LAYER');
        this.layersControl.overlays[operationLayerName] = operationLayer;

      });

      this.layers.forEach(layer => layer.addTo(this.map));

      await this.flyToBounds();

    } catch (err) {
      console.error("[operations-map] Error while load layers:", err);
      this.error = err && err.message || err;
    } finally {
      this.markForCheck();
    }
  }

  protected onEachFeature(feature: Feature, layer: L.Layer) {
    layer.on('mouseover', (_) => this.zone.run(() => this.$onOverFeature.next(feature)));
    layer.on('mouseout', (_) => this.zone.run(() => this.$onOutFeature.next(feature)));
    layer.on('click', (_) => this.zone.run(() => this.onFeatureClick(feature)));
  }

  protected onFeatureClick(feature: Feature) {
    const operation = this.getOperationFromFeature(feature);
    this.onOperationClick.emit(operation);
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

    (this.layers || []).forEach((layer) => this.map.removeLayer(layer));
    this.layers = [];
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
        startDateTime: this.dateFormat.transform(ope.startDateTime || ope.fishingStartDateTime, { time: true }),
        endDateTime: this.dateFormat.transform(ope.endDateTime || ope.fishingEndDateTime, { time: true }),
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

  async flyToBounds(opts = {skipDebounce : false}): Promise<void> {

    if (!opts.skipDebounce && this.flyToBoundsDelay > 0) {
      if (!this.$fitToBounds.observers.length) {
        this.subscription.add(
          this.$fitToBounds
            .pipe(
              debounceTime(this.flyToBoundsDelay)
            )
            .subscribe(b => this.flyToBounds({skipDebounce: true}))
        );
      }

      this.$fitToBounds.next();

      // Wait end of fit
      return sleep(this.flyToBoundsDelay + this.flyToBoundsDuration);
    }

    if (isEmptyArray(this.layers)) {
      console.debug('[operations-map] Skip fit to bounds (no layers)');
      return;
    }

    // Create bounds, from layers
    let bounds: L.LatLngBounds;
    this.layers
      .filter((layer) => layer instanceof L.GeoJSON)
      .forEach((layer) => {
        const layerBounds = (layer as L.GeoJSON).getBounds();
        if (layerBounds.isValid()) {
          bounds = !bounds ? layerBounds : bounds.extend(layerBounds);
        }
      });

    this.goTo(bounds);
  }

  protected goTo(bounds: L.LatLngBounds) {
    console.debug('[operations-map] Go to bounds:', bounds);
    if (bounds && bounds.isValid()) {
      if (this.flyToBoundsDuration <= 0) {
        this.map.fitBounds(bounds, { maxZoom } );
        return;
      }
      else {
        try {
          this.map.flyToBounds(bounds, { maxZoom, duration: this.flyToBoundsDuration });
          return;
        }
        catch(err) {
          console.error('Cannot go to bounds: ' +( err && err.message || err ), bounds);
        }
      }
    }

    this.map.fitWorld();
  }
}
