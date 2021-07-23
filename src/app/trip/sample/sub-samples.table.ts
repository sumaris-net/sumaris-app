import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit} from '@angular/core';
import {ValidatorService} from '@e-is/ngx-material-table';
import {PmfmIds} from '@app/referential/services/model/model.enum';
import {SubSampleValidatorService} from '../services/validator/sub-sample.validator';
import {EntityUtils, filterNotNil, firstFalsePromise, InMemoryEntitiesService, isNil, isNotNil, joinPropertiesPath, toNumber, UsageMode} from '@sumaris-net/ngx-components';
import {AppMeasurementsTable} from '../measurement/measurements.table.class';
import {Sample} from '../services/model/sample.model';
import {SortDirection} from '@angular/material/sort';
import {PmfmValueUtils} from '@app/referential/services/model/pmfm-value.model';
import {environment} from '@environments/environment';
import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import {SampleFilter} from '../services/filter/sample.filter';

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
export class SubSamplesTable extends AppMeasurementsTable<Sample, SampleFilter>
  implements OnInit, OnDestroy {

  private _availableSortedParents: Sample[] = [];
  private _availableParents: Sample[] = [];

  protected cd: ChangeDetectorRef;
  protected memoryDataService: InMemoryEntitiesService<Sample, SampleFilter>;

  displayParentPmfm: IPmfm;

  @Input()
  set availableParents(parents: Sample[]) {
    if (this._availableParents !== parents) {

      this._availableParents = parents;

      // Sort parents by by Tag-ID
      if (this.displayParentPmfm) {
        this._availableSortedParents = this.sortData(parents.slice(), this.displayParentPmfm.id.toString());
      }
      else {
        this._availableSortedParents = this.sortData(parents.slice(), 'taxonGroup');
      }

      // Link samples to parent, and delete orphan
      this.linkDataToParentAndDeleteOrphan();
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

  @Input() usageMode: UsageMode;
  @Input() useSticky: true;

  constructor(
    protected injector: Injector
  ) {
    super(injector,
      Sample,
      new InMemoryEntitiesService(Sample, SampleFilter, {
        onSort: (data, sortBy, sortDirection) => this.sortData(data, sortBy, sortDirection),
        onLoad: (data) => this.onLoadData(data),
        equals: Sample.equals,
        sortByReplacement: {'id': 'rankOrder'}
      }),
      injector.get(ValidatorService),
      {
        prependNewElements: false,
        suppressErrors: environment.production,
        reservedStartColumns: SUB_SAMPLE_RESERVED_START_COLUMNS,
        reservedEndColumns: SUB_SAMPLE_RESERVED_END_COLUMNS
      }
    );
    this.memoryDataService = (this.dataService as InMemoryEntitiesService<Sample, SampleFilter>);
    this.cd = injector.get(ChangeDetectorRef);
    this.i18nColumnPrefix = 'TRIP.SAMPLE.TABLE.';
    // TODO: override openDetailModal(), then uncomment :
    // this.inlineEdition = !this.mobile;
    this.inlineEdition = true;

    //this.debug = false;
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.setShowColumn('label', this.showLabelColumn);

    // Always hide parent tag_id (if present)
    this.setShowColumn(PmfmIds.TAG_ID.toString(), false);
    this.setShowColumn(PmfmIds.DRESSING.toString(), false);

    // Parent combo
    this.registerAutocompleteField('parent', {
      suggestFn: (value: any, options?: any) => this.suggestParent(value),
      showAllOnFocus: true
    });

    // Check if there a tag id in pmfms
    this.registerSubscription(
      filterNotNil(this.$pmfms)
        .subscribe((pmfms) => {
          this.displayParentPmfm = pmfms.find(p => p.id === PmfmIds.TAG_ID);
          const displayAttributes = this.settings.getFieldDisplayAttributes('taxonName')
            .map(key => 'taxonName.' + key);
          if (this.displayParentPmfm) {
            this.autocompleteFields.parent.attributes = [`measurementValues.${this.displayParentPmfm.id}`].concat(displayAttributes);
            this.autocompleteFields.parent.columnSizes = [4].concat(displayAttributes.map(attr =>
              // If label then col size = 2
              attr.endsWith('label') ? 2 : undefined));
            this.autocompleteFields.parent.columnNames = [PmfmUtils.getPmfmName(this.displayParentPmfm)];
            this.autocompleteFields.parent.displayWith = (obj) => obj && obj.measurementValues
              && PmfmValueUtils.valueToString(obj.measurementValues[this.displayParentPmfm.id], {pmfm: this.displayParentPmfm})
              || undefined;
          } else {
            this.autocompleteFields.parent.attributes = displayAttributes;
            this.autocompleteFields.parent.columnSizes = undefined; // use defaults
            this.autocompleteFields.parent.columnNames = undefined; // use defaults
            this.autocompleteFields.parent.displayWith = (obj) => obj && joinPropertiesPath(obj, displayAttributes) || undefined;
          }
          this.markForCheck();
        }));
  }

  async autoFillTable() {
    // Wait table is ready
    await this.ready();

    // Wait table is loaded
    if (this.loading) {
      await firstFalsePromise(this.loadingSubject);
    }

    // Skip when disabled or still editing a row
    if (this.disabled || !this.confirmEditCreate()) {
      console.warn("[sub-samples-table] Skipping autofill, as table is disabled or still editing a row");
      return;
    }

    this.markAsLoading();

    try {
      console.debug("[sub-sample-table] Auto fill table");

      // Read existing rows
      const existingSamples = (await this.dataSource.getRows() || []).map(r => r.currentData);

      const parents = this._availableParents
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

  /* -- protected methods -- */

  protected getValue(): Sample[] {
    return this.memoryDataService.value;
  }

  protected prepareEntityToSave(sample: Sample) {
    // Override by subclasses
  }

  protected async onNewEntity(data: Sample): Promise<void> {
    console.debug("[sample-table] Initializing new row data...");

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
      s.parent = this._availableParents.find(p => Sample.equals(p, {
        id: toNumber(s.parentId, s.parent && s.parent.id),
        label: s.parent && s.parent.label
      }));
      if (!s.parent) console.warn("[sub-samples-table] linkDataToParent() - Could not found parent for sub-sample:", s);
    });
  }

  /**
   * Remove samples in table, if there have no more parent
   */
  protected async linkDataToParentAndDeleteOrphan() {

    const rows = await this.dataSource.getRows();

    // Check if need to delete some rows
    let hasRemovedItem = false;
    const data = rows
      .filter(row => {
        const item = row.currentData;
        const parentId = item.parentId || (item.parent && item.parent.id);

        let parent;
        if (isNotNil(parentId)) {
          // Update the parent, by id
          parent = this._availableParents.find(p => p.id === parentId);
        }
        // No parent, search from tag ID
        else {
          const parentTagId = item.parent && item.parent.measurementValues && item.parent.measurementValues[PmfmIds.TAG_ID];
          if (isNil(parentTagId)) {
            parent = undefined; // remove link to parent
          }
          else {
            // Update the parent, by tagId
            parent = this._availableParents.find(p => (p && p.measurementValues && p.measurementValues[PmfmIds.TAG_ID]) === parentTagId);
          }
        }

        if (parent || row.editing) {
          if (item.parent !== parent) {
            item.parent = parent;
            // If row use a validator, force update
            if (!row.editing && row.validator) row.validator.patchValue(item, {emitEvent: false});
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

  protected async suggestParent(value: any): Promise<any[]> {
    if (EntityUtils.isNotEmpty(value, 'label')) {
      return [value];
    }
    value = (typeof value === "string" && value !== "*") && value || undefined;
    if (isNil(value)) return this._availableSortedParents; // All

    if (this.debug) console.debug(`[sub-sample-table] Searching parent {${value || '*'}}...`);
    if (this.displayParentPmfm) { // Search on a specific Pmfm (e.g Tag-ID)
      return this._availableSortedParents.filter(p => this.startsWithUpperCase(p.measurementValues[this.displayParentPmfm.id], value));
    }
    // Search on rankOrder
    return this._availableSortedParents.filter(p => p.rankOrder.toString().startsWith(value));
  }


  protected markForCheck() {
    this.cd.markForCheck();
  }
}
