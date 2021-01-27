import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output, ViewChild
} from "@angular/core";
import {TableElement, ValidatorService} from "@e-is/ngx-material-table";
import {
  environment,
  IReferentialRef,
  isNil,
  ReferentialRef,
  referentialToString, RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS, TableSelectColumnsComponent
} from "../../core/core.module";
import {SampleValidatorService} from "../services/validator/sample.validator";
import {isNilOrBlank, isNotNil} from "../../shared/functions";
import {UsageMode} from "../../core/services/model/settings.model";
import * as moment from "moment";
import {Moment} from "moment";
import {AppMeasurementsTable} from "../measurement/measurements.table.class";
import {InMemoryEntitiesService} from "../../shared/services/memory-entity-service.class";
import {SampleModal} from "./sample.modal";
import {FormGroup} from "@angular/forms";
import {TaxonNameRef} from "../../referential/services/model/taxon.model";
import {Sample} from "../services/model/sample.model";
import {getPmfmName, PmfmStrategy} from "../../referential/services/model/pmfm-strategy.model";
import {AcquisitionLevelCodes, ParameterLabelStrategies} from "../../referential/services/model/model.enum";
import {ReferentialRefService} from "../../referential/services/referential-ref.service";
import {TaxonNameStrategy} from "../../referential/services/model/strategy.model";
import {BehaviorSubject} from "rxjs";
import {FormFieldDefinition, FormFieldType} from "../../shared/form/field.model";
import {SETTINGS_DISPLAY_COLUMNS} from "../../core/table/table.class";

export interface SampleFilter {
  operationId?: number;
  landingId?: number;
}
export const SAMPLE2_RESERVED_START_COLUMNS: string[] = ['sampleCode','morseCode','comment'/*,'weight','totalLenghtCm','totalLenghtMm','indexGreaseRate'*/];
export const SAMPLE2_RESERVED_END_COLUMNS: string[] = [];

declare interface ColumnDefinition extends FormFieldDefinition {
  computed: boolean;
  unitLabel?: string;
  rankOrder: number;
  qvIndex: number;
}


@Component({
  selector: 'app-samples2-table',
  templateUrl: 'samples2.table.html',
  styleUrls: ['samples2.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: SampleValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Samples2Table extends AppMeasurementsTable<Sample, SampleFilter>
  implements OnInit, OnDestroy {

  protected cd: ChangeDetectorRef;
  protected referentialRefService: ReferentialRefService;
  protected memoryDataService: InMemoryEntitiesService<Sample, SampleFilter>;

  public appliedPmfmStrategies : PmfmStrategy []=[];

  @Input() defaultSampleDate: Moment;
  @Input() defaultTaxonGroup: ReferentialRef;
  @Input() _defaultTaxonNameFromStrategy: TaxonNameStrategy;

  @Input()
  set defaultTaxonNameFromStrategy(value: TaxonNameStrategy) {
    if (this._defaultTaxonNameFromStrategy !== value && isNotNil(value)) {
      this._defaultTaxonNameFromStrategy = value;
    }
  }

  @Input()
  set value(data: Sample[]) {
    this.memoryDataService.value = data;
    /*let samplesWithDefinedTaxonOnly = data.filter(sample => sample.taxonName);
    if (samplesWithDefinedTaxonOnly && samplesWithDefinedTaxonOnly[0])
    {
     // this.defaultTaxonName = data[0].taxonName;
    }*/
  }

  @Input()
  set appliedPmfmStrategy(data: PmfmStrategy[]) {
    this.appliedPmfmStrategies = data;
  }

  get value(): Sample[] {
    return this.memoryDataService.value;
  }

  get $dynamicPmfms(): BehaviorSubject<PmfmStrategy[]> {
    return this.measurementsDataService.$pmfms;
  }
  dynamicColumns: ColumnDefinition[];

  @Input() usageMode: UsageMode;
  @Input() showLabelColumn = false;
  // @Input() showCommentsColumn = true;
  // @Input() showDateTimeColumn = true;
  @Input() showFabButton = false;
  /*
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
    }*/

  /*get showTaxonNameColumn(): boolean {
    return this.getShowColumn('taxonName');
  }*/




  @Output() onInitForm = new EventEmitter<{form: FormGroup, pmfms: PmfmStrategy[]}>();



  constructor(
    injector: Injector
  ) {
    super(injector,
      Sample,
      new InMemoryEntitiesService<Sample, SampleFilter>(Sample, {
        equals: Sample.equals
      }),
      injector.get(ValidatorService),
      {
        prependNewElements: false,
        suppressErrors: environment.production,
        reservedStartColumns: SAMPLE2_RESERVED_START_COLUMNS,
        reservedEndColumns: SAMPLE2_RESERVED_END_COLUMNS
      }
    );
    this.cd = injector.get(ChangeDetectorRef);
    this.referentialRefService = injector.get(ReferentialRefService);
    this.memoryDataService = (this.dataService as InMemoryEntitiesService<Sample, SampleFilter>);
    this.i18nColumnPrefix = 'TRIP.SAMPLE2.TABLE.';
    this.inlineEdition = !this.mobile;

    // Set default value
    this.acquisitionLevel = AcquisitionLevelCodes.SAMPLE; // Default value, can be override by subclasses

    //this.debug = false;
    this.debug = !environment.production;

    // If init form callback exists, apply it when start row edition
    if (this.onInitForm) {
      this.registerSubscription(
        this.onStartEditingRow.subscribe(row => this.onInitForm.emit({
          form: row.validator,
          pmfms: this.$pmfms.getValue()
        })));
    }
  }

  ngOnInit() {
    super.ngOnInit();

    this.setShowColumn('label', this.showLabelColumn);
    // this.setShowColumn('sampleDate', this.showDateTimeColumn);
    //  this.setShowColumn('comments', this.showCommentsColumn);

    // Taxon group combo
    /* this.registerAutocompleteField('taxonGroup', {
       suggestFn: (value: any, options?: any) => this.suggestTaxonGroups(value, options)
     });*/

    // Taxon name combo
    /*this.registerAutocompleteField('taxonName', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonNames(value, options),
      showAllOnFocus: this.showTaxonGroupColumn /*show all, because limited to taxon group*/
    //  });
  }



  /**
   * Use in ngFor, for trackBy
   * @param index
   * @param column
   */
  trackColumnDef(index: number, column: ColumnDefinition) {
    return column.rankOrder;
  }

  isQvEven(column: ColumnDefinition) {
    return (column.qvIndex % 2 === 0);
  }

  isQvOdd(column: ColumnDefinition) {
    return (column.qvIndex % 2 !== 0);
  }

  getFlexSize(columns :ColumnDefinition[], column: ColumnDefinition) {
    let columnSize = 0;
    let columnDisplayLabel = false;
    columns.forEach(colIter =>
    {
      if (colIter.defaultValue ===column.defaultValue)
      {
        columnSize = columnSize + 1;
        if ((columnSize == 1) && colIter === column)
        {
          columnDisplayLabel = true;
        }
      }
    })
    if (columnDisplayLabel)
    {
      return columnSize;
    }
    return 0;
  }

  protected getDisplayColumns(): string[] {

    const pmfms = this.$pmfms.getValue();
    if (!pmfms) return this.columns;

    const userColumns = this.getUserColumns();

    let dynamicColumnNames = [];
    let dynamicWeightColumnNames = [];
    let dynamicSizeColumnNames = [];
    let dynamicMaturityColumnNames = [];
    let dynamicSexColumnNames = [];
    let dynamicAgeColumnNames = [];
    let dynamicOthersColumnNames = [];

    // FIXME CLT WIP
    // filtrer sur les pmfms pour les mettres dans les différents tableaux
    (pmfms || []).map(pmfmStrategy => {
      let pmfm = pmfmStrategy.pmfm;
      if (pmfm)
      {
        if (pmfm.parameter && pmfm.parameter.label)
        {
          let label = pmfm.parameter.label;
          if (label === ParameterLabelStrategies.AGE)
          {
            dynamicAgeColumnNames.push(pmfmStrategy.pmfmId.toString());
          }
          else if (label === ParameterLabelStrategies.SEX)
          {
            dynamicSexColumnNames.push(pmfmStrategy.pmfmId.toString());
          }
          else if (ParameterLabelStrategies.WEIGHTS.includes(label))
          {
            dynamicWeightColumnNames.push(pmfmStrategy.pmfmId.toString());
          }
          else if (ParameterLabelStrategies.LENGTHS.includes(label))
          {
            dynamicSizeColumnNames.push(pmfmStrategy.pmfmId.toString());
          }
          else if (ParameterLabelStrategies.MATURITIES.includes(label))
          {
            dynamicMaturityColumnNames.push(pmfmStrategy.pmfmId.toString());
          }
          else
          {
            // Filter on type. Fractions pmfm doesn't provide type.
            if (pmfmStrategy.type)
            {
              dynamicOthersColumnNames.push(pmfmStrategy.pmfmId.toString());
            }
          }
        }
        else {
          // Display pmfm without parameter label like fractions ?
        }

      }
    });

    const pmfmColumnNames = pmfms
      //.filter(p => p.isMandatory || !userColumns || userColumns.includes(p.pmfmId.toString()))
      .map(p => p.pmfmId.toString());

    const startColumns = (this.options && this.options.reservedStartColumns || []).filter(c => !userColumns || userColumns.includes(c));
    const endColumns = (this.options && this.options.reservedEndColumns || []).filter(c => !userColumns || userColumns.includes(c));

    this.dynamicColumns = [];
    let idx = 1;
    let rankOrderIdx = 1;
    dynamicWeightColumnNames.forEach(pmfmColumnName => {
      let col = <ColumnDefinition>{
      key: pmfmColumnName,
      label: 'PROGRAM.STRATEGY.WEIGHT_TABLE',
      defaultValue: "WEIGHT",
      type: 'string',
      computed : false,
      qvIndex : idx,
      rankOrder : rankOrderIdx,
      disabled : false
    };
        dynamicColumnNames.push(pmfmColumnName);
        this.dynamicColumns.push(col);
    });
    if (dynamicWeightColumnNames && dynamicWeightColumnNames.length)
    {
      idx = idx +1;
    }
    dynamicSizeColumnNames.forEach(pmfmColumnName => {
      let col = <ColumnDefinition>{
        key: pmfmColumnName,
        label: 'PROGRAM.STRATEGY.SIZE_TABLE',
        defaultValue: "SIZE",
        type: 'string',
        computed : false,
        qvIndex : idx,
        rankOrder : rankOrderIdx,
        disabled : false
      };
      rankOrderIdx = rankOrderIdx +1;
      dynamicColumnNames.push(pmfmColumnName);
      this.dynamicColumns.push(col);
    });
    if (dynamicSizeColumnNames && dynamicSizeColumnNames.length)
    {
      idx = idx +1;
    }
    dynamicMaturityColumnNames.forEach(pmfmColumnName => {
      let col = <ColumnDefinition>{
        key: pmfmColumnName,
        label: 'PROGRAM.STRATEGY.MATURITY_TABLE',
        defaultValue: "MATURITY",
        type: 'string',
        computed : false,
        qvIndex : idx,
        rankOrder : rankOrderIdx,
        disabled : false
      };
      rankOrderIdx = rankOrderIdx +1;
      dynamicColumnNames.push(pmfmColumnName);
      this.dynamicColumns.push(col);
    });
    if (dynamicMaturityColumnNames && dynamicMaturityColumnNames.length)
    {
      idx = idx +1;
    }
    dynamicSexColumnNames.forEach(pmfmColumnName => {
      let col = <ColumnDefinition>{
        key: pmfmColumnName,
        label: 'PROGRAM.STRATEGY.SEX',
        defaultValue: "SEX",
        type: 'string',
        computed : false,
        qvIndex : idx,
        rankOrder : rankOrderIdx,
        disabled : false
      };
      rankOrderIdx = rankOrderIdx +1;
      dynamicColumnNames.push(pmfmColumnName);
      this.dynamicColumns.push(col);
    });
    if (dynamicSexColumnNames && dynamicSexColumnNames.length)
    {
      idx = idx +1;
    }
    dynamicAgeColumnNames.forEach(pmfmColumnName => {
      let col = <ColumnDefinition>{
        key: pmfmColumnName,
        label: 'PROGRAM.STRATEGY.AGE',
        defaultValue: "AGE",
        type: 'string',
        computed : false,
        qvIndex : idx,
        rankOrder : rankOrderIdx,
        disabled : false
      };
      rankOrderIdx = rankOrderIdx +1;
      dynamicColumnNames.push(pmfmColumnName);
      this.dynamicColumns.push(col);
    });
    if (dynamicAgeColumnNames && dynamicAgeColumnNames.length)
    {
      idx = idx +1;
    }
    dynamicOthersColumnNames.forEach(pmfmColumnName => {
      let col = <ColumnDefinition>{
        key: pmfmColumnName,
        label: 'PROGRAM.STRATEGY.OTHER_TABLE',
        defaultValue: "OTHER",
        type: 'string',
        computed : false,
        qvIndex : idx,
        rankOrder : rankOrderIdx,
        disabled : false
      };
      rankOrderIdx = rankOrderIdx +1;
      dynamicColumnNames.push(pmfmColumnName);
      this.dynamicColumns.push(col);
    });

    return RESERVED_START_COLUMNS
      .concat(startColumns)
      .concat(dynamicColumnNames)
      .concat(endColumns)
      .concat(RESERVED_END_COLUMNS)
      // Remove columns to hide
      .filter(column => !this.excludesColumns.includes(column));
  }

  async getMaxRankOrder(): Promise<number> {
    return super.getMaxRankOrder();
  }

  /* -- protected methods -- */

  /*protected async suggestTaxonGroups(value: any, options?: any): Promise<IReferentialRef[]> {
    //if (isNilOrBlank(value)) return [];
    return this.programService.suggestTaxonGroups(value,
      {
        program: this.program,
        searchAttribute: options && options.searchAttribute
      });
  }*/

  /*protected async suggestTaxonNames(value: any, options?: any): Promise<IReferentialRef[]> {
    const taxonGroup = this.editedRow && this.editedRow.validator.get('taxonGroup').value;

    // IF taxonGroup column exists: taxon group must be filled first
    if (this.showTaxonGroupColumn && isNilOrBlank(value) && isNil(taxonGroup)) return [];

    return this.programService.suggestTaxonNames(value,
      {
        program: this.program,
        searchAttribute: options && options.searchAttribute,
        taxonGroupId: taxonGroup && taxonGroup.id || undefined
      });
  }*/

  protected async onNewEntity(data: Sample): Promise<void> {
    console.debug("[sample-table] Initializing new row data...");

    await super.onNewEntity(data);

    // Default date
    if (isNotNil(this.defaultSampleDate)) {
      data.sampleDate = this.defaultSampleDate;
    } else if (this.settings.isOnFieldMode(this.usageMode)) {
      data.sampleDate = moment();
    }

    // set  taxonName, taxonGroup
    if (isNotNil(this._defaultTaxonNameFromStrategy.taxonName)) {
      data.taxonName = TaxonNameRef.fromObject(this._defaultTaxonNameFromStrategy.taxonName);

      let taxonGroup = await  this.getTaxoGroupByTaxonNameId(this._defaultTaxonNameFromStrategy.taxonName.id,  "TaxonGroup");
      data.taxonGroup = TaxonNameRef.fromObject(taxonGroup[0]);
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

  protected async openRow(id: number, row: TableElement<Sample>): Promise<boolean> {
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
      await this.updateEntityToTable(updatedData, row);
    }
    else {
      this.editedRow = null;
    }
    return true;
  }

  async openDetailModal(sample?: Sample): Promise<Sample | undefined> {
    const isNew = !sample && true;
    if (isNew) {
      sample = new Sample();
      await this.onNewEntity(sample);
    }

    this.markAsLoading();

    const modal = await this.modalCtrl.create({
      component: SampleModal,
      componentProps: {
        program: this.program,
        acquisitionLevel: this.acquisitionLevel,
        disabled: this.disabled,
        value: sample,
        isNew,
        showLabel: this.showLabelColumn,
        //  showTaxonGroup: this.showTaxonGroupColumn,
        //   showTaxonName: this.showTaxonNameColumn,
        onReady: (obj) => this.onInitForm && this.onInitForm.emit({form: obj.form.form, pmfms: obj.$pmfms.getValue()})
      },
      keyboardClose: true
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();
    if (data && this.debug) console.debug("[samples-table] Modal result: ", data);
    this.markAsLoaded();

    // Exit if empty
    if (!(data instanceof Sample)) {
      return undefined;
    }

    return data;
  }


  /* -- protected methods -- */

  protected prepareEntityToSave(sample: Sample) {
    // Override by subclasses
  }

  referentialToString = referentialToString;
  getPmfmColumnHeader = getPmfmName;

  public markForCheck() {
    this.cd.markForCheck();
  }


  /**
   * getTaxonGroup
   * @param id
   * @param entityName
   * @protected
   */
  protected async getTaxoGroupByTaxonNameId(id : any, entityName : string){
    const res = await this.referentialRefService.loadAll(0, 100, null,null,
      {
        entityName: entityName,
        id : id
      },
      {
        withTotal: false
      });
    return res.data;

  }


  async openAddPmfmsModal(event?: UIEvent): Promise<any> {
    const fixedColumns = this.columns.slice(0, RESERVED_START_COLUMNS.length);
    const hiddenColumns = this.columns.slice(fixedColumns.length)
      .filter(name => this.displayedColumns.indexOf(name) == -1);
    const columns = this.displayedColumns.slice(fixedColumns.length)
      .concat(hiddenColumns)
      .filter(name => name !== "actions")
      .filter(name => !this.excludesColumns.includes(name))
      .map(name => {
        return {
          name,
          label: this.getI18nColumnName(name),
          visible: this.displayedColumns.indexOf(name) !== -1
        };
      });

    const modal = await this.modalCtrl.create({
      component: TableSelectColumnsComponent,
      componentProps: {columns: columns}
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const res = await modal.onDidDismiss();
    if (!res) return; // CANCELLED

    // Apply columns
    const userColumns = columns && columns.filter(c => c.visible).map(c => c.name) || [];
    this.displayedColumns = RESERVED_START_COLUMNS.concat(userColumns).concat(RESERVED_END_COLUMNS);
    this.markForCheck();

    // Update user settings
    await this.settings.savePageSetting(this.settingsId, userColumns, SETTINGS_DISPLAY_COLUMNS);
  }

  async openChangePmfmsModal(event?: UIEvent): Promise<any> {
    const fixedColumns = this.columns.slice(0, RESERVED_START_COLUMNS.length);
    const hiddenColumns = this.columns.slice(fixedColumns.length)
      .filter(name => this.displayedColumns.indexOf(name) == -1);
    const columns = this.displayedColumns.slice(fixedColumns.length)
      .concat(hiddenColumns)
      .filter(name => name !== "actions")
      .filter(name => !this.excludesColumns.includes(name))
      .map(name => {
        return {
          name,
          label: this.getI18nColumnName(name),
          visible: this.displayedColumns.indexOf(name) !== -1
        };
      });

    const modal = await this.modalCtrl.create({
      component: TableSelectColumnsComponent,
      componentProps: {columns: columns}
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const res = await modal.onDidDismiss();
    if (!res) return; // CANCELLED

    // Apply columns
    const userColumns = columns && columns.filter(c => c.visible).map(c => c.name) || [];
    this.displayedColumns = RESERVED_START_COLUMNS.concat(userColumns).concat(RESERVED_END_COLUMNS);
    this.markForCheck();

    // Update user settings
    await this.settings.savePageSetting(this.settingsId, userColumns, SETTINGS_DISPLAY_COLUMNS);
  }
}
