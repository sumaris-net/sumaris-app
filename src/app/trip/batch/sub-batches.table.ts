import {Component, EventEmitter, Input, OnDestroy, OnInit} from "@angular/core";
import {BehaviorSubject, Observable, of} from 'rxjs';
import {debounceTime, filter, first, map, mergeMap, startWith} from "rxjs/operators";
import {TableElement, ValidatorService} from "angular4-material-table";
import {
  AccountService,
  AppTable,
  AppTableDataSource,
  EntityUtils,
  ReferentialRef,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS
} from "../../core/core.module";
import {Batch, getPmfmName, MeasurementUtils, PmfmStrategy, referentialToString} from "../services/trip.model";
import {ModalController, Platform} from "@ionic/angular";
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from '@angular/common';
import {
  PmfmIds,
  ProgramService,
  QualitativeLabels,
  ReferentialRefService,
  TaxonomicLevelIds
} from "../../referential/referential.module";
import {BatchValidatorService} from "../services/batch.validator";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {TranslateService} from '@ngx-translate/core';
import {environment} from '../../../environments/environment';
import {MeasurementsValidatorService, SubBatchValidatorService} from "../services/trip.validators";
import {DataService, isNil, isNotNil, LoadResult} from "../../shared/shared.module";

const PMFM_ID_REGEXP = /\d+/;
const SUBBATCH_RESERVED_START_COLUMNS: string[] = ['parent', 'taxonName'];
const SUBBATCH_RESERVED_END_COLUMNS: string[] = ['comments'];

@Component({
    selector: 'table-sub-batches',
    templateUrl: 'sub-batches.table.html',
    styleUrls: ['sub-batches.table.scss'],
    providers: [
        { provide: ValidatorService, useClass: BatchValidatorService }
    ]
})
export class SubBatchesTable extends AppTable<Batch, { operationId?: number }> implements OnInit, OnDestroy, ValidatorService, DataService<Batch, any> {

    private _program: string = environment.defaultProgram;
    private _acquisitionLevel: string;
    private _implicitValues: { [key: string]: any } = {};
    private _availableParents: Batch[] = [];
    private _dataSubject = new BehaviorSubject<LoadResult<Batch>>({data: []});
    private _onRefreshPmfms = new EventEmitter<any>();

    loading = true;
    loadingPmfms = true;
    displayParentPmfm: PmfmStrategy;
    pmfms = new BehaviorSubject<PmfmStrategy[]>(undefined);
    measurementValuesFormGroupConfig: { [key: string]: any };
    data: Batch[];
    taxonNames: Observable<ReferentialRef[]>;
    filteredParents: Observable<Batch[]>;

    set value(data: Batch[]) {
        if (this.data !== data) {
            this.data = data;
            if (!this.loading) this.onRefresh.emit();
        }
    }

    get value(): Batch[] {
        return this.data;
    }

    protected get dataSubject(): BehaviorSubject<LoadResult<Batch>> {
        return this._dataSubject;
    }

    @Input()
    set program(value: string) {
        if (this._program === value) return; // Skip if same
        this._program = value;
        if (!this.loading) {
            this._onRefreshPmfms.emit('set program');
        }
    }

    get program(): string {
        return this._program;
    }

    @Input()
    set acquisitionLevel(value: string) {
        if (this._acquisitionLevel !== value) {
            this._acquisitionLevel = value;
            if (!this.loading) this.onRefresh.emit();
        }
    }

    get acquisitionLevel(): string {
        return this._acquisitionLevel;
    }

    @Input() showCommentsColumn: boolean = true;
    @Input() showTaxonGroupColumn: boolean = true;
    @Input() showTaxonNameColumn: boolean = true;

    set  availableParents(parents: Batch[]) {
      if (this._availableParents !== parents) {
        // Sort parents by by Tag-ID
        this._availableParents = this.sortBatches(parents, PmfmIds.TAG_ID.toString());

        // Link samples to parent, and delete orphan
        this.linkBatchesToParentAndDeleteOrphan();
      }
    }

    get availableParents(): Batch[] {
      return this._availableParents;
    }

    constructor(
        protected route: ActivatedRoute,
        protected router: Router,
        protected platform: Platform,
        protected location: Location,
        protected modalCtrl: ModalController,
        protected accountService: AccountService,
        protected validatorService: SubBatchValidatorService,
        protected measurementsValidatorService: MeasurementsValidatorService,
        protected referentialRefService: ReferentialRefService,
        protected programService: ProgramService,
        protected translate: TranslateService,
        protected formBuilder: FormBuilder
    ) {
        super(route, router, platform, location, modalCtrl, accountService,
            RESERVED_START_COLUMNS.concat(SUBBATCH_RESERVED_START_COLUMNS).concat(SUBBATCH_RESERVED_END_COLUMNS).concat(RESERVED_END_COLUMNS)
        );
        this.i18nColumnPrefix = 'TRIP.BATCH.TABLE.';
        this.autoLoad = false;
        this.inlineEdition = true;
        this.setDatasource(new AppTableDataSource<any, { operationId?: number }>(
            Batch, this, this, {
                prependNewElements: false,
                onNewRow: (row) => this.onNewBatch(row.currentData)
            }));
        //this.debug = true;
    };

    async ngOnInit() {
      super.ngOnInit();

      let excludesColumns:String[] = new Array<String>();
      if (!this.showCommentsColumn) excludesColumns.push('comments');
      if (!this.showTaxonGroupColumn) excludesColumns.push('taxonGroup');
      if (!this.showTaxonNameColumn) excludesColumns.push('taxonName');

      this._onRefreshPmfms
          .pipe(
              startWith('ngOnInit')
          )
          .subscribe((event) => this.refreshPmfms(event));

      this.pmfms
        .pipe(
          filter(pmfms => pmfms && pmfms.length > 0),
          first()
        )
          .subscribe(pmfms => {
              this.measurementValuesFormGroupConfig = this.measurementsValidatorService.getFormGroupConfig(pmfms);
              let pmfmColumns = pmfms.map(p => p.pmfmId.toString());

              this.displayedColumns = RESERVED_START_COLUMNS
                  .concat(SUBBATCH_RESERVED_START_COLUMNS)
                  .concat(pmfmColumns)
                  .concat(SUBBATCH_RESERVED_END_COLUMNS)
                  .concat(RESERVED_END_COLUMNS)
                  // Remove columns to hide
                  .filter(column => !excludesColumns.includes(column));

              this.loading = false;

              if (this.data) this.onRefresh.emit();
          });

      // Taxon name combo
      this.taxonNames = this.registerCellValueChanges('taxonName')
          .pipe(
              debounceTime(250),
              mergeMap((value) => {
                  if (EntityUtils.isNotEmpty(value)) return of([value]);
                  value = (typeof value === "string" && value !== '*') && value || undefined;
                  if (this.debug) console.debug("[sub-batch-table] Searching taxon name on {" + (value || '*') + "}...");
                  return this.referentialRefService.loadAll(0, !value ? 30 : 10, undefined, undefined,
                      {
                          entityName: 'TaxonName',
                          levelId: TaxonomicLevelIds.SPECIES,
                          searchText: value as string,
                          searchAttribute: 'label'
                      })
                    .pipe(
                      first(),
                      map(({data}) => data)
                    );
              })
          );

      this.taxonNames.subscribe(items => {
          this._implicitValues['taxonName'] = (items.length === 1) && items[0] || undefined;
      });

      // Parent combo
      this.filteredParents = this.registerCellValueChanges('parent')
        .pipe(
          debounceTime(250),
          map((value) => {
            if (EntityUtils.isNotEmpty(value)) return [value];
            value = (typeof value === "string" && value !== "*") && value || undefined;
            if (this.debug) console.debug("[sub-batch-table] Searching parent {" + (value || '*') + "}...");
            if (isNil(value)) return this._availableParents; // All
            const ucValueParts = value.trim().toUpperCase().split(" ", 1);
            // Search on labels (taxonGroup or taxonName)
            return this._availableParents.filter(p =>
              (p.taxonGroup && p.taxonGroup.label && p.taxonGroup.label.toUpperCase().indexOf(ucValueParts[0]) === 0) ||
              (p.taxonName  && p.taxonName.label  && p.taxonName.label.toUpperCase().indexOf(ucValueParts.length == 2 ? ucValueParts[1] : ucValueParts[0]) === 0)
            );
          })
        )
      ;

      // add implicit value
      this.filteredParents.subscribe(items => {
        this._implicitValues['parent'] = (items.length === 1) && items[0];
      });

      // Listening on column 'IS_DEAD' value changes
      this.registerCellValueChanges('discard', "measurementValues." + PmfmIds.DISCARD_OR_LANDING.toString())
        .subscribe((value) => {
          if (!this.editedRow) return; // Should never occur
          const row = this.editedRow;
          const controls = (row.validator.controls['measurementValues'] as FormGroup).controls;
          if (EntityUtils.isNotEmpty(value) && value.label == QualitativeLabels.DISCARD_OR_LANDING.DISCARD) {
            if (controls[PmfmIds.DISCARD_REASON]) {
              if (row.validator.enabled) {
                controls[PmfmIds.DISCARD_REASON].enable();
              }
              controls[PmfmIds.DISCARD_REASON].setValidators(Validators.required);
              controls[PmfmIds.DISCARD_REASON].updateValueAndValidity();
            }
          }
          else {
            if (controls[PmfmIds.DISCARD_REASON]) {
              controls[PmfmIds.DISCARD_REASON].disable();
              controls[PmfmIds.DISCARD_REASON].setValue(null);
              controls[PmfmIds.DISCARD_REASON].setValidators([]);
            }
          }
        });
    }

    getRowValidator(): FormGroup {
        let formGroup = this.validatorService.getRowValidator();
        if (this.measurementValuesFormGroupConfig) {
            formGroup.addControl('measurementValues', this.formBuilder.group(this.measurementValuesFormGroupConfig));
        }
        return formGroup;
    }

    loadAll(
        offset: number,
        size: number,
        sortBy?: string,
        sortDirection?: string,
        filter?: any,
        options?: any
    ): Observable<LoadResult<Batch>> {
      if (!this.data) {
          if (this.debug) console.debug("[sub-batch-table] Unable to load row: value not set (or not started)");
          return of(); // Not initialized
      }

      // If dirty: save first
      if (this._dirty) {
        this.save()
          .then(saved => {
            if (saved) {
              this.loadAll(offset, size, sortBy, sortDirection, filter, options);
              this._dirty = true; // restore previous state
            }
          });
      }
      else {
        sortBy = (sortBy !== 'id') && sortBy || 'rankOrder'; // Replace id by rankOrder
        sortBy = (sortBy !== 'parent') && sortBy || 'parent.rankOrder'; // Replace parent by its rankOrder

        const now = Date.now();
        if (this.debug) console.debug("[sub-batch-table] Loading rows..", this.data);

        this.pmfms
          .pipe(
            filter(pmfms => pmfms && pmfms.length > 0),
            first()
          )
          .subscribe((pmfms: PmfmStrategy[]) => {
            // Transform entities into object array
            const data = this.data.map(batch => {
              const json = batch.asObject();
              json.measurementValues = MeasurementUtils.normalizeFormValues(batch.measurementValues, pmfms);
              return json;
            });

            // Link to parent
            this.linkBatchesToParent(data);

            // Sort
            this.sortBatches(data, sortBy, sortDirection);
            if (this.debug) console.debug(`[batch-table] Rows loaded in ${Date.now() - now}ms`, data);

            this._dataSubject.next({data: data});
          });
      }

      return this._dataSubject.asObservable();
    }

    async saveAll(data: Batch[], options?: any): Promise<Batch[]> {
        if (!this.data) throw new Error("[batch-table] Could not save table: value not set (or not started)");

        if (this.debug) console.debug("[batch-table] Updating data from rows...");

        const pmfms = this.pmfms.getValue() || [];
        this.data = data
          .map(json => {
            const batch = Batch.fromObject(json);
            batch.measurementValues = MeasurementUtils.toEntityValues(json.measurementValues, pmfms);
            batch.parentId = json.parent && json.parent.id;
            return batch;
        });

        return this.data;
    }

    deleteAll(dataToRemove: Batch[], options?: any): Promise<any> {
        this._dirty = true;
        // Noting else to do (make no sense to delete in this.data, will be done in saveAll())
        return Promise.resolve();
    }

    addRow(): boolean {
        if (this.debug) console.debug("[sub-batch-table] Calling addRow()");

        // Create new row
        const result = super.addRow();
        if (!result) return result;

        const row = this.dataSource.getRow(-1);
        this.data.push(row.currentData);
        this.editedRow = row;

        // Listen row value changes
        this.startListenRow(row);

        return true;
    }

    onRowClick(event: MouseEvent, row: TableElement<Batch>): boolean {
        const canEdit = super.onRowClick(event, row);
        if (canEdit) this.startListenRow(row);
        return canEdit;
    }

    parentBatchToString(batch: Batch) {
        if (!batch) return null;
        if (batch.taxonName && batch.taxonName.label && (!batch.taxonGroup || !batch.taxonGroup.label || batch.taxonGroup.label == batch.taxonName.label)) {
          return `${batch.taxonName.label} - ${batch.taxonName.name}`;
        }
        if (batch.taxonGroup && batch.taxonGroup.label && batch.taxonName && batch.taxonName.label) {
          return `${batch.taxonGroup.label} / ${batch.taxonName.label} - ${batch.taxonName.name}`;
        }
        return `#${batch.rankOrder}`;
    }

    onCellFocus(event: any, row: TableElement<any>, columnName: string) {
        this.startCellValueChanges(columnName, row);
    }

    onCellBlur(event: FocusEvent, row: TableElement<any>, columnName: string) {
        this.stopCellValueChanges(columnName);
        // Apply last implicit value
        if (row.validator.controls[columnName].hasError('entity') && isNotNil(this._implicitValues[columnName])) {
            row.validator.controls[columnName].setValue(this._implicitValues[columnName]);
        }
        this._implicitValues[columnName] = undefined;
    }

    public trackByFn(index: number, row: TableElement<Batch>) {
        return row.currentData.rankOrder;
    }

    /* -- protected methods -- */

    protected async getMaxRankOrder(): Promise<number> {
      const rows = await this.dataSource.getRows();
      return rows.reduce((res, row) => Math.max(res, row.currentData.rankOrder || 0), 0);
    }

    protected async onNewBatch(batch: Batch, rankOrder?: number): Promise<void> {
      // Set computed values
      batch.rankOrder = isNotNil(rankOrder) ? rankOrder : ((await this.getMaxRankOrder()) + 1);
      batch.label = this._acquisitionLevel + "#" + batch.rankOrder;

      // Set default values
      (this.pmfms.getValue() || [])
        .filter(pmfm => isNotNil(pmfm.defaultValue))
        .forEach(pmfm => {
            batch.measurementValues[pmfm.pmfmId] = MeasurementUtils.normalizeFormValue(pmfm.defaultValue, pmfm);
        });
    }

    /**
     * Can be overrided in subclasses
     **/
    protected startListenRow(row: TableElement<Batch>) {
      this.startCellValueChanges('discard', row);
    }

    protected getI18nColumnName(columnName: string): string {

        // Try to resolve PMFM column, using the cached pmfm list
        if (PMFM_ID_REGEXP.test(columnName)) {
            const pmfmId = parseInt(columnName);
            const pmfm = (this.pmfms.getValue() || []).find(p => p.pmfmId === pmfmId);
            if (pmfm) return pmfm.name;
        }

        return super.getI18nColumnName(columnName);
    }

  protected linkBatchesToParent(data: Batch[]) {
    if (!this._availableParents || !data) return;

    data.forEach(s => {
      const parentId = s.parentId || (s.parent && s.parent.id);
      s.parent = isNotNil(parentId) ? this.availableParents.find(p => p.id === parentId) : null;
    });
  }

  /**
   * Remove batches in table, if there have no more parent
   */
  protected async linkBatchesToParentAndDeleteOrphan() {

    const rows = await this.dataSource.getRows();

    // Check if need to delete some rows
    let hasRemovedBatch = false;
    const data = rows
      .filter(row => {
        const s = row.currentData;
        const parentId = s.parentId || (s.parent && s.parent.id);

        if (isNil(parentId)) {
          const parentTaxonGroupId = s.parent && s.parent.taxonGroup && s.parent.taxonGroup.id ;
          const parentTaxonNameId = s.parent && s.parent.taxonName && s.parent.taxonName.id;
          if (isNil(parentTaxonGroupId) && isNil(parentTaxonNameId)) {
            s.parent = undefined; // remove link to parent
            return true; // not yet a parent: keep (.e.g new row)
          }
          // Update the parent, by taxonGroup+taxonName
          s.parent = this.availableParents.find(p =>
            (p && ((!p.taxonGroup && !parentTaxonGroupId) || (p.taxonGroup && p.taxonGroup.id == parentTaxonGroupId))
            && ((!p.taxonName && !parentTaxonNameId) || (p.taxonName && p.taxonName.id == parentTaxonNameId))));

        }
        else {
          // Update the parent, by id
          s.parent = this.availableParents.find(p => p.id == parentId);
        }

        // Could not found the parent anymore (parent has been delete)
        if (!s.parent) {
          hasRemovedBatch = true;
          return false;
        }

        if (!row.editing) this.dataSource.refreshValidator(row);

        return true; // Keep only if sample still have a parent
      })
      .map(r => r.currentData);

    if (hasRemovedBatch) this._dataSubject.next({data: data});
  }

    protected sortBatches(data: Batch[], sortBy?: string, sortDirection?: string): Batch[] {
        if (sortBy && PMFM_ID_REGEXP.test(sortBy)) {
            sortBy = 'measurementValues.' + sortBy;
        }
        else if (sortBy === "parent") {
            sortBy = 'parent.measurementValues.' + PmfmIds.TAG_ID;
        }
        sortBy = (!sortBy || sortBy === 'id') ? 'rankOrder' : sortBy; // Replace id with rankOrder
        const after = (!sortDirection || sortDirection === 'asc') ? 1 : -1;
        return data.sort((a, b) => {
            const valueA = EntityUtils.getPropertyByPath(a, sortBy);
            const valueB = EntityUtils.getPropertyByPath(b, sortBy);
            return valueA === valueB ? 0 : (valueA > valueB ? after : (-1 * after));
        });
    }

    protected async refreshPmfms(event?: any): Promise<PmfmStrategy[]> {
        const candLoadPmfms = isNotNil(this._program) && isNotNil(this._acquisitionLevel);
        if (!candLoadPmfms) {
            return undefined;
        }

        this.loading = true;
        this.loadingPmfms = true;

        // Load pmfms
        const pmfms = (await this.programService.loadProgramPmfms(
            this._program,
            {
                acquisitionLevel: this._acquisitionLevel
            })) || [];

        if (!pmfms.length && this.debug) {
            console.debug(`[sub-batch-table] No pmfm found (program=${this.program}, acquisitionLevel=${this._acquisitionLevel}). Please fill program's strategies !`);
        }

        this.loadingPmfms = false;

        this.pmfms.next(pmfms);

        return pmfms;
    }

    referentialToString = referentialToString;
    getPmfmColumnHeader = getPmfmName;
}

