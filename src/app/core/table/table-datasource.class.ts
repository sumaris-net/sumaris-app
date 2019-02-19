import { TableDataSource, ValidatorService } from "angular4-material-table";
import { Observable } from "rxjs";
import {DataService, LoadResult} from "../../shared/shared.module";
import { EventEmitter } from "@angular/core";
import { Entity } from "../services/model";
import { TableElement } from "angular4-material-table";
import { ErrorCodes } from "../services/errors";
import { AppFormUtils } from "../form/form.utils";
import {first, map} from "rxjs/operators";

export class AppTableDataSource<T extends Entity<T>, F> extends TableDataSource<T> {

  protected _debug = false;
  protected _config: {
    prependNewElements: boolean;
    onNewRow?: (row: TableElement<T>) => Promise<void> | void;
    [key: string]: any;
  };
  protected _creating = false;

  public serviceOptions: any;
  public onLoading = new EventEmitter<boolean>();

  /**
   * Creates a new TableDataSource instance, that can be used as datasource of `@angular/cdk` data-table.
   * @param data Array containing the initial values for the TableDataSource. If not specified, then `dataType` must be specified.
   * @param dataService A service to load and save data
   * @param dataType Type of data contained by the Table. If not specified, then `data` with at least one element must be specified.
   * @param validatorService Service that create instances of the FormGroup used to validate row fields.
   * @param config Additional data for table.
   */
  constructor(dataType: new () => T,
    private dataService: DataService<T, F>,
    validatorService?: ValidatorService,
    config?: {
      prependNewElements: boolean;
      onNewRow?: (row: TableElement<T>) => Promise<void> | void;
      serviceOptions?: {
        saveOnlyDirtyRows?: boolean;
      }
    }) {
    super([], dataType, validatorService, config);
    this.serviceOptions = config && config.serviceOptions;
    this._config = config;

    // Copy data to validator
    this.connect().subscribe(rows => {
      if (this._creating) return;
      if (this._debug) console.debug("[table-datasource] Copying rows currentData -> validator");
      rows.forEach(row => AppFormUtils.copyEntity2Form(row.currentData, row.validator));
    });

    //this._debug = true;
  };

  load(offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: string,
    filter?: F): Observable<LoadResult<T>> {

    this.onLoading.emit(true);
    return this.dataService.loadAll(offset, size, sortBy, sortDirection, filter, this.serviceOptions)
      //.catchError(err => this.handleError(err, 'Unable to load rows'))
      .pipe(
        map(res => {
          this.onLoading.emit(false);
          if (this._debug) console.debug("[table-datasource] Updating datasource...", res);
          this.updateDatasource(res.data);
          return res;
        })
      );
  }

  async save(): Promise<boolean> {

    if (this._debug) console.debug("[table-datasource] Saving rows...");
    this.onLoading.emit(true);

    try {
      // Get all rows
      const rows = await this.getRows();

      // Finish editing all rows, and log row in error
      const invalidRows = rows.filter(row => row.editing && !row.confirmEditCreate());
      if (invalidRows.length) {
        // log errors
        if (this._debug) invalidRows.forEach(this.logRowErrors);
        // Stop with an error
        throw { code: ErrorCodes.TABLE_INVALID_ROW_ERROR, message: 'ERROR.TABLE_INVALID_ROW_ERROR' };
      }

      const saveOnlyDirtyRows = this.serviceOptions && this.serviceOptions.saveOnlyDirtyRows;
      // Get row data
      const data: T[] = rows.map(row => row.currentData);

      // Filter to keep only dirty row
      const dataToSave = saveOnlyDirtyRows ?
        data.filter(t => (t && (t.id === undefined || t.dirty))) : data;

      // If no data to save: exit
      if (saveOnlyDirtyRows && !dataToSave.length) {
        if (this._debug) console.debug("[table-datasource] No row to save");
        return false;
      }

      if (this._debug) console.debug("[table-datasource] Dirty data to save:", dataToSave);

      var savedData = await this.dataService.saveAll(dataToSave, this.serviceOptions);
      if (this._debug) console.debug("[table-datasource] Data saved. Updated data received by service:", savedData);
      if (this._debug) console.debug("[table-datasource] Updating datasource...", data);
      this.updateDatasource(data, { emitEvent: false });
      return true;
    }
    catch (error) {
      if (this._debug) console.error("[table-datasource] Error while saving: " + error && error.message || error);
      throw error;
    }
    finally {
      // Always update the loading indicator
      this.onLoading.emit(false);
    }
  }

  createNew(): void {
    this._creating = true;
    super.createNew();
    const row = this.getRow(-1);

    if (!row) { // Should never occur
      this._creating = false;
      return;
    }
    else if (!this._config || !this._config.onNewRow) {
      AppFormUtils.copyEntity2Form(row.currentData, row.validator);
      this._creating = false;
    }
    else {
      const res = this._config.onNewRow(row);
      // Async way
      if (res instanceof Promise) {
        res.then(() => {
          AppFormUtils.copyEntity2Form(row.currentData, row.validator);
          this._creating = false;
        });
      }

      // Sync way
      else {
        AppFormUtils.copyEntity2Form(row.currentData, row.validator);
        this._creating = false;
      }
    }
  }

  confirmCreate(row: TableElement<T>) {
    if (row.validator.valid && row.validator.dirty) {
      if (this._debug) console.debug("[table-datasource] confirmCreate(): Copying row.validator -> row.currentData...");
      AppFormUtils.copyForm2Entity(row.validator, row.currentData);
      row.currentData.dirty = true;
    }
    return super.confirmCreate(row);
  };

  confirmEdit(row: TableElement<T>) {
    if (row.validator.valid && row.validator.dirty) {
      if (this._debug) console.debug("[table-datasource] confirmEdit(): Copying row.validator -> row.currentData");
      AppFormUtils.copyForm2Entity(row.validator, row.currentData);
      row.currentData.dirty = true;
    }
    return super.confirmEdit(row);
  };

  startEdit(row: TableElement<T>) {
    if (this._debug) console.debug("[table-datasource] Start to edit row", row);
    row.startEdit();
    AppFormUtils.copyEntity2Form(row.currentData, row.validator);
  };

  cancelOrDelete(row: TableElement<T>) {
    if (this._debug) console.debug("[table-datasource] Cancelling or deleting row", row);
    row.cancelOrDelete();

    // If cancel: apply currenData to validtor
    if (row.id != -1) {
      AppFormUtils.copyEntity2Form(row.currentData, row.validator);
    }
  }

  refreshValidator(row: TableElement<T>) {
    AppFormUtils.copyEntity2Form(row.currentData, row.validator);
  }

  public handleError(error: any, message: string): Observable<LoadResult<T>> {
    console.error(error && error.message || error);
    this.onLoading.emit(false);
    return Observable.throw(error && error.message && error || message || error);
  }

  public handleErrorPromise(error: any, message: string) {
    console.error(error && error.message || error);
    this.onLoading.emit(false);
    throw (error && error.message && error || message || error);
  }

  public delete(id: number): void {
    const row = this.getRow(id);
    this.onLoading.emit(true);

    this.dataService.deleteAll([row.currentData], this.serviceOptions)
      .catchError(err => this.handleErrorPromise(err, 'Unable to delete row'))
      .then(() => {
        setTimeout(() => {
          // make sure row has been deleted (because GrapQHl cache remove can failed)
          const present = this.getRow(id) === row;
          if (present) super.delete(id);
          this.onLoading.emit(false);
        }, 300);
      });
  }

  public deleteAll(rows: TableElement<T>[]): Promise<any> {
    this.onLoading.emit(true);

    const data = rows.map(r => r.currentData);
    const rowsById = rows.reduce((res, row) => {
      res[row.id] = row;
      return res;
    }, {});
    const self = this;
    const selfDelete = super.delete;

    return this.dataService.deleteAll(data, this.serviceOptions)
      .catch(err => this.handleErrorPromise(err, 'Unable to delete row'))
      .then(() => {
        // make sure row has been deleted (because GrapQHl cache remove can failed)
        const rowNotDeleted = Object.getOwnPropertyNames(rowsById).reduce((res, id) => {
          const row = rowsById[id];
          const present = self.getRow(+id) === row;
          return present ? res.concat(row) : res;
        }, []).sort((a, b) => a.id > b.id ? -1 : 1);
        rowNotDeleted.forEach(r => selfDelete.call(self, r.id));
        this.onLoading.emit(false);
      });
  }

  /* -- private method -- */

  public getRows(): Promise<TableElement<T>[]> {
    return this.connect().pipe(first()).toPromise();
  }

  private logRowErrors(row: TableElement<T>): void {

    if (!row.validator.hasError) return;

    let errorsMessage = "";
    Object.getOwnPropertyNames(row.validator.controls)
      .forEach(key => {
        let control = row.validator.controls[key];
        if (control.invalid) {
          errorsMessage += "'" + key + "' (" + (control.errors ? Object.getOwnPropertyNames(control.errors) : 'unknown error') + "),";
        }
      });

    if (errorsMessage.length) {
      console.error("[table-datasource] Row (id=" + row.id + ") has errors: " + errorsMessage.slice(0, -1));
    }
  }
}
