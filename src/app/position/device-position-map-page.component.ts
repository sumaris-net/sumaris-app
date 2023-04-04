import { ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material/expansion';
import { BehaviorSubject, of, Subject, Subscription } from 'rxjs';
import { IGNORED_ENTITY_COLUMNS } from '@app/referential/table/referential.table';
import { DevicePosition, DevicePositionFilter } from '@app/data/services/model/device-position.model';
import { DevicePositionService } from '@app/data/services/device-position.service';
import {
  AccountService,
  ConfigService, EntityUtils, firstNotNilPromise, joinPropertiesPath, LatLongPattern,
  LoadResult,
  LocalSettingsService,
  MatAutocompleteConfigHolder,
  MatAutocompleteFieldAddOptions,
  MatAutocompleteFieldConfig,
  PersonService,
  PersonUtils,
  StatusIds,
  toNumber
} from '@sumaris-net/ngx-components';
import { catchError, debounceTime, filter, switchMap, tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { RxState } from '@rx-angular/state';
import { MapCenter, MapUtils } from '@app/shared/map/map.utils';
import { L } from '@app/shared/map/leaflet';
import { MapGraticule } from '@app/shared/map/map.graticule';
import { v4 as uuidv4 } from 'uuid';
import { MapOptions, PathOptions } from 'leaflet';
import { LeafletControlLayersConfig } from '@asymmetrik/ngx-leaflet';
import { BaseMap, BaseMapState } from '@app/shared/map/base-map.class';
import { Feature, LineString, MultiPolygon, Point, Position } from 'geojson';
import { Geometries } from '@app/shared/geometries.utils';
import { Operation, VesselPositionUtils } from '@app/trip/services/model/trip.model';
import { LocationUtils } from '@app/referential/location/location.utils';
import { PositionUtils } from '@app/trip/services/position.utils';

export const DEVICE_POSITION_MAP_SETTINGS = {
  FILTER_KEY: 'filter',
};
export interface DevicePositionMapState extends BaseMapState {
}

@Component({
  selector: 'app-device-position-map',
  templateUrl: './device-position-map-page.component.html',
  styleUrls: ['./device-position-map-page.component.scss'],
  providers: [RxState]
})
export class DevicePositionMapPage<T extends DevicePosition<any> = DevicePosition<any>>
  extends BaseMap<DevicePositionMapState>
  implements OnInit {

  protected readonly dataService:DevicePositionService;
  protected readonly accountService:AccountService;
  protected readonly personService:PersonService;

  protected _autocompleteConfigHolder:MatAutocompleteConfigHolder;
  protected filter:DevicePositionFilter = new DevicePositionFilter();

  totalRowCount = 0;
  data: T[] = null;
  filterForm:UntypedFormGroup;

  i18nPrefix = 'DEVICE_POSITION.PAGE.';
  title = 'TITLE';
  filterCriteriaCount = 0;
  filterPanelFloating = true;

  autocompleteFields:{[key:string]:MatAutocompleteFieldConfig};
  onRefresh:EventEmitter<any> = new EventEmitter<any>();

  @Input() persistFilterInSettings = true;
  @Input() showTooltip = true;

  @ViewChild(MatExpansionPanel,{static: true}) filterExpansionPanel:MatExpansionPanel;

  constructor(
    injector:Injector,
    protected formBuilder: UntypedFormBuilder,
    protected _state: RxState<DevicePositionMapState>
  ) {
    super(injector, _state);
    this.dataService = injector.get(DevicePositionService);
    this.personService = injector.get(PersonService);
    this.accountService = injector.get(AccountService);

    this.settingsId = 'device-position-map';

    const filterConfig = this.getFilterFormConfig();
    this.filterForm = this.formBuilder.group(filterConfig || {});

    this._autocompleteConfigHolder = new MatAutocompleteConfigHolder({
      getUserAttributes: (a, b) => this.settings.getFieldDisplayAttributes(a, b)
    });
    this.autocompleteFields = this._autocompleteConfigHolder.fields;
  }

  ngOnInit() {
    super.ngOnInit();

    // Combo: recorder person
    const personAttributes = this.settings.getFieldDisplayAttributes('person', ['lastName', 'firstName', 'department.name'])
    this.registerAutocompleteField('person', {
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: personAttributes,
      displayWith: PersonUtils.personToString,
      mobile: this.mobile
    });

    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(250),
          filter(() => this.filterForm.valid),
          tap(value => {
            const filter = DevicePositionFilter.fromObject(value);
            // Done in setFilter
            // this.filterCriteriaCount = filter.countNotEmptyCriteria();
            this.markForCheck();
            this.setFilter(filter, {emitEvent: false})
          }),
          debounceTime(500),
          tap(json => this.persistFilterInSettings && this.settings.savePageSetting(this.settingsId, json, DEVICE_POSITION_MAP_SETTINGS.FILTER_KEY))
        )
        .subscribe((sub) => this.onRefresh.emit())
    );

    this.registerSubscription(
      this.onRefresh
        .pipe(
          // mergeMap(() => this.configService.ready()),
          // filter(() => false && this.accountService.isAdmin()),
          switchMap((event: any) => this.dataService.watchAll(
                0, 1000, null, null, this.filter
            )),
          catchError(err => {
            if (this._debug) console.error(err);
            this.setError(err && err.message || err);
            return of(undefined); // Continue
          })
        )
        .subscribe((res) => this.updateView(res as LoadResult<T>))
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  protected load() {
    this.onRefresh.emit();
  }

  protected onFeatureClick(feature: Feature) {
    // TODO
    console.info(this._logPrefix + 'Click on feature', feature);
  }

  resetFilter() {
    this.filterForm.reset({}, {emitEvent: true});
    const filter = this.asFilter({});
    this.setFilter(filter, {emitEvent: true});
    this.filterCriteriaCount = 0;
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
  }

  applyFilterAndClosePanel(event?:Event) {
    this.onRefresh.emit(event);
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
  }

  clearControlValue(event: Event, formControl: AbstractControl): boolean {
    if (event) event.stopPropagation(); // Avoid to enter input the field
    formControl.setValue(null);
    return false;
  }

  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  closeFilterPanel() {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
  }

  // setFilter(filter: Partial<F>, opts?: { emitEvent: boolean }) {
  //
  //   filter = this.asFilter(filter);
  //
  //   // Update criteria count
  //   const criteriaCount = filter.countNotEmptyCriteria();
  //   if (criteriaCount !== this.filterCriteriaCount) {
  //     this.filterCriteriaCount = criteriaCount;
  //     this.markForCheck();
  //   }
  //
  //   // Update the form content
  //   if (!opts || opts.emitEvent !== false) {
  //     this.filterForm.patchValue(filter.asObject(), {emitEvent: false});
  //   }
  //
  //   super.setFilter(filter as F, opts);
  // }

  protected getFilterFormConfig(): any {
    console.debug(`${this._logPrefix} : Creating filter form group...`);

    // // Base form config
    const config = {
    };

    // Add other properties
    return Object.keys(new DevicePositionFilter())
      .filter(key => !IGNORED_ENTITY_COLUMNS.includes(key) && !config[key])
      .reduce((config, key) => {
        console.debug(`${this._logPrefix} : Adding filter control: ${key}`);
        config[key] = [null];
        return config;
      }, config);
  }

  setFilter(filter: Partial<DevicePositionFilter>, opts?: { emitEvent: boolean }) {
    const filterInstance = this.asFilter(filter);
    // Update criteria count
    const criteriaCount = filterInstance.countNotEmptyCriteria();
    if (criteriaCount !== this.filterCriteriaCount) {
      this.filterCriteriaCount = criteriaCount;
      this.markForCheck();
    }

    // Update the form content
    if (this.filterForm && (!opts || opts.emitEvent !== false)) {
      this.filterForm.patchValue(filterInstance.asObject(), {emitEvent: false});
    }

    this.applyFilter(filterInstance, opts);
  }

  async updateView(res: LoadResult<T> | undefined, opts?: {emitEvent?: boolean;}): Promise<void> {
    if (!res) {
      this.totalRowCount = 0;
      this.data = [];
      return; // Skip (e.g error)
    }
    const {data, total} = res;

    this.totalRowCount = toNumber(total, data?.length || 0);
    this.data = data as T[] | [];
    if (this._debug) console.debug(`${this._logPrefix} : ${this.totalRowCount} items loaded`);

    await this.loadLayers();

    if (!opts || opts.emitEvent !== false) {
      this.markAsLoaded({emitEvent: false});
    }

    this.markForCheck();
  }

  protected asFilter(source: Partial<DevicePositionFilter>): DevicePositionFilter {
    const target = new DevicePositionFilter();
    if (source) target.fromObject(source);
    return target;
  }

  private applyFilter(filter:DevicePositionFilter, opts: { emitEvent?: boolean; }) {
    if (this._debug) console.debug(`${this._logPrefix} Applying filter`, filter);
    this.filter = filter;
    if (opts && opts.emitEvent) {
      this.onRefresh.emit();
    }
  }

  protected registerAutocompleteField<E = any, EF = any>(fieldName: string, options?: MatAutocompleteFieldAddOptions<E, EF>): MatAutocompleteFieldConfig<E, EF> {
    return this._autocompleteConfigHolder.add(fieldName, options);
  }

  async loadLayers(): Promise<void> {
    // Should never call load() without leaflet map
    if (!this.map) return; // Skip

    if (this._debug) console.debug(this._logPrefix + 'Creating layers...');

    try {
      // Clean existing layers, if any
      this.cleanMapLayers();

      // Create  layer
      const layer = L.geoJSON(null, {
        onEachFeature: this.showTooltip ? this.onEachFeature.bind(this) : undefined,
        style: (feature) => this.getFeatureStyle(feature)
      });
      this.layers.push(layer);

      // Add each position to layer
      (this.data || [])
        //.sort(EntityUtils.sortComparator('dateTime', 'asc'))
        .forEach((position, index) => {
            const feature = this.toFeature(position, index);
            if (!feature) return; // Skip if empty

            // Add feature to layer
            layer.addData(feature);
          });

      const layerName = 'Positions' // TODO this.translate.instant(...)
    this.layersControl.overlays[layerName] = layer;
      this.layers.forEach(layer => layer.addTo(this.map));

      await this.flyToBounds();

    } catch (err) {
      console.error("[operations-map] Error while load layers:", err);
      this.error = err && err.message || err;
    } finally {
      this.markForCheck();
    }
  }

  protected toFeature(source: DevicePosition<any>, index: number): Feature {

    // Create feature
    const features = <Feature>{
      type: 'Feature',
      geometry: <Point>{ type: "Point", coordinates: [source.longitude, source.latitude]},
      id: source.id,
      properties: {
        first: index === 0,
        ...source,
        // Replace date with a formatted date
        // TODO
        //dateTime: this.dateFormat.transform(source.startDateTime || source.fishingStartDateTime, { time: true }),
        //recorderPerson: // TODO
        // Add index
        index
      }
    };

    return features;
  }

  protected getFeatureStyle(_feature?: Feature): PathOptions {
    return {
      weight: 10,
      opacity: 0.8,
      color: 'blue'
    };
  }
}
