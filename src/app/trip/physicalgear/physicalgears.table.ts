import {Component, OnDestroy, OnInit, ViewChild} from "@angular/core";

import {BehaviorSubject, Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {TableElement, ValidatorService} from "angular4-material-table";
import {
  AccountService,
  AppFormUtils,
  AppTable,
  AppTableDataSource,
  RESERVED_START_COLUMNS
} from "../../core/core.module";
import {PhysicalGearValidatorService} from "../services/physicalgear.validator";
import {EntityUtils, PhysicalGear, referentialToString} from "../services/trip.model";
import {ModalController, Platform} from "@ionic/angular";
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from '@angular/common';
import {PhysicalGearForm} from "./physicalgear.form";
import {DataService, LoadResult} from "../../shared/shared.module";


@Component({
  selector: 'table-physical-gears',
  templateUrl: 'physicalgears.table.html',
  styleUrls: ['physicalgears.table.scss'],
  providers: [
    { provide: ValidatorService, useClass: PhysicalGearValidatorService }
  ],
})
export class PhysicalGearTable extends AppTable<PhysicalGear, any> implements OnInit, OnDestroy, DataService<PhysicalGear, any> {

  private data: PhysicalGear[];

  private _dataSubject = new BehaviorSubject<{data: PhysicalGear[]}>({data: []});

  detailMeasurements: Observable<string[]>;

  @ViewChild('gearForm') gearForm: PhysicalGearForm;

  set value(data: PhysicalGear[]) {
    if (this.data !== data) {
      this.data = data;
      this.onRefresh.emit();
    }
  }

  get value(): PhysicalGear[] {
    return this.data;
  }

  get dirty(): boolean {
    return this._dirty || this.gearForm.dirty;
  }
  get invalid(): boolean {
    if (this.editedRow) {
      return this.gearForm.invalid;
    }
    return false;
  }
  get valid(): boolean {
    if (this.editedRow) {
      return this.gearForm.valid;
    }
    return true;
  }

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected platform: Platform,
    protected location: Location,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected validatorService: PhysicalGearValidatorService
  ) {
    super(route, router, platform, location, modalCtrl, accountService,
      RESERVED_START_COLUMNS.concat(['gear', 'comments'])
    );
    this.i18nColumnPrefix = 'TRIP.PHYSICAL_GEAR.LIST.';
    this.autoLoad = false;
    this.setDatasource(new AppTableDataSource<PhysicalGear, any>(PhysicalGear, this, this.validatorService, {
      prependNewElements: false,
      onNewRow: (row) => this.onCreateNewGear(row)
    }));

  };


  ngOnInit() {

    // FOR DEV ONLY ----
    //this.debug = !environment.production;

    super.ngOnInit();

    // Listen detail form, to update the table
    this.gearForm.valueChanges
      .subscribe(value => {
        if (!this.editedRow) return;
        if (this.debug) console.debug("[physicalgears-table] gearForm.valueChanges => update select row", value);
        this.editedRow.currentData = value;
        AppFormUtils.copyEntity2Form(this.editedRow.currentData, this.editedRow.validator);
        this._dirty = true;
      });

    // DEBUG only
    this.detailMeasurements = /*this.debug && of() || */this.gearForm
      .valueChanges
      .pipe(
        map(value => {
          return (value.measurements || [])
            .map(m => {
              let res: string = m.id ? ('id=' + m.id) : 'id=..';
              res += ' | ';
              res += m.pmfmId;
              res += ' | ';
              res += m.numericalValue || m.alphanumericalValue || (m.qualitativeValue && m.qualitativeValue.label) || '';
              return res;
            })
        })
      );
  }


  loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: string,
    filter?: any,
    options?: any
  ): Observable<LoadResult<PhysicalGear>> {
    if (!this.data) return of(); // Not initialized
    sortBy = sortBy != 'id' && sortBy || 'rankOrder'; // Replace 'id' with 'rankOrder'

    const now = Date.now();
    if (this.debug) console.debug("[physicalgears-table] Loading rows..", this.data);

    setTimeout(() => {

      // Fill samples measurement map
      const data = this.data.map(gear => gear.asObject());

      // Sort 
      this.sortGears(data, sortBy, sortDirection);
      if (this.debug) console.debug(`[physicalgears-table] Rows loaded in ${Date.now() - now}ms`, data);

      this._dataSubject.next({data: data});
    });

    return this._dataSubject.asObservable();
  }

  async saveAll(data: PhysicalGear[], options?: any): Promise<PhysicalGear[]> {
    if (!this.data) throw new Error("[physicalgears-table] Could not save table: value not set yet");

    if (this.debug) console.debug("[physicalgears-table] Updating data from rows...");

    if (this.editedRow && this.gearForm.dirty) {
      console.warn("TODO: May need to update selected row from gear form ?");
    }

    this.data = data.map(PhysicalGear.fromObject);

    return this.data;
  }

  deleteAll(dataToRemove: PhysicalGear[], options?: any): Promise<any> {
    this._dirty = true;
    // Noting else to do (make no sense to delete in this.data, will be done in saveAll())
    return Promise.resolve();
  }

  async getMaxRankOrder(): Promise<number> {
    const rows = await this.dataSource.getRows();
    return rows.reduce((res, row) => Math.max(res, row.currentData.rankOrder || 0), 0);
  }

  async onCreateNewGear(row: TableElement<PhysicalGear>): Promise<void> {
    // Set computed values
    row.currentData.rankOrder = (await this.getMaxRankOrder()) + 1;

    this.gearForm.value = row.currentData;
  }

  addRow(event?: any): boolean {
    if (this.debug) console.debug("[table] Asking for new row...");

    // Check gear form
    if (this.editedRow && this.gearForm.invalid || this.loading) {
      return false;
    }

    // Try to finish edited row first
    if (!this.confirmEditCreate()) {
      return false;
    }


    // Add new row
    this.addRowToTable();

    // Selected the new row
    const row = this.dataSource.getRow(-1);
    this.editedRow = row;
    this.gearForm.value = PhysicalGear.fromObject(row.currentData);
    this.gearForm.enable({onlySelf: true, emitEvent: false});

    return true;
  }

  onRowClick(event: MouseEvent, row: TableElement<PhysicalGear>): boolean {
    if (!row.currentData || event.defaultPrevented) return false;

    // Avoid to change select row, if previous is not valid
    if (this.editedRow && (this.editedRow.validator.invalid || this.gearForm.invalid)) {
      event.stopPropagation();
      return false;
    }

    // Avoid to change select row, if same row
    if ((this.editedRow && this.editedRow === row) || this.gearForm.loading) {
      event.stopPropagation();
      return false;
    }

    this.editedRow = row;
    this.gearForm.value = row.currentData;

    if (this.enabled) {
      this.gearForm.enable();
    }

    return true;
  }

  async deleteSelection() {
    await super.deleteSelection();
    this.editedRow = undefined;

    this.gearForm.markAsPristine();
    this.gearForm.markAsUntouched();
  }

  isDetailRow(row: TableElement<PhysicalGear>): boolean {
    return this.editedRow && (this.editedRow == row || this.editedRow.currentData.id == row.currentData.id);
  }

  markAsPristine() {
    super.markAsPristine();
    this.gearForm.markAsPristine();
  }

  markAsUntouched() {
    super.markAsUntouched();
    this.gearForm.markAsUntouched();
  }

  markAsTouched() {
    super.markAsTouched();
    this.gearForm.markAsTouched();
  }

  protected sortGears(data: PhysicalGear[], sortBy?: string, sortDirection?: string): PhysicalGear[] {
    sortBy = (!sortBy || sortBy === 'id') ? 'rankOrder' : sortBy; // Replace id with rankOrder
    const after = (!sortDirection || sortDirection === 'asc') ? 1 : -1;
    return data.sort((a, b) => {
      const valueA = EntityUtils.getPropertyByPath(a, sortBy);
      const valueB = EntityUtils.getPropertyByPath(b, sortBy);
      return valueA === valueB ? 0 : (valueA > valueB ? after : (-1 * after));
    });
  }

  public disable(): void {
    super.disable();
    this.gearForm.disable({onlySelf: true, emitEvent: false});
  }

  public enable(): void {
    super.enable();

    // Propagate only if edited row selected, because autofocus used enable
    if (this.editedRow) {
      this.gearForm.enable({onlySelf: true, emitEvent: false});
    }
  }

  referentialToString = referentialToString;
}


