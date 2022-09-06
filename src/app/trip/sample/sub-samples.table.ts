import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { TableElement, ValidatorService } from '@e-is/ngx-material-table';
import { PmfmIds, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { SubSampleValidatorService } from '../services/validator/sub-sample.validator';
import {
  EntityUtils,
  firstNotNilPromise,
  InMemoryEntitiesService,
  isNil,
  isNotEmptyArray,
  isNotNil,
  joinPropertiesPath,
  LoadResult,
  PlatformService,
  suggestFromArray,
  toNumber,
  UsageMode,
} from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable } from '../measurement/measurements.table.class';
import { Sample } from '../services/model/sample.model';
import { SortDirection } from '@angular/material/sort';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { environment } from '@environments/environment';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { SampleFilter } from '../services/filter/sample.filter';
import { ISubSampleModalOptions, SubSampleModal } from '@app/trip/sample/sub-sample.modal';
import { merge, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, mergeMap, tap } from 'rxjs/operators';
import { MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';

export const SUB_SAMPLE_RESERVED_START_COLUMNS: string[] = ['parent'];
export const SUB_SAMPLE_RESERVED_END_COLUMNS: string[] = ['comments'];



@Component({
  selector: 'app-sub-samples-table',
  templateUrl: 'sub-samples.table.html',
  styleUrls: ['sub-samples.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: SubSampleValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubSamplesTable extends BaseMeasurementsTable<Sample, SampleFilter>
  implements OnInit, OnDestroy {

  private _availableSortedParents: Sample[] = [];
  private _availableParents: Sample[] = [];

  protected cd: ChangeDetectorRef;
  protected memoryDataService: InMemoryEntitiesService<Sample, SampleFilter>;

  onParentChanges = new Subject();
  displayParentPmfm: IPmfm;

  @Input() showError = true;
  @Input() showPmfmDetails = false;
  @Input() compactFields = true;
  @Input() weightDisplayedUnit: WeightUnitSymbol;

  @Input()
  set availableParents(parents: Sample[]) {
    if (this._availableParents !== parents) {
      this._availableParents = parents;
      if (!this.loading) this.onParentChanges.next();
    }
  }

  get availableParents(): Sample[] {
    return this._availableParents;
  }

  set value(data: Sample[]) {
    this.setValue(data);
  }

  get value(): Sample[] {
    return this.getValue();
  }

  @Input() showLabelColumn = false;
  @Input() showToolbar = true;
  @Input() modalOptions: Partial<ISubSampleModalOptions>;
  @Input() mobile: boolean;
  @Input() usageMode: UsageMode;
  @Input() useSticky = false;
  @Input() defaultLatitudeSign: '+' | '-';
  @Input() defaultLongitudeSign: '+' | '-';

  constructor(
    protected injector: Injector
  ) {
    super(injector,
      Sample, SampleFilter,
      new InMemoryEntitiesService(Sample, SampleFilter, {
        onSort: (data, sortBy, sortDirection) => this.sortData(data, sortBy, sortDirection),
        onLoad: (data) => this.onLoadData(data),
        equals: Sample.equals,
        sortByReplacement: {'id': 'rankOrder'}
      }),
      injector.get(PlatformService).mobile ? null : injector.get(ValidatorService),
      {
        prependNewElements: false,
        suppressErrors: environment.production,
        reservedStartColumns: SUB_SAMPLE_RESERVED_START_COLUMNS,
        reservedEndColumns: SUB_SAMPLE_RESERVED_END_COLUMNS,
        mapPmfms: (pmfms) => this.mapPmfms(pmfms)
      }
    );
    this.memoryDataService = (this.dataService as InMemoryEntitiesService<Sample, SampleFilter>);
    this.cd = injector.get(ChangeDetectorRef);
    this.i18nColumnPrefix = 'TRIP.SAMPLE.TABLE.';
    this.i18nPmfmPrefix = 'TRIP.SAMPLE.PMFM.';
    this.confirmBeforeDelete = this.mobile;
    this.inlineEdition = !this.mobile;
    this.errorTranslatorOptions = {controlPathTranslator: this, separator: '\n'};

    //this.debug = false;
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.setShowColumn('label', this.showLabelColumn);
    this.setShowColumn('comments', !this.mobile);

    // Parent combo
    // the exact list of attributes to display will be set when receiving the pmfms and parents
    this.registerAutocompleteField('parent', {
      suggestFn: (value: any, opts?: any) => this.suggestParent(value, opts),
      showAllOnFocus: true,
      mobile: this.mobile
    });

    // Compute parent, when parents or pmfms changed
    this.registerSubscription(
      merge(
        this.onParentChanges
          .pipe(mergeMap(() => this.$pmfms)),
        this.$pmfms.pipe(
          filter(isNotEmptyArray),
          distinctUntilChanged(),
          tap(pmfms => this.onPmfmsLoaded(pmfms))
        )
      )
      .pipe(
        debounceTime(250),
        tap(pmfms => this.updateParents(pmfms))
      )
      .subscribe()
    )
  }

  setModalOption(key: keyof ISubSampleModalOptions, value: ISubSampleModalOptions[typeof key]) {
    this.modalOptions = this.modalOptions || {};
    this.modalOptions[key as any] = value;
  }

  async autoFillTable() {
    console.debug("[sub-sample-table] Auto fill table");

    // Wait table ready and loaded
    await Promise.all([this.ready(), this.waitIdle()]);

    // Skip when disabled or still editing a row
    if (this.disabled || !this.confirmEditCreate()) {
      console.warn("[sub-samples-table] Skipping autofill, as table is disabled or still editing a row");
      return;
    }

    this.markAsLoading();

    try {


      // Read existing rows
      const existingSamples = (await this.dataSource.getRows() || []).map(r => r.currentData);

      const displayParentPmfmId = this.displayParentPmfm?.id;
      const availableParents = this._availableSortedParents || this._availableParents
          .filter(p => (isNil(displayParentPmfmId) || isNotNil(p.measurementValues[displayParentPmfmId])))
      const parents = availableParents
        .filter(p => !existingSamples.find(s => Sample.equals(s.parent, p)));

      // Create new row for each parent
      for (const parent of parents) {
          const sample = new Sample();
          sample.parent = parent;
          await this.addEntityToTable(sample);
      }

    } catch (err) {
      console.error(err && err.message || err);
      this.error = err && err.message || err;
    }
    finally {
      this.markAsLoaded();
    }
  }

  /**
   * Allow to set value
   * @param data
   */
  setValue(data: Sample[]) {
    this.memoryDataService.value = data;
  }

  async addOrUpdateEntityToTable(subSample: Sample){
    if (isNil(subSample.id) && isNil(subSample.rankOrder) && isNil(subSample.label)){
      await this.addEntityToTable(subSample);
    }
    else {
      const row = await this.findRowByEntity(subSample);
      await this.updateEntityToTable(subSample, row);
    }
  }

  async openDetailModal(dataToOpen?: Sample, row?: TableElement<Sample>): Promise<Sample | undefined> {
    console.debug('[sub-samples-table] Opening detail modal...');
    const pmfms = await firstNotNilPromise(this.$pmfms);

    let isNew = !dataToOpen && true;
    if (isNew) {
      dataToOpen = new Sample();
      await this.onNewEntity(dataToOpen);
    }

    this.markAsLoading();
    const i18PrefixParts = this.i18nColumnPrefix && this.i18nColumnPrefix.split('.');
    const i18nPrefix = i18PrefixParts && (i18PrefixParts.slice(0, i18PrefixParts.length - 2).join('.') + '.');

    const modal = await this.modalCtrl.create({
      component: SubSampleModal,
      componentProps: <ISubSampleModalOptions>{
        // Default options:
        programLabel: undefined, // Prefer to pass PMFMs directly, to avoid a reloading
        pmfms,
        acquisitionLevel: this.acquisitionLevel,
        disabled: this.disabled,
        i18nPrefix,
        i18nSuffix: this.i18nColumnSuffix,
        usageMode: this.usageMode,
        availableParents: this._availableSortedParents,
        defaultLatitudeSign: this.defaultLatitudeSign,
        defaultLongitudeSign: this.defaultLongitudeSign,
        onDelete: (event, dataToDelete) => this.deleteEntity(event, dataToDelete),

        // Override using given options
        ...this.modalOptions,

        // Data to open
        isNew,
        data: dataToOpen
      },
      keyboardClose: true,
      backdropDismiss: false
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();
    if (data && this.debug) console.debug('[sub-samples-table] Modal result: ', data);
    this.markAsLoaded();

    return data instanceof Sample ? data : undefined;
  }


  async deleteEntity(event: UIEvent, data: Sample): Promise<boolean> {
    const row = await this.findRowByEntity(data);

    // Row not exists: OK
    if (!row) return true;

    const confirmed = await this.canDeleteRows([row]);
    if (confirmed === true) {
      return this.deleteRow(null, row, {interactive: false /*already confirmed*/});
    }
    return confirmed;
  }

  /* -- protected methods -- */

  protected mapPmfms(pmfms: IPmfm[]) {
    // DEBUG
    console.debug('[sub-samples-table] Mapping PMFMs...', pmfms);

    const tagIdPmfmIndex = pmfms.findIndex(p => p.id === PmfmIds.TAG_ID);
    if (tagIdPmfmIndex !== -1) {
      const tagIdPmfm = pmfms[tagIdPmfmIndex];
      this.displayParentPmfm = tagIdPmfm?.required ? tagIdPmfm : null;
    }

    // Force the parent PMFM to be hidden, and NOT required
    if (this.displayParentPmfm && !this.displayParentPmfm.hidden) {
      const cloneParentPmfm = this.displayParentPmfm.clone();
      cloneParentPmfm.hidden = true;
      cloneParentPmfm.required = false;
      pmfms[tagIdPmfmIndex] = cloneParentPmfm;
    }

    return pmfms;
  }

  protected onPmfmsLoaded(pmfms: IPmfm[]) {
    // Can be overridden by subclasses
  }

  protected async updateParents(pmfms: IPmfm[]) {
    // DEBUG
    console.debug('[sub-samples-table] Update parents...', pmfms);

    const parents = this._availableParents || [];
    const hasTaxonName = parents.some(s => isNotNil(s.taxonName?.id));
    const attributeName = hasTaxonName ? 'taxonName' : 'taxonGroup';
    const baseDisplayAttributes = this.settings.getFieldDisplayAttributes(attributeName)
      .map(key => `${attributeName}.${key}`);

    // If display parent using by a pmfm
    if (this.displayParentPmfm) {
      const parentDisplayPmfmId = this.displayParentPmfm.id;
      const parentDisplayPmfmPath = `measurementValues.${parentDisplayPmfmId}`;
      // Keep parents with this pmfms
      const filteredParents = parents.filter(s => isNotNil(s.measurementValues[parentDisplayPmfmId]));
      this._availableSortedParents = EntityUtils.sort(filteredParents, parentDisplayPmfmPath);

      this.autocompleteFields.parent.attributes = [parentDisplayPmfmPath].concat(baseDisplayAttributes);
      this.autocompleteFields.parent.columnSizes = [4].concat(baseDisplayAttributes.map(attr =>
        // If label then col size = 2
        attr.endsWith('label') ? 2 : undefined));
      this.autocompleteFields.parent.columnNames = [PmfmUtils.getPmfmName(this.displayParentPmfm)];
      this.autocompleteFields.parent.displayWith = (obj) => PmfmValueUtils.valueToString(obj?.measurementValues[parentDisplayPmfmId], {pmfm: this.displayParentPmfm}) || undefined;
    }
    else {
      const displayAttributes = ['rankOrder'].concat(baseDisplayAttributes);
      this._availableSortedParents = this.sortData(parents.slice(), 'taxonGroup');
      this.autocompleteFields.parent.attributes = displayAttributes;
      this.autocompleteFields.parent.columnSizes = undefined; // use defaults
      this.autocompleteFields.parent.columnNames = undefined; // use defaults
      this.autocompleteFields.parent.displayWith = (obj) => obj && joinPropertiesPath(obj, displayAttributes) || undefined;
    }

    // Configure the filter for suggestParent()
    this.autocompleteFields.parent.filter = this.autocompleteFields.parent.filter || {};
    this.autocompleteFields.parent.filter.searchAttributes = this.autocompleteFields.parent.attributes;

    // Link samples to parent, and delete orphan
    await this.linkDataToParentAndDeleteOrphan();

    this.markForCheck();
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
    } else {
      this.editedRow = null;
    }
    return true;
  }

  protected getValue(): Sample[] {
    return this.memoryDataService.value;
  }

  protected prepareEntityToSave(sample: Sample) {
    // Override by subclasses
  }

  protected async findRowByEntity(data: Sample): Promise<TableElement<Sample>> {
    if (!data || isNil(data.rankOrder)) throw new Error('Missing argument data or data.rankOrder');
    return (await this.dataSource.getRows())
      .find(r => r.currentData.rankOrder === data.rankOrder);
  }

  protected async onNewEntity(data: Sample): Promise<void> {
    console.debug("[sub-samples-table] Initializing new row data...");

    await super.onNewEntity(data);

    // label
    if (!this.showLabelColumn) {
      // Generate label
      data.label = this.acquisitionLevel + "#" + data.rankOrder;
    }
  }

  protected getI18nColumnName(columnName: string): string {

    // Replace parent by TAG_ID pmfms
    columnName = columnName && columnName === 'parent' && this.displayParentPmfm ? this.displayParentPmfm.id.toString() : columnName;

    return super.getI18nColumnName(columnName);
  }

  protected linkDataToParent(data: Sample[]) {
    if (!this._availableParents || !data) return;

    // DEBUG
    //console.debug("[sub-samples-table] Calling linkDataToParent()");

    data.forEach(s => {
      const parentId = toNumber(s.parentId, s.parent?.id);
      s.parent = this._availableParents.find(p => p.id === parentId
        || (s.parent && p.label === s.parent.label && p.rankOrder === s.parent.rankOrder))
        || s.parent;
      if (!s.parent) console.warn("[sub-samples-table] linkDataToParent() - Could not found parent for sub-sample:", s);
    });
  }

  /**
   * Remove samples in table, if there have no more parent
   */
  protected async linkDataToParentAndDeleteOrphan() {

    const rows = this.dataSource.getRows();

    //console.debug("[sub-samples-table] Calling linkDataToParentAndDeleteOrphan()", rows);

    const parentDisplayPmfmId = this.displayParentPmfm?.id;
    // Check if need to delete some rows
    let hasRemovedItem = false;
    const data = rows
      .filter(row => {
        const item = row.currentData;
        const parentId = toNumber(item.parentId, item.parent?.id);

        let parent;
        if (isNotNil(parentId)) {
          // Update the parent, by id
          parent = this._availableParents.find(p => p.id === parentId);
        }
        // No parent, search from parent Pmfm
        else if (isNotNil(parentDisplayPmfmId)){
          const parentPmfmValue = item?.measurementValues?.[parentDisplayPmfmId];
          if (isNil(parentPmfmValue)) {
            parent = undefined; // remove link to parent
          }
          else {
            // Update the parent, by tagId
            parent = this._availableParents.find(p => (p && p.measurementValues?.[parentDisplayPmfmId]) === parentPmfmValue);
          }
        }

        if (parent || row.editing) {
          if (item.parent !== parent) {
            item.parent = parent;
            // If row use a validator, force update
            if (row.validator) {
              if (!row.editing) row.validator.patchValue({parent}, {emitEvent: false});
            }
            else {
              row.currentData.parent = parent;
            }
          }
          return true; // Keep only rows with a parent (or in editing mode)
        }

        // Could not found the parent anymore (parent has been delete)
        hasRemovedItem = true;
        return false;
      })
      .map(r => r.currentData);

    if (hasRemovedItem) {
      this.value = data;
    }
  }

  protected sortData(data: Sample[], sortBy?: string, sortDirection?: SortDirection): Sample[] {
    sortBy = (sortBy !== 'parent') && sortBy || 'parent.rankOrder'; // Replace parent by its rankOrder
    return this.memoryDataService.sort(data, sortBy, sortDirection);
  }

  protected onLoadData(data: Sample[]): Sample[] {
    this.linkDataToParent(data);
    return data;
  }

  protected async suggestParent(value: any, opts?: any): Promise<LoadResult<Sample>> {
    if (EntityUtils.isNotEmpty(value, 'label')) return {data: [value]};
    value = (typeof value === "string" && value !== "*") && value || undefined;

    // All
    if (isNil(value)) return {data: this._availableSortedParents, total: this._availableSortedParents.length};

    return suggestFromArray(this._availableSortedParents, value, {
      ...opts
    });
  }


  protected markForCheck() {
    this.cd.markForCheck();
  }

  isNotHiddenPmfm = PmfmUtils.isNotHidden;
}
