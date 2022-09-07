import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { TableElement, ValidatorService } from '@e-is/ngx-material-table';
import { OperationValidatorService } from '../services/validator/operation.validator';
import { OperationService } from '../services/operation.service';
import { AccountService, AppFormUtils, isNotNil, LatLongPattern, LocalSettings, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { OperationsMap, OperationsMapModalOptions } from './map/operations.map';
import { environment } from '@environments/environment';
import { Operation } from '../services/model/trip.model';
import { OperationFilter } from '@app/trip/services/filter/operation.filter';
import { from, merge } from 'rxjs';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material/expansion';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { DataQualityStatusEnum, DataQualityStatusIds, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { AppBaseTable } from '@app/shared/table/base.table';
import { OperationEditor } from '@app/referential/services/config/program.config';

@Component({
  selector: 'app-operations-table',
  templateUrl: 'operations.table.html',
  styleUrls: ['operations.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: OperationValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationsTable extends AppBaseTable<Operation, OperationFilter> implements OnInit, OnDestroy {

  displayAttributes: {
    [key: string]: string[]
  };
  highlightedRow: TableElement<Operation>;
  statusList = DataQualityStatusList
    .filter(s => s.id !== DataQualityStatusIds.VALIDATED);
  statusById = DataQualityStatusEnum;
  readonly filterForm: FormGroup = this.formBuilder.group({
    tripId: [null],
    dataQualityStatus: [null]
  });

  @Input() latLongPattern: LatLongPattern;
  @Input() showMap: boolean;
  @Input() programLabel: string;
  @Input() showToolbar = true;
  @Input() showPaginator = true;
  @Input() useSticky = true;
  @Input() allowParentOperation = false;
  @Input() showQuality = true;
  @Input() showRowError = false;
  @Input() detailEditor: OperationEditor;
  @Input() canDuplicate: boolean;

  @Input() set tripId(tripId: number) {
    this.setTripId(tripId);
  }

  get tripId(): number {
    return this.filterForm.get('tripId').value;
  }

  @Input() set showQualityColumn(value: boolean) {
    this.setShowColumn('quality', value);
  }

  get showQualityColumn(): boolean {
    return this.getShowColumn('quality');
  }

  get sortActive(): string {
    const sortActive = super.sortActive;
    // Local sort
    if (this.tripId < 0) {
      switch (sortActive) {
        case 'physicalGear':
          //return 'physicalGear.gear.' + this.displayAttributes.gear[0];
        case 'targetSpecies':
        //return 'metier.taxonGroup.' + this.displayAttributes.taxonGroup[0];
        case 'fishingArea':
        //return 'fishingAreas.location.' + this.displayAttributes.fishingArea[0];
          // Fix issue on rankOrder computation
          return 'id';
        default:
          return sortActive;
      }
    }
    // Remote sort
    else {
      switch (sortActive) {
        case 'targetSpecies':
          //return 'metier';
        case 'fishingArea':
          //return 'fishingAreas.location.' + this.displayAttributes.fishingArea[0];
        case 'physicalGear':
          // Fix issue on rankOrder computation
          return 'id';
        default:
          return sortActive;
      }
    }
  }

  @Input() set showPosition(show: boolean) {
    this.setShowColumn('startPosition', show);
    this.setShowColumn('endPosition', show);
  }

  get showPosition(): boolean {
    return this.getShowColumn('startPosition') &&
      this.getShowColumn('endPosition');
  }

  @Input() set showFishingArea(show: boolean) {
    this.setShowColumn('fishingArea', show);
  }

  get showFishingArea(): boolean {
    return this.getShowColumn('fishingArea');
  }

  @Input() set showEndDateTime(show: boolean) {
    this.setShowColumn('endDateTime', show);
  }

  get showEndDateTime(): boolean {
    return this.getShowColumn('endDateTime');
  }

  @Input() set showFishingEndDateTime(show: boolean) {
    this.setShowColumn('fishingEndDateTime', show);
  }

  get showFishingEndDateTime(): boolean {
    return this.getShowColumn('fishingEndDateTime');
  }

  get filterIsEmpty(): boolean {
    return this.filterCriteriaCount === 0;
  }

  get filterDataQualityControl(): FormControl {
    return this.filterForm.controls.dataQualityStatus as FormControl;
  }

  @Output() onDuplicateRow = new EventEmitter<{ data: Operation }>();

  @ViewChild(MatExpansionPanel, {static: true}) filterExpansionPanel: MatExpansionPanel;

  constructor(
    injector: Injector,
    protected settings: LocalSettingsService,
    protected validatorService: ValidatorService,
    protected dataService: OperationService,
    protected accountService: AccountService,
    protected formBuilder: FormBuilder,
    protected cd: ChangeDetectorRef,
  ) {
    super(injector,
      Operation, OperationFilter,
      settings.mobile ?
        ['quality',
          'physicalGear',
          'targetSpecies',
          'startDateTime',
          'endDateTime',
          'fishingEndDateTime',
          'fishingArea'] :
        ['quality',
          'physicalGear',
          'targetSpecies',
          'startDateTime',
          'startPosition',
          'endDateTime',
          'fishingEndDateTime',
          'endPosition',
          'fishingArea',
          'comments'],
        dataService,
        null,
        // DataSource options
        {
          i18nColumnPrefix: 'TRIP.OPERATION.LIST.',
          prependNewElements: false,
          suppressErrors: environment.production,
          readOnly: true,
          watchAllOptions: {
            withBatchTree: false,
            withSamples: false,
            withTotal: true
          }
        }
    );
    this.readOnly = false; // Allow deletion
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.saveBeforeSort = false;
    this.saveBeforeFilter = false;
    this.saveBeforeDelete = false;
    this.autoLoad = false; // waiting parent to be loaded

    this.defaultPageSize = -1; // Do not use paginator
    this.defaultSortBy = this.mobile ? 'startDateTime' : 'endDateTime';
    this.defaultSortDirection = this.mobile ? 'desc' : 'asc';
    this.loadingSubject.next(false);

    // Listen settings changed
    this.registerSubscription(
      merge(
        from(this.settings.ready()),
        this.settings.onChange
      )
        .subscribe(_ => this.configureFromSettings())
    );
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.showMap = toBoolean(this.showMap, false);

    // Mark filter form as pristine
    this.registerSubscription(
      this.onRefresh.subscribe(() => {
        this.filterForm.markAsUntouched();
        this.filterForm.markAsPristine();
      }));

    // Update filter when changes
    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(250),
          filter((_) => {
            const valid = this.filterForm.valid;
            if (!valid && this.debug) AppFormUtils.logFormErrors(this.filterForm);
            return valid && !this.loading;
          }),
          // Update the filter, without reloading the content
          tap(json => this.setFilter(json, {emitEvent: false})),
          // Save filter in settings (after a debounce time)
          debounceTime(500),
          tap(json => this.settings.savePageSetting(this.settingsId, json, AppRootTableSettingsEnum.FILTER_KEY))
        )
        .subscribe());

    // Apply trip id, if already set
    if (isNotNil(this.tripId)) {
      this.setTripId(this.tripId);
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.onDuplicateRow.unsubscribe();
  }

  setTripId(tripId: number, opts?: { emitEvent: boolean; }) {
    this.setFilter(<OperationFilter>{
      ...this.filterForm.value,
      tripId
    }, opts);
  }

  async openMapModal(event?: UIEvent) {

    const res = await this.dataService.loadAllByTrip({
      tripId: this.tripId
    }, {fetchPolicy: 'cache-first', fullLoad: false, withTotal: true /*to make sure cache has been filled*/});

    const modal = await this.modalCtrl.create({
      component: OperationsMap,
      componentProps: <OperationsMapModalOptions>{
        data: [res.data],
        latLongPattern: this.latLongPattern,
        programLabel: this.programLabel
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();
    if (data instanceof Operation) {
      console.info('[operation-table] User select an operation from the map:', data);

      // Open the row
      const row = (await this.dataSource.getRows()).find(row => row.currentData.id === data.id);
      if (row) {
        this.clickRow(null, row);
      }
      else {
        this.openRow(data.id, null);
      }
    }

  }

  clickRow(event: MouseEvent | undefined, row: TableElement<Operation>): boolean {
    this.highlightedRow = row;
    return super.clickRow(event, row);
  }

  async duplicateRow(event?: Event, row?: TableElement<Operation>) {
    event?.stopPropagation();

    row = row || this.singleSelectedRow;
    if (!row || !this.confirmEditCreate(event, row)) {
      return false;
    }

    this.onDuplicateRow.emit({data: row.currentData});

    this.selection.clear();
  }

  async getUsedPhysicalGearIds(): Promise<number[]> {
    return (await this.dataSource.getRows())
      .map(ope => ope.currentData.physicalGear)
      .filter(isNotNil)
      .map(gear => gear.id)
      .reduce((res, id) => res.includes(id) ? res : res.concat(id), []);
  }

  // Changed as public
  getI18nColumnName(columnName: string): string {
    return super.getI18nColumnName(columnName);
  }

  resetFilter(event?: UIEvent) {
    this.setFilter(<OperationFilter>{tripId: this.tripId}, {emitEvent: true});
    this.filterCriteriaCount = 0;
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    this.resetError();
  }

  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  closeFilterPanel() {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    this.filterPanelFloating = true;
  }

  clearFilterValue(key: keyof OperationFilter, event?: UIEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.filterForm.get(key).reset(null);
  }

  // Change visibility to public
  setError(error: string, opts?: {emitEvent?: boolean; showOnlyInvalidRows?: boolean; }) {
    super.setError(error, opts);

    // If error
    if (error) {
      // Add filter on invalid rows (= not controlled)
      if (!opts || opts.showOnlyInvalidRows !== false) {
        this.showRowError = true;
        const filter = this.filter || new OperationFilter();
        filter.dataQualityStatus = 'MODIFIED'; // = not controlled operations
        this.setFilter(filter);
      }
    }
    // No errors
    else {
      // Remove filter on invalid rows
      if (!opts || opts.showOnlyInvalidRows !== true) {
        this.showRowError = false;
        const filter = this.filter || new OperationFilter();
        if (filter.dataQualityStatus === 'MODIFIED') {
          filter.dataQualityStatus = undefined;
          this.setFilter(filter);
        }
      }
    }
  }

  // Change visibility to public
  resetError(opts?: {emitEvent?: boolean; showOnlyInvalidRows?: boolean; }) {
    this.setError(undefined, opts);
  }

  trackByFn(index: number, row: TableElement<Operation>) {
    return row.currentData.id;
  }

  /* -- protected methods -- */

  protected asFilter(source?: any): OperationFilter {
    source = source || this.filterForm.value;
    return OperationFilter.fromObject(source);
  }

  protected configureFromSettings(settings?: LocalSettings) {
    console.debug('[operation-table] Configure from local settings (latLong format, display attributes)...');
    settings = settings || this.settings.settings;

    if (settings.accountInheritance) {
      const account = this.accountService.account;
      this.latLongPattern = account && account.settings && account.settings.latLongFormat || this.settings.latLongFormat;
    }
    else {
      this.latLongPattern = this.settings.latLongFormat;
    }

    this.displayAttributes = {
      gear: this.settings.getFieldDisplayAttributes('gear'),
      physicalGear: this.settings.getFieldDisplayAttributes('gear', ['rankOrder', 'gear.label', 'gear.name']),
      taxonGroup: this.settings.getFieldDisplayAttributes('taxonGroup'),
      fishingArea: this.settings.getFieldDisplayAttributes('fishingArea', ['label'])
    };

    this.markForCheck();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}

