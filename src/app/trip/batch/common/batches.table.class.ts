import { Directive, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';
import {
  firstArrayValue,
  IEntitiesService,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  ReferentialUtils,
  removeDuplicatesFromArray,
  splitByProperty,
  UsageMode,
} from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable, BaseMeasurementsTableConfig, BaseMeasurementsTableState } from '@app/data/measurement/measurements-table.class';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { Batch } from './batch.model';
import { Landing } from '../../landing/landing.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { Operation } from '../../trip/trip.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { Sale } from '@app/trip/sale/sale.model';
import { OverlayEventDetail } from '@ionic/core';
import { BatchValidatorOptions, BatchValidatorService } from '@app/trip/batch/common/batch.validator';
import { IEntityWithMeasurement } from '@app/data/measurement/measurement.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';

export const BATCH_RESERVED_START_COLUMNS: string[] = ['taxonGroup', 'taxonName'];
export const BATCH_RESERVED_END_COLUMNS: string[] = ['comments'];

export interface AbstractBatchesTableState extends BaseMeasurementsTableState {
  showTaxonGroupColumn: boolean;
  showTaxonNameColumn: boolean;
}

export interface AbstractBatchesTableConfig<T extends IEntityWithMeasurement<T>, ST extends AbstractBatchesTableState = AbstractBatchesTableState>
  extends BaseMeasurementsTableConfig<T, ST> {
  mapPmfms?: undefined; // Avoid to override mapPmfms
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AbstractBatchesTable<
    T extends Batch<T> = Batch<any>,
    F extends BatchFilter = BatchFilter,
    S extends IEntitiesService<T, F> = IEntitiesService<T, F>,
    V extends BatchValidatorService<T, VO> = BatchValidatorService<T, any>,
    ST extends AbstractBatchesTableState = AbstractBatchesTableState,
    O extends AbstractBatchesTableConfig<T, ST> = AbstractBatchesTableConfig<T, ST>,
    VO extends BatchValidatorOptions = BatchValidatorOptions,
  >
  extends BaseMeasurementsTable<T, F, S, V, ST, O, VO>
  implements OnInit, OnDestroy
{
  protected _initialPmfms: IPmfm[];
  protected readonly referentialRefService = inject(ReferentialRefService);

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

  @Input() defaultTaxonGroup: TaxonGroupRef;
  @Input() defaultTaxonName: TaxonNameRef;
  @Input() availableTaxonGroups: TaxonGroupRef[];
  @Input() samplingRatioFormat: SamplingRatioFormat = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;

  protected constructor(dataType: new () => T, filterType: new () => F, dataService: S, validatorService: V, options?: O) {
    super(dataType, filterType, dataService, validatorService, <O>{
      reservedStartColumns: BATCH_RESERVED_START_COLUMNS,
      reservedEndColumns: BATCH_RESERVED_END_COLUMNS,
      i18nColumnPrefix: 'TRIP.BATCH.TABLE.',
      i18nPmfmPrefix: 'TRIP.BATCH.PMFM.',
      ...options,
      mapPmfms: (pmfms) => this.mapPmfms(pmfms),
    });
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
      mobile: this.mobile,
    });

    // Taxon name combo
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonNames(value, options),
      mobile: this.mobile,
    });
  }

  setParent(data: Operation | Landing) {
    if (!data) {
      this.setFilter({} as F);
    } else if (data instanceof Operation) {
      this.setFilter({ operationId: data.id } as F);
    } else if (data instanceof Sale) {
      this.setFilter({ saleId: data.id } as F);
    }
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    const { data, role } = await this.openDetailModal();
    if (data && role !== 'delete') {
      // Can be an update (is user use the 'save and new' modal's button)
      await this.addOrUpdateEntityToTable(data);
      return true;
    } else {
      this.editedRow = null;
      return false;
    }
  }

  protected async openRow(id: number, row: TableElement<T>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onOpenRow.observed) {
      this.onOpenRow.emit(row);
      return true;
    }

    const dataToOpen = this.toEntity(row, true);

    // Prepare entity measurement values
    this.prepareEntityToSave(dataToOpen);

    const { data, role } = await this.openDetailModal(dataToOpen, row);
    if (data && role !== 'delete') {
      // Can be an update (is user use the 'save and new' modal's button)
      await this.addOrUpdateEntityToTable(data);
      return true;
    } else {
      this.editedRow = null;
      return false;
    }
  }

  /**
   * Auto fill table (e.g. with taxon groups found in strategies) - #176
   */
  async autoFillTable(opts = { skipIfDisabled: true, skipIfNotEmpty: false }) {
    try {
      // Wait table loaded
      await this.waitIdle({ stop: this.destroySubject });

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

      // Skip when editing a row
      if (!this.confirmEditCreate()) {
        console.warn('[batches-table] Skipping autofill, as table still editing a row');
        return;
      }

      this.markAsLoading();

      console.debug('[batches-table] Auto fill table, using options:', opts);

      // Generate species rows
      if (this.showTaxonGroupColumn) {
        // Skip if no available taxon group configured (should be set by parent page - e.g. OperationPage)
        if (isEmptyArray(this.availableTaxonGroups)) {
          console.warn('[batches-table] Skipping autofill, because no availableTaxonGroups has been set');
          return;
        }

        // Read existing taxonGroups
        const data = this.dataSource.getData();
        const existingTaxonGroups = removeDuplicatesFromArray(data.map((batch) => batch.taxonGroup).filter(isNotNil), 'id');

        const taxonGroupsToAdd = this.availableTaxonGroups
          // Exclude if already exists
          .filter((taxonGroup) => !existingTaxonGroups.some((tg) => ReferentialUtils.equals(tg, taxonGroup)));

        if (isNotEmptyArray(taxonGroupsToAdd)) {
          let rankOrder = data.reduce((res, b) => Math.max(res, b.rankOrder || 0), 0) + 1;

          const entities = [];
          for (const taxonGroup of taxonGroupsToAdd) {
            const entity = new this.dataType();
            entity.taxonGroup = TaxonGroupRef.fromObject(taxonGroup);
            entity.rankOrder = rankOrder++;
            entities.push(entity);
          }

          await this.addEntitiesToTable(entities, { emitEvent: false });

          // Mark as dirty
          this.markAsDirty({ emitEvent: false /* done in markAsLoaded() */ });
        }
      } else if (this.filteredPmfms?.length) {
        const data = this.dataSource.getData();
        let rankOrder = data.reduce((res, b) => Math.max(res, b.rankOrder || 0), 0) + 1;

        const pmfm = PmfmUtils.getFirstQualitativePmfm(this.filteredPmfms, { excludeHidden: true, minQvCount: 2 });
        if (isNotEmptyArray(pmfm?.qualitativeValues)) {
          const entities = pmfm.qualitativeValues
            .filter((qv) => data.every((entity) => !PmfmValueUtils.equals(entity.measurementValues[pmfm.id], qv)))
            .map((qv) => {
              const entity = new this.dataType();
              entity.measurementValues = { [pmfm.id]: qv.id };
              entity.rankOrder = rankOrder++;
              return entity;
            });
          await this.addEntitiesToTable(entities, { emitEvent: false });

          // Mark as dirty
          this.markAsDirty({ emitEvent: false /* done in markAsLoaded() */ });
        }
      } else {
        console.warn('Unable to fill rows: taxon groups not found, and no qualitative pmfms ');
      }

      this.markForCheck();
    } catch (err) {
      console.error((err && err.message) || err, err);
      this.setError((err && err.message) || err);
    } finally {
      this.markAsLoaded();
    }
  }

  /* -- protected methods -- */

  protected abstract openDetailModal(dataToOpen?: T, row?: TableElement<T>): Promise<OverlayEventDetail<T | undefined>>;

  protected async suggestTaxonGroups(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    //if (isNilOrBlank(value)) return [];
    return this.programRefService.suggestTaxonGroups(value, {
      program: this.programLabel,
      searchAttribute: options && options.searchAttribute,
    });
  }

  protected async suggestTaxonNames(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    const taxonGroup = this.editedRow && this.editedRow.validator.get('taxonGroup').value;

    // IF taxonGroup column exists: taxon group must be filled first
    if (this.showTaxonGroupColumn && isNilOrBlank(value) && isNil(taxonGroup)) return { data: [] };

    return this.programRefService.suggestTaxonNames(value, {
      programLabel: this.programLabel,
      searchAttribute: options && options.searchAttribute,
      taxonGroupId: (taxonGroup && taxonGroup.id) || undefined,
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

    this.weightPmfms = pmfms.filter((p) => PmfmUtils.isWeight(p));
    this.defaultWeightPmfm = firstArrayValue(this.weightPmfms); // First as default
    this.weightPmfmsByMethod = splitByProperty(this.weightPmfms, 'methodId');

    // Exclude weight PMFMs
    return pmfms.filter((p) => !this.weightPmfms.includes(p));
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
}
