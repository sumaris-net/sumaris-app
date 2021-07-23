import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, Optional, Output, TemplateRef, ViewChild} from '@angular/core';
import {TableElement, ValidatorService} from '@e-is/ngx-material-table';
import {SampleValidatorService} from '../services/validator/sample.validator';
import {
  AppFormUtils, AppValidatorService, ColorName,
  firstNotNilPromise,
  InMemoryEntitiesService,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil, isNotNilOrBlank,
  LoadResult,
  ObjectMap,
  PlatformService,
  ReferentialRef,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  toBoolean,
  toNumber,
  UsageMode
} from '@sumaris-net/ngx-components';
import * as momentImported from 'moment';
import {Moment} from 'moment';
import {AppMeasurementsTable, AppMeasurementsTableOptions} from '../measurement/measurements.table.class';
import {ISampleModalOptions, SampleModal} from './sample.modal';
import {FormGroup} from '@angular/forms';
import {TaxonGroupRef, TaxonNameRef} from '../../referential/services/model/taxon.model';
import {Sample} from '../services/model/sample.model';
import {AcquisitionLevelCodes, ParameterGroups, PmfmIds} from '../../referential/services/model/model.enum';
import {ReferentialRefService} from '../../referential/services/referential-ref.service';
import {environment} from '../../../environments/environment';
import {debounceTime, filter, map, tap} from 'rxjs/operators';
import {IDenormalizedPmfm, IPmfm, PmfmUtils} from '../../referential/services/model/pmfm.model';
import {SampleFilter} from '../services/filter/sample.filter';
import {PmfmFilter, PmfmService} from '@app/referential/services/pmfm.service';
import {SelectPmfmModal} from '@app/referential/pmfm/select-pmfm.modal';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {DenormalizedPmfmStrategy} from '@app/referential/services/model/pmfm-strategy.model';
import {MatMenu} from '@angular/material/menu';

const moment = momentImported;

export type PmfmValueColorFn = (value: any, pmfm: IPmfm) => ColorName;

export class SamplesTableOptions extends AppMeasurementsTableOptions<Sample> {

}

declare interface GroupColumnDefinition {
  key: string;
  label?: string;
  name?: string;
  colSpan: number;
  cssClass?: string;
}

export const SAMPLE_RESERVED_START_COLUMNS: string[] = ['label', 'taxonGroup', 'taxonName', 'sampleDate'];
export const SAMPLE_RESERVED_END_COLUMNS: string[] = ['comments'];
export const SAMPLE_TABLE_DEFAULT_I18N_PREFIX = 'TRIP.SAMPLE.TABLE.';

@Component({
  selector: 'app-samples-table',
  templateUrl: 'samples.table.html',
  styleUrls: ['samples.table.scss'],
  providers: [
    {provide: AppValidatorService, useExisting: SampleValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplesTable extends AppMeasurementsTable<Sample, SampleFilter> {

  private _footerRowsSubscription: Subscription;
  protected cd: ChangeDetectorRef;
  protected referentialRefService: ReferentialRefService;
  protected pmfmService: PmfmService;

  // Top group header
  groupHeaderStartColSpan: number;
  groupHeaderEndColSpan: number;
  pmfmGroups$ = new BehaviorSubject<ObjectMap<number[]>>(null);
  pmfmGroupColumns$ = new BehaviorSubject<GroupColumnDefinition[]>([]);
  groupHeaderColumnNames: string[] = [];
  footerColumns: string[] = ['footer-start'];
  showFooter: boolean;
  showTagCount: boolean;
  tagCount$ = new BehaviorSubject<number>(0);

  @Input() showGroupHeader = false;
  @Input() useSticky = false;
  @Input() canAddPmfm = false;
  @Input() showError = true;
  @Input() showToolbar: boolean;
  @Input() usageMode: UsageMode;
  @Input() showLabelColumn = false;
  @Input() showDateTimeColumn = true;
  @Input() showPmfmDetails = false;
  @Input() showFabButton = false;
  @Input() defaultSampleDate: Moment;
  @Input() defaultTaxonGroup: ReferentialRef;
  @Input() defaultTaxonName: ReferentialRef;
  @Input() defaultLocation: ReferentialRef;
  @Input() modalOptions: Partial<ISampleModalOptions>;
  @Input() compactFields = true;

  @Input() set pmfmGroups(value: ObjectMap<number[]>) {
    if (this.pmfmGroups$.getValue() !== value) {
      this.showGroupHeader = true;
      this.showToolbar = false;
      this.pmfmGroups$.next(value);
    }
  }

  get pmfmGroups(): ObjectMap<number[]> {
    return this.pmfmGroups$.getValue();
  }

  @Input()
  set value(data: Sample[]) {
    this.memoryDataService.value = data;
  }

  get value(): Sample[] {
    return this.memoryDataService.value;
  }

  @Input()
  set showTaxonGroupColumn(value: boolean) {
    this.setShowColumn('taxonGroup', value);
  }

  get showTaxonGroupColumn(): boolean {
    return this.getShowColumn('taxonGroup');
  }

  @Input()
  set showTaxonNameColumn(value: boolean) {
    this.setShowColumn('taxonName', value);
  }

  get showTaxonNameColumn(): boolean {
    return this.getShowColumn('taxonName');
  }

  get memoryDataService(): InMemoryEntitiesService<Sample, SampleFilter> {
    return this.dataService as InMemoryEntitiesService<Sample, SampleFilter>;
  }

  @Output() onPrepareRowForm = new EventEmitter<{form: FormGroup, pmfms: IPmfm[]}>();

  @ViewChild('optionsMenu') optionMenu: MatMenu;

  constructor(
    injector: Injector,
    @Optional() options?: SamplesTableOptions
  ) {
    super(injector,
      Sample,
      new InMemoryEntitiesService(Sample, SampleFilter, {
        equals: Sample.equals,
        sortByReplacement: {'id': 'rankOrder'}
      }),
      injector.get(PlatformService).mobile ? null : injector.get(AppValidatorService),
      {
        prependNewElements: false,
        suppressErrors: environment.production,
        reservedStartColumns: SAMPLE_RESERVED_START_COLUMNS,
        reservedEndColumns: SAMPLE_RESERVED_END_COLUMNS,
        requiredStrategy: false,
        debug: !environment.production,
        ...options,
        // Cannot override mapPmfms (by options)
        mapPmfms: (pmfms) => this.mapPmfms(pmfms)
      }
    );
    this.cd = injector.get(ChangeDetectorRef);
    this.referentialRefService = injector.get(ReferentialRefService);
    this.pmfmService = injector.get(PmfmService);
    this.i18nColumnPrefix = 'TRIP.SAMPLE.TABLE.';
    this.inlineEdition = !this.mobile;
    this.defaultSortBy = 'rankOrder';
    this.defaultSortDirection = 'asc';
    this.propagateRowError = true;

    // Set default value
    this.acquisitionLevel = AcquisitionLevelCodes.SAMPLE; // Default value, can be override by subclasses

    //this.debug = false;
    this.debug = !environment.production;

    // If init form callback exists, apply it when start row edition
    this.registerSubscription(
      this.onStartEditingRow
        .pipe(
          filter(row => row && row.validator && true),
          map(row => ({form: row.validator, pmfms: this.$pmfms.getValue()})),
          // DEBUG
          //tap(() => console.debug('[samples-table] will sent onPrepareRowForm event:', event))
          tap(event => this.onPrepareRowForm.emit(event))
        )
        .subscribe());

  }

  ngOnInit() {
    super.ngOnInit();
    this.showToolbar = toBoolean(this.showToolbar, !this.showGroupHeader);

    // Add footer listener
    this.$pmfms.subscribe(pmfms => this.addFooterListener(pmfms));
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    this.setShowColumn('label', this.showLabelColumn);
    this.setShowColumn('sampleDate', this.showDateTimeColumn);
    this.setShowColumn('comments', this.showCommentsColumn);

    // Taxon group combo
    this.registerAutocompleteField('taxonGroup', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonGroups(value, options)
    });

    // Taxon name combo
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonNames(value, options),
      showAllOnFocus: this.showTaxonGroupColumn /*show all, because limited to taxon group*/
    });
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.onPrepareRowForm.complete();
    this.onPrepareRowForm.unsubscribe();
    this.pmfmGroups$.complete();
    this.pmfmGroups$.unsubscribe();
    this.pmfmGroupColumns$.complete();
    this.pmfmGroupColumns$.unsubscribe();
  }

  openMenu() {
  }

  /**
   * Use in ngFor, for trackBy
   * @param index
   * @param column
   */
  trackColumnDef(index: number, column: GroupColumnDefinition) {
    return column.key;
  }


  async openDetailModal(sample?: Sample, row?: TableElement<Sample>): Promise<Sample | undefined> {
    console.debug('[samples-table] Opening detail modal...');
    //const pmfms = await firstNotNilPromise(this.$pmfms);

    let isNew = !sample && true;
    if (isNew) {
      sample = new Sample();
      await this.onNewEntity(sample);
    }

    this.markAsLoading();

    const options: Partial<ISampleModalOptions> = {
      // Default options:
      programLabel: undefined, // Prefer to pass PMFMs directly, to avoid a reloading
      pmfms: this.$pmfms,
      acquisitionLevel: this.acquisitionLevel,
      disabled: this.disabled,
      i18nPrefix: SAMPLE_TABLE_DEFAULT_I18N_PREFIX,
      usageMode: this.usageMode,
      showLabel: this.showLabelColumn,
      showDateTime: this.showDateTimeColumn,
      showTaxonGroup: this.showTaxonGroupColumn,
      showTaxonName: this.showTaxonNameColumn,

      onReady: async (modal) => {
        const form = modal.form.form;
        const pmfms = await firstNotNilPromise(modal.$pmfms);
        this.onPrepareRowForm.emit({form, pmfms});
      },
      onSaveAndNew: async (data) => {
        if (isNew) {
          await this.addEntityToTable(data);
        }
        else {
          this.updateEntityToTable(data, row);
          row = null; // Avoid to update twice (should never occur, because validateAndContinue always create a new entity)
          isNew = true; // Next row should be new
        }
        const newData = new Sample();
        await this.onNewEntity(newData);
        return newData;
      },
      onDelete: (event, data) => this.delete(event, data),

      // Override using given options
      ...this.modalOptions,

      // Give data
      data: sample,
      isNew,
    };

    const modal = await this.modalCtrl.create({
      component: SampleModal,
      componentProps: options,
      keyboardClose: true,
      backdropDismiss: false
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();
    if (data && this.debug) console.debug("[samples-table] Modal result: ", data);
    this.markAsLoaded();

    return data instanceof Sample ? data : undefined;
  }

  filterColumnsByTaxonGroup(taxonGroup: TaxonGroupRef) {
    const toggleLoading = !this.loading;
    if (toggleLoading) this.markAsLoading();

    try {
      const taxonGroupId = toNumber(taxonGroup && taxonGroup.id, null);
      (this.$pmfms.getValue() || []).forEach(pmfm => {

        const show = isNil(taxonGroupId)
          || !PmfmUtils.isDenormalizedPmfm(pmfm)
          || (isEmptyArray(pmfm.taxonGroupIds) || pmfm.taxonGroupIds.includes(taxonGroupId));
        this.setShowColumn(pmfm.id.toString(), show);
      });

      this.updateColumns();
    }
    finally {
      if (toggleLoading) this.markAsLoaded();
    }
  }

  async openAddPmfmsModal(event?: UIEvent) {

    // If pending rows, save first
    if (this.dirty) {
      const saved = await this.save();
      if (!saved) return;
    }

    const existingPmfmIds = (this.$pmfms.getValue() || []).map(p => p.id).filter(isNotNil);

    const pmfmIds = await this.openSelectPmfmsModal(event, {
      excludedIds: existingPmfmIds
    }, {
      allowMultiple: false
    });
    if (!pmfmIds) return; // USer cancelled

    console.debug('[samples-table] Adding pmfm ids:', pmfmIds);
    await this.addPmfmColumns(pmfmIds);

  }

  /**
   * Not used yet. Implementation must manage stored samples values and different pmfms types (number, string, qualitative values...)
   * @param event
   */
  async openChangePmfmsModal(event?: UIEvent) {
    const existingPmfmIds = (this.$pmfms.getValue() || []).map(p => p.id).filter(isNotNil);

    const pmfmIds = await this.openSelectPmfmsModal(event, {
      excludedIds: existingPmfmIds
    }, {
      allowMultiple: false
    });
    if (!pmfmIds) return; // USer cancelled

  }

  /* -- protected methods -- */


  protected async suggestTaxonGroups(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    //if (isNilOrBlank(value)) return [];
    return this.programRefService.suggestTaxonGroups(value,
      {
        program: this.programLabel,
        searchAttribute: options && options.searchAttribute
      });
  }

  protected async suggestTaxonNames(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    const taxonGroup = this.editedRow && this.editedRow.validator.get('taxonGroup').value;

    // IF taxonGroup column exists: taxon group must be filled first
    if (this.showTaxonGroupColumn && isNilOrBlank(value) && isNil(taxonGroup)) return {data: []};

    return this.programRefService.suggestTaxonNames(value,
      {
        programLabel: this.programLabel,
        searchAttribute: options && options.searchAttribute,
        taxonGroupId: taxonGroup && taxonGroup.id || undefined
      });
  }

  protected async onNewEntity(data: Sample): Promise<void> {
    console.debug("[sample-table] Initializing new row data...");

    await super.onNewEntity(data);

    // generate label
    if (!this.showLabelColumn) {
      data.label = `${this.acquisitionLevel}#${data.rankOrder}`;
    }

    // Default date
    if (isNotNil(this.defaultSampleDate)) {
      data.sampleDate = this.defaultSampleDate;
    } else if (this.settings.isOnFieldMode(this.usageMode)) {
      data.sampleDate = moment();
    }

    // Default taxon name
    if (isNotNil(this.defaultTaxonName)) {
      data.taxonName = TaxonNameRef.fromObject(this.defaultTaxonName);
    }

    // Default taxon group
    if (isNotNil(this.defaultTaxonGroup)) {
      data.taxonGroup = TaxonGroupRef.fromObject(this.defaultTaxonGroup);
    }
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    const data = await this.openDetailModal();
    if (data) {
      await this.addEntityToTable(data);
    }
    return true;
  }

  protected async openRow(id: number, row: TableElement<Sample>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onOpenRow.observers.length) {
      this.onOpenRow.emit({id, row});
      return true;
    }

    const data = this.toEntity(row, true);

    // Prepare entity measurement values
    this.prepareEntityToSave(data);

    const updatedData = await this.openDetailModal(data, row);
    if (updatedData) {
      await this.updateEntityToTable(updatedData, row);
    }
    else {
      this.editedRow = null;
    }
    return true;
  }

  protected prepareEntityToSave(sample: Sample) {
    // Override by subclasses
  }

  protected async findRowBySample(data: Sample): Promise<TableElement<Sample>> {
    if (!data || isNil(data.rankOrder)) throw new Error("Missing argument data or data.rankOrder");
    return (await this.dataSource.getRows())
      .find(r => r.currentData.rankOrder === data.rankOrder);
  }

  async delete(event: UIEvent, data: Sample): Promise<boolean> {
    const row = await this.findRowBySample(data);

    // Row not exists: OK
    if (!row) return true;

    const canDeleteRow = await this.canDeleteRows([row]);
    if (canDeleteRow === true) {
      this.deleteRow(event, row, {interactive: false /*already confirmed*/});
    }
    return canDeleteRow;
  }

  protected async addPmfmColumns(pmfmIds: number[]) {
    if (isEmptyArray(pmfmIds)) return; // Skip if empty

    // Load each pmfms, by id
    const pmfms = (await Promise.all(pmfmIds.map(id => this.pmfmService.loadPmfmFull(id))));

    this.pmfms = [
      ...this.$pmfms.getValue(),
      ...pmfms
    ];
  }

  protected async openSelectPmfmsModal(event?: UIEvent, filter?: Partial<PmfmFilter>,
                                       opts?: {
                                         allowMultiple?: boolean;
                                       }): Promise<number[]> {

    const modal = await this.modalCtrl.create({
      component: SelectPmfmModal,
      componentProps: {
        filter: PmfmFilter.fromObject(filter),
        allowMultiple: opts && opts.allowMultiple
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const res = await modal.onDidDismiss();
    if (!res || isEmptyArray(res.data)) return; // CANCELLED

    // Return pmfm ids
    return res.data.map(p => p.id);
  }

  /**
   * Force to wait PMFM map to be loaded
   * @param pmfms
   */
  protected async mapPmfms(pmfms: IPmfm[]): Promise<IPmfm[]> {

    if (isEmptyArray(pmfms)) return pmfms; // Nothing to map

    if (this.showGroupHeader) {
      console.debug("[samples-table] Computing Pmfm group header...");

      // Wait until map is loaded
      const groupedPmfmIdsMap = await firstNotNilPromise(this.pmfmGroups$);

      // Create a list of known pmfm ids
      const groupedPmfmIds = Object.values(groupedPmfmIdsMap).reduce((res, pmfmIds) => res.concat(...pmfmIds), []);

      // Create pmfms group
      const orderedPmfmIds: number[] = [];
      const orderedPmfms: IPmfm[] = [];
      let groupIndex = 0;
      const pmfmGroupColumns: GroupColumnDefinition[] = ParameterGroups.concat('OTHER').reduce((pmfmGroups, group) => {
        let groupPmfms: IPmfm[];
        if (group === 'OTHER') {
          groupPmfms = pmfms.filter(p => !groupedPmfmIds.includes(p.id));
        } else {
          const groupPmfmIds = groupedPmfmIdsMap[group];
          groupPmfms = isNotEmptyArray(groupPmfmIds) ? pmfms.filter(p => groupPmfmIds.includes(p.id)) : [];
        }

        const groupPmfmCount = groupPmfms.length;
        const cssClass = (++groupIndex) % 2 === 0 ? 'even' : 'odd';

        groupPmfms.forEach(pmfm => {
          pmfm = pmfm.clone(); // Clone, to leave original PMFM unchanged

          // Use rankOrder as a group index (will be used in template, to computed column class)
          if (PmfmUtils.isDenormalizedPmfm(pmfm)) {
            pmfm.rankOrder = groupIndex;
          }

          // Add pmfm into the final list of ordered pmfms
          orderedPmfms.push(pmfm);
        });

        return pmfmGroups.concat(
          ...groupPmfms.reduce((res, pmfm, index) => {
            if (orderedPmfmIds.includes(pmfm.id)) return res; // Skip if already proceed
            orderedPmfmIds.push(pmfm.id);
            const visible = group !== 'TAG_ID' && group !== 'DRESSING'; //  && groupPmfmCount > 1;
            const key = 'group-' + ((pmfm instanceof DenormalizedPmfmStrategy) ? (pmfm as IDenormalizedPmfm).completeName : pmfm.label);
            return index !== 0 ? res : res.concat(<GroupColumnDefinition>{
              key,
              label: group,
              name: visible && (this.i18nColumnPrefix + group) || '',
              cssClass: visible && cssClass || '',
              colSpan: groupPmfmCount
            });
          }, []));
      }, []);
      this.pmfmGroupColumns$.next(pmfmGroupColumns);
      this.groupHeaderColumnNames =
        ['top-start']
          .concat(pmfmGroupColumns.map(g => g.key))
          .concat(['top-end']);
      this.groupHeaderStartColSpan = RESERVED_START_COLUMNS.length
        + (this.showLabelColumn ? 1 : 0)
        + (this.showTaxonGroupColumn ? 1 : 0)
        + (this.showTaxonNameColumn ? 1 : 0)
        + (this.showDateTimeColumn ? 1 : 0)
      this.groupHeaderEndColSpan = RESERVED_END_COLUMNS.length
        + (this.showCommentsColumn ? 1 : 0)

      orderedPmfms.forEach(p => this.memoryDataService.addSortByReplacement(p.id.toString(), "measurementValues." + p.id.toString()));
      return orderedPmfms;
    }

    return pmfms;
  }

  openSelectColumnsModal(event?: UIEvent): Promise<any> {
    return super.openSelectColumnsModal(event);
  }

  getPmfmValueColor(pmfmValue: any, pmfm: IPmfm): string {
    let color: ColorName;
    switch (pmfm.id) {
      case PmfmIds.OUT_OF_SIZE_PCT:
        if (pmfmValue && pmfmValue > 50) {
          color = 'danger';
        }
        else {
          color = 'success';
        }
        break;
    }
    return color ? `var(--ion-color-${color})` : undefined;
  }

  selectInputContent = AppFormUtils.selectInputContent;

  markForCheck() {
    this.cd.markForCheck();
  }

  addRow(event?: Event, insertAt?: number): boolean {
    this._focusColumn = this.firstUserColumn;
    return super.addRow(event, insertAt);
  }

  /**
   * Publish get row error, as public
   */
  getRowError(row?: TableElement<Sample>, opts?: { separator?: string; recursive?: boolean }): string {
    return super.getRowError(row || this.editedRow, opts);
  }

  protected addFooterListener(pmfms: IPmfm[]) {

    this.showTagCount = pmfms && pmfms.findIndex(pmfm => pmfm.id === PmfmIds.TAG_ID) !== -1;

    // Should display tag count: add column to footer
    if (this.showTagCount && !this.footerColumns.includes('footer-tagCount')) {
      this.footerColumns = [...this.footerColumns, 'footer-tagCount'];
    }
    // If tag count not displayed
    else if (!this.showTagCount) {
      // Remove from footer columns
      this.footerColumns = this.footerColumns.filter(column => column !== 'footer-tagCount');

      // Reset counter
      this.tagCount$.next(0);
    }

    this.showFooter = this.footerColumns.length > 1;

    // DEBUG
    console.debug('[samples-table] Show footer ?', this.showFooter)

    // Remove previous rows listener
    if (!this.showFooter && this._footerRowsSubscription) {
      this.unregisterSubscription(this._footerRowsSubscription);
      this._footerRowsSubscription.unsubscribe()
      this._footerRowsSubscription = null;
    }

    else if (this.showFooter && !this._footerRowsSubscription) {
      this._footerRowsSubscription = this.dataSource.connect(null)
        .pipe(
          debounceTime(500)
        ).subscribe(rows => this.updateFooter(rows));
    }
  }

  protected updateFooter(rows: TableElement<Sample>[] | readonly TableElement<Sample>[]) {
    // Update tag count
    const tagCount = (rows || []).map(row => row.currentData.measurementValues[PmfmIds.TAG_ID.toString()] as string)
      .filter(isNotNilOrBlank)
      .length
    this.tagCount$.next(tagCount);
  }
}

