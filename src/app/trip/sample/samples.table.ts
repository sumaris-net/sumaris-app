import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output, ViewChild } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';
import { SampleValidatorOptions, SampleValidatorService } from './sample.validator';
import { SamplingStrategyService } from '@app/referential/services/sampling-strategy.service';
import {
  AppFormUtils,
  AppValidatorService,
  DateUtils,
  firstNotNilPromise,
  InMemoryEntitiesService,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  LoadResult,
  LocalSettingsService,
  ObjectMap,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  suggestFromArray,
  toBoolean,
  toNumber,
  UsageMode
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { BaseMeasurementsTable, BaseMeasurementsTableConfig } from '../../data/measurement/measurements-table.class';
import { ISampleModalOptions, SampleModal } from './sample.modal';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { Sample, SampleUtils } from './sample.model';
import { AcquisitionLevelCodes, AcquisitionLevelType, ParameterGroups, PmfmIds, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { environment } from '@environments/environment';
import { debounceTime } from 'rxjs/operators';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { SampleFilter } from './sample.filter';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { ISelectPmfmModalOptions, SelectPmfmModal } from '@app/referential/pmfm/table/select-pmfm.modal';
import { BehaviorSubject, Subscription } from 'rxjs';
import { MatMenu } from '@angular/material/menu';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { arrayPluck, isNilOrNaN } from '@app/shared/functions';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { BatchGroup } from '@app/trip/batch/group/batch-group.model';
import { ISubSampleModalOptions, SubSampleModal } from '@app/trip/sample/sub-sample.modal';
import { OverlayEventDetail } from '@ionic/core';
import { IPmfmForm } from '@app/trip/operation/operation.validator';
import { PmfmFilter } from '@app/referential/services/filter/pmfm.filter';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { AppImageAttachmentsModal, IImageModalOptions } from '@app/data/image/image-attachment.modal';
import { MeasurementsTableValidatorOptions } from '@app/data/measurement/measurements-table.validator';
import { PmfmValueColorFn } from '@app/referential/pipes/pmfms.pipe';

declare interface GroupColumnDefinition {
  key: string;
  label?: string;
  name?: string;
  colSpan: number;
  cssClass?: string;
}

export const SAMPLE_RESERVED_START_COLUMNS: string[] = ['label', 'taxonGroup', 'taxonName', 'sampleDate'];
export const SAMPLE_RESERVED_END_COLUMNS: string[] = ['comments', 'images'];
export const SAMPLE_TABLE_DEFAULT_I18N_PREFIX = 'TRIP.SAMPLE.TABLE.';


@Component({
  selector: 'app-samples-table',
  templateUrl: 'samples.table.html',
  styleUrls: ['samples.table.scss'],
  providers: [
    {provide: AppValidatorService, useExisting: SampleValidatorService},
    {provide: InMemoryEntitiesService,
      useFactory: () => new InMemoryEntitiesService(Sample, SampleFilter, {
          equals: Sample.equals,
          sortByReplacement: {'id': 'rankOrder'}
        })
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplesTable
  extends BaseMeasurementsTable<Sample,
    SampleFilter,
    InMemoryEntitiesService<Sample, SampleFilter>,
    SampleValidatorService,
    BaseMeasurementsTableConfig<Sample>,
    SampleValidatorOptions> {

  private _footerRowsSubscription: Subscription;

  protected referentialRefService: ReferentialRefService;
  protected pmfmService: PmfmService;

  // Top group header
  groupHeaderStartColSpan: number;
  groupHeaderEndColSpan: number;
  $pmfmGroups = new BehaviorSubject<ObjectMap<number[]>>(null);
  pmfmGroupColumns$ = new BehaviorSubject<GroupColumnDefinition[]>([]);
  groupHeaderColumnNames: string[] = [];
  footerColumns: string[] = ['footer-start'];
  showFooter: boolean;
  showTagCount: boolean;
  tagCount$ = new BehaviorSubject<number>(0);
  existingPmfmIdsToCopy: number[];

  @Input() tagIdPmfm: IPmfm;
  @Input() showGroupHeader = false;
  @Input() useSticky = false;
  @Input() useFooterSticky = false;
  @Input() canAddPmfm = false;
  @Input() showError = true;
  @Input() showToolbar: boolean;
  @Input() mobile: boolean;
  @Input() usageMode: UsageMode;
  @Input() showIdColumn = true;
  @Input() showLabelColumn = false;
  @Input() requiredLabel = true;
  @Input() showPmfmDetails = false;
  @Input() showFabButton = false;
  @Input() showIndividualMonitoringButton = false;
  @Input() showIndividualReleaseButton = false;
  @Input() defaultSampleDate: Moment = null;
  @Input() defaultTaxonGroup: TaxonGroupRef = null;
  @Input() defaultTaxonName: TaxonNameRef = null;
  @Input() modalOptions: Partial<ISampleModalOptions>;
  @Input() compactFields = true;
  @Input() showDisplayColumnModal = true;
  @Input() weightDisplayedUnit: WeightUnitSymbol;
  @Input() tagIdMinLength = 4;
  @Input() tagIdPadString = '0';
  @Input() defaultLatitudeSign: '+' | '-';
  @Input() defaultLongitudeSign: '+' | '-';
  @Input() allowSubSamples = false;
  @Input() subSampleModalOptions: Partial<ISubSampleModalOptions>;
  @Input() computedPmfmGroups: string[];
  @Input() pmfmIdsToCopy: number[];
  @Input('pmfmValueColor') pmfmValueColorFn: PmfmValueColorFn = null;

  @Input() set pmfmGroups(value: ObjectMap<number[]>) {
    if (this.$pmfmGroups.value !== value) {
      if (value && Object.keys(value).length) {
        this.showGroupHeader = true;
      }
      else {
        this.showGroupHeader = false;
      }
      this.$pmfmGroups.next(value);
    }
  }

  get pmfmGroups(): ObjectMap<number[]> {
    return this.$pmfmGroups.getValue();
  }

  @Input()
  set value(data: Sample[]) {
    this.memoryDataService.value = data;
  }

  get value(): Sample[] {
    return this.memoryDataService.value;
  }

  @Input()
  set showSampleDateColumn(value: boolean) {
    this.setShowColumn('sampleDate', value);
  }

  get showSampleDateColumn(): boolean {
    return this.getShowColumn('sampleDate');
  }

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

  @Input()
  set showImagesColumn(value: boolean) {
    this.setShowColumn('images', value);
  }

  get showImagesColumn(): boolean {
    return this.getShowColumn('images');
  }

  @Input() availableTaxonGroups: TaxonGroupRef[] = null;

  getRowError(row, opts): string {
    return super.getRowError(row, opts);
  }

  setModalOption(key: keyof ISampleModalOptions, value: ISampleModalOptions[typeof key]) {
    this.modalOptions = this.modalOptions || {};
    this.modalOptions[key as any] = value;
  }

  getModalOption(key: keyof ISampleModalOptions): ISampleModalOptions[typeof key] {
    return this.modalOptions[key];
  }

  @Output('prepareRowForm') onPrepareRowForm = new EventEmitter<IPmfmForm>();

  constructor(
    injector: Injector,
    protected memoryDataService: InMemoryEntitiesService<Sample, SampleFilter>,
    protected samplingStrategyService: SamplingStrategyService,
  ) {
    super(injector,
      Sample, SampleFilter,
      memoryDataService,
      injector.get(LocalSettingsService).mobile ? null : injector.get(SampleValidatorService),
      {
        reservedStartColumns: SAMPLE_RESERVED_START_COLUMNS,
        reservedEndColumns: SAMPLE_RESERVED_END_COLUMNS,
        requiredStrategy: false,
        i18nColumnPrefix: 'TRIP.SAMPLE.TABLE.',
        i18nPmfmPrefix: 'TRIP.SAMPLE.PMFM.',
        // Cannot override mapPmfms (by options)
        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        onPrepareRowForm: (form) => this.onPrepareRowForm.emit({form, pmfms: this.pmfms, markForCheck: () => this.markForCheck()})
      }
    );
    this.referentialRefService = injector.get(ReferentialRefService);
    this.pmfmService = injector.get(PmfmService);

    this.confirmBeforeDelete = false;
    this.confirmBeforeCancel = false;
    this.undoableDeletion = false;

    this.saveBeforeSort = true;
    this.saveBeforeFilter = true;
    this.propagateRowError = true;
    this.errorTranslatorOptions = { separator: '\n', controlPathTranslator: this};

    // Set default value
    this._acquisitionLevel = null; // Avoid load to early. Need sub classes to set it
    this.excludesColumns = ['images']; // Hide images by default

    //this.debug = false;
    this.debug = !environment.production;
    this.logPrefix = '[samples-table] ';
  }

  ngOnInit() {
    this.inlineEdition = !this.readOnly && this.validatorService && !this.mobile;
    this.canEdit
    this.allowRowDetail = !this.inlineEdition;
    this.usageMode = this.usageMode || this.settings.usageMode;
    this.showToolbar = toBoolean(this.showToolbar, !this.showGroupHeader);

    // Always add a confirmation before deletion, if mobile
    if (this.mobile) this.confirmBeforeDelete = true;

    super.ngOnInit();

    // Add footer listener
    this.registerSubscription(
      this.$pmfms.subscribe(pmfms => this.addFooterListener(pmfms))
    );
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    this.setShowColumn('label', this.showLabelColumn);
    this.setShowColumn('comments', this.showCommentsColumn);

    // Taxon group combo
    this.registerAutocompleteField('taxonGroup', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonGroups(value, options),
      mobile: this.mobile
    });

    // Taxon name combo
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonNames(value, options),
      showAllOnFocus: this.showTaxonGroupColumn /*show all, because limited to taxon group*/,
      mobile: this.mobile
    });
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.memoryDataService?.stop();
    this.onPrepareRowForm.complete();
    this.onPrepareRowForm.unsubscribe();
    this.$pmfmGroups.complete();
    this.$pmfmGroups.unsubscribe();
    this.pmfmGroupColumns$.complete();
    this.pmfmGroupColumns$.unsubscribe();
    this.memoryDataService.stop();
  }

  protected configureValidator(opts: MeasurementsTableValidatorOptions) {
    super.configureValidator(opts);

    this.validatorService.delegateOptions = {withImages: this.showImagesColumn, requiredLabel: this.requiredLabel};
  }

  /**
   * Use in ngFor, for trackBy
   * @param index
   * @param column
   */
  trackColumnDef(index: number, column: GroupColumnDefinition) {
    return column.key;
  }

  setSubSampleModalOption(key: keyof ISubSampleModalOptions, value: ISubSampleModalOptions[typeof key]) {
    this.subSampleModalOptions = this.subSampleModalOptions || {};
    this.subSampleModalOptions[key as any] = value;
  }

  async openDetailModal(dataToOpen?: Sample, row?: TableElement<Sample>): Promise<OverlayEventDetail<Sample | undefined>> {
    console.debug('[samples-table] Opening detail modal...');
    const pmfms = await firstNotNilPromise(this.$pmfms, {stop: this.destroySubject});

    let isNew = !dataToOpen && true;
    if (isNew) {
      dataToOpen = new Sample();
      await this.onNewEntity(dataToOpen);
    }

    this.markAsLoading();

    const options: Partial<ISampleModalOptions> = {
      // Default options:
      programLabel: undefined, // Prefer to pass PMFMs directly, to avoid a reloading
      pmfms,
      acquisitionLevel: this.acquisitionLevel,
      disabled: this.disabled,
      i18nSuffix: this.i18nColumnSuffix,
      usageMode: this.usageMode,
      mobile: this.mobile,
      availableTaxonGroups: this.availableTaxonGroups,
      defaultSampleDate: this.defaultSampleDate,
      requiredLabel: this.requiredLabel,
      showLabel: this.showLabelColumn,
      showSampleDate: !this.defaultSampleDate ? true : this.showSampleDateColumn, // Show sampleDate, if no default date
      showTaxonGroup: this.showTaxonGroupColumn,
      showTaxonName: this.showTaxonNameColumn,
      showIndividualMonitoringButton: this.allowSubSamples && this.showIndividualMonitoringButton || false,
      showIndividualReleaseButton: this.allowSubSamples && this.showIndividualReleaseButton || false,
      showPictures: this.showImagesColumn,
      onReady: (modal) => {
        this.onPrepareRowForm.emit({
          form: modal.form.form,
          pmfms,
          markForCheck: () => modal.markForCheck()});
      },
      onDelete: (event, data) => this.deleteEntity(event, data),
      onSaveAndNew: async (dataToSave) => {
        if (isNew) {
          await this.addEntityToTable(dataToSave, {editing: false});
        } else {
          await this.updateEntityToTable(dataToSave, row, {confirmEdit: true});
          row = null; // Forget the row to update, for the next iteration (should never occur, because onSubmitAndNext always create a new entity)
        }
        // Prepare new sample
        const newData = new Sample();
        await this.onNewEntity(newData);
        isNew = true; // Next row should be new

        return newData;
      },
      openSubSampleModal: (parent, acquisitionLevel) => this.openSubSampleModalFromRootModal(parent, acquisitionLevel),

      // Override using given options
      ...this.modalOptions,

      // Data to open
      isNew,
      data: dataToOpen
    };

    const modal = await this.modalCtrl.create({
      component: SampleModal,
      componentProps: options,
      keyboardClose: true,
      backdropDismiss: false,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data, role} = await modal.onDidDismiss();

    if (data && this.debug) console.debug('[samples-table] Sample modal result: ', data, role);

    this.markAsLoaded();

    return {data: (data instanceof Sample ? data : undefined), role};
  }

  async onIndividualMonitoringClick(event: Event, row: TableElement<Sample>) {
    return this.onSubSampleButtonClick(event, row, AcquisitionLevelCodes.INDIVIDUAL_MONITORING);

  }

  async onIndividualReleaseClick(event: Event, row: TableElement<Sample>) {
    return this.onSubSampleButtonClick(event, row, AcquisitionLevelCodes.INDIVIDUAL_RELEASE);
  }

  async onSubSampleButtonClick(event: Event,
                               row: TableElement<Sample>,
                               acquisitionLevel: AcquisitionLevelType) {
    if (event) event.preventDefault();
    console.debug(`[samples-table] onSubSampleButtonClick() on ${acquisitionLevel}`);
    // Loading spinner
    this.markAsLoading();

    try {

      const parent = this.toEntity(row);
      const { data, role } = await this.openSubSampleModal(parent, {acquisitionLevel });

      if (isNil(data)) return; // User cancelled

      if (role === 'DELETE') {
        parent.children = SampleUtils.removeChild(parent, data);
      }
      else {
        parent.children = SampleUtils.insertOrUpdateChild(parent, data, acquisitionLevel);
      }

      if (row.validator) {
        row.validator.patchValue({children: parent.children});
      }
      else {
        row.currentData.children = parent.children.slice(); // Force pipes update
        this.markAsDirty();
      }

    } finally {
      this.markAsLoaded();
    }
  }

  protected async openSubSampleModalFromRootModal(parent: Sample, acquisitionLevel: AcquisitionLevelType): Promise<Sample> {
    if (!parent || !acquisitionLevel) throw Error('Missing \'parent\' or \'acquisitionLevel\' arguments');

    // Make sure the row exists
    this.editedRow = (this.editedRow && BatchGroup.equals(this.editedRow.currentData, parent) && this.editedRow)
      || (await this.findRowByEntity(parent))
      // Or add it to table, if new
      || (await this.addEntityToTable(parent, {confirmCreate: false /*keep row editing*/}));

    const { data, role } = await this.openSubSampleModal(parent, { acquisitionLevel });

    if (isNil(data)) return; // User cancelled

    if (role === 'DELETE') {
      parent.children = SampleUtils.removeChild(parent, data);
    }
    else {
      parent.children = SampleUtils.insertOrUpdateChild(parent, data, acquisitionLevel);
    }

    // Return the updated parent
    return parent;
  }

  protected async openSubSampleModal(parentSample?: Sample, opts?: {
    showParent?: boolean;
    acquisitionLevel?: AcquisitionLevelType;
  }): Promise<OverlayEventDetail<Sample | undefined>> {


    const showParent = opts && opts.showParent === true; // False by default
    const acquisitionLevel = opts?.acquisitionLevel || AcquisitionLevelCodes.INDIVIDUAL_MONITORING;

    console.debug(`[samples-table] Opening sub-sample modal for {acquisitionLevel: ${acquisitionLevel}}`);

    const children = SampleUtils.filterByAcquisitionLevel(parentSample.children || [], acquisitionLevel);
    const isNew = !children || children.length === 0;
    let subSample: Sample;
    if (isNew) {
      subSample = new Sample();
    } else {
      subSample = children[0];
    }

    // Make sure to set the parent
    subSample.parent = parentSample.asObject({withChildren: false});

    const hasTopModal = !!(await this.modalCtrl.getTop());
    const modal = await this.modalCtrl.create({
      component: SubSampleModal,
      componentProps: <ISubSampleModalOptions>{
        programLabel: this.programLabel,
        usageMode: this.usageMode,
        acquisitionLevel,
        isNew,
        data: subSample,
        showParent,
        i18nSuffix: this.i18nColumnSuffix,
        defaultLatitudeSign: this.defaultLatitudeSign,
        defaultLongitudeSign: this.defaultLongitudeSign,
        showLabel: false,
        disabled: this.disabled,
        maxVisibleButtons: this.modalOptions?.maxVisibleButtons,
        mobile: this.mobile,

        onDelete: (event, data) => Promise.resolve(true),
        ...this.subSampleModalOptions
      },
      backdropDismiss: false,
      keyboardClose: true,
      cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data, role} = await modal.onDidDismiss();

    // User cancelled
    if (isNil(data)) {
      if (this.debug) console.debug('[sample-table] Sub-sample modal: user cancelled');
    } else {
      // DEBUG
      if (this.debug) console.debug('[sample-table] Sub-sample modal result: ', data, role);
    }

    return {data, role};
  }

  filterColumnsByTaxonGroup(taxonGroup: TaxonGroupRef) {
    const toggleLoading = !this.loading;
    if (toggleLoading) this.markAsLoading();

    try {
      const taxonGroupId = toNumber(taxonGroup && taxonGroup.id, null);
      (this.pmfms || []).forEach(pmfm => {

        const show = isNil(taxonGroupId)
          || !PmfmUtils.isDenormalizedPmfm(pmfm)
          || (isEmptyArray(pmfm.taxonGroupIds) || pmfm.taxonGroupIds.includes(taxonGroupId));
        this.setShowColumn(pmfm.id.toString(), show);
      });

      this.updateColumns();
    }
    finally {
      if (toggleLoading) this.markAsLoaded();
    }
  }

  async openAddPmfmsModal(event?: Event) {

    // If pending rows, save first
    if (this.dirty) {
      const saved = await this.save();
      if (!saved) return;
    }

    const existingPmfmIds = (this.pmfms || []).map(p => p.id).filter(isNotNil);

    const pmfmIds = await this.openSelectPmfmsModal(event, {
      excludedIds: existingPmfmIds
    }, {
      allowMultiple: false
    });
    if (isEmptyArray(pmfmIds)) return; // User cancelled

    console.debug('[samples-table] Adding pmfm ids:', pmfmIds);
    await this.addPmfmColumns(pmfmIds);

  }

  /**
   * Not used yet. Implementation must manage stored samples values and different pmfms types (number, string, qualitative values...)
   * @param event
   */
  async openChangePmfmsModal(event?: Event) {
    const existingPmfmIds = (this.pmfms || []).map(p => p.id).filter(isNotNil);

    const pmfmIds = await this.openSelectPmfmsModal(event, {
      excludedIds: existingPmfmIds
    }, {
      allowMultiple: false
    });
    if (!pmfmIds) return; // USer cancelled

  }

  async openImagesModal(event: Event, row: TableElement<Sample>){
    const images = row.currentData.images;

    // Skip if no images to display
    if (this.disabled && isEmptyArray(images)) return;

    event.stopPropagation();

    const modal = await this.modalCtrl.create({
      component: AppImageAttachmentsModal,
      componentProps: <IImageModalOptions>{
        data: images,
        disabled: this.disabled
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });
    await modal.present();
    const {data, role} = await modal.onDidDismiss();

    // User cancel
    if (isNil(data) || this.disabled) return;

    if (this.inlineEdition && row.validator) {
      const formArray = row.validator.get('images');
      formArray.patchValue(data);
      row.validator.markAsDirty();
      this.confirmEditCreate();
      this.markAsDirty();
    }
    else {
      row.currentData.images = data;
      this.markAsDirty();
    }
  }


  /* -- protected methods -- */

  protected async suggestTaxonGroups(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    if (isNotEmptyArray(this.availableTaxonGroups)) {
      return suggestFromArray(this.availableTaxonGroups, value, options);
    }

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

  protected async onNewEntity(data: Sample): Promise<void> {
    console.debug('[sample-table] Initializing new row data...');

    await super.onNewEntity(data);

    // Init measurement values
    data.measurementValues = data.measurementValues || {};

    // generate label
    if (!this.showLabelColumn && this.requiredLabel) {
      data.label = `${this.acquisitionLevel||''}#${data.rankOrder}`;
    }

    // Default date
    if (isNotNil(this.defaultSampleDate)) {
      data.sampleDate = this.defaultSampleDate;
    } else {
      if (this.settings.isOnFieldMode(this.usageMode)) {
        data.sampleDate = DateUtils.moment();
      }
    }

    // Default taxon name
    if (isNotNil(this.defaultTaxonName)) {
      data.taxonName = TaxonNameRef.fromObject(this.defaultTaxonName);
    }

    // Default taxon group
    if (isNotNil(this.defaultTaxonGroup)) {
      data.taxonGroup = TaxonGroupRef.fromObject(this.defaultTaxonGroup);
    }

    // Get the previous sample
    const previousSample = this.getPreviousSample();


    // server call for first sample and increment from server call value
    if (this.tagIdPmfm && this._strategyLabel && this.tagIdMinLength > 0) {
      const previousTagId = this.getPreviousTagId();
      const nextAvailableTagId = parseInt((await this.samplingStrategyService.computeNextSampleTagId(this._strategyLabel, '-', this.tagIdMinLength)).slice(-1 * this.tagIdMinLength));
      const newTagId = (isNilOrNaN(previousTagId) ? nextAvailableTagId
        : Math.max(nextAvailableTagId, previousTagId + 1)).toString().padStart(this.tagIdMinLength, '0');
      data.measurementValues[PmfmIds.TAG_ID] = newTagId;
    }

    // Copy some value from previous sample
    if (previousSample && isNotEmptyArray(this.existingPmfmIdsToCopy)) {
      this.existingPmfmIdsToCopy
        .forEach(pmfmId => {
          if (isNilOrBlank(data.measurementValues[pmfmId])) {
            data.measurementValues[pmfmId] = previousSample.measurementValues[pmfmId];
          }
        });
    }

    // Reset __typename, to force normalization of all values
    MeasurementValuesUtils.resetTypename(data.measurementValues);
    data.measurementValues = MeasurementValuesUtils.normalizeValuesToForm(data.measurementValues, this.pmfms, {keepSourceObject: true});
  }

  protected getPreviousSample(): Sample|undefined {
    if (isNil(this.visibleRowCount) || this.visibleRowCount === 0) return undefined;
    const row = this.dataSource.getRow(this.visibleRowCount - 1);
    return row?.currentData;
  }

  protected getPreviousTagId(): number | undefined {
    if (isNil(this.visibleRowCount) || this.visibleRowCount === 0) return undefined;
    for (let i = this.visibleRowCount - 1; i >= 0; i--) {
      const row = this.dataSource.getRow(i);
      if (row) {
        const rowData = row.currentData;
        const existingTagId = toNumber(rowData?.measurementValues[PmfmIds.TAG_ID]);
        if (isNotNilOrNaN(existingTagId)) return existingTagId;
      }
    }
    return undefined
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    const {data, role} = await this.openDetailModal();
    if (data && role !== 'delete') {
      // Can be an update (is user use the 'save and new' modal's button),
      await this.addOrUpdateEntityToTable(data);
      return true;
    }
    else {
      this.editedRow = null;
      return false;
    }
  }

  protected async openRow(id: number, row: TableElement<Sample>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onOpenRow.observers.length) {
      this.onOpenRow.emit(row);
      return true;
    }

    const dataToOpen = this.toEntity(row, true);

    // Prepare entity measurement values
    this.prepareEntityToSave(dataToOpen);

    const {data, role} = await this.openDetailModal(dataToOpen, row);
    if (data && role !== 'delete') {
      // Can be an update (is user use the 'save and new' modal's button),
      await this.addOrUpdateEntityToTable(data);
      return true;
    } else {
      this.editedRow = null;
      return false;
    }
  }

  protected prepareEntityToSave(data: Sample) {
    // Override by subclasses
  }

  async findRowByEntity(data: Sample): Promise<TableElement<Sample>> {
    if (!data || isNil(data.rankOrder)) throw new Error('Missing argument data or data.rankOrder');
    return this.dataSource.getRows()
      .find(r => r.currentData.rankOrder === data.rankOrder);
  }

  protected async addPmfmColumns(pmfmIds: number[]) {
    if (isEmptyArray(pmfmIds)) return; // Skip if empty

    // Load each pmfms, by id
    const fullPmfms = await Promise.all(pmfmIds.map(id => this.pmfmService.loadPmfmFull(id)));
    let pmfms = fullPmfms.map(DenormalizedPmfmStrategy.fromFullPmfm);

    // Add weight conversion
    if (this.weightDisplayedUnit) {
      pmfms = PmfmUtils.setWeightUnitConversions(pmfms, this.weightDisplayedUnit, {clone: false});

      console.debug('[samples-table] Add new pmfms: ', pmfms);
    }

    this.pmfms = [
      ...this.pmfms,
      ...pmfms
    ];
  }

  protected async openSelectPmfmsModal(event?: Event, filter?: Partial<PmfmFilter>,
                                       opts?: {
                                         allowMultiple?: boolean;
                                       }): Promise<number[]> {

    const modal = await this.modalCtrl.create({
      component: SelectPmfmModal,
      componentProps: <ISelectPmfmModalOptions>{
        filter: PmfmFilter.fromObject(filter),
        showFilter: true,
        allowMultiple: opts?.allowMultiple
      },
      keyboardClose: true,
      backdropDismiss: false,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const { data } = await modal.onDidDismiss();
    if (isEmptyArray(data)) return; // CANCELLED

    // Return pmfm ids
    return data.map(p => p.id);
  }

  /**
   * Force to wait PMFM map to be loaded
   * @param pmfms
   */
  protected async mapPmfms(pmfms: IPmfm[]): Promise<IPmfm[]> {

    if (isEmptyArray(pmfms)) return pmfms; // Nothing to map

    // Compute tag id
    this.tagIdPmfm = this.tagIdPmfm || pmfms && pmfms.find(pmfm => pmfm.id === PmfmIds.TAG_ID);

    // Compute pmfms to copy (e.g. need by SIH-OBSBIO)
    this.existingPmfmIdsToCopy = this.pmfmIdsToCopy
      && pmfms.filter(pmfm => !pmfm.defaultValue && !pmfm.hidden && this.pmfmIdsToCopy.includes(pmfm.id))
              .map(pmfm => pmfm.id);

    if (this.showGroupHeader) {
      console.debug('[samples-table] Computing Pmfm group header...');

      // Wait until map is loaded
      const groupedPmfmIdsMap = await firstNotNilPromise(this.$pmfmGroups, {stop: this.destroySubject});

      // Create a list of known pmfm ids
      const groupedPmfmIds: number[] = Object.values(groupedPmfmIdsMap).flatMap(pmfmIds => pmfmIds);

      // Create pmfms group
      const orderedPmfmIds: number[] = [];
      const orderedPmfms: IPmfm[] = [];
      let groupIndex = 0;
      const groupNames = ParameterGroups.concat('OTHER');
      const pmfmGroupColumns: GroupColumnDefinition[] = groupNames.reduce((pmfmGroups, group) => {
        let groupPmfms: IPmfm[];
        if (group === 'OTHER') {
          groupPmfms = pmfms.filter(p => !groupedPmfmIds.includes(p.id));
        } else {
          const groupPmfmIds = groupedPmfmIdsMap[group];
          groupPmfms = isNotEmptyArray(groupPmfmIds) ? pmfms.filter(p => groupPmfmIds.includes(p.id)) : [];
        }

        const groupPmfmCount = groupPmfms.length;
        if (groupPmfmCount) {
          ++groupIndex;
        }
        const cssClass = groupIndex % 2 === 0 ? 'even' : 'odd';

        const computedGroup = this.computedPmfmGroups?.includes(group) || false;

        groupPmfms.forEach(pmfm => {
          pmfm = pmfm.clone(); // Clone, to leave original PMFM unchanged

          // Force as computed
          if (computedGroup && !pmfm.isComputed) {
            pmfm.isComputed = true;
          }

          // Use rankOrder as a group index (will be used in template, to computed column class)
          if (PmfmUtils.isDenormalizedPmfm(pmfm)) {
            pmfm.rankOrder = groupIndex;
          }

          // Apply weight conversion, if need
          if (this.weightDisplayedUnit) {
            PmfmUtils.setWeightUnitConversion(pmfm, this.weightDisplayedUnit, {clone: false});
          }

          // Add pmfm into the final list of ordered pmfms
          if (!orderedPmfms.includes(pmfm)) orderedPmfms.push(pmfm);
        });

        return pmfmGroups.concat(
          ...groupPmfms.reduce((res, pmfm, index) => {
            if (orderedPmfmIds.includes(pmfm.id)) return res; // Skip if already proceed
            orderedPmfmIds.push(pmfm.id);
            const visible = group !== 'TAG_ID'; //  && groupPmfmCount > 1;
            const key = 'group-' + group;
            return index !== 0 ? res : res.concat(<GroupColumnDefinition>{
              key,
              label: group,
              name: visible && ('TRIP.SAMPLE.PMFM_GROUP.' + group) || '',
              cssClass: visible && cssClass || '',
              colSpan: groupPmfmCount
            });
          }, []));
      }, []);
      this.pmfmGroupColumns$.next(pmfmGroupColumns);
      this.groupHeaderColumnNames =
        ['top-start']
          .concat(arrayPluck(pmfmGroupColumns, 'key') as string[])
          .concat(['top-end']);
      this.groupHeaderStartColSpan = RESERVED_START_COLUMNS.length
        + (this.showLabelColumn ? 1 : 0)
        + (this.showTaxonGroupColumn ? 1 : 0)
        + (this.showTaxonNameColumn ? 1 : 0)
        + (this.showSampleDateColumn ? 1 : 0);
      this.groupHeaderEndColSpan = RESERVED_END_COLUMNS.length
        + (this.showCommentsColumn ? 1 : 0);

      pmfms = orderedPmfms;
    }

    // No pmfm group (no table top headers)
    else {
      // Apply weight conversion, if need
      if (this.weightDisplayedUnit) {
        pmfms = PmfmUtils.setWeightUnitConversions(pmfms, this.weightDisplayedUnit);
      }
    }

    // DEBUG
    const hasEmptyPmfm = pmfms.some(p => isNil(p?.id));
    if (hasEmptyPmfm) {
      console.error('[samples-table] Invalid PMFMS: ', pmfms);
    }

    // Add replacement map, for sort by
    pmfms.forEach(p => this.memoryDataService.addSortByReplacement(p.id.toString(), `measurementValues.${p.id}`));

    return pmfms;
  }

  openSelectColumnsModal(event?: Event): Promise<any> {
    return super.openSelectColumnsModal(event);
  }

  protected addFooterListener(pmfms: IPmfm[]) {

    this.tagIdPmfm = this.tagIdPmfm || pmfms && pmfms.find(pmfm => pmfm.id === PmfmIds.TAG_ID);
    this.showTagCount = !!this.tagIdPmfm;

    // Should display tag count: add column to footer
    if (this.showTagCount && !this.footerColumns.includes('footer-tagCount')) {
      this.footerColumns = [...this.footerColumns, 'footer-tagCount'];
    }
    // If tag count not displayed
    else if (!this.showTagCount) {
      // Remove from footer columns
      this.footerColumns = this.footerColumns.filter(column => column !== 'footer-tagCount');

      // Reset counter
      this.tagCount$.next(0);
    }

    this.showFooter = this.footerColumns.length > 1;

    // DEBUG
    console.debug('[samples-table] Show footer ?', this.showFooter);

    // Remove previous rows listener
    if (!this.showFooter && this._footerRowsSubscription) {
      this.unregisterSubscription(this._footerRowsSubscription);
      this._footerRowsSubscription.unsubscribe();
      this._footerRowsSubscription = null;
    } else if (this.showFooter && !this._footerRowsSubscription) {
      this._footerRowsSubscription = this.dataSource.connect(null)
        .pipe(
          debounceTime(500)
        ).subscribe(rows => this.updateFooter(rows));
    }
  }

  protected updateFooter(rows: TableElement<Sample>[] | readonly TableElement<Sample>[]) {
    // Update tag count
    const tagCount = (rows || []).map(row => row.currentData.measurementValues[PmfmIds.TAG_ID.toString()] as string)
      .filter(isNotNilOrBlank)
      .length;
    this.tagCount$.next(tagCount);
  }

  protected changeWeightUnit(unitLabel: WeightUnitSymbol) {
    console.log('TODO: change weight unit to ' + unitLabel);
  }

  selectInputContent = AppFormUtils.selectInputContent;
  isIndividualMonitoring = SampleUtils.isIndividualMonitoring;
  isIndividualRelease = SampleUtils.isIndividualRelease;

  markForCheck() {
    this.cd.markForCheck();
  }

}
