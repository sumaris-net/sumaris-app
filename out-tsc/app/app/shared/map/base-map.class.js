import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectorRef, Directive, Injector, Input, NgZone, Optional } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { L } from '@app/shared/map/leaflet';
import { ConfigService, firstNotNilPromise, isEmptyArray, LocalSettingsService, sleep } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { MapGraticule } from '@app/shared/map/map.graticule';
import { v4 as uuidv4 } from 'uuid';
import { MapUtils } from '@app/shared/map/map.utils';
import { RxState } from '@rx-angular/state';
import { TranslateService } from '@ngx-translate/core';
import { SelectionModel } from '@angular/cdk/collections';
let BaseMap = class BaseMap {
    constructor(injector, _state, options, initialState) {
        this._state = _state;
        this._logPrefix = `[${this.constructor.name}] : `;
        this.subscription = new Subscription();
        this.destroySubject = new Subject();
        this.center$ = this._state.select('center');
        this.loading$ = this._state.select('loading');
        // -- Map Layers --
        this.osmBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: MapUtils.MAX_ZOOM,
            attribution: '<a href=\'https://www.openstreetmap.org\'>Open Street Map</a>'
        });
        this.sextantBaseLayer = L.tileLayer('https://sextant.ifremer.fr/geowebcache/service/wmts'
            + '?Service=WMTS&Layer=sextant&Style=&TileMatrixSet=EPSG:3857&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix=EPSG:3857:{z}&TileCol={x}&TileRow={y}', {
            maxZoom: MapUtils.MAX_ZOOM,
            attribution: '<a href=\'https://sextant.ifremer.fr\'>Sextant</a>'
        });
        this.options = {
            layers: [this.sextantBaseLayer],
            maxZoom: MapUtils.MAX_ZOOM,
        };
        this.layersControl = {
            baseLayers: {
                'Sextant (Ifremer)': this.sextantBaseLayer,
                'Open Street Map': this.osmBaseLayer
            },
            overlays: {}
        };
        this.$onOverFeature = new Subject();
        this.$onOutFeature = new Subject();
        this.$selectedFeature = new BehaviorSubject(null);
        this.$fitToBounds = new Subject();
        this.selection = new SelectionModel(false, []);
        this.flyToBoundsDelay = 450;
        this.flyToBoundsDuration = 1; // seconds
        this.showGraticule = false;
        this.zone = injector.get(NgZone);
        this.translate = injector.get(TranslateService);
        this.configService = injector.get(ConfigService);
        this.settings = injector.get(LocalSettingsService);
        this.cd = injector.get(ChangeDetectorRef);
        this.mobile = this.settings.mobile;
        this._maxZoom = (options === null || options === void 0 ? void 0 : options.maxZoom) || MapUtils.MAX_ZOOM;
        this._debug = !environment.production;
        if (this._maxZoom !== MapUtils.MAX_ZOOM) {
            this.options.maxZoom = this._maxZoom;
            this.osmBaseLayer.options.maxZoom = this._maxZoom;
            this.sextantBaseLayer.options.maxZoom = this._maxZoom;
        }
        this._state.set(initialState || { loading: true });
    }
    get loading() {
        return this._state.get('loading');
    }
    ngOnInit() {
        // Default values
        this.latLongPattern = this.latLongPattern || this.settings.latLongFormat;
        this.mapId = uuidv4();
        this._state.connect('center', this.configService.config.pipe(map(config => MapUtils.getMapCenter(config))));
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
        this.destroySubject.next();
        this.destroySubject.unsubscribe();
    }
    setError(err) {
        this.error = (err === null || err === void 0 ? void 0 : err.message) || err;
        console.error(err);
        this.markForCheck();
    }
    onMapReady(map) {
        return __awaiter(this, void 0, void 0, function* () {
            console.info(this._logPrefix + 'Leaflet map is ready', map);
            // Create graticule
            if (this.showGraticule) {
                this.graticule = new MapGraticule({ latLngPattern: this.latLongPattern });
                this.graticule.addTo(map);
            }
            // Center map
            const { center, zoom } = yield firstNotNilPromise(this.center$, { stop: this.destroySubject });
            // Call ready in a timeout to let leaflet map to initialize
            setTimeout(() => {
                if (this.flyToBoundsDelay > 0 || this.flyToBoundsDuration > 0) {
                    if (center && (center.lat !== 0 || center.lng !== 0)) {
                        console.debug(`[extraction-map] Center: `, center);
                        map.setView(center, zoom);
                    }
                    else {
                        map.fitWorld();
                    }
                }
                this.map = map;
                this.load();
            });
        });
    }
    onEachFeature(feature, layer) {
        layer.on('mouseover', (_) => this.zone.run(() => this.$onOverFeature.next(feature)));
        layer.on('mouseout', (_) => this.zone.run(() => this.$onOutFeature.next(feature)));
        layer.on('click', (_) => this.zone.run(() => this.onFeatureClick(feature)));
    }
    cleanMapLayers() {
        (this.layers || []).forEach((layer) => this.map.removeLayer(layer));
        this.layers = [];
    }
    flyToBounds(opts = { skipDebounce: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!opts.skipDebounce && this.flyToBoundsDelay > 0) {
                if (!this.$fitToBounds.observers.length) {
                    this.subscription.add(this.$fitToBounds
                        .pipe(debounceTime(this.flyToBoundsDelay))
                        .subscribe(b => this.flyToBounds({ skipDebounce: true })));
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
            let bounds;
            this.layers
                .filter((layer) => layer instanceof L.GeoJSON)
                .forEach((layer) => {
                const layerBounds = layer.getBounds();
                if (layerBounds.isValid()) {
                    bounds = !bounds ? layerBounds : bounds.extend(layerBounds);
                }
            });
            this.goTo(bounds);
        });
    }
    goTo(bounds) {
        console.debug('[operations-map] Go to bounds:', bounds);
        if (bounds && bounds.isValid()) {
            if (this.flyToBoundsDuration <= 0) {
                this.map.fitBounds(bounds, { maxZoom: this._maxZoom });
                return;
            }
            else {
                try {
                    this.map.flyToBounds(bounds, { maxZoom: this._maxZoom, duration: this.flyToBoundsDuration });
                    return;
                }
                catch (err) {
                    console.error('Cannot go to bounds: ' + (err && err.message || err), bounds);
                }
            }
        }
        this.map.fitWorld();
    }
    registerSubscription(sub) {
        this.subscription.add(sub);
    }
    unregisterSubscription(sub) {
        this.subscription.remove(sub);
    }
    markAsLoading(opts) {
        this._state.set('loading', () => true);
        if (!opts || opts.emitEvent !== false) {
            this.markForCheck();
        }
    }
    markAsLoaded(opts) {
        this._state.set('loading', () => false);
        if (!opts || opts.emitEvent !== false) {
            this.markForCheck();
        }
    }
    markForCheck() {
        var _a;
        (_a = this.cd) === null || _a === void 0 ? void 0 : _a.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], BaseMap.prototype, "latLongPattern", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BaseMap.prototype, "flyToBoundsDelay", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BaseMap.prototype, "flyToBoundsDuration", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BaseMap.prototype, "showGraticule", void 0);
BaseMap = __decorate([
    Directive(),
    __param(2, Optional()),
    __metadata("design:paramtypes", [Injector,
        RxState, Object, Object])
], BaseMap);
export { BaseMap };
//# sourceMappingURL=base-map.class.js.map