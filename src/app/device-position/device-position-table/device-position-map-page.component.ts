import {ChangeDetectorRef, Component, EventEmitter, InjectionToken, Injector, Input, OnInit, ViewChild} from '@angular/core';
import {AbstractControl, UntypedFormBuilder, UntypedFormGroup} from '@angular/forms';
import {MatExpansionPanel} from '@angular/material/expansion';
import {BehaviorSubject, Subscription} from 'rxjs';
import {IGNORED_ENTITY_COLUMNS} from '@app/referential/table/referential.table';
import {DevicePosition, DevicePositionFilter} from '@app/data/services/model/device-position.model';
import {DevicePositionService} from '@app/data/services/device-position.service';
import {BaseReferentialFilter} from '@app/referential/services/filter/referential.filter';
import {
  isNotNil,
  LoadResult,
  LocalSettingsService,
  MatAutocompleteConfigHolder,
  MatAutocompleteFieldAddOptions,
  MatAutocompleteFieldConfig, PersonService,
  PersonUtils,
  SharedValidators,
  StatusIds,
  toBoolean
} from '@sumaris-net/ngx-components';
import {debounceTime, filter, tap} from 'rxjs/operators';
import { environment } from '@environments/environment';
import {refresh} from 'ionicons/icons';

export const DEVICE_POSITION_MAP_SETTINGS = {
  FILTER_KEY: 'filter',
};

@Component({
  selector: 'app-device-position-map',
  templateUrl: './device-position-map-page.component.html',
  styleUrls: ['./device-position-map-page.component.scss'],
})
export class DevicePositionMapPage implements OnInit {

  private _logPrefix:string = `[${this.constructor.name}] : `;
  private _debug:boolean = false;

  protected _autocompleteConfigHolder:MatAutocompleteConfigHolder;
  protected _subscription:Subscription = new Subscription();
  protected filter:DevicePositionFilter = new DevicePositionFilter();
  protected dataService:DevicePositionService;
  protected personService:PersonService;
  protected settings:LocalSettingsService;
  protected cd:ChangeDetectorRef;
  readonly loadingSubject:BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  readonly mobile: boolean;

  totalResult:number = 0;
  settingsId:string;
  filterForm:UntypedFormGroup;

  i18nprefix:string = "DEVICE_POSITION.PAGE.";
  title:string = "TITLE";
  filterCriteriaCount:number = 0;
  filterPanelFloating:boolean = true;

  autocompleteFields:{[key:string]:MatAutocompleteFieldConfig};
  onRefresh:EventEmitter<any> = new EventEmitter<any>();

  @ViewChild(MatExpansionPanel,{static: true}) filterExpansionPanel:MatExpansionPanel;
  @Input() persistFilterInSettings: boolean = true;

  constructor(
    injector:Injector,
    protected formBuilder: UntypedFormBuilder,
  ) {
    this._debug = !environment.production;
    this.settings = injector.get(LocalSettingsService);
    this.dataService = injector.get(DevicePositionService);
    this.personService = injector.get(PersonService);
    this.cd = injector.get(ChangeDetectorRef);

    this.settingsId = this.constructor.name;

    const filterConfig = this.getFilterFormConfig();
    this.filterForm = this.formBuilder.group(filterConfig || {});

    this._autocompleteConfigHolder = new MatAutocompleteConfigHolder({
      getUserAttributes: (a, b) => this.settings.getFieldDisplayAttributes(a, b)
    });
    this.autocompleteFields = this._autocompleteConfigHolder.fields;

    this.mobile = this.settings.mobile;
  }

  ngOnInit() {

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
      // TODO : Need to define pageOffset and pageSize
      this.dataService.watchAll(0, 9999, 'id', 'asc', this.filter).subscribe((res) => {
        this.updateView(res);
      })
    );

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
        .subscribe((sub) => {
          this.onRefresh.emit();
          console.debug("MYTEST UPDATE FILTER");
        })
    );

    this.registerSubscription(
      this.onRefresh
        // .pipe(
        //   startWith<any, any>((this.autoLoad ? {} : 'skip') as any),
        //   switchMap(
        //     (event: any) => {
        //       this.dirtySubject.next(false);
        //       this.selection.clear();
        //       if (event === 'skip') {
        //         return of(undefined);
        //       }
        //       if (!this._dataSource) {
        //         if (this.debug) console.debug('[table] Skipping data load: no dataSource defined');
        //         return of(undefined);
        //       }
        //       if (this.debug) console.debug('[table] Calling dataSource.watchAll()...');
        //       return this._dataSource.watchAll(
        //         this.pageOffset,
        //         this.pageSize,
        //         this.sortActive,
        //         this.sortDirection,
        //         this._filter
        //       );
        //     }),
        //   catchError(err => {
        //     if (this.debug) console.error(err);
        //     this.setError(err && err.message || err);
        //     return of(undefined); // Continue
        //   })
        // )
        .subscribe((res) => {
          console.debug("MYTEST REFRESH");
          // this.updateView(res as LoadResult<T> | undefined)
        }));
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
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

  protected registerSubscription(sub: Subscription) {
    this._subscription.add(sub);
  }

  markAsLoaded(opts?: {emitEvent?: boolean}) {
    this.setLoading(false, opts);
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

  async updateView(res: LoadResult<DevicePosition<any, any>> | undefined, opts?: {emitEvent?: boolean;}): Promise<void> {
    if (!res) return; // Skip (e.g error)
    if (res && res.data) {
      this.totalResult = isNotNil(res.total) ? res.total : 0;
      if (this._debug) console.debug(`${this._logPrefix} : ${res.data.length} items loaded`);
    } else {
      this.totalResult = 0;
      if (this._debug) console.debug(`${this._logPrefix} : NO items loaded`);
    }

    if (!opts || opts.emitEvent !== false) {
      this.markAsLoaded({emitEvent: false});
    }

    this.markForCheck();
  }
  protected markForCheck() {
    this.cd.markForCheck();
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

  private setLoading(value: boolean, opts?: {emitEvent?: boolean}) {
    if (this.loadingSubject.value !== value)  {
      this.loadingSubject.next(value);
      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }

  protected registerAutocompleteField<E = any, EF = any>(fieldName: string, options?: MatAutocompleteFieldAddOptions<E, EF>): MatAutocompleteFieldConfig<E, EF> {
    return this._autocompleteConfigHolder.add(fieldName, options);
  }
}
