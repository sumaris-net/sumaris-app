import { ChangeDetectorRef, Directive, Injector, Input, NgZone, OnDestroy, OnInit, Optional } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { L } from '@app/shared/map/leaflet';
import { MapOptions } from 'leaflet';
import { ConfigService, firstNotNilPromise, isEmptyArray, LatLongPattern, LocalSettingsService, sleep } from '@sumaris-net/ngx-components';
import { Feature } from 'geojson';
import { debounceTime } from 'rxjs/operators';
import { LeafletControlLayersConfig } from '@asymmetrik/ngx-leaflet';
import { environment } from '@environments/environment';

import { MapGraticule } from '@app/shared/map/map.graticule';
import { v4 as uuidv4 } from 'uuid';
import { MapCenter, MapUtils } from '@app/shared/map/map.utils';
import { RxState } from '@rx-angular/state';

const maxZoom = MapUtils.MAX_ZOOM;

export interface BaseMapState {
  center: MapCenter;
  loading: boolean;
}

@Directive()
export abstract class BaseMap<S extends BaseMapState> implements OnInit, OnDestroy {

  protected _logPrefix = `[${this.constructor.name}] : `;
  protected readonly _debug: boolean;
  protected readonly _maxZoom: number;
  protected readonly subscription = new Subscription();
  protected readonly destroySubject = new Subject();
  protected readonly mobile: boolean;
  protected settingsId:string;
  protected error: string;

  protected readonly center$ = this._state.select('center');
  protected readonly loading$ = this._state.select('loading');

  protected readonly configService: ConfigService;
  protected readonly settings: LocalSettingsService;
  protected readonly cd: ChangeDetectorRef;
  protected readonly zone: NgZone;

  // -- Map Layers --
  protected osmBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom,
    attribution: '<a href=\'https://www.openstreetmap.org\'>Open Street Map</a>'
  });
  protected sextantBaseLayer = L.tileLayer(
    'https://sextant.ifremer.fr/geowebcache/service/wmts'
    + '?Service=WMTS&Layer=sextant&Style=&TileMatrixSet=EPSG:3857&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix=EPSG:3857:{z}&TileCol={x}&TileRow={y}',
    {maxZoom, attribution: "<a href='https://sextant.ifremer.fr'>Sextant</a>"});

  protected options = <MapOptions>{
    layers: [this.sextantBaseLayer],
    maxZoom, // max zoom to sextant layer
  };
  protected layersControl = <LeafletControlLayersConfig>{
    baseLayers: {
      'Sextant (Ifremer)': this.sextantBaseLayer,
      'Open Street Map': this.osmBaseLayer
    },
    overlays: {
    }
  };


  protected layers: L.Layer[];
  protected graticule: MapGraticule;
  protected $onOverFeature = new Subject<Feature>();
  protected $onOutFeature = new Subject<Feature>();
  protected $selectedFeature = new BehaviorSubject<Feature>(null);
  protected $fitToBounds = new Subject<L.LatLngBounds>();

  protected map: L.Map;
  protected mapId: string;

  @Input() latLongPattern: LatLongPattern;
  @Input() flyToBoundsDelay = 450;
  @Input() flyToBoundsDuration = 1; // seconds
  @Input() showGraticule = false;

  get loading(): boolean {
    return this._state.get('loading');
  }

  protected constructor(
    injector:Injector,
    protected _state: RxState<S>,
    @Optional() options?: {
      maxZoom: number;
    }
  ) {
    this.zone = injector.get(NgZone);
    this.settings = injector.get(LocalSettingsService);
    this.configService = injector.get(ConfigService);
    this.cd = injector.get(ChangeDetectorRef);
    this.mobile = this.settings.mobile;

    this._maxZoom = options?.maxZoom || MapUtils.MAX_ZOOM;
    this._debug = !environment.production;
  }

  ngOnInit() {
    // Default values
    this.latLongPattern = this.latLongPattern || this.settings.latLongFormat;
    this.mapId = uuidv4();

    this._state.connect('center', this.configService.config.pipe(
        map(config => MapUtils.getMapCenter(config))
      ));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.destroySubject.next();
    this.destroySubject.unsubscribe();
  }

  setError(err: any) {
    this.error = err?.message || err;
    console.error(err);
    this.markForCheck();
  }

  async onMapReady(map: L.Map) {
    console.info(this._logPrefix + 'Leaflet map is ready', map);

    // Create graticule
    if (this.showGraticule) {
      this.graticule = new MapGraticule({latLngPattern: this.latLongPattern});
      this.graticule.addTo(map);
    }

    // Center map
    const { center, zoom } = await firstNotNilPromise(this.center$, { stop: this.destroySubject });

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

  protected abstract load();

  protected abstract onFeatureClick(feature: Feature);

  protected onEachFeature(feature: Feature, layer: L.Layer) {
    layer.on('mouseover', (_) => this.zone.run(() => this.$onOverFeature.next(feature)));
    layer.on('mouseout', (_) => this.zone.run(() => this.$onOutFeature.next(feature)));
    layer.on('click', (_) => this.zone.run(() => this.onFeatureClick(feature)));
  }

  protected cleanMapLayers() {
    (this.layers || []).forEach((layer) => this.map.removeLayer(layer));
    this.layers = [];
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

  protected registerSubscription(sub: Subscription) {
    this.subscription.add(sub);
  }

  protected markAsLoading(opts?: {emitEvent?: boolean}) {
    this._state.set('loading', () => true);
    if (!opts || opts.emitEvent !== false) {
      this.markForCheck();
    }
  }

  protected markAsLoaded(opts?: {emitEvent?: boolean}) {
    this._state.set('loading', () => false);
    if (!opts || opts.emitEvent !== false) {
      this.markForCheck();
    }
  }

  protected markForCheck() {
    this.cd?.markForCheck();
  }
}
