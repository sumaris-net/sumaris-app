import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, NgZone, Output } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { L } from '@app/shared/map/leaflet';
import { ConfigService, DateDiffDurationPipe, DateFormatService, EntityUtils, fadeInOutAnimation, firstNotNilPromise, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, joinPropertiesPath, LocalSettingsService, PlatformService, sleep, } from '@sumaris-net/ngx-components';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap, throttleTime } from 'rxjs/operators';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { VesselPositionUtils } from '../../trip/trip.model';
import { environment } from '@environments/environment';
import { LocationUtils } from '@app/referential/location/location.utils';
import { Geometries } from '@app/shared/geometries.utils';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { MapGraticule } from '@app/shared/map/map.graticule';
import { v4 as uuidv4 } from 'uuid';
import { MapUtils } from '@app/shared/map/map.utils';
const maxZoom = MapUtils.MAX_ZOOM;
let OperationsMap = class OperationsMap {
    constructor(translate, platform, viewCtrl, dateFormat, dateDiffDurationPipe, settings, configService, vesselSnapshotService, zone, cd, programRefService) {
        this.translate = translate;
        this.platform = platform;
        this.viewCtrl = viewCtrl;
        this.dateFormat = dateFormat;
        this.dateDiffDurationPipe = dateDiffDurationPipe;
        this.settings = settings;
        this.configService = configService;
        this.vesselSnapshotService = vesselSnapshotService;
        this.zone = zone;
        this.cd = cd;
        this.programRefService = programRefService;
        this.$programLabel = new BehaviorSubject(undefined);
        this.$program = new BehaviorSubject(undefined);
        // -- Map Layers --
        this.osmBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom,
            attribution: '<a href=\'https://www.openstreetmap.org\'>Open Street Map</a>'
        });
        this.sextantBaseLayer = L.tileLayer('https://sextant.ifremer.fr/geowebcache/service/wmts'
            + '?Service=WMTS&Layer=sextant&Style=&TileMatrixSet=EPSG:3857&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix=EPSG:3857:{z}&TileCol={x}&TileRow={y}', { maxZoom, attribution: '<a href=\'https://sextant.ifremer.fr\'>Sextant</a>' });
        this.options = {
            layers: [this.sextantBaseLayer],
            maxZoom, // max zoom to sextant layer
        };
        this.layersControl = {
            baseLayers: {
                'Sextant (Ifremer)': this.sextantBaseLayer,
                'Open Street Map': this.osmBaseLayer
            },
            overlays: {}
        };
        this.subscription = new Subscription();
        this.destroySubject = new Subject();
        this.loadingSubject = new BehaviorSubject(true);
        this.$center = new BehaviorSubject(undefined);
        this.$onOverFeature = new Subject();
        this.$onOutFeature = new Subject();
        this.$selectedFeature = new BehaviorSubject(null);
        this.$fitToBounds = new Subject();
        this.flyToBoundsDelay = 450;
        this.flyToBoundsDuration = 1; // seconds
        this.showGraticule = false;
        this.showTripLayer = true;
        this.ready = new EventEmitter();
        this.operationClick = new EventEmitter();
        this.debug = !environment.production;
    }
    set programLabel(value) {
        if (isNotNil(value) && this.$programLabel.value !== value) {
            this.$programLabel.next(value);
        }
    }
    get programLabel() {
        return this.$programLabel.value;
    }
    ngOnInit() {
        // Default values
        this.latLongPattern = this.latLongPattern || this.settings.latLongFormat;
        this.mapId = uuidv4();
        this.subscription.add(this.$programLabel
            .pipe(filter(isNotNilOrBlank), distinctUntilChanged(), switchMap(programLabel => this.programRefService.watchByLabel(programLabel, { fetchPolicy: 'cache-first' })), tap(program => this.$program.next(program)))
            .subscribe());
        this.subscription.add(this.configService.config.subscribe(config => this.$center.next(MapUtils.getMapCenter(config))));
        if (this.showTooltip) {
            this.subscription.add(this.$onOverFeature
                .pipe(throttleTime(200), filter(feature => feature !== this.$selectedFeature.value
                // Exclude rectangle feature
                && feature.geometry.type === 'LineString'), tap(feature => this.$selectedFeature.next(feature))).subscribe());
            this.subscription.add(this.$onOutFeature
                .pipe(throttleTime(5000), filter(feature => feature === this.$selectedFeature.value), tap(_ => this.$selectedFeature.next(undefined))).subscribe());
        }
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
        this.destroySubject.next();
        this.destroySubject.unsubscribe();
    }
    onMapReady(map) {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[operations-map] Leaflet map is ready', map);
            // Create graticule
            if (this.showGraticule) {
                this.graticule = new MapGraticule({ latLngPattern: this.latLongPattern });
                this.graticule.addTo(map);
            }
            // Center map
            const { center, zoom } = yield firstNotNilPromise(this.$center, { stop: this.destroySubject });
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
    /* -- protected functions -- */
    load() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug('[operations-map] Loading...');
            this.loadingSubject.next(true);
            this.error = null;
            // Wait program to be loaded
            const program = yield firstNotNilPromise(this.$program, { stop: this.destroySubject });
            // Applying program defaults (center, zoom)
            yield this.setProgram(program, {
                emitEvent: false // Refresh not need here, as not loading yet
            });
            // Get vessel display mode
            this.vesselSnapshotAttributes = (_a = (yield this.vesselSnapshotService.getAutocompleteFieldOptions())) === null || _a === void 0 ? void 0 : _a.attributes;
            // Load layers
            yield this.loadLayers();
            this.ready.next();
            this.loadingSubject.next(false);
        });
    }
    loadLayers() {
        return __awaiter(this, void 0, void 0, function* () {
            // Should never call load() without leaflet map
            if (!this.map)
                return; // Skip
            if (this.debug)
                console.debug('[operations-map] Creating layers...');
            try {
                // Clean existing layers, if any
                this.cleanMapLayers();
                (this.data || []).forEach(tripContent => {
                    let tripCoordinates = [];
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
                        if (!feature)
                            return; // Skip if empty
                        // Add trip to feature
                        feature.properties.source = ope;
                        if (tripTitle)
                            feature.properties.trip = tripTitle;
                        // Add feature to layer
                        operationLayer.addData(feature);
                        // Add to all position array
                        if (this.showTripLayer && Geometries.isLineString(feature.geometry)) {
                            tripCoordinates = tripCoordinates.concat(feature.geometry.coordinates);
                        }
                    });
                    // Add trip feature to layer
                    if (tripCoordinates.length) {
                        const tripLayer = L.geoJSON({
                            type: 'Feature',
                            id: 'trip',
                            geometry: {
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
                yield this.flyToBounds();
            }
            catch (err) {
                console.error('[operations-map] Error while load layers:', err);
                this.error = err && err.message || err;
            }
            finally {
                this.markForCheck();
            }
        });
    }
    onEachFeature(feature, layer) {
        layer.on('mouseover', (_) => this.zone.run(() => this.$onOverFeature.next(feature)));
        layer.on('mouseout', (_) => this.zone.run(() => this.$onOutFeature.next(feature)));
        layer.on('click', (_) => this.zone.run(() => this.onFeatureClick(feature)));
    }
    onFeatureClick(feature) {
        const operation = this.getOperationFromFeature(feature);
        this.operationClick.emit(operation);
    }
    getOperationFromFeature(feature) {
        if (isNil(feature === null || feature === void 0 ? void 0 : feature.id) || !this.data)
            return undefined;
        return this.data
            .map(tripContent => {
            const operations = Array.isArray(tripContent) ? tripContent : tripContent.operations;
            return (operations || []).find(ope => ope.id === feature.id);
        })
            .find(isNotNil) || undefined;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    getTripLayerStyle() {
        return {
            weight: 2,
            opacity: 0.6,
            color: 'green'
        };
    }
    getOperationLayerStyle(_feature) {
        return {
            weight: 10,
            opacity: 0.8,
            color: 'blue'
        };
    }
    setProgram(program, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!program)
                return; // Skip
            // Map center
            const centerCoords = program.getPropertyAsNumbers(ProgramProperties.TRIP_MAP_CENTER);
            if (isNotEmptyArray(centerCoords) && centerCoords.length === 2) {
                try {
                    this.options.center = L.latLng(centerCoords);
                }
                catch (err) {
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
        });
    }
    cleanMapLayers() {
        (this.layers || []).forEach((layer) => this.map.removeLayer(layer));
        this.layers = [];
    }
    getOperationFeature(ope, index) {
        // Create feature
        const features = {
            type: 'Feature',
            geometry: null,
            id: ope.id,
            properties: Object.assign(Object.assign({ first: index === 0 }, ope), { 
                // Replace date with a formatted date
                startDateTime: this.dateFormat.transform(ope.startDateTime || ope.fishingStartDateTime, { time: true }), endDateTime: this.dateFormat.transform(ope.endDateTime || ope.fishingEndDateTime, { time: true }), duration: this.dateDiffDurationPipe.transform({ startValue: ope.startDateTime || ope.fishingStartDateTime, endValue: ope.endDateTime || ope.fishingEndDateTime }), 
                // Add index
                index })
        };
        // Use lat/long positions
        const coordinates = [ope.startPosition, ope.fishingStartPosition, ope.fishingEndPosition, ope.endPosition]
            .filter(VesselPositionUtils.isNoNilOrEmpty)
            .map(pos => [pos.longitude, pos.latitude]);
        features.geometry = coordinates.length && { type: 'LineString', coordinates };
        // Use Fishing Areas
        if (!features.geometry) {
            const rectangleLabels = (ope.fishingAreas || [])
                .map(fa => { var _a; return fa && ((_a = fa.location) === null || _a === void 0 ? void 0 : _a.label); })
                .filter(LocationUtils.isStatisticalRectangleLabel);
            features.geometry = rectangleLabels.length && {
                type: 'MultiPolygon',
                coordinates: rectangleLabels.map(rect => LocationUtils.getGeometryFromRectangleLabel(rect))
                    .map(geometry => geometry === null || geometry === void 0 ? void 0 : geometry.coordinates)
            };
        }
        if (!features.geometry)
            return undefined; // No geometry: skip
        return features;
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
                this.map.fitBounds(bounds, { maxZoom });
                return;
            }
            else {
                try {
                    this.map.flyToBounds(bounds, { maxZoom, duration: this.flyToBoundsDuration });
                    return;
                }
                catch (err) {
                    console.error('Cannot go to bounds: ' + (err && err.message || err), bounds);
                }
            }
        }
        this.map.fitWorld();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], OperationsMap.prototype, "showTooltip", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], OperationsMap.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationsMap.prototype, "latLongPattern", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationsMap.prototype, "flyToBoundsDelay", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationsMap.prototype, "flyToBoundsDuration", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationsMap.prototype, "showGraticule", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationsMap.prototype, "showTripLayer", void 0);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], OperationsMap.prototype, "programLabel", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], OperationsMap.prototype, "ready", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], OperationsMap.prototype, "operationClick", void 0);
OperationsMap = __decorate([
    Component({
        selector: 'app-operations-map',
        templateUrl: './operations.map.html',
        styleUrls: ['./operations.map.scss'],
        animations: [fadeInOutAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [TranslateService,
        PlatformService,
        ModalController,
        DateFormatService,
        DateDiffDurationPipe,
        LocalSettingsService,
        ConfigService,
        VesselSnapshotService,
        NgZone,
        ChangeDetectorRef,
        ProgramRefService])
], OperationsMap);
export { OperationsMap };
//# sourceMappingURL=operations.map.js.map