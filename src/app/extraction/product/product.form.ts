import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { ExtractionColumn, ExtractionFilterCriterion } from '../type/extraction-type.model';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { ReferentialForm } from '../../referential/form/referential.form';
import { BehaviorSubject } from 'rxjs';
import { AppForm, AppFormArray, arraySize, EntityUtils, FormArrayHelper, isNil, isNotNilOrBlank, LocalSettingsService, StatusIds } from '@sumaris-net/ngx-components';
import { debounceTime } from 'rxjs/operators';
import { ExtractionUtils } from '../common/extraction.utils';
import { ExtractionCriteriaForm } from '@app/extraction/criteria/extraction-criteria.form';
import { ExtractionProductValidatorService } from '@app/extraction/product/product.validator';
import { ProductService } from '@app/extraction/product/product.service';
import { ExtractionProduct, ProcessingFrequencyIds, ProcessingFrequencyItems } from '@app/extraction/product/product.model';
import { AggregationStrata } from '@app/extraction/strata/strata.model';
import { splitById } from '@sumaris-net/ngx-components';

declare interface ColumnMap {
  [sheetName: string]: ExtractionColumn[];
}

@Component({
  selector: 'app-product-form',
  styleUrls: ['product.form.scss'],
  templateUrl: 'product.form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductForm extends AppForm<ExtractionProduct> implements OnInit {

  data: ExtractionProduct;
  frequencyItems = ProcessingFrequencyItems;
  frequenciesById = splitById(ProcessingFrequencyItems);

  $sheetNames = new BehaviorSubject<String[]>(undefined);
  $timeColumns = new BehaviorSubject<ColumnMap>(undefined);
  $spatialColumns = new BehaviorSubject<ColumnMap>(undefined);
  $aggColumns = new BehaviorSubject<ColumnMap>(undefined);
  $techColumns = new BehaviorSubject<ColumnMap>(undefined);
  aggFunctions = [
    {
      value: 'SUM',
      name: 'EXTRACTION.AGGREGATION.EDIT.AGG_FUNCTION.SUM'
    },
    {
      value: 'AVG',
      name: 'EXTRACTION.AGGREGATION.EDIT.AGG_FUNCTION.AVG'
    }
  ];

  stratumFormArray: AppFormArray<AggregationStrata, UntypedFormGroup>;

  showMarkdownPreview = true;
  $markdownContent = new BehaviorSubject<string>(undefined);

  @Input() showError = true;
  @Input() showFilter = false;

  @ViewChild('referentialForm', {static: true}) referentialForm: ReferentialForm;
  @ViewChild('criteriaForm', {static: true}) criteriaForm: ExtractionCriteriaForm;

  get value(): any {
    const json = this.form.value;

    // Re add label, because missing when field disable
    json.label = this.form.get('label').value;

    return json;
  }

  set value(value: any) {
    this.setValue(value);
  }

  get strataForms(): UntypedFormGroup[] {
    return this.stratumFormArray.controls as UntypedFormGroup[];
  }

  get isSpatial(): boolean {
    return this.form.controls.isSpatial.value;
  }

  get processingFrequencyId(): number {
    return this.form.controls.processingFrequencyId.value;
  }

  get isManualProcessing(): boolean {
    return this.processingFrequencyId === ProcessingFrequencyIds.MANUALLY;
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.enable(opts);
    if (!this.isSpatial) {
      this.stratumFormArray.disable();
    }
  }

  constructor(injector: Injector,
              protected formBuilder: UntypedFormBuilder,
              protected settings: LocalSettingsService,
              protected validatorService: ExtractionProductValidatorService,
              protected service: ProductService,
              protected cd: ChangeDetectorRef) {
    super(injector,
      validatorService.getFormGroup());

    // Stratum
    this.stratumFormArray = this.form.controls.stratum as AppFormArray<AggregationStrata, UntypedFormGroup>;

    this.registerSubscription(
      this.form.get('documentation').valueChanges
        .pipe(
          debounceTime(350)
        )
        .subscribe(md => this.$markdownContent.next(md))
      );
  }

  async updateLists(type?: ExtractionProduct) {
    if (type) {
      this.data = type;
    }
    else if (this.data) {
      type = this.data;
    }
    else {
      return; // Skip
    }

    console.debug('[aggregation-form] Loading columns of type', type);

    // If spatial, load columns
    if (type.isSpatial || this.isSpatial) {

      const sheetNames = type.sheetNames || [];
      this.$sheetNames.next(sheetNames);

      const map: {[key: string]: ColumnMap} = {};
      await Promise.all(sheetNames.map(sheetName => {
        return this.service.loadColumns(type, sheetName)
          .then(columns => {
            columns = columns || [];
            const columnMap = ExtractionUtils.dispatchColumns(columns);
            Object.keys(columnMap).forEach(key => {
              const m: ColumnMap = map[key] ||  <ColumnMap>{};
              m[sheetName] = columnMap[key];
              map[key] = m;
            });
          });
      }));

      console.debug('[aggregation-type] Columns map:', map);
      this.$timeColumns.next(map.timeColumns);
      this.$spatialColumns.next(map.spatialColumns);
      this.$aggColumns.next(map.aggColumns);
      this.$techColumns.next(map.techColumns);
    }
  }

  ngOnInit(): void {
    super.ngOnInit();

    // Set entity name (required for referential form validator)
    this.referentialForm.entityName = 'AggregationType';

    // Override status list i18n
    this.referentialForm.statusList = [
      {
        id: StatusIds.ENABLE,
        icon: 'eye',
        label: 'EXTRACTION.AGGREGATION.EDIT.STATUS_ENUM.PUBLIC'
      },
      {
        id: StatusIds.TEMPORARY,
        icon: 'eye-off',
        label: 'EXTRACTION.AGGREGATION.EDIT.STATUS_ENUM.PRIVATE'
      },
      {
        id: StatusIds.DISABLE,
        icon: 'close',
        label: 'EXTRACTION.AGGREGATION.EDIT.STATUS_ENUM.DISABLE'
      }
    ];

    this.registerSubscription(
      this.form.get('isSpatial').valueChanges
        .subscribe(isSpatial => {
           // Not need stratum
           if (!isSpatial) {
             this.stratumFormArray.resize(0);
             this.stratumFormArray.allowEmptyArray = true;
             this.stratumFormArray.disable();
           }
           else {
             if (this.stratumFormArray.length === 0) {
               this.stratumFormArray.resize(1);
             }
             this.stratumFormArray.allowEmptyArray = false;
             this.stratumFormArray.enable();
             this.updateLists();
           }
        })
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.$sheetNames.complete();
    this.$timeColumns.complete();
    this.$spatialColumns.complete();
    this.$aggColumns.complete();
    this.$techColumns.complete();
  }

  toggleDocPreview() {
    this.showMarkdownPreview = !this.showMarkdownPreview;
    if (this.showMarkdownPreview) {
      this.markForCheck();
    }
  }

  reset(data?: ExtractionProduct, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    super.setValue(data || new ExtractionProduct(), opts);
  }

  async setValue(data: ExtractionProduct, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {

    await this.ready();

    console.debug('[product-form] Setting value: ', data);

    // Set filter to criteria form
    this.criteriaForm.type = data;
    if (/*!this.criteriaForm.sheetName && */data.sheetNames?.length) {
      this.criteriaForm.sheetName = data.sheetNames[0];
    }
    if (data.filter) {
      const filter = (typeof data.filter === 'string') ? JSON.parse(data.filter) : data.filter;
      const criteria = (filter?.criteria || []).map(ExtractionFilterCriterion.fromObject);
      // TODO find a way to get columns, from source extraction type
      /*this.criteriaForm.columns = [<ExtractionColumn>{
        columnName: "trip_code", type: 'integer', label: 'trip_code', name: 'trip_code'
      }];
      this.criteriaForm.waitIdle().then(() => {
        console.debug('[product-form] Update criteria form:', criteria);
        criteria.forEach(c => this.criteriaForm.addFilterCriterion(c));
        this.showFilter = true;
      })*/
    }
    else {
      this.showFilter = false;
    }

    // If spatial, load columns
    if (data && data.isSpatial) {
      this.stratumFormArray.enable();
      this.stratumFormArray.allowEmptyArray = false;
      // If spatial product, make sure there is one stratum
      this.stratumFormArray.resize(Math.max(1, arraySize(data.stratum)));
    }
    else {
      this.stratumFormArray.disable();
      this.stratumFormArray.allowEmptyArray = true;
      this.stratumFormArray.resize(0);
    }

    // Show doc preview, if doc exists
    this.showMarkdownPreview = this.showMarkdownPreview && isNotNilOrBlank(data.documentation);

    super.setValue(data, opts);

  }

  removeStrata(index: number) {
    this.stratumFormArray.removeAt(index);
  }

  /* -- protected -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }

}
