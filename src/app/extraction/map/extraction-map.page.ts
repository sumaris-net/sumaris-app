import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Injector, ViewChild, ViewEncapsulation } from '@angular/core';
import moment from 'moment';
import { L } from '@app/shared/map/leaflet';
import {
  AccountService,
  AppFormUtils,
  arraySize,
  Color,
  ColorScale,
  ColorScaleLegendItem,
  ConfigService,
  DurationPipe,
  EntityServiceLoadOptions,
  fadeInAnimation,
  fadeInOutAnimation,
  firstNotNilPromise,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNumber,
  isNumberRange,
  LoadResult,
  LocalSettingsService,
  PlatformService,
  StatusIds,
  TranslateContextService,
  waitFor
} from '@sumaris-net/ngx-components';
import { ExtractionService } from '../common/extraction.service';
import { BehaviorSubject, Observable, Subject, Subscription, timer } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ExtractionColumn, ExtractionFilter, ExtractionFilterCriterion, ExtractionType } from '../type/extraction-type.model';
import { Location } from '@angular/common';
import { ControlOptions, CRS, MapOptions, WMSParams } from 'leaflet';
import { Feature } from 'geojson';
import { debounceTime, filter, first, mergeMap, skip, switchMap, takeUntil, throttleTime } from 'rxjs/operators';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { SelectExtractionTypeModal, SelectExtractionTypeModalOptions } from '../type/select-extraction-type.modal';
import { DEFAULT_CRITERION_OPERATOR, ExtractionAbstractPage, ExtractionState } from '../common/extraction-abstract.page';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MatExpansionPanel } from '@angular/material/expansion';
import { Label, SingleOrMultiDataSet } from 'ng2-charts';
import { ChartLegendOptions, ChartOptions, ChartType } from 'chart.js';
import { ExtractionUtils } from '../common/extraction.utils';
import { UnitLabel, UnitLabelPatterns } from '@app/referential/services/model/model.enum';
import { MapGraticule } from '@app/shared/map/map.graticule';

import { LeafletControlLayersConfig } from '@asymmetrik/ngx-leaflet';
import { FetchPolicy } from '@apollo/client/core';
import { EXTRACTION_CONFIG_OPTIONS } from '@app/extraction/common/extraction.config';
import { ExtractionProduct } from '@app/extraction/product/product.model';
import { ProductService } from '@app/extraction/product/product.service';
import { AggregationStrataValidatorService } from '@app/extraction/strata/strata.validator';
import { AggregationStrata, IAggregationStrata } from '@app/extraction/strata/strata.model';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';
import { RxState } from '@rx-angular/state';

declare interface LegendOptions {
  min: number;
  max: number;
  startColor: string;
  endColor: string;
}
declare interface TechChartOptions extends ChartOptions {
  legend: ChartLegendOptions;
  type: ChartType;
  sortByLabel: boolean;
  fixAxis?: boolean;
  aggMin: number;
  aggMax: number;
}

const maxZoom = 18;

const REGEXP_NAME_WITH_UNIT = /^([^(]+)(?: \(([^)]+)\))?$/;

const BASE_LAYER_SLD_BODY = '<sld:StyledLayerDescriptor version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">' +
  '   <sld:NamedLayer>' +
  '      <sld:Name>ESPACES_TERRESTRES_P</sld:Name>' +
  '      <sld:UserStyle>' +
  '         <sld:Name>polygonSymbolizer</sld:Name>' +
  '         <sld:Title>polygonSymbolizer</sld:Title>' +
  '         <sld:FeatureTypeStyle>' +
  '            <sld:Rule>' +
  '               <sld:PolygonSymbolizer>' +
  '                  <sld:Fill>' +
  '                     <sld:CssParameter name="fill">#8C8C8C</sld:CssParameter>' +
  '                     <sld:CssParameter name="fill-opacity">1</sld:CssParameter>' +
  '                  </sld:Fill>' +
  '               </sld:PolygonSymbolizer>' +
  '            </sld:Rule>' +
  '         </sld:FeatureTypeStyle>' +
  '      </sld:UserStyle>' +
  '   </sld:NamedLayer>' +
  '</sld:StyledLayerDescriptor>';

export interface FeatureProperty {
  name: string;
  value: string
}
export interface FeatureDetails {
  title: string;
  value?: string;
  otherValue?: string;
  properties: FeatureProperty[];
}

export interface ExtractionMapState extends ExtractionState<ExtractionProduct>{
  overFeature: Feature;
  details: FeatureDetails;
  legendItems: ColorScaleLegendItem[] | undefined;
  customLegendOptions: Partial<LegendOptions>;
}

@Component({
  selector: 'app-extraction-map-page',
  templateUrl: './extraction-map.page.html',
  styleUrls: ['./extraction-map.page.scss'],
  animations: [fadeInAnimation, fadeInOutAnimation],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ExtractionMapPage extends ExtractionAbstractPage<ExtractionProduct, ExtractionMapState> {

  // -- Map Layers --
  osmBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom,
    attribution: '<a href=\'https://www.openstreetmap.org\'>Open Street Map</a>'
  });
  sextantBaseLayer = L.tileLayer(
    'https://sextant.ifremer.fr/geowebcache/service/wmts'
      + '?Service=WMTS&Layer=sextant&Style=&TileMatrixSet=EPSG:3857&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix=EPSG:3857:{z}&TileCol={x}&TileRow={y}',
    {
      maxZoom,
      attribution: "<a href='https://sextant.ifremer.fr'>Sextant</a>"
    });
  countriesLayer = L.tileLayer.wms('http://www.ifremer.fr/services/wms/dcsmm', {
    maxZoom,
    version: '1.3.0',
    crs: CRS.EPSG3857,
    format: "image/png",
    transparent: true,
    zIndex: 500, // Important, to bring this layer to top
    attribution: "<a href='https://sextant.ifremer.fr'>Sextant</a>",
    pane: 'countries'
  }).setParams({
    layers: "ESPACES_TERRESTRES_P",
    service: 'WMS',
    sld_body: BASE_LAYER_SLD_BODY
  } as WMSParams);
  mapOptions = <MapOptions>{
    preferCanvas: true,
    attributionControl: false,
    layers: [this.sextantBaseLayer],
    zoomControl: false,
    minZoom: 1,
    maxZoom,

    // FIXME: cards not shown
    fullscreenControl: true,
    fullscreenControlOptions: {
      position: 'topleft',
      title: this.translate.instant('MAP.ENTER_FULLSCREEN'),
      titleCancel: this.translate.instant('MAP.EXIT_FULLSCREEN'),
    }
  };
  layersControl = <LeafletControlLayersConfig>{
    baseLayers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Sextant (Ifremer)': this.sextantBaseLayer,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Open Street Map': this.osmBaseLayer
    },
    overlays: {
    }
  };

  map: L.Map;
  showGraticule = false;
  showCountriesLayer = true;

  // -- Legend card --
  showLegend = false;
  legendForm: UntypedFormGroup;
  showLegendForm = false;
  legendStyle = {};
  legendItems$ = this._state.select('legendItems');

  set customLegendOptions(value: Partial<LegendOptions>) {
    this._state.set('customLegendOptions', _ => value);
  }
  get customLegendOptions(): Partial<LegendOptions> {
    return this._state.get('customLegendOptions');
  }

  // -- Details card --
  overFeature$ = this._state.select('overFeature');
  details$ = this._state.select('details');

  set overFeature(value: Feature) {
    this._state.set('overFeature', _ => value);
  }

  get overFeature(): Feature {
    return this._state.get('overFeature');
  }

  set details(value: FeatureDetails) {
    this._state.set('details', _ => value);
  }

  get details(): FeatureDetails {
    return this._state.get('details');
  }

  // -- Tech chart card
  techChartOptions: TechChartOptions = {
    type: 'bar',
    responsive: true,
    legend: {
      display: false
    },
    scales: {
      yAxes: [{
        type: "linear",
        ticks: {
          suggestedMin: 0
        }
      }]
    },
    sortByLabel: true,
    fixAxis: false,
    aggMin: 0,
    aggMax: undefined
  };
  chartTypes: ChartType[] = ['pie', 'bar', 'doughnut'];
  showTechChart = true;

  // -- Data --
  data = {
    total: 0,
    min: 0,
    max: 0
  };

  columnNames = {}; // cache for i18n column name
  productFilter: Partial<ExtractionTypeFilter>;
  $fitToBounds = new Subject<void>();
  $center = new BehaviorSubject<{center: L.LatLng, zoom: number}>(undefined);
  $title = new BehaviorSubject<string>(undefined);
  $sheetNames = new BehaviorSubject<string[]>(undefined);
  $timeColumns = new BehaviorSubject<ExtractionColumn[]>(undefined);
  $spatialColumns = new BehaviorSubject<ExtractionColumn[]>(undefined);
  $aggColumns = new BehaviorSubject<ExtractionColumn[]>(undefined);
  $techColumns = new BehaviorSubject<ExtractionColumn[]>(undefined);
  $criteriaColumns = new BehaviorSubject<ExtractionColumn[]>(undefined);
  $tech = new BehaviorSubject<{ title: string; titleParams?: any, labels: Label[]; data: SingleOrMultiDataSet }>(null);
  $years = new BehaviorSubject<number[]>(undefined);
  formatNumberLocale: string;
  animation: Subscription;
  animationOverrides: {
    techChartOptions?: TechChartOptions
  } = {};

  private layers: L.Layer[];
  private graticule: MapGraticule;


  @ViewChild('filterPanel', { static: true }) filterPanel: ElementRef;
  @ViewChild('detailPanel', { static: true }) detailPanel: ElementRef;
  @ViewChild('bottomRightPanel', { static: true }) bottomRightPanel: ElementRef;

  @ViewChild('filterExpansionPanel', { static: true }) filterExpansionPanel: MatExpansionPanel;
  @ViewChild('aggExpansionPanel', { static: true }) aggExpansionPanel: MatExpansionPanel;

  get year(): number {
    return this.form.controls.year.value;
  }

  get aggColumnName(): string {
    return this.strataForm.controls.aggColumnName.value;
  }

  get techColumnName(): string {
    return this.strataForm.controls.techColumnName.value;
  }

  get hasData(): boolean {
    return this.ready && this.data && this.data.total > 0;
  }

  get legendStartColor(): string {
    return this.legendForm.controls.startColor.value;
  }

  set legendStartColor(value: string) {
    this.legendForm.controls.startColor
      .patchValue(value, {emitEvent: false});
  }

  get legendEndColor(): string {
    return this.legendForm.controls.endColor.value;
  }

  set legendEndColor(value: string) {
    this.legendForm.controls.endColor
      .patchValue(value, {emitEvent: false});
  }

  get dirty(): boolean {
    return this.form.dirty || this.criteriaForm.dirty;
  }

  get strataForm(): UntypedFormGroup {
    return this.form.controls.strata as UntypedFormGroup;
  }

  get techChartAxisType(): string {
    return this.techChartOptions.scales.yAxes[0].type;
  }

  set techChartAxisType(type: string) {
    this.setTechChartOption({ scales: { yAxes: [{type}] } });
  }

  get isAnimated(): boolean {
    return !!this.animation;
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsPristine(opts);
    this.form.markAsPristine(opts);
  }

  markAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsTouched(opts);
    AppFormUtils.markAsTouched(this.form);
  }

  constructor(
    injector: Injector,
    state: RxState<ExtractionMapState>,
    protected productService: ProductService,
    protected durationPipe: DurationPipe,
    protected strataValidatorService: AggregationStrataValidatorService,
    protected configService: ConfigService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, state);

    // Add controls to form
    this.form.addControl('strata', this.strataValidatorService.getFormGroup());
    this.form.addControl('year', this.formBuilder.control(null, Validators.required));
    this.form.addControl('month', this.formBuilder.control(null));
    this.form.addControl('quarter', this.formBuilder.control(null));

    this._enabled = true; // enable the form

    // If supervisor, allow to see all aggregations types
    this.productFilter = {
      statusIds: this.accountService.hasMinProfile('SUPERVISOR') ? [StatusIds.DISABLE, StatusIds.ENABLE, StatusIds.TEMPORARY] : [StatusIds.ENABLE],
      isSpatial: true
    };

    const legendStartColor = new Color([255, 255, 190], 1);
    const legendEndColor = new Color([150, 30, 30], 1);
    this.legendForm = this.formBuilder.group({
      count: [10, Validators.required],
      min: [0, Validators.required],
      max: [1000, Validators.required],
      startColor: [legendStartColor.rgba(), Validators.required],
      endColor: [legendEndColor.rgba(), Validators.required],
      conversionCoefficient: [1],
      unit: [null]
    });

    const account = this.accountService.account;
    this.formatNumberLocale = account && account.settings.locale || 'en-US';
    this.formatNumberLocale = this.formatNumberLocale.replace(/_/g, '-');


    this.registerSubscription(
      this.onRefresh.pipe(
        // avoid multiple load)
        filter(() => isNotNil(this.type) && (!this.loading || this.isAnimated)),
        switchMap(() => this.loadGeoData())
      ).subscribe(() => this.markAsPristine()));

    this.registerSubscription(
      this.configService.config.subscribe(config => {
        let centerCoords = config.getPropertyAsNumbers(EXTRACTION_CONFIG_OPTIONS.EXTRACTION_MAP_CENTER_LAT_LNG);
        centerCoords = (centerCoords?.length === 2) ? centerCoords : [0, 0];
        const zoom = config.getPropertyAsInt(EXTRACTION_CONFIG_OPTIONS.EXTRACTION_MAP_CENTER_ZOOM);
        this.$center.next({
          center: L.latLng(centerCoords as [number, number]),
          zoom: zoom || 5
        });
      })
    );
  }

  markAllAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAllAsTouched(opts);
    AppFormUtils.markAllAsTouched(this.form, opts);
  }

  get sheetNames(): string[] {
    if (!this.$sheetNames.value) this.updateSheetNames();
    return this.$sheetNames.value;
  }

  ngOnInit() {
    super.ngOnInit();

    this.addChildForm(this.criteriaForm);

    this._state.connect('details', this.overFeature$, (oldState, value) => this.computeFeatureDetails(value))

    this.registerSubscription(
      this.criteriaForm.form.valueChanges
        .pipe(
          filter(() => this.ready && !this.loading),
          debounceTime(250)
        ).subscribe(() => this.markForCheck())
    );

    this.addCustomControls();

    this.loadFromRouteOrSettings();
  }

  protected async loadFromRouteOrSettings(): Promise<boolean> {
    const found = await super.loadFromRouteOrSettings();
    if (found) return found;

    // No map loaded, open the modal
    setTimeout(() => this.openSelectTypeModal(), 450);
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    this.fitToBounds();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.$title.unsubscribe();
    this.$sheetNames.unsubscribe();
    this.$timeColumns.unsubscribe();
    this.$spatialColumns.unsubscribe();
    this.$aggColumns.unsubscribe();
    this.$techColumns.unsubscribe();
    this.$criteriaColumns.unsubscribe();
    this.$tech.unsubscribe();
    this.$years.unsubscribe();
  }

  async onMapReady(leafletMap: L.Map) {
    const map = leafletMap;

    // Wait settings to be loaded
    const settings = await this.settings.ready();

    // Add scale control
    L.control.scale({
      position: 'topright'
    }).addTo(map);

    // Add customized zoom control
    L.control
      .zoom({
        zoomInTitle: this.translate.instant('MAP.ZOOM_IN'),
        zoomOutTitle: this.translate.instant('MAP.ZOOM_OUT'),
      })
      .addTo(map);

    // Create graticule
    this.graticule = new MapGraticule({latLngPattern: settings.latLongFormat});

    // Add custom button to show/hide graticule
    const graticuleControl: L.Control.EasyButton = L.easyButton({
      states: [
        {
          stateName: 'show',
          icon: '<i class="material-icons leaflet-control-icon">grid_on</i>',
          title: this.translate.instant('MAP.SHOW_GRATICULE'),
          onClick: (btn, map) => {
            this.showGraticule = true;
            this.graticule.addTo(map);
            btn.state('hide');
          },
        },
        {
          stateName: 'hide',
          icon: '<i class="material-icons leaflet-control-icon">grid_off</i>',
          title: this.translate.instant('MAP.HIDE_GRATICULE'),
          onClick: (btn, map) => {
            this.showGraticule = false;
            this.graticule.removeFrom(map);
            btn.state('show');
          },
        },
      ],
    });
    graticuleControl.addTo(map);

    // DEBUG zoom
    //map.on('zoom', () => console.debug(`[extraction-map] zoom=${map.getZoom()}`));

    // Center map
    const {center, zoom} = await firstNotNilPromise(this.$center, {stop: this.destroySubject});

    // Call ready in a timeout to let leaflet map to initialize
    setTimeout(() => {
      if (center && (center.lat !== 0 || center.lng !== 0)) {
        console.debug(`[extraction-map] Center: `, center);
        map.setView(center, zoom);
      }
      else {
        map.fitWorld();
      }
      this.map = map;
      this.markAsReady();
    });
  }

  async markAsReady(opts?: { emitEvent?: boolean }) {
    if (!this.map || !this.types) return; // Skip if missing types or map


    // DEBUG
    //console.debug(`[extraction-map] Mark as ready !`);

    super.markAsReady(opts);
  }

  protected watchAllTypes(): Observable<LoadResult<ExtractionProduct>> {
    return this.productService.watchAll(this.productFilter);
  }

  protected loadType(id: number, opts?: EntityServiceLoadOptions): Promise<ExtractionProduct> {
    return this.productService.load(id, opts);
  }

  protected fromObject(json: any): ExtractionProduct {
    return ExtractionProduct.fromObject(json);
  }

  async setType(type: ExtractionProduct, opts?: {
    emitEvent?: boolean;
    skipLocationChange?: boolean;
    sheetName?: string;
    stopAnimation?: boolean;
  }): Promise<boolean> {
    const changed = await super.setType(type, opts);

    if (changed) {
      // Reset year
      this.form.get('year').setValue(null);

      // Update the title
      this.updateTitle();

      // Stop animation
      if (!opts || opts.stopAnimation !== false) {
        this.stopAnimation();
      }

      // Update sheet names
      this.updateSheetNames();
    }
    else {
      // Force refresh
      await this.updateColumns(opts);
      this.applyDefaultStrata(opts);
    }

    return changed;
  }

  setSheetName(sheetName: string, opts?: {
    emitEvent?: boolean;
    skipLocationChange?: boolean;
    stopAnimation?: boolean;
  }) {
    // Make sure sheetName exists in strata. If not, select the default strata sheetname
    const sheetNames = this.sheetNames || [sheetName];
    sheetName = sheetNames.find(s => s === sheetName) || sheetNames[0];

    const changed = this.sheetName !== sheetName;

    // Reset min/max of the custom legend (if exists)
    if (changed || opts?.emitEvent == true) {
      const customLegendOptions = this.customLegendOptions;
      if (customLegendOptions) {
        this.customLegendOptions = {
          ...customLegendOptions,
          min: 0,
          max: undefined
        };
      }

      // Stop animation
      if (!opts || opts.stopAnimation !== false) {
        this.stopAnimation();
      }

      this.$timeColumns.next(null);
      this.$spatialColumns.next(null);
      this.$aggColumns.next(null);
      this.$techColumns.next(null);
      this.markAsLoading();
    }

    super.setSheetName(sheetName, {
      emitEvent: false,
      ...opts
    });

    if (changed) {
      this.applyDefaultStrata(opts);
      this.updateColumns(opts)
        .then(() => {
          if (!opts || opts.emitEvent !== false) {
            return this.loadGeoData();
          }
        });
    }
    else {
      this.applyDefaultStrata(opts);
      this.updateColumns(opts);
    }
  }

  setAggColumn(aggColumnName: string, opts?: {emitEVent?: boolean; }) {
    const changed = this.aggColumnName !== aggColumnName;

    if (!changed) return; // Skip

    this.form.get('strata').patchValue({
      aggColumnName
    }, opts);

    if (!opts || opts.emitEVent !== false) {
      this.onRefresh.emit();
    }
  }

  async setTechColumn(techColumnName: string, opts?: {emitEvent?: boolean; }) {
    this.form.get('strata').patchValue({
      techColumnName
    }, opts);

    this.showTechChart = true;

    // Reset animation data
    this.resetAnimationOverrides();

    if (!this.isAnimated && (!opts || opts.emitEvent !== false)) {
      const loaded = await this.loadTechData();
      if (!loaded) this.showTechChart = false;
    }
  }

  hideTechChart() {
    this.$tech.next(null);
    this.showTechChart = false;
    delete this.animationOverrides.techChartOptions;
    this.markForCheck();
  }

  getI18nSheetName(sheetName?: string, type?: ExtractionProduct, self?: ExtractionAbstractPage<ExtractionProduct, ExtractionMapState>): string {
    const str = super.getI18nSheetName(sheetName, type, self);
    return str.replace(/\([A-Z]+\)$/, '');
  }

  protected async updateTitle() {
    const title = this.translate.instant(this.type.name);
    this.$title.next(title);
  }

  /* -- protected method -- */

  protected parseCriteriaFromString(queryString: string, sheet?: string): ExtractionFilterCriterion[] {
    let criteria = super.parseCriteriaFromString(queryString, sheet);

    // Read year, and remove it from criteria
    const yearIndex = (criteria || []).findIndex(c =>
      (!sheet || sheet === c.sheetName)
      && c.name === 'year' && c.operator === '=' && isNotNil(c.value));
    if (yearIndex !== -1) {
      const year = criteria.splice(yearIndex, 1)[0].value;
      this.setYear(+year, {emitEvent: false, skipLocationChange: true /*already set*/});
    }

    return criteria;
  }

  protected resetGeoData() {
    this.cleanMapLayers();

    // Reset geo data
    this.data = {total: 0, min: 0, max: 0};

    // Hide details
    this.details = null;
    // Hide chart
    this.$tech.next(null);
    // Hide legend
    this.showLegend = false;

    this.markForCheck()
  }

  protected cleanMapLayers() {
    (this.layers || []).forEach((layer) => this.map.removeLayer(layer));
    this.layers = [];
  }


  async ready(): Promise<void> {

    await this.platform.ready();

    await waitFor(() => !!this.getStrataValue(), {stop: this.destroySubject});

    await super.ready();

  }

  protected async updateColumns(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    if (!this.type) return;

    // Update filter columns
    const sheetName = this.sheetName;
    const columns = sheetName && (await this.productService.loadColumns(this.type, sheetName)) || [];

    // Translate names
    this.translateColumns(columns);

    // Convert to a map, by column name
    this.columnNames = columns.reduce((res, c) => {
      res[c.columnName] = c.name;
      return res;
    }, {});

    const columnsMap = ExtractionUtils.dispatchColumns(columns);
    console.debug("[extraction-map] dispatched columns: ", columnsMap);

    this.$aggColumns.next(columnsMap.aggColumns);
    this.$techColumns.next(ExtractionUtils.filterWithValues(columnsMap.techColumns, {allowNullValuesOnNumeric: true}));
    this.$spatialColumns.next(columnsMap.spatialColumns);
    this.$timeColumns.next(ExtractionUtils.filterWithValues(columnsMap.timeColumns, {allowNullValuesOnNumeric: false}));
    this.$criteriaColumns.next(ExtractionUtils.filterWithValues(columnsMap.criteriaColumns, {allowNullValuesOnNumeric: true}));

    const yearColumn = (columns || []).find(c => c.columnName === 'year');
    const years = (yearColumn && yearColumn.values || []).map(s => parseInt(s));
    this.$years.next(years);
  }

  protected updateSheetNames() {
    // Filter sheet name on existing stratum
    let sheetNames = this.type && this.type.sheetNames || null;
    if (sheetNames && this.type.stratum) {
      sheetNames = this.type.stratum
        .slice() // Copy before sorting
        .sort(strata => strata.isDefault ? -1 : 1)
        .map(s => s.sheetName)
        .filter(sheetName => isNotNil(sheetName) && sheetNames.includes(sheetName));
    }
    this.$sheetNames.next(sheetNames);
  }

  protected getDefaultStrata(sheetName: string) {
    if (!this.type || !sheetName) return;

    // Find first strate, compatible with this sheet
    let defaultStrata = sheetName && (this.type.stratum || []).find(s => s?.sheetName === sheetName);

    // Strata not found: create a new one, from the main default strata when possible
    if (!defaultStrata) {
      defaultStrata = (this.type.stratum || []).find(s => s?.isDefault);
      defaultStrata = defaultStrata?.clone() || new AggregationStrata(); // Create a copy, to leave original strata unchanged
      defaultStrata.sheetName = sheetName;
      // Reset tech and agg columns, has it make no sense to keep it
      // (because it came from another sheet, and may not existed in the expected sheet)
      defaultStrata.techColumnName = null;
      defaultStrata.aggColumnName = null;
    }

    return defaultStrata;
  }

  protected applyDefaultStrata(opts?: { emitEvent?: boolean; }) {
    let defaultStrata = this.getDefaultStrata(this.sheetName);
    if (defaultStrata) {
      console.debug(`[extraction-map] Applying default strata:`, defaultStrata);
      this.form.patchValue({
        strata: defaultStrata.asObject()
      }, opts);
    }
  }


  protected async loadData() {
    const type = this.type;
    if (!type) return; // Skip, if no type

    const now = Date.now();
    let hasData = false;
    try {

      if (isEmptyArray(type.sheetNames)) return; // No data

      const filterYear = this.form.get('year').value;
      const startYear = filterYear || moment().year();
      const endYear = filterYear || (startYear - 20);

      const sheetName = this.sheetName || (type && type.sheetNames && type.sheetNames[0]) || null;
      const strata: any = this.getDefaultStrata(sheetName);

      if (!strata) return; // Skip, if no spatial strata

      let year = startYear;
      do {

        // Set default filter
        this.form.patchValue({year, strata}, {emitEvent: false});

        // Load data (from filter)
        await this.loadGeoData();

        // Check if some data found
        hasData = this.hasData;
        if (!hasData) year--;
      }
      while (!hasData && year >= endYear);

      //if (hasData) this.setYear(year, {emitEvent: true, skipLocationChange: true, stopAnimation: true})

    }
    finally {
      // OK: data found
      if (hasData) {
        console.info(`[extraction-map] Data layer loaded successfully, in ${Date.now() - now}`);
      }
      // No data: warn user
      else {
        await this.showToast({
          type: 'warning',
          message: 'EXTRACTION.MAP.WARNING.NO_DATA'
        });
      }
    }
  }

  protected async loadGeoData() {

    await this.ready();

    if (!this.type || !this.type.category || !this.type.label) {
      console.warn('[extraction-map] Cannot load GeoJSON data: missing type, or invalid type');
      this.markAsLoaded();
      return;
    }

    this.markAsLoading();

    const strata = this.getStrataValue();
    const filter = this.getFilterValue(strata);

    try {
      const now = Date.now();
      console.debug(`[extraction-map] Loading layer ${this.type.category} ${this.type.label}`, filter, strata);

      // Disabled forms (after getting strata and filter)
      this.disable();
      this.resetGeoData();
      this.error = null;

      let hasMore = true;
      let offset = 0;
      const size = 3000;

      const layer = L.geoJSON(null, {
        onEachFeature: this.onEachFeature.bind(this),
        style: {
          className: 'geojson-shape'
        }
      });
      let total = 0;
      const aggColumnName = strata.aggColumnName;
      const fetchPolicy: FetchPolicy = this.isAnimated ? "cache-first" : undefined /*default*/;
      let maxValue = 0;

      while (hasMore) {

        // Get geo json using slice
        const geoJson = await this.service.loadGeoJson(this.type,
          strata,
          offset, size,
          null, null,
          filter, { fetchPolicy });

        const hasData = isNotNil(geoJson) && geoJson.features && geoJson.features.length || false;

        if (hasData) {
          // Add data to layer
          layer.addData(geoJson);

          // Compute max value (need for legend)
          maxValue = geoJson.features
            .map(feature => feature.properties[aggColumnName] as number)
            .reduce((max, value) => Math.max(max, value), maxValue);

          offset += size;
          total += geoJson.features.length;
        }

        hasMore = hasData && geoJson.features.length >= size;
      }

      this.data.total = total;
      this.data.max = maxValue;

      if (total === 0) {
        console.debug(`[extraction-map] No data found, in ${Date.now() - now}ms`);
        // Clean geo data
        this.resetGeoData();
      } else {

        // Prepare legend options
        const legendOptions = {
          ...this.legendForm.value,
          ...this.customLegendOptions
        };
        if (!this.customLegendOptions || isNil(legendOptions.max)) {
          legendOptions.max  = Math.max(10, Math.round(maxValue + 0.5));
        }
        this.legendForm.patchValue(legendOptions, {emitEvent: false});

        // Create scale legend
        const scale = this.createLegendScale(legendOptions);
        layer.setStyle(this.getFeatureStyleFn(scale, aggColumnName));
        this.updateLegendStyle(scale);

        // Add countries layers
        if (this.showCountriesLayer) {

          // Init countries pane, if need
          if (!this.map.getPane(this.countriesLayer.options.pane)) {
            const pane = this.map.createPane(this.countriesLayer.options.pane);
            pane.style.zIndex = '650';
            pane.style.pointerEvents = 'none';
          }

          this.countriesLayer.addTo(this.map)
          this.layers.push(this.countriesLayer);
        }

        // Add to layers
        layer.addTo(this.map);
        this.layers.push(layer);

        console.debug(`[extraction-map] ${total} geometries loaded in ${Date.now() - now}ms (${Math.floor(offset / size)} slices)`);

        // Load tech data (wait end if animation is running)
        if (this.showTechChart) {
          const loaded = await this.loadTechData(this.type, strata, filter);
          // Disabled chart, if unable to load
          if (!loaded) this.showTechChart = false;
        }
        this.showLegend = isNotNilOrBlank(strata.aggColumnName);
      }

    } catch (err) {
      console.error(err);
      this.setError(err && err.message || err);
      this.showLegend = false;
      this.markForCheck();
    } finally {
      if (!this.isAnimated) {
        this.markAsLoaded();
        this.enable();

        if (this.data.total) await this.fitToBounds();
      }
    }
  }

  async loadTechData(type?: ExtractionProduct,
                     strata?: IAggregationStrata,
                     filter?: ExtractionFilter): Promise<boolean> {
    type = type || this.type;
    strata = type && (strata || this.getStrataValue());
    filter = strata && (filter || this.getFilterValue(strata));
    let opts = this.techChartOptions;

    if (!type || !strata || !strata.techColumnName || !strata.aggColumnName) return false; // skip;

    const [aggColumns, techColumns] = await Promise.all([
      firstNotNilPromise(this.$aggColumns),
      firstNotNilPromise(this.$techColumns)
    ]);

    const isAnimated = !!this.animation;
    const aggColumnName = strata.aggColumnName;
    const techColumnName = strata.techColumnName;
    const techColumn = (techColumns || []).find(c => c.columnName === techColumnName);
    const aggColumn = (aggColumns || []).find(c => c.columnName === aggColumnName);

    try {
      let map = await this.service.loadAggByTech(type, strata, filter, {
        fetchPolicy: isAnimated ? 'cache-first' : undefined /*default*/
      });
      if (isAnimated) {
        // Prepare overrides, if need
        const overrides = await this.loadAnimationOverrides(type, strata, filter);
        opts = {
          ...opts,
          ...overrides.techChartOptions
        };
      }


      // Keep data without values for this year
      if (opts.fixAxis) {

        // Copy, because object if immutable
        map = { ...map };

        // Make sure all column values is on the chart
        (techColumn.values || [])
          .filter(key => isNil(map[key]))
          .forEach(key => map[key] = 0);
      }

      let entries: any[][] = Object.entries(map);

      const firstEntry = entries.length ? entries[0] : undefined;

      // If label are number: always sort by value (ASC)
      if (firstEntry && isNumber(firstEntry[0].trim())) {
        entries = entries.map(entry => [parseFloat(entry[0]), entry[1] ]);
        entries.sort((a, b) => a[0] - b[0]);
      }

      // If range of number (.e.g '0-10', '>=40') : always sort by value (ASC)
      else if (firstEntry && entries.findIndex(entry => !isNumberRange(entry[0].trim())) === -1) {
        entries = entries.map(([range, value]) => {
          const rankOrder = parseInt(range
            .split('-')[0]
            .replace(/[><= ]+/g, '')
          );
          return [ range, value, rankOrder ];
        })
          .sort(([, , a], [, , b]) => a - b)
          .map(([range, value]) => [range, value]);
      }

      // Sort by label (ASC)
      else if (opts.sortByLabel) {
        entries = entries.sort((a, b) => a[0] < b[0] ? -1 : 1);
      }

      // Sort by value (DESC)
      else {
        entries = entries.sort((a, b) => a[1] > b[1] ? -1 : (a[1] === b[1] ? 0 : 1));
      }

      // Round values
      const data = entries.map(item => item[1])
        .map(value => isNil(value) ? 0 : Math.round(value * 100) / 100);
      const labels = entries.map(item => item[0]);

      this.$tech.next({
        title: this.translate.instant('EXTRACTION.MAP.TECH_CHART_TITLE', {
          aggColumnName: aggColumn.name,
          techColumnName: techColumn.name
        }),
        labels: labels,
        data: data
      });
      return true;
    }
    catch (error) {
      console.error("Cannot load tech values:", error);
      // Reset tech, then continue
      this.$tech.next(undefined);
      return false;
    }
    finally {
      this.markForCheck();
    }

  }

  protected goTo(bounds: L.LatLngBounds) {
    if (bounds?.isValid()) {
      this.map.flyToBounds(bounds, { maxZoom, duration: 1 });
    } else {
      console.warn('[extraction-map] Cannot go to bound. GeoJSON layer not found.');
    }
  }

  async fitToBounds(opts = {skipDebounce : false}) {

    if (!opts.skipDebounce) {
      if (!this.$fitToBounds.observers.length) {
        this.registerSubscription(
          this.$fitToBounds
            .pipe(
              debounceTime(450),
              mergeMap(() => this.ready())
            )
            .subscribe(b => this.fitToBounds({skipDebounce: true}))
        );
      }

      this.$fitToBounds.next();
      return;
    }

    if (isEmptyArray(this.layers)) {
      console.debug('[extraction-map] Skip fit to bounds (no layers)');
      return;
    }

    // Create bounds, from layers
    let bounds: L.LatLngBounds;
    this.layers
      .filter((layer) => layer instanceof L.GeoJSON)
      .forEach((layer) => {
        if (!bounds) {
          bounds = (layer as L.GeoJSON).getBounds();
        } else {
          bounds.extend((layer as L.GeoJSON).getBounds());
        }
      });

    console.debug('[extraction-map] fit to bounds:', bounds);
    this.goTo(bounds);
  }

  async loadAnimationOverrides(type: ExtractionProduct, strata: IAggregationStrata, filter: ExtractionFilter):
    Promise<{techChartOptions?: TechChartOptions}> {
    if (!type || !strata || !filter) return; // skip
    this.animationOverrides = this.animationOverrides || {};

    // Tech chart overrides
    if (!this.animationOverrides.techChartOptions) {
      const opts = this.techChartOptions;

      // Create new filter, without criterion on time (.e.g on year)
      const filterNoTimes = ExtractionFilter.fromObject({ ...filter,
        criteria: (filter.criteria || []).filter(criterion => criterion.name !== strata.timeColumnName)
      });
      const {min, max} = await this.service.loadAggMinMaxByTech(type, strata, filterNoTimes,
        { fetchPolicy: 'cache-first' });
      console.debug(`[extraction-map] Changing tech chart options: {min: ${min}, max: ${max}}`);
      this.animationOverrides.techChartOptions = {
        ...opts,
        fixAxis: true,
        scales: {
          yAxes: [{
            ...opts.scales.yAxes[0],
            ticks: {min, max}
          }]
        }
      };
    }

    return this.animationOverrides;
  }

  setYear(year: number, opts?: {emitEvent?: boolean; stopAnimation?: boolean; skipLocationChange?: boolean}): boolean {
    const changed = this.year !== year;

    // If changed or force with opts.emitEvent=true
    if (changed || (opts && opts.emitEvent === true)) {

      this.form.patchValue({
        year
      }, opts);

      // Stop animation
      if (!opts || opts.stopAnimation !== false) {
        this.stopAnimation();
      }

      // Refresh
      if (!opts || opts.emitEvent !== false) {
        this.onRefresh.emit();
      }

      if (!opts || opts.skipLocationChange !== true) {
        setTimeout(() => this.updateQueryParams(), 500);
      }
    }

    return changed;
  }

  onRefreshClick(event?: Event) {
    this.stopAnimation();
    this.onRefresh.emit(event);
  }

  protected onEachFeature(feature: Feature, layer: L.Layer) {
    layer.on('mouseover', (_) => this.overFeature = feature);
    layer.on('mouseout', (_) => this.closeFeatureDetails(feature));
  }

  protected computeFeatureDetails(feature: Feature): FeatureDetails {

    const strata = this.getStrataValue();
    const properties = Object.getOwnPropertyNames(feature.properties)
      .filter(key => !strata.aggColumnName || key !== strata.aggColumnName)
      .map(key => {
        return {
          name: this.columnNames[key],
          value: feature.properties[key]
        };
      });
    let aggValue = feature.properties[strata.aggColumnName];
    let value = this.floatToLocaleString(aggValue);

    let title = isNotNilOrBlank(strata.aggColumnName) ? this.columnNames[strata.aggColumnName] : undefined;
    const matches = REGEXP_NAME_WITH_UNIT.exec(title);
    let otherValue: string;
    if (matches) {
      title = matches[1];
      let unit = matches[2];
      unit = unit || (strata.aggColumnName?.endsWith('_weight') ? UnitLabel.GRAM : undefined);
      if (unit) {
        let conversionCoefficient = 1;

        // - Convert G to KG
        if (unit === UnitLabel.GRAM) {
          conversionCoefficient = 1/1000;
          unit = UnitLabel.KG;
        }

        // Append unit to value
        aggValue = parseFloat(aggValue) * conversionCoefficient;
        value = this.floatToLocaleString(aggValue);
        if (value) value += ` ${unit}`;

        // Try to compute other value, using unit
        // - Convert KG to ton
        if (unit === UnitLabel.KG) {
          const weightInTons = parseFloat(aggValue) / 1000;
          if (weightInTons >= 1) {
            otherValue = this.floatToLocaleString(weightInTons) + ' ' + UnitLabel.TON;
          }
        }
        // - Convert minutes into human duration
        else if (unit === UnitLabel.MINUTES) {
          otherValue = this.durationPipe.transform(parseFloat(aggValue), 'minutes');
        }
        // - Convert hours into human duration
        else if (UnitLabelPatterns.DECIMAL_HOURS.test(unit)) {
          otherValue = this.durationPipe.transform(parseFloat(aggValue), 'hours');
        }
      }
    }

    // Emit events
    return {title, value, otherValue, properties};
  }

  closeFeatureDetails(feature: Feature, force?: boolean) {
    if (this.overFeature !== feature) return; // skip is not the selected feature

    // Close now, of forced (already wait 5s)
    if (force) {
      this.details = null; // Hide details
      return;
    }

    // Wait 4s before closing
    return timer(4000)
      .pipe(
        // Ignore a new selected feature arrived
        takeUntil(this.overFeature$.pipe(skip(1))),
        first(),
      )
      // Loop
      .subscribe(() => this.closeFeatureDetails(feature, true));
  }

  openLegendForm(event: Event) {
    this.showLegendForm = true;
  }

  cancelLegendForm(event: Event) {
    this.showLegendForm = false;

    // Reset legend color
    //const color = this.legendForm.get('color').value;
    //this.legendStartColor = this.scale.endColor;
  }

  applyLegendForm(event: Event) {
    this.showLegendForm = false;
    this.customLegendOptions = this.legendForm.value;
    this.onRefresh.emit();
  }

  async openSelectTypeModal(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    // If supervisor, allow to see all aggregations types
    const filter: Partial<ExtractionTypeFilter> = {
      statusIds: this.accountService.hasMinProfile('SUPERVISOR')
        ? [StatusIds.DISABLE, StatusIds.ENABLE, StatusIds.TEMPORARY]
        : [StatusIds.ENABLE],
      isSpatial: true
    };
    const modal = await this.modalCtrl.create({
      component: SelectExtractionTypeModal,
      componentProps: <SelectExtractionTypeModalOptions>{
        filter,
        title: 'EXTRACTION.MAP.SELECT_MODAL.TITLE',
        helpText: 'EXTRACTION.MAP.SELECT_MODAL.HELP'
      },
      keyboardClose: true
    });

    // Open the modal
    modal.present();

    // Wait until closed
    const { data } = await modal.onDidDismiss();

    let type: ExtractionProduct = (data instanceof ExtractionProduct) ? data : null;
    if (data instanceof ExtractionType) {
      type = ExtractionProduct.fromObject(data.asObject());
    }
    // If selected a product, use it
    if (type) {
      await this.setType(type, {emitEvent: false});

      return this.loadData();
    }
  }

  toggleAnimation(event?: Event) {
    if (event && event.defaultPrevented) return;
    // Avoid to expand the filter section
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Stop existing animation
    if (this.animation) {
      this.stopAnimation();
    }
    else {
      this.startAnimation();
    }
  }

  toggleShowCountriesLayer() {
    this.showCountriesLayer = !this.showCountriesLayer;

    // Reload data
    if (!this.isAnimated) {
      const countriesLayerIndex = this.layers.indexOf(this.countriesLayer);
      if (countriesLayerIndex !== -1) {
        this.layers.splice(countriesLayerIndex, 1);
        this.countriesLayer.remove();
      }
      else {
        this.countriesLayer.addTo(this.map);
        this.layers.push(this.countriesLayer);
      }
      //this.loadGeoData();
    }
  }

  setTechChartOption(value: Partial<TechChartOptions>, opts?: { emitEvent?: boolean; }) {
    this.techChartOptions = {
      ...this.techChartOptions,
      ...value
    };

    // Reset animation data
    this.resetAnimationOverrides();

    // Refresh (but skip if animation running)
    if (!this.animation && (!opts || opts.emitEvent !== false)) {
      this.loadTechData();
    }
  }

  onChartClick({event, active}) {
    if (!active) return; // Skip

    // Retrieve clicked values
    const values = active
      .map(element => element && element._model && element._model.label)
      .filter(isNotNil);
    if (isEmptyArray(values)) return; // Skip if empty

    const value = values[0];

    const hasChanged = this.criteriaForm.addFilterCriterion({
      name: this.techColumnName,
      operator: DEFAULT_CRITERION_OPERATOR,
      value: value,
      sheetName: this.sheetName
    }, {
      appendValue: event.ctrlKey
    });
    if (!hasChanged) return; // Skip if already added

    if (this.filterExpansionPanel && !this.filterExpansionPanel.expanded) {
      this.filterExpansionPanel.open();
    }

    if (!event.ctrlKey) {
      this.onRefresh.emit();
    }
  }

  getFilterValue(strata?: IAggregationStrata): ExtractionFilter {

    const filter = super.getFilterValue();

    strata = strata || this.getStrataValue();
    if (!strata) return filter;

    const json = this.form.value;
    const sheetName = this.sheetName;

    // Time strata = year
    if (strata.timeColumnName === 'year' && json.year > 0) {
      filter.criteria.push({name: 'year', operator: '=', value: json.year, sheetName: sheetName} as ExtractionFilterCriterion);
    }

    // Time strata = quarter
    else if (strata.timeColumnName === 'quarter' && json.year > 0 && json.quarter > 0) {
      filter.criteria.push({name: 'year', operator: '=', value: json.year, sheetName: sheetName} as ExtractionFilterCriterion);
      filter.criteria.push({name: 'quarter', operator: '=', value: json.quarter, sheetName: sheetName} as ExtractionFilterCriterion);
    }

    // Time strata = month
    else if (strata.timeColumnName === 'month' && json.year > 0 && json.month > 0) {
      filter.criteria.push({name: 'year', operator: '=', value: json.year, sheetName: sheetName} as ExtractionFilterCriterion);
      filter.criteria.push({name: 'month', operator: '=', value: json.month, sheetName: sheetName} as ExtractionFilterCriterion);
    }

    return filter;
  }

  /* -- protected methods -- */

  protected startAnimation() {
    const years = this.$years.getValue();

    // Pre loading data
    console.info("[extraction-map] Preloading data for animation...");


    console.info("[extraction-map] Starting animation...");
    this.animation = isNotEmptyArray(years) && timer(500, 500)
      .pipe(
        throttleTime(450)
      )
      .subscribe(index => {
        const year = years[index % arraySize(years)];
        console.info(`[extraction-map] Rendering animation on year ${year}...`);
        this.setYear(year, {
          emitEvent: true, /*force refresh if same*/
          stopAnimation: false
        });
      });

    this.animation.add(() => {
      console.info("[extraction-map] Animation stopped");
    });

    this.registerSubscription(this.animation);
  }

  protected stopAnimation() {
    if (this.animation) {
      this.unregisterSubscription(this.animation);
      this.animation.unsubscribe();
      this.animation = null;
      this.resetAnimationOverrides();

      if (this.disabled) {
        this.enable();
        this.markAsLoaded();
      }
    }
  }

  protected resetAnimationOverrides() {
    delete this.animationOverrides.techChartOptions;
  }

  protected getFeatureStyleFn(scale: ColorScale, propertyName: string): L.StyleFunction<any> | null {
    if (isNil(propertyName)) return;

    return (feature) => {

      const value = feature.properties[propertyName];
      const color = scale.getValueColor(value).rgba(1);

      // DEBUG
      //console.debug(`${options.propertyName}=${value} | color=${color} | ${feature.properties['square']}`);

      return {
        fillColor: color,
        weight: 0,
        opacity: 0,
        color: color,
        fillOpacity: 1
      };
    };
  }

  protected createLegendScale(opts?: Partial<LegendOptions>): ColorScale {
    opts = opts || this.legendForm.value;
    const min = (opts.min || 0);
    const max = (opts.max || 1000);
    const startColor = Color.parseRgba(opts.startColor);
    const mainColor = Color.parseRgba(opts.endColor);
    const endColor = Color.parseRgba('rgb(0,0,0)');

    // Create scale color (max 10 grades)
    const scaleCount = Math.max(2, Math.min(max, 10));
    const scale = ColorScale.custom(scaleCount, {
      min: min,
      max: max,
      opacity: mainColor.opacity,
      startColor: startColor.rgb,
      mainColor: mainColor.rgb,
      mainColorIndex: Math.trunc(scaleCount * 0.9),
      endColor: endColor.rgb
    });

    this._state.set('legendItems', _ => scale.legend.items);
    this.showLegendForm = false;
    return scale;
  }

  protected updateLegendStyle(scale: ColorScale) {
    const items = scale.legend.items;
    const longerItemLabel = items.length > 2 && items[items.length - 2].label || '9999'; // Use N-2, because last item is shorter
    const minWidth = Math.max(105, 36 /* start offset */ + longerItemLabel.length * 4.7 /* average width of a letter */ );
    this.legendStyle = {
      minWidth: `${minWidth || 150}px`,
      maxWidth: '250px'
    };

  }


  protected isEquals(t1: ExtractionProduct, t2: ExtractionProduct): boolean {
    return ExtractionProduct.equals(t1, t2);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected getStrataValue(): IAggregationStrata {
    const json = this.form.get('strata').value;
    delete json.__typename;
    return json as IAggregationStrata;
  }

  protected resetYear(value?: number, opts?: {emitEvent?: boolean}) {
    this.form.get('year')?.reset(value, opts);
  }

  protected resetStrata(value?: IAggregationStrata, opts?: {emitEvent?: boolean}) {
    this.form.get('strata')?.reset(value, opts);
  }

  protected floatToLocaleString(value: number|string): string|undefined {
    if (isNil(value)) return undefined;
    if (typeof value === 'string') {
      value = parseFloat(value);
    }
    return value.toLocaleString(this.formatNumberLocale, {
      useGrouping: true,
      maximumFractionDigits: 2});
  }

  protected async addCustomControls() {
    await this.ready();
    this.createCustomControl(this.filterPanel, {position: 'bottomleft'})
      .addTo(this.map);

    this.createCustomControl(this.bottomRightPanel, {position: 'bottomright'})
      .addTo(this.map);

    this.createCustomControl(this.detailPanel, {position: 'bottomright'})
      .addTo(this.map);
  }

  protected createCustomControl(element: ElementRef, opts?: ControlOptions): L.Control {

    if (!element || !element.nativeElement) {
      throw new Error('Missing or invalid argument \'element\'');
    }

    const CustomControl = L.Control.extend({
      onAdd(map: L.Map) {
        return element.nativeElement;
      },
      onRemove(map: L.Map) {}
    })
    return new CustomControl({
      position: 'topleft',
      ...opts
    });
  }
}
