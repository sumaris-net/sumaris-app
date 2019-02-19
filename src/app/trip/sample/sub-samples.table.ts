import {Component, EventEmitter, Input, OnDestroy, OnInit} from "@angular/core";
import {BehaviorSubject, Observable, of} from 'rxjs';
import {debounceTime, filter, first, map, startWith} from "rxjs/operators";
import {TableElement, ValidatorService} from "angular4-material-table";
import {
  AccountService,
  AppTable,
  AppTableDataSource,
  EntityUtils,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS
} from "../../core/core.module";
import {getPmfmName, MeasurementUtils, PmfmStrategy, Sample} from "../services/trip.model";
import {ModalController, Platform} from "@ionic/angular";
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from '@angular/common';
import {PmfmIds, ProgramService, ReferentialRefService} from "../../referential/referential.module";
import {SubSampleValidatorService} from "../services/sub-sample.validator";
import {FormBuilder, FormGroup} from "@angular/forms";
import {TranslateService} from '@ngx-translate/core';
import {environment} from '../../../environments/environment';
import {MeasurementsValidatorService} from "../services/trip.validators";
import {isNil, isNotNil, LoadResult} from "../../shared/shared.module";

const PMFM_ID_REGEXP = /\d+/;
const SUBSAMPLE_RESERVED_START_COLUMNS: string[] = ['parent'];
const SUBSAMPLE_RESERVED_END_COLUMNS: string[] = ['comments'];

@Component({
    selector: 'table-sub-samples',
    templateUrl: 'sub-samples.table.html',
    styleUrls: ['sub-samples.table.scss'],
    providers: [
        { provide: ValidatorService, useClass: SubSampleValidatorService }
    ]
})
export class SubSamplesTable extends AppTable<Sample, { operationId?: number }> implements OnInit, OnDestroy, ValidatorService {

    private _program: string = environment.defaultProgram;
    private _acquisitionLevel: string;
    private _implicitParent: Sample;
    private _availableSortedParents: Sample[] = [];
    private _availableParents: Sample[] = [];
    private _dataSubject = new BehaviorSubject<LoadResult<Sample>>({data: []});
    private _onRefreshPmfms = new EventEmitter<any>();

    loading = true;
    loadingPmfms = true;
    displayParentPmfm: PmfmStrategy;
    pmfms = new BehaviorSubject<PmfmStrategy[]>(undefined);
    measurementValuesFormGroupConfig: { [key: string]: any };
    data: Sample[];
    filteredParents: Observable<Sample[]>;

    set value(data: Sample[]) {
        if (this.data !== data) {
            this.data = data;
            if (!this.loading) this.onRefresh.emit();
        }
    }

    get value(): Sample[] {
        return this.data;
    }

    protected get dataSubject(): BehaviorSubject<LoadResult<Sample>> {
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

    set availableParents(parents: Sample[]) {
        if (this._availableParents !== parents) {

          this._availableParents = parents;

            // Sort parents by by Tag-ID
            this._availableSortedParents = this.sortSamples(parents.slice(), PmfmIds.TAG_ID.toString());

            // Link samples to parent, and delete orphan
            this.linkSamplesToParentAndDeleteOrphan();
        }
    }

    get availableParents(): Sample[] {
        return this._availableParents;
    }

    constructor(
        protected route: ActivatedRoute,
        protected router: Router,
        protected platform: Platform,
        protected location: Location,
        protected modalCtrl: ModalController,
        protected accountService: AccountService,
        protected validatorService: SubSampleValidatorService,
        protected measurementsValidatorService: MeasurementsValidatorService,
        protected referentialRefService: ReferentialRefService,
        protected programService: ProgramService,
        protected translate: TranslateService,
        protected formBuilder: FormBuilder
    ) {
        super(route, router, platform, location, modalCtrl, accountService,
            RESERVED_START_COLUMNS.concat(SUBSAMPLE_RESERVED_START_COLUMNS).concat(SUBSAMPLE_RESERVED_END_COLUMNS).concat(RESERVED_END_COLUMNS)
        );
        this.i18nColumnPrefix = 'TRIP.SAMPLE.TABLE.';
        this.autoLoad = false;
        this.inlineEdition = true;
        this.setDatasource(new AppTableDataSource<any, { operationId?: number }>(
            Sample, this, this, {
                prependNewElements: false,
                onNewRow: (row) => this.onNewSample(row.currentData)
            }));
        //this.debug = true;
    };

    async ngOnInit() {
        super.ngOnInit();

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
                this.displayParentPmfm = (pmfms || []).find(p => p.pmfmId == PmfmIds.TAG_ID);
                pmfms = (pmfms || []).filter(p => p !== this.displayParentPmfm);
                this.measurementValuesFormGroupConfig = this.measurementsValidatorService.getFormGroupConfig(pmfms);
                let pmfmColumns = pmfms.map(p => p.pmfmId.toString());

                this.displayedColumns = RESERVED_START_COLUMNS
                    .concat(SUBSAMPLE_RESERVED_START_COLUMNS)
                    .concat(pmfmColumns)
                    .concat(SUBSAMPLE_RESERVED_END_COLUMNS)
                    .concat(RESERVED_END_COLUMNS);

                this.loading = false;

                if (this.data) this.onRefresh.emit();
            });

        // Parent combo
        this.filteredParents = this.registerCellValueChanges('parent')
            .pipe(
                debounceTime(250),
                map((value) => {
                    if (EntityUtils.isNotEmpty(value)) return [value];
                    value = (typeof value === "string" && value !== "*") && value || undefined;
                    if (this.debug) console.debug("[sub-sample-table] Searching parent {" + (value || '*') + "}...");
                    if (!value) return this._availableSortedParents; // All
                    if (this.displayParentPmfm) { // Search on a specific Pmfm (e.g Tag-ID)
                        return this._availableSortedParents.filter(p => p.measurementValues && (p.measurementValues[this.displayParentPmfm.pmfmId] || '').startsWith(value))
                    }
                    // Search on rankOrder
                    return this._availableSortedParents.filter(p => p.rankOrder && p.rankOrder.toString().startsWith(value));
                })
            )
            ;

        // add implicit value
        this.filteredParents.subscribe(items => {
            this._implicitParent = (items.length === 1) && items[0];
        });
    }

    getRowValidator(): FormGroup {
        return this.getFormGroup();
    }

    getFormGroup(data?: any): FormGroup {
        let formGroup = this.validatorService.getFormGroup(data);
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
    ): Observable<LoadResult<Sample>> {
      if (!this.data) {
          if (this.debug) console.debug("[sub-sample-table] Unable to load row: value not set (or not started)");
          return of(); // Not initialized
      }

      // If dirty: save first
      if (this._dirty) {
        this.save()
          .then(saved => {
            if (saved) {
              // Loop
              this.loadAll(offset, size, sortBy, sortDirection, filter, options);
              this._dirty = true; // restore previous state
            }
          });
      }
      else {
        sortBy = (sortBy !== 'id') && sortBy || 'rankOrder'; // Replace id by rankOrder

        const now = Date.now();
        if (this.debug) console.debug("[sub-sample-table] Loading rows...", this.data);

        this.pmfms
          .pipe(
            filter(pmfms => pmfms && pmfms.length > 0),
            first()
          )
          .subscribe((pmfms: PmfmStrategy[]) => {
            // Transform entities into object array
            const data = this.data.map(sample => {
              const json = sample.asObject();
              json.measurementValues = MeasurementUtils.normalizeFormValues(sample.measurementValues, pmfms);
              return json;
            });

            // Link to parent
            this.linkSamplesToParent(data);

            // Sort
            this.sortSamples(data, sortBy, sortDirection);
            if (this.debug) console.debug(`[sub-sample-table] Rows loaded in ${Date.now() - now}ms`, data);

            this._dataSubject.next({data: data});
          });
      }

      return this._dataSubject.asObservable();
    }

    async saveAll(data: Sample[], options?: any): Promise<Sample[]> {
        if (!this.data) throw new Error("[sub-sample-table] Could not save table: value not set (or not started)");

        if (this.debug) console.debug("[sub-sample-table] Updating data from rows...");

        const pmfms = this.pmfms.getValue() || [];
        this.data = data.map(json => {
            const sample = Sample.fromObject(json);
            sample.measurementValues = MeasurementUtils.toEntityValues(json.measurementValues, pmfms);
            sample.parentId = json.parent && json.parent.id;
            return sample;
        });

        return this.data;
    }

    deleteAll(dataToRemove: Sample[], options?: any): Promise<any> {
        this._dirty = true;
        // Noting else to do (make no sense to delete in this.data, will be done in saveAll())
        return Promise.resolve();
    }

    addRow(): boolean {
        if (this.debug) console.debug("[sub-sample-table] Calling addRow()");

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

    onRowClick(event: MouseEvent, row: TableElement<Sample>): boolean {
        const canEdit = super.onRowClick(event, row);
        if (canEdit) this.startListenRow(row);
        return canEdit;
    }


    parentSampleToString(sample: Sample) {
        if (!sample) return null;
        return sample.measurementValues && sample.measurementValues[PmfmIds.TAG_ID] || `#${sample.rankOrder}`;
    }

    onParentCellBlur(event: FocusEvent, row: TableElement<any>) {
        // Apply last implicit value
        if (row.validator.controls.parent.hasError('entity') && this._implicitParent) {
            row.validator.controls.parent.setValue(this._implicitParent);
        }
        this._implicitParent = undefined;
    }

    async autoFillTable() {
        if (this.loading) return;
        if (!this.confirmEditCreate()) return;

        const rows = await this.dataSource.getRows();
        const data = rows.map(r => r.currentData);
        const startRowCount = data.length;

        let rankOrder = await this.getMaxRankOrder();
        await this._availableParents
            .filter(p => !data.find(s => s.parent && s.parent.id === p.id))
            .map(async p => {
                const sample = new Sample();
                sample.parent = p;
                await this.onNewSample(sample, ++rankOrder);
                data.push(sample);
            });

        if (data.length > startRowCount) {
            this._dataSubject.next({data: data});
            this._dirty = true;
        }
    }

    public trackByFn(index: number, row: TableElement<Sample>) {
      return row.currentData.rankOrder;
    }

    /* -- protected methods -- */


    protected async getMaxRankOrder(): Promise<number> {
        const rows = await this.dataSource.getRows();
        return rows.reduce((res, row) => Math.max(res, row.currentData.rankOrder || 0), 0);
    }

    protected async onNewSample(sample: Sample, rankOrder?: number): Promise<void> {
        // Set computed values
        sample.rankOrder = isNotNil(rankOrder) ? rankOrder : ((await this.getMaxRankOrder()) + 1);
        sample.label = this._acquisitionLevel + "#" + sample.rankOrder;

        // Set default values
        (this.pmfms.getValue() || [])
            .filter(pmfm => isNotNil(pmfm.defaultValue))
            .forEach(pmfm => {
                sample.measurementValues[pmfm.pmfmId] = MeasurementUtils.normalizeFormValue(pmfm.defaultValue, pmfm);
            });
    }

    /**
     * Can be overrided in subclasses (e.g. monitoring invidual table)
     **/
    protected startListenRow(row: TableElement<Sample>) {
        this.startCellValueChanges('parent', row);
    }

    protected getI18nColumnName(columnName: string): string {

        // Replace parent by TAG_ID pmfms
        columnName = columnName && columnName === 'parent' && this.displayParentPmfm ? this.displayParentPmfm.pmfmId.toString() : columnName;

        // Try to resolve PMFM column, using the cached pmfm list
        if (PMFM_ID_REGEXP.test(columnName)) {
            const pmfmId = parseInt(columnName);
            const pmfm = (this.pmfms.getValue() || []).find(p => p.pmfmId === pmfmId);
            if (pmfm) return pmfm.name;
        }

        return super.getI18nColumnName(columnName);
    }

    protected linkSamplesToParent(data: Sample[]) {
        if (!this._availableParents || !data) return;

        data.forEach(s => {
            const parentId = s.parentId || (s.parent && s.parent.id);
            s.parent = isNotNil(parentId) ? this.availableParents.find(p => p.id === parentId) : null;
        });
    }

    /**
     * Remove samples in table, if there have no more parent
     */
    protected async linkSamplesToParentAndDeleteOrphan() {

        const rows = await this.dataSource.getRows();

        // Check if need to delete some rows
        let hasRemovedSample = false;
        const data = rows
            .filter(row => {
                const s = row.currentData;
                const parentId = s.parentId || (s.parent && s.parent.id);

                if (isNil(parentId)) {
                    const parentTagId = s.parent && s.parent.measurementValues && s.parent.measurementValues[PmfmIds.TAG_ID];
                    if (isNil(parentTagId)) {
                        s.parent = undefined; // remove link to parent
                        return true; // not yet a parent: keep (.e.g new row)
                    }
                    // Update the parent, by tagId
                    s.parent = this.availableParents.find(p => (p && p.measurementValues && p.measurementValues[PmfmIds.TAG_ID]) === parentTagId);

                }
                else {
                    // Update the parent, by id
                    s.parent = this.availableParents.find(p => p.id == s.parent.id);
                }

                // Could not found the parent anymore (parent has been delete)
                if (!s.parent) {
                    hasRemovedSample = true;
                    return false;
                }

                if (!row.editing) this.dataSource.refreshValidator(row);

                return true; // Keep only if sample still have a parent
            })
            .map(r => r.currentData);

        if (hasRemovedSample) this._dataSubject.next({data: data});
    }

    protected sortSamples(data: Sample[], sortBy?: string, sortDirection?: string): Sample[] {
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
            console.debug(`[sub-sample-table] No pmfm found (program=${this.program}, acquisitionLevel=${this._acquisitionLevel}). Please fill program's strategies !`);
        }

        this.loadingPmfms = false;

        this.pmfms.next(pmfms);

        return pmfms;
    }

    getPmfmColumnHeader = getPmfmName;
}

