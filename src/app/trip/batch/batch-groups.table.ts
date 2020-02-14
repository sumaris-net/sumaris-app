import {ChangeDetectionStrategy, Component, Injector} from "@angular/core";
import {TableElement, ValidatorService} from "angular4-material-table";
import {Batch, PmfmStrategy, QualityFlagIds} from "../services/trip.model";
import {BatchGroupValidatorService} from "../services/trip.validators";
import {FormGroup, Validators} from "@angular/forms";
import {BATCH_RESERVED_END_COLUMNS, BATCH_RESERVED_START_COLUMNS, BatchesTable, BatchFilter} from "./batches.table";
import {isNil, isNotEmptyArray, isNotNil, toFloat, toInt} from "../../shared/shared.module";
import {MethodIds} from "../../referential/services/model";
import {InMemoryTableDataService} from "../../shared/services/memory-data-service.class";
import {environment} from "../../../environments/environment";
import {MeasurementFormValues, MeasurementValuesUtils} from "../services/model/measurement.model";
import {ModalController} from "@ionic/angular";
import {BatchUtils, BatchWeight} from "../services/model/batch.model";
import {ColumnItem, TableSelectColumnsComponent} from "../../core/table/table-select-columns.component";
import {RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, SETTINGS_DISPLAY_COLUMNS} from "../../core/table/table.class";
import {isNotNilOrNaN, toNumber} from "../../shared/functions";
import {BatchGroupModal} from "./batch-group.modal";
import {FormFieldDefinition} from "../../shared/form/field.model";

const DEFAULT_USER_COLUMNS = ["weight", "individualCount"];

declare interface ColumnDefinition extends FormFieldDefinition {
  computed: boolean;
  unit?: string;
  rankOrder: number;
  qvIndex: number;
}



@Component({
  selector: 'app-batch-groups-table',
  templateUrl: 'batch-groups.table.html',
  styleUrls: ['batch-groups.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: BatchGroupValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchGroupsTable extends BatchesTable {

  static BASE_DYNAMIC_COLUMNS = [
    // Column on total (weight, nb indiv)
    {
      type: 'double',
      key: 'TOTAL_WEIGHT',
      label: 'TRIP.BATCH.TABLE.TOTAL_WEIGHT',
      minValue: 0,
      maxValue: 10000,
      maximumNumberDecimals: 1
    },
    {
      type: 'double',
      key: 'TOTAL_INDIVIDUAL_COUNT',
      label: 'TRIP.BATCH.TABLE.TOTAL_INDIVIDUAL_COUNT',
      minValue: 0,
      maxValue: 10000,
      maximumNumberDecimals: 2
    },

    // Column on sampling (ratio, nb indiv, weight)
    {
      type: 'integer',
      key: 'SAMPLING_RATIO',
      label: 'TRIP.BATCH.TABLE.SAMPLING_RATIO',
      unit: '%',
      minValue: 0,
      maxValue: 100,
      maximumNumberDecimals: 2
    },
    {
      type: 'double',
      key: 'SAMPLING_WEIGHT',
      label: 'TRIP.BATCH.TABLE.SAMPLING_WEIGHT',
      minValue: 0,
      maxValue: 1000,
      maximumNumberDecimals: 1
    },
    {
      type: 'string',
      key: 'SAMPLING_INDIVIDUAL_COUNT',
      label: 'TRIP.BATCH.TABLE.SAMPLING_INDIVIDUAL_COUNT',
      computed: true
    }
  ];

  protected modalCtrl: ModalController;

  weightMethodForm: FormGroup;
  estimatedWeightPmfm: PmfmStrategy;
  dynamicColumns: ColumnDefinition[];

  disable() {
    super.disable();
    if (this.weightMethodForm) this.weightMethodForm.disable({onlySelf: true, emitEvent: false});
  }

  enable() {
    super.enable();
    if (this.weightMethodForm) this.weightMethodForm.enable({onlySelf: true, emitEvent: false});
  }

  markAsPristine() {
    super.markAsPristine();
    if (this.weightMethodForm) this.weightMethodForm.markAsPristine({onlySelf: true});
  }

  markAsTouched() {
    super.markAsTouched();
    if (this.weightMethodForm) this.weightMethodForm.markAsTouched({onlySelf: true});
  }

  markAsUntouched() {
    super.markAsUntouched();
    if (this.weightMethodForm) this.weightMethodForm.markAsUntouched({onlySelf: true});
  }

  /**
   * Use in ngFor, for trackBy
   * @param index
   * @param columnDef
   */
  trackColumnDef(index: number, column: ColumnDefinition) {
    return column.rankOrder;
  }

  constructor(
    injector: Injector
  ) {
    super(injector,
      injector.get(ValidatorService),
      new InMemoryTableDataService<Batch, BatchFilter>(Batch, {
        onLoad: (data) => this.onLoad(data),
        onSave: (data) => this.onSave(data),
        equals: Batch.equals
      })
    );
    this.modalCtrl = injector.get(ModalController);
    this.inlineEdition = !this.mobile;
    this.allowRowDetail = !this.inlineEdition;

    // Set default values
    // this.showCommentsColumn = false; // Already set in batches-table
    // this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH; // Already set in batches-table


    // -- For DEV only
    this.debug = !environment.production;
  }

  onLoad(data: Batch[]): Batch[] {
    if (isNil(this.qvPmfm) || !this.qvPmfm.qualitativeValues) return data; // Skip (pmfms not loaded)

    if (this.debug) console.debug("[batch-group-table] Preparing data to be loaded as table rows...");

    const pmfms = this._initialPmfms;

    const weightMethodValues = this.qvPmfm.qualitativeValues.reduce((res, qv, qvIndex) => {
      res[qvIndex] = false;
      return res;
    }, {});

    // Transform entities into object array
    data = data.map(batch => {
      const measurementValues = {};

      // For each group (one by qualitative value)
      this.qvPmfm.qualitativeValues.forEach((qv, qvIndex) => {
        const childLabel = `${batch.label}.${qv.label}`;
        const child = (batch.children || []).find(c => c.label === childLabel || c.measurementValues[this.qvPmfm.pmfmId] == qv.id);
        if (child) {

          // Replace measurement values inside a new map, based on fake pmfms
          this.getFakeMeasurementValuesFromQvChild(child, measurementValues, qvIndex);

          // Remember method used for the weight (estimated or not)
          if (!weightMethodValues[qvIndex]) {
            if (child.weight && child.weight.estimated) {
              weightMethodValues[qvIndex] = true;
            }
            else if (child.children && child.children.length === 1) {
              const samplingChild = child.children[0];
              weightMethodValues[qvIndex] = samplingChild.weight && samplingChild.weight.estimated;
            }
          }
        }
        else {
          console.warn("Unable to find child for QV value: " + (qv.label || qv.name));
        }
      });

      // Make entity compatible with reactive form
      batch.measurementValues = measurementValues;
      MeasurementValuesUtils.normalizeEntityToForm(batch, pmfms);

      return batch;
    });

    // Set weight is estimated ?
    if (this.weightMethodForm) {
      this.weightMethodForm.patchValue(weightMethodValues);
    }

    return data;
  }


  async onSave(data: Batch[]): Promise<Batch[]> {
    if (isNil(this.qvPmfm) || !this.qvPmfm.qualitativeValues) return data; // Skip (pmfms not loaded)

    if (this.debug) console.debug("[batch-group-table] Preparing data to be saved...");
    data = data.map(batch => {
      this.prepareEntityToSave(batch);
      return batch;
    });

    return data;
  }

  /* -- protected methods -- */

  protected normalizeEntityToRow(data: Batch, row: TableElement<Batch>) {
    // When batch has the QV value
    if (this.qvPmfm) {
      const measurementValues = Object.assign({}, row.currentData.measurementValues);

      // For each group (one by qualitative value)
      this.qvPmfm.qualitativeValues.forEach((qv, qvIndex) => {
        const childLabel = `${data.label}.${qv.label}`;
        const child = (data.children || []).find(c => c.label === childLabel || c.measurementValues[this.qvPmfm.pmfmId] == qv.id);
        if (child) {

          // Replace measurement values inside a new map, based on fake pmfms
          this.getFakeMeasurementValuesFromQvChild(child, measurementValues, qvIndex);
        }
        else {
          console.warn("Unable to find child for QV value: " + (qv.label || qv.name));
        }
      });
      data.measurementValues = measurementValues;
    }

    // Inherited method
    super.normalizeEntityToRow(data, row);

  }

  protected getFakeMeasurementValuesFromQvChild(data: Batch, measurementValues?: MeasurementFormValues, qvIndex?: number): MeasurementFormValues {
    if (!data) return measurementValues; // skip

    if (isNil(qvIndex)) {
      const qvId = this.qvPmfm && data.measurementValues[this.qvPmfm.pmfmId];
      qvIndex = isNotNil(qvId) && this.qvPmfm.qualitativeValues.findIndex(qv => qv.id === +qvId);
      if (qvIndex === -1) throw Error("Invalid batch: no QV value");
    }

    measurementValues = measurementValues || {};
    let i = qvIndex * 5;

    // Column: total weight
    data.weight = this.getWeight(data.measurementValues) || undefined;
    measurementValues[i++] = data.weight && !data.weight.computed && data.weight.value || null;

    // Column: individual count
    const individualCount = toNumber(data.individualCount, null);
    if (data.qualityFlagId === QualityFlagIds.BAD){
      //console.log('TODO Invalid individual count !', individualCount);
    }
    measurementValues[i++] = individualCount;

    // Sampling batch
    const samplingChild = BatchUtils.getSamplingChild(data);
    if (samplingChild) {
      // Column: sampling ratio
      measurementValues[i++] = isNotNil(samplingChild.samplingRatio) ? samplingChild.samplingRatio * 100 : null;

      // Column: sampling weight
      samplingChild.weight = this.getWeight(samplingChild.measurementValues);
      measurementValues[i++] = samplingChild.weight && !samplingChild.weight.computed && samplingChild.weight.value;

      // Column: sampling individual count
      let samplingIndividualCount: any = toNumber(samplingChild.individualCount, null);
      if (samplingChild.qualityFlagId === QualityFlagIds.BAD) {
        //console.log('TODO Invalid sampling individual count !', samplingIndividualCount);
        //samplingIndividualCount = '~' + samplingIndividualCount;
      }
      measurementValues[i++] = samplingIndividualCount;
    }
    return measurementValues;
  }

  protected prepareEntityToSave(batch: Batch) {
    const groupColumnValues = batch.measurementValues;
    batch.measurementValues = {};

    batch.children = (this.qvPmfm && this.qvPmfm.qualitativeValues || []).reduce((res, qv, qvIndex: number) => {
      let i = qvIndex * 5;
      const weight = toFloat(groupColumnValues[i++], null);
      const individualCount = toInt(groupColumnValues[i++], null);
      const samplingRatio = toInt(groupColumnValues[i++], null);
      const samplingWeight = toFloat(groupColumnValues[i++], null);
      const samplingIndividualCount = toFloat(groupColumnValues[i++], null);

      // TODO: compute total weight and nb indiv ?

      const isEstimatedWeight = this.weightMethodForm && this.weightMethodForm.controls[qvIndex].value || false;
      const weightPmfmId = isEstimatedWeight ? this.estimatedWeightPmfm.pmfmId : this.defaultWeightPmfm.pmfmId;

      const childLabel = `${batch.label}.${qv.label}`;
      const child: Batch = isNotNil(batch.id) && (batch.children || []).find(b => b.label === childLabel) || new Batch();
      child.rankOrder = qvIndex + 1;
      child.measurementValues = {};
      child.measurementValues[this.qvPmfm.pmfmId.toString()] = qv.id.toString();
      child.measurementValues[weightPmfmId.toString()] = isNotNilOrNaN(weight) ? weight : undefined;
      child.individualCount = individualCount;
      child.label = childLabel;

      // If sampling
      if (isNotNil(samplingRatio) || isNotNil(samplingIndividualCount) || isNotNil(samplingWeight)) {
        const samplingLabel = childLabel + Batch.SAMPLE_BATCH_SUFFIX;
        const samplingChild: Batch = isNotNil(child.id) && (child.children || []).find(b => b.label === samplingLabel) || new Batch();
        samplingChild.rankOrder = 1;
        samplingChild.label = samplingLabel;
        samplingChild.samplingRatio = isNotNil(samplingRatio) ? samplingRatio / 100 : undefined;
        samplingChild.samplingRatioText = isNotNil(samplingRatio) ? `${samplingRatio}%` : undefined;
        samplingChild.measurementValues = {};
        samplingChild.measurementValues[weightPmfmId.toString()] = isNotNilOrNaN(samplingWeight) ? samplingWeight : undefined;
        samplingChild.individualCount = samplingIndividualCount;
        child.children = [samplingChild];
      }
      // Remove children
      else {
        child.children = [];
      }

      return res.concat(child);
    }, []);
  }


  isQvEven(column: ColumnDefinition) {
    return (column.qvIndex % 2 === 0);
  }

  isQvOdd(column: ColumnDefinition) {
    return (column.qvIndex % 2 !== 0);
  }

  // Override parent function
  protected mapPmfms(pmfms: PmfmStrategy[]): PmfmStrategy[] {
    if (!pmfms || !pmfms.length) return pmfms; // Skip (no pmfms)

    super.mapPmfms(pmfms); // Will find the qvPmfm

    // Init dynamic columns
    this.computeDynamicColumns(this.qvPmfm);

    // Convert dynamic column to PMFM (to use compatibility with TableMeasurements)
    const fakePmfms = (this.dynamicColumns || []).map(col => PmfmStrategy.fromObject({
      ...col,
      name: col.label,
      id: col.qvIndex,
      pmfmId: col.rankOrder,
      methodId: col.computed && MethodIds.CALCULATED
    }));

    return fakePmfms;
  }

  protected computeDynamicColumns(qvPmfm: PmfmStrategy): ColumnDefinition[] {
    if (this.dynamicColumns) return this.dynamicColumns; // Already init

    const DEFS = BatchGroupsTable.BASE_DYNAMIC_COLUMNS;

    if (isNil(qvPmfm)) {
      // TODO: scientific cruise, etc.
      throw new Error(`[batch-group-table] table not ready without a root qualitative PMFM`);
    }
    else {
      if (this.debug) console.debug('[batch-group-table] First qualitative PMFM found: ' + qvPmfm.label);

      if (isNil(this.defaultWeightPmfm) || this.defaultWeightPmfm.rankOrder < qvPmfm.rankOrder) {
        throw new Error(`[batch-group-table] Unable to construct the table. First qualitative value PMFM must be define BEFORE any weight PMFM (by rankOrder in PMFM strategy - acquisition level ${this.acquisitionLevel})`);
      }

      // If estimated weight is allow, init a form for weight methods
      if (!this.weightMethodForm && this.weightPmfmsByMethod[MethodIds.ESTIMATED_BY_OBSERVER]) {

        // Create the form, for each QV value
        this.weightMethodForm = this.formBuilder.group(qvPmfm.qualitativeValues.reduce((res, qv, index) => {
          res[index] = [false, Validators.required];
          return res;
        }, {}));

        // Listening changes, to mark table as dirty
        this.registerSubscription(
          this.weightMethodForm.valueChanges.subscribe(json =>  this.markAsDirty())
        );
      }

      this.estimatedWeightPmfm = this.weightPmfmsByMethod && this.weightPmfmsByMethod[MethodIds.ESTIMATED_BY_OBSERVER] || this.defaultWeightPmfm;

      this.dynamicColumns = qvPmfm.qualitativeValues.reduce((res, qv, qvIndex) => {
        const offset = qvIndex * DEFS.length;
        const qvColumns = DEFS.map((columnDef, index) => {
          return {
            ...columnDef,
            key: `${qv.label}_${columnDef.key}`,
            qvIndex,
            rankOrder: (offset + index)
          };
        });
        return res.concat(qvColumns);
      }, []);
    }

    return this.dynamicColumns;
  }

  protected getWeight(measurementValues: { [key: string]: any }): BatchWeight | undefined {
    // Use try default method
    let value = measurementValues[this.defaultWeightPmfm.pmfmId];
    if (isNotNil(value)) {
      return {
        value: value,
        estimated: false,
        computed: false,
        methodId: this.defaultWeightPmfm.methodId
      };
    }
    if (!this.weightPmfmsByMethod) return undefined;

    // Else, try to get estimated
    let weightPmfm = this.weightPmfmsByMethod[MethodIds.ESTIMATED_BY_OBSERVER];
    value = weightPmfm && measurementValues[weightPmfm.pmfmId];
    if (isNotNil(value)) {
      return {
        value: value,
        estimated: true,
        computed: false,
        methodId: MethodIds.ESTIMATED_BY_OBSERVER
      };
    }

    // Else, try to get calculated
    weightPmfm = this.weightPmfmsByMethod[MethodIds.CALCULATED];
    value = weightPmfm && measurementValues[weightPmfm.pmfmId];
    if (isNotNil(value)) {
      return {
        value: value,
        estimated: false,
        computed: true,
        methodId: MethodIds.CALCULATED
      };
    }

    return undefined;
  }

  protected getUserColumns(userColumns?: string[]): string[] {
    userColumns = userColumns || this.settings.getPageSettings(this.settingsId, SETTINGS_DISPLAY_COLUMNS);

    // Exclude OLD user columns (fix issue on v0.16.2)
    userColumns = userColumns && userColumns.filter(c => c === 'weight' || c === 'individualCount');

    return isNotEmptyArray(userColumns) && userColumns.length === 2 ? userColumns :
      // If not user column override (or if bad format), then use defaults
      DEFAULT_USER_COLUMNS.slice(0);
  }

  protected updateColumns() {
    if (!this.dynamicColumns) return; // skip
    this.displayedColumns = this.getDisplayColumns();
    if (!this.loading) this.markForCheck();
  }

  protected getDisplayColumns(): string[] {
    if (!this.dynamicColumns) return this.columns;

    const userColumns = this.getUserColumns();

    const weightIndex = userColumns.findIndex(c => c === 'weight');
    let individualCountIndex = userColumns.findIndex(c => c === 'individualCount');
    individualCountIndex = (individualCountIndex !== -1 && weightIndex === -1 ? 0 : individualCountIndex);
    const inverseOrder = individualCountIndex < weightIndex;

    const dynamicColumnKeys = (this.dynamicColumns || [])
      .map(c => {
        return {
          key: c.key,
          rankOrder: c.rankOrder + (inverseOrder &&
            ((c.key.endsWith('_WEIGHT') && 1) || (c.key.endsWith('_INDIVIDUAL_COUNT') && -1)) || 0)
        };
      })
      .sort((c1, c2) => c1.rankOrder - c2.rankOrder)
      .map(c => c.key);

    return RESERVED_START_COLUMNS
      .concat(BATCH_RESERVED_START_COLUMNS)
      .concat(dynamicColumnKeys)
      .concat(BATCH_RESERVED_END_COLUMNS)
      .concat(RESERVED_END_COLUMNS)
      .filter(name => !this.excludesColumns.includes(name));
  }

  async openDetailModal(batch?: Batch, opts?: { isNew?: boolean; }): Promise<Batch | undefined> {
    const modal = await this.modalCtrl.create({
      component: BatchGroupModal,
      componentProps: {
        program: this.program,
        acquisitionLevel: this.acquisitionLevel,
        value: batch,
        isNew: opts && opts.isNew || false,
        disabled: this.disabled,
        qvPmfm: this.qvPmfm,
        showTaxonGroup: this.showTaxonGroupColumn,
        showTaxonName: this.showTaxonNameColumn,
        // Not need on a root species batch (fill in sub-batches)
        showTotalIndividualCount: false,
        showIndividualCount: false,
        showSubBatchesCallback: (res) => {
          if (!res) return;
          setTimeout(() => {
            if (this.editedRow) this.onSubBatchesClick(null, this.editedRow);
          });
        }
      },
      keyboardClose: true,
      cssClass: 'app-batch-group-modal'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();
    if (data && this.debug) console.debug("[batches-table] Batch modal result: ", data);
    return (data instanceof Batch) ? data : undefined;
  }

  async openSelectColumnsModal() {

    let userColumns = this.getUserColumns();
    const hiddenColumns = DEFAULT_USER_COLUMNS.slice(0)
      .filter(name => userColumns.indexOf(name) === -1);
    let columns = (userColumns || [])
      .concat(hiddenColumns)
      .map(name => {
        const label = (name === 'individualCount') ? 'TRIP.BATCH.TABLE.INDIVIDUAL_COUNT' :
          ((name === 'weight') ? 'TRIP.BATCH.TABLE.WEIGHT' : '');
        return {
          name,
          label,
          visible: userColumns.indexOf(name) !== -1
        } as ColumnItem;
      });

    const modal = await this.modalCtrl.create({
      component: TableSelectColumnsComponent,
      componentProps: {
        columns: columns,
        canHideColumns: false
      }
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const res = await modal.onDidDismiss();
    if (!res || !res.data) return; // CANCELLED
    columns = res.data as ColumnItem[];

    // Update columns
    userColumns = columns.filter(c => c.visible).map(c => c.name) || [];

    // Update user settings
    await this.settings.savePageSetting(this.settingsId, userColumns, SETTINGS_DISPLAY_COLUMNS);

    this.updateColumns();
  }

}

