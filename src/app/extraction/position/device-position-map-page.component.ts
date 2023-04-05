import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Injector, Input, OnInit, QueryList, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material/expansion';
import { of } from 'rxjs';
import { IGNORED_ENTITY_COLUMNS } from '@app/referential/table/referential.table';
import { DevicePosition, DevicePositionFilter } from '@app/data/services/model/device-position.model';
import { DevicePositionService } from '@app/data/services/device-position.service';
import {
  AccountService, arrayDistinct,
  capitalizeFirstLetter, Color, ColorScale, isNil,
  isNilOrNaN, isNotNil,
  LoadResult,
  MatAutocompleteConfigHolder,
  MatAutocompleteFieldAddOptions,
  MatAutocompleteFieldConfig, Person,
  PersonService,
  PersonUtils,
  StatusIds,
  toNumber
} from '@sumaris-net/ngx-components';
import { catchError, debounceTime, filter, switchMap, tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { RxState } from '@rx-angular/state';
import { L } from '@app/shared/map/leaflet';
import { PathOptions } from 'leaflet';
import { BaseMap, BaseMapState } from '@app/shared/map/base-map.class';
import { Feature, Point } from 'geojson';
import { ObjectTypeEnum } from '@app/referential/services/model/model.enum';
import { IonGrid, NavController } from '@ionic/angular';

export const DEVICE_POSITION_MAP_SETTINGS = {
  FILTER_KEY: 'filter',
};
export interface DevicePositionMapState extends BaseMapState {
  features: Feature[];
  total: number;
  visibleTotal: number;
}

@Component({
  selector: 'app-device-position-map',
  templateUrl: './device-position-map-page.component.html',
  styleUrls: ['./device-position-map-page.component.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DevicePositionMapPage
  extends BaseMap<DevicePositionMapState>
  implements OnInit {

  protected readonly features$ = this._state.select('features');

  protected _autocompleteConfigHolder:MatAutocompleteConfigHolder;
  protected filter:DevicePositionFilter = new DevicePositionFilter();

  filterForm: UntypedFormGroup;

  i18nPrefix = 'DEVICE_POSITION.MAP.';
  title = 'TITLE';
  filterCriteriaCount = 0;
  filterPanelFloating = true;

  autocompleteFields: {[key:string]:MatAutocompleteFieldConfig};
  onRefresh = new EventEmitter<any>();

  @Input() persistFilterInSettings = true;
  @Input() showTooltip = true;

  @ViewChild('filterExpansionPanel',{static: true}) filterExpansionPanel:MatExpansionPanel;
  @ViewChild('tableExpansionPanel',{static: true}) tableExpansionPanel:MatExpansionPanel;
  @ViewChild('table',{static: true, read: ElementRef}) tableElement: ElementRef;
  @ViewChildren('tableRows', {read: ElementRef}) tableRows!: QueryList<ElementRef>;

  get total() {
    return this._state.get('total');
  }
  get visibleTotal() {
    return this._state.get('visibleTotal');
  }

  constructor(
    injector:Injector,
    protected formBuilder: UntypedFormBuilder,
    protected _state: RxState<DevicePositionMapState>,
    protected dataService: DevicePositionService,
    protected personService: PersonService,
    protected accountService: AccountService,
    protected renderer: Renderer2,
    protected navController: NavController
  ) {
    super(injector, _state, {
      maxZoom: 14 // Need by SFA
    });

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
                0, 100, 'dateTime', 'desc', this.filter
            )),
          catchError(err => {
            if (this._debug) console.error(err);
            this.setError(err && err.message || err);
            return of(undefined); // Continue
          })
        )
        .subscribe((res) => this.updateView(res))
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  protected load() {
    this.onRefresh.emit();
  }

  protected onFeatureClick(feature: Feature) {
    console.info(this._logPrefix + 'Click on feature', feature);

    // Highlight the row
    this.selection.toggle(feature);
    this.markForCheck();

    // Scroll to row
    const index = this._state.get('features')?.findIndex(f => f === feature);
    if (index !== -1) {
      this.scrollToRow(index);
    }
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
        behavior: 'smooth'
      });
    }
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

  async updateView(res: LoadResult<DevicePosition> | undefined, opts?: {emitEvent?: boolean;}): Promise<void> {
    let {data, total} = res;

    data = data || [];
    total = toNumber(total, data?.length || 0);

    // Add fake data
    if (!environment.production && data && data.length < 10) {
      const fakeData = new Array(100).fill({});
      data = fakeData.map((item, index) =>  {
        const newPosition = Object.assign({}, data[index % data.length]);
        newPosition.latitude += Math.random() * 0.01;
        newPosition.longitude += Math.random() * 0.01;
        return newPosition;
      });
      total = data.length;
    }

    if (this._debug) console.debug(`${this._logPrefix} : ${total} items loaded`);

    const features = await this.loadLayers(data);

    // Update state
    this._state.set(state => <DevicePositionMapState>{
      ...state, features, total, visibleTotal: features.length
    });


    if (!opts || opts.emitEvent !== false) {

      // Open table, if has data
      if (total) this.tableExpansionPanel.open();
      else this.tableExpansionPanel.close();

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

  async loadLayers(data: DevicePosition[]): Promise<Feature[]> {
    // Should never call load() without leaflet map
    if (!this.map) return; // Skip

    if (this._debug) console.debug(this._logPrefix + 'Creating layers...');

    try {
      // Clean existing layers, if any
      this.cleanMapLayers();

      const persons: Person[] = arrayDistinct((data || []).map(position => position.recorderPerson).filter(p => isNotNil(p?.id)), 'id');
      const layerByPersonId = persons.reduce((res, p, index) => {
        const layer = L.geoJSON(null, {
          onEachFeature: this.showTooltip ? this.onEachFeature.bind(this) : undefined
        });
        res[p.id] = layer;
        this.layers.push(layer);
        return res;
      }, {})

      // Add each position to layer
      const features = (data || [])
        .map((position, index) => {
          const personId = position.recorderPerson?.id;
          if (isNil(personId)) return;
          const feature = this.toFeature(position, index);
          if (!feature) return; // Skip if empty

          // Add feature to layer
          const layer = layerByPersonId[personId];
          layer.addData(feature);
          return feature;
        }).filter(isNotNil);

      persons.forEach(p => {
        const layer = layerByPersonId[p.id];
        const layerName = PersonUtils.personToString(p);
        this.layersControl.overlays[layerName] = layer;
      })

      this.layers.forEach(layer => layer.addTo(this.map));

      await this.flyToBounds();

      return features;

    } catch (err) {
      console.error("[operations-map] Error while load layers:", err);
      this.error = err && err.message || err;
    } finally {
      this.markForCheck();
    }
  }

  protected toFeature(position: DevicePosition, index: number): Feature {

    // Create feature
    const features = <Feature>{
      id: position.id,
      type: 'Feature',
      geometry: <Point>{ type: "Point", coordinates: [position.longitude, position.latitude]},
      properties: {
        ...position,
        objectTypeName: this.getObjectTypeName(position)
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

  protected getObjectTypeName(position: DevicePosition): string {
    if (!position) return '';
    const objectType = position.objectType?.label;
    if (objectType) {
      switch (objectType) {
        case ObjectTypeEnum.TRIP:
          return this.translate.instant('TRIP.TITLE')
        case ObjectTypeEnum.OBSERVED_LOCATION:
          return this.translate.instant('OBSERVED_LOCATION.TITLE')
      }
      return objectType.split('_').map(capitalizeFirstLetter).join(' ');
    }
  }

  protected async openEditor(position: DevicePosition|any) {
    const objectId = +position.objectId;
    const objectType = position.objectType?.label;
    if (isNilOrNaN(objectId) && objectType) {
      console.error('Missing objectId or objectType.label: ', position);
      return; // Skip
    }
    let path: string;
    switch (objectType) {
      case ObjectTypeEnum.TRIP:
        path = `/trips/${objectId}`
        break;
      case ObjectTypeEnum.OBSERVED_LOCATION:
        path = `/observations/${objectId}`
        break;
    }
    if (!path) {
      console.error('Cannot load router path for objectType: ' + objectType);
      return
    }
    await this.navController.navigateForward(path);
  }
}
