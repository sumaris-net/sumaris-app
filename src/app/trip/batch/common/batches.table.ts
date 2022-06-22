import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, InjectionToken, Injector, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import {TableElement, ValidatorService} from '@e-is/ngx-material-table';
import { EntityFilter, FilterFn, firstArrayValue, InMemoryEntitiesService, IReferentialRef, isNil, isNilOrBlank, isNotNil, LoadResult, UsageMode } from '@sumaris-net/ngx-components';
import { AppMeasurementsTable, AppMeasurementsTableOptions } from '../../measurement/measurements.table.class';
import {TaxonGroupRef} from '@app/referential/services/model/taxon-group.model';
import {Batch} from './batch.model';
import {Landing} from '../../services/model/landing.model';
import {AcquisitionLevelCodes, PmfmLabelPatterns} from '@app/referential/services/model/model.enum';
import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import {ReferentialRefService} from '@app/referential/services/referential-ref.service';
import { BatchModal, IBatchModalOptions } from './batch.modal';
import {environment} from '@environments/environment';
import {Operation} from '../../services/model/trip.model';
import { TaxonNameRef } from "@app/referential/services/model/taxon-name.model";
import { splitByProperty } from '@sumaris-net/ngx-components';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { ProgramProperties } from '@app/referential/services/config/program.config';

export class BatchFilter extends EntityFilter<BatchFilter, Batch> {
  operationId?: number;
  landingId?: number;

  asFilterFn<E extends Batch>(): FilterFn<E> {
    return (data) =>
      (isNil(this.operationId) || data.operationId === this.operationId)

      // TODO enable this:
      // && (isNil(this.landingId) || data.landingId === this.landingId))
      ;
  }
}

export const BATCH_RESERVED_START_COLUMNS: string[] = ['taxonGroup', 'taxonName'];
export const BATCH_RESERVED_END_COLUMNS: string[] = ['comments'];

export const DATA_TYPE_TOKEN = new InjectionToken<new() => Batch>('BatchesTableDataType');
export const FILTER_TYPE_TOKEN = new InjectionToken<new() => BatchFilter>('BatchesTableFilterType');

@Component({
  selector: 'app-batches-table',
  templateUrl: 'batches.table.html',
  styleUrls: ['batches.table.scss'],
  providers: [
    {provide: ValidatorService, useValue: null},  // important: do NOT use validator, to be sure to keep all PMFMS, and not only displayed pmfms
    {
      provide: InMemoryEntitiesService,
      useFactory: () => new InMemoryEntitiesService<Batch, BatchFilter>(Batch, BatchFilter, {
        equals: Batch.equals
      })
    },
    {
      provide: DATA_TYPE_TOKEN,
      useValue: Batch
    },
    {
      provide: FILTER_TYPE_TOKEN,
      useValue: BatchFilter
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchesTable<T extends Batch<any> = Batch<any>, F extends BatchFilter = BatchFilter>
  extends AppMeasurementsTable<T, F>
  implements OnInit, OnDestroy {

  protected _initialPmfms: IPmfm[];
  protected cd: ChangeDetectorRef;
  protected referentialRefService: ReferentialRefService;

  qvPmfm: IPmfm;
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

  get dirty(): boolean {
    return super.dirty || this.memoryDataService.dirty;
  }

  @Input() defaultTaxonGroup: TaxonGroupRef;
  @Input() defaultTaxonName: TaxonNameRef;
  @Input() samplingRatioFormat: SamplingRatioFormat = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;

  constructor(
    injector: Injector,
    @Inject(DATA_TYPE_TOKEN) dataType: new() => T,
    @Inject(FILTER_TYPE_TOKEN) filterType: new() => F,
    protected memoryDataService: InMemoryEntitiesService<T, F>,
    validatorService: ValidatorService,
    @Optional() options?: AppMeasurementsTableOptions<T>
  ) {
    super(injector,
      dataType || ((Batch as any) as (new() => T)),
      filterType || ((BatchFilter as any) as (new() => F)),
      memoryDataService,
      validatorService,
      {
        ...options,
        reservedStartColumns: BATCH_RESERVED_START_COLUMNS,
        reservedEndColumns: BATCH_RESERVED_END_COLUMNS,
        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        i18nColumnPrefix: 'TRIP.BATCH.TABLE.',
        i18nPmfmPrefix: 'TRIP.BATCH.PMFM.'
      }
    );
    this.cd = injector.get(ChangeDetectorRef);
    this.referentialRefService = injector.get(ReferentialRefService);
    this.inlineEdition = this.validatorService && !this.mobile;
    this.defaultSortBy = 'rankOrder';
    this.defaultSortDirection = 'asc';

    // Set default value
    this.showCommentsColumn = false;
    this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;

    //this.debug = false;
    //this.debug = !environment.production;
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
      await this.addEntityToTable(data);
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
      await this.updateEntityToTable(updatedData, row, {confirmCreate: false});
    } else {
      this.editedRow = null;
    }
    return true;
  }

  protected async openDetailModal(dataToOpen?: T): Promise<T | undefined> {
    const isNew = !dataToOpen && true;
    if (isNew) {
      dataToOpen = new this.dataType();
      await this.onNewEntity(dataToOpen);
    }

    this.markAsLoading();

    const modal = await this.modalCtrl.create({
      component: BatchModal,
      componentProps: <Partial<IBatchModalOptions>>{
        programLabel: this.programLabel,
        acquisitionLevel: this.acquisitionLevel,
        disabled: this.disabled,
        data: dataToOpen,
        isNew,
        qvPmfm: this.qvPmfm,
        showTaxonGroup: this.showTaxonGroupColumn,
        showTaxonName: this.showTaxonNameColumn,
        // Not need on a root species batch (fill in sub-batches)
        showTotalIndividualCount: false,
        showIndividualCount: false,
        mobile: this.mobile,
        usageMode: this.usageMode,
        i18nSuffix: this.i18nColumnSuffix,
        maxVisibleButtons: 3
      },
      keyboardClose: true
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();
    if (data && this.debug) console.debug('[batches-table] Batch modal result: ', data);
    this.markAsLoaded();

    if (data instanceof Batch) {
      return data as T;
    }

    // Exit if empty
    return undefined;
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

  protected prepareEntityToSave(data: T) {
    // Override by subclasses
  }

  /**
   * Allow to remove/Add some pmfms. Can be override by subclasses
   *
   * @param pmfms
   */
  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    if (!pmfms || !pmfms.length) return pmfms; // Skip (no pmfms)

    this._initialPmfms = pmfms; // Copy original pmfms list

    this.weightPmfms = pmfms.filter(p => PmfmUtils.isWeight(p));
    this.defaultWeightPmfm = firstArrayValue(this.weightPmfms); // First as default
    this.weightPmfmsByMethod = splitByProperty(this.weightPmfms, 'methodId');

    // Find the first qualitative PMFM
    this.qvPmfm = PmfmUtils.getFirstQualitativePmfm(pmfms);

    // Exclude weight PMFMs
    return pmfms.filter(p => !this.weightPmfms.includes(p));
  }

  protected async onNewEntity(data: T): Promise<void> {
    console.debug('[sample-table] Initializing new row data...');

    await super.onNewEntity(data);

    // generate label
    data.label = this.acquisitionLevel + '#' + data.rankOrder;

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

