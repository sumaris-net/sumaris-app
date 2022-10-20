import { ChangeDetectorRef, Directive, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { TableElement, ValidatorService } from '@e-is/ngx-material-table';
import {
  firstArrayValue,
  InMemoryEntitiesService,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  ReferentialUtils,
  splitByProperty,
  UsageMode
} from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable, BaseMeasurementsTableConfig } from '../../measurement/measurements.table.class';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { Batch } from './batch.model';
import { Landing } from '../../services/model/landing.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { Operation } from '../../services/model/trip.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { BatchGroupUtils } from '@app/trip/batch/group/batch-group.model';

export const BATCH_RESERVED_START_COLUMNS: string[] = ['taxonGroup', 'taxonName'];
export const BATCH_RESERVED_END_COLUMNS: string[] = ['comments'];

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AbstractBatchesTable<
  T extends Batch<any> = Batch<any>,
  F extends BatchFilter = BatchFilter
  > extends BaseMeasurementsTable<T, F>
  implements OnInit, OnDestroy {

  protected _initialPmfms: IPmfm[];
  protected cd: ChangeDetectorRef;
  protected referentialRefService: ReferentialRefService;

  defaultWeightPmfm: IPmfm;
  weightPmfms: IPmfm[];
  weightPmfmsByMethod: { [key: string]: IPmfm };

  @Input()
  set value(data: T[]) {
    this.memoryDataService.value = data;
  }

  get value(): T[] {
    return this.memoryDataService.value;
  }

  @Input() usageMode: UsageMode;

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

  @Input() useSticky = false;
  @Input() defaultTaxonGroup: TaxonGroupRef;
  @Input() defaultTaxonName: TaxonNameRef;
  @Input() availableTaxonGroups: TaxonGroupRef[];
  @Input() samplingRatioFormat: SamplingRatioFormat = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;

  protected constructor(
    injector: Injector,
    dataType: new() => T,
    filterType: new() => F,
    protected memoryDataService: InMemoryEntitiesService<T, F>,
    validatorService: ValidatorService,
    options?: BaseMeasurementsTableConfig<T>
  ) {
    super(injector,
      dataType || ((Batch as any) as (new() => T)),
      filterType || ((BatchFilter as any) as (new() => F)),
      memoryDataService,
      validatorService,
      {
        reservedStartColumns: BATCH_RESERVED_START_COLUMNS,
        reservedEndColumns: BATCH_RESERVED_END_COLUMNS,
        i18nColumnPrefix: 'TRIP.BATCH.TABLE.',
        i18nPmfmPrefix: 'TRIP.BATCH.PMFM.',

        ...options,

        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
      }
    );
    this.cd = injector.get(ChangeDetectorRef);
    this.referentialRefService = injector.get(ReferentialRefService);
    this.inlineEdition = this.validatorService && !this.mobile;
    this.defaultSortBy = 'id';
    this.defaultSortDirection = 'asc';

    // Set default value
    this.showCommentsColumn = false;
    this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;

    // -- DEV only
    //this.debug = !environment.production;
    this.logPrefix = '[batches-table]';
  }

  ngOnInit() {
    super.ngOnInit();

    // Taxon group combo
    this.registerAutocompleteField('taxonGroup', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonGroups(value, options),
      mobile: this.mobile
    });

    // Taxon name combo
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonNames(value, options),
      mobile: this.mobile
    });
  }

  setParent(data: Operation | Landing) {
    if (!data) {
      this.setFilter({} as F);
    } else if (data instanceof Operation) {
      this.setFilter({operationId: data.id} as F);
    } else if (data instanceof Landing) {
      this.setFilter({landingId: data.id} as F);
    }
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    const data = await this.openDetailModal();
    if (data) {
      // Can be an update, and not only a add,
      // (e.g. the batch group modal can add row, before opening the sub batches modal)
      await this.addOrUpdateEntityToTable(data);
    }
    return true;
  }

  protected async openRow(id: number, row: TableElement<T>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onOpenRow.observers.length) {
      this.onOpenRow.emit({id, row});
      return true;
    }

    const data = this.toEntity(row, true);

    // Prepare entity measurement values
    this.prepareEntityToSave(data);

    const updatedData = await this.openDetailModal(data);
    if (updatedData) {
      await this.updateEntityToTable(updatedData, row, {confirmEdit: false});
    } else {
      this.editedRow = null;
    }
    return true;
  }

  /**
   * Auto fill table (e.g. with taxon groups found in strategies) - #176
   */
  async autoFillTable(opts  = { skipIfDisabled: true, skipIfNotEmpty: false}) {
    // Wait table loaded
    await this.waitIdle();

    // Skip if disabled
    if (opts.skipIfDisabled && this.disabled) {
      console.warn(this.logPrefix + 'Skipping autofill as table is disabled');
      return;
    }

    // Skip if not empty
    if (opts.skipIfNotEmpty && this.totalRowCount > 0) {
      console.warn('[batches-table] Skipping autofill because table is not empty');
      return;
    }

    // Skip if no available taxon group configured (should be set by parent page - e.g. OperationPage)
    if (isEmptyArray(this.availableTaxonGroups)) {
      console.warn('[batches-table] Skipping autofill, because no availableTaxonGroups has been set');
      return;
    }

    // Skip when editing a row
    if (!this.confirmEditCreate()) {
      console.warn('[batches-table] Skipping autofill, as table still editing a row');
      return;
    }

    this.markAsLoading();

    try {
      console.debug('[batches-table] Auto fill table, using options:', opts);

      // Read existing taxonGroups
      let data = this.dataSource.getData()
      const existingTaxonGroups = data.map(batch => batch.taxonGroup)
        .filter(isNotNil);
      let rowCount = data.length;

      const taxonGroupsToAdd = this.availableTaxonGroups
        // Exclude if already exists
        .filter(taxonGroup => !existingTaxonGroups.some(tg => ReferentialUtils.equals(tg, taxonGroup)));

      if (isNotEmptyArray(taxonGroupsToAdd)) {

        this.focusColumn = undefined;
        let rankOrder = data.reduce((res, b) => Math.max(res, b.rankOrder || 0), 0) + 1;

        for (const taxonGroup of taxonGroupsToAdd) {
          const entity = new this.dataType();
          entity.taxonGroup = TaxonGroupRef.fromObject(taxonGroup);
          entity.rankOrder = rankOrder++;
          const newRow = await this.addEntityToTable(entity, { confirmCreate: true, editing: false, emitEvent: false /*done in markAsLoaded()*/ });
          rowCount += !!newRow ? 1 : 0;
        }

        // Mark as dirty
        this.markAsDirty({emitEvent: false /* done in markAsLoaded() */});
      }

      if (this.totalRowCount !== rowCount) {
        // FIXME Workaround to update row count
        console.warn('[batches-table] Updating rowCount manually! (should be fixed when table confirmEditCreate() are async ?)');
        this.totalRowCount = rowCount;
        this.visibleRowCount = rowCount;
      }
      this.markForCheck();

    } catch (err) {
      console.error(err && err.message || err, err);
      this.setError(err && err.message || err);
    } finally {
      this.markAsLoaded();
    }
  }

  /* -- protected methods -- */

  protected abstract openDetailModal(dataToOpen?: T): Promise<T | undefined>;

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

  protected prepareEntityToSave(data: T) {
    // Override by subclasses
  }

  /**
   * Allow to remove/Add some pmfms. Can be override by subclasses
   *
   * @param pmfms
   */
  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    if (!pmfms) return pmfms; // Skip (no pmfms)

    this._initialPmfms = pmfms; // Copy original pmfms list

    this.weightPmfms = pmfms.filter(p => PmfmUtils.isWeight(p));
    this.defaultWeightPmfm = firstArrayValue(this.weightPmfms); // First as default
    this.weightPmfmsByMethod = splitByProperty(this.weightPmfms, 'methodId');

    // Exclude weight PMFMs
    return pmfms.filter(p => !this.weightPmfms.includes(p));
  }

  protected async onNewEntity(data: T): Promise<void> {
    console.debug('[sample-table] Initializing new row data...');

    await super.onNewEntity(data);

    // generate label
    data.label = `${this.acquisitionLevel}#${data.rankOrder}`;

    // Default values
    if (isNotNil(this.defaultTaxonName)) {
      data.taxonName = this.defaultTaxonName;
    }
    if (isNotNil(this.defaultTaxonGroup)) {
      data.taxonGroup = this.defaultTaxonGroup;
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}

