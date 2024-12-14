import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnInit,
  QueryList,
  Renderer2,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material/expansion';
import { BehaviorSubject, merge, of } from 'rxjs';
import { IGNORED_ENTITY_COLUMNS } from '@app/referential/table/referential.table';
import { DevicePosition, DevicePositionFilter } from '@app/data/position/device/device-position.model';
import { DevicePositionService } from '@app/data/position/device/device-position.service';
import {
  AccountService,
  arrayDistinct,
  isNil,
  isNilOrNaN,
  isNotNil,
  LoadResult,
  MatAutocompleteConfigHolder,
  MatAutocompleteFieldAddOptions,
  MatAutocompleteFieldConfig,
  Person,
  PersonService,
  PersonUtils,
  StatusIds,
  toNumber,
} from '@sumaris-net/ngx-components';
import { catchError, debounceTime, filter, switchMap, tap } from 'rxjs/operators';
import { RxState } from '@rx-angular/state';
import { L } from '@app/shared/map/leaflet';
import { BaseMap, BaseMapState } from '@app/shared/map/base-map.class';
import { Feature } from 'geojson';
import { ObjectTypeLabels } from '@app/referential/services/model/model.enum';
import { IonPopover, NavController } from '@ionic/angular';
import { MatPaginator } from '@angular/material/paginator';
import { SortDirection } from '@angular/material/sort';
import { ProgressionModel } from '@app/shared/progression/progression.model';

export const DEVICE_POSITION_MAP_SETTINGS = {
  FILTER_KEY: 'filter',
  PAGE_SIZE: 'pageSize',
};
export interface DevicePositionMapState extends BaseMapState {
  features: Feature[];
  total: number;
  visibleTotal: number;
  downloading: boolean;
  downloadProgression: ProgressionModel;
}

export const DEFAULT_PAGE_SIZE = 100;

@Component({
  selector: 'app-device-position-map',
  templateUrl: './device-position-map-page.component.html',
  styleUrls: ['./device-position-map-page.component.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevicePositionMapPage extends BaseMap<DevicePositionMapState> implements OnInit {
  protected readonly features$ = this._state.select('features');
  protected readonly downloadProgression$ = this._state.select('downloadProgression');

  protected _autocompleteConfigHolder: MatAutocompleteConfigHolder;
  protected filter: DevicePositionFilter = new DevicePositionFilter();

  filterForm: UntypedFormGroup;

  i18nPrefix = 'DEVICE_POSITION.MAP.';
  title = 'TITLE';
  filterCriteriaCount = 0;
  filterPanelFloating = true;
  defaultPageSize = DEFAULT_PAGE_SIZE;
  defaultPageSizeOptions = [100, 500, 1000, 2000];
  defaultSortBy = 'dateTime';
  defaultSortDirection: SortDirection = 'desc';

  autocompleteFields: { [key: string]: MatAutocompleteFieldConfig };
  onRefresh = new EventEmitter<any>();

  @Input() persistFilterInSettings = true;
  @Input() showTooltip = true;

  @ViewChild('filterExpansionPanel', { static: true }) filterExpansionPanel: MatExpansionPanel;
  @ViewChild('tableExpansionPanel', { static: true }) tableExpansionPanel: MatExpansionPanel;
  @ViewChild('table', { static: true, read: ElementRef }) tableElement: ElementRef;
  @ViewChild('paginator', { static: true }) paginator: MatPaginator;
  @ViewChildren('tableRows', { read: ElementRef }) tableRows!: QueryList<ElementRef>;

  get total() {
    return this._state.get('total');
  }
  get visibleTotal() {
    return this._state.get('visibleTotal');
  }

  get pageSize(): number {
    return (this.paginator && this.paginator.pageSize) || this.defaultPageSize || DEFAULT_PAGE_SIZE;
  }

  get pageOffset(): number {
    return (this.paginator && this.paginator.pageIndex * this.paginator.pageSize) || 0;
  }

  get sortBy(): string {
    return this.defaultSortBy;
  }

  get sortDirection(): SortDirection {
    return this.defaultSortDirection;
  }

  constructor(
    injector: Injector,
    protected formBuilder: UntypedFormBuilder,
    protected _state: RxState<DevicePositionMapState>,
    protected dataService: DevicePositionService,
    protected personService: PersonService,
    protected accountService: AccountService,
    protected renderer: Renderer2,
    protected navController: NavController
  ) {
    super(
      injector,
      _state,
      {
        maxZoom: 14, // Need by SFA
      },
      {
        loading: true,
      }
    );

    this.settingsId = 'device-position-map';

    const filterConfig = this.getFilterFormConfig();
    this.filterForm = this.formBuilder.group(filterConfig || {});

    this._autocompleteConfigHolder = new MatAutocompleteConfigHolder({
      getUserAttributes: (a, b) => this.settings.getFieldDisplayAttributes(a, b),
    });
    this.autocompleteFields = this._autocompleteConfigHolder.fields;
  }

  ngOnInit() {
    super.ngOnInit();

    // Combo: recorder person
    const personAttributes = this.settings.getFieldDisplayAttributes('person', ['lastName', 'firstName', 'department.name']);
    this.registerAutocompleteField('person', {
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      },
      attributes: personAttributes,
      displayWith: PersonUtils.personToString,
      mobile: this.mobile,
    });

    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(250),
          filter(() => this.filterForm.valid),
          tap((value) => {
            const filter = DevicePositionFilter.fromObject(value);
            // Done in setFilter
            // this.filterCriteriaCount = filter.countNotEmptyCriteria();
            this.markForCheck();
            this.setFilter(filter, { emitEvent: false });
          }),
          debounceTime(500),
          tap((json) => this.persistFilterInSettings && this.settings.savePageSetting(this.settingsId, json, DEVICE_POSITION_MAP_SETTINGS.FILTER_KEY))
        )
        .subscribe()
    );

    this.registerSubscription(
      merge(
        this.onRefresh,
        this.paginator.page.pipe(
          // Save page size in settings
          tap(() => this.savePageSettings(this.paginator.pageSize, DEVICE_POSITION_MAP_SETTINGS.PAGE_SIZE))
        )
      )
        .pipe(
          tap(() => this.markAsLoading()),
          debounceTime(100),
          switchMap(() => this.dataService.watchAll(this.pageOffset, this.pageSize, this.sortBy, this.sortDirection, this.filter)),
          catchError((err) => {
            if (this._debug) console.error(err);
            this.setError((err && err.message) || err);
            return of(undefined); // Continue
          })
        )
        .subscribe((res) => this.updateView(res))
    );
  }

  protected load() {
    this.emitRefresh();
  }

  protected onFeatureClick(feature: Feature) {
    console.info(this._logPrefix + 'Click on feature', feature);

    // Highlight the row
    this.selection.setSelection(feature);

    // Highlight marker
    this.highlightMarker(feature);

    // Scroll to row
    const index = this._state.get('features')?.findIndex((f) => f === feature);
    if (index !== -1) {
      this.scrollToRow(index);
    }

    this.markForCheck();
  }

  protected scrollToRow(index: number) {
    const rowElement = this.tableRows.get(index);
    if (!rowElement) {
      console.warn(this._logPrefix + 'Cannot found row by index=' + index);
      return;
    }
    const rowRect = rowElement.nativeElement.getBoundingClientRect();
    const gridRect = this.tableElement.nativeElement.getBoundingClientRect();

    if (rowRect.top < gridRect.top || rowRect.bottom > gridRect.bottom) {
      this.tableElement.nativeElement.scrollTo({
        top: rowElement.nativeElement.offsetTop - (gridRect.height - rowRect.height) / 2,
        behavior: 'smooth',
      });
    }
  }

  resetFilter() {
    this.filterForm.reset({}, { emitEvent: true });
    const filter = this.asFilter({});
    this.setFilter(filter, { emitEvent: true });
    this.filterCriteriaCount = 0;
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
  }

  applyFilterAndClosePanel(event?: Event) {
    this.emitRefresh(event);
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

  protected getPageSettings<T = any>(propertyName?: string): T {
    return this.settings.getPageSettings(this.settingsId, propertyName);
  }

  protected async savePageSettings(value: any, propertyName?: string) {
    await this.settings.savePageSetting(this.settingsId, value, propertyName);
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
    const config = {};

    // Add other properties
    return Object.keys(new DevicePositionFilter())
      .filter((key) => !IGNORED_ENTITY_COLUMNS.includes(key) && !config[key])
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
      this.filterForm.patchValue(filterInstance.asObject(), { emitEvent: false });
    }

    this.applyFilter(filterInstance, opts);
  }

  async updateView(res: LoadResult<DevicePosition> | undefined, opts?: { emitEvent?: boolean }): Promise<void> {
    let { data, total } = res;

    data = data || [];
    total = toNumber(total, data?.length || 0);

    // Add fake data
    /*if (!environment.production && data && data.length < 10) {
      const fakeData = new Array(100).fill({});
      data = fakeData.map((item, index) =>  {
        const newPosition = DevicePosition.fromObject({...data[index % data.length].asObject()});
        newPosition.latitude += Math.random() * 0.01;
        newPosition.longitude += Math.random() * 0.01;
        return newPosition;
      });
      total = data.length;
    }*/

    if (this._debug) console.debug(`${this._logPrefix} : ${total} items loaded`);

    const features = await this.loadLayers(data);

    // Update state
    this._state.set(
      (state) =>
        <DevicePositionMapState>{
          ...state,
          features,
          total,
          visibleTotal: Math.min(this.pageSize, features.length),
        }
    );

    if (!opts || opts.emitEvent !== false) {
      // Open table, if has data
      if (total) this.tableExpansionPanel.open();
      else this.tableExpansionPanel.close();

      this.markAsLoaded({ emitEvent: false });
    }

    this.markForCheck();
  }

  protected asFilter(source: Partial<DevicePositionFilter>): DevicePositionFilter {
    const target = new DevicePositionFilter();
    if (source) target.fromObject(source);
    return target;
  }

  private applyFilter(filter: DevicePositionFilter, opts: { emitEvent?: boolean }) {
    if (this._debug) console.debug(`${this._logPrefix} Applying filter`, filter);
    this.filter = filter;
    if (opts && opts.emitEvent) {
      this.emitRefresh();
    }
  }

  protected registerAutocompleteField<E = any, EF = any>(
    fieldName: string,
    options?: MatAutocompleteFieldAddOptions<E, EF>
  ): MatAutocompleteFieldConfig<E, EF> {
    return this._autocompleteConfigHolder.add(fieldName, options);
  }

  async loadLayers(data: DevicePosition[]): Promise<Feature[]> {
    // Should never call load() without leaflet map
    if (!this.map) return; // Skip

    if (this._debug) console.debug(this._logPrefix + 'Creating layers...');

    try {
      // Clean existing layers, if any
      this.cleanMapLayers();
      const dateTimePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');

      const persons: Person[] = arrayDistinct(
        (data || []).map((position) => position.recorderPerson).filter((p) => isNotNil(p?.id)),
        'id'
      );
      const layerByPersonId = persons.reduce((res, p, index) => {
        const layer = L.geoJSON(null, {
          onEachFeature: this.showTooltip ? this.onEachFeature.bind(this) : undefined,
        });
        res[p.id] = layer;
        this.layers.push(layer);
        return res;
      }, {});

      // Add each position to layer
      const features = (data || [])
        .map((position, index) => {
          const personId = position.recorderPerson?.id;
          if (isNil(personId)) return;
          const feature = this.dataService.toGeoJsonFeature(position, { dateTimePattern });
          if (!feature) return; // Skip if empty

          // Add feature to layer
          const layer = layerByPersonId[personId];
          layer.addData(feature);
          return feature;
        })
        .filter(isNotNil);

      persons.forEach((p) => {
        const layer = layerByPersonId[p.id];
        const layerName = PersonUtils.personToString(p);
        this.layersControl.overlays[layerName] = layer;
      });

      this.layers.forEach((layer) => layer.addTo(this.map));

      await this.flyToBounds();

      return features;
    } catch (err) {
      console.error('[operations-map] Error while load layers:', err);
      this.error = (err && err.message) || err;
    } finally {
      this.markForCheck();
    }
  }

  protected async onRowClick(event: Event, feature: Feature) {
    if (event?.defaultPrevented) return;
    event?.preventDefault();

    // Highlight the row
    this.selection.setSelection(feature);

    // Highlight the marker
    this.highlightMarker(feature);

    this.markForCheck();
  }

  protected highlightMarker(feature: Feature, sizeFactor = 1.1) {
    // Select the marker
    this.layers.forEach((layer) => {
      const geoJsonLayer = layer as L.GeoJSON;
      geoJsonLayer.eachLayer((m) => {
        const marker = m as L.Marker;
        if (marker.feature.id === feature.id) {
          marker['_selected'] = true;
          marker.setIcon(
            L.icon({
              iconUrl: 'assets/icons/marker-selected.svg',
              shadowUrl: 'marker-shadow.png',
              iconSize: [25 * sizeFactor, 41 * sizeFactor],
              iconAnchor: [12 * sizeFactor, 41 * sizeFactor],
              popupAnchor: [1, -34],
              shadowSize: [41 * sizeFactor, 41 * sizeFactor],
            })
          );
        } else if (marker['_selected']) {
          marker.setIcon(
            L.icon({
              iconUrl: 'marker-icon.png',
              shadowUrl: 'marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            })
          );
          delete marker['_selected'];
        }
      });
    });
  }

  protected async onOpenDataClick(event: Event, position: DevicePosition | any) {
    if (event?.defaultPrevented) return;
    event?.preventDefault();

    const objectId = +position.objectId;
    const objectType = position.objectType?.label;
    if (isNilOrNaN(objectId) && objectType) {
      console.error('Missing objectId or objectType.label: ', position);
      return; // Skip
    }
    let path: string;
    switch (objectType) {
      case ObjectTypeLabels.TRIP:
        path = `/trips/${objectId}`;
        break;
      case ObjectTypeLabels.OBSERVED_LOCATION:
        path = `/observations/${objectId}`;
        break;
    }
    if (!path) {
      console.error('Cannot load router path for objectType: ' + objectType);
      return;
    }
    await this.navController.navigateForward(path);
  }

  protected async download(event: MouseEvent | TouchEvent | PointerEvent, format: 'csv' | 'geojson', popover: IonPopover) {
    const progression = new BehaviorSubject<number>(0);
    const maxProgression = 100;
    const progressionModel = new ProgressionModel({
      message: 'INFO.DOWNLOADING_DOTS',
      current: 0,
      total: maxProgression,
      cancelled: false,
    });
    const subscription = progression.subscribe((current) => (progressionModel.current = current));
    subscription.add(() => this.unregisterSubscription(subscription));

    this.registerSubscription(subscription);
    this._state.set('downloadProgression', () => progressionModel);

    popover.present(event);
    this.markForCheck();

    switch (format) {
      case 'geojson':
        await this.dataService.downloadAsGeoJson(this.filter, { progression, maxProgression });
        break;
      default:
        await this.dataService.downloadAsCsv(this.filter, { progression, maxProgression });
        break;
    }

    await popover.dismiss();
    this._state.set('downloadProgression', () => null);
    subscription.unsubscribe();
  }

  protected emitRefresh(value?: any) {
    // Emit onRefresh if not closed (can happen if component is destroyed to early)
    if (!!this.onRefresh && !this.onRefresh.closed) {
      this.onRefresh.emit(value);
    }
  }
}
