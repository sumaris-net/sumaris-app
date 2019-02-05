import {Component, EventEmitter, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {TranslateService} from '@ngx-translate/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {isNil, isNotNil} from '../../shared/shared.module';
import {TableDataSource} from "angular4-material-table";
import {ExtractionColumn, ExtractionResult, ExtractionRow, ExtractionType} from "../services/extraction.model";
import {ExtractionFilter, ExtractionFilterCriterion, ExtractionService} from "../services/extraction.service";
import {FormArray, FormBuilder, FormControl, FormGroup} from "@angular/forms";
import {MatExpansionPanel, MatPaginator, MatSort, MatTable} from "@angular/material";
import {merge} from "rxjs/observable/merge";
import {TableSelectColumnsComponent} from "../../core/table/table-select-columns.component";
import {SETTINGS_DISPLAY_COLUMNS} from "../../core/table/table.class";
import {ModalController} from "@ionic/angular";
import {AccountService} from "../../core/services/account.service";
import {Location} from "@angular/common";


export const DEFAULT_PAGE_SIZE = 50;

@Component({
  selector: 'extract-table',
  templateUrl: './extract-table.component.html',
  styleUrls: ['./extract-table.component.scss']
})
export class ExtractTable implements OnInit {

  data: ExtractionResult;
  extractionType: ExtractionType;
  loading: boolean = true;
  filterForm: FormGroup;
  $extractionTypes: Observable<ExtractionType[]>;
  error: string;
  $title = new Subject<string>();
  columns: string[];
  displayedColumns: string[];
  $columns = new BehaviorSubject<ExtractionColumn[]>(undefined);
  dataSource: TableDataSource<ExtractionRow>;
  onRefresh = new EventEmitter<any>();
  settingsId: string;

  @ViewChild(MatTable) table: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatExpansionPanel) filterExpansionPanel: MatExpansionPanel;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected location: Location,
    protected translate: TranslateService,
    protected accountService: AccountService,
    protected service: ExtractionService,
    protected formBuilder: FormBuilder,
    protected modalCtrl: ModalController
  ) {

    this.displayedColumns = []
    this.dataSource = new TableDataSource<ExtractionRow>([], ExtractionRow);
    this.filterForm = formBuilder.group({
      'extractionType': [null],
      'criteria': formBuilder.array([]),
      'searchText': [null]
    });

    // Load types
    this.$extractionTypes = this.service.loadTypes().first();

    // Listen route parameters
    this.route.params.subscribe(({category, label}) => {
      const extractionType  = {
        category,
        label
      };

      // If not type found in params, redirect to first one
      if (isNil(extractionType.category) || isNil(extractionType.label)) {
        return this.$extractionTypes.first().subscribe(types => {
          // no types
          if (!types || !types.length) {
            console.warn("[extract-table] No extraction types loaded !");
            return;
          }
          const selectedType = types[0];
          return this.router.navigate(['extraction', selectedType.category, selectedType.label], {
            skipLocationChange: false
          });
        })
      }
      else {
        this.$extractionTypes.first().subscribe(types => {
          // Select the exact type object in the filter form
          const selectedType = types.find(type => type.label === extractionType.label && type.category === extractionType.category);

          this.route.queryParams.first().subscribe(({q}) =>  {
            this.filterForm.get('extractionType').setValue(selectedType);
            this.filterForm.get('searchText').setValue(q || null);
            this.addFilterCriterion(); // Add an empty row
          })
        });

        // Load from extraction type
        return this.load(extractionType);
      }
    });

  }

  async ngOnInit() {


    // If the user changes the sort order, reset back to the first page.
    this.sort && this.paginator && this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    merge(
      this.sort && this.sort.sortChange || EventEmitter.empty(),
      this.paginator && this.paginator.page || EventEmitter.empty(),
      this.onRefresh
    )
      .subscribe(() => {
        if (this.loading || isNil(this.extractionType)) return; // avoid multiple load
        return this.load(this.extractionType);
      });
  }

  async load(extractionType?: ExtractionType) {

    this.extractionType = extractionType || this.filterForm.controls['extractionType'].value;

    this.settingsId = this.generateTableId();

    this.loading = true;
    this.error = null;
    console.debug(`[extract-table] Loading ${this.extractionType.category} ${this.extractionType.label}`);

    let data;
    try {
      data = await this.service.loadRows(this.extractionType,
        this.paginator && this.paginator.pageIndex * this.paginator.pageSize,
        this.paginator && this.paginator.pageSize || DEFAULT_PAGE_SIZE,
        this.sort && this.sort.active,
        this.sort && this.sort.direction,
        this.getFilter()
      );

    }
    catch(err) {
      console.error(err);
      this.error = err && err.message || err;
    }

    data && await this.updateView(data)
  }

  async updateView(data: ExtractionResult) {

    this.data = data;

    // Update columns
    this.columns = data.columns
    // Sort by rankOder
      .sort((col1, col2) => col1.rankOrder - col2.rankOrder)
      .map(col => col.name);
    this.displayedColumns = this.columns
      .filter(columnName => columnName != "id"); // Remove id
    this.$columns.next(data.columns);

    // Update rows
    this.dataSource.updateDatasource(data.rows || []);

    // Update title
    await this.updateTitle();

    this.dataSource.connect().first().subscribe(() => this.loading = false);

  }

  public async onExtractionTypeChange(extractionType?: ExtractionType): Promise<any> {
    if (this.loading) return; // skip

    extractionType = extractionType || this.filterForm.controls['extractionType'].value;

    return this.router.navigate([extractionType.category, extractionType.label], {
      relativeTo: this.route.parent.parent,
      queryParams: {
        q: this.filterForm.value.searchText
      }
    });
  }

  public async openSelectColumnsModal(event: any): Promise<any> {
    var columns = this.columns
      .map((name, index) => {
        return {
          name,
          label: this.getI18nColumnName(name),
          visible: this.displayedColumns.indexOf(name) != -1
        }
      });

    const modal = await this.modalCtrl.create({ component: TableSelectColumnsComponent, componentProps: { columns: columns } });

    // On dismiss
    modal.onDidDismiss()
      .then(res => {
        if (!res) return; // CANCELLED

        // Apply columns
        this.displayedColumns = columns && columns.filter(c => c.visible).map(c => c.name) || [];

        // Update user settings
        return this.accountService.savePageSetting(this.settingsId, this.displayedColumns, SETTINGS_DISPLAY_COLUMNS);
      });
    return modal.present();
  }

  public getI18nColumnName(columnName: string): string {
    let key = `EXTRACTION.TABLE.${this.extractionType.category.toUpperCase()}.${columnName.toUpperCase()}`;
    let message = this.translate.instant(key);

    // No I18n translation
    if (message === key) {

      // Try to get common translation
      key = `EXTRACTION.COMMON.${columnName.toUpperCase()}`;
      message = this.translate.instant(key);

      // Or split column name
      if (message === key) {
        // Replace underscore with space
        message = columnName.replace(/[_-]+/g, " ").toUpperCase();
        if (message.length > 1) {
          // First letter as upper case
          message = message.substring(0,1) + message.substring(1).toLowerCase();
        }
      }
    }
    return message;
  }

  public addFilterCriterion(criterion?: ExtractionFilterCriterion): boolean {
    const control = this.filterForm.get('criteria') as FormArray;
    let hasChanged = false;

    let existingCriterionIndex = -1;
    // Search by name on existing criteria
    if (criterion && isNotNil(criterion.name)) {
      existingCriterionIndex = (control.value || []).findIndex(c => c.name === criterion.name);
    }
    // If first criterion has no value: use it
    if (existingCriterionIndex == -1 && control.length){
      let lastCriterion = control.at(control.length - 1 ).value;
      existingCriterionIndex = lastCriterion && isNil(lastCriterion.name) && isNil(lastCriterion.value) ? control.length - 1 : -1;
    }

    // Replace the existing criterion
    if (existingCriterionIndex >= 0) {
      if (criterion && criterion.name) {
        control.at(existingCriterionIndex).setValue({
          name: criterion && criterion.name || null,
          value: criterion && criterion.value || null
        });
        hasChanged = true;
      }
    }
    // Add a new criterion
    else {
      control.push(this.formBuilder.group({
        name: [criterion && criterion.name || null],
        value: [criterion && criterion.value || null]
      }));
      hasChanged = true;
    }
    return hasChanged;
  }

  public removeFilterCriterion(index) {
    const control = this.filterForm.get('criteria') as FormArray;

    // Do not remove if last criterion
    if (control.length == 1) {
      this.clearFilterCriterion(index);
      return;
    }

    control.removeAt(index);
    this.onRefresh.emit();
  }

  public clearFilterCriterion(index): boolean {
    const control = this.filterForm.get('criteria') as FormArray;

    const oldValue = control.at(index).value;
    let needClear = (isNotNil(oldValue.name) || isNotNil(oldValue.value));
    if (!needClear) return false;

    control.at(index).setValue({
      name: null,
      value: null
    });

    this.onRefresh.emit();
    return false;
  }

  public onCellValueClick($event, column: ExtractionColumn, value: string) {
    const hasChanged = this.addFilterCriterion({
      name: column.name,
      value: value
    });
    if (!hasChanged) return;

    if (!this.filterExpansionPanel.expanded) {
      this.filterExpansionPanel.open();
    }

    this.onRefresh.emit();
  }

  public downloadAsFile(extractionType?: ExtractionType) {

    extractionType = extractionType || this.filterForm.controls['extractionType'].value;

    this.service.downloadAsFile(extractionType, this.displayedColumns, this.getFilter());

  }

  /* -- private method -- */

  private async updateTitle() {
    const key = `EXTRACTION.CATEGORY.${this.extractionType.category.toUpperCase()}`;
    let title = await this.translate.get(key).toPromise();
    if (title === key) {
      console.warn("Missing i18n key '" + key + "'");
      this.$title.next("");
    }
    else {
      this.$title.next(title);
    }
  }


  private generateTableId() {
    const id = this.location.path(true).replace(/[?].*$/g, '').replace(/\/[\d]+/g, '_id') + "_" + this.constructor.name;
    return id;
  }

  private getFilter(): any {
    const filter = this.filterForm.value;
    filter.criteria = (filter.criteria || [])
      .filter(criterion => isNotNil(criterion.name) && isNotNil(criterion.value));
    return filter;
  }
}
